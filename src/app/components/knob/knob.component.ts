import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';

/**
 * Hardware-style rotary knob. Drag up/down (or use the wheel / arrow keys)
 * to change the value. Bipolar knobs (min<0) snap to center on double-tap.
 */
@Component({
  selector: 'app-knob',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="knob-wrap">
      <div
        #dial
        class="dial"
        role="slider"
        tabindex="0"
        [attr.aria-label]="label"
        [attr.aria-valuenow]="value.toFixed(2)"
        [attr.aria-valuemin]="min"
        [attr.aria-valuemax]="max"
        [class.accent]="accent"
        (pointerdown)="onDown($event)"
        (wheel)="onWheel($event)"
        (dblclick)="reset()"
        (keydown)="onKey($event)"
      >
        <div class="cap" [style.transform]="'rotate(' + angle + 'deg)'">
          <span class="pointer"></span>
        </div>
        <svg class="ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle class="track" cx="50" cy="50" r="44" />
          <circle
            class="fill"
            cx="50"
            cy="50"
            r="44"
            [attr.stroke-dasharray]="circ"
            [attr.stroke-dashoffset]="dashOffset"
          />
        </svg>
      </div>
      <span class="hw-label">{{ label }}</span>
    </div>
  `,
  styles: [
    `
      .knob-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        touch-action: none;
      }
      .dial {
        position: relative;
        width: var(--size, 52px);
        height: var(--size, 52px);
        border-radius: 50%;
        cursor: ns-resize;
        outline: none;
      }
      .dial:focus-visible { box-shadow: 0 0 0 2px var(--cyan); border-radius: 50%; }
      .cap {
        position: absolute;
        inset: 14%;
        border-radius: 50%;
        background:
          radial-gradient(120% 120% at 30% 25%, var(--alu-hi), var(--alu) 45%, var(--alu-lo) 100%);
        box-shadow:
          inset 0 2px 3px rgba(255, 255, 255, 0.18),
          inset 0 -3px 5px rgba(0, 0, 0, 0.6),
          0 3px 6px rgba(0, 0, 0, 0.55);
        display: grid;
        place-items: start center;
      }
      .pointer {
        width: 3px;
        height: 34%;
        margin-top: 8%;
        border-radius: 2px;
        background: var(--ink);
        box-shadow: 0 0 5px rgba(255, 255, 255, 0.35);
      }
      .accent .pointer { background: var(--cyan); box-shadow: 0 0 8px var(--cyan); }
      .ring { position: absolute; inset: 0; transform: rotate(135deg); pointer-events: none; }
      .track { fill: none; stroke: #000; stroke-width: 5; opacity: 0.6; }
      .fill {
        fill: none;
        stroke: var(--cyan);
        stroke-width: 5;
        stroke-linecap: round;
        filter: drop-shadow(0 0 3px var(--cyan-dim));
      }
      .accent .fill { stroke: var(--magenta); filter: drop-shadow(0 0 3px var(--magenta-dim)); }
    `,
  ],
})
export class KnobComponent {
  @Input() label = '';
  @Input() min = -1;
  @Input() max = 1;
  @Input() value = 0;
  @Input() default = 0;
  @Input() accent = false;
  @Output() valueChange = new EventEmitter<number>();

  @ViewChild('dial', { static: true }) dial!: ElementRef<HTMLDivElement>;

  private dragging = false;
  private lastY = 0;
  readonly circ = 2 * Math.PI * 44 * 0.75; // 270° sweep

  /** Rotate -135°..+135° across the range. */
  get angle(): number {
    return -135 + this.norm() * 270;
  }
  get dashOffset(): number {
    return this.circ * (1 - this.norm());
  }

  private norm(): number {
    return (this.value - this.min) / (this.max - this.min);
  }

  onDown(e: PointerEvent): void {
    this.dragging = true;
    this.lastY = e.clientY;
    this.dial.nativeElement.setPointerCapture(e.pointerId);
    this.dial.nativeElement.addEventListener('pointermove', this.onMove);
    this.dial.nativeElement.addEventListener('pointerup', this.onUp);
    e.preventDefault();
  }

  private onMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    const dy = this.lastY - e.clientY;
    this.lastY = e.clientY;
    const span = this.max - this.min;
    this.set(this.value + (dy / 160) * span);
  };

  private onUp = (e: PointerEvent): void => {
    this.dragging = false;
    this.dial.nativeElement.releasePointerCapture(e.pointerId);
    this.dial.nativeElement.removeEventListener('pointermove', this.onMove);
    this.dial.nativeElement.removeEventListener('pointerup', this.onUp);
  };

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    const span = this.max - this.min;
    this.set(this.value - Math.sign(e.deltaY) * span * 0.04);
  }

  onKey(e: KeyboardEvent): void {
    const span = this.max - this.min;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') this.set(this.value + span * 0.05);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') this.set(this.value - span * 0.05);
    else return;
    e.preventDefault();
  }

  reset(): void {
    this.set(this.default);
  }

  private set(v: number): void {
    const clamped = Math.min(this.max, Math.max(this.min, v));
    if (clamped === this.value) return;
    this.value = clamped;
    this.valueChange.emit(clamped);
  }
}

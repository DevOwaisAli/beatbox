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
 * Linear fader. `orientation="vertical"` for channel volume,
 * `"horizontal"` for the crossfader. Drag or arrow-key the cap.
 */
@Component({
  selector: 'app-fader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #track
      class="fader"
      [class.horizontal]="orientation === 'horizontal'"
      role="slider"
      tabindex="0"
      [attr.aria-label]="label"
      [attr.aria-valuenow]="value.toFixed(2)"
      (pointerdown)="onDown($event)"
      (keydown)="onKey($event)"
    >
      <div class="slot"></div>
      <div class="cap" [style.left.%]="capX" [style.bottom.%]="capY">
        <span class="line"></span>
      </div>
    </div>
  `,
  styles: [
    `
      .fader {
        position: relative;
        width: 34px;
        height: 150px;
        touch-action: none;
        cursor: pointer;
        outline: none;
      }
      .fader.horizontal { width: 100%; height: 34px; }
      .fader:focus-visible { box-shadow: 0 0 0 2px var(--cyan); border-radius: 8px; }
      .slot {
        position: absolute;
        left: 50%;
        top: 8px;
        bottom: 8px;
        width: 6px;
        transform: translateX(-50%);
        background: var(--groove);
        border-radius: 4px;
        box-shadow: inset 0 0 4px #000, 0 1px 0 rgba(255, 255, 255, 0.05);
      }
      .horizontal .slot {
        left: 8px;
        right: 8px;
        top: 50%;
        bottom: auto;
        width: auto;
        height: 6px;
        transform: translateY(-50%);
      }
      .cap {
        position: absolute;
        left: 50%;
        width: 30px;
        height: 20px;
        margin-left: -15px;
        margin-bottom: -10px;
        border-radius: 4px;
        background: linear-gradient(180deg, var(--alu-hi), var(--alu) 55%, var(--alu-lo));
        box-shadow:
          inset 0 1px 1px rgba(255, 255, 255, 0.25),
          0 3px 6px rgba(0, 0, 0, 0.6);
        display: grid;
        place-items: center;
      }
      .horizontal .cap {
        bottom: 50% !important;
        width: 20px;
        height: 34px;
        margin-left: -10px;
        margin-bottom: -17px;
      }
      .line { width: 60%; height: 2px; background: var(--cyan); box-shadow: 0 0 5px var(--cyan); }
      .horizontal .line { width: 2px; height: 60%; }
    `,
  ],
})
export class FaderComponent {
  @Input() label = '';
  @Input() min = 0;
  @Input() max = 1;
  @Input() value = 1;
  @Input() orientation: 'vertical' | 'horizontal' = 'vertical';
  @Output() valueChange = new EventEmitter<number>();

  @ViewChild('track', { static: true }) track!: ElementRef<HTMLDivElement>;
  private dragging = false;

  get norm(): number {
    return (this.value - this.min) / (this.max - this.min);
  }
  get capY(): number {
    return this.orientation === 'vertical' ? this.norm * 100 : 50;
  }
  get capX(): number {
    return this.orientation === 'horizontal' ? this.norm * 100 : 50;
  }

  onDown(e: PointerEvent): void {
    this.dragging = true;
    this.track.nativeElement.setPointerCapture(e.pointerId);
    this.track.nativeElement.addEventListener('pointermove', this.onMove);
    this.track.nativeElement.addEventListener('pointerup', this.onUp);
    this.updateFromEvent(e);
    e.preventDefault();
  }

  private onMove = (e: PointerEvent): void => {
    if (this.dragging) this.updateFromEvent(e);
  };

  private onUp = (e: PointerEvent): void => {
    this.dragging = false;
    this.track.nativeElement.releasePointerCapture(e.pointerId);
    this.track.nativeElement.removeEventListener('pointermove', this.onMove);
    this.track.nativeElement.removeEventListener('pointerup', this.onUp);
  };

  private updateFromEvent(e: PointerEvent): void {
    const rect = this.track.nativeElement.getBoundingClientRect();
    let t: number;
    if (this.orientation === 'vertical') {
      t = 1 - (e.clientY - rect.top) / rect.height;
    } else {
      t = (e.clientX - rect.left) / rect.width;
    }
    t = Math.min(1, Math.max(0, t));
    this.set(this.min + t * (this.max - this.min));
  }

  onKey(e: KeyboardEvent): void {
    const span = this.max - this.min;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') this.set(this.value + span * 0.05);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') this.set(this.value - span * 0.05);
    else return;
    e.preventDefault();
  }

  private set(v: number): void {
    const clamped = Math.min(this.max, Math.max(this.min, v));
    if (clamped === this.value) return;
    this.value = clamped;
    this.valueChange.emit(clamped);
  }
}

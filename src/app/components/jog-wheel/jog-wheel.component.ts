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
 * Silver metallic vinyl-style jog wheel. A conic sheen + concentric grooves
 * make the platter read as brushed silver; it spins while playing, and
 * dragging it round emits a `nudge` (-1..1) so the deck can bend tempo.
 * The centre label + progress ring take the deck's accent colour.
 */
@Component({
  selector: 'app-jog-wheel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #wheel
      class="jog"
      [class.magenta]="accent === 'magenta'"
      [class.spinning]="spinning"
      [class.pressed]="pressed"
      (pointerdown)="onDown($event)"
    >
      <svg class="progress" viewBox="0 0 100 100" aria-hidden="true">
        <circle class="p-track" cx="50" cy="50" r="48" />
        <circle
          class="p-fill"
          cx="50"
          cy="50"
          r="48"
          [attr.stroke-dasharray]="circ"
          [attr.stroke-dashoffset]="offset"
        />
      </svg>

      <div class="rim"></div>

      <div class="platter" [style.transform]="'rotate(' + rotation + 'deg)'">
        <div class="sheen"></div>
        <div class="grooves"></div>
        <div class="marker"></div>
        <div class="label"><span>{{ accent === 'magenta' ? 'B' : 'A' }}</span></div>
      </div>

      <div class="glitch-fx" aria-hidden="true"></div>
      @if (pressed) { <div class="glitch-badge hw-label">◈ GLITCH</div> }

      <div class="spindle"></div>
    </div>
  `,
  styles: [
    `
      .jog {
        --acc: var(--cyan);
        --acc-dim: var(--cyan-dim);
        position: relative;
        width: var(--jog, 190px);
        height: var(--jog, 190px);
        border-radius: 50%;
        touch-action: none;
        cursor: grab;
      }
      .jog.magenta { --acc: var(--magenta); --acc-dim: var(--magenta-dim); }
      .jog:active { cursor: grabbing; }

      .progress { position: absolute; inset: -3px; transform: rotate(-90deg); pointer-events: none; z-index: 3; }
      .p-track { fill: none; stroke: rgba(0, 0, 0, 0.35); stroke-width: 2; }
      .p-fill {
        fill: none;
        stroke: var(--acc);
        stroke-width: 2.5;
        stroke-linecap: round;
        filter: drop-shadow(0 0 4px var(--acc-dim));
      }

      /* chrome outer rim */
      .rim {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: conic-gradient(
          from 90deg,
          var(--rim-hi), var(--rim-lo), var(--rim-hi), var(--rim-mid),
          var(--rim-hi), var(--rim-lo), var(--rim-hi), var(--rim-mid), var(--rim-hi)
        );
        box-shadow: 0 12px 26px rgba(0, 0, 0, 0.55), inset 0 0 6px rgba(0, 0, 0, 0.5);
      }

      /* brushed-silver platter */
      .platter {
        position: absolute;
        inset: 6%;
        border-radius: 50%;
        overflow: hidden;
        background: conic-gradient(
          from 0deg,
          var(--platter-a), var(--platter-b), var(--platter-c), var(--platter-d),
          var(--platter-a), var(--platter-b), var(--platter-c), var(--platter-d), var(--platter-a)
        );
        box-shadow:
          inset 0 0 20px rgba(0, 0, 0, 0.4),
          inset 0 2px 3px rgba(255, 255, 255, 0.7),
          inset 0 -3px 6px rgba(0, 0, 0, 0.35);
      }
      /* concentric record grooves */
      .grooves {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: repeating-radial-gradient(
          circle at 50% 50%,
          var(--platter-groove) 0 1.5px,
          rgba(255, 255, 255, 0.06) 1.5px 3.5px
        );
        mix-blend-mode: multiply;
        opacity: 0.6;
      }
      /* soft rotating highlight */
      .sheen {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: radial-gradient(
          40% 40% at 34% 30%,
          rgba(255, 255, 255, 0.55),
          rgba(255, 255, 255, 0) 70%
        );
      }
      .marker {
        position: absolute;
        top: 7%;
        left: 50%;
        width: 3px;
        height: 20%;
        margin-left: -1.5px;
        border-radius: 2px;
        background: rgba(0, 0, 0, 0.55);
        z-index: 2;
      }
      /* centre label in the deck accent */
      .label {
        position: absolute;
        inset: 33%;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: radial-gradient(circle at 40% 35%, var(--acc), var(--acc-dim) 85%);
        box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.45), 0 1px 3px rgba(0, 0, 0, 0.4);
        z-index: 2;
      }
      .label span {
        font-family: var(--label);
        font-weight: 700;
        font-size: 15px;
        color: #0a0b0d;
        opacity: 0.85;
      }
      .spindle {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 11px;
        height: 11px;
        margin: -5.5px 0 0 -5.5px;
        border-radius: 50%;
        background: var(--chassis-lo);
        box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.45), 0 0 0 2px rgba(255, 255, 255, 0.15);
        z-index: 4;
      }

      .spinning .platter { animation: spin var(--rev, 1.8s) linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }

      /* --- touch glitch visual ------------------------------------------- */
      .glitch-fx {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        pointer-events: none;
        opacity: 0;
        z-index: 3;
        mix-blend-mode: screen;
        background:
          repeating-linear-gradient(
            0deg,
            rgba(255, 0, 90, 0.1) 0 2px,
            rgba(0, 240, 255, 0.1) 2px 4px
          );
      }
      .jog.pressed .glitch-fx { opacity: 1; animation: rgbsplit 0.12s steps(2) infinite; }
      .jog.pressed .rim {
        box-shadow:
          2px 0 0 rgba(255, 0, 90, 0.55),
          -2px 0 0 rgba(0, 240, 255, 0.55),
          0 12px 26px rgba(0, 0, 0, 0.55),
          inset 0 0 6px rgba(0, 0, 0, 0.5);
        animation: shake 0.09s steps(2) infinite;
      }
      .glitch-badge {
        position: absolute;
        top: -6px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 5;
        color: var(--acc);
        background: var(--chassis-lo);
        border: 1px solid var(--acc);
        border-radius: 4px;
        padding: 2px 6px;
        letter-spacing: 0.16em;
        box-shadow: 0 0 10px var(--acc-dim);
        animation: flick 0.16s steps(2) infinite;
      }
      @keyframes rgbsplit {
        0% { transform: translate(0, 0); }
        50% { transform: translate(1.5px, -1px); }
        100% { transform: translate(-1px, 1px); }
      }
      @keyframes shake {
        0% { transform: translate(0, 0); }
        50% { transform: translate(-1px, 0.5px); }
        100% { transform: translate(1px, -0.5px); }
      }
      @keyframes flick { 50% { opacity: 0.55; } }
    `,
  ],
})
export class JogWheelComponent {
  @Input() spinning = false;
  /** 0..1 track position for the progress ring. */
  @Input() progress = 0;
  /** Static rotation used when NOT spinning (drag scrub feedback). */
  @Input() rotation = 0;
  /** Deck accent colour for label + progress ring. */
  @Input() accent: 'cyan' | 'magenta' = 'cyan';
  @Output() nudge = new EventEmitter<number>();
  /** Fired when the disk is touched / released (drives the glitch effect). */
  @Output() touchStart = new EventEmitter<void>();
  @Output() touchEnd = new EventEmitter<void>();

  @ViewChild('wheel', { static: true }) wheel!: ElementRef<HTMLDivElement>;
  readonly circ = 2 * Math.PI * 48;
  pressed = false;
  private lastAngle = 0;
  private dragging = false;

  get offset(): number {
    return this.circ * (1 - Math.min(1, Math.max(0, this.progress)));
  }

  onDown(e: PointerEvent): void {
    this.dragging = true;
    this.pressed = true;
    this.lastAngle = this.angleOf(e);
    this.wheel.nativeElement.setPointerCapture(e.pointerId);
    this.wheel.nativeElement.addEventListener('pointermove', this.onMove);
    this.wheel.nativeElement.addEventListener('pointerup', this.onUp);
    this.touchStart.emit();
    e.preventDefault();
  }

  private onMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    const a = this.angleOf(e);
    let delta = a - this.lastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    this.lastAngle = a;
    this.rotation = (this.rotation + delta) % 360;
    this.nudge.emit(Math.max(-1, Math.min(1, delta / 30)));
  };

  private onUp = (e: PointerEvent): void => {
    this.dragging = false;
    this.pressed = false;
    this.wheel.nativeElement.releasePointerCapture(e.pointerId);
    this.wheel.nativeElement.removeEventListener('pointermove', this.onMove);
    this.wheel.nativeElement.removeEventListener('pointerup', this.onUp);
    this.nudge.emit(0);
    this.touchEnd.emit();
  };

  private angleOf(e: PointerEvent): number {
    const r = this.wheel.nativeElement.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
  }
}

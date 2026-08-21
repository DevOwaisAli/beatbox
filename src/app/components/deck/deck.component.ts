// import {
//   Component,
//   ElementRef,
//   Input,
//   OnChanges,
//   OnDestroy,
//   SimpleChanges,
//   ViewChild,
//   signal,
//   inject,
//   ChangeDetectionStrategy,
// } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { Track, DeckId } from '../../models/track.model';
// import { AudioEngineService } from '../../services/audio-engine.service';
// import { BeatDetectorService } from '../../services/beat-detector.service';
// import { MusicLibraryService } from '../../services/music-library.service';
// import { KnobComponent } from '../knob/knob.component';
// import { FaderComponent } from '../fader/fader.component';
// import { JogWheelComponent } from '../jog-wheel/jog-wheel.component';

// interface CuePad {
//   time: number | null;
//   color: 'cyan' | 'magenta';
// }

// @Component({
//   selector: 'app-deck',
//   standalone: true,
//   changeDetection: ChangeDetectionStrategy.OnPush,
//   imports: [CommonModule, KnobComponent, FaderComponent, JogWheelComponent],
//   template: `
//     <section class="deck" [class.b]="deck === 'B'">
//       <audio
//         #audio
//         crossorigin="anonymous"
//         preload="auto"
//         (loadedmetadata)="onLoaded()"
//         (ended)="onEnded()"
//         (error)="onError()"
//       ></audio>

//       <!-- title + BPM readout -->
//       <header class="head">
//         <div class="badge">DECK {{ deck }}</div>
//         <div class="meta">
//           <div class="title">{{ track?.title || 'No track loaded' }}</div>
//           @if (loadError()) {
//             <div class="artist err">{{ loadError() }}</div>
//           } @else {
//             <div class="artist">{{ track?.artist || '—' }}</div>
//           }
//         </div>
//         <div class="bpm">
//           <span class="num">{{ bpm() ? bpm() : '––' }}</span>
//           <span class="hw-label">BPM</span>
//           @if (analyzing()) { <span class="hw-label pulse">analyzing…</span> }
//         </div>
//       </header>

//       <!-- jog + transport -->
//       <div class="stage">
//         <app-jog-wheel
//           style="--jog: 172px"
//           [spinning]="playing()"
//           [progress]="progress()"
//           [accent]="deck === 'B' ? 'magenta' : 'cyan'"
//           (nudge)="onNudge($event)"
//           (touchStart)="onScratchStart()"
//           (touchEnd)="onScratchEnd()"
//         ></app-jog-wheel>

//         <div class="transport">
//           <button class="cue" (pointerdown)="cuePreview()" (pointerup)="cueRelease()">CUE</button>
//           <button class="play" [class.on]="playing()" (click)="toggle()">
//             {{ playing() ? '❚❚' : '▶' }}
//           </button>
//           <button class="sync" (click)="analyze()" [disabled]="!track">BEAT</button>
//         </div>
//       </div>

//       <!-- cue pads (mirror the coloured pads on the hardware) -->
//       <div class="pads">
//         @for (pad of pads; track $index) {
//           <button
//             class="pad"
//             [class.cyan]="pad.color === 'cyan'"
//             [class.magenta]="pad.color === 'magenta'"
//             [class.set]="pad.time !== null"
//             (click)="hitPad($index)"
//           >
//             {{ $index + 1 }}
//           </button>
//         }
//       </div>

//       <!-- EQ + filter knobs -->
//       <div class="knobs">
//         <app-knob label="HIGH" [value]="eqHigh" (valueChange)="setEq('high', $event); eqHigh = $event"></app-knob>
//         <app-knob label="MID" [value]="eqMid" (valueChange)="setEq('mid', $event); eqMid = $event"></app-knob>
//         <app-knob label="LOW" [value]="eqLow" (valueChange)="setEq('low', $event); eqLow = $event"></app-knob>
//         <app-knob
//           label="FILTER"
//           [accent]="true"
//           [value]="filter"
//           (valueChange)="setFilter($event)"
//         ></app-knob>
//       </div>
//       <div class="filter-read hw-label">CUTOFF {{ filterHz() }} Hz</div>
//     </section>
//   `,
//   styles: [
//     `
//       .deck {
//         background: linear-gradient(180deg, var(--chassis-hi), var(--chassis) 60%, var(--chassis-lo));
//         border: 1px solid var(--edge);
//         border-radius: var(--r-lg);
//         padding: 16px;
//         display: flex;
//         flex-direction: column;
//         gap: 14px;
//         box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 10px 30px rgba(0, 0, 0, 0.45);
//       }
//       .head { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; }
//       .badge {
//         font-family: var(--label);
//         font-size: 10px;
//         letter-spacing: 0.15em;
//         color: var(--cyan);
//         border: 1px solid var(--cyan-dim);
//         border-radius: 4px;
//         padding: 3px 6px;
//       }
//       .b .badge { color: var(--magenta); border-color: var(--magenta-dim); }
//       .meta { min-width: 0; }
//       .title { font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
//       .artist { font-size: 11px; color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
//       .artist.err { color: var(--amber); white-space: normal; }
//       .bpm { text-align: right; display: flex; flex-direction: column; align-items: flex-end; }
//       .bpm .num { font-family: var(--label); font-size: 22px; font-weight: 700; color: var(--ink); line-height: 1; }
//       .pulse { color: var(--amber); animation: blink 1s steps(2) infinite; }
//       @keyframes blink { 50% { opacity: 0.3; } }

//       .stage { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 14px; }
//       .transport { display: flex; flex-direction: column; gap: 8px; }
//       .transport button {
//         border: 1px solid var(--edge);
//         background: linear-gradient(180deg, var(--panel), var(--chassis-lo));
//         color: var(--ink);
//         border-radius: 8px;
//         padding: 10px 12px;
//         font-family: var(--label);
//         font-size: 12px;
//         letter-spacing: 0.1em;
//         cursor: pointer;
//       }
//       .transport button:active { transform: translateY(1px); }
//       .play { font-size: 16px !important; }
//       .play.on { border-color: var(--cyan); color: var(--cyan); box-shadow: 0 0 12px var(--cyan-dim); }
//       .b .play.on { border-color: var(--magenta); color: var(--magenta); box-shadow: 0 0 12px var(--magenta-dim); }
//       .sync:disabled { opacity: 0.4; cursor: not-allowed; }

//       .pads { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
//       .pad {
//         aspect-ratio: 1.6 / 1;
//         border-radius: 8px;
//         border: 1px solid var(--edge);
//         background: #14161a;
//         color: var(--ink-faint);
//         font-family: var(--label);
//         font-weight: 700;
//         cursor: pointer;
//         transition: box-shadow 0.1s, background 0.1s;
//       }
//       .pad:active { transform: translateY(1px); }
//       .pad.cyan.set { background: rgba(34, 211, 238, 0.16); color: var(--cyan); box-shadow: inset 0 0 12px var(--cyan-dim), 0 0 8px var(--cyan-dim); border-color: var(--cyan-dim); }
//       .pad.magenta.set { background: rgba(240, 57, 139, 0.16); color: var(--magenta); box-shadow: inset 0 0 12px var(--magenta-dim), 0 0 8px var(--magenta-dim); border-color: var(--magenta-dim); }

//       .knobs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; justify-items: center; padding-top: 4px; }
//       .filter-read { text-align: center; }
//     `,
//   ],
// })
// export class DeckComponent implements OnChanges, OnDestroy {
//   @Input() deck: DeckId = 'A';
//   @Input() track: Track | null = null;

//   @ViewChild('audio', { static: true }) audioRef!: ElementRef<HTMLAudioElement>;

//   private engine = inject(AudioEngineService);
//   private detector = inject(BeatDetectorService);
//   private library = inject(MusicLibraryService);

//   readonly playing = signal(false);
//   readonly progress = signal(0);
//   readonly bpm = signal<number>(0);
//   readonly analyzing = signal(false);
//   readonly filterHz = signal(20000);
//   readonly loadError = signal<string>('');

//   eqLow = 0;
//   eqMid = 0;
//   eqHigh = 0;
//   filter = 0;

//   pads: CuePad[] = [
//     { time: null, color: 'cyan' },
//     { time: null, color: 'magenta' },
//     { time: null, color: 'cyan' },
//     { time: null, color: 'magenta' },
//   ];

//   private baseRate = 1;
//   private raf = 0;
//   private cueReturn: number | null = null;

//   ngOnChanges(changes: SimpleChanges): void {
//     if (changes['track'] && this.track) this.load(this.track);
//   }

//   private get audio(): HTMLAudioElement {
//     return this.audioRef.nativeElement;
//   }

//   private load(track: Track): void {
//     this.engine.ensureContext();
//     this.engine.attach(this.deck, this.audio); // one-time wiring
//     this.loadError.set('');
//     this.audio.src = track.audioUrl;
//     this.audio.load();
//     this.playing.set(false);
//     this.progress.set(0);
//     this.bpm.set(track.bpm ?? 0);
//     this.pads.forEach((p) => (p.time = null));
//     if (!track.bpm) void this.analyze();
//     // The tap that selected this track is a user gesture, so we can start
//     // playback immediately in the mixer.
//     this.autoPlay();
//   }

//   private autoPlay(): void {
//     this.engine.ensureContext();
//     this.audio
//       .play()
//       .then(() => {
//         this.playing.set(true);
//         this.tick();
//       })
//       .catch(() => {
//         // Autoplay blocked — leave paused; the play button will work.
//         this.playing.set(false);
//       });
//   }

//   onError(): void {
//     if (!this.track) return;
//     if (this.track.source === 'local' || this.track.source === 'demo') {
//       this.loadError.set('This file could not be decoded.');
//     } else {
//       this.loadError.set('This host blocked playback — try another result or add a local file.');
//     }
//     this.playing.set(false);
//   }

//   onLoaded(): void {
//     // metadata ready — nothing extra needed, duration now available
//   }

//   toggle(): void {
//     if (!this.track) return;
//     this.engine.ensureContext();
//     if (this.audio.paused) {
//       void this.audio.play();
//       this.playing.set(true);
//       this.tick();
//     } else {
//       this.audio.pause();
//       this.playing.set(false);
//       cancelAnimationFrame(this.raf);
//     }
//   }

//   onEnded(): void {
//     this.playing.set(false);
//     this.progress.set(0);
//     cancelAnimationFrame(this.raf);
//   }

//   private tick = (): void => {
//     if (this.audio.duration) this.progress.set(this.audio.currentTime / this.audio.duration);
//     if (this.playing()) this.raf = requestAnimationFrame(this.tick);
//   };

//   // -- jog nudge: temporary pitch bend + glitch intensity --------------------
//   onNudge(amount: number): void {
//     if (!this.track) return;
//     this.engine.setGlitchIntensity(this.deck, Math.abs(amount));
//     if (amount === 0) {
//       this.audio.playbackRate = this.baseRate;
//       return;
//     }
//     const bent = this.baseRate * (1 + amount * 0.35);
//     this.audio.playbackRate = Math.min(4, Math.max(0.25, bent));
//   }

//   /** Touching the disk engages the glitch effect on this deck. */
//   onScratchStart(): void {
//     this.engine.startGlitch(this.deck);
//   }
//   onScratchEnd(): void {
//     this.engine.stopGlitch(this.deck);
//     this.audio.playbackRate = this.baseRate;
//   }

//   // -- EQ + filter ------------------------------------------------------------
//   setEq(band: 'low' | 'mid' | 'high', value: number): void {
//     this.engine.setEq(this.deck, band, value);
//   }
//   setFilter(value: number): void {
//     this.filter = value;
//     this.engine.setFilter(this.deck, value);
//     this.filterHz.set(this.engine.filterHz(this.deck));
//   }

//   // -- cue pads: set on empty, jump on set -----------------------------------
//   hitPad(i: number): void {
//     if (!this.track) return;
//     const pad = this.pads[i];
//     if (pad.time === null) {
//       pad.time = this.audio.currentTime;
//     } else {
//       this.audio.currentTime = pad.time;
//       if (!this.playing()) this.toggle();
//     }
//   }

//   // Momentary preview from cue point (hardware CUE behaviour).
//   cuePreview(): void {
//     if (!this.track) return;
//     this.cueReturn = this.audio.currentTime;
//     void this.audio.play();
//     this.playing.set(true);
//     this.tick();
//   }
//   cueRelease(): void {
//     if (this.cueReturn === null) return;
//     this.audio.pause();
//     this.audio.currentTime = this.cueReturn;
//     this.cueReturn = null;
//     this.playing.set(false);
//     cancelAnimationFrame(this.raf);
//   }

//   // -- beat / BPM detection ---------------------------------------------------
//   async analyze(): Promise<void> {
//     if (!this.track || this.analyzing()) return;
//     this.analyzing.set(true);
//     const buf = await this.library.fetchArrayBuffer(this.track);
//     if (!buf) {
//       this.analyzing.set(false);
//       return; // remote CORS blocked decode; playback still works
//     }
//     try {
//       const result = await this.detector.analyze(buf);
//       if (result.bpm) {
//         this.bpm.set(result.bpm);
//         this.track.bpm = result.bpm;
//       }
//     } finally {
//       this.analyzing.set(false);
//     }
//   }

//   ngOnDestroy(): void {
//     cancelAnimationFrame(this.raf);
//   }
// }

import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Track, DeckId } from '../../models/track.model';
import { AudioEngineService, FxName } from '../../services/audio-engine.service';
import { BeatDetectorService } from '../../services/beat-detector.service';
import { MusicLibraryService } from '../../services/music-library.service';
import { KnobComponent } from '../knob/knob.component';
import { FaderComponent } from '../fader/fader.component';
import { JogWheelComponent } from '../jog-wheel/jog-wheel.component';

interface CuePad {
  time: number | null;
  color: 'cyan' | 'magenta';
}

@Component({
  selector: 'app-deck',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, KnobComponent, FaderComponent, JogWheelComponent],
  template: `
    <section class="deck" [class.b]="deck === 'B'">
      <audio
        #audio
        crossorigin="anonymous"
        preload="auto"
        (loadedmetadata)="onLoaded()"
        (ended)="onEnded()"
        (error)="onError()"
      ></audio>

      <!-- title + BPM readout -->
      <header class="head">
        <div class="badge">DECK {{ deck }}</div>
        <div class="meta">
          <div class="title">{{ track?.title || 'No track loaded' }}</div>
          @if (loadError()) {
            <div class="artist err">{{ loadError() }}</div>
          } @else {
            <div class="artist">{{ track?.artist || '—' }}</div>
          }
        </div>
        <div class="bpm">
          <span class="num">{{ bpm() ? bpm() : '––' }}</span>
          <span class="hw-label">BPM</span>
          @if (analyzing()) { <span class="hw-label pulse">analyzing…</span> }
        </div>
      </header>

      <!-- jog + transport -->
      <div class="stage">
        <app-jog-wheel
          style="--jog: 172px"
          [spinning]="playing()"
          [progress]="progress()"
          [accent]="deck === 'B' ? 'magenta' : 'cyan'"
          (nudge)="onNudge($event)"
          (touchStart)="onScratchStart()"
          (touchEnd)="onScratchEnd()"
        ></app-jog-wheel>

        <div class="transport">
          <button class="cue" (pointerdown)="cuePreview()" (pointerup)="cueRelease()">CUE</button>
          <button class="play" [class.on]="playing()" (click)="toggle()">
            {{ playing() ? '❚❚' : '▶' }}
          </button>
          <button class="sync" (click)="analyze()" [disabled]="!track">BEAT</button>
        </div>
      </div>

      <!-- performance FX pads: one-shot sound effects layered onto this deck -->
      <div class="fx-head hw-label">FX PADS</div>
      <div class="fx-pads">
        @for (fx of fxPads; track fx.name) {
          <button
            class="fx-pad"
            [style.--h]="fx.hue"
            (pointerdown)="triggerFx(fx.name)"
            [attr.aria-label]="'Play ' + fx.label + ' sound effect on deck ' + deck"
          >
            {{ fx.label }}
          </button>
        }
      </div>

      <!-- cue pads (mirror the coloured pads on the hardware) -->
      <div class="pads">
        @for (pad of pads; track $index) {
          <button
            class="pad"
            [class.cyan]="pad.color === 'cyan'"
            [class.magenta]="pad.color === 'magenta'"
            [class.set]="pad.time !== null"
            (click)="hitPad($index)"
          >
            {{ $index + 1 }}
          </button>
        }
      </div>

      <!-- EQ + filter knobs -->
      <div class="knobs">
        <app-knob label="HIGH" [value]="eqHigh" (valueChange)="setEq('high', $event); eqHigh = $event"></app-knob>
        <app-knob label="MID" [value]="eqMid" (valueChange)="setEq('mid', $event); eqMid = $event"></app-knob>
        <app-knob label="LOW" [value]="eqLow" (valueChange)="setEq('low', $event); eqLow = $event"></app-knob>
        <app-knob
          label="FILTER"
          [accent]="true"
          [value]="filter"
          (valueChange)="setFilter($event)"
        ></app-knob>
      </div>
      <div class="filter-read hw-label">CUTOFF {{ filterHz() }} Hz</div>
    </section>
  `,
  styles: [
    `
      .deck {
        background: linear-gradient(180deg, var(--chassis-hi), var(--chassis) 60%, var(--chassis-lo));
        border: 1px solid var(--edge);
        border-radius: var(--r-lg);
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 10px 30px rgba(0, 0, 0, 0.45);
      }
      .head { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; }
      .badge {
        font-family: var(--label);
        font-size: 10px;
        letter-spacing: 0.15em;
        color: var(--cyan);
        border: 1px solid var(--cyan-dim);
        border-radius: 4px;
        padding: 3px 6px;
      }
      .b .badge { color: var(--magenta); border-color: var(--magenta-dim); }
      .meta { min-width: 0; }
      .title { font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .artist { font-size: 11px; color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .artist.err { color: var(--amber); white-space: normal; }
      .bpm { text-align: right; display: flex; flex-direction: column; align-items: flex-end; }
      .bpm .num { font-family: var(--label); font-size: 22px; font-weight: 700; color: var(--ink); line-height: 1; }
      .pulse { color: var(--amber); animation: blink 1s steps(2) infinite; }
      @keyframes blink { 50% { opacity: 0.3; } }

      .stage { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 14px; }
      .transport { display: flex; flex-direction: column; gap: 8px; }
      .transport button {
        border: 1px solid var(--edge);
        background: linear-gradient(180deg, var(--panel), var(--chassis-lo));
        color: var(--ink);
        border-radius: 8px;
        padding: 10px 12px;
        font-family: var(--label);
        font-size: 12px;
        letter-spacing: 0.1em;
        cursor: pointer;
      }
      .transport button:active { transform: translateY(1px); }
      .play { font-size: 16px !important; }
      .play.on { border-color: var(--cyan); color: var(--cyan); box-shadow: 0 0 12px var(--cyan-dim); }
      .b .play.on { border-color: var(--magenta); color: var(--magenta); box-shadow: 0 0 12px var(--magenta-dim); }
      .sync:disabled { opacity: 0.4; cursor: not-allowed; }

      /* performance FX pads — colourful sampler bank under the jog wheel */
      .fx-head { opacity: 0.8; margin-bottom: -6px; }
      .fx-pads { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
      .fx-pad {
        aspect-ratio: 1.6 / 1;
        border-radius: 8px;
        border: 1px solid hsl(var(--h) 60% 42%);
        background: hsl(var(--h) 45% 12%);
        color: hsl(var(--h) 90% 72%);
        font-family: var(--label);
        font-weight: 700;
        font-size: 10px;
        letter-spacing: 0.06em;
        cursor: pointer;
        transition: background 0.1s, box-shadow 0.1s, transform 0.05s;
        box-shadow: inset 0 0 10px hsl(var(--h) 80% 45% / 0.22);
      }
      .fx-pad:hover { background: hsl(var(--h) 55% 18%); }
      .fx-pad:active {
        transform: translateY(1px);
        background: hsl(var(--h) 85% 55%);
        color: #0a0b0d;
        box-shadow: 0 0 16px hsl(var(--h) 90% 58% / 0.75), inset 0 0 10px rgba(0, 0, 0, 0.25);
      }

      .pads { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
      .pad {
        aspect-ratio: 1.6 / 1;
        border-radius: 8px;
        border: 1px solid var(--edge);
        background: #14161a;
        color: var(--ink-faint);
        font-family: var(--label);
        font-weight: 700;
        cursor: pointer;
        transition: box-shadow 0.1s, background 0.1s;
      }
      .pad:active { transform: translateY(1px); }
      .pad.cyan.set { background: rgba(34, 211, 238, 0.16); color: var(--cyan); box-shadow: inset 0 0 12px var(--cyan-dim), 0 0 8px var(--cyan-dim); border-color: var(--cyan-dim); }
      .pad.magenta.set { background: rgba(240, 57, 139, 0.16); color: var(--magenta); box-shadow: inset 0 0 12px var(--magenta-dim), 0 0 8px var(--magenta-dim); border-color: var(--magenta-dim); }

      .knobs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; justify-items: center; padding-top: 4px; }
      .filter-read { text-align: center; }
    `,
  ],
})
export class DeckComponent implements OnChanges, OnDestroy {
  @Input() deck: DeckId = 'A';
  @Input() track: Track | null = null;

  @ViewChild('audio', { static: true }) audioRef!: ElementRef<HTMLAudioElement>;

  private engine = inject(AudioEngineService);
  private detector = inject(BeatDetectorService);
  private library = inject(MusicLibraryService);

  readonly playing = signal(false);
  readonly progress = signal(0);
  readonly bpm = signal<number>(0);
  readonly analyzing = signal(false);
  readonly filterHz = signal(20000);
  readonly loadError = signal<string>('');

  eqLow = 0;
  eqMid = 0;
  eqHigh = 0;
  filter = 0;

  pads: CuePad[] = [
    { time: null, color: 'cyan' },
    { time: null, color: 'magenta' },
    { time: null, color: 'cyan' },
    { time: null, color: 'magenta' },
  ];

  /** Performance-pad bank: each fires a distinct one-shot sound effect. */
  readonly fxPads: { name: FxName; label: string; hue: number }[] = [
    { name: 'airhorn', label: 'HORN', hue: 320 },
    { name: 'riser', label: 'RISER', hue: 275 },
    { name: 'laser', label: 'LASER', hue: 190 },
    { name: 'siren', label: 'SIREN', hue: 45 },
    { name: 'boom', label: 'BOOM', hue: 8 },
    { name: 'zap', label: 'ZAP', hue: 150 },
    { name: 'scratch', label: 'SCRATCH', hue: 95 },
    { name: 'stab', label: 'STAB', hue: 225 },
  ];

  private baseRate = 1;
  private raf = 0;
  private cueReturn: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['track'] && this.track) this.load(this.track);
  }

  private get audio(): HTMLAudioElement {
    return this.audioRef.nativeElement;
  }

  private load(track: Track): void {
    this.engine.ensureContext();
    this.engine.attach(this.deck, this.audio); // one-time wiring
    this.loadError.set('');
    this.audio.src = track.audioUrl;
    this.audio.load();
    this.playing.set(false);
    this.progress.set(0);
    this.bpm.set(track.bpm ?? 0);
    this.pads.forEach((p) => (p.time = null));
    if (!track.bpm) void this.analyze();
    // The tap that selected this track is a user gesture, so we can start
    // playback immediately in the mixer.
    this.autoPlay();
  }

  private autoPlay(): void {
    this.engine.ensureContext();
    this.audio
      .play()
      .then(() => {
        this.playing.set(true);
        this.tick();
      })
      .catch(() => {
        // Autoplay blocked — leave paused; the play button will work.
        this.playing.set(false);
      });
  }

  onError(): void {
    if (!this.track) return;
    if (this.track.source === 'local' || this.track.source === 'demo') {
      this.loadError.set('This file could not be decoded.');
    } else {
      this.loadError.set('This host blocked playback — try another result or add a local file.');
    }
    this.playing.set(false);
  }

  onLoaded(): void {
    // metadata ready — nothing extra needed, duration now available
  }

  toggle(): void {
    if (!this.track) return;
    this.engine.ensureContext();
    if (this.audio.paused) {
      void this.audio.play();
      this.playing.set(true);
      this.tick();
    } else {
      this.audio.pause();
      this.playing.set(false);
      cancelAnimationFrame(this.raf);
    }
  }

  onEnded(): void {
    this.playing.set(false);
    this.progress.set(0);
    cancelAnimationFrame(this.raf);
  }

  private tick = (): void => {
    if (this.audio.duration) this.progress.set(this.audio.currentTime / this.audio.duration);
    if (this.playing()) this.raf = requestAnimationFrame(this.tick);
  };

  // -- jog nudge: temporary pitch bend + glitch intensity --------------------
  onNudge(amount: number): void {
    if (!this.track) return;
    this.engine.setGlitchIntensity(this.deck, Math.abs(amount));
    if (amount === 0) {
      this.audio.playbackRate = this.baseRate;
      return;
    }
    const bent = this.baseRate * (1 + amount * 0.35);
    this.audio.playbackRate = Math.min(4, Math.max(0.25, bent));
  }

  /** Touching the disk engages the glitch effect on this deck. */
  onScratchStart(): void {
    this.engine.startGlitch(this.deck);
  }
  onScratchEnd(): void {
    this.engine.stopGlitch(this.deck);
    this.audio.playbackRate = this.baseRate;
  }

  // -- performance FX pads: fire a one-shot effect into this deck's channel ---
  triggerFx(name: FxName): void {
    // Works even before a track is loaded: make sure the deck is wired first.
    this.engine.ensureContext();
    this.engine.attach(this.deck, this.audio);
    this.engine.triggerFx(this.deck, name);
  }

  // -- EQ + filter ------------------------------------------------------------
  setEq(band: 'low' | 'mid' | 'high', value: number): void {
    this.engine.setEq(this.deck, band, value);
  }
  setFilter(value: number): void {
    this.filter = value;
    this.engine.setFilter(this.deck, value);
    this.filterHz.set(this.engine.filterHz(this.deck));
  }

  // -- cue pads: set on empty, jump on set -----------------------------------
  hitPad(i: number): void {
    if (!this.track) return;
    const pad = this.pads[i];
    if (pad.time === null) {
      pad.time = this.audio.currentTime;
    } else {
      this.audio.currentTime = pad.time;
      if (!this.playing()) this.toggle();
    }
  }

  // Momentary preview from cue point (hardware CUE behaviour).
  cuePreview(): void {
    if (!this.track) return;
    this.cueReturn = this.audio.currentTime;
    void this.audio.play();
    this.playing.set(true);
    this.tick();
  }
  cueRelease(): void {
    if (this.cueReturn === null) return;
    this.audio.pause();
    this.audio.currentTime = this.cueReturn;
    this.cueReturn = null;
    this.playing.set(false);
    cancelAnimationFrame(this.raf);
  }

  // -- beat / BPM detection ---------------------------------------------------
  async analyze(): Promise<void> {
    if (!this.track || this.analyzing()) return;
    this.analyzing.set(true);
    const buf = await this.library.fetchArrayBuffer(this.track);
    if (!buf) {
      this.analyzing.set(false);
      return; // remote CORS blocked decode; playback still works
    }
    try {
      const result = await this.detector.analyze(buf);
      if (result.bpm) {
        this.bpm.set(result.bpm);
        this.track.bpm = result.bpm;
      }
    } finally {
      this.analyzing.set(false);
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
  }
}

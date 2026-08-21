import { Component, Input, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Track } from '../../models/track.model';
import { AudioEngineService } from '../../services/audio-engine.service';
import { DeckComponent } from '../deck/deck.component';
import { FaderComponent } from '../fader/fader.component';

/**
 * Full mixer surface: Deck A | channel strip (line faders + crossfader) | Deck B.
 * Layout collapses to a single column on narrow / touch screens.
 */
@Component({
  selector: 'app-dj-mixer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DeckComponent, FaderComponent],
  template: `
    <div class="surface">
      <app-deck deck="A" [track]="trackA"></app-deck>

      <div class="channel">
        <div class="hw-label brand">BEATBOX · 2CH</div>
        <div class="lines">
          <div class="line">
            <app-fader label="Volume A" [value]="volA" (valueChange)="setVol('A', $event)"></app-fader>
            <span class="hw-label">CH A</span>
          </div>
          <div class="line">
            <app-fader label="Volume B" [value]="volB" (valueChange)="setVol('B', $event)"></app-fader>
            <span class="hw-label">CH B</span>
          </div>
        </div>

        <div class="xf">
          <div class="xf-ends"><span class="hw-label">A</span><span class="hw-label">B</span></div>
          <app-fader
            orientation="horizontal"
            label="Crossfader"
            [value]="xfade"
            (valueChange)="setXfade($event)"
          ></app-fader>
          <div class="hw-label center">CROSSFADER</div>
        </div>
      </div>

      <app-deck deck="B" [track]="trackB"></app-deck>
    </div>
  `,
  styles: [
    `
      .surface {
        display: grid;
        grid-template-columns: 1fr 190px 1fr;
        gap: 14px;
        align-items: stretch;
      }
      .channel {
        background: linear-gradient(180deg, var(--chassis-hi), var(--chassis-lo));
        border: 1px solid var(--edge);
        border-radius: var(--r-lg);
        padding: 16px 14px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }
      .brand { color: var(--cyan); letter-spacing: 0.2em; }
      .lines { display: flex; gap: 26px; flex: 1; align-items: flex-start; }
      .line { display: flex; flex-direction: column; align-items: center; gap: 8px; }
      .xf { width: 100%; display: flex; flex-direction: column; gap: 6px; align-items: center; }
      .xf-ends { width: 100%; display: flex; justify-content: space-between; padding: 0 4px; }
      .center { text-align: center; }

      @media (max-width: 900px) {
        .surface { grid-template-columns: 1fr; }
        .channel { order: 3; }
        .lines { justify-content: center; gap: 48px; }
      }
    `,
  ],
})
export class DjMixerComponent {
  @Input() trackA: Track | null = null;
  @Input() trackB: Track | null = null;

  private engine = inject(AudioEngineService);

  volA = 0.85;
  volB = 0.85;
  xfade = 0.5;

  setVol(deck: 'A' | 'B', v: number): void {
    if (deck === 'A') this.volA = v;
    else this.volB = v;
    this.engine.setVolume(deck, v);
  }

  setXfade(v: number): void {
    this.xfade = v;
    this.engine.setCrossfade(v);
  }
}

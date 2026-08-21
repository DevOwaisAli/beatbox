import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Track, DeckId } from './models/track.model';
import { MusicLibraryService } from './services/music-library.service';
import { SearchBarComponent } from './components/search-bar/search-bar.component';
import { SongMenuComponent } from './components/song-menu/song-menu.component';
import { DjMixerComponent } from './components/dj-mixer/dj-mixer.component';
import { ThemePickerComponent } from './components/theme-picker/theme-picker.component';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SearchBarComponent, SongMenuComponent, DjMixerComponent, ThemePickerComponent],
  template: `
    <main class="app">
      <header class="top">
        <div class="wordmark">
          <span class="dot"></span> BEATBOX
          <span class="sub hw-label">browser dj · web audio</span>
        </div>
        <app-theme-picker></app-theme-picker>
      </header>

      <app-search-bar
        (search)="onSearch($event)"
        (filesAdded)="onFiles($event)"
      ></app-search-bar>

      <app-song-menu
        [tracks]="library.tracks()"
        [loadedA]="trackA()?.id ?? null"
        [loadedB]="trackB()?.id ?? null"
        (load)="onLoad($event)"
      ></app-song-menu>

      @if (library.notice()) {
        <div class="notice hw-label">{{ library.notice() }}</div>
      }
      @if (library.loading()) {
        <div class="notice hw-label">Searching…</div>
      }

      <app-dj-mixer [trackA]="trackA()" [trackB]="trackB()"></app-dj-mixer>

      <footer class="foot hw-label">
        Tip: turn LOW / MID / HIGH to sculpt EQ, sweep FILTER for the cutoff,
        ride the crossfader to blend A↔B. BEAT re-analyzes the tempo.
      </footer>
    </main>
  `,
  styles: [
    `
      .app {
        max-width: 1180px;
        margin: 0 auto;
        padding: 20px 18px 40px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .top { display: flex; align-items: center; justify-content: space-between; }
      .wordmark {
        display: flex;
        align-items: baseline;
        gap: 10px;
        font-family: var(--ui);
        font-weight: 800;
        font-size: 22px;
        letter-spacing: 0.04em;
      }
      .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--cyan);
        box-shadow: 0 0 12px var(--cyan);
        align-self: center;
      }
      .sub { font-weight: 400; }
      .notice {
        background: rgba(255, 176, 32, 0.08);
        border: 1px solid rgba(255, 176, 32, 0.3);
        color: var(--amber);
        border-radius: 8px;
        padding: 8px 12px;
      }
      .foot { text-align: center; padding-top: 6px; line-height: 1.6; }
    `,
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  readonly library = inject(MusicLibraryService);
  private theme = inject(ThemeService);

  readonly trackA = signal<Track | null>(null);
  readonly trackB = signal<Track | null>(null);

  ngOnInit(): void {
    this.theme.init();
    void this.library.seedCharts();
  }

  onSearch(query: string): void {
    void this.library.search(query);
  }

  onFiles(files: FileList): void {
    const added = this.library.addLocalFiles(files);
    // Auto-load the first uploaded track onto the empty deck for instant play.
    if (added.length) {
      if (!this.trackA()) this.trackA.set(added[0]);
      else if (!this.trackB()) this.trackB.set(added[0]);
    }
  }

  onLoad(event: { track: Track; deck: DeckId }): void {
    if (event.deck === 'A') this.trackA.set(event.track);
    else this.trackB.set(event.track);
  }

  ngOnDestroy(): void {
    this.library.dispose();
  }
}

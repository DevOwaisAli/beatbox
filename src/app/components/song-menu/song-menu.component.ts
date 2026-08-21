import {
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Track, DeckId } from '../../models/track.model';

/**
 * The main menu bar: tracks rendered as small circles, scrollable
 * horizontally. An A / B toggle picks which deck a tapped circle loads onto.
 */
@Component({
  selector: 'app-song-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="menu">
      <div class="target" role="group" aria-label="Load target deck">
        <button [class.on]="target() === 'A'" (click)="target.set('A')">A</button>
        <button [class.on]="target() === 'B'" class="b" (click)="target.set('B')">B</button>
      </div>

      <div class="rail">
        @for (t of tracks; track t.id) {
          <button
            class="chip"
            [class.a]="t.id === loadedA"
            [class.b]="t.id === loadedB"
            (click)="pick(t)"
            [title]="t.artist + ' — ' + t.title"
          >
            <span class="disc">
              @if (t.artworkUrl) {
                <img [src]="t.artworkUrl" [alt]="t.title" />
              } @else {
                <span class="initials">{{ initials(t) }}</span>
              }
              <span class="hole"></span>
            </span>
            <span class="name">{{ t.title }}</span>
            @if (t.bpm) { <span class="tag">{{ t.bpm }}</span> }
          </button>
        }
        @if (!tracks.length) {
          <div class="empty hw-label">No tracks — search or add your own with ＋</div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .menu { display: flex; align-items: center; gap: 12px; }
      .target { display: flex; gap: 4px; flex: none; }
      .target button {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 1px solid var(--edge);
        background: #14161a;
        color: var(--ink-faint);
        font-family: var(--label);
        font-weight: 700;
        cursor: pointer;
      }
      .target button.on { color: var(--cyan); border-color: var(--cyan); box-shadow: 0 0 10px var(--cyan-dim); }
      .target button.b.on { color: var(--magenta); border-color: var(--magenta); box-shadow: 0 0 10px var(--magenta-dim); }

      .rail {
        display: flex;
        gap: 16px;
        overflow-x: auto;
        padding: 6px 4px 10px;
        scroll-snap-type: x proximity;
        flex: 1;
        -webkit-overflow-scrolling: touch;
      }
      .chip {
        flex: 0 0 auto;
        width: 78px;
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        scroll-snap-align: start;
        color: var(--ink-soft);
      }
      .disc {
        position: relative;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        overflow: hidden;
        background:
          repeating-conic-gradient(from 0deg, #26282d 0deg 4deg, #202226 4deg 8deg),
          radial-gradient(circle, #33373e, #14161a 80%);
        box-shadow: inset 0 0 10px #000, 0 4px 10px rgba(0, 0, 0, 0.5);
        transition: transform 0.12s, box-shadow 0.12s;
      }
      .chip:hover .disc { transform: translateY(-2px); }
      .disc img { width: 100%; height: 100%; object-fit: cover; }
      .initials { font-family: var(--label); font-weight: 700; color: var(--ink); font-size: 18px; }
      .hole {
        position: absolute;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--bg);
        box-shadow: inset 0 0 0 2px #2b2e34;
      }
      .chip.a .disc { box-shadow: 0 0 0 2px var(--cyan), 0 0 14px var(--cyan-dim); }
      .chip.b .disc { box-shadow: 0 0 0 2px var(--magenta), 0 0 14px var(--magenta-dim); }
      .name {
        font-size: 11px;
        max-width: 78px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tag { font-family: var(--label); font-size: 9px; color: var(--ink-faint); }
      .empty { padding: 24px 8px; }
    `,
  ],
})
export class SongMenuComponent {
  @Input() tracks: Track[] = [];
  @Input() loadedA: string | null = null;
  @Input() loadedB: string | null = null;
  @Output() load = new EventEmitter<{ track: Track; deck: DeckId }>();

  readonly target = signal<DeckId>('A');

  pick(track: Track): void {
    this.load.emit({ track, deck: this.target() });
  }

  initials(t: Track): string {
    return (t.title || '?').trim().slice(0, 2).toUpperCase();
  }
}

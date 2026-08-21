import {
  Component,
  EventEmitter,
  Output,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="bar">
      <span class="ic" aria-hidden="true">⌕</span>
      <input
        type="search"
        [(ngModel)]="query"
        (keydown.enter)="emit()"
        placeholder="Search Creative-Commons tracks…"
        aria-label="Search tracks"
      />
      <button class="go" (click)="emit()">Search</button>
      <button class="add" title="Add your own audio files" (click)="file.click()">＋</button>
      <input
        #file
        type="file"
        accept="audio/*"
        multiple
        hidden
        (change)="onFiles($event)"
      />
    </div>
  `,
  styles: [
    `
      .bar {
        display: flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(180deg, var(--chassis-hi), var(--chassis-lo));
        border: 1px solid var(--edge);
        border-radius: 999px;
        padding: 8px 8px 8px 16px;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
      }
      .ic { color: var(--ink-faint); font-size: 18px; }
      input[type='search'] {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--ink);
        font-family: var(--ui);
        font-size: 15px;
      }
      input[type='search']::placeholder { color: var(--ink-faint); }
      .go, .add {
        border: none;
        cursor: pointer;
        color: var(--bg);
        font-weight: 700;
        border-radius: 999px;
      }
      .go {
        background: var(--cyan);
        padding: 8px 18px;
        font-family: var(--ui);
      }
      .add {
        background: var(--magenta);
        width: 38px;
        height: 38px;
        font-size: 20px;
        line-height: 1;
      }
      .go:active, .add:active { transform: translateY(1px); }
    `,
  ],
})
export class SearchBarComponent {
  query = '';
  @Output() search = new EventEmitter<string>();
  @Output() filesAdded = new EventEmitter<FileList>();

  @ViewChild('file') fileInput!: ElementRef<HTMLInputElement>;

  emit(): void {
    if (this.query.trim()) this.search.emit(this.query.trim());
  }

  onFiles(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) this.filesAdded.emit(input.files);
    input.value = '';
  }
}

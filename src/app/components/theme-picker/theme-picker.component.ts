import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-theme-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="themes" role="group" aria-label="Colour theme">
      <span class="hw-label">THEME</span>
      @for (t of theme.themes; track t.id) {
        <button
          class="sw"
          [class.on]="theme.current() === t.id"
          [style.background]="t.swatch"
          [attr.aria-pressed]="theme.current() === t.id"
          [title]="t.label"
          (click)="theme.set(t.id)"
        ></button>
      }
    </div>
  `,
  styles: [
    `
      .themes {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .sw {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 1px solid var(--edge);
        cursor: pointer;
        padding: 0;
        position: relative;
        box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.4);
        transition: transform 0.1s;
      }
      .sw:hover { transform: scale(1.1); }
      .sw.on {
        border-color: var(--cyan);
        box-shadow: 0 0 0 2px var(--cyan), inset 0 0 4px rgba(0, 0, 0, 0.4);
      }
      .sw:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }
    `,
  ],
})
export class ThemePickerComponent {
  readonly theme = inject(ThemeService);
}

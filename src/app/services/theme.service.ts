import { Injectable, signal } from '@angular/core';

export interface ThemeDef {
  id: string;
  label: string;
  /** Preview swatch shown in the picker. */
  swatch: string;
}

/**
 * Swaps the whole palette by setting `data-theme` on <html>; every component
 * reads CSS custom properties, so one attribute re-skins the entire mixer.
 * The choice persists across reloads.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly themes: ThemeDef[] = [
    { id: 'dark', label: 'Dark', swatch: '#0a0b0d' },
    { id: 'light', label: 'Light', swatch: '#eceef2' },
    { id: 'synthwave', label: 'Synthwave', swatch: '#241a3e' },
    { id: 'chrome', label: 'Chrome', swatch: '#c7ccd3' },
  ];

  readonly current = signal<string>('dark');

  init(): void {
    let saved = 'dark';
    try {
      saved = localStorage.getItem('beatbox-theme') || 'dark';
    } catch {
      /* storage unavailable — stay on default */
    }
    this.set(this.themes.some((t) => t.id === saved) ? saved : 'dark');
  }

  set(id: string): void {
    this.current.set(id);
    document.documentElement.setAttribute('data-theme', id);
    try {
      localStorage.setItem('beatbox-theme', id);
    } catch {
      /* ignore */
    }
  }
}

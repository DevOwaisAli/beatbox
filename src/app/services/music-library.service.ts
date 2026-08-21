import { Injectable, signal } from '@angular/core';
import { Track } from '../models/track.model';

/**
 * Sources of loadable audio — all legal:
 *
 *  1. DEMO   : short loops synthesised in-browser (OfflineAudioContext ->
 *              WAV blob). Zero setup, zero copyright, always playable.
 *  2. LOCAL  : the user's own files via file picker / drag-drop.
 *  3. JAMENDO: Creative-Commons catalogue search (needs a free client id).
 *
 * Commercial "top-chart" songs from YouTube are intentionally NOT here:
 * ripping them is against copyright + YouTube's ToS, and browsers block
 * cross-origin decode of those streams anyway.
 */
@Injectable({ providedIn: 'root' })
export class MusicLibraryService {
  /** App identifier Audius requires on every request. */
  private readonly appName = 'BeatboxDJ';
  /** Resolved Audius discovery-node host (picked from api.audius.co). */
  private audiusHost = '';

  /** Optional: drop a free key from https://developer.jamendo.com to also allow CC search. */
  private readonly jamendoClientId = '';

  readonly tracks = signal<Track[]>([]);
  readonly loading = signal(false);
  readonly notice = signal<string>('');

  private objectUrls: string[] = [];

  /** Build the starter "charts" — generated loops so the app works immediately. */
  async seedCharts(): Promise<void> {
    try {
      const demos: Track[] = [
        await this.makeDemo('house-groove', 'House Groove', 'Beatbox Engine', 124, 'global'),
        await this.makeDemo('bhangra-drive', 'Bhangra Drive', 'Beatbox Engine', 100, 'pk'),
        await this.makeDemo('trap-roller', 'Trap Roller', 'Beatbox Engine', 140, 'global'),
        await this.makeDemo('desi-lofi', 'Desi Lo-Fi', 'Beatbox Engine', 88, 'pk'),
        await this.makeDemo('tech-pulse', 'Tech Pulse', 'Beatbox Engine', 128, 'global'),
      ];
      this.tracks.set(demos);
      this.notice.set(
        'Built-in demo loops loaded. Search for real tracks (Audius) or drop your own files with ＋.',
      );
    } catch (err) {
      console.error('Demo seed failed:', err);
      this.notice.set(
        'Could not generate demo audio in this browser. Search for tracks or add your own files with ＋.',
      );
      this.tracks.set([]);
    }
  }

  /**
   * Search real, artist-distributed tracks via Audius (open API, no key,
   * legal to stream). Falls back to Jamendo Creative-Commons if a key is set.
   */
  async search(query: string): Promise<void> {
    const q = query.trim();
    if (!q) return;
    this.loading.set(true);
    this.notice.set('');
    try {
      const found = await this.searchAudius(q);
      if (found.length) {
        this.tracks.set(found);
        return;
      }
      // Nothing on Audius — try Jamendo if configured.
      if (this.jamendoClientId) {
        const cc = await this.searchJamendo(q);
        this.tracks.set(cc);
        if (!cc.length) this.notice.set(`No matches for “${q}”.`);
      } else {
        this.notice.set(`No matches for “${q}”. Try another spelling, or add files with ＋.`);
        this.tracks.set([]);
      }
    } catch (err) {
      console.error('Search failed:', err);
      this.notice.set('Search failed — check your connection, then try again.');
    } finally {
      this.loading.set(false);
    }
  }

  /** Pick (and cache) an Audius discovery node. */
  private async resolveAudiusHost(): Promise<string> {
    if (this.audiusHost) return this.audiusHost;
    const res = await fetch('https://api.audius.co');
    const json = (await res.json()) as { data: string[] };
    const hosts = json.data ?? [];
    if (!hosts.length) throw new Error('No Audius hosts available');
    this.audiusHost = hosts[Math.floor(Math.random() * hosts.length)];
    return this.audiusHost;
  }

  private async searchAudius(q: string): Promise<Track[]> {
    const host = await this.resolveAudiusHost();
    const url =
      `${host}/v1/tracks/search?query=${encodeURIComponent(q)}` +
      `&app_name=${this.appName}`;
    const res = await fetch(url);
    const json = (await res.json()) as {
      data: Array<{
        id: string;
        title: string;
        is_streamable?: boolean;
        user?: { name?: string; handle?: string };
        artwork?: { '150x150'?: string };
      }>;
    };
    return (json.data ?? [])
      .filter((t) => t.is_streamable !== false)
      .map((t) => ({
        id: `audius-${t.id}`,
        title: t.title,
        artist: t.user?.name || t.user?.handle || 'Unknown artist',
        audioUrl: `${host}/v1/tracks/${t.id}/stream?app_name=${this.appName}`,
        artworkUrl: t.artwork?.['150x150'],
        source: 'audius' as const,
        region: 'global' as const,
        corsSafe: true,
      }));
  }

  private async searchJamendo(q: string): Promise<Track[]> {
    const url =
      `https://api.jamendo.com/v3.0/tracks/?client_id=${this.jamendoClientId}` +
      `&format=json&limit=24&audioformat=mp32&include=musicinfo` +
      `&search=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    const json = (await res.json()) as {
      results: Array<{
        id: string;
        name: string;
        artist_name: string;
        audio: string;
        image: string;
      }>;
    };
    return (json.results ?? []).map((r) => ({
      id: `jam-${r.id}`,
      title: r.name,
      artist: r.artist_name,
      audioUrl: r.audio,
      artworkUrl: r.image,
      source: 'jamendo' as const,
      region: 'global' as const,
      corsSafe: true,
    }));
  }

  /** Add local files chosen by the user; prepends them to the menu. */
  addLocalFiles(files: FileList | File[]): Track[] {
    const added: Track[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('audio')) continue;
      const objectUrl = URL.createObjectURL(file);
      this.objectUrls.push(objectUrl);
      const { title, artist } = this.parseName(file.name);
      added.push({
        id: `local-${crypto.randomUUID()}`,
        title,
        artist,
        audioUrl: objectUrl,
        source: 'local',
        region: 'mine',
        corsSafe: true,
      });
    }
    if (added.length) {
      this.tracks.update((t) => [...added, ...t]);
      this.notice.set('');
    }
    return added;
  }

  /** Fetch a track's raw bytes for offline beat analysis (may fail on CORS). */
  async fetchArrayBuffer(track: Track): Promise<ArrayBuffer | null> {
    try {
      const res = await fetch(track.audioUrl);
      return await res.arrayBuffer();
    } catch {
      return null;
    }
  }

  // -- demo loop synthesis ----------------------------------------------------

  private async makeDemo(
    id: string,
    title: string,
    artist: string,
    bpm: number,
    region: Track['region'],
  ): Promise<Track> {
    const wav = await this.renderLoop(bpm);
    const objectUrl = URL.createObjectURL(wav);
    this.objectUrls.push(objectUrl);
    return {
      id: `demo-${id}`,
      title,
      artist,
      audioUrl: objectUrl,
      source: 'demo',
      region,
      bpm,
      corsSafe: true,
    };
  }

  /** Render an 8-bar four-on-the-floor loop to a WAV blob at a given BPM. */
  private async renderLoop(bpm: number): Promise<Blob> {
    const sampleRate = 44100;
    const beat = 60 / bpm;
    const bars = 8;
    const seconds = beat * 4 * bars;
    const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);

    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    const totalBeats = 4 * bars;
    for (let b = 0; b < totalBeats; b++) {
      const t = b * beat;
      this.kick(ctx, master, t);
      if (b % 2 === 1) this.snare(ctx, master, t);
      this.hat(ctx, master, t + beat / 2, 0.25);
      this.hat(ctx, master, t, 0.15);
    }

    const rendered = await ctx.startRendering();
    return this.encodeWav(rendered);
  }

  private kick(ctx: BaseAudioContext, out: AudioNode, t: number): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  private snare(ctx: BaseAudioContext, out: AudioNode, t: number): void {
    const noise = ctx.createBufferSource();
    const len = Math.floor(ctx.sampleRate * 0.2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noise.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    noise.connect(bp);
    bp.connect(g);
    g.connect(out);
    noise.start(t);
    noise.stop(t + 0.2);
  }

  private hat(ctx: BaseAudioContext, out: AudioNode, t: number, gain: number): void {
    const noise = ctx.createBufferSource();
    const len = Math.floor(ctx.sampleRate * 0.05);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noise.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    noise.connect(hp);
    hp.connect(g);
    g.connect(out);
    noise.start(t);
    noise.stop(t + 0.05);
  }

  /** Minimal 16-bit PCM WAV encoder. */
  private encodeWav(buffer: AudioBuffer): Blob {
    const numCh = buffer.numberOfChannels;
    const len = buffer.length * numCh * 2 + 44;
    const ab = new ArrayBuffer(len);
    const view = new DataView(ab);
    const channels: Float32Array[] = [];
    let offset = 0;

    const writeStr = (s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i));
    };
    const write32 = (v: number) => { view.setUint32(offset, v, true); offset += 4; };
    const write16 = (v: number) => { view.setUint16(offset, v, true); offset += 2; };

    writeStr('RIFF');
    write32(len - 8);
    writeStr('WAVE');
    writeStr('fmt ');
    write32(16);
    write16(1);
    write16(numCh);
    write32(buffer.sampleRate);
    write32(buffer.sampleRate * numCh * 2);
    write16(numCh * 2);
    write16(16);
    writeStr('data');
    write32(buffer.length * numCh * 2);

    for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c));
    for (let i = 0; i < buffer.length; i++) {
      for (let c = 0; c < numCh; c++) {
        let sample = Math.max(-1, Math.min(1, channels[c][i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
    }
    return new Blob([view], { type: 'audio/wav' });
  }

  private parseName(name: string): { title: string; artist: string } {
    const base = name.replace(/\.[^.]+$/, '');
    const parts = base.split(/\s+-\s+/);
    if (parts.length >= 2) return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
    return { title: base, artist: 'Unknown' };
  }

  dispose(): void {
    this.objectUrls.forEach((u) => URL.revokeObjectURL(u));
    this.objectUrls = [];
  }
}

// import { Injectable, signal } from '@angular/core';
// import { DeckId } from '../models/track.model';

// /**
//  * One channel strip in the mixer, mirroring a hardware DJ deck:
//  *
//  *   <audio> -> low(shelf) -> mid(peaking) -> high(shelf)
//  *           -> filter(sweep) -> gain(volume) -> xfade(gain) -> master
//  *
//  * The <audio> element is owned by the DeckComponent template and handed
//  * to us via `attach()`, so play/pause/seek/tempo stay simple while the
//  * whole chain still routes through Web Audio for real EQ + mixing.
//  */
// interface DeckNodes {
//   el: HTMLAudioElement;
//   src: MediaElementAudioSourceNode;
//   low: BiquadFilterNode;
//   mid: BiquadFilterNode;
//   high: BiquadFilterNode;
//   filter: BiquadFilterNode;
//   crusher: WaveShaperNode;
//   glitchGate: GainNode;
//   gain: GainNode;
//   xfade: GainNode;
//   analyser: AnalyserNode;
// }

// @Injectable({ providedIn: 'root' })
// export class AudioEngineService {
//   private ctx?: AudioContext;
//   private master?: GainNode;
//   private decks = new Map<DeckId, DeckNodes>();
//   /** Live glitch LFO state per deck while the jog disk is touched. */
//   private glitch = new Map<DeckId, { osc: OscillatorNode; mod: GainNode }>();

//   /** 0 = full A, 1 = full B. Center = both. */
//   readonly crossfade = signal(0.5);
//   readonly ready = signal(false);

//   /** Must be called from a user gesture (autoplay policy). */
//   ensureContext(): AudioContext {
//     if (!this.ctx) {
//       const Ctor =
//         window.AudioContext ||
//         (window as unknown as { webkitAudioContext: typeof AudioContext })
//           .webkitAudioContext;
//       this.ctx = new Ctor();
//       this.master = this.ctx.createGain();
//       this.master.gain.value = 0.9;
//       this.master.connect(this.ctx.destination);
//       this.ready.set(true);
//     }
//     if (this.ctx.state === 'suspended') void this.ctx.resume();
//     return this.ctx;
//   }

//   /** Wire an <audio> element into a deck's channel strip (idempotent). */
//   attach(deck: DeckId, el: HTMLAudioElement): void {
//     const ctx = this.ensureContext();
//     if (this.decks.has(deck)) return; // a MediaElementSource can only be created once per element

//     const src = ctx.createMediaElementSource(el);

//     const low = ctx.createBiquadFilter();
//     low.type = 'lowshelf';
//     low.frequency.value = 200;

//     const mid = ctx.createBiquadFilter();
//     mid.type = 'peaking';
//     mid.frequency.value = 1000;
//     mid.Q.value = 0.9;

//     const high = ctx.createBiquadFilter();
//     high.type = 'highshelf';
//     high.frequency.value = 3200;

//     // Bipolar "filter" knob: allpass at rest, sweeps to LP (left) / HP (right).
//     const filter = ctx.createBiquadFilter();
//     filter.type = 'allpass';
//     filter.frequency.value = 20000;
//     filter.Q.value = 1;

//     const gain = ctx.createGain();
//     gain.gain.value = 0.85;

//     // Glitch stage: bit-crusher (bypassed = null curve) feeding a gate whose
//     // gain is chopped by a square LFO while the jog disk is touched.
//     const crusher = ctx.createWaveShaper();
//     crusher.curve = null;
//     crusher.oversample = '4x';

//     const glitchGate = ctx.createGain();
//     glitchGate.gain.value = 1;

//     const xfade = ctx.createGain();
//     xfade.gain.value = 1;

//     const analyser = ctx.createAnalyser();
//     analyser.fftSize = 1024;
//     analyser.smoothingTimeConstant = 0.75;

//     src.connect(low);
//     low.connect(mid);
//     mid.connect(high);
//     high.connect(filter);
//     filter.connect(crusher);
//     crusher.connect(glitchGate);
//     glitchGate.connect(gain);
//     gain.connect(xfade);
//     gain.connect(analyser); // tap for meters (pre-crossfade so it always shows)
//     xfade.connect(this.master!);

//     this.decks.set(deck, {
//       el, src, low, mid, high, filter, crusher, glitchGate, gain, xfade, analyser,
//     });
//     this.applyCrossfade();
//   }

//   // -- EQ: knobs map -1..1 to +/-24 dB per band -------------------------------
//   setEq(deck: DeckId, band: 'low' | 'mid' | 'high', value: number): void {
//     const n = this.decks.get(deck);
//     if (!n) return;
//     const db = this.clamp(value, -1, 1) * 24;
//     n[band].gain.value = db;
//   }

//   /**
//    * Bipolar filter sweep. value -1..1:
//    *   < 0  -> lowpass, cutoff drops toward the bass as you turn left
//    *   > 0  -> highpass, cutoff rises toward the treble as you turn right
//    *     0  -> transparent (allpass)
//    */
//   setFilter(deck: DeckId, value: number): void {
//     const n = this.decks.get(deck);
//     if (!n) return;
//     const v = this.clamp(value, -1, 1);
//     if (Math.abs(v) < 0.02) {
//       n.filter.type = 'allpass';
//       n.filter.frequency.value = 20000;
//       return;
//     }
//     if (v < 0) {
//       n.filter.type = 'lowpass';
//       // exp map: 0 -> ~20kHz, -1 -> ~120Hz
//       n.filter.frequency.value = this.expMap(1 + v, 120, 20000);
//     } else {
//       n.filter.type = 'highpass';
//       // 0 -> ~30Hz, 1 -> ~8kHz
//       n.filter.frequency.value = this.expMap(v, 30, 8000);
//     }
//   }

//   /** Read the raw filter cutoff so the UI can show the current frequency. */
//   filterHz(deck: DeckId): number {
//     return Math.round(this.decks.get(deck)?.filter.frequency.value ?? 20000);
//   }

//   setVolume(deck: DeckId, value: number): void {
//     const n = this.decks.get(deck);
//     if (n) n.gain.gain.value = this.clamp(value, 0, 1);
//   }

//   // -- glitch: engaged while the jog disk is touched ---------------------------

//   /** Engage stutter-gate + bit-crush on a deck. */
//   startGlitch(deck: DeckId): void {
//     const ctx = this.ensureContext();
//     const n = this.decks.get(deck);
//     if (!n || this.glitch.has(deck)) return;

//     // gritty bit-crush
//     n.crusher.curve = this.crushCurve(7);

//     // square LFO chops the gate between silence and full → stutter
//     const osc = ctx.createOscillator();
//     osc.type = 'square';
//     osc.frequency.value = 14;
//     const mod = ctx.createGain();
//     mod.gain.value = 0.5; // depth
//     n.glitchGate.gain.value = 0.5; // base → gates 0..1 with the square LFO
//     osc.connect(mod);
//     mod.connect(n.glitchGate.gain);
//     osc.start();

//     this.glitch.set(deck, { osc, mod });
//   }

//   /** Drag speed 0..1 → faster stutter and heavier crush. */
//   setGlitchIntensity(deck: DeckId, amount: number): void {
//     const s = this.glitch.get(deck);
//     const n = this.decks.get(deck);
//     if (!s || !n) return;
//     const a = this.clamp(amount, 0, 1);
//     s.osc.frequency.value = 10 + a * 44; // stutter rate
//     n.crusher.curve = this.crushCurve(Math.round(8 - a * 5)); // fewer levels = more crush
//   }

//   /** Release the disk: restore clean signal. */
//   stopGlitch(deck: DeckId): void {
//     // const n = this.decks.get(deck);
//     // if (n) {
//     //   n.crusher.curve = null;
//     //   n.glitchGate.gain.setValueAtTime(1, this.ctx!.currentTime);
//     // }
//     // const s = this.glitch.get(deck);
//     // if (s) {
//     //   try {
//     //     s.osc.stop();
//     //   } catch {
//     //     /* already stopped */
//     //   }
//     //   s.osc.disconnect();
//     //   s.mod.disconnect();
//     //   this.glitch.delete(deck);
//     // }
//       const n = this.decks.get(deck);
//       const s = this.glitch.get(deck);

//       setTimeout(() => {
//         if (n) {
//           n.crusher.curve = null;
//           n.glitchGate.gain.setValueAtTime(1, this.ctx!.currentTime);
//         }
//         if (s) {
//           try {
//             s.osc.stop();
//           } catch {
//             /* already stopped */
//           }
//           s.osc.disconnect();
//           s.mod.disconnect();
//           this.glitch.delete(deck);
//         }
//       }, 100); // extra glitch tail in ms
//   }

//   /** Quantising transfer curve — `levels` steps of resolution (lower = grittier). */
//   private crushCurve(levels: number): Float32Array {
//     const n = 1024;
//     const curve = new Float32Array(n);
//     const step = 2 / Math.max(2, levels);
//     for (let i = 0; i < n; i++) {
//       const x = (i / (n - 1)) * 2 - 1;
//       curve[i] = Math.round(x / step) * step;
//     }
//     return curve;
//   }

//   setCrossfade(value: number): void {
//     this.crossfade.set(this.clamp(value, 0, 1));
//     this.applyCrossfade();
//   }

//   /** Equal-power crossfade curve. */
//   private applyCrossfade(): void {
//     const x = this.crossfade();
//     const a = Math.cos((x * Math.PI) / 2);
//     const b = Math.cos(((1 - x) * Math.PI) / 2);
//     const dA = this.decks.get('A');
//     const dB = this.decks.get('B');
//     if (dA) dA.xfade.gain.value = a;
//     if (dB) dB.xfade.gain.value = b;
//   }

//   /** Live spectrum bytes for a deck's meter/waveform. */
//   frequencyData(deck: DeckId): Uint8Array | null {
//     const n = this.decks.get(deck);
//     if (!n) return null;
//     const data = new Uint8Array(n.analyser.frequencyBinCount);
//     n.analyser.getByteFrequencyData(data);
//     return data;
//   }

//   private clamp(v: number, lo: number, hi: number): number {
//     return Math.min(hi, Math.max(lo, v));
//   }

//   private expMap(t: number, lo: number, hi: number): number {
//     return lo * Math.pow(hi / lo, this.clamp(t, 0, 1));
//   }
// }

import { Injectable, signal } from '@angular/core';
import { DeckId } from '../models/track.model';

/** Performance-pad sound effects. Each maps to a sample (if loaded) or a synth. */
export type FxName =
  | 'airhorn'
  | 'riser'
  | 'laser'
  | 'siren'
  | 'boom'
  | 'zap'
  | 'scratch'
  | 'stab';

/**
 * One channel strip in the mixer, mirroring a hardware DJ deck:
 *
 *   <audio> -> low(shelf) -> mid(peaking) -> high(shelf)
 *           -> filter(sweep) -> gain(volume) -> xfade(gain) -> master
 *                                 ▲
 *                        fx (pad SFX bus)
 *
 * The <audio> element is owned by the DeckComponent template and handed
 * to us via `attach()`, so play/pause/seek/tempo stay simple while the
 * whole chain still routes through Web Audio for real EQ + mixing.
 */
interface DeckNodes {
  el: HTMLAudioElement;
  src: MediaElementAudioSourceNode;
  low: BiquadFilterNode;
  mid: BiquadFilterNode;
  high: BiquadFilterNode;
  filter: BiquadFilterNode;
  crusher: WaveShaperNode;
  glitchGate: GainNode;
  gain: GainNode;
  /** Performance-pad SFX are summed here and fed into `gain`. */
  fx: GainNode;
  xfade: GainNode;
  analyser: AnalyserNode;
}

@Injectable({ providedIn: 'root' })
export class AudioEngineService {
  private ctx?: AudioContext;
  private master?: GainNode;
  private decks = new Map<DeckId, DeckNodes>();
  /** Live glitch LFO state per deck while the jog disk is touched. */
  private glitch = new Map<DeckId, { osc: OscillatorNode; mod: GainNode }>();
  /** Decoded pad samples. When present, a pad plays the sample not the synth. */
  private fxBuffers = new Map<FxName, AudioBuffer>();

  /** 0 = full A, 1 = full B. Center = both. */
  readonly crossfade = signal(0.5);
  readonly ready = signal(false);

  /** Must be called from a user gesture (autoplay policy). */
  ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.ready.set(true);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Wire an <audio> element into a deck's channel strip (idempotent). */
  attach(deck: DeckId, el: HTMLAudioElement): void {
    const ctx = this.ensureContext();
    if (this.decks.has(deck)) return; // a MediaElementSource can only be created once per element

    const src = ctx.createMediaElementSource(el);

    const low = ctx.createBiquadFilter();
    low.type = 'lowshelf';
    low.frequency.value = 200;

    const mid = ctx.createBiquadFilter();
    mid.type = 'peaking';
    mid.frequency.value = 1000;
    mid.Q.value = 0.9;

    const high = ctx.createBiquadFilter();
    high.type = 'highshelf';
    high.frequency.value = 3200;

    // Bipolar "filter" knob: allpass at rest, sweeps to LP (left) / HP (right).
    const filter = ctx.createBiquadFilter();
    filter.type = 'allpass';
    filter.frequency.value = 20000;
    filter.Q.value = 1;

    const gain = ctx.createGain();
    gain.gain.value = 0.85;

    // Per-deck FX bus: one-shot performance-pad sounds are summed here and
    // fed into `gain`, so pad hits ride this channel's volume + crossfader
    // (but stay clean of the EQ / filter / glitch that sit before `gain`).
    const fx = ctx.createGain();
    fx.gain.value = 1;

    // Glitch stage: bit-crusher (bypassed = null curve) feeding a gate whose
    // gain is chopped by a square LFO while the jog disk is touched.
    const crusher = ctx.createWaveShaper();
    crusher.curve = null;
    crusher.oversample = '4x';

    const glitchGate = ctx.createGain();
    glitchGate.gain.value = 1;

    const xfade = ctx.createGain();
    xfade.gain.value = 1;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.75;

    src.connect(low);
    low.connect(mid);
    mid.connect(high);
    high.connect(filter);
    filter.connect(crusher);
    crusher.connect(glitchGate);
    glitchGate.connect(gain);
    fx.connect(gain); // pad SFX join the channel just before volume/crossfade
    gain.connect(xfade);
    gain.connect(analyser); // tap for meters (pre-crossfade so it always shows)
    xfade.connect(this.master!);

    this.decks.set(deck, {
      el, src, low, mid, high, filter, crusher, glitchGate, gain, fx, xfade, analyser,
    });
    this.applyCrossfade();
  }

  // -- EQ: knobs map -1..1 to +/-24 dB per band -------------------------------
  setEq(deck: DeckId, band: 'low' | 'mid' | 'high', value: number): void {
    const n = this.decks.get(deck);
    if (!n) return;
    const db = this.clamp(value, -1, 1) * 24;
    n[band].gain.value = db;
  }

  /**
   * Bipolar filter sweep. value -1..1:
   *   < 0  -> lowpass, cutoff drops toward the bass as you turn left
   *   > 0  -> highpass, cutoff rises toward the treble as you turn right
   *     0  -> transparent (allpass)
   */
  setFilter(deck: DeckId, value: number): void {
    const n = this.decks.get(deck);
    if (!n) return;
    const v = this.clamp(value, -1, 1);
    if (Math.abs(v) < 0.02) {
      n.filter.type = 'allpass';
      n.filter.frequency.value = 20000;
      return;
    }
    if (v < 0) {
      n.filter.type = 'lowpass';
      // exp map: 0 -> ~20kHz, -1 -> ~120Hz
      n.filter.frequency.value = this.expMap(1 + v, 120, 20000);
    } else {
      n.filter.type = 'highpass';
      // 0 -> ~30Hz, 1 -> ~8kHz
      n.filter.frequency.value = this.expMap(v, 30, 8000);
    }
  }

  /** Read the raw filter cutoff so the UI can show the current frequency. */
  filterHz(deck: DeckId): number {
    return Math.round(this.decks.get(deck)?.filter.frequency.value ?? 20000);
  }

  setVolume(deck: DeckId, value: number): void {
    const n = this.decks.get(deck);
    if (n) n.gain.gain.value = this.clamp(value, 0, 1);
  }

  // -- glitch: engaged while the jog disk is touched ---------------------------

  /** Engage stutter-gate + bit-crush on a deck. */
  startGlitch(deck: DeckId): void {
    const ctx = this.ensureContext();
    const n = this.decks.get(deck);
    if (!n || this.glitch.has(deck)) return;

    // gritty bit-crush
    n.crusher.curve = this.crushCurve(7);

    // square LFO chops the gate between silence and full → stutter
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 14;
    const mod = ctx.createGain();
    mod.gain.value = 0.5; // depth
    n.glitchGate.gain.value = 0.5; // base → gates 0..1 with the square LFO
    osc.connect(mod);
    mod.connect(n.glitchGate.gain);
    osc.start();

    this.glitch.set(deck, { osc, mod });
  }

  /** Drag speed 0..1 → faster stutter and heavier crush. */
  setGlitchIntensity(deck: DeckId, amount: number): void {
    const s = this.glitch.get(deck);
    const n = this.decks.get(deck);
    if (!s || !n) return;
    const a = this.clamp(amount, 0, 1);
    s.osc.frequency.value = 10 + a * 44; // stutter rate
    n.crusher.curve = this.crushCurve(Math.round(8 - a * 5)); // fewer levels = more crush
  }

  /** Release the disk: restore clean signal (after a short glitch tail). */
  stopGlitch(deck: DeckId): void {
    const n = this.decks.get(deck);
    const s = this.glitch.get(deck);

    setTimeout(() => {
      if (n) {
        n.crusher.curve = null;
        n.glitchGate.gain.setValueAtTime(1, this.ctx!.currentTime);
      }
      if (s) {
        try {
          s.osc.stop();
        } catch {
          /* already stopped */
        }
        s.osc.disconnect();
        s.mod.disconnect();
        this.glitch.delete(deck);
      }
    }, 100); // extra glitch tail in ms
  }

  /** Quantising transfer curve — `levels` steps of resolution (lower = grittier). */
  private crushCurve(levels: number): Float32Array {
    const n = 1024;
    const curve = new Float32Array(n);
    const step = 2 / Math.max(2, levels);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.round(x / step) * step;
    }
    return curve;
  }

  // -- performance-pad FX -----------------------------------------------------
  //
  // Real DJ gear plays *recorded samples* on its pads. So this bus is
  // sample-first: if a sample has been loaded for a pad we play that, which is
  // what actually sounds like commercial hardware. When no sample is loaded we
  // fall back to a synthesised approximation so the app still works with zero
  // assets.

  /**
   * Load a single pad sample from a URL (an https URL, or an object URL from a
   * user-picked File). Decoded once and reused. Overrides the synth for that pad.
   */
  async loadFxSample(name: FxName, url: string): Promise<void> {
    const ctx = this.ensureContext();
    const res = await fetch(url);
    const arr = await res.arrayBuffer();
    const buf = await ctx.decodeAudioData(arr);
    this.fxBuffers.set(name, buf);
  }

  /** Load a whole pad pack at once, e.g. { airhorn: '/fx/airhorn.wav', ... }. */
  async loadFxSamples(map: Partial<Record<FxName, string>>): Promise<void> {
    await Promise.all(
      (Object.entries(map) as [FxName, string][]).map(([name, url]) =>
        this.loadFxSample(name, url).catch((e) =>
          console.warn(`[fx] failed to load sample "${name}"`, e),
        ),
      ),
    );
  }

  /** True once a real sample is loaded for a pad (UI can badge it). */
  hasFxSample(name: FxName): boolean {
    return this.fxBuffers.has(name);
  }

  /**
   * Fire a one-shot into a deck's channel. Plays the loaded sample if there is
   * one, else the synth fallback. Fire-and-forget: nodes free themselves.
   */
  triggerFx(deck: DeckId, fx: FxName): void {
    const ctx = this.ensureContext();
    const n = this.decks.get(deck);
    if (!n) return;
    const t = ctx.currentTime;
    const out = n.fx;

    const sample = this.fxBuffers.get(fx);
    if (sample) {
      this.playBuffer(ctx, out, t, sample);
      return;
    }

    switch (fx) {
      case 'airhorn': this.fxAirhorn(ctx, out, t); break;
      case 'riser':   this.fxRiser(ctx, out, t); break;
      case 'laser':   this.fxLaser(ctx, out, t); break;
      case 'siren':   this.fxSiren(ctx, out, t); break;
      case 'boom':    this.fxBoom(ctx, out, t); break;
      case 'zap':     this.fxZap(ctx, out, t); break;
      case 'scratch': this.fxScratch(ctx, out, t); break;
      case 'stab':    this.fxStab(ctx, out, t); break;
    }
  }

  /** Play a decoded sample one-shot into the FX bus. */
  private playBuffer(
    ctx: AudioContext,
    out: AudioNode,
    t: number,
    buffer: AudioBuffer,
    gainVal = 0.9,
  ): void {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = gainVal;
    src.connect(g);
    g.connect(out);
    src.start(t);
  }

  // ---- synth fallbacks (used only when no sample is loaded) ------------------

  /** A fresh white-noise buffer source of the given length. */
  private noiseSource(ctx: AudioContext, seconds: number): AudioBufferSourceNode {
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  /** Soft saturation (tanh) — gives synth tones a brassy/analog edge. */
  private makeDrive(ctx: AudioContext, amount: number): WaveShaperNode {
    const ws = ctx.createWaveShaper();
    const n = 1024;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(amount * x);
    }
    ws.curve = curve;
    ws.oversample = '4x';
    return ws;
  }

  /** Reggae/DJ airhorn — saturated saw stack through a resonant formant. */
  private fxAirhorn(ctx: AudioContext, out: AudioNode, t: number): void {
    const dur = 1.0;
    const drive = this.makeDrive(ctx, 8);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 3.5;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 5200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.55, t + 0.02);
    g.gain.setValueAtTime(0.55, t + dur - 0.08);
    g.gain.linearRampToValueAtTime(0, t + dur);

    // bright stacked cluster: Bb3 F4 Bb4 D5
    for (const f of [233.08, 349.23, 466.16, 587.33]) {
      for (const det of [-5, 5]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.detune.value = det;
        o.frequency.setValueAtTime(f * 0.94, t);
        o.frequency.linearRampToValueAtTime(f, t + 0.06); // pitch "blip" up
        const lfo = ctx.createOscillator(); // vibrato
        lfo.frequency.value = 5.5;
        const lg = ctx.createGain();
        lg.gain.value = f * 0.008;
        lfo.connect(lg);
        lg.connect(o.frequency);
        o.connect(drive);
        o.start(t); o.stop(t + dur);
        lfo.start(t); lfo.stop(t + dur);
      }
    }
    drive.connect(bp);
    bp.connect(lp);
    lp.connect(g);
    g.connect(out);
  }

  /** Uplifter riser — noise band sweeping up with a pitched sweep underneath. */
  private fxRiser(ctx: AudioContext, out: AudioNode, t: number): void {
    const dur = 1.8;
    const noise = this.noiseSource(ctx, dur);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 4;
    bp.frequency.setValueAtTime(400, t);
    bp.frequency.exponentialRampToValueAtTime(9000, t + dur);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.35, t + dur - 0.05);
    ng.gain.linearRampToValueAtTime(0, t + dur);
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(out);
    noise.start(t); noise.stop(t + dur);

    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(2000, t + dur);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.18, t + dur - 0.05);
    og.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(og);
    og.connect(out);
    o.start(t); o.stop(t + dur);
  }

  /** Descending sci-fi laser. */
  private fxLaser(ctx: AudioContext, out: AudioNode, t: number): void {
    const dur = 0.45;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(2400, t);
    o.frequency.exponentialRampToValueAtTime(110, t + dur);
    const drive = this.makeDrive(ctx, 3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(drive);
    drive.connect(g);
    g.connect(out);
    o.start(t); o.stop(t + dur);
  }

  /** Rewind / pull-up siren — a rising then falling wail. */
  private fxSiren(ctx: AudioContext, out: AudioNode, t: number): void {
    const dur = 1.6;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(500, t);
    o.frequency.exponentialRampToValueAtTime(1400, t + dur * 0.5);
    o.frequency.exponentialRampToValueAtTime(500, t + dur);
    const drive = this.makeDrive(ctx, 4);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1200;
    bp.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.4, t + 0.05);
    g.gain.setValueAtTime(0.4, t + dur - 0.1);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(drive);
    drive.connect(bp);
    bp.connect(g);
    g.connect(out);
    o.start(t); o.stop(t + dur);
  }

  /** Cinematic impact — noise transient + sub sine drop. */
  private fxBoom(ctx: AudioContext, out: AudioNode, t: number): void {
    const dur = 1.2;
    // front transient
    const noise = this.noiseSource(ctx, 0.1);
    const nlp = ctx.createBiquadFilter();
    nlp.type = 'lowpass';
    nlp.frequency.value = 1400;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    noise.connect(nlp);
    nlp.connect(ng);
    ng.connect(out);
    noise.start(t); noise.stop(t + 0.1);
    // sub drop
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(32, t + 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.95, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(out);
    o.start(t); o.stop(t + dur);
  }

  /** Short electric zap — noise burst + fast falling square. */
  private fxZap(ctx: AudioContext, out: AudioNode, t: number): void {
    const dur = 0.25;
    const noise = this.noiseSource(ctx, dur);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1200;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(1800, t);
    o.frequency.exponentialRampToValueAtTime(300, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.connect(hp);
    hp.connect(g);
    o.connect(g);
    g.connect(out);
    noise.start(t); noise.stop(t + dur);
    o.start(t); o.stop(t + dur);
  }

  /** Turntable scratch chirp (best replaced with a real sample). */
  private fxScratch(ctx: AudioContext, out: AudioNode, t: number): void {
    const dur = 0.35;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, t);
    o.frequency.linearRampToValueAtTime(90, t + 0.12);
    o.frequency.linearRampToValueAtTime(220, t + 0.24);
    o.frequency.linearRampToValueAtTime(120, t + dur);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1200;
    bp.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(bp);
    bp.connect(g);
    g.connect(out);
    o.start(t); o.stop(t + dur);
  }

  /** House stab — a short saturated minor triad (best replaced with a sample). */
  private fxStab(ctx: AudioContext, out: AudioNode, t: number): void {
    const dur = 0.4;
    const drive = this.makeDrive(ctx, 2.5);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.45, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    for (const f of [261.63, 311.13, 392.0]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(drive);
      o.start(t); o.stop(t + dur);
    }
    drive.connect(lp);
    lp.connect(g);
    g.connect(out);
  }

  setCrossfade(value: number): void {
    this.crossfade.set(this.clamp(value, 0, 1));
    this.applyCrossfade();
  }

  /** Equal-power crossfade curve. */
  private applyCrossfade(): void {
    const x = this.crossfade();
    const a = Math.cos((x * Math.PI) / 2);
    const b = Math.cos(((1 - x) * Math.PI) / 2);
    const dA = this.decks.get('A');
    const dB = this.decks.get('B');
    if (dA) dA.xfade.gain.value = a;
    if (dB) dB.xfade.gain.value = b;
  }

  /** Live spectrum bytes for a deck's meter/waveform. */
  frequencyData(deck: DeckId): Uint8Array | null {
    const n = this.decks.get(deck);
    if (!n) return null;
    const data = new Uint8Array(n.analyser.frequencyBinCount);
    n.analyser.getByteFrequencyData(data);
    return data;
  }

  private clamp(v: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, v));
  }

  private expMap(t: number, lo: number, hi: number): number {
    return lo * Math.pow(hi / lo, this.clamp(t, 0, 1));
  }
}

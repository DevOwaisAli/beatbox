import { Injectable } from '@angular/core';

export interface BeatResult {
  bpm: number;
  /** Beat onset times in seconds (from the analysed low band). */
  peaks: number[];
  confidence: number;
}

/**
 * Offline beat / BPM extraction.
 *
 * Pipeline (a well-known energy-peak approach):
 *   1. decode audio -> mono buffer
 *   2. low-pass with an OfflineAudioContext to isolate kick energy
 *   3. slide a window, take peaks above a moving threshold
 *   4. histogram the inter-peak intervals -> most common interval -> BPM
 *
 * Works on any decodable ArrayBuffer: local file uploads always; remote
 * streams only when the server sends permissive CORS headers.
 */
@Injectable({ providedIn: 'root' })
export class BeatDetectorService {
  async analyze(arrayBuffer: ArrayBuffer): Promise<BeatResult> {
    const decodeCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
    await decodeCtx.close();

    const filtered = await this.lowpass(audioBuffer);
    const peaks = this.findPeaks(filtered, audioBuffer.sampleRate);
    const { bpm, confidence } = this.intervalsToBpm(peaks);

    return { bpm, peaks, confidence };
  }

  /** Isolate low frequencies where the kick drum lives. */
  private async lowpass(buffer: AudioBuffer): Promise<Float32Array> {
    const offline = new OfflineAudioContext(
      1,
      buffer.length,
      buffer.sampleRate,
    );
    const src = offline.createBufferSource();
    src.buffer = buffer;

    const lp = offline.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 150;
    lp.Q.value = 1;

    src.connect(lp);
    lp.connect(offline.destination);
    src.start(0);

    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  }

  /** Peak-pick against a decaying threshold; returns onset times (s). */
  private findPeaks(data: Float32Array, sampleRate: number): number[] {
    const peaks: number[] = [];

    // Global max to normalise the threshold.
    let max = 0;
    for (let i = 0; i < data.length; i++) {
      const a = Math.abs(data[i]);
      if (a > max) max = a;
    }
    if (max === 0) return peaks;

    let threshold = max * 0.85;
    const minGapSamples = Math.floor(sampleRate * 0.28); // <=214 BPM guard

    while (threshold > max * 0.2 && peaks.length < 400) {
      peaks.length = 0;
      let i = 0;
      while (i < data.length) {
        if (Math.abs(data[i]) > threshold) {
          peaks.push(i / sampleRate);
          i += minGapSamples;
        } else {
          i++;
        }
      }
      if (peaks.length > 20) break; // enough onsets to estimate tempo
      threshold *= 0.9;
    }
    return peaks;
  }

  /** Histogram inter-peak intervals, fold into 90–180 BPM, pick the mode. */
  private intervalsToBpm(peaks: number[]): { bpm: number; confidence: number } {
    if (peaks.length < 4) return { bpm: 0, confidence: 0 };

    const counts = new Map<number, number>();
    for (let i = 0; i < peaks.length - 1; i++) {
      for (let j = i + 1; j < Math.min(i + 10, peaks.length); j++) {
        const interval = peaks[j] - peaks[i];
        if (interval <= 0) continue;
        let bpm = 60 / interval;
        while (bpm < 90) bpm *= 2;
        while (bpm > 180) bpm /= 2;
        const key = Math.round(bpm);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    let bestBpm = 0;
    let bestCount = 0;
    let total = 0;
    counts.forEach((c, bpm) => {
      total += c;
      if (c > bestCount) {
        bestCount = c;
        bestBpm = bpm;
      }
    });

    const confidence = total ? Math.min(1, bestCount / total) : 0;
    return { bpm: bestBpm, confidence };
  }
}

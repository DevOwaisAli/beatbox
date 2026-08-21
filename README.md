# Beatbox — Browser DJ Mixer (Angular + TypeScript)

A touch-friendly, two-deck DJ mixer that runs entirely in the browser using the
**Web Audio API**. Real EQ, filter sweeps, crossfading, jog-wheel pitch bend, cue
pads, and **offline BPM / beat extraction**.

## Run it

```bash
npm install
npm start          # ng serve → http://localhost:4200
```

Node 18+ and Angular CLI 17 are expected. `npm run build` produces a production
bundle in `dist/`.

## What's inside

```
src/app/
├─ models/track.model.ts
├─ services/
│  ├─ audio-engine.service.ts     # per-deck Web Audio graph, EQ, filter, crossfade
│  ├─ beat-detector.service.ts    # offline BPM via low-pass + energy-peak histogram
│  └─ music-library.service.ts    # demo loops, local files, Jamendo CC search
└─ components/
   ├─ search-bar/                 # search + add-your-own-files
   ├─ song-menu/                  # horizontal scroll of circular track chips + A/B target
   ├─ knob/                       # rotary control (drag / wheel / arrows / dbl-tap reset)
   ├─ fader/                      # channel volume + crossfader
   ├─ jog-wheel/                  # spinning platter, drag to pitch-bend
   ├─ deck/                       # one full deck (transport, EQ, pads, BPM)
   └─ dj-mixer/                   # Deck A | channel strip | Deck B
```

### Signal flow per deck
```
<audio> → LOW(shelf) → MID(peak) → HIGH(shelf) → FILTER(sweep) → volume → crossfade → master
```
The **LOW/MID/HIGH** knobs move each band's gain (±24 dB). The **FILTER** knob is
bipolar: left of center sweeps a low-pass cutoff down toward the bass, right sweeps
a high-pass cutoff up toward the treble. The live cutoff frequency is shown under
the knobs.

## Music sources — all legal

1. **Demo loops** — short four-on-the-floor beats synthesised in-browser
   (`OfflineAudioContext` → WAV). Zero setup, always playable and analysable.
2. **Audius search** (default) — real, artist-distributed tracks via the open
   Audius API. No key required; it's legal to stream. Type a song/artist in the
   search bar and tap a circle to load it onto the armed deck (A or B).
3. **Your own files** — the `＋` button / drag-drop. Full features, including BPM.
4. **Jamendo** — optional Creative-Commons search. Add a free client id from
   <https://developer.jamendo.com/> into `jamendoClientId` in
   `music-library.service.ts`; it's used as a fallback when Audius has no match.

Selecting a track auto-plays it on the armed deck (the tap counts as the user
gesture browsers require for audio).

### Why there's no "download / record from YouTube"
Ripping or recording commercial chart songs from YouTube violates copyright and
YouTube's Terms of Service. It also can't be done from a plain web app: YouTube's
player runs in a cross-origin iframe, so its audio can't be routed into your
`AudioContext` or captured by `MediaRecorder`. The only in-browser capture path is
`getDisplayMedia({audio:true})` (tab capture), which forces a visible permission
prompt, can't run in a hidden background tab, and is a deliberate
content-protection workaround. Use Audius / local files instead — they give you
real songs that legitimately play and mix.

## Beat detection notes
BPM analysis needs the decoded audio bytes. That always works for local files and
the demo loops. For remote tracks it only works when the host sends permissive CORS
headers; otherwise playback + mixing still work, the BPM just shows `––`.

## Touch
Every control uses Pointer Events, so knobs, faders, jog wheels and pads all work
with mouse and touch. Knobs also respond to the scroll wheel and arrow keys;
double-tap a knob to reset it to center.

**Touch the silver disk for a glitch.** Pressing/dragging a jog wheel engages a
stutter-gate + bit-crush glitch on that deck (a square-wave LFO chops a gain node,
a `WaveShaper` adds bit-crush grit), with intensity rising as you drag faster. The
wheel flickers with an RGB-split effect while active and restores clean audio on
release. It layers on top of the tempo pitch-bend, so you can scratch and glitch
at once.

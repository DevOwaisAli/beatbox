/** A single loadable audio track. */
export interface Track {
  id: string;
  title: string;
  artist: string;
  /** Streamable / decodable audio URL (object URL for local files). */
  audioUrl: string;
  /** Optional artwork for the circular menu. */
  artworkUrl?: string;
  /** Where the track came from — affects whether beat-detection can run. */
  source: 'local' | 'jamendo' | 'audius' | 'demo';
  /** Region grouping for the chart tabs. */
  region?: 'pk' | 'global' | 'mine';
  /** Filled in after analysis. */
  bpm?: number;
  /** True if audio can be fetched cross-origin for offline decode. */
  corsSafe?: boolean;
}

/** Which deck a track is loaded onto. */
export type DeckId = 'A' | 'B';

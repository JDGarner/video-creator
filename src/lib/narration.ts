import { staticFile } from "remotion";
import type { AlignedWord } from "./captions";

/** One narration beat from manifest.json: its text and spoken span in seconds. */
export type Beat = { n: number; text: string; start: number; end: number };

export type Narration = { duration: number; beats: Beat[]; words: AlignedWord[] };

/** Load narration.wav's manifest and alignment for a video from public/<kind>/<video>/. */
export async function loadNarration(kind: string, video: string): Promise<Narration> {
  const base = `${kind}/${video}`;
  const [manifest, alignment] = await Promise.all([
    fetch(staticFile(`${base}/manifest.json`)).then((r) => r.json() as Promise<{ duration: number; beats: Beat[] }>),
    fetch(staticFile(`${base}/alignment.json`)).then((r) => r.json() as Promise<{ words: AlignedWord[] }>),
  ]);
  return { duration: manifest.duration, beats: manifest.beats, words: alignment.words };
}

export function narrationFile(kind: string, video: string): string {
  return staticFile(`${kind}/${video}/narration.wav`);
}

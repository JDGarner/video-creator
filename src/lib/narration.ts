import { staticFile } from "remotion";
import type { AlignedWord } from "./captions";

/** One narration beat from manifest.json: its text and spoken span in seconds. */
export type Beat = { n: number; text: string; start: number; end: number };

/** `scriptBeats` is how many beats the script has; fewer `beats` than that means a `--beats` narration of part of it. */
export type Narration = { duration: number; beats: Beat[]; words: AlignedWord[]; scriptBeats?: number };

/** Load narration.wav's manifest and alignment for a video from public/<kind>/<video>/. */
export async function loadNarration(kind: string, video: string): Promise<Narration> {
  const base = `${kind}/${video}`;
  const [manifest, alignment] = await Promise.all([
    fetch(staticFile(`${base}/manifest.json`)).then((r) => r.json() as Promise<{ duration: number; beats: Beat[]; script_beats?: number }>),
    fetch(staticFile(`${base}/alignment.json`)).then((r) => r.json() as Promise<{ words: AlignedWord[] }>),
  ]);
  return { duration: manifest.duration, beats: manifest.beats, words: alignment.words, scriptBeats: manifest.script_beats };
}

export function narrationFile(kind: string, video: string): string {
  return staticFile(`${kind}/${video}/narration.wav`);
}

import { staticFile } from "remotion";
import type { AlignedWord } from "./captions";

/** One narration beat from manifest.json: its text and spoken span in seconds. */
export type Beat = { n: number; text: string; start: number; end: number };

export type Narration = { duration: number; beats: Beat[]; words: AlignedWord[] };

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Seconds at which `word` is first spoken, or `fallback` when the word is not in the alignment. */
export function wordTime(words: AlignedWord[], word: string, fallback: number): number {
  const target = norm(word);
  return words.find((w) => norm(w.text) === target)?.start ?? fallback;
}

/** The beat with this number, or undefined when the manifest has not been generated yet. */
export function beat(beats: Beat[], n: number): Beat | undefined {
  return beats.find((b) => b.n === n);
}

/** Load narration.wav's manifest and alignment for a video from public/audio/<kind>/<video>/. */
export async function loadNarration(kind: string, video: string): Promise<Narration> {
  const base = `audio/${kind}/${video}`;
  const [manifest, alignment] = await Promise.all([
    fetch(staticFile(`${base}/manifest.json`)).then((r) => r.json() as Promise<{ duration: number; beats: Beat[] }>),
    fetch(staticFile(`${base}/alignment.json`)).then((r) => r.json() as Promise<{ words: AlignedWord[] }>),
  ]);
  return { duration: manifest.duration, beats: manifest.beats, words: alignment.words };
}

export function narrationFile(kind: string, video: string): string {
  return staticFile(`audio/${kind}/${video}/narration.wav`);
}

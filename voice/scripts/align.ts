/**
 * Word-align narration.wav against the script it was made from, using whisper.cpp.
 *
 * Usage: pnpm voice:align shorts/makassan-trade-route
 *
 * Reads voice/out/<kind>/<video>/{narration.wav,manifest.json}; writes alignment.json there as
 * { words: [{ text, start, end, beat }] } in seconds. Word text comes from the script, timings from
 * whisper: recognised words are matched to script words in order and unmatched script words are
 * interpolated between their neighbours, so every script word is present exactly once.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { downloadWhisperModel, installWhisperCpp, transcribe } from "@remotion/install-whisper-cpp";

const VOICE = path.resolve(import.meta.dirname, "..");
const WHISPER_DIR = path.join(VOICE, ".whisper", "whisper.cpp");
const MODEL_DIR = path.join(VOICE, ".whisper", "models");
const WHISPER_VERSION = "1.5.5"; // builds with make alone; >= 1.7.3 needs cmake
const MODEL = "medium.en" as const;

type Beat = { n: number; text: string; start: number; end: number };
type Manifest = { video: string; duration: number; beats: Beat[] };
type Word = { text: string; start: number; end: number; beat: number };

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
/** Equal after normalising, or one is a 4+ character prefix of the other ("sail" vs "sailed"). */
const same = (a: string, b: string) => {
  const x = norm(a);
  const y = norm(b);
  return x === y || (Math.min(x.length, y.length) >= 4 && (x.startsWith(y) || y.startsWith(x)));
};

function scriptWords(manifest: Manifest): Word[] {
  return manifest.beats.flatMap((b) => b.text.split(/\s+/).filter(Boolean).map((text) => ({ text, start: NaN, end: NaN, beat: b.n })));
}

type Heard = { text: string; start: number; end: number };

function heardWords(transcription: Awaited<ReturnType<typeof transcribe<true>>>["transcription"]): Heard[] {
  const out: Heard[] = [];
  for (const seg of transcription) {
    for (const tok of seg.tokens) {
      if (tok.text.startsWith("[_")) continue; // whisper control tokens
      const startsWord = tok.text.startsWith(" ") || out.length === 0;
      const t = { start: tok.offsets.from / 1000, end: tok.offsets.to / 1000 };
      if (startsWord) out.push({ text: tok.text.trim(), ...t });
      else {
        const last = out[out.length - 1]!;
        last.text += tok.text;
        last.end = Math.max(last.end, t.end);
      }
    }
  }
  return out.filter((w) => norm(w.text).length > 0);
}

/** Longest common subsequence over normalised words; returns script index -> heard index. */
function match(script: Word[], heard: Heard[]): Map<number, number> {
  const n = script.length;
  const m = heard.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = same(script[i]!.text, heard[j]!.text) ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const pairs = new Map<number, number>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (same(script[i]!.text, heard[j]!.text)) {
      pairs.set(i, j);
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) i++;
    else j++;
  }
  return pairs;
}

function fillGaps(words: Word[], manifest: Manifest): void {
  // anchors: matched words plus the narration's start and end
  const anchors = [-1, ...words.map((w, i) => (Number.isNaN(w.start) ? -1 : i)).filter((i) => i >= 0), words.length];
  const at = (i: number) => (i < 0 ? { start: 0, end: 0 } : i >= words.length ? { start: manifest.duration, end: manifest.duration } : words[i]!);
  for (let a = 0; a < anchors.length - 1; a++) {
    const lo = anchors[a]!;
    const hi = anchors[a + 1]!;
    if (hi - lo <= 1) continue;
    const gapStart = at(lo).end;
    const gapEnd = at(hi).start;
    const chars = words.slice(lo + 1, hi).reduce((s, w) => s + w.text.length + 1, 0);
    let t = gapStart;
    for (let i = lo + 1; i < hi; i++) {
      const share = ((words[i]!.text.length + 1) / chars) * (gapEnd - gapStart);
      words[i]!.start = t;
      words[i]!.end = t + share;
      t += share;
    }
  }
}

export type AlignResult = { heard: number; script: number; matched: number; interpolated: string[]; doubleMiss: boolean };

/** Align `dir`/narration.wav against `dir`/manifest.json and write `dir`/alignment.json. */
export async function alignNarration(dir: string): Promise<AlignResult> {
  const manifest: Manifest = JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8"));

  if (!existsSync(WHISPER_DIR)) await installWhisperCpp({ to: WHISPER_DIR, version: WHISPER_VERSION, printOutput: false });
  mkdirSync(MODEL_DIR, { recursive: true });
  await downloadWhisperModel({ model: MODEL, folder: MODEL_DIR, printOutput: false });

  const wav16 = path.join(dir, "narration-16k.wav");
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", path.join(dir, "narration.wav"), "-ar", "16000", "-ac", "1", wav16]);

  const script = scriptWords(manifest);
  // Only proper nouns go in the prompt. Feeding whisper the whole transcript made it stop after
  // the first sentence and stretch those words over the entire file.
  const glossary = [...new Set(script.filter((w, i) => /^[A-Z]/.test(w.text) && i > 0 && !/[.?!]$/.test(script[i - 1]!.text)).map((w) => w.text.replace(/[^\w']/g, "")))];
  const prompt = glossary.join(", ");
  const result = await transcribe({
    inputPath: wav16,
    whisperPath: WHISPER_DIR,
    whisperCppVersion: WHISPER_VERSION,
    model: MODEL,
    modelFolder: MODEL_DIR,
    language: "en",
    tokenLevelTimestamps: true,
    splitOnWord: true,
    printOutput: false,
    additionalArgs: [["--prompt", prompt]],
  });

  writeFileSync(path.join(dir, "whisper.json"), JSON.stringify(result.transcription, null, 1));
  rmSync(path.join(process.cwd(), "tmp"), { recursive: true, force: true }); // the helper's scratch dir
  const heard = heardWords(result.transcription);
  const pairs = match(script, heard);
  for (const [i, j] of pairs) {
    script[i]!.start = heard[j]!.start;
    script[i]!.end = heard[j]!.end;
  }
  fillGaps(script, manifest);

  // keep every word inside its beat's span (whisper lets the last word bleed into the gap)
  for (const w of script) {
    const beat = manifest.beats.find((b) => b.n === w.beat)!;
    w.start = Math.min(Math.max(w.start, beat.start), beat.end);
    w.end = Math.min(Math.max(w.end, w.start + 0.05), beat.end);
  }
  // never let a word start before the previous one ends
  for (let i = 1; i < script.length; i++) {
    if (script[i]!.start < script[i - 1]!.end) script[i]!.start = script[i - 1]!.end;
    if (script[i]!.end < script[i]!.start) script[i]!.end = script[i]!.start;
  }

  const words = script.map((w) => ({ ...w, start: +w.start.toFixed(3), end: +w.end.toFixed(3) }));
  writeFileSync(path.join(dir, "alignment.json"), JSON.stringify({ video: manifest.video, source: "narration.wav", whisper: `${MODEL}@${WHISPER_VERSION}`, words }, null, 2) + "\n");

  const unmatched = script.map((w, i) => (pairs.has(i) ? null : w.text)).filter((t): t is string => t !== null);
  const doubleMiss = script.some((_, i) => i > 0 && !pairs.has(i) && !pairs.has(i - 1));
  return { heard: heard.length, script: script.length, matched: pairs.size, interpolated: unmatched, doubleMiss };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = process.argv[2];
  if (!target) throw new Error("usage: align.ts <kind>/<video>, e.g. shorts/makassan-trade-route");
  alignNarration(path.join(VOICE, "out", target))
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

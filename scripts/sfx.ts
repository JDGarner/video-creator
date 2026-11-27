/**
 * Synthesise the sound palette into public/sfx/: `pnpm sfx`.
 *
 * Every cue the compositions play is made here from ffmpeg's signal generators (sine sweeps and
 * filtered noise), so there is nothing to licence or credit. Each file is peak-normalised, then
 * measured, and `public/sfx/sfx.json` records the gain that brings it to its target level under
 * the narration. The compositions read that file; nobody sets a volume by ear.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT = path.resolve("public/sfx");
const RATE = 48000;

/**
 * Target level as the loudest 50 ms RMS, in dBFS. Narration masters to -16 LUFS and its loudest
 * moments sit near -8.5 dB RMS, so `soft` cues are about 20 dB under the voice at its loudest and
 * `accent` about 10 dB under; one accent per scene at most.
 */
const LEVEL_DB = { soft: -28, accent: -18 } as const;

type Recipe = { level: keyof typeof LEVEL_DB; inputs: string[]; filter: string };

/** `inputs` are lavfi sources; `filter` is the -filter_complex that must end in [out]. */
const RECIPES: Record<string, Recipe> = {
  // a page turned quickly: a hiss of paper over a soft low knock
  flick: {
    level: "soft",
    inputs: [`anoisesrc=c=white:d=0.22:s=${RATE}:a=0.8`, `aevalsrc='0.7*sin(2*PI*(60+80*exp(-t*20))*t)*exp(-t*18):d=0.35:s=${RATE}'`],
    filter: "[0]highpass=f=1800,afade=t=in:d=0.01,afade=t=out:st=0.03:d=0.18[n];[1]lowpass=f=500[t];[n][t]amix=inputs=2:duration=longest:normalize=0[out]",
  },
  // air moving under a crossfade: band-limited pink noise with a slow swell
  whoosh: {
    level: "soft",
    inputs: [`anoisesrc=c=pink:d=0.5:s=${RATE}:a=0.9`],
    filter: "[0]bandpass=f=900:width_type=h:w=1200,afade=t=in:d=0.18:curve=qsin,afade=t=out:st=0.2:d=0.3:curve=qsin[out]",
  },
  // a woodblock tap: a short bright tone with a knock underneath
  woodblock: {
    level: "soft",
    inputs: [`aevalsrc='0.8*sin(2*PI*660*t)*exp(-t*28)+0.25*sin(2*PI*1980*t)*exp(-t*45)+0.4*sin(2*PI*(90+60*exp(-t*25))*t)*exp(-t*14):d=0.4:s=${RATE}'`],
    filter: "[0]anull[out]",
  },
  // a stamp landing: a low pitch drop with a long decay
  thump: {
    level: "accent",
    inputs: [`aevalsrc='0.9*sin(2*PI*(42+110*exp(-t*14))*t)*exp(-t*8):d=0.6:s=${RATE}'`],
    filter: "[0]lowpass=f=600[out]",
  },
  // a dry brush drawn across paper: high pink noise with a grain to it
  sweep: {
    level: "soft",
    inputs: [`anoisesrc=c=pink:d=0.8:s=${RATE}:a=0.9`],
    filter: "[0]highpass=f=1200,lowpass=f=7000,tremolo=f=11:d=0.5,afade=t=in:d=0.25:curve=qsin,afade=t=out:st=0.45:d=0.35:curve=qsin[out]",
  },
};

function run(args: string[]): string {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-loglevel", "info", ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
  return r.stderr;
}

function measure(file: string, re: RegExp): number {
  const err = run(["-i", file, "-af", "astats=measure_perchannel=none:measure_overall=RMS_peak+Peak_level", "-f", "null", "-"]);
  const m = err.match(re);
  if (!m) throw new Error(`could not read ${re} from ffmpeg for ${file}`);
  return Number(m[1]);
}

function main(): void {
  mkdirSync(OUT, { recursive: true });
  const catalogue: Record<string, { sec: number; gain: number }> = {};
  for (const [name, recipe] of Object.entries(RECIPES)) {
    const raw = path.join(OUT, `${name}.raw.wav`);
    const file = path.join(OUT, `${name}.wav`);
    run(["-y", ...recipe.inputs.flatMap((i) => ["-f", "lavfi", "-i", i]), "-filter_complex", recipe.filter, "-map", "[out]", "-ac", "1", "-ar", String(RATE), raw]);
    // normalise peaks to -1 dBFS so every file starts from the same place; the level is set by the gain
    const peak = measure(raw, /Peak level dB: (-?[\d.]+)/);
    run(["-y", "-i", raw, "-af", `volume=${(-1 - peak).toFixed(3)}dB`, file]);
    spawnSync("rm", [raw]);
    const rmsPeak = measure(file, /RMS peak dB: (-?[\d.]+)/);
    const gain = Math.min(1, 10 ** ((LEVEL_DB[recipe.level] - rmsPeak) / 20));
    const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
    const sec = Number(probe.stdout.trim());
    catalogue[name] = { sec: Math.round(sec * 1000) / 1000, gain: Math.round(gain * 10000) / 10000 };
    console.log(`${name.padEnd(10)} ${sec.toFixed(2)} s  rms peak ${rmsPeak.toFixed(1)} dB  gain ${gain.toFixed(3)}  -> ${LEVEL_DB[recipe.level]} dB (${recipe.level})`);
  }
  writeFileSync(path.join(OUT, "sfx.json"), JSON.stringify(catalogue, null, 2) + "\n");
  console.log(`wrote ${path.relative(process.cwd(), path.join(OUT, "sfx.json"))}`);
}

main();

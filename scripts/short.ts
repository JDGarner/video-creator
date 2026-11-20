/**
 * The shorts pipeline: `pnpm check|narrate|align|render|bundle|stills|short <video> [flags]`. See docs/PIPELINE.md.
 *
 * Each stage hashes its inputs into out/shorts/<video>/.hashes.json and is skipped when nothing
 * changed and its outputs exist. --force runs it anyway.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { mergeConfig, type ShortConfig } from "../src/lib/config";
import { resolveCue } from "../src/lib/cues";
import type { Narration } from "../src/lib/narration";
import { fullDescription, parsePublish, srt } from "../src/lib/publish";
import { checkStory, creditLines, parseAssets, parseStory, type Asset, type Finding } from "../src/lib/story";
import { sceneImages, type Scene } from "../src/scenes/schema";
import { alignNarration } from "../voice/scripts/align";

const REPO = path.resolve(import.meta.dirname, "..");
const KIND = "shorts";
const VIDEOS_JSON = path.join(REPO, "src", "shorts", "videos.json");
/** Rasters wider than this are scaled down when published; the frame is 1080 wide. */
const MAX_ASSET_PX = 2160;
const RASTER = /\.(jpe?g|png|webp)$/i;

type Stage = "check" | "narrate" | "align" | "render" | "bundle" | "stills";
type Flags = { beats?: string; only?: string; seed?: number; force: boolean };

function fail(msg: string): never {
  console.error(`\n${msg}`);
  process.exit(1);
}

function sha(parts: (string | Buffer)[]): string {
  const h = createHash("sha256");
  for (const p of parts) h.update(p);
  return h.digest("hex").slice(0, 16);
}

function fileSha(p: string): string {
  return sha([readFileSync(p)]);
}

function treeSha(dir: string): string {
  if (!existsSync(dir)) return sha(["none"]);
  const files: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else files.push(full);
    }
  };
  walk(dir);
  files.sort();
  return sha(files.flatMap((f) => [f, readFileSync(f)]));
}

function run(cmd: string, args: string[], cwd: string): void {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (r.status !== 0) fail(`${cmd} ${args[0] ?? ""} failed`);
}

function report(findings: Finding[]): void {
  for (const f of findings) console.log(`${f.level === "error" ? "ERROR" : "warning"}: ${f.message}`);
  if (findings.some((f) => f.level === "error")) fail("fix the storyboard and run again");
}

class Short {
  readonly storyDir: string;
  readonly story: string;
  readonly voiceOut: string;
  readonly publicDir: string;
  readonly outDir: string;
  readonly config: ShortConfig;
  private hashes: Record<string, string>;

  constructor(readonly id: string) {
    this.storyDir = path.join(REPO, "stories", KIND, id);
    if (!existsSync(this.storyDir)) fail(`no such short: ${path.relative(REPO, this.storyDir)}`);
    this.story = this.findStory();
    this.voiceOut = path.join(REPO, "voice", "out", KIND, id);
    this.publicDir = path.join(REPO, "public", KIND, id);
    this.outDir = path.join(REPO, "out", KIND, id);
    for (const d of [this.voiceOut, this.publicDir, this.outDir]) mkdirSync(d, { recursive: true });
    const overridesPath = path.join(this.storyDir, "video.json");
    const overrides = existsSync(overridesPath) ? JSON.parse(readFileSync(overridesPath, "utf8")) : {};
    this.config = mergeConfig(JSON.parse(readFileSync(path.join(REPO, "config", "defaults.json"), "utf8")), overrides);
    const hashesPath = path.join(this.outDir, ".hashes.json");
    this.hashes = existsSync(hashesPath) ? JSON.parse(readFileSync(hashesPath, "utf8")) : {};
  }

  private findStory(): string {
    const preferred = path.join(this.storyDir, "short.md");
    if (existsSync(preferred)) return preferred;
    const mds = readdirSync(this.storyDir).filter((f) => f.endsWith(".md"));
    if (mds.length !== 1) fail(`expected short.md or exactly one .md in ${path.relative(REPO, this.storyDir)}, found ${mds.length}`);
    return path.join(this.storyDir, mds[0]!);
  }

  private remember(stage: string, hash: string): void {
    this.hashes[stage] = hash;
    writeFileSync(path.join(this.outDir, ".hashes.json"), JSON.stringify(this.hashes, null, 2) + "\n");
  }

  private publish(...names: string[]): void {
    for (const n of names) copyFileSync(path.join(this.voiceOut, n), path.join(this.publicDir, n));
    this.writeConfig();
  }

  /** The merged config the composition reads. Written by check too, so a caption or theme change reaches the render without a new narration. */
  private writeConfig(): void {
    mkdirSync(this.publicDir, { recursive: true });
    writeFileSync(path.join(this.publicDir, "config.json"), JSON.stringify(this.config, null, 2) + "\n");
  }

  private voiceFile(n: string): string {
    return path.join(this.voiceOut, n);
  }

  private publicFile(n: string): string {
    return path.join(this.publicDir, n);
  }

  /** The narration as the composition will see it, or null before narrate and align have run. */
  private narration(): Narration | null {
    const m = this.voiceFile("manifest.json");
    const a = this.voiceFile("alignment.json");
    if (!existsSync(m) || !existsSync(a)) return null;
    const manifest = JSON.parse(readFileSync(m, "utf8"));
    return { duration: manifest.duration, beats: manifest.beats, words: JSON.parse(readFileSync(a, "utf8")).words };
  }

  private assets(): Asset[] {
    const p = path.join(this.storyDir, "assets.yaml");
    return existsSync(p) ? parseAssets(readFileSync(p, "utf8")) : [];
  }

  private scenes(): Scene[] | null {
    return parseStory(readFileSync(this.story, "utf8")).scenes;
  }

  /** Storyboard and asset problems, then scenes.json and the published assets. Runs first in `short`. */
  check(): void {
    console.log(`\n== check ${this.id}`);
    const md = readFileSync(this.story, "utf8");
    let assets: Asset[] = [];
    const findings: Finding[] = [];
    try {
      assets = this.assets();
    } catch (e) {
      findings.push({ level: "error", message: e instanceof Error ? e.message : String(e) });
    }
    const narration = this.narration();
    findings.push(...checkStory(md, { narration: narration ?? undefined, assets: new Set(assets.map((a) => a.file)) }));
    const story = parseStory(md);
    const todo = assets.filter((a) => /\bTODO\b/.test(`${a.source} ${a.licence}`)).map((a) => a.file);
    if (todo.length) findings.push({ level: "warning", message: `assets.yaml: ${todo.length} asset(s) still have a TODO source or licence (bundle will refuse): ${todo.join(", ")}` });
    for (const a of assets) {
      if (todo.includes(a.file)) continue;
      if (!a.credit && !/^(cc0|public domain|own)$/i.test(a.licence)) findings.push({ level: "warning", message: `assets.yaml: "${a.file}" is ${a.licence} but has no credit line` });
    }
    report(findings);
    this.writeConfig();
    if (!story.scenes) {
      console.log("no ## Scenes section: a hand-written composition is expected in src/shorts/index.tsx");
      return;
    }
    const used = sceneImages(story.scenes);
    const assetDir = path.join(this.publicDir, "assets");
    rmSync(assetDir, { recursive: true, force: true });
    mkdirSync(assetDir, { recursive: true });
    const map: Record<string, string | null> = {};
    const missing: string[] = [];
    for (const file of used) {
      const src = path.join(this.storyDir, "assets", file);
      if (!existsSync(src)) {
        map[file] = null;
        missing.push(file);
        continue;
      }
      const dst = path.join(assetDir, file);
      if (RASTER.test(file)) {
        run("ffmpeg", ["-v", "error", "-y", "-i", src, "-vf", `scale='min(${MAX_ASSET_PX},iw)':-2`, dst], REPO);
      } else {
        copyFileSync(src, dst);
      }
      map[file] = `${KIND}/${this.id}/assets/${file}`;
    }
    writeFileSync(this.publicFile("scenes.json"), JSON.stringify({ id: this.id, title: story.title, scenes: story.scenes, assets: map }, null, 2) + "\n");
    const videos: string[] = JSON.parse(readFileSync(VIDEOS_JSON, "utf8"));
    if (!videos.includes(this.id)) {
      writeFileSync(VIDEOS_JSON, JSON.stringify([...videos, this.id].sort(), null, 2) + "\n");
      console.log(`registered in ${path.relative(REPO, VIDEOS_JSON)}`);
    }
    console.log(`${story.scenes.length} scenes, ${used.length} assets${missing.length ? `, ${missing.length} not yet in assets/ (rendered as placeholders): ${missing.join(", ")}` : ""}`);
    if (narration === null) console.log("cues will be checked against the narration at render");
  }

  narrate(flags: Flags): void {
    console.log(`\n== narrate ${this.id}`);
    const n = this.config.narration;
    const args = ["run", "scripts/narrate.py", "--story", this.story, "--out", this.voiceOut, "--gap-ms", String(n.gapMs), "--model", n.model, "--device", n.device, "--max-wpm", String(n.maxWpm)];
    if (flags.beats) args.push("--beats", flags.beats);
    if (flags.only) args.push("--only", flags.only);
    if (flags.seed !== undefined) args.push("--seed", String(flags.seed));
    if (flags.force) args.push("--force");
    // per-beat reuse is decided inside narrate.py from the manifest hashes
    run("uv", args, path.join(REPO, "voice"));
    this.publish("narration.wav", "manifest.json");
  }

  async align(flags: Flags): Promise<void> {
    console.log(`\n== align ${this.id}`);
    const wav = this.voiceFile("narration.wav");
    if (!existsSync(wav)) fail("no narration.wav; run narrate first");
    const hash = fileSha(wav);
    if (!flags.force && this.hashes.align === hash && existsSync(this.voiceFile("alignment.json"))) {
      console.log("unchanged, skipped");
      return;
    }
    const r = await alignNarration(this.voiceOut);
    console.log(`heard ${r.heard} words, script ${r.script}, matched ${r.matched}`);
    if (r.interpolated.length) console.log(`interpolated (listen for these): ${r.interpolated.join(", ")}`);
    if (r.doubleMiss) console.log("WARNING: two adjacent words were not heard; check that stretch of audio");
    this.remember("align", hash);
    this.publish("alignment.json");
  }

  /** Inputs the composition reads, for the render and stills hashes. */
  private frameInputs(): string[] {
    const { publish: _publish, ...frameConfig } = this.config;
    const scenes = this.publicFile("scenes.json");
    return [fileSha(this.voiceFile("alignment.json")), fileSha(this.voiceFile("manifest.json")), JSON.stringify(frameConfig), existsSync(scenes) ? fileSha(scenes) : "no-scenes", treeSha(this.publicFile("assets")), treeSha(path.join(REPO, "src"))];
  }

  private readyToRender(): void {
    const alignment = this.voiceFile("alignment.json");
    const wav = this.voiceFile("narration.wav");
    if (!existsSync(alignment)) fail("no alignment.json; run align first");
    if (statSync(alignment).mtimeMs < statSync(wav).mtimeMs) fail("alignment.json is older than narration.wav; run align first");
    this.publish("narration.wav", "manifest.json", "alignment.json");
    if (this.scenes()) {
      if (!existsSync(this.publicFile("scenes.json"))) fail("no scenes.json; run check first");
      // cues could not be checked before the narration existed
      report(checkStory(readFileSync(this.story, "utf8"), { narration: this.narration()! }).filter((f) => f.level === "error"));
    }
  }

  render(flags: Flags): void {
    console.log(`\n== render ${this.id}`);
    this.readyToRender();
    const out = path.join(this.outDir, `${this.id}.mp4`);
    const hash = sha(this.frameInputs());
    if (!flags.force && this.hashes.render === hash && existsSync(out)) {
      console.log(`unchanged, skipped (${path.relative(REPO, out)})`);
      return;
    }
    run("pnpm", ["exec", "remotion", "render", `short-${this.id}`, out, "--log=error"], REPO);
    this.remember("render", hash);
    console.log(`${path.relative(REPO, out)}  ${probe(out).durationSec.toFixed(1)} s`);
  }

  /** One PNG per scene, a second in, for checking layouts without a full render. */
  async stills(flags: Flags): Promise<void> {
    console.log(`\n== stills ${this.id}`);
    this.readyToRender();
    const scenes = this.scenes();
    if (!scenes) fail("stills need a ## Scenes section");
    const dir = path.join(this.outDir, "stills");
    const hash = sha(this.frameInputs());
    if (!flags.force && this.hashes.stills === hash && existsSync(dir)) {
      console.log(`unchanged, skipped (${path.relative(REPO, dir)})`);
      return;
    }
    const narration = this.narration()!;
    const { fps } = this.config;
    const total = Math.ceil((narration.duration + this.config.tailSec) * fps);
    const starts = scenes.map((s, i) => (i === 0 || s.from === undefined ? 0 : Math.round(resolveCue(s.from, narration) * fps)));
    const frames = starts.map((start, i) => Math.min(start + fps, Math.round((start + (starts[i + 1] ?? total)) / 2)));

    const { bundle } = await import("@remotion/bundler");
    const { renderStill, selectComposition } = await import("@remotion/renderer");
    const serveUrl = await bundle({ entryPoint: path.join(REPO, "src", "index.ts"), publicDir: path.join(REPO, "public") });
    const composition = await selectComposition({ serveUrl, id: `short-${this.id}` });
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    for (const [i, frame] of frames.entries()) {
      const output = path.join(dir, `scene-${String(i + 1).padStart(2, "0")}-${scenes[i]!.type}.png`);
      await renderStill({ composition, serveUrl, output, frame });
      console.log(`${path.relative(REPO, output)}  ${(frame / fps).toFixed(1)} s`);
    }
    this.remember("stills", hash);
  }

  /** Everything the manual upload needs, in out/shorts/<video>/publish/. */
  bundle(flags: Flags, inShort: boolean): void {
    console.log(`\n== bundle ${this.id}`);
    const publish = parsePublish(readFileSync(this.story, "utf8"));
    if (!publish) {
      if (inShort) {
        console.log(`no "## Publish" section in ${path.relative(REPO, this.story)}, skipped`);
        return;
      }
      fail(`no "## Publish" section in ${path.relative(REPO, this.story)}; see docs/examples/short.md`);
    }
    const mp4 = path.join(this.outDir, `${this.id}.mp4`);
    const alignment = this.voiceFile("alignment.json");
    if (!existsSync(mp4)) fail("no rendered mp4; run render first");
    if (statSync(mp4).mtimeMs < statSync(alignment).mtimeMs) fail("the mp4 is older than alignment.json; run render first");
    const scenesJson = this.publicFile("scenes.json");
    if (existsSync(scenesJson)) {
      const placeholders = Object.entries(JSON.parse(readFileSync(scenesJson, "utf8")).assets as Record<string, string | null>)
        .filter(([, p]) => p === null)
        .map(([f]) => f);
      if (placeholders.length) {
        const msg = `the video has placeholder assets, not something to upload: ${placeholders.join(", ")}`;
        if (inShort) {
          console.log(`${msg}; bundle skipped`);
          return;
        }
        fail(msg);
      }
    }
    const assets = this.assets();
    const todo = assets.filter((a) => /\bTODO\b/.test(`${a.source} ${a.licence}`)).map((a) => a.file);
    if (todo.length) fail(`assets.yaml still has TODO sources or licences: ${todo.join(", ")}`);
    const dir = path.join(this.outDir, "publish");
    const hash = sha([fileSha(mp4), fileSha(alignment), fileSha(this.story), JSON.stringify(this.config), JSON.stringify(assets)]);
    if (!flags.force && this.hashes.bundle === hash && existsSync(path.join(dir, "metadata.json"))) {
      console.log(`unchanged, skipped (${path.relative(REPO, dir)})`);
      return;
    }

    const info = probe(mp4);
    const { width, height, publish: rules } = this.config;
    if (info.width !== width || info.height !== height) fail(`mp4 is ${info.width}x${info.height}, config says ${width}x${height}`);
    if (!info.hasAudio) fail("mp4 has no audio stream");
    if (info.durationSec > rules.maxSec) fail(`mp4 is ${info.durationSec.toFixed(1)} s, over the ${rules.maxSec} s Shorts limit`);
    const lufs = loudness(mp4);

    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    copyFileSync(mp4, path.join(dir, `${this.id}.mp4`));
    const words = JSON.parse(readFileSync(alignment, "utf8")).words;
    writeFileSync(path.join(dir, "captions.srt"), srt(words));
    const thumb = publish.thumbnailSec === undefined ? null : path.join(dir, "thumbnail.png");
    if (thumb) {
      if (publish.thumbnailSec! >= info.durationSec) fail(`thumbnail time ${publish.thumbnailSec} s is past the end of the video`);
      run("ffmpeg", ["-v", "error", "-y", "-ss", String(publish.thumbnailSec), "-i", mp4, "-frames:v", "1", thumb], REPO);
    }
    const credits = creditLines(assets);
    const description = fullDescription({ description: [publish.description, credits.length ? ["Images", ...credits].join("\n") : ""].filter(Boolean).join("\n\n"), hashtags: publish.hashtags });
    const metadata = {
      file: `${this.id}.mp4`,
      title: publish.title,
      description,
      tags: publish.tags,
      madeForKids: rules.madeForKids,
      syntheticMedia: rules.syntheticMedia,
      thumbnailSec: publish.thumbnailSec ?? null,
      durationSec: info.durationSec,
      width: info.width,
      height: info.height,
      lufs,
    };
    writeFileSync(path.join(dir, "metadata.json"), JSON.stringify(metadata, null, 2) + "\n");
    this.remember("bundle", hash);
    console.log(`${path.relative(REPO, dir)}/  ${readdirSync(dir).sort().join(", ")}`);
    console.log(`${info.durationSec.toFixed(1)} s, ${lufs.toFixed(1)} LUFS, ${words.length} words -> ${srt(words).trim().split("\n\n").length} subtitle cues`);
  }
}

function probe(file: string): { durationSec: number; width: number; height: number; hasAudio: boolean } {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height", "-show_entries", "format=duration", "-of", "json", file], { encoding: "utf8" });
  if (r.status !== 0) fail(`ffprobe failed on ${path.relative(REPO, file)}`);
  const j = JSON.parse(r.stdout) as { streams: { codec_type: string; width?: number; height?: number }[]; format: { duration: string } };
  const video = j.streams.find((s) => s.codec_type === "video");
  if (!video) fail(`${path.relative(REPO, file)} has no video stream`);
  return { durationSec: parseFloat(j.format.duration), width: video.width ?? 0, height: video.height ?? 0, hasAudio: j.streams.some((s) => s.codec_type === "audio") };
}

/** Integrated loudness in LUFS, from ffmpeg's loudnorm measurement pass. */
function loudness(file: string): number {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "loudnorm=print_format=json", "-f", "null", "-"], { encoding: "utf8" });
  const m = r.stderr.match(/"input_i"\s*:\s*"(-?[\d.]+)"/);
  if (!m) fail("could not measure loudness with ffmpeg");
  return parseFloat(m[1]!);
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { beats: { type: "string" }, only: { type: "string" }, seed: { type: "string" }, force: { type: "boolean", default: false } },
  });
  const [stageArg, id] = positionals;
  const single: Stage[] = ["check", "narrate", "align", "render", "bundle", "stills"];
  const stages: Stage[] = stageArg === "short" ? ["check", "narrate", "align", "render", "bundle"] : single.includes(stageArg as Stage) ? [stageArg as Stage] : fail("usage: short.ts check|narrate|align|render|bundle|stills|short <video> [--beats 1,2] [--only 3] [--seed N] [--force]");
  if (!id) fail("which video? e.g. pnpm short makassan-trade-route");
  const flags: Flags = { beats: values.beats, only: values.only, seed: values.seed === undefined ? undefined : Number(values.seed), force: values.force };
  if (flags.seed !== undefined && Number.isNaN(flags.seed)) fail("--seed must be an integer");

  const short = new Short(id);
  for (const stage of stages) {
    if (stage === "check") short.check();
    if (stage === "narrate") short.narrate(flags);
    if (stage === "align") await short.align(flags);
    if (stage === "render") short.render(flags);
    if (stage === "stills") await short.stills(flags);
    if (stage === "bundle") short.bundle(flags, stageArg === "short");
  }
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));

/**
 * The shorts pipeline, one stage per method: check, narrate, align, render, stills, bundle.
 * Each stage hashes its inputs into out/shorts/<video>/.hashes.json and is skipped when nothing
 * changed and its outputs exist; `force` runs it anyway. See docs/PIPELINE.md.
 *
 * Everything outside the process goes through `Tools`, so the stages can be run against a fixture
 * short with fakes (Short.test.ts).
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { mergeConfig, type ShortConfig } from "../../src/lib/config";
import { resolveCue } from "../../src/lib/cues";
import type { Narration } from "../../src/lib/narration";
import { parsePublish } from "../../src/lib/publish";
import { checkStory, parseAssets, parseStory, type Asset, type Finding } from "../../src/lib/story";
import { sceneImages, type Scene } from "../../src/scenes/schema";
import { writeBundle } from "./bundle";
import { fileSha, sha, treeSha } from "./hash";
import { realTools, type Tools } from "./tools";
import { fail, report } from "./util";

export const KIND = "shorts";
/** Rasters wider than this are scaled down when published; the frame is 1080 wide. */
const MAX_ASSET_PX = 2160;
const RASTER = /\.(jpe?g|png|webp)$/i;
const TODO = /\bTODO\b/;

export type Flags = { beats?: string; only?: string; seed?: number; scene?: number; force: boolean };

export type ShortOptions = {
  /** Repository root; stories/, voice/, public/, out/, config/ and src/ are resolved under it. */
  root?: string;
  tools?: Tools;
  log?: (line: string) => void;
};

export class Short {
  readonly root: string;
  readonly storyDir: string;
  readonly story: string;
  readonly voiceOut: string;
  readonly publicDir: string;
  readonly outDir: string;
  readonly config: ShortConfig;
  private readonly tools: Tools;
  private readonly log: (line: string) => void;
  private hashes: Record<string, string>;

  constructor(
    readonly id: string,
    opts: ShortOptions = {},
  ) {
    this.root = opts.root ?? path.resolve(import.meta.dirname, "..", "..");
    this.tools = opts.tools ?? realTools;
    this.log = opts.log ?? console.log;
    this.storyDir = path.join(this.root, "stories", KIND, id);
    if (!existsSync(this.storyDir)) fail(`no such short: ${this.rel(this.storyDir)}`);
    this.story = this.findStory();
    this.voiceOut = path.join(this.root, "voice", "out", KIND, id);
    this.publicDir = path.join(this.root, "public", KIND, id);
    this.outDir = path.join(this.root, "out", KIND, id);
    for (const d of [this.voiceOut, this.publicDir, this.outDir]) mkdirSync(d, { recursive: true });
    const overridesPath = path.join(this.storyDir, "video.json");
    const overrides = existsSync(overridesPath) ? JSON.parse(readFileSync(overridesPath, "utf8")) : {};
    this.config = mergeConfig(JSON.parse(readFileSync(path.join(this.root, "config", "defaults.json"), "utf8")), overrides);
    const hashesPath = path.join(this.outDir, ".hashes.json");
    this.hashes = existsSync(hashesPath) ? JSON.parse(readFileSync(hashesPath, "utf8")) : {};
  }

  // ---- paths and files

  private rel(p: string): string {
    return path.relative(this.root, p);
  }

  private findStory(): string {
    const preferred = path.join(this.storyDir, "short.md");
    if (existsSync(preferred)) return preferred;
    const mds = readdirSync(this.storyDir).filter((f) => f.endsWith(".md"));
    if (mds.length !== 1) fail(`expected short.md or exactly one .md in ${this.rel(this.storyDir)}, found ${mds.length}`);
    return path.join(this.storyDir, mds[0]!);
  }

  private voiceFile(n: string): string {
    return path.join(this.voiceOut, n);
  }

  private publicFile(n: string): string {
    return path.join(this.publicDir, n);
  }

  private remember(stage: string, hash: string): void {
    this.hashes[stage] = hash;
    writeFileSync(path.join(this.outDir, ".hashes.json"), JSON.stringify(this.hashes, null, 2) + "\n");
  }

  /** Copy voice outputs to public/ for the composition, and refresh its config. */
  private publish(...names: string[]): void {
    for (const n of names) copyFileSync(this.voiceFile(n), this.publicFile(n));
    this.writeConfig();
  }

  /** The merged config the composition reads. Written by check too, so a caption or theme change reaches the render without a new narration. */
  private writeConfig(): void {
    mkdirSync(this.publicDir, { recursive: true });
    writeFileSync(this.publicFile("config.json"), JSON.stringify(this.config, null, 2) + "\n");
  }

  /** The narration as the composition will see it, or null before narrate and align have run. */
  narration(): Narration | null {
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

  private todoAssets(assets: Asset[]): string[] {
    return assets.filter((a) => TODO.test(`${a.source} ${a.licence}`)).map((a) => a.file);
  }

  // ---- stages

  /** Storyboard and asset problems, then scenes.json and the published assets. Runs first in `short`. */
  check(): void {
    this.log(`\n== check ${this.id}`);
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
    const todo = this.todoAssets(assets);
    if (todo.length) findings.push({ level: "warning", message: `assets.yaml: ${todo.length} asset(s) still have a TODO source or licence (bundle will refuse): ${todo.join(", ")}` });
    for (const a of assets) {
      if (todo.includes(a.file)) continue;
      if (!a.credit && !/^(cc0|public domain|own)$/i.test(a.licence)) findings.push({ level: "warning", message: `assets.yaml: "${a.file}" is ${a.licence} but has no credit line` });
    }
    report(findings, this.log);
    this.writeConfig();
    if (!story.scenes) fail("no ## Scenes section; shorts are data, see docs/SCENES.md and docs/examples/short.md");
    const used = sceneImages(story.scenes);
    const assetDir = this.publicFile("assets");
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
      if (RASTER.test(file)) this.tools.media.scaleRaster(src, dst, MAX_ASSET_PX);
      else copyFileSync(src, dst);
      map[file] = `${KIND}/${this.id}/assets/${file}`;
    }
    writeFileSync(this.publicFile("scenes.json"), JSON.stringify({ id: this.id, title: story.title, scenes: story.scenes, assets: map }, null, 2) + "\n");
    const videosJson = path.join(this.root, "src", "shorts", "videos.json");
    const videos: string[] = JSON.parse(readFileSync(videosJson, "utf8"));
    if (!videos.includes(this.id)) {
      writeFileSync(videosJson, JSON.stringify([...videos, this.id].sort(), null, 2) + "\n");
      this.log(`registered in ${this.rel(videosJson)}`);
    }
    this.log(`${story.scenes.length} scenes, ${used.length} assets${missing.length ? `, ${missing.length} not yet in assets/ (rendered as placeholders): ${missing.join(", ")}` : ""}`);
    if (narration === null) this.log("cues will be checked against the narration at render");
  }

  narrate(flags: Flags): void {
    this.log(`\n== narrate ${this.id}`);
    const n = this.config.narration;
    const args = ["--story", this.story, "--out", this.voiceOut, "--gap-ms", String(n.gapMs), "--model", n.model, "--device", n.device, "--max-wpm", String(n.maxWpm)];
    if (flags.beats) args.push("--beats", flags.beats);
    if (flags.only) args.push("--only", flags.only);
    if (flags.seed !== undefined) args.push("--seed", String(flags.seed));
    if (flags.force) args.push("--force");
    // per-beat reuse is decided inside narrate.py from the manifest hashes
    this.tools.narrate(args, path.join(this.root, "voice"));
    this.publish("narration.wav", "manifest.json");
  }

  async align(flags: Flags): Promise<void> {
    this.log(`\n== align ${this.id}`);
    const wav = this.voiceFile("narration.wav");
    if (!existsSync(wav)) fail("no narration.wav; run narrate first");
    const hash = fileSha(wav);
    if (!flags.force && this.hashes.align === hash && existsSync(this.voiceFile("alignment.json"))) {
      this.log("unchanged, skipped");
      return;
    }
    const r = await this.tools.align(this.voiceOut);
    this.log(`heard ${r.heard} words, script ${r.script}, matched ${r.matched}`);
    if (r.interpolated.length) this.log(`interpolated (listen for these): ${r.interpolated.join(", ")}`);
    if (r.doubleMiss) this.log("WARNING: two adjacent words were not heard; check that stretch of audio");
    this.remember("align", hash);
    this.publish("alignment.json");
  }

  /** Inputs the composition reads, for the render and stills hashes. */
  private frameInputs(): string[] {
    const { publish: _publish, ...frameConfig } = this.config;
    const scenes = this.publicFile("scenes.json");
    return [fileSha(this.voiceFile("alignment.json")), fileSha(this.voiceFile("manifest.json")), JSON.stringify(frameConfig), existsSync(scenes) ? fileSha(scenes) : "no-scenes", treeSha(this.publicFile("assets")), treeSha(path.join(this.root, "src"))];
  }

  private readyToRender(): void {
    const alignment = this.voiceFile("alignment.json");
    const wav = this.voiceFile("narration.wav");
    if (!existsSync(wav)) fail("no narration.wav; run narrate first");
    if (!existsSync(alignment)) fail("no alignment.json; run align first");
    // by content, not mtime: a copied or touched file must not pass, a byte-identical restitch must
    if (this.hashes.align !== fileSha(wav)) fail("alignment.json does not match narration.wav; run align first");
    this.publish("narration.wav", "manifest.json", "alignment.json");
    if (!existsSync(this.publicFile("scenes.json"))) fail("no scenes.json; run check first");
    // cues could not be checked before the narration existed
    report(checkStory(readFileSync(this.story, "utf8"), { narration: this.narration()! }).filter((f) => f.level === "error"), this.log);
  }

  /** Frame range [start, end) of each scene, from its cue against the real narration. */
  sceneFrames(): [number, number][] {
    const scenes = this.scenes();
    if (!scenes) fail("this short has no ## Scenes section");
    const narration = this.narration();
    if (!narration) fail("no narration yet; run narrate and align first");
    const { fps } = this.config;
    const total = Math.ceil((narration.duration + this.config.tailSec) * fps);
    const starts = scenes.map((s, i) => (i === 0 || s.from === undefined ? 0 : Math.round(resolveCue(s.from, narration) * fps)));
    return starts.map((start, i) => [start, starts[i + 1] ?? total]);
  }

  render(flags: Flags): void {
    this.log(`\n== render ${this.id}`);
    this.readyToRender();
    const composition = `short-${this.id}`;
    if (flags.scene !== undefined) {
      // a clip of one scene for checking a change; not hashed, never the file bundle ships
      const frames = this.sceneFrames();
      const range = frames[flags.scene - 1];
      if (!range) fail(`--scene ${flags.scene}: this short has ${frames.length} scenes`);
      const clip = path.join(this.outDir, `scene-${flags.scene}.mp4`);
      this.tools.render(composition, clip, [range[0], range[1] - 1], this.root);
      this.log(`${this.rel(clip)}  ${((range[1] - range[0]) / this.config.fps).toFixed(1)} s (scene ${flags.scene} of ${frames.length})`);
      return;
    }
    const out = path.join(this.outDir, `${this.id}.mp4`);
    const hash = sha(this.frameInputs());
    if (!flags.force && this.hashes.render === hash && existsSync(out)) {
      this.log(`unchanged, skipped (${this.rel(out)})`);
      return;
    }
    this.tools.render(composition, out, undefined, this.root);
    this.remember("render", hash);
    this.log(`${this.rel(out)}  ${this.tools.media.probe(out).durationSec.toFixed(1)} s`);
  }

  /** One PNG per scene, a second in, for checking layouts without a full render. */
  async stills(flags: Flags): Promise<void> {
    this.log(`\n== stills ${this.id}`);
    this.readyToRender();
    const scenes = this.scenes();
    if (!scenes) fail("stills need a ## Scenes section");
    const dir = path.join(this.outDir, "stills");
    const hash = sha(this.frameInputs());
    if (!flags.force && this.hashes.stills === hash && existsSync(dir)) {
      this.log(`unchanged, skipped (${this.rel(dir)})`);
      return;
    }
    const { fps } = this.config;
    const frames = this.sceneFrames().map(([start, end]) => Math.min(start + fps, Math.round((start + end) / 2)));

    const { bundle } = await import("@remotion/bundler");
    const { renderStill, selectComposition } = await import("@remotion/renderer");
    const serveUrl = await bundle({ entryPoint: path.join(this.root, "src", "index.ts"), publicDir: path.join(this.root, "public") });
    const composition = await selectComposition({ serveUrl, id: `short-${this.id}` });
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    for (const [i, frame] of frames.entries()) {
      const output = path.join(dir, `scene-${String(i + 1).padStart(2, "0")}-${scenes[i]!.type}.png`);
      await renderStill({ composition, serveUrl, output, frame });
      this.log(`${this.rel(output)}  ${(frame / fps).toFixed(1)} s`);
    }
    this.remember("stills", hash);
  }

  /** Everything the manual upload needs, in out/shorts/<video>/publish/. In `short`, missing prerequisites skip rather than fail. */
  bundle(flags: Flags, inShort: boolean): void {
    this.log(`\n== bundle ${this.id}`);
    const skipOrFail = (msg: string): void => {
      if (!inShort) fail(msg);
      this.log(`${msg}; bundle skipped`);
    };
    const publish = parsePublish(readFileSync(this.story, "utf8"));
    if (!publish) return skipOrFail(`no "## Publish" section in ${this.rel(this.story)}; see docs/examples/short.md`);
    const mp4 = path.join(this.outDir, `${this.id}.mp4`);
    const alignment = this.voiceFile("alignment.json");
    if (!existsSync(mp4)) fail("no rendered mp4; run render first");
    if (this.hashes.render !== sha(this.frameInputs())) fail("the mp4 is out of date; run render first");
    const scenesJson = this.publicFile("scenes.json");
    if (existsSync(scenesJson)) {
      const placeholders = Object.entries(JSON.parse(readFileSync(scenesJson, "utf8")).assets as Record<string, string | null>)
        .filter(([, p]) => p === null)
        .map(([f]) => f);
      if (placeholders.length) return skipOrFail(`the video has placeholder assets, not something to upload: ${placeholders.join(", ")}`);
    }
    const assets = this.assets();
    const todo = this.todoAssets(assets);
    if (todo.length) fail(`assets.yaml still has TODO sources or licences: ${todo.join(", ")}`);
    const dir = path.join(this.outDir, "publish");
    const hash = sha([fileSha(mp4), fileSha(alignment), fileSha(this.story), JSON.stringify(this.config), JSON.stringify(assets)]);
    if (!flags.force && this.hashes.bundle === hash && existsSync(path.join(dir, "metadata.json"))) {
      this.log(`unchanged, skipped (${this.rel(dir)})`);
      return;
    }
    const words = JSON.parse(readFileSync(alignment, "utf8")).words;
    const { metadata, files, cues } = writeBundle({ id: this.id, dir, mp4, words, publish, assets, config: this.config, media: this.tools.media });
    this.remember("bundle", hash);
    this.log(`${this.rel(dir)}/  ${files.join(", ")}`);
    this.log(`${metadata.durationSec.toFixed(1)} s, ${metadata.lufs.toFixed(1)} LUFS, ${words.length} words -> ${cues} subtitle cues`);
  }
}

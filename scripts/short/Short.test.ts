import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Short } from "./Short";
import type { Tools } from "./tools";

/**
 * A two-beat fixture short in a temporary repo root, driven with fake narrator, aligner and renderer.
 * Checks the stage rules: hashing and skipping, flags passed through, stale-alignment refusal,
 * --scene ranges, and what bundle writes.
 */

const REPO = path.resolve(import.meta.dirname, "..", "..");
const ID = "fixture";
const FPS = 30;

const STORY = `# Short: Fixture

## Narration

1. The first beat has six words.
2. Second beat ends here now.

## Scenes

\`\`\`yaml
- type: landmass
  region: Australia
  loss: { fraction: 0.5, at: six }
  headline: { text: Half, at: six }

- type: landmass
  from: beat 2
  region: Australia
\`\`\`

## Publish

title: Fixture title
tags: one, two
hashtags: shorts

A description.
`;

/** Beats 0–3 s and 3.5–6 s; the fake aligner spreads each beat's words evenly over its span. */
const BEATS = [
  { n: 1, text: "The first beat has six words.", start: 0, end: 3 },
  { n: 2, text: "Second beat ends here now.", start: 3.5, end: 6 },
];

type Calls = { narrate: string[][]; align: number; render: { id: string; out: string; frames?: [number, number]; props?: object }[] };

function fakeTools(calls: Calls): Tools {
  return {
    narrate(args) {
      calls.narrate.push(args);
      const out = args[args.indexOf("--out") + 1]!;
      // same args, same bytes: the fake stands in for narrate.py's own per-beat reuse
      writeFileSync(path.join(out, "narration.wav"), `wav:${args.join(" ")}`);
      writeFileSync(path.join(out, "manifest.json"), JSON.stringify({ video: ID, duration: 6, beats: BEATS }));
    },
    async align(dir) {
      calls.align++;
      const words = BEATS.flatMap((b) => {
        const ws = b.text.split(" ");
        const each = (b.end - b.start) / ws.length;
        return ws.map((text, i) => ({ text, start: b.start + i * each, end: b.start + (i + 1) * each, beat: b.n }));
      });
      writeFileSync(path.join(dir, "alignment.json"), JSON.stringify({ words }));
      return { heard: words.length, script: words.length, matched: words.length, interpolated: [], doubleMiss: false };
    },
    render(id, out, frames, _root, props) {
      calls.render.push({ id, out, frames, props });
      writeFileSync(out, `mp4:${frames?.join("-") ?? "all"}`);
    },
    media: {
      probe: () => ({ durationSec: 7, width: 1080, height: 1920, hasAudio: true }),
      loudness: () => -16.5,
      scaleRaster: (src, dst) => copyFileSync(src, dst),
      frameAt: (_v, _s, out) => writeFileSync(out, "png"),
    },
  };
}

let root: string;
let calls: Calls;
const quiet = () => {};
const make = () => new Short(ID, { root, tools: fakeTools(calls), log: quiet });
const flags = { force: false };

async function runShort(short = make()) {
  short.check();
  short.narrate(flags);
  await short.align(flags);
  short.render(flags);
  return short;
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "short-"));
  calls = { narrate: [], align: 0, render: [] };
  mkdirSync(path.join(root, "config"));
  copyFileSync(path.join(REPO, "config", "defaults.json"), path.join(root, "config", "defaults.json"));
  mkdirSync(path.join(root, "src", "shorts"), { recursive: true });
  writeFileSync(path.join(root, "src", "shorts", "videos.json"), "[]\n");
  writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\n");
  mkdirSync(path.join(root, "stories", "shorts", ID), { recursive: true });
  writeFileSync(path.join(root, "stories", "shorts", ID, "short.md"), STORY);
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

const pub = (f: string) => path.join(root, "public", "shorts", ID, f);
const out = (f: string) => path.join(root, "out", "shorts", ID, f);

describe("Short", () => {
  it("refuses an unknown short", () => {
    expect(() => new Short("nope", { root, log: quiet })).toThrow(/no such short/);
  });

  it("check refuses a storyboard without scenes", () => {
    writeFileSync(path.join(root, "stories", "shorts", ID, "short.md"), STORY.replace(/## Scenes[\s\S]*?## Publish/, "## Publish"));
    expect(() => make().check()).toThrow(/no ## Scenes/);
  });

  it("check publishes config and scenes and registers the video", () => {
    make().check();
    expect(JSON.parse(readFileSync(pub("config.json"), "utf8")).fps).toBe(FPS);
    const scenes = JSON.parse(readFileSync(pub("scenes.json"), "utf8"));
    expect(scenes.scenes).toHaveLength(2);
    expect(JSON.parse(readFileSync(path.join(root, "src", "shorts", "videos.json"), "utf8"))).toEqual([ID]);
  });

  it("runs every stage once, then skips align and render when nothing changed", async () => {
    await runShort();
    expect(calls.align).toBe(1);
    expect(calls.render).toHaveLength(1);
    expect(existsSync(pub("alignment.json"))).toBe(true);
    await runShort();
    expect(calls.align).toBe(1);
    expect(calls.render).toHaveLength(1);
  });

  it("passes --only and --seed through to the narrator", () => {
    make().narrate({ force: false, only: "2", seed: 4 });
    const args = calls.narrate[0]!;
    expect(args.slice(args.indexOf("--only"), args.indexOf("--only") + 2)).toEqual(["--only", "2"]);
    expect(args.slice(args.indexOf("--seed"), args.indexOf("--seed") + 2)).toEqual(["--seed", "4"]);
    expect(args).toContain("--gap-ms");
  });

  it("re-renders after a caption config change without realigning", async () => {
    await runShort();
    writeFileSync(path.join(root, "stories", "shorts", ID, "video.json"), JSON.stringify({ captions: { fontScale: 2 } }));
    await runShort();
    expect(calls.align).toBe(1);
    expect(calls.render).toHaveLength(2);
    expect(JSON.parse(readFileSync(pub("config.json"), "utf8")).captions.fontScale).toBe(2);
  });

  it("re-renders when the source tree changes", async () => {
    await runShort();
    writeFileSync(path.join(root, "src", "a.ts"), "export const a = 2;\n");
    await runShort();
    expect(calls.render).toHaveLength(2);
  });

  it("refuses to render when the narration changed since it was aligned", async () => {
    const short = await runShort();
    writeFileSync(path.join(root, "voice", "out", "shorts", ID, "narration.wav"), "wav:another take");
    expect(() => short.render(flags)).toThrow(/does not match narration/);
    // a touched but identical file is fine
    writeFileSync(path.join(root, "voice", "out", "shorts", ID, "narration.wav"), `wav:${calls.narrate[0]!.join(" ")}`);
    expect(() => short.render(flags)).not.toThrow();
  });

  it("refuses to bundle an mp4 the current inputs did not produce", async () => {
    const short = await runShort();
    writeFileSync(path.join(root, "src", "a.ts"), "export const a = 3;\n");
    expect(() => short.bundle(flags, false)).toThrow(/out of date/);
  });

  it("renders one scene's frame range with --scene and leaves the hashes alone", async () => {
    const short = await runShort();
    short.render({ force: false, scene: 2 });
    const clip = calls.render[1]!;
    // beat 2 starts at 3.5 s; the video is 6 s plus a 1 s tail
    expect(clip.frames).toEqual([Math.round(3.5 * FPS), Math.ceil(7 * FPS) - 1]);
    expect(clip.out).toBe(out("scene-2.mp4"));
    expect(() => short.render({ force: false, scene: 3 })).toThrow(/has 2 scenes/);
    expect(JSON.parse(readFileSync(out(".hashes.json"), "utf8")).render).toBeDefined();
    expect(short.sceneFrames()).toEqual([
      [0, 105],
      [105, 210],
    ]);
  });

  it("renders a sentence-caption variant beside the default with --full-sentences", async () => {
    const short = await runShort();
    short.render({ force: false, fullSentences: true });
    const variant = calls.render[1]!;
    expect(variant.out).toBe(out("fixture-sentences.mp4"));
    expect(variant.props).toEqual({ overrides: { captions: { mode: "sentences" } } });
    expect(calls.render[0]!.props).toBeUndefined();
    // each variant keeps its own hash, so neither re-renders the other
    short.render({ force: false, fullSentences: true });
    short.render(flags);
    expect(calls.render).toHaveLength(2);
    expect(() => short.bundle({ force: false, fullSentences: true }, false)).toThrow(/default render/);
  });

  it("renders to a chosen path with --out and leaves the hashes alone", async () => {
    const short = await runShort();
    const target = path.join(root, "elsewhere", "deep", "cut.mp4");
    short.render({ force: false, out: target });
    expect(calls.render[1]!.out).toBe(target);
    expect(existsSync(target)).toBe(true);
    short.render({ force: false, out: target, scene: 2, fullSentences: true });
    expect(calls.render[2]).toMatchObject({ out: target, frames: [105, 209], props: { overrides: { captions: { mode: "sentences" } } } });
    short.render(flags);
    expect(calls.render).toHaveLength(3);
    expect(() => short.bundle({ force: false, out: target }, false)).toThrow(/drop --out/);
  });

  it("bundles the mp4, captions and metadata", async () => {
    const short = await runShort();
    short.bundle(flags, false);
    const meta = JSON.parse(readFileSync(out("publish/metadata.json"), "utf8"));
    expect(meta.title).toBe("Fixture title");
    expect(meta.tags).toEqual(["one", "two"]);
    expect(meta.description).toContain("#shorts");
    expect(meta.lufs).toBe(-16.5);
    expect(existsSync(out("publish/captions.srt"))).toBe(true);
    expect(existsSync(out(`publish/${ID}.mp4`))).toBe(true);
  });

  it("fails bundle without a Publish section, but skips it inside `short`", async () => {
    writeFileSync(path.join(root, "stories", "shorts", ID, "short.md"), STORY.split("## Publish")[0]!);
    const short = await runShort();
    expect(() => short.bundle(flags, false)).toThrow(/Publish/);
    expect(() => short.bundle(flags, true)).not.toThrow();
    expect(existsSync(out("publish"))).toBe(false);
  });

  it("refuses to bundle a video with placeholder assets", async () => {
    const story = STORY.replace("- type: landmass\n  from: beat 2\n  region: Australia", "- type: card\n  from: beat 2\n  image: missing.jpg\n  headline: X");
    writeFileSync(path.join(root, "stories", "shorts", ID, "short.md"), story);
    writeFileSync(path.join(root, "stories", "shorts", ID, "assets.yaml"), "- file: missing.jpg\n  source: https://example.org\n  licence: CC0\n");
    const short = await runShort();
    expect(() => short.bundle(flags, false)).toThrow(/placeholder/);
  });
});

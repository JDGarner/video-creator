import YAML from "yaml";
import { z } from "zod";
import { parsePublish } from "./publish";
import { ScenesSchema, sceneCues, sceneImages, type Scene } from "../scenes/schema";
import { coveredScenes, cueError, resolveCue } from "./cues";
import type { Narration } from "./narration";

/** Parsed storyboard: `stories/shorts/<video>/short.md`. */
export type Story = {
  title: string;
  beats: string[];
  scenes: Scene[] | null;
  publish: ReturnType<typeof parsePublish>;
};

export type Finding = { level: "error" | "warning"; message: string };

export function sections(markdown: string): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = [];
  const re = /^## (.+?)\s*$/gm;
  let m: RegExpExecArray | null;
  const heads: { name: string; start: number; end: number }[] = [];
  while ((m = re.exec(markdown))) heads.push({ name: m[1]!, start: m.index, end: m.index + m[0].length });
  heads.forEach((h, i) => out.push({ name: h.name, body: markdown.slice(h.end, heads[i + 1]?.start ?? markdown.length).trim() }));
  return out;
}

function section(markdown: string, name: string): string | null {
  return sections(markdown).find((s) => s.name === name)?.body ?? null;
}

/** The numbered items of `## Narration`, with their written numbers. Mirrors narrate.py's parse. */
export function parseNarration(markdown: string): { n: number; text: string }[] {
  const body = section(markdown, "Narration");
  if (body === null) return [];
  const items: { n: number; text: string }[] = [];
  const re = /^\s*(\d+)\.\s+(.+?)(?=^\s*\d+\.\s|$(?![\s\S]))/gms;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const text = m[2]!.replace(/\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_/g, (_, a, b, c) => a ?? b ?? c).split(/\s+/).join(" ").trim();
    items.push({ n: parseInt(m[1]!, 10), text });
  }
  return items;
}

/** The YAML blocks of `## Scenes`, concatenated into one list and validated. Null when the section is absent. */
export function parseScenes(markdown: string): Scene[] | null {
  const body = section(markdown, "Scenes");
  if (body === null) return null;
  const blocks = [...body.matchAll(/^```ya?ml\s*$([\s\S]*?)^```\s*$/gm)].map((m) => m[1]!);
  if (!blocks.length) throw new Error("Scenes: no ```yaml block found");
  const items = blocks.flatMap((b) => {
    const doc: unknown = YAML.parse(b);
    return Array.isArray(doc) ? doc : [doc];
  });
  const r = ScenesSchema.safeParse(items);
  if (!r.success) {
    const issues = r.error.issues.map((i) => `  scene ${Number(i.path[0]) + 1}${i.path.length > 1 ? ` ${i.path.slice(1).join(".")}` : ""}: ${i.message}`);
    throw new Error(`Scenes: invalid\n${issues.join("\n")}`);
  }
  return r.data;
}

export function parseStory(markdown: string): Story {
  const title = markdown.match(/^#\s+(?:Short:\s*)?(.+?)\s*$/m)?.[1] ?? "";
  return { title, beats: parseNarration(markdown).map((b) => b.text), scenes: parseScenes(markdown), publish: parsePublish(markdown) };
}

/**
 * Everything wrong with a storyboard that the stages would otherwise trip over later. Errors stop
 * the pipeline; warnings are printed. Cue resolution is checked when a narration is given.
 */
export function checkStory(markdown: string, opts: { narration?: Narration; assets?: Set<string> } = {}): Finding[] {
  const out: Finding[] = [];
  const err = (message: string) => out.push({ level: "error", message });
  const warn = (message: string) => out.push({ level: "warning", message });

  const names = sections(markdown).map((s) => s.name);
  for (const dup of names.filter((n, i) => names.indexOf(n) !== i)) err(`heading "## ${dup}" appears twice`);
  if (!markdown.match(/^#\s+/m)) warn("no title line (`# Short: ...`)");

  const beats = parseNarration(markdown);
  if (!beats.length) err("no numbered beats under ## Narration");
  beats.forEach((b, i) => {
    if (b.n !== i + 1) err(`narration item numbered ${b.n} is the ${i + 1}${["st", "nd", "rd"][i] ?? "th"} beat; number them 1, 2, 3 in order`);
    if (/\d/.test(b.text)) warn(`beat ${i + 1} has digits ("${b.text.match(/\S*\d\S*/)![0]}"); the voice reads numbers unpredictably, write them as words`);
    if (/[—–]/.test(b.text)) warn(`beat ${i + 1} has a dash character; it becomes a caption word nobody says, use a comma or full stop`);
    if (/\[.+?\]\(.+?\)/.test(b.text)) err(`beat ${i + 1} has a markdown link`);
    if (/%|&|\//.test(b.text)) warn(`beat ${i + 1} has a symbol (% & /); write it as a word`);
  });

  try {
    const publish = parsePublish(markdown);
    if (publish) {
      for (const [k, v] of Object.entries({ title: publish.title, description: publish.description, tags: publish.tags.join(","), hashtags: publish.hashtags.join(" ") })) {
        if (/\bTODO\b/.test(v)) err(`Publish ${k} still has a TODO`);
      }
    }
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
  }

  let scenes: Scene[] | null = null;
  try {
    scenes = parseScenes(markdown);
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
  }
  if (scenes) {
    if (scenes[0]!.from !== undefined && scenes[0]!.from !== 0) warn("scene 1 has a `from`; the first scene always starts at 0");
    scenes.slice(1).forEach((s, i) => s.from === undefined && err(`scene ${i + 2} (${s.type}) has no \`from\``));
    if (opts.narration) {
      const n = opts.narration;
      // a --beats narration shows only the scenes it reaches; their cues are checked, the rest are not
      const covered = new Set(coveredScenes(scenes, n, beats.length));
      if (covered.size < scenes.length) warn(`narration has ${n.beats.length} of ${beats.length} beats; ${scenes.length - covered.size} scene(s) past it are left out of this render`);
      const starts = scenes.map((s) => (s.from === undefined ? 0 : !covered.has(s) || cueError(s.from, n) ? NaN : resolveCue(s.from, n)));
      starts.forEach((t, i) => {
        if (i > 0 && !Number.isNaN(t) && !Number.isNaN(starts[i - 1]!) && t <= starts[i - 1]!) err(`scene ${i + 1} starts at ${t.toFixed(2)} s, not after scene ${i} (${starts[i - 1]!.toFixed(2)} s)`);
      });
      for (const [i, s] of scenes.entries()) {
        if (!covered.has(s)) continue;
        for (const { where, cue } of sceneCues(s, i)) {
          const e = cueError(cue, n);
          if (e) err(`${where}: ${e}`);
        }
      }
    }
    if (opts.assets) {
      for (const img of sceneImages(scenes)) if (!opts.assets.has(img)) err(`scenes use "${img}" but assets.yaml does not list it`);
    }
  }
  return out;
}

/** One entry of `stories/shorts/<video>/assets.yaml`. */
export const AssetSchema = z.object({
  file: z.string(),
  source: z.string().describe("Where it came from: a URL, or 'own' for your own work"),
  licence: z.string().describe("e.g. CC0, CC BY 4.0, public domain, own"),
  credit: z.string().optional().describe("Attribution line, required unless the licence does not ask for one"),
  note: z.string().optional(),
});
export type Asset = z.infer<typeof AssetSchema>;

export function parseAssets(yamlText: string): Asset[] {
  const doc: unknown = YAML.parse(yamlText);
  const r = z.array(AssetSchema).safeParse(doc ?? []);
  if (!r.success) throw new Error(`assets.yaml: ${r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  const files = r.data.map((a) => a.file);
  const dup = files.find((f, i) => files.indexOf(f) !== i);
  if (dup) throw new Error(`assets.yaml lists "${dup}" twice`);
  return r.data;
}

/** Credit lines for the description, one per asset that names a credit. */
export function creditLines(assets: Asset[]): string[] {
  return assets.filter((a) => a.credit).map((a) => `${a.file.replace(/\.[^.]+$/, "")}: ${a.credit} (${a.licence})`);
}

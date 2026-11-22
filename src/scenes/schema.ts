import { z } from "zod";

/** Scene data as written in a storyboard's `## Scenes` YAML. Field docs are generated into docs/SCENES.md. */

const Cue = z.union([z.number(), z.string()]).describe('When, against the narration: seconds, "beat N", "beat N end", "end", or a spoken word ("Diprotodon", "every#2"), with an optional "+ 0.5" / "- 0.2"');

const Image = z.string().describe("Image file name listed in assets.yaml");

const Text = z
  .union([
    z.string(),
    z.object({
      text: z.string(),
      at: Cue.optional().describe("Defaults to the scene start"),
      until: Cue.optional().describe("Defaults to the scene end"),
      align: z.enum(["left", "center"]).default("center"),
    }),
  ])
  .describe("A string, or { text, at, until, align } to time it inside the scene");

const Tone = z.enum(["surface", "bg", "land", "water", "structure", "structureAlt", "accent"]).describe("A theme colour role");

const base = {
  from: Cue.optional().describe("Scene start. Required except on the first scene, which starts at 0. A scene ends when the next one starts"),
  transition: z.enum(["cut", "fade"]).default("cut").describe("How this scene enters: a hard cut or a half-second crossfade"),
  variant: z.enum(["light", "dark"]).optional().describe("Paper variant under the scene; the video's config.variant when absent"),
  headline: Text.optional().describe("Display serif, upper part of the frame"),
  caption: Text.optional().describe("Mono label under the headline"),
  notes: z.string().optional().describe("Free text for humans, ignored"),
};

const Treatment = z.enum(["photo", "illustration", "plain", "silhouette"]).describe("photo: desaturated, paper-tinted, grained. illustration: grain and vignette only. plain: untouched. silhouette: a black shape recoloured in the theme ink");

export const StillScene = z.object({
  type: z.literal("still"),
  ...base,
  image: Image,
  fit: z.enum(["cover", "contain"]).default("cover"),
  move: z.enum(["none", "zoom-in", "zoom-out", "pan-left", "pan-right"]).default("zoom-in").describe("Slow camera drift over the scene"),
  treatment: Treatment.default("photo"),
  frame: z.boolean().default(false).describe("Inset the image in a double-rule frame instead of full bleed"),
  inset: z
    .object({ image: Image, headline: z.string().optional(), caption: z.string().optional(), at: Cue.optional() })
    .optional()
    .describe("A small framed card in the top right, e.g. a callback to an earlier card"),
});

export const CardScene = z.object({
  type: z.literal("card"),
  ...base,
  image: Image,
  headline: Text,
  tone: Tone.default("surface").describe("Flat background colour"),
  reference: Image.optional().describe("Scale reference silhouette drawn in the same spot on every card, e.g. human.svg"),
  height: z.number().positive().optional().describe("Subject height in metres; sizes the image against a 1.75 m reference"),
  treatment: Treatment.default("illustration"),
});

export const TimelineScene = z.object({
  type: z.literal("timeline"),
  ...base,
  range: z.tuple([z.number(), z.number()]).describe("Axis values left to right, e.g. [70000, 30000] for years ago"),
  tick: z.number().positive().describe("Tick spacing in axis units"),
  unit: z.string().default("").describe('Axis label, e.g. "years ago"'),
  bands: z
    .array(
      z.object({
        from: z.number(),
        to: z.number(),
        label: z.string(),
        tone: z.enum(["accent", "structure", "muted"]).default("structure"),
        at: Cue.optional().describe("When the band appears; defaults to a stagger after the scene start"),
        note: z.string().optional().describe("Small text under the band"),
      }),
    )
    .default([]),
  silhouettes: z
    .object({ images: z.array(Image), dim: z.boolean().default(false), at: Cue.optional() })
    .optional()
    .describe("A row of silhouettes above the axis, in colour or dimmed to outlines"),
  question: Cue.optional().describe("Show a large question mark from this cue"),
});

export const PanelsScene = z.object({
  type: z.literal("panels"),
  ...base,
  panels: z
    .array(z.object({ image: Image, label: z.string(), at: Cue.optional().describe("When the panel appears; defaults to a stagger"), treatment: Treatment.default("photo") }))
    .min(2)
    .max(4),
});

export const SilhouettesScene = z.object({
  type: z.literal("silhouettes"),
  ...base,
  background: Image.optional().describe("Landscape behind the group, illustration treatment"),
  images: z.array(Image).min(1),
  dim: z
    .object({ at: Cue, keep: z.number().int().nonnegative().default(1).describe("How many stay in colour, from the left") })
    .optional()
    .describe("At the cue, every silhouette but `keep` fades to a grey outline"),
});

export const MontageScene = z.object({
  type: z.literal("montage"),
  ...base,
  images: z.array(Image).min(1),
  dim: z.boolean().default(false).describe("Grey outlines instead of full colour"),
  treatment: Treatment.default("illustration"),
});

export const LandmassScene = z.object({
  type: z.literal("landmass"),
  ...base,
  region: z.string().describe('A country as Natural Earth names it, e.g. "Australia"; drawn flat in ink, centred'),
  loss: z
    .object({
      fraction: z.number().min(0).max(1).describe("Share of the land area that turns to the alert colour"),
      at: Cue,
      keep: z.enum(["east", "west", "north", "south"]).default("east").describe("Which edge the remaining strip hugs"),
      sweepSec: z.number().nonnegative().default(0.8).describe("How long the colour takes to sweep across from the far edge; 0 switches in one step"),
    })
    .optional()
    .describe("From the cue, this share of the area sweeps to the alert colour, leaving a strip along one edge"),
});

export const SceneSchema = z.discriminatedUnion("type", [StillScene, CardScene, TimelineScene, PanelsScene, SilhouettesScene, MontageScene, LandmassScene]);
export const ScenesSchema = z.array(SceneSchema).min(1);

export type Scene = z.output<typeof SceneSchema>;
export type SceneInput = z.input<typeof SceneSchema>;
export type TextSpec = z.output<typeof Text>;

/** Every asset file a list of scenes refers to. */
export function sceneImages(scenes: Scene[]): string[] {
  const out = new Set<string>();
  for (const s of scenes) {
    if ("image" in s) out.add(s.image);
    if ("images" in s) s.images.forEach((i) => out.add(i));
    if (s.type === "still" && s.inset) out.add(s.inset.image);
    if (s.type === "card" && s.reference) out.add(s.reference);
    if (s.type === "timeline" && s.silhouettes) s.silhouettes.images.forEach((i) => out.add(i));
    if (s.type === "panels") s.panels.forEach((p) => out.add(p.image));
    if (s.type === "silhouettes" && s.background) out.add(s.background);
  }
  return [...out];
}

/** Every cue in a scene, with a label saying where it is, for the storyboard check. */
export function sceneCues(scene: Scene, index: number): { where: string; cue: z.infer<typeof Cue> }[] {
  const out: { where: string; cue: z.infer<typeof Cue> }[] = [];
  const tag = `scene ${index + 1} (${scene.type})`;
  if (scene.from !== undefined) out.push({ where: `${tag} from`, cue: scene.from });
  for (const key of ["headline", "caption"] as const) {
    const t = scene[key];
    if (t && typeof t !== "string") {
      if (t.at !== undefined) out.push({ where: `${tag} ${key}.at`, cue: t.at });
      if (t.until !== undefined) out.push({ where: `${tag} ${key}.until`, cue: t.until });
    }
  }
  if (scene.type === "still" && scene.inset?.at !== undefined) out.push({ where: `${tag} inset.at`, cue: scene.inset.at });
  if (scene.type === "timeline") {
    scene.bands.forEach((b, i) => b.at !== undefined && out.push({ where: `${tag} bands[${i}].at`, cue: b.at }));
    if (scene.silhouettes?.at !== undefined) out.push({ where: `${tag} silhouettes.at`, cue: scene.silhouettes.at });
    if (scene.question !== undefined) out.push({ where: `${tag} question`, cue: scene.question });
  }
  if (scene.type === "panels") scene.panels.forEach((p, i) => p.at !== undefined && out.push({ where: `${tag} panels[${i}].at`, cue: p.at }));
  if (scene.type === "silhouettes" && scene.dim) out.push({ where: `${tag} dim.at`, cue: scene.dim.at });
  if (scene.type === "landmass" && scene.loss) out.push({ where: `${tag} loss.at`, cue: scene.loss.at });
  return out;
}

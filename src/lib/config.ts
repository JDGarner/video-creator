import { z } from "zod";

/** Settings for one short: config/defaults.json overridden field by field by the video's video.json. */
export const ShortConfigSchema = z.object({
  fps: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  theme: z.string(),
  tailSec: z.number().nonnegative(),
  narration: z.object({
    model: z.enum(["turbo", "original"]),
    device: z.enum(["cpu", "mps"]),
    gapMs: z.number().int().nonnegative(),
    seed: z.number().int(),
    maxWpm: z.number().positive(),
  }),
  captions: z.object({
    combineMs: z.number().positive(),
    holdMs: z.number().nonnegative(),
    top: z.number().min(0).max(1),
    maxWidth: z.number().min(0).max(1),
    fontScale: z.number().positive(),
    highlight: z.enum(["accent", "underline"]),
  }),
  publish: z.object({
    madeForKids: z.boolean(),
    syntheticMedia: z.boolean(),
    maxSec: z.number().positive(),
  }),
});

export type ShortConfig = z.infer<typeof ShortConfigSchema>;

type Overrides = { [K in keyof ShortConfig]?: ShortConfig[K] extends object ? Partial<ShortConfig[K]> : ShortConfig[K] };

/** Merge one level deep: a video.json may set `captions.top` without repeating the other caption fields. */
export function mergeConfig(defaults: unknown, overrides: unknown): ShortConfig {
  const base = ShortConfigSchema.parse(defaults);
  const over = (overrides ?? {}) as Overrides;
  return ShortConfigSchema.parse({
    ...base,
    ...over,
    narration: { ...base.narration, ...(over.narration ?? {}) },
    captions: { ...base.captions, ...(over.captions ?? {}) },
    publish: { ...base.publish, ...(over.publish ?? {}) },
  });
}

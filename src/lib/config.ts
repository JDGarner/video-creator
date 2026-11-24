import { z } from "zod";

/** Settings for one short: config/defaults.json overridden field by field by the video's video.json. */
export const ShortConfigSchema = z.object({
  fps: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  theme: z.string(),
  variant: z.enum(["light", "dark"]),
  tailSec: z.number().nonnegative(),
  wordmark: z.boolean(),
  narration: z.object({
    model: z.enum(["turbo", "original"]),
    device: z.enum(["cpu", "mps"]),
    gapMs: z.number().int().nonnegative(),
    seed: z.number().int(),
    maxWpm: z.number().positive(),
    /** The paid engine behind `--elevenlabs`; the key lives in .env, never here. */
    elevenlabs: z.object({
      voiceId: z.string(),
      model: z.string(),
      stability: z.number().min(0).max(1),
      similarity: z.number().min(0).max(1),
    }),
  }),
  captions: z.object({
    combineMs: z.number().positive(),
    holdMs: z.number().nonnegative(),
    top: z.number().min(0).max(1),
    maxWidth: z.number().min(0).max(1),
    fontScale: z.number().positive(),
    highlight: z.enum(["accent", "underline", "block"]),
    box: z.enum(["surface", "none"]),
    mode: z.enum(["words", "sentences"]),
    sentenceFontScale: z.number().positive(),
  }),
  publish: z.object({
    madeForKids: z.boolean(),
    syntheticMedia: z.boolean(),
    maxSec: z.number().positive(),
  }),
});

export type ShortConfig = z.infer<typeof ShortConfigSchema>;

type Shallow<T> = { [K in keyof T]?: T[K] extends object ? Partial<T[K]> : T[K] };
export type ConfigOverrides = { [K in keyof ShortConfig]?: ShortConfig[K] extends object ? Shallow<ShortConfig[K]> : ShortConfig[K] };

/** Merge field by field: a video.json may set `captions.top` or `narration.elevenlabs.voiceId` without repeating the rest. */
export function mergeConfig(defaults: unknown, overrides: unknown): ShortConfig {
  const base = ShortConfigSchema.parse(defaults);
  const over = (overrides ?? {}) as ConfigOverrides;
  return ShortConfigSchema.parse({
    ...base,
    ...over,
    narration: { ...base.narration, ...(over.narration ?? {}), elevenlabs: { ...base.narration.elevenlabs, ...(over.narration?.elevenlabs ?? {}) } },
    captions: { ...base.captions, ...(over.captions ?? {}) },
    publish: { ...base.publish, ...(over.publish ?? {}) },
  });
}

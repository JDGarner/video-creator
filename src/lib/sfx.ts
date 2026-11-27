import catalogue from "../../public/sfx/sfx.json";

/**
 * The sound palette: five cues synthesised by `pnpm sfx` into public/sfx/. The catalogue carries
 * each file's length and the gain that puts it at its level under the narration (see scripts/sfx.ts).
 */
export type SfxName = keyof typeof catalogue;

export const SFX: Record<SfxName, { sec: number; gain: number }> = catalogue;

export const SFX_NAMES = Object.keys(catalogue) as SfxName[];

/** Path under public/ for `staticFile`. */
export function sfxFile(name: SfxName): string {
  return `sfx/${name}.wav`;
}

/** The sound a scene enters with: a page flick on a cut, a soft whoosh under a crossfade, nothing for the first scene. */
export function transitionSound(transition: "cut" | "fade", index: number): SfxName | null {
  if (index === 0) return null;
  return transition === "fade" ? "whoosh" : "flick";
}

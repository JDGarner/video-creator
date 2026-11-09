export type SpringName = "snappy" | "settle" | "gentle" | "heavy";
export type EasingName = "easeInOutSine" | "easeOutCubic" | "easeInCubic";

export type Variant = "light" | "dark";

export type FontRole = "display" | "label" | "body" | "italic";

export type FontSpec = {
  family: string;
  weights: number[];
  style: "normal" | "italic";
};

export type ThemeColors = {
  bg: string;
  bgDark: string;
  ink: string;
  inkOnDark: string;
  muted: string;
  mutedOnDark: string;
  structure: string;
  structureAlt: string;
  accent: string;
  surface: string;
  surfaceDark: string;
  water: string;
  waterDark: string;
  land: string;
  landDark: string;
  ice: string;
};

export type ColorKey = keyof ThemeColors;

export type TypeSize = "hero" | "h1" | "h2" | "label" | "caption";

export type Theme = {
  name: string;
  colors: ThemeColors;
  fonts: Record<FontRole, FontSpec>;
  /** Size scale in px at 1080p; scaled by height / 1080 at render time. */
  type: Record<TypeSize, number> & { labelTracking: string; labelCase: "upper" | "smallcaps" };
  space: readonly number[];
  stroke: { hair: number; thin: number; regular: number; bold: number };
  card: {
    /** none: no rule. ticks: corner marks only. rules: top and bottom only. left: a bold accent bar. */
    border: "none" | "single" | "double" | "ticks" | "rules" | "left";
    fill: "none" | "surface" | "ink";
    radius: number;
    padding: number;
  };
  texture: {
    grainOpacity: number;
    vignetteStrength: number;
    grainScale: number;
    /** Optional ruled grid under the content, in design px at 1080p. */
    grid?: { step: number; opacity: number; major?: number };
  };
  motion: {
    default: SpringName;
    enter: SpringName;
    camera: EasingName;
    staggerMs: number;
    holdBeforeRevealMs: number;
  };
};

/**
 * Resolve a colour role against the current variant so components can ask for
 * "ink" and get the on-dark ink when the scene is dark.
 */
export function resolveColor(theme: Theme, key: ColorKey, variant: Variant): string {
  if (variant === "light") return theme.colors[key];
  const onDark: Partial<Record<ColorKey, ColorKey>> = {
    bg: "bgDark",
    ink: "inkOnDark",
    muted: "mutedOnDark",
    surface: "surfaceDark",
    water: "waterDark",
    land: "landDark",
  };
  return theme.colors[onDark[key] ?? key];
}

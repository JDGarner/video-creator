export type SpringName = "snappy" | "settle" | "gentle" | "heavy";
export type EasingName = "easeInOutSine" | "easeOutCubic" | "easeInCubic";

export type Variant = "light" | "dark";

export type FontRole = "display" | "label" | "body" | "italic";

export type FontSpec = {
  family: string;
  weights: number[];
  style: "normal" | "italic";
};

type RoleColors = {
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

export type ThemeColors = RoleColors & {
  /** Accent on the dark variant when the light one does not carry; accent when absent. */
  accentDark?: string;
  /** Caption block behind the spoken word and the text on it; accent and ink when absent. */
  highlight?: string;
  highlightInk?: string;
  highlightDark?: string;
  highlightInkDark?: string;
};

/** Colours every theme defines and that resolve against the variant. */
export type ColorKey = keyof RoleColors;

export type TypeSize = "hero" | "h1" | "h2" | "label" | "caption";

export type Theme = {
  name: string;
  colors: ThemeColors;
  /** caption is optional: captions fall back to display when a theme does not set one. */
  fonts: Record<FontRole, FontSpec> & { caption?: FontSpec };
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
  if (key === "accent") return theme.colors.accentDark ?? theme.colors.accent;
  return theme.colors[onDark[key] ?? key];
}

/** The caption block colours for a variant: fill then text. */
export function highlightColors(theme: Theme, variant: Variant): [string, string] {
  const c = theme.colors;
  if (variant === "dark") return [c.highlightDark ?? c.highlight ?? resolveColor(theme, "accent", variant), c.highlightInkDark ?? c.highlightInk ?? resolveColor(theme, "ink", variant)];
  return [c.highlight ?? c.accent, c.highlightInk ?? c.ink];
}

import type { Theme } from "../../tokens";

/** Exploration direction: stark white, black ink, one pure red, Inter Tight everywhere, no texture, captions as filled red blocks. */
export const swiss: Theme = {
  name: "swiss",
  colors: {
    bg: "#F7F7F4",
    bgDark: "#111111",
    ink: "#111111",
    inkOnDark: "#F7F7F4",
    muted: "#6B6B66",
    mutedOnDark: "#9A9A94",
    structure: "#3A3A3A",
    structureAlt: "#C9C9C2",
    accent: "#E10600",
    surface: "#F7F7F4",
    surfaceDark: "#111111",
    water: "#ECECE8",
    waterDark: "#0B0B0B",
    land: "#D9D9D3",
    landDark: "#2A2A2A",
    ice: "#FFFFFF",
  },
  fonts: {
    display: { family: "Inter Tight", weights: [700, 800], style: "normal" },
    label: { family: "Inter Tight", weights: [500, 600], style: "normal" },
    body: { family: "Inter Tight", weights: [400, 500], style: "normal" },
    italic: { family: "Inter Tight", weights: [400], style: "italic" },
  },
  type: { hero: 240, h1: 76, h2: 44, label: 18, caption: 15, labelTracking: "0.02em", labelCase: "upper" },
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  stroke: { hair: 0.75, thin: 1.25, regular: 2, bold: 3.5 },
  card: { border: "none", fill: "ink", radius: 0, padding: 26 },
  texture: { grainOpacity: 0, vignetteStrength: 0, grainScale: 1 },
  motion: { default: "settle", enter: "snappy", camera: "easeInOutSine", staggerMs: 60, holdBeforeRevealMs: 400 },
};

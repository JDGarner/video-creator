import type { Theme } from "../../../tokens";

/** Fieldguide variant: dark-first: walnut brown surface, parchment text, marigold accent, Vollkorn headlines with Work Sans labels, corner ticks, heavy grain. */
export const fgWalnut: Theme = {
  name: "fg-walnut",
  colors: {
    bg: "#2B2117",
    bgDark: "#1A130C",
    ink: "#EADDC2",
    inkOnDark: "#F1E7D2",
    muted: "#A8987F",
    mutedOnDark: "#8A7B64",
    structure: "#8A7458",
    structureAlt: "#4A3C2E",
    accent: "#F5A623",
    surface: "#33281C",
    surfaceDark: "#221A11",
    water: "#241B12",
    waterDark: "#120D08",
    land: "#3E3022",
    landDark: "#2E2318",
    ice: "#C9B998",
  },
  fonts: {
    display: { family: "Vollkorn", weights: [700], style: "normal" },
    label: { family: "Work Sans", weights: [600, 700], style: "normal" },
    body: { family: "Vollkorn", weights: [400, 500], style: "normal" },
    italic: { family: "Vollkorn", weights: [400], style: "italic" },
  },
  type: { hero: 220, h1: 72, h2: 44, label: 18, caption: 15, labelTracking: "0.14em", labelCase: "upper" },
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  stroke: { hair: 0.75, thin: 1.25, regular: 2, bold: 3.5 },
  card: { border: "ticks", fill: "none", radius: 0, padding: 28 },
  texture: { grainOpacity: 0.5, vignetteStrength: 0.5, grainScale: 1 },
  motion: { default: "settle", enter: "snappy", camera: "easeInOutSine", staggerMs: 60, holdBeforeRevealMs: 400 },
};

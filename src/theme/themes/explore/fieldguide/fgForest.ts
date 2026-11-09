import type { Theme } from "../../../tokens";

/** Fieldguide variant: kraft paper, forest green accent, Zilla Slab headlines with Work Sans labels, single hairline card on a lighter surface. */
export const fgForest: Theme = {
  name: "fg-forest",
  colors: {
    bg: "#E2D2B5",
    bgDark: "#1F1A12",
    ink: "#241C12",
    inkOnDark: "#EADDC3",
    muted: "#75664E",
    mutedOnDark: "#A4927A",
    structure: "#5B5E4A",
    structureAlt: "#B4A585",
    accent: "#2F6B3A",
    surface: "#EADDC2",
    surfaceDark: "#2A2318",
    water: "#D6C49E",
    waterDark: "#15110A",
    land: "#CBB893",
    landDark: "#3A3324",
    ice: "#F1E7D3",
  },
  fonts: {
    display: { family: "Zilla Slab", weights: [700], style: "normal" },
    label: { family: "Work Sans", weights: [600, 700], style: "normal" },
    body: { family: "Zilla Slab", weights: [400, 500], style: "normal" },
    italic: { family: "Zilla Slab", weights: [400], style: "italic" },
  },
  type: { hero: 220, h1: 72, h2: 44, label: 18, caption: 15, labelTracking: "0.14em", labelCase: "upper" },
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  stroke: { hair: 0.75, thin: 1.25, regular: 2, bold: 3.5 },
  card: { border: "single", fill: "surface", radius: 0, padding: 26 },
  texture: { grainOpacity: 0.34, vignetteStrength: 0.26, grainScale: 1 },
  motion: { default: "settle", enter: "snappy", camera: "easeInOutSine", staggerMs: 60, holdBeforeRevealMs: 400 },
};

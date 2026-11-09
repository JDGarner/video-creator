import type { Theme } from "../../tokens";

/** Exploration direction: sand paper, signal orange, Literata headlines, condensed sans labels, captions as solid ink blocks. */
export const poster: Theme = {
  name: "poster",
  colors: {
    bg: "#EBDFC9", bgDark: "#1F1A15", ink: "#1F1A15", inkOnDark: "#F0E6D2", muted: "#7A6D5C", mutedOnDark: "#A99C88",
    structure: "#4F5F6B", structureAlt: "#B7A98F", accent: "#F2641A", surface: "#F3EAD8", surfaceDark: "#2A241D",
    water: "#DED1B8", waterDark: "#17130F", land: "#D2C4A8", landDark: "#3A3128", ice: "#F6EFE0",
  },
  fonts: {
    display: { family: "Literata", weights: [600, 700], style: "normal" },
    label: { family: "Archivo Narrow", weights: [500, 600], style: "normal" },
    body: { family: "Literata", weights: [400, 500], style: "normal" },
    italic: { family: "Literata", weights: [400], style: "italic" },
  },
  type: { hero: 220, h1: 72, h2: 44, label: 18, caption: 15, labelTracking: "0.1em", labelCase: "upper" },
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  stroke: { hair: 0.75, thin: 1.25, regular: 2, bold: 3.5 },
  card: { border: "none", fill: "ink", radius: 0, padding: 26 },
  texture: { grainOpacity: 0.3, vignetteStrength: 0.22, grainScale: 1 },
  motion: { default: "settle", enter: "snappy", camera: "easeInOutSine", staggerMs: 60, holdBeforeRevealMs: 400 },
};

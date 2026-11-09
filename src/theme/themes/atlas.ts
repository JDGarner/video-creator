import type { Theme } from "../tokens";

/**
 * Atlas: warm cream paper, slate structure, a single rust accent.
 * Palette and pairing are our own; see docs/STYLE.md for the reasoning.
 */
export const atlas: Theme = {
  name: "atlas",
  colors: {
    bg: "#F2ECDF",
    bgDark: "#0F1A2B",
    ink: "#1E1B17",
    inkOnDark: "#EDE6D6",
    muted: "#7B7368",
    mutedOnDark: "#9BA3B0",
    structure: "#4B5F78",
    structureAlt: "#A39B8E",
    accent: "#B4532D",
    surface: "#FAF6EC",
    surfaceDark: "#15233A",
    water: "#E4DCCB",
    waterDark: "#0C1626",
    land: "#D6CBB3",
    landDark: "#2E3F5A",
    ice: "#F8F4EB",
  },
  fonts: {
    display: { family: "Fraunces", weights: [400, 600], style: "normal" },
    label: { family: "IBM Plex Mono", weights: [400, 500], style: "normal" },
    body: { family: "Newsreader", weights: [400, 500], style: "normal" },
    italic: { family: "Fraunces", weights: [400], style: "italic" },
  },
  type: {
    hero: 220,
    h1: 72,
    h2: 44,
    label: 18,
    caption: 15,
    labelTracking: "0.14em",
    labelCase: "upper",
  },
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  stroke: { hair: 0.75, thin: 1.25, regular: 2, bold: 3.5 },
  card: { border: "double", fill: "surface", radius: 2, padding: 28 },
  texture: { grainOpacity: 0.28, vignetteStrength: 0.22, grainScale: 1 },
  motion: {
    default: "settle",
    enter: "snappy",
    camera: "easeInOutSine",
    staggerMs: 60,
    holdBeforeRevealMs: 400,
  },
};

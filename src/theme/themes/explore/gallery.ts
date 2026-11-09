import type { Theme } from "../../tokens";

/** Exploration direction: cool pale grey like a museum wall, charcoal ink, International Klein Blue accent, airy Cormorant Garamond headlines with Manrope labels, rules above and below. */
export const gallery: Theme = {
  name: "gallery",
  colors: {
    bg: "#ECEDEA",
    bgDark: "#15161A",
    ink: "#222326",
    inkOnDark: "#ECEDEA",
    muted: "#7A7C80",
    mutedOnDark: "#9C9EA3",
    structure: "#4E5560",
    structureAlt: "#BFC1BD",
    accent: "#002FA7",
    surface: "#F3F4F1",
    surfaceDark: "#1C1D22",
    water: "#E2E4E0",
    waterDark: "#0F1014",
    land: "#D4D6D1",
    landDark: "#2B2D33",
    ice: "#FAFAF8",
  },
  fonts: {
    display: { family: "Cormorant Garamond", weights: [500, 600], style: "normal" },
    label: { family: "Manrope", weights: [500, 600], style: "normal" },
    body: { family: "EB Garamond", weights: [400, 500], style: "normal" },
    italic: { family: "Cormorant Garamond", weights: [500], style: "italic" },
  },
  type: { hero: 250, h1: 80, h2: 48, label: 18, caption: 15, labelTracking: "0.16em", labelCase: "upper" },
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  stroke: { hair: 0.75, thin: 1.25, regular: 2, bold: 3.5 },
  card: { border: "rules", fill: "none", radius: 0, padding: 24 },
  texture: { grainOpacity: 0.06, vignetteStrength: 0.1, grainScale: 1 },
  motion: { default: "settle", enter: "snappy", camera: "easeInOutSine", staggerMs: 60, holdBeforeRevealMs: 400 },
};

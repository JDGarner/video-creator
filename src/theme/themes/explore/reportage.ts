import type { Theme } from "../../tokens";

/** Exploration direction: off-white, tomato red, Spectral headlines with Karla labels, captions marked only by a bold accent bar on the left. */
export const reportage: Theme = {
  name: "reportage",
  colors: {
    bg: "#F7F2E8", bgDark: "#1C1917", ink: "#1C1917", inkOnDark: "#F1ECE2", muted: "#766F66", mutedOnDark: "#9B948B",
    structure: "#4E5E6E", structureAlt: "#ABA396", accent: "#DA3B1F", surface: "#F7F2E8", surfaceDark: "#1C1917",
    water: "#EAE3D6", waterDark: "#15120F", land: "#DCD3C3", landDark: "#332E29", ice: "#FBF8F2",
  },
  fonts: {
    display: { family: "Spectral", weights: [600, 700], style: "normal" },
    label: { family: "Karla", weights: [600, 700], style: "normal" },
    body: { family: "Spectral", weights: [400, 500], style: "normal" },
    italic: { family: "Spectral", weights: [400], style: "italic" },
  },
  type: { hero: 220, h1: 72, h2: 44, label: 18, caption: 15, labelTracking: "0.12em", labelCase: "upper" },
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  stroke: { hair: 0.75, thin: 1.25, regular: 2, bold: 3.5 },
  card: { border: "left", fill: "none", radius: 0, padding: 24 },
  texture: { grainOpacity: 0.22, vignetteStrength: 0.16, grainScale: 1 },
  motion: { default: "settle", enter: "snappy", camera: "easeInOutSine", staggerMs: 60, holdBeforeRevealMs: 400 },
};

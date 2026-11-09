import type { Theme } from "../../tokens";

/** Exploration direction: ivory ledger paper, vermilion, Fraunces with true small-caps serif labels, corner ticks instead of boxes. */
export const ledger: Theme = {
  name: "ledger",
  colors: {
    bg: "#F6F0E4", bgDark: "#1B1A1F", ink: "#23201B", inkOnDark: "#EFE8DA", muted: "#7D7467", mutedOnDark: "#9A9AA6",
    structure: "#5A6B7E", structureAlt: "#A89F91", accent: "#E34A2A", surface: "#FBF7EE", surfaceDark: "#24242C",
    water: "#E8E1D2", waterDark: "#15151A", land: "#DBD1BD", landDark: "#34353E", ice: "#FAF7F0",
  },
  fonts: {
    display: { family: "Fraunces", weights: [500, 700], style: "normal" },
    label: { family: "Spectral SC", weights: [500, 600], style: "normal" },
    body: { family: "Fraunces", weights: [400, 500], style: "normal" },
    italic: { family: "Fraunces", weights: [400], style: "italic" },
  },
  type: { hero: 220, h1: 72, h2: 44, label: 18, caption: 15, labelTracking: "0.08em", labelCase: "smallcaps" },
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  stroke: { hair: 0.75, thin: 1.25, regular: 2, bold: 3.5 },
  card: { border: "ticks", fill: "none", radius: 0, padding: 28 },
  texture: { grainOpacity: 0.26, vignetteStrength: 0.2, grainScale: 1 },
  motion: { default: "settle", enter: "snappy", camera: "easeInOutSine", staggerMs: 60, holdBeforeRevealMs: 400 },
};

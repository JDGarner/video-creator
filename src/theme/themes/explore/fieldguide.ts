import type { Theme } from "../../tokens";

/** Exploration direction: kraft-toned paper, marigold accent, Vollkorn headlines with Work Sans labels, captions ruled above and below only. */
export const fieldguide: Theme = {
  name: "fieldguide",
  colors: {
    bg: "#E6D9C0", bgDark: "#20190F", ink: "#2A2217", inkOnDark: "#EFE4CF", muted: "#7B6E57", mutedOnDark: "#A9987C",
    structure: "#5B5A4E", structureAlt: "#B6A786", accent: "#F5A623", surface: "#EADFC8", surfaceDark: "#2A2217",
    water: "#D9CBAE", waterDark: "#171209", land: "#CDBE9E", landDark: "#3C3222", ice: "#F1E8D4",
  },
  fonts: {
    display: { family: "Vollkorn", weights: [600, 700], style: "normal" },
    label: { family: "Work Sans", weights: [600, 700], style: "normal" },
    body: { family: "Vollkorn", weights: [400, 500], style: "normal" },
    italic: { family: "Vollkorn", weights: [400], style: "italic" },
  },
  type: { hero: 220, h1: 72, h2: 44, label: 18, caption: 15, labelTracking: "0.14em", labelCase: "upper" },
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  stroke: { hair: 0.75, thin: 1.25, regular: 2, bold: 3.5 },
  card: { border: "rules", fill: "surface", radius: 0, padding: 26 },
  texture: { grainOpacity: 0.34, vignetteStrength: 0.26, grainScale: 1 },
  motion: { default: "settle", enter: "snappy", camera: "easeInOutSine", staggerMs: 60, holdBeforeRevealMs: 400 },
};

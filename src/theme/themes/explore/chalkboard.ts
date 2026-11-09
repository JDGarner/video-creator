import type { Theme } from "../../tokens";

/** Exploration direction: deep green slate, chalk-white text, chalk-yellow accent, Lora headlines with Karla labels, heavy grain and corner ticks. */
export const chalkboard: Theme = {
  name: "chalkboard",
  colors: {
    bg: "#1F2B26",
    bgDark: "#141C19",
    ink: "#ECE7DA",
    inkOnDark: "#F3EFE4",
    muted: "#A6AC9F",
    mutedOnDark: "#7E857A",
    structure: "#6E8A7B",
    structureAlt: "#3A4A42",
    accent: "#F2D16B",
    surface: "#243330",
    surfaceDark: "#182420",
    water: "#1A2622",
    waterDark: "#0F1714",
    land: "#2E3F38",
    landDark: "#22302B",
    ice: "#B9C4BC",
  },
  fonts: {
    display: { family: "Lora", weights: [600, 700], style: "normal" },
    label: { family: "Karla", weights: [600, 700], style: "normal" },
    body: { family: "Lora", weights: [400, 500], style: "normal" },
    italic: { family: "Lora", weights: [400], style: "italic" },
  },
  type: { hero: 220, h1: 72, h2: 44, label: 18, caption: 15, labelTracking: "0.14em", labelCase: "upper" },
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  stroke: { hair: 0.75, thin: 1.25, regular: 2, bold: 3.5 },
  card: { border: "ticks", fill: "none", radius: 0, padding: 28 },
  texture: { grainOpacity: 0.45, vignetteStrength: 0.55, grainScale: 1 },
  motion: { default: "settle", enter: "snappy", camera: "easeInOutSine", staggerMs: 60, holdBeforeRevealMs: 400 },
};

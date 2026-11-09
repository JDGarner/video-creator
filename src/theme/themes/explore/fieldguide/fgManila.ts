import type { Theme } from "../../../tokens";

/** Fieldguide variant: manila folder yellow, burnt orange, Bitter slab headlines with condensed Archivo Narrow labels, ruled above and below. */
export const fgManila: Theme = {
  name: "fg-manila",
  colors: {
    bg: "#E9D9B6",
    bgDark: "#241B10",
    ink: "#2C2115",
    inkOnDark: "#EEDFC0",
    muted: "#7D6A4C",
    mutedOnDark: "#A8936F",
    structure: "#5F5B48",
    structureAlt: "#B9A47E",
    accent: "#D9641E",
    surface: "#EFE3C8",
    surfaceDark: "#2E2416",
    water: "#DDCBA3",
    waterDark: "#1A130B",
    land: "#D1BE96",
    landDark: "#3E3222",
    ice: "#F3EAD5",
  },
  fonts: {
    display: { family: "Bitter", weights: [700, 800], style: "normal" },
    label: { family: "Archivo Narrow", weights: [600, 700], style: "normal" },
    body: { family: "Bitter", weights: [400, 500], style: "normal" },
    italic: { family: "Bitter", weights: [400], style: "italic" },
  },
  type: { hero: 220, h1: 72, h2: 44, label: 18, caption: 15, labelTracking: "0.1em", labelCase: "upper" },
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  stroke: { hair: 0.75, thin: 1.25, regular: 2, bold: 3.5 },
  card: { border: "rules", fill: "none", radius: 0, padding: 26 },
  texture: { grainOpacity: 0.36, vignetteStrength: 0.28, grainScale: 1 },
  motion: { default: "settle", enter: "snappy", camera: "easeInOutSine", staggerMs: 60, holdBeforeRevealMs: 400 },
};

import type { Theme } from "../../../tokens";

/** Fieldguide variant: aged parchment, oxblood accent, Old Standard TT headlines with small-caps Spectral labels, corner ticks. */
export const fgParchment: Theme = {
  name: "fg-parchment",
  colors: {
    bg: "#E4D4B4",
    bgDark: "#231C14",
    ink: "#27201A",
    inkOnDark: "#EADBBF",
    muted: "#7A6B55",
    mutedOnDark: "#A3917A",
    structure: "#625A4B",
    structureAlt: "#B5A486",
    accent: "#8E2A1F",
    surface: "#EBDEC2",
    surfaceDark: "#2C241A",
    water: "#D9C8A4",
    waterDark: "#19130C",
    land: "#CEBC97",
    landDark: "#3C3124",
    ice: "#F0E6D0",
  },
  fonts: {
    display: { family: "Old Standard TT", weights: [700], style: "normal" },
    label: { family: "Spectral SC", weights: [500, 600], style: "normal" },
    body: { family: "Alegreya", weights: [400, 500], style: "normal" },
    italic: { family: "Old Standard TT", weights: [400], style: "italic" },
  },
  type: { hero: 210, h1: 72, h2: 44, label: 18, caption: 15, labelTracking: "0.08em", labelCase: "smallcaps" },
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  stroke: { hair: 0.75, thin: 1.25, regular: 2, bold: 3.5 },
  card: { border: "ticks", fill: "none", radius: 0, padding: 28 },
  texture: { grainOpacity: 0.4, vignetteStrength: 0.3, grainScale: 1 },
  motion: { default: "settle", enter: "snappy", camera: "easeInOutSine", staggerMs: 60, holdBeforeRevealMs: 400 },
};

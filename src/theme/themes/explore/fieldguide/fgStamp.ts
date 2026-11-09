import type { Theme } from "../../../tokens";

/** Fieldguide variant: darker kraft, faded stamp red, heavy Fraunces headlines with Plex Mono labels, ruled above and below, heavy grain. */
export const fgStamp: Theme = {
  name: "fg-stamp",
  colors: {
    bg: "#D9C7A5",
    bgDark: "#1E1710",
    ink: "#2A1F14",
    inkOnDark: "#E8D9BA",
    muted: "#73634B",
    mutedOnDark: "#A08D70",
    structure: "#5A5443",
    structureAlt: "#AE9C7C",
    accent: "#C8442B",
    surface: "#E1D1B1",
    surfaceDark: "#28201A",
    water: "#CDB990",
    waterDark: "#140F09",
    land: "#C2AE86",
    landDark: "#352B1E",
    ice: "#EADFC6",
  },
  fonts: {
    display: { family: "Fraunces", weights: [700, 900], style: "normal" },
    label: { family: "IBM Plex Mono", weights: [500, 600], style: "normal" },
    body: { family: "Fraunces", weights: [400, 500], style: "normal" },
    italic: { family: "Fraunces", weights: [400], style: "italic" },
  },
  type: { hero: 230, h1: 72, h2: 44, label: 18, caption: 15, labelTracking: "0.12em", labelCase: "upper" },
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  stroke: { hair: 0.75, thin: 1.25, regular: 2, bold: 3.5 },
  card: { border: "rules", fill: "none", radius: 0, padding: 26 },
  texture: { grainOpacity: 0.5, vignetteStrength: 0.34, grainScale: 1 },
  motion: { default: "settle", enter: "snappy", camera: "easeInOutSine", staggerMs: 60, holdBeforeRevealMs: 400 },
};

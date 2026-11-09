import type { Theme } from "../../tokens";

/** Exploration direction: pale warm grey, hot coral-red, Newsreader with DM Mono labels, single hairline card with generous padding. */
export const instrument: Theme = {
  name: "instrument",
  colors: {
    bg: "#EFE9DD", bgDark: "#141A22", ink: "#2B2622", inkOnDark: "#E9E3D7", muted: "#817A70", mutedOnDark: "#8E96A3",
    structure: "#55657A", structureAlt: "#AFA79B", accent: "#E03A5F", surface: "#F7F3EA", surfaceDark: "#1B222C",
    water: "#E2DBCD", waterDark: "#0F141B", land: "#D5CCBB", landDark: "#2C3644", ice: "#F8F5EE",
  },
  fonts: {
    display: { family: "Newsreader", weights: [500, 600], style: "normal" },
    label: { family: "DM Mono", weights: [400, 500], style: "normal" },
    body: { family: "Newsreader", weights: [400, 500], style: "normal" },
    italic: { family: "Newsreader", weights: [400], style: "italic" },
  },
  type: { hero: 220, h1: 72, h2: 44, label: 18, caption: 15, labelTracking: "0.16em", labelCase: "upper" },
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  stroke: { hair: 0.75, thin: 1.25, regular: 2, bold: 3.5 },
  card: { border: "single", fill: "surface", radius: 2, padding: 30 },
  texture: { grainOpacity: 0.24, vignetteStrength: 0.18, grainScale: 1 },
  motion: { default: "settle", enter: "snappy", camera: "easeInOutSine", staggerMs: 60, holdBeforeRevealMs: 400 },
};

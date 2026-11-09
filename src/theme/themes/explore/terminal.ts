import type { Theme } from "../../tokens";

/** Exploration direction: near-black screen, light grey text, phosphor green accent, JetBrains Mono for everything including headlines, single hairline frames. */
export const terminal: Theme = {
  name: "terminal",
  colors: {
    bg: "#0C0F13",
    bgDark: "#060809",
    ink: "#D7DBE0",
    inkOnDark: "#E6E9ED",
    muted: "#7C848E",
    mutedOnDark: "#5F6771",
    structure: "#3B4652",
    structureAlt: "#232B34",
    accent: "#4AF626",
    surface: "#12161B",
    surfaceDark: "#0A0D10",
    water: "#0A0D11",
    waterDark: "#040506",
    land: "#1B222A",
    landDark: "#141A20",
    ice: "#2A333D",
  },
  fonts: {
    display: { family: "JetBrains Mono", weights: [600, 700], style: "normal" },
    label: { family: "JetBrains Mono", weights: [400, 500], style: "normal" },
    body: { family: "JetBrains Mono", weights: [400], style: "normal" },
    italic: { family: "JetBrains Mono", weights: [400], style: "italic" },
  },
  type: { hero: 200, h1: 64, h2: 38, label: 18, caption: 15, labelTracking: "0.1em", labelCase: "upper" },
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  stroke: { hair: 0.75, thin: 1.25, regular: 2, bold: 3.5 },
  card: { border: "single", fill: "surface", radius: 0, padding: 28 },
  texture: { grainOpacity: 0.1, vignetteStrength: 0.6, grainScale: 1 },
  motion: { default: "settle", enter: "snappy", camera: "easeInOutSine", staggerMs: 60, holdBeforeRevealMs: 400 },
};

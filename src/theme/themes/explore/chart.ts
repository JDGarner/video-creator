import type { Theme } from "../../tokens";

/** Exploration direction: pale blue-grey nautical chart paper with a fine grid, deep teal ink, buoy-orange accent, Source Serif 4 headlines and Red Hat Mono labels. */
export const chart: Theme = {
  name: "chart",
  colors: {
    bg: "#DEE6E7",
    bgDark: "#0F2A30",
    ink: "#12343B",
    inkOnDark: "#DCE8E9",
    muted: "#5E7A80",
    mutedOnDark: "#88A3A8",
    structure: "#3D6B74",
    structureAlt: "#A9BFC3",
    accent: "#FF6A13",
    surface: "#E8EEEF",
    surfaceDark: "#163C44",
    water: "#CFDCDF",
    waterDark: "#0B2026",
    land: "#E4E9E3",
    landDark: "#1E4A52",
    ice: "#F2F6F5",
  },
  fonts: {
    display: { family: "Source Serif 4", weights: [600, 700], style: "normal" },
    label: { family: "Red Hat Mono", weights: [400, 500], style: "normal" },
    body: { family: "Source Serif 4", weights: [400, 500], style: "normal" },
    italic: { family: "Source Serif 4", weights: [400], style: "italic" },
  },
  type: { hero: 220, h1: 72, h2: 44, label: 18, caption: 15, labelTracking: "0.12em", labelCase: "upper" },
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  stroke: { hair: 0.75, thin: 1.25, regular: 2, bold: 3.5 },
  card: { border: "single", fill: "surface", radius: 0, padding: 26 },
  texture: { grainOpacity: 0.14, vignetteStrength: 0.18, grainScale: 1,
    grid: {step: 48, opacity: 0.12} },
  motion: { default: "settle", enter: "snappy", camera: "easeInOutSine", staggerMs: 60, holdBeforeRevealMs: 400 },
};

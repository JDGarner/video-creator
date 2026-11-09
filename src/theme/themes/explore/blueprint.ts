import type { Theme } from "../../tokens";

/** Exploration direction: cobalt blueprint paper with a drafting grid, pale cyan ink, chalk-yellow accent, Space Grotesk headlines and Plex Mono labels, corner ticks. */
export const blueprint: Theme = {
  name: "blueprint",
  colors: {
    bg: "#1E3F7A",
    bgDark: "#122855",
    ink: "#E6F0FF",
    inkOnDark: "#F0F6FF",
    muted: "#9DB4DB",
    mutedOnDark: "#7F96BF",
    structure: "#6F8FC9",
    structureAlt: "#3F60A0",
    accent: "#F6E27A",
    surface: "#254A8A",
    surfaceDark: "#1A3366",
    water: "#1B3A72",
    waterDark: "#10234D",
    land: "#2E5296",
    landDark: "#213F78",
    ice: "#DCE8FF",
  },
  fonts: {
    display: { family: "Space Grotesk", weights: [500, 700], style: "normal" },
    label: { family: "IBM Plex Mono", weights: [400, 500], style: "normal" },
    body: { family: "Archivo", weights: [400, 500], style: "normal" },
    italic: { family: "Archivo", weights: [400], style: "italic" },
  },
  type: { hero: 220, h1: 72, h2: 44, label: 18, caption: 15, labelTracking: "0.12em", labelCase: "upper" },
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  stroke: { hair: 0.75, thin: 1.25, regular: 2, bold: 3.5 },
  card: { border: "ticks", fill: "none", radius: 0, padding: 28 },
  texture: { grainOpacity: 0.18, vignetteStrength: 0.3, grainScale: 1,
    grid: {step: 40, opacity: 0.22, major: 5} },
  motion: { default: "settle", enter: "snappy", camera: "easeInOutSine", staggerMs: 60, holdBeforeRevealMs: 400 },
};

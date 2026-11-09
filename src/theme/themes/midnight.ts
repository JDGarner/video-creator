import type { Theme } from "../tokens";

/**
 * Midnight: deep navy surfaces with amber accent and a Bodoni display face.
 * Exists to prove the theme layer is real; differs in palette and every font role.
 */
export const midnight: Theme = {
  name: "midnight",
  colors: {
    bg: "#101A2C",
    bgDark: "#070C16",
    ink: "#E9E2D2",
    inkOnDark: "#F2ECDD",
    muted: "#8E97A6",
    mutedOnDark: "#7C8697",
    structure: "#5B7793",
    structureAlt: "#3A4A62",
    accent: "#E0A458",
    surface: "#172540",
    surfaceDark: "#0D1627",
    water: "#0B1424",
    waterDark: "#05090F",
    land: "#2B3C57",
    landDark: "#1F2D44",
    ice: "#3E5070",
  },
  fonts: {
    display: { family: "Bodoni Moda", weights: [400, 600], style: "normal" },
    label: { family: "JetBrains Mono", weights: [400, 500], style: "normal" },
    body: { family: "Spectral", weights: [400, 500], style: "normal" },
    italic: { family: "Bodoni Moda", weights: [400], style: "italic" },
  },
  type: {
    hero: 230,
    h1: 76,
    h2: 46,
    label: 17,
    caption: 15,
    labelTracking: "0.18em",
    labelCase: "upper",
  },
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  stroke: { hair: 0.75, thin: 1.25, regular: 2, bold: 3.5 },
  card: { border: "single", fill: "surface", radius: 0, padding: 30 },
  texture: { grainOpacity: 0.34, vignetteStrength: 0.55, grainScale: 1.2 },
  motion: {
    default: "settle",
    enter: "snappy",
    camera: "easeInOutSine",
    staggerMs: 70,
    holdBeforeRevealMs: 450,
  },
};

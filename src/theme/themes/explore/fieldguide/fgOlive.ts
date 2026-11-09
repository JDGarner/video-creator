import type { Theme } from "../../../tokens";

/** Fieldguide variant: olive-tinted paper, marigold accent kept from fieldguide, Libre Baskerville headlines with Karla labels, bold accent bar on the left. */
export const fgOlive: Theme = {
  name: "fg-olive",
  colors: {
    bg: "#DDD5B8",
    bgDark: "#1F2017",
    ink: "#2B2A1C",
    inkOnDark: "#E9E3CB",
    muted: "#737358",
    mutedOnDark: "#A2A282",
    structure: "#5E6650",
    structureAlt: "#B3B08E",
    accent: "#E89B1E",
    surface: "#E4DDC2",
    surfaceDark: "#2A2B1F",
    water: "#CFC8A6",
    waterDark: "#14150E",
    land: "#C6BF9A",
    landDark: "#363829",
    ice: "#EEE9D6",
  },
  fonts: {
    display: { family: "Libre Baskerville", weights: [700], style: "normal" },
    label: { family: "Karla", weights: [700], style: "normal" },
    body: { family: "Libre Baskerville", weights: [400], style: "normal" },
    italic: { family: "Libre Baskerville", weights: [400], style: "italic" },
  },
  type: { hero: 200, h1: 68, h2: 44, label: 18, caption: 15, labelTracking: "0.14em", labelCase: "upper" },
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  stroke: { hair: 0.75, thin: 1.25, regular: 2, bold: 3.5 },
  card: { border: "left", fill: "none", radius: 0, padding: 24 },
  texture: { grainOpacity: 0.32, vignetteStrength: 0.24, grainScale: 1 },
  motion: { default: "settle", enter: "snappy", camera: "easeInOutSine", staggerMs: 60, holdBeforeRevealMs: 400 },
};

import type { Theme } from "../../tokens";
import { withAlpha } from "../../../lib/color";

const MINT = "#5CF2C5";

/** Cream paper with a plum accent that doubles as the caption block; the dark variant is deep navy with pale mint ink and a mint accent, the spoken word mint on a translucent mint block. Vollkorn headlines with Work Sans labels and Bricolage Grotesque captions. */
export const fieldguide: Theme = {
  name: "fieldguide",
  colors: {
    bg: "#F6EFE6", bgDark: "#0C1A2B", ink: "#2A2217", inkOnDark: "#BFEFE0", muted: "#7B6E57", mutedOnDark: "#7FA99C",
    structure: "#5B5A4E", structureAlt: "#B6A786", accent: "#5E3A6B", accentDark: MINT, surface: "#F6EFE6", surfaceDark: "#132840",
    water: "#D9CBAE", waterDark: "#0A1522", land: "#CDBE9E", landDark: "#163049", ice: "#F1E8D4",
    highlightInk: "#FFFFFF", highlightDark: withAlpha(MINT, 0.16), highlightInkDark: MINT,
    alert: "#C2452D", alertDark: "#FF6B57",
  },
  fonts: {
    display: { family: "Vollkorn", weights: [600, 700], style: "normal" },
    label: { family: "Work Sans", weights: [600, 700], style: "normal" },
    body: { family: "Vollkorn", weights: [400, 500], style: "normal" },
    italic: { family: "Vollkorn", weights: [400], style: "italic" },
    caption: { family: "Bricolage Grotesque", weights: [500], style: "normal" },
  },
  type: { hero: 220, h1: 72, h2: 44, label: 18, caption: 15, labelTracking: "0.14em", labelCase: "upper" },
  space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  stroke: { hair: 0.75, thin: 1.25, regular: 2, bold: 3.5 },
  card: { border: "rules", fill: "surface", radius: 0, padding: 26 },
  texture: { grainOpacity: 0.34, vignetteStrength: 0.26, grainScale: 1 },
  motion: { default: "settle", enter: "snappy", camera: "easeInOutSine", staggerMs: 60, holdBeforeRevealMs: 400 },
};

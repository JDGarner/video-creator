import type { Theme } from "../tokens";
import { atlas } from "./atlas";
import { midnight } from "./midnight";
import { fieldguide } from "./explore/fieldguide";
import { instrument } from "./explore/instrument";
import { ledger } from "./explore/ledger";
import { poster } from "./explore/poster";
import { reportage } from "./explore/reportage";
import { blueprint } from "./explore/blueprint";
import { swiss } from "./explore/swiss";
import { terminal } from "./explore/terminal";
import { gallery } from "./explore/gallery";
import { chart } from "./explore/chart";
import { chalkboard } from "./explore/chalkboard";
import { fgManila } from "./explore/fieldguide/fgManila";
import { fgParchment } from "./explore/fieldguide/fgParchment";
import { fgForest } from "./explore/fieldguide/fgForest";
import { fgStamp } from "./explore/fieldguide/fgStamp";
import { fgOlive } from "./explore/fieldguide/fgOlive";
import { fgWalnut } from "./explore/fieldguide/fgWalnut";

export const THEMES = {
  atlas,
  midnight,
  ledger,
  poster,
  instrument,
  reportage,
  fieldguide,
  blueprint,
  swiss,
  terminal,
  gallery,
  chart,
  chalkboard,
  "fg-manila": fgManila,
  "fg-parchment": fgParchment,
  "fg-forest": fgForest,
  "fg-stamp": fgStamp,
  "fg-olive": fgOlive,
  "fg-walnut": fgWalnut,
} as const satisfies Record<string, Theme>;

/** Exploration rounds, each rendered as a contact sheet by directions-<round>. */
export const ROUNDS: Record<string, ThemeName[]> = {
  "1": ["ledger", "poster", "instrument", "reportage", "fieldguide"],
  "2": ["blueprint", "swiss", "terminal", "gallery", "chart", "chalkboard"],
  fieldguide: ["fg-manila", "fg-parchment", "fg-forest", "fg-stamp", "fg-olive", "fg-walnut"],
};

export type ThemeName = keyof typeof THEMES;

export function getTheme(name: string): Theme {
  const theme = (THEMES as Record<string, Theme>)[name];
  if (!theme) {
    throw new Error(`Unknown theme "${name}". Available: ${Object.keys(THEMES).join(", ")}`);
  }
  return theme;
}

import React, { createContext, useContext } from "react";
import { staticFile } from "remotion";
import type { Cue } from "../lib/cues";

/** What every scene component needs beyond its own data. */
export type SceneContextValue = {
  /** Composition id, for asset paths. */
  video: string;
  /** Asset file -> published path under public/, or null when the file is not there yet. */
  assets: Record<string, string | null>;
  /** Frame (local to the scene's Sequence) at which the scene nominally starts; crossfades begin before it. */
  start: number;
  /** Local frame at which the scene ends. */
  end: number;
  /** Local frame for a cue; falls back to the scene start when the cue is undefined. */
  local: (cue: Cue | undefined, fallback?: number) => number;
};

const Ctx = createContext<SceneContextValue | null>(null);
export const SceneProvider = Ctx.Provider;

export function useScene(): SceneContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useScene() outside a scene");
  return v;
}

/** Published URL of an asset, or null while it is still a placeholder. */
export function useAsset(file: string): { src: string | null; name: string } {
  const { assets } = useScene();
  const rel = assets[file];
  return { src: rel ? staticFile(rel) : null, name: file };
}

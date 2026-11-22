import React from "react";
import { Composition, staticFile, type CalculateMetadataFunction } from "remotion";
import defaults from "../../config/defaults.json";
import { mergeConfig, type ShortConfig } from "../lib/config";
import { loadNarration, type Narration } from "../lib/narration";
import type { Scene } from "../scenes/schema";
import { DataShort } from "./DataShort";
import dataVideos from "./videos.json";

/** scenes.json as published by `pnpm check`: the storyboard's scenes plus where each asset ended up. */
export type SceneData = { id: string; title: string; scenes: Scene[]; assets: Record<string, string | null> };

export type ShortProps = { narration: Narration | null; config: ShortConfig; data: SceneData | null };

/** Every short the pipeline can render, by folder name under stories/shorts/. `pnpm check` writes the list. */
export const VIDEOS: string[] = dataVideos;

export const DEFAULT_CONFIG = mergeConfig(defaults, {});

async function fetchJson<T>(rel: string): Promise<T | null> {
  const r = await fetch(staticFile(rel));
  return r.ok ? ((await r.json()) as T) : null;
}

const metadataFor =
  (id: string): CalculateMetadataFunction<ShortProps> =>
  async ({ props }) => {
    const config = mergeConfig(defaults, (await fetchJson(`shorts/${id}/config.json`)) ?? {});
    const narration = await loadNarration("shorts", id);
    const data = await fetchJson<SceneData>(`shorts/${id}/scenes.json`);
    return {
      props: { ...props, narration, config, data },
      fps: config.fps,
      width: config.width,
      height: config.height,
      durationInFrames: Math.ceil((narration.duration + config.tailSec) * config.fps),
    };
  };

/** One `short-<id>` composition per registered short, sized and timed from its published files. */
export const ShortCompositions: React.FC = () => (
  <>
    {VIDEOS.map((id) => (
      <Composition
        key={id}
        id={`short-${id}`}
        component={DataShort}
        width={DEFAULT_CONFIG.width}
        height={DEFAULT_CONFIG.height}
        fps={DEFAULT_CONFIG.fps}
        durationInFrames={DEFAULT_CONFIG.fps * 10}
        defaultProps={{ narration: null, config: DEFAULT_CONFIG, data: null }}
        calculateMetadata={metadataFor(id)}
      />
    ))}
  </>
);

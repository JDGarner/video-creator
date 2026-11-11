import React from "react";
import { Composition, staticFile, type CalculateMetadataFunction } from "remotion";
import defaults from "../../config/defaults.json";
import { MakassanShort } from "../dev/shorts/MakassanShort";
import { mergeConfig, type ShortConfig } from "../lib/config";
import { loadNarration, type Narration } from "../lib/narration";

export type ShortProps = { narration: Narration | null; config: ShortConfig };

/** Every short the pipeline can render, by the folder name under stories/shorts/. */
export const SHORTS: Record<string, React.FC<ShortProps>> = {
  "makassan-trade-route": MakassanShort,
};

export const DEFAULT_CONFIG = mergeConfig(defaults, {});

const metadataFor =
  (id: string): CalculateMetadataFunction<ShortProps> =>
  async ({ props }) => {
    const config = mergeConfig(defaults, await (await fetch(staticFile(`audio/shorts/${id}/config.json`))).json());
    const narration = await loadNarration("shorts", id);
    return {
      props: { ...props, narration, config },
      fps: config.fps,
      width: config.width,
      height: config.height,
      durationInFrames: Math.ceil((narration.duration + config.tailSec) * config.fps),
    };
  };

/** One `short-<id>` composition per registered short, sized and timed from its published files. */
export const ShortCompositions: React.FC = () => (
  <>
    {Object.entries(SHORTS).map(([id, Component]) => (
      <Composition
        key={id}
        id={`short-${id}`}
        component={Component}
        width={DEFAULT_CONFIG.width}
        height={DEFAULT_CONFIG.height}
        fps={DEFAULT_CONFIG.fps}
        durationInFrames={DEFAULT_CONFIG.fps * 10}
        defaultProps={{ narration: null, config: DEFAULT_CONFIG }}
        calculateMetadata={metadataFor(id)}
      />
    ))}
  </>
);

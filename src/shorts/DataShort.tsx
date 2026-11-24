import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions } from "../primitives/Captions";
import { Label } from "../primitives/Label";
import { Paper } from "../primitives/Paper";
import { ThemeProvider, useColor, useTheme, VariantProvider } from "../theme/ThemeProvider";
import { getTheme } from "../theme/themes";
import { coveredScenes, resolveCue } from "../lib/cues";
import { narrationFile, type Narration } from "../lib/narration";
import { fade } from "../motion/timeline";
import { SceneProvider } from "../scenes/context";
import { SceneView } from "../scenes";
import type { Scene } from "../scenes/schema";
import type { ShortProps } from "./index";

const FADE_SEC = 0.5;

type Placed = { scene: Scene; origin: number; start: number; end: number; sequenceEnd: number };

/** Lay scenes on the timeline: each starts at its cue and ends when the next starts; crossfades straddle the cue. */
function place(all: Scene[], narration: Narration | null, fps: number, total: number): Placed[] {
  const scenes = narration ? coveredScenes(all, narration) : all;
  const fadeF = Math.round(FADE_SEC * fps);
  const starts = scenes.map((s, i) => {
    if (i === 0 || s.from === undefined) return 0;
    if (!narration) return Math.round((i / scenes.length) * total);
    return Math.round(resolveCue(s.from, narration) * fps);
  });
  return scenes.map((scene, i) => {
    const start = starts[i]!;
    const next = scenes[i + 1];
    const nextStart = starts[i + 1] ?? total;
    const lead = scene.transition === "fade" && i > 0 ? Math.round(fadeF / 2) : 0;
    const tail = next?.transition === "fade" ? Math.round(fadeF / 2) : 0;
    const origin = start - lead;
    return { scene, origin, start: lead, end: nextStart - origin, sequenceEnd: nextStart + tail - origin };
  });
}

const Wordmark: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { theme, scale } = useTheme();
  const accent = useColor("accent");
  const s = (i: number) => theme.space[i]! * scale;
  return (
    <div style={{ position: "absolute", left: s(6), top: s(8), display: "flex", alignItems: "center", gap: s(2), opacity: fade(frame, 9, 10) }}>
      <div style={{ width: s(2), height: s(2), borderRadius: "50%", backgroundColor: accent }} />
      <Label color="ink" weight={700}>
        {text}
      </Label>
    </div>
  );
};

const Body: React.FC<ShortProps> = ({ narration, config, data }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const placed = useMemo(() => (data ? place(data.scenes, narration, fps, durationInFrames) : []), [data, narration, fps, durationInFrames]);
  const fadeF = Math.round(FADE_SEC * fps);
  if (!data) return <Paper />;
  return (
    <AbsoluteFill>
      {narration ? <Audio src={narrationFile("shorts", data.id)} /> : null}
      {placed.map((p, i) => {
        const opacity = p.scene.transition === "fade" && i > 0 ? fade(frame, p.origin, fadeF) : 1;
        return (
          <Sequence key={i} from={p.origin} durationInFrames={Math.max(1, p.sequenceEnd)} layout="none">
            <AbsoluteFill style={{ opacity }}>
              <Paper variant={p.scene.variant ?? config.variant}>
                <SceneProvider
                  value={{
                    video: data.id,
                    assets: data.assets,
                    start: p.start,
                    end: p.end,
                    local: (cue, fallback) => (cue === undefined ? (fallback ?? p.start) : narration ? Math.round(resolveCue(cue, narration) * fps) - p.origin : (fallback ?? p.start)),
                  }}
                >
                  <SceneView scene={p.scene} />
                </SceneProvider>
              </Paper>
            </AbsoluteFill>
          </Sequence>
        );
      })}
      <VariantProvider value={config.variant}>
        {config.wordmark ? <Wordmark text={data.title} /> : null}
        {narration ? <Captions words={narration.words} {...config.captions} /> : null}
      </VariantProvider>
    </AbsoluteFill>
  );
};

/** The composition for any short whose storyboard has a `## Scenes` section. */
export const DataShort: React.FC<ShortProps> = (props) => (
  <ThemeProvider theme={getTheme(props.config.theme)} scale={1}>
    <Body {...props} />
  </ThemeProvider>
);

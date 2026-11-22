import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { z } from "zod";
import { Still } from "../primitives/Still";
import { fade } from "../motion/timeline";
import { useAsset, useScene } from "./context";
import { SceneText } from "./Text";
import { bandHeight, LAYOUT } from "./layout";
import type { MontageScene as Schema } from "./schema";

const Slide: React.FC<{ file: string; at: number; treatment: z.output<typeof Schema>["treatment"]; dim: boolean; frames: number }> = ({ file, at, treatment, dim, frames }) => {
  const frame = useCurrentFrame();
  const a = useAsset(file);
  const opacity = fade(frame, at, 12) * (dim ? 0.4 : 1);
  return (
    <div style={{ position: "absolute", inset: 0, opacity, filter: dim ? "grayscale(1)" : "none" }}>
      <Still src={a.src} name={a.name} fit="contain" treatment={treatment} move="zoom-in" moveFrames={frames} />
    </div>
  );
};

/** Images crossfading in turn across the scene, evenly spaced. */
export const MontageScene: React.FC<{ scene: z.output<typeof Schema> }> = ({ scene }) => {
  const { width, height } = useVideoConfig();
  const { start, end } = useScene();
  const n = scene.images.length;
  const each = (end - start) / n;
  return (
    <>
      <div style={{ position: "absolute", left: width * LAYOUT.margin, width: width * (1 - 2 * LAYOUT.margin), top: height * LAYOUT.visual.top, height: bandHeight(height, LAYOUT.visual) }}>
        {scene.images.map((f, i) => (
          <Slide key={`${f}-${i}`} file={f} at={start + Math.round(i * each)} treatment={scene.treatment} dim={scene.dim} frames={end - start} />
        ))}
      </div>
      <SceneText headline={scene.headline} caption={scene.caption} top={LAYOUT.textBelow} />
    </>
  );
};

import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { z } from "zod";
import { Reveal } from "../primitives/Reveal";
import { Still } from "../primitives/Still";
import { useTheme } from "../theme/ThemeProvider";
import { fade } from "../motion/timeline";
import { useAsset, useScene } from "./context";
import { SceneText } from "./Text";
import { LAYOUT } from "./layout";
import type { SilhouettesScene as Schema } from "./schema";

const One: React.FC<{ file: string; at: number; dimAt: number | null; left: number; top: number; width: number; height: number }> = ({ file, at, dimAt, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const a = useAsset(file);
  const d = dimAt === null ? 0 : fade(frame, dimAt, 8);
  return (
    <Reveal at={at} from="fade" style={{ position: "absolute", left, top, width, height, filter: `grayscale(${d})`, opacity: 1 - 0.7 * d }}>
      <Still src={a.src} name={a.name} fit="contain" align="bottom" treatment="silhouette" />
    </Reveal>
  );
};

/** A grazing group of silhouettes over an optional landscape; at a cue all but a few fade to outlines. */
export const SilhouettesScene: React.FC<{ scene: z.output<typeof Schema> }> = ({ scene }) => {
  const { width, height, fps } = useVideoConfig();
  const { theme } = useTheme();
  const { start, end, local } = useScene();
  const bgImg = useAsset(scene.background ?? "");
  const n = scene.images.length;
  const back = Math.ceil(n / 2);
  const rows = [scene.images.slice(0, back), scene.images.slice(back)];
  const dimAt = scene.dim ? local(scene.dim.at) : null;
  const keep = scene.dim?.keep ?? 0;
  const stagger = Math.round((theme.motion.staggerMs / 1000) * fps);
  let index = 0;
  return (
    <>
      {scene.background ? <Still src={bgImg.src} name={bgImg.name} fit="cover" move="zoom-in" moveFrames={end - start} treatment="illustration" /> : null}
      {rows.map((row, r) => {
        const band = LAYOUT.silhouettes.rows[r]!;
        const rowTop = height * band.top;
        const rowH = height * band.height;
        const slot = (width * 0.9) / Math.max(row.length, 1);
        const offset = width * 0.05 + (r === 1 ? slot * 0.25 : 0);
        return row.map((file, i) => {
          const k = index++;
          return <One key={`${r}-${file}-${i}`} file={file} at={start + k * stagger} dimAt={dimAt !== null && k >= keep ? dimAt : null} left={offset + i * slot} top={rowTop} width={slot * 0.9} height={rowH} />;
        });
      })}
      <SceneText headline={scene.headline} caption={scene.caption} boxed={!!scene.background} top={LAYOUT.headline} />
    </>
  );
};

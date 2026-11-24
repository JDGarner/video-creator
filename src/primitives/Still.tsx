import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";
import { useColor, useTheme } from "../theme/ThemeProvider";
import { isDark, withAlpha } from "../lib/color";
import { progress } from "../motion/timeline";
import { Grain } from "./Grain";
import { Label } from "./Label";

export type Treatment = "photo" | "illustration" | "plain" | "silhouette";
export type Move = "none" | "zoom-in" | "zoom-out" | "pan-left" | "pan-right";

const POSITION = { center: "center", bottom: "center bottom", "bottom-left": "left bottom", "bottom-right": "right bottom" } as const;

type Props = {
  src: string | null;
  /** Shown in the placeholder when src is null. */
  name: string;
  fit?: "cover" | "contain";
  treatment?: Treatment;
  move?: Move;
  /** Frames over which the move plays, usually the scene length. */
  moveFrames?: number;
  /** Where a contained image sits in its box. */
  align?: "center" | "bottom" | "bottom-left" | "bottom-right";
  style?: React.CSSProperties;
};

/**
 * A photograph or illustration made to sit on the paper: optional slow drift, desaturation and a
 * paper tint for photos, grain and vignette over everything but `plain`. `silhouette` uses the
 * image as a mask filled with the theme ink, so black PhyloPic shapes take the paper's ink colour.
 * Fills its parent.
 */
export const Still: React.FC<Props> = ({ src, name, fit = "cover", treatment = "photo", move = "none", moveFrames = 1, align = "center", style }) => {
  const frame = useCurrentFrame();
  const { theme } = useTheme();
  const bg = useColor("bg");
  const ink = useColor("ink");
  const p = progress(frame, 0, Math.max(1, moveFrames), "easeInOutSine");
  const transform =
    move === "zoom-in" ? `scale(${1 + 0.08 * p})` : move === "zoom-out" ? `scale(${1.08 - 0.08 * p})` : move === "pan-left" ? `scale(1.06) translateX(${-3 * p}%)` : move === "pan-right" ? `scale(1.06) translateX(${3 * p}%)` : "none";
  const vignette = withAlpha(isDark(bg) ? theme.colors.waterDark : theme.colors.ink, theme.texture.vignetteStrength * (treatment === "plain" ? 0 : 1.4));

  if (!src) return <Placeholder name={name} style={style} />;
  if (treatment === "silhouette") {
    const mask = `url("${src}") no-repeat ${POSITION[align]} / contain`;
    return <div style={{ position: "absolute", inset: 0, backgroundColor: ink, WebkitMask: mask, mask, transform, transformOrigin: "center", ...style }} />;
  }
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: fit,
          objectPosition: POSITION[align],
          transform,
          transformOrigin: "center",
          filter: treatment === "photo" ? "grayscale(0.45) sepia(0.18) contrast(0.96)" : "none",
        }}
      />
      {treatment === "photo" ? <AbsoluteFill style={{ backgroundColor: bg, mixBlendMode: "multiply", opacity: 0.35 }} /> : null}
      {treatment !== "plain" ? (
        <>
          <AbsoluteFill style={{ background: `radial-gradient(ellipse 110% 110% at 50% 50%, transparent 35%, ${vignette} 100%)` }} />
          <Grain opacity={theme.texture.grainOpacity * (treatment === "photo" ? 1.6 : 1)} />
        </>
      ) : null}
      {treatment === "plain" ? null : <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 0 ${theme.stroke.hair}px ${withAlpha(ink, 0.25)}` }} />}
    </div>
  );
};

/** Dashed box naming the asset that is not there yet, so a rough cut can be watched before images are sourced. */
export const Placeholder: React.FC<{ name: string; style?: React.CSSProperties }> = ({ name, style }) => {
  const { theme, scale } = useTheme();
  const muted = useColor("muted");
  const surface = useColor("surface");
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        border: `${theme.stroke.thin * scale}px dashed ${withAlpha(muted, 0.7)}`,
        backgroundColor: withAlpha(surface, 0.5),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <Label align="center" color="muted" weight={700}>
        {name}
      </Label>
    </div>
  );
};

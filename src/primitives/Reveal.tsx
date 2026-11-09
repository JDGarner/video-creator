import React from "react";
import { useCurrentFrame } from "remotion";
import { useSpringAt } from "../motion/springs";
import { fade } from "../motion/timeline";
import { useTheme } from "../theme/ThemeProvider";
import type { SpringName } from "../theme/tokens";

type Props = {
  at: number;
  from?: "below" | "above" | "left" | "right" | "scale" | "fade";
  spring?: SpringName;
  distance?: number;
  exitAt?: number;
  exitFrames?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/**
 * Enter: fade in while springing from a small offset to rest (slight overshoot comes from the spring).
 * Exit: quick ease-in fade with a small push in the same direction. Never springs on exit.
 */
export const Reveal: React.FC<Props> = ({ at, from = "below", spring: springName, distance, exitAt, exitFrames = 10, style, children }) => {
  const frame = useCurrentFrame();
  const { theme, scale } = useTheme();
  const p = useSpringAt(at, springName ?? theme.motion.enter);
  const dist = (distance ?? 28) * scale;
  const opacityIn = fade(frame, at, 8);
  const exiting = exitAt !== undefined && frame >= exitAt;
  const exitP = exiting ? fade(frame, exitAt, exitFrames) : 0;
  const eased = exitP * exitP;
  const opacity = frame < at ? 0 : opacityIn * (1 - eased);
  const off = (1 - p) * dist + eased * dist * 0.5;

  let transform = "none";
  if (from === "below") transform = `translateY(${off}px)`;
  if (from === "above") transform = `translateY(${-off}px)`;
  if (from === "left") transform = `translateX(${-off}px)`;
  if (from === "right") transform = `translateX(${off}px)`;
  if (from === "scale") transform = `scale(${0.96 + 0.04 * p})`;

  return (
    <div style={{ opacity, transform, willChange: "transform, opacity", ...style }}>
      {children}
    </div>
  );
};

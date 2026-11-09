import { interpolate, useVideoConfig } from "remotion";
import type { EasingName, Theme } from "../theme/tokens";
import { EASINGS } from "./easings";

/** Seconds to frames for the current composition. */
export function useSec(): (n: number) => number {
  const { fps } = useVideoConfig();
  return (n: number) => Math.round(n * fps);
}

export function staggerFrames(index: number, baseFrame: number, theme: Theme, fps: number): number {
  return baseFrame + Math.round((index * theme.motion.staggerMs * fps) / 1000);
}

export function holdFrames(theme: Theme, fps: number): number {
  return Math.round((theme.motion.holdBeforeRevealMs * fps) / 1000);
}

/** Eased 0..1 over [start, start + duration], clamped. */
export function progress(frame: number, start: number, duration: number, easing: EasingName = "easeInOutSine"): number {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASINGS[easing],
  });
}

/** Linear fade over a short window, clamped. */
export function fade(frame: number, start: number, duration: number): number {
  return interpolate(frame, [start, start + duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

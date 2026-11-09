import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SpringName } from "../theme/tokens";

export const SPRINGS: Record<SpringName, { damping: number; stiffness: number; mass: number }> = {
  snappy: { damping: 18, stiffness: 180, mass: 0.8 },
  settle: { damping: 22, stiffness: 120, mass: 1 },
  gentle: { damping: 26, stiffness: 80, mass: 1.2 },
  heavy: { damping: 30, stiffness: 60, mass: 1.6 },
};

/** Spring progress 0..1 (with overshoot) that starts at `startFrame`. 0 before it starts. */
export function useSpringAt(startFrame: number, name: SpringName, opts?: { durationInFrames?: number }): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < startFrame) return 0;
  return spring({ frame: frame - startFrame, fps, config: SPRINGS[name], durationInFrames: opts?.durationInFrames });
}

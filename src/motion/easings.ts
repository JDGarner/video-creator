import { Easing } from "remotion";
import type { EasingName } from "../theme/tokens";

export const EASINGS: Record<EasingName, (t: number) => number> = {
  easeInOutSine: Easing.inOut(Easing.sin),
  easeOutCubic: Easing.out(Easing.cubic),
  easeInCubic: Easing.in(Easing.cubic),
};

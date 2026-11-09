import React, { useLayoutEffect, useRef, useState } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { progress } from "../motion/timeline";
import type { EasingName } from "../theme/tokens";

type Props = React.SVGProps<SVGPathElement> & {
  d: string;
  at?: number;
  durationSec?: number;
  easing?: EasingName;
  /** 0..1 override, for paths whose head is driven by something else (a vehicle, a count). */
  progress?: number;
  /** Dotted look: the dash pattern is kept and the draw-on is done with a mask of equal length. */
  dashed?: string;
};

/** Stroke draw-on via dashoffset. Measures its own length on mount. */
export const DrawPath: React.FC<Props> = ({ d, at = 0, durationSec = 1, easing = "easeOutCubic", progress: override, dashed, ...rest }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<SVGPathElement>(null);
  const [length, setLength] = useState<number | null>(null);
  const id = React.useId();

  useLayoutEffect(() => {
    if (ref.current) setLength(ref.current.getTotalLength());
  }, [d]);

  const p = override ?? progress(frame, at, Math.round(durationSec * fps), easing);
  const L = length ?? 0;
  const visible = length !== null && p > 0;

  if (!dashed) {
    return <path ref={ref} d={d} strokeDasharray={L} strokeDashoffset={L * (1 - p)} style={{ opacity: visible ? 1 : 0 }} {...rest} />;
  }
  return (
    <>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse">
          <path d={d} fill="none" stroke="white" strokeWidth={(Number(rest.strokeWidth) || 2) * 3} strokeDasharray={L} strokeDashoffset={L * (1 - p)} />
        </mask>
      </defs>
      <path ref={ref} d={d} strokeDasharray={dashed} mask={`url(#${id})`} style={{ opacity: visible ? 1 : 0 }} {...rest} />
    </>
  );
};

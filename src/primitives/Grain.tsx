import React from "react";
import { useTheme } from "../theme/ThemeProvider";

/** Film-grain overlay driven by theme.texture. Overlay blend keeps average brightness unchanged. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity }) => {
  const { theme } = useTheme();
  const { grainOpacity, grainScale } = theme.texture;
  const id = React.useId();
  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: "absolute", inset: 0, opacity: opacity ?? grainOpacity, mixBlendMode: "overlay", pointerEvents: "none" }}
    >
      <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency={0.75 / grainScale} numOctaves={3} seed={7} stitchTiles="stitch" />
        <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1" />
        <feComponentTransfer>
          <feFuncR type="linear" slope={1.6} intercept={-0.3} />
          <feFuncG type="linear" slope={1.6} intercept={-0.3} />
          <feFuncB type="linear" slope={1.6} intercept={-0.3} />
        </feComponentTransfer>
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
};

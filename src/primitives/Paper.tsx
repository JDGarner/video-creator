import React from "react";
import { AbsoluteFill } from "remotion";
import { useTheme, VariantProvider } from "../theme/ThemeProvider";
import { resolveColor, type Variant } from "../theme/tokens";
import { isDark, withAlpha } from "../lib/color";
import { Grain } from "./Grain";

type Props = {
  variant?: Variant;
  children?: React.ReactNode;
};

/**
 * The surface every scene sits on: paper colour, optional grid, grain, and a soft vignette.
 * Also establishes the variant so text and strokes pick the right ink.
 */
export const Paper: React.FC<Props> = ({ variant = "light", children }) => {
  const { theme } = useTheme();
  const bg = resolveColor(theme, "bg", variant);
  const { vignetteStrength, grid } = theme.texture;
  const gridInk = resolveColor(theme, "ink", variant);
  // A vignette always darkens, so pick the darkening colour by the surface, not the variant name.
  const vignette = withAlpha(isDark(bg) ? theme.colors.waterDark : theme.colors.ink, vignetteStrength);

  return (
    <VariantProvider value={variant}>
      <AbsoluteFill style={{ backgroundColor: bg }}>
        {grid ? (
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: grid.opacity }}>
            <defs>
              <pattern id="paper-grid" width={grid.step} height={grid.step} patternUnits="userSpaceOnUse">
                <path d={`M ${grid.step} 0 L 0 0 0 ${grid.step}`} fill="none" stroke={gridInk} strokeWidth={theme.stroke.hair} />
              </pattern>
              {grid.major ? (
                <pattern id="paper-grid-major" width={grid.step * grid.major} height={grid.step * grid.major} patternUnits="userSpaceOnUse">
                  <path d={`M ${grid.step * grid.major} 0 L 0 0 0 ${grid.step * grid.major}`} fill="none" stroke={gridInk} strokeWidth={theme.stroke.thin} />
                </pattern>
              ) : null}
            </defs>
            <rect width="100%" height="100%" fill="url(#paper-grid)" />
            {grid.major ? <rect width="100%" height="100%" fill="url(#paper-grid-major)" /> : null}
          </svg>
        ) : null}
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 115% 115% at 50% 50%, transparent 30%, ${vignette} 100%)`,
          }}
        />
        <Grain />
        <AbsoluteFill>{children}</AbsoluteFill>
      </AbsoluteFill>
    </VariantProvider>
  );
};

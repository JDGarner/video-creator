import React from "react";
import { AbsoluteFill } from "remotion";
import { Paper } from "../../primitives/Paper";
import { ThemeProvider, VariantProvider } from "../../theme/ThemeProvider";
import { MAP_PALETTES } from "../../theme/themes/explore/mapPalettes";
import { getTheme } from "../../theme/themes";
import { isDark } from "../../lib/color";
import { RegionMap } from "./RegionMap";

export const SPIKE2_THEME = "fieldguide";
export const SPIKE2_NAMES = Object.keys(MAP_PALETTES);

export const MapSpike2Panel: React.FC<{ palette: string; scale?: number }> = ({ palette, scale }) => {
  const p = MAP_PALETTES[palette];
  if (!p) throw new Error(`Unknown map palette "${palette}"`);
  const letter = String.fromCharCode(65 + SPIKE2_NAMES.indexOf(palette));
  return (
    <ThemeProvider theme={getTheme(SPIKE2_THEME)} scale={scale}>
      <Paper variant="light">
        {/* Chrome sits on the sea, so the sea decides whether "ink" is dark or light. */}
        <VariantProvider value={isDark(p.sea) ? "dark" : "light"}>
          <RegionMap palette={p} label={`${letter} · ${p.name}`} />
        </VariantProvider>
      </Paper>
    </ThemeProvider>
  );
};

const CELL = { w: 960, h: 540, gap: 24 };

export const mapSpike2ContactSize = () => {
  const rows = Math.ceil(SPIKE2_NAMES.length / 2);
  return { width: CELL.w * 2 + CELL.gap * 3, height: CELL.h * rows + CELL.gap * (rows + 1) };
};

export const MapSpike2Contact: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "white", padding: CELL.gap }}>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(2, ${CELL.w}px)`, gap: CELL.gap }}>
      {SPIKE2_NAMES.map((name) => (
        <div key={name} style={{ width: CELL.w, height: CELL.h, overflow: "hidden", position: "relative" }}>
          <div style={{ width: 1920, height: 1080, transform: "scale(0.5)", transformOrigin: "top left", position: "absolute" }}>
            <MapSpike2Panel palette={name} scale={1} />
          </div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

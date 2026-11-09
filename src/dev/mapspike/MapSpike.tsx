import React from "react";
import { AbsoluteFill } from "remotion";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { getTheme } from "../../theme/themes";
import { FlatGlobe } from "./FlatGlobe";
import { ReliefGlobe } from "./ReliefGlobe";
import { ThreeGlobe } from "./ThreeGlobe";

export const SPIKE_THEME = "fieldguide";

export const PANELS = {
  flat: FlatGlobe,
  relief: ReliefGlobe,
  three: ThreeGlobe,
} as const;

export type PanelName = keyof typeof PANELS;

export const MapSpikePanel: React.FC<{ panel: PanelName; scale?: number }> = ({ panel, scale }) => {
  const Panel = PANELS[panel];
  return (
    <ThemeProvider theme={getTheme(SPIKE_THEME)} scale={scale}>
      <Panel />
    </ThemeProvider>
  );
};

const CELL = { w: 960, h: 540, gap: 24 };

export const mapSpikeContactSize = () => ({
  width: CELL.w * 2 + CELL.gap * 3,
  height: CELL.h * 2 + CELL.gap * 3,
});

export const MapSpikeContact: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "white", padding: CELL.gap }}>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(2, ${CELL.w}px)`, gap: CELL.gap }}>
      {(Object.keys(PANELS) as PanelName[]).map((name) => (
        <div key={name} style={{ width: CELL.w, height: CELL.h, overflow: "hidden", position: "relative" }}>
          <div style={{ width: 1920, height: 1080, transform: "scale(0.5)", transformOrigin: "top left", position: "absolute" }}>
            <MapSpikePanel panel={name} scale={1} />
          </div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

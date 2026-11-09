import React from "react";
import { AbsoluteFill } from "remotion";
import { ThemeSheet } from "./ThemeSheet";
import type { ThemeName } from "../theme/themes";

export const CONTACT = { cols: 2, cellW: 960, cellH: 540, gap: 24 } as const;

export const contactHeight = (count: number): number => {
  const rows = Math.ceil(count / CONTACT.cols);
  return rows * CONTACT.cellH + (rows + 1) * CONTACT.gap;
};

/** Every exploration direction at half size on one sheet, for side-by-side review. */
export const DirectionsContact: React.FC<{ names: ThemeName[] }> = ({ names }) => (
  <AbsoluteFill style={{ backgroundColor: "white", padding: CONTACT.gap }}>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${CONTACT.cols}, ${CONTACT.cellW}px)`,
        gap: CONTACT.gap,
      }}
    >
      {names.map((name) => (
        <div key={name} style={{ width: CONTACT.cellW, height: CONTACT.cellH, overflow: "hidden", position: "relative" }}>
          <div style={{ width: 1920, height: 1080, transform: "scale(0.5)", transformOrigin: "top left", position: "absolute" }}>
            <ThemeSheet themeName={name} variant="light" scale={1} />
          </div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

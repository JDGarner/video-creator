import React from "react";
import { Display } from "../../primitives/Display";
import { Label } from "../../primitives/Label";
import { useColor, useTheme } from "../../theme/ThemeProvider";

/** Persistent furniture: wordmark top-left, chapter top-right. Will move into Video.tsx later. */
export const Chrome: React.FC<{ chapter: string; title: string; halo?: boolean }> = ({ chapter, title, halo }) => {
  const { theme, scale } = useTheme();
  const bg = useColor("bg");
  const s = (i: number) => theme.space[i]! * scale;
  const shadow = halo ? { textShadow: `0 0 ${8 * scale}px ${bg}, 0 0 ${3 * scale}px ${bg}` } : {};
  return (
    <>
      <div style={{ position: "absolute", left: s(7), top: s(7), display: "flex", alignItems: "center", gap: s(2), ...shadow }}>
        <div style={{ width: s(2), height: s(2), borderRadius: "50%", backgroundColor: useColor("accent") }} />
        <Label color="ink" weight={700}>
          The Makassan Trade Route
        </Label>
      </div>
      <div style={{ position: "absolute", right: s(7), top: s(7), textAlign: "right", ...shadow }}>
        <Label align="right" color="accent" weight={700}>
          {chapter}
        </Label>
        <Display size="h2" italic color="ink" align="right" style={{ marginTop: s(0) }}>
          {title}
        </Display>
      </div>
    </>
  );
};

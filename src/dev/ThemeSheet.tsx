import React from "react";
import { AbsoluteFill } from "remotion";
import { CaptionCard } from "../primitives/CaptionCard";
import { Display } from "../primitives/Display";
import { Label } from "../primitives/Label";
import { Paper } from "../primitives/Paper";
import { ThemeProvider, useTheme } from "../theme/ThemeProvider";
import { getTheme, type ThemeName } from "../theme/themes";
import type { Variant } from "../theme/tokens";

export type ThemeSheetProps = {
  themeName: ThemeName;
  variant: Variant;
  /** Override the 1080p design scale, used when the sheet is embedded in a contact sheet. */
  scale?: number;
};

const Sheet: React.FC<{ variant: Variant }> = ({ variant }) => {
  const { theme, scale } = useTheme();
  const s = (i: number) => theme.space[i]! * scale;
  return (
    <Paper variant={variant}>
      <AbsoluteFill style={{ padding: s(7) }}>
        <Label>Theme · {theme.name} · {variant}</Label>

        <div style={{ position: "absolute", left: s(7), top: 240 * scale }}>
          <Label style={{ marginBottom: s(2) }}>Maximum diversion time</Label>
          <Display size="hero">
            180<span style={{ fontSize: "0.42em", marginLeft: "0.08em" }}>min</span>
          </Display>
          <Display size="h2" italic color="muted" style={{ marginTop: s(3) }}>
            Chapter II · Flying over water
          </Display>
          <Display size="h1" style={{ marginTop: s(5), maxWidth: 820 * scale }}>
            One engine out, <span style={{ color: theme.colors.accent }}>three hours</span> from land
          </Display>
        </div>

        <CaptionCard
          eyebrow="1985 · First ETOPS approval"
          title="Trans World Airlines"
          lines={["Boston → Paris", "Boeing 767-200", "120 minute rule"]}
          style={{ right: s(7), bottom: s(7) }}
        />

        <div style={{ position: "absolute", left: s(7), bottom: s(7) }}>
          <Label size="caption">Tracks illustrative · Source: FAA AC 120-42</Label>
        </div>
      </AbsoluteFill>
    </Paper>
  );
};

export const ThemeSheet: React.FC<ThemeSheetProps> = ({ themeName, variant, scale }) => (
  <ThemeProvider theme={getTheme(themeName)} scale={scale}>
    <Sheet variant={variant} />
  </ThemeProvider>
);

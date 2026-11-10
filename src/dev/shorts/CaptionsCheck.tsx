import React from "react";
import { AbsoluteFill, staticFile, type CalculateMetadataFunction } from "remotion";
import { Captions } from "../../primitives/Captions";
import { Paper } from "../../primitives/Paper";
import { ThemeProvider, useColor } from "../../theme/ThemeProvider";
import { getTheme } from "../../theme/themes";
import type { AlignedWord } from "../../lib/captions";

export type CaptionsCheckProps = { words: AlignedWord[]; highlight: "accent" | "underline" };

export const ALIGNMENT = "audio/shorts/makassan-trade-route/alignment.json";

/** Loads the real alignment so the composition's length and captions come from the narration. */
export const captionsCheckMetadata: CalculateMetadataFunction<CaptionsCheckProps> = async ({ props }) => {
  const data = (await (await fetch(staticFile(ALIGNMENT))).json()) as { words: AlignedWord[] };
  const last = data.words[data.words.length - 1]?.end ?? 0;
  return { props: { ...props, words: data.words }, durationInFrames: Math.ceil((last + 1) * 30) };
};

const Guides: React.FC = () => {
  const ink = useColor("ink");
  // thirds, so caption placement can be judged against the Shorts safe area
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {[1 / 3, 2 / 3].map((f) => (
        <div key={f} style={{ position: "absolute", left: 0, right: 0, top: `${f * 100}%`, borderTop: `1px dashed ${ink}`, opacity: 0.25 }} />
      ))}
    </AbsoluteFill>
  );
};

export const CaptionsCheck: React.FC<CaptionsCheckProps> = ({ words, highlight }) => (
  <ThemeProvider theme={getTheme("fieldguide")} scale={1}>
    <Paper variant="light">
      <Guides />
      <Captions words={words} highlight={highlight} />
    </Paper>
  </ThemeProvider>
);

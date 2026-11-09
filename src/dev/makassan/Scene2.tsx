import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { CaptionCard } from "../../primitives/CaptionCard";
import { Display } from "../../primitives/Display";
import { Label } from "../../primitives/Label";
import { Paper } from "../../primitives/Paper";
import { ThemeProvider, useColor, useTheme } from "../../theme/ThemeProvider";
import { getTheme } from "../../theme/themes";
import { withAlpha } from "../../lib/color";
import { TREPANG_BUMPS, TREPANG_PATH } from "../../viz/map/icons";
import { Chrome } from "./Chrome";

const NODES = [
  { place: "Makassar", detail: "Sulawesi · home port of the fleets" },
  { place: "Northern Australia", detail: "Marege' · harvest and processing" },
  { place: "Chinese markets", detail: "via Makassar's trading networks" },
];

const Scene: React.FC = () => {
  const { width, height } = useVideoConfig();
  const { theme, scale } = useTheme();
  const ink = useColor("ink");
  const accent = useColor("accent");
    const structure = useColor("structure");
  const s = (i: number) => theme.space[i]! * scale;

  const margin = s(7);
  const chainY = height * 0.575;
  const xs = [0.14, 0.5, 0.86].map((f) => margin + f * (width - 2 * margin));
  const r = 11 * scale;

  return (
    <Paper variant="light">
      <AbsoluteFill>
        <Chrome chapter="II" title="The commodity connecting three worlds" />

        <div style={{ position: "absolute", left: margin, top: 190 * scale }}>
          <Label style={{ marginBottom: s(2) }}>The commodity</Label>
          <div style={{ display: "flex", alignItems: "flex-end", gap: s(6) }}>
            <Display size="hero">Trepang</Display>
            <svg width={260 * scale} height={120 * scale} viewBox="-0.55 -0.3 1.1 0.6" style={{ marginBottom: 28 * scale }}>
              <path d={TREPANG_PATH} fill={withAlpha(structure, 0.35)} stroke={ink} strokeWidth={0.018} strokeLinejoin="round" />
              {TREPANG_BUMPS.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={0.022} fill={ink} />
              ))}
              <path d="M-0.5,0 L-0.56,-0.02 M-0.5,0.01 L-0.56,0.03" stroke={ink} strokeWidth={0.014} strokeLinecap="round" />
            </svg>
          </div>
          <Display size="h2" italic color="muted" style={{ marginTop: s(2) }}>
            bêche-de-mer · dried sea cucumber
          </Display>
        </div>

        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          <path
            d={`M${xs[0]! + r + s(2)},${chainY} L${xs[1]! - r - s(2)},${chainY} M${xs[1]! + r + s(2)},${chainY} L${xs[2]! - r - s(2)},${chainY}`}
            fill="none"
            stroke={accent}
            strokeWidth={theme.stroke.regular * scale}
            strokeDasharray={`${2 * scale} ${9 * scale}`}
            strokeLinecap="round"
          />
          {[xs[1]! - r - s(2), xs[2]! - r - s(2)].map((x, i) => (
            <path key={i} d={`M${x - 14 * scale},${chainY - 8 * scale} L${x},${chainY} L${x - 14 * scale},${chainY + 8 * scale}`} fill="none" stroke={accent} strokeWidth={theme.stroke.regular * scale} strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {xs.map((x, i) => (
            <g key={i}>
              <circle cx={x} cy={chainY} r={r} fill={i === 1 ? accent : "none"} stroke={ink} strokeWidth={theme.stroke.thin * scale} />
              {i !== 1 ? <circle cx={x} cy={chainY} r={r * 0.4} fill={ink} /> : null}
            </g>
          ))}
        </svg>
        {NODES.map((n, i) => (
          <div key={n.place} style={{ position: "absolute", left: xs[i], top: chainY + r + s(3), transform: "translateX(-50%)", textAlign: "center", width: 480 * scale }}>
            <Display size="h2" align="center" style={{ lineHeight: 1.05 }}>
              {n.place}
            </Display>
            <Label size="caption" align="center" style={{ marginTop: s(1) }}>
              {n.detail}
            </Label>
          </div>
        ))}
        <div style={{ position: "absolute", left: xs[0], top: chainY - r - s(6), transform: "translateX(-50%)" }}>
          <Label size="caption" align="center" color="muted">
            Fleets sail south
          </Label>
        </div>
        <div style={{ position: "absolute", left: xs[2], top: chainY - r - s(6), transform: "translateX(-50%)" }}>
          <Label size="caption" align="center" color="muted">
            Dried trepang travels north
          </Label>
        </div>

        <div style={{ position: "absolute", left: margin, bottom: s(7) }}>
          <Label size="caption">One product, three names · trepang, bêche-de-mer, sea cucumber</Label>
        </div>
        <CaptionCard
          eyebrow="Why it mattered"
          title="Prized in Chinese cuisine"
          lines={["Dried, it kept for the voyage home", "Demand drew fleets 1,500 km south", "Traded on through Makassar"]}
          width={470}
          style={{ right: s(7), bottom: s(7) }}
        />
      </AbsoluteFill>
    </Paper>
  );
};

export const Scene2: React.FC = () => (
  <ThemeProvider theme={getTheme("fieldguide")}>
    <Scene />
  </ThemeProvider>
);

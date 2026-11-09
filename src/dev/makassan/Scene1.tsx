import React, { useMemo } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { geoGraticule, geoPath } from "d3-geo";
import { CaptionCard } from "../../primitives/CaptionCard";
import { Grain } from "../../primitives/Grain";
import { Label } from "../../primitives/Label";
import { Paper } from "../../primitives/Paper";
import { ThemeProvider, useTheme } from "../../theme/ThemeProvider";
import { fontFamily } from "../../theme/fonts";
import { MAP_PALETTE } from "../../theme/themes/map";
import { getTheme } from "../../theme/themes";
import { withAlpha } from "../../lib/color";
import type { LonLat } from "../../lib/geo";
import { landFeatures } from "../../viz/globe/data";
import { fitMercator } from "../../viz/map/fit";
import { PRAU_PATH } from "../../viz/map/icons";
import { MapBase } from "../../viz/map/MapBase";
import { Chrome } from "./Chrome";

const MAKASSAR: LonLat = [119.42, -5.14];
const ARNHEM: LonLat = [136.2, -12.2];
/** Schematic southbound track: out of Makassar, down the Flores side, across the Arafura Sea. */
const TRACK: LonLat[] = [MAKASSAR, [120.6, -7.6], [123.5, -9.4], [127.5, -10.3], [131.5, -11.2], ARNHEM];
const SHIP_T = 0.56;

const LAND_LABELS: { name: string; coord: LonLat; size: "lg" | "sm" }[] = [
  { name: "Sulawesi", coord: [121.3, -1.8], size: "sm" },
  { name: "Timor", coord: [125.3, -9.05], size: "sm" },
  { name: "Arnhem Land", coord: [134.4, -13.6], size: "sm" },
  { name: "Northern Australia", coord: [131.5, -18.2], size: "lg" },
  { name: "New Guinea", coord: [140.5, -5.0], size: "sm" },
];

const Scene: React.FC = () => {
  const { width, height } = useVideoConfig();
  const { theme, scale } = useTheme();
  const s = (i: number) => theme.space[i]! * scale;

  const geo = useMemo(() => {
    const projection = fitMercator({ west: 108, south: -22.5, east: 150, north: 4.5 }, width, height);
    const path = geoPath(projection);
    const pt = (c: LonLat) => projection(c) ?? [0, 0];
    // point along the polyline at SHIP_T by segment count (schematic, not geodesic)
    const seg = SHIP_T * (TRACK.length - 1);
    const i = Math.floor(seg);
    const t = seg - i;
    const a = pt(TRACK[i]!);
    const b = pt(TRACK[Math.min(i + 1, TRACK.length - 1)]!);
    const ship: [number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const sailed = [...TRACK.slice(0, i + 1).map(pt), ship];
    return {
      projection,
      coast: path(landFeatures("50m")) ?? "",
      graticule: path(geoGraticule().step([5, 5])()) ?? "",
      sailed: `M${sailed.map((p) => p.join(",")).join("L")}`,
      ahead: `M${[ship, ...TRACK.slice(i + 1).map(pt)].map((p) => p.join(",")).join("L")}`,
      ship,
      makassar: pt(MAKASSAR),
      arafura: pt([135.5, -9.6]),
      labels: LAND_LABELS.map((l) => ({ ...l, xy: pt(l.coord) })),
    };
  }, [width, height]);

  const p = MAP_PALETTE;
  const hair = theme.stroke.hair * scale;
  const glowR = 300 * scale;

  return (
    <Paper variant="light">
      <AbsoluteFill style={{ backgroundColor: p.sea }}>
        <MapBase projection={geo.projection} palette={p} width={width} height={height} />
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <radialGradient id="arafura-glow">
              <stop offset="0%" stopColor={p.accent} stopOpacity={0.28} />
              <stop offset="60%" stopColor={p.accent} stopOpacity={0.1} />
              <stop offset="100%" stopColor={p.accent} stopOpacity={0} />
            </radialGradient>
          </defs>
          <path d={geo.graticule} fill="none" stroke={withAlpha(p.graticule, p.graticuleAlpha)} strokeWidth={hair} />
          <ellipse cx={geo.arafura[0]} cy={geo.arafura[1]} rx={glowR * 1.25} ry={glowR * 0.8} fill="url(#arafura-glow)" />
          <path d={geo.coast} fill="none" stroke={withAlpha(p.coast, p.coastAlpha)} strokeWidth={theme.stroke.thin * scale} strokeLinejoin="round" />
          <path d={geo.sailed} fill="none" stroke={p.accent} strokeWidth={theme.stroke.regular * scale} strokeDasharray={`${2 * scale} ${8 * scale}`} strokeLinecap="round" />
          <path d={geo.ahead} fill="none" stroke={withAlpha(p.accent, 0.3)} strokeWidth={theme.stroke.thin * scale} strokeDasharray={`${2 * scale} ${9 * scale}`} strokeLinecap="round" />
          <circle cx={geo.makassar[0]} cy={geo.makassar[1]} r={6 * scale} fill={p.labelOnLand} />
          <circle cx={geo.makassar[0]} cy={geo.makassar[1]} r={2.4 * scale} fill={p.land} />
          <g transform={`translate(${geo.ship[0]} ${geo.ship[1]}) scale(${64 * scale}) scale(-1 1)`}>
            <path d={PRAU_PATH} fill={p.labelOnLand} stroke={p.sea} strokeWidth={0.04} strokeLinejoin="round" />
          </g>
        </svg>
        <Grain opacity={theme.texture.grainOpacity * 0.6} />

        <div
          style={{
            position: "absolute",
            left: geo.arafura[0],
            top: geo.arafura[1] + 40 * scale,
            transform: "translate(-50%, -50%)",
            fontFamily: fontFamily(theme.fonts.italic),
            fontStyle: "italic",
            fontSize: theme.type.h2 * 0.85 * scale,
            letterSpacing: "0.12em",
            color: p.labelOnSea,
            textShadow: `0 0 ${6 * scale}px ${p.sea}`,
            whiteSpace: "nowrap",
          }}
        >
          Arafura Sea
        </div>
        {geo.labels.map((l) => (
          <div
            key={l.name}
            style={{
              position: "absolute",
              left: l.xy[0],
              top: l.xy[1],
              transform: "translate(-50%, -50%)",
              fontFamily: fontFamily(theme.fonts.label),
              fontWeight: 700,
              fontSize: (l.size === "lg" ? theme.type.label * 1.25 : theme.type.caption) * scale,
              letterSpacing: l.size === "lg" ? "0.28em" : "0.2em",
              textTransform: "uppercase",
              color: withAlpha(p.labelOnLand, 0.8),
              whiteSpace: "nowrap",
              textShadow: `0 0 ${5 * scale}px ${p.land}`,
            }}
          >
            {l.name}
          </div>
        ))}
        <div
          style={{
            position: "absolute",
            left: geo.makassar[0] + s(2),
            top: geo.makassar[1],
            transform: "translateY(-50%)",
            fontFamily: fontFamily(theme.fonts.label),
            fontWeight: 700,
            fontSize: theme.type.label * scale,
            letterSpacing: "0.06em",
            color: p.labelOnLand,
            textShadow: `0 0 ${5 * scale}px ${p.land}`,
          }}
        >
          Makassar
        </div>

        <Chrome chapter="I" title="Before Australia was colonised" halo />
        <CaptionCard
          eyebrow="Northern Australia · Arafura Sea"
          title="Centuries before British colonisation"
          lines={["Seasonal fleets from Sulawesi", "Trepang bound for Chinese markets", "Route schematic"]}
          width={600}
          style={{ left: s(7), bottom: s(7) }}
        />
        <div style={{ position: "absolute", right: s(7), bottom: s(7), textShadow: `0 0 ${6 * scale}px ${p.sea}` }}>
          <Label size="caption" color="ink" align="right">
            Natural Earth · hypsometric 50m · modern coastline
          </Label>
        </div>
      </AbsoluteFill>
    </Paper>
  );
};

export const Scene1: React.FC = () => (
  <ThemeProvider theme={getTheme("fieldguide")}>
    <Scene />
  </ThemeProvider>
);

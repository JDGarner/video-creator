import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { geoGraticule, geoPath } from "d3-geo";
import { CaptionCard } from "../../primitives/CaptionCard";
import { DrawPath } from "../../primitives/DrawPath";
import { Grain } from "../../primitives/Grain";
import { Label } from "../../primitives/Label";
import { Paper } from "../../primitives/Paper";
import { Reveal } from "../../primitives/Reveal";
import { ThemeProvider, useTheme } from "../../theme/ThemeProvider";
import { fontFamily } from "../../theme/fonts";
import { MAP_PALETTE } from "../../theme/themes/map";
import { getTheme } from "../../theme/themes";
import { withAlpha } from "../../lib/color";
import type { LonLat } from "../../lib/geo";
import { fade, progress, staggerFrames, useSec } from "../../motion/timeline";
import { landFeatures } from "../../viz/globe/data";
import { cameraForBox, lerpCamera, projectionFor } from "../../viz/map/camera";
import { GlMapBase } from "../../viz/map/GlMapBase";
import { PRAU_PATH } from "../../viz/map/icons";
import { Chrome } from "./Chrome";

const MAKASSAR: LonLat = [119.42, -5.14];
const ARNHEM: LonLat = [135.6, -11.55];
/** Schematic southbound track: out of Makassar, down the Flores side, across the Arafura Sea. */
const TRACK: LonLat[] = [MAKASSAR, [120.6, -7.6], [123.5, -9.4], [127.5, -10.3], [131.5, -11.2], ARNHEM];

const LAND_LABELS: { name: string; coord: LonLat; size: "lg" | "sm" }[] = [
  { name: "Sulawesi", coord: [121.3, -1.8], size: "sm" },
  { name: "Timor", coord: [125.3, -9.05], size: "sm" },
  { name: "Arnhem Land", coord: [134.4, -13.6], size: "sm" },
  { name: "Northern Australia", coord: [131.5, -18.2], size: "lg" },
  { name: "New Guinea", coord: [140.5, -5.0], size: "sm" },
];

/** Timeline in seconds. The still for review is the last frame. */
const T = {
  cameraStart: 0.3,
  cameraDur: 7,
  glow: 3.5,
  labels: 5.5,
  makassar: 5,
  routeStart: 6.5,
  routeDur: 8,
  arafura: 9,
  card: 13.5,
};

export const SCENE1_DURATION_SEC = 20;

const Scene: React.FC = () => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const { theme, scale } = useTheme();
  const sec = useSec();
  const s = (i: number) => theme.space[i]! * scale;
  const p = MAP_PALETTE;

  const camera = useMemo(() => {
    const wide = cameraForBox({ west: 92, south: -42, east: 172, north: 28 }, width, height);
    const tight = cameraForBox({ west: 108, south: -22.5, east: 150, north: 4.5 }, width, height);
    const t = progress(frame, sec(T.cameraStart), sec(T.cameraDur), "easeInOutSine");
    return lerpCamera(wide, tight, t);
  }, [frame, width, height, sec]);

  const geo = useMemo(() => {
    const projection = projectionFor(camera, width, height);
    const path = geoPath(projection);
    const pt = (c: LonLat) => projection(c) ?? [0, 0];
    const pts = TRACK.map(pt);
    // route progress 0..1, polyline distance-parametrised
    const segLens = pts.slice(1).map((b, i) => Math.hypot(b[0] - pts[i]![0], b[1] - pts[i]![1]));
    const total = segLens.reduce((a, b) => a + b, 0);
    const rp = progress(frame, sec(T.routeStart), sec(T.routeDur), "easeInOutSine");
    let remaining = rp * total;
    let ship = pts[0]!;
    for (let i = 0; i < segLens.length; i++) {
      const L = segLens[i]!;
      if (remaining <= L) {
        const t = L === 0 ? 0 : remaining / L;
        ship = [pts[i]![0] + (pts[i + 1]![0] - pts[i]![0]) * t, pts[i]![1] + (pts[i + 1]![1] - pts[i]![1]) * t];
        break;
      }
      remaining -= L;
      ship = pts[i + 1]!;
    }
    return {
      coast: path(landFeatures("50m")) ?? "",
      graticule: path(geoGraticule().step([5, 5])()) ?? "",
      track: `M${pts.map((q) => q.join(",")).join("L")}`,
      routeP: rp,
      ship,
      makassar: pt(MAKASSAR),
      arafura: pt([136.4, -9.3]),
      labels: LAND_LABELS.map((l) => ({ ...l, xy: pt(l.coord) })),
    };
  }, [camera, frame, width, height, sec]);

  const hair = theme.stroke.hair * scale;
  const glowR = 300 * scale * (camera.spanDeg > 60 ? 42 / camera.spanDeg : 1);
  const glowA = fade(frame, sec(T.glow), sec(1.5));
  const shipA = fade(frame, sec(T.routeStart) - 6, 8);
  const labelsA = fade(frame, sec(T.labels), sec(0.6));

  return (
    <Paper variant="light">
      <AbsoluteFill style={{ backgroundColor: p.sea }}>
        <GlMapBase camera={camera} palette={p} width={width} height={height} />
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <radialGradient id="arafura-glow">
              <stop offset="0%" stopColor={p.accent} stopOpacity={0.2} />
              <stop offset="60%" stopColor={p.accent} stopOpacity={0.07} />
              <stop offset="100%" stopColor={p.accent} stopOpacity={0} />
            </radialGradient>
          </defs>
          <path d={geo.graticule} fill="none" stroke={withAlpha(p.graticule, p.graticuleAlpha)} strokeWidth={hair} />
          <ellipse cx={geo.arafura[0]} cy={geo.arafura[1]} rx={glowR * 1.25} ry={glowR * 0.8} fill="url(#arafura-glow)" opacity={glowA} />
          <path d={geo.coast} fill="none" stroke={withAlpha(p.coast, p.coastAlpha)} strokeWidth={theme.stroke.thin * scale} strokeLinejoin="round" />
          <path d={geo.track} fill="none" stroke={withAlpha(p.accent, 0.3 * shipA)} strokeWidth={theme.stroke.thin * scale} strokeDasharray={`${2 * scale} ${9 * scale}`} strokeLinecap="round" />
          <DrawPath
            d={geo.track}
            progress={geo.routeP}
            dashed={`${2 * scale} ${8 * scale}`}
            fill="none"
            stroke={p.accent}
            strokeWidth={theme.stroke.regular * scale}
            strokeLinecap="round"
          />
          <g opacity={fade(frame, sec(T.makassar), 8)}>
            <circle cx={geo.makassar[0]} cy={geo.makassar[1]} r={6 * scale} fill={p.labelOnLand} />
            <circle cx={geo.makassar[0]} cy={geo.makassar[1]} r={2.4 * scale} fill={p.land} />
          </g>
          <g opacity={shipA} transform={`translate(${geo.ship[0]} ${geo.ship[1]}) scale(${64 * scale})`}>
            <path d={PRAU_PATH} fill={p.labelOnLand} stroke={p.sea} strokeWidth={0.04} strokeLinejoin="round" />
          </g>
        </svg>
        <Grain opacity={theme.texture.grainOpacity * 0.6} />

        <Reveal at={sec(T.arafura)} from="fade" style={{ position: "absolute", left: geo.arafura[0], top: geo.arafura[1], transform: "translate(-50%, -50%)" }}>
          <div
            style={{
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
        </Reveal>
        {geo.labels.map((l, i) => (
          <div
            key={l.name}
            style={{
              position: "absolute",
              left: l.xy[0],
              top: l.xy[1],
              transform: "translate(-50%, -50%)",
              opacity: labelsA * fade(frame, staggerFrames(i, sec(T.labels), theme, fps), 10),
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
            opacity: fade(frame, sec(T.makassar), 8),
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

        <Reveal at={sec(0.4)} from="fade">
          <Chrome chapter="I" title="Before Australia was colonised" halo />
        </Reveal>
        <Reveal at={sec(T.card)} from="below" spring="gentle" style={{ position: "absolute", left: s(7), bottom: s(7) }}>
          <CaptionCard
            eyebrow="Northern Australia · Arafura Sea"
            title="Centuries before British colonisation"
            lines={["Seasonal fleets from Sulawesi", "Trepang bound for Chinese markets", "Route schematic"]}
            width={600}
            style={{ position: "relative" }}
          />
        </Reveal>
        <div style={{ position: "absolute", right: s(7), bottom: s(7), textShadow: `0 0 ${6 * scale}px ${p.sea}`, opacity: fade(frame, sec(1), 10) }}>
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

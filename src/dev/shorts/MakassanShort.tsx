import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { geoGraticule, geoPath } from "d3-geo";
import { Display } from "../../primitives/Display";
import { DrawPath } from "../../primitives/DrawPath";
import { Grain } from "../../primitives/Grain";
import { Label } from "../../primitives/Label";
import { Paper } from "../../primitives/Paper";
import { Reveal } from "../../primitives/Reveal";
import { ThemeProvider, useColor, useTheme } from "../../theme/ThemeProvider";
import { fontFamily } from "../../theme/fonts";
import { MAP_PALETTE } from "../../theme/themes/map";
import { getTheme } from "../../theme/themes";
import { withAlpha } from "../../lib/color";
import { greatCircleKm, type LonLat } from "../../lib/geo";
import { fade, progress, staggerFrames, useSec } from "../../motion/timeline";
import { landFeatures } from "../../viz/globe/data";
import { cameraForBox, lerpCamera, projectionFor } from "../../viz/map/camera";
import { GlMapBase } from "../../viz/map/GlMapBase";
import { PRAU_PATH } from "../../viz/map/icons";

export const SHORT = { width: 1080, height: 1920, fps: 30, durationSec: 14 };

const MAKASSAR: LonLat = [119.42, -5.14];
const ARNHEM: LonLat = [135.6, -11.55];
const TRACK: LonLat[] = [MAKASSAR, [120.6, -7.6], [123.5, -9.4], [127.5, -10.3], [131.5, -11.2], ARNHEM];
const ROUTE_KM = TRACK.slice(1).reduce((sum, b, i) => sum + greatCircleKm(TRACK[i]!, b), 0);

const LAND_LABELS: { name: string; coord: LonLat }[] = [
  { name: "Sulawesi", coord: [121.6, -2.2] },
  { name: "Timor", coord: [125.3, -9.05] },
  { name: "Arnhem Land", coord: [134.0, -13.6] },
  { name: "New Guinea", coord: [139.0, -5.4] },
];


const T = { title: 1, titleOut: 4.6, cameraStart: 0.5, cameraDur: 6.5, labels: 6.2, makassar: 6.6, routeStart: 7.4, routeDur: 5.6, arafura: 10 };

const Short: React.FC = () => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const { theme, scale } = useTheme();
  const sec = useSec();
  const s = (i: number) => theme.space[i]! * scale;
  const p = MAP_PALETTE;
  const surface = useColor("surface");
  const ink = useColor("ink");

  const camera = useMemo(() => {
    const wide = cameraForBox({ west: 96, south: -40, east: 160, north: 22 }, width, height);
    const tight = cameraForBox({ west: 113, south: -19.5, east: 143, north: 3 }, width, height);
    return lerpCamera(wide, tight, progress(frame, sec(T.cameraStart), sec(T.cameraDur), "easeInOutSine"));
  }, [frame, width, height, sec]);

  const geo = useMemo(() => {
    const projection = projectionFor(camera, width, height);
    const path = geoPath(projection);
    const pt = (c: LonLat) => projection(c) ?? [0, 0];
    const pts = TRACK.map(pt);
    const segLens = pts.slice(1).map((b, i) => Math.hypot(b[0] - pts[i]![0], b[1] - pts[i]![1]));
    const total = segLens.reduce((a, b) => a + b, 0);
    const rp = progress(frame, sec(T.routeStart), sec(T.routeDur), "easeInOutSine");
    let remaining = rp * total;
    let ship = pts[0]!;
    let heading = 0;
    for (let i = 0; i < segLens.length; i++) {
      const L = segLens[i]!;
      const a = pts[i]!;
      const b = pts[i + 1]!;
      if (remaining <= L) {
        const t = L === 0 ? 0 : remaining / L;
        ship = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        heading = b[0] >= a[0] ? 1 : -1;
        break;
      }
      remaining -= L;
      ship = b;
    }
    return {
      coast: path(landFeatures("50m")) ?? "",
      graticule: path(geoGraticule().step([5, 5])()) ?? "",
      track: `M${pts.map((q) => q.join(",")).join("L")}`,
      routeP: rp,
      ship,
      heading: heading || 1,
      makassar: pt(MAKASSAR),
      arafura: pt([133.6, -8.9]),
      labels: LAND_LABELS.map((l) => ({ ...l, xy: pt(l.coord) })),
    };
  }, [camera, frame, width, height, sec]);

  const hair = theme.stroke.hair * scale;
  const shipA = fade(frame, sec(T.routeStart) - 6, 8);
  const titleA = fade(frame, sec(T.title), 12) * (1 - fade(frame, sec(T.titleOut), 14));
  const km = Math.round((geo.routeP * ROUTE_KM) / 10) * 10;

  return (
    <Paper variant="light">
      <AbsoluteFill style={{ backgroundColor: p.sea }}>
        <GlMapBase camera={camera} palette={p} width={width} height={height} />
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          <path d={geo.graticule} fill="none" stroke={withAlpha(p.graticule, p.graticuleAlpha)} strokeWidth={hair} />
          <path d={geo.coast} fill="none" stroke={withAlpha(p.coast, p.coastAlpha)} strokeWidth={theme.stroke.thin * scale} strokeLinejoin="round" />
          <path d={geo.track} fill="none" stroke={withAlpha(p.accent, 0.3 * shipA)} strokeWidth={theme.stroke.thin * scale} strokeDasharray={`${2 * scale} ${9 * scale}`} strokeLinecap="round" />
          <DrawPath d={geo.track} progress={geo.routeP} dashed={`${2.5 * scale} ${9 * scale}`} fill="none" stroke={p.accent} strokeWidth={theme.stroke.bold * 0.8 * scale} strokeLinecap="round" />
          <g opacity={fade(frame, sec(T.makassar), 8)}>
            <circle cx={geo.makassar[0]} cy={geo.makassar[1]} r={8 * scale} fill={p.labelOnLand} />
            <circle cx={geo.makassar[0]} cy={geo.makassar[1]} r={3.2 * scale} fill={p.land} />
          </g>
          <g opacity={shipA} transform={`translate(${geo.ship[0]} ${geo.ship[1]}) scale(${78 * scale}) scale(${geo.heading} 1)`}>
            <path d={PRAU_PATH} fill={p.labelOnLand} stroke={p.sea} strokeWidth={0.04} strokeLinejoin="round" />
          </g>
        </svg>
        <Grain opacity={theme.texture.grainOpacity * 0.6} />

        {/* distance counter rides above the ship */}
        <div
          style={{
            position: "absolute",
            left: geo.ship[0] - 54 * scale * geo.heading,
            top: geo.ship[1],
            transform: geo.heading > 0 ? "translate(-100%, -50%)" : "translate(0, -50%)",
            opacity: shipA * fade(frame, sec(T.routeStart) + 6, 8),
            padding: `${s(0)}px ${s(2)}px`,
            backgroundColor: withAlpha(surface, 0.92),
            border: `${hair}px solid ${ink}`,
            fontFamily: fontFamily(theme.fonts.label),
            fontWeight: 700,
            fontSize: theme.type.label * 1.15 * scale,
            letterSpacing: "0.08em",
            color: p.labelOnLand,
            whiteSpace: "nowrap",
          }}
        >
          {km.toLocaleString("en-US")} km
        </div>

        {geo.labels.map((l, i) => (
          <div
            key={l.name}
            style={{
              position: "absolute",
              left: l.xy[0],
              top: l.xy[1],
              transform: "translate(-50%, -50%)",
              opacity: fade(frame, staggerFrames(i, sec(T.labels), theme, fps), 10),
              fontFamily: fontFamily(theme.fonts.label),
              fontWeight: 700,
              fontSize: theme.type.label * 0.95 * scale,
              letterSpacing: "0.22em",
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
            left: geo.makassar[0] + s(3),
            top: geo.makassar[1],
            transform: "translateY(-50%)",
            opacity: fade(frame, sec(T.makassar), 8),
            fontFamily: fontFamily(theme.fonts.label),
            fontWeight: 700,
            fontSize: theme.type.label * 1.3 * scale,
            letterSpacing: "0.06em",
            color: p.labelOnLand,
            textShadow: `0 0 ${5 * scale}px ${p.land}`,
          }}
        >
          Makassar
        </div>
        <Reveal at={sec(T.arafura)} from="fade" style={{ position: "absolute", left: geo.arafura[0], top: geo.arafura[1], transform: "translate(-50%, -50%)" }}>
          <div style={{ fontFamily: fontFamily(theme.fonts.italic), fontStyle: "italic", fontSize: theme.type.h2 * 0.9 * scale, letterSpacing: "0.12em", color: p.labelOnSea, textShadow: `0 0 ${6 * scale}px ${p.sea}`, whiteSpace: "nowrap" }}>
            Arafura Sea
          </div>
        </Reveal>

        {/* beat 1 title overlay */}
        <div style={{ position: "absolute", left: 0, right: 0, top: height * 0.3, textAlign: "center", opacity: titleA }}>
          <div style={{ display: "inline-block", padding: `${s(3)}px ${s(5)}px`, backgroundColor: withAlpha(surface, 0.94), border: `${hair}px solid ${ink}` }}>
            <Label align="center" color="accent" weight={700} style={{ marginBottom: s(1) }}>
              Northern Australia
            </Label>
            <Display size="h1" align="center">
              Before 1788
            </Display>
          </div>
        </div>

        {/* wordmark */}
        <div style={{ position: "absolute", left: s(6), top: s(8), display: "flex", alignItems: "center", gap: s(2), opacity: fade(frame, sec(0.3), 10), textShadow: `0 0 ${8 * scale}px ${p.sea}` }}>
          <div style={{ width: s(2), height: s(2), borderRadius: "50%", backgroundColor: p.accent }} />
          <Label color="ink" weight={700}>
            The Makassan Trade Route
          </Label>
        </div>

      </AbsoluteFill>
    </Paper>
  );
};

export const MakassanShort: React.FC = () => (
  <ThemeProvider theme={getTheme("fieldguide")} scale={1}>
    <Short />
  </ThemeProvider>
);

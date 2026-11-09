import React from "react";
import { AbsoluteFill } from "remotion";
import { CaptionCard } from "../../primitives/CaptionCard";
import { Display } from "../../primitives/Display";
import { Label } from "../../primitives/Label";
import { useColor, useTheme } from "../../theme/ThemeProvider";
import { formatCoord, greatCircleKm, type LonLat } from "../../lib/geo";

export const ROUTE = {
  from: { name: "Boston", coord: [-71.06, 42.36] as LonLat },
  to: { name: "Paris", coord: [2.35, 48.86] as LonLat },
};

export const TRAVEL_T = 0.62;

/** Top-left title, bottom-left footnote, bottom-right card. Same on every panel. */
export const SpikeChrome: React.FC<{ title: string; note: string }> = ({ title, note }) => {
  const { theme, scale } = useTheme();
  const s = (i: number) => theme.space[i]! * scale;
  const km = Math.round(greatCircleKm(ROUTE.from.coord, ROUTE.to.coord) / 10) * 10;
  const halo = useColor("bg");
  const haloStyle = { textShadow: `0 0 ${8 * scale}px ${halo}, 0 0 ${3 * scale}px ${halo}, 0 0 ${1.5 * scale}px ${halo}` };
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: s(7), top: s(7), ...haloStyle }}>
        <Label>{title}</Label>
      </div>
      <div style={{ position: "absolute", left: s(7), bottom: s(7), ...haloStyle }}>
        <Label size="caption">{note}</Label>
      </div>
      <CaptionCard
        eyebrow={`${ROUTE.from.name} → ${ROUTE.to.name}`}
        title={`${km.toLocaleString("en-US")} km`}
        lines={["Great circle", "Boeing 767-200", "ETOPS 120"]}
        width={440}
        style={{ right: s(7), bottom: s(7) }}
      />
    </AbsoluteFill>
  );
};

/** A city name and coordinates anchored at a projected screen point. */
export const CityLabel: React.FC<{ name: string; coord: LonLat; x: number; y: number; side: "left" | "right" }> = ({
  name,
  coord,
  x,
  y,
  side,
}) => {
  const { theme, scale } = useTheme();
  const halo = useColor("bg");
  const gap = theme.space[3]! * scale;
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        ...(side === "right" ? { left: x + gap } : { right: `calc(100% - ${x - gap}px)` }),
        transform: "translateY(-50%)",
        textAlign: side,
        textShadow: `0 0 ${6 * scale}px ${halo}, 0 0 ${2 * scale}px ${halo}`,
      }}
    >
      <Display size="h2" align={side}>
        {name}
      </Display>
      <Label size="caption" align={side}>
        {formatCoord(coord)}
      </Label>
    </div>
  );
};

/** Simple top-down airliner silhouette, nose pointing up, centred on origin, ~1 unit wide. */
export const PLANE_PATH =
  "M0,-0.5 L0.06,-0.3 L0.08,0 L0.5,0.18 L0.5,0.26 L0.08,0.16 L0.06,0.36 L0.2,0.46 L0.2,0.5 L0,0.44 L-0.2,0.5 L-0.2,0.46 L-0.06,0.36 L-0.08,0.16 L-0.5,0.26 L-0.5,0.18 L-0.08,0 L-0.06,-0.3 Z";

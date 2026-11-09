import React, { useMemo } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { geoGraticule10, geoPath } from "d3-geo";
import { Paper } from "../../primitives/Paper";
import { useColor, useTheme } from "../../theme/ThemeProvider";
import { withAlpha } from "../../lib/color";
import { bearing, greatCircle } from "../../lib/geo";
import { countryBorders, landFeatures } from "../../viz/globe/data";
import { makeOrtho, rotateToRoute } from "../../viz/globe/projection";
import { CityLabel, PLANE_PATH, ROUTE, SpikeChrome, TRAVEL_T } from "./shared";

/** A: everything is SVG paths from d3-geo. Whole globe in view. */
export const FlatGlobe: React.FC = () => {
  const { width, height } = useVideoConfig();
  const { theme, scale } = useTheme();
  const c = {
    water: useColor("water"),
    land: useColor("land"),
    ink: useColor("ink"),
    muted: useColor("muted"),
    accent: useColor("accent"),
    structure: useColor("structure"),
  };

  const geo = useMemo(() => {
    const projection = makeOrtho({
      width,
      height,
      scale: height * 0.44,
      rotate: rotateToRoute(ROUTE.from.coord, ROUTE.to.coord),
    });
    const path = geoPath(projection);
    const route = greatCircle(ROUTE.from.coord, ROUTE.to.coord, 128);
    const idx = Math.round(TRAVEL_T * (route.length - 1));
    const planeAt = route[idx]!;
    const planeNext = route[Math.min(idx + 1, route.length - 1)]!;
    const [px, py] = projection(planeAt) ?? [0, 0];
    return {
      sphere: path({ type: "Sphere" }) ?? "",
      graticule: path(geoGraticule10()) ?? "",
      land: path(landFeatures("50m")) ?? "",
      borders: path(countryBorders()) ?? "",
      route: path({ type: "LineString", coordinates: route }) ?? "",
      from: projection(ROUTE.from.coord) ?? [0, 0],
      to: projection(ROUTE.to.coord) ?? [0, 0],
      plane: { x: px, y: py, rot: bearing(planeAt, planeNext) },
    };
  }, [width, height]);

  const hair = theme.stroke.hair * scale;
  const thin = theme.stroke.thin * scale;

  return (
    <Paper variant="light">
      <AbsoluteFill>
        <svg width={width} height={height}>
          <path d={geo.sphere} fill={c.water} />
          <path d={geo.graticule} fill="none" stroke={withAlpha(c.ink, 0.18)} strokeWidth={hair} />
          <path d={geo.land} fill={c.land} stroke={withAlpha(c.ink, 0.55)} strokeWidth={hair} strokeLinejoin="round" />
          <path d={geo.borders} fill="none" stroke={withAlpha(c.ink, 0.22)} strokeWidth={hair} />
          <path d={geo.sphere} fill="none" stroke={c.ink} strokeWidth={thin} />
          <path
            d={geo.route}
            fill="none"
            stroke={c.accent}
            strokeWidth={theme.stroke.regular * scale}
            strokeDasharray={`${1.5 * scale} ${7 * scale}`}
            strokeLinecap="round"
          />
          {[geo.from, geo.to].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={9 * scale} fill={c.water} stroke={c.accent} strokeWidth={thin} />
              <circle cx={x} cy={y} r={4 * scale} fill={c.accent} />
            </g>
          ))}
          <g transform={`translate(${geo.plane.x} ${geo.plane.y}) rotate(${geo.plane.rot}) scale(${34 * scale})`}>
            <path d={PLANE_PATH} fill={c.ink} stroke={c.water} strokeWidth={0.06} strokeLinejoin="round" />
          </g>
        </svg>
        <CityLabel name={ROUTE.from.name} coord={ROUTE.from.coord} x={geo.from[0]} y={geo.from[1]} side="left" />
        <CityLabel name={ROUTE.to.name} coord={ROUTE.to.coord} x={geo.to[0]} y={geo.to[1]} side="right" />
        <SpikeChrome title="A · Flat vector · SVG + d3-geo orthographic" note="Natural Earth 50m · tracks illustrative" />
      </AbsoluteFill>
    </Paper>
  );
};

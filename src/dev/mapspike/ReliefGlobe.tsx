import React, { useEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useVideoConfig } from "remotion";
import { geoGraticule10, geoPath } from "d3-geo";
import { Paper } from "../../primitives/Paper";
import { useColor, useTheme } from "../../theme/ThemeProvider";
import { withAlpha } from "../../lib/color";
import { bearing, greatCircle } from "../../lib/geo";
import { countryBorders, landFeatures } from "../../viz/globe/data";
import { fitRouteScale, makeOrtho, rotateToRoute } from "../../viz/globe/projection";
import { CityLabel, PLANE_PATH, ROUTE, SpikeChrome, TRAVEL_T } from "./shared";

const RELIEF = staticFile("textures/relief-50m.jpg");

/**
 * B: canvas base layer with Natural Earth shaded relief reprojected through the
 * orthographic projection and tinted with the theme ink, SVG overlay for lines and type.
 * Zoomed to fit the route so mountains actually show.
 */
export const ReliefGlobe: React.FC = () => {
  const { width, height } = useVideoConfig();
  const { theme, scale } = useTheme();
  const c = {
    water: useColor("water"),
    land: useColor("land"),
    ink: useColor("ink"),
    accent: useColor("accent"),
  };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("relief raster"));

  const geo = useMemo(() => {
    const rotate = rotateToRoute(ROUTE.from.coord, ROUTE.to.coord);
    const projection = makeOrtho({
      width,
      height,
      scale: fitRouteScale(ROUTE.from.coord, ROUTE.to.coord, width, height, 150 * scale),
      rotate,
    });
    const path = geoPath(projection);
    const route = greatCircle(ROUTE.from.coord, ROUTE.to.coord, 128);
    const idx = Math.round(TRAVEL_T * (route.length - 1));
    const planeAt = route[idx]!;
    const planeNext = route[Math.min(idx + 1, route.length - 1)]!;
    const [px, py] = projection(planeAt) ?? [0, 0];
    return {
      projection,
      sphere: path({ type: "Sphere" }) ?? "",
      graticule: path(geoGraticule10()) ?? "",
      land: path(landFeatures("50m")) ?? "",
      borders: path(countryBorders()) ?? "",
      route: path({ type: "LineString", coordinates: route }) ?? "",
      from: projection(ROUTE.from.coord) ?? [0, 0],
      to: projection(ROUTE.to.coord) ?? [0, 0],
      plane: { x: px, y: py, rot: bearing(planeAt, planeNext) },
    };
  }, [width, height, scale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { projection } = geo;

      // Relief as a reprojected, ink-tinted shading layer (alpha grows where the raster is dark).
      const src = document.createElement("canvas");
      src.width = img.naturalWidth;
      src.height = img.naturalHeight;
      const sctx = src.getContext("2d")!;
      sctx.drawImage(img, 0, 0);
      const srcData = sctx.getImageData(0, 0, src.width, src.height).data;

      const shade = ctx.createImageData(width, height);
      const out = shade.data;
      const inkRgb = hexToRgb(c.ink);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const ll = projection.invert?.([x + 0.5, y + 0.5]);
          if (!ll || Number.isNaN(ll[0])) continue;
          // invert() returns values for points off the disc too; reject those by round-tripping.
          const back = projection(ll);
          if (!back || Math.abs(back[0] - x - 0.5) > 1 || Math.abs(back[1] - y - 0.5) > 1) continue;
          const sx = Math.min(src.width - 1, Math.max(0, Math.floor(((ll[0] + 180) / 360) * src.width)));
          const sy = Math.min(src.height - 1, Math.max(0, Math.floor(((90 - ll[1]) / 180) * src.height)));
          const g = srcData[(sy * src.width + sx) * 4]!;
          const dark = Math.max(0, (235 - g) / 235 - 0.1) * 1.5;
          const o = (y * width + x) * 4;
          out[o] = inkRgb[0];
          out[o + 1] = inkRgb[1];
          out[o + 2] = inkRgb[2];
          out[o + 3] = Math.min(255, Math.round(dark * 255));
        }
      }
      const shadeCanvas = document.createElement("canvas");
      shadeCanvas.width = width;
      shadeCanvas.height = height;
      shadeCanvas.getContext("2d")!.putImageData(shade, 0, 0);

      // Clip shading to land, then composite: water disc, land fill, shading multiplied on top.
      const landMask = document.createElement("canvas");
      landMask.width = width;
      landMask.height = height;
      const mctx = landMask.getContext("2d")!;
      const mpath = geoPath(projection, mctx);
      mctx.beginPath();
      mpath(landFeatures("50m"));
      mctx.fillStyle = c.ink; // any opaque colour: this canvas is only a mask
      mctx.fill();
      mctx.globalCompositeOperation = "source-in";
      mctx.drawImage(shadeCanvas, 0, 0);

      const cpath = geoPath(projection, ctx);
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      cpath({ type: "Sphere" });
      ctx.fillStyle = c.water;
      ctx.fill();
      ctx.beginPath();
      cpath(landFeatures("50m"));
      ctx.fillStyle = c.land;
      ctx.fill();
      ctx.globalCompositeOperation = "multiply";
      ctx.drawImage(landMask, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      continueRender(handle);
    };
    img.onerror = () => continueRender(handle);
    img.src = RELIEF;
  }, [geo, width, height, c.ink, c.land, c.water, handle]);

  const hair = theme.stroke.hair * scale;
  const thin = theme.stroke.thin * scale;

  return (
    <Paper variant="light">
      <AbsoluteFill>
        <canvas ref={canvasRef} width={width} height={height} style={{ position: "absolute", inset: 0 }} />
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          <path d={geo.graticule} fill="none" stroke={withAlpha(c.ink, 0.16)} strokeWidth={hair} />
          <path d={geo.land} fill="none" stroke={withAlpha(c.ink, 0.6)} strokeWidth={hair} strokeLinejoin="round" />
          <path d={geo.borders} fill="none" stroke={withAlpha(c.ink, 0.28)} strokeWidth={hair} strokeDasharray={`${3 * scale} ${3 * scale}`} />
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
          <g transform={`translate(${geo.plane.x} ${geo.plane.y}) rotate(${geo.plane.rot}) scale(${38 * scale})`}>
            <path d={PLANE_PATH} fill={c.ink} stroke={c.water} strokeWidth={0.06} strokeLinejoin="round" />
          </g>
        </svg>
        <CityLabel name={ROUTE.from.name} coord={ROUTE.from.coord} x={geo.from[0]} y={geo.from[1]} side="left" />
        <CityLabel name={ROUTE.to.name} coord={ROUTE.to.coord} x={geo.to[0]} y={geo.to[1]} side="right" />
        <SpikeChrome title="B · Canvas relief · tinted Natural Earth shading + SVG overlay" note="Natural Earth 50m + SR_50M relief · tracks illustrative" />
      </AbsoluteFill>
    </Paper>
  );
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useVideoConfig } from "remotion";
import { geoGraticule, geoMercator, geoPath } from "d3-geo";
import { Display } from "../../primitives/Display";
import { Grain } from "../../primitives/Grain";
import { Label } from "../../primitives/Label";
import { CaptionCard } from "../../primitives/CaptionCard";
import { useTheme } from "../../theme/ThemeProvider";
import type { MapPalette } from "../../theme/themes/map";
import { withAlpha } from "../../lib/color";
import type { LonLat } from "../../lib/geo";
import { countryBorders, landFeatures } from "../../viz/globe/data";
import { Equirect, forEachPixel, hexToRgb, loadImage, maskAlpha, mix, shadeAmount } from "../../viz/map/raster";
import { fontFamily } from "../../theme/fonts";

/** Northern Australia, Indonesia, New Guinea. */
const BBOX: [LonLat, LonLat] = [
  [95, -26],
  [155, 8],
];

const CITIES: { name: string; coord: LonLat; side: "left" | "right" }[] = [
  { name: "Darwin", coord: [130.84, -12.46], side: "right" },
  { name: "Jakarta", coord: [106.85, -6.21], side: "right" },
  { name: "Singapore", coord: [103.82, 1.35], side: "left" },
  { name: "Makassar", coord: [119.42, -5.14], side: "right" },
  { name: "Dili", coord: [125.57, -8.56], side: "right" },
  { name: "Port Moresby", coord: [147.18, -9.44], side: "right" },
  { name: "Cairns", coord: [145.77, -16.92], side: "right" },
];

const SEAS: { name: string; coord: LonLat }[] = [
  { name: "Timor Sea", coord: [127.5, -11.2] },
  { name: "Arafura Sea", coord: [137, -9.2] },
  { name: "Banda Sea", coord: [127, -5.3] },
  { name: "Java Sea", coord: [111, -5.2] },
  { name: "Coral Sea", coord: [151.5, -15.5] },
  { name: "Indian Ocean", coord: [101, -16] },
  { name: "Celebes Sea", coord: [122.5, 3.8] },
];

const WALLACE_LINE: LonLat[] = [
  [115.6, -9.6],
  [115.9, -8.2],
  [117.4, -4.6],
  [118.6, -1.6],
  [119.4, 1.4],
  [121.8, 4.3],
  [125.6, 6.2],
];

const RASTERS = {
  relief: staticFile("textures/relief-50m.jpg"),
  ocean: staticFile("textures/ocean-50m.jpg"),
  hypso: staticFile("textures/hypso-50m.jpg"),
};

export const RegionMap: React.FC<{ palette: MapPalette; label: string }> = ({ palette, label }) => {
  const { width, height } = useVideoConfig();
  const { theme, scale } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender(`map rasters ${palette.name}`));

  const geo = useMemo(() => {
    const projection = geoMercator().fitExtent(
      [
        [0, 0],
        [width, height],
      ],
      {
        // d3-geo winds exterior rings clockwise (the opposite of GeoJSON), or it fits the complement.
        type: "Polygon",
        coordinates: [[BBOX[0], [BBOX[0][0], BBOX[1][1]], BBOX[1], [BBOX[1][0], BBOX[0][1]], BBOX[0]]],
      },
    );
    const path = geoPath(projection);
    const project = (c: LonLat) => projection(c) ?? [0, 0];
    return {
      projection,
      land: path(landFeatures("50m")) ?? "",
      borders: path(countryBorders()) ?? "",
      graticule: path(geoGraticule().step([5, 5])()) ?? "",
      wallace: path({ type: "LineString", coordinates: WALLACE_LINE }) ?? "",
      cities: CITIES.map((c) => ({ ...c, xy: project(c.coord) })),
      seas: SEAS.map((s) => ({ ...s, xy: project(s.coord) })),
      wallaceLabel: project([118.9, -1.6]),
    };
  }, [width, height]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const needs = [
        palette.landShade ? loadImage(RASTERS.relief) : null,
        palette.seaShade ? loadImage(RASTERS.ocean) : null,
        palette.hypsometric ? loadImage(RASTERS.hypso) : null,
      ];
      const [reliefImg, oceanImg, hypsoImg] = await Promise.all(needs);
      if (cancelled) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const relief = reliefImg ? new Equirect(reliefImg) : null;
      const ocean = oceanImg ? new Equirect(oceanImg) : null;
      const hypso = hypsoImg ? new Equirect(hypsoImg) : null;

      const landAlpha = maskAlpha(width, height, (m) => {
        const p = geoPath(geo.projection, m);
        m.beginPath();
        p(landFeatures("50m"));
        m.fillStyle = palette.land; // any opaque colour, only alpha is read
        m.fill();
      });

      const sea = hexToRgb(palette.sea);
      const land = hexToRgb(palette.land);
      const seaTint = palette.seaShade ? hexToRgb(palette.seaShade.tint) : sea;
      const landTint = palette.landShade ? hexToRgb(palette.landShade.tint) : land;
      const white: [number, number, number] = [255, 255, 255];

      const out = ctx.createImageData(width, height);
      const px = out.data;
      forEachPixel(geo.projection, width, height, (_x, _y, lon, lat, o) => {
        let seaRgb = sea;
        if (ocean && palette.seaShade) {
          const amt = shadeAmount(ocean.grey(lon, lat), palette.seaShade.lift ?? 0) * palette.seaShade.strength;
          seaRgb = amt >= 0 ? mix(sea, seaTint, amt) : mix(sea, white, -amt);
        }
        let landRgb = land;
        if (hypso) {
          landRgb = mix(hypso.rgb(lon, lat), land, 0.15);
        }
        if (relief && palette.landShade) {
          const amt = shadeAmount(relief.grey(lon, lat)) * palette.landShade.strength;
          landRgb = mix(landRgb, landTint, amt);
        }
        const a = landAlpha[o + 3]! / 255;
        const rgb = mix(seaRgb, landRgb, a);
        px[o] = rgb[0];
        px[o + 1] = rgb[1];
        px[o + 2] = rgb[2];
        px[o + 3] = 255;
      });
      ctx.putImageData(out, 0, 0);
      continueRender(handle);
    })().catch(() => continueRender(handle));
    return () => {
      cancelled = true;
    };
  }, [geo, width, height, palette, handle]);

  const hair = theme.stroke.hair * scale;
  const s = (i: number) => theme.space[i]! * scale;
  const seaFont = fontFamily(theme.fonts.italic);
  const haloOnSea = `0 0 ${6 * scale}px ${palette.sea}, 0 0 ${2 * scale}px ${palette.sea}`;
  const haloOnLand = `0 0 ${6 * scale}px ${palette.land}, 0 0 ${2 * scale}px ${palette.land}`;

  return (
    <AbsoluteFill style={{ backgroundColor: palette.sea }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ position: "absolute", inset: 0 }} />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <path d={geo.graticule} fill="none" stroke={withAlpha(palette.graticule, palette.graticuleAlpha)} strokeWidth={hair} />
        {palette.coastAlpha > 0 ? (
          <path d={geo.land} fill="none" stroke={withAlpha(palette.coast, palette.coastAlpha)} strokeWidth={theme.stroke.thin * scale} strokeLinejoin="round" />
        ) : null}
        <path d={geo.borders} fill="none" stroke={withAlpha(palette.border, 0.7)} strokeWidth={hair} strokeDasharray={`${4 * scale} ${3 * scale}`} />
        <path
          d={geo.wallace}
          fill="none"
          stroke={palette.accent}
          strokeWidth={theme.stroke.regular * scale}
          strokeDasharray={`${2 * scale} ${8 * scale}`}
          strokeLinecap="round"
        />
        {geo.cities.map((c) => (
          <g key={c.name}>
            <circle cx={c.xy[0]} cy={c.xy[1]} r={5.5 * scale} fill={palette.labelOnLand} />
            <circle cx={c.xy[0]} cy={c.xy[1]} r={2.2 * scale} fill={palette.land} />
          </g>
        ))}
      </svg>
      <Grain opacity={theme.texture.grainOpacity * 0.6} />

      {geo.seas.map((sea) => (
        <div
          key={sea.name}
          style={{
            position: "absolute",
            left: sea.xy[0],
            top: sea.xy[1],
            transform: "translate(-50%, -50%)",
            fontFamily: seaFont,
            fontStyle: "italic",
            fontSize: theme.type.h2 * 0.62 * scale,
            letterSpacing: "0.08em",
            color: withAlpha(palette.labelOnSea, 0.85),
            whiteSpace: "nowrap",
            textShadow: haloOnSea,
          }}
        >
          {sea.name}
        </div>
      ))}
      {geo.cities.map((c) => (
        <div
          key={c.name}
          style={{
            position: "absolute",
            top: c.xy[1],
            ...(c.side === "right" ? { left: c.xy[0] + s(2) } : { right: `calc(100% - ${c.xy[0] - s(2)}px)` }),
            transform: "translateY(-50%)",
            fontFamily: fontFamily(theme.fonts.label),
            fontWeight: 600,
            fontSize: theme.type.label * scale,
            letterSpacing: "0.06em",
            color: palette.labelOnLand,
            whiteSpace: "nowrap",
            textShadow: haloOnLand,
          }}
        >
          {c.name}
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          left: geo.wallaceLabel[0] + s(2),
          top: geo.wallaceLabel[1],
          transform: "translateY(-50%) rotate(-70deg)",
          transformOrigin: "left center",
          fontFamily: fontFamily(theme.fonts.label),
          fontWeight: 600,
          fontSize: theme.type.caption * scale,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: palette.accent,
          whiteSpace: "nowrap",
          textShadow: haloOnSea,
        }}
      >
        Wallace Line
      </div>

      <div style={{ position: "absolute", left: s(7), top: s(7), textShadow: haloOnSea }}>
        <Label color="ink">{label}</Label>
      </div>
      <div style={{ position: "absolute", left: s(7), bottom: s(7), textShadow: haloOnSea }}>
        <Label size="caption" color="ink">
          Natural Earth 50m · Mercator · line approximate
        </Label>
      </div>
      <CaptionCard
        eyebrow="Wallacea · 1859"
        title="Two faunas, one strait"
        lines={["Lombok Strait → Celebes Sea", "Asian west · Australian east", "Alfred Russel Wallace"]}
        width={470}
        style={{ right: s(7), bottom: s(7) }}
      />
      <div style={{ position: "absolute", right: s(7), top: s(7), textAlign: "right" }}>
        <Display size="h2" italic color="ink" style={{ lineHeight: 1 }}>
          Chapter III · The line in the sea
        </Display>
      </div>
    </AbsoluteFill>
  );
};

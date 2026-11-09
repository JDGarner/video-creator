import React, { useEffect, useRef, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { geoPath, type GeoProjection } from "d3-geo";
import type { MapPalette } from "../../theme/themes/map";
import { landFeatures } from "../globe/data";
import { Equirect, forEachPixel, hexToRgb, loadImage, maskAlpha, mix, shadeAmount } from "./raster";

const RASTERS = {
  relief: staticFile("textures/relief-50m.jpg"),
  ocean: staticFile("textures/ocean-50m.jpg"),
  hypso: staticFile("textures/hypso-50m.jpg"),
};

type Props = {
  projection: GeoProjection;
  palette: MapPalette;
  width: number;
  height: number;
};

/**
 * Raster base layer: sea with ocean-floor shading, land as hypsometric tints or flat fill,
 * optional relief, all reprojected per pixel through the given projection.
 * Still-quality path; the animated version will cache or move to a shader.
 */
export const MapBase: React.FC<Props> = ({ projection, palette, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender(`map base ${palette.name}`));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [reliefImg, oceanImg, hypsoImg] = await Promise.all([
        palette.landShade ? loadImage(RASTERS.relief) : null,
        palette.seaShade ? loadImage(RASTERS.ocean) : null,
        palette.hypsometric ? loadImage(RASTERS.hypso) : null,
      ]);
      if (cancelled) return;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;

      const relief = reliefImg ? new Equirect(reliefImg) : null;
      const ocean = oceanImg ? new Equirect(oceanImg) : null;
      const hypso = hypsoImg ? new Equirect(hypsoImg) : null;

      const landAlpha = maskAlpha(width, height, (m) => {
        const p = geoPath(projection, m);
        m.beginPath();
        p(landFeatures("50m"));
        m.fillStyle = palette.land; // only the alpha channel is read
        m.fill();
      });

      const sea = hexToRgb(palette.sea);
      const land = hexToRgb(palette.land);
      const seaTint = palette.seaShade ? hexToRgb(palette.seaShade.tint) : sea;
      const landTint = palette.landShade ? hexToRgb(palette.landShade.tint) : land;
      const white: [number, number, number] = [255, 255, 255];

      const out = ctx.createImageData(width, height);
      const px = out.data;
      forEachPixel(projection, width, height, (_x, _y, lon, lat, o) => {
        let seaRgb = sea;
        if (ocean && palette.seaShade) {
          const amt = shadeAmount(ocean.grey(lon, lat), palette.seaShade.lift ?? 0) * palette.seaShade.strength;
          seaRgb = amt >= 0 ? mix(sea, seaTint, amt) : mix(sea, white, -amt);
        }
        let landRgb = land;
        if (hypso) landRgb = mix(hypso.rgb(lon, lat), land, 0.15);
        if (relief && palette.landShade) {
          landRgb = mix(landRgb, landTint, shadeAmount(relief.grey(lon, lat)) * palette.landShade.strength);
        }
        const rgb = mix(seaRgb, landRgb, landAlpha[o + 3]! / 255);
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
  }, [projection, palette, width, height, handle]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ position: "absolute", inset: 0 }} />;
};

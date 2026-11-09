import { geoMercator, type GeoProjection } from "d3-geo";
import type { LonLat } from "../../lib/geo";

export type BBox = { west: number; south: number; east: number; north: number };

/** Mercator fitted to a lon/lat box. d3-geo winds exterior rings clockwise, or it fits the complement. */
export function fitMercator(bbox: BBox, width: number, height: number): GeoProjection {
  const { west, south, east, north } = bbox;
  const ring: LonLat[] = [
    [west, south],
    [west, north],
    [east, north],
    [east, south],
    [west, south],
  ];
  return geoMercator().fitExtent(
    [
      [0, 0],
      [width, height],
    ],
    { type: "Polygon", coordinates: [ring] },
  );
}

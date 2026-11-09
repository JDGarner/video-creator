import { geoDistance, geoOrthographic, type GeoProjection } from "d3-geo";
import { midpoint, type LonLat } from "../../lib/geo";

export type Rotate = [number, number, number];

export function makeOrtho(opts: { width: number; height: number; scale: number; rotate: Rotate }): GeoProjection {
  return geoOrthographic()
    .scale(opts.scale)
    .translate([opts.width / 2, opts.height / 2])
    .rotate(opts.rotate)
    .clipAngle(90)
    .precision(0.3);
}

/** Rotation that centres the great-circle midpoint of a route. */
export function rotateToRoute(from: LonLat, to: LonLat): Rotate {
  const [lon, lat] = midpoint(from, to);
  return [-lon, -lat, 0];
}

/**
 * Scale that places both route endpoints `padding` px inside the smaller frame edge.
 * Endpoints sit at angular distance d/2 from the centre, projecting to scale * sin(d/2).
 */
export function fitRouteScale(from: LonLat, to: LonLat, width: number, height: number, padding: number): number {
  const half = geoDistance(from, to) / 2;
  const r = Math.min(width, height) / 2 - padding;
  return r / Math.sin(half);
}

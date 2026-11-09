import { geoMercator, type GeoProjection } from "d3-geo";
import type { LonLat } from "../../lib/geo";

/** A Mercator camera: what's at the centre and how many degrees of longitude span the frame. */
export type MapCamera = { center: LonLat; spanDeg: number };

const RAD = Math.PI / 180;

export function mercatorScale(spanDeg: number, width: number): number {
  return width / (spanDeg * RAD);
}

export function projectionFor(camera: MapCamera, width: number, height: number): GeoProjection {
  return geoMercator().center(camera.center).scale(mercatorScale(camera.spanDeg, width)).translate([width / 2, height / 2]);
}

/** Interpolate cameras; span in log space so a zoom feels linear. */
export function lerpCamera(a: MapCamera, b: MapCamera, t: number): MapCamera {
  return {
    center: [a.center[0] + (b.center[0] - a.center[0]) * t, a.center[1] + (b.center[1] - a.center[1]) * t],
    spanDeg: Math.exp(Math.log(a.spanDeg) + (Math.log(b.spanDeg) - Math.log(a.spanDeg)) * t),
  };
}

/** Camera that fits a lon/lat box in the frame, matching fitMercator's framing. */
export function cameraForBox(box: { west: number; south: number; east: number; north: number }, width: number, height: number): MapCamera {
  const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2));
  const spanLon = (box.east - box.west) * RAD;
  const spanY = mercY(box.north) - mercY(box.south);
  // the limiting axis decides the scale
  const k = Math.min(width / spanLon, height / spanY);
  const midY = (mercY(box.north) + mercY(box.south)) / 2;
  const centerLat = (2 * Math.atan(Math.exp(midY)) - Math.PI / 2) / RAD;
  return { center: [(box.west + box.east) / 2, centerLat], spanDeg: width / k / RAD };
}

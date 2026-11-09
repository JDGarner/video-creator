import { geoDistance, geoInterpolate } from "d3-geo";

export type LonLat = [number, number];

const DEG = Math.PI / 180;
export const EARTH_RADIUS_KM = 6371;

/** Evenly spaced points along the great circle from a to b, inclusive. */
export function greatCircle(a: LonLat, b: LonLat, steps = 128): LonLat[] {
  const f = geoInterpolate(a, b);
  return Array.from({ length: steps + 1 }, (_, i) => f(i / steps));
}

export function greatCircleKm(a: LonLat, b: LonLat): number {
  return geoDistance(a, b) * EARTH_RADIUS_KM;
}

export function midpoint(a: LonLat, b: LonLat): LonLat {
  return geoInterpolate(a, b)(0.5);
}

/** Initial bearing from a to b in degrees clockwise from north. */
export function bearing(a: LonLat, b: LonLat): number {
  const [l1, p1] = [a[0] * DEG, a[1] * DEG];
  const [l2, p2] = [b[0] * DEG, b[1] * DEG];
  const y = Math.sin(l2 - l1) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(l2 - l1);
  return ((Math.atan2(y, x) / DEG) + 360) % 360;
}

/** Lon/lat to a unit-sphere vector in three.js convention (y up, lon 0 on +x). */
export function toCartesian([lon, lat]: LonLat, radius = 1): [number, number, number] {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

export function formatCoord([lon, lat]: LonLat): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(1)}°${ns} ${Math.abs(lon).toFixed(1)}°${ew}`;
}

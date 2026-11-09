import * as topojson from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";
import countries50 from "world-atlas/countries-50m.json";
import land110 from "world-atlas/land-110m.json";
import land50 from "world-atlas/land-50m.json";

type Detail = "110m" | "50m";

const cache = new Map<string, FeatureCollection<Geometry>>();

function features(key: string, topo: unknown, object: string): FeatureCollection<Geometry> {
  const hit = cache.get(key);
  if (hit) return hit;
  const t = topo as Topology;
  const fc = topojson.feature(t, t.objects[object] as GeometryCollection) as FeatureCollection<Geometry>;
  cache.set(key, fc);
  return fc;
}

export function landFeatures(detail: Detail): FeatureCollection<Geometry> {
  return detail === "50m" ? features("land50", land50, "land") : features("land110", land110, "land");
}

export function countryFeatures(): FeatureCollection<Geometry> {
  return features("countries50", countries50, "countries");
}

/** Country borders as shared mesh lines, so each border is drawn once. */
export function countryBorders() {
  const t = countries50 as unknown as Topology;
  return topojson.mesh(t, t.objects.countries as GeometryCollection, (a, b) => a !== b);
}

import React, { useId, useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { geoArea, geoBounds, geoEqualEarth, geoPath } from "d3-geo";
import type { Feature, Geometry, Position } from "geojson";
import type { z } from "zod";
import { Reveal } from "../primitives/Reveal";
import { useColor, useTheme, useVariant } from "../theme/ThemeProvider";
import { alertColor } from "../theme/tokens";
import { countryFeatures } from "../viz/globe/data";
import { splitAt, type Ring } from "../lib/landmass";
import { progress } from "../motion/timeline";
import { useScene } from "./context";
import { LAYOUT } from "./layout";
import { SceneText } from "./Text";
import type { LandmassScene as Schema } from "./schema";

const { top: TOP, bottom: BOTTOM } = LAYOUT.centre;
const SIDE = 0.08;

function outerRings(geometry: Geometry): Position[][] {
  if (geometry.type === "Polygon") return [geometry.coordinates[0]!];
  if (geometry.type === "MultiPolygon") return geometry.coordinates.map((poly) => poly[0]!);
  return [];
}

/** Drop far-flung islands (Macquarie, Heard) so the fit is to the body people recognise, with a 20% margin for Tasmania. */
function mainBody(feature: Feature<Geometry>): Feature<Geometry> {
  if (feature.geometry.type !== "MultiPolygon") return feature;
  const polys = feature.geometry.coordinates.map((coordinates) => ({ type: "Polygon", coordinates }) as const);
  const biggest = polys.reduce((a, b) => (geoArea(a) >= geoArea(b) ? a : b));
  const [[w, s], [e, n]] = geoBounds(biggest);
  const padX = (e - w) * 0.2;
  const padY = (n - s) * 0.2;
  const near = polys.filter((p) => {
    const [lon, lat] = geoPath().centroid(p);
    return lon! >= w - padX && lon! <= e + padX && lat! >= s - padY && lat! <= n + padY;
  });
  return { ...feature, geometry: { type: "MultiPolygon", coordinates: near.map((p) => p.coordinates) } };
}

/** A country drawn flat in ink; from a cue the alert colour sweeps across a share of its area, leaving a strip along one edge. */
export const LandmassScene: React.FC<{ scene: z.output<typeof Schema> }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const { theme } = useTheme();
  const variant = useVariant();
  const ink = useColor("ink");
  const alert = alertColor(theme, variant);
  const { start, local } = useScene();
  const clipId = useId();

  const box = { x: width * SIDE, y: height * TOP, w: width * (1 - 2 * SIDE), h: height * (BOTTOM - TOP) };

  const drawn = useMemo(() => {
    const found = countryFeatures().features.find((f) => (f.properties as { name?: string } | null)?.name === scene.region) as Feature<Geometry> | undefined;
    if (!found) return null;
    const feature = mainBody(found);
    const lon = geoPath().centroid(feature)[0];
    const projection = geoEqualEarth()
      .rotate([-lon, 0])
      .fitSize([box.w, box.h], feature);
    const d = geoPath(projection)(feature) ?? "";
    const rings: Ring[] = outerRings(feature.geometry).map((ring) => ring.map((p) => projection([p[0]!, p[1]!]) as [number, number]).filter((p) => p !== null));
    const split = scene.loss ? splitAt(rings, scene.loss.keep, 1 - scene.loss.fraction) : null;
    return { d, split };
  }, [scene.region, scene.loss, box.w, box.h]);

  if (!drawn) {
    return <SceneText headline={`No region "${scene.region}"`} top={0.4} />;
  }

  const lossAt = scene.loss ? local(scene.loss.at) : null;
  const lost = lossAt !== null && frame >= lossAt;
  const keep = scene.loss?.keep ?? "east";
  const s = drawn.split ?? 0;
  // the colour advances from the far edge toward the kept strip, stopping at the split line
  const sweep = Math.round((scene.loss?.sweepSec ?? 0) * fps);
  const p = lossAt === null ? 0 : sweep === 0 ? (lost ? 1 : 0) : progress(frame, lossAt, sweep, "easeInOutSine");
  const clip =
    keep === "east"
      ? { x: 0, y: 0, w: s * p, h: box.h }
      : keep === "west"
        ? { x: box.w - (box.w - s) * p, y: 0, w: (box.w - s) * p, h: box.h }
        : keep === "north"
          ? { x: 0, y: box.h - (box.h - s) * p, w: box.w, h: (box.h - s) * p }
          : { x: 0, y: 0, w: box.w, h: s * p };

  return (
    <>
      <Reveal at={start} from="scale" style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h }}>
        <svg width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} style={{ display: "block", overflow: "visible" }}>
          <defs>
            <clipPath id={clipId}>
              <rect x={clip.x} y={clip.y} width={clip.w} height={clip.h} />
            </clipPath>
          </defs>
          <path d={drawn.d} fill={ink} />
          {lost ? <path d={drawn.d} fill={alert} clipPath={`url(#${clipId})`} /> : null}
        </svg>
      </Reveal>
      <SceneText headline={scene.headline} caption={scene.caption} top={LAYOUT.headline} />
    </>
  );
};

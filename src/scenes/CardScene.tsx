import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import type { z } from "zod";
import { Reveal } from "../primitives/Reveal";
import { Still } from "../primitives/Still";
import { Label } from "../primitives/Label";
import { useColor, useTheme } from "../theme/ThemeProvider";
import { withAlpha } from "../lib/color";
import { useAsset, useScene } from "./context";
import { SceneText } from "./Text";
import { LAYOUT, bandHeight } from "./layout";
import type { CardScene as Schema } from "./schema";

const REFERENCE_M = 1.75;

/** A vertical metre scale from the ground line up to the subject's height, ticks every half metre, the height named at the top. */
const Ruler: React.FC<{ left: number; baseline: number; metres: number; pxPerM: number }> = ({ left, baseline, metres, pxPerM }) => {
  const { theme, scale } = useTheme();
  const ink = useColor("ink");
  const s = (i: number) => theme.space[i]! * scale;
  const hair = theme.stroke.hair * scale;
  const top = baseline - metres * pxPerM;
  const ticks: number[] = [];
  for (let m = 0.5; m < metres - 0.001; m += 0.5) ticks.push(m);
  // whole-metre labels this close to the top would collide with the height label
  const labelled = (m: number) => Number.isInteger(m) && metres - m > 0.3;
  return (
    <div style={{ position: "absolute", left, top, width: 0, height: metres * pxPerM }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, borderLeft: `${hair}px solid ${ink}` }} />
      {ticks.map((m) => (
        <div key={m} style={{ position: "absolute", left: 0, top: (metres - m) * pxPerM, width: Number.isInteger(m) ? s(3) : s(1), borderTop: `${hair}px solid ${ink}` }}>
          {labelled(m) ? (
            <div style={{ position: "absolute", left: s(3) + s(1), top: 0, transform: "translateY(-50%)", whiteSpace: "nowrap" }}>
              <Label size="caption">{m} m</Label>
            </div>
          ) : null}
        </div>
      ))}
      <div style={{ position: "absolute", left: -s(4), top: 0, width: s(4) + s(3), borderTop: `${theme.stroke.thin * scale}px solid ${ink}` }} />
      <div style={{ position: "absolute", left: s(3) + s(1), top: 0, transform: "translateY(-50%)", whiteSpace: "nowrap" }}>
        <Label size="caption" color="ink" weight={700}>
          {metres} m
        </Label>
      </div>
    </div>
  );
};

/**
 * A fact card, top to bottom: an optional picture fitted in a plate, the headline and caption, and
 * a scale section where the subject stands on a ground line with a metre ruler at its right and a
 * fixed human reference beyond that, unlabelled.
 */
export const CardScene: React.FC<{ scene: z.output<typeof Schema> }> = ({ scene }) => {
  const { width, height } = useVideoConfig();
  const { theme, scale } = useTheme();
  const { start } = useScene();
  const img = useAsset(scene.image);
  const ref = useAsset(scene.reference ?? "");
  const pic = useAsset(scene.picture ?? "");
  const tone = useColor(scene.tone);
  const ink = useColor("ink");
  const hair = theme.stroke.hair * scale;
  const s = (i: number) => theme.space[i]! * scale;

  const areaTop = height * LAYOUT.card.top;
  const baseline = height * LAYOUT.card.baseline;
  const areaH = baseline - areaTop;
  const refH = height * LAYOUT.card.referenceH;
  const pxPerM = refH / REFERENCE_M;
  const subjectH = scene.height ? Math.min(areaH, scene.height * pxPerM) : areaH;
  // the ruler stands on the centre line; the subject hugs it from the left and the reference from the right,
  // so the two read as a pair whatever their proportions
  const rulerX = width / 2;
  const subjectBox = scene.height ? { left: width * LAYOUT.margin, width: rulerX - s(4) - width * LAYOUT.margin } : { left: width * LAYOUT.margin, width: width * (1 - 2 * LAYOUT.margin) };
  const referenceLeft = rulerX + s(7);
  const plate = bandHeight(height, LAYOUT.card.picture);

  return (
    <>
      <AbsoluteFill style={{ backgroundColor: withAlpha(tone, 0.9) }} />
      {scene.picture ? (
        <Reveal at={start} from="fade" style={{ position: "absolute", left: width * LAYOUT.margin, width: width * (1 - 2 * LAYOUT.margin), top: height * LAYOUT.card.picture.top, height: plate }}>
          <Still src={pic.src} name={pic.name} fit="contain" treatment={scene.pictureTreatment} />
        </Reveal>
      ) : null}
      <SceneText headline={scene.headline} caption={scene.caption} top={LAYOUT.card.text} />
      <div style={{ position: "absolute", left: width * LAYOUT.margin, right: width * LAYOUT.margin, top: baseline, borderTop: `${hair}px solid ${ink}` }} />
      <Reveal at={start} from="below" style={{ position: "absolute", ...subjectBox, top: baseline - subjectH, height: subjectH }}>
        <Still src={img.src} name={img.name} fit="contain" align={scene.height ? "bottom-right" : "bottom"} treatment={scene.treatment} />
      </Reveal>
      {scene.height ? (
        <Reveal at={start + 4} from="fade">
          <Ruler left={rulerX} baseline={baseline} metres={scene.height} pxPerM={pxPerM} />
        </Reveal>
      ) : null}
      {scene.reference ? (
        <div style={{ position: "absolute", left: referenceLeft, width: width * (1 - LAYOUT.margin) - referenceLeft, top: baseline - refH, height: refH }}>
          <Still src={ref.src} name={ref.name} fit="contain" align="bottom-left" treatment="silhouette" />
        </div>
      ) : null}
    </>
  );
};

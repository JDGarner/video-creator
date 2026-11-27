import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { z } from "zod";
import { Reveal } from "../primitives/Reveal";
import { Still } from "../primitives/Still";
import { Label } from "../primitives/Label";
import { Sfx } from "../primitives/Sfx";
import { useImageSize } from "../primitives/imageSize";
import { useColor, useTheme } from "../theme/ThemeProvider";
import { withAlpha } from "../lib/color";
import { landingFrame } from "../motion/springs";
import { progress } from "../motion/timeline";
import { useAsset, useScene } from "./context";
import { SceneText } from "./Text";
import { LAYOUT } from "./layout";
import type { CardScene as Schema } from "./schema";

const REFERENCE_M = 1.75;
/** How long the metre scale takes to draw, in seconds. */
const RULER_SEC = 0.8;
/** Text on the scale is bigger than an ordinary label: it is read against pictures, not a chart. */
const RULER_TEXT = 1.4;
const RULER_HEIGHT_TEXT = 1.7;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

type RulerProps = { x: number; y: number; metres: number; pxPerM: number; at: number; axis: "up" | "along" };

/**
 * A metre scale drawing from (x, y): up from the ground line to the subject's height, with its ticks
 * and labels on the left and the cap reaching right to the subject, or along under the subject's
 * length, with its ticks hanging down. Ticks every half metre pop as the head passes them, and the
 * measure is named when the line reaches the end.
 */
const Ruler: React.FC<RulerProps> = ({ x, y, metres, pxPerM, at, axis }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { theme, scale } = useTheme();
  const ink = useColor("ink");
  const s = (i: number) => theme.space[i]! * scale;
  const hair = theme.stroke.hair * scale;
  const thin = theme.stroke.thin * scale;
  const full = metres * pxPerM;
  const drawn = full * progress(frame, at, Math.round(RULER_SEC * fps), "easeOutCubic");
  const ticks: number[] = [];
  for (let m = 0.5; m < metres - 0.001; m += 0.5) ticks.push(m);
  // whole-metre labels this close to the end would collide with the measure
  const labelled = (m: number) => Number.isInteger(m) && metres - m > 0.3;
  const reached = (d: number) => clamp01((drawn - d) / s(2));
  const capIn = reached(full - s(1));
  const tickLen = (m: number) => (Number.isInteger(m) ? s(3) : s(1)) * reached(m * pxPerM);

  if (axis === "along") {
    return (
      <div style={{ position: "absolute", left: x, top: y, width: full, height: 0 }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: drawn, borderTop: `${hair}px solid ${ink}` }} />
        {ticks.map((m) => (
          <div key={m} style={{ position: "absolute", left: m * pxPerM, top: 0, height: tickLen(m), borderLeft: `${hair}px solid ${ink}`, opacity: reached(m * pxPerM) }}>
            {labelled(m) ? (
              <div style={{ position: "absolute", left: 0, top: s(3) + s(1), transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
                <Label fontScale={RULER_TEXT}>{m} m</Label>
              </div>
            ) : null}
          </div>
        ))}
        <div style={{ position: "absolute", left: full, top: -s(2), height: (s(2) + s(2)) * capIn, borderLeft: `${thin}px solid ${ink}`, opacity: capIn }} />
        <div style={{ position: "absolute", left: full, top: s(3) + s(1), transform: "translateX(-50%)", whiteSpace: "nowrap", opacity: capIn }}>
          <Label fontScale={RULER_HEIGHT_TEXT} color="ink" weight={700}>
            {metres} m
          </Label>
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", left: x, top: y - full, width: 0, height: full }}>
      <div style={{ position: "absolute", left: 0, bottom: 0, height: drawn, borderLeft: `${hair}px solid ${ink}` }} />
      {ticks.map((m) => (
        <div key={m} style={{ position: "absolute", right: 0, top: (metres - m) * pxPerM, width: tickLen(m), borderTop: `${hair}px solid ${ink}`, opacity: reached(m * pxPerM) }}>
          {labelled(m) ? (
            <div style={{ position: "absolute", right: s(3) + s(1), top: 0, transform: "translateY(-50%)", whiteSpace: "nowrap" }}>
              <Label fontScale={RULER_TEXT}>{m} m</Label>
            </div>
          ) : null}
        </div>
      ))}
      <div style={{ position: "absolute", left: -s(3), top: 0, width: (s(3) + s(4)) * capIn, borderTop: `${thin}px solid ${ink}`, opacity: capIn }} />
      <div style={{ position: "absolute", right: s(3) + s(1), top: 0, transform: "translateY(-50%)", whiteSpace: "nowrap", opacity: capIn }}>
        <Label fontScale={RULER_HEIGHT_TEXT} color="ink" weight={700}>
          {metres} m
        </Label>
      </div>
    </div>
  );
};

/**
 * A fact card: the headline and caption up top, and under them a human on the left and the subject
 * on the right, standing on a ground line at true scale. With a `height` the subject is sized by it
 * and a metre ruler draws up between the two; with a `length` it is sized by that and the ruler is the
 * ground line, drawing along under the subject alone. The subject is the picture when there is one, the silhouette otherwise; its box
 * has the picture's own proportions so the measure means something. Without either the subject
 * fills the band.
 */
export const CardScene: React.FC<{ scene: z.output<typeof Schema> }> = ({ scene }) => {
  const { width, height, fps } = useVideoConfig();
  const { theme, scale } = useTheme();
  const { start } = useScene();
  const img = useAsset(scene.image);
  const pic = useAsset(scene.picture ?? "");
  const ref = useAsset(scene.reference ?? "");
  const subject = scene.picture ? pic : img;
  const subjectTreatment = scene.picture ? scene.pictureTreatment : scene.treatment;
  const subjectSize = useImageSize(subject.src);
  const tone = useColor(scene.tone);
  const ink = useColor("ink");
  const hair = theme.stroke.hair * scale;
  const s = (i: number) => theme.space[i]! * scale;

  const measure = scene.length ? ("along" as const) : scene.height ? ("up" as const) : null;
  // a length ruler ends where the subject does, so that row keeps to the ground line; a height row may run wider
  const inner = width * (1 - 2 * (measure === "along" ? LAYOUT.margin : LAYOUT.card.rowMargin));
  const aspect = subjectSize ? subjectSize.width / subjectSize.height : 1;
  const refAspect = 218 / 506;
  // the ruler column between human and subject: a gap after the human, the labels, the ticks, the line, then a gap before the subject
  const rulerColW = s(2) + s(7) + s(1) + s(3) + s(4);
  // a ruler along the ground is the ground line, drawn under the subject only; it hangs its ticks and labels below, so the line moves up to keep them clear of the captions
  const rulerDepth = s(3) + s(1) + theme.type.label * scale * RULER_HEIGHT_TEXT * 1.4;
  const baseline = height * LAYOUT.card.baseline - (measure === "along" ? rulerDepth : 0);
  const bandTop = height * (LAYOUT.card.text + LAYOUT.card.textH);

  let pxPerM = (height * LAYOUT.card.referenceH) / REFERENCE_M;
  const rowFor = (ppm: number) => {
    const subjectW = measure === "along" ? scene.length! * ppm : measure === "up" ? scene.height! * ppm * aspect : 0;
    const subjectH = measure === "along" ? subjectW / aspect : measure === "up" ? scene.height! * ppm : 0;
    const refH = REFERENCE_M * ppm;
    const refW = scene.reference ? refH * refAspect : 0;
    const gapW = measure === "up" ? rulerColW : scene.reference ? s(5) : 0;
    return { subjectH, subjectW, refH, refW, gapW, total: subjectW + gapW + refW };
  };
  // a big or wide subject may not fit at the shared scale; then the whole row shrinks together, human included
  const first = rowFor(pxPerM);
  const fit = measure ? Math.min(1, inner / first.total, (baseline - bandTop) / first.subjectH) : 1;
  pxPerM *= fit;
  const row = rowFor(pxPerM);
  const left = (width - row.total) / 2;
  const landed = start + landingFrame(theme.motion.enter, fps);

  // no measure: nothing to compare, the subject just fills the band above the ground line
  const subjectLeft = left + row.refW + row.gapW;
  const subjectBox = measure ? { left: subjectLeft, width: row.subjectW, top: baseline - row.subjectH, height: row.subjectH } : { left: width * LAYOUT.margin, width: inner, top: bandTop, height: baseline - bandTop };

  return (
    <>
      <AbsoluteFill style={{ backgroundColor: withAlpha(tone, 0.9) }} />
      <SceneText headline={scene.headline} caption={scene.caption} top={LAYOUT.card.text} />
      {measure !== "along" ? <div style={{ position: "absolute", left: width * LAYOUT.margin, right: width * LAYOUT.margin, top: baseline, borderTop: `${hair}px solid ${ink}` }} /> : null}
      <Reveal at={start} from="below" style={{ position: "absolute", ...subjectBox }}>
        <Still src={subject.src} name={subject.name} fit="contain" align="bottom" treatment={subjectTreatment} />
      </Reveal>
      {/* the tap is the subject touching the ground line, so it waits for the spring to land */}
      <Sfx name="woodblock" at={landed} />
      {measure === "up" ? <Ruler axis="up" x={subjectLeft - s(4)} y={baseline} metres={scene.height!} pxPerM={pxPerM} at={landed} /> : null}
      {measure === "along" ? <Ruler axis="along" x={subjectLeft} y={baseline} metres={scene.length!} pxPerM={pxPerM} at={landed} /> : null}
      {scene.reference ? (
        <div style={{ position: "absolute", left, width: row.refW, top: baseline - row.refH, height: row.refH }}>
          <Still src={ref.src} name={ref.name} fit="contain" align="bottom-right" treatment="silhouette" />
        </div>
      ) : null}
    </>
  );
};

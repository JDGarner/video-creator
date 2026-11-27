import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { z } from "zod";
import { Display } from "../primitives/Display";
import { DrawPath } from "../primitives/DrawPath";
import { Label } from "../primitives/Label";
import { Reveal } from "../primitives/Reveal";
import { Sfx } from "../primitives/Sfx";
import { Still } from "../primitives/Still";
import { useColor, useTheme } from "../theme/ThemeProvider";
import { withAlpha } from "../lib/color";
import { fade, progress } from "../motion/timeline";
import { landingFrame, useSpringAt } from "../motion/springs";
import { useAsset, useScene } from "./context";
import { SceneText } from "./Text";
import { bandHeight, LAYOUT } from "./layout";
import type { TimelineScene as Schema } from "./schema";

const fmt = (v: number) => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Frames between one grid picture appearing and the next. */
const PICTURE_STAGGER = 6;
/** How long the axis takes to draw on, in seconds. */
const DRAW_SEC = 1.5;
/** How long a band takes to wipe open, in seconds. */
const WIPE_SEC = 1.35;
/** How long a band takes to rise to full height out of the axis, in seconds; the label waits for this. */
const RISE_SEC = 0.45;
/** How long the panel takes to unfold from the axis line, in seconds. */
const UNFOLD_SEC = 0.9;
/** The question mark lands from this much larger than rest. */
const STAMP_FROM = 1.35;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const Silhouette: React.FC<{ file: string; dim: boolean; dimAt: number }> = ({ file, dim, dimAt }) => {
  const frame = useCurrentFrame();
  const a = useAsset(file);
  const d = dim ? fade(frame, dimAt, 8) : 0;
  return (
    <div style={{ position: "relative", flex: 1, height: "100%", filter: `grayscale(${d})`, opacity: 1 - 0.65 * d }}>
      <Still src={a.src} name={a.name} fit="contain" align="bottom" treatment="silhouette" />
    </div>
  );
};

type GridPicture = { image: string; size: number; dx: number; dy: number };

const Picture: React.FC<{ picture: GridPicture; at: number; frames: number; move: "zoom-in" | "zoom-out"; style: React.CSSProperties }> = ({ picture, at, frames, move, style }) => {
  const a = useAsset(picture.image);
  // the cell stays where the grid put it; the picture grows or shrinks about its centre inside it, then takes its nudge
  const pad = (1 - picture.size) / 2;
  return (
    <Reveal at={at} from="scale" style={{ position: "absolute", ...style }}>
      <div style={{ position: "absolute", left: `${(pad + picture.dx) * 100}%`, top: `${(pad + picture.dy) * 100}%`, width: `${picture.size * 100}%`, height: `${picture.size * 100}%` }}>
        <Still src={a.src} name={a.name} fit="contain" treatment="print" move={move} moveFrames={frames} moveScale={0.03} />
      </div>
    </Reveal>
  );
};

/**
 * A horizontal axis with ticks, shaded bands and labels; the range is data, so it can be anything.
 * The axis draws on and its ticks pop as the head passes; bands rise out of the axis and wipe open
 * from their start once it is complete, each on its own cue or chained into one continuous run; the
 * question mark stamps down. With `pictures`, a grid of
 * them fills the frame first, each drifting slowly, then a surface panel unfolds from the axis line
 * under the grid and the axis draws on it.
 */
export const TimelineScene: React.FC<{ scene: z.output<typeof Schema> }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const { theme, scale } = useTheme();
  const { start, end, local } = useScene();
  const ink = useColor("ink");
  const muted = useColor("muted");
  const accent = useColor("accent");
  const structure = useColor("structure");
  const surface = useColor("surface");
  const s = (i: number) => theme.space[i]! * scale;
  const hair = theme.stroke.hair * scale;
  const k = scene.text === "large" ? 1.6 : 1;
  const grid: GridPicture[] | undefined = scene.pictures?.map((p) => (typeof p === "string" ? { image: p, size: 1, dx: 0, dy: 0 } : p));

  const x0 = width * 0.08;
  const x1 = width * 0.92;
  const [v0, v1] = scene.range;
  const x = (v: number) => x0 + ((v - v0) / (v1 - v0)) * (x1 - x0);
  const labelH = theme.type.label * k * 1.4 * scale;
  const inside = scene.labels === "inside";
  const bandH = inside ? 2 * labelH + s(2) : height * 0.04 * k;
  const captionH = theme.type.caption * k * 1.4 * scale;
  // under the axis: a gap, the tick numbers, then the unit if there is one, then the panel's padding
  const underAxis = (scene.unit ? s(3) + captionH + s(1) + captionH : s(3) + captionH) + s(3);
  // with a grid the panel stands at the foot of the grid band, under the pictures and clear of the captions
  const axisY = grid ? height * LAYOUT.timeline.grid.bottom - underAxis : height * LAYOUT.timeline.axis;
  const ticks: number[] = [];
  const dir = v1 > v0 ? 1 : -1;
  for (let v = v0; dir * v <= dir * v1 + 1e-9; v += dir * scene.tick) ticks.push(v);
  const tone = { accent, structure, muted };
  // the panel waits for every picture to be in and unfolds from the axis line; the axis draws once it is open, and no band opens before the axis is complete
  const panelAt = grid ? start + grid.length * PICTURE_STAGGER + 8 : start;
  const unfoldFrames = grid ? Math.round(UNFOLD_SEC * fps) : 4;
  const unfold = progress(frame, panelAt, unfoldFrames, "easeOutCubic");
  const axisAt = panelAt + unfoldFrames;
  const drawFrames = Math.round(DRAW_SEC * fps);
  const axisDone = axisAt + drawFrames;
  const drawP = progress(frame, axisAt, drawFrames, "easeOutCubic");
  const head = x0 + drawP * (x1 - x0);
  // ticks and their numbers come in as the head passes; the last ones, which the head never clears, follow once the draw is done
  const settled = fade(frame, axisDone, 6);
  const tickIn = (v: number) => (drawP === 0 ? 0 : Math.max(settled, clamp01((head - x(v) + 1) / s(5))));
  const tickLabelIn = (v: number) => (drawP === 0 ? 0 : Math.max(settled, clamp01((head - x(v) - s(3)) / s(5))));
  const labelW = (t: string) => t.length * theme.type.label * k * 0.78 * scale;
  // a band takes the lowest row where neither its box nor its label (when it hangs outside) overlaps an earlier band
  const rows: number[] = [];
  const spans: { row: number; left: number; right: number }[] = [];
  for (const b of scene.bands) {
    const left = Math.min(x(b.from), x(b.to));
    const right = inside ? Math.max(x(b.from), x(b.to)) : Math.max(left + labelW(b.label) + s(2), Math.max(x(b.from), x(b.to)));
    let row = 0;
    while (spans.some((sp) => sp.row === row && sp.left < right && left < sp.right)) row++;
    rows.push(row);
    spans.push({ row, left, right });
  }
  const rowCount = rows.length ? Math.max(...rows) + 1 : 0;
  const unitTop = axisY + s(3) + captionH + s(1);
  const panelTop = axisY - rowCount * (bandH + s(1)) - (inside ? 0 : labelH) - s(3);
  const panelBottom = axisY + underAxis;
  // a chained run opens every band in order at one head speed, so two adjacent bands read as one bar growing
  const bandW = scene.bands.map((b) => Math.abs(x(b.to) - x(b.from)));
  const runW = bandW.reduce((a, b) => a + b, 0);
  const runOffset = bandW.map((_, i) => bandW.slice(0, i).reduce((a, b) => a + b, 0));
  const first = scene.bands[0];
  const runAt = Math.max(first?.at === undefined ? axisDone : local(first.at), axisDone);
  const runFrames = Math.round(WIPE_SEC * fps * scene.bands.length);
  const runHead = progress(frame, runAt, runFrames, "easeOutCubic") * runW;
  const riseFrames = Math.round(RISE_SEC * fps);
  const questionAt = scene.question === undefined ? undefined : local(scene.question);
  const questionIn = questionAt === undefined ? 0 : fade(frame, questionAt, 10);
  const stamp = useSpringAt(questionAt ?? 0, "snappy");

  const gridBox = { left: width * 0.04, width: width * 0.92, top: height * LAYOUT.timeline.grid.top, height: panelTop - s(3) - height * LAYOUT.timeline.grid.top };
  const gridRows = grid ? Math.ceil(grid.length / 2) : 0;
  const cellW = (gridBox.width - s(3)) / 2;
  const cellH = gridRows ? (gridBox.height - s(3) * (gridRows - 1)) / gridRows : 0;

  return (
    <>
      {grid ? (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.75 * questionIn }}>
          {grid.map((p, i) => (
            <Picture key={p.image} picture={p} at={start + i * PICTURE_STAGGER} frames={end} move={i % 2 ? "zoom-out" : "zoom-in"} style={{ left: gridBox.left + (i % 2) * (cellW + s(3)), top: gridBox.top + Math.floor(i / 2) * (cellH + s(3)), width: cellW, height: cellH }} />
          ))}
        </div>
      ) : null}
      {scene.silhouettes ? (
        <div style={{ position: "absolute", left: x0, right: width - x1, top: height * LAYOUT.timeline.silhouettes.top, height: bandHeight(height, LAYOUT.timeline.silhouettes), display: "flex", gap: s(2), alignItems: "flex-end" }}>
          {scene.silhouettes.images.map((f) => (
            <Silhouette key={f} file={f} dim={scene.silhouettes!.dim} dimAt={local(scene.silhouettes!.at, start)} />
          ))}
        </div>
      ) : null}
      {grid ? (
        <div
          style={{
            position: "absolute",
            left: x0 - s(5),
            right: width - x1 - s(5),
            top: axisY - (axisY - panelTop) * unfold,
            height: (panelBottom - panelTop) * unfold,
            backgroundColor: withAlpha(surface, 0.96),
            border: `${hair}px solid ${withAlpha(ink, 0.35)}`,
            opacity: fade(frame, panelAt, 3),
          }}
        />
      ) : null}
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <DrawPath d={`M ${x0} ${axisY} L ${x1} ${axisY}`} progress={drawP} stroke={ink} strokeWidth={theme.stroke.regular * scale} fill="none" />
        {ticks.map((v) => (
          <line key={v} x1={x(v)} x2={x(v)} y1={axisY} y2={axisY + s(2) * tickIn(v)} stroke={ink} strokeWidth={hair} opacity={tickIn(v)} />
        ))}
      </svg>
      {ticks.map((v, i) => (
        // the end labels sit inside the axis ends rather than centred on them, so nothing runs off the panel
        <div key={v} style={{ position: "absolute", left: x(v), top: axisY + s(3), transform: `translateX(${i === 0 ? "0" : i === ticks.length - 1 ? "-100%" : "-50%"})`, opacity: tickLabelIn(v) }}>
          <Label size="caption" color="ink" fontScale={k}>
            {fmt(v)}
          </Label>
        </div>
      ))}
      {scene.unit ? (
        <div style={{ position: "absolute", right: width - x1, top: unitTop, opacity: settled }}>
          <Label size="caption" fontScale={k}>
            {scene.unit}
          </Label>
        </div>
      ) : null}
      {scene.bands.map((b, i) => {
        const xf = x(b.from);
        const xt = x(b.to);
        const w = Math.abs(xt - xf);
        const top = axisY - (rows[i]! + 1) * (bandH + s(1));
        const labelLeft = Math.min(Math.min(xf, xt) + s(1), x1 - labelW(b.label));
        const at = scene.chain ? runAt : b.at === undefined ? axisDone + Math.round(fps * 0.2 * i) : Math.max(local(b.at), axisDone);
        // the band rises to full height from its bottom edge while wiping open from its `from` edge towards `to`, whichever way the axis runs
        const open = scene.chain ? clamp01((runHead - runOffset[i]!) / w) : progress(frame, at, Math.round(WIPE_SEC * fps), "easeOutCubic");
        const rise = progress(frame, at, riseFrames, "easeOutCubic");
        const left = xf <= xt ? xf : xf - w * open;
        // the label follows the band: after it has risen, or in a chain while its stretch is opening
        const labelIn = scene.chain ? clamp01((open - 0.6) / 0.4) : progress(frame, at + riseFrames, 8, "easeOutCubic");
        const rawShift = inside ? 0 : (1 - labelIn) * 16 * scale;
        const labelShift = rawShift < 1 ? 0 : Math.round(rawShift);
        return (
          <React.Fragment key={b.label}>
            <div style={{ position: "absolute", left, top: top + bandH * (1 - rise), width: w * open, height: bandH * rise, backgroundColor: withAlpha(tone[b.tone], b.tone === "muted" ? 0.3 : 0.45), borderLeft: `${hair}px solid ${tone[b.tone]}`, borderRight: `${hair}px solid ${tone[b.tone]}`, opacity: open > 0 ? 1 : 0 }} />
            <div style={{ opacity: labelIn, transform: `translateX(${-labelShift}px)` }}>
              {inside ? (
                <div style={{ position: "absolute", left: Math.min(xf, xt), top, width: w, height: bandH, display: "flex", alignItems: "center", justifyContent: "center", padding: `0 ${s(2)}px`, boxSizing: "border-box" }}>
                  <Label color={b.tone === "accent" ? "accent" : "ink"} weight={700} fontScale={k} align="center">
                    {b.label}
                  </Label>
                </div>
              ) : (
                <div style={{ position: "absolute", left: labelLeft, top: top - labelH, whiteSpace: "nowrap" }}>
                  <Label color={b.tone === "accent" ? "accent" : "ink"} weight={700} fontScale={k}>
                    {b.label}
                  </Label>
                </div>
              )}
            </div>
            {b.note ? (
              <Reveal at={at} from="fade">
                <div style={{ position: "absolute", left: Math.min(xf, xt) + w / 2, top: axisY + s(8), transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
                  <Display size="h2" italic color="muted" style={{ lineHeight: 1 }}>
                    {b.note}
                  </Display>
                </div>
              </Reveal>
            ) : null}
          </React.Fragment>
        );
      })}
      {questionAt !== undefined ? <Sfx name="thump" at={questionAt + landingFrame("snappy", fps)} /> : null}
      {questionAt !== undefined ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: height * (grid ? LAYOUT.timeline.gridQuestion : LAYOUT.timeline.question), textAlign: "center", opacity: fade(frame, questionAt, 4), transform: `scale(${STAMP_FROM - (STAMP_FROM - 1) * stamp})`, transformOrigin: "center" }}>
          <Display size="hero" align="center" color="accent">
            ?
          </Display>
        </div>
      ) : null}
      <SceneText headline={scene.headline} caption={scene.caption} top={LAYOUT.timeline.text} />
    </>
  );
};

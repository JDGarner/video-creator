import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { z } from "zod";
import { Display } from "../primitives/Display";
import { Label } from "../primitives/Label";
import { Reveal } from "../primitives/Reveal";
import { Still } from "../primitives/Still";
import { useColor, useTheme } from "../theme/ThemeProvider";
import { withAlpha } from "../lib/color";
import { fade, staggerFrames } from "../motion/timeline";
import { useAsset, useScene } from "./context";
import { SceneText } from "./Text";
import type { TimelineScene as Schema } from "./schema";

const fmt = (v: number) => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

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

/** A horizontal axis with ticks, shaded bands and labels; the range is data, so it can be anything. */
export const TimelineScene: React.FC<{ scene: z.output<typeof Schema> }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const { theme, scale } = useTheme();
  const { start, local } = useScene();
  const ink = useColor("ink");
  const muted = useColor("muted");
  const accent = useColor("accent");
  const structure = useColor("structure");
  const s = (i: number) => theme.space[i]! * scale;
  const hair = theme.stroke.hair * scale;

  const x0 = width * 0.08;
  const x1 = width * 0.92;
  const [v0, v1] = scene.range;
  const x = (v: number) => x0 + ((v - v0) / (v1 - v0)) * (x1 - x0);
  const axisY = height * 0.5;
  const bandH = height * 0.04;
  const ticks: number[] = [];
  const dir = v1 > v0 ? 1 : -1;
  for (let v = v0; dir * v <= dir * v1 + 1e-9; v += dir * scene.tick) ticks.push(v);
  const tone = { accent, structure, muted };
  const axisIn = fade(frame, start, 10);
  const labelW = (t: string) => t.length * theme.type.label * 0.78 * scale;
  // a band takes the lowest row where neither its box nor its label overlaps an earlier band
  const rows: number[] = [];
  const spans: { row: number; left: number; right: number }[] = [];
  for (const b of scene.bands) {
    const left = Math.min(x(b.from), x(b.to));
    const right = Math.max(left + labelW(b.label) + s(2), Math.max(x(b.from), x(b.to)));
    let row = 0;
    while (spans.some((sp) => sp.row === row && sp.left < right && left < sp.right)) row++;
    rows.push(row);
    spans.push({ row, left, right });
  }

  return (
    <>
      {scene.silhouettes ? (
        <div style={{ position: "absolute", left: x0, right: width - x1, top: height * 0.22, height: height * 0.12, display: "flex", gap: s(2), alignItems: "flex-end" }}>
          {scene.silhouettes.images.map((f) => (
            <Silhouette key={f} file={f} dim={scene.silhouettes!.dim} dimAt={local(scene.silhouettes!.at, start)} />
          ))}
        </div>
      ) : null}
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: axisIn }}>
        <line x1={x0} x2={x1} y1={axisY} y2={axisY} stroke={ink} strokeWidth={theme.stroke.regular * scale} />
        {ticks.map((v) => (
          <line key={v} x1={x(v)} x2={x(v)} y1={axisY} y2={axisY + s(2)} stroke={ink} strokeWidth={hair} />
        ))}
      </svg>
      {ticks.map((v) => (
        <div key={v} style={{ position: "absolute", left: x(v), top: axisY + s(3), transform: "translateX(-50%)", opacity: axisIn }}>
          <Label size="caption" color="ink">
            {fmt(v)}
          </Label>
        </div>
      ))}
      {scene.unit ? (
        <div style={{ position: "absolute", right: width - x1, top: axisY + s(6), opacity: axisIn }}>
          <Label size="caption">{scene.unit}</Label>
        </div>
      ) : null}
      {scene.bands.map((b, i) => {
        const left = Math.min(x(b.from), x(b.to));
        const w = Math.abs(x(b.to) - x(b.from));
        const top = axisY - (rows[i]! + 1) * (bandH + s(1));
        const labelLeft = Math.min(left + s(1), x1 - labelW(b.label));
        return (
          <Reveal key={b.label} at={b.at === undefined ? staggerFrames(i + 1, start, theme, fps) + Math.round(fps * 0.3) : local(b.at)} from="fade">
            <div style={{ position: "absolute", left, top, width: w, height: bandH, backgroundColor: withAlpha(tone[b.tone], b.tone === "muted" ? 0.3 : 0.45), borderLeft: `${hair}px solid ${tone[b.tone]}`, borderRight: `${hair}px solid ${tone[b.tone]}` }} />
            <div style={{ position: "absolute", left: labelLeft, top: top - s(4), whiteSpace: "nowrap" }}>
              <Label color={b.tone === "accent" ? "accent" : "ink"} weight={700}>
                {b.label}
              </Label>
            </div>
            {b.note ? (
              <div style={{ position: "absolute", left: left + w / 2, top: axisY + s(8), transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
                <Display size="h2" italic color="muted" style={{ lineHeight: 1 }}>
                  {b.note}
                </Display>
              </div>
            ) : null}
          </Reveal>
        );
      })}
      {scene.question !== undefined ? (
        <Reveal at={local(scene.question)} from="scale" style={{ position: "absolute", left: 0, right: 0, top: height * 0.56, textAlign: "center" }}>
          <Display size="hero" align="center" color="accent">
            ?
          </Display>
        </Reveal>
      ) : null}
      <div style={{ position: "absolute", left: x0, top: axisY + 2, width: x1 - x0, height: hair, backgroundColor: withAlpha(muted, 0) }} />
      <SceneText headline={scene.headline} caption={scene.caption} top={0.09} />
    </>
  );
};

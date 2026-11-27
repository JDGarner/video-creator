import React from "react";
import { useVideoConfig } from "remotion";
import type { z } from "zod";
import { Label } from "../primitives/Label";
import { Reveal } from "../primitives/Reveal";
import { Sfx } from "../primitives/Sfx";
import { Still } from "../primitives/Still";
import { useColor, useTheme } from "../theme/ThemeProvider";
import { withAlpha } from "../lib/color";
import { useAsset, useScene } from "./context";
import { SceneText } from "./Text";
import { bandHeight, LAYOUT } from "./layout";
import type { PanelsScene as Schema } from "./schema";

const Panel: React.FC<{ panel: z.output<typeof Schema>["panels"][number]; at: number; left: number; width: number; top: number; height: number }> = ({ panel, at, left, width, top, height }) => {
  const { theme, scale } = useTheme();
  const a = useAsset(panel.image);
  const surface = useColor("surface");
  const ink = useColor("ink");
  const s = (i: number) => theme.space[i]! * scale;
  return (
    <Reveal at={at} from="below" style={{ position: "absolute", left, top, width, height }}>
      <div style={{ position: "absolute", inset: 0, border: `${theme.stroke.hair * scale}px solid ${ink}`, overflow: "hidden" }}>
        <Still src={a.src} name={a.name} fit="cover" treatment={panel.treatment} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: s(3), display: "flex", justifyContent: "center" }}>
        <div style={{ padding: `${s(1)}px ${s(2)}px`, backgroundColor: withAlpha(surface, 0.94), border: `${theme.stroke.hair * scale}px solid ${ink}` }}>
          <Label color="ink" weight={700}>
            {panel.label}
          </Label>
        </div>
      </div>
    </Reveal>
  );
};

/** Two to four upright panels side by side, each revealed on its own cue with a page flick; a panel that arrives with the scene leaves the flick to the transition. */
export const PanelsScene: React.FC<{ scene: z.output<typeof Schema> }> = ({ scene }) => {
  const { width, height, fps } = useVideoConfig();
  const { theme, scale } = useTheme();
  const { start, local } = useScene();
  const gap = theme.space[3]! * scale;
  const n = scene.panels.length;
  const x0 = width * 0.04;
  const total = width * 0.92;
  const w = (total - gap * (n - 1)) / n;
  const top = height * LAYOUT.tall.top;
  const h = bandHeight(height, LAYOUT.tall);
  return (
    <>
      {scene.panels.map((p, i) => {
        const at = p.at === undefined ? start + Math.round(i * 0.6 * fps) : local(p.at);
        return (
          <React.Fragment key={p.label}>
            <Panel panel={p} at={at} left={x0 + i * (w + gap)} width={w} top={top} height={h} />
            {at > start ? <Sfx name="flick" at={at} /> : null}
          </React.Fragment>
        );
      })}
      <SceneText headline={scene.headline} caption={scene.caption} top={LAYOUT.headlineTight} />
    </>
  );
};

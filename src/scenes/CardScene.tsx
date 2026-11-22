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
import { LAYOUT } from "./layout";
import type { CardScene as Schema } from "./schema";

const REFERENCE_M = 1.75;

/** A fact card: subject illustration beside a fixed scale reference, headline and caption below. */
export const CardScene: React.FC<{ scene: z.output<typeof Schema> }> = ({ scene }) => {
  const { width, height } = useVideoConfig();
  const { theme, scale } = useTheme();
  const { start } = useScene();
  const img = useAsset(scene.image);
  const ref = useAsset(scene.reference ?? "");
  const tone = useColor(scene.tone);
  const ink = useColor("ink");
  const hair = theme.stroke.hair * scale;

  const areaTop = height * LAYOUT.card.top;
  const baseline = height * LAYOUT.card.baseline;
  const areaH = baseline - areaTop;
  const refH = height * LAYOUT.card.referenceH;
  const subjectH = scene.height ? Math.min(areaH, (scene.height / REFERENCE_M) * refH) : areaH;
  const subjectBox = scene.reference ? { left: width * 0.06, width: width * 0.58 } : { left: width * 0.08, width: width * 0.84 };

  return (
    <>
      <AbsoluteFill style={{ backgroundColor: withAlpha(tone, 0.9) }} />
      <div style={{ position: "absolute", left: width * 0.06, right: width * 0.06, top: baseline, borderTop: `${hair}px solid ${ink}` }} />
      <Reveal at={start} from="below" style={{ position: "absolute", ...subjectBox, top: baseline - subjectH, height: subjectH }}>
        <Still src={img.src} name={img.name} fit="contain" align="bottom" treatment={scene.treatment} />
      </Reveal>
      {scene.reference ? (
        <div style={{ position: "absolute", left: width * 0.7, width: width * 0.24, top: baseline - refH, height: refH }}>
          <Still src={ref.src} name={ref.name} fit="contain" align="bottom" treatment="silhouette" />
          <div style={{ position: "absolute", left: 0, right: 0, top: "100%", marginTop: theme.space[1]! * scale }}>
            <Label size="caption" align="center">
              {REFERENCE_M} m
            </Label>
          </div>
        </div>
      ) : null}
      <SceneText headline={scene.headline} caption={scene.caption} top={LAYOUT.card.text} />
    </>
  );
};

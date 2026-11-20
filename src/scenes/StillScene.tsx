import React from "react";
import { useVideoConfig } from "remotion";
import type { z } from "zod";
import { Reveal } from "../primitives/Reveal";
import { Still } from "../primitives/Still";
import { Display } from "../primitives/Display";
import { Label } from "../primitives/Label";
import { useColor, useTheme } from "../theme/ThemeProvider";
import { useAsset, useScene } from "./context";
import { SceneText } from "./Text";
import type { StillScene as Schema } from "./schema";

export const StillScene: React.FC<{ scene: z.output<typeof Schema> }> = ({ scene }) => {
  const { width, height } = useVideoConfig();
  const { theme, scale } = useTheme();
  const { start, end, local } = useScene();
  const img = useAsset(scene.image);
  const inset = useAsset(scene.inset?.image ?? "");
  const surface = useColor("surface");
  const ink = useColor("ink");
  const s = (i: number) => theme.space[i]! * scale;
  const hair = theme.stroke.hair * scale;

  const box = scene.frame ? { left: width * 0.07, top: height * 0.1, width: width * 0.86, height: height * 0.52 } : { left: 0, top: 0, width, height };
  return (
    <>
      <div style={{ position: "absolute", ...box }}>
        {scene.frame ? <div style={{ position: "absolute", inset: -s(2), border: `${hair}px solid ${ink}`, backgroundColor: surface }} /> : null}
        {scene.frame ? <div style={{ position: "absolute", inset: -s(2) + s(1), border: `${hair}px solid ${ink}` }} /> : null}
        <Still src={img.src} name={img.name} fit={scene.fit} move={scene.move} treatment={scene.treatment} moveFrames={end - start} />
      </div>
      {scene.inset ? (
        <Reveal at={local(scene.inset.at, start + 8)} from="right" style={{ position: "absolute", right: width * 0.06, top: height * 0.1, width: width * 0.3 }}>
          <div style={{ backgroundColor: surface, border: `${hair}px solid ${ink}`, padding: s(1) }}>
            <div style={{ position: "relative", width: "100%", height: width * 0.3 * 0.75 }}>
              <Still src={inset.src} name={inset.name} fit="contain" treatment={/\.svg$/i.test(inset.name) ? "silhouette" : "illustration"} />
            </div>
            {scene.inset.headline ? (
              <Display size="h2" align="center" style={{ marginTop: s(1) }}>
                {scene.inset.headline}
              </Display>
            ) : null}
            {scene.inset.caption ? (
              <Label size="caption" align="center" color="ink">
                {scene.inset.caption}
              </Label>
            ) : null}
          </div>
        </Reveal>
      ) : null}
      <SceneText headline={scene.headline} caption={scene.caption} boxed={!scene.frame} top={scene.frame ? 0.645 : 0.1} />
    </>
  );
};

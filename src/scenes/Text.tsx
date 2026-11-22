import React from "react";
import { useVideoConfig } from "remotion";
import { Display } from "../primitives/Display";
import { Reveal } from "../primitives/Reveal";
import { useColor, useTheme } from "../theme/ThemeProvider";
import { withAlpha } from "../lib/color";
import { useScene } from "./context";
import { LAYOUT } from "./layout";
import type { TextSpec } from "./schema";

const spec = (t: TextSpec | undefined) => (t === undefined ? undefined : typeof t === "string" ? { text: t, at: undefined, until: undefined, align: "center" as const } : t);

type Props = {
  headline?: TextSpec;
  caption?: TextSpec;
  /** Fraction of frame height for the top of the block. */
  top?: number;
  /** Put the text on a surface card so it reads over an image. */
  boxed?: boolean;
  /** Stagger the caption after the headline, in frames. */
  stagger?: number;
};

/**
 * The headline and caption every scene may carry: display serif over italic serif, centred in the
 * upper part of the frame, above the caption band. Each line has its own cue and exit.
 */
export const SceneText: React.FC<Props> = ({ headline, caption, top = LAYOUT.headline, boxed = false, stagger = 6 }) => {
  const { width, height } = useVideoConfig();
  const { theme, scale } = useTheme();
  const { local, start } = useScene();
  const surface = useColor("surface");
  const ink = useColor("ink");
  const h = spec(headline);
  const c = spec(caption);
  if (!h && !c) return null;
  const s = (i: number) => theme.space[i]! * scale;
  const align = h?.align ?? c?.align ?? "center";

  const line = (t: NonNullable<typeof h>, role: "headline" | "caption", delay: number) => (
    <Reveal at={local(t.at, start) + delay} exitAt={t.until === undefined ? undefined : local(t.until)} from="below">
      {role === "headline" ? (
        <Display size="h1" align={align} style={{ maxWidth: width * 0.86 }}>
          {t.text}
        </Display>
      ) : (
        <Display size="h2" italic align={align} color="ink" style={{ maxWidth: width * 0.86, marginTop: h ? s(2) : 0, lineHeight: 1.25 }}>
          {t.text}
        </Display>
      )}
    </Reveal>
  );

  const block = (
    <>
      {h ? line(h, "headline", 0) : null}
      {c ? line(c, "caption", h ? stagger : 0) : null}
    </>
  );
  // the box itself appears with the first line and leaves with the last
  const firstAt = Math.min(...[h, c].filter(Boolean).map((t) => local(t!.at, start)));
  const untils = [h, c].filter((t) => t?.until !== undefined).map((t) => local(t!.until));
  const lastUntil = [h, c].filter(Boolean).every((t) => t!.until !== undefined) ? Math.max(...untils) : undefined;

  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: height * top, display: "flex", justifyContent: align === "left" ? "flex-start" : "center", padding: `0 ${width * LAYOUT.margin}px` }}>
      {boxed ? (
        <Reveal at={firstAt} exitAt={lastUntil} from="fade">
          <div style={{ padding: `${s(3)}px ${s(5)}px`, backgroundColor: withAlpha(surface, 0.94), border: `${theme.stroke.hair * scale}px solid ${ink}`, maxWidth: width * 0.86 }}>{block}</div>
        </Reveal>
      ) : (
        <div style={{ maxWidth: width * 0.86 }}>{block}</div>
      )}
    </div>
  );
};

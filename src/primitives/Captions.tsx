import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useColor, useTheme } from "../theme/ThemeProvider";
import { fontFamily } from "../theme/fonts";
import { withAlpha } from "../lib/color";
import { activeToken, captionPages, pageAt, type AlignedWord } from "../lib/captions";
import { fade } from "../motion/timeline";

type Props = {
  words: AlignedWord[];
  /** Words are grouped into a page until it spans this long. Lower for fewer words per page. */
  combineMs?: number;
  /** How long a page lingers after its last word when the next page has not started. */
  holdMs?: number;
  /** Vertical centre of the caption as a fraction of frame height. */
  top?: number;
  /** Widest a page may be, as a fraction of frame width. */
  maxWidth?: number;
  size?: "h1" | "h2";
  /** Multiplier on the type size; captions on a phone want to be larger than a caption card title. */
  fontScale?: number;
  /** accent: spoken word in the accent colour. underline: spoken word in ink with an accent rule under it. */
  highlight?: "accent" | "underline";
};

/** Shorts-style captions: one to three words at a time, timed to the frame from an alignment. */
export const Captions: React.FC<Props> = ({ words, combineMs = 800, holdMs = 400, top = 0.72, maxWidth = 0.86, size = "h2", fontScale = 1.3, highlight = "accent" }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { theme, scale } = useTheme();
  const surface = useColor("surface");
  const ink = useColor("ink");
  const accent = useColor("accent");

  const pages = useMemo(() => captionPages(words, combineMs), [words, combineMs]);
  const tMs = (frame / fps) * 1000;
  const hit = pageAt(pages, tMs, holdMs);
  if (!hit) return null;

  const { page } = hit;
  const active = activeToken(page, tMs);
  const opacity = fade(frame, Math.round((page.startMs / 1000) * fps), 2);
  const hair = theme.stroke.hair * scale;
  const rule = `${hair}px solid ${ink}`;
  const spec = theme.fonts.display;

  const box: React.CSSProperties = {
    display: "inline-block",
    maxWidth: width * maxWidth,
    boxSizing: "border-box",
    padding: `${theme.space[2]! * scale}px ${theme.space[5]! * scale}px`,
    backgroundColor: withAlpha(surface, 0.94),
  };
  if (theme.card.border === "rules") {
    box.borderTop = rule;
    box.borderBottom = rule;
  } else if (theme.card.border === "single" || theme.card.border === "double") {
    box.border = rule;
  }

  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: height * top, transform: "translateY(-50%)", textAlign: "center", opacity }}>
      <div style={box}>
        <div
          style={{
            fontFamily: fontFamily(spec),
            fontWeight: spec.weights[spec.weights.length - 1],
            fontSize: theme.type[size] * fontScale * scale,
            lineHeight: 1.15,
            letterSpacing: "-0.005em",
            color: ink,
            fontVariantNumeric: "lining-nums",
          }}
        >
          {page.tokens.map((tok, i) => {
            const isActive = i === active;
            const style: React.CSSProperties =
              highlight === "accent"
                ? { color: isActive ? accent : ink }
                : { color: ink, boxShadow: isActive ? `inset 0 ${-theme.stroke.bold * scale}px 0 ${accent}` : "none" };
            // eslint-disable-next-line react/no-array-index-key
            return (
              <span key={i} style={style}>
                {tok.text}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

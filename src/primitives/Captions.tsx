import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useColor, useTheme, useVariant } from "../theme/ThemeProvider";
import { highlightColors } from "../theme/tokens";
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
  /** accent: spoken word in the accent colour. underline: spoken word in ink with an accent rule under it. block: spoken word in ink on a filled accent block. */
  highlight?: "accent" | "underline" | "block";
  /** surface: the page sits on a surface card with the theme's card border. none: straight on the paper. */
  box?: "surface" | "none";
};

/** Shorts-style captions: one to three words at a time, timed to the frame from an alignment. */
export const Captions: React.FC<Props> = ({ words, combineMs = 800, holdMs = 400, top = 0.72, maxWidth = 0.86, size = "h2", fontScale = 1.3, highlight = "block", box = "none" }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { theme, scale } = useTheme();
  const surface = useColor("surface");
  const ink = useColor("ink");
  const accent = useColor("accent");
  const [blockFill, blockInk] = highlightColors(theme, useVariant());

  const pages = useMemo(() => captionPages(words, combineMs), [words, combineMs]);
  const tMs = (frame / fps) * 1000;
  const hit = pageAt(pages, tMs, holdMs);
  if (!hit) return null;

  const { page } = hit;
  const active = activeToken(page, tMs);
  const opacity = fade(frame, Math.round((page.startMs / 1000) * fps), 2);
  const hair = theme.stroke.hair * scale;
  const rule = `${hair}px solid ${ink}`;
  const spec = theme.fonts.caption ?? theme.fonts.display;

  const card: React.CSSProperties = {
    display: "inline-block",
    maxWidth: width * maxWidth,
    boxSizing: "border-box",
    padding: `${theme.space[2]! * scale}px ${theme.space[5]! * scale}px`,
  };
  if (box === "surface") {
    card.backgroundColor = withAlpha(surface, 0.94);
    if (theme.card.border === "rules") {
      card.borderTop = rule;
      card.borderBottom = rule;
    } else if (theme.card.border === "single" || theme.card.border === "double") {
      card.border = rule;
    }
  }
  // every token gets the same padding so the line does not shift as the block moves between words
  const block = highlight === "block";
  const token: React.CSSProperties = block ? { display: "inline-block", padding: "0.02em 0.16em", margin: "0 0.02em", borderRadius: "0.14em" } : {};

  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: height * top, transform: "translateY(-50%)", textAlign: "center", opacity }}>
      <div style={card}>
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
                : highlight === "underline"
                  ? { color: ink, boxShadow: isActive ? `inset 0 ${-theme.stroke.bold * scale}px 0 ${accent}` : "none" }
                  : { ...token, color: isActive ? blockInk : ink, backgroundColor: isActive ? blockFill : "transparent" };
            // eslint-disable-next-line react/no-array-index-key
            return (
              <span key={i} style={style}>
                {block ? tok.text.trim() : tok.text}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

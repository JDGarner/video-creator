import React from "react";
import { useColor, useTheme, useVariant, VariantProvider } from "../theme/ThemeProvider";
import { Display } from "./Display";
import { Label } from "./Label";

type Props = {
  eyebrow?: string;
  title: string;
  lines?: string[];
  width?: number;
  style?: Pick<React.CSSProperties, "position" | "left" | "right" | "top" | "bottom">;
};

/** Boxed caption. Rule style and fill come from theme.card; see tokens.ts for the variants. */
export const CaptionCard: React.FC<Props> = ({ eyebrow, title, lines = [], width = 520, style }) => {
  const { theme, scale } = useTheme();
  const variant = useVariant();
  const surface = useColor("surface");
  const ink = useColor("ink");
  const accent = useColor("accent");
  const { border, fill, radius, padding } = theme.card;
  const hair = theme.stroke.hair * scale;
  const inset = theme.space[1]! * scale;
  const tick = theme.space[3]! * scale;

  const background = fill === "surface" ? surface : fill === "ink" ? ink : "transparent";
  const innerVariant = fill === "ink" ? (variant === "light" ? "dark" : "light") : variant;

  const outer: React.CSSProperties = {
    position: "absolute",
    width: width * scale,
    backgroundColor: background,
    borderRadius: radius * scale,
    boxSizing: "border-box",
    ...style,
  };
  if (border === "single" || border === "double") outer.border = `${hair}px solid ${ink}`;
  if (border === "rules") {
    outer.borderTop = `${hair}px solid ${ink}`;
    outer.borderBottom = `${hair}px solid ${ink}`;
  }
  if (border === "left") outer.borderLeft = `${theme.stroke.bold * scale}px solid ${accent}`;

  const cornerTick = (pos: { top?: number; bottom?: number; left?: number; right?: number }) => (
    <div
      style={{
        position: "absolute",
        width: tick,
        height: tick,
        ...pos,
        borderTop: pos.top !== undefined ? `${hair}px solid ${ink}` : undefined,
        borderBottom: pos.bottom !== undefined ? `${hair}px solid ${ink}` : undefined,
        borderLeft: pos.left !== undefined ? `${hair}px solid ${ink}` : undefined,
        borderRight: pos.right !== undefined ? `${hair}px solid ${ink}` : undefined,
      }}
    />
  );

  return (
    <div style={outer}>
      {border === "ticks" ? (
        <>
          {cornerTick({ top: 0, left: 0 })}
          {cornerTick({ top: 0, right: 0 })}
          {cornerTick({ bottom: 0, left: 0 })}
          {cornerTick({ bottom: 0, right: 0 })}
        </>
      ) : null}
      <div
        style={{
          margin: border === "double" ? inset : 0,
          border: border === "double" ? `${hair}px solid ${ink}` : "none",
          borderRadius: Math.max(0, radius - 1) * scale,
          padding: padding * scale,
        }}
      >
        <VariantProvider value={innerVariant}>
          {eyebrow ? <Label style={{ marginBottom: theme.space[2]! * scale }}>{eyebrow}</Label> : null}
          <Display size="h2">{title}</Display>
          {lines.length > 0 ? (
            <div
              style={{
                marginTop: theme.space[3]! * scale,
                display: "flex",
                flexDirection: "column",
                gap: theme.space[0]! * scale,
              }}
            >
              {lines.map((line) => (
                <Label key={line} size="caption" color="ink">
                  {line}
                </Label>
              ))}
            </div>
          ) : null}
        </VariantProvider>
      </div>
    </div>
  );
};

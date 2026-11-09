import React from "react";
import { useColor, useTheme } from "../theme/ThemeProvider";
import { fontFamily } from "../theme/fonts";
import type { ColorKey } from "../theme/tokens";

type Props = {
  children: React.ReactNode;
  size?: "label" | "caption";
  color?: ColorKey;
  weight?: number;
  align?: "left" | "center" | "right";
  style?: Pick<React.CSSProperties, "marginTop" | "marginBottom" | "maxWidth">;
};

/** Monospace, letter-spaced caps for labels, axes, and metadata. */
export const Label: React.FC<Props> = ({
  children,
  size = "label",
  color = "muted",
  weight,
  align = "left",
  style,
}) => {
  const { theme, scale } = useTheme();
  const fill = useColor(color);
  const spec = theme.fonts.label;
  return (
    <div
      style={{
        fontFamily: fontFamily(spec),
        fontWeight: weight ?? spec.weights[0],
        fontSize: theme.type[size] * scale,
        lineHeight: 1.4,
        letterSpacing: theme.type.labelTracking,
        textTransform: theme.type.labelCase === "upper" ? "uppercase" : "none",
        fontVariant: theme.type.labelCase === "smallcaps" ? "small-caps" : "normal",
        color: fill,
        textAlign: align,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

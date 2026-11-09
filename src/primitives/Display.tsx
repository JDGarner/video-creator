import React from "react";
import { useColor, useTheme } from "../theme/ThemeProvider";
import { fontFamily } from "../theme/fonts";
import type { ColorKey } from "../theme/tokens";

type Props = {
  children: React.ReactNode;
  size?: "hero" | "h1" | "h2";
  weight?: number;
  color?: ColorKey;
  italic?: boolean;
  align?: "left" | "center" | "right";
  style?: Pick<React.CSSProperties, "marginTop" | "marginBottom" | "maxWidth" | "lineHeight">;
};

/** Display serif text for headlines and big numbers. Italic switches to the italic role. */
export const Display: React.FC<Props> = ({
  children,
  size = "h1",
  weight,
  color = "ink",
  italic = false,
  align = "left",
  style,
}) => {
  const { theme, scale } = useTheme();
  const fill = useColor(color);
  const spec = italic ? theme.fonts.italic : theme.fonts.display;
  return (
    <div
      style={{
        fontFamily: fontFamily(spec),
        fontStyle: spec.style,
        fontWeight: weight ?? spec.weights[0],
        fontSize: theme.type[size] * scale,
        lineHeight: size === "hero" ? 0.92 : 1.08,
        letterSpacing: size === "hero" ? "-0.02em" : "-0.005em",
        color: fill,
        textAlign: align,
        fontVariantNumeric: "lining-nums",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

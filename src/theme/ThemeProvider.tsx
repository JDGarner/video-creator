import React, { createContext, useContext, useMemo } from "react";
import { useVideoConfig } from "remotion";
import { resolveColor, type ColorKey, type Theme, type Variant } from "./tokens";

type ThemeContextValue = {
  theme: Theme;
  /** Multiplier from the 1080p design scale to the actual composition height. */
  scale: number;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const VariantContext = createContext<Variant>("light");

export const ThemeProvider: React.FC<{ theme: Theme; scale?: number; children: React.ReactNode }> = ({
  theme,
  scale,
  children,
}) => {
  const { height } = useVideoConfig();
  const value = useMemo(() => ({ theme, scale: scale ?? height / 1080 }), [theme, scale, height]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const VariantProvider = VariantContext.Provider;

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme() called outside <ThemeProvider>");
  return ctx;
}

export function useVariant(): Variant {
  return useContext(VariantContext);
}

/** A theme colour resolved for the current variant. */
export function useColor(key: ColorKey): string {
  const { theme } = useTheme();
  const variant = useVariant();
  return resolveColor(theme, key, variant);
}

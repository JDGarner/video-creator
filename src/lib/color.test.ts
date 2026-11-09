import { describe, expect, it } from "vitest";
import { isDark, withAlpha } from "./color";

describe("withAlpha", () => {
  it("expands six-digit hex", () => {
    expect(withAlpha("#1E1B17", 0.5)).toBe("rgba(30, 27, 23, 0.5)");
  });
  it("expands three-digit hex", () => {
    expect(withAlpha("#fff", 1)).toBe("rgba(255, 255, 255, 1)");
  });
  it("clamps alpha", () => {
    expect(withAlpha("#000000", 1.7)).toBe("rgba(0, 0, 0, 1)");
  });
  it("rejects non-hex input", () => {
    expect(() => withAlpha("red", 1)).toThrow();
  });
});

describe("isDark", () => {
  it("treats cream paper as light and navy as dark", () => {
    expect(isDark("#F2ECDF")).toBe(false);
    expect(isDark("#101A2C")).toBe(true);
  });
});

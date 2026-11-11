import { describe, expect, it } from "vitest";
import defaults from "../../config/defaults.json";
import { mergeConfig } from "./config";

describe("mergeConfig", () => {
  it("accepts the shipped defaults", () => {
    expect(mergeConfig(defaults, {}).theme).toBe("fieldguide");
  });

  it("overrides one nested field and keeps the rest", () => {
    const c = mergeConfig(defaults, { captions: { top: 0.7 } });
    expect(c.captions.top).toBe(0.7);
    expect(c.captions.combineMs).toBe(defaults.captions.combineMs);
  });

  it("rejects unknown values", () => {
    expect(() => mergeConfig(defaults, { captions: { highlight: "glow" } })).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { LAYOUT } from "./layout";

describe("layout", () => {
  it("keeps every visual band above the caption band", () => {
    for (const band of [LAYOUT.visual, LAYOUT.tall, LAYOUT.centre, LAYOUT.frame, LAYOUT.timeline.silhouettes]) {
      expect(band.top).toBeLessThan(band.bottom);
      expect(band.bottom).toBeLessThanOrEqual(LAYOUT.captionClear);
    }
    for (const row of LAYOUT.silhouettes.rows) expect(row.top + row.height).toBeLessThanOrEqual(LAYOUT.captionClear);
    expect(LAYOUT.card.baseline).toBeLessThanOrEqual(LAYOUT.captionClear);
  });
  it("starts text where the visual it follows has ended", () => {
    expect(LAYOUT.textBelow).toBeGreaterThanOrEqual(LAYOUT.visual.bottom);
    expect(LAYOUT.frame.text).toBeGreaterThanOrEqual(LAYOUT.frame.bottom);
    expect(LAYOUT.card.text).toBeGreaterThanOrEqual(LAYOUT.card.baseline);
    expect(LAYOUT.headline).toBeLessThan(LAYOUT.visual.top);
  });
});

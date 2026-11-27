import { describe, expect, it } from "vitest";
import { LAYOUT } from "./layout";

describe("layout", () => {
  it("keeps every visual band above the caption band", () => {
    for (const band of [LAYOUT.visual, LAYOUT.tall, LAYOUT.centre, LAYOUT.frame, LAYOUT.timeline.grid, LAYOUT.timeline.silhouettes]) {
      expect(band.top).toBeLessThan(band.bottom);
      expect(band.bottom).toBeLessThanOrEqual(LAYOUT.captionClear);
    }
    for (const row of LAYOUT.silhouettes.rows) expect(row.top + row.height).toBeLessThanOrEqual(LAYOUT.captionClear);
    expect(LAYOUT.card.baseline).toBeLessThanOrEqual(LAYOUT.captionClear);
  });
  it("starts text where the visual it follows has ended", () => {
    expect(LAYOUT.textBelow).toBeGreaterThanOrEqual(LAYOUT.visual.bottom);
    expect(LAYOUT.frame.text).toBeGreaterThanOrEqual(LAYOUT.frame.bottom);
    // the tallest subject a card is likely to carry (2.5 m at the shared scale) must clear the text block
    expect(LAYOUT.card.baseline - (LAYOUT.card.referenceH / 1.75) * 2.5).toBeGreaterThan(LAYOUT.card.text + LAYOUT.card.textH);
    expect(LAYOUT.headline).toBeLessThan(LAYOUT.visual.top);
  });
});

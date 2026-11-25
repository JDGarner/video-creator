import { describe, expect, it } from "vitest";
import { whiteToAlpha } from "./knockout";

describe("whiteToAlpha", () => {
  it("makes white transparent and leaves black alone", () => {
    const px = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
    whiteToAlpha(px);
    expect([...px]).toEqual([255, 255, 255, 0, 0, 0, 0, 255]);
  });
  it("keeps a tint looking the same over white", () => {
    const px = new Uint8ClampedArray([255, 128, 128, 255]);
    whiteToAlpha(px);
    const [r, g, b, a] = [...px] as [number, number, number, number];
    const over = (c: number) => Math.round((c * a) / 255 + 255 * (1 - a / 255));
    expect([over(r), over(g), over(b)]).toEqual([255, 128, 128]);
  });
  it("scales an existing alpha rather than replacing it", () => {
    const px = new Uint8ClampedArray([0, 0, 0, 128]);
    whiteToAlpha(px);
    expect(px[3]).toBe(128);
  });
});

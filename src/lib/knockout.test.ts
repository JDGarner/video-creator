import { describe, expect, it } from "vitest";
import { NEAR_WHITE, whiteToAlpha } from "./knockout";

describe("whiteToAlpha", () => {
  it("makes white transparent and leaves black alone", () => {
    const px = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
    whiteToAlpha(px);
    expect([...px]).toEqual([255, 255, 255, 0, 0, 0, 0, 255]);
  });
  it("treats near-white as white, and ramps from there", () => {
    const edge = 255 - NEAR_WHITE;
    const px = new Uint8ClampedArray([edge, edge, 255, 255, edge - 1, edge - 1, edge - 1, 255, 128, 128, 128, 255]);
    whiteToAlpha(px);
    expect(px[3]).toBe(0);
    expect(px[7]).toBeGreaterThan(0);
    expect(px[7]).toBeLessThan(3);
    // mid grey is a little more transparent than the plain formula gives, never more opaque
    expect(px[11]).toBeLessThan(127);
    expect(px[11]).toBeGreaterThan(110);
  });
  it("keeps a tint looking the same over white", () => {
    const px = new Uint8ClampedArray([255, 128, 128, 255]);
    whiteToAlpha(px);
    const [r, g, b, a] = [...px] as [number, number, number, number];
    const over = (c: number) => Math.round((c * a) / 255 + 255 * (1 - a / 255));
    // the ramp lifts a strong tint by a few levels at most
    expect(Math.abs(over(r) - 255)).toBeLessThanOrEqual(1);
    expect(Math.abs(over(g) - 128)).toBeLessThanOrEqual(12);
    expect(Math.abs(over(b) - 128)).toBeLessThanOrEqual(12);
  });
  it("scales an existing alpha rather than replacing it", () => {
    const px = new Uint8ClampedArray([0, 0, 0, 128]);
    whiteToAlpha(px);
    expect(px[3]).toBe(128);
  });
});

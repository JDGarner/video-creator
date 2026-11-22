import { describe, expect, it } from "vitest";
import { clipRing, keptArea, ringArea, splitAt, type Ring } from "./landmass";

const square: Ring = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];

describe("landmass", () => {
  it("measures a square", () => {
    expect(ringArea(square)).toBe(100);
  });
  it("clips a square to the right of a line", () => {
    expect(ringArea(clipRing(square, 0, 7.5, true))).toBeCloseTo(25);
    expect(ringArea(clipRing(square, 0, 7.5, false))).toBeCloseTo(75);
  });
  it("finds where a quarter of the area remains along each edge", () => {
    expect(splitAt([square], "east", 0.25)).toBeCloseTo(7.5, 4);
    expect(splitAt([square], "west", 0.25)).toBeCloseTo(2.5, 4);
    expect(splitAt([square], "north", 0.25)).toBeCloseTo(2.5, 4);
    expect(splitAt([square], "south", 0.25)).toBeCloseTo(7.5, 4);
  });
  it("counts several rings together", () => {
    const other: Ring = square.map(([x, y]) => [x + 20, y]);
    expect(keptArea([square, other], "east", 25)).toBeCloseTo(50);
    expect(splitAt([square, other], "east", 0.125)).toBeCloseTo(27.5, 4);
  });
});

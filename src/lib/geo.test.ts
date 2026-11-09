import { describe, expect, it } from "vitest";
import { bearing, greatCircle, greatCircleKm, midpoint, toCartesian } from "./geo";

const boston: [number, number] = [-71.06, 42.36];
const paris: [number, number] = [2.35, 48.86];

describe("geo", () => {
  it("measures Boston to Paris at about 5,540 km", () => {
    expect(greatCircleKm(boston, paris)).toBeGreaterThan(5500);
    expect(greatCircleKm(boston, paris)).toBeLessThan(5600);
  });
  it("samples an inclusive great circle", () => {
    const pts = greatCircle(boston, paris, 10);
    expect(pts).toHaveLength(11);
    expect(pts[0]).toEqual(boston);
    expect(pts[10]?.[0]).toBeCloseTo(paris[0], 5);
  });
  it("puts the midpoint north of both endpoints", () => {
    expect(midpoint(boston, paris)[1]).toBeGreaterThan(48.86);
  });
  it("bears north-east out of Boston", () => {
    const b = bearing(boston, paris);
    expect(b).toBeGreaterThan(40);
    expect(b).toBeLessThan(70);
  });
  it("maps lon 0 lat 0 to +x and the north pole to +y", () => {
    const [x, y, z] = toCartesian([0, 0]);
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(0);
    expect(toCartesian([0, 90])[1]).toBeCloseTo(1);
  });
});

export type Pt = [number, number];
export type Ring = Pt[];
export type Edge = "east" | "west" | "north" | "south";

/** Unsigned shoelace area of a closed or open ring. */
export function ringArea(ring: Ring): number {
  let s = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[(i + 1) % n]!;
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

/** The part of a ring on the kept side of a line at `t` on `axis` (Sutherland-Hodgman against one half-plane). */
export function clipRing(ring: Ring, axis: 0 | 1, t: number, keepGreater: boolean): Ring {
  const inside = (p: Pt) => (keepGreater ? p[axis] >= t : p[axis] <= t);
  const cross = (a: Pt, b: Pt): Pt => {
    const f = (t - a[axis]) / (b[axis] - a[axis]);
    return axis === 0 ? [t, a[1] + f * (b[1] - a[1])] : [a[0] + f * (b[0] - a[0]), t];
  };
  const out: Ring = [];
  for (let i = 0, n = ring.length; i < n; i++) {
    const cur = ring[i]!;
    const prev = ring[(i + n - 1) % n]!;
    if (inside(cur)) {
      if (!inside(prev)) out.push(cross(prev, cur));
      out.push(cur);
    } else if (inside(prev)) {
      out.push(cross(prev, cur));
    }
  }
  return out;
}

const AXIS: Record<Edge, { axis: 0 | 1; keepGreater: boolean }> = {
  east: { axis: 0, keepGreater: true },
  west: { axis: 0, keepGreater: false },
  // screen y grows downward, so north is the smaller y
  north: { axis: 1, keepGreater: false },
  south: { axis: 1, keepGreater: true },
};

/** Area of the rings on the kept side of a line at `t`. */
export function keptArea(rings: Ring[], edge: Edge, t: number): number {
  const { axis, keepGreater } = AXIS[edge];
  return rings.reduce((sum, r) => sum + ringArea(clipRing(r, axis, t, keepGreater)), 0);
}

/**
 * The line position along `edge` that leaves `fraction` of the total area on that edge's side.
 * Binary search; the kept area is monotonic in t.
 */
export function splitAt(rings: Ring[], edge: Edge, fraction: number): number {
  const { axis, keepGreater } = AXIS[edge];
  const total = rings.reduce((s, r) => s + ringArea(r), 0);
  const vals = rings.flatMap((r) => r.map((p) => p[axis]));
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const target = total * fraction;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    const kept = keptArea(rings, edge, mid);
    // moving the line toward the kept edge shrinks the kept area
    const tooMuch = kept > target;
    if (keepGreater === tooMuch) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

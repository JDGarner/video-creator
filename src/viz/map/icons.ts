/**
 * Profile silhouette of a twin-sailed prau, as atlases draw ships: hull along the bottom,
 * two raked tanja sails. Fits a 1 × 1 box centred on the origin, bow to the right.
 */
export const PRAU_PATH = [
  // hull
  "M-0.48,0.22 Q-0.5,0.42 -0.3,0.44 L0.3,0.44 Q0.52,0.42 0.5,0.2 L0.42,0.26 L-0.4,0.26 Z",
  // fore sail
  "M0.06,0.24 L0.1,-0.42 L0.4,-0.2 L0.3,0.24 Z",
  // aft sail
  "M-0.36,0.24 L-0.3,-0.3 L-0.02,-0.08 L-0.1,0.24 Z",
  // masts
  "M0.09,-0.46 L0.1,0.24 L0.12,0.24 L0.11,-0.46 Z",
  "M-0.31,-0.34 L-0.3,0.24 L-0.28,0.24 L-0.29,-0.34 Z",
].join(" ");

/** Stylised sea cucumber: a soft elongated body with a row of tubercles. 1 × 0.4 box, centred. */
export const TREPANG_PATH =
  "M-0.5,0 C-0.5,-0.16 -0.3,-0.2 -0.1,-0.19 C0.1,-0.18 0.3,-0.2 0.5,-0.04 C0.52,0.08 0.36,0.2 0.12,0.2 C-0.12,0.21 -0.34,0.2 -0.5,0 Z";

export const TREPANG_BUMPS: [number, number][] = [
  [-0.36, -0.12],
  [-0.2, -0.16],
  [-0.03, -0.16],
  [0.14, -0.15],
  [0.3, -0.12],
];

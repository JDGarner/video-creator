/**
 * Where things sit in the 9:16 frame, as fractions of height unless noted. Every scene places its
 * visual and its text from these bands, so a change here moves every scene together and nothing
 * can be drawn under the caption band by accident. `layout.test.ts` checks the bands stay in order.
 */
export const LAYOUT = {
  /** Side margin, fraction of width. */
  margin: 0.07,
  /** Top of the headline block when the text sits above the visual. */
  headline: 0.1,
  /** Headline when the visual starts high and needs the room (panels). */
  headlineTight: 0.05,
  /** Top of the text block when it sits under the visual. */
  textBelow: 0.58,
  /** Visual band under a headline (montage). */
  visual: { top: 0.14, bottom: 0.56 },
  /** Taller band for upright panels, no text below. */
  tall: { top: 0.14, bottom: 0.68 },
  /** Band centred on the frame, text above (landmass). */
  centre: { top: 0.31, bottom: 0.69 },
  /** Framed still: the picture box and where its text starts. */
  frame: { top: 0.1, bottom: 0.62, text: 0.645 },
  /** Fact card: the text block up top (and the height it is allowed), then the ground line the human reference (left) and the subject (right) stand on, the reference's height, which sets the scale of every card, and the side margin a height row may run to (a length row keeps to the ground line's span, its scale standing in for the line). */
  card: { text: 0.22, textH: 0.14, baseline: 0.7, referenceH: 0.21, rowMargin: 0.04 },
  /** Timeline: axis, silhouettes row above it, question mark and text; with a picture grid the axis moves up to the grid's centre. */
  /** Timeline: the axis line (no grid), the silhouette row, the band the picture grid and its axis panel share (the panel sits at its foot, the pictures fill what is left above), the question mark's top with and without a grid, and the text block. */
  timeline: { axis: 0.5, silhouettes: { top: 0.22, bottom: 0.34 }, grid: { top: 0.08, bottom: 0.72 }, question: 0.56, gridQuestion: 0.24, text: 0.09 },
  /** Silhouette group: two staggered rows. */
  silhouettes: { rows: [{ top: 0.42, height: 0.1 }, { top: 0.53, height: 0.13 }] },
  /** Nothing below this line: the caption band (config captions.top, 0.78 by default) starts here. */
  captionClear: 0.72,
} as const;

/** Pixel height of a band. */
export function bandHeight(height: number, band: { top: number; bottom: number }): number {
  return height * (band.bottom - band.top);
}

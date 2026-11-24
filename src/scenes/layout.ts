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
  /** Fact card, top to bottom: the square picture plate, the text, then the scale section with the ground line the subject stands on and the scale reference's height. */
  card: { picture: { top: 0.15, bottom: 0.43 }, text: 0.46, top: 0.55, baseline: 0.72, referenceH: 0.12 },
  /** Timeline: axis, silhouettes row above it, question mark and text. */
  timeline: { axis: 0.5, silhouettes: { top: 0.22, bottom: 0.34 }, question: 0.56, text: 0.09 },
  /** Silhouette group: two staggered rows. */
  silhouettes: { rows: [{ top: 0.42, height: 0.1 }, { top: 0.53, height: 0.13 }] },
  /** Nothing below this line: the caption band (config captions.top, 0.78 by default) starts here. */
  captionClear: 0.72,
} as const;

/** Pixel height of a band. */
export function bandHeight(height: number, band: { top: number; bottom: number }): number {
  return height * (band.bottom - band.top);
}

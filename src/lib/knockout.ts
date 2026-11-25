/**
 * Colour-to-alpha against white, as GIMP does it, in place on RGBA bytes: every pixel keeps the look
 * it had over a white page, and the white page itself becomes transparent. For a pixel c with
 * a = 255 - min(r, g, b): c' = 255 - (255 - c) * 255 / a, alpha = a (scaled by any alpha already there).
 */
export function whiteToAlpha(px: Uint8ClampedArray): void {
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i]!;
    const g = px[i + 1]!;
    const b = px[i + 2]!;
    const a = 255 - Math.min(r, g, b);
    if (a === 0) {
      px[i + 3] = 0;
      continue;
    }
    px[i] = 255 - ((255 - r) * 255) / a;
    px[i + 1] = 255 - ((255 - g) * 255) / a;
    px[i + 2] = 255 - ((255 - b) * 255) / a;
    px[i + 3] = (a * px[i + 3]!) / 255;
  }
}

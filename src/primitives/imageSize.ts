import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";

export type ImageSize = { width: number; height: number };

const cache = new Map<string, ImageSize>();

/**
 * Natural pixel size of the image at `src`, so a layout can give it a box of exactly its own
 * proportions (a scale subject whose height means something). Null until known; the frame waits.
 * An SVG without intrinsic dimensions reports a square.
 */
export function useImageSize(src: string | null): ImageSize | null {
  const [size, setSize] = useState<ImageSize | null>(src ? (cache.get(src) ?? null) : null);
  useEffect(() => {
    if (!src) return;
    const hit = cache.get(src);
    if (hit) {
      setSize(hit);
      return;
    }
    const handle = delayRender(`image size ${src}`);
    // a DOM Image for its dimensions only; what is drawn goes through Remotion's Img
    const img = new Image();
    img.onload = () => {
      const found = img.naturalWidth > 0 && img.naturalHeight > 0 ? { width: img.naturalWidth, height: img.naturalHeight } : { width: 1, height: 1 };
      cache.set(src, found);
      setSize(found);
      continueRender(handle);
    };
    img.onerror = () => cancelRender(new Error(`could not load ${src} for its size`));
    img.src = src;
  }, [src]);
  return size;
}

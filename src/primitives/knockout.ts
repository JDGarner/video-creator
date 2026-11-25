import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
import { whiteToAlpha } from "../lib/knockout";

const cache = new Map<string, string>();

/**
 * The image at `src` with its white ground made transparent, as a data URL, so an illustration
 * scanned or drawn on white sits on the paper with no visible edge. Null until it is ready; the
 * frame waits. Processed once per source and kept for the life of the renderer.
 */
export function useKnockout(src: string | null): string | null {
  const [url, setUrl] = useState<string | null>(src ? (cache.get(src) ?? null) : null);
  useEffect(() => {
    if (!src) return;
    const hit = cache.get(src);
    if (hit) {
      setUrl(hit);
      return;
    }
    const handle = delayRender(`knockout ${src}`);
    // a DOM Image for pixel access only; nothing here is rendered, the result goes through Remotion's Img
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return cancelRender(new Error("no 2d canvas for knockout"));
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      whiteToAlpha(data.data);
      ctx.putImageData(data, 0, 0);
      const out = canvas.toDataURL("image/png");
      cache.set(src, out);
      setUrl(out);
      continueRender(handle);
    };
    img.onerror = () => cancelRender(new Error(`could not load ${src} for knockout`));
    img.src = src;
  }, [src]);
  return url;
}

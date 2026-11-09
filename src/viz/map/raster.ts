import type { GeoProjection } from "d3-geo";

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Pixel data of an equirectangular raster plus a lon/lat sampler. */
export class Equirect {
  readonly width: number;
  readonly height: number;
  private readonly data: Uint8ClampedArray;

  constructor(img: HTMLImageElement) {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    this.width = c.width;
    this.height = c.height;
    this.data = ctx.getImageData(0, 0, c.width, c.height).data;
  }

  /** Nearest-neighbour sample; returns the byte offset into RGBA data. */
  offset(lon: number, lat: number): number {
    const x = Math.min(this.width - 1, Math.max(0, Math.floor(((lon + 180) / 360) * this.width)));
    const y = Math.min(this.height - 1, Math.max(0, Math.floor(((90 - lat) / 180) * this.height)));
    return (y * this.width + x) * 4;
  }

  grey(lon: number, lat: number): number {
    return this.data[this.offset(lon, lat)]!;
  }

  rgb(lon: number, lat: number): Rgb {
    const o = this.offset(lon, lat);
    return [this.data[o]!, this.data[o + 1]!, this.data[o + 2]!];
  }
}

/** Alpha channel of a filled path, used as a soft mask. */
export function maskAlpha(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): Uint8ClampedArray {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d")!;
  draw(ctx);
  return ctx.getImageData(0, 0, width, height).data;
}

/**
 * Shading amount from a Natural Earth relief grey: 0 on flat ground, up to 1 in deep shadow.
 * `lift` raises bright (lit) slopes toward 0 as a highlight signal (negative values).
 */
export function shadeAmount(grey: number, lift = 0): number {
  const dark = Math.max(0, (235 - grey) / 235 - 0.1);
  const light = lift > 0 ? Math.max(0, (grey - 215) / 40) * lift : 0;
  return dark - light;
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const k = Math.min(1, Math.max(0, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

/** Iterate every output pixel with its inverse-projected lon/lat. */
export function forEachPixel(
  projection: GeoProjection,
  width: number,
  height: number,
  fn: (x: number, y: number, lon: number, lat: number, offset: number) => void,
): void {
  const invert = projection.invert;
  if (!invert) throw new Error("projection has no invert()");
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ll = invert([x + 0.5, y + 0.5]);
      if (!ll || Number.isNaN(ll[0]) || Number.isNaN(ll[1])) continue;
      fn(x, y, ll[0], ll[1], (y * width + x) * 4);
    }
  }
}

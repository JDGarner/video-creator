/**
 * Map colours for the atlas look. Chosen from the regional-map spike on 2026-11-09
 * (see docs/design/README.md). Independent of the page palette so land and sea keep
 * their own identity inside any page theme.
 */
export type RasterTint = { tint: string; strength: number; lift?: number };

export type MapPalette = {
  name: string;
  doc: string;
  sea: string;
  /** Ocean-bottom shading multiplied into the sea, or null for flat water. */
  seaShade: RasterTint | null;
  land: string;
  /** Use the hypsometric raster for land colour instead of the flat fill. */
  hypsometric: boolean;
  /** Shaded relief multiplied into land, or null for flat land. */
  landShade: RasterTint | null;
  coast: string;
  coastAlpha: number;
  border: string;
  graticule: string;
  graticuleAlpha: number;
  /** Type colours on each surface. */
  labelOnLand: string;
  labelOnSea: string;
  accent: string;
};

/** The selected map design: Natural Earth hypsometric land over a soft blue sea with bathymetry. */
export const MAP_PALETTE: MapPalette = {
    name: "hypsometric",
    doc: "Natural Earth hypsometric tints for land (green lowlands to brown highlands), soft blue sea with bathymetry",
    sea: "#B9D3DD",
    seaShade: { tint: "#2F5D70", strength: 0.6 },
    land: "#D8CFA8",
    hypsometric: true,
    landShade: null,
    coast: "#28383E",
    coastAlpha: 0.8,
    border: "#4C3B25",
    graticule: "#28383E",
    graticuleAlpha: 0.16,
    labelOnLand: "#26201A",
    labelOnSea: "#274754",
    accent: "#D9481F",
  };

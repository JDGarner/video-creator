# Spikes

Rendered explorations kept for reference. Reduced to JPEG; regenerate full-size PNGs with the
`spike-*` compositions in `src/dev/` (e.g. `pnpm still spike2-map-atlas-blue out/x.png`).

- `mapspike/` globe rendering approaches, Boston → Paris in the fieldguide palette:
  `flat` (SVG + d3-geo), `relief` (canvas with tinted Natural Earth shading), `three` (react-three-fiber sphere).
  Outcome: build maps as a layered stack, canvas base + SVG overlay. 3D parked.
- `mapspike2/` regional 2D map palettes, Indonesia / northern Australia, Wallace Line as accent:
  `atlas-blue`, `deep-sea`, `two-tone`, `green-land`. The winner, `hypsometric`, is in `docs/design/`.

# Handoff: Remotion explainer-video pipeline

Read `context.md` first for the why and the visual target. This document is the what and how. Where this doc and the Remotion docs disagree about an API, the Remotion docs win; where they disagree about structure or style, this doc wins.

## 1. Goal

Build a TypeScript repository that turns a markdown script plus structured scene data into a finished explainer video, in an editorial "printed atlas" visual style, with the style fully controlled by a swappable theme.

Organising principle: **content is data, style is a theme, scenes are components, the pipeline glues them.**

## 2. Stack

| Concern | Choice | Notes |
|---|---|---|
| Composition & render | Remotion, `@remotion/cli`, `@remotion/renderer` | React 18, TypeScript strict |
| Package manager | pnpm | |
| Maps | `d3-geo`, `topojson-client`, `world-atlas` | 110m for wide shots, 50m for close-ups |
| Charts/paths | `d3-shape`, `d3-scale`, `d3-array` | SVG output only |
| Fonts | `@remotion/google-fonts` (or `@remotion/fonts` for self-hosted) | `loadFont()` at module top level |
| Media | `@remotion/media` | `Audio`, `Video`, `Img` from Remotion, never native tags |
| Transitions | `@remotion/transitions` | fades/wipes between scenes |
| Captions (optional) | `@remotion/captions` | |
| Schemas | `zod` | pin the exact version Remotion requires, no caret |
| Narration | TTS provider SDK (env-configured) + word alignment | alignment from provider or whisper |
| Post | ffmpeg | mux, loudness normalise, thumbnails |
| Tests | Vitest (pure helpers), Remotion stills (visual snapshots) | |
| Agent guidance | Remotion's `remotion-best-practices` skill + this repo's `docs/` | install the skill in Claude Code |

Hard rule: **no CSS transitions or animations, no Tailwind animation classes.** They don't render in Remotion. Every visual value is a function of `useCurrentFrame()`.

## 3. Repository layout

```
explainer-video/
├── src/
│   ├── Root.tsx                 # registers compositions discovered in /videos
│   ├── theme/
│   │   ├── tokens.ts            # Theme type + helpers
│   │   ├── themes/atlas.ts      # cream paper, slate, rust (default)
│   │   ├── themes/midnight.ts   # navy night variant, proves swappability
│   │   ├── ThemeProvider.tsx    # context + useTheme()
│   │   └── fonts.ts             # loads fonts declared by a theme
│   ├── motion/
│   │   ├── springs.ts           # named presets: snappy, gentle, heavy, settle
│   │   ├── timeline.ts          # cue/stagger/overlap helpers
│   │   └── easings.ts
│   ├── primitives/              # style-aware, content-agnostic
│   │   ├── Paper.tsx            # bg + grain + vignette
│   │   ├── Wordmark.tsx
│   │   ├── ChapterNav.tsx
│   │   ├── CaptionCard.tsx
│   │   ├── Display.tsx          # display serif text
│   │   ├── Label.tsx            # mono caps label
│   │   ├── Reveal.tsx           # enter/exit wrapper
│   │   ├── CountUp.tsx
│   │   └── DrawPath.tsx         # stroke-dash draw-on for any SVG path
│   ├── viz/                     # domain visuals: data in, SVG out
│   │   ├── globe/
│   │   │   ├── Globe.tsx
│   │   │   ├── FlightPath.tsx
│   │   │   ├── Marker.tsx
│   │   │   └── projection.ts
│   │   ├── charts/
│   │   │   ├── BarRow.tsx
│   │   │   ├── Thermometer.tsx
│   │   │   └── Timeline.tsx
│   │   └── diagrams/
│   │       ├── Pipe.tsx
│   │       └── Particles.tsx
│   ├── scenes/                  # one component per scene TYPE
│   │   ├── registry.ts          # type -> { component, schema, defaultDuration }
│   │   ├── TitleCard.tsx
│   │   ├── GlobeRoute.tsx
│   │   ├── BarCompare.tsx
│   │   ├── ThermometerScene.tsx
│   │   ├── DiagramPipe.tsx
│   │   └── MediaScene.tsx       # still image or clip with caption
│   ├── video/
│   │   ├── schema.ts            # VideoSchema (Zod)
│   │   ├── Video.tsx            # VideoSpec -> Sequences + transitions + audio
│   │   └── timing.ts            # cues + alignment -> frame ranges
│   └── lib/                     # pure, unit-tested
│       ├── geo.ts               # great circles, bearings, bbox fitting
│       ├── seeded.ts            # seeded PRNG
│       ├── textfit.ts
│       └── units.ts             # seconds <-> frames
├── videos/                      # CONTENT ONLY, no TSX
│   └── <video-id>/
│       ├── script.md
│       ├── video.json
│       └── audio/
│           ├── narration.wav
│           └── alignment.json
├── public/
│   ├── data/land-110m.json, land-50m.json
│   ├── textures/grain.png
│   └── music/
├── pipeline/
│   ├── script-to-json.ts
│   ├── narrate.ts
│   ├── render.ts
│   ├── stills.ts
│   └── publish.ts
├── docs/
│   ├── STYLE.md                 # design + motion rules (LLM-readable)
│   ├── SCENES.md                # generated from registry schemas
│   └── AUTHORING.md             # how to write script.md
├── CLAUDE.md
├── remotion.config.ts
└── package.json
```

## 4. Core data model

### 4.1 Theme (`src/theme/tokens.ts`)

```ts
export type Theme = {
  name: string;
  colors: {
    bg: string;          // paper
    bgDark: string;      // night variant
    ink: string;         // primary text/strokes on bg
    inkOnDark: string;
    muted: string;       // secondary text, axes
    structure: string;   // bars, fills, land on dark
    structureAlt: string;
    accent: string;      // the one highlight colour
    surface: string;     // caption card fill
    water: string;       // ocean on light globe
    waterDark: string;
    land: string;
    landDark: string;
    ice: string;
  };
  fonts: {
    display: { family: string; weights: number[] };
    label:   { family: string; weights: number[] };
    body:    { family: string; weights: number[] };
    italic:  { family: string; weights: number[] };
  };
  type: {                // size scale in px at 1080p; scale by height/1080
    hero: number; h1: number; h2: number; label: number; caption: number;
    labelTracking: string;   // e.g. "0.14em"
  };
  space: number[];       // 4, 8, 12, 16, 24, 32, 48, 64, 96
  stroke: { hair: number; thin: number; regular: number; bold: number };
  card: { border: "single" | "double"; radius: number; padding: number };
  texture: { grainOpacity: number; vignetteStrength: number; grainScale: number };
  motion: {
    default: SpringName;   // "settle"
    enter: SpringName;     // "snappy"
    camera: EasingName;    // "easeInOutSine"
    staggerMs: number;     // 60
    holdBeforeRevealMs: number; // 400
  };
};
```

All colours and fonts must come from `useTheme()`. Lint rule or review check: no hex literals outside `src/theme/themes/`.

Ship two themes: `atlas` (default) and `midnight`. They must differ in palette and at least one font role so swappability is actually exercised.

### 4.2 Video spec (`src/video/schema.ts`)

```ts
const SceneBase = z.object({
  id: z.string(),
  type: z.string(),                 // key in scenes/registry
  cue: z.string().optional(),       // word/phrase in script marking scene start
  cueEnd: z.string().optional(),    // optional explicit end cue
  durationSec: z.number().optional(), // used when no alignment available
  variant: z.enum(["light", "dark"]).default("light"),
  chapter: z.number().optional(),
  transitionIn: z.enum(["cut", "fade", "wipe"]).default("fade"),
});

export const VideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  theme: z.string().default("atlas"),
  fps: z.literal(30),
  width: z.literal(1920),
  height: z.literal(1080),
  chapters: z.array(z.object({ numeral: z.string(), title: z.string() })),
  narration: z.object({
    audio: z.string().optional(),     // relative to videos/<id>/
    alignment: z.string().optional(),
  }),
  music: z.object({ src: z.string(), gainDb: z.number() }).optional(),
  scenes: z.array(z.discriminatedUnion("type", [...sceneSchemasFromRegistry])),
});
```

Each scene type exports its own Zod schema extending `SceneBase`. The registry assembles the discriminated union so `VideoSchema` is always in sync with available scenes. `docs/SCENES.md` is generated from these schemas (`pnpm docs:scenes`).

### 4.3 Alignment file

Normalise whatever the TTS/whisper produces into:

```json
{ "words": [ { "text": "ETOPS", "start": 12.41, "end": 12.88 }, ... ] }
```

`timing.ts` resolves each scene's `cue` to the first matching word (case-insensitive, punctuation-stripped, allow a phrase of up to ~6 words) and sets the scene's start frame. A scene ends where the next starts, or at `cueEnd`, or at end of narration. Fail loudly on an unmatched cue; print the nearest matches.

## 5. Motion system (`src/motion/`)

Nobody writes raw `interpolate` calls in scenes. Use these.

### 5.1 Springs

```ts
export const SPRINGS = {
  snappy: { damping: 18, stiffness: 180, mass: 0.8 },   // UI enters
  settle: { damping: 22, stiffness: 120, mass: 1 },     // default
  gentle: { damping: 26, stiffness: 80,  mass: 1.2 },   // large moves, cards
  heavy:  { damping: 30, stiffness: 60,  mass: 1.6 },   // camera, globe
} as const;
export function useSpringAt(startFrame: number, name: SpringName, opts?: { durationFrames?: number }): number
```

### 5.2 Timeline helpers

```ts
sec(n)                                  // seconds -> frames for current fps
stagger(index, baseFrame, theme)        // baseFrame + index * staggerFrames
hold(theme)                             // frames for holdBeforeReveal
drawProgress(frame, start, durationFrames, easing)
cameraEase(frame, start, duration, from, to) // heavy spring or easeInOutSine
```

### 5.3 Rules (also in `docs/STYLE.md`)

- Enter = anticipation (2–3% scale down or 4px pull-back over ~4 frames) then spring to rest with slight overshoot. `Reveal` implements this; use it for everything that appears.
- Exit = quick, shorter than enter, ease-in, usually fade + small translate. Never spring on exit.
- Stagger siblings by `theme.motion.staggerMs`; overlap the next action before the previous settles (start next at ~70% of previous).
- Max three independently moving groups at once.
- Hold for `holdBeforeRevealMs` before the key reveal (big number, the accent word).
- Camera (globe rotate/zoom): heavy spring or sine ease, minimum 2 s, never linear.
- Numbers count up over 0.6–1.2 s with ease-out; snap to exact final value on the last frame.
- Lines draw on via `DrawPath` (dashoffset), 0.8–2 s depending on length.
- No linear easing anywhere except constant-velocity travel (a plane moving along a path) and even then ease the ends.

## 6. Component specs

### 6.1 Primitives

- **Paper**: fills frame with `bg` or `bgDark` by `variant`. Grain: SVG `feTurbulence` + `feColorMatrix` filter at `texture.grainOpacity`, or tiled `grain.png` if the filter is too slow at render. Vignette: radial gradient overlay. Children render above. Everything in every scene sits inside `Paper`.
- **Wordmark**: top-left, mono label + small glyph, from theme/video meta. Fixed position across scenes (render once in `Video.tsx`, not per scene).
- **ChapterNav**: top-right row of numerals; active one in `accent` with underline; italic chapter title below. Animate the underline sliding and the title crossfading on chapter change. Also rendered once in `Video.tsx`.
- **CaptionCard**: boxed card with `card.border` (double = outer thin + inner thin inset), `surface` fill, padding from theme. Slots: `eyebrow` (Label), `title` (Display), `lines[]` (Label). Enters with `Reveal` variant `gentle`.
- **Display / Label**: text components bound to font roles and size scale. `Label` applies uppercase + tracking. Accept `color` only as a theme key, not a hex.
- **Reveal**: wrapper. Props: `at` (frame), `spring`, `from` (`"below" | "above" | "left" | "right" | "scale" | "fade"`), `exitAt?`. Implements the enter/exit rules in §5.3.
- **CountUp**: `from`, `to`, `at`, `durationSec`, `format` (fn). Uses Display.
- **DrawPath**: wraps any `<path d>`; props `at`, `durationSec`, `dashed?` (uses dasharray for dotted look; draw-on then still uses dashoffset on an outer path and masks).

### 6.2 Globe (`src/viz/globe/`)

- `projection.ts`: `makeProjection({ width, height, scale, rotate: [lon, lat, roll], translate })` returning a memoised `d3.geoOrthographic()`. Provide `fitRoute(from, to, padding)` that returns a `rotate`/`scale` centring the great-circle midpoint, with the route in view.
- `Globe`: props `rotate`, `scale`, `variant`, `detail: "110m" | "50m"`, `graticuleStep` (default 10), `showIce`. Renders: sphere fill (`water`/`waterDark`), graticule (hair stroke, muted, low alpha), land paths (`land`/`landDark`, hair outline in `ink` at low alpha), optional Antarctica/Greenland highlight in `ice`, a sphere outline. Load TopoJSON once via `staticFile`, convert with `topojson.feature`, memoise paths per `(rotate, scale)`.
- `FlightPath`: props `from`, `to` as `[lon, lat]`, `at`, `durationSec`, `style: "dotted" | "solid"`, `progress` override. Uses `d3.geoInterpolate`; samples ~128 points; clips points on the far hemisphere (check `d3.geoDistance` to projection centre < π/2). Draws via `DrawPath`.
- `Marker`: props `coord`, `label`, `labelSide`, `kind: "dot" | "plane"`. Plane icon rotated to bearing along path at current progress (compute bearing from `geo.ts`). Labels use Display with a subtle `surface` halo (stroke behind text) for legibility on water.
- Camera moves: parent scene animates `rotate` and `scale` with `cameraEase`. Keep rotation to longitude mostly; small latitude changes; never roll.

### 6.3 Charts

- **BarRow**: horizontal bar with label above, value Display at bar end, optional reference lines (dotted vertical with mono labels above). Bar width springs (`settle`), value counts up. Multiple rows staggered.
- **Thermometer**: vertical tube with bulb, scale ticks with mono labels, fill level animates with `gentle` spring, callout at a value: tick line + Display value + Label description.
- **Timeline**: horizontal axis with dated points; points reveal in sequence, optional labels alternating above/below.

### 6.4 Diagrams

- **Pipe**: rounded rect channel with optional end "filter" (grey segmented bar). Children render inside with clip path.
- **Particles**: seeded random scatter of polygons (hexagons by default) inside a bounds; props `count`, `seed`, `sizeRange`, `drift` (slow drift along x with per-particle phase), `clusterAt?` (bias toward a point over time, used for "clogging").

### 6.5 Scenes (`src/scenes/`)

Each exports `{ schema, component, defaultDurationSec }` and is registered in `registry.ts`.

- **TitleCard**: `title`, `subtitle?`, `date?`. Centred Display, Label eyebrow, slow fade.
- **GlobeRoute**: `from: { name, coord }`, `to: { name, coord }`, `card?: { eyebrow, title, lines[] }`, `travel: { startAtSec?, durationSec }`, `camera: "fit" | { rotate, scale }`, `pathStyle`. Order: globe fades in → camera settles → markers reveal → path draws → plane travels → card reveals (staggered).
- **BarCompare**: `title`, `rows[]: { label, value, display }`, `refLines[]: { value, label }`, `max`, `callout?: { text }` in accent, bottom-right.
- **ThermometerScene**: `min, max, value, unit, ticks[], callout: { value, label }`, optional `side: { type: "pipe", ... }` composed diagram on the right.
- **DiagramPipe**: `label`, `particles`, `filter: boolean`, `callout: { text }`.
- **MediaScene**: `src`, `fit`, `caption?`, `kenBurns?` (slow scale 1.00→1.05). Uses `Img`/`Video` from Remotion.

Scene component contract: receives validated props plus `{ durationInFrames, variant, theme }`, renders inside `Paper`, uses relative frames (`useCurrentFrame()` is already scene-relative inside a `Sequence`). Scenes never read the video spec or alignment directly.

### 6.6 Video (`src/video/Video.tsx`)

- Resolve timing (`timing.ts`) → array of `{ scene, from, durationInFrames }`.
- Render `Paper` once at root? No: variant can change per scene, so each scene renders its own `Paper`; the transition handles the switch.
- Wrap scenes in `TransitionSeries` with per-scene `transitionIn`.
- Render `Wordmark` and `ChapterNav` above the series so they persist; `ChapterNav` derives active chapter from current frame and scene chapters.
- `Audio` for narration at frame 0; music at `gainDb` with `-12 dB` ducking under speech (simple: constant gain for v1).
- `Root.tsx` registers one `Composition` per directory in `videos/` using `calculateMetadata` to set `durationInFrames` from alignment/explicit durations.

## 7. Pipeline (`pipeline/`)

All scripts are `tsx`-runnable, take `--video <id>`, and log what they wrote.

- **script-to-json**: reads `videos/<id>/script.md`. Format (see `docs/AUTHORING.md`): H1 title; `## I. Chapter` headings; narration paragraphs; scene directives as fenced blocks:
  ````
  ```scene
  type: GlobeRoute
  cue: "In 1954"
  from: Copenhagen
  to: Los Angeles
  card: { eyebrow: "1954", title: "Scandinavian Airlines", lines: ["Copenhagen → Los Angeles"] }
  ```
  ````
  Resolves place names to coordinates via a small local gazetteer (`public/data/places.json`), falling back to an LLM call only if missing (and writing the result back to the gazetteer). Emits `video.json` validated by `VideoSchema`; on failure prints Zod errors with the offending scene id. Optionally `--llm` mode: give the LLM the script and `docs/SCENES.md` and ask it to propose scene blocks where the author left none.
- **narrate**: concatenates narration paragraphs (strips scene blocks), calls TTS, saves `narration.wav`, requests or computes word alignment, writes normalised `alignment.json`. Supports `--from-recording <path>` to align a human recording instead.
- **render**: `renderMedia` for the composition, H.264 1080p30, CRF ~18, output to `out/<id>.mp4`. `--range` for partial renders. Afterwards ffmpeg loudness normalise to -14 LUFS.
- **stills**: renders a still every N seconds plus the first and last frame of each scene into a contact-sheet PNG (`out/<id>-contact.png`). Used for human and vision-model review.
- **publish**: writes `out/<id>-meta.md` with YouTube chapters (from chapter cues), description draft, and renders 3 thumbnail candidates (title card variants) as PNG.

## 8. Agent-facing docs

- `CLAUDE.md`: one screen. Points to `docs/STYLE.md`, `docs/SCENES.md`, `docs/AUTHORING.md`; states the hard rules (frame-driven only, theme tokens only, scenes take data not instructions, add a scene = component + schema + registry entry + docs regen); lists commands.
- `docs/STYLE.md`: the design and motion rules from §5.3 plus layout grid, type hierarchy, when to use the accent, dark vs light variant guidance, and a short "anti-patterns" list (everything moving at once, linear easing, more than one accent element, decorative motion, hex literals in components).
- `docs/AUTHORING.md`: how to write `script.md`, available scene types with one example each, cue conventions.

## 9. Build order and acceptance criteria

Work in this order. Each step has a check; don't move on until it passes.

1. **Scaffold + theme + Paper/Display/Label.** `npx create-video@latest`, add theme, fonts, `Paper`. Render a still with a hero number, a label, and a caption card on both themes. *Check*: the still looks designed, fonts load, grain visible, no hex outside themes.
2. **Globe static.** Load `land-110m`, render orthographic globe with graticule, two markers and a dotted great-circle route, in both variants. *Check*: a still matches the intended look at 1080p; far-hemisphere path points are clipped.
3. **Motion layer.** Springs, timeline helpers, `Reveal`, `DrawPath`, `CountUp`. Retrofit onto a `GlobeRoute` scene with camera settle and plane travel. *Check*: 10 s render; no element pops in without anticipation; plane bearing follows the path.
4. **Charts and diagrams.** `BarCompare`, `ThermometerScene`, `DiagramPipe` scenes. *Check*: each renders from JSON props alone; staggers and count-ups behave.
5. **Video assembly.** `VideoSchema`, registry, `Video.tsx`, `Root.tsx` discovery, transitions, persistent nav. *Check*: `videos/demo/video.json` with 5 scenes and explicit durations renders end to end; switching `theme` to `midnight` restyles everything.
6. **Narration timing.** `narrate.ts`, `alignment.json`, `timing.ts`. *Check*: scenes start on cued words; unmatched cue fails with helpful output.
7. **Authoring + review loop.** `script-to-json`, `stills`, `docs/*`, `CLAUDE.md`. *Check*: a new script with no hand-edited JSON produces a video; contact sheet generated.
8. **Publish helpers.** Chapters, description, thumbnails.

## 10. Conventions

- TypeScript strict, no `any`. Named exports. One component per file.
- Props validated by Zod at the scene boundary; internal components use plain TS types.
- Pure helpers in `src/lib` have Vitest tests (geo math, timing resolution, seeded PRNG determinism).
- Visual snapshot per scene type: a still at mid-scene committed under `tests/snapshots/`; regenerate deliberately with `pnpm snap:update`.
- Memoise anything derived from TopoJSON or projection; profile if a frame takes >150 ms in studio.
- Seeded randomness only (`lib/seeded.ts`); never `Math.random()` in render code.
- Assets via `staticFile()`; `Img`/`Video`/`Audio` from Remotion, never native tags.
- Fonts: call `loadFont()` at module top level in `theme/fonts.ts`; wait for fonts before render (Remotion handles `delayRender` through the fonts package).
- Keep the reference look generic: do not reproduce the reference channel's wordmark, name, or exact palette values. Choose our own palette and font pairing in `atlas.ts`; document the choice in `STYLE.md`.

## 11. Known risks and mitigations

- **Globe render cost**: DOM-heavy SVG with 50m land on every frame can be slow. Mitigate: 110m by default, memoised path strings, consider rendering land to a `<canvas>` layer if needed; only the projection params change per frame.
- **Cue matching brittleness**: TTS may change word boundaries. Mitigate: fuzzy match on normalised tokens, prefer 2–4 word cues, report nearest matches on failure.
- **Font licensing**: use Google Fonts or fonts you own for both themes.
- **Zod version pinning**: Remotion requires a specific Zod 3.x; pin exactly.
- **Remotion licensing**: source-available; free for individuals/small teams, check terms if the channel incorporates.
- **Over-copying the reference**: enforced by §10's last bullet and by the second theme.

## 12. Commands (target)

```
pnpm dev                     # remotion studio
pnpm video:new <id>          # scaffold videos/<id>/script.md
pnpm video:json <id>         # script.md -> video.json
pnpm video:narrate <id>      # TTS + alignment
pnpm video:render <id>       # mp4 + loudness
pnpm video:stills <id>       # contact sheet
pnpm video:publish <id>      # chapters, description, thumbnails
pnpm docs:scenes             # regenerate docs/SCENES.md from registry
pnpm test / pnpm snap:update
```

## 13. First deliverable

A `videos/demo` video (~90 s, 5 scenes: TitleCard, GlobeRoute, BarCompare, ThermometerScene with pipe diagram, GlobeRoute dark variant) rendered end to end from `video.json` with explicit durations and a placeholder narration track, in both themes. Everything after that is incremental.

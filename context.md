# Context: Programmatic explainer videos

## Who and why

I'm a software engineer starting a YouTube channel of 2D animated explainer videos. Topics span science, engineering, geography, and history, often all in one video. I want to produce videos regularly without a motion-design budget, so the plan is to treat each video as a **build artifact**: a script and some structured data go in, an MP4 comes out. AI helps me write the code, author scene data, and review output, but **no generative video** is used anywhere: it's too expensive and it doesn't fit the style.

I'm comfortable building and maintaining tooling. I'd rather invest a few weeks in a pipeline than hand-animate every video.

## What the videos are

- Long-form explainers (roughly 8 to 15 minutes), plus the option to cut Shorts from the same scenes later.
- Topics are science, engineering, geography, and history with a storytelling angle: aviation, physics, materials, how systems fail, why borders or trade routes are where they are, how a technology changed a place. A single video will often cross these (a flight route is geography, the aircraft is engineering, the era is history). Think "why can a twin-engine plane fly over an ocean" or "why does this shipping lane exist" rather than textbook definitions.
- Narration-led. The visuals explain and support the voiceover; they don't decorate it. Every on-screen element should earn its place by clarifying something.
- Faceless. No presenter, no talking head.
- Likely a hybrid eventually: programmatic animation for the explanatory core, with occasional real footage, archival photos, or old maps (public domain, stock) for concrete, historical, or emotional moments. The pipeline should allow dropping in a clip or image as a scene, but the programmatic scenes are the priority.

## The visual style I'm after

The reference is an editorial, "printed atlas" aesthetic. Describing it in generic terms so we build our own version rather than a copy:

- **Surface**: a paper-like background with subtle grain and a soft vignette. Mostly a warm cream/off-white; a deep navy "night" variant for some scenes (space, oceans, dramatic moments).
- **Palette**: restrained. One ink colour, one or two muted structural colours (slate blue, warm grey), and a single warm accent (rust/terracotta) used sparingly for the one thing that matters in the frame.
- **Typography does most of the work**: a high-contrast display serif for big numbers and headlines; a monospace in letter-spaced caps for labels, axes, and metadata; an italic serif for chapter titles. Hierarchy comes from size and weight contrast, not from colour.
- **Vector cartography**: orthographic globes and regional maps with a fine graticule, flat land shapes, dotted or thin great-circle routes, a small plane, ship, or marker that travels the route, highlighted regions or borders. Maps will carry a lot of the geographical and historical content, so they're a first-class visual, not a one-off.
- **Diagrams as instruments**: thermometers, bar charts with reference lines, pipes with particles, timelines and dated event sequences. Clean strokes, no 3D, no gradients beyond very subtle ones.
- **Recurring furniture**: a small channel wordmark top-left, a chapter indicator (numerals plus a title) top-right, boxed caption cards with a thin double border, small-caps footnotes like "tracks illustrative".
- **Motion**: calm and confident. Elements enter with slight anticipation and settle with a small overshoot. Things don't all move at once; there's stagger and overlap. Numbers count up. Lines draw on. Camera moves (globe rotation, zoom) are slow and eased. Nothing bounces or wiggles for its own sake.

I want this to be **easily customisable**. The palette, fonts, texture, and motion feel should live in a theme I can change in one place, so the same video can be re-rendered in a different look, and so the final channel style ends up being mine rather than a clone of the reference.

## Decisions already made

- **Engine: Remotion** (React + TypeScript). Chosen over Motion Canvas because the look is SVG/typography/D3-heavy and Remotion renders the browser, so d3-geo, web fonts, and any React library work as-is. Frames are pure functions of time, which also makes data-driven, templated scenes and parallel rendering straightforward. Trade-off accepted: choreography is less ergonomic than Motion Canvas's generator timelines, so we build a small sequencing/stagger helper layer to compensate.
- **Maps: d3-geo + Natural Earth** via `world-atlas` TopoJSON. Flat vector, no raster relief to start. Orthographic globe first; regional projections (e.g. a fitted conic or Mercator-like view of one country or sea) are a planned extension since geography and history topics will need them.
- **Content as data**: each video is a JSON document validated by Zod. Scenes are typed components that take facts (cities, dates, values) and decide their own animation. An LLM authors the JSON from a markdown script; it does not write React for routine videos.
- **Narration drives timing**: TTS (or my own recorded voice) plus word-level alignment; scenes are cued to words in the script rather than hard-coded frame numbers.
- **No CSS animations/transitions**: everything derives from the Remotion frame, otherwise it won't render.
- **No generative video, no AI-generated footage.** AI-generated still images are acceptable only as occasional static assets, and not as a default.

## What success looks like

- I can write a script in markdown, run a couple of commands, and get a reviewable video in the Remotion studio within an hour.
- Changing one theme file restyles the whole video.
- A new scene type (say, a new kind of chart or a regional map) takes an afternoon to add and is immediately usable from JSON.
- Output looks deliberately designed: consistent type, calm motion, nothing that reads as "default animation library".
- The repo is documented well enough that a coding agent can add scenes and fix issues following the conventions without re-deriving them.

## Out of scope for now

- Character animation, rigged mascots (Rive/Lottie are the escape hatch later if needed).
- 3D of any kind.
- Shorts/vertical layouts (keep the theme and scene components resolution-agnostic where cheap, but don't build vertical compositions yet).
- Publishing automation beyond generating metadata and thumbnails.

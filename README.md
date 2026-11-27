# video-creator

Programmatic explainer videos in a "printed atlas" style, built with [Remotion](https://www.remotion.dev).
A storyboard and some structured data go in, an MP4 with cloned narration and word-timed captions
comes out. No generative video anywhere; AI helps write code and scene data, the frames are all
deterministic React.

The current target is YouTube Shorts (9:16, under a minute). Long-form videos are a later goal
and will reuse the same themes, primitives and voice; nothing for them is in the repo yet.

## Where to read

| doc | what it covers |
|---|---|
| [`context.md`](context.md) | why the project exists, the visual target, decisions already made |
| [`docs/MOTION.md`](docs/MOTION.md) | how things move and sound: enter, exit, stagger, camera, count-ups, the sound palette |
| [`docs/PIPELINE.md`](docs/PIPELINE.md) | the shorts pipeline: commands, flags, inputs, outputs, config fields, skipping, failure rules |
| [`docs/SCENES.md`](docs/SCENES.md) | the scene types a storyboard can use and every field, generated from the schemas |
| [`docs/examples/`](docs/examples/) | a complete example storyboard (`short.md`), `assets.yaml` and `video.json` |
| [`docs/design/`](docs/design/README.md) | chosen reference renders and why; `spikes/` holds the rejected explorations |
| [`voice/CLAUDE.md`](voice/CLAUDE.md) | rules and gotchas for the voice-cloning side |
| [`voice/PLAN.md`](voice/PLAN.md) | step-by-step status of the narration work, measurements, open decisions |
| [`CLAUDE.md`](CLAUDE.md) | the short list of hard rules an agent must follow in this repo |

## How a short gets made

```
stories/shorts/<video>/short.md ──► check ──► narrate ──► align ──► render ──► bundle ──► out/shorts/<video>/publish/
                                    scenes,     voice        words      MP4        upload folder
                                    assets
```

1. **Storyboard.** You write `stories/shorts/<video>/short.md`. The `## Narration` numbered list is
   the script, one item per beat. The `## Scenes` YAML list says what is on screen and when, cued to
   spoken words and beats, using the scene types in `docs/SCENES.md`. Images are listed in
   `assets.yaml` with their source and licence (`pnpm asset` fetches and records them, `pnpm trim`
   cuts the empty margin off a picture that has to stand at scale). The rest of the file is prose for humans.
   `pnpm check` lints all of it and publishes the scene data; `pnpm stills` renders one frame per
   scene to look at before anything longer runs.
2. **Narrate.** Each beat is synthesised with [Chatterbox](https://github.com/resemble-ai/chatterbox)
   from a short recording of my own voice, loudness-normalised and stitched into `narration.wav`
   with a `manifest.json` of beat timings. Chatterbox is free and local, so it narrates every
   draft; the final cut is narrated with ElevenLabs instead (`pnpm short <video> --elevenlabs`).
   The stages after narrate read only the WAV and manifest, so they do not know which engine spoke.
3. **Align.** whisper.cpp hears the narration back and every script word gets a start and end time
   in `alignment.json`.
4. **Render.** One generic Remotion composition lays the scenes on the timeline from the manifest
   and alignment, animates each scene type, draws Shorts-style captions, lays a few synthesised
   sound cues (page flicks, a tap, a stamp) on the same frames, and renders the MP4.
   Images not yet sourced render as labelled placeholders, so a rough cut comes first.
5. **Bundle.** The storyboard's `## Publish` section becomes a folder with the MP4, a subtitle
   file, a reference frame for the thumbnail and a `metadata.json` with the title, description,
   tags and the answers YouTube Studio asks for. The upload itself is a drag and a paste.

Every stage hashes its inputs and skips when nothing changed, so editing one sentence
re-synthesises one beat and re-renders, nothing more. Details in `docs/PIPELINE.md`.

## Commands

```sh
pnpm install            # Node 22 via nvm (.nvmrc); pnpm 11
pnpm dev                # Remotion studio, including the captions-check and theme sheets
pnpm still <id> out/<id>.png

pnpm short <video>      # check -> narrate -> align -> render -> bundle, skipping unchanged stages
pnpm check <video>      # one stage at a time
pnpm narrate <video>
pnpm align <video>
pnpm render <video>
pnpm bundle <video>
pnpm stills <video>     # one PNG per scene
pnpm short <video> --elevenlabs   # the paid final-cut take, kept beside the draft; asks before sending
pnpm asset <video> phylopic:<taxon> | <commons url> | --search "words"   # fetch images with licence bookkeeping
#   flags: --beats 1,2   --only 3   --seed N   --scene N   --full-sentences   --out path.mp4   --elevenlabs [--yes]   --force
pnpm docs:scenes        # regenerate docs/SCENES.md from the scene schemas
pnpm sfx                # resynthesise the sound palette into public/sfx/
pnpm trim <video> <file>... [--fuzz 8]   # trim the empty margin off an asset (ImageMagick), original kept beside it

pnpm typecheck
pnpm test               # vitest, pure helpers in src/lib
pnpm lint:theme         # no hex colours outside src/theme/themes
```

The voice side is a separate Python project under `voice/`, run with `uv`. Setting up the reference
voice (record, cut candidates, compare clones, pick one) is described in `voice/CLAUDE.md`.

## Layout

| path | what |
|---|---|
| `src/theme/` | tokens, themes (`atlas`, `midnight`, the `fieldguide` family), fonts, provider |
| `src/primitives/` | style-aware building blocks: `Paper`, `Grain`, `Display`, `Label`, `Captions`, `Still`, `DrawPath`, `Reveal`, `Sfx` |
| `src/motion/` | easings, springs, timeline helpers |
| `src/viz/` | globe and regional map renderers (d3-geo, Natural Earth) |
| `src/lib/` | pure helpers with tests: config, storyboard parsing and lint, cues, numbers, narration, captions, publish metadata and SRT, geo, colour |
| `src/scenes/` | scene types: Zod schema per type, the component that draws it, the registry that picks one |
| `src/shorts/` | the data-driven composition, and the registry of one `short-<video>` composition per entry in `videos.json` |
| `src/dev/` | visual checks and spikes, nothing here ships: theme sheets, map spikes, captions check |
| `stories/shorts/<video>/` | storyboard, `assets.yaml`, `assets/`, `video.json`, and any preview you choose to keep |
| `config/defaults.json` | pipeline defaults, every field documented in `docs/PIPELINE.md` |
| `public/sfx/` | the five synthesised sound cues and their catalogue, shared by every short (`pnpm sfx`) |
| `public/shorts/<video>/` | published narration, manifest, alignment, config, scenes and assets read by the composition |
| `voice/` | Chatterbox narration, whisper alignment, the reference voice |
| `scripts/` | `short.ts` (pipeline CLI) over `short/` (`Short.ts` stages, `hash.ts`, `media.ts` ffmpeg, `bundle.ts` publish folder, `tools.ts` what tests fake), `asset.ts` (image fetcher), `trim.ts` (margin trimmer over ImageMagick), `sfx.ts` (sound palette), `scene-docs.ts` (SCENES.md generator) and `check-hex.mjs` (theme lint) |

## Hard rules

- Every visual value derives from `useCurrentFrame()`. No CSS transitions or animations.
- Colours and fonts come from `useTheme()` / `useColor()`. No hex outside `src/theme/themes/`.
- Scenes take data, not instructions. Seeded randomness only. Assets via `staticFile()`.
- `Img`, `Video`, `Audio` from Remotion, never native tags.
- Animation follows the voice. Timings come from the narration manifest and alignment, never from
  hard-coded seconds.
- Raw voice recordings never leave `voice/reference/raw/` and are never committed.

## Status

- Shorts are data: seven scene types (`still`, `card`, `timeline`, `panels`, `silhouettes`,
  `montage`, `landmass`) render any storyboard with a `## Scenes` section without new code. There
  are no hand-written compositions. The megafauna short runs end to end and bundles.
- The raster atlas map renderer in `src/viz/map/` is kept for a `map` scene type but has no scene
  yet.
- Check, narrate, align, render, stills and bundle run as separate or combined commands with
  per-stage skipping. Uploading is manual from the bundle folder.
- Long-form is parked until the shorts pipeline is settled.

## Improvements

Roughly in the order they pay off.

1. **A `map` scene type.** A map scene with a camera box, a route that draws on with a marker
   travelling it, labels and a distance counter, each cued on a word, built on the atlas renderer
   in `src/viz/map/`. It would let maps mix with stills, cards and timelines in any short. The
   `landmass` type covers the flat case, a country drawn in ink with a share of its area switching
   colour, but has no camera, sea or labels.
2. **Pace control.** Short sentences come out around 200 words per minute against a 150 target.
   Options: longer sentences in the storyboard, a slower reference take, or per-beat speed hints
   in the lexicon. Narrate already warns above `narration.maxWpm`.
3. **Loudness target.** Narration is mastered to −16 LUFS; YouTube plays at about −14 and never
   turns audio up, so the shorts play slightly quiet. Moving the target to −14 is one constant in
   `narrate.py`, but it changes every beat's audio, so do it before the next full listen.
4. **Human take override.** Let a `beat-N.wav` dropped next to the storyboard replace the
   synthesised beat, for proper nouns the model never gets right. Align and render would work
   unchanged.
5. **Caption highlight.** `block` (spoken word on a filled accent block, no card) is the default
   after a side-by-side; `accent` and `underline` are still options and could be dropped. A bold
   sans caption face, as the reference Shorts use, is the next thing to try.
6. **Contact sheet.** `pnpm stills` gives one PNG per scene; a single sheet of all of them, and a
   check that nothing sits in the caption band, would make the review loop one image.
7. **More asset sources.** `pnpm asset` knows PhyloPic and Wikimedia Commons. Pexels and Unsplash
   have APIs with the same shape; a contact address in the user agent would also lift the Commons
   throttling on original files.
8. **API upload.** `pnpm bundle` stops at a folder. Uploading through the YouTube Data API would
   remove the last manual step, but uploads from an unaudited API project are locked to private
   and the quota allows about six a day, so it only pays once there is a backlog.
9. **Regional projections.** Maps are orthographic or a fitted regional view; history and geography
   topics will want conic and Mercator-like fits of one country or sea as first-class options.
10. **whisper.cpp upgrade.** Pinned to 1.5.5 because newer releases build with cmake, which is not
    installed. Upgrading would bring better timestamps and the `whisper-cli` binary.
11. **Long-form.** Build on the same primitives: scene registry, transitions, chapter furniture,
    and a narration manifest that spans minutes rather than seconds. The earlier long-form
    storyboard (Makassan trade route) is in git history before 2026-11-23 if it is wanted again.

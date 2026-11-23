# Pipeline: storyboard to short

How a YouTube Short goes from a written storyboard to an MP4 with cloned narration and word-timed
captions, plus everything the upload form asks for. Every stage is deterministic code; no model is
involved after the storyboard is written. Read this before touching anything under
`scripts/short/`, `voice/`, `src/scenes/` or `src/shorts/`.

```
stories/shorts/<video>/short.md ──► check ──► narrate ──► align ──► render ──► bundle ──► you watch, you upload
                                    scenes,     voice        words      MP4        upload folder
                                    assets
```

Upload is manual: drag the MP4 into YouTube Studio and paste from `metadata.json`. The Data API was
considered and parked: uploads from an unaudited API project are locked to private anyway, and the
daily quota covers about six videos.

## Commands

Run from the repo root. `<video>` is the folder name under `stories/shorts/`.

| command | does |
|---|---|
| `pnpm check <video>` | lint the storyboard and `assets.yaml`, publish `scenes.json` and the assets, register the short |
| `pnpm narrate <video>` | script beats -> one WAV per beat -> `narration.wav` + `manifest.json` |
| `pnpm align <video>` | `narration.wav` -> word timestamps in `alignment.json` |
| `pnpm render <video>` | composition + narration + captions -> `out/shorts/<video>/<video>.mp4` |
| `pnpm bundle <video>` | MP4 + `## Publish` section -> `out/shorts/<video>/publish/` with everything the upload form needs |
| `pnpm stills <video>` | one PNG per scene in `out/shorts/<video>/stills/`, for checking layouts without a render |
| `pnpm asset <video> ...` | fetch an image into `assets/` and write its `assets.yaml` entry from the source's API, see Assets |
| `pnpm short <video>` | check, narrate, align, render, bundle in order; bundle is skipped with a note when there is no `## Publish` section or assets are still placeholders |

(`pnpm publish` is pnpm's own command, hence `bundle`.)

Every stage skips itself when its outputs exist and its inputs are unchanged (see Skipping).

| flag | stages | meaning |
|---|---|---|
| `--beats 1,2` or `--beats 1-4` | narrate | which beats to include in the narration; default all |
| `--only 3` | narrate | regenerate only these beats, reuse the existing WAVs for the rest, restitch |
| `--seed N` | narrate | take number: beat n is seeded with `N + n`. Without it, beats keep the seed they were last made with, and `--only` beats get their previous seed + 1, i.e. another take |
| `--scene N` | render | render only scene N (counting from 1) to `out/shorts/<video>/scene-N.mp4`, for checking a layout change; not hashed and not what bundle ships |
| `--full-sentences` | render | render with whole-sentence captions instead of a few words, to `out/shorts/<video>/<video>-sentences.mp4` next to the default; its own hash, works with `--scene`; bundle skips it. To ship that style set `captions.mode: sentences` in `video.json` and drop the flag |
| `--out path.mp4` | render | write the render to this path instead of `out/shorts/<video>/`; relative to where you run it, folders created. Not hashed, so it always renders; combines with `--scene` and `--full-sentences`; bundle skips it |
| `--force` | all | ignore recorded hashes and run anyway, e.g. after upgrading Chatterbox |

Typical editing loop once the script is final: listen, then `pnpm short <video> --only 3 --seed 1`
to re-take beat 3 while keeping every other take. The chosen seed is recorded in the manifest.

## Inputs

| path | what | who writes it |
|---|---|---|
| `stories/shorts/<video>/short.md` | storyboard. `## Narration`: the script, one numbered item per beat. `## Scenes`: a YAML list of what is on screen, cued to words and beats (types in `docs/SCENES.md`). `## Publish`: the YouTube metadata. Format in `docs/examples/short.md`. If `short.md` is absent, the folder's single `.md` file is used | you |
| `stories/shorts/<video>/assets.yaml` | every image the scenes use, with source and licence; credits go into the description | you |
| `stories/shorts/<video>/assets/` | the image files themselves. A listed file that is not there yet renders as a labelled placeholder so the cut can be watched first | you |
| `stories/shorts/<video>/video.json` | per-video overrides of `config/defaults.json`; optional, may be `{}` | you |
| `config/defaults.json` | shared settings, every field documented below | you, rarely |
| `voice/reference/reference.wav` | the cloned voice; see `voice/CLAUDE.md` to change it | `prepare_ref.py --pick` |
| `voice/lexicon.json` | word -> respelling, applied to the text sent to the model only | you |

## Outputs

| path | contents | git |
|---|---|---|
| `voice/out/shorts/<video>/` | `beat-N.wav`, `narration.wav`, `manifest.json`, `alignment.json`, `whisper.json` | ignored |
| `public/shorts/<video>/` | copies of `narration.wav`, `manifest.json`, `alignment.json`, the merged `config.json`, `scenes.json` (scenes plus where each asset landed) and `assets/` (rasters scaled to at most 2160 px wide); the composition reads only these | JSON tracked, WAV and assets ignored |
| `src/shorts/videos.json` | the shorts whose storyboards have a `## Scenes` section; `check` adds to it, the registry renders each with the generic composition | tracked |
| `out/shorts/<video>/` | `<video>.mp4`, `.hashes.json`, `stills/` | ignored |
| `out/shorts/<video>/publish/` | `<video>.mp4`, `captions.srt` (sentence-length cues from the alignment), `metadata.json` (title, description with hashtags, tags, the made-for-kids and synthetic-media answers, duration, loudness), `thumbnail.png` if the storyboard names a time | ignored |

Nothing writes into `stories/`. Keep a render you like by copying it there yourself.

`manifest.json` has per beat `{ n, text, file, start, end, seed, hash }` in seconds, plus the
reference voice's hash. `alignment.json` has `{ words: [{ text, start, end, beat }] }`: word text
from the script, timings from whisper, every script word present exactly once.

## Assets

`pnpm asset` does the bookkeeping that goes wrong by hand: it downloads the file and records source,
licence and credit from the API, so `assets.yaml` cannot drift from what is in `assets/`.

| form | does |
|---|---|
| `pnpm asset <video> phylopic:<taxon>` | the first silhouette PhyloPic has for that name, as SVG; `--list` shows them all with licence and a thumbnail URL, `--index N` picks one, `--as name.svg` renames |
| `pnpm asset <video> <Commons file URL>` | a Wikimedia Commons file at up to 1280 px, licence and artist from the page; `--as name.jpg` renames |
| `pnpm asset <video> --search "words"` | up to eight Commons candidates with licence, size and a 640 px thumbnail under `out/shorts/<video>/candidates/` to look at |
| `... <Commons file URL> --from ~/Downloads/x.jpg` | record a file you downloaded yourself; Commons throttles anonymous downloads of some originals |

Silhouettes are black on transparent, so scenes draw them with the `silhouette` treatment, which
uses the image as a mask filled with the theme ink. PhyloPic lacks some extinct taxa; a close
relative with a `note` in `assets.yaml` is the usual answer.

## Skipping

`out/shorts/<video>/.hashes.json` records, per stage, a hash of that stage's inputs the last time
it ran. A stage runs when the hash differs, an output is missing, or `--force` is given.

| stage | hashed inputs |
|---|---|
| narrate, per beat | beat text, seed, `lexicon.json`, `reference.wav`, model name, gap |
| align | `narration.wav` |
| render, stills | `alignment.json`, `manifest.json`, merged config without `publish`, `scenes.json`, published assets, everything under `src/` |
| bundle | the MP4, `alignment.json`, storyboard, merged config |

Narrate hashes per beat, so editing one sentence resynthesises one beat and restitches. When no
beat changed it leaves `narration.wav` untouched, so align and render skip too. A reference voice
swap changes every beat's hash and regenerates everything, which is what you want. Render does not
hash the storyboard, so editing the description or visuals notes rebuilds only the bundle.

## Config

`config/defaults.json`, overridden field by field by `stories/shorts/<video>/video.json`. The
merged result is validated (`src/lib/config.ts`) and published as `config.json` for the composition.

| field | default | meaning |
|---|---|---|
| `fps`, `width`, `height` | 30, 1080, 1920 | Shorts are 9:16 |
| `theme` | `fieldguide` | theme name from `src/theme/themes` |
| `variant` | `light` | paper variant for the whole short; a scene's own `variant` overrides it |
| `tailSec` | 1 | silence after the last word before the video ends |
| `narration.model` | `turbo` | `turbo` or `original` Chatterbox |
| `narration.device` | `cpu` | measured faster than Metal on this machine; see `voice/PLAN.md` |
| `narration.gapMs` | 500 | pause inserted between beats |
| `narration.seed` | 0 | base take; beat n uses `seed + n` |
| `narration.maxWpm` | 150 | narrate warns above this pace |
| `captions.combineMs` | 800 | words are grouped into a page until it spans this long |
| `captions.holdMs` | 400 | a page lingers this long after its last word if no page follows |
| `captions.top` | 0.78 | vertical centre of captions, fraction of height |
| `captions.maxWidth` | 0.86 | widest page, fraction of width |
| `captions.fontScale` | 1.5 | multiplier on the theme's `h2` size |
| `captions.highlight` | `block` | `block` puts the spoken word in ink on a filled accent block; `accent` colours it; `underline` rules under it |
| `captions.box` | `none` | `none` sets captions straight on the paper; `surface` puts them on a surface card with the theme's card border |
| `captions.mode` | `words` | `words` shows a few words at a time, Shorts style; `sentences` shows the whole sentence with the spoken word highlighted |
| `captions.sentenceFontScale` | 1.0 | multiplier on `h2` in `sentences` mode, smaller than `fontScale` because a sentence runs to several lines |
| `publish.madeForKids` | `false` | the audience answer YouTube requires on every upload |
| `publish.syntheticMedia` | `true` | YouTube's altered or synthetic content disclosure; a cloned voice narrating counts, by their own example |
| `publish.maxSec` | 180 | bundle refuses a longer MP4; YouTube's Shorts limit |

## Failure rules

Each stage checks before doing work and stops with a plain message:

- check: a `## Narration` numbered out of order, a duplicate heading, a markdown link in a beat, a `## Publish` field or asset still marked TODO, an invalid scene (the message names the scene and field), a scene after the first with no `from`, a scene image not listed in `assets.yaml`. Digits, dashes and symbols in a beat are warnings: the voice reads them unpredictably and whisper writes them back as digits, so prefer words
- check with a narration present, and render always: a cue naming a word that is never spoken or a beat that does not exist, or scenes that do not start in order

- no `reference.wav`: run `prepare_ref.py --pick` first
- a beat with no text, or `--beats`/`--only` naming a beat the script does not have
- `--only` naming a beat whose WAV does not exist yet
- narrate: pace above `maxWpm` is a warning, not a stop
- align: a script word whisper did not hear is interpolated and listed; two missed words in a row is a warning to listen
- render refuses to run when `alignment.json` was not made from the current `narration.wav` (by content hash, so a touched file is fine and a copied one is not), so stale captions cannot ship
- the manifest's reference hash differing from the current `reference.wav` makes narrate regenerate, never reuse
- bundle refuses an mp4 that the current inputs did not produce (the render hash must match), so an edit after the last render cannot ship
- bundle measures integrated loudness and records it as `lufs` in `metadata.json`. YouTube plays at about -14 LUFS and never turns audio up, so a quieter master plays quieter than its neighbours

## Adding a short

1. Make `stories/shorts/<video>/short.md` with a `## Narration` numbered list, one beat per item,
   and a `## Scenes` YAML list saying what is on screen when. `docs/examples/short.md` is a complete
   storyboard with notes on what is parsed and how to write for the voice; `docs/SCENES.md` lists
   the scene types and their fields. Describing the visuals in prose first and turning that into
   scene data afterwards is fine, and is the one step an AI session is still useful for.
2. List the images in `assets.yaml` (`docs/examples/assets.yaml`) and drop the files in `assets/`.
   Missing files render as placeholders, so `pnpm stills` and a rough cut work before any image is
   sourced. Add `video.json` (can be `{}`; `docs/examples/video.json` shows a typical override).
3. `pnpm check <video>` lints everything and registers the short. `pnpm stills <video>` gives one
   frame per scene to look at. Add a `## Publish` section when the script is settled; until then
   `pnpm short` stops after render.
4. `pnpm short <video>`, watch `out/shorts/<video>/<video>.mp4`.

A short that needs something no scene type does gets a new type: schema in `src/scenes/schema.ts`,
component in `src/scenes/`, a case in `src/scenes/index.tsx`, then `pnpm docs:scenes`. Every short
is rendered by `DataShort`; check refuses a storyboard without a `## Scenes` section.
5. Upload from `out/shorts/<video>/publish/`: the MP4, then `metadata.json` for the text and the
   two Studio answers, `captions.srt` as the subtitle track. The thumbnail can only be chosen in the
   mobile app, and only as a frame of the video; `thumbnail.png` shows which one to scrub to.

## What is deterministic

Narrate is reproducible for a given seed, reference, model version and text. Align is
deterministic for a given WAV. Check, render, stills and bundle are deterministic. Only the storyboard, the choice
of seed and the upload itself involve a human.

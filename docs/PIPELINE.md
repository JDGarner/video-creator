# Pipeline: storyboard to short

How a YouTube Short goes from a written storyboard to an MP4 with cloned narration and word-timed
captions, plus everything the upload form asks for. Every stage is deterministic code; no model is
involved after the storyboard is written. Read this before touching anything under
`scripts/short.ts`, `voice/` or `src/dev/shorts/`.

```
stories/shorts/<video>/short.md ──► narrate ──► align ──► render ──► bundle ──► you watch, you upload
                                    voice         words      MP4        upload folder
```

Upload is manual: drag the MP4 into YouTube Studio and paste from `metadata.json`. The Data API was
considered and parked: uploads from an unaudited API project are locked to private anyway, and the
daily quota covers about six videos.

## Commands

Run from the repo root. `<video>` is the folder name under `stories/shorts/`.

| command | does |
|---|---|
| `pnpm narrate <video>` | script beats -> one WAV per beat -> `narration.wav` + `manifest.json` |
| `pnpm align <video>` | `narration.wav` -> word timestamps in `alignment.json` |
| `pnpm render <video>` | composition + narration + captions -> `out/shorts/<video>/<video>.mp4` |
| `pnpm bundle <video>` | MP4 + `## Publish` section -> `out/shorts/<video>/publish/` with everything the upload form needs |
| `pnpm short <video>` | the four above in order; bundle is skipped with a note when the storyboard has no `## Publish` section |

(`pnpm publish` is pnpm's own command, hence `bundle`.)

Every stage skips itself when its outputs exist and its inputs are unchanged (see Skipping).

| flag | stages | meaning |
|---|---|---|
| `--beats 1,2` or `--beats 1-4` | narrate | which beats to include in the narration; default all |
| `--only 3` | narrate | regenerate only these beats, reuse the existing WAVs for the rest, restitch |
| `--seed N` | narrate | take number: beat n is seeded with `N + n`. Without it, beats keep the seed they were last made with, and `--only` beats get their previous seed + 1, i.e. another take |
| `--force` | all | ignore recorded hashes and run anyway, e.g. after upgrading Chatterbox |

Typical editing loop once the script is final: listen, then `pnpm short <video> --only 3 --seed 1`
to re-take beat 3 while keeping every other take. The chosen seed is recorded in the manifest.

## Inputs

| path | what | who writes it |
|---|---|---|
| `stories/shorts/<video>/short.md` | storyboard; the `## Narration` numbered list is the script, one item per beat, and the `## Publish` section is the YouTube metadata (format in `docs/examples/short.md`). If `short.md` is absent, the folder's single `.md` file is used | you |
| `stories/shorts/<video>/video.json` | per-video overrides of `config/defaults.json`; optional, may be `{}` | you |
| `config/defaults.json` | shared settings, every field documented below | you, rarely |
| `voice/reference/reference.wav` | the cloned voice; see `voice/CLAUDE.md` to change it | `prepare_ref.py --pick` |
| `voice/lexicon.json` | word -> respelling, applied to the text sent to the model only | you |

## Outputs

| path | contents | git |
|---|---|---|
| `voice/out/shorts/<video>/` | `beat-N.wav`, `narration.wav`, `manifest.json`, `alignment.json`, `whisper.json` | ignored |
| `public/audio/shorts/<video>/` | copies of `narration.wav`, `manifest.json`, `alignment.json`, plus merged `config.json`; the composition reads only these, through `src/lib/narration.ts` | JSON tracked, WAV ignored |
| `out/shorts/<video>/` | `<video>.mp4`, `.hashes.json` | ignored |
| `out/shorts/<video>/publish/` | `<video>.mp4`, `captions.srt` (sentence-length cues from the alignment), `metadata.json` (title, description with hashtags, tags, the made-for-kids and synthetic-media answers, duration, loudness), `thumbnail.png` if the storyboard names a time | ignored |

Nothing writes into `stories/`. Keep a render you like by copying it there yourself.

`manifest.json` has per beat `{ n, text, file, start, end, seed, hash }` in seconds, plus the
reference voice's hash. `alignment.json` has `{ words: [{ text, start, end, beat }] }`: word text
from the script, timings from whisper, every script word present exactly once.

## Skipping

`out/shorts/<video>/.hashes.json` records, per stage, a hash of that stage's inputs the last time
it ran. A stage runs when the hash differs, an output is missing, or `--force` is given.

| stage | hashed inputs |
|---|---|
| narrate, per beat | beat text, seed, `lexicon.json`, `reference.wav`, model name, gap |
| align | `narration.wav` |
| render | `alignment.json`, `manifest.json`, merged config without `publish`, everything under `src/` |
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
| `captions.fontScale` | 1.3 | multiplier on the theme's `h2` size |
| `captions.highlight` | `accent` | `accent` colours the spoken word; `underline` rules under it |
| `publish.madeForKids` | `false` | the audience answer YouTube requires on every upload |
| `publish.syntheticMedia` | `true` | YouTube's altered or synthetic content disclosure; a cloned voice narrating counts, by their own example |
| `publish.maxSec` | 180 | bundle refuses a longer MP4; YouTube's Shorts limit |

## Failure rules

Each stage checks before doing work and stops with a plain message:

- no `reference.wav`: run `prepare_ref.py --pick` first
- a beat with no text, or `--beats`/`--only` naming a beat the script does not have
- `--only` naming a beat whose WAV does not exist yet
- narrate: pace above `maxWpm` is a warning, not a stop
- align: a script word whisper did not hear is interpolated and listed; two missed words in a row is a warning to listen
- render refuses to run when `alignment.json` is older than `narration.wav`, so stale captions cannot ship
- the manifest's reference hash differing from the current `reference.wav` makes narrate regenerate, never reuse
- bundle refuses an MP4 older than `alignment.json`, a resolution other than the configured one, a missing audio stream, a duration over `publish.maxSec`, a `## Publish` without a title, a title over 100 characters, tags over 500 characters in total, a description over 5000, or an unknown field name in the section
- bundle measures integrated loudness and records it as `lufs` in `metadata.json`. YouTube plays at about -14 LUFS and never turns audio up, so a quieter master plays quieter than its neighbours

## Adding a short

1. Make `stories/shorts/<video>/short.md` with a `## Narration` numbered list, one beat per item.
   `docs/examples/short.md` is a complete storyboard with notes on what is parsed and how to write
   for the voice.
2. Add `video.json` (can be `{}`; `docs/examples/video.json` shows a typical override).
   Add a `## Publish` section when the script is settled; until then `pnpm short` stops after render.
3. Add the composition to the `SHORTS` map in `src/shorts/index.tsx`, which registers it as
   `short-<video>`. Until beats are data, the component is hand-written like
   `src/dev/shorts/MakassanShort.tsx`; it
   receives `{ narration, config }` and should take its timings from the narration (see
   `src/lib/narration.ts`: `beat()`, `wordTime()`), never from hard-coded seconds.
4. `pnpm short <video>`, watch `out/shorts/<video>/<video>.mp4`.
5. Upload from `out/shorts/<video>/publish/`: the MP4, then `metadata.json` for the text and the
   two Studio answers, `captions.srt` as the subtitle track. The thumbnail can only be chosen in the
   mobile app, and only as a frame of the video; `thumbnail.png` shows which one to scrub to.

## What is deterministic

Narrate is reproducible for a given seed, reference, model version and text. Align is
deterministic for a given WAV. Render and bundle are deterministic. Only the storyboard, the choice
of seed and the upload itself involve a human.

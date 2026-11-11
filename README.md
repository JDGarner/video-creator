# video-creator

Programmatic explainer videos in a "printed atlas" style, built with [Remotion](https://www.remotion.dev).
A storyboard and some structured data go in, an MP4 with cloned narration and word-timed captions
comes out. No generative video anywhere; AI helps write code and scene data, the frames are all
deterministic React.

The current target is YouTube Shorts (9:16, under a minute). Long-form videos are parked under
`stories/longform/` and reuse the same themes, primitives and voice.

## Where to read

| doc | what it covers |
|---|---|
| [`context.md`](context.md) | why the project exists, the visual target, decisions already made |
| [`handoff.md`](handoff.md) | the stack, repo layout, build order and hard rules for anyone changing code |
| [`docs/PIPELINE.md`](docs/PIPELINE.md) | the shorts pipeline: commands, flags, inputs, outputs, config fields, skipping, failure rules |
| [`docs/examples/`](docs/examples/) | a complete example storyboard (`short.md`) and `video.json` override |
| [`docs/design/`](docs/design/README.md) | chosen reference renders and why; `spikes/` holds the rejected explorations |
| [`voice/CLAUDE.md`](voice/CLAUDE.md) | rules and gotchas for the voice-cloning side |
| [`voice/PLAN.md`](voice/PLAN.md) | step-by-step status of the narration work, measurements, open decisions |
| [`CLAUDE.md`](CLAUDE.md) | the short list of hard rules an agent must follow in this repo |

## How a short gets made

```
stories/shorts/<video>/short.md ──► narrate ──► align ──► render ──► bundle ──► out/shorts/<video>/publish/
                                    voice         words      MP4        upload folder
```

1. **Storyboard.** You write `stories/shorts/<video>/short.md`. The `## Narration` numbered list is
   the script, one item per beat; the rest of the file is for the visuals and for notes.
2. **Narrate.** Each beat is synthesised with [Chatterbox](https://github.com/resemble-ai/chatterbox)
   from a short recording of my own voice, loudness-normalised and stitched into `narration.wav`
   with a `manifest.json` of beat timings.
3. **Align.** whisper.cpp hears the narration back and every script word gets a start and end time
   in `alignment.json`.
4. **Render.** A Remotion composition takes the manifest, alignment and merged config, cues its
   animation to beats and words, draws Shorts-style captions, and renders the MP4.
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

pnpm short <video>      # narrate -> align -> render, skipping unchanged stages
pnpm narrate <video>    # one stage at a time
pnpm align <video>
pnpm render <video>
pnpm bundle <video>
#   flags: --beats 1,2   --only 3   --seed N   --force

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
| `src/primitives/` | style-aware building blocks: `Paper`, `Grain`, `Display`, `Label`, `CaptionCard`, `Captions`, `DrawPath`, `Reveal` |
| `src/motion/` | easings, springs, timeline helpers |
| `src/viz/` | globe and regional map renderers (d3-geo, Natural Earth) |
| `src/lib/` | pure helpers with tests: config, narration, captions, publish metadata and SRT, geo, colour |
| `src/shorts/` | registry of short compositions, one `short-<video>` per entry, sized and timed from the published narration |
| `src/dev/` | visual-check compositions: theme sheets, map spikes, the Makassan short, captions check |
| `stories/shorts/<video>/` | storyboard, `video.json`, and any preview you choose to keep |
| `stories/longform/<video>/` | the parked long-form storyboard and scene directions |
| `config/defaults.json` | pipeline defaults, every field documented in `docs/PIPELINE.md` |
| `public/audio/shorts/<video>/` | published narration, manifest, alignment and config read by the composition |
| `voice/` | Chatterbox narration, whisper alignment, the reference voice |
| `scripts/` | `short.ts` (the pipeline) and `check-hex.mjs` (theme lint) |

## Hard rules

- Every visual value derives from `useCurrentFrame()`. No CSS transitions or animations.
- Colours and fonts come from `useTheme()` / `useColor()`. No hex outside `src/theme/themes/`.
- Scenes take data, not instructions. Seeded randomness only. Assets via `staticFile()`.
- `Img`, `Video`, `Audio` from Remotion, never native tags.
- Animation follows the voice. Timings come from the narration manifest and alignment, never from
  hard-coded seconds.
- Raw voice recordings never leave `voice/reference/raw/` and are never committed.

## Status

- Beats 1 and 2 of the Makassan trade route short are animated, narrated and captioned end to end.
  All nine beats are narrated; beats 3 to 9 have no picture yet because the script is not final.
- Narrate, align, render and bundle run as separate or combined commands with per-beat skipping.
  Uploading is manual from the bundle folder.
- Long-form is parked until the shorts pipeline is settled.

## Improvements

Roughly in the order they pay off.

1. **Beats as data.** The one stage still done by hand, or by an AI session, is the animation.
   Each short is a hand-written React component (`src/dev/shorts/MakassanShort.tsx`). The plan is
   a small vocabulary of overlay components with Zod schemas (camera box, route, marker, label,
   pin, counter, caption card), each cued on a beat or a word, so a short's visuals are a data
   block in the storyboard and `pnpm render` animates any short without new code. AI is then only
   needed when a video wants an overlay type that does not exist yet. `context.md` already states
   this as the intended model; the shorts pipeline just has not reached it.
2. **Finish the Makassan short.** Beats 3 to 9 once the script is final, ideally as the first
   consumer of beats-as-data rather than more hand-written React.
3. **Distance counter.** Beat 2 counts to 2,030 km while the narration says "over a thousand".
   It should be the great-circle distance from Makassar to the vessel's current position.
4. **Pace control.** Short sentences come out around 200 words per minute against a 150 target.
   Options: longer sentences in the storyboard, a slower reference take, or per-beat speed hints
   in the lexicon. Narrate already warns above `narration.maxWpm`.
5. **Loudness target.** Narration is mastered to −16 LUFS; YouTube plays at about −14 and never
   turns audio up, so the shorts play slightly quiet. Moving the target to −14 is one constant in
   `narrate.py`, but it changes every beat's audio, so do it before the next full listen.
6. **Human take override.** Let a `beat-N.wav` dropped next to the storyboard replace the
   synthesised beat, for proper nouns the model never gets right. Align and render would work
   unchanged.
7. **Caption highlight.** `accent` versus `underline` is undecided; pick one from a side-by-side
   render and drop the other from the config.
8. **Collision check.** A still per beat at the caption band would catch captions overlapping map
   labels before a full render. The stills in `stories/shorts/makassan-trade-route/` are stale and
   should be regenerated by the pipeline rather than kept by hand.
9. **API upload.** `pnpm bundle` stops at a folder. Uploading through the YouTube Data API would
   remove the last manual step, but uploads from an unaudited API project are locked to private
   and the quota allows about six a day, so it only pays once there is a backlog.
10. **Regional projections.** Maps are orthographic or a fitted regional view; history and geography
   topics will want conic and Mercator-like fits of one country or sea as first-class options.
11. **whisper.cpp upgrade.** Pinned to 1.5.5 because newer releases build with cmake, which is not
    installed. Upgrading would bring better timestamps and the `whisper-cli` binary.
12. **Tests for the pipeline script.** `scripts/short.ts` is exercised by hand. A fixture short with
    a two-beat script and a fake narrator would let the hashing, `--only` and stale-alignment rules
    run under vitest.
13. **Long-form.** Resume `stories/longform/` on the same primitives: scene registry, transitions,
    chapter furniture, and a narration manifest that spans minutes rather than seconds.

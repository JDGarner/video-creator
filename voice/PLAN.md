# Voice: plan for a local cloned narrator

Goal: record a short reference of my own voice, run Chatterbox locally on this Mac, and turn a
story's narration into a WAV in that voice, plus word timestamps for cueing scenes and captions.

**Current target (2026-11-10):** the YouTube Short in `stories/shorts/makassan-trade-route/`, and
within it beats 1 and 2 only, end to end: cloned voice-over, word-timed captions in the Shorts
style (one to three words on screen at a time, changing on the spoken word), rendered into the
existing `makassan-short` composition. Only once that works do we do the other seven beats. The
longform video in `stories/longform/` is parked; everything below is written so it works for both.

## What we are working with

| | |
|---|---|
| Machine | Apple M4 Max, 48 GB, macOS 26.7. No CUDA; PyTorch runs on MPS (Metal) or CPU. |
| Chatterbox | `chatterbox-tts` 0.1.7 on PyPI (Mar 2026). MIT. Resemble has **archived** the repo: code stays public, no support or updates. |
| Models | **Turbo** (350M, English, `[laugh]`-style tags, recommended for narration), **Nano** (110M, CPU, 3x realtime on 8 cores), **Multilingual V3** (500M, 23 languages), original **Chatterbox** (500M, `exaggeration` / `cfg_weight` controls). All do zero-shot cloning from a ~10 s reference clip. |
| Python | `uv` project on 3.11.17 with torch 2.6.0 (done). Chatterbox is pinned to GitHub commit `ab55923c27` rather than PyPI 0.1.7 because Nano only exists in master. `setuptools` is an explicit dependency: the `perth` watermarker imports `pkg_resources` and silently becomes `None` without it. |
| Apple Silicon | **Decided (step 2): CPU.** All nine model/device runs worked, but on the M4 Max CPU beat Metal for Turbo (0.44 vs 0.89 RTF) and Nano (0.21 vs 0.75). Only the original model was faster on Metal, and it is the slowest overall. Full table in `out/smoke/results.json`. |
| Output | 24 kHz mono WAV. Every file carries Resemble's PerTh watermark (imperceptible, survives MP3). |
| Audio tools | `ffmpeg` 9, `sox` and `rec` installed via Homebrew (step 1). |
| Alignment | `@remotion/install-whisper-cpp` 4.0.541 gives word-level timestamps locally via whisper.cpp, which is the `alignment.json` the handoff's `timing.ts` expects. Its `toCaptions()` converts the same output to `@remotion/captions`' `Caption[]`. |
| Captions | `@remotion/captions` 4.0.541: `createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds })` groups word tokens into short pages. That is the Shorts-style caption mechanic; we style the pages ourselves with theme fonts. |
| The short | `src/dev/shorts/MakassanShort.tsx`, 1080x1920 at 30 fps, currently 14 s covering beats 1 and 2 with hand-set times in `T`. Preview at `stories/shorts/makassan-trade-route/preview-beats-1-2.mp4`, no audio, no captions. |

## Layout

```
voice/
├── PLAN.md                 this file
├── CLAUDE.md               rules and commands for agents working in here
├── pyproject.toml          uv project pinning python + chatterbox (step 1)
├── reference/              my voice: raw takes and clips (gitignored), the chosen reference.wav
│   └── script.md           what to read when recording
├── scripts/
│   ├── record.sh           sox capture from the built-in mic, 48 kHz mono 24-bit    (done)
│   ├── prepare_ref.py      trim, high-pass, normalise, 24 kHz, cut 10/20 s clips     (done)
│   ├── smoke.py            model/device benchmark                                   (done)
│   ├── clone_test.py       every reference clip x two test paragraphs               (done)
│   ├── narrate.py          story narration -> one WAV per beat -> narration.wav + manifest
│   └── align.ts            narration.wav -> alignment.json via whisper.cpp
└── out/                    generated audio (gitignored)
    ├── clone-tests/        step 4 comparison WAVs and notes.md
    └── shorts/<video>/     beat-N.wav, narration.wav, manifest.json, alignment.json
```

The Python side is isolated in `voice/` with its own `uv` environment so Node and Python never
share a toolchain. The Remotion pipeline only ever sees two files per video, `narration.wav` and
`alignment.json`, copied into `public/audio/shorts/<video>/` so `staticFile()` can reach them.
Caption pages are derived from `alignment.json` in TypeScript at render time, not stored.

## Steps and checks

### 1. Environment (30 min)
- `brew install ffmpeg sox`.
- `uv init` in `voice/`, pin Python 3.11 (the version Resemble tested), add `chatterbox-tts==0.1.7`.
- Expect torch 2.6.0 + torchaudio 2.6.0 to resolve for arm64 macOS; if the pin fights, fall back to the `--no-deps` install order from the community script in resemble-ai/chatterbox issue 336.
- **Check:** `uv run python -c "import chatterbox, torch; print(torch.backends.mps.is_available())"` prints `True`.

### 2. Smoke test and device decision (done 2026-11-09)

Result, one sentence, built-in voice, 24 kHz output. RTF = generation seconds per audio second (under 1 is faster than realtime):

| model | device | RTF |
|---|---|---|
| turbo | cpu | **0.44** |
| turbo | mps | 0.89 |
| nano | cpu | **0.21** |
| nano | mps | 0.75 |
| original | mps | 1.58 |
| original | cpu | 2.10 |

Default is Turbo on CPU; Nano on CPU for fast iteration. An 8 minute script is roughly 3.5 minutes of synthesis with Turbo. Metal fallback mode made no meaningful difference. Original Chatterbox stays available for its pacing controls but is 4 to 5x slower.

Original plan for this step:
- `smoke.py` loads Turbo with the built-in voice and synthesises one sentence three ways: `mps`, `mps` with `PYTORCH_ENABLE_MPS_FALLBACK=1`, and `cpu`. Records wall time and whether each crashed.
- Try Nano on CPU too; on 16 performance cores it may be fast enough to make MPS irrelevant.
- First run downloads weights from Hugging Face (about 1 to 2 GB per model). Cache lives in `~/.cache/huggingface`.
- **Check:** at least one device produces a clean WAV. Pick the fastest working one and hardcode it as the default. Realtime factor target: under 1x (faster than playback) so an 8 minute script renders in minutes, not an hour.

### 3. Record the reference (done 2026-11-10)
- Write `reference/script.md`: about 60 s of neutral documentary narration in my voice, in the register I want the channel to have. Include varied sentence lengths, a few numbers, a question, a place name or two. Chatterbox copies pace and tone from the clip, so read it the way I want every video to sound.
- Record with the built-in mic as a baseline, in a quiet room with soft furnishings, 48 kHz mono WAV, mouth about 20 cm off-axis. If I have a USB mic, record both and compare in step 4.
- Capture 3 to 4 takes; Chatterbox needs ~10 s but we'll test 10, 20 and 40 s clips.
- `prepare_ref.py`: trim leading/trailing silence, high-pass at 80 Hz, normalise peaks to -3 dBFS, resample to 24 kHz, write `reference.wav` candidates.
- **Check:** candidates sound like me and have no room echo, clipping or hum when listened to on headphones.

Result: four takes with the built-in mic via `scripts/record.sh`, 21 to 34 s each (shorter than the
60 s script, which is fine: Chatterbox only conditions on ~10 s). 48 kHz / 24-bit / mono, peaks -8 to
-12 dBFS, noise floor about -56 dBFS, so roughly 24 dB of signal over the room. `prepare_ref.py`
wrote `reference/clips/`: `take-N-full`, `take-N-10s` (all four) and `take-N-20s` (takes 2 and 3),
each cut at a real pause. Clips are gitignored with the raws; the chosen one is copied to
`reference/reference.wav` with `--pick`.

### 4. Clone quality pass (reference picked 2026-11-10)
- Synthesise the same two test paragraphs (scene 1 and scene 4 narration) with each reference candidate and each model (Turbo, original Chatterbox, Multilingual V3 with `language_id="en"`).
  First pass done with `scripts/clone_test.py` on Turbo/CPU: 7 clips x 2 texts in `out/clone-tests/`, listening notes go in `out/clone-tests/notes.md`.
- For the original model, sweep `exaggeration` 0.3 to 0.7 and `cfg_weight` 0.3 to 0.5; the README says lower cfg slows pacing, higher exaggeration speeds it up.
- Listen for: similarity to me, pronunciation of Makassar, Marege', Yolŋu, Sulawesi, trepang; hallucinated or repeated words; pacing.
- **Check:** pick one model + one reference + one parameter set and freeze them in `narrate.py` as defaults. Save the comparison WAVs under `out/clone-tests/` with a short `notes.md` saying what won and why.
- Result: picked `take-2-full` (32 s, all of take 2) from the Turbo renders; frozen as
  `reference/reference.wav`. Model is Turbo on CPU with defaults. The original-model parameter
  sweep is deferred until Turbo has been heard across a full beat sequence in step 8.

### 5. Narration generator (half a day)
- `narrate.py --story stories/shorts/makassan-trade-route/makassan_trade_route_short.md --beats 1,2`
  reads the `## Narration` section, parses the numbered list into beats, and synthesises each beat
  as its own WAV: `out/shorts/makassan-trade-route/beat-1.wav`, `beat-2.wav`. One call per beat
  keeps Turbo stable and lets one beat be re-rolled without redoing the rest. The same script
  accepts a longform `direction.md` (paragraphs instead of numbered items) so nothing is thrown away.
- Pronunciation overrides: `voice/lexicon.json` mapping hard words to respellings substituted
  before synthesis only (`Makassar`, `Arafura`, later `Marege'`, `Yolŋu`, `trepang`). Tune by ear.
- Stitch beats with a fixed gap (start at 500 ms for a Short, it is faster-paced than the longform),
  peak-normalise, then `loudnorm` to -16 LUFS integrated, write `narration.wav` and `manifest.json`:
  `{ beats: [{ n, text, file, start, end }] }` in seconds. `start`/`end` are what the composition
  uses to move the camera on the beat change, replacing the hand-set numbers in `T`.
- Deterministic: `torch.manual_seed` per beat, `--seed` to roll a different take, `--only 2` to
  regenerate one beat and restitch.
- Pace check: beats 1 and 2 together are 36 words. At documentary pace expect 12 to 15 s, which is
  close to the 14 s the composition already runs. If the voice comes in much shorter the camera
  move slows down to match, not the other way round.
- **Check:** `narration.wav` for beats 1 to 2 is listenable, and the manifest's beat boundaries sit
  in the gap between the two sentences.

### 6. Word alignment (2 h)
- `align.ts` (run with `pnpm voice:align <video>`) uses `@remotion/install-whisper-cpp` to download
  whisper.cpp and the `medium.en` model, transcribes `narration.wav` with word timestamps, and
  writes `alignment.json` as `{ words: [{ text, start, end }] }` in seconds, the handoff's shape.
- Pass the known script as whisper's prompt so it spells the place names our way; then snap the
  recognised words back onto the script text (same order, fuzzy match) so captions show what was
  written, not what whisper heard. Word timings come from whisper, word text from the script.
- Whisper needs 16 kHz mono WAV input: convert with ffmpeg into a temp file first.
- **Check:** the first word lands within 0.1 s of the manifest's beat 1 start, `Makassar` lands
  inside the beat 2 span, and every script word is present exactly once in `alignment.json`.

### 7. Captions in the short (half a day)
- Shorts-style captions: one to three words on screen, the group changing on the spoken word, not
  whole sentences. Mechanic: `createTikTokStyleCaptions` from `@remotion/captions` over the word
  list, `combineTokensWithinMilliseconds` around 900 ms to start; lower it for single words.
- A `Captions` primitive in `src/primitives/`: takes `{ words, fps }`, derives the current page
  from `useCurrentFrame()`, renders it in theme type. Target look for this channel: the display
  serif at roughly `h2` size, centred, in a `surface` card with a hairline `ink` border, the
  currently spoken word in `accent`. Pages enter with a two-frame fade, no bounce or scale pop.
  Position in the lower third around 72 percent of height, clear of the title overlay at 30
  percent and of the distance counter that rides the ship.
- Words come from `alignment.json` only, so there is no second copy of the script to drift.
- The short's production notes say captions are added in post. This step replaces that: rendered
  captions are timed to the frame and restyled with the theme, which post cannot do. Update the
  note in `makassan_trade_route_short.md` when this lands.
- **Check:** scrubbing the Remotion studio frame by frame, each word appears on its onset frame,
  never before the voice says it, and no page is wider than the frame minus the side margins.

### 8. Wire voice and captions into the short (2 h)
- `pnpm voice:narrate <video>` and `pnpm voice:align <video>` scripts at the repo root shell into
  `uv run` and `tsx`, then copy `narration.wav` and `alignment.json` into
  `public/audio/shorts/<video>/`.
- `MakassanShort.tsx` loads both with `staticFile()`, plays narration via Remotion `Audio` from
  frame 0, derives beat start times from the manifest for the camera move and overlays, and sets
  `durationInFrames` from narration length plus a one second tail via `calculateMetadata`.
- Render `stories/shorts/makassan-trade-route/preview-beats-1-2.mp4` again, with sound.
- **Check:** voice, camera move and captions agree: the route starts drawing when beat 2 begins,
  "Makassar" appears as a caption at the moment the Makassar dot fades in, and the file plays with
  audio in QuickTime.

### 9. The rest of the short
- Only after 8 is signed off: `--beats 1-9`, re-check pace against the 55 to 60 s target, then
  build beats 3 to 9 in the composition against the manifest timings.

## Decisions to make along the way

- **Which model.** Guess: Turbo for quality and speed, Nano as the fast-iteration fallback. Multilingual V3 only if I ever narrate in another language or need better handling of Indonesian names.
- **MPS or CPU.** Decided by step 2's numbers, not by preference.
- **Reference length.** Decided by step 4 listening. Longer is not automatically better with zero-shot cloning.
- **Watermark.** PerTh is baked in and not something to strip. It does not affect quality; it means the audio is detectable as Chatterbox output, which is fine for a channel that will say so.
- **Caption grouping.** Single words read as frantic, full phrases read as subtitles. Start at one to three words (900 ms window) and judge on the beats 1 to 2 render.
- **Who follows whom.** Animation follows the voice. Beat times come from the narration manifest; the composition never hard-codes them once step 8 lands.
- **Caption placement.** Lower third is the Shorts convention and keeps the map's route visible. Confirm it does not collide with the distance counter at the end of beat 2.

## Risks

- **Archived project.** No upstream fixes. If a torch or transformers bump breaks it, we pin and stay pinned. The `uv.lock` is the guarantee.
- **MPS flakiness.** Mitigated by CPU fallback and by Nano's CPU performance.
- **Hallucinated words.** Mitigated by paragraph-level generation, seeds, and re-rolling single paragraphs.
- **Proper nouns.** Mitigated by the lexicon; may still need a human take for a few words, which `narrate.py` should allow by dropping a `paragraph-N.wav` override into the scene folder.
- **Whisper mis-hears a place name.** Mitigated by prompting with the script and snapping word text back to the script; timings survive even when the recognised spelling does not.
- **Caption and overlay collisions.** The short is dense in the lower half once the ship reaches Arnhem Land. Mitigated by fixed caption placement and a check in step 7; worst case the distance counter moves above the ship.
- **It just doesn't sound like me.** Then step 4 ends with a decision: fine-tune (out of scope for now), try a different open model (Kokoro has no cloning; F5-TTS and XTTS do), or record narration myself and use the pipeline only for alignment. Everything from step 5 on works unchanged with a human recording.

# Voice: plan for a local cloned narrator

Goal: record a short reference of my own voice, run Chatterbox locally on this Mac, and turn any
`direction.md` narration into a WAV in that voice, plus word timestamps for cueing scenes.

## What we are working with

| | |
|---|---|
| Machine | Apple M4 Max, 48 GB, macOS 26.7. No CUDA; PyTorch runs on MPS (Metal) or CPU. |
| Chatterbox | `chatterbox-tts` 0.1.7 on PyPI (Mar 2026). MIT. Resemble has **archived** the repo: code stays public, no support or updates. |
| Models | **Turbo** (350M, English, `[laugh]`-style tags, recommended for narration), **Nano** (110M, CPU, 3x realtime on 8 cores), **Multilingual V3** (500M, 23 languages), original **Chatterbox** (500M, `exaggeration` / `cfg_weight` controls). All do zero-shot cloning from a ~10 s reference clip. |
| Python | `uv` project on 3.11.17 with torch 2.6.0 (done). Chatterbox is pinned to GitHub commit `ab55923c27` rather than PyPI 0.1.7 because Nano only exists in master. `setuptools` is an explicit dependency: the `perth` watermarker imports `pkg_resources` and silently becomes `None` without it. |
| Apple Silicon | **Decided (step 2): CPU.** All nine model/device runs worked, but on the M4 Max CPU beat Metal for Turbo (0.44 vs 0.89 RTF) and Nano (0.21 vs 0.75). Only the original model was faster on Metal, and it is the slowest overall. Full table in `out/smoke/results.json`. |
| Output | 24 kHz mono WAV. Every file carries Resemble's PerTh watermark (imperceptible, survives MP3). |
| Audio tools | `ffmpeg` and `sox` are **not installed**. Need `brew install ffmpeg sox`. Remotion ships its own ffmpeg for render but not for the shell. |
| Alignment | `@remotion/install-whisper-cpp` 4.0.541 gives word-level timestamps locally via whisper.cpp, which is the `alignment.json` the handoff's `timing.ts` expects. |

## Layout

```
voice/
├── PLAN.md                 this file
├── README.md               how to run it, written once step 3 works
├── pyproject.toml          uv project pinning python + chatterbox (step 1)
├── reference/              my voice: raw recordings, trimmed clips, the chosen reference.wav
│   └── script.md           what to read when recording
├── scripts/
│   ├── record.sh           sox/ffmpeg capture from the built-in mic, 48 kHz mono
│   ├── prepare_ref.py      trim silence, normalise, resample to 24 kHz, export reference.wav
│   ├── smoke.py            load a model on mps or cpu, synthesise one sentence, time it
│   ├── narrate.py          direction.md -> paragraphs -> WAVs -> stitched narration.wav
│   └── align.ts            narration.wav -> alignment.json via whisper.cpp
└── out/                    generated audio (gitignored), one folder per video
```

The Python side is isolated in `voice/` with its own `uv` environment so Node and Python never share a toolchain. The Remotion pipeline only ever sees two files per video: `narration.wav` and `alignment.json`.

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

### 3. Record the reference (1 h, my time)
- Write `reference/script.md`: about 60 s of neutral documentary narration in my voice, in the register I want the channel to have. Include varied sentence lengths, a few numbers, a question, a place name or two. Chatterbox copies pace and tone from the clip, so read it the way I want every video to sound.
- Record with the built-in mic as a baseline, in a quiet room with soft furnishings, 48 kHz mono WAV, mouth about 20 cm off-axis. If I have a USB mic, record both and compare in step 4.
- Capture 3 to 4 takes; Chatterbox needs ~10 s but we'll test 10, 20 and 40 s clips.
- `prepare_ref.py`: trim leading/trailing silence, high-pass at 80 Hz, normalise peaks to -3 dBFS, resample to 24 kHz, write `reference.wav` candidates.
- **Check:** candidates sound like me and have no room echo, clipping or hum when listened to on headphones.

### 4. Clone quality pass (1 to 2 h)
- Synthesise the same two test paragraphs (scene 1 and scene 4 narration) with each reference candidate and each model (Turbo, original Chatterbox, Multilingual V3 with `language_id="en"`).
- For the original model, sweep `exaggeration` 0.3 to 0.7 and `cfg_weight` 0.3 to 0.5; the README says lower cfg slows pacing, higher exaggeration speeds it up.
- Listen for: similarity to me, pronunciation of Makassar, Marege', Yolŋu, Sulawesi, trepang; hallucinated or repeated words; pacing.
- **Check:** pick one model + one reference + one parameter set and freeze them in `narrate.py` as defaults. Save the comparison WAVs under `out/clone-tests/` with a short `notes.md` saying what won and why.

### 5. Narration generator (half a day)
- `narrate.py --video makassan-trade-route --scene 1` reads `stories/<video>/scenes/<n>/direction.md`, takes the `## Narration` section, splits into paragraphs, and synthesises each paragraph as its own WAV. Paragraph-level generation keeps the model stable (long inputs drift) and lets me regenerate one paragraph without redoing the scene.
- Pronunciation overrides: a small `voice/lexicon.json` mapping hard words to respellings substituted before synthesis (`Marege'` -> `Mah-reh-gay`, etc.). Tune by ear in step 4.
- Stitch paragraphs with a fixed pause (start at 600 ms, longer at chapter boundaries), peak-normalise, write `out/<video>/scene-<n>.wav`, and `--all` concatenates scenes into `out/<video>/narration.wav` with a scene manifest JSON (scene, paragraph, start, end).
- Deterministic: seed torch so re-running a paragraph gives the same take, and a `--seed` flag to roll a different one.
- Loudness: normalise to -16 LUFS integrated with ffmpeg `loudnorm` (dialogue level; the final mix goes to -14 LUFS at render).
- **Check:** scene 1 narration renders end to end, is listenable, and the manifest's paragraph boundaries match the audio.

### 6. Word alignment (2 h)
- `align.ts` uses `@remotion/install-whisper-cpp` to download whisper.cpp and the `medium.en` model, transcribes `narration.wav` with word timestamps, and normalises to the handoff's `{ words: [{ text, start, end }] }` shape in `alignment.json`.
- Feed whisper the known script as a prompt so it spells names our way, improving cue matching.
- **Check:** cue `"What if I told you"` resolves to roughly 0.0 s and `"Makassans"` in scene 3 lands within the scene 3 span from the manifest.

### 7. Wire into the video (1 h)
- Copy `narration.wav` and `alignment.json` into `videos/<id>/audio/` per the handoff layout; the Remotion pipeline reads them from there.
- Add `pnpm voice:narrate <id>` and `pnpm voice:align <id>` scripts that shell into `uv run` so the whole thing is one command from the repo root.
- **Check:** scene 1 preview renders with the narration track underneath and the caption card appears on its cued word.

## Decisions to make along the way

- **Which model.** Guess: Turbo for quality and speed, Nano as the fast-iteration fallback. Multilingual V3 only if I ever narrate in another language or need better handling of Indonesian names.
- **MPS or CPU.** Decided by step 2's numbers, not by preference.
- **Reference length.** Decided by step 4 listening. Longer is not automatically better with zero-shot cloning.
- **Watermark.** PerTh is baked in and not something to strip. It does not affect quality; it means the audio is detectable as Chatterbox output, which is fine for a channel that will say so.

## Risks

- **Archived project.** No upstream fixes. If a torch or transformers bump breaks it, we pin and stay pinned. The `uv.lock` is the guarantee.
- **MPS flakiness.** Mitigated by CPU fallback and by Nano's CPU performance.
- **Hallucinated words.** Mitigated by paragraph-level generation, seeds, and re-rolling single paragraphs.
- **Proper nouns.** Mitigated by the lexicon; may still need a human take for a few words, which `narrate.py` should allow by dropping a `paragraph-N.wav` override into the scene folder.
- **It just doesn't sound like me.** Then step 4 ends with a decision: fine-tune (out of scope for now), try a different open model (Kokoro has no cloning; F5-TTS and XTTS do), or record narration myself and use the pipeline only for alignment. Everything from step 5 on works unchanged with a human recording.

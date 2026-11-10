# voice

Local voice cloning and narration for the videos. Python, isolated from the Node side with `uv`.
Read `PLAN.md` for the step list, measurements and open decisions before changing anything here.

## Hard rules

- Run everything with `uv run` from this directory. Never `pip install`; dependencies live in
  `pyproject.toml` and `uv.lock`. Chatterbox is pinned to a git commit because the repo is archived
  and the Nano model only exists on master. `setuptools` stays a dependency: the watermarker imports
  `pkg_resources`.
- Device is CPU. MPS was measured slower for every model (see PLAN.md step 2). Do not switch
  without re-measuring.
- Default model is Turbo. Nano for fast iteration only; original Chatterbox only for parameter
  sweeps when Turbo is not good enough.
- `reference/raw/` and `reference/clips/` are personal voice recordings and gitignored. Never copy
  them elsewhere, upload them, or commit them. `reference/reference.wav` is the one tracked voice
  file and the only reference the pipeline reads.
- Generated audio goes under `out/` (gitignored). The Remotion side only ever consumes
  `out/<video>/narration.wav` and `alignment.json`.
- Seed every generate call (`torch.manual_seed`) so a re-run of one paragraph is reproducible.
- Audio is 24 kHz mono from the model. Do not resample inside scripts except at the final
  loudness step.

## Commands

```
voice/scripts/record.sh <name>           # record a take to reference/raw/<name>.wav, Ctrl-C to stop
uv run scripts/prepare_ref.py            # raw takes -> reference/clips/*-{full,10s,20s}.wav
uv run scripts/prepare_ref.py --pick X   # copy reference/clips/X.wav to reference/reference.wav
uv run scripts/clone_test.py             # every clip x two test paragraphs -> out/clone-tests/
uv run scripts/smoke.py                  # model/device benchmark -> out/smoke/results.json
```

## Changing the reference voice

Record new takes under new names, run `prepare_ref.py`, run `clone_test.py` including the current
reference as a control, then `--pick` the winner and commit `reference.wav`. Narration is not
regenerated automatically, so re-run it for the whole video rather than mixing voices mid-video.

## Where things live

- `reference/script.md` what to read when recording; the first paragraph is the 10 s window
- `scripts/` one script per pipeline stage, each with a usage docstring
- `out/clone-tests/notes.md` listening notes from the clone comparison
- Planned, not yet written: `scripts/narrate.py` (direction.md -> narration.wav + manifest) and
  `scripts/align.ts` (whisper.cpp word timestamps -> alignment.json)

## Gotchas

- Chatterbox conditions on roughly the first 10 s of the reference; longer clips add nothing.
- Turbo's `generate` accepts `audio_prompt_path`; `exaggeration` and `cfg_weight` are only
  meaningful on the original model.
- `rec` exits non-zero on Ctrl-C after writing a valid file; that is expected.

"""Synthesise the same test paragraphs with every reference candidate so they can be compared by ear.

Usage: uv run scripts/clone_test.py [--clips take-1-10s,take-2-20s,...] [--model turbo|original] [--device cpu]
Writes out/clone-tests/<clip>__<text>.wav and out/clone-tests/results.md.
"""
from __future__ import annotations

import argparse
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CLIPS = ROOT / "reference" / "clips"
OUT = ROOT / "out" / "clone-tests"

TEXTS = {
    "s1": (
        "What if I told you that Australia was already part of an international trading network "
        "long before the British arrived? For centuries, fleets of Indonesian sailing vessels travelled "
        "thousands of kilometres across the seas to northern Australia."
    ),
    "s4": (
        "The destination was a region the Makassans called Marege', referring to the northern Australian "
        "coast, particularly the Arnhem Land region. Typically, fleets departed Makassar around December, "
        "travelling south across the Indonesian archipelago and the Arafura Sea."
    ),
}


def load(name: str, device: str):
    if name == "turbo":
        from chatterbox.tts_turbo import ChatterboxTurboTTS

        return ChatterboxTurboTTS.from_pretrained(device=device)
    from chatterbox.tts import ChatterboxTTS

    return ChatterboxTTS.from_pretrained(device=device)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--clips", help="comma-separated clip names; default: every *-10s, *-20s plus the longest -full")
    ap.add_argument("--model", default="turbo")
    ap.add_argument("--device", default="cpu")
    args = ap.parse_args()

    if args.clips:
        clips = [CLIPS / f"{c}.wav" for c in args.clips.split(",")]
    else:
        clips = sorted(CLIPS.glob("*-10s.wav")) + sorted(CLIPS.glob("*-20s.wav"))
        fulls = sorted(CLIPS.glob("*-full.wav"), key=lambda p: p.stat().st_size)
        if fulls:
            clips.append(fulls[-1])

    import torch
    import torchaudio as ta

    OUT.mkdir(parents=True, exist_ok=True)
    model = load(args.model, args.device)
    rows = []
    for clip in clips:
        for key, text in TEXTS.items():
            torch.manual_seed(0)
            t0 = time.perf_counter()
            wav = model.generate(text, audio_prompt_path=str(clip))
            gen_s = time.perf_counter() - t0
            out = OUT / f"{clip.stem}__{key}.wav"
            ta.save(str(out), wav.cpu(), model.sr)
            audio_s = wav.shape[-1] / model.sr
            rows.append(f"| {clip.stem} | {key} | {audio_s:.1f} | {gen_s:.1f} | {out.relative_to(ROOT)} |")
            print(rows[-1], flush=True)

    table = "| reference | text | audio s | gen s | file |\n|---|---|---|---|---|\n" + "\n".join(rows)
    (OUT / "results.md").write_text(f"# Clone test: {args.model} on {args.device}\n\n{table}\n")
    print(f"\nwrote {OUT / 'results.md'}")


if __name__ == "__main__":
    main()

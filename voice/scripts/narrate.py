"""Synthesise a story's narration in the cloned voice, one WAV per beat, then stitch.

Usage:
  uv run scripts/narrate.py --story <path/to/story.md> [--beats 1,2 | 1-9] [--only 2] [--seed 0]
                            [--gap-ms 500] [--model turbo|original] [--device cpu]

Reads the `## Narration` section. Numbered items are beats (shorts); otherwise each paragraph is
a beat (longform direction.md). Writes to out/<kind>/<video>/ where the story lives at
stories/<kind>/<video>/...:
  beat-N.wav       one per beat, trimmed, raw model output otherwise
  narration.wav    beats joined with a fixed gap, -16 LUFS integrated
  manifest.json    beat texts and their start/end seconds inside narration.wav
--only regenerates just those beats and restitches with the existing files for the rest.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT.parent
REFERENCE = ROOT / "reference" / "reference.wav"
LEXICON = ROOT / "lexicon.json"
SR = 24_000
TRIM_DB = -45.0
LEAD_S, TAIL_S = 0.15, 0.25
TARGET_LUFS, TRUE_PEAK = -16.0, -1.5


def parse_beats(story: Path) -> list[str]:
    text = story.read_text()
    m = re.search(r"^## Narration\s*$(.*?)(?=^## |\Z)", text, re.M | re.S)
    if not m:
        sys.exit(f"no '## Narration' section in {story}")
    body = m.group(1)
    items = re.findall(r"^\s*\d+\.\s+(.+?)(?=^\s*\d+\.\s|\Z)", body, re.M | re.S)
    if not items:
        items = [p for p in re.split(r"\n\s*\n", body) if p.strip() and not p.strip().startswith(("*", "_", "<"))]
    clean = []
    for it in items:
        it = re.sub(r"\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_", lambda mm: next(g for g in mm.groups() if g), it)
        clean.append(" ".join(it.split()))
    return clean


def parse_selection(spec: str | None, n: int) -> list[int]:
    if not spec:
        return list(range(1, n + 1))
    out: list[int] = []
    for part in spec.split(","):
        if "-" in part:
            a, b = part.split("-")
            out.extend(range(int(a), int(b) + 1))
        else:
            out.append(int(part))
    bad = [i for i in out if not 1 <= i <= n]
    if bad:
        sys.exit(f"beats {bad} out of range 1..{n}")
    return out


def apply_lexicon(text: str, lexicon: dict[str, str]) -> str:
    for word, said in lexicon.items():
        text = re.sub(rf"(?<!\w){re.escape(word)}(?!\w)", said, text)
    return text


def trim(audio: np.ndarray) -> np.ndarray:
    n = int(0.02 * SR)
    frames = audio[: len(audio) // n * n].reshape(-1, n)
    db = 20 * np.log10(np.sqrt((frames**2).mean(axis=1)) + 1e-9)
    loud = np.flatnonzero(db > TRIM_DB)
    if loud.size == 0:
        return audio
    start = max(0, loud[0] * n - int(LEAD_S * SR))
    end = min(len(audio), (loud[-1] + 1) * n + int(TAIL_S * SR))
    return audio[start:end]


def load_model(name: str, device: str):
    if name == "turbo":
        from chatterbox.tts_turbo import ChatterboxTurboTTS

        return ChatterboxTurboTTS.from_pretrained(device=device)
    from chatterbox.tts import ChatterboxTTS

    return ChatterboxTTS.from_pretrained(device=device)


def synthesise(model, text: str, seed: int) -> np.ndarray:
    import torch

    torch.manual_seed(seed)
    wav = model.generate(text, audio_prompt_path=str(REFERENCE))
    assert model.sr == SR, f"model sample rate {model.sr} != {SR}"
    return trim(wav.squeeze(0).cpu().numpy().astype(np.float32))


def loudnorm(src: Path, dst: Path) -> None:
    """Two-pass ffmpeg loudnorm so the gain is linear, not pumping."""
    base = f"loudnorm=I={TARGET_LUFS}:TP={TRUE_PEAK}:LRA=11"
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-af", f"{base}:print_format=json", "-f", "null", "-"], capture_output=True, text=True, check=True)
    start = p.stderr.index("{", p.stderr.index("Parsed_loudnorm"))
    m, _ = json.JSONDecoder().raw_decode(p.stderr, start)
    measured = ":".join(f"measured_{k}={m['input_' + k.lower()]}" for k in ("I", "TP", "LRA", "thresh")) + f":offset={m['target_offset']}:linear=true"
    subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-y", "-i", str(src), "-af", f"{base}:{measured}", "-ar", str(SR), "-c:a", "pcm_s16le", str(dst)], check=True, capture_output=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--story", required=True, type=Path)
    ap.add_argument("--beats", help="e.g. 1,2 or 1-9; default all")
    ap.add_argument("--only", help="regenerate only these beats, reuse files for the rest")
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--gap-ms", type=int, default=500)
    ap.add_argument("--model", default="turbo")
    ap.add_argument("--device", default="cpu")
    args = ap.parse_args()

    story = args.story if args.story.is_absolute() else (Path.cwd() / args.story)
    if not story.exists():
        story = REPO / args.story
    story = story.resolve()
    if not REFERENCE.exists():
        sys.exit("no reference/reference.wav; run prepare_ref.py --pick first")
    rel = story.relative_to(REPO / "stories").parts  # (kind, video, file)
    out = ROOT / "out" / rel[0] / rel[1]
    out.mkdir(parents=True, exist_ok=True)

    beats = parse_beats(story)
    selected = parse_selection(args.beats, len(beats))
    to_generate = parse_selection(args.only, len(beats)) if args.only else selected
    lexicon = json.loads(LEXICON.read_text()) if LEXICON.exists() else {}

    model = load_model(args.model, args.device) if to_generate else None
    clips: dict[int, np.ndarray] = {}
    for n in selected:
        path = out / f"beat-{n}.wav"
        if n in to_generate:
            text = apply_lexicon(beats[n - 1], lexicon)
            t0 = time.perf_counter()
            audio = synthesise(model, text, args.seed + n)
            sf.write(path, audio, SR, subtype="PCM_16")
            words = len(beats[n - 1].split())
            print(f"beat {n}: {len(audio)/SR:5.1f} s  {words} words  {words/(len(audio)/SR)*60:4.0f} wpm  gen {time.perf_counter()-t0:4.1f} s", flush=True)
        elif path.exists():
            audio, sr = sf.read(path, dtype="float32")
            assert sr == SR
        else:
            sys.exit(f"{path} missing; drop --only or include beat {n} in it")
        clips[n] = audio

    gap = np.zeros(int(args.gap_ms / 1000 * SR), dtype=np.float32)
    parts, manifest_beats, pos = [], [], 0.0
    for i, n in enumerate(selected):
        if i:
            parts.append(gap)
            pos += len(gap) / SR
        a = clips[n]
        manifest_beats.append({"n": n, "text": beats[n - 1], "file": f"beat-{n}.wav", "start": round(pos, 3), "end": round(pos + len(a) / SR, 3)})
        parts.append(a)
        pos += len(a) / SR
    joined = np.concatenate(parts)
    joined *= 10 ** (-3 / 20) / max(np.abs(joined).max(), 1e-9)

    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        sf.write(tmp.name, joined, SR, subtype="PCM_16")
        loudnorm(Path(tmp.name), out / "narration.wav")

    manifest = {
        "video": rel[1],
        "story": str(story.relative_to(REPO)),
        "model": args.model,
        "device": args.device,
        "reference": REFERENCE.name,
        "reference_sha256": hashlib.sha256(REFERENCE.read_bytes()).hexdigest()[:12],
        "seed": args.seed,
        "gap_ms": args.gap_ms,
        "sample_rate": SR,
        "duration": round(len(joined) / SR, 3),
        "beats": manifest_beats,
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    # the Remotion side reads these through staticFile(), so publish a copy under public/
    public = REPO / "public" / "audio" / rel[0] / rel[1]
    public.mkdir(parents=True, exist_ok=True)
    for name in ("narration.wav", "manifest.json"):
        shutil.copy(out / name, public / name)
    print(f"\n{out.relative_to(ROOT)}/narration.wav  {manifest['duration']:.1f} s, {len(selected)} beats  (copied to {public.relative_to(REPO)})")
    for b in manifest_beats:
        print(f"  beat {b['n']}  {b['start']:6.2f} -> {b['end']:6.2f}  {b['text'][:60]}")


if __name__ == "__main__":
    main()

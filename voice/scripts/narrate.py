"""Synthesise a story's narration in the cloned voice, one WAV per beat, then stitch.

Driven by `pnpm narrate <video>` (scripts/short.ts); see docs/PIPELINE.md. Direct use:
  uv run scripts/narrate.py --story <story.md> --out <dir> [--beats 1,2|1-9] [--only 3] [--seed N]
                            [--gap-ms 500] [--model turbo|original] [--device cpu] [--max-wpm 150] [--force]

Reads the `## Narration` section: numbered items are beats, otherwise each paragraph is one.
Writes beat-N.wav, narration.wav (-16 LUFS) and manifest.json into --out. A beat is reused when
its hash (text as sent to the model, seed, model, reference voice) matches the previous manifest
and its WAV exists; --force regenerates everything selected.

Seeds: beat n uses `base + n`. Without --seed, beats keep the seed they were last made with.
--seed N re-takes every selected beat with base N. --only restricts regeneration to those beats;
with --only and no --seed, each gets its previous seed + 1, i.e. "another take".
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
    if not clean:
        sys.exit(f"the '## Narration' section of {story} has no beats")
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
        sys.exit(f"beats {bad} out of range; the script has {n} beats")
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
    """Two-pass ffmpeg loudnorm so the gain is linear, not pumping. ffmpeg 9 prints lower-case keys."""
    base = f"loudnorm=I={TARGET_LUFS}:TP={TRUE_PEAK}:LRA=11"
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-af", f"{base}:print_format=json", "-f", "null", "-"], capture_output=True, text=True, check=True)
    start = p.stderr.index("{", p.stderr.index("Parsed_loudnorm"))
    m, _ = json.JSONDecoder().raw_decode(p.stderr, start)
    measured = ":".join(f"measured_{k}={m['input_' + k.lower()]}" for k in ("I", "TP", "LRA", "thresh")) + f":offset={m['target_offset']}:linear=true"
    subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-y", "-i", str(src), "-af", f"{base}:{measured}", "-ar", str(SR), "-c:a", "pcm_s16le", str(dst)], check=True, capture_output=True)


def beat_hash(sent_text: str, seed: int, model: str, reference_sha: str) -> str:
    return hashlib.sha256(f"{sent_text}\n{seed}\n{model}\n{reference_sha}".encode()).hexdigest()[:16]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--story", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--beats", help="e.g. 1,2 or 1-9; default all")
    ap.add_argument("--only", help="regenerate only these beats, reuse files for the rest")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--gap-ms", type=int, default=500)
    ap.add_argument("--model", default="turbo")
    ap.add_argument("--device", default="cpu")
    ap.add_argument("--max-wpm", type=float, default=150)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    if not REFERENCE.exists():
        sys.exit("no reference/reference.wav; run prepare_ref.py --pick first")
    story = args.story.resolve()
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)

    beats = parse_beats(story)
    selected = parse_selection(args.beats, len(beats))
    only = set(parse_selection(args.only, len(beats))) if args.only else set()
    lexicon = json.loads(LEXICON.read_text()) if LEXICON.exists() else {}
    reference_sha = hashlib.sha256(REFERENCE.read_bytes()).hexdigest()[:12]

    manifest_path = out / "manifest.json"
    old: dict[int, dict] = {}
    if manifest_path.exists():
        old = {b["n"]: b for b in json.loads(manifest_path.read_text()).get("beats", [])}
    base_seed = args.seed if args.seed is not None else 0

    # decide, per beat, the seed and whether its WAV can be reused
    plan: list[tuple[int, str, int, str, bool]] = []  # (n, sent_text, seed, hash, regenerate)
    for n in selected:
        sent = apply_lexicon(beats[n - 1], lexicon)
        prev = old.get(n)
        if n in only:
            seed = (base_seed + n) if args.seed is not None else (prev["seed"] + 1 if prev and "seed" in prev else n + 1)
        elif args.seed is not None:
            seed = base_seed + n
        else:
            seed = prev["seed"] if prev and "seed" in prev else n
        h = beat_hash(sent, seed, args.model, reference_sha)
        wav = out / f"beat-{n}.wav"
        reusable = prev is not None and prev.get("hash") == h and wav.exists() and not args.force and n not in only
        if n in only and not wav.exists() and prev is None:
            sys.exit(f"--only {n}: beat-{n}.wav does not exist yet; run without --only first")
        plan.append((n, sent, seed, h, not reusable))

    to_make = [p for p in plan if p[4]]
    old_manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    same_shape = [(b["n"], b.get("hash"), b.get("seed")) for b in old_manifest.get("beats", [])] == [(n, h, seed) for n, _, seed, h, _ in plan]
    if not to_make and same_shape and old_manifest.get("gap_ms") == args.gap_ms and (out / "narration.wav").exists():
        print(f"all {len(plan)} beats unchanged, narration.wav kept ({old_manifest.get('duration', 0):.1f} s)")
        return
    model = load_model(args.model, args.device) if to_make else None
    clips: dict[int, np.ndarray] = {}
    for n, sent, seed, h, regenerate in plan:
        path = out / f"beat-{n}.wav"
        if regenerate:
            t0 = time.perf_counter()
            audio = synthesise(model, sent, seed)
            sf.write(path, audio, SR, subtype="PCM_16")
            words = len(beats[n - 1].split())
            wpm = words / (len(audio) / SR) * 60
            flag = "  (fast)" if wpm > args.max_wpm else ""
            print(f"beat {n}: {len(audio)/SR:5.1f} s  {words:2d} words  {wpm:4.0f} wpm  seed {seed}  gen {time.perf_counter()-t0:4.1f} s{flag}", flush=True)
        else:
            audio, sr = sf.read(path, dtype="float32")
            assert sr == SR
            print(f"beat {n}: reused (seed {seed})", flush=True)
        clips[n] = audio

    gap = np.zeros(int(args.gap_ms / 1000 * SR), dtype=np.float32)
    parts, manifest_beats, pos = [], [], 0.0
    for i, (n, sent, seed, h, _) in enumerate(plan):
        if i:
            parts.append(gap)
            pos += len(gap) / SR
        a = clips[n]
        manifest_beats.append({"n": n, "text": beats[n - 1], "file": f"beat-{n}.wav", "start": round(pos, 3), "end": round(pos + len(a) / SR, 3), "seed": seed, "hash": h})
        parts.append(a)
        pos += len(a) / SR
    joined = np.concatenate(parts)
    joined *= 10 ** (-3 / 20) / max(np.abs(joined).max(), 1e-9)

    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        sf.write(tmp.name, joined, SR, subtype="PCM_16")
        loudnorm(Path(tmp.name), out / "narration.wav")

    manifest = {
        "story": str(story),
        "model": args.model,
        "device": args.device,
        "reference": REFERENCE.name,
        "reference_sha256": reference_sha,
        "gap_ms": args.gap_ms,
        "sample_rate": SR,
        "duration": round(len(joined) / SR, 3),
        "beats": manifest_beats,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    total_words = sum(len(beats[n - 1].split()) for n in selected)
    print(f"narration.wav  {manifest['duration']:.1f} s, {len(selected)} beats, {total_words} words, {total_words / manifest['duration'] * 60:.0f} wpm overall")


if __name__ == "__main__":
    main()

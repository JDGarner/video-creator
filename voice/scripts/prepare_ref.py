"""Turn raw takes into Chatterbox reference candidates.

For each reference/raw/*.wav: high-pass 80 Hz, resample to 24 kHz mono, trim to the spoken
part (with a little room tone either side), peak-normalise to -3 dBFS and write
reference/clips/<take>-full.wav plus <take>-10s.wav and <take>-20s.wav cut at the nearest
pause. Chatterbox conditions on roughly the first 10 s, so the short clips are what matter.

Usage: uv run scripts/prepare_ref.py [raw.wav ...] [--pick <clip-name>]
  --pick copies reference/clips/<clip-name>.wav to reference/reference.wav
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "reference" / "raw"
CLIPS = ROOT / "reference" / "clips"

SR = 24_000
FRAME_S = 0.02
PEAK_DBFS = -3.0
LEAD_S, TAIL_S = 0.25, 0.4
WINDOWS_S = (10, 20)
PAUSE_SEARCH_S = 2.0  # how far either side of a window length to look for a pause
MIN_PAUSE_FRAMES = 8  # 160 ms


def sox_load(path: Path) -> np.ndarray:
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        subprocess.run(
            ["sox", str(path), "-r", str(SR), "-c", "1", "-b", "16", tmp.name, "highpass", "80", "rate", "-v", str(SR)],
            check=True,
        )
        audio, sr = sf.read(tmp.name, dtype="float32")
    assert sr == SR
    return audio


def frame_db(audio: np.ndarray) -> np.ndarray:
    n = int(FRAME_S * SR)
    frames = audio[: len(audio) // n * n].reshape(-1, n)
    rms = np.sqrt((frames**2).mean(axis=1)) + 1e-9
    return 20 * np.log10(rms)


def speech_bounds(db: np.ndarray) -> tuple[int, int, float, float]:
    """Return (first_frame, last_frame, noise_floor_db, threshold_db)."""
    floor = float(np.percentile(db, 10))
    thresh = max(floor + 12, -48.0)
    loud = db > thresh
    # require 5 consecutive frames (100 ms) so a click doesn't count as speech
    run = np.convolve(loud.astype(int), np.ones(5, dtype=int), mode="same") >= 5
    idx = np.flatnonzero(run)
    if idx.size == 0:
        raise SystemExit("no speech found")
    return int(idx[0]), int(idx[-1]), floor, thresh


def nearest_pause(db: np.ndarray, target_frame: int, thresh: float) -> int:
    """Centre of the >=160 ms pause nearest to target; falls back to target."""
    span = int(PAUSE_SEARCH_S / FRAME_S)
    lo, hi = max(0, target_frame - span), min(len(db), target_frame + span)
    quiet = db[lo:hi] < thresh
    best, run_start = None, None
    for i, q in enumerate(list(quiet) + [False]):
        if q and run_start is None:
            run_start = i
        elif not q and run_start is not None:
            if i - run_start >= MIN_PAUSE_FRAMES:
                centre = lo + (run_start + i) // 2
                if best is None or abs(centre - target_frame) < abs(best - target_frame):
                    best = centre
            run_start = None
    return target_frame if best is None else best


def normalise(audio: np.ndarray) -> np.ndarray:
    peak = np.abs(audio).max()
    return audio * (10 ** (PEAK_DBFS / 20) / peak) if peak > 0 else audio


def write(path: Path, audio: np.ndarray) -> None:
    sf.write(path, normalise(audio), SR, subtype="PCM_16")


def prepare(raw: Path) -> list[str]:
    audio = sox_load(raw)
    db = frame_db(audio)
    first, last, floor, thresh = speech_bounds(db)
    n = int(FRAME_S * SR)
    start = max(0, first * n - int(LEAD_S * SR))
    end = min(len(audio), (last + 1) * n + int(TAIL_S * SR))
    speech = audio[start:end]
    speech_db = db[first : last + 1]
    speech_rms = float(20 * np.log10(np.sqrt((speech**2).mean()) + 1e-9))

    name = raw.stem
    write(CLIPS / f"{name}-full.wav", speech)
    rows = [f"| {name}-full | {len(speech)/SR:5.1f} s | {floor:6.1f} | {speech_rms:6.1f} | {float(np.percentile(speech_db, 95)):6.1f} |"]

    db_speech = db[first:]
    for w in WINDOWS_S:
        if len(speech) / SR < w + 2:
            continue
        cut_frame = nearest_pause(db_speech, int(w / FRAME_S), thresh)
        clip = speech[: cut_frame * n + int(LEAD_S * SR)]
        write(CLIPS / f"{name}-{w}s.wav", clip)
        rows.append(f"| {name}-{w}s | {len(clip)/SR:5.1f} s | | | |")
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("raw", nargs="*", type=Path)
    ap.add_argument("--pick", help="clip name (without .wav) to copy to reference/reference.wav")
    args = ap.parse_args()

    if args.pick:
        src = CLIPS / f"{args.pick}.wav"
        if not src.exists():
            sys.exit(f"no such clip: {src}")
        shutil.copy(src, ROOT / "reference" / "reference.wav")
        print(f"reference/reference.wav <- {src.name}")
        return

    raws = args.raw or sorted(RAW.glob("*.wav"))
    if not raws:
        sys.exit(f"no takes in {RAW}")
    CLIPS.mkdir(parents=True, exist_ok=True)
    print("| clip | length | noise floor dBFS | speech RMS dBFS | speech p95 dBFS |")
    print("|---|---|---|---|---|")
    for raw in raws:
        print("\n".join(prepare(raw)))


if __name__ == "__main__":
    main()

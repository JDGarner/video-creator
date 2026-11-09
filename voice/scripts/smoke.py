"""Load Chatterbox models with the built-in voice, synthesise one sentence per device, time it.

Usage: uv run scripts/smoke.py [--models turbo,nano,original] [--devices mps,cpu]
Writes WAVs and a results table to out/smoke/.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import traceback
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "out" / "smoke"
TEXT = (
    "Long before the first European ships reached the north coast of Australia, "
    "fleets from Sulawesi were already crossing the Arafura Sea every year."
)


def load(name: str, device: str):
    import torch

    torch.manual_seed(0)
    if name == "turbo":
        from chatterbox.tts_turbo import ChatterboxTurboTTS

        return ChatterboxTurboTTS.from_pretrained(device=device)
    if name == "nano":
        from chatterbox.tts_turbo import ChatterboxTurboTTS

        return ChatterboxTurboTTS.from_pretrained(device=device, nano=True)
    if name == "original":
        from chatterbox.tts import ChatterboxTTS

        return ChatterboxTTS.from_pretrained(device=device)
    raise ValueError(name)


def run(name: str, device: str, fallback: bool) -> dict:
    import torch
    import torchaudio as ta

    label = f"{name}-{device}{'-fallback' if fallback else ''}"
    rec: dict = {"model": name, "device": device, "mps_fallback": fallback}
    try:
        t0 = time.perf_counter()
        model = load(name, device)
        rec["load_s"] = round(time.perf_counter() - t0, 1)

        # warm-up: first generate pays one-off costs we don't want in the number
        model.generate("Warm up.")
        if device == "mps":
            torch.mps.synchronize()

        t1 = time.perf_counter()
        wav = model.generate(TEXT)
        if device == "mps":
            torch.mps.synchronize()
        gen_s = time.perf_counter() - t1
        audio_s = wav.shape[-1] / model.sr
        rec.update(gen_s=round(gen_s, 2), audio_s=round(audio_s, 2), rtf=round(gen_s / audio_s, 2), sr=model.sr, ok=True)
        ta.save(str(OUT / f"{label}.wav"), wav.cpu(), model.sr)
    except Exception as e:  # noqa: BLE001
        rec.update(ok=False, error=f"{type(e).__name__}: {str(e).splitlines()[0][:160]}")
        (OUT / f"{label}.error.txt").write_text(traceback.format_exc())
    return rec


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", default="turbo,nano,original")
    ap.add_argument("--devices", default="mps,cpu")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)

    # One process per (model, device) so an MPS crash or env var can't leak into the next run.
    if os.environ.get("SMOKE_CHILD"):
        name, device, fb = os.environ["SMOKE_CHILD"].split(":")
        print(json.dumps(run(name, device, fb == "1")))
        return

    import subprocess

    results = []
    for name in args.models.split(","):
        for device in args.devices.split(","):
            variants = [(device, False)]
            if device == "mps":
                variants.append(("mps", True))
            for dev, fb in variants:
                env = {**os.environ, "SMOKE_CHILD": f"{name}:{dev}:{1 if fb else 0}"}
                if fb:
                    env["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"
                print(f"== {name} on {dev}{' (fallback)' if fb else ''}", flush=True)
                p = subprocess.run([sys.executable, __file__], env=env, capture_output=True, text=True)
                line = [l for l in p.stdout.splitlines() if l.startswith("{")]
                rec = json.loads(line[-1]) if line else {"model": name, "device": dev, "mps_fallback": fb, "ok": False, "error": (p.stderr.strip().splitlines() or ["no output"])[-1][:160]}
                results.append(rec)
                print("   ", {k: v for k, v in rec.items() if k not in ("model", "device", "mps_fallback")}, flush=True)

    (OUT / "results.json").write_text(json.dumps(results, indent=2))
    print("\n| model | device | fallback | load s | gen s | audio s | RTF | status |")
    print("|---|---|---|---|---|---|---|---|")
    for r in results:
        status = "ok" if r.get("ok") else r.get("error", "failed")
        print(f"| {r['model']} | {r['device']} | {'yes' if r['mps_fallback'] else ''} | {r.get('load_s','')} | {r.get('gen_s','')} | {r.get('audio_s','')} | {r.get('rtf','')} | {status} |")


if __name__ == "__main__":
    main()

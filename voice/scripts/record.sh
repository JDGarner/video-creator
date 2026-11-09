#!/usr/bin/env bash
# Record one reference take from the default mic. Ctrl-C to stop.
# Usage: voice/scripts/record.sh [name]   -> reference/raw/<name>.wav
set -euo pipefail
cd "$(dirname "$0")/.."

name="${1:-take-$(date +%Y%m%d-%H%M%S)}"
out="reference/raw/${name}.wav"
mkdir -p reference/raw
if [ -e "$out" ]; then
  echo "refusing to overwrite $out" >&2
  exit 1
fi

echo "Recording to $out  (48 kHz, mono, 24-bit)"
echo "Stay silent for 2 s, read the script, stay silent 2 s, then Ctrl-C."
echo "Aim for peaks around the middle of the meter, never the far right."
echo
# sox finalises the WAV header on SIGINT; the non-zero exit is expected.
rec -r 48000 -c 1 -b 24 "$out" || true
echo

dur=$(soxi -D "$out")
stats=$(sox "$out" -n stat 2>&1)
peak=$(echo "$stats" | awk '/Maximum amplitude/ {print $3}')
trough=$(echo "$stats" | awk '/Minimum amplitude/ {print $3}')
rms=$(echo "$stats" | awk '/RMS +amplitude/ {print $3}')
peak_abs=$(python3 -c "print(max(abs($peak), abs($trough)))")

printf "duration  %.1f s\npeak      %.3f\nrms       %.3f\n" "$dur" "$peak_abs" "$rms"
python3 - "$peak_abs" "$rms" <<'PY'
import sys
peak, rms = map(float, sys.argv[1:])
if peak >= 0.99:
    print("WARNING: clipped. Lower the input volume in System Settings > Sound and re-record.")
elif peak < 0.1:
    print("WARNING: very quiet. Raise input volume or move closer to the mic.")
else:
    print("levels OK")
PY

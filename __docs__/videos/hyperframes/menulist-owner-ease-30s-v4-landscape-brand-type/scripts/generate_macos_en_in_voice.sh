#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 4 ]]; then
  echo "Usage: $0 <script.txt> <out-dir> <voice> <rate>" >&2
  exit 2
fi

SCRIPT_FILE="$1"
OUT_DIR="$2"
VOICE="$3"
RATE="$4"

mkdir -p "$OUT_DIR"

SAFE_VOICE="$(printf '%s' "$VOICE" | tr '[:upper:] ' '[:lower:]-' | tr -cd '[:alnum:]-')"
TMP_TEXT="$(mktemp)"
AIFF_OUT="$OUT_DIR/voice-macos-en-in-${SAFE_VOICE}-${RATE}.aiff"
WAV_OUT="$OUT_DIR/voice-macos-en-in-${SAFE_VOICE}-${RATE}.wav"

perl -0pe 's/MenuList/Menu List/g; s/\bQR\b/Q R/g; s/\bPDF\b/P D F/g; s/customer link/customer link/g;' "$SCRIPT_FILE" > "$TMP_TEXT"

say -v "$VOICE" -r "$RATE" -o "$AIFF_OUT" -f "$TMP_TEXT"
ffmpeg -y -hide_banner -loglevel error -i "$AIFF_OUT" -ar 48000 -ac 2 "$WAV_OUT"

rm -f "$TMP_TEXT"

printf '%s\n' "$WAV_OUT"

#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  printf 'Usage: %s <video.mp4>\n' "$0" >&2
  exit 2
fi

VIDEO="$1"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
QA_DIR="$PROJECT_DIR/qa"
FRAME_DIR="$QA_DIR/frames"
mkdir -p "$FRAME_DIR"

ffprobe -v error -show_streams -show_format -of json "$VIDEO" > "$QA_DIR/ffprobe.json"
ffmpeg -hide_banner -i "$VIDEO" -vf blackdetect=d=0.12:pix_th=0.97 -an -f null - 2> "$QA_DIR/blackdetect.log" || true
ffmpeg -hide_banner -i "$VIDEO" -af silencedetect=n=-50dB:d=0.20 -vn -f null - 2> "$QA_DIR/silencedetect.log" || true
ffmpeg -hide_banner -i "$VIDEO" -af ebur128=peak=true -vn -f null - 2> "$QA_DIR/loudness.log" || true

for stamp in 0.00 2.80 5.30 8.00 10.80 14.20 17.00 19.80 22.80 25.40 27.20 29.90; do
  ffmpeg -hide_banner -loglevel error -y -ss "$stamp" -i "$VIDEO" -frames:v 1 "$FRAME_DIR/frame-${stamp}.png"
done

ffmpeg -hide_banner -loglevel error -y \
  -i "$FRAME_DIR/frame-0.00.png" -i "$FRAME_DIR/frame-2.80.png" -i "$FRAME_DIR/frame-5.30.png" -i "$FRAME_DIR/frame-8.00.png" \
  -i "$FRAME_DIR/frame-10.80.png" -i "$FRAME_DIR/frame-14.20.png" -i "$FRAME_DIR/frame-17.00.png" -i "$FRAME_DIR/frame-19.80.png" \
  -i "$FRAME_DIR/frame-22.80.png" -i "$FRAME_DIR/frame-25.40.png" -i "$FRAME_DIR/frame-27.20.png" -i "$FRAME_DIR/frame-29.90.png" \
  -filter_complex "[0:v]scale=480:270[a0];[1:v]scale=480:270[a1];[2:v]scale=480:270[a2];[3:v]scale=480:270[a3];[4:v]scale=480:270[a4];[5:v]scale=480:270[a5];[6:v]scale=480:270[a6];[7:v]scale=480:270[a7];[8:v]scale=480:270[a8];[9:v]scale=480:270[a9];[10:v]scale=480:270[a10];[11:v]scale=480:270[a11];[a0][a1][a2][a3]hstack=4[r0];[a4][a5][a6][a7]hstack=4[r1];[a8][a9][a10][a11]hstack=4[r2];[r0][r1][r2]vstack=3" \
  "$QA_DIR/contact-sheet.png"

rm -rf "$FRAME_DIR"

printf 'QA evidence written to %s\n' "$QA_DIR"

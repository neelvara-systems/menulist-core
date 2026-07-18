#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$PROJECT_DIR/../../../.." && pwd)"
VIDEO="$PROJECT_DIR/deliverables/menulist-owner-ease-30s-lyria-midnight-lofi-v1.mp4"
FONT="$REPO_ROOT/src/fonts/local/inter-latin-variable.woff2"
OUT_DIR="$PROJECT_DIR/storyboard"
FRAME_DIR="$OUT_DIR/frames"

for command in ffmpeg ffprobe; do
  command -v "$command" >/dev/null 2>&1 || {
    printf 'Missing required command: %s\n' "$command" >&2
    exit 1
  }
done

for input in "$VIDEO" "$FONT"; do
  [[ -f "$input" ]] || {
    printf 'Missing required input: %s\n' "$input" >&2
    exit 1
  }
done

mkdir -p "$FRAME_DIR"

times=(
  "0.0"
  "3.8"
  "4.8"
  "8.2"
  "11.2"
  "14.4"
  "18.8"
  "22.4"
  "25.4"
  "29.5"
)

ranges=(
  "00:00 - 00:02"
  "00:02 - 00:04"
  "00:04 - 00:07"
  "00:07 - 00:10"
  "00:10 - 00:13"
  "00:13 - 00:16"
  "00:16 - 00:20"
  "00:20 - 00:23"
  "00:23 - 00:27"
  "00:27 - 00:30"
)

slugs=(
  "brand-lockup"
  "owner-relief-hook"
  "upload-options"
  "preview-prepared"
  "private-preview"
  "review-and-approve"
  "approved-link-hub"
  "supported-surfaces"
  "ready-for-customers"
  "final-lockup"
)

frames=()

for index in "${!times[@]}"; do
  number="$(printf '%02d' "$((index + 1))")"
  escaped_range="${ranges[$index]//:/\\:}"
  frame="$FRAME_DIR/${number}-${slugs[$index]}.jpg"

  ffmpeg -hide_banner -loglevel error -y \
    -ss "${times[$index]}" \
    -i "$VIDEO" \
    -frames:v 1 \
    -vf "drawbox=x=36:y=36:w=96:h=58:color=0x0051d1@0.96:t=fill,drawtext=fontfile='$FONT':text='$number':fontcolor=white:fontsize=30:x=57:y=48,drawbox=x=36:y=994:w=270:h=50:color=0x0051d1@0.96:t=fill,drawtext=fontfile='$FONT':text='$escaped_range':fontcolor=white:fontsize=24:x=54:y=1004" \
    -q:v 2 \
    "$frame"

  frames+=("$frame")
done

inputs=()
filter=""
layout=""

for index in "${!frames[@]}"; do
  inputs+=("-i" "${frames[$index]}")
  filter+="[$index:v]scale=368:207,setpts=PTS-STARTPTS[k$index];"
  column="$((index % 5))"
  row="$((index / 5))"
  x="$((column * 384))"
  y="$((row * 223))"
  if [[ -n "$layout" ]]; then
    layout+="|"
  fi
  layout+="${x}_${y}"
done

filter+="[k0][k1][k2][k3][k4][k5][k6][k7][k8][k9]xstack=inputs=10:layout=$layout:fill=0xf8fafc[grid];"
filter+="[grid]pad=1920:600:8:90:color=0xf8fafc,drawtext=fontfile='$FONT':text='MenuList - Owner Ease 30s Storyboard':fontcolor=0x0f172a:fontsize=38:x=32:y=24,drawtext=fontfile='$FONT':text='Owner menu to private preview to approval to one customer link':fontcolor=0x475569:fontsize=22:x=32:y=558[keyboard]"

ffmpeg -hide_banner -loglevel error -y \
  "${inputs[@]}" \
  -filter_complex "$filter" \
  -map "[keyboard]" \
  -frames:v 1 \
  -q:v 2 \
  "$OUT_DIR/storyboard-keyframes-10-frame.jpg"

ffmpeg -hide_banner -loglevel error -y \
  -i "$VIDEO" \
  -vf "fps=2/3,scale=360:203,drawbox=x=10:y=10:w=58:h=34:color=0x0051d1@0.96:t=fill,drawtext=fontfile='$FONT':text='%{eif\\:n+1\\:d\\:2}':fontcolor=white:fontsize=19:x=21:y=16,drawbox=x=10:y=163:w=170:h=30:color=0x0051d1@0.96:t=fill,drawtext=fontfile='$FONT':text='%{pts\\:hms}':fontcolor=white:fontsize=15:x=20:y=168,tile=5x4:padding=12:margin=12:color=0xf8fafc,pad=1920:980:24:72:color=0xf8fafc,drawtext=fontfile='$FONT':text='MenuList - 30s Motion Progression Board':fontcolor=0x0f172a:fontsize=38:x=32:y=20,drawtext=fontfile='$FONT':text='20 sampled states at 1.5 second intervals':fontcolor=0x475569:fontsize=22:x=32:y=946" \
  -frames:v 1 \
  -q:v 2 \
  "$OUT_DIR/storyboard-motion-progression-20-frame.jpg"

printf 'Created %s\n' "$OUT_DIR/storyboard-keyframes-10-frame.jpg"
printf 'Created %s\n' "$OUT_DIR/storyboard-motion-progression-20-frame.jpg"
printf 'Created %s individual storyboard frames in %s\n' "${#frames[@]}" "$FRAME_DIR"

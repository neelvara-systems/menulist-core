#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VOICE="$PROJECT_DIR/assets/audio/voice-macos-en-in-tara-192-selected-processed.wav"
BRAND_AUDIO_DIR="$PROJECT_DIR/../../brand-audio"
SOURCE_DIR="$BRAND_AUDIO_DIR/source-tracks/lyria-realtime-midnight-lo-fi-focus-auto-20260712-124940"
SOURCE="$SOURCE_DIR/midnight-lo-fi-focus-seed-auto-20260712-124940.wav"
SHARED_BED="$BRAND_AUDIO_DIR/mix/menulist-brand-bed-30s-lyria-midnight-lofi-v1.wav"
STING="$BRAND_AUDIO_DIR/sfx/menulist-approval-sting-original-v1.wav"
WORK_DIR="$PROJECT_DIR/renders/work-audio"
DUCKED="$WORK_DIR/owner-ease-30s-lyria-midnight-lofi-v1-ducked.wav"
PREMASTER="$WORK_DIR/owner-ease-30s-lyria-midnight-lofi-v1-premaster.wav"
PASS1="$WORK_DIR/owner-ease-30s-lyria-midnight-lofi-v1-loudnorm-pass1.json"
PASS1_LOG="$WORK_DIR/owner-ease-30s-lyria-midnight-lofi-v1-loudnorm-pass1.log"
MASTER="$PROJECT_DIR/assets/mix/owner-ease-30s-lyria-midnight-lofi-v1-master.wav"

mkdir -p "$WORK_DIR" "$(dirname "$SHARED_BED")" "$(dirname "$MASTER")"

for command in ffmpeg jq; do
  command -v "$command" >/dev/null 2>&1 || {
    printf 'Missing required command: %s\n' "$command" >&2
    exit 1
  }
done

for input in "$VOICE" "$SOURCE" "$STING"; do
  [[ -f "$input" ]] || {
    printf 'Missing required audio input: %s\n' "$input" >&2
    exit 1
  }
done

# The source has a broad lo-fi noise bed and little native level movement.
# Clean the extremes, make narration space, and introduce a restrained lift.
ffmpeg -hide_banner -loglevel error -y \
  -i "$SOURCE" \
  -filter_complex "[0:a]atrim=0:30,asetpts=PTS-STARTPTS,highpass=f=60,lowpass=f=14000,equalizer=f=1450:t=q:w=0.9:g=-3.4,equalizer=f=7000:t=q:w=0.8:g=-1.6,volume='0.54+0.30*(t/30)':eval=frame,afade=t=in:st=0:d=0.55,afade=t=out:st=29.68:d=0.32,alimiter=limit=0.84:attack=5:release=100,atrim=0:30[bed]" \
  -map "[bed]" -ar 48000 -ac 2 -c:a pcm_s24le "$SHARED_BED"

# Keep the bed audible but stable beneath the continuous narration.
ffmpeg -hide_banner -loglevel error -y \
  -i "$SHARED_BED" \
  -i "$VOICE" \
  -filter_complex "[1:a]adelay=220|220,apad,atrim=0:30[voice];[0:a][voice]sidechaincompress=threshold=0.040:ratio=2.8:attack=35:release=430[ducked]" \
  -map "[ducked]" -ar 48000 -ac 2 -c:a pcm_s24le "$DUCKED"

ffmpeg -hide_banner -loglevel error -y \
  -i "$VOICE" \
  -i "$DUCKED" \
  -i "$STING" \
  -filter_complex "[0:a]adelay=220|220,apad,atrim=0:30[voice];[1:a]atrim=0:30[bed];[2:a]volume=0.08,afade=t=in:st=0:d=0.10,adelay=28750|28750[sting];[voice][bed][sting]amix=inputs=3:duration=longest:normalize=0,atrim=0:30,alimiter=limit=0.89:attack=5:release=100[mix]" \
  -map "[mix]" -ar 48000 -ac 2 -c:a pcm_s24le "$PREMASTER"

ffmpeg -hide_banner \
  -i "$PREMASTER" \
  -af loudnorm=I=-15.5:TP=-1.8:LRA=7:print_format=json \
  -f null - 2> "$PASS1_LOG"

sed -n '/^{/,/^}/p' "$PASS1_LOG" > "$PASS1"

measured_i="$(jq -r '.input_i' "$PASS1")"
measured_tp="$(jq -r '.input_tp' "$PASS1")"
measured_lra="$(jq -r '.input_lra' "$PASS1")"
measured_thresh="$(jq -r '.input_thresh' "$PASS1")"
offset="$(jq -r '.target_offset' "$PASS1")"

ffmpeg -hide_banner -loglevel error -y \
  -i "$PREMASTER" \
  -af "loudnorm=I=-15.5:TP=-1.8:LRA=7:measured_I=${measured_i}:measured_TP=${measured_tp}:measured_LRA=${measured_lra}:measured_thresh=${measured_thresh}:offset=${offset}:linear=true:print_format=summary" \
  -ar 48000 -ac 2 -c:a pcm_s24le "$MASTER"

printf 'Created Midnight Lo-Fi bed: %s\n' "$SHARED_BED"
printf 'Created mixed master: %s\n' "$MASTER"
shasum -a 256 "$SOURCE" "$SHARED_BED" "$STING" "$MASTER"

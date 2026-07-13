#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIBRARY_DIR="${ROOT_DIR}/library"

mkdir -p "${LIBRARY_DIR}"

ffmpeg -y -hide_banner -loglevel error \
  -i "${ROOT_DIR}/source-tracks/lyria-realtime-menulist-product-demo-seed-260714-20260713-003918/menulist-product-demo-seed-260714-20260713-003918.wav" \
  -af "atrim=start=0:end=120,asetpts=N/SR/TB,volume=-0.7dB,afade=t=in:st=0:d=0.4,afade=t=out:st=118.5:d=1.5" \
  -ar 48000 -ac 2 -c:a pcm_s16le \
  "${LIBRARY_DIR}/menulist-bgm-120s-product-demo-seed-260714-v1.wav"

ffmpeg -y -hide_banner -loglevel error \
  -i "${ROOT_DIR}/source-tracks/lyria-realtime-menulist-humanistic-flow-seed-190430-20260713-004527/menulist-humanistic-flow-seed-190430-20260713-004527.wav" \
  -af "atrim=start=0:end=120,asetpts=N/SR/TB,volume=-4.5dB,afade=t=in:st=0:d=0.4,afade=t=out:st=118.5:d=1.5" \
  -ar 48000 -ac 2 -c:a pcm_s16le \
  "${LIBRARY_DIR}/menulist-bgm-120s-owner-humanistic-seed-190430-v1.wav"

ffmpeg -y -hide_banner -loglevel error \
  -i "${ROOT_DIR}/source-tracks/lyria-realtime-menulist-hero-film-seed-260713-20260713-005043/menulist-hero-film-seed-260713-20260713-005043.wav" \
  -af "atrim=start=0:end=120,asetpts=N/SR/TB,volume=-1.2dB,afade=t=in:st=0:d=0.4,afade=t=out:st=118.5:d=1.5" \
  -ar 48000 -ac 2 -c:a pcm_s16le \
  "${LIBRARY_DIR}/menulist-bgm-120s-launch-momentum-seed-260713-v1.wav"

printf 'Built three MenuList 120-second PCM masters in %s\n' "${LIBRARY_DIR}"

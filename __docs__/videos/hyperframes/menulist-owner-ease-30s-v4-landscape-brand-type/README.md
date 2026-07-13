# MenuList Owner Ease 30s V4 Landscape

**Status:** Current founder-review source project with MenuList-generated Lyria audio  
**Format:** 16:9, 1920 x 1080, 30fps  
**Updated:** July 13, 2026  
**Current deliverable:** `deliverables/menulist-owner-ease-30s-lyria-midnight-lofi-v1.mp4`  
**Background music:** Founder-approved and frozen: `Midnight Lo-Fi Focus` production edit

## Purpose

This is the single active Owner Ease project. It explains to a non-technical SMB owner that MenuList starts from the menu they already have:

- upload existing menu photos or a PDF;
- MenuList prepares a private customer preview;
- the owner reviews before anything goes public;
- one approved customer link stays tied to QR, page, print, sharing, and customer actions.

MenuList remains public-business-truth infrastructure, not a QR-only app or generic AI restaurant software.

## Production Authority

- [Founder-approved video standard](../../videos_founder-approved-production-standard.md)
- [HyperFrames operating guide](../../videos_hyperframes-operating-guide.md)
- [Current production handoff](../../videos_hyperframes-production.md)
- [Project conversion contract](./conversion.md)

## Retained Source

| File | Purpose |
| --- | --- |
| `index.html` | Current HyperFrames composition |
| `DESIGN.md` | Project-specific visual constraints |
| `storyboard.md` | Current beat and QA plan |
| `script.txt` | Voiceover source |
| `assets/brand/menulist-symbol-transparent.png` | Original plain MenuList symbol |
| `assets/fonts/inter-latin-variable.woff2` | Embedded MenuList website typeface |
| `assets/audio/voice-macos-en-in-tara-192-selected-processed.wav` | Selected Indian-English narration |
| `assets/mix/owner-ease-30s-lyria-midnight-lofi-v1-master.wav` | Current mixed audio master |
| `scripts/generate_macos_en_in_voice.sh` | Local narration-generation helper |
| `scripts/build_audio_lyria_midnight_lofi_v1.sh` | Reproducible Lyria edit, spectral cleanup, audible ducking, sting, and mastering build |
| `deliverables/menulist-owner-ease-30s-lyria-midnight-lofi-v1.mp4` | Promoted current review master |
| `qa/*.png` | Minimal encoded-frame evidence for opening, middle, and final hold |

The reusable bed, retained generated source, preset metadata, approval sting, hashes, and publication boundary live in [brand-audio](../../brand-audio/README.md).

The background-music decision is closed for this named video. Later edits may change visuals, captions, aspect-ratio composition, or export settings, but must keep `owner-ease-30s-lyria-midnight-lofi-v1-master.wav` unless the founder explicitly reopens this video's audio selection.

## Working Output

`renders/`, snapshots, voice auditions, pre-masters, loudnorm pass files, and temporary BGM stems are ignored, reproducible, and intentionally absent from the retained project.

## Build

```bash
source ~/.nvm/nvm.sh
nvm use 22
npm run check
scripts/build_audio_lyria_midnight_lofi_v1.sh
npx hyperframes render \
  --output renders/menulist-owner-ease-30s-lyria-midnight-lofi-v1.mp4 \
  --quality high \
  --fps 30 \
  --workers 1 \
  --experimental-fast-capture=false
```

After encoded QA passes:

```bash
cp renders/menulist-owner-ease-30s-lyria-midnight-lofi-v1.mp4 \
  deliverables/menulist-owner-ease-30s-lyria-midnight-lofi-v1.mp4
```

## Verification

- HyperFrames: 0 errors and 0 sampled layout issues; intentional low-contrast ghost typography remains decorative.
- Output: H.264, 1920 x 1080, 30fps, AAC stereo at 48 kHz, 30.04 seconds, 11,277,485 bytes.
- Audio: `-15.6 LUFS` integrated, `1.3 LU` range, `-2.6 dBFS` true peak.
- Encoded review: frame zero, all five content scenes, and final hold checked; no blank or black interval.
- SHA-256: `efcb46d8fdf44b60fb83ec04f51f92a4bb0e53221f62c63376beeb7676fe5af7`.

The active bed is MenuList-generated Lyria Realtime output with retained WAV, seed, preset, timestamp, manifest, and hashes. Public distribution still requires founder listening approval and the normal product, claim, destination, and current Google-terms review.

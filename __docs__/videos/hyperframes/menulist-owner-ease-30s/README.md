# MenuList Owner Ease 30s

**Status:** Active review iteration
**Format:** 16:9, 1920 x 1080, 30fps
**Created:** July 10, 2026
**Current output:** `renders/menulist-owner-ease-30s-v1.mp4`

## Purpose

This HyperFrames project creates one owner-ease video iteration before the rest of the MenuList launch package is expanded.

It tests whether non-technical SMB owners immediately understand:

- they do not need another dashboard to learn before they can start;
- they do not need to type their whole menu again;
- they can upload existing menu photos or a PDF;
- MenuList prepares a private customer preview in minutes;
- the owner reviews before anything goes public;
- the approved customer link still keeps MenuList positioned as one trusted public source, not just a QR menu builder.

## Files

| File | Purpose |
| --- | --- |
| `DESIGN.md` | Visual identity for this composition |
| `script.txt` | Voiceover script |
| `index.html` | HyperFrames composition |
| `assets/audio/voice-kokoro-af-nova-selected.wav` | Selected local HyperFrames/Kokoro voice |
| `assets/music/source-tracks/freetouse-pufino-enlivening.mp3` | BGM source file |
| `assets/music/LICENSES.md` | Music source and license ledger |
| `assets/mix/owner-ease-30s-audio-v1-master.wav` | Mixed voice + BGM master |
| `assets/brand/menulist-icon-512.png` | Real MenuList app icon copied from the repo for video use |
| `renders/menulist-owner-ease-30s-v1.mp4` | Rendered MP4 review cut |

## Run

```bash
source ~/.nvm/nvm.sh
nvm use 22
npm run check
npx hyperframes render --output renders/menulist-owner-ease-30s-v1.mp4 --quality standard --fps 30 --workers 1 --experimental-fast-capture=false
```

## Notes

This is the first single-video iteration for the founder POV: MenuList should feel easy for a non-technical owner without weakening the approved positioning.

The composition uses CSS-built product/UI mockups, not final product screenshots. Replace with approved captures later if this cut becomes a public campaign master.

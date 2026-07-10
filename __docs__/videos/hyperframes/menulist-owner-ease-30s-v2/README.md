# MenuList Owner Ease 30s V2

**Status:** Active review iteration
**Format:** 16:9, 1920 x 1080, 30fps
**Created:** July 10, 2026
**Current output:** `renders/menulist-owner-ease-30s-v2-chain-reaction.mp4`

## Purpose

This HyperFrames project creates the second owner-ease video iteration before the rest of the MenuList launch package is expanded.

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
| `storyboard.md` | Beat plan, timing, UI direction, and QA frames |
| `script.txt` | Voiceover script |
| `index.html` | HyperFrames composition |
| `assets/audio/voice-kokoro-af-nova-selected.wav` | Selected local HyperFrames/Kokoro voice |
| `assets/music/source-tracks/freetouse-aetheric-chain-reaction.mp3` | V2 BGM source file |
| `assets/music/LICENSES.md` | Music source and license ledger |
| `assets/mix/owner-ease-30s-v2-chain-reaction-master.wav` | Mixed voice + BGM master |
| `assets/brand/menulist-icon-512.png` | Real MenuList app icon copied from the repo for video use |
| `renders/menulist-owner-ease-30s-v2-chain-reaction.mp4` | Rendered MP4 review cut |

## Run

```bash
source ~/.nvm/nvm.sh
nvm use 22
npm run check
npx hyperframes render --output renders/menulist-owner-ease-30s-v2-chain-reaction.mp4 --quality high --fps 30 --workers 1 --experimental-fast-capture=false
```

## Notes

This V2 cut applies the HyperFrames operating guide more tightly than V1:

- sharper setup-ease hook;
- stronger final frame;
- changed BGM from `Enlivening` to `Chain Reaction`;
- same calm owner-control positioning;
- no QR-only, AI-hype, growth, ranking, or unsupported external-platform claims.

The composition uses CSS-built product/UI mockups, not final product screenshots. Replace with approved captures later if this cut becomes a public campaign master.

# MenuList Launch Announcement 30s

**Status:** Audio v2 rendered draft
**Format:** 16:9, 1920 x 1080, 30fps
**Current output:** `renders/menulist-launch-announcement-30s-audio-v2.mp4`
**Original scratch output:** `renders/menulist-launch-announcement-30s-draft.mp4`

## Purpose

This HyperFrames project creates the first draft of the MenuList 30-second launch announcement cut.

It follows the approved positioning:

```text
One approved customer link for your menu, services, and business details.
```

It avoids ranking, sales-lift, AI recommendation, and external-platform update claims.

## Files

| File | Purpose |
| --- | --- |
| `DESIGN.md` | Visual identity for this composition |
| `script.txt` | Voiceover script |
| `index.html` | HyperFrames composition |
| `assets/narration.wav` | Original scratch narration generated with macOS `say`; retained only for comparison |
| `assets/audio-tests/` | Local Kokoro TTS candidates for the audio rescue pass |
| `assets/audio/voice-kokoro-af-nova-selected.wav` | Selected local HyperFrames/Kokoro voice candidate for the audio v2 draft |
| `assets/music/source-tracks/` | Downloaded BGM candidates with local source files |
| `assets/music/LICENSES.md` | Music source and license ledger |
| `assets/mix/launch-announcement-audio-v2-master.wav` | Mixed voice + BGM master used by the current render |
| `assets/mix/README.md` | Mix notes and FFmpeg command |
| `assets/brand/menulist-icon-512.png` | Real MenuList app icon copied from the repo for video use |
| `renders/menulist-launch-announcement-30s-draft.mp4` | Rendered MP4 draft |
| `renders/menulist-launch-announcement-30s-audio-v2.mp4` | Current audio v2 MP4 with Kokoro voice, BGM, real icon, and website theme |
| `renders/review-frames/` | Spot-check frames exported from the draft |
| `renders/review-frames-audio-v2/` | Spot-check frames exported from the current audio v2 draft |

## Run

```bash
source ~/.nvm/nvm.sh
nvm use 22
npm run check
npx hyperframes render --output renders/menulist-launch-announcement-30s-audio-v2.mp4 --quality standard --fps 30 --workers 1 --experimental-fast-capture=false
```

## Notes

The composition uses CSS-built mock UI, not final product screenshots. Replace these with approved product captures before public campaign use if stronger product fidelity is required.

Audio note:

The current `audio-v2` draft replaces the macOS `say` timing voice with a local HyperFrames/Kokoro voice candidate and adds a quiet BGM bed. It is render-complete for internal review, but it is not public-approved until the founder listens and approves the voice/music balance.

Selected BGM:

```text
Enlivening by Pufino
Source: https://freetouse.com/music/pufino/enlivening
Ledger: assets/music/LICENSES.md
```

Local Kokoro candidates exist under `assets/audio-tests/`. The current selected review voice is `assets/audio/voice-kokoro-af-nova-selected.wav`.

## Verification

Current audio v2 checks:

- `npm run check` passed with 0 errors, no console errors, 67 WCAG-passing text elements, and 0 layout issues.
- Rendered MP4: 1920 x 1080, 30fps, H.264 video, AAC audio, 30.04 seconds.
- Audio stream: AAC stereo, 48 kHz, 192 kb/s target.
- Loudness spot-check: `input_i=-16.58`, `input_tp=-4.60`, with no clipping risk observed.
- Review frames checked at 1s, 11s, 18s, and 26s.

Remaining HyperFrames warnings:

- Duplicate media discovery warning from using the same MenuList icon as both persistent brand bug and end-card logo.
- Dense timeline warnings on two tracks because this first draft is intentionally a compact single-file composition.

These warnings do not block internal review. They can be cleaned up when this draft is split into reusable scene modules or vertical variants.

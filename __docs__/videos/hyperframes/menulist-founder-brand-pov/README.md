# MenuList Founder POV HyperFrames Draft

**Status:** Audio v2 rendered review composition
**Created:** July 7, 2026
**Source handoff:** `../../videos_12-founder-brand-pov-video.md`

## Purpose

This project creates a first-pass founder POV video without requiring founder camera footage. It uses narrated founder-style statements, product-flow mockups, and MenuList claim boundaries to prove the positioning before a full production shoot.

## Output Intent

- Master format: 16:9 landscape.
- Target duration: 75 seconds.
- Use: LinkedIn founder post, website About/launch section, investor or sales deck opener.
- Public status: internal review only until founder listening approval, final UI captures, and final claim review are complete.

## Positioning Rules

- MenuList is public-business truth infrastructure, not just a QR menu maker.
- MenuList is not positioned as generic AI restaurant software.
- AI is shown as controlled assistance: AI prepares, owner approves.
- No ranking, traffic, AI recommendation, sales-lift, or external-platform update claims.

## Files

- `DESIGN.md` - visual identity and motion rules.
- `script.txt` - founder POV narration script.
- `index.html` - HyperFrames composition.
- `assets/narration.wav` - original scratch generated review narration; retained only for comparison.
- `assets/audio/voice-kokoro-af-nova-selected.wav` - selected local Kokoro voice candidate for audio v2 review.
- `assets/music/source-tracks/freetouse-pufino-enlivening.mp3` - local BGM copy reused from the launch announcement ledger.
- `assets/music/LICENSES.md` - local music ledger for the Founder POV audio-v2 pass.
- `assets/mix/README.md` - voice, BGM, and FFmpeg mix notes.
- `assets/mix/founder-brand-pov-audio-v2-master.wav` - mixed voice + BGM master for audio v2 review.
- `renders/menulist-founder-brand-pov-draft.mp4` - rendered draft after production run.
- `renders/menulist-founder-brand-pov-audio-v2.mp4` - rendered audio-v2 review MP4 with MenuList icon/blue campaign visual pass.
- `renders/review-frames-audio-v2/` - refreshed still frames from the final audio-v2 MP4.

## Render Command

Use Node 22 through local nvm:

```bash
source ~/.nvm/nvm.sh
nvm use 22
npx hyperframes render --output renders/menulist-founder-brand-pov-audio-v2.mp4 --quality standard --fps 30 --workers 1 --experimental-fast-capture=false
```

The `--experimental-fast-capture=false` flag matches the current local HyperFrames render requirement.

## Audio Note

The current audio v2 master replaces the scratch timing voice with local Kokoro narration and a very low BGM bed. The final MP4 verifies as 1920 x 1080 H.264 video with AAC stereo audio, 30fps, and 75.03 seconds. It is still not public-approved until founder listening review.

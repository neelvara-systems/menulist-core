# Videos - HyperFrames Production

**Status:** Active draft production
**Created:** July 7, 2026
**Scope:** HyperFrames video projects created from the MenuList launch video system.

## Production Engine Decision

Use HyperFrames only for MenuList video and motion work by default.

Do not create a parallel Remotion workflow for MenuList launch videos unless the founder explicitly asks for a separate Remotion experiment. Current production should stay local, HyperFrames-based, and FFmpeg-backed.

## Current Draft

| Video | Project | Rendered output | Status |
| --- | --- | --- | --- |
| 30-sec Launch Announcement Cut | [hyperframes/menulist-launch-announcement-30s](./hyperframes/menulist-launch-announcement-30s/) | [menulist-launch-announcement-30s-audio-v2.mp4](./hyperframes/menulist-launch-announcement-30s/renders/menulist-launch-announcement-30s-audio-v2.mp4) | Audio v2 rendered review draft |
| 30-sec Launch Announcement Cut - vertical | [hyperframes/menulist-launch-announcement-30s-vertical](./hyperframes/menulist-launch-announcement-30s-vertical/) | [menulist-launch-announcement-30s-vertical-audio-v2.mp4](./hyperframes/menulist-launch-announcement-30s-vertical/renders/menulist-launch-announcement-30s-vertical-audio-v2.mp4) | Native 9:16 audio v2 rendered review draft |
| Founder / Brand POV Video | [hyperframes/menulist-founder-brand-pov](./hyperframes/menulist-founder-brand-pov/) | [menulist-founder-brand-pov-audio-v2.mp4](./hyperframes/menulist-founder-brand-pov/renders/menulist-founder-brand-pov-audio-v2.mp4) | Audio v2 rendered review draft |

## Environment

HyperFrames currently requires Node 22 or newer.

Use:

```bash
source ~/.nvm/nvm.sh
nvm use 22
```

The MenuList app runtime was not changed. Node 22 was used only for HyperFrames commands.

## Draft Notes

The rendered drafts use:

- CSS-built product/UI mockups;
- 16:9 landscape composition at 1920 x 1080;
- calm operational MenuList style;
- no AI ranking, sales, or external-platform update claims;
- no real customer data.

The 30-sec Launch Announcement and Founder POV audio-v2 renders now use local HyperFrames/Kokoro narration, downloaded/license-ledgered FreeToUse BGM, FFmpeg ducking, and loudness normalization. The launch announcement also has a native 9:16 vertical cut and SRT/VTT/word-timed caption sidecars.

These are drafts for production review, not final public ads.

Audio status:

```text
The current audio-v2 renders still need founder listening approval before public use.
```

See [videos_audio-production-research-and-plan.md](./videos_audio-production-research-and-plan.md) for the required replacement workflow: local TTS or founder voice, BGM decision, SFX decision, sidechain ducking, loudness normalization, captions, and `audio-v2` exports.

The Founder / Brand POV draft is intentionally faceless because no founder camera footage was provided. It uses founder-style narration and product cutaways so the team can review positioning, scene flow, and visual tone before recording real founder audio or talking-head footage.

## Commands Used

From the project folder:

```bash
npm run check
npx hyperframes render --output renders/menulist-launch-announcement-30s-draft.mp4 --quality standard --fps 30 --workers 1 --experimental-fast-capture=false
npx hyperframes render --output renders/menulist-launch-announcement-30s-audio-v2.mp4 --quality standard --fps 30 --workers 1 --experimental-fast-capture=false
npx hyperframes render --output renders/menulist-launch-announcement-30s-vertical-audio-v2.mp4 --quality standard --fps 30 --workers 1 --experimental-fast-capture=false
npx hyperframes render --output renders/menulist-founder-brand-pov-draft.mp4 --quality standard --fps 30 --workers 1 --experimental-fast-capture=false
npx hyperframes render --output renders/menulist-founder-brand-pov-audio-v2.mp4 --quality standard --fps 30 --workers 1 --experimental-fast-capture=false
```

The `--experimental-fast-capture=false` flag is required on this machine because the default fast-capture path failed with:

```text
ctx.drawElementImage is not a function
```

## Verification

Passed:

- HyperFrames lint: 0 errors.
- HyperFrames validate: no console errors, all text passed WCAG AA.
- HyperFrames inspect: 0 layout issues across 9 samples.
- Rendered MP4: 1920 x 1080, 30fps, H.264 video, AAC audio, 30 seconds.
- Review frames checked at 1s, 11s, 18s, and 26s.
- Launch announcement audio v2 render: 1920 x 1080, 30fps, H.264 video, AAC audio, 30.04 seconds, 3.3 MB.
- Launch announcement audio v2 uses real MenuList icon, website blue theme, local Kokoro `af_nova` voice candidate, and `Enlivening` by Pufino as the BGM bed.
- Launch announcement audio v2 loudness spot-check: `input_i=-16.58`, `input_tp=-4.60`, no clipping risk observed.
- Launch announcement audio v2 review frames checked at 1s, 11s, 18s, and 26s.
- Launch announcement audio v2 caption sidecars created: SRT, VTT, and word-level JSON under `assets/captions/`.
- Launch announcement vertical audio v2 render: 1080 x 1920, 30fps, H.264 video, AAC audio, 30.04 seconds, 3.5 MB.
- Launch announcement vertical audio v2 review frames checked at 1s, 11s, 18s, and 26s.
- Founder POV audio v2 rendered MP4: 1920 x 1080, 30fps, H.264 video, AAC audio, 75.03 seconds, 7.5 MB.
- Founder POV audio v2 uses real MenuList icon, website blue theme, local Kokoro `af_nova` voice candidate, and `Enlivening` by Pufino as the BGM bed.
- Founder POV audio v2 loudness spot-check: `input_i=-16.73`, `input_tp=-4.78`, no clipping risk observed.
- Founder POV audio v2 review frames checked at 2s, 12s, 24s, 36s, 48s, 60s, and 70s.

Remaining warnings:

- None on the Founder POV audio-v2 render or the vertical launch announcement render. The landscape launch announcement audio-v2 draft has one duplicate-media warning from reusing the MenuList icon and two dense-track warnings from the single-file timeline. This is acceptable for internal review, but future revisions can split longer scene groups into sub-compositions.

## Next Production Step

The first audio-v2 asset set is now ready for founder listening review:

1. Listen to `menulist-launch-announcement-30s-audio-v2.mp4`, `menulist-launch-announcement-30s-vertical-audio-v2.mp4`, and `menulist-founder-brand-pov-audio-v2.mp4` on laptop, earbuds, and phone speaker.
2. Approve or reject the Kokoro `af_nova` voice candidate.
3. Approve or reject the `Enlivening` BGM bed and ducking level.
4. Decide whether public launch uses founder-recorded voice, local TTS, or a later approved paid/cloud voice.

After the audio profile is accepted, use the same visual and audio system to create:

1. 75-sec Product Launch / Hero Film.
2. Old PDF Problem Reel.
3. QR Stale Page Reel.
4. Photo/PDF to Customer Link Reel.

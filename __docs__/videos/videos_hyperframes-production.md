# Videos - HyperFrames Production

**Status:** Active draft production
**Created:** July 7, 2026
**Scope:** HyperFrames video projects created from the MenuList launch video system.

## Production Engine Decision

Use HyperFrames only for MenuList video and motion work by default.

Do not create a parallel Remotion workflow for MenuList launch videos unless the founder explicitly asks for a separate Remotion experiment. Current production should stay local, HyperFrames-based, and FFmpeg-backed.

Use [videos_hyperframes-operating-guide.md](./videos_hyperframes-operating-guide.md) as the production operating guide before starting or reviewing any new MenuList video.

## Current Drafts

| Video | Project | Rendered output | Status |
| --- | --- | --- | --- |
| Owner Ease 30s V2 | [hyperframes/menulist-owner-ease-30s-v2](./hyperframes/menulist-owner-ease-30s-v2/) | [menulist-owner-ease-30s-v2-chain-reaction.mp4](./hyperframes/menulist-owner-ease-30s-v2/renders/menulist-owner-ease-30s-v2-chain-reaction.mp4) | Stronger founder review iteration with changed BGM, storyboard, denser final frame, and corrected Scene 3 copy |
| Owner Ease 30s | [hyperframes/menulist-owner-ease-30s](./hyperframes/menulist-owner-ease-30s/) | [menulist-owner-ease-30s-v1.mp4](./hyperframes/menulist-owner-ease-30s/renders/menulist-owner-ease-30s-v1.mp4) | Founder review iteration focused on non-technical SMB setup ease |
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

Skill status checked July 10, 2026:

```text
npx hyperframes skills check
20 current
```

## Draft Notes

The rendered drafts use:

- CSS-built product/UI mockups;
- 16:9 landscape composition at 1920 x 1080 and native 9:16 composition at 1080 x 1920 where available;
- calm operational MenuList style;
- setup-ease messaging: upload existing menu photos, no typing required to start, private preview in minutes, review before publishing;
- no AI ranking, sales, or external-platform update claims;
- no real customer data.

The 30-sec Launch Announcement and Founder POV audio-v2 renders now use local HyperFrames/Kokoro narration, downloaded/license-ledgered FreeToUse BGM, FFmpeg ducking, and loudness normalization. The launch announcement also has a native 9:16 vertical cut and SRT/VTT/word-timed caption sidecars.

July 9 setup-ease revision:

- Launch voiceover and visual copy now say owners can upload photos of the existing menu, with no typing required to start.
- Launch visuals say MenuList prepares a private customer preview in minutes.
- Founder POV narration now says owners should not have to type the whole menu into another tool.
- Founder POV visuals now use the sequence: upload photos, review, publish, keep aligned.

July 10 owner-ease iteration:

- Added a dedicated 30-second owner-ease cut before expanding the rest of the launch package.
- The hook is now: owners do not need to type the menu again.
- The setup story is: upload existing menu photos or a PDF, MenuList prepares a private preview in minutes, owner reviews, then one approved customer link powers QR, page, print, WhatsApp sharing, and customer actions.
- The background treatment was checked against the earlier repeated blue-band issue; the new render uses a quiet grid and soft corner wash instead of repeated horizontal blue patterns.

July 10 owner-ease V2 render:

- Added `menulist-owner-ease-30s-v2` as the stronger single-video iteration after the HyperFrames operating-guide pass.
- Changed BGM from `Enlivening` by Pufino to `Chain Reaction` by Aetheric, kept low and sidechain-ducked under local Kokoro narration.
- Added `storyboard.md`, a cleaner final proof panel, and a denser CTA frame.
- Fixed the Scene 3 body copy after QA caught a `details.Nothing` spacing defect in the first V2 render pass.

These are drafts for production review, not final public ads.

Audio status:

```text
The current audio-v2 renders still need founder listening approval before public use.
```

See [videos_audio-production-research-and-plan.md](./videos_audio-production-research-and-plan.md) for the required replacement workflow: local TTS or founder voice, BGM decision, SFX decision, sidechain ducking, loudness normalization, captions, and `audio-v2` exports.

The Founder / Brand POV draft is intentionally faceless because no founder camera footage was provided. It uses founder-style narration and product cutaways so the team can review positioning, scene flow, and visual tone before recording real founder audio or talking-head footage.

## Commands Used

From the relevant HyperFrames project folder:

```bash
source ~/.nvm/nvm.sh
nvm use 22
npx hyperframes skills check
cd __docs__/videos/hyperframes/menulist-launch-announcement-30s && npm run check
cd __docs__/videos/hyperframes/menulist-owner-ease-30s && npm run check
cd __docs__/videos/hyperframes/menulist-owner-ease-30s && npx hyperframes render --output renders/menulist-owner-ease-30s-v1.mp4 --quality standard --fps 30 --workers 1 --experimental-fast-capture=false
cd __docs__/videos/hyperframes/menulist-owner-ease-30s-v2 && npm run check
cd __docs__/videos/hyperframes/menulist-owner-ease-30s-v2 && npx hyperframes render --output renders/menulist-owner-ease-30s-v2-chain-reaction.mp4 --quality high --fps 30 --workers 1 --experimental-fast-capture=false
cd __docs__/videos/hyperframes/menulist-launch-announcement-30s && npx hyperframes render --output renders/menulist-launch-announcement-30s-draft.mp4 --quality standard --fps 30 --workers 1 --experimental-fast-capture=false
cd __docs__/videos/hyperframes/menulist-launch-announcement-30s && npx hyperframes render --output renders/menulist-launch-announcement-30s-audio-v2.mp4 --quality standard --fps 30 --workers 1 --experimental-fast-capture=false
cd __docs__/videos/hyperframes/menulist-launch-announcement-30s-vertical && npx hyperframes render --output renders/menulist-launch-announcement-30s-vertical-audio-v2.mp4 --quality standard --fps 30 --workers 1 --experimental-fast-capture=false
cd __docs__/videos/hyperframes/menulist-founder-brand-pov && npx hyperframes render --output renders/menulist-founder-brand-pov-draft.mp4 --quality standard --fps 30 --workers 1 --experimental-fast-capture=false
cd __docs__/videos/hyperframes/menulist-founder-brand-pov && npx hyperframes render --output renders/menulist-founder-brand-pov-audio-v2.mp4 --quality standard --fps 30 --workers 1 --experimental-fast-capture=false
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
- Owner Ease 30s v1 render: 1920 x 1080, 30fps, H.264 video, AAC stereo audio, 30.04 seconds, 2,915,786 bytes.
- Owner Ease 30s v1 review frames checked at 1.2s, 5.8s, 12s, and 25s for background cleanup, setup-ease copy, owner approval, and CTA readability.
- Owner Ease 30s V2 Chain Reaction render: 1920 x 1080, 30fps, H.264 video, AAC stereo audio, 30.04 seconds, 3,947,196 bytes.
- Owner Ease 30s V2 review frames checked at 1.2s, 6s, 12.4s, 18.8s, and 26s for setup-ease hook, upload-preview-approve path, owner approval copy, approved-link outcome, final CTA, and background cleanup.
- Launch announcement audio v2 render: 1920 x 1080, 30fps, H.264 video, AAC audio, 30.04 seconds, 3,040,019 bytes.
- Launch announcement audio v2 uses real MenuList icon, website blue theme, local Kokoro `af_nova` voice candidate, and `Enlivening` by Pufino as the BGM bed.
- Launch announcement audio v2 review frames checked at 5.6s and 26s for setup-ease copy and CTA readability.
- Launch announcement audio v2 caption sidecars created: SRT, VTT, and word-level JSON under `assets/captions/`.
- Launch announcement vertical audio v2 render: 1080 x 1920, 30fps, H.264 video, AAC audio, 30.04 seconds, 2,920,896 bytes.
- Launch announcement vertical audio v2 review frames checked at 5.6s and 26s for setup-ease copy and CTA readability.
- Founder POV audio v2 rendered MP4: 1920 x 1080, 30fps, H.264 video, AAC audio, 75.03 seconds, 6,668,874 bytes.
- Founder POV audio v2 uses real MenuList icon, website blue theme, local Kokoro `af_nova` voice candidate, and `Enlivening` by Pufino as the BGM bed.
- Founder POV audio v2 review frames checked at 46s and 70s for the upload-review-publish sequence and final CTA readability.
- Refreshed same-source draft files after the setup-ease source change: `menulist-launch-announcement-30s-draft.mp4` at 30.04 seconds and `menulist-founder-brand-pov-draft.mp4` at 75.03 seconds.

Remaining warnings:

- None on the Founder POV audio-v2 render. The Owner Ease 30s V2, Owner Ease 30s, launch announcement landscape, and launch announcement vertical cuts have dense-track warnings from single-file timelines. The V2 duplicate-media warning was removed before final render. Dense-track warnings are acceptable for internal review, but future master-video revisions should split longer scene groups into sub-compositions.

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

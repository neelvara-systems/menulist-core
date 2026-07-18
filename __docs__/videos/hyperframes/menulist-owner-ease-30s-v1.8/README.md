# MenuList Owner Ease 30s v1.8

**Status:** Founder-selected primary default background-track reference
**Format:** 1920x1080, 30 fps, 30.037 seconds
**Audience:** Busy, non-technical SMB owners who already have a menu or service list

This immutable pass keeps the approved `v1.7` visual composition, Indian-English Tara narration, captions, logo motion, approval boundary, timing, and CTA unchanged. The founder selected its `MenuList One Link Motion v2` source as the primary default background-track direction for new MenuList videos.

## Story

Existing menu photos or PDF -> private customer preview -> owner review -> owner approval -> one approved customer link -> verified MenuList outputs.

## Audio Decision

- Voice: retained local macOS `Tara`, Indian English.
- Music source: `MenuList One Link Motion v2`, Lyria Realtime seed `260719`.
- Character: smooth, broad motion with a progressive build suited to the one-link propagation story.
- Production treatment: 55 Hz high-pass, 15 kHz low-pass, speech-frequency carve, restrained progressive gain, voice-reactive sidechain ducking, post-narration lift, original MenuList approval sting, two-pass loudness normalization.
- Public distribution remains subject to founder listening approval and current generating-service terms review.

## Output

[menulist-owner-ease-30s-v1.8.mp4](./deliverables/menulist-owner-ease-30s-v1.8.mp4)

## Verification

- HyperFrames: zero lint errors, runtime errors, layout issues, or motion errors.
- Contrast: 85/85 sampled text checks pass WCAG AA.
- Advisory: one maintainability warning for the intentionally single-file composition; no rendered-behavior impact.
- Encoded format: H.264, 1920x1080, 30 fps, AAC stereo at 48 kHz.
- Encoded duration and size: 30.037 seconds, 6,636,707 bytes.
- Encoded audio: `-15.5 LUFS` integrated, `1.2 LU` range, `-2.0 dBFS` true peak.
- No detected black or silent interval.
- Encoded frame zero, all product states, transition samples, CTA, logo animation, and final frame were reviewed.
- Sanitized composition comparison confirms the visual source is unchanged from `v1.7`; only version/audio references differ.
- MP4 SHA-256: `7c33a716dcc0c2fe745da37680b442c4a829f6a0dd45e524b19688dfc8956127`.
- Audio-master SHA-256: `9fc233acd23cd29b62836325c07244ef360af50fea1d0b2c93e8ecc32500a282`.
- Music-source SHA-256: `ea6d0e959feea758593fd5865c30b2475937e8ea4207b8bc39ad6291d09355e3`.
- Composition SHA-256: `b80cad4c6359e4d6d7fd5d06ca38164419b913d12d388809e34536c55ad6f78c`.

## Reproduction

```bash
scripts/build_audio.sh
npm run check
npx hyperframes render --skill=product-launch-video --output deliverables/menulist-owner-ease-30s-v1.8.mp4 --quality high --fps 30 --workers 1 --experimental-fast-capture=false
scripts/qa_video.sh deliverables/menulist-owner-ease-30s-v1.8.mp4
```

Temporary audio intermediates, sampled frames, and QA logs are removed after their verified values are recorded. The source WAV, provenance record, mix script, final master, composition, and MP4 remain.

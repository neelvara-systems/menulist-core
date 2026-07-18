# MenuList Owner Ease 30s v1.12

**Status:** Founder-review URL-readability pass with primary background track
**Format:** 1920x1080, 30 fps, 30.037 seconds
**Audience:** Busy, non-technical SMB owners who already have a menu or service list

This pass keeps the approved `v1.10` story, Indian-English Tara narration, captions, logo motion, approval boundary, timing, clean brand close, and primary `MenuList One Link Motion v2` soundtrack. It enlarges `menulist.ai` and places it on a pale blue, thin-bordered URL label so the destination survives phone-scale playback without becoming a button-shaped CTA.

## Story

Existing menu photos or PDF -> private customer preview -> owner review -> owner approval -> one approved customer link -> verified MenuList outputs.

## Audio Decision

- Voice: retained local macOS `Tara`, Indian English.
- Music source: `MenuList One Link Motion v2`, Lyria Realtime seed `260719`.
- Character: smooth, broad motion with a progressive build suited to the one-link propagation story.
- Production treatment: 55 Hz high-pass, 15 kHz low-pass, speech-frequency carve, restrained progressive gain, voice-reactive sidechain ducking, post-narration lift, original MenuList approval sting, two-pass loudness normalization.
- Public distribution remains subject to founder listening approval and current generating-service terms review.

## Output

[menulist-owner-ease-30s-v1.12.mp4](./deliverables/menulist-owner-ease-30s-v1.12.mp4)

## Verification

- HyperFrames: zero lint errors, runtime errors, layout issues, or motion errors.
- Contrast: 85/85 sampled text checks pass WCAG AA.
- Advisory: one maintainability warning for the intentionally single-file composition; no rendered-behavior impact.
- Encoded format: H.264, 1920x1080, 30 fps, AAC stereo at 48 kHz.
- Encoded duration and size: 30.037 seconds, 6,553,795 bytes.
- Encoded audio: `-15.5 LUFS` integrated, `1.2 LU` range, `-2.0 dBFS` true peak.
- No detected black or silent interval.
- Encoded frame zero, all product states, transition samples, logo animation, domain, and final frame were reviewed, including a 590px-wide phone-scale simulation.
- The only intended visual change from `v1.10` is the clearer final URL treatment.
- MP4 SHA-256: `6178501bf79f78c0b4e30184c7e83581eb266ed3d5a5cfc2d06c6a5948797226`.
- Audio-master SHA-256: `9fc233acd23cd29b62836325c07244ef360af50fea1d0b2c93e8ecc32500a282`.
- Music-source SHA-256: `ea6d0e959feea758593fd5865c30b2475937e8ea4207b8bc39ad6291d09355e3`.
- Composition SHA-256: `e5d1e79e2589415d08694116b3e87cd0c8b711c727b191be3989584321345d2a`.

## Reproduction

```bash
scripts/build_audio.sh
npm run check
npx hyperframes render --skill=product-launch-video --output deliverables/menulist-owner-ease-30s-v1.12.mp4 --quality high --fps 30 --workers 1 --experimental-fast-capture=false
scripts/qa_video.sh deliverables/menulist-owner-ease-30s-v1.12.mp4
```

Temporary audio intermediates, sampled frames, and QA logs are removed after their verified values are recorded. The source WAV, provenance record, mix script, final master, composition, and MP4 remain.

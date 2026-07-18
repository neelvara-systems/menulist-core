# MenuList Owner Ease 30s v1.9

**Status:** Founder-approved operational alternate background-track reference
**Format:** 1920x1080, 30 fps, 30.037 seconds
**Audience:** Busy, non-technical SMB owners who already have a menu or service list

This immutable pass keeps the approved `v1.7` visual composition, Indian-English Tara narration, captions, logo motion, approval boundary, timing, and CTA unchanged. The founder approved its `MenuList Outlet Control v2` source as the retained operational and multi-location alternate.

## Story

Existing menu photos or PDF -> private customer preview -> owner review -> owner approval -> one approved customer link -> verified MenuList outputs.

## Audio Decision

- Voice: retained local macOS `Tara`, Indian English.
- Music source: `MenuList Outlet Control v2`, Lyria Realtime seed `260721`.
- Character: firmer rhythmic pulse and more operational momentum.
- Production treatment: 60 Hz high-pass, 14.5 kHz low-pass, deeper speech-frequency carve, lower narration bed, voice-reactive sidechain ducking, post-narration lift, original MenuList approval sting, two-pass loudness normalization.
- Public distribution remains subject to founder listening approval and current generating-service terms review.

## Output

[menulist-owner-ease-30s-v1.9.mp4](./deliverables/menulist-owner-ease-30s-v1.9.mp4)

## Verification

- HyperFrames: zero lint errors, runtime errors, layout issues, or motion errors.
- Contrast: 85/85 sampled text checks pass WCAG AA.
- Advisory: one maintainability warning for the intentionally single-file composition; no rendered-behavior impact.
- Encoded format: H.264, 1920x1080, 30 fps, AAC stereo at 48 kHz.
- Encoded duration and size: 30.037 seconds, 6,624,423 bytes.
- Encoded audio: `-15.5 LUFS` integrated, `1.3 LU` range, `-2.0 dBFS` true peak.
- No detected black or silent interval.
- Encoded frame zero, all product states, transition samples, CTA, logo animation, and final frame were reviewed.
- Sanitized composition comparison confirms the visual source is unchanged from `v1.7`; only version/audio references differ.
- MP4 SHA-256: `17584a3a1b072d5d00b544ee96cdd57433dd7217a8888ab33fe6973fb26d87b0`.
- Audio-master SHA-256: `c5375f940b1835e5c96966444e35acb95836a99d4b808d85fb0743735588a1f1`.
- Music-source SHA-256: `828b6c8fe35bbc5a980c9ff5ebe0f4e9f0ed46362ce559e1b4865c92bc4febf2`.
- Composition SHA-256: `d965e51b7b3f429b97395d29d06c5abe4918356fa6c4f7ea5ac6a0e5fa4f8e4c`.

## Reproduction

```bash
scripts/build_audio.sh
npm run check
npx hyperframes render --skill=product-launch-video --output deliverables/menulist-owner-ease-30s-v1.9.mp4 --quality high --fps 30 --workers 1 --experimental-fast-capture=false
scripts/qa_video.sh deliverables/menulist-owner-ease-30s-v1.9.mp4
```

Temporary audio intermediates, sampled frames, and QA logs are removed after their verified values are recorded. The source WAV, provenance record, mix script, final master, composition, and MP4 remain.

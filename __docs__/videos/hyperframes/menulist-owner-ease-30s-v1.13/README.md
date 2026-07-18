# MenuList Owner Ease 30s v1.13

**Status:** Founder-review URL-readability pass with operational alternate track
**Format:** 1920x1080, 30 fps, 30.037 seconds
**Audience:** Busy, non-technical SMB owners who already have a menu or service list

This pass keeps the approved `v1.11` story, Indian-English Tara narration, captions, logo motion, approval boundary, timing, clean brand close, and `MenuList Outlet Control v2` soundtrack. It enlarges `menulist.ai` and places it on a pale blue, thin-bordered URL label so the destination survives phone-scale playback without becoming a button-shaped CTA.

## Story

Existing menu photos or PDF -> private customer preview -> owner review -> owner approval -> one approved customer link -> verified MenuList outputs.

## Audio Decision

- Voice: retained local macOS `Tara`, Indian English.
- Music source: `MenuList Outlet Control v2`, Lyria Realtime seed `260721`.
- Character: firmer rhythmic pulse and more operational momentum.
- Production treatment: 60 Hz high-pass, 14.5 kHz low-pass, deeper speech-frequency carve, lower narration bed, voice-reactive sidechain ducking, post-narration lift, original MenuList approval sting, two-pass loudness normalization.
- Public distribution remains subject to founder listening approval and current generating-service terms review.

## Output

[menulist-owner-ease-30s-v1.13.mp4](./deliverables/menulist-owner-ease-30s-v1.13.mp4)

## Verification

- HyperFrames: zero lint errors, runtime errors, layout issues, or motion errors.
- Contrast: 85/85 sampled text checks pass WCAG AA.
- Advisory: one maintainability warning for the intentionally single-file composition; no rendered-behavior impact.
- Encoded format: H.264, 1920x1080, 30 fps, AAC stereo at 48 kHz.
- Encoded duration and size: 30.037 seconds, 6,539,165 bytes.
- Encoded audio: `-15.5 LUFS` integrated, `1.3 LU` range, `-2.0 dBFS` true peak.
- No detected black or silent interval.
- Encoded frame zero, all product states, transition samples, logo animation, domain, and final frame were reviewed, including a 590px-wide phone-scale simulation.
- The only intended visual change from `v1.11` is the clearer final URL treatment.
- MP4 SHA-256: `b99c33e33ed5cac8969ce3df57ddfa9d2cab474464ed1bbd73426a7eb990e7f5`.
- Audio-master SHA-256: `c5375f940b1835e5c96966444e35acb95836a99d4b808d85fb0743735588a1f1`.
- Music-source SHA-256: `828b6c8fe35bbc5a980c9ff5ebe0f4e9f0ed46362ce559e1b4865c92bc4febf2`.
- Composition SHA-256: `af475a0a8346fcf860e79c6108632c765b3aaa9630b03234c719ac0ba88c5ba9`.

## Reproduction

```bash
scripts/build_audio.sh
npm run check
npx hyperframes render --skill=product-launch-video --output deliverables/menulist-owner-ease-30s-v1.13.mp4 --quality high --fps 30 --workers 1 --experimental-fast-capture=false
scripts/qa_video.sh deliverables/menulist-owner-ease-30s-v1.13.mp4
```

Temporary audio intermediates, sampled frames, and QA logs are removed after their verified values are recorded. The source WAV, provenance record, mix script, final master, composition, and MP4 remain.

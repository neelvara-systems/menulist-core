# MenuList Owner Ease 30s v1.16

**Status:** Founder-review native vertical retention pass
**Format:** 1080x1920, 30 fps, 30 seconds
**Audience:** Busy, non-technical SMB owners who already have a menu or service list

This pass keeps the approved `v1.14` product story, Tara Indian-English narration, MenuList One Link Motion v2 audio master, product proof order, owner-approval boundary, caption behavior, and final identity. It changes one campaign variable: the feed opening.

## Controlled Change

- Removed the standalone logo-only opening.
- Opens at encoded frame zero with `Already have a menu? Start there.`
- Shows existing menu photos, PDF, and the upload proof immediately.
- Rebuilds every scene natively for 9:16 instead of cropping the landscape master.
- Keeps the final symbol, `MenuList`, `One approved customer link`, and `menulist.ai` only.

## Retention Contract

- Distribution promise: an owner can start from the menu already on the phone.
- Frame-zero promise: `Already have a menu? Start there.`
- Product-visible deadline: frame zero.
- First concrete payoff: the sources converge into `Upload what exists` within the opening four seconds.
- Early visual events: hook and proof visible at 0s; upload target by 1s; no-retyping proof by 1.6s; source convergence by 3.2s; intake handoff by 3.8s.
- Test variable: opening hook and native portrait composition.
- Frozen variables: narration, music, audio mix, proof order, product claims, final lockup, domain, audience, and linked destination.

## Story

Existing menu photos or PDF -> private customer preview -> owner review -> owner approval -> one approved customer link -> verified MenuList outputs.

## Audio

- Voice: retained local macOS `Tara`, Indian English.
- Background: `MenuList One Link Motion v2`, Lyria Realtime seed `260719`.
- Mix: identical to the approved `v1.14` master.
- Audio-master SHA-256: `9fc233acd23cd29b62836325c07244ef360af50fea1d0b2c93e8ecc32500a282`.

## Output

[menulist-owner-ease-30s-v1.16.mp4](./deliverables/menulist-owner-ease-30s-v1.16.mp4)

## Verification

- HyperFrames: zero lint, runtime, layout, or motion errors; one single-file maintainability advisory.
- Contrast: 114/114 sampled text checks pass WCAG AA.
- Encoded format: H.264, 1080x1920, 30 fps, AAC stereo at 48 kHz.
- Encoded duration and size: 30.037 seconds, 6,483,581 bytes.
- Encoded audio: `-15.5 LUFS` integrated, `1.2 LU` range, `-2.0 dBFS` true peak.
- No detected black or silent interval.
- Encoded frame zero, first 1.5/3/5 seconds, every transition, approval interaction, supported-output diagram, summary, logo animation, and final frame were reviewed.
- MP4 SHA-256: `1f060600c4b768f10be83d6dc6331cc19251a02280fbd6db9a78c7eb3fab65dd`.
- Composition SHA-256: `10aac2780bbd4d54e93fb9c0d974f123113eba2f7fc03bc36100cb78a3f0af1e`.

## Reproduction

```bash
npm run check
npx hyperframes render \
  --skill=product-launch-video \
  --output deliverables/menulist-owner-ease-30s-v1.16.mp4 \
  --quality high \
  --fps 30 \
  --workers 1 \
  --experimental-fast-capture=false
scripts/qa_video.sh deliverables/menulist-owner-ease-30s-v1.16.mp4
```

The MP4 is not public-release approved until the founder reviews this controlled hook test and the distribution gates in `conversion.md` pass.

# MenuList Two-Minute Background Music Library

**Status:** Production-ready source library for future MenuList video assets  
**Generated:** July 13, 2026  
**Generator:** Google Lyria Realtime through the MenuList Audio AI Studio app  
**Format:** 48 kHz stereo, 16-bit PCM WAV, exactly 120 seconds

## Purpose

These tracks are reusable pre-mix sources. They are not final video mixes and they do not replace the founder-frozen `Midnight Lo-Fi Focus` bed in Owner Ease 30s V4.

The global selection authority is [`../track-policy.json`](../track-policy.json). `MenuList One Link Motion v2` is the primary default for new videos, while `MenuList Outlet Control v2` is the approved operational alternate. The two-minute tracks below remain the correct source pool when a longer runtime or a different narrative job requires them.

Choose one track by story:

| Track | Best use | Character | Master level | SHA-256 |
| --- | --- | --- | --- | --- |
| `menulist-bgm-120s-product-demo-seed-260714-v1.wav` | Product demos, onboarding, sales walkthroughs | Stable, minimal, neutral, narration-first | `-18.5 LUFS`, `2.6 LU` LRA, `-2.9 dBFS` true peak | `042cec34d748540df244dcc023602b1d6185cde91d3d47dbc39052f5947446d3` |
| `menulist-bgm-120s-owner-humanistic-seed-190430-v1.wav` | Owner POV, setup-ease stories, service-business explainers | Warm, approachable, lightly organic | `-17.6 LUFS`, `3.0 LU` LRA, `-6.2 dBFS` true peak | `47a72c320859785bc1b316e5b54d74c650cb0eb920725061ffa453d54eb86d36` |
| `menulist-bgm-120s-launch-momentum-seed-260713-v1.wav` | Launch films, feature reveals, conversion edits | Restrained opening, progressive lift, confident resolution | `-17.3 LUFS`, `4.2 LU` LRA, `-2.0 dBFS` true peak | `8679a5539ee6935d3c74f985f2cba66ddea8a2b81971773e993b74fdda813df9` |

## Selection Rules

- Start with **One Link Motion v2** for a new general MenuList video when its 54-second source fits the runtime and story.
- Use **Outlet Control v2** for multi-location and operational narratives when its firmer pulse is useful.
- Use **Product Demo** for longer UI-led walkthroughs when narration and comprehension are the priority and the shorter default source does not fit the runtime.
- Use **Owner Humanistic** when the story must feel easy and supportive for a non-technical SMB owner. Do not use it as the default infrastructure/authority sound.
- Use **Launch Momentum** when the edit needs a clear build and stronger final CTA energy without trailer-style drama.
- Do not select by genre alone. Audition under the real voiceover and picture edit.
- Do not use these files at a constant level. Apply the founder-approved voice-reactive ducking and timeline lift per video.
- Preserve the original generated WAV and generation manifest whenever a track is used.

## Mastering Applied

Each master uses the first 120 seconds of its longer source take, keeps the source dynamics, and applies only:

- static gain alignment for a consistent audition range;
- `0.4s` opening fade;
- `1.5s` closing fade beginning at `118.5s`;
- 48 kHz stereo PCM output.

No compression, limiting, catalogue normalization, vocalization, or external music source is added. Rebuild with `../scripts/build_120s_library.sh`.

## Release Boundary

These are generated-source candidates, not blanket public-use approvals. Before a track is assigned to a public video, review the current Lyria/Gemini service terms, run the final encoded-audio QA, and record the selected source in that video's production manifest.

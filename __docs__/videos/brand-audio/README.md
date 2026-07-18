# MenuList Brand Audio

**Status:** Three founder-approved MenuList tracks; One Link Motion v2 is the primary default
**Updated:** July 14, 2026

## Purpose

This folder contains the reusable audio identity for the current MenuList video workflow:

- one primary default track: `MenuList One Link Motion v2`;
- one approved operational alternate: `MenuList Outlet Control v2`;
- one calm baseline and frozen Owner Ease v1.0 track: `Midnight Lo-Fi Focus`;
- one original approval sting;
- no third-party song, paid music library, attribution-dependent track, or subscription music.

The retained calm baseline is assembled locally by `scripts/build_audio_lyria_midnight_lofi_v1.sh` from the 68-second `Midnight Lo-Fi Focus` Lyria Realtime take generated on July 12, 2026. Its opening 30 seconds are cleaned and shaped with a wider gain curve because the source is spectrally dense and almost constant in level. Source audio and generation metadata are stored under `source-tracks/lyria-realtime-midnight-lo-fi-focus-auto-20260712-124940/`.

The primary default and operational alternate are stored under `source-tracks/lyria-realtime-menulist-one-link-motion-v2-seed-260719-20260714-112840/` and `source-tracks/lyria-realtime-menulist-outlet-control-v2-seed-260721-20260714-113810/`. Their applied voice-reactive production mixes remain with v1.8 and v1.9 respectively.

This exact source, production edit, ducking profile, and approval sting are frozen for the Owner Ease 30s V4 video. Do not swap its music during later visual, caption, format, or export work unless the founder explicitly reopens audio selection for this named asset. Other MenuList videos may use a purpose-fit track while inheriting the same rights, narration-space, ducking, and QA rules.

## Founder-Approved Track Policy

The machine-readable policy lives in [`track-policy.json`](./track-policy.json).

1. **Primary default:** `MenuList One Link Motion v2`, seed `260719`. Start here for new MenuList launch, one-link, feature, and short-form conversion videos.
2. **Operational alternate:** `MenuList Outlet Control v2`, seed `260721`. Prefer it for multi-location, outlet governance, and controlled operational stories.
3. **Calm baseline:** `Midnight Lo-Fi Focus`. Keep it for deliberately calm owner-ease work and preserve its frozen assignment to Owner Ease `v1.0`.

Default means first audition choice, not forced reuse. Match the track to the narrative and duration. If an asset is longer than the approved source, generate a structured extension from the approved preset or use the two-minute library; do not carelessly loop a short source.

## Two-Minute Future-Asset Library

Three fixed-seed, voiceover-safe Lyria source beds are available under [`library/`](./library/README.md):

- `menulist-bgm-120s-product-demo-seed-260714-v1.wav` for product demos, onboarding, and sales walkthroughs;
- `menulist-bgm-120s-owner-humanistic-seed-190430-v1.wav` for owner-ease, founder POV, and service-business explainers;
- `menulist-bgm-120s-launch-momentum-seed-260713-v1.wav` for launch films, feature reveals, and conversion edits.

These are exact two-minute pre-mix masters, not automatic replacements for the frozen Owner Ease bed. Select by narrative job, audition under the final voiceover, and apply per-video ducking.

## Generation Presets

The recommended next-generation configuration is maintained in [`presets/README.md`](./presets/README.md), with a machine-readable handoff in `presets/menulist-lyria-preset-library-v2.json`. It defines seven purpose-specific presets for hero, walkthrough, owner-relief, approval, short-form, founder, and multi-location assets.

Do not add generic AI, cinematic-vocal, or near-duplicate technology presets. New presets must fill a missing narrative job and follow the same voiceover-safe, fixed-seed, source-ledger, and encoded-QA rules.

## Active Assets

| Asset | File | Use |
| --- | --- | --- |
| One Link Motion v2 source | `source-tracks/lyria-realtime-menulist-one-link-motion-v2-seed-260719-20260714-112840/menulist-one-link-motion-v2-seed-260719-20260714-112840.wav` | Primary default for new MenuList videos |
| Outlet Control v2 source | `source-tracks/lyria-realtime-menulist-outlet-control-v2-seed-260721-20260714-113810/menulist-outlet-control-v2-seed-260721-20260714-113810.wav` | Approved multi-location and operational alternate |
| Lyria Midnight Lo-Fi 30s bed | `mix/menulist-brand-bed-30s-lyria-midnight-lofi-v1.wav` | Calm baseline; frozen for Owner Ease v1.0 |
| Original approval sting | `sfx/menulist-approval-sting-original-v1.wav` | Final lockup or approved-state cue |
| Product Demo 120s source bed | `library/menulist-bgm-120s-product-demo-seed-260714-v1.wav` | Demonstrations, onboarding, sales |
| Owner Humanistic 120s source bed | `library/menulist-bgm-120s-owner-humanistic-seed-190430-v1.wav` | Owner-focused and founder-led explainers |
| Launch Momentum 120s source bed | `library/menulist-bgm-120s-launch-momentum-seed-260713-v1.wav` | Launch and feature-reveal edits |

## Mix Behavior

- Indian-English narration stays dominant.
- Music is audible from frame zero.
- Music ducks during speech and recovers through pauses.
- Energy rises toward the final lockup without a sudden end-only jump.
- The approval sting remains subtle.
- No robot, glitch, futuristic AI, or generic notification sound is used.

## Rights Boundary

The approved tracks are generated output rather than third-party catalog songs. Google states that Lyria Realtime output is watermarked and that Google does not claim ownership of generated output under the Gemini API terms. MenuList remains responsible for reviewing the generated material and complying with the current service terms at generation and publication time. Keep the WAV, preset, seed, timestamp, manifest, and hashes with the project. The approval sting remains an original local procedural asset.

Rejected third-party and exploratory generation binaries were removed after the founder decision was frozen. Their decision hashes remain below; they are not production dependencies.

## Output Hashes

| File | SHA-256 |
| --- | --- |
| `source-tracks/lyria-realtime-menulist-one-link-motion-v2-seed-260719-20260714-112840/menulist-one-link-motion-v2-seed-260719-20260714-112840.wav` | `ea6d0e959feea758593fd5865c30b2475937e8ea4207b8bc39ad6291d09355e3` |
| `source-tracks/lyria-realtime-menulist-outlet-control-v2-seed-260721-20260714-113810/menulist-outlet-control-v2-seed-260721-20260714-113810.wav` | `828b6c8fe35bbc5a980c9ff5ebe0f4e9f0ed46362ce559e1b4865c92bc4febf2` |
| `source-tracks/lyria-realtime-midnight-lo-fi-focus-auto-20260712-124940/midnight-lo-fi-focus-seed-auto-20260712-124940.wav` | `88d3b595dee25aa9c8d7117407439722df3192bd64ac892a2c331a476c9dde71` |
| `mix/menulist-brand-bed-30s-lyria-midnight-lofi-v1.wav` | `4206408c441bdf5e5e60338df8653f9431acb7fa1ee7d88aead31b762815c434` |
| `sfx/menulist-approval-sting-original-v1.wav` | `2066c78fcc9ccf86d50ab7c44bc5b4722e014b8b6cf6ff344cf497d4125978ea` |
| `library/menulist-bgm-120s-product-demo-seed-260714-v1.wav` | `042cec34d748540df244dcc023602b1d6185cde91d3d47dbc39052f5947446d3` |
| `library/menulist-bgm-120s-owner-humanistic-seed-190430-v1.wav` | `47a72c320859785bc1b316e5b54d74c650cb0eb920725061ffa453d54eb86d36` |
| `library/menulist-bgm-120s-launch-momentum-seed-260713-v1.wav` | `8679a5539ee6935d3c74f985f2cba66ddea8a2b81971773e993b74fdda813df9` |

## Current Applied Videos

- [v1.8 One Link Motion primary-default MP4](../hyperframes/menulist-owner-ease-30s-v1.8/deliverables/menulist-owner-ease-30s-v1.8.mp4)
- [v1.9 Outlet Control approved-alternate MP4](../hyperframes/menulist-owner-ease-30s-v1.9/deliverables/menulist-owner-ease-30s-v1.9.mp4)
- [v1.0 Midnight Lo-Fi frozen-baseline MP4](../hyperframes/menulist-owner-ease-30s-v4-landscape-brand-type/deliverables/menulist-owner-ease-30s-lyria-midnight-lofi-v1.mp4)

The v1.8 and v1.9 comparison encodes are each `-15.5 LUFS` integrated and `-2.0 dBFS` true peak. The retained v1.0 baseline is `-15.6 LUFS` integrated, `1.3 LU` range, and `-2.6 dBFS` true peak.

## Removed Experiment Record

| Experiment | Decision evidence |
| --- | --- |
| Custom Lyria seed `190429` | Source `e22c0d9145ca00424be801638b1fc4c5b54c40d81d01d7bd4b50cdc396d79dce`; comparison bed `e3f13b8f531cb69b0afbb4cc1b7894ef23a1d4162cbca21396d915b60934cdff`; MP4 `7193dbe2941d96d96a2d2adaabc1f035f9d96c46bf2c37085823f01282a627dc`; rejected as too cinematic. |
| First MenuList Lyria seed `260712` | Full source `8e4728a83e6c4200075f8d6e966d3db353cbde576f572cde328bc61979dd8196`; audition `109913c6885bb3ffcd9b53c451744013866141eec34f3d89181126e27d515389`; superseded by Midnight Lo-Fi. |
| Pixabay Digital Platforms | Removed third-party comparison; not part of the active generated-source workflow. |
| Potassium CC0 stems | Removed exploratory stem mix; not part of the active sound. |

The rejected binaries above are intentionally absent. The three founder-approved sources, their applied production masters, and the current two-minute library are retained generated music inputs.

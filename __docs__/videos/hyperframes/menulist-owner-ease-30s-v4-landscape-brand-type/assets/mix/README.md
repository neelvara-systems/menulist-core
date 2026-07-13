# Owner Ease 30s Current Audio Mix

**Output:** `owner-ease-30s-lyria-midnight-lofi-v1-master.wav`
**Status:** Founder-approved and frozen for Owner Ease 30s V4

## Inputs

- Voice: `../audio/voice-macos-en-in-tara-192-selected-processed.wav`
- BGM: `../../../../brand-audio/mix/menulist-brand-bed-30s-lyria-midnight-lofi-v1.wav`
- Approval sting: `../../../../brand-audio/sfx/menulist-approval-sting-original-v1.wav`

## Mix Contract

- Music is assembled by `../../scripts/build_audio_lyria_midnight_lofi_v1.sh` from the founder-selected Midnight Lo-Fi Focus Lyria take.
- The dense source is high/low-pass cleaned, notched around narration, and given a wider gain lift across the timeline.
- Music gain rises gradually across 30 seconds.
- Voice-triggered sidechain uses `2.8:1`, `35ms` attack, and `430ms` release so the calm generated bed remains present without competing with narration.
- Voice begins after `220ms` so music is present from frame zero.
- Final output targets `-15.5 LUFS` and no more than `-1.8 dBTP`.
- Temporary beds, ducked stems, pre-masters, and loudnorm pass files are reproducible and ignored.

## Hashes

- Processed voice: `1aa7dc1e7dc09292a104fe57b3ca3cc383eb14b2c0653a1a61b9f1c09c866f5e`
- Lyria source: `88d3b595dee25aa9c8d7117407439722df3192bd64ac892a2c331a476c9dde71`
- Lyria bed: `4206408c441bdf5e5e60338df8653f9431acb7fa1ee7d88aead31b762815c434`
- Original approval sting: `2066c78fcc9ccf86d50ab7c44bc5b4722e014b8b6cf6ff344cf497d4125978ea`
- Current master: `36d998a98327bfa1c9270b9433d0fef5a231667644ac25fc32a5606169dd2431`

The source is generated Lyria Realtime output. See [brand-audio](../../../../brand-audio/README.md) for the retained preset, generation manifest, and publication boundary.

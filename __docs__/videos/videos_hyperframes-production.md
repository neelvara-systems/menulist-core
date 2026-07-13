# Videos - HyperFrames Production

**Status:** Active local production handoff
**Updated:** July 13, 2026

## Production Decision

MenuList video production uses local HyperFrames and FFmpeg. The [founder-approved production standard](./videos_founder-approved-production-standard.md) controls the message, design, motion, logo, audio, and QA rules. The [operating guide](./videos_hyperframes-operating-guide.md) controls implementation, skill routing, and optional dependencies.

Before animation begins:

1. complete project `conversion.md` from [the conversion brief template](./videos_conversion-brief-template.md);
2. register the exact asset version in [the campaign measurement ledger](./videos_campaign-measurement-ledger.md);
3. admit only approved, truthful, fictional, or permissioned assets;
4. keep all production source and selected media local;
5. render working files under ignored `renders/` and promote only the current review master to `deliverables/`.

## Current Active Project

| Project | Deliverable | Status |
| --- | --- | --- |
| [Owner Ease 30s V4 Landscape](./hyperframes/menulist-owner-ease-30s-v4-landscape-brand-type/) | [Current 1920 x 1080 founder-review MP4](./hyperframes/menulist-owner-ease-30s-v4-landscape-brand-type/deliverables/menulist-owner-ease-30s-lyria-midnight-lofi-v1.mp4) | Background music founder-approved and frozen; final publishing remains subject to product, claim, destination, and current service-terms review |

Superseded untracked V3, V4 Cinematic UI, and prior vertical working copies were removed on July 12, 2026. Native `9:16` and `1:1` versions will be rebuilt from the approved current standard after the landscape master is frozen; old aspect-ratio experiments are not production authority.

Tracked legacy projects remain historical repo evidence. Do not use them as templates for new work.

## Active Project Contents

Keep only:

- `index.html`, `hyperframes.json`, `package.json`, and required metadata;
- `README.md`, `DESIGN.md`, `storyboard.md`, `conversion.md`, and `script.txt`;
- the original MenuList symbol, embedded Inter font, selected processed voice, current audio master, retained music source and rights evidence, bed, and sting;
- the current audio build script and local voice-generation helper;
- one promoted current MP4 under `deliverables/`.

Do not retain:

- render iterations;
- snapshots, encoded QA contact sheets, or final-review frame dumps;
- voice auditions;
- pre-masters, loudnorm logs, temporary ducked beds, or backup mixes;
- rejected or unverified music candidates;
- copied predecessor project folders.

## Working-Output Contract

The root `.gitignore` excludes reproducible HyperFrames working output:

```text
renders/
snapshots*/
encoded-*/
.media/
assets/audio-tests/
audio pre-masters, loudnorm pass files, and temporary BGM stems
```

Final reviewed MP4s belong under `deliverables/`. A deliverable must not be promoted until source checks, encoded-frame review, audio checks, and claim review pass.

## Current Commands

```bash
source ~/.nvm/nvm.sh
nvm use 22
cd __docs__/videos/hyperframes/menulist-owner-ease-30s-v4-landscape-brand-type && npm run check
scripts/build_audio_lyria_midnight_lofi_v1.sh
npx hyperframes render \
  --output renders/menulist-owner-ease-30s-lyria-midnight-lofi-v1.mp4 \
  --quality high \
  --fps 30 \
  --workers 1 \
  --experimental-fast-capture=false
```

After encoded QA passes:

```bash
cp renders/menulist-owner-ease-30s-lyria-midnight-lofi-v1.mp4 \
  deliverables/menulist-owner-ease-30s-lyria-midnight-lofi-v1.mp4
```

## Verification

The current promoted review master is:

- H.264 video, 1920 x 1080, 30fps;
- AAC stereo audio at 48 kHz;
- 30.04 seconds;
- 11,277,485 bytes;
- `-15.6 LUFS` integrated, `1.3 LU` range, `-2.6 dBFS` true peak;
- no detected blank or black interval;
- SHA-256 `efcb46d8fdf44b60fb83ec04f51f92a4bb0e53221f62c63376beeb7676fe5af7`.

## Next Step

Continue iterating only this landscape project until founder approval. Then create native vertical and square child projects from the frozen source standard, not by restoring superseded folders or cropping the landscape MP4.

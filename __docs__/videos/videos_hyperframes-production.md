# Videos - HyperFrames Production

**Status:** Active local production handoff
**Updated:** July 18, 2026

## Production Decision

MenuList video production uses local HyperFrames and FFmpeg. The [founder-approved production standard](./videos_founder-approved-production-standard.md) controls the message, design, motion, logo, audio, and QA rules. The [operating guide](./videos_hyperframes-operating-guide.md) controls implementation, skill routing, and optional dependencies.

Before animation begins:

1. complete project `conversion.md` from [the conversion brief template](./videos_conversion-brief-template.md);
2. register the exact asset version in [the campaign measurement ledger](./videos_campaign-measurement-ledger.md);
3. admit only approved, truthful, fictional, or permissioned assets;
4. adopt or resolve media through `/media-use` with `DO_NOT_TRACK=1` and `--local-only`; never fall through to paid, hosted, account-backed, or metered providers;
5. keep all production source and selected media local;
6. retain commercial-rights evidence separately from the local media manifest;
7. render working files under ignored `renders/` and promote only the current review master to `deliverables/`.

## Current Active Project

| Project | Deliverable | Status |
| --- | --- | --- |
| [Owner Ease 30s V4 Landscape](./hyperframes/menulist-owner-ease-30s-v4-landscape-brand-type/) | [Current 1920 x 1080 founder-review MP4](./hyperframes/menulist-owner-ease-30s-v4-landscape-brand-type/deliverables/menulist-owner-ease-30s-lyria-midnight-lofi-v1.mp4) | Background music founder-approved and frozen; final publishing remains subject to product, claim, destination, and current service-terms review |

## Current Founder-Review Pass

| Version | Project | Deliverable | Decision |
| --- | --- | --- | --- |
| `v1.7` | [Owner Ease 30s Workflow Polish](./hyperframes/menulist-owner-ease-30s-v1.7/) | [1920 x 1080 MP4](./hyperframes/menulist-owner-ease-30s-v1.7/deliverables/menulist-owner-ease-30s-v1.7.mp4) | Applies the current motion, live-site typography, masked-handoff, versioning, and encoded-QA workflow while retaining the frozen Owner Ease voice and music master |
| `v1.8` | [Owner Ease 30s One Link Motion comparison](./hyperframes/menulist-owner-ease-30s-v1.8/) | [1920 x 1080 MP4](./hyperframes/menulist-owner-ease-30s-v1.8/deliverables/menulist-owner-ease-30s-v1.8.mp4) | Exact `v1.7` visual with the founder-supplied One Link Motion v2 source, production speech carve, voice-reactive ducking, and final lift |
| `v1.9` | [Owner Ease 30s Outlet Control comparison](./hyperframes/menulist-owner-ease-30s-v1.9/) | [1920 x 1080 MP4](./hyperframes/menulist-owner-ease-30s-v1.9/deliverables/menulist-owner-ease-30s-v1.9.mp4) | Exact `v1.7` visual with the founder-supplied Outlet Control v2 source, deeper speech carve, lower rhythmic bed, voice-reactive ducking, and final lift |
| `v1.10` | [Owner Ease 30s Clean Brand Close](./hyperframes/menulist-owner-ease-30s-v1.10/) | [1920 x 1080 MP4](./hyperframes/menulist-owner-ease-30s-v1.10/deliverables/menulist-owner-ease-30s-v1.10.mp4) | Primary One Link Motion mix with the simplified MenuList, tagline, and `menulist.ai` end signature |
| `v1.11` | [Owner Ease 30s Clean Brand Close - Operational Alternate](./hyperframes/menulist-owner-ease-30s-v1.11/) | [1920 x 1080 MP4](./hyperframes/menulist-owner-ease-30s-v1.11/deliverables/menulist-owner-ease-30s-v1.11.mp4) | Same approved clean close with the Outlet Control operational alternate mix |
| `v1.12` | [Owner Ease 30s Readable URL Close](./hyperframes/menulist-owner-ease-30s-v1.12/) | [1920 x 1080 MP4](./hyperframes/menulist-owner-ease-30s-v1.12/deliverables/menulist-owner-ease-30s-v1.12.mp4) | Retained predecessor: One Link Motion mix with a phone-legible, non-button `menulist.ai` destination label |
| `v1.13` | [Owner Ease 30s Readable URL Close - Operational Alternate](./hyperframes/menulist-owner-ease-30s-v1.13/) | [1920 x 1080 MP4](./hyperframes/menulist-owner-ease-30s-v1.13/deliverables/menulist-owner-ease-30s-v1.13.mp4) | Retained readable-close predecessor with the Outlet Control operational alternate mix |
| `v1.14` | [Owner Ease 30s Centered URL Close](./hyperframes/menulist-owner-ease-30s-v1.14/) | [1920 x 1080 MP4](./hyperframes/menulist-owner-ease-30s-v1.14/deliverables/menulist-owner-ease-30s-v1.14.mp4) | Current primary: the compact domain label is centered within the right-hand wordmark column; name and tagline remain left-aligned |
| `v1.15` | [Owner Ease 30s Centered URL Close - Operational Alternate](./hyperframes/menulist-owner-ease-30s-v1.15/) | [1920 x 1080 MP4](./hyperframes/menulist-owner-ease-30s-v1.15/deliverables/menulist-owner-ease-30s-v1.15.mp4) | Same approved centered close with the Outlet Control operational alternate mix |

Superseded untracked V3, V4 Cinematic UI, and prior vertical working copies were removed on July 12, 2026. Native `9:16` and `1:1` versions will be rebuilt from the approved current standard after the landscape master is frozen; old aspect-ratio experiments are not production authority.

Tracked legacy projects remain historical repo evidence. Do not use them as templates for new work.

## Active Project Contents

Keep only:

- `index.html`, `hyperframes.json`, `package.json`, and required metadata;
- `README.md`, `DESIGN.md`, `storyboard.md`, `conversion.md`, and `script.txt`;
- the original MenuList symbol, embedded Inter font, selected processed voice, current audio master, retained music source and rights evidence, bed, and sting;
- `assets/licenses/media-manifest.jsonl` plus current rights evidence when any third-party or hosted asset enters the approved render;
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

`.media/` is the local working inventory and cache. Before final handoff, copy only the records used by the approved render into `assets/licenses/media-manifest.jsonl`; keep the matching license or terms evidence beside it. Final reviewed MP4s belong under `deliverables/`. A deliverable must not be promoted until source checks, encoded-frame review, audio checks, rights review, and claim review pass.

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

Review `v1.14` as the primary centered-close pass and `v1.15` as its operational-audio alternate. `v1.12` and `v1.13` remain immutable readable-close predecessors; `v1.10` and `v1.11` remain clean-close predecessors; `v1.8` and `v1.9` remain music-comparison evidence; `v1.7` remains the retained visual source and `v1.0` remains the frozen calm baseline. Versions `v1.1` through `v1.6` remain ledger history only. Any later material post-delivery change receives `v1.16`. Native vertical or square derivatives must be rebuilt from the selected source standard rather than cropped from a landscape MP4.

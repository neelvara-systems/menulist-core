# Video Reel Studio - Implementation

## Runtime Contract

Video Reel Studio must support two output modes:

- `brief`: script, shot list, caption, overlays, and edit instructions.
- `rendered`: generated video file plus the brief metadata used to create it.

The product must remain useful when only `brief` mode is enabled.

## Flow

1. Load campaign, source facts, channel targets, and brand style.
2. Create a reel brief with scenes, timing, hook, phone-camera plan, product/service placement, B-roll checklist, overlays, caption, and CTA.
3. Estimate credits for any render attempt.
4. If rendering is enabled, send the normalized brief to the video provider adapter.
5. Store partial outputs if rendering fails.
6. Run Creative Trust Center checks against script, overlays, and final asset metadata.
7. Hand approved outputs to export, calendar, or channel workflow.

## Data Objects

| Object | Purpose |
| --- | --- |
| `videoBriefs` | Source-linked reel plans and scripts. |
| `videoRenders` | Provider attempts, status, asset URL, and costs. |
| `videoTrustReports` | Checks for claims, likeness, offer/date, and CTA. |
| `videoExports` | Download or channel handoff events. |

## Provider Boundary

Video rendering providers must be optional, feature-flagged, timeout-limited, and usage-metered. Provider output must be treated as draft until trust review passes.

The active export/download runtime uses brief mode only. It adds camera plan, B-roll, product-placement, and consent fields to existing campaign output handoff fields. It does not call an avatar, voiceover, video-render, or upload provider.

## Acceptance

- Brief mode works without video provider credentials.
- Failed render attempts keep the script and shot list.
- Owner can approve or reject the rendered video separately from the script.

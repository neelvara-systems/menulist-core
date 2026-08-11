# Photo And Clip Missions - Specification

## Owner Problem

An SMB owner often has the real product, service, staff, or venue in front of them but lacks a suitable visual. A generic asset picker does not explain what to capture or why it matters. CampaignCue should ask for one useful visual in owner language and connect it directly to the campaign it unlocks.

## Product Promise

`See one useful photo task -> capture or choose the file -> confirm permission -> upload privately -> let CampaignCue re-evaluate the campaign.`

## Mission Source

Photo missions come from `CampaignCueRecipe.photoTasks`. They are deterministic recipe guidance, not model-generated instructions and not persisted as independent records.

Each surfaced task includes:

- the owner-facing instruction;
- the campaign or recipe it helps;
- whether the task is still missing;
- the existing Asset Library as the destination.

## Accepted Media

| Type | Accepted MIME families | Client and server maximum |
| --- | --- | ---: |
| Image | JPEG, PNG, WebP, GIF | 12 MiB |
| Video clip | MP4, QuickTime, WebM | 250 MiB |
| Audio | Existing Video Studio path only | 50 MiB |
| Preview | Generated WebP | 1 MiB |

Photo/Clip Missions expose images and video clips. Audio remains available to Video Studio but cannot fulfill a visual mission.

## Readiness Contract

A visual asset is `ready` only when all of the following are true:

- `assetType` is `image`, `logo`, or `video`;
- `status` is `ready`;
- `rightsStatus` is `confirmed`;
- `file.storagePath` is present and belongs to the workspace;
- `file.storageGeneration` is present from authoritative Storage metadata.

`needs_review` rights can preserve and preview the upload, but cannot silently unlock a final campaign. Metadata-only rows never count as captured media.

## Rights And Consent

The owner must confirm one of these states before upload:

- no person is shown;
- owner confirmed permission from people shown;
- creator release is available;
- customer release is available;
- permission still needs review.

The last state writes `rightsStatus: needs_review`; all confirmed states write `rightsStatus: confirmed`. CampaignCue does not infer consent from pixels.

## Failure Behavior

- Unsupported, empty, or oversized files are rejected before upload.
- The server rechecks object metadata, MIME type, size, generation, and file signature before creating the asset record.
- If registration fails, the client attempts to remove uploaded source and preview objects.
- If preview decoding times out or dimensions are unsafe, no Storage write starts.
- A failed upload never marks a mission complete.

## Non-Goals

- No mission collection or completion write.
- No background camera access.
- No biometric, face, or identity recognition.
- No automatic rights determination.
- No media enhancement/provider call.
- No direct posting or sending.
- No cloud video rendering.

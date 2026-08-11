# Photo And Clip Missions - Implementation

## Architecture

```text
Campaign recipe photoTasks
  -> Daily Desk task card
  -> existing Asset Library capture panel
  -> local MIME/size/decode validation
  -> short-lived CampaignCue Firebase custom token
  -> private resumable source + preview upload
  -> POST /api/campaigncue/assets
  -> auth/workspace/rate-limit/Zod guards
  -> authoritative Storage metadata + signature validation
  -> existing assets document + one audit event
  -> local overview merge
  -> deterministic readiness recomputation
```

## Code Ownership

| Responsibility | Location |
| --- | --- |
| Feature flag | `src/config/features.ts` |
| Media size constants | `src/constants/campaigncue/database.ts` |
| Durable visual readiness and mission tags | `src/lib/campaigncue/mediaMissions.ts` |
| Browser preview and resumable upload | `src/lib/campaigncue/assetUploadClient.ts` |
| Token issuance | `src/app/api/campaigncue/firebase-token/route.ts` |
| Asset registration | `src/app/api/campaigncue/assets/route.ts`, `src/lib/campaigncue/server.ts` |
| Owner UI | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` |
| Existing Video Studio consumer | `src/components/templates/campaigncue/CampaignCueVideoStudio.tsx` |
| Private Storage policy | `storage-campaigncue.rules` |

## Shared Uploader Rule

Photo Missions and Video Studio use `uploadCampaignCueMediaAsset`. The helper accepts bounded rights, consent, and tag metadata, generates a private preview, uploads source and preview, and registers the result through the existing guarded asset route. Product surfaces may narrow accepted file types but may not create separate Storage registration behavior.

The helper signs out the temporary Firebase client session after success or failure. The NextAuth owner session remains unaffected.

## Readiness Rule

All decision, Daily Desk, operating-loop, and pack-template consumers use one shared durable-visual predicate. This prevents divergent logic and stops audio or metadata notes from being interpreted as a campaign photo.

## UI Contract

- `Take photo` opens a camera-oriented image input where supported.
- `Choose photo or clip` opens the existing file picker.
- Rights/consent selection is shown before file selection.
- Progress is visible without a listener or overview refetch.
- The response is merged into the already-loaded overview.
- Metadata-only registration remains available under an explicitly separate `Add a file note without upload` label.

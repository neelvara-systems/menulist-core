# Item Photo Capture Assist Firebase Cost

**Status:** Implemented June 25, 2026

## Summary

Item Photo Capture Assist adds no Firebase operation by itself. Camera preview, canvas capture, and readiness checks run in the browser.

The only Firebase cost happens when the owner accepts a captured photo and uses the existing item image upload/save action.

June 30 diagnostic hardening is cost-neutral. Failed browser-local readiness sampling logs bounded `item_photo_readiness_stats_failed` diagnostics and keeps the existing ready-to-save fallback; it adds no Firebase reads, writes, deletes, Storage operations, Cloud Functions, API routes, rules, indexes, owner settings, or deploy requirement.

## Reads

| Operation | Firebase reads | Notes |
| --- | ---: | --- |
| Open camera guide | 0 | Browser-local. |
| Capture photo | 0 | Browser-local canvas capture. |
| Readiness feedback | 0 | Browser-local image sampling. |
| Existing project context | Existing | The modal already receives project/menu data. |

## Writes

| Operation | Firebase writes | Notes |
| --- | ---: | --- |
| Capture photo | 0 | Local only. |
| Add captured photo to selected list | 0 | Local React state only. |
| Upload accepted item photo | Existing project save write | Same as current item image upload through `associateItemImagesWithProject`. |

## Storage

| Operation | Storage writes | Notes |
| --- | ---: | --- |
| Capture photo | 0 | Local file only. |
| Upload accepted item photo | Existing `menuItem` variants | Current media system uploads `thumb`, `small`, `medium`, and `large` variants to `media/menuItem/{tId}/{sId}/...`. |

## Deletes

No new delete behavior.

## Cloud Functions

No Cloud Function is added or changed.

## API Routes

No API route is added or changed.

## Security Rules

No Firestore or Storage rule change is needed. Accepted photos continue to use the existing authenticated `media/menuItem/{tId}/{sId}/...` Storage path.

## Cost Boundary

The capture assistant must never create:

- a photo readiness collection
- an image analysis job
- a camera session document
- a per-capture analytics event
- a new Storage object before owner acceptance

# Item Photo Capture Assist Spec

**Status:** Implemented June 25, 2026  
**Product:** MenuList  
**Audience:** Product, engineering, support

## Executive Summary

Item Photo Capture Assist adds a calm guided camera option to the existing item image upload flow. It helps owners take a usable food photo from the same modal they already use to upload or generate item images.

The feature does not change how MenuList stores, prepares, or publishes item images. A captured photo becomes the same local upload object as a selected file, then the existing `prepareMediaImage` and `associateItemImagesWithProject` path handles compression, variants, immutable Storage upload, and project save.

## Goals

| Goal | Decision |
| --- | --- |
| Reduce bad item photos at the source | Add visual capture guidance before upload. |
| Preserve current media architecture | Reuse `menuItem` media profile and existing image upload flow. |
| Keep owner effort low | One optional guided capture, not a mandatory two-photo workflow. |
| Avoid scoring-heavy UI | Show calm readiness feedback, not percentages or photo grades. |
| Avoid Firebase cost expansion | Keep checks browser-local and reuse existing Storage/project writes. |

## Out Of Scope

- Mandatory two photos per item.
- New `media[]` item schema.
- New image metadata documents.
- New `/item-media/` Storage tree.
- Server-side photo analysis.
- AI food detection, clutter detection, plate detection, duplicate detection, or background replacement.
- Visible 100-point scores, menu photo percentages, or owner-facing quality dashboards.
- New Business Health action type.
- New public marketing route.

## ChatGPT Review Decisions

| ChatGPT point | Decision | Reason |
| --- | --- | --- |
| Guided capture is useful | Accept | Owners often add photos from phones, and current upload flow can accept a better source photo. |
| Top-down and close-up modes | Partial | Keep two simple visual guide modes, but do not require two final saved photos. |
| Quality score out of 100 | Reject | MenuList language governance rejects visible scores and explanation-heavy UI. |
| Block poor photos | Partial | Use soft local feedback. Current media docs intentionally avoid rejecting photos for blur or orientation. |
| New output variants such as 4:5 hero | Reject | Existing `menuItem` profile is `1:1` or `4:3` with `thumb/small/medium/large` variants. |
| New item media JSON schema | Reject | Current project item image shape remains `items[].images[]` with URL/name-compatible objects. |
| Missing media cleanup dashboard | Reject | Menu Manager filters and Business Health `image_gap` already cover missing-photo attention without a new dashboard. |
| Auto alt text | Already covered | `src/lib/media/altText.ts` derives public image alt text from item/category names. |

## Owner Experience

The owner opens the existing item image modal and selects the upload tab.

If camera access is available, the owner sees:

- `Top-down`
- `Closer`
- a live camera frame
- a simple visual guide overlay
- `Use photo`
- `Retake`
- the existing file upload fallback

If camera access is unavailable, the upload tab still works exactly as before.

## Copy Rules

Use:

- `Top-down`
- `Closer`
- `Ready to save`
- `Use another photo`
- `Move near better light`
- `Hold steady and retake`
- `Keep the item inside the frame`

Avoid:

- `Smart`
- `AI-powered`
- `Dynamic`
- `Photo score`
- `Optimization`
- `You should`
- `We recommend`

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR1 | Add guided camera capture to the existing item image upload modal when `ENABLE_ITEM_PHOTO_CAPTURE_ASSIST` is true. |
| FR2 | Keep current upload/drag/drop flow available regardless of camera support. |
| FR3 | Capture still images from the browser camera into a `File` or `Blob` without immediate Firebase upload. |
| FR4 | Prepare captured photos with `prepareMediaImage(file, 'menuItem')`. |
| FR5 | Add captured photos to the existing selected-image list using the same `UserUploadedFileType` fields as normal upload. |
| FR6 | Show local readiness feedback for brightness, sharpness, and framing. |
| FR7 | Do not persist readiness feedback to Firestore or Storage metadata. |
| FR8 | Do not change public menu rendering. |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR1 | No new runtime dependency. |
| NFR2 | No dependency upgrade. |
| NFR3 | No server route. |
| NFR4 | No Firestore read before capture. |
| NFR5 | No Firebase Storage upload until the owner clicks the existing upload/save action. |
| NFR6 | Camera stream stops when the modal closes, the user captures a photo, or camera mode is turned off. |
| NFR7 | Mobile touch targets remain at least 44px where practical. |

## Existing Truth Anchors

| Area | Current truth |
| --- | --- |
| Media profile | `src/lib/media/imageProfiles.ts` defines `menuItem` as `1:1` or `4:3`. |
| Preparation | `src/lib/media/prepareMediaImage.ts` validates, crops, resizes, compresses, and creates variants. |
| Upload | `src/database/projects/index.ts` routes item image upload through `uploadPreparedMediaImage`. |
| Association | `src/components/templates/main-app/projects/editorView/utils/associateItemImages.ts` appends uploaded images to the matched item. |
| Missing photos | `functions/src/analytics/dashboardSummaryAggregation.ts` emits `image_gap` from existing catalog and analytics truth. |

## Feature Gate Result

| Gate | Result | Reason |
| --- | --- | --- |
| Removes a decision | Pass | Owner gets a frame instead of interpreting photography advice. |
| Would absence be noticed | Pass | Poor or missing item photos are already surfaced as menu quality gaps. |
| Strengthens customer decision | Pass | Better item photos help customers understand the dish faster. |
| One sentence | Pass | Guides owners while taking an item photo. |
| Still matters in 3 years | Pass | Food/item presentation is stable menu infrastructure, not a trend. |

## Open Questions

None for the scoped implementation. AI detection and persisted media metadata remain explicitly out of scope.

## Doctrine Preservation Check

No new constitution-level doctrine is needed. This feature reinforces existing doctrine: keep owner effort low, avoid visible scoring, and reuse system-owned media preparation.

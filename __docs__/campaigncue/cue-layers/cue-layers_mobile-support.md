# CueLayers - Mobile Support

## Decision

**Mobile support: PARTIAL**

CueLayers should support mobile-friendly intake, status, preview, and download. Full precision layer editing remains desktop-first because it needs detailed selection, drag handles, layer repair, z-order control, and text/vector inspection.

## Feature Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Pass | Owners may reuse or upload campaign images during daily/weekly campaign preparation. |
| Speed | Partial | Upload/start/status can be quick. Reconstruction and repair are long-running background work, not a sub-5-second mobile task. |
| Touch | Partial | Upload, preview, accept fallback, and download work with thumb taps. Detailed layer editing and mask repair do not. |
| Value | Pass | Owners often have assets on their phone and may need to upload or download while away from a desk. |

Because speed and touch only partially pass, mobile gets a limited operational subset.

## Mobile-Safe Actions

| Action | Mobile behavior |
| --- | --- |
| Upload source image | Supported with large upload button and file type guidance. |
| Start CueLayers job | Supported after showing size/cost/time expectation. |
| View progress | Supported as one status card. |
| Cancel pending job | Supported. |
| Open preview | Supported as static preview, not full editor. |
| Accept flat-safe result | Supported when full reconstruction is unsafe. |
| Download/export ready PNG | Supported. |
| Send to desktop editor | Supported through "Open on desktop" or saved design state. |
| Full layer editing | Desktop-first. |
| Mask repair/vector repair | Desktop-first. |
| Text safety review with crop diff | Desktop-first by default; simple "keep as image" action can be mobile. |

## Mobile UX Rules

- Use clear owner language: "We kept this text as an image for safety."
- Use 44px minimum tap targets.
- Avoid dense layer trees on phone.
- Avoid drag-based precision editing.
- Show one primary action per state.
- Keep upload failure messages specific but not technical.
- Do not expose model/provider names to owners unless support/debug view is active.

## Mobile Flow

```text
CampaignCue mobile workspace
  -> Asset Library or Creative Studio
  -> Reuse old image
  -> Upload/select generated source
  -> Status card
  -> Preview result
  -> Download or open on desktop
```

## PWA Shell Contract

If exposed in the MenuList/CampaignCue owner mobile shell, CueLayers mobile screens must stay inside the existing mobile navigation pattern and reuse shared auth/session state. They must not use forced reloads or a separate mobile auth flow.

## Data And Auth

- Same NextAuth session.
- Same CampaignCue workspace scope.
- Same API routes as desktop.
- Same rate limits.
- Same feature flags.
- Same product-owned Storage and Firestore boundaries.

## Mobile Empty/Error States

| State | Copy direction |
| --- | --- |
| No source | "Upload a poster or choose a saved CampaignCue image." |
| Large file | "This image is too large for phone upload. Try a smaller file or use desktop." |
| Processing | "Preparing editable layers. You can leave this screen." |
| Needs review | "Some parts need review before editing." |
| Unsupported | "This image cannot be safely separated. You can still use it as a flat image." |
| Text unsafe | "This text was kept as image so the words do not change." |
| Export ready | "Download the image and post it manually." |

## Mobile Acceptance

- Mobile upload/status/preview has no horizontal overflow.
- Upload and cancel buttons are at least 44px high.
- Status screen unsubscribes or stops polling after completion, cancel, or route leave.
- Mobile does not attempt full Fabric layer editing unless a dedicated mobile-specific editor subset is explicitly designed.
- Download/export respects CampaignCue export/download-only boundary.

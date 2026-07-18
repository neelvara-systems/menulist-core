# Visual Profile Completion Spec

## Purpose

Help owners keep the visual part of their public business profile complete without making them manage channels, placements, campaigns, or technical image rules.

The feature answers one owner question:

> Is the public business profile missing an important photo?

## In Scope

- Show a compact completion card inside the Official Page settings surface.
- Check whether the OBP has a main photo.
- Check whether the OBP gallery has the minimum useful number of business photos for the store category.
- Check whether at least one menu or service photo exists when project summaries are already available.
- Use only already-loaded store/public presence/project summary data.
- Keep copy calm and action-oriented.
- Work on desktop and owner mobile.
- Stay behind a feature flag.

## Out Of Scope

- AI image classification.
- AI-generated photo placement.
- Social post generation.
- Campaign planning.
- Direct posting to Google, Instagram, Facebook, WhatsApp, or ads.
- A drag-and-drop gallery editor.
- New public image categories.
- New owner-facing settings.
- New Firestore collections or Storage paths.

## Owner Experience

The owner sees a small card near the current OBP photo controls.

When complete:

- Status: `No action needed`
- The checklist shows the required visual pieces as complete.

When incomplete:

- Status: `Needs attention`
- The checklist names the missing visual pieces.
- The owner uses the existing cover, gallery, or menu image controls to fix the gap.

## Completion Rules

### Main Photo

Complete when `publicPresence.businessCover` exists.

### Business Photos

Complete when the gallery has the minimum photo count for the resolved business category.

Baseline counts:

- food: 3
- service: 3
- health: 3
- creative: 3
- retail: 2
- professional: 2
- specialty: 2

The count is based on unique, trimmed, non-empty URLs in `publicPresence.photos[]`; repeating the same stored image cannot satisfy another required photo.

### Menu Or Service Photo

Complete when project summaries are available and at least one active non-special project has `projectImage`.

If project summaries are not available on a surface, this task is omitted instead of causing an extra read.

## Business Category Resolution

The feature must use the shared business type/category resolver. It must not create a second category taxonomy.

## Public Output

The public OBP stays unchanged. This feature only helps the owner complete existing public visuals.

## Language Rules

Use:

- `No action needed`
- `Needs attention`
- `Main photo`
- `Business photos`
- `Menu photo`
- `Product photo`
- `Service photo`

Avoid:

- `AI-powered`
- `Smart`
- `Dynamic`
- `Score`
- `Optimization`
- channel-specific marketing promises

## Acceptance Criteria

- Feature is gated by `ENABLE_VISUAL_PROFILE_COMPLETION`.
- Desktop Official Page settings show the card when the flag is enabled.
- Mobile Official Page settings show the card when the flag is enabled.
- The card works without provider calls.
- The card works without Firestore writes.
- The card does not require a new image upload path.
- The card does not block existing OBP save flows.
- Public OBP rendering is unchanged.

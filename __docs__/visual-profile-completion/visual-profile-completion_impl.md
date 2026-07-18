# Visual Profile Completion Implementation

## Runtime Shape

The runtime has one deterministic helper:

`src/lib/visualProfile/visualProfileCompletion.ts`

The helper accepts:

- business category or type
- OBP cover URL
- OBP gallery photo URLs
- optional project summaries

The helper returns:

- overall status
- completed count
- missing count
- owner-facing headline
- owner-facing helper text
- checklist tasks

## Desktop Integration

Surface:

`src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx`

Behavior:

- read current watched OBP cover value
- read current gallery photo list
- read business category/type from the parent store details
- show the completion card above the existing OBP photo controls
- omit menu/service image task unless project summaries are already supplied

Parent:

`src/components/templates/main-app/businessSettings/index.tsx`

Behavior:

- pass `businessCategory` and `businessType` into `OfficialPageTab`

Embedded project OBP editor:

`src/components/templates/main-app/projects/b2cView/index.tsx` and `src/components/templates/main-app/projects/b2cView/sidebar/index.tsx`

Behavior:

- render `MobileOfficialPageScreen` in embedded mode with the current store draft and already-loaded project summary; the same shared completion helper therefore uses current store category/type without another read

## Mobile Integration

Surface:

`src/components/mobile/screens/MobileOfficialPageScreen.tsx`

Behavior:

- read current mobile OBP form data
- read already-loaded mobile project summaries from `useMobileProjects()`
- show the completion card above the existing mobile photo controls
- include menu/service image task because mobile already has project summaries in context

## Feature Flag

Add:

`FEATURE_FLAGS.ENABLE_VISUAL_PROFILE_COMPLETION`

Default:

`true`

Reason:

The feature is read-only, local, deterministic, and does not add writes, indexes, provider calls, or schedulers.

## Data Contract

No new persisted field is required.

Inputs:

- `Store.publicPresence.businessCover`
- `Store.publicPresence.photos`
- optional `ProjectSummaryData.projectImage`

## Firebase And Cache

The feature does not write public truth. Existing OBP upload/save paths remain responsible for Storage uploads, Firestore writes, and public cache invalidation.

## Failure Behavior

- Missing category falls back through the shared category resolver.
- Empty photo strings are ignored.
- Missing project summaries omit the menu/service task.
- Invalid or absent input returns a useful incomplete state instead of throwing.

## Non-Implementation Notes

Do not add AI image classification in this pass. A classifier would require provider accounting, explicit cost controls, image consent treatment, failure fallback, and owner-safe language before it could fit MenuList production rules.

# Visual Profile Completion Mobile Support

## Decision

Mobile support is required and included.

The feature belongs inside the owner mobile Official Page screen because photo completion is a common owner phone task.

## Surface

`src/components/mobile/screens/MobileOfficialPageScreen.tsx`

## Mobile Data

Mobile already has:

- store public presence form state
- gallery photo state
- project summaries from `useMobileProjects()`

The completion helper uses these existing values and does not add a mobile-specific read path.

## UX Requirements

- Card appears near existing photo controls.
- Text is short.
- Touch targets are not changed.
- Existing upload, reorder, delete, and save controls remain the only mutation paths.
- Status uses `No action needed` or `Needs attention`.
- The checklist must not require the owner to understand image ratios, SEO, Google categories, or technical media terms.

## Shell Contract

The feature stays inside the existing mobile Official Page screen and does not introduce a direct route, forced reload, or PWA shell bypass.

## Cost

No mobile-only Firebase reads or writes are added.

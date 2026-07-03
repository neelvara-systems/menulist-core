# Item Photo Capture Assist Mobile Support

**Status:** Implemented mobile support evidence; not current launch certification
**Decision:** Yes - source-backed mobile support exists, but release approval still requires current mobile QA evidence.

## Current Release Boundary (July 2, 2026)

This document records the intended and implemented mobile support boundary for Item Photo Capture Assist. It is not mobile launch approval.

Current approval routes through:

- the active production-readiness audit and External Certification Runbook;
- `npm run verify:agent-readiness`;
- `npm run verify:auth-security-failure-matrix`;
- authenticated desktop owner browser QA for the image upload modal;
- authenticated mobile owner-shell QA inside `MobileShell`;
- real-device camera QA on iOS Safari and mid-range Android Chrome;
- media preparation/upload QA through `prepareMediaImage(file, 'menuItem')`;
- target deploy evidence where routes, storage rules, or upload/runtime behavior change;
- production-host smoke for the target owner/store.

## Mobile Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Pass | Owners commonly add item photos from the phone used at the business. |
| Speed | Pass | Capture is one camera action plus existing save; readiness checks are local. |
| Touch | Pass | The flow uses large buttons, segmented mode controls, and the existing mobile modal/sheet behavior. |
| Value | Pass | The owner or staff member is usually near the dish when taking a photo. |

## Mobile Scope

- The existing image upload modal is already used from mobile Menu Manager.
- The capture assistant renders inside that modal and keeps the existing upload fallback.
- Inline add-item image input gets native camera intent through `capture="environment"`.
- No separate mobile DAL is added.
- No separate mobile auth is added.

## Mobile Rules

- Use the same `prepareMediaImage(file, 'menuItem')` function as desktop.
- Use the same `UserUploadedFileType` shape as desktop.
- Use `antd-mobile`-compatible touch targets in mobile-hosted screens.
- Use `react-icons/lu` only.
- Keep owner copy simple and action-based.
- Do not add a multi-step mobile wizard.

## PWA Shell

Owner mobile access remains inside the existing `MobileShell` Menu flow. The feature is reached from existing Menu Manager image actions and does not introduce a direct route.

## Localization

Initial implementation uses inline English owner copy matching existing image modal patterns. If localized modal strings are later centralized, the same keys must serve desktop and mobile.

## Mobile Verification

1. Open Mobile Menu Manager.
2. Open an item with image changes enabled.
3. Tap add/edit images.
4. Confirm the upload modal stays inside the mobile flow.
5. Start camera, capture, retake, and accept.
6. Confirm blocked camera permissions leave the file upload path usable.

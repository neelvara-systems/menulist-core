# Item Photo Capture Assist

## Purpose

Item Photo Capture Assist gives owners a simple guided camera option when adding a menu item photo.

It is not a new media system. Captured photos still use the existing MenuList media image contract, item image variants, Storage paths, and project save flow.

## Current Scope

- Optional guided capture inside the existing item image upload modal.
- Two owner-simple capture modes: top-down and closer.
- Browser-local camera capture when available.
- Existing upload/drag/drop fallback remains available.
- Browser-local photo readiness feedback before the photo enters the existing upload list.
- Bounded camera-start, capture, and readiness diagnostics only; no camera frames, photo bytes, filenames, or raw item text are logged.
- No new Firestore collection, API route, Cloud Function, Storage path family, or public schema.

## Navigation

- [Spec](./item-photo-capture-assist_spec.md)
- [Implementation](./item-photo-capture-assist_impl.md)
- [Firebase Cost](./item-photo-capture-assist_firebase.md)
- [Mobile Support](./item-photo-capture-assist_mobile-support.md)
- [Test Cases](./item-photo-capture-assist_test-cases.md)
- [Marketing](./item-photo-capture-assist_marketing.md)
- [Website](./item-photo-capture-assist_website.md)
- [Help Doc](./item-photo-capture-assist_helpdoc.md)
- [Validation](./item-photo-capture-assist_validation.md)

## Operating Rule

Capture guidance must end at `prepareMediaImage`. The source photo may be guided, but the saved image stays a `menuItem` media image.

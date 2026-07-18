# Owner PWA Lifecycle Specification

## Identity and installation

- The owner app uses `public/manifest.json`, the MenuList identity, standalone display, stable `/dashboard` app ID, and `/today` launch.
- Rotation remains under device/user control.
- Owner and customer workers are selected by origin and never intentionally share a registration.
- Development and preview must not register the generated production owner worker.

## Connectivity

- Offline and slow-network signals are advisory and must not block review/navigation.
- Connectivity restoration must not auto-reload an in-progress owner workflow.
- Mutations keep existing acknowledgements and errors.
- No background write queue, success claim, or automatic replay is permitted.

## Cache and privacy

- The owner worker may precache the generic offline fallback and bounded build/icon assets, plus runtime-cache public fonts.
- It must not runtime-cache authenticated owner HTML, sign-in HTML, screen HTML, APIs, Firestore/Storage responses, broad file-extension matches, or customer business truth.
- Retired private-document caches must be deleted when the new worker activates.

## Updates

- Existing registrations are checked on each full app load.
- A server/client build mismatch offers a manual refresh.
- Owners can defer the prompt for that build in the current browser session.
- Update UI must not reload without an explicit owner action.

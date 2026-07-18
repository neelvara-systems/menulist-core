# Full PWA-Only Mobile Experience

**Status:** Implemented source analysis; not current launch certification
**Last updated:** July 17, 2026

This analysis is rebuilt from the current MobileShell route map and screens. Release approval still requires the active production-readiness and external-certification evidence, authenticated mobile browser/device QA, installed-PWA install/update/offline checks, and the approved app deployment.

## Current Operational Baseline

The owner MobileShell now covers the main phone workflows:

| Area | Current mobile coverage |
| --- | --- |
| Today | Current status, hours, owner actions, dashboard and history |
| Menu creation | Photo/PDF/link upload, extraction progress, review and first-run setup |
| Menu maintenance | Item/category edits, price/availability, descriptions, photos, generated images, translations, quality filters and time slots |
| Sharing | Customer links, WhatsApp, QR, print assets, menu-card export and official page |
| Business truth | Identity, public information, working hours, temporary status, attributes, compliance pages and Customer App settings |
| Operations | Feedback/replies, analytics, AI history, billing, locations, users/roles and owner notifications |
| Platform roles | Maintained platform, operations and reseller sub-screens when the signed-in role permits them |

The exact route-to-screen contract is maintained in `src/components/mobile/MobileShell.tsx` and guarded by `npm run verify:mobile-shell-route-map`. Mobile screens inherit authentication, tenant/store context, localization, RTL, network status, feature flags, permissions, billing entitlement, and shared DAL/server acknowledgements.

## PWA lifecycle boundary

- Owner manifest: `public/manifest.json`, stable MenuList identity, `/today` launch.
- Owner worker: generated `public/sw.js` in production app builds only.
- Preview and development: owner worker registration is disabled and stale registrations are removed.
- Connectivity: non-blocking shared notice; no automatic reload when the connection returns.
- Offline navigation: generic `/offline` fallback only.
- Private data: authenticated owner/sign-in/screen HTML, APIs and Firestore responses are not runtime-cached.
- Offline mutations: not supported; MenuList does not claim success, queue, or replay owner writes.
- Updates: current workers are checked on full app load; a server build mismatch shows a refresh prompt that can be deferred for the current session.

## Desktop escape hatch

MobileShell remains the default handheld owner experience. A maintained switch-to-desktop path covers a rare workflow that is not admitted to the mobile shell, and the desktop shell provides a return-to-mobile control. This is a safety valve, not permission to leave high-frequency owner work unavailable on a phone.

## Admission rule for more mobile work

Add a mobile surface only when it materially reduces owner responsibility, is useful on a phone, can use the existing tenant/DAL/permission boundary, and can remain understandable with touch-first controls. Do not duplicate a desktop screen merely for route-count parity.

## Conditional Additions (Only If PWA Adoption Proves Need)

Potential new mobile work requires usage evidence and a Separate scoped audit. Examples include genuinely requested advanced layout controls, provider onboarding that can be made non-technical, or new device-native capture flows. Do not infer demand from this document.

## Permanent architectural constraints

- Do not create a second mobile backend, auth flow, cache, or tenant model.
- Do not add offline write queues or automatic mutation replay without an explicit idempotency/conflict architecture.
- Do not cache authenticated HTML or stale public business truth as an offline success.
- Do not auto-reload on reconnect while an owner may be editing.
- Do not bypass MobileShell with forced desktop navigation for a maintained mobile sub-screen.
- Do not add an owner setting for connectivity or worker policy.

## Verification

```bash
npm run verify:owner-pwa-lifecycle
npm run verify:mobile-shell-route-map
npm run verify:customer-app-pwa
npx tsc --noEmit --incremental false --pretty false
```

Pending owner/release evidence includes fresh install, upgrade, deferred update, logout/account switch, offline launch, reconnect during an unsaved edit, slow-network simulation, cache inspection, rotation, and iOS/Android standalone smoke.

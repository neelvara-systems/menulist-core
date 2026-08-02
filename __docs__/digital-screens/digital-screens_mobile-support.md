# Digital Screens — Mobile Support

**Last Updated:** August 1, 2026 (v7 — private control permission boundary, per-mode exact-version health, status refresh, safe artwork preview, and lifecycle parity)
**Decision:** ✅ MOBILE SUPPORTED — Owner can set up and manage TV screens from phone

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated mobile support and desktop/mobile parity evidence only. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:digital-screens-boundary`, browser TV smoke for Menu Board and Highlights modes, authenticated desktop/mobile owner settings QA, physical-device TV/tablet/browser QA, target Firebase deploy evidence where rules, indexes, Storage, or Functions change, target Vercel deploy evidence where app routes or display clients change, and production-host smoke for the target tenant and screen URL.

---

## Feature Admission Test (Re-evaluated with "no desktop at all" lens)

| Gate          | Result        | Reasoning                                       |
| ------------- | ------------- | ----------------------------------------------- |
| **Frequency** | ⚠️ OCCASIONAL | Setup is one-time, but BLOCKING without desktop |
| **Speed**     | ✅ PASS       | Copy URL <1s, open link <1s, toggle <1s          |
| **Touch**     | ✅ PASS       | 40px+ copy/open buttons, toggle switch           |
| **Value**     | ✅ PASS       | Phone-only owner needs TV URLs from their phone |

---

## Mobile Implementation

| Feature                           | Mobile Component                    | Status |
| --------------------------------- | ----------------------------------- | ------ |
| Get Menu Board URL                | `MobileDigitalScreensScreen`        | ✅     |
| Get Highlights URL                | `MobileDigitalScreensScreen`        | ✅     |
| Per-mode latest-version status    | `MobileDigitalScreensScreen`        | ✅ independent Menu Board / Highlights receipts |
| Refresh TV status                 | `MobileDigitalScreensScreen`        | ✅ owner-triggered authenticated read |
| Compact URL cards                 | `MobileDigitalScreensScreen`        | ✅     |
| Copy URLs to clipboard            | `MobileDigitalScreensScreen`        | ✅ bounded clipboard diagnostics |
| Preview screen (opens in browser) | `MobileDigitalScreensScreen`        | ✅ bounded blocked-open diagnostics |
| Toggle "Only custom slides"       | `MobileDigitalScreensScreen`        | ✅     |
| Upload custom slides              | `MobileDigitalScreensScreen`        | ✅     |
| Edit/delete custom slides         | `MobileDigitalScreensScreen`        | ✅     |
| Safe custom slide captions        | `MobileDigitalScreensScreen` + DAL  | ✅     |
| Initialize screen token           | `MobileDigitalScreensScreen` (auto) | ✅     |
| Feature kill switch               | More, Share, settings screen, public page, seen endpoint | ✅     |
| Digital Screens permission        | More, Share, Output Center/settings parity | ✅     |
| Expired slide capacity recovery   | Shared DAL filters/prunes before cap enforcement | ✅     |

## DAL Parity

- Uses same `getScreenState`, `initializeScreenState`, `updateScreenSettings`, pinned-slide DAL functions, and `assertDigitalScreenMutationSucceeded()` acknowledgement guard as desktop before local state or success copy changes
- Those DAL functions call the permission-checked owner API; the bearer token is returned from the server-only private control only to a session with `MANAGE_DIGITAL_SCREENS`. Mobile never reads or writes the canonical summary/private control directly.
- Uses same `uploadScreenSlide`, `updatePinnedSlideCaption`, and `removePinnedSlide` DAL functions; `uploadScreenSlide()` now rejects outer `apiCallComposer()` fallback values with `assertDigitalScreenSlideUploadSucceeded()` before desktop or mobile upload success copy can show
- Canonical screen state and the public listener mirror commit atomically through the shared DAL; concurrent three-slide limits and immutable create-or-reuse media behavior are identical on desktop and mobile
- Same `buildScreenUrl` utility
- Same `FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED` gate
- Same `canManageDigitalScreens` permission boundary; Mobile More, Share, the Digital Screens screen itself, and mobile Menu Manager do not load or reveal bearer screen links without it, and access removal invalidates an in-flight settings load
- Same `DIGITAL_SCREENS_MAX_UPLOADS` and `DIGITAL_SCREENS_UPLOAD_EXPIRY_DAYS` values; mobile no longer carries independent `3` / `14` constants
- Shows `Waiting for TV` / `Latest update seen` / `Update not seen` / `Check TV` separately for Menu Board and Highlights using that mode's canonical-version `screenSeenByMode` receipt; opening one link never marks the other link healthy and no receipt is labelled a live connection
- The refresh icon performs one owner-triggered authenticated state read. It does not poll, create a device dashboard, or add a background mobile cost.
- The shared image-adjust preview shows the Digital Screen safe area and reserved QR/attribution regions before upload
- Records the same `screenOverride` owner-control signal as desktop while still requiring the mutation acknowledgement before changing local UI state
- `getScreenState()` returns active custom slides only, and the next shared mutation prunes expired Firestore references so old slides cannot permanently consume mobile upload capacity
- Menu Board and Highlights copied feedback waits for Clipboard API success or acknowledged textarea fallback success; failed mobile copy diagnostics include clipboard/fallback support booleans only
- Custom slide names are normalized before save/display and remain dashboard labels, not TV overlay copy
- `npm run verify:digital-screens-boundary` locks the mobile Digital Screens acknowledgement guard, acknowledged browser-local copy contract, bounded diagnostics, copy/open handoff, and shared DAL parity as part of the dedicated local source gate.

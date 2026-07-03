# Digital Screens — Mobile Support

**Last Updated:** July 2, 2026 (v4 — dedicated Digital Screens boundary source gate)
**Decision:** ✅ MOBILE SUPPORTED — Owner can set up and manage TV screens from phone

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
| TV last-seen status               | `MobileDigitalScreensScreen`        | ✅     |
| Compact URL cards                 | `MobileDigitalScreensScreen`        | ✅     |
| Copy URLs to clipboard            | `MobileDigitalScreensScreen`        | ✅ bounded clipboard diagnostics |
| Preview screen (opens in browser) | `MobileDigitalScreensScreen`        | ✅ bounded blocked-open diagnostics |
| Toggle "Only custom slides"       | `MobileDigitalScreensScreen`        | ✅     |
| Upload custom slides              | `MobileDigitalScreensScreen`        | ✅     |
| Edit/delete custom slides         | `MobileDigitalScreensScreen`        | ✅     |
| Safe custom slide captions        | `MobileDigitalScreensScreen` + DAL  | ✅     |
| Initialize screen token           | `MobileDigitalScreensScreen` (auto) | ✅     |

## DAL Parity

- Uses same `getScreenState`, `initializeScreenState`, `updateScreenSettings`, pinned-slide DAL functions, and `assertDigitalScreenMutationSucceeded()` acknowledgement guard as desktop before local state or success copy changes
- Uses same `uploadScreenSlide`, `updatePinnedSlideCaption`, and `removePinnedSlide` DAL functions; `uploadScreenSlide()` now rejects outer `apiCallComposer()` fallback values with `assertDigitalScreenSlideUploadSucceeded()` before desktop or mobile upload success copy can show
- Same `buildScreenUrl` utility
- Same `FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED` gate
- Shows the same owner trust signal from `screenLastSeenAt`
- Menu Board and Highlights copied feedback waits for Clipboard API success or acknowledged textarea fallback success; failed mobile copy diagnostics include clipboard/fallback support booleans only
- Custom slide names are normalized before save/display and remain dashboard labels, not TV overlay copy
- `npm run verify:digital-screens-boundary` locks the mobile Digital Screens acknowledgement guard, acknowledged browser-local copy contract, bounded diagnostics, copy/open handoff, and shared DAL parity as part of the dedicated local source gate.

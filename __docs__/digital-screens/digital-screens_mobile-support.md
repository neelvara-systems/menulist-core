# Digital Screens — Mobile Support

**Last Updated:** June 2, 2026 (v3 — mobile setup trust + custom slide parity)
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
| Copy URLs to clipboard            | `MobileDigitalScreensScreen`        | ✅     |
| Preview screen (opens in browser) | `MobileDigitalScreensScreen`        | ✅     |
| Toggle "Only custom slides"       | `MobileDigitalScreensScreen`        | ✅     |
| Upload custom slides              | `MobileDigitalScreensScreen`        | ✅     |
| Edit/delete custom slides         | `MobileDigitalScreensScreen`        | ✅     |
| Safe custom slide captions        | `MobileDigitalScreensScreen` + DAL  | ✅     |
| Initialize screen token           | `MobileDigitalScreensScreen` (auto) | ✅     |

## DAL Parity

- Uses same `getScreenState`, `initializeScreenState`, `updateScreenSettings` DAL functions
- Uses same `uploadScreenSlide`, `updatePinnedSlideCaption`, and `removePinnedSlide` DAL functions
- Same `buildScreenUrl` utility
- Same `FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED` gate
- Shows the same owner trust signal from `screenLastSeenAt`
- Custom slide names are normalized before save/display and remain dashboard labels, not TV overlay copy

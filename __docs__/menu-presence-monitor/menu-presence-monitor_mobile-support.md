# Menu Presence Monitor — Mobile Support Assessment

> **Version:** 1.5
> **Last Updated:** July 2, 2026

---

## Mobile Relevance Decision: **YES**

## Feature Admission Test (4 Gates)

| Gate | Question | Answer | Pass? |
|------|----------|--------|-------|
| **Frequency** | Daily or multiple times per day? | Weekly check after sharing menu | ⚠ Borderline |
| **Speed** | Completes in <5 seconds? | View + confirm = 2 seconds | ✓ Pass |
| **Touch** | Works with thumb-only? | Single tap to confirm | ✓ Pass |
| **Value** | Needed away from desk? | YES — owner at restaurant wants to check deployment | ✓ Pass |

**Result:** 3 of 4 gates pass clearly. Frequency is borderline but acceptable — owners check this when they're at the restaurant setting up, which is often mobile.

## Mobile Implementation

- **Screen:** Reachable from Mobile More > Search & Discovery > Discovery Setup through `MobilePresenceMonitorScreen`
- **Component:** `src/components/mobile/components/PresenceMonitor.tsx`
- **UI Library:** antd-mobile `List` + `Popup` + explicit buttons
- **Data Source:** Same `UseMenuListData` + store `menuPresence` field
- **Actions:** Tap a row to open the bottom sheet, copy/open the official link, then use explicit **Mark as added** or **Remove** buttons
- **Activation proof:** Mobile shows the same `buildStarterActivationSummary()` result as desktop: two-action progress, MenuList-recorded count, and owner-confirmed count.
- **Diagnostics:** Failed official-link copy, confirm, and remove actions must log `mobile_presence_official_link_copy_failed`, `mobile_presence_confirm_failed`, and `mobile_presence_remove_failed` with bounded store/tenant, link, surface, count, starter-signal, and clipboard/fallback support metadata only. Copied feedback must wait for Clipboard API or acknowledged textarea fallback success.
- **Write acknowledgement:** Confirm/remove actions must call `assertMenuPresenceUpdateSucceeded()` before local presence state, success copy, or selected-surface state changes.
- **Active store scope:** Mobile confirm/remove inherits the shared `updateMenuPresence()` active-session store guard. A stale or mismatched store selection must reject before writing `menuPresence` or `starterActivationSignals`.
- **Source gate:** Run `npm run verify:menu-presence-monitor-boundary` after changes to mobile presence monitor routing, bottom-sheet actions, active-session store guards, or activation proof copy.

## Localization

Inherits from desktop — same `next-intl`, RTL support, timezone, date format.

Required mobile copy keys live under `MobilePresenceMonitor` in the MenuList locale files:

- `activationTitle`
- `activationProgress`
- `activationDone`
- `activationHowKnown`
- `activationPending`
- `menuListRecorded`
- `ownerConfirmed`

## Auth

Same NextAuth session, same RBAC — no separate mobile auth.

---

**Created:** March 15, 2026

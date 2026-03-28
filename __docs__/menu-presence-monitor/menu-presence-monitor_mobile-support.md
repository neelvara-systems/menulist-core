# Menu Presence Monitor — Mobile Support Assessment

> **Version:** 1.0
> **Last Updated:** March 15, 2026

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

- **Screen:** Embedded in `MobileShareScreen.tsx` (above share links)
- **Component:** `src/components/mobile/components/PresenceMonitor.tsx`
- **UI Library:** antd-mobile `List` + `Switch` or `CheckList`
- **Data Source:** Same `UseMenuListData` + store `menuPresence` field
- **Actions:** Tap to confirm, swipe to remove confirmation

## Localization

Inherits from desktop — same `next-intl`, RTL support, timezone, date format.

## Auth

Same NextAuth session, same RBAC — no separate mobile auth.

---

**Created:** March 15, 2026

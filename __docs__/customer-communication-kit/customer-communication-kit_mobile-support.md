# Customer Communication Kit — Mobile Support Assessment

> **Version:** 1.0
> **Last Updated:** March 15, 2026

---

## Mobile Relevance Decision: **YES — Mobile-First Feature**

## Feature Admission Test (4 Gates)

| Gate | Question | Answer | Pass? |
|------|----------|--------|-------|
| **Frequency** | Daily or multiple times per day? | YES — owners send menu links 10-30 times/day | ✓ Pass |
| **Speed** | Completes in <5 seconds? | YES — tap copy → paste → send = 3 seconds | ✓ Pass |
| **Touch** | Works with thumb-only? | YES — single tap to copy or send | ✓ Pass |
| **Value** | Needed away from desk? | YES — owners respond to WhatsApp from phone during service | ✓ Pass |

**Result:** ALL 4 gates pass. This is a **mobile-first feature** — most usage will happen on the owner's phone during busy service hours.

## Mobile Implementation

- **Screen:** New section in `MobileShareScreen.tsx` or integrated into existing share flow
- **Component:** `src/components/mobile/components/CommunicationKit.tsx`
- **UI Library:** antd-mobile `Card` + `Button`
- **Primary action:** "Send via WhatsApp" (India = WhatsApp-first market)
- **Secondary action:** "Copy Message"
- **Data Source:** Same store data from context, same `generateMessageTemplates()` function

## Design Priority

On mobile, WhatsApp button should be **primary** (filled, prominent). Copy button is secondary (outlined). This reverses the desktop priority because mobile users are more likely to share directly via WhatsApp.

## Localization

Inherits from desktop — same `next-intl`, RTL support, timezone, date format.

## Auth

Same NextAuth session, same RBAC — no separate mobile auth.

---

**Created:** March 15, 2026

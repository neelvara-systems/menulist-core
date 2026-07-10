# Customer Communication Kit — Mobile Support Assessment

> **Version:** 1.1
> **Last Updated:** June 29, 2026

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

- **Screen:** Integrated into `MobileShareScreen.tsx`
- **Component:** `src/components/mobile/components/CommunicationKit.tsx`
- **UI Library:** antd-mobile `Card` + `Button`
- **Primary action:** "Send via WhatsApp" (India = WhatsApp-first market)
- **Secondary action:** "Copy Message"
- **Data Source:** Same store data from context, same `generateMessageTemplates()` function. Staff Daily Replies use the same browser-local template path, so desktop and mobile show the same staff handoff without a separate mobile data loader.
- **Diagnostics:** Failed mobile copy, native share, and WhatsApp handoff actions log `mobile_communication_kit_copy_failed`, `mobile_communication_kit_native_share_failed`, and `mobile_communication_kit_whatsapp_open_failed` with bounded Mobile Share context plus generated-message and WhatsApp URL lengths only. Desktop copy and WhatsApp handoff failures log `use_menulist_communication_kit_copy_failed` and `use_menulist_communication_kit_whatsapp_open_failed` with bounded Use MenuList context plus generated-message and WhatsApp URL lengths only. Desktop and mobile copied feedback must wait for Clipboard API or acknowledged textarea fallback success; failed copy diagnostics may include clipboard/fallback support booleans. WhatsApp handoffs open with `noopener,noreferrer`.

## Design Priority

On mobile, WhatsApp button should be **primary** (filled, prominent). Copy button is secondary (outlined). This reverses the desktop priority because mobile users are more likely to share directly via WhatsApp.

## Localization

Inherits from desktop — same `next-intl`, RTL support, timezone, date format.

## Auth

Same NextAuth session, same RBAC — no separate mobile auth.

---

**Created:** March 15, 2026
**Last Updated:** July 9, 2026

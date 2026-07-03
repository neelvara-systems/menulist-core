# Presence Dominance — Implementation Plan

**Status:** ✅ IMPLEMENTED (via Behavior Engineering)  
**Author:** Cascade (Lead Architect)  
**Date:** February 19, 2026  
**Audience:** Developers  
**Pillar:** 1 of 6 — Customer-Facing Infrastructure

---

## Architecture Overview

This is NOT a new feature build — it's a **behavioral adoption layer** on top of existing OBP infrastructure. All core engineering is done. Behavioral adoption was implemented through micro-copy nudges (see `__docs__/behavior-engineering/`).

```
Existing OBP Infrastructure (DO NOT MODIFY)
  ├── OBPContent.tsx (server component)
  ├── OBPAnalytics.tsx (tracking)
  ├── OBPActions.tsx (action clicks)
  ├── OBPLinkCard.tsx (dashboard card) — ENHANCED with nudge text
  ├── OBPMetricsCard.tsx (analytics card)
  └── Physical surfaces (QR generation)

IMPLEMENTED: Behavioral Adoption Layer (Feb 19, 2026)
  ├── BehaviorNudgeCard.tsx (dashboard — dismissible adoption card)
  ├── OBPLinkCard.tsx (enhanced — nudge micro-copy added)
  ├── ShareModal/index.tsx (enhanced — behavior-guiding copy)
  ├── MobileShareScreen.tsx (enhanced — behavior-guiding copy)
  └── msg-preview/page.tsx (enhanced — post-publish adoption tips)

Feature Flag: ENABLE_BEHAVIOR_NUDGES (src/config/features.ts)
Full docs: __docs__/behavior-engineering/
```

---

## Database Schema

**No new collections.** No new Firestore fields. Nudge dismissal tracked via localStorage (zero Firebase cost).

---

## File Structure (Actual — Implemented Feb 19, 2026)

| File                                                      | Purpose                                                     | Status      |
| --------------------------------------------------------- | ----------------------------------------------------------- | ----------- |
| `src/components/.../OwnerDashboard/BehaviorNudgeCard.tsx` | Dismissible "official link" reinforcement card on dashboard | ✅ NEW      |
| `src/components/.../businessSettings/OBPLinkCard.tsx`     | Added nudge micro-copy below link                           | ✅ ENHANCED |
| `src/components/.../shareModal/index.tsx`                 | Updated header, QR copy, WhatsApp message, staff hint       | ✅ ENHANCED |
| `src/components/mobile/screens/MobileShareScreen.tsx`     | Updated OBP text, QR text, WhatsApp message                 | ✅ ENHANCED |
| `src/app/(global-pages)/msg-preview/[sessionId]/page.tsx` | Post-publish: adoption tips + copy/WhatsApp buttons         | ✅ ENHANCED |

**Total new code:** ~130 lines (1 new file + 5 enhanced files)

---

## Implementation Phases

### Phase 1: BehaviorNudgeCard on Dashboard

Dismissible card on Owner Dashboard reinforcing official link adoption.

**File:** `src/components/.../OwnerDashboard/BehaviorNudgeCard.tsx`  
**Visibility:** When `ENABLE_BEHAVIOR_NUDGES` AND `ENABLE_OBP` are both true  
**Dismissal:** localStorage (`behavior_nudge_dismissed_{storeId}`)
**Diagnostics:** Dismiss-state load/save failures and official-link copy failures log `owner_dashboard_behavior_nudge_dismiss_load_failed`, `owner_dashboard_behavior_nudge_dismiss_save_failed`, and `owner_dashboard_behavior_nudge_copy_failed` with bounded store/link/dismiss-key presence-length metadata only.

### Phase 2: OBPLinkCard Enhancement

Added nudge micro-copy below the link card.

**File:** `src/components/.../businessSettings/OBPLinkCard.tsx`  
**Copy:** "Use this link whenever customers ask for your menu. Always updated."

### Phase 3: Desktop ShareModal Enhancement

Updated header subtitle, QR section copy, WhatsApp message, staff sharing hint.

**File:** `src/components/.../shareModal/index.tsx`  
**WhatsApp message:** "Here is our latest menu:\n{url}\n(Always updated)"

### Phase 4: MobileShareScreen Enhancement

Updated OBP section text, QR text, WhatsApp message.

**File:** `src/components/mobile/screens/MobileShareScreen.tsx`  
**Same WhatsApp message pattern as desktop.**

### Phase 5: Post-Publish Success Screen Enhancement

Enhanced with "official link" framing, Copy/WhatsApp buttons, adoption tips.

**File:** `src/app/(global-pages)/msg-preview/[sessionId]/page.tsx`  
**Tips:** Save in WhatsApp, add to Instagram bio, share with staff.
**Failure copy:** Publish and correction-submit failures use fixed public-safe copy. Post-publish Copy Link falls through from rejected Clipboard API writes to acknowledged textarea fallback before copied feedback, and the page may still branch on the safe `maxReached` flag, but it does not show raw `/api/msg-preview/*` response text.
**Handoff diagnostics:** Post-publish Copy Link and WhatsApp failures use fixed public-safe copy, WhatsApp opens use `noopener,noreferrer`, and diagnostics log only session/link presence-length plus message/URL length metadata.

---

## Security Checklist

- [x] No new API endpoints
- [x] No new Firestore operations
- [x] Copy/share uses client-side APIs only
- [x] No PII exposed in share content
- [x] Feature flag gated (`ENABLE_BEHAVIOR_NUDGES`)
- [x] Public preview publish/fix failures use fixed copy instead of raw route response text
- [x] Public preview post-publish Copy/WhatsApp handoff failures are bounded and browser-local

---

## Firebase Cost Impact

**Zero additional Firebase cost.** All changes are UI micro-copy:

- Nudge dismissal: localStorage (not Firestore)
- Copy to clipboard: 0 reads/writes
- WhatsApp share: client-side URL encoding
- Micro-copy text: Static strings

---

## Testing Guide

1. Enable `ENABLE_OBP: true` and `ENABLE_BEHAVIOR_NUDGES: true` in features.ts
2. Open dashboard → BehaviorNudgeCard should appear
3. Click dismiss (×) → card disappears permanently (check localStorage)
4. Open Share Modal → verify updated header, QR copy, WhatsApp message
5. Open MobileShareScreen → verify updated OBP text, QR text, WhatsApp message
6. Click WhatsApp share → message should say "Here is our latest menu: [link] (Always updated)"
7. Open msg-preview after publish → verify tips section + Copy/WhatsApp buttons
8. Set `ENABLE_BEHAVIOR_NUDGES: false` → all nudges revert to original copy

---

## Dependencies on Existing Code

| Dependency           | File                                                  | Status      |
| -------------------- | ----------------------------------------------------- | ----------- |
| OBP feature flag     | `src/config/features.ts`                              | ✅ Exists   |
| Behavior nudges flag | `src/config/features.ts`                              | ✅ NEW      |
| Store subdomain      | PlatformGlobalDataContext                             | ✅ Exists   |
| QR generation        | Physical surfaces + antd QRCode                       | ✅ Exists   |
| OBPLinkCard          | `src/components/.../OBPLinkCard.tsx`                  | ✅ Enhanced |
| Mobile share screen  | `src/components/mobile/screens/MobileShareScreen.tsx` | ✅ Enhanced |
| generateOBPUrl       | `src/lib/obp/generateOBPUrl.ts`                       | ✅ Exists   |

---

**Document Signature:** Cascade (Lead Architect)  
**Last Updated:** February 19, 2026

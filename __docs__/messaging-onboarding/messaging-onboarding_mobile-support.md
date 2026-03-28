# Messaging Onboarding — Mobile Support Assessment

**Feature:** Messaging Onboarding  
**Last Updated:** February 17, 2026

---

## Mobile Relevance Decision: PARTIAL

---

## Feature Admission Test (4 Gates)

### Gate 1: Frequency

**Question:** Is this done daily or multiple times/day?  
**Answer:** NO — Onboarding is a one-time event per business. Not a daily operation.  
**Result:** ❌ FAIL

### Gate 2: Speed

**Question:** Can this complete in <5 seconds on mobile?  
**Answer:** N/A — The WhatsApp interaction happens entirely inside the WhatsApp app (not our mobile UI). The preview page must be mobile-friendly since owners will open it on their phone.  
**Result:** ⚠️ PARTIAL — Preview page must be mobile-optimized

### Gate 3: Touch

**Question:** Does this work well with thumb-only interaction?  
**Answer:** YES — Preview page has only 2 buttons (Approve, Request Fix) and 3 editable fields. Touch-friendly by design.  
**Result:** ✅ PASS

### Gate 4: Value

**Question:** Does the owner NEED this while away from desk?  
**Answer:** YES — Owners will ALWAYS be on their phone when using messaging onboarding. The preview page MUST work perfectly on mobile since that's where they'll open it.  
**Result:** ✅ PASS

---

## Assessment Summary

| Gate      | Result     | Notes                                 |
| --------- | ---------- | ------------------------------------- |
| Frequency | ❌ FAIL    | One-time event, not daily             |
| Speed     | ⚠️ PARTIAL | Preview page must be mobile-optimized |
| Touch     | ✅ PASS    | Simple approve/fix actions            |
| Value     | ✅ PASS    | Owner is always on phone for this     |

**Decision:** PARTIAL — No dedicated mobile screen in MobileShell needed (one-time flow, not operational). But the **preview page** (`/msg-preview/[sessionId]`) MUST be mobile-first responsive since owners will open it from their messaging app on their phone.

---

## What Needs Mobile Optimization

### Preview Page (CRITICAL — mobile-first)

- Responsive layout for 320px-768px screens
- Large touch targets (44px minimum) for Approve and Request Fix buttons
- Editable business info fields with large input areas
- Menu rendering optimized for mobile scroll
- "Preview — Not Live Yet" label visible without scrolling
- No horizontal scroll on any screen size

### Fix Request Form (mobile-optimized)

- Large checkboxes (easy to tap)
- Optional note field with mobile keyboard support
- Submit button at bottom, full width

### Post-Publish Confirmation (in WhatsApp)

- Links in WhatsApp messages are already mobile-native
- No additional mobile optimization needed for WhatsApp messages

---

## What Does NOT Need Mobile Treatment

- **WhatsApp interaction** — Happens inside WhatsApp app, not our UI
- **Dashboard onboarding** — After publish, owner uses regular dashboard (desktop or mobile PWA)
- **MobileShell integration** — No new mobile screen needed in the operational shell
- **Session management** — Backend only, no UI

---

## Localization

- Inherits from desktop: same next-intl, RTL support, timezone, date/time format
- Preview page messages follow Language Governance
- WhatsApp messages are currently English only (template messages in target language later)

## Auth

- No auth needed for preview page (token-based access)
- After publish, dashboard uses same NextAuth session as desktop

## Settings Inheritance

- Not applicable — preview page is standalone, not part of authenticated dashboard

## Icons

- `react-icons/lu` (Lucide) for preview page UI elements — same as desktop

---

_Document Status: Implementation-Complete (v3.1 — Preview page implemented as mobile-first with inline styles. No MobileShell screen needed (one-time flow). Last updated: Feb 17, 2026.)_

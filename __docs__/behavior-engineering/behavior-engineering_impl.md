# Behavior Engineering — Implementation Plan

**Feature:** Behavior Engineering (Presence Dominance Activation)  
**Created:** February 19, 2026  
**Audience:** Developers  
**Status:** Implementation In Progress

---

## Architecture Overview

This is a **UI micro-copy enhancement** — no new infrastructure, no new collections, no new API routes. All changes are presentational nudges added to existing components.

**Pattern:** Feature-flagged micro-copy strings injected at action moments (copy, share, download, save).

```
Feature Flag: ENABLE_BEHAVIOR_NUDGES (src/config/features.ts)
    ↓
Existing Components Enhanced:
    ├── OBPLinkCard.tsx          → Add nudge text below link
    ├── ShareModal (desktop)     → Add nudge text + improve WhatsApp message
    ├── MobileShareScreen.tsx    → Add nudge text + improve WhatsApp message
    ├── OwnerDashboard/index.tsx → Add BehaviorNudgeCard (first 7 days)
    └── msg-preview page.tsx     → Enhance post-publish success state
```

---

## Database Schema

**No new collections.** Zero Firestore changes.

One optional field on store document for nudge dismissal tracking:

```typescript
// On stores/{storeId} document (existing)
behaviorNudgeDismissedAt?: Timestamp;  // When owner dismissed the dashboard nudge card
```

This is written via existing `updateStoreDetails()` DAL function — no new DAL needed.

---

## Feature Flag

```typescript
// src/config/features.ts
ENABLE_BEHAVIOR_NUDGES: true,  // Micro-copy nudges for behavior adoption
```

---

## File Structure (Exact Paths)

### New Files

| File                                                                               | LOC (est.) | Purpose                                      |
| ---------------------------------------------------------------------------------- | ---------- | -------------------------------------------- |
| `src/components/templates/main-app/dashboard/OwnerDashboard/BehaviorNudgeCard.tsx` | ~80        | Dashboard "official link" reinforcement card |

### Modified Files

| File                                                                      | Change                                            | LOC Changed |
| ------------------------------------------------------------------------- | ------------------------------------------------- | ----------- |
| `src/config/features.ts`                                                  | Add `ENABLE_BEHAVIOR_NUDGES` flag                 | +15         |
| `src/components/templates/main-app/businessSettings/OBPLinkCard.tsx`      | Add nudge micro-copy below link                   | +8          |
| `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx` | Add nudge text + improve WhatsApp message         | +15         |
| `src/components/mobile/screens/MobileShareScreen.tsx`                     | Add nudge text + improve WhatsApp message         | +15         |
| `src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx`    | Import + render BehaviorNudgeCard                 | +5          |
| `src/app/(global-pages)/msg-preview/[sessionId]/page.tsx`                 | Enhance post-publish success screen               | +30         |
| `src/components/templates/main-app/projects/editorView/Editor.tsx`        | Post-save confidence reinforcement toast (Loop 2) | +12         |

---

## Screen-by-Screen Micro-Copy Specification

### SCREEN 1: OBPLinkCard (Dashboard + Business Settings)

**File:** `src/components/templates/main-app/businessSettings/OBPLinkCard.tsx`  
**Current state:** Shows link + copy + open buttons. No behavioral guidance.  
**Enhancement:** Add one-line nudge text below the link.

```
BEFORE:
  [Globe icon] Your Official Business Link
  joespizza.menulist.ai
  [Copy] [Open]

AFTER:
  [Globe icon] Your Official Business Link
  joespizza.menulist.ai
  Use this link whenever customers ask for your menu. Always updated.
  [Copy] [Open]
```

**Micro-copy:** `"Use this link whenever customers ask for your menu. Always updated."`  
**Tone:** Calm, factual, helpful. Not promotional.

---

### SCREEN 2: Desktop ShareModal

**File:** `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx`  
**Current state:** Shows QR + social share buttons. Generic copy.  
**Enhancements:**

1. **Header subtitle change:**
   - Current: `"Works everywhere — WhatsApp, Instagram, QR, any browser"`
   - New: `"Send this instead of menu photos or PDFs. Customers always see your latest menu."`

2. **WhatsApp share message improvement:**
   - Current: `"Check out our menu: {url}"`
   - New: `"Here is our latest menu:\n{url}\n(Always updated)"`

3. **QR section micro-copy change:**
   - Current: `"For tables, counters, posters"`
   - New: `"Print and place on tables or counter. Customers can always scan for your latest menu."`

4. **Add staff sharing hint** (small text near bottom):
   - `"Share this link with your staff so everyone sends the same updated menu."`

---

### SCREEN 3: MobileShareScreen

**File:** `src/components/mobile/screens/MobileShareScreen.tsx`  
**Current state:** Shows QR + copy + WhatsApp + native share buttons. Minimal copy.  
**Enhancements:**

1. **OBP section micro-copy change:**
   - Current: `"Share this link everywhere — customers see your business info + menu"`
   - New: `"This is your official menu link. Send this whenever customers ask for your menu."`

2. **Menu QR section micro-copy change:**
   - Current: `"Scan to view your menu"`
   - New: `"Print and place on tables or counter. Customers can always access your latest menu."`

3. **WhatsApp share message improvement:**
   - Current: `"Check out our menu: {url}"`
   - New: `"Here is our latest menu:\n{url}\n(Always updated)"`

---

### SCREEN 4: BehaviorNudgeCard (Dashboard Home — NEW)

**File:** `src/components/templates/main-app/dashboard/OwnerDashboard/BehaviorNudgeCard.tsx`  
**Purpose:** Subtle reinforcement card shown on dashboard home during first 7 days.

```
┌──────────────────────────────────────────────────┐
│ [Link icon]                                       │
│ This is your official customer menu link.         │
│ Use this instead of sending menu photos or PDFs.  │
│ Customers will always see your latest menu.       │
│                                                    │
│ joespizza.menulist.ai                [Copy] [×]   │
└──────────────────────────────────────────────────┘
```

**Visibility rules:**

- Show when `ENABLE_BEHAVIOR_NUDGES` is true AND `ENABLE_OBP` is true
- Hide after owner dismisses (sets `behaviorNudgeDismissedAt` on store doc)
- Show above OBPLinkCard on dashboard

**Design:** Card with light blue background (#f0f5ff). Dismissible via × button.

---

### SCREEN 5: Post-Publish Success Screen (Messaging Onboarding)

**File:** `src/app/(global-pages)/msg-preview/[sessionId]/page.tsx`  
**Current state:** Shows "Your Menu is Live!" with link + dashboard link. Minimal guidance.  
**Enhancement:** Add behavior programming micro-copy + action buttons.

```
BEFORE:
  ✓ Your Menu is Live!
  Share this link with your customers:
  [link]
  ---
  Manage your menu anytime:
  [Open Dashboard]

AFTER:
  ✓ Your Menu is Live!

  Your official menu link is ready.
  Send this whenever customers ask for your menu.
  Customers will always see your latest items and prices.

  [link]

  [Copy Link] [Share on WhatsApp] [Download QR]

  Tips:
  • Save this link in WhatsApp for quick sharing
  • Add this link to your Instagram bio
  • Share with your staff so everyone sends the same menu

  ---
  Manage your menu anytime:
  [Open Dashboard]
```

---

## Implementation Phases

### Phase 1: Feature Flag + OBPLinkCard Enhancement (5 min)

1. Add `ENABLE_BEHAVIOR_NUDGES` to `src/config/features.ts`
2. Add nudge text to `OBPLinkCard.tsx`

### Phase 2: Desktop ShareModal Enhancement (10 min)

1. Update header subtitle
2. Improve WhatsApp share message
3. Update QR section copy
4. Add staff sharing hint

### Phase 3: MobileShareScreen Enhancement (10 min)

1. Update OBP section copy
2. Update QR section copy
3. Improve WhatsApp share message

### Phase 4: BehaviorNudgeCard (NEW) (20 min)

1. Create `BehaviorNudgeCard.tsx`
2. Import and render in OwnerDashboard/index.tsx
3. Wire up dismiss handler

### Phase 5: Post-Publish Success Screen (15 min)

1. Enhance msg-preview success state with micro-copy
2. Add Copy/WhatsApp/QR action buttons

### Phase 6: Editor Post-Save Confidence Reinforcement (5 min) — IMPLEMENTED

1. Add `hasShownConfidenceNudgeRef` in Editor component
2. After first successful `syncChanges()`, show one-time toast: "Saved. Customers with your link see the latest."
3. Gated by `ENABLE_BEHAVIOR_NUDGES`, fires once per editor session

---

## Security Checklist

- ✅ No new API routes
- ✅ No new Firestore collections
- ✅ No user-facing data exposure
- ✅ Feature flag gated
- ✅ All changes are presentational only

---

## Testing Guide

1. Enable `ENABLE_BEHAVIOR_NUDGES: true` and `ENABLE_OBP: true` in features.ts
2. Open dashboard → BehaviorNudgeCard should appear
3. Click dismiss → card disappears permanently
4. Open Share Modal → updated copy visible
5. Open MobileShareScreen → updated copy visible
6. Click WhatsApp share → message should say "Here is our latest menu: [link] (Always updated)"
7. Open post-publish success screen → enhanced copy + tips visible
8. Open Editor → make any change → wait for autosave → subtle toast appears: "Saved. Customers with your link see the latest."
9. Make another change → toast does NOT appear again (once per session)

---

**Last Updated:** February 19, 2026  
**Last Implementation:** Phase 6 (Editor post-save confidence reinforcement) — February 19, 2026

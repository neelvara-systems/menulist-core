# Point of No Return (PONR) Onboarding — Specification

**Created:** January 11, 2026
**Status:** Historical PONR strategy draft; not current implementation approval or launch certification
**Source:** ChatGPT Brainstorm (Jan 11, 2026) + Architecture Validation
**Type:** UX/Behavioral Design (Not Backend)

## Current Release Boundary

This document is historical strategy evidence only. Do not create onboarding fields, API routes, notifications, screen flows, or owner prompts from this file without a current implementation document and source gate. Current approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, current onboarding/auth/payment source gates, authenticated desktop/mobile onboarding QA, public-surface cache/deploy evidence where PONR output depends on public menu, OBP, or screen state, target deploy evidence, and production-host smoke.

---

## Executive Summary

The Point of No Return (PONR) is the moment an owner becomes **publicly dependent** on MenuList, such that turning it off would visibly hurt their business.

### The Goal

> **Not emotionally committed. Not mentally convinced. Operationally trapped (in a good way).**

---

## What Does NOT Count as PONR

| Action            | Why It Fails      |
| ----------------- | ----------------- |
| Uploading menu    | Reversible        |
| Generating QR     | QR can be ignored |
| Viewing Today tab | Private, internal |
| Seeing analytics  | Informational     |
| Running AI        | Invisible         |

None of these create **external dependency**.

---

## What COUNTS as PONR

There are only three valid PONR mechanisms for SMBs:

1. **Public Surface Dependency** — Customers see MenuList
2. **Customer Habit Formation** — Customers expect it
3. **Owner Forgetfulness** — System replacement

MenuList already has all three. The onboarding flow just needs to **sequence them correctly**.

---

## PONR Strategy

| Priority      | Mechanism                     | Implementation            |
| ------------- | ----------------------------- | ------------------------- |
| Primary       | Digital Screen                | TV shows MenuList content |
| Secondary     | QR at tables                  | Customers scan            |
| Reinforcement | Today driving visible changes | Staff/customers notice    |

**Primary PONR = Digital Screen activation**

---

## The Exact Onboarding Flow

### Screen 0 — Account Created (SILENT)

**No celebration. No tour.**

System does silently:

- Menu digitized
- Decision Blocks scheduled
- CMI calibration day = 1
- Screen token generated

**Owner sees nothing yet.**

### Screen 1 — "Your Menu is Live" (Day 0)

**Location:** First login landing

```
┌─────────────────────────────────────────┐
│                                         │
│  Your menu is live                      │
│                                         │
│  Customers can already view it.         │
│                                         │
│  [View Menu]                            │
│                                         │
│  [Next →] (small)                       │
│                                         │
└─────────────────────────────────────────┘
```

**⚠️ No mention of AI. No excitement.**

This establishes baseline utility.

### Screen 2 — "Your Screen is Ready" (Day 0) — THE HOOK

```
┌─────────────────────────────────────────┐
│                                         │
│  Your shop screen is ready              │
│                                         │
│  If you have a TV in your shop,         │
│  it can show your menu automatically.   │
│                                         │
│  [Open screen link]  (PRIMARY)          │
│                                         │
│  Skip for now (small, secondary)        │
│                                         │
└─────────────────────────────────────────┘
```

### Screen 3 — The Irreversible Step (CRITICAL)

When they tap "Open screen link", **DO NOT** open it inside the dashboard.

Instead, show instruction screen:

```
┌─────────────────────────────────────────┐
│                                         │
│  Set this up once. Then forget it.      │
│                                         │
│  1. Open this link on your shop TV      │
│  2. Press fullscreen                    │
│  3. Bookmark it                         │
│                                         │
│  [QR CODE]                              │
│                                         │
│  xyz.menulist.ai/screen/abc123          │
│  [Copy link]                            │
│                                         │
│  ✓ Works offline                        │
│                                         │
└─────────────────────────────────────────┘
```

**Critical:** They must **leave the admin** and open it on another device.

This forces **physical world integration**.

### Screen 4 — System Confirmation (AUTOMATIC)

Once the screen URL is opened even once:

System records:

- `screen_first_seen_at`
- `screen_last_ping_at`

Owner dashboard silently updates.

### Screen 5 — The Lock-In Message (Day 1)

Next day, in Today tab:

```
┌─────────────────────────────────────────┐
│                                         │
│  Digital screen is running ✓            │
│                                         │
│  Showing today's highlight              │
│                                         │
│  [Open screen link]                     │
│  [Copy link]                            │
│                                         │
└─────────────────────────────────────────┘
```

**⚠️ No "turn off"**  
**⚠️ No "pause"**  
**⚠️ No "manage playlist"**

This is crucial.

### Screen 6 — The Psychological Snap (Day 7)

After 7 days of screen activity:

Show ONE sentence. Once.

```
┌─────────────────────────────────────────┐
│                                         │
│  Your screen has been updating itself   │
│  every day.                             │
│                                         │
│  [Got it]                               │
│                                         │
└─────────────────────────────────────────┘
```

**That's it. No metrics. No graphs.**

This plants the idea: _"I didn't do anything… yet it worked."_

---

## State Machine

```typescript
enum OnboardingStage {
  CREATED = "created", // Account exists, menu processing
  MENU_LIVE = "menu_live", // Menu visible to customers
  SCREEN_PROMPTED = "screen_prompted", // Shown screen setup
  SCREEN_SEEN = "screen_seen", // Screen opened at least once
}

interface OnboardingState {
  stage: OnboardingStage;
  menuLiveAt?: Timestamp;
  screenPromptedAt?: Timestamp;
  screenFirstSeenAt?: Timestamp;
  screenLastSeenAt?: Timestamp;
  daysSinceScreenSeen?: number;
}
```

### Stage Transitions

```
CREATED
   ↓ (menu processing complete)
MENU_LIVE
   ↓ (user sees screen prompt)
SCREEN_PROMPTED
   ↓ (screen URL opened)
SCREEN_SEEN
```

### Blocking Logic

| Current Stage   | Can Access                | Blocked    |
| --------------- | ------------------------- | ---------- |
| CREATED         | Nothing (processing)      | Everything |
| MENU_LIVE       | Dashboard, basic features | —          |
| SCREEN_PROMPTED | All features              | —          |
| SCREEN_SEEN     | All features              | —          |

**Note:** We don't hard-block after MENU_LIVE. Screen setup is **strongly encouraged**, not forced.

---

## Implementation

### Store in User/Store Document

```typescript
// In stores/{storeId} or tenants/{tId}
onboarding: {
  stage: OnboardingStage;
  menuLiveAt?: Timestamp;
  screenPromptedAt?: Timestamp;
  screenFirstSeenAt?: Timestamp;
  screenLastSeenAt?: Timestamp;
}
```

### Frontend Logic

```typescript
// src/hooks/useOnboarding.ts

export function useOnboarding() {
  const { data: onboardingState } = useSWR("onboarding", getOnboardingState);

  const shouldShowScreenPrompt =
    onboardingState?.stage === "menu_live" ||
    onboardingState?.stage === "screen_prompted";

  const isScreenActive =
    onboardingState?.stage === "screen_seen" &&
    onboardingState?.screenLastSeenAt &&
    isWithinDays(onboardingState.screenLastSeenAt, 7);

  return {
    stage: onboardingState?.stage,
    shouldShowScreenPrompt,
    isScreenActive,
  };
}
```

### Screen Detection

```typescript
// In screen page, after successful render
useEffect(() => {
  // Mark screen as seen (fires once)
  fetch("/api/screen/seen", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}, [token]);
```

---

## Why This is a TRUE Point of No Return

Once the screen is live:

1. **Customers see** MenuList
2. **Staff expect** it
3. **Owner forgets** about it

Turning it off creates:

- Blank TV
- Awkwardness
- Immediate regression

**This is not SaaS adoption. This is infrastructure dependency.**

---

## Failure Modes This Flow Survives

| Scenario               | Outcome                       |
| ---------------------- | ----------------------------- |
| Internet down          | Screen still running (cached) |
| Owner on vacation      | Screen still running          |
| Staff change           | Screen still running          |
| Owner stops logging in | Screen still running          |
| AI confidence dips     | Evergreen fallback            |

**The system does not ask permission to exist.**

---

## Success Metrics (Internal Only)

| Metric                 | Target           | Meaning                  |
| ---------------------- | ---------------- | ------------------------ |
| Screen activation rate | 50% of new users | Half get to SCREEN_SEEN  |
| Screen uptime (day 7)  | 80% of activated | Still running after week |
| Owner login frequency  | Decreasing       | Owner forgets us (good!) |

---

## Files to Create/Modify

| File                                            | Purpose                         |
| ----------------------------------------------- | ------------------------------- |
| `src/types/onboarding.ts`                       | **NEW** — Type definitions      |
| `src/hooks/useOnboarding.ts`                    | **NEW** — Onboarding state hook |
| `src/database/stores/index.ts`                  | Add onboarding fields           |
| `src/app/api/screen/seen/route.ts`              | **NEW** — Mark screen seen      |
| `src/components/templates/main-app/onboarding/` | **NEW** — Onboarding screens    |

---

## Implementation Checklist

Historical January 2026 planning checklist only; not current implementation approval.

- [ ] Add onboarding state to store document
- [ ] Create useOnboarding hook
- [ ] Build Screen 1 (Menu Live)
- [ ] Build Screen 2 (Screen Prompt)
- [ ] Build Screen 3 (Setup Instructions)
- [ ] Add `/api/screen/seen` endpoint
- [ ] Build Day 7 notification
- [ ] Test full flow

---

**Document Status:** Historical strategy draft; not current implementation approval
**Estimated Effort:** 1 week
**Priority:** P1 (after Screen Hardening)

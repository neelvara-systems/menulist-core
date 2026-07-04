# Hours + Holiday Accuracy — Product Specification

**Document Type:** Non-Technical PRD  
**Target ICP:** Premium SMB (India + Non-India)  
**Doctrine Fit:** ✅ Silent, set-once, drift-prone, trust-critical

---

## Current Source Boundary

Current runtime covers owner-set weekly working hours, public open/closed status, Today quick-hours edits, and time-slot presets. Holiday calendars and date-specific exception managers are not shipped; unscheduled closures must use Temporary Status or today's hours until a source-backed exception runtime exists.

---

## Feature Split (Updated January 18, 2026)

This feature is split into two layers:

| Layer   | Name                 | Priority | Status                  | Effort  |
| ------- | -------------------- | -------- | ----------------------- | ------- |
| **#2A** | Hours Status Display | **P0**   | ✅ IMPLEMENTED (Jan 18) | ~2 hrs  |
| **#2B** | Holiday + Exceptions | **P1**   | 🔶 DEFERRED             | 2 weeks |

---

## Feature #2A: Hours Status Display (P0)

**Status:** ✅ IMPLEMENTED  
**Priority:** P0  
**Implemented On:** January 18, 2026  
**Effort:** ~2 hours (actual)

### What It Does

Display "Open now" / "Closed" badge on:

- QR/Web menu
- Digital screens
- Staff prompt

### Why P0

**Time-Based Categories ≠ Hours Status**

| Feature               | Question Answered        |
| --------------------- | ------------------------ |
| Time-Based Categories | "What can I order now?"  |
| Hours Status Display  | "Is the store open now?" |

**Real-world failure cases without this:**

1. **Store open + categories hidden** (bad preset config) → Customer thinks "closed" and leaves
2. **Store closed + categories visible** → Customer shows up to locked doors

**Store open/closed is a separate responsibility surface from category visibility.**

### Scope

| ✅ In Scope                             | ❌ Out of Scope          |
| --------------------------------------- | ------------------------ |
| Compute open/closed from `workingHours` | Holiday calendars        |
| Show badge on menu/screens              | Manual exceptions        |
| Use existing `timeZone`                 | Multiple windows per day |
| MOL log hours changes                   | Overnight hours logic    |

### Uses Existing Infrastructure

| Component            | Status            | Location                        |
| -------------------- | ----------------- | ------------------------------- |
| `workingHours` field | ✅ Already exists | `stores/{storeId}.workingHours` |
| `timeZone` field     | ✅ Already exists | `stores/{storeId}.timeZone`     |
| WorkingHoursTab UI   | ✅ Already exists | Business Settings               |

**No new data model needed** — just computation + display.

---

## Feature #2B: Holiday + Exceptions (P1 — DEFERRED)

**Status:** 🔶 DEFERRED  
**Priority:** P1  
**Deferred On:** January 18, 2026

### What It Adds (Later)

- Holiday calendars (India/Global)
- Manual exceptions ("Closed for Diwali")
- Multiple windows per day (lunch break)
- Overnight hours (closes at 2am)

### Why Deferred

1. **Adds cognitive load** — owner must manage calendars + exceptions
2. **Complex edge cases** — timezone correctness, date handling
3. **Worth it only when:**
   - GBP Sync exists (hours sync to Google)
   - Multi-location chains onboard
   - Customer feedback explicitly requests it

### P1 Triggers (When to Revisit)

| Trigger                        | Why                                            |
| ------------------------------ | ---------------------------------------------- |
| GBP Sync (Feature #3) is built | Hours will sync to Google Business Profile     |
| Multi-location chains onboard  | They need consistent hours across outlets      |
| Customer feedback requests it  | If users explicitly ask for holiday management |

---

## Cross-Check Summary (Codebase Grounded)

| Aspect                  | Status            | Notes                                                   |
| ----------------------- | ----------------- | ------------------------------------------------------- |
| **workingHours field**  | ✅ Already exists | `stores/{storeId}.workingHours: Record<string, string>` |
| **WorkingHoursTab UI**  | ✅ Already exists | Basic per-day picker in Business Settings               |
| **timeZone field**      | ✅ Already exists | `stores/{storeId}.timeZone`                             |
| **Schema.org hours**    | ✅ Already exists | Client menu uses hours for SEO                          |
| **Open/Closed display** | ✅ Implemented    | Current public badge behavior from saved `workingHours` |
| **Holiday calendars**   | ❌ Missing        | Not shipped; requires a separate source-backed decision |

---

## Why This Split Matters

ChatGPT feedback (January 18, 2026) correctly identified:

> "Your expert's deferral of holiday calendars is correct. But don't say 'Feature #2 is deferred entirely' — ship the Hours Status Badge as P0. It's low effort, high trust, premium feel."

**The badge is not 'Hours + Holiday system'. It's 'Open/Closed correctness display'.**

This prevents "Feature #2 is dead" perception while keeping the roadmap honest.

---

## Executive Summary

### What is this?

Hours + Holiday Accuracy currently keeps MenuList open/closed status tied to the owner-set working-hours source. It does not auto-manage holiday closures or date-specific exceptions.

### Why it matters

Wrong hours = instant trust destruction:

- Customer arrives and store is closed
- Google says open, menu says closed
- Staff confusion during holidays / private events

### The Promise

> **Set weekly hours once. MenuList shows the current open/closed status from that source.**

---

## 1) Goals

| Goal                               | Success Metric                                      |
| ---------------------------------- | --------------------------------------------------- |
| Ground open/closed status          | Status computed consistently from saved store hours |
| Reduce owner mental load           | Owner edits weekly hours or today's hours once      |
| Premium trust protection           | Customers see the current MenuList status source    |
| Works without external APIs        | 100% inside MenuList first                          |

---

## 2) Scope

### ✅ In Scope (P0 — Minimal)

**What we're building:**

1. **Hours computation engine** — Determine Open/Closed from existing `workingHours`
2. **Status display on surfaces** — QR/Web menu, Screens, Staff Prompt
3. **MOL logging** — Track hours changes (internal)

**Surfaces:**

- QR/Web Menu → Show "Open now · Closes 11:00 PM" or "Closed · Opens 11:00 AM"
- Digital Screens → Show status badge
- Staff Prompt → Show today's hours

### 🔶 Moved to P1 (After Codebase Review)

| Feature                     | Reason for Deferral                          |
| --------------------------- | -------------------------------------------- |
| Multiple windows per day    | Existing UI is single window; complexity     |
| Holiday calendar system     | Adds cognitive load; needs auto-detect logic |
| Exception management        | Owner burden; violates Law 6                 |
| New `StoreHoursConfig` type | Existing `workingHours` format works         |

### ❌ Out of Scope (Explicit)

- Google Business Profile sync (Feature #3)
- Staff scheduling / attendance
- Reservation integration
- Auto-changing hours without owner-defined rules
- Analytics dashboards
- Overnight hours (e.g., 22:00-02:00) — complexity

---

## 3) Problem Statement (Premium Reality)

Premium businesses lose trust and money when:

- Customers arrive and the place is closed
- Menu shows breakfast while the store opens at 11am
- Holiday closures aren't communicated
- Event closures aren't reflected on screens/menus
- Staff is unsure what to tell customers

Owners constantly carry the anxiety:

> "Did we update hours?"

This is pure responsibility burden. MenuList removes it.

---

## 4) Key Concepts

### 4.1 Store Hours Model

A store currently uses:

1. **Weekly schedule** — Default hours per day
2. **Computed status** — Open/Closed/Opens later from saved `workingHours`
3. **One-off closure path** — Temporary Status or today's hours when the regular schedule does not apply

### 4.2 Truth Rule

MenuList is the source of truth for MenuList surfaces only.
No external surfaces are updated in Feature #2.

### 4.3 Deferred Priority Order

The future holiday/exception runtime is not shipped. If it is added later, the implementation plan must source-gate an explicit priority order before any public claim is exposed.

Current runtime priority is weekly working hours plus owner-triggered Temporary Status or today's-hours edits.

---

## 5) User Stories

### Story A — Set weekly hours once

Owner sets:

- Mon–Fri: 11:00–23:00
- Sat–Sun: 09:00–23:30

**Expected:** Menu shows current status from saved weekly hours.
**Current boundary:** Owner updates today's hours or Temporary Status when the schedule is not true for a one-off day.

### Story B — Holiday closure (deferred)

Future owner selects holiday calendar: **India**

**Future expected:** On marked holidays, menu shows closure message automatically.
**Current boundary:** Not shipped. Use Temporary Status or today's hours for holiday closures until a holiday-calendar runtime exists.

### Story C — Manual exception

Owner sets:

- "Closed for private event" on Feb 14, 2026

**Future expected:** Menu reflects closure for that entire day.
**Current boundary:** Date-specific exception management is not shipped. Use Temporary Status or today's hours for the active closure window.

### Story D — Special hours exception

Owner sets:

- "Open 18:00-23:00 only" on Dec 31, 2026 (New Year's Eve)

**Future expected:** Menu shows special hours for that day, overriding weekly schedule.
**Current boundary:** Date-specific special-hours exceptions are not shipped. Update today's hours or weekly hours for the active source.

### Story E — Time-based categories compatibility

Owner uses "Happy Hour" preset 17:00–20:00

**Expected:** Items appear only during valid time windows AND store open/closed status remains consistent.

---

## 6) Functional Requirements (P0 Only)

### FR-1: Weekly Hours (Already Exists)

- ✅ Owner can already set per-day open/close times via `WorkingHoursTab.tsx`
- ✅ Stored as `workingHours: Record<string, string>` e.g., `{ "mon": "11:00-23:00" }`
- ✅ Empty/null = closed that day
- **No changes needed** — existing implementation is sufficient

### FR-2: Open/Closed Computation (NEW — P0 Core)

- Determine status: `OPEN_NOW` | `CLOSED_NOW` | `OPENS_LATER` | `CLOSED_TODAY`
- Show next transition time:
  - "Open until 11:00 PM"
  - "Opens at 11:00 AM"
- Uses existing `workingHours` + `timeZone` from store document

All MenuList surfaces must display consistent status:

| Surface         | Display                                    |
| --------------- | ------------------------------------------ |
| Web/QR Menu     | Small banner: "Open now • Closes 11:00 PM" |
| Digital Screens | Badge in header/footer                     |
| Staff Prompt    | Status + today's hours at top              |

### FR-4: MOL Logging (Internal)

Log events using existing MOL pattern:

- `HOURS_WEEKLY_UPDATED` — When owner changes working hours

No user-facing logs. Fire-and-forget pattern.

**Note:** Exception/Holiday logging deferred to P1.

---

## 7) Validation Rules (P0)

Using existing validation (already in place):

| Rule              | Status               | Notes                               |
| ----------------- | -------------------- | ----------------------------------- |
| Time format HH:mm | ✅ Already validated | `WorkingHoursTab` uses TimePicker   |
| start < end       | ✅ Already enforced  | TimePicker.RangePicker handles this |
| Timezone present  | ⚠️ Check             | May need fallback to "Asia/Kolkata" |

**No new validation needed for P0** — existing UI handles it.

---

## 8) Existing Codebase Integration

### 8.1 Store Document (Already Exists)

**Path:** `stores/{storeId}`

**Existing fields to USE (no changes needed):**

```typescript
// Already in src/types/platform/store.ts
workingHours?: Record<string, string>;  // e.g., { "mon": "11:00-23:00" }
timeZone?: string;                       // e.g., "Asia/Kolkata"
```

### 8.2 Extension Strategy (P0)

**NO new types or fields needed for P0.**

We use existing `workingHours` format. The computation engine parses it.

### 8.3 UI Integration (P0)

**No UI changes needed for P0.**

Existing `WorkingHoursTab.tsx` is sufficient. Owner already sets hours.

---

## 9) Acceptance Criteria (P0 — Minimal)

- [ ] ✅ Owner can set weekly hours + timezone (ALREADY WORKS)
- [ ] NEW: MenuList computes Open/Closed correctly using existing data
- [ ] NEW: QR/Web menu shows status badge
- [ ] NEW: Digital screens show status indicator
- [ ] NEW: Staff Prompt shows today's hours
- [ ] NEW: Hours changes logged via MOL

### P1 Acceptance Criteria (Deferred)

- [ ] Multiple windows per day
- [ ] Holiday calendar integration
- [ ] Exception management
- [ ] Time-slot conflict detection

---

## 10) Success Metric (Definition of Done)

**Owner sets weekly hours once and has a clear path for one-off changes.**

Customers see MenuList's current open/closed status from saved store truth.

---

## 11) Risks & Open Questions

### Risks

| Risk                | Mitigation                                   |
| ------------------- | -------------------------------------------- |
| Missing timezone    | Fallback to "Asia/Kolkata" (India-first ICP) |
| Empty workingHours  | Treat as "Hours not set" - no status shown   |
| Timezone edge cases | Use date-fns-tz for reliable conversions     |

### Open Questions (Resolved)

| Question          | Decision          | Reason                   |
| ----------------- | ----------------- | ------------------------ |
| Overnight hours?  | Block in P0       | Complexity               |
| Holiday calendar? | Defer to P1       | Cognitive load (Law 6)   |
| Multiple windows? | Defer to P1       | UI already single-window |
| New data model?   | No - use existing | `workingHours` works     |

---

## 12) Non-Goals (Explicit)

- No GBP sync (Feature #3)
- No reservation integration
- No staff scheduling
- No "AI guessing" of holidays
- No overnight hours (P0)
- No analytics dashboard for hours
- No new data model (use existing `workingHours`)
- No holiday calendar (P1)
- No exceptions management (P1)

---

## Appendix: MenuList Doctrine Alignment

| Doctrine Principle       | How This Feature Aligns                     |
| ------------------------ | ------------------------------------------- |
| Set once, runs forever   | Weekly hours set once, system handles rest  |
| Conservative messaging   | Simple statuses: "Open now", "Closed today" |
| Silence by default       | No daily notifications or reminders         |
| Owner stays in control   | Owner edits weekly hours, today's hours, or Temporary Status |
| Premium trust protection | Consistent status across all surfaces       |

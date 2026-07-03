# Hours Status Display — Implementation Plan (Feature #2A)

**Document Type:** Dev-Centric Technical Blueprint
**Status:** ✅ IMPLEMENTED
**Priority:** P0
**Implemented On:** January 18, 2026
**Last Updated:** July 2, 2026
**Surfaces:** QR/Web Menu + Digital Screens + Staff Prompt
**Actual Effort:** ~2 hours

---

## Source Gate

This implementation doc is source-gated by `npm run verify:working-hours-boundary`.

Historical blueprint sections below are not launch approval. Current source truth is:

- `src/lib/hours/hoursEngine.ts` computes current open/closed state from `workingHours` and `timeZone`.
- `src/components/atoms/StoreStatusBadge/index.tsx` renders only when working hours exist.
- `src/components/templates/website/clientWebsite/index.tsx` shows the urgent badge only when `ENABLE_HOURS_STATUS_DISPLAY` is enabled and Output Control is not the active hours truth surface.
- Desktop Business Settings writes `workingHours` through `updateStore()` and requires `assertStoreUpdateSucceeded()`.
- `MobileWorkingHoursEditScreen` and the Today quick-hours sheet use optimistic local state but require `assertStoreUpdateSucceeded()` before treating the save as confirmed.
- `updateTimeSlotPresets()` revalidates public menu/OBP cache for store-level preset writes.
- Desktop/mobile time-slot edit/delete flows require store write acknowledgement and project cascade acknowledgement before local success state changes.
- Holiday calendars, exception managers, extra collections, Cloud Functions, provider calls, and Storage writes are not part of the current implementation.

---

## Feature Split

| Layer   | Name                 | Priority | This Doc               |
| ------- | -------------------- | -------- | ---------------------- |
| **#2A** | Hours Status Display | **P0**   | ✅ Covered here        |
| **#2B** | Holiday + Exceptions | **P1**   | 🔶 Deferred (see spec) |

This implementation covers **Feature #2A only** — the minimal "Open/Closed" badge.

---

## ✅ Implementation Summary (January 18, 2026)

### Files Created

| File                                                                  | Purpose                                                                      |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/lib/hours/hoursEngine.ts`                                        | Core computation engine - parses `workingHours`, computes open/closed status |
| `src/lib/hours/index.ts`                                              | Module exports                                                               |
| `src/components/templates/website/clientWebsite/StoreStatusBadge.tsx` | React component - displays status badge with live updates                    |

### Files Modified

| File                                                       | Change                                              |
| ---------------------------------------------------------- | --------------------------------------------------- |
| `src/components/templates/website/clientWebsite/index.tsx` | Integrated StoreStatusBadge into ClientMenuRenderer |

### Key Features

1. **Timezone-aware computation** — Uses store's `timeZone` field
2. **Live updates** — Badge refreshes every 60 seconds
3. **Next change info** — Shows "Closes at 11:00 PM" or "Opens tomorrow at 9:00 AM"
4. **Silent fallback** — If no hours configured, badge doesn't render (no false "Closed")
5. **Hydration-safe** — Avoids SSR/client mismatch by computing on mount

### Badge Appearance

- **Open:** Green dot + "Open" + "Closes at X"
- **Closed:** Red dot + "Closed" + "Opens at X"
- Fixed position at top center of menu page

---

## ⚠️ Cross-Check Summary: Over-Engineering Avoided

After codebase review, the original ChatGPT proposal was **significantly over-engineered**.

### What We're NOT Building in P0

| Feature                     | Reason                        | Status            |
| --------------------------- | ----------------------------- | ----------------- |
| New `StoreHoursConfig` type | Existing `workingHours` works | ❌ Deferred to P1 |
| Holiday calendar system     | Adds cognitive load           | ❌ Deferred to P1 |
| Exception management        | Owner burden                  | ❌ Deferred to P1 |
| Multiple windows per day    | UI already single-window      | ❌ Deferred to P1 |
| New API routes              | Can use existing store update | ❌ Not needed     |
| New Zod schemas             | Existing UI validates         | ❌ Not needed     |

### What We ARE Building in P0

1. **Hours computation engine** — Parse existing `workingHours` → compute status
2. **Status display components** — Show "Open now" / "Closed" on surfaces
3. **MOL logging** — Log when `workingHours` changes

---

## 0) Codebase Analysis (Grounded Reality)

### Existing Implementation (USE AS-IS)

| Component            | Path                               | Status                                                       |
| -------------------- | ---------------------------------- | ------------------------------------------------------------ |
| `workingHours` field | `stores/{storeId}.workingHours`    | ✅ `Record<string, string>` e.g., `{ "mon": "11:00-23:00" }` |
| `timeZone` field     | `stores/{storeId}.timeZone`        | ✅ Already exists                                            |
| Working Hours UI     | `WorkingHoursTab.tsx`              | ✅ Basic picker, no changes needed                           |
| Store update flow    | `updateStore()` in DAL             | ✅ Already saves `workingHours`                              |
| Time-slot preset flow | `updateTimeSlotPresets()` in DAL   | ✅ Saves presets and refreshes public menu/OBP cache          |
| Schema.org hours     | `app/_client/[[...slug]]/page.tsx` | ✅ Already uses `workingHours` for SEO                       |

### P0 Decision: Use Existing Format

**Existing format is sufficient:**

```typescript
// Already in store document
workingHours?: Record<string, string>;
// Example: { "mon": "11:00-23:00", "tue": "11:00-23:00", "sat": null }
// null or missing = closed that day

timeZone?: string;
// Example: "Asia/Kolkata"
```

**No new data model needed for P0.**

---

## 1) Hours Computation Engine (P0 Core)

**File:** `src/lib/hours/hoursEngine.ts` (NEW)

```typescript
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const DEFAULT_TIMEZONE = "Asia/Kolkata";

export type StoreOpenStatus =
  | "OPEN_NOW"
  | "CLOSED_NOW"
  | "OPENS_LATER"
  | "CLOSED_TODAY";

export type HoursStatusResult = {
  status: StoreOpenStatus;
  message: string;
  opensAt?: string;
  closesAt?: string;
};

/**
 * Parse existing workingHours format
 * Input: "11:00-23:00" or null
 * Output: { start: "11:00", end: "23:00" } or null
 */
function parseHoursString(
  hoursStr: string | null | undefined,
): { start: string; end: string } | null {
  if (!hoursStr || typeof hoursStr !== "string") return null;
  const parts = hoursStr.split("-");
  if (parts.length !== 2) return null;
  return { start: parts[0].trim(), end: parts[1].trim() };
}

/**
 * Format HH:mm to 12-hour display
 */
function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Get store open/closed status using existing workingHours format
 */
export function getStoreStatus(
  workingHours: Record<string, string> | undefined,
  timezone: string | undefined,
  now: Date = new Date(),
): HoursStatusResult {
  // Handle missing data gracefully
  if (!workingHours || Object.keys(workingHours).length === 0) {
    return { status: "CLOSED_TODAY", message: "Hours not set" };
  }

  // Use store timezone or default
  const tz = timezone || DEFAULT_TIMEZONE;
  const zonedNow = toZonedTime(now, tz);
  const dayOfWeek = WEEKDAYS[zonedNow.getDay()];
  const currentTime = format(zonedNow, "HH:mm");

  // Get today's hours
  const todayHours = parseHoursString(workingHours[dayOfWeek]);

  // No hours for today = closed
  if (!todayHours) {
    return { status: "CLOSED_TODAY", message: "Closed today" };
  }

  const { start, end } = todayHours;

  // Check if currently open
  if (currentTime >= start && currentTime < end) {
    return {
      status: "OPEN_NOW",
      message: `Open now · Closes ${formatTime12h(end)}`,
      closesAt: end,
    };
  }

  // Check if opens later today
  if (currentTime < start) {
    return {
      status: "OPENS_LATER",
      message: `Closed · Opens ${formatTime12h(start)}`,
      opensAt: start,
    };
  }

  // Past closing time
  return { status: "CLOSED_NOW", message: "Closed" };
}

/**
 * Get today's hours string for display
 */
export function getTodayHoursDisplay(
  workingHours: Record<string, string> | undefined,
  timezone: string | undefined,
  now: Date = new Date(),
): string {
  if (!workingHours) return "Hours not set";

  const tz = timezone || DEFAULT_TIMEZONE;
  const zonedNow = toZonedTime(now, tz);
  const dayOfWeek = WEEKDAYS[zonedNow.getDay()];
  const todayHours = parseHoursString(workingHours[dayOfWeek]);

  if (!todayHours) return "Closed today";
  return `${formatTime12h(todayHours.start)} - ${formatTime12h(todayHours.end)}`;
}
```

---

## 2) MOL Logging Extension

**File:** `src/types/mol.types.ts` (MODIFY)

Add to `MOLEventType`:

```typescript
| "HOURS_WEEKLY_UPDATED"
```

---

## 3) Hours Logger (Minimal)

**File:** `src/lib/hours/hoursLogger.ts` (NEW)

```typescript
import { logMOLEvent } from "@lib/pricing/molLogger";

/**
 * Log when workingHours changes
 */
export function logHoursUpdated(params: {
  storeId: number;
  before: Record<string, string> | null;
  after: Record<string, string>;
  actorUserId: string;
  tId: number;
  sId: number;
}): void {
  setImmediate(() => {
    logMOLEvent({
      type: "HOURS_WEEKLY_UPDATED",
      projectId: String(params.storeId),
      actorUserId: params.actorUserId,
      entityType: "STORE_HOURS",
      entityId: String(params.storeId),
      before: params.before ? { workingHours: params.before } : null,
      after: { workingHours: params.after },
      version: Date.now(),
      tId: params.tId,
      sId: params.sId,
    });
  });
}
```

---

## 4) Surface Integration (P0)

### 4.1 Status Display Component

**File:** `src/components/atoms/StoreStatusBadge.tsx` (NEW)

```typescript
import { getStoreStatus, HoursStatusResult } from "@lib/hours/hoursEngine";
import { Tag } from "antd";

interface StoreStatusBadgeProps {
  workingHours?: Record<string, string>;
  timezone?: string;
}

export function StoreStatusBadge({ workingHours, timezone }: StoreStatusBadgeProps) {
  const status = getStoreStatus(workingHours, timezone);

  const colorMap: Record<string, string> = {
    OPEN_NOW: "green",
    CLOSED_NOW: "red",
    OPENS_LATER: "orange",
    CLOSED_TODAY: "default",
  };

  return (
    <Tag color={colorMap[status.status]}>
      {status.message}
    </Tag>
  );
}
```

### 4.2 Integration Points

| Surface         | File               | Integration                  |
| --------------- | ------------------ | ---------------------------- |
| QR/Web Menu     | Client menu header | Add `<StoreStatusBadge />`   |
| Digital Screens | Screen layout      | Add status indicator         |
| Staff Prompt    | Prompt header      | Add `getTodayHoursDisplay()` |

---

## 5) File Structure (P0 Minimal)

```
src/
├── lib/
│   └── hours/
│       ├── index.ts              # NEW - exports
│       └── hoursEngine.ts        # NEW - computation (~60 lines)
│       └── hoursLogger.ts        # NEW - MOL logging (~25 lines)
├── components/
│   └── atoms/
│       └── StoreStatusBadge.tsx  # NEW - display component (~30 lines)
└── types/
    └── mol.types.ts              # MODIFY - add HOURS_WEEKLY_UPDATED
```

**Total new code: ~115 lines** (vs original proposal of ~500+ lines)

---

## 6) Implementation Checklist (P0)

### Day 1: Core Engine

- [ ] Create `src/lib/hours/hoursEngine.ts`
- [ ] Create `src/lib/hours/index.ts` (exports)
- [ ] Add unit tests for `getStoreStatus()`

### Day 2: MOL + Component

- [ ] Add `HOURS_WEEKLY_UPDATED` to `mol.types.ts`
- [ ] Create `src/lib/hours/hoursLogger.ts`
- [ ] Create `StoreStatusBadge.tsx`

### Day 3: Surface Integration

- [ ] Add status to QR/Web menu
- [ ] Add status to digital screens
- [ ] Add hours to Staff Prompt

### Day 4: Testing

- [ ] Timezone edge cases
- [ ] Empty/null hours handling
- [ ] Manual QA across surfaces

**Total: ~3-4 days** (reduced from 8 days)

---

## 7) Testing Checklist (P0)

| Test Case        | Input                                          | Expected                                 |
| ---------------- | ---------------------------------------------- | ---------------------------------------- |
| Open now         | `{ "mon": "11:00-23:00" }`, 12:00 Mon          | `OPEN_NOW`, "Open now · Closes 11:00 PM" |
| Opens later      | `{ "mon": "11:00-23:00" }`, 09:00 Mon          | `OPENS_LATER`, "Closed · Opens 11:00 AM" |
| Closed today     | `{ "mon": null }`, any time Mon                | `CLOSED_TODAY`, "Closed today"           |
| Past closing     | `{ "mon": "11:00-23:00" }`, 23:30 Mon          | `CLOSED_NOW`, "Closed"                   |
| Missing hours    | `undefined`                                    | `CLOSED_TODAY`, "Hours not set"          |
| Timezone (India) | `{ "mon": "11:00-23:00" }`, tz: "Asia/Kolkata" | Correct for IST                          |

---

## 8) Security Checklist (P0)

- [x] No new API routes (uses existing store update)
- [x] No new Firestore collections
- [x] MOL logging via existing pattern
- [x] `workingHours` already validated by UI
- [x] Time-slot preset store writes revalidate public cache through `updateTimeSlotPresets()`

---

## 9) Dependencies

| Package       | Purpose           | Status                |
| ------------- | ----------------- | --------------------- |
| `date-fns`    | Date formatting   | ✅ Already installed  |
| `date-fns-tz` | Timezone handling | ⚠️ Check if installed |

---

## 10) P1 Roadmap (Deferred Features)

When ready to expand:

| Feature                         | Effort | Trigger         |
| ------------------------------- | ------ | --------------- |
| Multiple windows per day        | 2 days | User request    |
| Holiday calendar (INDIA/GLOBAL) | 2 days | Market demand   |
| Exception management            | 3 days | Chain customers |
| New `StoreHoursConfig` type     | 1 day  | When P1 starts  |

---

## 11) Disagreements with ChatGPT (Resolved)

| ChatGPT Proposal            | Our Decision                | Reason                      |
| --------------------------- | --------------------------- | --------------------------- |
| New `StoreHoursConfig` type | Use existing `workingHours` | Already works, no migration |
| Holiday calendar in P0      | Defer to P1                 | Cognitive load (Law 6)      |
| Exception management        | Defer to P1                 | Owner burden                |
| 8+ new files                | 3 new files                 | KISS principle              |
| ~8 days effort              | ~3-4 days                   | Simplified scope            |
| New API routes              | Use existing                | Store update already works  |

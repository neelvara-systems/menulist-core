# Hours + Holiday Accuracy

**Feature #2 — Expansion Surfaces Roadmap**

---

## Feature Split (Updated January 18, 2026)

| Layer   | Name                 | Priority | Status                  | Effort  |
| ------- | -------------------- | -------- | ----------------------- | ------- |
| **#2A** | Hours Status Display | **P0**   | ✅ IMPLEMENTED (Jan 18) | ~2 hrs  |
| **#2B** | Holiday + Exceptions | **P1**   | 🔶 DEFERRED             | 2 weeks |

---

## Feature #2A: Hours Status Display (P0)

**What:** Display "Open now" / "Closed" badge on menu/screens/staff prompt.

**Why P0:** Store open/closed is a **separate responsibility surface** from category visibility. Time-Based Categories answers "What can I order?" but not "Is the store open?"

**Uses:** Existing `workingHours` + `timeZone` fields. No new data model.

---

## Feature #2B: Holiday + Exceptions (P1 — Deferred)

**What:** Holiday calendars, manual exceptions, multiple windows, overnight hours.

**Why Deferred:**

- Adds cognitive load (owner must manage calendars)
- Complex edge cases (timezone, date handling)
- Worth it only when GBP sync exists or chains onboard

---

## What is this?

Hours + Holiday Accuracy ensures your business hours are **always correct** across all MenuList surfaces — without the owner needing to remember to update.

**The Promise:** Set hours once. MenuList keeps them correct everywhere.

---

## Key Capabilities (P0)

| Capability                | Description                                | Status            |
| ------------------------- | ------------------------------------------ | ----------------- |
| **Weekly Hours**          | Set per-day open/close times once          | ✅ Already exists |
| **Open/Closed Status**    | Real-time computation, no cron jobs        | 🔨 P0 Core        |
| **Multi-Surface Display** | QR/Web menu, Digital screens, Staff prompt | 🔨 P0 Core        |
| **MOL Logging**           | Track hours changes                        | 🔨 P0 Core        |
| **Holiday Calendar**      | Auto-closures for India/Global holidays    | 🔶 Deferred to P1 |
| **Exceptions**            | Owner-defined closures or special hours    | 🔶 Deferred to P1 |

---

## Documents

| Document                                                                     | Purpose                | Audience            |
| ---------------------------------------------------------------------------- | ---------------------- | ------------------- |
| [hours-holiday-accuracy_spec.md](./hours-holiday-accuracy_spec.md)           | Product specification  | CEO, Product, Teams |
| [hours-holiday-accuracy_impl.md](./hours-holiday-accuracy_impl.md)           | Technical blueprint    | Developers          |
| [hours-holiday-accuracy_marketing.md](./hours-holiday-accuracy_marketing.md) | Sales & marketing copy | Sales, Marketing    |

---

## Key Files (P0 — Minimal)

```
src/
├── lib/
│   └── hours/
│       ├── index.ts              # Exports
│       ├── hoursEngine.ts        # Status computation (~60 lines)
│       └── hoursLogger.ts        # MOL logging (~25 lines)
├── components/
│   └── atoms/
│       └── StoreStatusBadge.tsx  # Display component (~30 lines)
└── types/
    └── mol.types.ts              # Add HOURS_WEEKLY_UPDATED
```

**Total new code: ~115 lines** (uses existing `workingHours` field)

---

## Feature Flags

None required for P0. Feature ships complete.

---

## Dependencies

| Dependency              | Purpose           | Status                  |
| ----------------------- | ----------------- | ----------------------- |
| `date-fns`              | Date manipulation | ✅ Already installed    |
| `date-fns-tz`           | Timezone handling | ⚠️ Check if installed   |
| Existing MOL Logger     | Audit logging     | ✅ Available            |
| Existing `workingHours` | Hours data        | ✅ Already in store doc |

---

## Doctrine Alignment

| Principle              | How This Feature Aligns            |
| ---------------------- | ---------------------------------- |
| Set once, runs forever | Weekly hours set once              |
| Conservative messaging | Simple: "Open now", "Closed today" |
| Silence by default     | No daily notifications             |
| Owner stays in control | Exceptions always override         |

---

## Out of Scope (P0)

- ❌ Google Business Profile sync (Feature #3)
- ❌ Overnight hours (e.g., 22:00-02:00)
- ❌ Staff scheduling
- ❌ Reservation integration
- ❌ Analytics dashboard

---

## Extending This Feature

### Adding more holiday calendars

1. Edit `src/lib/hours/holidayCalendars.ts`
2. Add new calendar array (e.g., `US_HOLIDAYS`)
3. Update `HolidayCalendar` type in `hours.types.ts`
4. Update Zod schema

### Adding overnight hours support (P1)

1. Update `dayWindowSchema` to allow `start > end`
2. Modify `getStoreStatusNow` to handle cross-midnight logic
3. Add comprehensive timezone testing

### Adding GBP sync (Feature #3)

See separate feature documentation when available.

---

## Related Features

| Feature                | Relationship             |
| ---------------------- | ------------------------ |
| Pricing Integrity (#1) | Same MOL logging pattern |
| GBP Sync (#3)          | Will consume hours data  |
| Time Slot Presets      | Compatible, no conflicts |

---

## Quick Links

- **Spec:** [hours-holiday-accuracy_spec.md](./hours-holiday-accuracy_spec.md)
- **Implementation:** [hours-holiday-accuracy_impl.md](./hours-holiday-accuracy_impl.md)
- **Marketing:** [hours-holiday-accuracy_marketing.md](./hours-holiday-accuracy_marketing.md)

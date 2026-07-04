# Hours + Holiday Accuracy

**Last Updated:** July 2, 2026
**Current Source Contract:** Working-hours status and time-slot presets are implemented from existing store/project truth. Holiday calendars and exception managers are not shipped runtime.

## Source Gate

- Local source gate: `npm run verify:working-hours-boundary`
- Current runtime uses `stores/{storeId}.workingHours`, `stores/{storeId}.hoursLastUpdatedAt`, `stores/{storeId}.timeSlotPresets`, category `timeSlots`, `src/lib/hours/hoursEngine.ts`, `src/components/atoms/StoreStatusBadge/index.tsx`, desktop Business Settings, `MobileWorkingHoursEditScreen`, `MobileHoursScreen`, and `MobileTimeSlotsScreen`.
- Public output uses the existing store/project payload and cache paths; there is no new collection, Cloud Function, Storage object, provider call, holiday-calendar runtime, or exception manager in the current source.
- Historical roadmap language in older spec/marketing sections is not launch approval. Current approval must come from this source gate plus browser/manual mutation QA where release scope requires it.

---

## Feature Split (Source-Current)

| Layer   | Name                 | Priority | Status                  | Effort  |
| ------- | -------------------- | -------- | ----------------------- | ------- |
| **#2A** | Hours Status Display | **P0**   | Implemented | Existing store fields |
| **#2B** | Holiday + Exceptions | **Not shipped** | Not in current runtime | Requires a separate source-backed decision |

---

## Current Runtime: Hours Status Display

**What:** Display "Open now" / "Closed" badge on menu/screens/staff prompt.

**Why P0:** Store open/closed is a **separate responsibility surface** from category visibility. Time-Based Categories answers "What can I order?" but not "Is the store open?"

**Uses:** Existing `workingHours` + `timeZone` fields. No new data model.

---

## Not Shipped: Holiday + Exceptions

**What:** Holiday calendars, date-specific exceptions, and owner exception managers are not part of the current runtime.

**Why not shipped now:**

- Adds cognitive load (owner must manage calendars)
- Complex edge cases (timezone, date handling)
- Worth it only when GBP sync exists or chains onboard
- Requires a separate source-backed implementation plan and source gate before public claims

---

## What is this?

Hours + Holiday Accuracy currently covers public open/closed status from saved weekly working hours, Today quick-hours edits, and time-slot presets. Holiday calendars and date-specific exception managers are not part of the shipped runtime.

**The Promise:** Set weekly hours once. MenuList shows the current open/closed status from that source; use Temporary Status or today's hours for one-off changes.

---

## Key Capabilities (P0)

| Capability                | Description                                | Status            |
| ------------------------- | ------------------------------------------ | ----------------- |
| **Weekly Hours**          | Set per-day open/close times once          | ✅ Already exists |
| **Open/Closed Status**    | Real-time computation, no cron jobs        | 🔨 P0 Core        |
| **Multi-Surface Display** | QR/Web menu, Digital screens, Staff prompt | 🔨 P0 Core        |
| **MOL Logging**           | Track hours changes                        | 🔨 P0 Core        |
| **Time-slot Presets**     | Store-level preset windows for category visibility | Implemented |
| **Holiday Calendar**      | Auto-closures for India/Global holidays    | Not shipped |
| **Exceptions**            | Owner-defined date-specific closures or special hours | Not shipped |

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
├── components/
│   ├── atoms/
│   │   └── StoreStatusBadge/
│   │       └── index.tsx        # Public open/closed badge
│   ├── mobile/screens/
│   │   ├── MobileHoursScreen.tsx
│   │   ├── MobileWorkingHoursEditScreen.tsx
│   │   └── MobileTimeSlotsScreen.tsx
│   └── templates/main-app/businessSettings/
│       ├── index.tsx
│       └── tabs/TimeSlotPresetsTab.tsx
├── lib/
│   └── hours/
│       ├── index.ts              # Exports
│       ├── hoursEngine.ts        # Status computation (~60 lines)
│       └── hoursLogger.ts        # MOL logging (~25 lines)
└── database/
    ├── stores/index.tsx          # workingHours/timeSlotPresets writes + cache
    └── projects/index.ts         # preset cascade updates + project cache
```

**Total new code: ~115 lines** (uses existing `workingHours` field)

---

## Feature Flags

`ENABLE_HOURS_STATUS_DISPLAY` controls the public hours badge path. Time-slot preset management is part of store/menu editing and is guarded by existing owner settings permissions and DAL acknowledgement paths.

---

## Dependencies

| Dependency              | Purpose           | Status                  |
| ----------------------- | ----------------- | ----------------------- |
| Browser `Intl` APIs     | Timezone day/time computation | Used by current source |
| Existing MOL Logger     | Audit logging     | ✅ Available            |
| Existing `workingHours` | Hours data        | ✅ Already in store doc |

---

## Doctrine Alignment

| Principle              | How This Feature Aligns            |
| ---------------------- | ---------------------------------- |
| Set once, runs forever | Weekly hours set once              |
| Conservative messaging | Simple: "Open now", "Closed today" |
| Silence by default     | No daily notifications             |
| Owner stays in control | Owner edits weekly hours or Today quick-hours |

---

## Out of Scope (P0)

- ❌ Google Business Profile sync (Feature #3)
- ❌ Staff scheduling
- ❌ Reservation integration
- ❌ Analytics dashboard
- ❌ Holiday calendar or date-specific exception manager

---

## Extending This Feature

Holiday calendars, date-specific exceptions, and GBP sync are not current runtime. Add or update implementation docs, source gates, Firebase cost notes, mobile support, website/help copy, and production-readiness audit entries before exposing any of those capabilities.

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

# Hours + Holiday Accuracy — Mobile Support

**Last Updated:** July 2, 2026
**Decision:** ✅ MOBILE SUPPORTED — Hours display and editing implemented

---

## Source Gate

- Source gate: `npm run verify:working-hours-boundary`
- `MobileWorkingHoursEditScreen` covers full weekly hours edits.
- `MobileHoursScreen` covers Today quick-hours edits.
- `MobileTimeSlotsScreen` covers store-level time-slot presets and project category cascade acknowledgement.
- Browser/manual mutation QA is still required before using this source gate as release certification.

---

## Feature Admission Test

| Gate | Result | Reasoning |
|------|--------|-----------|
| **Frequency** | ✅ PASS | Hours checked/updated daily during service |
| **Speed** | ✅ PASS | Toggle <1s, save <2s |
| **Touch** | ✅ PASS | Simple toggles and time pickers |
| **Value** | ✅ PASS | Owner on floor needs to update hours quickly |

---

## Mobile Implementation

| Feature | Mobile Component | Status |
|---------|-----------------|--------|
| View today's hours + status | `MobileHoursScreen` | ✅ |
| View weekly schedule | `MobileHoursScreen` | ✅ |
| Edit working hours | `MobileWorkingHoursEditScreen` | ✅ |
| Holiday/exceptions (#2B) | N/A — deferred on desktop too | ⏳ |

## Data Format Parity

- Day keys: `sun`, `mon`, `tue`... (matches desktop)
- Time format: `HH:mm-HH:mm` 24h (matches desktop)
- DAL: `updateStore` (same as desktop)

## Failure Boundary

- `MobileWorkingHoursEditScreen` uses optimistic local updates, then persists through `updateStore()`.
- `MobileWorkingHoursEditScreen` and the Today quick-hours sheet must require `assertStoreUpdateSucceeded()` before treating the store write as saved.
- Failed full-screen saves must log `mobile_working_hours_save_failed` with bounded store, tenant, changed-day count, closed-day count, and previous-hours presence metadata before restoring the previous working hours.
- Failed Today quick-hours saves must log `mobile_today_hours_update_failed` with bounded store, tenant, day-key, previous-hours, next-hours, and previous freshness metadata before restoring the previous working hours.
- `MobileTimeSlotsScreen` must require `assertTimeSlotPresetUpdateSucceeded()` before local preset state changes. The shared `updateTimeSlotPresets()` DAL path refreshes the public menu/OBP cache after the store-level preset write; preset edit/delete cascades keep their project-level cache refreshes.
- Owner-facing failure copy stays fixed; raw server or exception text must not be shown.

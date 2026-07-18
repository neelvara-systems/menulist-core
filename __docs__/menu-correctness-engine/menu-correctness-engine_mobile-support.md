# Menu Correctness Engine (MCE) — Mobile Support

**Last Updated:** July 16, 2026
**Decision:** No separate MCE UI; shared local validation plus owner-facing Menu Check

---

## Feature Admission Test

MCE has no dedicated mobile screen. Mobile owners use Menu Check for advisory quality signals, while shared project mutations retain their current validation and outlet-policy boundaries.

---

## How MCE Relates to Mobile

Standalone mobile mutations that use `updateProject()` receive the same transaction-local MCE stamp as desktop. Linked-outlet mutations cross `/api/projects/outlet-save`, which rechecks scope, permission, linkage, policy, input shape, and concurrency but does not persist `_mce`:

- Standalone toggle/edit/add/delete → `updateProject()` → MCE stamps `_mce` in the existing write
- Linked outlet edit → authenticated outlet-save transaction → no extra MCE write
- Mobile Menu Check → pure computation from the loaded project → no Firebase operation

The blocking MCE editor gate remains on the desktop editor transition. Mobile Menu Check is advisory and routes owners to exact review/repair contexts; it never blocks an acknowledged mobile save.

# Menu Command Center — Mobile Support

**Last Updated:** July 2, 2026
**Decision:** ⚠️ PARTIAL — Availability + Show/Hide on mobile; Pricing + Category moves desktop-only

**Source gate:** `npm run verify:menu-project-editor-boundary` checks that Mobile bulk actions stay on the same project persistence contract as desktop: `BulkActionsSheet` returns an updated project, `MobileMenuScreen` persists through `updateProjectWithoutLoader`, and `assertProjectUpdateSucceeded` rejects missing acknowledgements before local state is treated as saved.

---

## Feature Admission Test (Re-evaluated)

| Gate          | Result                               | Reasoning                                                            |
| ------------- | ------------------------------------ | -------------------------------------------------------------------- |
| **Frequency** | ⚠️ PARTIAL                           | Availability toggles happen daily on-floor; pricing changes are rare |
| **Speed**     | ✅ PASS (for availability/show-hide) | Select items → tap action → done in <10s                             |
| **Touch**     | ✅ PASS (for simple actions)         | Checkboxes + big action buttons work on touch                        |
| **Value**     | ✅ PASS                              | Phone-only owner needs to mark items sold out in bulk during service |

---

## Mobile Implementation

| Feature                                | Mobile Component   | Status                      |
| -------------------------------------- | ------------------ | --------------------------- |
| Bulk Availability (available/sold out) | `BulkActionsSheet` | ✅                          |
| Bulk Show/Hide (permanently show/hide) | `BulkActionsSheet` | ✅                          |
| Multi-select with search               | `BulkActionsSheet` | ✅                          |
| Category-grouped item list             | `BulkActionsSheet` | ✅                          |
| Confirmation dialog before apply       | `BulkActionsSheet` | ✅                          |
| Bulk Pricing (%, flat, fixed)          | Desktop only       | ❌ Complex multi-step UX    |
| Move to Category                       | Desktop only       | ❌ Complex multi-step UX    |
| Impact Preview panel                   | Desktop only       | ❌ Needs large screen       |
| 30-second Undo                         | Desktop only       | ❌ Complex state management |

## DAL Parity

- Uses same `getProjectData`, `updateProject` DAL functions
- Same project data structure manipulation (item.available, item.active fields)
- Triggered via button next to search bar in `MobileMenuScreen`
- Mobile bulk actions stay on the same project persistence contract and do not create per-item writes.

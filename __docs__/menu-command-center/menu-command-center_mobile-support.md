# Menu Command Center — Mobile Support

**Last Updated:** February 16, 2026 (v2 — simplified mobile bulk actions implemented)
**Decision:** ⚠️ PARTIAL — Availability + Show/Hide on mobile; Pricing + Category moves desktop-only

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

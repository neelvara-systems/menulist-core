# Menu Command Center — Mobile Support

**Last Updated:** August 31, 2026
**Decision:** ✅ MOBILE SUPPORTED — Availability, visibility, pricing, and category moves

**Source gate:** `npm run verify:menu-project-editor-boundary` checks that Mobile bulk actions stay on the same project persistence contract as desktop: `BulkActionsSheet` returns an updated project, `MobileMenuScreen` persists through `updateProjectWithoutLoader`, and `assertProjectUpdateSucceeded` rejects missing acknowledgements before local state is treated as saved. It also fails closed unless confirmation dialogs replace, rather than stack over, both bulk-action sheets.

---

## Feature Admission Test (Re-evaluated)

| Gate          | Result                               | Reasoning                                                            |
| ------------- | ------------------------------------ | -------------------------------------------------------------------- |
| **Frequency** | ✅ PASS                              | Availability and visibility happen during service; pricing and moves are common menu-maintenance actions |
| **Speed**     | ✅ PASS                              | Search/select → preview → confirm is a short bounded flow            |
| **Touch**     | ✅ PASS                              | Grouped checkboxes, filters, previews, and 44px action targets work on touch |
| **Value**     | ✅ PASS                              | Phone-only owner needs to mark items sold out in bulk during service |

---

## Mobile Implementation

| Feature                                | Mobile Component   | Status                      |
| -------------------------------------- | ------------------ | --------------------------- |
| Bulk Availability (available/sold out) | `BulkActionsSheet` | ✅                          |
| Bulk Show/Hide (permanently show/hide) | `BulkActionsSheet` | ✅                          |
| Multi-select with search               | `BulkActionsSheet` | ✅                          |
| Category-grouped item list             | `BulkActionsSheet` | ✅                          |
| Confirmation dialog before apply       | `BulkActionsSheet` | ✅ Replaces the action sheet while open |
| Bulk Pricing (%, flat, fixed)          | `BulkActionsSheet` | ✅ Preview before confirm   |
| Move to Category                       | `BulkActionsSheet` | ✅ Destination + preview    |
| Impact Preview panel                   | `BulkActionsSheet` | ✅ Compact inline preview   |
| 30-second Undo                         | Desktop only       | ❌ Complex state management |

## DAL Parity

- Uses same `getProjectData`, `updateProject` DAL functions
- Same project data structure manipulation (item.available, item.active fields)
- Triggered via button next to search bar in `MobileMenuScreen`
- Mobile bulk actions stay on the same project persistence contract and do not create per-item writes.

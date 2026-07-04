# Customer FAQ Reply Pack - Mobile Support

**Status:** Mobile-compatible public V0 route
**Last Updated:** July 4, 2026

---

## Admission

Customer FAQ Reply Pack is useful on mobile because owners can paste repeated questions, enter facts, and copy answer blocks directly from the public route.

The public route works without login.

Verification wording: public route works without login.

## Mobile Rules

| Behavior | Status |
| --- | --- |
| Public route works without login | Implemented |
| Copy FAQ block | Implemented |
| Copy/download/share report | Implemented |
| Optional contact handoff | Implemented through existing bounded public contact route |
| Chatbot creation | Not implemented |
| Conversation-log reading | Not implemented |
| Automation configuration | Not implemented |
| Message sending | Not implemented |

## Owner App Boundary

There is no owner-PWA module in V0. A future owner-side version must reuse existing MenuList store/project truth and stay inside `MobileShell` when reached from owner mobile screens.

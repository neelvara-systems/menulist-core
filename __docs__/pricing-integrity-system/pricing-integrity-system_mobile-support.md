# Pricing Integrity System — Mobile Support

**Last Updated:** February 16, 2026
**Decision:** ✅ AUTOMATIC — Price changes from mobile propagate to all surfaces automatically

---

## Feature Admission Test

Not applicable — Pricing Integrity is a backend propagation system, not an owner-facing feature.

---

## How Mobile Contributes

When an owner edits a price via MobileMenuScreen → ItemEditSheet → `updateProject()`, the Pricing Integrity System ensures the new price propagates to:

| Surface | Propagation Method | Mobile Edit Support |
|---------|-------------------|-------------------|
| QR/Web Menu | Live Firestore read | ✅ Automatic |
| Digital Screens | Version polling | ✅ Automatic |
| Staff Prompt | Live Firestore read | ✅ Automatic |
| PDF Menu | Staleness tracking | ✅ Flagged on next generation |

No separate mobile UI needed — the system works via shared Firestore data.

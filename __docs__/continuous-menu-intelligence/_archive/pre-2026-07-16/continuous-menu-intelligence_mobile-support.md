# Continuous Menu Intelligence (CMI) — Mobile Support

**Last Updated:** February 16, 2026
**Decision:** ❌ NO UI — Backend-only feature (nightly batch job)

---

## Feature Admission Test

Not applicable — CMI is a server-side background process with no owner-facing UI on desktop or mobile.

---

## What CMI Does

- Runs nightly at 02:30 UTC as a Cloud Function
- Evaluates menu item performance automatically
- Adjusts confidence scores
- Takes reversible autonomous actions within safety gates

## Mobile Relevance

None. CMI has no dashboard UI — it's invisible infrastructure. Menu item scores and adjustments flow through the same Firestore project data that mobile reads. When CMI adjusts an item's visibility, the change appears automatically on the owner's MobileMenuScreen on next refresh.

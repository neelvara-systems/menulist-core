# Product Friction Intelligence — Mobile Support Assessment

> **Version:** 1.0.0
> **Created:** 2026-03-09

---

## §1 — Feature Admission Test (4 Gates)

| Gate | Question | Answer | Pass? |
|------|----------|--------|-------|
| Frequency | Is this used daily/multiple times per day? | No — weekly review at most | ❌ |
| Speed | Completes in <5 seconds? | Yes — 2 Firestore reads, instant render | ✅ |
| Touch | Works with thumb-only? | Yes — read-only list, no interactions | ✅ |
| Value | Needed away from desk? | No — strategic review, not operational | ❌ |

**Result:** 2/4 gates pass → **DESKTOP ONLY**

---

## §2 — Rationale

Product Friction Intelligence is a **strategic review tool**, not an operational one. SaaS founders review friction patterns weekly at their desk, not while walking around. The data is complex enough (entity names, trend arrows, escalation rates) that a desktop view is the correct surface.

---

## §3 — Future Mobile Consideration

If Canonica adds **push notifications for emerging friction topics**, a simplified mobile view showing just the health badge + emerging alerts could be valuable. This would pass the Frequency + Value gates.

**Trigger for mobile reassessment:** When `ENABLE_CANONICA_FRICTION_NOTIFICATIONS` is implemented.

---

## §4 — Mobile-Friendly Data

Even without a dedicated mobile screen, the data model is mobile-compatible:
- `overallHealth` is a single word (HIGH/MODERATE/LOW) — perfect for notification badges
- `emergingTopics` is a short array — fits in a notification payload
- `topFrictionEntities` is max 10 items — renderable in a mobile list

No mobile-specific data transformations needed if mobile surface is added later.

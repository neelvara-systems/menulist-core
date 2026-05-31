# Automatic Knowledge Creation — Mobile Support Assessment

> **Status:** DOCUMENTED
> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-03-09
> **Audience:** Developers

---

## §1 — Feature Admission Test (4 Gates)

| Gate | Question | Answer | Pass? |
|------|----------|--------|-------|
| **Frequency** | Used daily/multiple times per day? | No — draft review is weekly/monthly (5-15 drafts/month) | ❌ |
| **Speed** | Completes in <5 seconds? | No — reviewing a draft requires reading, editing, understanding context | ❌ |
| **Touch** | Works with thumb-only? | Partially — text editing on mobile is poor UX for structured content | ❌ |
| **Value** | Needed away from desk? | No — documentation review is a desk activity, not a field task | ❌ |

### Verdict: **DESKTOP ONLY** — Does not pass mobile admission test (0/4 gates)

---

## §2 — Rationale

Automatic Knowledge Creation is a **governance workflow** that involves:
- Reading AI-generated draft content (500+ chars summary, 1000+ chars explanation)
- Reviewing signal evidence (example user questions, entity context)
- Editing structured content (title, summary, steps, warnings, prerequisites)
- Making approval decisions that create permanent canonical answers

All of these tasks require focused attention, comfortable text editing, and comparison between draft and evidence — desktop activities by nature.

---

## §3 — Mobile Notification Only

While the full review workflow is desktop-only, a **notification** about new draft proposals could be valuable on mobile:

- "3 new documentation drafts are ready for your review"
- Tapping the notification could deep-link to the governance dashboard on desktop
- This follows the same pattern as other governance notifications

This notification is part of Expansion Item #7 (Tool Integrations) and will be implemented there, not in this feature.

---

## §4 — Future Considerations

If future data shows founders regularly reviewing proposals on mobile (e.g., via usage analytics), the decision can be revisited. But given the nature of documentation review work, this is unlikely.

---

## §5 — Shared Logic

Despite being desktop-only for UI, the following are shared between desktop and mobile:
- **DAL functions:** `approveDraftAsCanonicalAnswer()` — same function regardless of surface
- **Types:** Extended `AnswerlatticeMutationProposal` type — shared
- **Feature flags:** `ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE` — shared
- **Signal emitter:** `emitAnswerlatticeSignal()` — already works on mobile (signals generated from mobile chat/feedback feed into this pipeline)

Mobile users **contribute signals** (via chat feedback, tickets) that feed into the automatic knowledge creation pipeline. The mobile surface is a signal source, not a governance surface.

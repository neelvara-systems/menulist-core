# Founder Trust Layer — Mobile Support Assessment

> **Version:** 1.0.0
> **Created:** 2026-03-09

---

## §1 — Feature Admission Test (4 Gates)

| Gate | Question | Answer | Pass? |
|------|----------|--------|-------|
| **Frequency** | Daily/multiple times per day? | ❌ Weekly at most — founders check trust occasionally | ❌ FAIL |
| **Speed** | Completes in <5 seconds? | ✅ Single read, instant display | ✅ PASS |
| **Touch** | Works with thumb-only? | ✅ Read-only cards, no complex interaction | ✅ PASS |
| **Value** | Needed away from desk? | ❌ Governance review happens at desk | ❌ FAIL |

**Result:** 2/4 gates pass → **DESKTOP ONLY for v1**

---

## §2 — Rationale

The Trust Dashboard is a governance tool used by SaaS founders during deliberate review sessions. It is not an operational screen that founders check on the go. The metrics update nightly and require thoughtful analysis — not quick mobile glances.

If trust metrics were degrading critically, the existing integration events system (Slack/Email notifications via Expansion Item #7) would alert the founder on mobile. The dashboard itself does not need a mobile surface.

---

## §3 — Future Consideration

If mobile demand appears (tracked via analytics), a simplified mobile view could show:
- 4 metric cards in a 2×2 grid
- Top 3 failing entities (instead of 5)
- No escalation breakdown (too detailed for mobile)

This would be a read-only antd-mobile card layout using the same `getTrustMetrics()` DAL function.

---

## §4 — Mobile Notification Path (Already Covered)

When `ENABLE_CANONICA_WORKFLOW_INTEGRATIONS` is enabled, critical trust events (coverage drop, drift spike) can be pushed to Slack/Email — which founders already check on mobile. This provides mobile awareness without building a dedicated mobile screen.

# Ticket → Knowledge Loop — Mobile Support Assessment

> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-03-09
> **Audience:** Engineering
> **Feature Flag:** `ENABLE_CANONICA_TICKET_KNOWLEDGE`

---

## Feature Admission Test (4 Gates)

| Gate | Question | Answer | Pass? |
|------|----------|--------|-------|
| **Frequency** | Used daily/multiple times per day? | No — knowledge proposals arrive nightly, reviewed occasionally | ❌ |
| **Speed** | Completes in <5 seconds? | No — reviewing knowledge drafts requires reading + editing | ❌ |
| **Touch** | Works with thumb-only? | No — editing draft content requires keyboard input | ❌ |
| **Value** | Needed away from desk? | No — knowledge governance is a desktop workflow | ❌ |

**Result: 0/4 gates pass → NO MOBILE UI**

---

## Rationale

The Ticket → Knowledge Loop is a **backend pipeline + governance review workflow**:

1. **Signal emission** happens automatically (no UI interaction needed)
2. **Nightly extraction** runs as a Cloud Function (no UI)
3. **Founder review** happens in the Governance Dashboard — a desktop workflow that requires:
   - Reading full draft content
   - Editing structured summaries and explanations
   - Comparing against source tickets
   - Reviewing entity bindings

This is inherently a **desktop governance task**, not a mobile operational task.

---

## Mobile Touchpoints (Inherited from Existing Features)

| Touchpoint | Mobile Status | Notes |
|------------|--------------|-------|
| Ticket creation | ✅ Mobile shell exists | Not affected by this feature |
| Ticket resolution | ✅ Possible on mobile | Signal emission fires automatically regardless of device |
| Knowledge review | ❌ Desktop only | Governance dashboard is desktop-only |
| Approval action | ❌ Desktop only | One-click approve is in governance UI |

---

## Future Consideration

If mobile governance UI is built (Item #10 — Trust Metrics), knowledge proposal review could be added as a mobile notification + quick approve/reject. But this is not in scope for v1.

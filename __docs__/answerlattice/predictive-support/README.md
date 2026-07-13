# Answerlattice — Predictive Support System

> **Status:** ✅ IMPLEMENTED — Enabled with guards
> **Version:** 1.1.2
> **Created:** 2026-03-10
> **Last Updated:** 2026-07-06
> **Feature Flag:** `ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT` (enabled)
> **Expansion Item:** #12 (answerlattice-expansion-tracker.md)
> **Dependencies:** #1 Context-Aware (DONE), #5 Friction Intelligence (DONE), #11 Knowledge Graph (DONE)

---

## Identity

Predictive Support is the **proactive help layer** for Answerlattice. Instead of waiting for users to ask questions, the system detects where the user is in the product, evaluates friction patterns for that location, and surfaces contextual help *before* confusion turns into a support ticket.

**Core principle:** Prevent support tickets, don't just answer them faster.

---

## Architecture Summary

```
Widget browser contract (path/feature/workflow context)
        │
        ▼
Predictive Help API (/api/answerlattice/predictive-help)
        │
        ├─ Load trigger rules (cached in platformSummary)
        ├─ Evaluate conditions against context
        ├─ Check cooldown (Upstash Redis)
        ├─ Use pre-resolved suggestion snippets from summary
        ├─ Fallback canonical-answer read only for stale summary docs
        │
        ▼
Suggestion Payload → Widget renders contextual help
```

**Key design choice:** Reuses existing Answerlattice infrastructure (context payload, friction stats, entity index, canonical answers, Upstash Redis). Only **1 new collection** + **1 platformSummary doc** + **1 API route** + **1 lib module** needed.

Nightly predictive trigger sync diagnostics use fixed failure codes with source error name/code/status metadata and tenant/store scope booleans. Auto-generation, summary rebuild, and effectiveness failures do not log raw exception text or raw tenant/store identifiers.

Answerlattice App Predictive Trigger ID Boundary: owner/admin trigger actions normalize trigger document IDs through the shared Firestore document-ID guard before app-side get, update, activate, disable, delete, and audit-log writes. Malformed, reserved, empty, or path-shaped trigger IDs fail through the existing fixed action copy before Firestore document access.

---

## Document Index

| Document | Audience | Purpose |
|----------|----------|---------|
| [predictive-support_spec.md](./predictive-support_spec.md) | CEO/PM | Business requirements, user flows, strategic value |
| [predictive-support_impl.md](./predictive-support_impl.md) | Developers | Technical blueprint, data model, file structure, ADRs |
| [predictive-support_firebase.md](./predictive-support_firebase.md) | DevOps/Cost | Firestore operations, cost estimates, indexes |
| [predictive-support_marketing.md](./predictive-support_marketing.md) | Sales/Marketing | Pitch angles, competitive positioning |
| [predictive-support_website.md](./predictive-support_website.md) | Content | Landing page content, SEO meta |
| [predictive-support_helpdoc.md](./predictive-support_helpdoc.md) | Customers | Help documentation for SaaS founders using Answerlattice |
| [predictive-support_mobile-support.md](./predictive-support_mobile-support.md) | Mobile | Mobile admission test + support assessment |
| [_archive/chatgpt-review.md](./_archive/chatgpt-review.md) | Internal | ChatGPT conversation review + accuracy assessment |

---

## Key Decisions (Locked)

1. **Rule-based triggers only** — No ML, no behavior scoring, no predictive models. Deterministic.
2. **Reuse existing infrastructure** — AnswerlatticeContextPayload, friction stats, entity index, Upstash Redis, nightly batch.
3. **1 new collection** — `answerlattice_predictiveTriggers` (trigger rules). Everything else uses existing infra.
4. **Widget-initiated only after capability gate** — The widget calls predictive API only when runtime config confirms active triggers. Server evaluates rules. No event streaming.
5. **Non-blocking UI** — Context card pattern. Never blocks user workflow. Dismissible.
6. **Nightly auto-suggestions** — Friction patterns auto-generate trigger rule suggestions (founder approves).
7. **Fire-and-forget signals** — Suggestion interactions (shown/clicked/dismissed) logged to existing signal events.
8. **Feature-flagged and enabled with guards** — `ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT` is active with API-key scope, origin checks, rate limits, Redis cooldowns, and fail-closed behavior when cooldown storage is unavailable.
9. **Summary-backed runtime** — Nightly stores resolved suggestion snippets and source hashes so runtime calls usually avoid canonical-answer reads and cache writes are skipped when unchanged.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-11 | 1.1.3 | Added exact product/workspace mutation and allowlisted public-summary/runtime parsing boundaries. |
| 2026-07-06 | 1.1.2 | Added app-side predictive trigger document-ID boundary for CRUD/action refs and audit IDs. |
| 2026-06-28 | 1.1.1 | Bounded nightly predictive trigger sync diagnostics with fixed failure codes and source metadata. |
| 2026-05-24 | 1.1.0 | Added capability gating, summary-backed resolved suggestions, targeted answer lookup, unchanged-write skip, and Redis fail-closed notes. |
| 2026-03-10 | 1.0.0 | Initial predictive support documentation. |

---

## ChatGPT Accuracy Assessment

**Overall: ~55%**

| Category | Accuracy | Notes |
|----------|----------|-------|
| Core concept (rule-based proactive help) | 90% | Valid and correct |
| Architecture (Pub/Sub + Cloud Run) | 20% | Massive over-engineering for Answerlattice's scale |
| Data model (4 new collections) | 30% | Only 1 needed; rest exists or is unnecessary |
| Cost analysis | 40% | Correct concern but wrong solution (event streaming vs API call) |
| UI patterns (3 types) | 85% | Good constraint, adopted |
| Learning loop | 70% | Concept correct, implementation too heavy |

---

## Relationship to Other Expansion Items

- **Depends on #1** (Context-Aware) — AnswerlatticeContextPayload provides page/feature/workflow. ✅ DONE
- **Depends on #5** (Friction Intelligence) — Friction patterns feed auto-trigger generation. ✅ DONE  
- **Benefits from #11** (Knowledge Graph) — Entity relations expand trigger coverage. ✅ DONE
- **Benefits from #8** (AI Escalation) — Failed predictions can escalate with context.
- **Benefits from #10** (Trust Metrics) — Prediction effectiveness feeds trust dashboard.

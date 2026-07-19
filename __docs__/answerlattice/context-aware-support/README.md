# Answerlattice — Context-Aware Support

> **Status:** IMPLEMENTED
> **Version:** 1.3.0
> **Created:** 2026-03-08
> **Last Updated:** 2026-07-18
> **Feature Flag:** `ENABLE_ANSWERLATTICE_CONTEXT_AWARE`
> **Expansion Tracker:** Item #1 (Phase A — Foundation)
> **Doctrine Check:** ✅ Allowed — improves deterministic retrieval performance (Non-Goals §VII)

---

## What This Feature Does

Transforms Answerlattice's retrieval from **query-only** matching to **product-state-aware** reasoning by accepting structured context from the client product alongside the user's query.

Runtime note: Help Center surfaces pass context directly through Answerlattice-owned React state. External product widgets pass it through the v1 browser contract, `AnswerlatticeWidget.setContext()` / `page()`, or mount-time script attributes such as `data-path`, `data-page`, `data-workflow`, `data-state`, and `data-version`. Context remains transient, sanitized, and capped at 2KB; raw route paths are used only to resolve an approved Product Surface and are not copied into compact page identifiers or stored as widget search metadata.

Canonical scope note: page, feature, workflow, and entity hints improve deterministic entity matching. Plan, role, and product state are different: when a canonical answer restricts one of those dimensions, the matching runtime value is required and must be allowed. Missing or mismatched scope returns a fixed governed fallback before FAQ or RAG.

**Before:**
```
query → entity match → canonical answer
```

**After:**
```
query + product_context → context-boosted entity match → canonical answer
```

---

## Why This Feature Matters

1. **Accuracy** — Context reduces entity resolution ambiguity. "Why is this failing?" on the Stripe page → Stripe troubleshooting, not generic docs.
2. **Canonical Coverage** — Better entity matching means more queries resolve via canonical answers instead of RAG fallback.
3. **Foundation** — This is a prerequisite for 6 other expansion items (#2, #3, #7, #8, #11, #12).

---

## Architecture Decision (Key)

ChatGPT proposed **8 separate systems** (Entity Hint Resolver, Entity Scoring Engine, Context Prioritization Logic, Page/Feature Mapping, Workflow Detection, etc.).

**Answerlattice's actual approach: Surgical enhancement of existing retrieval pipeline.**

Answerlattice already has:
- `RetrievalContext` with `tId`, `sId`, `currentVersion`, `planId`, `roleId`
- `matchEntitiesFromIndex()` with token-based entity scoring
- `scoreBySpecificity()` with version/plan/role matching
- Entity search index with `canonicalName`, `synonyms`, `normalizedTokens`, `weight`

We extend these existing systems. We do NOT build 8 new components.

---

## Documents

| Document | Audience | Purpose |
|----------|----------|---------|
| [context-aware-support_spec.md](./context-aware-support_spec.md) | CEO/PM/Clients | Business requirements, user stories |
| [context-aware-support_impl.md](./context-aware-support_impl.md) | Developers | Technical blueprint, data model, file changes |
| [context-aware-support_firebase.md](./context-aware-support_firebase.md) | Developers | Firebase cost analysis |
| [context-aware-support_marketing.md](./context-aware-support_marketing.md) | Sales/Marketing | Positioning, pitch points |
| [context-aware-support_website.md](./context-aware-support_website.md) | Website | Landing page content |
| [context-aware-support_helpdoc.md](./context-aware-support_helpdoc.md) | Customers | Widget context integration guide |
| [context-aware-support_mobile-support.md](./context-aware-support_mobile-support.md) | Engineering | Mobile assessment |
| [_archive/chatgpt-review.md](./_archive/chatgpt-review.md) | Internal | ChatGPT conversation analysis |

---

## Key Files (Implementation Target)

| File | Change Type | Purpose |
|------|-------------|---------|
| `src/types/answerlattice/index.ts` | MODIFY | Add `AnswerlatticeContextPayload` interface |
| `src/lib/answerlattice/canonicalRetrieval.ts` | MODIFY | Extend `RetrievalContext`, add context-boosted scoring |
| `src/app/api/widget/search/route.ts` | MODIFY | Accept + validate context payload |
| `src/app/api/helpCenter/search-kb/route.ts` | MODIFY | Accept + pass context to canonical retrieval |
| `src/lib/validation/contextSchema.ts` | CREATE | Zod validation for context payload |
| `src/config/features.ts` | MODIFY | Add `ENABLE_ANSWERLATTICE_CONTEXT_AWARE` flag |

---

## Dependencies

- **Depends on:** Nothing (no prerequisites)
- **Unlocks:** guided workflows, caching, controlled escalation review, and page-aware support content.

---

## Firebase Cost Impact

**ZERO additional Firestore reads/writes.** Context processing is entirely in-memory. Context fields enhance existing entity matching within the same read operations. Potential REDUCTION in reads because better entity matching = fewer RAG fallbacks (each RAG fallback costs ~8 Firestore reads + 1 embedding API call).

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-18 | 1.3.0 | Added exact/wildcard Product Surface route matching, web SDK/loader/iframe parity for state and numeric version context, transient route-path handling, and canonical version applicability. |
| 2026-07-11 | 1.2.0 | Made plan, role, and product state strict canonical eligibility constraints with governed fallback behavior. |
| 2026-05-18 | 1.1.0 | Marked implemented and documented current browser/mount-time widget context flow, transient storage boundary, and 2KB payload cap |
| 2026-03-08 | 1.0.0 | Initial documentation from ChatGPT conversation + Cascade codebase audit + external research |

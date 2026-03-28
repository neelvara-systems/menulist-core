# Context-Aware Support — ChatGPT Conversation Review

> **Status:** REVIEWED
> **Version:** 1.0.0
> **Created:** 2026-03-08
> **Last Updated:** 2026-03-08
> **Source:** ChatGPT ICP gap analysis conversation (System #1 — Context Intelligence Layer)
> **Audience:** Internal reference

---

## §1 — Conversation Summary

ChatGPT discussed "Context Intelligence Layer" as System #1 of 12 identified ICP gaps. The conversation covered 8 sub-components in depth:

1. Context Payload Schema
2. Client Context Collection (SDK vs Inference)
3. Entity Hint Resolver
4. Entity Scoring & Ranking Engine
5. Context Prioritization Logic
6. Page / Feature Mapping System
7. Workflow Detection & State Tracking
8. Context Validation & Sanitization Layer

---

## §2 — ChatGPT Accuracy Assessment: ~60%

### What ChatGPT Got RIGHT

| Claim | Verdict | Notes |
|-------|---------|-------|
| Context payload with feature/page/workflow/entityHints/plan/role | ✅ ACCEPTED | Valid schema design. Adopted with minor adjustments. |
| SDK-first with inference fallback | ✅ PARTIALLY ACCEPTED | SDK-first accepted. Inference fallback REJECTED for v1 (unnecessary complexity). |
| Context is transient (never stored in Firestore) | ✅ ACCEPTED | Critical for Firebase cost optimization. |
| Versioned context schema (contextVersion field) | ✅ ACCEPTED | Good practice for backwards compatibility. |
| Context boosts entity resolution accuracy | ✅ ACCEPTED | Core value proposition validated by codebase audit. |
| Context should be treated as untrusted input | ✅ ACCEPTED | Standard security practice. Implemented via Zod validation. |
| Context payload size <2KB | ✅ ACCEPTED | Reasonable constraint for widget performance. |
| Context enables future systems (predictive support, friction detection) | ✅ ACCEPTED | Confirmed by expansion tracker dependencies. |

### What ChatGPT Got WRONG or OVERSTATED

| Claim | Verdict | Notes |
|-------|---------|-------|
| "Critical Missing Layer" | ❌ OVERSTATED | RetrievalContext already has plan/role/version context. Partial context exists. |
| 8 separate components needed | ❌ REJECTED | Canonica's existing retrieval pipeline needs enhancement, not 8 new systems. |
| Entity Hint Resolver as separate service | ❌ REJECTED | Existing `matchEntitiesFromIndex()` handles this with context boosts added. |
| Entity Scoring Engine as separate service | ❌ REJECTED | Existing scoring in `matchEntitiesFromIndex()` + `scoreBySpecificity()` is sufficient. Enhanced with context boost weights. |
| Context Prioritization Logic as separate module | ❌ REJECTED | Built into the additive scoring model. Context boosts are high-weight additions to the existing score pipeline. |
| Page/Feature Mapping System | ❌ REJECTED | Client sends stable identifiers. Canonica doesn't need internal mapping tables. Context strings are tokenized against entity search index (same as query tokens). |
| Workflow Detection as separate system | ❌ REJECTED | Client sends workflow field via SDK. No server-side detection needed. |
| In-memory entity dictionary loaded at server startup | ❌ REJECTED for now | Firestore reads for search index are already bounded (1 read per query). Server-startup caching adds complexity without meaningful benefit at current scale. Can revisit under Item #3 (Instant Caching). |
| URL inference as fallback | ❌ REJECTED for v1 | SPAs make URL inference unreliable. Adds complexity with marginal benefit for developer-ICP. |
| DOM scanning | ❌ REJECTED permanently | Security risk. Fragile. Not aligned with infrastructure positioning. |
| "0 Firestore reads for resolution" (via in-memory cache) | ❌ NOT NEEDED | Entity search index is already 1 Firestore read. The overhead is minimal. Caching is Item #3's responsibility. |
| Workflow stage persistence | ❌ REJECTED | Context is per-request. No session persistence needed. |
| Multi-step workflow model with stages | ❌ DEFERRED | Too complex for v1. Client can send `workflow` field with stage info if desired. |

### What ChatGPT MISSED Entirely

| Gap | Notes |
|-----|-------|
| Existing `RetrievalContext` interface | ChatGPT was unaware that plan/role/version context already exists |
| Existing `matchEntitiesFromIndex()` scoring | ChatGPT proposed new scoring engine, unaware existing one works well |
| Existing `scoreBySpecificity()` with plan/role matching | Already handles plan and role bonus scoring |
| Entity search index with synonyms + normalized tokens | Already provides the "entity dictionary" ChatGPT wanted to build |
| Intent classification already exists | Rule-based intent patterns already narrow retrieval context |
| Zod validation patterns already used | Existing validation infrastructure can be extended, not rebuilt |

---

## §3 — Decision Matrix

| ChatGPT Component | Canonica Decision | Rationale |
|-------------------|-------------------|-----------|
| Context Payload Schema | **ADOPT** (with Canonica types) | Valid design. Add as `CanonicaContextPayload` interface. |
| SDK Context Collection | **ADOPT** (SDK-only in v1) | No inference fallback needed for developer ICP. |
| Entity Hint Resolver | **MERGE** into existing `matchEntitiesFromIndex()` | Not a separate service. Context tokens matched against same search index. |
| Entity Scoring Engine | **MERGE** into existing scoring pipeline | Add context boosts as additive scores in existing function. |
| Context Prioritization | **MERGE** into additive scoring model | High context weights naturally prioritize context over vague query tokens. |
| Page/Feature Mapping | **REJECT** | Client sends stable IDs. Canonica tokenizes them against search index. No mapping tables needed. |
| Workflow Detection | **SIMPLIFY** to SDK field only | Client sends `workflow` field. No server-side detection. |
| Context Validation | **ADOPT** (via Zod extension) | New schema file using existing Zod patterns. |

---

## §4 — Key Architectural Disagreements

### ChatGPT: "8 Separate Components"
**Canonica decision:** 1 enhanced retrieval function + 1 new validation file.

**Why:** Canonica's retrieval pipeline (`canonicalRetrieval.ts`) is already well-structured with clear separation:
- Layer 1: Entity index lookup
- Layer 2: Intent classification
- Specificity scoring
- Version filtering

Adding context is a parameter addition to this pipeline, not an architecture change. Building 8 new components would:
- Violate 3-year freeze (unnecessary structural complexity)
- Create maintenance burden
- Add indirection without value
- Fragment logic that naturally belongs together

### ChatGPT: "Entity dictionary loaded at startup"
**Canonica decision:** Use existing per-request Firestore read.

**Why:** The entity search index read is 1 Firestore query per retrieval attempt. At Canonica's expected scale (<100K queries/day in first year), this is:
- ~100K reads/day = ~₹10/day
- Fast enough (<50ms)
- Simple and stateless

An in-memory cache would require:
- Cache invalidation on entity changes
- Memory management
- Startup loading logic
- Cache staleness risk

This optimization belongs to Item #3 (Instant Answer Caching) if ever needed.

### ChatGPT: "URL inference fallback"
**Canonica decision:** SDK-only. No inference.

**Why:** Canonica targets SaaS developers (ICP). They can integrate an SDK (15-30 min). URL inference:
- Fails in SPAs (same URL, different views)
- Breaks on product redesigns
- Cannot detect workflow state
- Adds unreliable data that may hurt retrieval accuracy

---

## §5 — External Research Validation

### Industry Patterns Confirmed

| Pattern | Source | Alignment |
|---------|--------|-----------|
| SDK-first context collection | Stripe, Segment, Sentry | ✅ Canonica follows same pattern |
| Context as request metadata (not stored) | OpenAI Agents SDK, Google context framework | ✅ Canonica design matches |
| Deterministic entity resolution with context | Enterprise RAG best practices (2025) | ✅ Canonica's rule-based approach is more reliable than ML-only |
| Zendesk `updatePath` + `identify` commands | Zendesk Widget API | ✅ Similar concept — widget accepts runtime context from host app |
| Intercom Fin uses conversation context + customer attributes | Intercom Fin AI Engine | ✅ Canonica goes further with product ontology binding |

### Industry Patterns Rejected

| Pattern | Source | Why Rejected |
|---------|--------|-------------|
| DOM scanning for context | Various chatbot tools | Security risk, fragile, not infrastructure-grade |
| ML-based context inference | Generic RAG systems | Canonica is deterministic-first. ML is fallback only. |
| Full product state dump | Over-engineered enterprise solutions | Canonica only needs product state, not user analytics |

---

## §6 — Implementation Impact Assessment

| Dimension | ChatGPT Estimate | Canonica Reality |
|-----------|-----------------|-----------------|
| New files | ~15-20 | **1** (contextSchema.ts) |
| Modified files | ~10 | **5** (types, retrieval, widget route, search-kb route, features.ts) |
| New Firestore collections | 0 | **0** ✅ |
| Additional Firestore reads/writes | 0 | **0** ✅ |
| Implementation complexity | High (8 components) | **Low-Medium** (extend existing pipeline) |
| Estimated implementation time | 3-5 days | **1-2 days** |
| Risk to existing functionality | Medium (many new components) | **Very Low** (additive scoring, feature-flagged) |

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-08 | 1.0.0 | Initial ChatGPT review |

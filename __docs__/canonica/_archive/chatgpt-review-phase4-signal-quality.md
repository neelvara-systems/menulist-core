# ChatGPT Review — Canonica Phase 4 (Signal Quality + White-Label + Multi-Language)

> **Date:** 2026-03-07
> **Source:** ChatGPT analysis of Phase 4 implementation cascade messages
> **Reviewer:** Cascade (codebase-validated)
> **Accuracy:** ~75% — ChatGPT missed several existing safeguards but identified 2 genuine infrastructure gaps

---

## Verdict Summary

| # | ChatGPT Claim | Cascade Verdict | Action |
|---|--------------|----------------|--------|
| General | "Architecture fundamentally correct" | **AGREE** | No action |
| General | "8.5/10 system score" | **PARTIAL** — 7.5/10 more honest (untested with real traffic) | No action |
| §5 | Distribution decisions correct | **AGREE** | No action |
| §6 | Governance loop is the moat | **AGREE** | No action |
| §7 | Cost architecture well controlled | **AGREE** | No action |
| §8 | Position as Support Knowledge Infrastructure | **AGREE** — already in doctrine | No action |
| §10 | Don't build analytics dashboards, graph viz | **AGREE** — already in non-goals | No action |
| **Risk #1** | Ontology Bootstrap Fragility | **PARTIAL AGREE** — authority guard was missing in code | **IMPLEMENTED** |
| **Risk #2** | Retrieval Failure Mode | **AGREE** — entity match confidence threshold was missing | **IMPLEMENTED** |
| **Risk #3** | Signal Quality Collapse | **PARTIAL AGREE** — existing resolution is adequate for current scale | **DEFERRED** |

---

## Risk #1: Ontology Bootstrap Fragility

### ChatGPT Said
Entity lifecycle needs `candidate → provisional → canonical → deprecated` with authority rules.

### Codebase Truth
- Candidate statuses already exist: `pending`, `approved`, `rejected`, `merged`
- Entity statuses already exist: `active`, `deprecated`, `beta` (beta = provisional)
- Extraction prompt already requires "≥3 articles OR ≥5 ticket/chat mentions"
- Validation already rejects UI labels, generic nouns (96-118 in entityExtraction.ts)

### What ChatGPT Missed
- Entity `beta` status serves as "provisional"
- Extraction prompt had rules but they were AI-enforced only, not code-enforced

### What Was Valid
- `frequency` field on candidates was hardcoded to `{ articles: 1, tickets: 0, chat: 0 }` on extraction — never enriched
- No code-level guard prevented promoting low-authority candidates

### Fix Applied
Added `ONTOLOGY_AUTHORITY_RULES` guard to `promoteCandidate()` in `entityCandidates.ts`:
- Requires `confidence ≥ 0.5` AND (`articles ≥ 2` OR `signals ≥ 3`)
- Throws descriptive error if threshold not met
- Admin can still manually adjust frequency data to override

---

## Risk #2: Retrieval Failure Mode

### ChatGPT Said
Wrong entity match → confidently wrong canonical answer. Worse than RAG hallucination. Need confidence threshold to bypass canonical.

### Codebase Truth
- `canonicalRetrieval.ts:332-336` computed confidence but NEVER used it to skip canonical
- A "medium" confidence match still returned canonical answer
- No minimum threshold existed

### What Was Valid
This was a **genuine infrastructure gap**. Low-confidence entity matches could return deterministic answers that are wrong.

### Fix Applied
Added `ENTITY_MATCH_MIN_SCORE = 2.0` threshold to `canonicalRetrieval.ts`:
- If best entity match score < 2.0 → returns `found: false` with `fallbackReason: entity_match_below_threshold`
- RAG takes over for weak matches
- Logged with actual score for debugging

---

## Risk #3: Signal Quality Collapse

### ChatGPT Said
Signals like "not working", "error", "help" have low semantic value. Need intent normalization before clustering.

### Codebase Truth
- Signal emitter stores `entityId: 'unresolved'` by default
- Nightly scheduler resolves via search index matching (text extraction + tokenization + scoring)
- This IS a form of normalization already

### What Was Valid
No explicit intent normalization step. Similar queries would match differently. Would matter at scale (100+ signals/day).

### Decision
**DEFERRED** — Current resolution is adequate for pre-activation state. Added to backlog for when signal volume warrants it.

---

## ChatGPT Accuracy: ~75%

- ~85% of strategic assessment was correct (architecture, positioning, governance loop, cost)
- ~65% of "missing" items were already partially built (entity lifecycle, authority prompt rules, confidence computation)
- 2 genuine gaps found (entity match threshold, ontology authority code guard)
- 1 valid optimization deferred (signal normalization)

---

## Files Modified

| File | Change |
|------|--------|
| `src/lib/canonica/canonicalRetrieval.ts` | Added `ENTITY_MATCH_MIN_SCORE` threshold — bypasses canonical when entity match too weak |
| `src/database/canonica/entityCandidates.ts` | Added `ONTOLOGY_AUTHORITY_RULES` guard to `promoteCandidate()` |

---

## Version History

| Date | Change |
|------|--------|
| 2026-03-07 | Initial ChatGPT review of Phase 4 implementation |

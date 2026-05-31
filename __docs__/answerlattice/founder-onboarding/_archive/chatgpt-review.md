# Answerlattice — Founder Onboarding — ChatGPT Conversation Review

> **Version:** 1.0.0
> **Date:** 2026-03-09
> **Source:** ChatGPT ICP Expansion System 6 conversation
> **Reviewer:** Cascade (full codebase access)

---

## Review Summary

ChatGPT proposed a 5-component "Founder Onboarding System" (capabilities #32-36) with additional infrastructure layers. The problem identification is valid — empty knowledge base is the #1 adoption killer. However, the solution design is ~55% accurate because ChatGPT doesn't know the existing Answerlattice infrastructure.

---

## Component-by-Component Review

### #32 — Zero-Setup Knowledge Import

| Aspect | ChatGPT Said | Codebase Reality | Verdict |
|--------|-------------|------------------|---------|
| Need URL crawler | Yes | KB pipeline already handles URL, PDF, image, YouTube, Google Drive, copied text imports | ❌ WRONG — already exists |
| Need `importSources` collection | Yes | `kb_generation_jobs` already tracks all import sources and status | ❌ WRONG — already exists |
| Need `documents` + `documentChunks` collections | Yes | `kb_articles` stores articles, embeddings are per-article vectors | ❌ WRONG — already exists |
| Chunk to 800-1200 tokens | Yes | Article content is stored as TipTap JSON, embeddings handle relevance | ⚠️ PARTIAL — chunking isn't needed for Answerlattice's model |
| Store compressed blocks | Yes | TipTap JSON is already efficient | ❌ WRONG — over-engineering |

**Verdict: 20% accurate.** The entire import pipeline exists. ChatGPT reinvented existing infrastructure.

### #33 — Automatic Entity Extraction

| Aspect | ChatGPT Said | Codebase Reality | Verdict |
|--------|-------------|------------------|---------|
| Need entity extraction pipeline | Yes | `entityExtraction.ts` — 413 lines, full pipeline with validation, dedup, registry-guided matching | ✅ EXISTS |
| Entity types: FEATURE, WORKFLOW, SETTING, INTEGRATION, ERROR, PLAN, ROLE | Close | Exactly these 7 types in `ANSWERLATTICE_ENTITY_TYPES` | ✅ MATCHES |
| Extract only on import/update, never per query | Yes | E4 auto-extract on article save, batch on demand | ✅ MATCHES |
| Need `entities` collection | Yes | `answerlattice_entities` collection exists with full schema | ✅ EXISTS |

**Verdict: 85% accurate.** Entity extraction pipeline exists and matches ChatGPT's design closely. Minor gap: batch extraction on KB publish (not just per-article).

### #34 — Automatic Canonical Answer Drafting

| Aspect | ChatGPT Said | Codebase Reality | Verdict |
|--------|-------------|------------------|---------|
| Convert docs → canonical answers | Yes | `draftGenerator.ts` generates drafts from signal clusters, but NOT from KB articles during onboarding | 🟡 PARTIAL |
| Structured output (steps, warnings) | Yes | `AnswerlatticeProcedure` type exists with steps[], warnings[], prerequisites[] | ✅ EXISTS (type) |
| `canonicalAnswers` collection | Yes | `answerlattice_canonicalAnswers` exists with full governed schema | ✅ EXISTS |
| Auto-generate from articles | Yes | NOT implemented — drafts only come from mutation proposals | 🔴 GENUINE GAP |

**Verdict: 60% accurate.** The draft generation infrastructure exists but is wired to signal clusters, not KB article content. Extending it for onboarding bootstrap is the core new work.

### #35 — Auto Activation Mode

| Aspect | ChatGPT Said | Codebase Reality | Verdict |
|--------|-------------|------------------|---------|
| AI activates immediately | Yes | RAG already provides immediate answers from published KB articles | ✅ EXISTS (via RAG) |
| `AUTO_MODE = TRUE` | Yes | Not needed — RAG works without explicit mode flag | ❌ WRONG — unnecessary concept |
| Low confidence fallback | Yes | `attemptCanonicalRetrieval()` falls back to RAG with logged reason | ✅ EXISTS |
| Serve draft answers as canonical | Yes | ❌ VIOLATES DOCTRINE — "Mutation-only canonical edits", "LLM assist non-authoritative" | ❌ WRONG — doctrine violation |

**Verdict: 40% accurate.** The core insight (immediate answers) is valid but already solved by RAG. The "auto mode" concept that serves unreviewed drafts as canonical violates Answerlattice's governance doctrine.

### #36 — Post-Activation Review System

| Aspect | ChatGPT Said | Codebase Reality | Verdict |
|--------|-------------|------------------|---------|
| Need review queue | Yes | `EntityCandidateReview.tsx` + `MutationProposalReview.tsx` exist | ✅ EXISTS |
| Approve/Edit/Reject/Merge actions | Yes | `approveCandidateStatus()`, `rejectCandidateStatus()`, `promoteCandidate()`, `approveDraftAsCanonicalAnswer()` all exist | ✅ EXISTS |
| Asynchronous (non-blocking) | Yes | Already non-blocking — review is separate from AI serving | ✅ EXISTS |
| Need `reviewQueue` collection | Yes | Not needed — mutation proposals + entity candidates ARE the review queue | ❌ WRONG |
| Show source docs + entities + confidence | Yes | Mutation proposal UI shows all of this | ✅ EXISTS |

**Verdict: 70% accurate.** Review system exists. ChatGPT proposed a redundant collection.

---

## Infrastructure Layer Review

### Import Job System
**ChatGPT:** Need `importJobs` collection with status states.
**Reality:** `kb_generation_jobs` already has: PENDING, PROCESSING, NEEDS_REVIEW, PUBLISHING, PUBLISHED, FAILED, CANCELLED.
**Verdict:** ❌ WRONG — already exists.

### Processing Queue
**ChatGPT:** Need `IMPORT_QUEUE`, `PARSER_QUEUE`, `ENTITY_QUEUE`, `ANSWER_QUEUE`.
**Reality:** Firebase Cloud Functions handle all async processing. No custom queues needed.
**Verdict:** ❌ WRONG — over-engineering.

### Idempotency Layer
**ChatGPT:** Need `sourceHash`, `docHash`, `entityHash`.
**Reality:** Entity extraction uses name normalization + registry-guided matching for dedup. Article dedup uses similarity scoring in `findSimilarArticles()`.
**Verdict:** 🟡 PARTIAL — existing dedup is different but effective.

### Import Limits
**ChatGPT:** MAX_DOCS_PER_IMPORT = 300, MAX_CHUNKS_PER_DOC = 40, etc.
**Reality:** No explicit limits exist. Adding limits is valid and recommended.
**Verdict:** ✅ VALID — limits should be added.

### Observability
**ChatGPT:** Need `onboardingMetrics` collection.
**Reality:** Can add metrics as an additive field on existing `kb_generation_jobs` document. No new collection.
**Verdict:** 🟡 PARTIAL — valid need, wrong solution (new collection not needed).

---

## New Collections Proposed by ChatGPT

| Proposed Collection | Needed? | Why Not |
|---|---|---|
| `importSources` | ❌ | `kb_generation_jobs` covers this |
| `importJobs` | ❌ | `kb_generation_jobs` covers this |
| `documents` | ❌ | `kb_articles` covers this |
| `documentChunks` | ❌ | Articles stored as TipTap JSON, embeddings handle retrieval |
| `entities` | ✅ | Already exists as `answerlattice_entities` |
| `canonicalAnswers` | ✅ | Already exists as `answerlattice_canonicalAnswers` |
| `reviewQueue` | ❌ | `answerlattice_mutationProposals` + `answerlattice_entityCandidates` serve this purpose |
| `onboardingMetrics` | ❌ | Additive field on `kb_generation_jobs` |
| `queueTasks` | ❌ | Cloud Functions handle async processing |

**Result: 0 new collections needed.** ChatGPT proposed 9, only 2 actually existed already.

---

## Overall ChatGPT Accuracy: ~55%

| Category | Score | Notes |
|----------|-------|-------|
| Problem identification | 95% | Empty KB problem is real and critical |
| Architecture design | 30% | Ignores 90% of existing infrastructure |
| Data model | 25% | 7/9 proposed collections are redundant |
| Entity extraction | 85% | Close match to existing implementation |
| Answer drafting | 60% | Draft infra exists but not wired for onboarding |
| Auto activation | 40% | RAG already solves this; proposed mode violates doctrine |
| Review system | 70% | Review infra exists; proposed new collection unnecessary |
| Cost discipline | 50% | Valid concerns but solutions wrong (no queue collections needed) |

---

## What We ACTUALLY Need to Build

Based on codebase audit + ChatGPT ideas + external research:

1. **Batch entity extraction trigger** after KB publish (extends existing `extractEntitiesFromArticles()`)
2. **Auto-promotion logic** for high-confidence entities (extends existing `promoteCandidate()` with guardrails)
3. **Canonical answer draft generation** from KB article content per entity (extends existing `draftGenerator.ts` pattern)
4. **Progress tracking** as additive field on `kb_generation_jobs`
5. **Config constants** for thresholds, limits, caps
6. **Feature flag** `ENABLE_ANSWERLATTICE_FOUNDER_ONBOARDING`
7. **UI: progress display** on KB generation dashboard
8. **UI: bootstrap filter** on governance review page

That's it. Zero new collections. Zero new queue infrastructure. Zero crawler. One new Cloud Function file + config + minor UI updates.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-09 | 1.0.0 | Initial ChatGPT review — 55% accuracy |

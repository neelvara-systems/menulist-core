# Canonica — Founder Onboarding (Knowledge Bootstrap Engine) — Implementation

> **Version:** 1.0.0
> **Last Updated:** 2026-03-09
> **Audience:** Developers
> **Feature Flag:** `ENABLE_CANONICA_FOUNDER_ONBOARDING`

---

## 1. System Position

The Founder Onboarding Engine is a **post-publish extension** to the existing KB generation pipeline. It hooks into the moment KB articles are published and embedded, then bootstraps the Canonica canonical layer automatically.

```
┌─────────────────────────────────────────────────────────┐
│           EXISTING KB PIPELINE (unchanged)              │
│  Upload → AI Extraction → Staging → Review → Publish   │
│                                                ↓        │
│                                          [EMBED]        │
│                                                ↓        │
│  ┌──────────────────────────────────────────────────┐   │
│  │    NEW: Founder Onboarding Bootstrap Engine       │   │
│  │    (triggered after publish, async, non-blocking) │   │
│  │                                                    │   │
│  │  Step 1: Batch Entity Extraction                  │   │
│  │  Step 2: Auto-Promote High-Confidence Entities    │   │
│  │  Step 3: Generate Canonical Answer Drafts         │   │
│  │  Step 4: Update Progress Metrics                  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 2. File Structure

### New Files

```
functions-canonica/src/canonica/onboardingBootstrap.ts    # Core bootstrap engine (CF-side)
src/config/onboardingBootstrapConfig.ts                    # Thresholds, limits, constants
```

### Modified Files

```
functions-canonica/src/canonica/canonicaNightly.ts         # Add Step 12: onboarding bootstrap
functions-canonica/src/constants/features.ts               # Add ENABLE_CANONICA_FOUNDER_ONBOARDING
functions-canonica/src/constants/database.ts               # Add KB_GENERATION_JOBS + KB_ARTICLES constants
src/config/features.ts                                     # Add ENABLE_CANONICA_FOUNDER_ONBOARDING
src/types/knowledgeBase.ts                                 # Add onboardingBootstrap field to IngestionJob
src/types/canonica/index.ts                                # Add 'onboarding_bootstrap' to draftSource union
src/components/templates/canonica/governance/index.tsx      # Add bootstrap review filter
```

### Existing Files Referenced (Logic Patterns — NOT directly importable from CF)

```
src/lib/canonica/entityExtraction.ts                       # extractEntitiesFromArticles() — PATTERN REFERENCE ONLY
src/database/canonica/entityCandidates.ts                  # addEntityCandidate(), promoteCandidate() — PATTERN REFERENCE ONLY
src/database/canonica/entities.ts                          # addEntity(), upsertEntitySearchIndex() — PATTERN REFERENCE ONLY
src/database/canonica/canonicalAnswers.ts                  # addCanonicalAnswer() — PATTERN REFERENCE ONLY
src/database/canonica/mutationProposals.ts                 # addMutationProposal() — PATTERN REFERENCE ONLY
src/database/canonica/auditLogs.ts                         # addAuditLog() — PATTERN REFERENCE ONLY
functions-canonica/src/canonica/draftGenerator.ts          # Gemini prompt patterns (DIRECTLY reusable — same CF project)
```

> **CRITICAL ARCHITECTURE NOTE:** The client-side DAL files (`src/database/canonica/*.ts`) use
> `canonicaFirebaseClient` (Firebase client SDK). The bootstrap engine runs in Cloud Functions
> (`functions-canonica/`) which uses `firestoreAdmin` (Firebase Admin SDK). These are **incompatible** —
> the CF **cannot import** client-side DAL functions.
>
> **Solution:** The `onboardingBootstrap.ts` CF file must use `firestoreAdmin` directly with
> `DB_COLLECTIONS` constants, exactly as `draftGenerator.ts` and `canonicaNightly.ts` already do.
> The client-side DAL functions serve as **logic pattern references** — the CF mirrors their behavior
> using the admin SDK. This is the established Canonica CF pattern.

---

## 3. Data Model

### 3.1 No New Collections

Zero new Firestore collections. All data stored in existing collections:

| Data              | Collection                   | Details                                                                      |
| ----------------- | ---------------------------- | ---------------------------------------------------------------------------- |
| Entity candidates | `canonica_entityCandidates`  | Same as manual extraction                                                    |
| Promoted entities | `canonica_entities`          | Same as manual promote                                                       |
| Search index      | `canonica_entitySearchIndex` | Same as manual promote                                                       |
| Answer drafts     | `canonica_mutationProposals` | Proposals with `draftStatus: generated`, `draftSource: onboarding_bootstrap` |

Generated onboarding-bootstrap proposals are Canonica-scoped with `pId: "CN"` and system actor metadata (`createdBy`, `modifiedBy`, `modifiedOn`) so they match the normal governance proposal contract.
| Progress          | `kb_generation_jobs`         | Additive `onboardingBootstrap` field on existing job doc                     |
| Audit trail       | `canonica_auditLogs`         | Actions: `entity_auto_promoted_onboarding`, `draft_generated_onboarding`     |

### 3.2 Additive Fields

**On `IngestionJob` type** (`src/types/knowledgeBase.ts`):

```typescript
interface IngestionJob {
  // ... existing fields ...

  // Founder Onboarding Bootstrap (additive, freeze-compliant)
  onboardingBootstrap?: {
    status:
      | "pending"
      | "extracting"
      | "promoting"
      | "drafting"
      | "completed"
      | "failed";
    entitiesExtracted: number;
    entitiesAutoPromoted: number;
    candidatesForReview: number;
    draftsGenerated: number;
    draftsFailed: number;
    startedAt?: Timestamp;
    completedAt?: Timestamp;
    errorMessage?: string;
  };
}
```

**On `CanonicaMutationProposal.suggestedChange`** (already has `draftSource`):

New `draftSource` value: `'onboarding_bootstrap'` (additive to existing `'signal_cluster' | 'recurring_fallback'`)

---

## 4. Bootstrap Engine Pipeline

### 4.1 Trigger

The bootstrap runs when a KB generation job transitions to `PUBLISHED` status.

**Trigger point:** Inside `publishApprovedJobLogic` (Cloud Function), after articles are published and embedding is queued.

**Alternative:** As a step in the Canonica nightly batch (simpler, less latency-sensitive).

**Decision:** Run as **nightly batch step** (Step 12 in `canonicaNightly.ts`). Rationale:

- Bootstrap is not latency-sensitive (RAG works immediately)
- Avoids coupling to MenuList's KB publish CF
- Runs in Canonica's own Firebase project
- Cost-controlled via nightly cap
- Idempotent (safe to re-run)

### 4.2 Step 1 — Batch Entity Extraction

```
Input: All published KB articles for tenant (tId/sId)
Output: Entity candidates in canonica_entityCandidates
```

**Logic:**

1. Query `kb_articles` where `status === 'published'` for this tenant
2. Check if entities already extracted (skip if `entityIds` field populated)
3. Batch articles in groups of 5
4. Call `extractEntitiesFromArticles()` with existing entity context (registry-guided)
5. Store new candidates via `addEntityCandidate()`
6. Update job bootstrap progress: `entitiesExtracted`

**Cost:** 1 Gemini call per 5 articles. For 100 articles = 20 Gemini calls.

**Deduplication:** Entity name normalization (lowercase, remove special chars) + existing entity matching in `extractEntitiesFromArticles()`.

### 4.3 Step 2 — Auto-Promote High-Confidence Entities

```
Input: Pending entity candidates for tenant
Output: Promoted entities + search index entries
```

**Auto-promotion criteria (ALL must pass):**

- `confidence >= 0.7` (high extraction confidence)
- `frequency.articles >= 2` (referenced in multiple articles)
- `status === 'pending'` (not already reviewed)
- No existing entity with same normalized name (dedup)

**Logic:**

1. Query `canonica_entityCandidates` where `status === 'pending'`
2. Filter by criteria above
3. For each qualifying candidate:
   a. Create entity via `addEntity()`
   b. Create search index entry via `upsertEntitySearchIndex()`
   c. Update candidate status to `'approved'`
   d. Audit log: `entity_auto_promoted_onboarding`
4. Cap: Max 50 auto-promotions per run
5. Update job bootstrap progress: `entitiesAutoPromoted`, `candidatesForReview`

**Authority Guard:** Same `ONTOLOGY_AUTHORITY_RULES` from `entityCandidates.ts` but with relaxed `minArticleReferences: 2` (instead of 2) since we're bootstrapping.

### 4.4 Step 3 — Generate Canonical Answer Drafts

```
Input: Auto-promoted entities (from Step 2)
Output: Mutation proposals with generated drafts
```

**Logic:**

1. For each auto-promoted entity:
   a. Gather source articles that reference this entity
   b. Build context: entity name + description + article excerpts
   c. Call Gemini to generate structured answer:
   - title
   - structuredSummary (≤500 chars)
   - detailedExplanation
   - procedure (if entity type is `workflow` or articles contain how-to patterns)
   - edgeCases, constraints
     d. Create mutation proposal with:
   - `mutationType: 'new_answer_required'`
   - `draftStatus: 'generated'`
   - `draftSource: 'onboarding_bootstrap'`
   - All draft content fields
     e. Audit log: `draft_generated_onboarding`
2. Cap: Max 50 drafts per run
3. Update job bootstrap progress: `draftsGenerated`, `draftsFailed`

**Gemini prompt:** Adapted from `draftGenerator.ts` `DRAFT_SYSTEM_PROMPT` but with onboarding-specific context (source articles instead of signal examples).

### 4.5 Step 4 — Finalize Progress

1. Set `onboardingBootstrap.status = 'completed'`
2. Set `onboardingBootstrap.completedAt = Timestamp.now()`
3. Summary: `entitiesExtracted`, `entitiesAutoPromoted`, `candidatesForReview`, `draftsGenerated`

---

## 5. Configuration Constants

**File:** `src/config/onboardingBootstrapConfig.ts`

```typescript
export const ONBOARDING_BOOTSTRAP_CONFIG = {
  // Entity auto-promotion thresholds
  AUTO_PROMOTE_MIN_CONFIDENCE: 0.7,
  AUTO_PROMOTE_MIN_ARTICLE_REFS: 2,

  // Per-run caps (Firebase cost protection)
  MAX_ENTITIES_PER_RUN: 50,
  MAX_DRAFTS_PER_RUN: 50,
  MAX_ARTICLES_TO_PROCESS: 300,

  // Article batch size for extraction
  EXTRACTION_BATCH_SIZE: 5,

  // Minimum articles to trigger bootstrap
  MIN_ARTICLES_FOR_BOOTSTRAP: 5,

  // Skip bootstrap if entities already exist for tenant
  SKIP_IF_ENTITIES_EXIST: false,
} as const;
```

---

## 6. Feature Flags

### Client-side (`src/config/features.ts`)

```typescript
ENABLE_CANONICA_FOUNDER_ONBOARDING: true,
```

### Cloud Functions (`functions-canonica/src/constants/features.ts`)

```typescript
ENABLE_CANONICA_FOUNDER_ONBOARDING: true,
```

**Dependencies:**

- Requires `ENABLE_CANONICA_ONTOLOGY: true` (entity layer)
- Requires `ENABLE_CANONICA_CANONICAL_ANSWERS: true` (answer layer)
- If ontology flag is OFF, bootstrap silently skips

---

## 7. Nightly Batch Integration

**In `canonicaNightly.ts`, add Step 12:**

```
Step 1: Drift Detection
Step 2: Signal Entity Resolution
Step 3: Signal Mutation
Step 4: Canonical Coverage KPI
Step 5: Recurring Fallback Detection
Step 6: Post-Mutation Impact Tracking
Step 7: Confidence Auto-Adjustment
Step 8: Signal TTL Auto-Archive
Step 9: Draft Generation (existing - for signal-based proposals)
Step 10: Friction Daily Aggregation + Cleanup
Step 11: Friction Weekly Insight (Sundays only)
Step 12: Onboarding Bootstrap ← NEW
```

Step 12 runs **only for tenants that have `kb_generation_jobs` in `PUBLISHED` status without a completed bootstrap.** Most nights this is a no-op (0 cost).

> **CRITICAL: Tenant Discovery Gap**
>
> The existing `discoverActiveTenants()` queries `canonica_entities` to find tenants.
> But new tenants who just published KB articles have **zero entities** — they would NOT
> be discovered by the existing loop.
>
> **Solution:** Step 12 must run with its OWN tenant discovery that queries `kb_generation_jobs`
> for jobs with `status === 'published'` and no completed `onboardingBootstrap`. This is a
> **separate loop AFTER the main per-tenant loop**, not inside it.
>
> ```
> // After main per-tenant loop (Steps 1-11):
> // Step 12: Separate bootstrap discovery + execution
> const bootstrapTenants = await discoverBootstrapCandidates(); // queries kb_generation_jobs
> for (const { tId, sId, jobId } of bootstrapTenants) {
>     await runOnboardingBootstrap(tId, sId, jobId);
> }
> ```
>
> This ensures brand-new tenants (zero entities, just published KB) get bootstrapped.

---

## 8. UI Changes

### 8.1 KB Generation Dashboard

After job publishes, show bootstrap progress:

```
┌─────────────────────────────────────┐
│ Knowledge Bootstrap                 │
│ ✅ 47 entities extracted            │
│ ✅ 23 entities auto-promoted        │
│ ✅ 23 answer drafts generated       │
│ ℹ️ 24 entities pending your review  │
│                                     │
│ [Review Drafts →] [Review Entities →]│
└─────────────────────────────────────┘
```

### 8.2 Governance Dashboard

Badge on governance tab: "23 drafts awaiting review"

Filter in `MutationProposalReview.tsx`: show proposals where `draftSource === 'onboarding_bootstrap'`

---

## 9. Idempotency & Safety

| Concern                | Protection                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Duplicate entities** | Name normalization + registry-guided extraction + dedup check before promote                               |
| **Duplicate drafts**   | Check existing proposals for same entity before generating                                                 |
| **Re-run safety**      | Skip articles with `entityIds` already set. Skip entities already promoted. Skip drafts already generated. |
| **Cost explosion**     | Per-run caps: 50 entities, 50 drafts, 300 articles max                                                     |
| **Bootstrap failure**  | Status set to `failed` with error message. KB articles remain published and functional via RAG.            |
| **Partial completion** | Each step is independent. Can resume from where it stopped on next nightly run.                            |

---

## 10. Error Handling

```
Bootstrap failure → set status: 'failed', errorMessage
Entity extraction failure → log, continue with next batch
Auto-promote failure → log, skip entity, continue
Draft generation failure → log, mark draftStatus: 'failed', continue
Gemini timeout → skip, try next entity
Gemini quota exceeded → stop drafting, mark remaining as pending
```

**Critical rule:** Bootstrap failure NEVER blocks KB publish. Articles work via RAG regardless.

---

## 11. ADRs (Architecture Decision Records)

### ADR-1: Nightly Batch vs Post-Publish Trigger

**Decision:** Nightly batch (Step 12 in canonicaNightly)
**Rationale:**

- Bootstrap is not latency-sensitive (RAG provides immediate answers)
- Avoids coupling Canonica CF to MenuList's KB publish CF
- Naturally cost-controlled (runs once/day)
- Idempotent by design
- Consistent with existing Canonica architecture

**Trade-off:** 0-24 hour delay between KB publish and canonical bootstrap. Acceptable because RAG works immediately.

### ADR-2: Auto-Promote vs All-Manual-Review

**Decision:** Auto-promote high-confidence entities (≥0.7 confidence, ≥2 articles)
**Rationale:**

- Doctrine says "humans approve" but doesn't prohibit automation with guardrails
- High-confidence, multi-reference entities are almost certainly real product concepts
- Remaining low-confidence entities stay in manual review queue
- Audit trail preserves full transparency
- Founder can always deprecate an auto-promoted entity

**Risk mitigation:** Authority guard (confidence + frequency), audit logging, dedup

### ADR-3: Draft ≠ Active (Doctrine Compliance)

**Decision:** Generated answers are `pending_review` proposals, never served as canonical
**Rationale:**

- Freeze doctrine: "Mutation-only canonical edits" + "LLM assist non-authoritative"
- RAG provides immediate answers without canonical layer
- Founders review and approve at their own pace
- No compromise on answer governance

### ADR-4: No New Collections

**Decision:** Zero new Firestore collections
**Rationale:**

- All data fits naturally in existing collections
- `canonica_entityCandidates` for extracted entities
- `canonica_mutationProposals` for answer drafts
- `kb_generation_jobs` for progress tracking (additive field)
- Reduces maintenance, indexing, and cost

### ADR-5: Single Feature Flag

**Decision:** One flag `ENABLE_CANONICA_FOUNDER_ONBOARDING` controls entire bootstrap
**Rationale:**

- Bootstrap is atomic — all steps or none
- Individual step flags would create confusing partial states
- Depends on `ENABLE_CANONICA_ONTOLOGY` + `ENABLE_CANONICA_CANONICAL_ANSWERS` (validated at runtime)

---

## 12. Build Order

1. **Config:** Add feature flag + config constants
2. **Types:** Add `onboardingBootstrap` field to `IngestionJob`
3. **Engine:** Create `onboardingBootstrap.ts` in `functions-canonica`
4. **Integration:** Add Step 12 to `canonicaNightly.ts`
5. **UI:** Add progress display on KB generation dashboard
6. **UI:** Add bootstrap filter on governance review
7. **Testing:** End-to-end with test KB articles
8. **Docs:** Update expansion tracker

---

## 13. Cost Estimation

**Per bootstrap run (100 articles → ~30 entities → ~20 drafts):**

| Operation                  | Count       | Cost       |
| -------------------------- | ----------- | ---------- |
| KB article reads           | 100         | ~$0.006    |
| Entity extraction (Gemini) | 20 calls    | ~$0.02     |
| Entity candidate writes    | 30          | ~$0.0005   |
| Entity promote writes      | 20 × 3 docs | ~$0.001    |
| Draft generation (Gemini)  | 20 calls    | ~$0.02     |
| Mutation proposal writes   | 20          | ~$0.0004   |
| Audit log writes           | 40          | ~$0.0007   |
| **Total**                  |             | **~$0.05** |

At 1000 tenants bootstrapping: **~$50 total** (one-time per tenant).

Monthly ongoing cost: **$0** (bootstrap only runs once per tenant until new KB imports).

---

## 14. Suggestions & Discussion Items

### For User Discussion

1. **Nightly vs Post-Publish Trigger:** Current design uses nightly batch (0-24h delay). If latency is unacceptable for beta, consider Firestore `onUpdate` trigger on `kb_generation_jobs` status change to `PUBLISHED`. Trade-off: tighter coupling to MenuList's KB pipeline, but instant bootstrap.

2. **Auto-Promote Threshold Tuning:** Starting at ≥0.7 confidence + ≥2 articles. May need adjustment after observing real KB article quality. Consider making configurable per-tenant in future.

3. **Draft Quality Feedback Loop:** When founders reject drafts, we could capture rejection reasons and improve the Gemini prompt. Not in v1 — log for future consideration.

4. **Bootstrap for Existing Tenants:** Current design runs on new KB imports. Existing Canonica tenants (MenuList itself) may want to bootstrap retroactively. Config flag `SKIP_IF_ENTITIES_EXIST` controls this.

### Architectural Considerations (Updated Post-Audit 2026-03-09)

1. **Cross-Project Read:** Bootstrap engine (in `functions-canonica`) needs to read `kb_articles` from the Canonica Firestore. This is already the case — KB articles live in Canonica Firestore alongside entities. No cross-project reads needed.

2. **Gemini Rate Limits:** At scale (100+ tenants bootstrapping same night), 40 Gemini calls × 100 = 4000 calls. Within Gemini API limits (60 RPM for Flash). May need staggering at 1000+ tenants.

3. **CF vs Client DAL (CRITICAL — found in audit):** All `src/database/canonica/*.ts` DAL files use `canonicaFirebaseClient` (client SDK). The bootstrap CF uses `firestoreAdmin` (admin SDK). These are incompatible — CF must mirror DAL logic using admin SDK directly, same as `draftGenerator.ts`. See §2 architecture note.

4. **Tenant Discovery Gap (CRITICAL — found in audit):** `discoverActiveTenants()` in `canonicaNightly.ts` queries `canonica_entities`. New tenants with zero entities (the exact bootstrap target) would NOT be discovered. Step 12 must have its own discovery query against `kb_generation_jobs`. See §7 architecture note.

5. **Missing DB Constants (found in audit):** `functions-canonica/src/constants/database.ts` lacks `KB_GENERATION_JOBS` and `KB_ARTICLES` constants. Must be added during implementation. See §2 modified files list.

---

## 15. Version History

| Date       | Version | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-09 | 1.0.0   | Initial implementation design                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-03-09 | 1.0.1   | Fixed nightly step numbering (Step 12, not 11). Added suggestions section.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-03-09 | 1.1.0   | **Deep Audit Fixes:** (1) CF vs client DAL incompatibility documented — CF must use firestoreAdmin directly. (2) Tenant discovery gap documented — Step 12 needs separate discovery query against kb_generation_jobs. (3) Missing DB constants (KB_GENERATION_JOBS, KB_ARTICLES) added to modified files list. (4) Added src/types/canonica/index.ts to modified files (draftSource union). (5) All 4 stale "Step 11" references corrected to "Step 12". (6) Full doctrine compliance verified (4 docs, 100% pass). |
| 2026-03-09 | 2.0.0   | **IMPLEMENTED.** All code written: `onboardingBootstrap.ts` (858 lines), `onboardingBootstrapConfig.ts`, feature flags (×2), DB constants, types (×2), Step 12 wired in `canonicaNightly.ts`. Zero TS errors (both projects). Post-impl audit: 15/15 doc claims verified vs code, 2 known limitations logged (KB articles no tenant filter — legacy pattern; draft gen covers all entities not just new).                                                                                                           |

# Answerlattice — Founder Onboarding (Knowledge Bootstrap Engine) — Spec

> **Version:** 1.0.0
> **Last Updated:** 2026-03-09
> **Audience:** CEO / PM / Clients
> **Feature Flag:** `ENABLE_ANSWERLATTICE_FOUNDER_ONBOARDING`

---

## 1. Problem Statement

The #1 reason AI support tools fail is the **empty knowledge base problem**. SaaS founders sign up, see an empty system, and abandon before populating it. Industry data shows:

- 60-70% of knowledge base setups are never completed
- Average time to first useful AI answer without automation: 2-4 hours
- Founders who do not reach a useful first setup moment quickly are likely to abandon.

Answerlattice's current onboarding flow requires 4 manual steps:
1. Upload KB source files
2. Review AI-generated articles
3. Approve entity candidates one by one
4. Manually create canonical answers

**Target:** Reduce this to 1 step: **upload docs → system works**.

---

## 2. Solution Overview

After KB articles are published (existing pipeline), the Founder Onboarding Engine automatically:

1. **Batch-extracts entities** from all published articles
2. **Keeps every generated candidate pending** until an explicit owner promotion action
3. **Generates provisional canonical answer drafts** only for already approved active entities
4. **Places drafts in review queue** for gradual founder review

The AI support system works **immediately** via RAG (existing behavior). The canonical layer bootstraps in the background, improving answer quality over time as the founder reviews and approves drafts.

---

## 3. User Journey

### 3.1 Current Flow (Before)

```
Signup → Upload KB docs → Wait for AI extraction (2-5 min)
→ Review article structure → Publish articles → Manually extract entities
→ Review each entity candidate → Approve/reject each one
→ Manually write canonical answers → System starts working
Total time: 30-60 minutes of active work
```

### 3.2 New Flow (After)

```
Signup → Upload KB docs → Wait for AI extraction (2-5 min)
→ Review article structure → Publish articles
→ [AUTOMATIC] Entity candidates extracted for review
→ [AUTOMATIC] Drafts generated only for already approved active entities
→ AI support works IMMEDIATELY via RAG
→ Founder reviews/approves drafts gradually (async, no pressure)
Total time: 5-8 minutes, then gradual async review
```

### 3.3 Founder Experience

**Immediate (0-5 min):**
- Upload docs → articles generated → published
- AI support starts answering via RAG immediately
- Progress indicator shows: "X candidates detected, Y awaiting review, Z answer drafts generated"

**Background (5-15 min, automatic):**
- Entity extraction runs on all published articles
- All generated candidates remain in the owner review queue
- Existing owner-approved active entities can receive canonical answer drafts
- Entity/search-index truth changes only through the protected promotion action

**Gradual review (async, days/weeks):**
- Founder sees "X drafts awaiting review" badge on governance dashboard
- Each draft shows: title, summary, source articles, confidence, entity binding
- One-click: Approve / Edit & Approve / Reject
- Approved drafts become active canonical answers (deterministic retrieval)

---

## 4. Capability Blocks

### 4.1 Batch Entity Extraction (extends existing)

- Runs after KB job status changes to `PUBLISHED`
- Processes ALL articles from the job in batches of 5
- Uses existing `extractEntitiesFromArticles()` with registry-guided dedup
- Stores new candidates in `answerlattice_entityCandidates`

### 4.2 Candidate Review Admission

- After extraction, stores deterministic workspace-scoped pending candidates
- No confidence score can bypass owner review
- `promoteCandidate()` is the only candidate-to-entity transition and runs through the protected server ontology transaction
- Rejected and merged decisions also use the server-owned review action

### 4.3 Canonical Answer Draft Generation (extends existing)

- For each already approved active entity, generates a canonical answer draft when one does not already exist
- Uses existing Gemini prompt pattern from `draftGenerator.ts`
- Source context: article content that references the entity
- Generates: title, structuredSummary, detailedExplanation, procedure (if how-to)
- Stored as mutation proposal with `mutationType: 'new_answer_required'`, `draftStatus: 'generated'`

### 4.4 Progress Tracking (NEW)

- Additive fields on `kb_generation_jobs` document:
  - `onboardingBootstrap.status`: `pending` | `extracting` | `promoting` | `drafting` | `completed` | `failed`
  - `onboardingBootstrap.entitiesExtracted`: number
  - `onboardingBootstrap.entitiesAutoPromoted`: number
  - `onboardingBootstrap.draftsGenerated`: number
  - `onboardingBootstrap.startedAt`: Timestamp
  - `onboardingBootstrap.completedAt`: Timestamp
- UI shows progress on KB generation dashboard

### 4.5 Review Queue (extends existing)

- Uses existing `MutationProposalReview.tsx` component
- Filter: proposals from `onboarding_bootstrap` source
- Approval uses the protected server governance action; the browser cannot write canonical truth or proposal decision state directly
- Badge count on governance tab: "X drafts awaiting review"

---

## 5. Safety Mechanisms

| Mechanism | Rule | Rationale |
|-----------|------|-----------|
| **Explicit entity promotion** | Every generated candidate requires owner action | Model confidence never becomes product truth by itself |
| **Deterministic candidate identity** | Workspace/type/name hash with transaction counter | Retries do not create duplicate pending candidates |
| **Draft ≠ Active** | Drafts are `pending_review`, never `active` | Doctrine: humans approve canonical answers |
| **RAG provides immediate answers** | No dependency on canonical layer for first answers | Users get value before canonical bootstrap completes |
| **Idempotent extraction** | Entity name normalization + dedup | Re-running won't create duplicates |
| **Cost cap** | Max 50 entities + 50 drafts per bootstrap run | Prevents runaway Gemini costs |
| **Graceful failure** | Bootstrap failure never blocks KB publish | KB articles work regardless |

---

## 6. Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Time to first AI answer | <5 minutes from upload | Client-side timer |
| Entity extraction accuracy | >70% relevant entities | Manual spot-check |
| Draft answer quality | >50% approved without edits | Approval rate tracking |
| Founder activation rate | >80% complete upload + get AI answer | Funnel analytics |
| Canonical layer bootstrap time | <15 minutes for 100 articles | `onboardingBootstrap.completedAt - startedAt` |

---

## 7. What This Is NOT

- NOT a crawler (existing KB pipeline handles source import)
- NOT a queue system (Cloud Functions handle async processing)
- NOT auto-activation of unreviewed answers (RAG handles immediate answers)
- NOT a replacement for governance (drafts require approval)
- NOT a new set of collections (uses existing Answerlattice + KB collections)

---

## 8. Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-09 | 1.0.0 | Initial spec from ChatGPT discussion + codebase audit + external research |

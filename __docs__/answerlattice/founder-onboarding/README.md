# Answerlattice — Founder Onboarding (Knowledge Bootstrap Engine)

> **Status:** Implemented
> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-06-28
> **Feature Flag:** `ENABLE_ANSWERLATTICE_FOUNDER_ONBOARDING`
> **Expansion Tracker:** Item #6
> **Tier:** A — Required for ICP Adoption

---

## Purpose

Reduce Answerlattice's time-to-value from signup to working AI support from ~30 minutes (manual KB upload → review → approve entities → create answers) to **<5 minutes** (upload docs → AI bootstraps everything → system starts answering immediately → founder reviews gradually).

The biggest failure mode for AI support tools is the **empty knowledge base problem**. Founders quit before populating docs. This system solves that by treating onboarding as **data bootstrapping infrastructure**, not a setup wizard.

---

## Core Insight

Answerlattice ALREADY has "auto activation" via RAG. When KB articles are published and embedded, they're immediately searchable. The gap is bootstrapping the **canonical layer** (entities + governed answers) faster — so the deterministic retrieval path starts working alongside RAG from day one.

---

## What This System Does

After KB job publishes (existing pipeline):

1. **Auto-extract entities** from all published articles (batch, not per-article)
2. **Auto-promote high-confidence entities** (skip manual review for strong candidates)
3. **Auto-generate provisional canonical answer drafts** from article content
4. **Place drafts in review queue** (mutation proposals with `draftStatus: generated`)
5. **Track onboarding progress** via metrics on the KB generation job

Bootstrap diagnostics use fixed failure codes and bounded source-error metadata. Failed job progress stores a fixed `onboardingBootstrap.errorMessage` code instead of raw exception text. If the failed-status marker write itself fails, the function logs `ANSWERLATTICE_BOOTSTRAP_JOB_STATUS_MARK_FAILED` and still returns the fixed scheduler-facing tenant failure code.

The founder's AI support works immediately via RAG. The canonical layer bootstraps in the background. Founder reviews and approves gradually.

---

## Architecture Position

```
Existing KB Pipeline (unchanged)
Upload → AI Extraction → Staging → Review → Publish → Embed
                                                    ↓
                                    [NEW] Onboarding Bootstrap Engine
                                                    ↓
                                    ┌───────────────┼───────────────┐
                                    ↓               ↓               ↓
                              Entity          Canonical         Progress
                              Extraction      Answer Draft      Metrics
                              (batch)         Generation        Update
                                    ↓               ↓
                              Auto-Promote    Review Queue
                              (high conf)     (mutation proposals)
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **No new Firestore collections** | Uses existing: `answerlattice_entities`, `answerlattice_entityCandidates`, `answerlattice_canonicalAnswers`, `answerlattice_mutationProposals`, `answerlattice_auditLogs`, `kb_generation_jobs` |
| **Extends existing KB pipeline** | Hooks into post-publish step, not a parallel system |
| **Auto-promote with authority guard** | High-confidence (≥0.7) + multi-article (≥2) entities auto-promoted. Respects doctrine via guardrails, not by removing automation. |
| **Draft answers ≠ active answers** | Generated drafts are `pending_review` proposals, never served as canonical until approved. RAG handles immediate answers. |
| **No crawler** | Existing KB pipeline already handles URL import, PDF, images, etc. |
| **No queue collections** | Uses Firebase Cloud Functions (existing pattern), not custom queues |
| **Idempotent** | Hash-based dedup on entity names prevents duplicates on re-import |

---

## ChatGPT Accuracy Assessment

| ChatGPT Claim | Verdict | Reason |
|---------------|---------|--------|
| Need zero-setup import | ✅ VALID | But KB upload pipeline already exists — just needs friction reduction |
| Need entity extraction | ✅ EXISTS | `entityExtraction.ts` — 413 lines, full pipeline |
| Need canonical answer drafting | 🟡 PARTIAL | Draft generator exists for mutation proposals, but not for onboarding bootstrap |
| Need auto activation | ⚠️ MISLEADING | RAG already provides immediate answers. "Auto activation" of canonical layer conflicts with doctrine. |
| Need review system | ✅ EXISTS | `EntityCandidateReview.tsx`, `MutationProposalReview.tsx` |
| Need 9 new collections | ❌ WRONG | Zero new collections needed. All existing infrastructure sufficient. |
| Need crawler | ❌ WRONG | Existing KB pipeline handles all source types |
| Need queue infrastructure | ❌ WRONG | Firebase Cloud Functions handle async processing |
| `orgId` model | ❌ WRONG | Answerlattice uses `tId`/`sId`/`pId` |

**Overall ChatGPT accuracy: ~55%** — Valid problem identification, but solution design is disconnected from existing Answerlattice infrastructure.

---

## Documents

| File | Audience | Purpose |
|------|----------|---------|
| `README.md` | Everyone | This file — index + architecture overview |
| `founder-onboarding_spec.md` | CEO/PM | Business requirements, user flows |
| `founder-onboarding_impl.md` | Developers | Technical blueprint, data model, pipelines |
| `founder-onboarding_firebase.md` | DevOps | Firestore cost analysis, read/write tracking |
| `founder-onboarding_marketing.md` | Sales/Marketing | Pitch content, competitive positioning |
| `founder-onboarding_website.md` | Website | Landing page content |
| `founder-onboarding_helpdoc.md` | Customers | Help documentation |
| `founder-onboarding_mobile-support.md` | Mobile | Mobile assessment |

---

## Dependencies

- Existing KB generation pipeline (Cloud Functions)
- `src/lib/answerlattice/entityExtraction.ts` (entity extraction)
- `functions-answerlattice/src/answerlattice/draftGenerator.ts` (answer draft generation)
- `ENABLE_ANSWERLATTICE_ONTOLOGY` flag (entity layer)
- `ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS` flag (answer layer)

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-09 | 1.0.0 | Initial documentation — architecture designed from ChatGPT discussion + codebase audit + external research |

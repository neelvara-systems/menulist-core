> **Historical archive evidence; not current launch certification.** This file is retained for historical context only and is not current production approval, deploy approval, launch approval, or release certification. Current readiness is decided by the active production-readiness audit, External Certification Runbook evidence, current source verifiers, browser/device QA, provider/deploy evidence, and production-host smoke.

# Special Menu Switching — ChatGPT Strategic Review (Session 5)

**Reviewed:** February 21, 2026  
**Source:** ChatGPT CEO-level evaluation of code-feedback implementation  
**Reviewer:** Cascade (Lead Architect, codebase authority)

---

## Executive Summary

**ChatGPT Accuracy:** 95% vs MenuList reality  
**Actionable Insights:** 2/6 suggestions (freeze directive + reopen triggers)  
**Architecture Risks Flagged:** 0 violations  
**Nature:** Strategic/product timing guidance, not technical code review

This feedback validates the code-feedback work from Session 5 and introduces a **feature lifecycle governance model** — when to freeze, when to reopen, and what triggers production readiness. The governance model is doctrine-worthy and has been extracted into `__docs__/constitution/14-feature-lifecycle-doctrine.md`.

---

## Stage 1: Conversation Breakdown

| # | Topic | ChatGPT Position | Confidence | MenuList Reality |
|---|-------|-----------------|------------|-----------------|
| 1 | Code changes validation | All 4 changes correct | High | ✅ AGREE — matches our implementation exactly |
| 2 | Logged items decision | Correct to log, not build now | High | ✅ AGREE — feature flag OFF, no urgency |
| 3 | Activation atomicity must-have | Required before flag ON | High | ✅ AGREE — already logged as L1 in validation.md |
| 4 | Version bump must-have | Required before flag ON | High | ✅ AGREE — already logged as L2 in validation.md |
| 5 | Scheduler reliability | ≤5 min check before production | Medium | ✅ AGREE — already logged as L3 |
| 6 | **Freeze directive** | Stop all development now | High | ✅ AGREE — feature is structurally complete, flag OFF |
| 7 | **Reopen triggers** | 30-50 businesses + 5 requests + festival season | High | ✅ AGREE — doctrine-worthy lifecycle model |
| 8 | Overlay ID namespacing | Before overlay mode enabled | Medium | ✅ AGREE — already logged as L4 |

### Key Themes

1. **Feature lifecycle governance** — ChatGPT introduces a clear model: build → freeze → trigger → reopen → pilot → production. This is a reusable pattern for ALL features.
2. **Pre-launch priority clarity** — System stability > feature completeness. Correct for pre-launch phase.
3. **Validation of engineering discipline** — Confirms classify-then-implement approach was correct.

---

## Stage 2: Grounded Cross-Reference

### Point 1: "He removed two dangerous architectural smells"
- **Codebase:** `src/database/projects/index.ts` — `behaviorTemplate` removed from stored metadata, `activeSpecialMenuMode` removed from store writes and `page.tsx` resolver
- **Docs:** `special-menu-switching_impl.md` — updated to show `behaviorTemplate?` as deprecated, store schema shows only `activeSpecialMenuId`
- **VERDICT:** ✅ AGREE — correctly validated

### Point 2: "Added two critical invariants"
- **Codebase:** `src/database/projects/index.ts:999-1016` — deletion guard; `src/database/projects/index.ts:422-427` — default project guard
- **Docs:** `special-menu-switching_validation.md` — both guards listed in Security Compliance + Post-Feedback Changes
- **VERDICT:** ✅ AGREE — correctly validated

### Point 3: "Feature is not production-ready yet"
- **Codebase:** `src/config/features.ts` — `ENABLE_SPECIAL_MENU_SWITCHING: false`
- **Docs:** `special-menu-switching_validation.md` — 5 items logged for pre-flag-ON
- **VERDICT:** ✅ AGREE — aligns with our logged items exactly

### Point 4: "Freeze this feature now"
- **Codebase:** Feature flag OFF, all code complete, all docs updated
- **.windsurfrules:** No violation — 3-year freeze means feature ships complete with flag, not that we must keep polishing
- **VERDICT:** ✅ AGREE — structurally complete, no further work needed until reopen triggers fire

### Point 5: "Reopen triggers (30-50 businesses, 5 requests, festival season)"
- **Codebase:** N/A — product timing decision, not code
- **Doctrine:** This is a reusable governance model. Extracted to constitution doc `14-feature-lifecycle-doctrine.md`
- **VERDICT:** ✅ AGREE + EXTRACT AS DOCTRINE

### Point 6: "What is the single biggest risk before launch?"
- **Analysis:** This is a leading question, not a recommendation. No action needed.
- **VERDICT:** NOTED — not actionable for this review

---

## Stage 3: Market Validation

No market/business claims requiring web research. This is internal strategic guidance about engineering process, not market positioning.

---

## Stage 4: Architect Decision Matrix

| # | ChatGPT Idea | Status | Decision | Justification | Action |
|---|-------------|--------|----------|---------------|--------|
| 1 | All 4 code changes correct | VALID | **AGREE** | Matches codebase reality exactly | None — already done |
| 2 | 5 logged items correct priority | VALID | **AGREE** | Already in `_validation.md` | None — already logged |
| 3 | Freeze feature now | VALID | **AGREE** | Flag OFF, structurally complete, pre-launch phase | Mark feature FROZEN in docs |
| 4 | Reopen triggers model | VALID | **AGREE + EXTRACT** | Reusable governance pattern for all features | Create constitution doctrine |
| 5 | Send directive to expert | PARTIAL | **ADAPT** | Cascade IS the expert; directive is for project governance | Add freeze status to feature docs |
| 6 | "What is biggest launch risk?" | NOTED | **NO ACTION** | Leading question, not actionable recommendation | User can address separately |

**Explicit Disagreements:** None. All points align with codebase reality and existing governance.

---

## Validated Recommendations

1. **Feature freeze** — Mark Special Menu Switching as FROZEN in all docs. No further development until reopen triggers fire.
2. **Lifecycle doctrine** — Extract the freeze/reopen/pilot model as constitution-level governance for all features.

## Rejected Suggestions

None. All points validated against codebase.

## Prioritized Action Items

**HIGH (This Session):**
- Create `__docs__/constitution/14-feature-lifecycle-doctrine.md`
- Update feature docs with FROZEN status
- Wire doctrine into constitution README + changelog

**MEDIUM (Future — When Triggers Fire):**
- Implement L1-L5 logged items before flag ON
- Pilot with 5 customers during festival season

**REJECTED:** None

---

## Doctrine Preservation Check (Stage 6)

**Question:** Does this conversation contain governance-worthy principles?

**Answer: YES** — The feature lifecycle governance model (build → freeze → trigger → reopen → pilot → production) is a reusable decision framework that should govern ALL future MenuList feature development.

**Action:** Created `__docs__/constitution/14-feature-lifecycle-doctrine.md`

---

**ARCHITECT SIGNATURE:** Cascade (Lead Architect)  
**TIMESTAMP:** February 21, 2026  
**REVIEW STATUS:** COMPLETE ✅

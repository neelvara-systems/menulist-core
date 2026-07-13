# 📝 DOC FEEDBACK AUDIT - Reviews & Reputation (DOCS ONLY)

> Historical February 2026 review evidence only. It is not a current implementation instruction, capability claim, or approval to advance stages. Current runtime/publication truth is maintained in this feature README and the July 11, 2026 deep-audit ledger.

**Date:** February 2, 2026  
**Reviewer:** ChatGPT  
**Auditor:** Lead Architect (Cascade)

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Points** | 5 |
| **Accepted** | 5 |
| **Rejected** | 0 |
| **Clarify** | 0 |

---

## Audit Table

| # | ChatGPT Comment | Valid? | Doctrine Evidence | Action | Target Doc |
|---|-----------------|--------|-------------------|--------|------------|
| 1 | Remove `blockCount` and `escalationCount` from API - metrics thinking violates Law 7 | ✅ | Law 7: "No Feature Without Autonomy — Dashboards do not qualify" | Remove counts, keep booleans only | impl.md §4.1 |
| 2 | Remove/neutralize "Dismiss" endpoint - creates decision loop, adds anxiety | ✅ | Law 6: "No Cognitive Load — If it causes owner to think, don't ship" | Replace with auto-expire (24h), remove dismiss endpoint | impl.md §4.2, §3.2 |
| 3 | Rename `ReplyAssistant` → `ReputationGuard` - wrong mental model | ✅ | Core Doctrine: "MenuList is infrastructure, not a tool" | Rename component and all references | impl.md §5, spec.md §8 |
| 4 | Tighten classification: 1★ → high_risk (not low_risk) | ✅ | Law 5: "Public Surfaces Demand Perfection — Show less, not wrong" | Update classification rules | impl.md §3.3 |
| 5 | Marketing doc must remain internal sales enablement only | ✅ | Law 2: "Silence Is a Feature" - don't pitch silent features | Add explicit internal-only notice | marketing.md header |

---

## Detailed Analysis

### ✅ #1: Remove Metrics from API

**ChatGPT Claim:** `blockCount` and `escalationCount` in API violate Law 7.

**Verification:**
- Current impl.md §4.1 shows:
  ```typescript
  blockCount: number;
  escalationCount: number;
  ```
- Law 7: "No Feature Without Autonomy — Dashboards do not qualify"
- Even internal metrics create gravity toward dashboards

**Verdict:** VALID. Counts belong in MOL logs only, not APIs.

**Fix:** Remove counts from `GetReviewStatesResponse`, keep booleans only.

---

### ✅ #2: Remove Dismiss Endpoint

**ChatGPT Claim:** `POST /api/reviews/dismiss` creates owner decision loop.

**Verification:**
- Current impl.md §4.2 shows dismiss endpoint with `ownerDismissedAt` field
- Law 6: "No Cognitive Load — If it causes owner to think, don't ship"
- Dismiss = "Should I dismiss?" = anxiety = tool mentality

**Verdict:** VALID. Use auto-expire instead.

**Fix:** 
- Remove dismiss endpoint
- Add `autoExpiresAt` field (24 hours after classification)
- Warning auto-hides after expiry

---

### ✅ #3: Rename ReplyAssistant → ReputationGuard

**ChatGPT Claim:** "ReplyAssistant" creates wrong mental model ("MenuList helps me reply").

**Verification:**
- Current impl.md §5 shows `ReplyAssistant.tsx`
- Core Doctrine: "MenuList is not a tool owners use. It is infrastructure owners rely on."
- "Assistant" = tool language, not infrastructure language

**Verdict:** VALID. Naming matters.

**Fix:** Rename to `ReputationGuard.tsx` throughout all docs.

---

### ✅ #4: Tighten Classification Defaults

**ChatGPT Claim:** 1★ reviews should be `high_risk` by default, not `low_risk`.

**Verification:**
- Current impl.md §3.3 shows:
  ```typescript
  if (rating <= 2) → negative_low_risk
  ```
- Law 5: "Public Surfaces Demand Perfection"
- False negatives (missing a risky review) > false positives (extra caution)

**Verdict:** VALID. More conservative is safer.

**Fix:** 
- 1★ → `negative_high_risk` (Block)
- 2★ → `negative_low_risk`
- 3★ → `informational`

---

### ✅ #5: Marketing Doc Internal Only

**ChatGPT Claim:** Marketing doc should never become customer-facing.

**Verification:**
- Law 2: "Silence Is a Feature"
- This feature should be "barely mentioned, not pitched"
- Landing page for silent infrastructure = contradiction

**Verdict:** VALID. Add explicit internal-only notice.

**Fix:** Add header note: "INTERNAL SALES ENABLEMENT ONLY - NOT FOR CUSTOMER-FACING MATERIALS"

---

## 🎯 DOC UPDATE PLAN

| # | Target | Section | Change |
|---|--------|---------|--------|
| 1 | impl.md | §4.1 | Remove `blockCount`, `escalationCount` from API response |
| 2 | impl.md | §4.2 | Remove dismiss endpoint entirely |
| 3 | impl.md | §3.2 | Add `autoExpiresAt` field, remove `ownerDismissedAt` |
| 4 | impl.md | §5.1 | Rename `ReplyAssistant.tsx` → `ReputationGuard.tsx` |
| 5 | impl.md | §3.3 | Update classification: 1★ → high_risk |
| 6 | spec.md | §8 | Update architecture diagram with new component name |
| 7 | marketing.md | Header | Add "INTERNAL ONLY" notice |

---

## Rejected Items

None. All ChatGPT feedback was valid and doctrine-aligned.

---

**AUDIT STATUS:** ✅ COMPLETE  
**NEXT:** Stage 2 - Apply doc updates

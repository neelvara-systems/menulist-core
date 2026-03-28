# Doc Feedback Audit — AI Enhancement Packs (DOCS ONLY)

**Date:** February 9, 2026
**Source:** ChatGPT feedback on spec.md + impl.md
**Reviewer:** Lead Architect (Cascade)
**Mode:** DOCS ONLY — zero code changes

---

## Summary

Total Points: 6 | Accepted: 2 | Rejected: 3 | Flagged for Human: 1

**Additionally:** 10 critical per-store violations discovered independently across marketing (4), website (4), and helpdoc (2).

---

## Audit Table

| #   | ChatGPT Point                                                                  | Valid?     | Code/Doc Evidence                                                                                                                                                                                                                         | Action                             | Target Doc          |
| --- | ------------------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------- |
| 1   | Over-engineering v1 — ship soft enforcement, overdraft buffer (20-30%)         | ✅ PARTIAL | Nothing is built yet — docs describe what TO build, not what IS built. Overdraft buffer is a valid configurable launch parameter.                                                                                                         | Add launch enforcement config note | spec.md             |
| 2   | Pack positioning too "AI" — rename to "Menu Update Pack" / "Menu Refresh Pack" | ❓ HUMAN   | Language Governance (`02-language-governance.md`) forbids "AI-powered" but allows "AI" in approved contexts. Current approved messages: "Get more AI enhancements for your menu". Renaming is a founder BRANDING decision.                | Flag for founder decision          | None (human review) |
| 3   | Capacity consumption flaw — 48hr "pack priority window" after purchase         | ❌ REJECT  | Adds hidden time-based complexity. Users never see credits (doctrine), so can't perceive consumption order. `monthlyCredits` first is economically correct (monthly resets, topUp persists). Violates Law 6 (No Cognitive Load).          | Reject                             | None                |
| 4   | Missing hard cost kill switch — `ENABLE_AI_GENERATION` system-wide             | ✅ ACCEPT  | `src/config/features.ts` has `ENABLE_AI_IMAGE_GENERATION: true` (line 540) but only covers image gen. No system-wide AI enhancement kill switch exists. Existing pattern supports adding one. Aligns with Law 4 (Feature Flags Required). | Add flag to impl.md                | impl.md             |
| 5   | Dormant pack ToS guardrail — add expiry safety clause                          | ✅ PARTIAL | Current ToS (spec.md line 257) already says: "reserves the right to adjust feature availability, pack contents, and pricing." This covers dormant accounts legally. Could strengthen with explicit dormancy language.                     | Strengthen existing ToS            | spec.md             |
| 6   | Missing launch simplicity filter — ensure 5-second understanding               | ❌ NO-OP   | Marketing doc line 31: "One pack. One price. No math." Spec doc: outcome-based framing, no credits exposed, calm CTAs. Already fully achieved.                                                                                            | Already covered                    | None                |

---

## Independent Discovery: Per-Store Violations Across 3 Docs

**CRITICAL:** Marketing, website, and helpdoc all contained lines claiming one pack covers all stores/outlets. This directly contradicts the **validated per-store architecture** (spec.md §Capacity Scope, §Multi-Outlet Pack Logic).

### Marketing Doc (4 violations — FIXED)

| #   | Line | Current (WRONG)                                                              | Correct                                              | Evidence                                             |
| --- | ---- | ---------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| M1  | 29   | "One Enhancement Pack covers all your outlets."                              | Per-store: each store buys its own pack              | spec.md §Multi-Outlet Pack Logic                     |
| M2  | 55   | "One pack works across all your outlets."                                    | Per-store: each store manages capacity independently | spec.md §Capacity Scope                              |
| M3  | 106  | "No. One Enhancement Pack covers all your stores. Buy once, use everywhere." | Per-store: pack is store-scoped                      | `verify-topup/route.ts` writes to store subscription |
| M4  | 183  | "One pack covers all stores."                                                | Per-store: each store has own capacity               | spec.md §Codebase Evidence table                     |

### Website Doc (4 violations — FIXED)

| #   | Line | Current (WRONG)                                                   | Correct                                       |
| --- | ---- | ----------------------------------------------------------------- | --------------------------------------------- |
| W1  | 33   | "One pack covers all your stores."                                | "One pack per store. One-time purchase."      |
| W2  | 88   | "Yes. One Enhancement Pack covers all stores under your account." | "Each store manages its own AI enhancements." |
| W3  | 114  | "All stores included"                                             | "Per store (each store manages own capacity)" |
| W4  | 140  | "Works across all your stores."                                   | "Available for each store."                   |

### Helpdoc (2 violations — FIXED)

| #   | Line | Current (WRONG)                                       | Correct                                                  |
| --- | ---- | ----------------------------------------------------- | -------------------------------------------------------- |
| H1  | 48   | "All stores included — One pack covers every outlet"  | "Per store — Each store manages its own AI enhancements" |
| H2  | 79   | "Yes. One pack covers all stores under your account." | "Each store manages its own AI enhancements."            |

---

## Detailed Point Analysis

### Point #1: Soft Enforcement / Overdraft Buffer — ✅ PARTIAL

**ChatGPT says:** Don't block immediately at capacity exhaustion. Allow 20-30% overdraft, then require pack.

**Analysis:**

- The concern is valid: blocking on first AI action after exhaustion creates bad UX
- Nothing is built yet — we're documenting architecture, not retrofitting
- The overdraft buffer is a configurable parameter, not architecture change
- Fits within 3-year freeze: ship the config, toggle via data

**What to add to docs:**

- Spec: Add "Launch Enforcement Strategy" note under Capacity Scope
- Impl: Add `OVERDRAFT_BUFFER_PERCENT` as a configurable constant

**What NOT to change:**

- The core enforcement architecture stays (checkCapacity → execute → decrement)
- The "V1/V2 phasing" ChatGPT suggests violates 3-Year Freeze — REJECTED

### Point #2: Pack Name "AI Enhancement Pack" → "Menu Update Pack" — ❓ HUMAN

**ChatGPT says:** SMB owners don't care about "AI". Frame as "Menu Update Pack" or "Menu Refresh Pack".

**Analysis:**

- The positioning argument has merit — outcome framing > technology framing
- BUT: "AI" is approved in current Language Governance (not forbidden, only "AI-powered" is forbidden)
- Current approved messages: "AI features", "AI enhancements", "AI Enhancement Pack"
- Renaming affects: all docs, UI copy, Razorpay product names, support scripts
- This is a **founder branding decision**, not an architecture decision

**Action:** Flag for human review. Do NOT change docs unilaterally.

### Point #3: 48hr Pack Priority Window — ❌ REJECT

**ChatGPT says:** After pack purchase, consume pack credits first for 48 hours to give "instant perceived value".

**Analysis:**

- **Users never see credits.** They can't perceive which pool is being consumed. The doctrine explicitly forbids usage visibility. This optimization solves a problem that doesn't exist.
- Adds technical complexity: purchase timestamps, time-window logic, edge cases (multiple purchases, subscription renewal during window)
- `monthlyCredits` first is economically rational: monthly credits reset on renewal (use-or-lose), topUp credits persist (bank them)
- Violates Law 6: No Cognitive Load — adds hidden stateful complexity

**Verdict:** REJECTED. Zero user benefit for non-trivial complexity.

### Point #4: System-Wide AI Kill Switch — ✅ ACCEPT

**ChatGPT says:** Add `ENABLE_AI_GENERATION = true/false` system-wide emergency toggle.

**Analysis:**

- `src/config/features.ts` has `ENABLE_AI_IMAGE_GENERATION: true` (line 540) — but only for image generation
- No system-wide toggle exists for ALL AI enhancement operations (descriptions, translations, images, editing)
- Existing pattern: every feature has `ENABLE_X` flag (17+ flags exist)
- This is a valid infrastructure survival control
- Aligns with Law 4 (Feature Flags Required) and anti-abuse patterns

**What to add:**

- impl.md: Document `ENABLE_AI_ENHANCEMENTS` flag in Task 1.1 or new prerequisite task
- spec.md: Add to "What Needs To Be Built" table

### Point #5: Dormant Pack ToS — ✅ PARTIAL (Already Covered)

**ChatGPT says:** Add ToS clause protecting against dormant account credit hoarding.

**Analysis:**

- Current ToS (spec.md line 257): "MenuList reserves the right to adjust feature availability, **pack contents**, and **pricing**."
- This already covers the dormant scenario legally
- Could strengthen with explicit time-based language, but current clause is sufficient
- Adding too-specific language ("unused for extended periods") could actually WEAKEN the ToS by creating a defined threshold

**What to add:** Minor clarification in spec.md ToS section. Not a rewrite.

### Point #6: Launch Simplicity Filter — ❌ NO-OP (Already Done)

**ChatGPT says:** Ensure a café owner understands pricing in 5 seconds.

**Analysis:**

- Marketing doc line 31: "One pack. One price. No math."
- Spec doc: outcome-based framing, no credits exposed, calm CTAs
- UX Copy Rules: "Get more AI enhancements for your menu" (5 words, 2 seconds)
- The entire doctrine is built around this principle

**Verdict:** No change needed. Already fully achieved.

---

## Doc Update Plan

### ✅ Updates to Make

| #     | Source      | Target Doc   | Section                        | Change                                                                    |
| ----- | ----------- | ------------ | ------------------------------ | ------------------------------------------------------------------------- |
| 1     | Point #1    | spec.md      | After "Capacity Scope"         | Add "Launch Enforcement Strategy" with configurable overdraft buffer note |
| 4     | Point #4    | spec.md      | "What Needs To Be Built" table | Add `ENABLE_AI_ENHANCEMENTS` kill switch row                              |
| 4     | Point #4    | impl.md      | Pre-Week 1 prerequisites       | Add feature flag task                                                     |
| 5     | Point #5    | spec.md      | ToS clause                     | Strengthen with dormancy protection language                              |
| M1-M4 | Independent | marketing.md | Lines 29, 55, 106, 183         | Fix per-store pack scoping language                                       |

### ❌ Rejected (No Changes)

| #   | Point                     | Reason                                                             |
| --- | ------------------------- | ------------------------------------------------------------------ |
| 3   | 48hr pack priority window | Users never see credits — zero perceived benefit. Adds complexity. |
| 6   | Launch simplicity filter  | Already fully achieved in current docs.                            |

### ❓ Flagged for Human

| #   | Point                                                    | Decision Needed                                         |
| --- | -------------------------------------------------------- | ------------------------------------------------------- |
| 2   | Pack naming: "AI Enhancement Pack" vs "Menu Update Pack" | Founder branding decision. Both are doctrine-compliant. |

---

**Audit Status:** COMPLETE
**Auditor:** Lead Architect (Cascade)
**Date:** February 9, 2026

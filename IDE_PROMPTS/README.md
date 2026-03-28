# IDE PROMPTS — Visual Guide & Reference

**Purpose:** Standardized workflow for developing features with AI assistance  
**Goal:** Zero back-and-forth, clear handoffs, predictable output quality  
**Last Updated:** February 8, 2026 | **Version:** 3.0

---

## What Are IDE Prompts?

IDE Prompts are **instruction files** that tell Cascade exactly how to handle each phase of feature development. Each prompt defines roles, stages, guardrails, and output format. You don't need to use them directly — the `/slash-command` workflows call them automatically. But understanding what each one does helps you know what's happening behind the scenes.

> **Prefer workflows?** Type `/help` in Cascade chat and describe what you need. Cascade picks the right prompts automatically. See `__docs__/workflows-guide/README.md` for the full workflow guide.

---

## Visual Pipeline — How Prompts Connect

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    NEW FEATURE PIPELINE (Steps 1-5)                      │
│                                                                          │
│  ChatGPT conversation about a feature idea                               │
│       ↓                                                                  │
│  PROMPT 1: CHATGPT-CONVERSATION-REVIEW.md ──→ Decision matrix            │
│       ↓                                       (AGREE/REJECT/PARTIAL)     │
│  PROMPT 2: DOCUMENT CREATION PROMPT.md ──→ 7 docs + changelog entry      │
│       ↓                                   (spec/impl/marketing/website/  │
│       ↓                                    helpdoc/firebase + README)     │
│  (Optional) Send docs to ChatGPT                                         │
│       ↓                                                                  │
│  PROMPT 3: VALIDATION FEEDBACK PROMPT.md ──→ Update docs if valid        │
│       ↓                                                                  │
│  PROMPT 4: IMPLEMENTATION PROMPT.md ──→ Working code + validation.md     │
│       ↓                                                                  │
│  (Optional) Send code to ChatGPT                                         │
│       ↓                                                                  │
│  PROMPT 5: AFTER IMPLEMENTATION FEEDBACK PROMPT.md ──→ Fix valid issues  │
│       ↓                                                                  │
│  ✅ DONE — Feature complete with full doc set + validated code            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    SUPPORTING PROMPTS                                     │
│                                                                          │
│  Feature exists in code, no docs  →  PROMPT 0: RETRO DOCUMENTATION       │
│  Organizing/cleaning up docs      →  PROMPT 6: DOCUMENTATION STRUCTURE   │
│  Code cleanup/refactoring         →  PROMPT 7: CODE REFACTORING PATTERNS │
│  Existing feature deep review     →  PROMPT 8: EXISTING-FEATURE-REFACTOR │
│  End-of-session verification      →  PROMPT 9: FINAL-VERIFICATION        │
│  Website/help/firebase/changelog  →  PROMPT 10: CONTENT LAYERS           │
│  Session wrap-up checklist        →  MASTER-EXECUTION-PROMPT (STEP 7)    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    AUTHORITY HIERARCHY                                    │
│                                                                          │
│  00. MASTER RULES & WORKFLOW.md  ←── OVERRIDES EVERYTHING                │
│       ↓ (read first, always)                                             │
│  All other prompts inherit from master rules                             │
│       ↓                                                                  │
│  Constitution (__docs__/constitution/)  ←── Product-level authority       │
│       ↓                                                                  │
│  Security Rules (.cascade/rules/)  ←── Implementation-level authority    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Complete File Reference — What / Why / When / How

### `00. MASTER RULES & WORKFLOW.md` — The Constitution of Development

|              |                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------- |
| **What**     | Universal rules that override ALL other prompts                                          |
| **Why**      | Ensures consistency: 3-year freeze, codebase-as-truth, naming conventions, doc structure |
| **When**     | Auto-loaded by every workflow. You never invoke this directly.                           |
| **Creates**  | Nothing — it governs how everything else works                                           |
| **Workflow** | _All workflows read this first_                                                          |

---

### `0. FEATURE RETRO DOCUMENTATION PROMPT.md` — Reverse-Engineer Docs from Code

|              |                                                                            |
| ------------ | -------------------------------------------------------------------------- |
| **What**     | Generates full doc set by reading existing code (not ChatGPT ideas)        |
| **Why**      | When a feature was built without docs, this creates them from code reality |
| **When**     | Feature exists in codebase but has no/outdated documentation               |
| **Creates**  | spec, impl, marketing, website, helpdoc, firebase + README (7 docs)        |
| **Workflow** | `/retro-doc`                                                               |

**Process:** Codebase scan → truth extraction → spec from code → impl from code → marketing from capabilities → content layers → verification

---

### `1. CHATGPT-CONVERSATION-REVIEW.md` — Validate ChatGPT Ideas

|              |                                                                         |
| ------------ | ----------------------------------------------------------------------- |
| **What**     | 5-stage critical review of a ChatGPT conversation against our codebase  |
| **Why**      | ChatGPT doesn't know our code. This prevents accepting bad suggestions. |
| **When**     | You discussed a feature idea with ChatGPT and want to validate it       |
| **Creates**  | ONE review doc in `__docs__/[feature-name]/_archive/chatgpt-review.md`  |
| **Workflow** | `/chatgpt-review`                                                       |

**Process:** Conversation analysis → grounded cross-reference → market validation → decision matrix → single output document

---

### `2. DOCUMENT CREATION PROMPT.md` — Create Full Doc Set

|              |                                                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| **What**     | Generates 7 production-ready docs + changelog entry from validated ideas                                             |
| **Why**      | Docs-first development: no code until docs are complete                                                              |
| **When**     | After ChatGPT review (Step 1) or when starting a new feature from scratch                                            |
| **Creates**  | `_spec.md`, `_impl.md`, `_marketing.md`, `_website.md`, `_helpdoc.md`, `_firebase.md`, `README.md` + changelog entry |
| **Workflow** | `/new-feature` (Step 2)                                                                                              |

**Process:** Critical review of ideas → feasibility check → conflict resolution → 7 docs + changelog

---

### `3. VALIDATION FEEDBACK PROMPT.md` — Process Doc Feedback

|              |                                                                         |
| ------------ | ----------------------------------------------------------------------- |
| **What**     | Evaluates ChatGPT feedback on our docs, updates only what's valid       |
| **Why**      | External review catches gaps, but ChatGPT isn't authority — our code is |
| **When**     | You sent docs to ChatGPT and got feedback back                          |
| **Creates**  | Updated docs + `_archive/doc-feedback-audit.md`                         |
| **Workflow** | `/doc-feedback`                                                         |

**Mode:** DOCS ONLY — zero code changes. `git diff` should show only `.md` files.

---

### `4. IMPLEMENTATION PROMPT.md` — Write Code from Docs

|              |                                                          |
| ------------ | -------------------------------------------------------- |
| **What**     | Executes the implementation plan from `_impl.md` exactly |
| **Why**      | Code must match docs precisely — no improvisation        |
| **When**     | Docs are finalized and reviewed                          |
| **Creates**  | Working code + `_validation.md` with 100% checklist pass |
| **Workflow** | `/new-feature` (Step 3)                                  |

**Process:** Pre-implementation verification → code implementation (exact match) → validation report

---

### `5. AFTER IMPLEMENTATION FEEDBACK PROMPT.md` — Process Code Feedback

|              |                                                                              |
| ------------ | ---------------------------------------------------------------------------- |
| **What**     | Reviews ChatGPT code suggestions against spec/impl, applies valid fixes only |
| **Why**      | External code review catches bugs, but must not introduce scope creep        |
| **When**     | You sent code to ChatGPT and got suggestions back                            |
| **Creates**  | Code fixes + updated `_validation.md`                                        |
| **Workflow** | `/code-feedback`                                                             |

**Decision framework:** VALID → implement | INVALID → reject | IMPROVE → enhance within freeze | CLARIFY → flag for human

---

### `6. DOCUMENTATION STRUCTURE PROMPT.md` — Organize Docs

|              |                                                                        |
| ------------ | ---------------------------------------------------------------------- |
| **What**     | Rules for doc folder structure, naming conventions, audience targeting |
| **Why**      | Keeps docs organized as the project grows                              |
| **When**     | Cleaning up scattered docs, creating new feature folders               |
| **Creates**  | Reorganized folder structure, updated README files                     |
| **Workflow** | `/doc-organize`                                                        |

---

### `7. CODE REFACTORING PATTERNS.md` — Eliminate Redundancy

|              |                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------- |
| **What**     | 4 reusable patterns: redundancy elimination, type extension, icon mapping, constant consolidation |
| **Why**      | Prevents maintenance nightmares from scattered types/constants                                    |
| **When**     | Code review, post-implementation cleanup, refactoring                                             |
| **Creates**  | Cleaner code with single sources of truth                                                         |
| **Workflow** | `/refactor-feature` + `/final-review`                                                             |

---

### `8. EXISTING-FEATURE-REFACTORING.md` — Deep Feature Review

|              |                                                                                   |
| ------------ | --------------------------------------------------------------------------------- |
| **What**     | Instructions for exploring an existing feature end-to-end and creating fresh docs |
| **Why**      | When revisiting old code that needs comprehensive review and documentation        |
| **When**     | Feature needs deep dive: code cleanup + fresh docs + improvement suggestions      |
| **Creates**  | Fresh doc set + code improvements                                                 |
| **Workflow** | `/refactor-feature`                                                               |

---

### `9. FINAL-VARIFICATION.md` — Session Verification

|              |                                                                                       |
| ------------ | ------------------------------------------------------------------------------------- |
| **What**     | Comprehensive end-of-session checklist: code review, doc alignment, redundancy, UI/UX |
| **Why**      | Catches gaps before session ends — nothing ships incomplete                           |
| **When**     | Before ending any coding session                                                      |
| **Creates**  | Updated docs, fixed bugs, verification log                                            |
| **Workflow** | `/final-review`                                                                       |

---

### `10. CONTENT LAYERS PROMPT.md` — Public Content + Firebase Costs

|              |                                                                                      |
| ------------ | ------------------------------------------------------------------------------------ |
| **What**     | Templates for website copy, help docs, Firebase cost tracking, and changelog entries |
| **Why**      | Every feature needs public presence, customer self-service, and cost visibility      |
| **When**     | Creating any new feature (auto-included) or backfilling missing content layers       |
| **Creates**  | `_website.md`, `_helpdoc.md`, `_firebase.md`, changelog entry                        |
| **Workflow** | `/new-feature`, `/retro-doc`                                                         |

**4 layers:** Website (acquisition) → Help doc (reduces support) → Firebase (cost control) → Changelog (trust/retention)

---

### `MASTER-EXECUTION-PROMPT.md` (STEP 7) — Session Wrap-Up Protocol

|              |                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| **What**     | 8-phase end-of-session protocol (doc sweep, mobile, monitoring, content, code, UI, knowledge, rebuild) |
| **Why**      | Ensures no loose ends: redundancy check, UI review, knowledge preservation, performance                |
| **When**     | End of every session — auto-triggered by Stage 8 detection                                             |
| **Creates**  | Updated docs, verification.md, README version history, changelog entry                                 |
| **Workflow** | `/final-review` or `/master-execution` (auto-detects session end)                                      |

> **Note:** This replaced the former `end.md` file. All unique content from `end.md` has been merged into the Master Prompt STEP 7.

---

## Prompt → Workflow Mapping

| #   | Prompt File                               | Slash Command                | When                             |
| --- | ----------------------------------------- | ---------------------------- | -------------------------------- |
| 00  | `MASTER RULES & WORKFLOW.md`              | _All workflows_              | Always (auto-loaded)             |
| 0   | `FEATURE RETRO DOCUMENTATION PROMPT.md`   | `/retro-doc`                 | Feature exists, no docs          |
| 1   | `CHATGPT-CONVERSATION-REVIEW.md`          | `/chatgpt-review`            | ChatGPT conversation to validate |
| 2   | `DOCUMENT CREATION PROMPT.md`             | `/new-feature`               | Creating 7 feature docs          |
| 3   | `VALIDATION FEEDBACK PROMPT.md`           | `/doc-feedback`              | ChatGPT reviewed our docs        |
| 4   | `IMPLEMENTATION PROMPT.md`                | `/new-feature`               | Writing code from impl.md        |
| 5   | `AFTER IMPLEMENTATION FEEDBACK PROMPT.md` | `/code-feedback`             | ChatGPT reviewed our code        |
| 6   | `DOCUMENTATION STRUCTURE PROMPT.md`       | `/doc-organize`              | Doc cleanup & organization       |
| 7   | `CODE REFACTORING PATTERNS.md`            | `/refactor-feature`          | Code cleanup patterns            |
| 8   | `EXISTING-FEATURE-REFACTORING.md`         | `/refactor-feature`          | Deep feature refactor            |
| 9   | `FINAL-VARIFICATION.md`                   | `/final-review`              | End-of-session review            |
| 10  | `CONTENT LAYERS PROMPT.md`                | `/new-feature`, `/retro-doc` | Website/help/firebase content    |
| —   | `MASTER-EXECUTION-PROMPT.md` (STEP 7)     | `/final-review`              | 8-phase session wrap-up protocol |

---

## Doc Types Created Per Feature (7 + changelog)

| Doc Type       | File Pattern            | Audience            | Internal/Public |
| -------------- | ----------------------- | ------------------- | --------------- |
| Spec           | `_spec.md`              | CEO/PM/Investors    | Internal        |
| Implementation | `_impl.md`              | Developers          | Internal        |
| Marketing      | `_marketing.md`         | Sales/Marketing     | Internal        |
| Website        | `_website.md`           | Potential customers | **PUBLIC**      |
| Help Doc       | `_helpdoc.md`           | Existing customers  | **PUBLIC**      |
| Firebase       | `_firebase.md`          | Founder/Developers  | **CRITICAL**    |
| README         | `README.md`             | All audiences       | Internal        |
| Changelog      | `__docs__/changelog.md` | All customers       | **PUBLIC**      |

---

## Critical Rules (from Master Rules)

| Rule                    | Meaning                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------- |
| **3-Year Freeze**       | Ship complete now. No "Phase 2" or "later" language.                                |
| **Codebase > ChatGPT**  | Our code is truth. ChatGPT suggestions must be verified.                            |
| **Full Doc Set**        | 7 docs per feature: spec + impl + marketing + website + helpdoc + firebase + README |
| **Feature Flags**       | Every feature gets a flag in `src/config/features.ts`                               |
| **Path Verification**   | Every claim links to exact `file:line` evidence                                     |
| **Type Check**          | `npx tsc --noEmit` before claiming done                                             |
| **Language Governance** | No "AI-powered", "Smart", "Dynamic" in public-facing content                        |
| **Firebase Tracking**   | Every read/write/delete documented — directly impacts revenue                       |

---

## Success Criteria — A Feature Is DONE When:

```
☑️ Critical review complete (Prompt 1)
☑️ 7 docs created: spec, impl, marketing, website, helpdoc, firebase, README (Prompt 2 + 10)
☑️ Changelog entry added
☑️ Code at exact paths from impl.md (Prompt 4)
☑️ Feature flag in src/config/features.ts
☑️ npx tsc --noEmit passes
☑️ _validation.md with 100% checklist pass
☑️ Language governance verified for website + helpdoc
☑️ Firebase costs documented for every read/write/delete
```

---

_See `__docs__/workflows-guide/README.md` for the slash-command workflow guide with usage examples._

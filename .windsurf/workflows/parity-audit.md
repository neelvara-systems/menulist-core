---
description: Deep spec-vs-code parity audit after feature implementation. Catches mismatches between documentation (spec/impl) and actual code. Run after every implementation session, before testing. Use when code is written but not yet tested.
---

# Post-Implementation Parity Audit

This workflow performs a **surgical, line-by-line comparison** between documentation (spec + impl) and actual codebase. It catches mismatches that file-by-file reviews miss because they verify files in isolation instead of cross-checking the FULL system map.

## Prerequisites

1. Read `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md`
2. Read `IDE_PROMPTS/12. POST-IMPL-PARITY-AUDIT.md` for the full methodology
3. Feature must have: `_spec.md` + `_impl.md` + implementation code committed

## Why This Exists

> **Lesson learned (Feb 18, 2026 — Messaging Onboarding):** After 3 iterations of file-by-file validation, 14 mismatches were still missed. File-by-file reviews verify "does this file look correct?" but miss "does the SYSTEM match the SPEC?" Cross-cutting concerns (state machine rules, forbidden transitions, message templates, publish pipeline fields) span multiple files and can only be caught by building a system map from docs, then comparing against a system map from code.

## STEP 1: Build Expected System Map (from docs ONLY)

Read EVERY doc file for the feature. Extract and list:

1. **All constants/limits** — exact values, exact names
2. **All state machine states** — transitions, terminal states, forbidden transitions
3. **All message templates** — exact text, exact trigger conditions
4. **All API contracts** — endpoints, Zod schemas, request/response shapes
5. **All DB schema fields** — every field, every type, every default
6. **All business logic rules** — rate limits, thresholds, timing windows
7. **All security rules** — token validation, signature checks, auth patterns
8. **All integration points** — what existing code is reused, how
9. **All publish/creation fields** — exact fields written to each collection
10. **All feature flags** — names, defaults, locations

**Output:** A mental checklist of "the docs say X should exist"

## STEP 2: Build Actual System Map (from code ONLY)

// turbo
Read EVERY implementation file. For each file, extract:

- What constants are defined (exact values)
- What states/transitions are implemented
- What messages are sent (exact text)
- What API endpoints exist (exact schemas)
- What DB fields are read/written
- What validation logic runs
- What helper functions are called vs inlined

**Output:** A mental checklist of "the code actually does Y"

## STEP 3: Cross-Compare (10 Areas)

For each of these 10 areas, compare docs vs code **line by line**:

| Area                      | What to Compare                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| **A. State Machine**      | States list, terminal states, forbidden transitions (each rule individually), transition function |
| **B. Constants & Limits** | Every numeric value, every string template, every threshold                                       |
| **C. Message Templates**  | Every message text (exact match), every trigger condition                                         |
| **D. API Contracts**      | Every endpoint, every Zod field, every response shape                                             |
| **E. DB Schema**          | Every field in every collection, types, defaults, nullability                                     |
| **F. Publish Pipeline**   | Every document created, every field written, every helper called                                  |
| **G. Security**           | Token generation, validation, signature checks, rate limit enforcement                            |
| **H. Integration Points** | Reused functions (called vs inlined/duplicated), import paths                                     |
| **I. Feature Flags**      | Names, defaults, locations (dashboard config vs CF constants)                                     |
| **J. Error Handling**     | Every failure scenario from spec, corresponding code path                                         |

## STEP 4: Classify Findings

For EVERY mismatch found, classify as:

| Classification | Meaning                                              | Action                       |
| -------------- | ---------------------------------------------------- | ---------------------------- |
| **MISMATCH**   | Spec says X, code does Y — they contradict           | Fix code to match spec       |
| **MISSING**    | Spec says X should exist, code doesn't have it       | Implement it                 |
| **EXTRA**      | Code has X, spec doesn't mention it                  | Evaluate: remove or doc it   |
| **DRIFT**      | Code roughly matches but text/values differ slightly | Fix to exact match           |
| **DUPLICATE**  | Same logic exists in 2+ places with different values | Consolidate to single source |

## STEP 5: Fix ALL Issues

Fix every finding — not just "blocking" ones. Priority order:

1. State machine integrity (breaks routing)
2. Security gaps (breaks safety)
3. Missing functionality (breaks user flow)
4. Logic drift (breaks spec compliance)
5. Duplicates (breaks maintainability)

## STEP 6: Re-Verify

After all fixes, re-run Steps 1-4 on the changed files to confirm:

- No new issues introduced
- All original findings resolved
- State machine transitions are correct
- All message templates match spec exactly

## STEP 7: Update Validation Doc

Update `__docs__/[feature-name]/[feature-name]_validation.md` with:

- Parity audit date
- Findings count (by classification)
- All fixes applied
- Final verdict: PASS or remaining issues

## STEP 8: Shared Data Parity Check (Law 4)

Verify ALL static data follows the Copy-Paste As-Is Rule (see `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md` Law 4):

1. **Scan `functions/src/` for inline static data** — business types, country codes, roles, currencies, filter lists
2. **For each found**: verify it imports from `functions/src/sharedData/` (NOT hardcoded inline)
3. **Compare `functions/src/sharedData/*.ts` vs `src/data/shared/*.ts`** — files must be byte-for-byte identical
4. **Compare `functions/src/sharedData/countryData.ts` vs `src/components/atoms/phoneNumberInput/countryData.ts`** — must be identical
5. **Flag any violations**: inline arrays, derived subsets, keyword-based matching that should use exact-match from shared data

Quick verify command:

```bash
diff src/data/shared/businessTypes.ts functions/src/sharedData/businessTypes.ts
diff src/data/shared/defaultRoles.ts functions/src/sharedData/defaultRoles.ts
diff src/components/atoms/phoneNumberInput/countryData.ts functions/src/sharedData/countryData.ts
```

## Anti-Patterns This Catches

| Anti-Pattern                    | Example                                                                     | Why File-by-File Misses It                          |
| ------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------- |
| **Partial forbidden list**      | Spec has 6 rules, code has 4 different ones                                 | Each file looks internally consistent               |
| **Inline duplication**          | Currency map in constants.ts (17 countries) AND approve route (5 countries) | Each file's map is valid on its own                 |
| **Wrong field in array**        | `providerMediaId` in message dedup array instead of `providerMessageId`     | Field name looks plausible in isolation             |
| **Missing terminal state**      | `COOLDOWN` not in `TERMINAL_STATES` array                                   | Array looks valid with 2 items                      |
| **Missing post-action**         | No WhatsApp confirmation after publish                                      | Publish code works, just missing the message send   |
| **Hardcoded vs shared helper**  | Inline roles array instead of `createDefaultRoles()`                        | Roles array works, just diverges from shared source |
| **Derived subset vs full copy** | 71-country lookup instead of 252-country copy                               | Subset works but misses countries                   |

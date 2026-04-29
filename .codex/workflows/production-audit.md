---
description: Run the 8-phase feature production audit after any feature implementation. Covers system consistency, E2E flow, chaos/failure, Firebase cost, Cloud Functions reliability, security, data integrity, and final GO/NO-GO. Proven across 9 real bugs found.
---

# Feature Production Audit (`/production-audit`)

Run after completing any significant feature implementation. This is the final verification gate before enabling a feature for real users.

**Proven results:** First used on Messaging Onboarding — 8 sessions, 9 bugs found and fixed (3 critical), system certified production-ready.

## When to Use

- After completing implementation of a new feature
- Before enabling a feature flag for production
- After major refactoring of an existing feature
- Before onboarding first users on a new flow

## How to Trigger

Say: `/production-audit` followed by the feature name or area to audit.

Example: `/production-audit messaging onboarding`

## Prerequisites

1. Feature implementation is COMPLETE (all files created, tsc passes)
2. Feature documentation exists in `__docs__/[feature-name]/`
3. Feature flag exists and is currently OFF

## Applicability Matrix

Not every feature needs all 8 phases. Cascade auto-selects based on what the feature touches:

| Feature Type                                     | Phases to Run       |
| ------------------------------------------------ | ------------------- |
| **UI-only** (new settings tab, new component)    | 1, 8                |
| **DAL + API routes** (new CRUD endpoint)         | 1, 2, 4, 6, 8       |
| **Cloud Functions** (schedulers, triggers)       | 1, 2, 3, 4, 5, 6, 8 |
| **External APIs** (WhatsApp, Gemini, Razorpay)   | ALL 8               |
| **Public pages** (preview, OBP, client menu)     | 1, 2, 6, 7, 8       |
| **Full pipeline** (onboarding, billing, publish) | ALL 8               |

Cascade evaluates the feature scope and announces which phases apply before starting.

## Execution Flow

Run applicable phases sequentially. Each phase builds on findings from previous phases.

### Phase 1: System Consistency Audit

// turbo

1. Discover the feature's complete file structure (backend, frontend, types, constants, docs)
2. Trace full dependency tree (if file A imports B, review B too)
3. Verify: code ↔ architecture ↔ documentation ↔ state machine ↔ Firebase usage are aligned
4. Check: type definitions match runtime data, imports are valid, constants are used (not hardcoded)
5. Fix any bugs found. Run `tsc --noEmit` — zero errors required.

**Key checks:**

- All collection names use `DB_COLLECTIONS.*` constants
- All feature flags exist in `src/config/features.ts`
- TypeScript types match actual Firestore document structures
- State machine transitions are guarded by forbidden transition checks
- Firestore indexes exist for all composite queries

### Phase 2: End-to-End Flow Simulation

// turbo 6. Trace the RUNTIME execution path from entry point to completion 7. At every stage verify: required data exists, Firestore writes are valid, expected state transition occurs 8. Simulate the full happy path with realistic data 9. Verify async pipeline coordination (no race conditions between services) 10. Confirm idempotency: duplicate operations don't create duplicate data

**Key checks:**

- Every function receives the data it needs (no undefined fields)
- State transitions follow the allowed paths
- Publish/create operations use Firestore transactions for atomicity
- Preview/token flows validate correctly

### Phase 3: Chaos & Failure Simulation

// turbo 11. Simulate failures at every stage: network errors, API timeouts, malformed responses, partial writes 12. Verify rate limiting and abuse protection caps 13. Simulate concurrent execution (duplicate webhooks, overlapping schedulers, double-submit) 14. Verify recovery paths: every failure leads to a safe state (FAILED, EXPIRED, or retry) 15. Confirm no session/data can be permanently stuck

**Key checks:**

- Every try/catch leads to a safe state
- Cost caps are enforced (per-user, per-session, per-day)
- Duplicate operations are idempotent
- 24h expiry catches anything that falls through

### Phase 4: Firebase Cost & Performance Audit

// turbo 16. Count exact Firestore reads/writes/deletes per operation lifecycle 17. Calculate worst-case document sizes (must stay under 500KB) 18. Verify all queries have matching composite indexes 19. Check Storage upload/cleanup lifecycle (no orphaned files) 20. Estimate cost at 100 / 1,000 / 10,000 operations per month

**Key checks:**

- No redundant reads (pass data between functions, don't re-fetch)
- All queries use `.limit()` caps
- Scheduler queries are bounded and won't scan full collections
- Storage cleanup covers all terminal states

### Phase 5: Cloud Functions Reliability Audit

// turbo 21. Verify function config: trigger type, memory, timeout, secrets, region 22. Confirm every CF that calls external APIs has the correct secrets declared 23. Verify idempotency under CF retry behavior 24. Check timeout safety: expected duration vs configured timeout 25. Verify error handling and logging quality in every function

**Key checks:**

- Secrets groups match what the function actually calls (CRITICAL — missing secrets = silent failures)
- Memory allocation matches workload (not over/under-provisioned)
- Webhook handlers respond before timeout, process async
- Scheduled functions are catch-up safe (query by timestamp, not "last run")

### Phase 6: Security Surface Audit

// turbo 26. Map all entry points (webhooks, API routes, public pages, Firestore triggers) 27. Verify authentication on every entry point (signature, token, session, or Firestore rules) 28. Verify Firestore rules deny client access to server-only collections 29. Verify Storage rules deny public access to feature-specific paths 30. Simulate attacks: token guessing, replay, spoofing, enumeration, cross-tenant access

**Key checks:**

- Webhook signatures use `req.rawBody` not `JSON.stringify(req.body)`
- Preview/access tokens use `crypto.randomBytes` with sufficient entropy (≥128 bits)
- All feature collections have `allow read, write: if false` in Firestore rules
- Input validation via Zod schemas on all API endpoints
- PII masked in logs (`userId.slice(-4)`)

### Phase 7: Production Readiness & UX Review

// turbo 31. Evaluate from PLATFORM OWNER perspective: monitoring, debugging, feature flag control 32. Evaluate from END USER perspective: simulate realistic user journey with messy inputs 33. Review message clarity, error handling UX, mobile responsiveness 34. Verify recovery capability: every stuck state has a bounded path to resolution 35. Issue GO / NO-GO recommendation with conditions

**Key checks:**

- Feature flag exists and is OFF by default
- Error messages are user-friendly (no jargon, no stack traces)
- Public pages are mobile-first with noindex/nofollow
- All states have bounded lifetime (expiry mechanism)

### Phase 8: Data Integrity & Schema Compatibility

// turbo 36. Compare every document the feature creates against existing TypeScript types 37. Verify new documents are compatible with existing dashboard UI / editor / renderers 38. Check data wrapper formats (e.g., `ExtractedData` requires `{ data: { categories, items } }`) 39. Verify tenant/store/user relationships are correct in publish/create pipelines 40. Confirm no partial or malformed data can reach production state

**Key checks:**

- Project files use `{ data: menuData }` wrapper matching `ExtractedData` schema
- Store documents include all required fields from `StoreDataType`
- Platform summary counters are updated atomically in transactions
- Null/undefined safety: all code paths handle missing fields gracefully

### Phase 9: 4-Layer Deep Audit (MANDATORY — Auto-triggered after Phase 8)

After Phases 1-8 pass, Cascade MUST automatically run the 4-Layer Deep Audit. This catches bugs that standard production audit misses.

**Layer A — Full Production Audit (13 stages):**
File discovery → line-by-line code review → doc-code parity → data structure audit → Firebase cost audit → CF audit → AI/prompt audit → UI/UX audit (SMB owner perspective) → owner journey simulation → edge case testing → security audit → implement all fixes → final report with verdict.

**Layer B — Destructive Audit (red team):**
Attempt to break every function: malformed AI responses, concurrent writes, rapid add/remove cycles, large payloads, empty inputs, cancelled operations, partial writes, cross-tenant access attempts. Fix all bugs found.

**Layer C — Nuclear Audit (extreme scale):**
Simulate at 100K/1M scale → Firebase cost explosion analysis → document size growth projection → chaos failure testing (API down, network fail, timeout) → prompt injection attacks → verify all failure paths lead to safe states.

**Layer D — Founder Paranoia Audit (long-term integrity):**
Data identity stability over years → schema evolution risk → state drift analysis → multi-tenant isolation → document size evolution → invariant validation → human error simulation → answer: "Could this system silently corrupt business truth after years of operation?"

**Reusable bug patterns to check in EVERY audit:**

1. Comma operator in template literals: `` `${a, b}` `` only outputs last value
2. Zod regex vs actual data: validation regex must match ALL real values in codebase
3. Raw data bypass after validation: always use `validation.data`, never `rawData`
4. JSON parse retry safety: null guard → try/catch → retry with inner try/catch
5. Empty messageType crash: `antdMessage[messageType]()` crashes if `""` — always guard
6. Primary entity skip: iteration over arrays must skip source/primary when processing targets
7. Constants never enforced: if threshold constants exist, verify code actually checks them
8. Orphaned data: when removing entities, verify data is cleaned up or intentionally preserved
9. **Unsafe JSON.parse on AI responses:** Every `JSON.parse` on external AI output MUST have its own try/catch with specific error logging — never rely on outer generic catch
10. **AI response type guard:** After parsing AI JSON, always verify the result is the expected type (object vs array vs string) before accessing properties like `Object.keys()`
11. **Error message leaks:** Never return `(error as Error).message` to client on API routes — internal error details (model names, API keys, stack traces) can leak. Return generic messages only.
12. **Prompt input sanitization completeness:** If ANY user-provided string is embedded in an AI prompt, ALL user strings must be sanitized — including language names, codes, and metadata fields, not just obvious inputs like item names
13. **console.error in frontend:** All `console.error` in components MUST be replaced with `logger.error` — `console.error` bypasses secure logging and may expose data in browser devtools
14. **Doc-code drift on locked decisions:** After major refactoring (e.g., reducing options), verify ALL doc files (spec, impl, firebase, README) reflect the new state — wireframes, tables, and matrices often go stale

**Output:** Each layer produces a verdict. Feature is production-ready only when ALL 4 layers pass.

## Bug Fix Rule

If ANY phase finds a bug:

1. Fix it immediately in that phase
2. Run `tsc --noEmit` — zero errors
3. Continue to the next phase
4. Report all fixes in the final summary

## Output

Each phase produces findings inline. The final phase produces a consolidated report with:

- Total bugs found and fixed
- Per-phase scores (/10)
- Overall production readiness score
- GO / NO-GO recommendation with conditions
- Remaining risks and recommended next steps

## Guardrails

- Every finding must reference the actual file and line number
- Fix bugs immediately — never defer to "future cleanup"
- Respect existing architecture — no unnecessary refactoring during audit
- `tsc --noEmit` must pass with zero errors after every fix
- The audit is about SAFETY and CORRECTNESS, not feature additions

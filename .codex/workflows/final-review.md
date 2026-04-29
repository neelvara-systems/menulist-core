---
description: End-of-session comprehensive review. Runs the full verification checklist - codebase vs docs, redundancy check, UI review, type check. Use before ending any coding session.
---

# Final Session Review & Verification

This workflow runs the end-of-session review. The full protocol is defined in `IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md` (STEP 7 — Session Lifecycle, "At Session End" section with 8 phases).

## Prerequisites

1. Read `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md`
2. Read `IDE_PROMPTS/9. FINAL-VARIFICATION.md` for the full checklist
3. Read `IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md` STEP 7 for the 8-phase end-of-session protocol

## Phase 1: Cross-Check Review

1. **Codebase review**: Go through all files modified in this session line by line
2. **Chat ↔ Codebase**: Cross-check cascade chat messages with codebase — ensure everything discussed is covered
3. **Codebase → Docs**: Is everything implemented also documented? (codebase = primary source)
4. **Docs → Codebase**: Is everything documented also implemented? (docs = primary source)
5. **Master Rules compliance**: Cross-check against `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md`
6. **Project consistency**: Check consistency with overall project architecture

## Phase 1B: Doc Staleness Sweep (CRITICAL — Added Feb 13, 2026)

> **Lesson Learned:** Stale `_firebase.md`, `_helpdoc.md`, `_website.md`, and `_marketing.md` files were missed during cross-checks because only `_impl.md` and `_spec.md` were verified. This phase prevents that.

For EVERY feature folder touched in this session:

6a. **List ALL doc files** in `__docs__/[feature-name]/` (excluding `_archive/`)
6b. **Check "Last Updated" date** on EVERY file — if older than the current session date, flag it
6c. **Read and verify flagged files** against codebase truth: - `_firebase.md` — Are all reads/writes/deletes accurate? Any new DAL functions or API routes this session? - `_helpdoc.md` — Does customer-facing info reflect current feature behavior? - `_website.md` — Does landing page copy reflect current capabilities? - `_marketing.md` — Does pitch messaging reflect current feature set? - `_spec.md` — Does scope and feature list match what's actually implemented? - `_impl.md` — Are file paths, types, and code references still correct?
6d. **Update stale files** — fix content, update date, add scope cross-references to related features
6e. **Cross-check related feature folders** — if you touched permissions, also sweep stores-management, multi-outlet-consistency, roles-permissions docs (and vice versa)

## Phase 2: Redundancy & Consolidation (per IDE_PROMPTS/7. CODE REFACTORING PATTERNS.md)

7. **Redundant constants/types**: Same data in multiple files?
8. **Multi-update check**: Adding a new item requires updating 2+ places? → consolidate
9. **Lookup tables**: Can be replaced with type extension fields?
10. **Small file consolidation**: Files with 1-3 exports → merge with related files
11. **Icon string pattern**: React elements in data layer → convert to string names + ICON_MAP
12. **Import updates**: All dependents updated after consolidation
13. **Delete redundant files**: After moving contents

## Phase 3: UI/UX Review (if applicable)

14. **Honest feedback** on UI components — what works vs needs improvement
15. **User-friendliness** cross-check
16. **Visual previews**: emoji icons, thumbnails where helpful
17. **Toggle clarity**: Descriptive labels, collapse advanced options by default

## Phase 4: Fix & Verify

18. **Fix any bugs/issues** discovered during review
19. **Update documentation** for things in codebase but missing from docs
    // turbo
20. **Type check**: Run `npx tsc --noEmit`

## Phase 4B: Operational Monitoring Verification (Law 12 — Added Feb 20, 2026)

> **Every API route and Cloud Function must have proper monitoring.**

For EVERY API route or Cloud Function modified/created in this session:

20a. **SAFE_MODE check**: Does this route call any AI API (OpenAI, Gemini, etc.)? → MUST have `checkSafeMode()` before rate limiting
20b. **Rate limiting**: Does this route mutate state (write, update, delete)? → MUST have rate limiting from `src/lib/rateLimit/configs.ts`
20c. **Alerting**: Does this route handle payments, webhooks, or critical operations? → Failure path MUST call `createAlert()` with appropriate severity
20d. **Health verification**: Does this route publish content to a public URL? → MUST fire `verifyMenuPublish()` after success (fire-and-forget)
20e. **Feature flag**: Does this add a new monitoring capability? → MUST have a flag in `src/config/features.ts` defaulting to OFF

Quick reference — which config for which route type:

- AI text routes → `AI_OPERATION` (20/min) + `checkSafeMode()`
- AI image routes → `AI_EXPENSIVE` (5/min) + `checkSafeMode()`
- Auth mutations → `AUTH_SENSITIVE` (5/15min per IP)
- Payment mutations → `SUBSCRIPTION_MUTATION` (5/hour per user)
- Public endpoints → IP-based rate limit key
- Authenticated endpoints → userId-based rate limit key

## Phase 5: Content Layers Verification

21. **Website content check**: For every feature touched, does `_website.md` exist and reflect current state?
22. **Help doc check**: For every feature touched, does `_helpdoc.md` exist and reflect current state?
23. **Firebase cost check** (CRITICAL): For every feature touched, does `_firebase.md` exist? Are ALL reads/writes/deletes documented? Any new DAL functions or API routes added this session?
24. **Changelog entry**: Add entries to `__docs__/changelog.md` for all session changes (New/Improved/Fixed)
25. **Language governance**: Verify all public-facing content (website + helpdoc) follows constitution language rules

## Phase 5B: Mobile Verification (MANDATORY — Law 11, Updated Feb 15, 2026)

> **Mobile is core, not optional.** A feature without its mobile component is INCOMPLETE.
> PWA-only users are first-class citizens — they may never open the desktop dashboard.

For EVERY feature touched in this session:

26. **Check `_mobile-support.md` exists** — every feature folder MUST have one
27. **If missing, create it** — run Feature Admission Test (4 gates: Frequency, Speed, Touch, Value)
28. **If mobile-relevant feature was modified**: verify mobile component still works with updated DAL/hooks
29. **Mobile data format audit** (CRITICAL — prevents silent data corruption):
    - Compare mobile screen logic line-by-line against desktop counterpart
    - Verify field names match Firestore schema exactly (e.g., `customerEmail` not `email`)
    - Verify DAL return shapes match (e.g., `result.items` not `result.feedbacks`)
    - Verify status values, date formats, key names identical to desktop
    - Verify mobile uses same shared constants (e.g., `BUSINESS_TYPES` from `@constant/common`)
30. **If mobile component is missing for a mobile-relevant feature**: build it in this session — do NOT defer
31. **Verify mobile inherits**: localization (next-intl, RTL), auth (NextAuth session, RBAC), settings (theme, language, timezone from AppSettings Redux state)

## Phase 6: Documentation & Wrap-up

30. **Update verification.md**: Log all changes and decision rationale (the "why")
31. **Update README.md**: Version history
32. **Scope for improvement**: Log any improvement opportunities
33. **Gather reusable instructions**: Add to `IDE_PROMPTS/` if new patterns discovered (per Law 7)
34. **Report items needing discussion**: Flag at end of session

## Guardrails

- Every change must have documented rationale
- No files deleted without moving contents first
- Type check must pass before session ends
- New patterns discovered → immediately add to IDE_PROMPTS (Law 7: Continuous Improvement)
- Content layers (website + helpdoc + firebase + changelog) must be verified for every feature touched
- Firebase tracking is CRITICAL — every new read/write/delete MUST be added to \_firebase.md
- **Proactive Fix Rule (Law 10):** If you identify a clear issue (duplication, stale ref, bug, inconsistency) during review — fix it immediately and report. Do NOT defer to "future cleanup." If you know the problem AND the fix, you have both the authority and obligation to fix it now.

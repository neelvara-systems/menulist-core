# FINAL FEATURE HARDENING + DOCUMENT GOVERNANCE PROMPT

**Purpose:** Pre-launch vertical audit for a single feature. Covers UI/UX, logic, data, security, failure, cost, scalability, industry benchmarks, and documentation reconciliation.
**When to use:** After implementation is complete and parity-tested. Before declaring feature production-ready.
**Integrates with:** `/parity-audit` (run BEFORE this), `/final-review` (run AFTER this)

---

You have full access to:

- Entire MenuList codebase
- Entire `__docs__/` directory
- Cascade history/logs (if available)
- All rules in `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md` (13 Laws)
- All rules in `.cascade/rules/` (Security, Mobile, Documentation)
- All constitution documents in `__docs__/constitution/`

We are now performing a FULL production hardening audit of a single feature.

FEATURE NAME:
<<FEATURE_NAME>>

FEATURE INTENT (business + architectural purpose):
<<FEATURE_DESCRIPTION>>

CRITICAL CONTEXT:

For this feature, documentation exists inside:

`__docs__/[feature-name]/`

This documentation set is our long-term Single Source of Truth.

At minimum:

- `_spec.md` (business requirements)
- `_impl.md` (technical blueprint)

Often also:

- `_firebase.md` — Firebase cost tracking (reads/writes/deletes)
- `_mobile-support.md` — Mobile admission test + relevance decision
- `_test-cases.md` — QA matrix
- `README.md` — Index + navigation
- `_marketing.md` — Internal sales/marketing
- `_website.md` — Public landing page content
- `_helpdoc.md` — Public customer help article
- `_archive/` folder — Historical files (never deleted)

These documents MUST be reviewed before auditing code.

However:
At this stage, if discrepancy exists between docs and codebase,
CODEBASE IS TEMPORARY SOURCE OF TRUTH.
You must:

- Identify discrepancy
- Decide which is correct
- Fix mismatch
- Update docs accordingly

---

## GLOBAL CONSTRAINTS

Do NOT:

- Propose unrelated new features
- Expand scope beyond this feature
- Change architecture
- Introduce structural migrations
- Increase Firebase cost
- Say "will fix in future cleanup" (Law 10: fix it now or don't mention it)

Only:

- Harden
- Secure
- Optimize
- Fix
- Align
- Document
- Validate against doctrine

**Proactive Fix Rule (Law 10):** If you identify a clear issue AND know the fix — fix it immediately. Report what was found and fixed. Do NOT defer.

---

## PHASE 0 — DOCUMENT FIRST REVIEW

Before touching code:

1. Read ALL files in:
   `__docs__/[feature-name]/` (excluding `_archive/`)

2. Build structured understanding of:
   - Business intent
   - Technical architecture
   - Data model (Firestore collections, fields, read/write patterns)
   - Cost model (from `_firebase.md`)
   - Mobile relevance (from `_mobile-support.md`)
   - Known constraints
   - Historical decisions (check `_archive/` if needed)

3. Read:
   - `__docs__/changelog.md` (relevant entries for this feature)
   - `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md` (all 13 Laws)
   - `.cascade/rules/SECURITY_IMPLEMENTATION_RULES.md`

4. Read relevant constitution documents:
   - `__docs__/constitution/01-core-doctrine.md` (10 Laws of MenuList)
   - `__docs__/constitution/05-failure-refusal-matrix.md` (what system refuses to do)
   - `__docs__/constitution/02-language-governance.md` (if feature has public copy)

5. Cross-check cascade history (if available):
   - Were decisions made that are not logged in docs?
   - Are explanations missing?
   - Are tradeoffs undocumented?

Output:

- Summary of documented intent
- Gaps in documentation (missing doc types, stale dates)
- Mismatch between docs and current understanding

Do NOT audit code yet.

---

## PHASE 1 — FEATURE MAPPING (CODE + DOC ALIGNMENT)

Now map feature end-to-end from codebase.

Output:

- Entry points (UI routes/components) — exact `file:line`
- Frontend modules (components, hooks, types)
- Backend/services (API routes, Cloud Functions)
- Database collections/paths (from `DB_COLLECTIONS` constants)
- All reads (collection, trigger, frequency)
- All writes (collection, trigger, fields, merge vs set)
- All async jobs (Cloud Functions, schedulers)
- Feature flags (`src/config/features.ts` AND `functions/src/constants/features.ts`)
- External APIs (OpenAI, Gemini, Razorpay, etc.)
- Schema usage (types, Zod schemas)
- Validation layers (withAuth, Zod, rate limiting)
- Cost-relevant operations (AI calls, batch writes)

Then compare:

Docs vs Codebase

List:

- Doc says X, code does Y
- Code implements behavior undocumented
- Documentation outdated or incomplete

For each discrepancy:

- Which is correct?
- Why?
- What must be updated?
- Apply fix (code or docs)

At this stage:
Codebase = authoritative truth unless obviously incorrect.

---

## PHASE 2 — UI / UX AUDIT

Check:

- Broken states (empty, error, loading, success, partial)
- Missing loading states (skeleton, spinner, disabled buttons)
- Error states (toast, inline error, fallback)
- Silent failures (operations that fail without surfacing error)
- Double-click risks (duplicate submissions)
- Race conditions (concurrent edits, stale data)
- Data loss possibility (unsaved changes, browser refresh)
- Inconsistent messaging (different error text for same failure)
- Mobile breakpoints (if feature has mobile UI)
- UX behavior that may corrupt data (drag-drop ordering, batch actions)
- ICP compliance: zero jargon, 44px touch targets, instant feedback

Output:

- Issue
- File (exact `file:line`)
- Impact
- Severity (critical/high/medium/low)
- Fix applied (if critical/high)

---

## PHASE 3 — LOGIC & VALIDATION AUDIT

Check:

- Validation bypass possibilities
- Rule inconsistency (different enforcement in different paths)
- Duplicate logic (same function in multiple files)
- Missing guards (null checks, type checks, boundary checks)
- Idempotency (same operation twice = same result?)
- Race conditions (concurrent writes, read-then-write patterns)
- Single Source of Truth violations (data in 2+ places that can drift)
- Hard-coded assumptions (magic numbers, inline arrays)
- createdOn/modifiedOn consistency
- Multi-language integrity (translations, RTL support)
- Multi-outlet inheritance integrity (master → outlet propagation)
- `_mce` metadata integrity (Menu Correctness Engine stamps)
- menuVersion integrity (version increment on publish)
- Any atomicity violation (multi-step operations that should be atomic)
- DAL pattern compliance:
  - Uses `DB_COLLECTIONS` constants (not hardcoded strings)
  - Uses `apiCallComposer` wrapper
  - Uses `requestBodyComposer` for writes
  - Proper `tId`/`sId` tenant isolation in queries
  - Awaits collection refs: `query(await getCollectionRef(), ...)`

Output:

- Logic flaw
- Exact file/function (`file:line`)
- Failure scenario
- Severity
- Fix applied

---

## PHASE 4 — FIRESTORE & DATA LAYER AUDIT

Check:

- Tenant isolation enforcement (every query has tId/sId filters)
- Missing tId/sId filters (any query without tenant scoping)
- Unsafe overwrites (`setDoc` without `{ merge: true }` where merge is needed)
- Partial writes (multi-doc updates that can leave inconsistent state)
- Batch safety (batches within 500-doc Firestore limit)
- Transaction necessity (read-then-write patterns that need atomicity)
- Document size growth (fields that grow unbounded)
- Nested structure growth (arrays/maps that grow without limit)
- Index risk (composite queries without indexes in `firestore.indexes.json`)
- Unnecessary reads (data fetched but not used)
- Unnecessary writes (writes that don't change data)
- Realtime listener misuse (listeners not cleaned up on unmount)
- Merge vs set correctness (`setDoc` vs `updateDoc` vs `setDoc` with merge)
- `sanitizeForFirestore()` wrapping (undefined → null conversion before writes)
- Shared data parity (Law 4):
  - `src/data/shared/*.ts` vs `functions/src/sharedData/*.ts` — must be identical
  - No inline static data in `functions/src/` (business types, roles, etc.)

Output:

- Data risk
- Location (`file:line`)
- Impact
- Severity
- Fix applied

---

## PHASE 5 — SECURITY AUDIT

Assume hostile actor with knowledge of API structure.

Check:

- Cross-tenant access (can user A read/write user B's data?)
- Write privilege escalation (can non-admin perform admin actions?)
- Feature flag bypass (can disabled feature be accessed directly?)
- Public endpoint exposure (routes without auth that should have auth)
- Webhook validation (signature verification on incoming webhooks)
- Signed URL misuse (expiry, scope, access control)
- Sensitive data leakage (PII in logs, responses, error messages)
- Secure logging compliance:
  - No `console.log` → must use `secureLog`
  - No `console.error` → must use `secureError`
  - No sensitive data in log output (passwords, tokens, keys)
- Rate limiting enforcement (per Law 12):
  - AI routes → `AI_OPERATION` or `AI_EXPENSIVE` + `checkSafeMode()`
  - Auth routes → `AUTH_SENSITIVE` (5/15min per IP)
  - Payment routes → `SUBSCRIPTION_MUTATION` (5/hour per user)
  - Publish routes → `PUBLISH_OPERATION` (5/10min per IP)
  - Public endpoints → IP-based key
  - Authenticated endpoints → userId-based key

Output:

- Attack vector
- Exploit path
- Impact
- Fix applied

---

## PHASE 6 — FAILURE & RECOVERY SIMULATION

Simulate:

- Firebase failure mid-write (partial state committed)
- Network drop (client loses connection mid-operation)
- Browser refresh mid-action (user closes tab during save)
- Concurrent edit (two devices editing same data)
- Async crash (Cloud Function timeout, memory exceeded)
- External API failure (OpenAI down, Razorpay timeout)
- Publish interruption (publish pipeline fails midway)
- Partial state commit (multi-doc update where some succeed, some fail)

For each:

- Current behavior (what actually happens today)
- Data risk (can data be corrupted?)
- User-visible effect (what does the user see?)
- Safeguard implemented or required

Fix critical/high immediately.

Special attention:

- Identify any **silent failure risks** (operations that fail without surfacing error to user)
- List operations that MUST be atomic but currently are NOT

---

## PHASE 7 — COST & PERFORMANCE AUDIT

Check:

- Editor load read count (how many Firestore reads per page load?)
- Document size reads (large docs fetched repeatedly?)
- Re-render loops (React components re-rendering unnecessarily)
- AI call inefficiencies (duplicate calls, missing caching)
- PDF/image regeneration triggers (unnecessary regen on minor edits)
- Translation batching (individual calls vs batched)
- Webhook frequency (too many webhooks for small changes)
- Listener overuse (realtime listeners where polling or cache would work)
- Background job loops (Cloud Functions running unnecessarily)
- Missing caching opportunities (SWR, unstable_cache, localStorage)

Simulate:

300 SMBs using this feature daily.

What spikes cost first?

Cross-check against `_firebase.md`:

- Are all reads/writes documented?
- Are cost estimates still accurate after hardening changes?

Apply safe optimizations if necessary.
Do NOT change architecture.

---

## PHASE 8 — SCALABILITY STRESS TEST

Assume:

- 1 business → 20 outlets (multi-outlet chain)
- 5 languages active
- 500 items per menu
- Frequent publish (5+ per day)
- Heavy edit activity (50+ edits per day)

Will this feature:

- Corrupt inheritance? (master → outlet propagation)
- Cause write contention? (concurrent writes to same doc)
- Hit Firestore limits? (1MB doc size, 1 write/sec/doc)
- Degrade UX? (slow loads, timeouts)
- Increase cost non-linearly? (O(n²) patterns)

List bottlenecks.
Fix critical/high.

---

## PHASE 9 — INDUSTRY BENCHMARK VALIDATION

If needed, perform web research.

Check:

- How mature SaaS products implement similar feature
- Industry best practices
- Common failure patterns to avoid
- Cost containment patterns
- Security expectations (OWASP, FTC compliance if relevant)
- UX standards for this type of feature

Then answer:

- Are we aligned with industry-grade execution?
- Are we missing a critical safeguard?
- Are we over-engineering?
- Are we under-protecting?

If improvement required:
Implement minimal corrective adjustment.
Do NOT change architecture.

---

## PHASE 10 — IMPROVEMENT LOGGING DISCIPLINE

If during audit you discover:

- Sensible future improvement
- Optimization opportunity
- Architectural refinement (non-breaking)
- Better UX clarity

Do NOT silently ignore.

Instead:

1. Log under appropriate file in `__docs__/[feature-name]/`
2. Clearly mark:
   - "Future Consideration"
   - "Not implemented in this hardening cycle"
3. Do not expand scope now.

---

## PHASE 11 — MENULIST-SPECIFIC COMPLIANCE CHECKS

These are checks specific to our codebase laws that ChatGPT doesn't know about.
Run ALL of these after fixing issues from Phases 1-10.

### 11A. Feature Flag Verification (Law 5)

- Feature has flag in `src/config/features.ts` with format `ENABLE_[FEATURE_NAME]`
- If Cloud Functions involved: mirror flag in `functions/src/constants/features.ts`
- Flag defaults to OFF (zero cost when disabled)

### 11B. Mobile Compliance (Law 11)

- `_mobile-support.md` exists in feature doc folder
- 4-gate admission test results documented (Frequency/Speed/Touch/Value)
- If gates pass and mobile UI exists:
  - Mobile screens use SAME DAL + hooks as desktop (no separate mobile DAL)
  - Mobile data format matches desktop exactly (field names, value formats, DAL return shapes)
  - Mobile uses `react-icons/lu` (Lucide) only
  - Touch targets 44px minimum
  - Optimistic updates implemented
- If mobile UI should exist but doesn't → FLAG as critical gap

### 11C. Operational Monitoring (Law 12)

For every API route and Cloud Function in this feature:

- AI routes → has `checkSafeMode()` BEFORE rate limiting
- Mutation routes → has rate limiting from `src/lib/rateLimit/configs.ts`
- Payment/webhook failures → calls `createAlert()` with appropriate severity
- Publish operations → fires `verifyMenuPublish()` after success
- New monitoring capabilities → have feature flag in `config/features.ts`

### 11D. Launch Prerequisites (Law 13)

If feature requires manual setup (secrets, API keys, environment variables, Firestore indexes, Cloud Function deployment):

- Verify `__docs__/production-readiness/launch-prerequisites.md` is updated
- All deployment steps documented

### 11E. Shared Data Parity (Law 4)

If feature uses static data (business types, country codes, roles, currencies):

- Primary source in `src/data/shared/` — no framework imports, pure TypeScript
- Backend mirror in `functions/src/sharedData/` — byte-for-byte identical
- No inline static data arrays in `functions/src/` code

### 11F. Constitution Alignment

Verify feature behavior aligns with:

- The 10 Laws of MenuList (`__docs__/constitution/01-core-doctrine.md`)
- Especially: Law 1 (Default Authority), Law 5 (Public Surfaces Demand Perfection), Law 6 (No Cognitive Load)
- Feature Rejection Gate — does this feature still pass the 5 questions?
- Language Governance — all public copy follows approved language rules

### 11G. Secure Logging

- No `console.log` in API routes or Cloud Functions → use `secureLog`
- No `console.error` in API routes or Cloud Functions → use `secureError`
- No sensitive data in log output

---

## PHASE 12 — DOCUMENTATION RECONCILIATION

After ALL fixes:

You MUST:

1. Update (only if content changed):
   - `_spec.md` (if behavior changed)
   - `_impl.md` (if logic adjusted, file paths changed, new functions added)
   - `_firebase.md` (if cost impact changed, new reads/writes/deletes)
   - `_mobile-support.md` (if relevance clarified or mobile UI changed)
   - `_test-cases.md` (if logic changed)
   - `_helpdoc.md` (if customer-facing behavior changed)
   - `_website.md` (if capabilities changed)
   - `_marketing.md` (if feature set changed)
   - `README.md` (if file structure or feature flags changed)

2. Doc staleness sweep (Law 9):
   - Check "Last Updated" date on EVERY doc file
   - If older than current session → read and verify against codebase
   - Update stale files

3. Ensure:
   - No undocumented behavior exists
   - All important decisions logged with reasoning
   - Tradeoffs explained
   - Cascade-only knowledge migrated into docs
   - Documentation quality remains high
   - Docs reflect actual implementation precisely
   - Every claim links to exact `file:line`

4. Cross-reference:
   - If feature touches permissions → also check `roles-permissions` docs
   - If feature touches stores → also check `stores-management` docs
   - If feature touches billing → also check `razorpay` docs

5. Confirm:
   - Full alignment with doctrine and system constitution
   - No workflow violations
   - No rules bypassed

6. Update `__docs__/changelog.md`:
   - Add entries for any fixes applied during hardening
   - Group: Improved → Fixed

---

## PHASE 13 — TYPE CHECK & VERIFICATION

// turbo
Run `npx tsc --noEmit` to verify no type errors after all changes.

If errors found:

- Fix them
- Re-run
- Only proceed when clean

---

## PHASE 14 — FINAL STRICT SUMMARY

Output:

1. Critical issues found (count + list)
2. High issues found (count + list)
3. Medium issues found (count + list)
4. Fixes applied (summary table: issue → file → fix)
5. Documentation updated (list all files modified)
6. Cost impact (increase / decrease / neutral — with reasoning)
7. Security status (PASS / FAIL — with details)
8. Mobile compliance (PASS / N/A / GAPS)
9. Operational monitoring compliance (PASS / GAPS)
10. Constitution alignment (PASS / VIOLATIONS)
11. Is feature production-grade? (yes/no with reasoning)
12. Can this run 3 years without architectural rewrite? (yes/no)
13. Any irreversible architectural risks?
14. Type check result (PASS / FAIL)

Be strict.
Assume MenuList becomes global infrastructure.
Assume owner never opens desktop — only uses phone (PWA).

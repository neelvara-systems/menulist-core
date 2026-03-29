---
description: Run a full infrastructure audit on the codebase. Scans for security gaps, cost bombs, stale sessions, logging violations. Use for periodic health checks or before major releases.
---

# System Infrastructure Audit

This workflow captures the process used in the system-strengthening phase — a comprehensive codebase audit for infrastructure issues.

## Prerequisites
1. Read `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md`
2. Read `.cascade/rules/SECURITY_IMPLEMENTATION_RULES.md` — 20 mandatory rules
3. Read `__docs__/system-strengthening/README.md` for previous audit findings

## Execution Steps

### Phase 1: Security Scan

1. **API Route Auth Audit**: Scan ALL files in `src/app/api/` for:
   - Missing `withAuth()` on protected routes
   - Missing Zod input validation
   - Missing rate limiting on expensive operations
   - Commented-out auth checks
   - `console.log` / `console.error` instead of `secureLog` / `secureError`

2. **Public Endpoint Audit**: For intentionally public routes:
   - Verify rate limiting exists (`checkPublicRateLimit`)
   - Verify input sanitization
   - Verify no sensitive data exposed

### Phase 2: Data Integrity Scan

3. **DAL Pattern Compliance**: Scan `src/database/*/index.ts` for:
   - Module-level `let session: any = null` (stale session risk)
   - Missing `apiCallComposer` wrapper
   - Missing `requestBodyComposer` for writes
   - Hardcoded collection names (must use `DB_COLLECTIONS`)
   - Missing `tId`/`sId` isolation in queries

4. **Firestore Write Discipline**: Check all write paths for:
   - `sanitizeForFirestore()` wrapping (undefined → null)
   - Proper error handling
   - Write-after-read patterns that could cause stale data

### Phase 3: Cost & Performance Scan

5. **AI Route Cost Bombs**: Scan for AI-related routes without:
   - Rate limiting (`checkExpensiveAILimit`)
   - Input size limits
   - Timeout handling

6. **Client-Side Cost Bombs**: Check for:
   - Uncontrolled Firebase listeners (missing cleanup)
   - Full collection reads without limits
   - Missing localStorage/SWR caching where appropriate

7. **Performance Issues**: Check for:
   - Sequential `await` calls that could be `Promise.all`
   - Full document rewrites where merge updates would work
   - Missing `unstable_cache` or `react.cache` for request dedup

### Phase 4: Logging Compliance

8. **Secure Logging Audit**: Count violations:
   - `console.log` instances (should be `secureLog`)
   - `console.error` instances (should be `secureError`)
   - Sensitive data in log output (passwords, tokens, keys)

### Phase 5: Document Findings

9. **Create/Update** `__docs__/system-strengthening/system-strengthening_impl.md`:
   - Each finding: ID, severity (CRITICAL/HIGH/MEDIUM), file:line, description, proposed fix
   - Implementation priority phases
   - Estimated effort

10. **Update** `__docs__/system-strengthening/README.md` with findings summary

## Output Format

For each finding:
```
### SS-[N]: [Title]
**Severity:** CRITICAL / HIGH / MEDIUM
**Risk:** [What could go wrong]
**File:** `src/path/file.ts:line`
**What's wrong:** [Code snippet]
**Proposed fix:** [Solution]
**Effort:** [X hours]
```

## Guardrails
- Document ONLY — no implementation in this workflow
- Every finding must have exact file:line reference
- Severity classification must be justified
- Cross-reference with `.cascade/rules/SECURITY_IMPLEMENTATION_RULES.md`

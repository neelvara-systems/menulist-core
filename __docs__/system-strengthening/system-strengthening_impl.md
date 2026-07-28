# System Strengthening — Implementation Plan

**Phase:** System Strengthening  
**Date:** February 7, 2026  
**Auditor:** Cascade (Lead Architect)  
**Method:** Full codebase scan — Database layer, API routes, Hooks, Components, Middleware  
**Governing Rule:** 3-Year Architecture Freeze (Law 1)

---

## Audit Methodology

Scanned the entire `src/` directory for:
1. **Security gaps** — missing auth, missing rate limiting, exposed endpoints
2. **Data integrity risks** — stale sessions, cross-tenant leakage, write side effects in reads
3. **Cost bombs** — uncontrolled AI calls, full doc rewrites, sequential writes
4. **Performance issues** — sequential reads, missing parallelization
5. **Logging compliance** — console.log vs secure logger (per Security Rule 18)

---

## Current Status — July 2, 2026

This document preserves the original Feb 7 audit below. The current production-readiness state is source-gated by:

```bash
npm run verify:system-strengthening
```

| Finding | Current Status | Current Source Evidence |
| ------- | -------------- | ----------------------- |
| SS-1 GA analytics API auth | Closed | `scripts/verification/verify-system-strengthening-boundary.js` verifies active analytics handlers are wrapped by `withAuth`; GA reads also keep read rate limiting, analytics permission checks, property scoping, and bounded analytics failure logging. |
| SS-2 stale DAL session caching | Closed | The verifier checks the original 10 DAL files no longer contain module-level `let session` caches or `session = Boolean(session)` reuse and still fetch through `getActiveSession()`. |
| SS-3 batch image worker auth | Closed | The worker route requires `project-id`, `BATCH_IMAGE_GENERATION_WORKER_SECRET`, `timingSafeEqual`, bounded JSON, schema validation, job scope checks, AI capacity, and accounting before provider work. |
| SS-4 screen signal rate limiting | Closed | `/api/screen/seen` now rejects oversized declared bodies, rate-limits hashed IP before body parse, rate-limits hashed token before the write, and performs only the daily signal update. |
| SS-5 AI route rate limiting | Closed | The original AI route group is guarded by SAFE_MODE, rate limiting helpers, bounded bodies where applicable, validation, permission checks, capacity checks, and accounting/source logging. |
| SS-6 chat feedback full-array rewrite | Accepted | `updateMessageFeedback()` keeps feedback on the bounded session message array by design so reopened chat sessions preserve feedback with the original message shape. |
| SS-7 subscription read/write side effect | Closed | Browser reads return no active subscription after grace expires without mutating billing docs; server-owned expiry writes remain the authoritative state transition and entitlement sync path. |
| SS-8 preset cascade sequential/stale writes | Closed | Preset cascades use document-ID pagination, bounded concurrency, transaction-current project reads, files-only writes, scope checks, and post-commit public cache revalidation. The former batch implementation was faster but could replace concurrent project edits with a stale full snapshot. |
| SS-9 API/DAL console logging | Closed | The verifier scans `src/app/api` and `src/database` and fails on `console.log`, `console.warn`, or `console.error`. |

The historical findings below are retained for audit traceability and should not be read as current open work unless the source gate fails.

---

## 🔴 CRITICAL FINDINGS (Security / Data Integrity)

### SS-1: GA Analytics API Routes — ZERO Authentication

**Severity:** 🔴 CRITICAL  
**Risk:** Anyone with the URL can query Google Analytics data for any property  
**Impact:** Data exposure, potential abuse of GA API quotas

**5 routes with NO auth check, NO rate limiting:**

| Route | File | Line |
|-------|------|------|
| `GET /api/analytics` | `src/app/api/analytics/route.ts` | :11 |
| `GET /api/analytics/realtime` | `src/app/api/analytics/realtime/route.ts` | :11 |
| `GET /api/analytics/locations` | `src/app/api/analytics/locations/route.ts` | :11 |
| `GET /api/analytics/menu` | `src/app/api/analytics/menu/route.ts` | :11 |
| `GET /api/analytics/reports` | `src/app/api/analytics/reports/route.ts` | :4 |

**What's wrong:**
```typescript
// src/app/api/analytics/route.ts:11
export async function GET(request: Request) {
    // NO auth check — anyone can call this
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    // Directly queries Google Analytics with user-supplied propertyId
}
```

**Fix:** Add `getActiveSession()` auth check + rate limiting to all 5 routes. Or better: evaluate if these routes are still used — they may be legacy from early GA integration. If unused, **delete them**.

---

### SS-2: Module-Level Stale Session Caching in 10+ DAL Files

**Severity:** 🔴 CRITICAL  
**Risk:** Cross-tenant data leakage in serverless environment  
**Impact:** User A's session could be used for User B's Firestore queries

**Pattern found in 10 DAL files:**
```typescript
// Module-level mutable variable — DANGEROUS in serverless
let session: any = null;

const getCollectionRef = async () => {
    // Only fetches session ONCE, then reuses stale value
    session = Boolean(session) ? session : await getActiveSession();
    return collection(firebaseClient, `${COLLECTION}/${session.tId}/${session.sId}`);
};
```

**Why this is dangerous:**
On Vercel serverless, module-level variables persist across invocations within the same cold start (function instance). This means:
- User A makes a request → session cached at module level
- User B makes a request to same instance → gets User A's session
- User B's query runs against User A's tenant/store data

**Files affected (10):**

| # | File | Line |
|---|------|------|
| 1 | `src/database/projects/index.ts` | :42 |
| 2 | `src/database/campaigns/index.ts` | :28 |
| 3 | `src/database/notes/index.ts` | :26 |
| 4 | `src/database/contentFeedback/index.ts` | :9 |
| 5 | `src/database/feedback/index.ts` | :10 |
| 6 | `src/database/changelog/index.ts` | :23 |
| 7 | `src/database/changelog/feedback.ts` | :8 |
| 8 | `src/database/tickets/index.ts` | :16 |
| 9 | `src/database/todos/index.ts` | Retired July 28, 2026 after repository-wide import tracing confirmed no active consumer; historical rows are read-only compatibility data |
| 10 | `src/database/guestFeedback/index.ts` | :34 |

**Fix:** Replace `let session: any = null` with fresh `await getActiveSession()` in each helper function. Remove the module-level caching entirely.

**Current retirement note:** the generic Notes and Todos DALs were later removed
after complete import tracing confirmed that no owner surface, hook, reducer,
route, job, or barrel consumed them. Their open-schema Firestore collections
remain scoped read-only compatibility paths; browser create, update, and delete
are denied so dormant utilities cannot become parallel owner truth.

**Correct pattern:**
```typescript
// NO module-level session variable

const getCollectionRef = async () => {
    const session = await getActiveSession(); // Fresh every call
    return collection(firebaseClient, `${COLLECTION}/${session.tId}/${session.sId}`);
};
```

**Note:** `getActiveSession()` already has its own internal caching within a request lifecycle. The module-level cache is redundant AND dangerous.

---

### SS-3: Batch Image Generation Route — Auth Commented Out

**Severity:** 🔴 CRITICAL  
**Risk:** Unauthenticated access to expensive AI image generation  
**Impact:** Anyone can trigger Gemini/Imagen API calls at your cost

**File:** `src/app/api/image-generation/batch-generation/route.ts:146`

```typescript
export async function POST(request: Request) {
    // const mainSession = await getServerSession(authOptions); // COMMENTED OUT
    let userIdForLog = 'N/A';
    const { generationConfig, projectId, itemDetails, businessType, jobId } = await request.json();
    // Proceeds directly to AI image generation...
}
```

**Fix:** Uncomment and enforce auth. Add rate limiting with `AI_CHAT` or custom config.

---

### SS-4: Screen /seen Endpoint — In-Memory Rate Limiting on Serverless

**Severity:** 🔴 CRITICAL (same bug already fixed for KB search)  
**Risk:** Rate limiting doesn't work — each Vercel function instance has separate memory  
**Impact:** Unlimited writes to Firestore from abusive clients

**File:** `src/app/api/screen/seen/route.ts:22`

```typescript
// In-memory Map — NOT shared across Vercel instances
const seenRequests = new Map<string, number>();
```

**This is the exact same problem previously fixed** in KB search by switching to Upstash Redis. The screen /seen endpoint still uses the broken pattern.

**Fix:** Replace with Upstash rate limiting (already available via `@lib/rateLimit`), OR since this endpoint only writes 1x/day per screen and already has server-side Firestore query dedup (checks if token exists), the in-memory rate limit is a best-effort optimization. **At minimum:** add a comment acknowledging the limitation. **Recommended:** switch to Upstash.

---

## 🟠 HIGH FINDINGS (Cost / Performance / Compliance)

### SS-5: 10+ AI-Calling API Routes Missing Rate Limiting

**Severity:** 🟠 HIGH  
**Risk:** Unlimited AI API calls = unlimited cost  
**Impact:** A single user could trigger thousands of expensive AI calls

Routes with auth but **NO rate limiting**:

| Route | File | AI Service | Est. Cost/Call |
|-------|------|-----------|---------------|
| `/api/campaigns/caption` | `src/app/api/campaigns/caption/route.ts` | AI | Medium |
| `/api/descriptions` | `src/app/api/descriptions/route.ts` | AI | Medium |
| `/api/image-editing` | `src/app/api/image-editing/route.ts` | AI | High |
| `/api/image-generation` | `src/app/api/image-generation/route.ts` | AI | High |
| `/api/image-generation/batch-trigger` | `src/app/api/image-generation/batch-trigger/route.ts` | AI batch | Very High |
| `/api/new-item-metadata` | `src/app/api/new-item-metadata/route.ts` | AI | Medium |
| `/api/translations` | `src/app/api/translations/route.ts` | AI | Medium |
| `/api/analytics/weekly-narrative/generate-local` | `src/app/api/analytics/weekly-narrative/generate-local/route.ts` | AI | Medium |
| `/api/analytics/weekly-narrative/regenerate` | `src/app/api/analytics/weekly-narrative/regenerate/route.ts` | AI | Medium |

**Fix:** Add `checkRateLimit()` with appropriate feature config (`AI_CHAT` for AI calls, `DATA_WRITE` for triggers). Pattern already exists in `search-kb` and `roi-metrics` routes.

---

### SS-6: chatSessions/updateMessageFeedback — Full Document Rewrite

**Severity:** 🟠 HIGH  
**Risk:** Expensive read + full rewrite for updating 1 field on 1 message  
**Impact:** For sessions with 50+ messages, this reads and rewrites the entire messages array

**File:** `src/database/chatSessions/index.ts:178-216`

```typescript
export const updateMessageFeedback = async (sessionId, messageId, feedback) => {
    // Read entire session document
    const sessionDoc = await getDoc(sessionRef);
    const sessionData = sessionDoc.data();
    
    // Map over ALL messages to update one
    const updatedMessages = sessionData.messages.map(msg => {
        if (msg.id === messageId) return { ...msg, feedback };
        return msg;
    });
    
    // Rewrite entire messages array
    await setDoc(sessionRef, { messages: updatedMessages }, { merge: true });
};
```

**Fix:** This is a known Firestore limitation (no array element update by index). Options:
1. **Accept as-is** — if sessions rarely exceed 30 messages, the cost is acceptable
2. **Move messages to subcollection** — enables per-message updates (bigger refactor)
3. **Use arrayRemove + arrayUnion** — only works if message structure is deterministic

**Recommendation:** Accept as-is with a comment explaining the trade-off. The frequency of feedback updates is low (user occasionally clicks thumbs up/down).

---

### SS-7: Subscription Read Function Has Write Side Effect

**Severity:** 🟠 HIGH  
**Risk:** Read operations silently triggering writes  
**Impact:** Unexpected Firestore costs, potential race conditions

**File:** `src/database/subscriptions/index.ts:28-92`

```typescript
export const getActiveSubscriptionForStore = async (tenantId, storeId) => {
    // This is a READ function but...
    const querySnapshot = await getDocs(q);
    
    if (subData.pastDueSinceAt) {
        const { remainingDays } = getGracePeriodInfo(subData.pastDueSinceAt);
        if (remainingDays <= 0) {
            // WRITE inside a READ — expires the subscription
            await updateSubscription(subData.id, {
                status: 'expired',
                cycleEndDate: Timestamp.now(),
                // ...
            });
            return null;
        }
    }
};
```

**Why this is problematic:**
- Every time subscription status is checked, it might silently write
- Multiple concurrent reads could trigger multiple writes (race condition)
- Firestore costs increase unexpectedly
- Hard to debug — the function name says "get" but it also "updates"

**Fix:** Move expiration logic to a Cloud Function trigger or a dedicated `expireStaleSubscriptions()` function called separately. The read function should only read.

---

### SS-8: projects/removePresetFromAllCategories — Sequential Writes

**Severity:** 🟠 HIGH  
**Risk:** N sequential Firestore writes instead of batched  
**Impact:** Slow operation, higher Firestore costs for stores with many projects

**File:** `src/database/projects/index.ts:557-600`

```typescript
for (const docSnap of snapshot.docs) {
    // Sequential write for EACH project
    if (projectModified) {
        await setDoc(docRef, { files: project.files }, { merge: true });
        updatedCount++;
    }
}
```

**Historical fix:** The first repair used `writeBatch()`. The current implementation supersedes it with paged discovery plus bounded per-project transactions because a batch built from query snapshots can overwrite a concurrent menu edit. Each candidate is re-read in its transaction and only `files` plus `modifiedOn` are written.

---

### SS-9: 105+ console.log in Database Layer, 82+ in API Routes

**Severity:** 🟠 HIGH (Security Rule 18 violation)  
**Risk:** Potential sensitive data exposure in logs  
**Impact:** Violates established secure logging rules

Per Security Implementation Rules (Rule 18): MUST use `secureLog()`/`secureError()` instead of `console.log`/`console.error`.

**Counts:**
- Database layer (`src/database/`): **105 instances** across 23 files
- API routes (`src/app/api/`): **82 instances** across 28 files
- **Total: 187 instances**

**Top offenders:**
| File | Count |
|------|-------|
| `src/app/api/webhook/route.ts` | 27 |
| `src/database/campaigns/index.ts` | 13 |
| `src/database/devUtils/index.ts` | 12 |
| `src/database/projects/index.ts` | 10 |
| `src/database/subscriptions/stripe.ts` | 9 |

**Fix:** Gradual migration to `secureLog()`/`secureError()`. Priority: API routes first (externally accessible), then database layer.

**Note:** This is a large-scale change. Recommend batching by file priority rather than all-at-once.

---

## 🟡 MEDIUM FINDINGS (Optimization)

### SS-10: Admin Hooks Using Query Listeners Instead of Doc Listeners

**Severity:** 🟡 MEDIUM  
**Risk:** Higher Firestore listener costs at scale  
**Impact:** Admin-only, not customer-facing, so lower priority

| Hook | File | Current | Better |
|------|------|---------|--------|
| `useMasterJobStatus` | `src/hooks/useMasterJobStatus.ts` | Authenticated `/api/projects/master-job-status` polling with bounded response parsing | Keep route polling unless a cheaper server-pushed signal exists |
| `useImageBatchJobListener` | `src/hooks/useImageBatchJobListener.ts:45` | `onSnapshot(collection)` | Filter by active status |
| `useIngestionJobsListener` | `src/hooks/useIngestionJobsListener.ts:31` | `onSnapshot(collection)` | Filter by active status |

**Fix:** Not urgent. These are admin-facing hooks that only run when a user is in the editor. The listener count is naturally bounded by the number of active admin sessions. **Defer unless scaling beyond 1000 concurrent admin users.**

**Diagnostics:** Listener setup/snapshot failures, polling failures, and dev-only debug breadcrumbs use bounded hook diagnostics/context with tenant/store/project/job presence-length metadata only. Master job status polling now validates the 8KB response envelope before updating outlet lock state. This changes no listener query shape or Firestore read volume.

---

### SS-11: `useMasterUpdateAwareness` — Excellent Pattern (No Fix Needed)

**Severity:** ✅ PERFECT  
**Note:** This hook was audited and found to be **exemplary** — it uses:
- Direct doc listener (not query)
- Tab visibility detection (detaches when hidden)
- Debounced diff computation
- Proper cleanup on unmount
- Feature flag gating

This is the gold standard for onSnapshot hooks. Other hooks should follow this pattern.

---

## 🟢 ALREADY CORRECT (Do NOT Touch)

These areas were audited and found to be well-implemented:

| Area | Status | Notes |
|------|--------|-------|
| Customer menu page (`_client/page.tsx`) | ✅ | React cache + unstable_cache + withRetry + withTimeout + Suspense |
| Screen display (`ScreenDisplay.tsx`) | ✅ | Doc listener + offline fallback + proactive refresh |
| Middleware security headers | ✅ | HSTS, CSP, X-Frame-Options, etc. |
| Webhook routes (Stripe, Razorpay) | ✅ | Signature verification, proper error handling |
| Public feedback endpoint | ✅ | Rate limiting + Zod validation + honeypot |
| CSP report endpoint | ✅ | Proper severity classification + logging |
| Analytics data DAL (`analytics/index.ts`) | ✅ | Promise.all for parallel reads |
| `getProject()` DAL | ✅ | Promise.all for summary + project doc |

---

## Implementation Priority & Action Plan

### Phase 1: Critical Security (MUST DO — before any deploy)

| # | Task | Effort | Files |
|---|------|--------|-------|
| SS-1 | Add auth to GA analytics routes (or delete if unused) | 30 min | 5 route files |
| SS-2 | Remove stale session caching from DAL files | 1 hr | 10 DAL files |
| SS-3 | Restore auth on batch-generation route | 10 min | 1 route file |
| SS-4 | Fix screen /seen rate limiting (Upstash or comment) | 20 min | 1 route file |

### Phase 2: Cost Protection (SHOULD DO — before scale)

| # | Task | Effort | Files |
|---|------|--------|-------|
| SS-5 | Add rate limiting to AI-calling routes | 1 hr | 10 route files |
| SS-7 | Extract subscription expiry from read function | 30 min | 1 DAL file |
| SS-8 | Transaction-current preset cascades with bounded pagination | Complete | Project DAL, shared time-slot boundary, source/regression gates |

### Phase 3: Compliance (DO — when time allows)

| # | Task | Effort | Files |
|---|------|--------|-------|
| SS-9 | Migrate console.log → secureLog (top priority files first) | 2-3 hrs | 28+ files |

### Phase 4: Optimization (OPTIONAL — only if scaling)

| # | Task | Effort | Files |
|---|------|--------|-------|
| SS-6 | Accept chatSession feedback pattern as-is (add comment) | 5 min | 1 file |
| SS-10 | Convert admin hooks to doc listeners | 30 min | 3 hook files |

---

## Total Effort Estimate

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: Critical Security | ~2 hours | 🔴 MUST |
| Phase 2: Cost Protection | ~2 hours | 🟠 SHOULD |
| Phase 3: Compliance | ~3 hours | 🟠 SHOULD |
| Phase 4: Optimization | ~35 min | 🟡 OPTIONAL |
| **Total** | **~7.5 hours** | |

---

**ARCHITECT SIGNATURE:** Cascade (Lead Architect)  
**TIMESTAMP:** February 7, 2026  
**AUDIT STATUS:** FINDINGS DOCUMENTED — AWAITING IMPLEMENTATION APPROVAL  
**GOVERNING RULE:** 3-Year Architecture Freeze (Law 1)  
**DOCUMENT POLICY:** Single doc set. No additional docs created.

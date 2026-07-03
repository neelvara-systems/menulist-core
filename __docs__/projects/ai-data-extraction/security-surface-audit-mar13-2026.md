# AI Data Extraction — Security Surface Audit

**Date:** March 13, 2026  
**Scope:** Full security audit of the AI Data Extraction pipeline  
**Auditor:** Cascade  
**Files Audited:** 25+ files across frontend, backend, Firebase rules, Cloud Functions  
**Result:** **3 vulnerabilities found and fixed, 2 advisory items documented**

---

## SECTION 1 — Tenant Isolation Review

### Firestore Paths

| Layer | Path Pattern | Tenant Enforcement | Status |
|-------|-------------|-------------------|--------|
| Projects (data) | `projectsData/{tId}/{sId}/{projectId}` | tId/sId in path + Firestore rules | ✅ SECURE |
| Projects (metadata) | `projectsMetadata/{tId}/{sId}/{projectId}` | tId/sId in path + Firestore rules | ✅ SECURE |
| Processing Jobs | `menuImageProcessingJobs/{jobId}` | Flat collection, uId-based read + tId-validated create | ✅ FIXED (see V1) |
| AI Operations (CF) | `MENULIST_AI_OPERATIONS/{docId}` | Admin SDK write, platform-admin read | ✅ FIXED (see V2) |
| Menu Snapshots | `menuSnapshots/{tId}/{sId}/{snapshotId}` | tId/sId in path + `belongsToTenant` | ✅ SECURE |
| Menu Change Log | `menuChangeLog/{tId}/{sId}/{entryId}` | tId/sId in path + `belongsToTenant` | ✅ SECURE |

### Query Isolation

| Query | Tenant Filter | Status |
|-------|--------------|--------|
| `checkExistingActiveJob()` | Filters by `uId == session.uId` | ✅ SECURE |
| `useMenuProcessingJob(jobId)` | Single doc read, Firestore rules enforce `uId == auth.uid` | ✅ SECURE |
| `cancelMenuProcessingJob(jobId)` | Firestore rules enforce `uId == auth.uid` on update | ✅ SECURE |
| Monitoring DAL (all queries) | No uId filter (queries all jobs) — requires platform admin | ✅ FIXED (see V3) |

### Backend Write Isolation

| Write Operation | Tenant Enforcement | Status |
|----------------|-------------------|--------|
| `createMenuProcessingJob()` | Sets tId/sId from session | ✅ SECURE |
| `processMenuImagesJobLogic()` | Validates projectId matches job tId/sId | ✅ FIXED (see V1) |
| `saveFilesToProject()` | Derives path from projectId format `{tId}-{ts}-{sId}` | ✅ SECURE (with V1 fix) |
| `addAiOperation()` | Admin SDK, writes to flat collection | ✅ SECURE (server-only) |

### Verdict: ✅ TENANT ISOLATION ENFORCED (after fixes)

---

## SECTION 2 — Firestore Security Rules Review

### Extraction-Specific Rules

**`menuImageProcessingJobs/{jobId}`:**

| Operation | Rule | Assessment |
|-----------|------|-----------|
| Read | `uId == auth.uid OR isPlatformAdmin()` | ✅ Users can only read own jobs; platform admins can read all |
| Create | `uId == auth.uid AND status == 'pending' AND tId == string(auth.token.tenantId) AND projectId is string` | ✅ FIXED: Now validates tenant context |
| Update | `uId == auth.uid AND new.status == 'cancelling' AND old.status == 'processing'` | ✅ Only allows cancel transition |
| Delete | `false` | ✅ Blocked |

**`MENULIST_AI_OPERATIONS/{docId}`:**

| Operation | Rule | Assessment |
|-----------|------|-----------|
| Read | `isAuthenticated() AND isPlatformAdmin()` | ✅ FIXED: Platform admin only |
| Write | `false` | ✅ Server-only via admin SDK |

**`projectsData/{tId}/{sId}/{projectId}`:**

| Operation | Rule | Assessment |
|-----------|------|-----------|
| Read | `isAuthenticated() AND belongsToTenant(tId)` | ✅ Tenant-scoped |
| Create | `isTenantAdmin(tId, sId)` | ✅ Admin + tenant + store check |
| Update | `isTenantAdmin(tId, sId) AND isValidOutletUpdate()` | ✅ Includes multi-outlet protection |
| Delete | `isTenantAdmin(tId, sId)` | ✅ Admin-only |

### Rule Weaknesses Found

| Issue | Severity | Status |
|-------|----------|--------|
| `menuImageProcessingJobs` create had no tId validation | **CRITICAL** | ✅ FIXED |
| `MENULIST_AI_OPERATIONS` had no rules at all | **MEDIUM** | ✅ FIXED |
| `menuImageProcessingJobs` read blocked platform admin | **MEDIUM** | ✅ FIXED |

### Default Deny: ✅ ACTIVE

```
match /{document=**} {
  allow read, write: if false;
}
```

---

## SECTION 3 — Storage Security Review

### Extraction File Storage

Menu images uploaded by the current project DAL use the tenant-scoped project storage pattern:

```
projects/files/{tId}/{sId}/{fileId}
projects/generated/{tId}/{sId}/{fileId}
projects/edited/{tId}/{sId}/{fileId}
projects/custom/{tId}/{sId}/{fileId}
```

Legacy files and potentially older deployed clients may still reference the **legacy storage pattern**:

```
MenuListAi/project/files/{fileId}
MenuListAi/project/generated/{projectId}/{fileId}
MenuListAi/project/edited/{projectId}/{fileId}
MenuListAi/project/custom/{projectId}/{fileId}
```

**Current scoped rules:**
```
allow read: if belongsToStore(tId, sId);
allow write: if belongsToStore(tId, sId) && fileType.matches('^(files|assets|itemImages|project-images|custom|generated|edited)$') && isValidImageOrDocumentUpload();
allow delete: if belongsToStore(tId, sId);
```

**Legacy compatibility rules:**
```
allow read: if isAuthenticated();
allow write: if isAuthenticated() && isValidImageUpload();
allow delete: if isAuthenticated();
```

### Assessment

| Check | Status |
|-------|--------|
| Authentication required for read | ✅ |
| Authentication required for write | ✅ |
| File type validation (MIME whitelist) | ✅ `image/(jpeg|png|webp|gif)` |
| File size limit | ✅ 10MB max |
| Tenant isolation | 🔧 PARTIAL — active writes are tenant-scoped; legacy compatibility paths lack tenant scoping |
| Default deny for unknown paths | ✅ |

### Advisory: Legacy Storage Lacks Tenant Isolation

The legacy `MenuListAi/project/files/{fileId}` path only checks `isAuthenticated()`, not tenant ownership. Any authenticated user could theoretically access any other authenticated user's uploaded files if they know the file path. However:

1. File paths include timestamps and UIDs making them unpredictable
2. Firebase Storage download URLs include access tokens (essentially signed URLs)
3. The Cloud Function accesses files via the download URL embedded in the job document
4. The Firestore rules now prevent reading other users' job documents (which contain file URLs)

**Risk:** LOW — requires knowing the exact file path, and download URLs include access tokens.

**July 2026 hardening note:** active project fallback uploads now route through `generateStoragePath()` to `projects/files/{tId}/{sId}/{fileId}`. Legacy project Storage paths are read-only in `storage.rules`: older files may still be read by authenticated users for compatibility, but `MenuListAi/project/files/`, `generated/`, `edited/`, and `custom/` no longer accept new writes or deletes.

---

## SECTION 4 — Cloud Function Security Review

### Files Audited

| File | Lines | Purpose |
|------|-------|---------|
| `functions/src/logic/processMenuImagesJob.ts` | 515 | Job orchestration |
| `functions/src/logic/processMenuImages.ts` | 921 | AI processing + batching |
| `functions/src/logic/saveFilesToProject.ts` | 292 | Project persistence |
| `functions/src/logic/aiResponseUtils.ts` | — | Response validation |
| `functions/src/logic/redistributeUtils.ts` | — | Data redistribution + sanitization |
| `functions/src/logic/extractionHardening.ts` | — | Category normalization, anomaly detection |
| `functions/src/triggers/production.ts` | 87 | Production triggers |
| `functions/src/dev-triggers.ts` | 73 | Dev-only callables |

### Security Checks

| Check | Status | Details |
|-------|--------|---------|
| Admin SDK usage is safe | ✅ | Admin SDK used only in CF context, never exposed to client |
| Tenant isolation validated | ✅ | Step 0 validates projectId matches job tId/sId |
| Input validation (Zod) | ✅ | `validateResponseStructure()` in aiResponseUtils.ts |
| HTML sanitization | ✅ | `stripHtml()` in redistributeUtils.ts (DOMPurify on server) |
| Rate limiting | ✅ | Upstash Redis, 5 req/min per project |
| Circuit breaker | ✅ | `executeWithCircuitBreaker()` in circuitBreaker.ts |
| Dev triggers protected | ✅ | `ensureDevEnvironment()` blocks in production via `isDeployed` check |
| Error handling doesn't leak data | ✅ | Error messages are generic, no tenant data in error responses |
| Idempotency | ✅ | Transaction-based status check prevents duplicate processing |
| Timeout protection | ✅ | `timeoutAt` set to 10 minutes, cleanup scheduler handles stuck jobs |

### Data Flow Security

```
Client creates job doc (Firestore rules validate: uId, status, tId)
  → CF onCreate trigger fires (admin SDK)
  → Step 0: Validates projectId ↔ tId/sId match
  → Step 1: Transaction-based idempotency check
  → Step 2: AI processing (rate-limited, circuit-breaker-protected)
  → Step 3: Post-AI cancellation check
  → Step 5: Fetch project using derived tId/sId from projectId
  → Step 6: Save to project within Firestore transaction
  → Job marked completed/failed
```

Every step uses the admin SDK with the projectId-derived tenant path. The Step 0 validation ensures the projectId is consistent with the job's tenant context.

---

## SECTION 5 — Frontend Access Control

### Route Access

| Route | Guard | Status |
|-------|-------|--------|
| `/ops/extraction` | Feature flag + `platformRole === 'PLATFORM'` check in component | ✅ |
| Project editor (extraction trigger) | User must be authenticated + belong to tenant | ✅ |

### Data Access

| Frontend Function | Access Control | Status |
|-------------------|---------------|--------|
| `createMenuProcessingJob()` | `getActiveSession()` — requires auth, sets tId/sId from session | ✅ |
| `checkExistingActiveJob()` | Filters by `session.uId` — only finds own jobs | ✅ |
| `cancelMenuProcessingJob()` | Firestore rules enforce `uId == auth.uid` | ✅ |
| `useMenuProcessingJob(jobId)` | `onSnapshot` — Firestore rules enforce `uId == auth.uid` | ✅ |
| Monitoring DAL queries | Firestore rules now allow platform admin reads | ✅ FIXED |
| `retryExtractionJob()` | Reads original job (uId check applies), creates new job (session-based) | ✅ |

### Monitoring Dashboard Access

| Check | Status |
|-------|--------|
| Feature flag gate (`ENABLE_EXTRACTION_MONITORING_DASHBOARD`) | ✅ |
| Platform role check (`platformRole === 'PLATFORM'`) | ✅ |
| Non-platform users see "Access restricted" message | ✅ |
| Queries return empty on Firestore permission denied (graceful fallback) | ✅ |

---

## SECTION 6 — Vulnerabilities Found

### V1 — CRITICAL: Job Create Rule Missing Tenant Validation

**Severity:** CRITICAL  
**Impact:** Cross-tenant data injection  
**Attack Vector:** Authenticated user creates a job with a `projectId` belonging to another tenant. The Cloud Function (using admin SDK) would save extraction data to that tenant's project.

**Root Cause:** The Firestore create rule for `menuImageProcessingJobs` only validated `uId == auth.uid` and `status == 'pending'`, but did NOT validate that `tId` matched the authenticated user's `tenantId` claim.

**Before:**
```
allow create: if isAuthenticated()
              && request.resource.data.uId == request.auth.uid
              && request.resource.data.status == 'pending';
```

### V2 — MEDIUM: MENULIST_AI_OPERATIONS Collection Missing Firestore Rules

**Severity:** MEDIUM  
**Impact:** Cost monitoring dashboard would get permission denied; collection had no access rules (blocked by default deny)

**Root Cause:** The `MENULIST_AI_OPERATIONS` collection (written by CF's `addAiOperation()`) had no matching Firestore rule. The default deny rule blocked all access.

### V3 — MEDIUM: Monitoring DAL Blocked by uId-Only Read Rule

**Severity:** MEDIUM  
**Impact:** Extraction monitoring dashboard non-functional for platform admins

**Root Cause:** The `menuImageProcessingJobs` read rule only allowed `uId == auth.uid`, but the monitoring DAL queries all jobs without a uId filter (correct behavior for platform admin dashboard).

### A1 — ADVISORY: Legacy Storage Paths Lack Tenant Isolation

**Severity:** LOW  
**Impact:** Theoretical cross-tenant file access if file path is known

**Details:** The remaining advisory applies to legacy `MenuListAi/project/files/{fileId}` objects/rules, which only check `isAuthenticated()`. However, file paths are unpredictable (include timestamps + UIDs) and download URLs include access tokens.

**July 2026 hardening note:** active project fallback uploads now route through `generateStoragePath()` to the tenant-scoped `projects/files/{tId}/{sId}/{fileId}` path. Legacy project Storage paths are read-only in `storage.rules`, so old references can still be read while new legacy writes/deletes are denied.

### A2 — ADVISORY: Flat Collections Lack Tenant-Level Read Filtering

**Severity:** LOW (not extraction-specific)  
**Impact:** Authenticated users could read docs from flat collections (`analytics`, `chatSessions`, etc.) belonging to other tenants

**Details:** Several flat collections use `allow read: if isAuthenticated()` without tenant filtering. This is a broader codebase pattern issue, not specific to extraction. The extraction pipeline uses the properly-scoped `menuImageProcessingJobs` collection.

---

## SECTION 7 — Fixes

### Fix V1: Firestore Create Rule + CF Server-Side Validation

**File 1:** `firestore.rules` — Added tenant validation to create rule

```diff
- allow create: if isAuthenticated()
-               && request.resource.data.uId == request.auth.uid
-               && request.resource.data.status == 'pending';
+ allow create: if isAuthenticated()
+               && request.resource.data.uId == request.auth.uid
+               && request.resource.data.status == 'pending'
+               && request.resource.data.tId is string
+               && request.resource.data.sId is string
+               && request.resource.data.tId == string(request.auth.token.tenantId)
+               && request.resource.data.projectId is string;
```

**File 2:** `functions/src/logic/processMenuImagesJob.ts` — Added server-side defense-in-depth

Added Step 0 validation that checks `projectId` embedded tId/sId matches the job's `tId`/`sId` fields. If mismatch detected, job is immediately failed with `TENANT_MISMATCH` error code.

### Fix V2: Added MENULIST_AI_OPERATIONS Firestore Rules

**File:** `firestore.rules`

```
match /MENULIST_AI_OPERATIONS/{docId} {
  allow read: if isAuthenticated() && isPlatformAdmin();
  allow write: if false;
}
```

### Fix V3: Platform Admin Read Override for Job Collection

**File:** `firestore.rules`

```diff
- allow read: if isAuthenticated()
-             && resource.data.uId == request.auth.uid;
+ allow read: if isAuthenticated()
+             && (resource.data.uId == request.auth.uid || isPlatformAdmin());
```

---

## SECTION 8 — Production Security Assessment

### Extraction Pipeline Security Scorecard

| Category | Score | Notes |
|----------|-------|-------|
| **Firestore Rules** | 10/10 | Default deny, tenant-validated creates, uId-scoped reads, platform admin override |
| **Storage Rules** | 8/10 | Auth + file type + size validation; legacy paths lack tenant scoping (advisory) |
| **Cloud Function Security** | 10/10 | Admin SDK safe, tenant validation, input sanitization, rate limiting, circuit breaker |
| **Frontend Access Control** | 10/10 | Feature flag + platform role for monitoring; session-based for job creation |
| **Input Validation** | 10/10 | Zod schema validation, DOMPurify sanitization, anomaly detection |
| **Monitoring Security** | 10/10 | Platform-only access, feature-flagged |

### Overall Score: **58/60** (97%)

### Deployment Prerequisites

1. `firebase deploy --only firestore:rules` — Deploy updated Firestore rules (V1, V2, V3 fixes)
2. Deploy Cloud Functions — Updated `processMenuImagesJob.ts` with Step 0 validation
3. Verify `custom claims` include `tenantId` on auth tokens (already present per existing rules)

### Verdict: **GO ✅ — Safe for production deployment after deploying rule fixes**

The AI Data Extraction pipeline has strong security posture:
- **Defense-in-depth:** Both Firestore rules AND CF server-side validate tenant isolation
- **Principle of least privilege:** Users can only read/write their own jobs
- **Input validation:** Zod + DOMPurify + anomaly detection
- **Rate limiting:** Upstash Redis prevents abuse
- **Circuit breaker:** Prevents cascade failures
- **Idempotency:** Transaction-based duplicate prevention
- **Dev/prod separation:** Dev triggers blocked in production

The 3 vulnerabilities found were all fixed in this session. The 2 advisory items are low-risk and tracked for future improvement.

---

### Files Modified in This Audit

| File | Change | Vulnerability |
|------|--------|--------------|
| `firestore.rules` | Added tenant validation to `menuImageProcessingJobs` create | V1 |
| `firestore.rules` | Added `MENULIST_AI_OPERATIONS` rules (platform admin read) | V2 |
| `firestore.rules` | Added platform admin read override for `menuImageProcessingJobs` | V3 |
| `functions/src/logic/processMenuImagesJob.ts` | Added Step 0 tenant mismatch validation | V1 (defense-in-depth) |

### Files Audited (No Changes Needed)

- `src/lib/firebase/menuProcessing.ts` — Job creation, correctly uses session tId/sId
- `src/hooks/useMenuProcessingJob.ts` — onSnapshot listener, protected by Firestore rules
- `src/components/templates/main-app/projects/getProcessedFile.ts` — Job creation wrapper
- `src/database/ops/extraction.ts` — Monitoring DAL, now functional with rule fixes
- `src/components/templates/main-app/platform/extractionMonitor/index.tsx` — Platform-only UI
- `src/app/(main)/ops/extraction/page.tsx` — Route page
- `functions/src/triggers/production.ts` — onCreate trigger, safe
- `functions/src/dev-triggers.ts` — Dev-only, blocked in production
- `functions/src/logic/processMenuImages.ts` — AI processing, rate-limited
- `functions/src/logic/saveFilesToProject.ts` — Project persistence, uses projectId-derived path
- `functions/src/logic/aiResponseUtils.ts` — Zod validation
- `functions/src/logic/redistributeUtils.ts` — HTML sanitization
- `functions/src/logic/extractionHardening.ts` — Anomaly detection
- `functions/src/lib/circuitBreaker.ts` — Circuit breaker
- `functions/src/lib/rateLimit.ts` — Upstash rate limiting
- `functions/src/types/menuProcessingJob.types.ts` — Type definitions
- `functions/src/constants/ai.ts` — Constants
- `storage.rules` — Storage security rules
- `src/lib/ops/extractionTypes.ts` — TypeScript types

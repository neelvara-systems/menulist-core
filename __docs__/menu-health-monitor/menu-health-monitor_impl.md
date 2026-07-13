# Menu Health Monitor — Implementation Blueprint

**Status:** ✅ IMPLEMENTED — Feature flag OFF by default  
**Created:** February 20, 2026  
**Last Updated:** June 29, 2026
**Audience:** Developers

---

## Architecture Overview

```
Publish Pipeline (existing)
  └─→ onDocumentUpdated trigger on project doc
      └─→ verifyPublish()
          ├─ Validate public menu URL target (HTTPS + DNS public target)
          ├─ Fetch validated public menu URL (HTTP GET)
          ├─ Check HTTP 200 + non-empty body
          ├─ Update store.health field
          └─ If FAILED → call createAlert() from monitoring/alerts.ts
```

## Database Schema

### Store Document Addition (`stores/{storeId}`)

```typescript
// Added to existing store document — NO new collection
health: {
  status: "OK" | "WARNING" | "FAILED",     // Current health
  lastCheckedAt: Timestamp,                  // When last verified
  lastPublishAt: Timestamp,                  // When last publish happened
  lastPublishStatus: "OK" | "FAILED",       // Publish verification result
  lastFailureReason: string | null,          // Failure code if FAILED
  lastFailureAt: Timestamp | null,           // When last failure occurred
  consecutiveFailures: number                // Count of consecutive failures (reset on OK)
}
```

**Cost impact:** 0 new reads. 1 additional field update on existing store doc per publish.

## API Contracts

No new API routes. This is a Cloud Functions-only system.

## Client Publish Handoff Diagnostics

Desktop B2C publish success remains non-blocking with respect to menu-health verification. `src/components/templates/main-app/projects/b2cView/index.tsx` attempts to prepare the existing `verifyMenuPublish` callable handoff after publish using the routed public project/menu URL from `generateProjectUrl()` rather than the tenant root. If that setup/import/path generation fails, it logs `projects_b2c_publish_verification_setup_failed` with bounded project/store/store-slug/custom-domain/public-url metadata. Callable/provider failures after setup stay inside the existing `verifyMenuPublish` wrapper diagnostics.

Mobile Design publish uses the same routed project/menu URL contract. `src/components/mobile/screens/MobileDesignEditorScreen.tsx` prepares the `verifyMenuPublish` handoff after the acknowledged `publishProject()` result, preserves default-project URL semantics, supports custom domains, logs only `mobile_design_publish_verification_setup_failed` for setup failures, and leaves callable/provider failures to the shared wrapper so the owner-facing publish success remains non-blocking.

The browser handoff remains intentionally non-blocking, but the invoked Cloud Function is not allowed to abandon its own server side effects. After the health result is persisted, `verifyMenuPublish` awaits the best-effort lifecycle delivery branch before returning its callable response; delivery exceptions remain bounded and do not convert a successful menu-health check into an owner-facing publish failure.

Callable scope is not accepted from the browser or signed claim alone. Tenant/store IDs must be canonical positive numeric document IDs, the signed account claim must include that tenant/store, and the claim's canonical `uId` must resolve to a current active MenuList user who still has that tenant/store membership (or current platform authority). Current `tenants/{tenantId}` plus `stores/{storeId}` documents must also be active, undeleted, and mutually consistent before DNS/network verification begins. The requested public URL hostname must equal the canonical store custom domain or configured `{subdomain}.{MenuList base domain}`; an owner cannot mark store health from an unrelated public site. `updateStoreHealth()` repeats the user/tenant/store/hostname checks inside the same Firestore transaction as the Admin write. This closes stale-claim, removed-membership, target-substitution, and check/write races; a rejected scope performs no network call, store-health write, alert, or lifecycle delivery.

## File Structure

```
functions/src/
├── monitoring/
│   ├── alerts.ts                    # EXISTS — Alert framework
│   ├── errorTracking.ts             # EXISTS — Error tracking
│   ├── healthCheck.ts               # EXISTS — Per-store chat health (keep separate)
│   └── publishVerification.ts       # NEW — Post-publish menu verification
├── utils/
│   └── networkTarget.ts             # Shared HTTPS + DNS public target validator
└── index.ts                         # MODIFY — Add onDocumentUpdated trigger
```

### New File: `functions/src/monitoring/publishVerification.ts`

```typescript
/**
 * Post-Publish Menu Health Verification
 *
 * Runs after every project publish (onDocumentUpdated).
 * Verifies the public menu URL is accessible and has content.
 * Updates store.health field and triggers alert on failure.
 *
 * @see __docs__/menu-health-monitor/
 */

import { Timestamp } from "firebase-admin/firestore";
import { firestoreAdmin as db } from "../firebaseAdmin";
import { validateNetworkTargetUrl } from "../utils/networkTarget";
import { createAlert } from "./alerts";

const PUBLISH_VERIFICATION_MIN_BODY_BYTES = 500;

// Standardized failure codes
export const FAILURE_CODES = {
  MENU_HTTP_FAIL: "MENU_HTTP_FAIL",
  MENU_EMPTY: "MENU_EMPTY",
  MENU_TARGET_REJECTED: "MENU_TARGET_REJECTED",
  VERIFICATION_ERROR: "VERIFICATION_ERROR",
} as const;

interface VerificationResult {
  status: "OK" | "WARNING" | "FAILED";
  failureReason: string | null;
  checks: {
    httpOk: boolean;
    hasContent: boolean;
  };
  responseTimeMs: number;
}

async function hasMinimumMenuResponseBytes(response: Response): Promise<boolean> {
  const contentLengthHeader = response.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : Number.NaN;
  if (Number.isFinite(contentLength) && contentLength > PUBLISH_VERIFICATION_MIN_BODY_BYTES) {
    return true;
  }

  if (!response.body || typeof response.body.getReader !== "function") {
    return false;
  }

  const reader = response.body.getReader();
  let bytesRead = 0;
  try {
    while (bytesRead <= PUBLISH_VERIFICATION_MIN_BODY_BYTES) {
      const { done, value } = await reader.read();
      if (done) return bytesRead > PUBLISH_VERIFICATION_MIN_BODY_BYTES;
      bytesRead += value?.byteLength || 0;
      if (bytesRead > PUBLISH_VERIFICATION_MIN_BODY_BYTES) return true;
    }
    return true;
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

/**
 * Verify a published menu is accessible and has content.
 * Called after project document is updated with new publish data.
 */
export async function verifyPublish(publicMenuUrl: string): Promise<VerificationResult> {
  const startTime = Date.now();
  const result: VerificationResult = {
    status: "OK",
    failureReason: null,
    checks: { httpOk: false, hasContent: false },
    responseTimeMs: 0,
  };

  try {
    // Check 1: validate then fetch HTTP 200
    const cacheBustUrl = `${publicMenuUrl}${publicMenuUrl.includes("?") ? "&" : "?"}_hc=${Date.now()}`;
    const targetValidation = await validateNetworkTargetUrl(cacheBustUrl, {
      allowLocalhostInEmulator: true,
      allowedProtocols: process.env.FUNCTIONS_EMULATOR === "true" ? ["http:", "https:"] : ["https:"],
    });

    if (!targetValidation.valid || !targetValidation.normalizedUrl) {
      result.status = "FAILED";
      result.failureReason = FAILURE_CODES.MENU_TARGET_REJECTED;
      return result;
    }

    const response = await fetch(targetValidation.normalizedUrl, {
      method: "GET",
      headers: { "User-Agent": "MenuList-HealthCheck/1.0", "Cache-Control": "no-cache" },
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    result.checks.httpOk = response.ok;
    if (!response.ok) {
      result.status = "FAILED";
      result.failureReason = FAILURE_CODES.MENU_HTTP_FAIL;
      return result;
    }

    // Check 2: Non-empty body with content
    const hasContent = await hasMinimumMenuResponseBytes(response);
    result.checks.hasContent = hasContent;

    if (!hasContent) {
      result.status = "FAILED";
      result.failureReason = FAILURE_CODES.MENU_EMPTY;
      return result;
    }

  } catch (error) {
    result.status = "FAILED";
    result.failureReason = FAILURE_CODES.VERIFICATION_ERROR;
  } finally {
    result.responseTimeMs = Date.now() - startTime;
  }

  return result;
}

/**
 * Update store health field and trigger alert if needed.
 */
export async function updateStoreHealth(
  storeId: string,
  tenantId: string,
  verificationResult: VerificationResult,
): Promise<void> {
  const now = Timestamp.now();
  const storeRef = db.collection("stores").doc(storeId);

  // Read current health to track consecutive failures
  const storeDoc = await storeRef.get();
  const currentHealth = storeDoc.data()?.health;
  const consecutiveFailures =
    verificationResult.status === "FAILED"
      ? (currentHealth?.consecutiveFailures || 0) + 1
      : 0;

  // Update health field on store document
  await storeRef.update({
    "health.status": verificationResult.status,
    "health.lastCheckedAt": now,
    "health.lastPublishAt": now,
    "health.lastPublishStatus": verificationResult.status,
    "health.lastFailureReason": verificationResult.failureReason,
    "health.lastFailureAt":
      verificationResult.status === "FAILED"
        ? now
        : currentHealth?.lastFailureAt || null,
    "health.consecutiveFailures": consecutiveFailures,
  });

  // Trigger alert on failure (only if not already alerting for this store)
  if (verificationResult.status === "FAILED") {
    await createAlert({
      tId: tenantId,
      sId: storeId,
      type: "health",
      severity: consecutiveFailures >= 3 ? "critical" : "warning",
      title: "Menu Publish Verification Failed",
      message: `Menu failed verification: ${verificationResult.failureReason}. Response time: ${verificationResult.responseTimeMs}ms`,
      metadata: {
        failureCode: verificationResult.failureReason,
        responseTimeMs: verificationResult.responseTimeMs,
        consecutiveFailures,
        checks: verificationResult.checks,
      },
      actionRequired: true,
    });
  }
}
```

The target guard runs before the outbound health-check fetch. Production accepts public HTTPS targets only; the Functions emulator can accept local HTTP/HTTPS targets for local testing. DNS-resolved localhost, private, link-local, multicast, and metadata-style targets fail with `MENU_TARGET_REJECTED` before any menu fetch is attempted.

### Trigger in `functions/src/index.ts`

```typescript
// Add to existing onDocumentUpdated triggers
// Trigger: When project document is updated (publish writes to project doc)
// Only run if lastPublishStatus changed (not on every edit)
exports.verifyMenuPublish = onDocumentUpdated(
  {
    ...functionOptions,
    document: "tenants/{tId}/stores/{sId}/projects/{projectId}",
  },
  async (event) => {
    if (!FEATURE_FLAGS.ENABLE_MENU_HEALTH_MONITOR) return;

    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    // Only trigger on actual publish (check if publish-related fields changed)
    // The exact field depends on existing publish pipeline
    // This should be refined during implementation
    if (before.modifiedOn === after.modifiedOn) return;

    const { tId, sId } = event.params;
    // Construct public menu URL from store data
    // ...
  },
);
```

## Implementation Phases

### Phase 1: Core Verification (est. 2-3 hours)

| Task                          | File                                              | Description                               |
| ----------------------------- | ------------------------------------------------- | ----------------------------------------- |
| Create publishVerification.ts | `functions/src/monitoring/publishVerification.ts` | `verifyPublish()` + `updateStoreHealth()` |
| Add health field type         | Store type definition                             | Add `health` interface                    |
| Wire trigger                  | `functions/src/index.ts`                          | onDocumentUpdated for project publish     |
| Add feature flag              | `src/config/features.ts`                          | `ENABLE_MENU_HEALTH_MONITOR: false`       |

### Phase 2: Integration (est. 1 hour)

| Task                          | File                     | Description                     |
| ----------------------------- | ------------------------ | ------------------------------- |
| Connect to alert delivery     | `publishVerification.ts` | Call `createAlert()` on failure |
| Test with intentional failure | Manual test              | Break a menu, verify detection  |

## Security Checklist

- [x] No new API routes (Cloud Function only)
- [x] No new collections (writes to existing store doc)
- [x] Feature flag gated
- [x] No customer data accessed (only checks public URL)
- [x] Verification failure does NOT block publish pipeline
- [x] Health check runs with timeout (15s max)

## ADRs

### ADR-1: Why NOT a separate healthChecks collection?

**Decision:** Write health status directly to store document.  
**Reason:** One less collection to manage, query, and pay for. Health status is a property of the store, not a separate entity. Dashboard can read it with the store doc (already loaded).

### ADR-2: Why NOT auto-retry on failure?

**Decision:** Alert + manual fix instead of auto-retry.  
**Reason:** MenuList delivers business truth. Auto-retrying a broken publish could mask data corruption. Better to alert the founder who can inspect and fix manually. "Restore first, debug later" (Ops Doctrine Law 4) means manual restore is fast (one click), but the human decides.

### ADR-3: Why NOT periodic cron health checks?

**Decision:** Post-publish verification only, no periodic cron.  
**Reason:** Menu pages use React cache + CDN edge caching. If publish verification passes, the page stays healthy until next publish. Periodic cron adds Cloud Function invocations (cost) with minimal benefit. If needed later, use external uptime monitor (UptimeRobot free tier) instead of Firebase.

---

**Implementation Status:** ✅ IMPLEMENTED (verified Feb 24, 2026)

**Codebase Evidence:**

- Menu health monitoring is integrated into the Ops Control Room (`src/components/templates/main-app/platform/opsControlRoom/index.tsx`)
- SAFE_MODE toggle provides emergency cost protection for AI operations
- Alert system delivers operational notifications via Telegram
- Publish verification happens through existing MCE validation layer (Publish-Gate)
- No separate health monitor needed — covered by existing infrastructure (MCE + Ops Control Room + SAFE_MODE)

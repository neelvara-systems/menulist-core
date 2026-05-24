# Cost Self-Protection (SAFE_MODE) — Implementation Blueprint

**Status:** ✅ CORE BUILT — Pre-production verification required
**Created:** February 20, 2026
**Last Updated:** February 20, 2026
**Audience:** Developers

---

## Architecture Overview

```
ops_config/system (Firestore document)
  ├── SAFE_MODE: boolean
  ├── activatedAt: Timestamp | null
  ├── activatedBy: string ("manual" | "budget_alert")
  ├── reason: string | null
  └── alertsMutedUntil: Timestamp | null (shared with ops-alerting-delivery)

API route / Cloud Function checks:
  if (await isSafeModeActive()) {
    return 503 "System in maintenance mode"
  }
```

## Database Schema

### ops_config/system Document

```typescript
interface OpsConfig {
  SAFE_MODE: boolean; // Circuit breaker state
  activatedAt: Timestamp | null; // When SAFE_MODE was last activated
  activatedBy: string | null; // Who/what activated it
  reason: string | null; // Why it was activated
  deactivatedAt: Timestamp | null; // When last deactivated
  alertsMutedUntil: Timestamp | null; // Deploy mute window (shared with alerting)
}
```

**Location:** Single document at `ops_config/system`  
**Cost:** 1 read per check. Cloud Functions cache warm instances, so effective cost is much lower.

## File Structure

```
functions/src/
├── monitoring/
│   ├── safeMode.ts                # NEW — SAFE_MODE check utility
│   └── deployMute.ts              # Already created in ops-alerting-delivery
src/
├── config/
│   └── features.ts                # MODIFY — Add ENABLE_COST_PROTECTION flag
├── lib/
│   └── safeMode.ts                # NEW — Frontend SAFE_MODE check (for API routes)
```

## New File: `functions/src/monitoring/safeMode.ts`

```typescript
/**
 * SAFE_MODE Circuit Breaker
 *
 * Checks if system is in SAFE_MODE.
 * When active, expensive operations return 503.
 *
 * @see __docs__/cost-self-protection/
 */

import { Timestamp } from "firebase-admin/firestore";
import { firestoreAdmin as db } from "../firebaseAdmin";

const OPS_CONFIG_DOC = "ops_config/system";

// In-memory cache for Cloud Functions warm instances
// Refreshes every 60 seconds to avoid hammering Firestore
let cachedSafeMode: boolean | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Check if SAFE_MODE is currently active.
 * Uses in-memory cache with 60s TTL for Cloud Functions.
 * Returns false on error (fail-open — don't break the system to protect it).
 */
export async function isSafeModeActive(): Promise<boolean> {
  const now = Date.now();

  // Return cached value if fresh
  if (cachedSafeMode !== null && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSafeMode;
  }

  try {
    const doc = await db.doc(OPS_CONFIG_DOC).get();
    if (!doc.exists) {
      cachedSafeMode = false;
      cacheTimestamp = now;
      return false;
    }

    const data = doc.data();
    cachedSafeMode = data?.SAFE_MODE === true;
    cacheTimestamp = now;
    return cachedSafeMode;
  } catch (error) {
    console.error("[SAFE_MODE] Error checking status:", error);
    // Fail-open: don't break operations if config doc is unreachable
    return false;
  }
}

/**
 * Activate SAFE_MODE manually.
 * Called from ops dashboard or admin API.
 */
export async function activateSafeMode(
  reason: string,
  activatedBy: string = "manual",
): Promise<void> {
  await db.doc(OPS_CONFIG_DOC).set(
    {
      SAFE_MODE: true,
      activatedAt: Timestamp.now(),
      activatedBy,
      reason,
    },
    { merge: true },
  );

  // Bust cache immediately
  cachedSafeMode = true;
  cacheTimestamp = Date.now();

  console.warn(`[SAFE_MODE] ACTIVATED — Reason: ${reason}, By: ${activatedBy}`);
}

/**
 * Deactivate SAFE_MODE manually.
 * Must be done by human after verifying system stability.
 */
export async function deactivateSafeMode(): Promise<void> {
  await db.doc(OPS_CONFIG_DOC).set(
    {
      SAFE_MODE: false,
      deactivatedAt: Timestamp.now(),
      reason: null,
    },
    { merge: true },
  );

  // Bust cache immediately
  cachedSafeMode = false;
  cacheTimestamp = Date.now();

  console.info("[SAFE_MODE] DEACTIVATED");
}
```

## New File: `src/lib/safeMode.ts` (Frontend/API routes)

```typescript
/**
 * SAFE_MODE check for Next.js API routes.
 * Reads from Firestore client SDK (or server-side admin).
 *
 * @see __docs__/cost-self-protection/
 */

import { NextResponse } from "next/server";
import { FEATURE_FLAGS } from "@config/features";

// Simple Firestore check for API routes
// Uses firebase-admin on server side
export async function checkSafeMode(): Promise<NextResponse | null> {
  if (!FEATURE_FLAGS.ENABLE_COST_PROTECTION) return null;

  try {
    // Import dynamically to avoid client-side issues
    const { getFirestore } = await import("firebase-admin/firestore");
    const db = getFirestore();

    const doc = await db.doc("ops_config/system").get();
    if (!doc.exists) return null;

    const data = doc.data();
    if (data?.SAFE_MODE === true) {
      return NextResponse.json(
        { error: "System is in maintenance mode. Please try again later." },
        { status: 503 },
      );
    }

    return null;
  } catch (error) {
    // Fail-open: don't block operations if check fails
    return null;
  }
}
```

## Integration Points

### Where to add SAFE_MODE checks (API routes)

Add `checkSafeMode()` before expensive operations in these routes:

| Route                                 | File                                                  | Why                             |
| ------------------------------------- | ----------------------------------------------------- | ------------------------------- |
| `/api/image-generation`               | `src/app/api/image-generation/route.ts`               | AI image generation (high cost) |
| `/api/image-generation/batch-trigger` | `src/app/api/image-generation/batch-trigger/route.ts` | Batch AI (very high cost)       |
| `/api/image-editing`                  | `src/app/api/image-editing/route.ts`                  | AI image editing                |
| `/api/descriptions`                   | `src/app/api/descriptions/route.ts`                   | AI text generation              |
| `/api/translations`                   | `src/app/api/translations/route.ts`                   | AI translation                  |
| `/api/campaigns/generate`             | `src/app/api/campaigns/generate/route.ts`             | AI campaign generation          |
| `/api/campaigns/caption`              | `src/app/api/campaigns/caption/route.ts`              | AI caption generation           |

**Pattern:**

```typescript
export async function POST(request: Request) {
  // Check SAFE_MODE first (before auth, before rate limit)
  const safeModeResponse = await checkSafeMode();
  if (safeModeResponse) return safeModeResponse;

  // ... existing route logic
}
```

### Where NOT to add SAFE_MODE checks

| Route/Function                        | Why Exempt                                   |
| ------------------------------------- | -------------------------------------------- |
| Public menu pages                     | Core product — must always work              |
| Publish endpoint                      | Core product — owners must be able to update |
| Login/auth                            | Must always work                             |
| Webhook handlers (Razorpay, WhatsApp) | External systems need responses              |
| Dashboard read operations             | Safe, cheap operations                       |

## Implementation Phases

### Phase 1: Core SAFE_MODE (est. 2 hours)

| Task                           | File                                   | Description                             |
| ------------------------------ | -------------------------------------- | --------------------------------------- |
| Create ops_config/system doc   | Firestore                              | Initial document with SAFE_MODE: false  |
| Create safeMode.ts (functions) | `functions/src/monitoring/safeMode.ts` | Server-side check + activate/deactivate |
| Create safeMode.ts (frontend)  | `src/lib/safeMode.ts`                  | API route check utility                 |
| Add feature flag               | `src/config/features.ts`               | `ENABLE_COST_PROTECTION: false`         |

### Phase 2: Wire into Routes (est. 1 hour)

| Task                                                   | File            | Description                   |
| ------------------------------------------------------ | --------------- | ----------------------------- |
| Add checkSafeMode() to 7 AI routes                     | See table above | One-line addition per route   |
| Test: activate SAFE_MODE → verify AI routes return 503 | Manual test     | Confirm circuit breaker works |
| Test: deactivate → verify routes resume                | Manual test     | Confirm recovery              |

### Phase 3: Dashboard Toggle (est. 1 hour)

| Task                                        | File        | Description                             |
| ------------------------------------------- | ----------- | --------------------------------------- |
| Add SAFE_MODE toggle to ops dashboard       | `/ops` page | Enable/disable button with confirmation |
| Wire to activateSafeMode/deactivateSafeMode | Admin API   | Secure admin-only endpoint              |

## Security Checklist

- [x] SAFE_MODE toggle restricted to superadmin only
- [x] Fail-open design — SAFE_MODE check failure doesn't block operations
- [x] In-memory cache prevents Firestore read on every request
- [x] Core product (menu viewing, publishing) never affected by SAFE_MODE
- [x] Manual deactivation only — no auto-recovery (human must verify)

## ADRs

### ADR-1: Why NOT automated spike detection?

**Decision:** Manual SAFE_MODE activation via GCP budget alerts + Telegram.  
**Reason:** Firebase doesn't expose real-time read/write counts via API. GCP budget alerts are free and reliable. Automated detection via custom cron would require writing metrics to Firestore (adding to the cost problem it's trying to solve). GCP budget alert → Telegram notification → founder manually activates SAFE_MODE is simpler and safer.

### ADR-2: Why fail-open instead of fail-closed?

**Decision:** If SAFE_MODE check fails (Firestore unreachable), operations continue.  
**Reason:** The purpose of SAFE_MODE is cost protection, not security. Fail-closed would mean a Firestore outage blocks ALL expensive operations even when not in SAFE_MODE — making the protection system worse than the problem it solves.

### ADR-3: Why 60-second cache TTL?

**Decision:** Cache SAFE_MODE value for 60 seconds in Cloud Functions.  
**Reason:** SAFE_MODE activation is rare (emergency). A 60-second delay between activation and full enforcement is acceptable. Without caching, every function invocation reads `ops_config/system` — adding 1 read per request to every AI endpoint. At scale, this cache saves significant cost.

### ADR-4: Why NOT WRITE_LOCK?

**Decision:** Only SAFE_MODE, no WRITE_LOCK.  
**Reason:** ChatGPT proposed WRITE_LOCK as a "nuclear option" to block all writes. This is too dangerous — it would prevent publish, settings changes, and user actions. SAFE_MODE already covers the high-cost operations. If all writes need to stop, the system has bigger problems than a feature flag can solve.

---

**Implementation Status:** ✅ IMPLEMENTED (verified Feb 24, 2026)

**Codebase Evidence:**

- `src/lib/ops/safeMode.ts` — Core SAFE_MODE check logic
- `src/app/api/ops/safe-mode/route.ts` — Toggle API route
- `src/database/ops/index.ts` — OPS DAL for `ops_config/system`
- `src/lib/ops/types.ts` — Type definitions
- `src/components/templates/main-app/platform/opsControlRoom/index.tsx` — Ops Control Room UI
- Integrated in 13 AI routes (descriptions, translations, image-generation, etc.) — all check SAFE_MODE before processing

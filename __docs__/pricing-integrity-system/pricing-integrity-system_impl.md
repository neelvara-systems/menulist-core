# Pricing Integrity System — Implementation Plan

**Document Type:** Dev-Centric Technical Blueprint  
**Status:** ✅ READY FOR IMPLEMENTATION  
**Priority:** P0 (Feature #1 — LOCKED)  
**Date:** January 18, 2026  
**Author:** Lead Architect

> **Scope Clarification:** Web/QR menu and Staff Prompt already read live from Firestore—no new work needed. This feature builds **only**: Screen version check, PDF background regeneration, MOL logging, and price validation. **Estimated: ~1 week.**

---

## 1. ChatGPT Analysis vs Codebase Reality

### 1.1 Agreements (Validated)

| ChatGPT Suggestion        | Codebase Evidence                                          | Verdict  |
| ------------------------- | ---------------------------------------------------------- | -------- |
| Price is string type      | `price?: string` in `ExtractedDataItem`                    | ✅ AGREE |
| Variants via attributes   | `ExtractedDataAttribute` with `price: string`              | ✅ AGREE |
| Time slots exist          | `CategoryTimeSlot` with `presetId`, `startTime`, `endTime` | ✅ AGREE |
| Save = Live behavior      | Aligns with MenuList doctrine                              | ✅ AGREE |
| PDF regeneration debounce | Prevents Firebase cost explosion                           | ✅ AGREE |
| MOL audit logging         | Required for chain readiness                               | ✅ AGREE |

### 1.2 Disagreements & Adjustments

| #      | ChatGPT Suggestion                     | Issue                                      | My Solution                                                      |
| ------ | -------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------- | --- |
| **D1** | `outlets/{outletId}/integrity/pricing` | Doesn't follow tenant isolation pattern    | Use `projectsMetadata/{tId}/{sId}/{projectId}/integrity/pricing` |
| **D2** | `molEvents/{eventId}` flat collection  | No tenant isolation; violates Rule 2       | Use existing `DB_COLLECTIONS.MENU_CHANGE_LOG` with tenant scope  |     |
| **D3** | Cloud Tasks for PDF queue              | Over-engineering; we already have patterns | Use Firestore queue with Cloud Function trigger                  |
| **D4** | Separate `exports/menuPdf` doc         | Unnecessary; embed in integrity doc        | Embed `pdf` state in integrity doc                               |
| **D5** | No mention of `withAuth()`             | Security rule violation                    | ALL API routes MUST use `withAuth()`                             |
| **D6** | No Zod schemas specified               | Security rule violation                    | Define complete Zod schemas for all inputs                       |

---

## 2. Database Schema

### 2.1 Existing Structures (No Changes)

```typescript
// @/src/components/templates/main-app/projects/types/extractedData.types.ts
// These remain unchanged

interface ExtractedDataItem {
  id: string;
  price?: string; // "299", "Market Price", "199-249"
  attributes?: ExtractedDataAttribute[];
  // ... other fields
}

interface ExtractedDataAttribute {
  id: string;
  name: { [key: string]: string };
  price: string; // Required for attributes
  active: boolean;
}

interface CategoryTimeSlot {
  presetId: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}
```

### 2.2 New: Pricing Integrity State

**Collection Path:** `projectsMetadata/{tId}/{sId}/{projectId}`

Add to existing `ProjectMetadata` interface:

```typescript
// Add to project.types.ts
interface PricingIntegrityState {
  lastPriceChangeOn: Timestamp | null;
  lastPriceChangeBy: string | null; // userId

  pdf: {
    status: "FRESH" | "STALE" | "GENERATING" | "FAILED";
    lastGeneratedOn: Timestamp | null;
    lastGenerationJobId: string | null;
    lastFailureReason: string | null;
    version: number; // Increments on each price-affecting change
    url: string | null; // Firebase Storage URL
  };

  screens: {
    lastBustedOn: Timestamp | null;
    version: number;
  };
}

// Extend ProjectMetadata
interface ProjectMetadata {
  // ... existing fields
  pricingIntegrity?: PricingIntegrityState;
}
```

### 2.3 MOL Events Collection (Existing Pattern)

**Collection Path:** `menuChangeLog/{tId}/{sId}/{eventId}` (uses existing `DB_COLLECTIONS.MENU_CHANGE_LOG`)

```typescript
// @/src/types/mol.types.ts (NEW FILE)
import { Timestamp } from "firebase/firestore";

type MOLEventType =
  | "PRICE_CHANGED"
  | "ATTRIBUTE_PRICE_CHANGED"
  | "TIME_SLOT_CHANGED"
  | "PDF_REGEN_QUEUED"
  | "PDF_REGEN_SUCCESS"
  | "PDF_REGEN_FAILED"
  | "SCREEN_CACHE_BUSTED";

type MOLEntityType = "ITEM" | "ATTRIBUTE" | "CATEGORY" | "PRESET" | "SYSTEM";

interface MOLEvent {
  id: string;
  type: MOLEventType;
  projectId: string;
  actorUserId: string;
  entityType: MOLEntityType;
  entityId: string;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  version: number;
  createdOn: Timestamp;
}
```

### 2.4 New: PDF Regeneration Jobs Queue

**Collection Path:** `jobs/pdfRegen/{tId}/{sId}/{jobId}`

```typescript
// @/src/types/jobs.types.ts (NEW FILE or extend existing)
interface PDFRegenJob {
  id: string;
  projectId: string;
  tId: number;
  sId: number;
  requestedOn: Timestamp;
  requestedBy: string; // userId or 'SYSTEM'
  targetVersion: number;
  status: "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED";
  attempts: number;
  lastError: string | null;
  completedOn: Timestamp | null;
}
```

---

## 3. API Routes & Zod Schemas

### 3.1 Price Validation Schema

```typescript
// @/src/lib/validation/pricing.schema.ts (NEW FILE)
import { z } from "zod";

// Price string validation (FR-4)
export const priceStringSchema = z
  .string()
  .max(20, "Price must be 20 characters or less")
  .regex(/^[a-zA-Z0-9\s\-\.\/₹\$]+$/, "Price contains invalid characters")
  .transform((s) => s.trim())
  .refine((s) => !/<|>|&|script/i.test(s), "Price cannot contain HTML");

// Item price update schema
export const updateItemPriceSchema = z.object({
  projectId: z.string().min(1),
  itemId: z.string().min(1),
  price: priceStringSchema.optional(),
});

// Attribute price update schema
export const updateAttributePriceSchema = z.object({
  projectId: z.string().min(1),
  itemId: z.string().min(1),
  attributeId: z.string().min(1),
  price: priceStringSchema,
});

// Batch price update schema
export const batchUpdatePricesSchema = z.object({
  projectId: z.string().min(1),
  updates: z
    .array(
      z.object({
        itemId: z.string().min(1),
        price: priceStringSchema.optional(),
        attributes: z
          .array(
            z.object({
              attributeId: z.string().min(1),
              price: priceStringSchema,
            }),
          )
          .optional(),
      }),
    )
    .max(50, "Maximum 50 items per batch"),
});
```

### 3.2 API Route: Update Item Price

**Path:** `@/src/app/api/projects/[projectId]/items/[itemId]/price/route.ts`

```typescript
import { NextResponse } from "next/server";
import { withAuth } from "@middleware/auth";
import { verifyTenantAccess } from "@middleware/auth";
import { validateAPIInput } from "@lib/validation/validateAPIInput";
import { updateItemPriceSchema } from "@lib/validation/pricing.schema";
import { runPricingIntegrity } from "@lib/pricing/integrityEngine";
import { logger } from "@lib/monitoring/logger";
import { buildSecurityContext } from "@lib/security/securityContext";

export const PATCH = withAuth(async (request, session) => {
  const body = await request.json();

  // 1. Input validation (Rule 3)
  const validation = validateAPIInput(updateItemPriceSchema, body);
  if (!validation.success) {
    logger.security(
      "Price Update Validation Failed",
      {
        ...buildSecurityContext(session, request),
        error: validation.error,
      },
      "medium",
    );
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { projectId, itemId, price } = validation.data;

  // 2. Tenant verification (Rule 2)
  if (!verifyTenantAccess(session, session.tId, session.sId, request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Update price and run integrity
  try {
    await runPricingIntegrity({
      projectId,
      itemId,
      newPrice: price,
      actorUserId: session.uId,
      tId: session.tId,
      sId: session.sId,
      changeType: "PRICE_CHANGED",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Price update failed", { projectId, itemId, error });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
});
```

### 3.3 API Route: Trigger PDF Regeneration (Internal)

**Path:** `@/src/app/api/internal/pdf-regen/route.ts`

```typescript
import { NextResponse } from "next/server";
import { withAuth } from "@middleware/auth";
import { enqueuePDFRegen } from "@lib/pricing/pdfQueue";

// Internal route - only called by integrity engine
export const POST = withAuth(
  async (request, session) => {
    const { projectId, version } = await request.json();

    await enqueuePDFRegen({
      projectId,
      tId: session.tId,
      sId: session.sId,
      requestedBy: session.uId,
      targetVersion: version,
    });

    return NextResponse.json({ queued: true });
  },
  {
    requiredRole: "OWNER", // Only owners can trigger
  },
);
```

---

## 4. Core Engine: Pricing Integrity Orchestrator

### 4.1 File: `@/src/lib/pricing/integrityEngine.ts` (NEW)

```typescript
import { db } from "@lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { sanitizeForFirestore } from "@lib/security/firestoreSanitizer";
import { secureLog, secureError } from "@lib/security/secureLogger";
import { enqueuePDFRegen } from "./pdfQueue";
import { logMOLEvent } from "./molLogger";

interface IntegrityParams {
  projectId: string;
  itemId: string;
  attributeId?: string;
  newPrice?: string;
  actorUserId: string;
  tId: number;
  sId: number;
  changeType: "PRICE_CHANGED" | "ATTRIBUTE_PRICE_CHANGED" | "TIME_SLOT_CHANGED";
}

export async function runPricingIntegrity(
  params: IntegrityParams,
): Promise<void> {
  const {
    projectId,
    itemId,
    attributeId,
    newPrice,
    actorUserId,
    tId,
    sId,
    changeType,
  } = params;

  const metadataRef = db
    .collection("projectsMetadata")
    .doc(String(tId))
    .collection(String(sId))
    .doc(projectId);

  const dataRef = db
    .collection("projectsData")
    .doc(String(tId))
    .collection(String(sId))
    .doc(projectId);

  await db.runTransaction(async (transaction) => {
    // 1. Get current state
    const metadataDoc = await transaction.get(metadataRef);
    const dataDoc = await transaction.get(dataRef);

    if (!metadataDoc.exists || !dataDoc.exists) {
      throw new Error("Project not found");
    }

    const metadata = metadataDoc.data();
    const data = dataDoc.data();
    const currentIntegrity =
      metadata?.pricingIntegrity || getDefaultIntegrityState();

    // 2. Get old price for audit
    const item = data?.extractedData?.data?.items?.find(
      (i: any) => i.id === itemId,
    );
    const oldPrice = attributeId
      ? item?.attributes?.find((a: any) => a.id === attributeId)?.price
      : item?.price;

    // 3. Update price in projectsData
    if (attributeId) {
      // Update attribute price
      const itemIndex = data.extractedData.data.items.findIndex(
        (i: any) => i.id === itemId,
      );
      const attrIndex = data.extractedData.data.items[
        itemIndex
      ].attributes.findIndex((a: any) => a.id === attributeId);
      transaction.update(dataRef, {
        [`extractedData.data.items.${itemIndex}.attributes.${attrIndex}.price`]:
          newPrice,
      });
    } else {
      // Update item price
      const itemIndex = data.extractedData.data.items.findIndex(
        (i: any) => i.id === itemId,
      );
      transaction.update(dataRef, {
        [`extractedData.data.items.${itemIndex}.price`]: newPrice,
      });
    }

    // 4. Update integrity state
    const newVersion = currentIntegrity.pdf.version + 1;
    const updatedIntegrity = sanitizeForFirestore({
      lastPriceChangeOn: Timestamp.now(),
      lastPriceChangeBy: actorUserId,
      pdf: {
        ...currentIntegrity.pdf,
        status: "STALE",
        version: newVersion,
      },
      screens: {
        lastBustedOn: Timestamp.now(),
        version: currentIntegrity.screens.version + 1,
      },
    });

    transaction.update(metadataRef, {
      pricingIntegrity: updatedIntegrity,
      modifiedOn: Timestamp.now(),
      modifiedBy: actorUserId,
    });

    // 5. Log MOL event (outside transaction for performance)
    setImmediate(() => {
      logMOLEvent({
        type: changeType,
        projectId,
        actorUserId,
        entityType: attributeId ? "ATTRIBUTE" : "ITEM",
        entityId: attributeId || itemId,
        before: { price: oldPrice },
        after: { price: newPrice },
        version: newVersion,
        tId,
        sId,
      });
    });

    // 6. Enqueue PDF regeneration (debounced)
    setImmediate(() => {
      enqueuePDFRegen({
        projectId,
        tId,
        sId,
        requestedBy: actorUserId,
        targetVersion: newVersion,
      });
    });
  });

  secureLog("[Pricing Integrity] Price updated", {
    projectId,
    itemId,
    changeType,
  });
}

function getDefaultIntegrityState() {
  return {
    lastPriceChangeOn: null,
    lastPriceChangeBy: null,
    pdf: {
      status: "FRESH" as const,
      lastGeneratedOn: null,
      lastGenerationJobId: null,
      lastFailureReason: null,
      version: 0,
      url: null,
    },
    screens: {
      lastBustedOn: null,
      version: 0,
    },
  };
}
```

### 4.2 File: `@/src/lib/pricing/pdfQueue.ts` (NEW)

```typescript
import { db } from "@lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { sanitizeForFirestore } from "@lib/security/firestoreSanitizer";
import { secureLog } from "@lib/security/secureLogger";

// Debounce tracking (in-memory for this instance)
const debounceTimers: Map<string, NodeJS.Timeout> = new Map();
const DEBOUNCE_MS = 60_000; // 60 seconds

interface EnqueueParams {
  projectId: string;
  tId: number;
  sId: number;
  requestedBy: string;
  targetVersion: number;
}

export async function enqueuePDFRegen(params: EnqueueParams): Promise<void> {
  const { projectId, tId, sId, requestedBy, targetVersion } = params;
  const key = `${tId}-${sId}-${projectId}`;

  // Clear existing timer for this project
  const existingTimer = debounceTimers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set new debounced timer
  const timer = setTimeout(async () => {
    debounceTimers.delete(key);
    await createRegenJob(params);
  }, DEBOUNCE_MS);

  debounceTimers.set(key, timer);
  secureLog("[PDF Queue] Regeneration scheduled", { projectId, targetVersion });
}

async function createRegenJob(params: EnqueueParams): Promise<void> {
  const { projectId, tId, sId, requestedBy, targetVersion } = params;

  const jobRef = db
    .collection("jobs")
    .doc("pdfRegen")
    .collection(String(tId))
    .collection(String(sId))
    .doc();

  const jobData = sanitizeForFirestore({
    id: jobRef.id,
    projectId,
    tId,
    sId,
    requestedOn: Timestamp.now(),
    requestedBy,
    targetVersion,
    status: "QUEUED",
    attempts: 0,
    lastError: null,
    completedOn: null,
  });

  await jobRef.set(jobData);
  secureLog("[PDF Queue] Job created", { jobId: jobRef.id, projectId });
}
```

### 4.3 File: `@/src/lib/pricing/molLogger.ts` (NEW)

```typescript
import { db } from "@lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { sanitizeForFirestore } from "@lib/security/firestoreSanitizer";
import { secureError } from "@lib/security/secureLogger";
import { DB_COLLECTIONS } from "@constants/database";
import type { MOLEvent, MOLEventType, MOLEntityType } from "@/types/mol.types";

interface LogMOLParams {
  type: MOLEventType;
  projectId: string;
  actorUserId: string;
  entityType: MOLEntityType;
  entityId: string;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  version: number;
  tId: number;
  sId: number;
}

export async function logMOLEvent(params: LogMOLParams): Promise<void> {
  const { tId, sId, ...eventData } = params;

  try {
    // Use existing MOL collection with tenant isolation
    const eventRef = db
      .collection(DB_COLLECTIONS.MENU_CHANGE_LOG)
      .doc(String(tId))
      .collection(String(sId))
      .doc();

    const event = sanitizeForFirestore({
      id: eventRef.id,
      ...eventData,
      createdOn: Timestamp.now(),
    });

    await eventRef.set(event);
  } catch (error) {
    // MOL logging should never block operations
    secureError("[MOL] Failed to log event", error as Error, {
      type: params.type,
      projectId: params.projectId,
    });
  }
}
```

---

## 5. Cloud Function: PDF Regeneration Worker

### 5.1 File: `@/functions/src/pdfRegenWorker.ts` (NEW)

```typescript
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { generateMenuPdf } from "./pdfGenerator"; // Use existing generator

const db = admin.firestore();

// Trigger on job creation
export const pdfRegenWorker = functions.firestore
  .document("jobs/pdfRegen/{tId}/{sId}/{jobId}")
  .onCreate(async (snap, context) => {
    const job = snap.data();
    const { tId, sId, jobId } = context.params;
    const jobRef = snap.ref;

    try {
      // 1. Mark job as running
      await jobRef.update({ status: "RUNNING" });

      // 2. Update integrity status
      const metadataRef = db
        .collection("projectsMetadata")
        .doc(tId)
        .collection(sId)
        .doc(job.projectId);

      await metadataRef.update({
        "pricingIntegrity.pdf.status": "GENERATING",
        "pricingIntegrity.pdf.lastGenerationJobId": jobId,
      });

      // 3. Get project data and generate PDF
      const dataDoc = await db
        .collection("projectsData")
        .doc(tId)
        .collection(sId)
        .doc(job.projectId)
        .get();

      const projectData = dataDoc.data();
      const pdfUrl = await generateMenuPdf(
        projectData,
        tId,
        sId,
        job.projectId,
      );

      // 4. Update success state
      await jobRef.update({
        status: "SUCCESS",
        completedOn: admin.firestore.Timestamp.now(),
      });

      await metadataRef.update({
        "pricingIntegrity.pdf.status": "FRESH",
        "pricingIntegrity.pdf.lastGeneratedOn": admin.firestore.Timestamp.now(),
        "pricingIntegrity.pdf.url": pdfUrl,
        "pricingIntegrity.pdf.lastFailureReason": null,
      });

      // 5. Log MOL success event
      await logMOLEvent({
        type: "PDF_REGEN_SUCCESS",
        projectId: job.projectId,
        actorUserId: "SYSTEM",
        entityType: "SYSTEM",
        entityId: jobId,
        before: null,
        after: { url: pdfUrl, version: job.targetVersion },
        version: job.targetVersion,
        tId: parseInt(tId),
        sId: parseInt(sId),
      });
    } catch (error) {
      // Handle failure with retry logic
      const attempts = (job.attempts || 0) + 1;
      const maxAttempts = 3;

      if (attempts < maxAttempts) {
        // Schedule retry with exponential backoff
        const delayMs = Math.pow(5, attempts) * 60_000; // 5m, 25m
        await jobRef.update({
          status: "QUEUED",
          attempts,
          lastError: (error as Error).message,
        });
        // Cloud Scheduler or delayed trigger would handle retry
      } else {
        // Max retries reached
        await jobRef.update({
          status: "FAILED",
          attempts,
          lastError: (error as Error).message,
          completedOn: admin.firestore.Timestamp.now(),
        });

        const metadataRef = db
          .collection("projectsMetadata")
          .doc(tId)
          .collection(sId)
          .doc(job.projectId);

        await metadataRef.update({
          "pricingIntegrity.pdf.status": "FAILED",
          "pricingIntegrity.pdf.lastFailureReason": (error as Error).message,
        });

        // Log MOL failure
        await logMOLEvent({
          type: "PDF_REGEN_FAILED",
          projectId: job.projectId,
          actorUserId: "SYSTEM",
          entityType: "SYSTEM",
          entityId: jobId,
          before: null,
          after: { error: (error as Error).message, attempts },
          version: job.targetVersion,
          tId: parseInt(tId),
          sId: parseInt(sId),
        });
      }
    }
  });
```

---

## 6. File Structure

```
src/
├── app/
│   └── api/
│       ├── projects/
│       │   └── [projectId]/
│       │       └── items/
│       │           └── [itemId]/
│       │               └── price/
│       │                   └── route.ts          # Price update endpoint
│       └── internal/
│           └── pdf-regen/
│               └── route.ts                      # Internal PDF trigger
├── lib/
│   ├── pricing/                                  # NEW FOLDER
│   │   ├── integrityEngine.ts                   # Core orchestrator
│   │   ├── pdfQueue.ts                          # Debounced PDF queue
│   │   ├── molLogger.ts                         # Audit logging
│   │   └── priceValidator.ts                    # Price string validation
│   └── validation/
│       └── pricing.schema.ts                    # Zod schemas
├── types/
│   ├── mol.types.ts                             # MOL event types
│   └── jobs.types.ts                            # Job queue types
│
functions/
└── src/
    └── pdfRegenWorker.ts                        # Cloud Function worker
```

---

## 7. Implementation Phases (~1 Week Total)

> **Note:** Web/QR and Staff Prompt already work (live Firestore reads). We only build what's actually new.

### Day 1-2: Foundation + Validation

| Task                                             | Effort | Status |
| ------------------------------------------------ | ------ | ------ |
| Create `pricing.schema.ts` with Zod schemas      | 2h     | ⬜     |
| Create `mol.types.ts` and `jobs.types.ts`        | 1h     | ⬜     |
| Add `PricingIntegrityState` to `ProjectMetadata` | 1h     | ⬜     |
| Update Firestore rules for jobs collection       | 1h     | ⬜     |
| Implement `molLogger.ts` (append-only)           | 2h     | ⬜     |
| Unit tests for price validation                  | 2h     | ⬜     |

### Day 3-4: PDF Generation

| Task                                          | Effort | Status |
| --------------------------------------------- | ------ | ------ |
| On-demand PDF generation endpoint             | 3h     | ⬜     |
| Progress indicator UI ("Generating...")       | 2h     | ⬜     |
| Add "Updated on: [date]" footer to PDF        | 1h     | ⬜     |
| Integrate with existing `menuPdfGenerator.ts` | 2h     | ⬜     |
| Background regen infrastructure (flagged OFF) | 3h     | ⬜     |
| Test: PDF generates correctly on-demand       | 1h     | ⬜     |

### Day 5: Screen Version + QA

| Task                                              | Effort | Status |
| ------------------------------------------------- | ------ | ------ |
| Add `screens.version` to integrity state          | 1h     | ⬜     |
| Screen client polls version, refreshes if changed | 2h     | ⬜     |
| End-to-end test: full integrity flow              | 2h     | ⬜     |
| Final QA across Screens + PDF                     | 2h     | ⬜     |

---

## 8. Security Checklist

| #   | Requirement                | Implementation                             | Status |
| --- | -------------------------- | ------------------------------------------ | ------ |
| 1   | `withAuth()` on all routes | All API routes use `withAuth()`            | ⬜     |
| 2   | `verifyTenantAccess()`     | Called before any data write               | ⬜     |
| 3   | Zod validation             | `pricing.schema.ts` validates all inputs   | ⬜     |
| 4   | Security logging           | `logger.security()` on validation failures | ⬜     |
| 5   | Rate limiting              | Standard DATA_WRITE limits                 | ⬜     |
| 6   | Firestore rules            | MOL and jobs collections scoped by tenant  | ⬜     |
| 7   | No sensitive data in logs  | Using `secureLog()`/`secureError()`        | ⬜     |
| 8   | Sanitize Firestore writes  | `sanitizeForFirestore()` on all writes     | ⬜     |

---

## 9. Firebase Cost Analysis

### Writes (Per Price Change)

| Operation                   | Writes   | Cost/100K   |
| --------------------------- | -------- | ----------- |
| Update item/attribute price | 1        | $0.18       |
| Update integrity state      | 1        | $0.18       |
| Create MOL event            | 1        | $0.18       |
| Create PDF job (debounced)  | 0.1 avg  | $0.018      |
| **Total per price change**  | **~3.1** | **~$0.006** |

### Reads (Per Screen Refresh)

| Operation                    | Reads    | Cost/100K   |
| ---------------------------- | -------- | ----------- |
| Check screens.version        | 1        | $0.06       |
| Fetch menu data (if changed) | 0.5 avg  | $0.03       |
| **Total per refresh**        | **~1.5** | **~$0.001** |

### Monthly Estimate (100 outlets, 10 price changes/day)

| Metric           | Calculation            | Cost           |
| ---------------- | ---------------------- | -------------- |
| Price changes    | 100 × 10 × 30 = 30,000 | $1.80          |
| Screen refreshes | 100 × 720 × 30 = 2.16M | $12.96         |
| PDF storage      | 100 × 5MB = 500MB      | $0.01          |
| **Total**        |                        | **~$15/month** |

---

## 10. Validation Report

| #   | Requirement                     | Test                             | Evidence                    | Status |
| --- | ------------------------------- | -------------------------------- | --------------------------- | ------ |
| V1  | Price update → Web/QR immediate | Edit price, check menu           | Firestore live read         | ⬜     |
| V2  | Price update → Screens ≤2min    | Edit price, check screen version | `screens.version` increment | ⬜     |
| V3  | Price update → PDF regenerates  | Edit price, check job queue      | Job created after debounce  | ⬜     |
| V4  | PDF download = latest           | Download after change            | `pdf.url` matches latest    | ⬜     |
| V5  | Time slots respected            | Set time slot, check surfaces    | Category visibility         | ⬜     |
| V6  | Rapid edits debounced           | 10 edits in 1 min                | Only 1 PDF job              | ⬜     |
| V7  | "Market Price" displays         | Set text price                   | PDF renders correctly       | ⬜     |
| V8  | Range price displays            | Set "199-249"                    | PDF renders correctly       | ⬜     |
| V9  | MOL logs immutable              | Check after changes              | Events exist, read-only     | ⬜     |
| V10 | Tenant isolation                | Cross-tenant test                | Access denied               | ⬜     |

---

## 11. Testing Guide

### 11.1 Manual Test: Basic Price Update

1. Login as outlet owner
2. Navigate to Projects → [Project] → Editor
3. Select any menu item
4. Change price from "299" to "349"
5. Save changes
6. **Verify:**
   - [ ] Web menu shows "349" immediately
   - [ ] Staff Prompt shows "349" immediately
   - [ ] `projectsMetadata` has `pricingIntegrity.pdf.status = 'STALE'`
   - [ ] After 60 seconds, `pdfRegen` job appears in Firestore
   - [ ] After job completes, `pdf.status = 'FRESH'`

### 11.2 Manual Test: Variant Price Update

1. Select item with variants (e.g., Half/Full)
2. Change "Full" price from "449" to "499"
3. Save changes
4. **Verify:**
   - [ ] Web menu shows updated variant price
   - [ ] PDF (when regenerated) shows updated variant

### 11.3 Manual Test: Rapid Edits

1. Make 5 price changes within 30 seconds
2. **Verify:**
   - [ ] Only ONE PDF regen job created (after debounce)
   - [ ] Job targets latest version

### 11.4 Manual Test: "Market Price"

1. Set item price to "Market Price"
2. **Verify:**
   - [ ] Web menu displays "Market Price"
   - [ ] PDF renders without layout break

### 11.5 Security Test: Cross-Tenant

1. Login as Tenant A
2. Attempt to update price for Tenant B's project
3. **Verify:**
   - [ ] 403 Forbidden returned
   - [ ] Security event logged

---

## 12. Progress Tracking

| Phase                            | Target      | Actual | Status             |
| -------------------------------- | ----------- | ------ | ------------------ | --- |
| Day 1-2: Foundation + Validation | 2 days      | —      | ⬜ Not Started     |
| Day 3-4: PDF Generation          | 2 days      | —      | ⬜ Not Started     |     |
| Day 5: Screen Version + QA       | 1 day       | —      | ⬜ Not Started     |
| **Total**                        | **~1 week** | —      | **⬜ Not Started** |

---

## 13. What We Are NOT Building (Already Works)

| Surface                 | Why No Work Needed                                          |
| ----------------------- | ----------------------------------------------------------- |
| **QR/Web Menu**         | Reads live from Firestore — price updates appear instantly  |
| **Staff Prompt**        | Reads live from Firestore — price updates appear instantly  |
| **Variant Integrity**   | Attributes already stored with prices in same Firestore doc |
| **Add-on Integrity**    | Same as variants — single source of truth                   |
| **Time-Slot Integrity** | `CategoryTimeSlot` already controls visibility              |

These surfaces have integrity **by default** because they read directly from Firestore with no caching layer.

---

**Document Signature:** Lead Architect  
**Last Updated:** January 18, 2026

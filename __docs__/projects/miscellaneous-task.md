# 📝 Miscellaneous / Next-Phase Tasks

This document collects all tasks that are **explicitly deferred**:

- "we will do after our other work gets done"
- "next phase"
- "before prod"
- or tasks you say we should **skip for now**.

We will use this file as a backlog and work through it later in a focused phase.

---

## 🔐 DEFERRED P0 TASKS (Phase 2 - Post-Launch)

### 1. AI Cost Control & Budget Tracking (Cross-Feature)

**Status**: ✅ **SUPERSEDED** (Feb 2026 — AI Enhancement Packs)

**Why Superseded**: The AI Enhancement Packs system (Sessions 12–14c) fully replaces this task:

- `checkAICapacity()` enforces per-store capacity on all 6 AI routes
- `consumeAICapacity()` deducts units per operation
- `addAiOperation()` records every transaction with `unitsConsumed`
- 402 `AICapacityError` pipeline shows calm upsell when exhausted
- Per-store subscription tracks `monthlyCredits` + `topUpCredits`
- No budget limits needed — capacity is subscription-based, not dollar-based

**Codebase Evidence**: `src/lib/ai/capacityCheck.ts`, `src/database/aiOperations/index.tsx`, all 6 API routes

**Original Priority**: P0  
~~**Deferred To**: Phase 2~~  
**Affects**: Multiple AI features (consolidated approach)

**Features Requiring Cost Control**:

1. **AI Image Generation** (ASSESSMENT-07)
   - Per-user daily/monthly limits
   - Batch size validation
   - Generation quota tracking
   - Cost estimation before generation

2. **AI Description Generation** (ASSESSMENT-09)
   - Per-item generation limits
   - Batch processing quotas
   - Cache hit rate tracking
   - Cost per description monitoring

3. **AI Data Extraction** (ASSESSMENT-02)
   - File upload limits per tenant
   - Monthly extraction quotas
   - Token usage tracking
   - Quality vs cost optimization

**Unified Cost Control Strategy**:

- Tracks per-tenant monthly AI spending across ALL features
- Sets budget limits ($50 default, configurable)
- Warns at 80% usage
- Soft throttle at 90% (requires confirmation)
- Blocks requests at 100%
- Prevents unlimited billing

**When to Implement**:

- After 1-2 months of production usage
- When we have actual cost data from all AI features
- Before opening to public (invite-only with approved users is safe)
- When we see pattern of abuse or excessive usage

**Implementation Notes**:

```typescript
interface AIUsageBudget {
  tenantId: string;
  storeId: string;
  month: string; // "2025-11"
  totalSpent: number; // USD
  requestCount: number;

  // Feature-specific costs
  imageProcessingCost: number; // ASSESSMENT-02: Data extraction
  translationCost: number;
  descriptionCost: number; // ASSESSMENT-09: Description gen
  imageGenerationCost: number; // ASSESSMENT-07: Image gen

  // Per-feature quotas
  imageGenerationCount: number; // Number of images generated
  descriptionGenerationCount: number; // Number of descriptions
  dataExtractionCount: number; // Number of files processed

  // Limits
  budgetLimit: number; // $50 default
  warningThreshold: number; // $40 (80%)
  imageGenerationLimit: number; // 100/month default
  descriptionGenerationLimit: number; // 500/month default
  dataExtractionLimit: number; // 50 files/month
}

interface CostEstimate {
  feature: "image_gen" | "description_gen" | "data_extraction";
  estimatedCost: number;
  currentUsage: number;
  remainingBudget: number;
  willExceedBudget: boolean;
}
```

**Files to Implement**:

1. `/src/lib/ai/costTracking.ts` - Unified cost tracking
2. `/src/lib/ai/quotaManager.ts` - Quota validation
3. `/src/database/aiUsage/index.ts` - Usage database operations
4. `/src/hooks/useAICostLimit.ts` - React hook for UI checks
5. `/src/app/api/ai/check-quota/route.ts` - Quota check endpoint

**Integration Points**:

- **Image Generation** (`ImageUploadModal.tsx` line 219-330): Check quota before `onStartBatchGeneration()`
- **Description Generation** (Description generation component): Check before batch generate
- **Data Extraction** (Upload flow): Check before processing file

**UI Requirements**:

- Budget usage dashboard (admin view)
- Warning modal at 80% usage
- Confirmation modal at 90% usage
- Block modal at 100% usage
- Cost estimation preview before expensive operations

**Estimate**: 3-4 days (consolidated implementation for all features)

---

### 2. Virtualization for Long Lists (ASSESSMENT-04)

**Why Deferred**: Code already optimized, handles 300-400 items smoothly

**Original Priority**: P0  
**Deferred To**: Only if production data shows menus >400 items

**Current Optimizations** (Already Done ✅):

- MenuItem memoized with React.memo
- renderItems wrapped in useCallback
- styles memoized with useMemo
- Framer Motion using whileInView

**Reality Check**:

- 95% of restaurants: <300 items
- Only extreme cases (buffets): 500+ items
- Current code handles this range well

**When to Implement**:

- If users report scroll lag
- If production data shows menus >400 items
- If browser performance monitoring shows issues

**Implementation Plan** (If Needed):

```bash
npm install react-window
```

Files to modify:

- `/src/components/templates/main-app/projects/b2cView/menuPage/layouts/menuLayout.tsx`
- `/src/components/templates/main-app/projects/editorView/EditorContent.tsx`

**Estimate**: 2 days

---

### 3. Security Audit Logging (ASSESSMENT-05)

**Status**: ✅ **IMPLEMENTED** (Session 16c — Feb 25, 2026)

**What Was Built**:

- **Infrastructure**: `src/lib/monitoring/logger.ts` — structured logger with levels (debug/info/warn/error/security), Sentry integration, 72+ files, `logger.security()` with severity levels + Sentry tagging
- **Audit Points Instrumented** (5 destructive operations):
  1. `deleteProject()` — `src/database/projects/index.ts` — severity: medium
  2. `restoreProject()` — `src/database/projects/index.ts` — severity: low
  3. Outlet deactivation — `src/app/api/outlets/deactivate/route.ts` — severity: medium
  4. CSV data export — `src/utils/exportUtils.ts` — severity: low
  5. Analytics data export — `src/lib/export/exportService.ts` — severity: low

**How It Works**: Each audit point calls `logger.security(event, details, severity)`. In dev: styled console output. In prod: Sentry event with `type: 'security'` tag, severity level, fingerprinting for grouping, and searchable tags.

**Original Priority**: P0  
~~**Deferred To**: Phase 2~~

**What to Track** (If Implemented):

**Must Track (P0)**:

1. Project Deletion - Prevent/investigate data loss disputes
2. Data Export - Track potential data exfiltration (compliance)
3. Bulk Delete Operations - Catch accidental mass deletions

**Should Track (P1)**: 4. Failed Auth Attempts - Detect brute force attacks 5. API Key Changes - Track credential modifications 6. User Role Changes - Audit permission escalations

**When to Implement**:

- If pursuing SOC2/ISO compliance
- If enterprise customers require audit logs
- If data loss incidents occur
- Before handling sensitive data (PII, financial)

**Implementation Notes**:

```typescript
interface SecurityAuditLog {
  userId: string;
  tenantId: string;
  action: "delete" | "export" | "bulk_delete" | "auth_failed";
  resource: string;
  ip: string;
  userAgent: string;
  timestamp: Timestamp;
  metadata: any;
}
```

**Estimate**: 1-2 days

---

### 4. Data Encryption at Rest (ASSESSMENT-05)

**Why Deferred**: Firestore default encryption is sufficient for menu data

**Original Priority**: P1  
**Deferred To**: Only if handling sensitive data or compliance requirements

**Current State**: Firestore encrypts all data at rest by default ✅

**When to Implement**:

- If handling credit cards → Use Stripe (they handle it)
- If handling health data → HIPAA compliance
- If handling financial data → PCI-DSS compliance
- If storing customer PII → Already protected by Firestore

**Implementation Plan** (If Needed):

- Use AES-256-GCM encryption
- Store keys in Secret Manager
- Implement key rotation
- Encrypt: project config, theme settings

**Files to Create**:

```
- /src/lib/security/encryption.ts
```

**Files to Modify**:

```
- /src/database/projects/index.ts (encrypt/decrypt)
```

**Estimate**: 2-3 days

---

## 1️⃣ ASSESSMENT-02: AI Extraction – Performance & Edge Cases (Deferred)

Source: [ASSESSMENT-02-AI-EXTRACTION.md](./ASSESSMENT-02-AI-EXTRACTION.md)

### 1.1 Edge Cases (Deferred to Phase 2)

- **Edge Case 1: Menu in Multiple Languages**  
  **Current**: Extracts first language only  
  **Fix (later)**: Detect multiple languages, ask user to confirm primary.

- **Edge Case 2: Menu with No Prices**  
  **Current**: Sets price to 0  
  **Fix (later)**: Mark as "Price on request" or prompt user.

- **Edge Case 3: Handwritten Menu**  
  **Current**: Poor OCR quality  
  **Fix (later)**: Warn user upfront, suggest typed menu.

- **Edge Case 4: Menu with Special Characters (€, ¥, ₹)**  
  **Current**: May not parse correctly  
  **Fix (later)**: Normalize currency symbols in prompt.

- **Edge Case 5: Very Long Item Names (50+ chars)**  
  **Current**: May truncate in UI  
  **Fix (later)**: Add validation, truncate with ellipsis.

---

### 1.2 Performance Optimizations (Deferred)

These are **not implemented now**. We will revisit when focusing on optimization/cost.

#### Opt 1: Batch Processing

- **Goal**: Process multiple images in a single AI call instead of sequential.
- **Idea**:
  ```ts
  // Instead of: 3 images = 3 API calls
  // Do: 3 images = 1 API call with all images
  const processMultipleImages = async (images: string[]) => {
    const parts = images.map((img) => createPartFromUri(img));
    return await geminiModel.generateContent([prompt, ...parts]);
  };
  ```

#### Opt 2: Use Cheaper Model for Simple Menus

- **Goal**: Reduce AI cost for simple cases.
- **Idea**:

  ```ts
  // Use Gemini 1.5 Flash (cheaper) for simple menus
  // Use Gemini 2.5 Flash (expensive) only for complex menus

  const selectModel = (
    imageCount: number,
    complexity: "simple" | "complex",
  ) => {
    if (complexity === "simple" && imageCount === 1) {
      return "gemini-1.5-flash"; // 50% cheaper
    }
    return "gemini-2.5-flash";
  };
  ```

#### Opt 3: Compress Images Before Upload

- **Goal**: Reduce payload size and cost without hurting quality.
- **Idea**:
  ```ts
  // Reduce image size before sending to AI
  const compressForAI = async (imageUrl: string): Promise<string> => {
    // Resize to max 1024x1024 (AI doesn't need higher resolution)
    // Convert to WebP for smaller size
    // Quality: ~80%
  };
  ```

**Note**: User prefers full quality for AI extraction (per previous decision)

---

## How We Will Use This File

- Whenever you say:
  - "we will do this after"
  - "in next phase"
  - "before prod"
  - or "skip for now"

  → I will **add that task here** with:
  - Source file / assessment
  - Short description
  - Implementation notes
  - Decision rationale

Later, when you say "now let's do the pending/misc tasks", we can just open this file and pick items one by one.

---

## 2️⃣ UI LABEL CUSTOMIZATION: Business-Type-Wise Labeling (Deferred)

**Status**: ✅ **DONE** (implemented via `src/config/businessLabels.ts`)

**Added**: December 15, 2025  
**Original State**: Using universal term "Catalog" for all business types  
~~**Deferred To**: Phase 2~~

**What Was Built**: `src/config/businessLabels.ts` provides `getOwnerLabels()` for business-type-aware UI labels. `getBusinessCategory()` in `src/data/shared/businessTypes.ts` maps business types to categories. Labels are used in editor components.

### Context

The tool is used by multiple SMB business types (Restaurant, Cafe, Gym, Salon, Spa, Bakery, Bar, Hotel, Retail, Healthcare, etc.). The term "Catalog" was chosen as a universal term, but industry-specific terminology would provide better UX.

### Proposed Dynamic Labels

| Business Type                 | Current Label | Ideal Label                 |
| ----------------------------- | ------------- | --------------------------- |
| Restaurant, Cafe, Bar, Bakery | Catalog       | **Menu**                    |
| Salon, Spa                    | Catalog       | **Services**                |
| Gym, Fitness                  | Catalog       | **Classes** or **Programs** |
| Retail, E-commerce            | Catalog       | **Catalog** (no change)     |
| Hotel                         | Catalog       | **Offerings**               |
| Healthcare                    | Catalog       | **Services**                |

### Implementation Plan

1. **Store business type** in tenant/store settings (check if exists in the `BUSINESS_TYPES` constant in `src/data/shared/businessTypes.ts`)

2. **Create label mapping utility**:

```typescript
// src/lib/ui/catalogLabels.ts
export const CATALOG_LABELS: Record<
  string,
  { singular: string; plural: string }
> = {
  // Food & Beverage
  Restaurant: { singular: "Menu", plural: "Menus" },
  Cafe: { singular: "Menu", plural: "Menus" },
  Bar: { singular: "Menu", plural: "Menus" },
  Bakery: { singular: "Menu", plural: "Menus" },

  // Service-based
  Salon: { singular: "Service List", plural: "Service Lists" },
  Spa: { singular: "Treatment Menu", plural: "Treatment Menus" },
  Gym: { singular: "Class Schedule", plural: "Class Schedules" },

  // Retail
  Retail: { singular: "Catalog", plural: "Catalogs" },

  // Default fallback
  default: { singular: "Catalog", plural: "Catalogs" },
};

export function getCatalogLabel(businessType: string, plural = false): string {
  const labels = CATALOG_LABELS[businessType] || CATALOG_LABELS["default"];
  return plural ? labels.plural : labels.singular;
}
```

3. **Create React hook**:

```typescript
// src/hooks/useCatalogLabel.ts
export function useCatalogLabel() {
  const { storeDetails } = useContext(PlatformGlobalDataContext);
  const businessType = storeDetails?.businessType || "default";

  return {
    singular: getCatalogLabel(businessType, false),
    plural: getCatalogLabel(businessType, true),
  };
}
```

4. **Update UI components** to use dynamic labels:
   - `ProjectSelector.tsx`
   - `ProjectEditModal.tsx`
   - `ProjectConfirmModal.tsx`
   - `ProjectDuplicateModal.tsx`
   - `EmptyProjectState.tsx`
   - `WelcomeModal.tsx`
   - `index.tsx` (messages)

### Files to Create

- `/src/lib/ui/catalogLabels.ts` - Label mapping
- `/src/hooks/useCatalogLabel.ts` - React hook

### Files to Modify

- All files in `/src/components/templates/main-app/projects/` that display "Catalog" text

### Prerequisites

- Business type must be stored in store settings (verify in `storeDetails.businessType`)
- If not available, add business type selection to store onboarding

### Estimate

- 1-2 days implementation
- Test with different business types

---

## 🗂️ DATA MODEL IMPROVEMENTS

### 5. Store `businessCategory` in Store Object During Onboarding

**Status**: ✅ **DONE**

**What Was Built**: `businessCategory` is now stored directly in the store document. `src/database/stores/index.tsx` computes it from `getBusinessCategory(businessType)` on both `createStore()` and `updateStore()`. Also synced to `storesSummary` for Cloud Function optimization. `src/types/platform/store.ts` has `businessCategory: string` field.

**Original Context**: Decision Intelligence feature implementation  
~~**Deferred To**: Phase 2~~

**Problem Discovered**:
Two different implementations of `getBusinessCategory()` existed:

| Location                                 | Approach                               | Issue                  |
| ---------------------------------------- | -------------------------------------- | ---------------------- |
| `src/data/shared/businessTypes.ts`       | Exact lookup in `BUSINESS_TYPES` array | ✅ Correct             |
| `functions/src/recommendationScoring.ts` | Crude `.includes()` string matching    | ❌ Wrong, inconsistent |

**Example of Mismatch**:

- Business type: `"Photography Studio"`
- Frontend function: Returns `'creative'` ✅
- Old Cloud Function: Returns `'default'` ❌ (no match for "photo")

**Current Fix (Temporary)**:
Replicated `BUSINESS_TYPE_CATEGORIES` lookup table in Cloud Functions to match frontend.
See `functions/src/recommendationScoring.ts` lines 117-195.

**Problem with Current Approach**:

- Duplicate mapping logic (frontend + Cloud Functions)
- Must keep both in sync when adding new business types
- More places to forget to update

**Better Solution** (To Implement):
Store `businessCategory` directly in store document during onboarding:

```typescript
// In store document (computed once during onboarding)
{
  businessType: "Photography Studio",
  businessCategory: "creative"  // ← Computed from BUSINESS_TYPES, stored permanently
}
```

**Benefits**:

- Single source of truth in database
- No duplicate mapping logic needed
- Cloud Functions just read `store.businessCategory`
- No sync issues between frontend/backend
- Faster lookups (no computation needed)

**Files to Modify**:

1. **Store Creation/Update** (`src/database/stores/index.ts`):

   ```typescript
   // When creating/updating store
   const businessCategory = getBusinessCategory(businessType);
   await storeRef.set({
     ...storeData,
     businessType,
     businessCategory, // ← Add this
   });
   ```

2. **Onboarding Flow** (`src/components/templates/platform/StoreWizard/` or similar):
   - Compute category when business type is selected
   - Save both fields together

3. **Cloud Functions** (`functions/src/recommendationScoring.ts`):

   ```typescript
   // Before (lookup):
   const businessCategory = getBusinessCategory(storeData.businessType);

   // After (direct read):
   const businessCategory = storeData.businessCategory || "default";
   ```

4. **Migration Script** (one-time):
   - Update existing stores to add `businessCategory` field
   - Can run as Cloud Function or admin script

**Store Type Update**:

```typescript
// src/types/platform/store.ts
interface StoreDataType {
  // ... existing fields
  businessType?: string;
  businessCategory?: string; // ← Add this
}
```

**When to Implement**:

- Before adding more category-dependent features
- When we need to use businessCategory in more Cloud Functions
- During a data model cleanup sprint

**Estimate**: 0.5-1 day

---

## Summary (Updated Feb 25, 2026)

**Total Tasks**: 15 | **Done/Superseded**: 7 | **Still Deferred**: 6 | **Not Recommended**: 1 | **N/A**: 1

### ✅ Completed / Superseded (no action needed)

| #   | Task                              | How Resolved                                                  |
| --- | --------------------------------- | ------------------------------------------------------------- |
| 1   | AI Cost Control & Budget Tracking | Superseded by AI Enhancement Packs (capacity system)          |
| 3   | Security Audit Logging            | Session 16c — 5 audit points via `logger.security()` + Sentry |
| 5   | UI Label Customization            | `src/config/businessLabels.ts` + `getOwnerLabels()`           |
| 6   | Store `businessCategory`          | Stored in store doc on create/update                          |
| 3.1 | Client-Side Logging               | `src/lib/monitoring/logger.ts` — 72+ files, Sentry            |
| 4.1 | Transaction Recording             | `addAiOperation()` active in all 6 AI routes                  |
| 4.2 | Batch Size Limit                  | Superseded by `checkAICapacity()` enforcement                 |

### ⏸️ Still Deferred (no action needed now)

| #       | Task                         | When to Revisit                     |
| ------- | ---------------------------- | ----------------------------------- |
| 2       | Virtualization               | Only if production shows >400 items |
| 4       | Data Encryption              | Firestore default sufficient        |
| 3.2     | Auto-Merge Items             | During multi-outlet feature work    |
| 5.1     | Translation Memory (Cache)   | After 1-2 months production usage   |
| 5.2     | Allergen Translation         | If food safety compliance required  |
| 1.1-1.2 | Extraction Edge Cases & Perf | Post-launch optimization phase      |

### ❌ Not Recommended

| #   | Task                | Reason                              |
| --- | ------------------- | ----------------------------------- |
| 5.3 | Cultural Adaptation | Violates doctrine (owner authority) |

---

## 3️⃣ AI DATA EXTRACTION: Production Review Deferred Items

**Added**: January 23, 2026  
**Source**: `__docs__/projects/ai-data-extraction/production-review.md`

### 3.1 Client-Side Logging Standardization (L1)

**Status**: ✅ **DONE**

**What Was Built**: `src/lib/monitoring/logger.ts` — structured logger with levels (debug, info, warn, error, security), Sentry integration, environment-aware formatting. Used across 72+ files and 283+ call sites. `logger.security()` method for security-sensitive events.

**Codebase Evidence**: `src/lib/monitoring/logger.ts`, imported as `import { logger } from '@lib/monitoring/logger'`

~~**Estimate**: 1 day~~

---

### 3.2 Auto-Merge Items Implementation (M5)

**Status**: ⏸️ **STILL DEFERRED**

**Why Deferred**: Will implement during multi-chain/multi-outlet feature work

**Current State**: `saveFilesToProject.ts` computes auto-merge stats but doesn't actually merge items. Comment at lines 187-190 states: "Note: For now, we still append new files with their items. The auto-merge stats are for reporting; actual item merging would require restructuring..."

**What Auto-Merge Should Do**:

- When uploading new menu images to existing project
- Find items with same name in same category
- Replace old item with new extracted item
- Preserve manual edits if marked as user-modified

**Implementation Plan**:

1. Add `isUserModified` flag to items
2. Implement actual merging logic in `saveFilesToProject.ts`
3. Track merge statistics for reporting
4. Handle edge cases (category renamed, item moved)

**Estimate**: 2-3 days (during multi-chain feature work)

---

## 4️⃣ AI IMAGE GENERATION: Deferred Items

**Added**: January 30, 2026  
**Source**: `__docs__/projects/ai-image-generation/ai-image-generation_verification.md`

### 4.1 Transaction Recording (Enable `addAiOperation()`)

**Status**: ✅ **DONE**

**What Was Built**: `addAiOperation()` is now active in ALL 6 AI routes:

- `descriptions/route.ts` — line 202
- `translations/route.ts` — line 146
- `new-item-metadata/route.ts` — line 158
- `image-generation/route.ts` — line 293
- `image-editing/route.ts` — line 167
- `image-generation/batch-generation/route.ts` — line 292

Each transaction records `unitsConsumed` via `getUnitCost()`, real cost via `getRealCostPaise()`, and our charge via `getOurChargePaise()`. Capacity is consumed via `consumeAICapacity()` after successful operation.

**Codebase Evidence**: `src/database/aiOperations/index.tsx`, `src/constant/AI/unitCosts.ts`

~~**Estimate**: 0.5 day~~

---

### 4.2 Batch Size Limit Based on Credit Balance

**Status**: ✅ **SUPERSEDED** (Feb 2026 — AI Enhancement Packs)

**Why Superseded**: `checkAICapacity()` in `batch-trigger/route.ts` enforces capacity before batch starts. Returns 402 `AICapacityError` if exhausted. Frontend catches this via `AICapacityGate` and shows calm upsell CTA. No need for credit-based batch size limits — the capacity system handles enforcement.

~~**Current State**: No batch size validation~~

**Problem**:

- Users can trigger batch generation for unlimited items
- Risk of runaway costs
- No protection against accidental large batches

**Proposed Solution**:
Instead of fixed limit (e.g., 50 items), dynamically calculate based on:

1. User's active subscription tier
2. Current credit balance
3. Estimated cost per image

```typescript
interface BatchLimitCheck {
  maxItems: number; // Dynamic based on credits
  estimatedCost: number; // Total cost for batch
  currentCredits: number; // User's available credits
  canProceed: boolean; // Credits sufficient?
  warningMessage?: string; // If approaching limit
}

const checkBatchLimit = async (
  userId: string,
  itemCount: number,
): Promise<BatchLimitCheck> => {
  const subscription = await getUserSubscription(userId);
  const credits = await getCreditBalance(userId);
  const costPerImage = COST_PER_IMAGE_GENERATION; // From config

  const estimatedCost = itemCount * costPerImage;
  const maxAffordable = Math.floor(credits / costPerImage);

  return {
    maxItems: maxAffordable,
    estimatedCost,
    currentCredits: credits,
    canProceed: itemCount <= maxAffordable,
    warningMessage:
      itemCount > maxAffordable
        ? `You can generate up to ${maxAffordable} images with your current credits`
        : undefined,
  };
};
```

**UI Changes Needed**:

- Show estimated cost before batch start
- Warning if batch exceeds credit balance
- Option to reduce batch size or buy credits

**Files to Modify**:

1. `src/app/api/image-generation/batch-trigger/route.ts` - Add validation
2. `BatchImageGenerationView.tsx` - Show cost estimate
3. `src/lib/ai/creditCheck.ts` - New utility (create)

**Dependencies**:

- Subscription system
- Credits/billing infrastructure
- Cost per image finalized

**Estimate**: 2-3 days (once dependencies ready)

---

## 5️⃣ MULTI-LANGUAGE TRANSLATION: Deferred Items

**Added**: January 31, 2026  
**Source**: `__docs__/projects/multi-language-translation/multi-language-translation_impl.md`

### 5.1 Translation Memory (Cache)

**Why Deferred**: Requires new Firestore collection and lookup infrastructure

**Priority**: P2  
**Deferred To**: Phase 2 (after production cost data available)

**What it is:**
A cache of previously translated phrases. When you translate "Chicken Wings" to Spanish once, the system remembers "Alitas de Pollo" and reuses it next time. Saves API costs and ensures consistency across menus.

**Current State:**
Every translation is fresh from AI. If you add Spanish to 5 menus, "Chicken Wings" gets translated 5 times separately.

**Implementation Plan:**

```typescript
// Database: translation_memory collection
interface TranslationMemoryEntry {
  tenantId: string;
  sourceText: string;
  sourceLang: string;
  translations: Record<string, string>; // { "es": "Alitas de Pollo", "fr": "Ailes de Poulet" }
  usageCount: number;
  lastUsed: Timestamp;
}

// Before calling AI:
const cached = await getFromTranslationMemory(text, sourceLang, targetLang);
if (cached) return cached; // Skip AI call, save cost
const fresh = await translateViaAI(text);
await saveToTranslationMemory(text, targetLang, fresh);
return fresh;
```

**Files to Create:**

- `/src/database/translationMemory/index.ts` - CRUD operations
- `/src/lib/translation/memoryCache.ts` - Cache lookup utility

**Files to Modify:**

- `src/components/.../projects/utils/translationsUtils.ts` - Add cache check before API call
- `src/app/api/translations/route.ts` - Optional: server-side caching

**Benefits:**

- Reduces AI API costs (cache hits = free)
- Ensures consistent translations across menus
- Faster translation for common items

**When to Implement:**

- After 1-2 months of production usage with cost data
- When translation costs become significant
- Before opening to high-volume users

**Estimate**: 2-3 days

---

### 5.2 Allergen Translation Double-Check

**Why Deferred**: Manual editing is the safety layer; no compliance requirement yet

**Priority**: P3  
**Deferred To**: Phase 2 (if compliance requirements arise)

**What it is:**
Allergen information (nuts, gluten, dairy, shellfish) is **safety-critical**. A mistranslation could cause severe allergic reactions. Industry best practice recommends that allergen translations get extra validation beyond normal menu items.

**Current State:**
MenuList translates allergens the same way as other text (name, description). No special handling.

**Implementation Plan:**

```typescript
// Option A: Flag allergens in prompt
const prompt = `Translate these menu items.
IMPORTANT: Items marked [ALLERGEN] are safety-critical.
Double-check these translations for accuracy.

${JSON.stringify(items)}`;

// Option B: Separate allergen validation call
const allergenItems = items.filter((i) => i.allergens?.length > 0);
const allergenTranslations = await translateWithHigherAccuracy(allergenItems);
```

**Why Deferred:**

- Current AI translation is reliable enough for allergens
- Users can manually edit translations (the real safety layer)
- No compliance requirement at this stage

**When to Implement:**

- If food safety compliance becomes a requirement
- If user feedback indicates allergen translation issues
- Before handling health-sensitive data

**Estimate**: 1 day

---

### 5.3 Cultural Adaptation

**Status**: ❌ NOT RECOMMENDED  
**Priority**: N/A  
**Reason**: Violates MenuList doctrine

**What it is:**
Literal translations don't account for cultural context. "Spicy" in India means something different than "spicy" in USA. "Mild" might be too hot for some cultures.

**Why NOT Recommended:**

This violates MenuList doctrine on multiple counts:

| Doctrine Rule                  | Violation                                                      |
| ------------------------------ | -------------------------------------------------------------- |
| **No explanations**            | Adapting spice levels requires explaining decisions to owner   |
| **Owners override**            | Owner knows their audience best, system shouldn't assume       |
| **Infrastructure positioning** | System should be boring, not creative                          |
| **Default Authority**          | System making cultural decisions = taking authority from owner |

**Correct Approach:**
The current literal translation is correct. Owners can manually adjust translations if they want cultural adaptation. This keeps the system boring and trustworthy.

**Decision**: Will NOT be implemented. Documented for reference only.

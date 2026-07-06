# Onboarding Centralization

> **Status:** Implemented source evidence; not current launch certification
> **Last Updated:** 2026-07-02
> **Scope:** Centralize atomic tenant+store creation across all onboarding flows

---

## Current Release Boundary (July 2, 2026)

This document records the source-backed onboarding centralization helper and caller adoption. It is not production-launch approval for onboarding.

Current onboarding release approval routes through:

- the active production-readiness audit and External Certification Runbook;
- `npm run verify:agent-readiness`;
- `npm run verify:auth-security-failure-matrix`;
- authenticated browser/API smoke for the target onboarding flow;
- Razorpay sandbox evidence where subscription creation is in release scope;
- Firebase Auth custom-claims/token smoke where account/session handoff is in scope;
- provider-failure compensation evidence for create-subscription and public claim flows;
- target Firebase deploy evidence where rules, indexes, Storage rules, or Cloud Function logic change;
- target Vercel deploy evidence where app routes or middleware change;
- production-host smoke for the target tenant/store creation path.

## Problem

Tenant + store creation logic is duplicated across **5 active files** (~80 lines each). Adding a new core field (e.g., a new required store field) requires updating all 5 files — high risk of missing one.

## Files Analyzed (7 total)

| # | File | Creates Tenant/Store? | Status |
|---|------|-----------------------|--------|
| 1 | `functions/src/messagingOnboarding/publishPipeline.ts` | Yes | ⚠️ DEAD CODE (ADR-10) |
| 2 | `src/app/api/auth/claim-account/route.ts` | **No** — transfers only | ❌ Not onboarding |
| 3 | `src/app/api/answerlattice/onboard/route.ts` | Yes | ✅ Active |
| 4 | `src/app/api/msg-preview/[sessionId]/approve/route.ts` | Yes | ✅ Active |
| 5 | `src/app/api/onboarding/create-subscription/route.ts` | Yes | ✅ Active |
| 6 | `src/app/api/public/create-menu/claim/route.ts` | Yes | ✅ Active |
| 7 | `src/app/api/reseller/onboard/route.ts` | Yes | ✅ Active |

**5 active onboarding files** need centralization. File 2 (claim-account) is not onboarding. File 1 is dead code.

## Shared Logic (Duplicated 5 Times)

These exact operations appear in every active file:

1. Read `platformSummary` doc with transaction lock
2. Compute `newTenantId = tenants.count + 1`, `newStoreId = stores.count + 1`
3. Compute `storeName`, `tenantKey`, `storeKey`, `businessCategory`
4. Generate `defaultRoles` via `createDefaultRoles()`
5. Optionally generate subdomain (slugify + uniqueness + reserved check)
6. Optionally generate `timeSlotPresets`
7. Create **Tenant** document
8. Create **Store** document
9. Sync **storesSummary** (platformSummary)
10. Update **platformSummary** counts

## Unique Logic Per File (Stays in Callers)

| File | Unique Logic |
|------|-------------|
| Answerlattice | productId: 'AL', API key gen, beta subscription |
| msg-preview/approve | Double-publish protection, retry, session state, claimToken, country inference, project creation |
| create-subscription | Razorpay subscription, plan lookup |
| public-menu/claim | Draft handling, existing-user branch (add project only) |
| reseller/onboard | Online/offline billing, reseller transactions, reseller profile |

## Solution: Transaction Helper Pattern

### New File: `src/lib/onboarding/createTenantStore.ts`

Two exports:

1. **`preCheckSubdomain(db, businessName)`** — Run BEFORE transaction (Firestore transactions can't do WHERE queries on other collections)
2. **`createTenantStoreInTransaction(transaction, db, config)`** — Run INSIDE a transaction. Creates tenant + store + syncs storesSummary + updates counts.
3. **`updateUserWithTenantStore(transaction, db, userId, result)`** — Optional helper for the common user update pattern.

July 5 user-ID boundary: shared onboarding helpers use `src/lib/onboarding/onboardingUserId.ts` before composing `users/{userId}` refs. `updateUserWithTenantStore()` normalizes the supplied user ID before the user update ref, provider-failure compensation normalizes `params.userId` before cleanup reads/writes, and reseller onboarding normalizes Firebase Auth-generated UIDs before creating a new owner user doc. Malformed, whitespace-mutated, path-shaped, reserved, empty, or oversized user IDs fail before user document path composition.

### How Callers Use It

```typescript
// 1. Pre-check subdomain (outside transaction)
const preChecked = await preCheckSubdomain(db, businessName);

// 2. Run transaction
const result = await db.runTransaction(async (transaction) => {
    // 3. Create tenant + store (centralized)
    const core = await createTenantStoreInTransaction(transaction, db, {
        businessName,
        businessType: 'Restaurant',
        email: session.user.email,
        onboardingSource: 'WEBSITE_ONBOARDING',
        subdomain: { preChecked },
        includeTimeSlotPresets: true,
        storeExtra: { city: 'Mumbai' }, // Source-specific fields
    });

    // 4. Handle user (caller-specific)
    updateUserWithTenantStore(transaction, db, userId, core);

    // 5. Handle project, subscription, etc. (caller-specific)
    return { tenantId: core.tenantId, storeId: core.storeId };
});

// 6. Post-transaction work (Razorpay, session update, etc.)
```

### Config Interface

```typescript
interface TenantStoreConfig {
    businessName: string;        // Display name
    businessType: string;        // 'Restaurant', 'Salon', 'SaaS'
    email: string;               // Owner email
    onboardingSource: string;    // 'WEBSITE_ONBOARDING', etc.
    businessIndustry?: string;   // 'B2C', 'B2B', '' (default: '')
    subdomain?: { preChecked: string }; // Subdomain config
    includeTimeSlotPresets?: boolean;   // Default: false
    tenantExtra?: Record<string, any>;  // Source-specific tenant fields
    storeExtra?: Record<string, any>;   // Source-specific store fields
}
```

### Result Interface

```typescript
interface TenantStoreResult {
    tenantId: number;
    storeId: number;
    storeName: string;
    subdomain?: string;
    now: Timestamp;
    defaultRoles: any;
}
```

## Bugs Found & Fixed

| # | File | Bug | Fix |
|---|------|-----|-----|
| 1 | `publishPipeline.ts` | FLAT project path `projects/{id}` | Dead code — comment added |
| 2 | `msg-preview/approve` | Hardcoded `role: "owner"` | Changed to `getOwnerRoleId()` |
| 3 | `reseller/onboard` | `import { Timestamp } from "firebase/firestore"` (client SDK in server route) | Changed to `admin.firestore.Timestamp` |
| 4 | Multiple | Inconsistent `tenantKey` generation | Standardized to `.toLowerCase().replaceAll(' ', '_')` |

## Files Modified

| File | Change |
|------|--------|
| `src/lib/onboarding/createTenantStore.ts` | **NEW** — Centralized utility |
| `src/app/api/onboarding/create-subscription/route.ts` | Refactored to use centralized utility |
| `src/app/api/answerlattice/onboard/route.ts` | Refactored to use centralized utility |
| `src/app/api/msg-preview/[sessionId]/approve/route.ts` | Refactored to use centralized utility + bug fix |
| `src/app/api/public/create-menu/claim/route.ts` | Refactored to use centralized utility |
| `src/app/api/reseller/onboard/route.ts` | Refactored to use centralized utility + bug fix |
| `functions/src/messagingOnboarding/publishPipeline.ts` | Comment added (dead code) |

## Files NOT Modified

| File | Reason |
|------|--------|
| `src/app/api/auth/claim-account/route.ts` | Not onboarding — transfers ownership, doesn't create tenant/store |

## Future Benefit

When adding a new core field to all tenants/stores:
- **Before:** Edit 5 files, hope you don't miss one
- **After:** Edit 1 file (`createTenantStore.ts`), all flows get it automatically

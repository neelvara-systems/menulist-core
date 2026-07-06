# Reseller Dashboard — Implementation Plan

**Feature:** Assisted Onboarding Portal for Authorized Resellers  
**Status:** Implemented - reseller boundary source gate added July 2, 2026
**Created:** February 27, 2026  
**Last Updated:** July 2, 2026
**Audience:** Developers

July 4, 2026 account/link boundary correction:

- Active reseller onboarding creates the tenant/store account, owner access, subscription state, dashboard link, and public customer link handoff.
- It does not upload menu files or run menu extraction inside `/api/reseller/onboard`; menu content is added through the standard owner dashboard and import/review flows after account handoff.

July 5, 2026 monthly-summary query boundary:

- Missing `month` still uses the current India month for `/api/reseller/monthly-summary`.
- Malformed or impossible explicit `month` query values now return `400` before monthly transaction/profile reads.
- Accepted explicit months must be calendar-valid `YYYY-MM` values from 2020 through 2100.

July 2, 2026 source-gate correction:

- `npm run verify:reseller-dashboard-boundary` now locks reseller route admission order, platform/reseller role separation, hashed read/write rate-limit keys, bounded request/response parsing, offline/manual entitlement sync, online-provider failure compensation, desktop/mobile shell parity, and docs parity.
- The gate is source-only. It does not replace Razorpay sandbox smoke, authenticated browser QA, physical-device mobile QA, Firebase deploys, Vercel deploys, production builds, live Firestore writes, or provider calls.

July 1, 2026 runtime corrections:

- `/reseller` and `/reseller/onboard` now render under a server layout that requires `ENABLE_RESELLER_DASHBOARD` plus `platformRole` of `PLATFORM` or `RESELLER` before the client pages load.
- `/reseller/manage` now has an additional nested server layout that requires full `PLATFORM` access before the platform reseller-management UI can render.
- The existing client redirects remain as UI fallbacks, and the reseller APIs continue to enforce their existing `withAuth()` platform-role checks.

June 29, 2026 runtime corrections:

- Reseller mutation route limiter keys now hash reseller/user key material before storage in Upstash. `onboard`, `renew`, `add-location-capacity`, `confirm-payment`, and platform `manage` still use the same `DATA_WRITE` limits and request ordering.
- The shared reseller dashboard hook now reads profile, client-list, and monthly-summary responses through a 64KB bounded JSON parser. Those browser reads use `no-store`, same-origin credentials, and manual redirect handling before response parsing. Malformed, oversized, redirected, or invalid successful responses log `reseller_dashboard_response_parse_failed` or `reseller_dashboard_response_invalid` with phase/status metadata only and fail through fixed local load errors.
- Desktop and mobile platform reseller management now send `/api/reseller/manage` and `/api/reseller/monthly-summary` requests with the shared reseller request policy before reading responses through a 64KB bounded JSON parser. Successful profile-list, monthly-summary, and save acknowledgements must match the route contract before management UI state updates.
- Reseller management update acknowledgements must return the same `profileId` as the edited profile before desktop or mobile management closes the editor or shows saved success. Create acknowledgements still require a non-empty returned `profileId` and `action: "created"`.
- July 5, 2026 profile-id boundary: Platform reseller management validates update `profileId` through the shared Firestore document-ID boundary before reseller profile lookup, Firebase Auth sync, or profile merge work.
- Desktop and mobile reseller onboarding now send `/api/reseller/onboard` requests with the shared reseller request policy before reading acknowledgements through a 16KB bounded JSON parser. Successful responses must include store, tenant, subscription, and status fields before the returned login/link details are rendered.
- Desktop and mobile add-location capacity actions now send `/api/reseller/add-location-capacity` requests with the shared reseller request policy before reading acknowledgements through an 8KB bounded JSON parser. Successful responses must include `success: true`, numeric positive `amountExpected`, the requested store id, the requested tenant id, and the requested location count before the UI shows the collect amount.
- Reseller onboarding and dashboard browser handoffs now wrap returned `shortUrl`, `dashboardUrl`, `publicUrl`, owner username, login email, password, and pending payment-link copy/share/open actions in bounded diagnostics.
- Desktop failure codes: `desktop_reseller_onboarding_copy_failed`, `desktop_reseller_dashboard_payment_link_copy_failed`, and `desktop_reseller_dashboard_payment_link_open_failed`.
- Mobile failure codes: `mobile_reseller_onboarding_copy_failed`, `mobile_reseller_onboarding_share_failed`, `mobile_reseller_dashboard_payment_link_copy_failed`, and `mobile_reseller_dashboard_payment_link_open_failed`.
- Diagnostics record stable handoff kinds plus presence/length metadata for returned values and transaction context. Raw URLs, owner credentials, emails, and passwords are not written to logs.
- June 30 copy acknowledgement update: desktop onboarding copies, desktop pending-payment link copies, mobile onboarding copies, and mobile pending-payment link copies must wait for Clipboard API success or acknowledged textarea fallback success before showing copied feedback. Failed copy diagnostics add clipboard/fallback support booleans only.

June 11, 2026 runtime corrections:

- Reseller routes are server-owned through `withAuth()` and Admin SDK writes; Firestore client writes to reseller billing collections remain denied.
- Platform reseller management no longer uses a client-bundled password gate. The hardcoded `ECOMSAI_PLATFORM_PASSWORD` constant was removed; `/reseller/manage`, `/api/reseller/manage`, and `/api/reseller/monthly-summary` rely on platform-role checks instead of shipping a secret to the browser.
- Reseller client lists are bounded: 100 transactions for reseller users, 200 for platform users, plus one bounded subscription read per visible subscription ID for current status/quantity/payment-link truth.
- Reseller monthly summary no longer reads all reseller profiles for a normal reseller. Platform users read up to 50 profiles; reseller users read only direct/email-matched profile docs.
- Manual/offline subscription activation and renewal sync store entitlement and public/assistant cache state through `safeSyncStorePlanEntitlementFromSubscription()`.
- Reseller online subscriptions use the same hardened Razorpay verification contract as self-serve subscriptions.
- Reseller write APIs use the existing `DATA_WRITE` limiter with hashed reseller/user key material and bounded 16KB JSON parsing before validation, tenant/store reads, subscription writes, Firebase Auth user creation, or entitlement sync.

---

## 1. ChatGPT vs Codebase Analysis

| #   | ChatGPT Suggestion                            | Verdict      | Codebase Evidence                                                                                                                                                                                                                                      |
| --- | --------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Create separate "License Engine" object       | **DISAGREE** | Entire billing stack uses `FirestoreSubscriptionDoc` + `subscriptionStateMachine.ts`. Creating parallel License object would fork billing, break revenue reporting, and duplicate state management. **Use existing subscription doc with new fields.** |
| 2   | Create role `RESELLER_ASSISTED`               | **PARTIAL**  | Existing roles in `src/constants/user.ts`: `PLATFORM`, `PLATFORM_SUPPORT`, `CRAFT_BUILDER_MAINTAINER`. Auth middleware (`withAuth`) already supports `requiredPlatformRole`. **Add `RESELLER` to existing constants.**                                 |
| 3   | Multiple Razorpay plans for 400/500/700       | **AGREE**    | `getOrCreateRazorpayPlan()` in `src/lib/razorpay/plan-handler.ts` dynamically creates plans with lookup keys. Works perfectly. **Reseller online uses same Razorpay Subscriptions (recurring) as self-serve — unified billing.**                       |
| 4   | Fixed duration buckets (3/6/12)               | **AGREE**    | Clean, no complexity explosion. Matches prepaid model.                                                                                                                                                                                                 |
| 5   | Offline payment mode                          | **AGREE**    | Need `billingMode: 'manual'` field. Existing `subscriptionStateMachine.ts` transitions work. Add auto-expiry to nightly scheduler.                                                                                                                     |
| 6   | `billingMode: AUTO \| MANUAL_YEARLY`          | **PARTIAL**  | Use `billingMode: 'auto' \| 'manual'` (simpler). Duration is separate field.                                                                                                                                                                           |
| 7   | Client pays inside system (Razorpay checkout) | **AGREE**    | Existing Razorpay Subscription `shortUrl`. Client completes checkout via shareable link. Same as self-serve flow.                                                                                                                                      |
| 8   | Cap offline activations per reseller          | **AGREE**    | Essential governance. Store in reseller config doc.                                                                                                                                                                                                    |
| 9   | Immutable transaction log                     | **AGREE**    | New `resellerTransactions` collection. Append-only.                                                                                                                                                                                                    |
| 10  | Daily expiry cron                             | **AGREE**    | Add to the consolidated `functions/src/schedulers/menulistMaintenanceScheduler.ts` task catalog (2:30 AM UTC).                                                                                                                                          |
| 11  | `introOverridePrice` on store                 | **DISAGREE** | Price lives on subscription doc (via plan selection), NOT on store. Store should not know about pricing.                                                                                                                                               |
| 12  | No WhatsApp payment links                     | **PARTIAL**  | For online mode, reseller shares Razorpay subscription `shortUrl` via WhatsApp — system-generated, not manual.                                                                                                                                         |

---

## 2. Database Schema

### 2.1 New Fields on `FirestoreSubscriptionDoc` (Existing Collection)

```typescript
// Added to src/types/razorpay.ts — FirestoreSubscriptionDoc interface
{
  // ... existing fields ...

  // === Reseller Dashboard Fields ===
  billingMode: 'auto' | 'manual';           // 'auto' = Razorpay recurring, 'manual' = reseller one-time prepaid
  validUntil?: Timestamp | null;             // For manual billing only: when access expires
  onboardingSource?: 'self' | 'reseller' | 'messaging';  // How this store was onboarded
  resellerId?: string | null;                // User ID of the reseller who onboarded this store
  resellerPricingTier?: string | null;       // 'FOUNDER_400' | 'FOUNDER_500' | 'STANDARD'
  commitmentPeriodMonths?: number | null;    // 3 | 6 | 12 (online: tracking only, offline: duration)
  manualPaymentConfirmed?: boolean;          // For offline: reseller confirmed payment
  manualPaymentConfirmedAt?: Timestamp | null;
}
```

**Why on subscription doc (not store):**

- Billing info belongs in billing collection
- Store doc stays clean (business data only)
- Revenue reporting queries subscription collection
- Existing billing UI reads subscription doc

Billing UI handling:

- `getActiveSubscriptionForStore()` returns pending subscriptions as visible billing records even before cycle dates exist, so reseller-online clients can complete Razorpay checkout from desktop or mobile Billing.
- `hasValidSubscriptionAccess()` treats `pending` as no paid access; visibility on Billing does not grant app access.
- Desktop `ActiveSubscriptionCard` and `MobileBillingScreen` branch on `billingMode: 'manual'` to show prepaid period, prepaid-until date, and offline one-time prepaid messaging.
- Manual active subscriptions hide Razorpay-only pause/cancel/upgrade actions. Recurring online subscriptions keep the normal Razorpay controls.
- Account claim links the reseller-created subscription document to the claimed owner `userId` and email so later billing, webhook, and audit flows have the real owner identity.

### 2.2 New Collection: `resellerTransactions`

```typescript
// Collection: resellerTransactions/{autoId}
interface ResellerTransaction {
  id: string;
  resellerId: string; // User ID of reseller
  resellerEmail: string; // For audit
  storeId: number;
  tenantId: number;
  storeName: string;

  // Transaction details
  action: "ONBOARD" | "RENEW" | "CANCEL";
  pricingTier: string; // 'FOUNDER_400' | 'FOUNDER_500' | 'STANDARD'
  durationMonths: number; // 3 | 6 | 12
  amountExpected: number; // In paise (INR smallest unit)
  currency: "INR";
  paymentMode: "online" | "offline";

  // Status
  status: "pending_payment" | "active" | "expired" | "cancelled";
  subscriptionId: string; // Links to subscription doc

  // Timestamps
  validFrom: Timestamp;
  validUntil: Timestamp;
  createdOn: Timestamp;
  modifiedOn: Timestamp;
}
```

**Immutability rule:** Documents in this collection are NEVER updated (except `status`). New transactions are appended for renewals.

### 2.3 New Collection: `resellerProfiles`

```typescript
// Collection: resellerProfiles/{profileId}
// Lookup first checks resellerProfiles/{authUserId}, then falls back to email.
// Platform users can onboard/renew without a reseller profile; profile caps apply only when a profile exists.
interface ResellerProfile {
  authUserId?: string;
  email: string;
  name: string;
  phone?: string;
  passwordSetAt?: Timestamp | null; // Password is stored only in Firebase Auth.

  // Caps & limits
  maxOfflineActivations: number; // Default: 20
  currentActiveOfflineStores: number; // CONCURRENT count — decrements when store expires
  totalStoresOnboarded: number; // Running lifetime count (never decrements)

  // Status
  active: boolean;
  activatedAt: Timestamp;
  deactivatedAt?: Timestamp | null;

  // Metadata
  createdOn: Timestamp;
  modifiedOn: Timestamp;
  createdBy: string; // Founder who activated this reseller
}
```

Reseller profile creation also creates a real MenuList login account:

- Firebase Auth user with the platform custom claim `platformRole: 'RESELLER'`.
- `users/{authUserId}` document with `platformRole: 'RESELLER'`, no store assignment, and `resellerProfileId`.
- `resellerProfiles/{authUserId}` document for direct low-cost lookup.
- Passwords are never stored in Firestore; password changes update Firebase Auth only.

### 2.4 Constants Addition

```typescript
// src/constants/database.ts — add:
RESELLER_TRANSACTIONS: 'resellerTransactions',
RESELLER_PROFILES: 'resellerProfiles',

// functions/src/constants/database.ts — mirror same
```

### 2.5 User Constants Addition

```typescript
// src/constants/user.ts — add:
export const RESELLER_USER_ROLE = "RESELLER";
```

---

## 3. Reseller Pricing Architecture

### 3.1 Decision: Codebase Constants (Separate File)

**Decision:** Reseller pricing lives in `src/config/resellerPricing.ts` — a separate constants file from `PlatformPlansList.ts`.

**NOT in `PlatformPlansList.ts`** — because:

- Public plans render in `PricingPlansModal.tsx` for end users. Reseller tiers must NEVER appear there.
- `getB2CPlansList()` is called client-side — reseller pricing would leak into the client bundle.
- Clean separation: public pricing ≠ internal reseller pricing.

**NOT in database** — because:

- Only 3 tiers, changed rarely (months between changes).
- Adding DB reads for 3 static values is wasteful (Firebase cost discipline).
- Building admin CRUD UI for 3 entries is over-engineering.
- Matches existing pattern: `PlatformPlansList.ts` is also hardcoded `as const`.

### 3.2 Existing Plan Flow (End-to-End — Critical Context)

```
PlatformPlansList.ts (constants)
  ↓
PricingPlansModal.tsx → getB2CPlansList() → renders plan cards (CLIENT-SIDE)
  ↓
User selects plan → sends { planId, interval, currency, userType }
  ↓
create-subscription/route.ts → getB2CPlansList() → plans.find() (SERVER-SIDE validation)
  ↓
getOrCreateRazorpayPlan() → creates/finds Razorpay plan with price from constants
  ↓
razorpayClient.subscriptions.create() → notes include { planId, interval, userType }
  ↓
Razorpay webhook fires → subscription.activated / subscription.charged
  ↓
billingUtils.ts → getPlanDetailsFromConstants(notes) → resolves plan from constants
  ↓
Updates subscription doc with plan details (monthlyCredits, etc.)
```

**🔴 CRITICAL INTEGRATION POINT:**
`getPlanDetailsFromConstants()` at `src/lib/billing/billingUtils.ts:11-17` resolves plan info from `B2CplansList`/`B2BplansList` using `notes.planId` + `notes.interval`. Reseller subscriptions use different planIds (e.g., `reseller_FOUNDER_400`). This function MUST be updated to also check reseller plans, otherwise **webhooks will fail silently** for reseller subscriptions.

### 3.3 Reseller Pricing Constants

```typescript
// src/config/resellerPricing.ts (NEW FILE)
// ═══════════════════════════════════════════════════════════════
// Reseller Pricing Tiers — Internal Only
// NEVER import this in PricingPlansModal or any public UI component.
// These tiers are only used by /api/reseller/* routes.
// ═══════════════════════════════════════════════════════════════

export interface ResellerPricingTier {
  id: string;
  planId: string; // Used in Razorpay notes + getPlanDetailsFromConstants()
  name: string;
  displayName: string; // What client sees: always "MenuList Starter"
  monthlyPriceINR: number; // In paise
  yearlyPriceINR: number; // In paise (annual discount)
  monthlyCredits: number; // Same as Starter plan — same product, different price
  description: string;
  active: boolean;
}

export const RESELLER_PRICING_TIERS: ResellerPricingTier[] = [
  {
    id: "FOUNDER_400",
    planId: "reseller_founder_400", // Unique planId for Razorpay + webhook lookup
    name: "Founder Tier A",
    displayName: "MenuList Starter", // Client sees this (not "Founder Tier A")
    monthlyPriceINR: 40000, // ₹400 in paise
    yearlyPriceINR: 480000, // ₹4,800 in paise (₹400 × 12)
    monthlyCredits: 75, // Same as Starter
    description: "Early supporters & close network",
    active: true,
  },
  {
    id: "FOUNDER_500",
    planId: "reseller_founder_500",
    name: "Founder Tier B",
    displayName: "MenuList Starter",
    monthlyPriceINR: 50000, // ₹500 in paise
    yearlyPriceINR: 600000, // ₹6,000 in paise (₹500 × 12)
    monthlyCredits: 75,
    description: "Friends & local contacts",
    active: true,
  },
  {
    id: "STANDARD",
    planId: "reseller_standard",
    name: "Standard",
    displayName: "MenuList Starter",
    monthlyPriceINR: 49900, // ₹499 in paise (matches public Starter)
    yearlyPriceINR: 499000, // ₹4,990 in paise
    monthlyCredits: 75,
    description: "Regular reseller pricing (same as public)",
    active: true,
  },
];

/** Lookup reseller tier by planId (used by billingUtils.ts webhook resolution) */
export function getResellerPlanByPlanId(
  planId: string,
  interval: "MONTH" | "YEAR",
) {
  const tier = RESELLER_PRICING_TIERS.find((t) => t.planId === planId);
  if (!tier) return null;
  return {
    planId: tier.planId,
    name: tier.displayName,
    billingInterval: interval,
    priceINR: {
      price: interval === "MONTH" ? tier.monthlyPriceINR : tier.yearlyPriceINR,
      monthlyCredits: tier.monthlyCredits,
    },
  };
}

export const RESELLER_COMMITMENT_OPTIONS = [3, 6, 12] as const;
export type ResellerCommitment = (typeof RESELLER_COMMITMENT_OPTIONS)[number];

export const RESELLER_CAPS = {
  MAX_CONCURRENT_OFFLINE_PER_RESELLER: 20,
  MAX_TOTAL_RESELLERS: 10,
} as const;

/** Calculate total amount for offline prepaid (tier × duration × locations) */
export function calculateOfflineAmount(
  tierId: string,
  durationMonths: number,
  locationCount: number = 1,
): number {
  const tier = RESELLER_PRICING_TIERS.find((t) => t.id === tierId);
  if (!tier) throw new Error(`Unknown pricing tier: ${tierId}`);
  return tier.monthlyPriceINR * durationMonths * locationCount;
}

/** Add prepaid manual location capacity until current expiry. */
export function calculateOfflineLocationTopup(params: {
  pricingTier: string;
  validUntil: unknown;
  locationCount?: number;
}): { amountPaise: number; daysRemaining: number; locationCount: number };

/**
 * Sunset flags — feature-flag controlled tier availability.
 * Set to false to disable a tier after a scale-threshold pricing review.
 * @see spec §8.2 Scale Thresholds
 */
export const RESELLER_TIER_FLAGS = {
  FOUNDER_400_ACTIVE: true, // Disable when the 100+ store pricing threshold is approved
  FOUNDER_500_ACTIVE: true, // Disable when the 200+ store pricing threshold is approved
  OFFLINE_MODE_ACTIVE: true, // Disable when the 200+ store offline-mode threshold is approved
} as const;
```

### 3.4 billingUtils.ts Update (CRITICAL)

The webhook handler's `getPlanDetailsFromConstants()` MUST be updated to resolve reseller plan IDs:

```typescript
// src/lib/billing/billingUtils.ts — UPDATED
import { B2BplansList, B2CplansList } from "@data/PlatformPlansList";
import { getResellerPlanByPlanId } from "@config/resellerPricing"; // NEW
import { Timestamp } from "firebase/firestore";

export const getPlanDetailsFromConstants = (notes: any) => {
  if (!notes || !notes.planId || !notes.userType || !notes.interval) {
    return null;
  }

  // Check if this is a reseller plan (planId starts with 'reseller_')
  if (notes.planId.startsWith("reseller_")) {
    return getResellerPlanByPlanId(notes.planId, notes.interval);
  }

  // Standard plan lookup (unchanged)
  const planList = notes.userType === "B2C" ? B2CplansList : B2BplansList;
  return (
    planList.find(
      (p) => p.planId === notes.planId && p.billingInterval === notes.interval,
    ) || null
  );
};
```

**Why this is critical:** Without this change, when Razorpay fires `subscription.charged` webhook for a reseller subscription, `getPlanDetailsFromConstants()` returns `null` → the webhook skips credit allocation and date updates → subscription stays stale. **This would be a silent billing bug.**

---

## 4. API Routes

### 4.1 `POST /api/reseller/onboard` — Create Store + Subscription

**Auth:** `withAuth({ requiredPlatformRole: 'RESELLER' })` (or `PLATFORM`)

**Request Body (Zod):**

```typescript
const ResellerOnboardSchema = z.object({
  businessName: z.string().min(2).max(100),
  businessType: z.string().min(2).max(50),
  ownerCountryCode: z.string().trim().max(8).optional(),
  ownerDialCode: z.string().trim().max(12).optional(),
  ownerPhone: z.string().trim().min(6).max(40),
  ownerEmail: z.string().email().optional(), // Contact email. Login handoff uses claim link unless an unclaimed user already exists.
  pricingTier: z.enum(["FOUNDER_400", "FOUNDER_500", "STANDARD"]),
  billingInterval: z.enum(["MONTH", "YEAR"]).optional().default("MONTH"), // For online only
  commitmentMonths: z.enum(["3", "6", "12"]).transform(Number).optional(), // Tracking only for online, duration for offline
  locationCount: z.number().int().min(1).max(30).optional().default(1),
  paymentMode: z.enum(["online", "offline"]),
  skipMenuUpload: z.boolean().optional().default(true), // compatibility field; active route does not upload/extract menu files
});
```

**Logic:**

1. Validate reseller has `RESELLER` or `PLATFORM` role
2. Apply `DATA_WRITE` rate limit and bounded 16KB JSON parsing before validation or writes
3. Validate reseller profile exists and is active
4. If offline: check cap not exceeded
5. Atomic transaction:
   - Create tenant (same pattern as `create-subscription/route.ts`)
   - Create store (same pattern)
   - Create or update the owner access record:
     - If `ownerEmail` matches an existing unclaimed user, attach that user to the new tenant/store.
     - Otherwise create a claimable placeholder user with `claimToken`.
   - Update platformSummary counts
   - Sync storesSummary
6. Create subscription doc:
   - `billingMode: paymentMode === 'online' ? 'auto' : 'manual'`
   - `status: paymentMode === 'offline' ? 'active' : 'pending'`
   - `quantity: locationCount` so the owner can create prepaid/paid locations after onboarding without a second billing decision
   - `validUntil` (offline only): `now + commitmentMonths`
   - `onboardingSource: 'reseller'`
   - `resellerId: session.user.id`
   - `resellerPricingTier: pricingTier`
   - `commitmentPeriodMonths: commitmentMonths`
7. If online: create Razorpay Subscription via `getOrCreateRazorpayPlan()` + `razorpayClient.subscriptions.create()` (same as self-serve)
8. Create `resellerTransactions` record
9. If a reseller profile exists, increment counters for active offline slots, online/offline totals, transaction count, and tracked revenue.

If a new Firebase Auth owner account is created and the Firestore onboarding transaction later fails, the route still attempts best-effort Auth rollback before returning the original failure. Failed rollback logs `reseller_onboard_auth_cleanup_failed` through bounded reseller API diagnostics with only reseller/auth/login-email presence and length metadata plus source error name/code/status. It does not log raw owner credentials, raw Auth UID, raw owner email, or the original transaction exception.

If online Razorpay plan lookup or subscription creation fails after the reseller tenant/store/user transaction succeeds, the route calls `compensateFailedTenantStoreOnboarding()`, clears the just-set owner custom claims back to owner identity without tenant/store scope, revalidates the public menu/OBP cache, and returns the existing generic onboarding failure response. The compensation marks the created tenant/store inactive, updates `storesSummary` for summary-backed public reads, and clears the failed store mapping from the owner user document only when it matches the just-created scope.

**Response:**

```typescript
{
  storeId: number;
  tenantId: number;
  subscriptionId: string;
  shortUrl?: string; // Only for online — Razorpay checkout URL for client
  status: 'active' | 'pending';
  locationCount: number;
}
```

**Firebase cost:** ~8 writes per onboarding (tenant + store + user + platformSummary + storesSummary + subscription + transaction + resellerProfile)

### 4.2 `POST /api/reseller/confirm-payment` — Offline Payment Confirmation

**Auth:** `withAuth({ requiredPlatformRole: 'RESELLER' })` (or `PLATFORM`)

**Request Body:**

```typescript
const ConfirmPaymentSchema = z.object({
  subscriptionId: z.string(),
  confirmed: z.literal(true),
});
```

**Logic:**

1. Apply `DATA_WRITE` rate limit and bounded 16KB JSON parsing before validation or subscription reads
2. Verify subscription belongs to this reseller
3. Verify subscription is `pending` and `billingMode: 'manual'`
4. Update subscription: `status: 'active'`, `manualPaymentConfirmed: true`, `manualPaymentConfirmedAt: now`
5. Sync store entitlement and public/assistant cache state

**Firebase cost:** 3 writes (subscription + transaction + resellerProfile)

### 4.3 `GET /api/reseller/clients` — List Reseller's Clients

**Auth:** `withAuth({ requiredPlatformRole: 'RESELLER' })` (or `PLATFORM`)

**Logic:**

1. Query `resellerTransactions` where `resellerId == session.user.id`
2. Bounded-read matching `subscriptions/{subscriptionId}` docs for current quantity/status
3. Return list with status, store info, expiry dates, paid location count, and the subscription `shortUrl` for pending online payment recovery

**Firebase cost:** 1 transaction query + up to 100 subscription reads for reseller users (200 for platform)

### 4.4 `POST /api/reseller/renew` — Renew Existing License

**Auth:** `withAuth({ requiredPlatformRole: 'RESELLER' })` (or `PLATFORM`)

**Request Body:**

```typescript
const RenewSchema = z.object({
  storeId: z.number(),
  tenantId: z.number(),
  pricingTier: z.enum(["FOUNDER_400", "FOUNDER_500", "STANDARD"]),
  durationMonths: z.enum(["3", "6", "12"]).transform(Number),
  paymentMode: z.enum(["online", "offline"]),
});
```

**Logic:**

1. Apply `DATA_WRITE` rate limit and bounded 16KB JSON parsing before validation or subscription reads
2. Find existing manual subscription for the store
3. Verify reseller ownership or platform role
4. Create new subscription period using the renewal anchor rule
5. Calculate offline amount as `tier × duration × subscription.quantity`
6. Update subscription, sync entitlement, and append a new transaction record

**Firebase cost:** ~4 writes

### 4.5 `POST /api/reseller/add-location-capacity` — Add Manual Location Capacity

**Auth:** `withAuth({ requiredPlatformRole: 'RESELLER' })` (or `PLATFORM`)

**Purpose:** Manual/offline clients cannot auto-charge a Razorpay mandate when they add an outlet. The reseller must collect cash/UPI first, then record paid capacity.

**Request Body:**

```typescript
const AddLocationCapacitySchema = z.object({
  storeId: z.number(),
  tenantId: z.number(),
  locationCount: z.number().int().min(1).max(30).default(1),
});
```

**Logic:**

1. Apply `DATA_WRITE` rate limit and bounded 16KB JSON parsing before validation or subscription reads
2. Verify reseller profile is active and owns the manual subscription
3. Require `billingMode: "manual"` and active, non-expired prepaid access
4. Calculate prorated amount until the existing `validUntil`
5. Update `subscriptions/{subId}`: `quantity += locationCount`, `amount += topupAmount`
6. Append `resellerTransactions` action `ADD_LOCATION`
7. Update reseller tracked revenue

**Owner-side effect:** `/api/outlets/create` now consumes this prepaid capacity. If manual capacity is exhausted, outlet creation returns 402 and no store is created.

**Firebase cost:** 1 subscription query + 1 subscription write + 1 transaction write + 1 resellerProfile write

### 4.6 `GET /api/reseller/profile` — Reseller's Own Profile

**Auth:** `withAuth({ requiredPlatformRole: 'RESELLER' })` (or `PLATFORM`)

**Returns:** Reseller profile with caps, counts, status.

**Firebase cost:** 1 read

---

## 5. Razorpay Subscription (Online Mode — Unified with Self-Serve)

For online reseller onboarding, we use the **same Razorpay Subscription engine** as self-serve. No divergent billing.

**Why Razorpay Subscription (not Payment Links):**

- **Unified billing** — same webhooks, same state machine, same lifecycle
- **Auto-renewal** — no manual renewal burden on reseller
- **Clean MRR** — every reseller store contributes to recurring revenue
- **No new API** — reuses existing `getOrCreateRazorpayPlan()` + `create-subscription` pattern
- **`shortUrl` already exists** — subscription objects include shareable checkout URL

**Implementation:**

```typescript
// Reuses existing pattern from src/app/api/razorpay/create-subscription/route.ts

// 1. Get or create Razorpay plan for reseller tier
const razorpayPlanId = await getOrCreateRazorpayPlan({
  price: resellerTier.monthlyPriceINR, // e.g., 40000 (₹400 in paise)
  currency: "INR",
  interval: billingInterval, // 'MONTH' or 'YEAR'
  userType: "B2C",
  planId: `reseller_${pricingTier}`, // e.g., 'reseller_FOUNDER_400'
});

// 2. Create Razorpay subscription (same as self-serve)
const razorpaySubscription = await razorpayClient.subscriptions.create({
  plan_id: razorpayPlanId,
  total_count: billingInterval === "MONTH" ? 36 : 3, // 3 years
  quantity: locationCount,
  notes: {
    tenantId: result.tenantId,
    storeId: result.storeId,
    userId: clientUserId,
    userType: "B2C",
    planId: `reseller_${pricingTier}`,
    priceKey: "priceINR",
    interval: billingInterval,
    name: businessName,
    email: ownerEmail,
    price: resellerTier.monthlyPriceINR,
    resellerId: session.user.id, // Track reseller
    remainingCredits: 0,
  },
});

// 3. shortUrl is the checkout link reseller shares with client
const checkoutUrl = razorpaySubscription.short_url;
```

**Webhook handling:** Existing `/api/razorpay/webhook` route handles `subscription.activated` and `subscription.charged` — **zero changes needed.** Reseller subscriptions flow through the same webhook as self-serve.

---

## 6. Nightly Scheduler Addition

**File:** `functions/src/schedulers/menulistMaintenanceScheduler.ts`

The `reseller_license_expiry` maintenance task runs daily at 2:30 AM UTC under the existing per-task lease model. The old `functions/src/decisionBlocksScoring.ts` nightly scheduler no longer owns reseller expiry.

Runtime contract:

- Guard on `ENABLE_RESELLER_DASHBOARD`.
- Query active manual subscriptions past `validUntil + 7 day grace`, capped at 100 candidates per run.
- Mark each expired subscription as `expired`, set end/cycle dates, append status history, and mirror expired analytics entitlement.
- Decrement the reseller profile's `currentActiveOfflineStores` counter when a reseller profile exists.
- Clear store and platform-summary active-plan entitlement, revalidate public menu/OBP cache with digital-screen touch, and invalidate owner-business-assistant context packets for the store.
- Keep bounded failure diagnostics for subscription expiry, reseller counter decrement, and entitlement/cache sync failures.

**Firestore index needed:**

```json
{
  "collectionGroup": "subscriptions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "billingMode", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "validUntil", "order": "ASCENDING" }
  ]
}
```

---

## 7. File Structure

### New Files

```
src/
├── config/
│   └── resellerPricing.ts                    # Pricing tiers, caps, duration constants
├── app/
│   ├── api/
│   │   └── reseller/
│   │       ├── onboard/route.ts              # POST — Create store + subscription
│   │       ├── confirm-payment/route.ts      # POST — Offline payment confirmation
│   │       ├── clients/route.ts              # GET — List reseller's clients
│   │       ├── add-location-capacity/route.ts # POST — Add manual prepaid location capacity
│   │       ├── renew/route.ts                # POST — Renew offline license
│   │       └── profile/route.ts              # GET — Reseller profile
│   └── (main)/
│       └── reseller/
│           ├── page.tsx                       # Reseller dashboard home
│           ├── onboard/page.tsx               # Multi-step onboarding form
│           └── clients/
│               ├── page.tsx                   # Clients list
│               └── [storeId]/page.tsx         # Client detail
├── components/
│   └── templates/
│       └── main-app/
│           └── reseller/
│               ├── ResellerDashboard.tsx      # Dashboard home component
│               ├── OnboardingWizard.tsx       # Multi-step form
│               ├── ClientsList.tsx            # Clients table
│               ├── ClientDetail.tsx           # Single client view
│               └── ResellerStatusBadge.tsx    # Status badge component
├── database/
│   └── reseller/
│       └── index.ts                           # DAL: transactions, profiles, queries
├── hooks/
│   └── useResellerDashboard.ts               # SWR hook for reseller data
├── lib/
│   └── validation/
│       └── resellerSchemas.ts                # Zod schemas for reseller APIs
└── types/
    └── reseller.ts                            # TypeScript types
```

### Modified Files

```
src/config/features.ts                         # Add ENABLE_RESELLER_DASHBOARD flag
src/constants/database.ts                      # Add RESELLER_TRANSACTIONS, RESELLER_PROFILES
src/constants/user.ts                          # Add RESELLER_USER_ROLE
src/types/razorpay.ts                          # Add billingMode, validUntil, reseller fields
src/lib/billing/billingUtils.ts                # CRITICAL: Update getPlanDetailsFromConstants() for reseller planIds
src/middleware/auth.ts                         # Add 'RESELLER' to requiredPlatformRole union type + PLATFORM fallback
functions/src/constants/database.ts            # Mirror new collection constants
functions/src/constants/features.ts            # Mirror feature flag
functions/src/schedulers/menulistMaintenanceScheduler.ts # Reseller license expiry task
firestore.indexes.json                         # Add composite index for manual subscription expiry
```

---

## 8. Feature Flag

```typescript
// src/config/features.ts
ENABLE_RESELLER_DASHBOARD: true,  // Reseller assisted onboarding portal

// functions/src/constants/features.ts
ENABLE_RESELLER_DASHBOARD: true,
```

---

## 9. Auth & Security

### Route Protection

All `/api/reseller/*` routes use:

```typescript
export const POST = withAuth(
  async (request, session) => {
    // ...
  },
  { requiredPlatformRole: "RESELLER" },
);
```

**Note:** `PLATFORM` role users also have access (founder can use reseller dashboard).

The `withAuth` middleware in `src/middleware/auth.ts` needs a small modification:

```typescript
// Current: exact match
if (session.user.platformRole !== options.requiredPlatformRole) {

// Updated: PLATFORM role has access to everything
if (
  session.user.platformRole !== options.requiredPlatformRole &&
  session.user.platformRole !== 'PLATFORM'
) {
```

This ensures the founder (PLATFORM role) can always access reseller routes.

### Page Protection

Reseller pages check role on mount:

```typescript
if (
  session.platformRole !== "RESELLER" &&
  session.platformRole !== "PLATFORM"
) {
  redirect("/dashboard");
}
```

### Data Isolation

- Resellers can ONLY see their own transactions (`resellerId == session.user.id`)
- PLATFORM role can see all resellers' data
- No cross-reseller data leakage

### Request Admission

- Reseller write APIs use the shared `DATA_WRITE` limiter before expensive account, subscription, or transaction work.
- Reseller write APIs parse JSON through a 16KB bounded body helper before Zod validation.
- Oversized, malformed, or rate-limited reseller action requests fail before Firestore reads/writes, Razorpay calls, Firebase Auth user creation, or entitlement sync.
- Security logs for reseller onboarding, renewal, add-location capacity, and offline-payment confirmation use bounded route metadata plus bounded reseller identifiers. Platform reseller management success breadcrumbs use bounded reseller metadata. Raw `buildSecurityContext()` output is not spread or imported into these reseller route diagnostics.

---

## 10. Reseller Navigation

Resellers see a simplified sidebar:

- Dashboard (home)
- Onboard New Client
- My Clients
- Profile

They do NOT see:

- Projects/Editor
- Analytics
- Business Settings
- Billing
- Help Center
- Ops

This is handled by checking `session.platformRole === 'RESELLER'` in the sidebar component.

---

## 11. Client Account Access

When reseller onboards a client, the system must return a usable owner access path in the onboarding response.

### If Owner Email Already Exists As An Unclaimed User

- Attach that existing user document to the new `tenantId` and `storeId`.
- Preserve the owner role mapping in `stores[]`.
- Return the dashboard sign-in URL.

### If No Existing Owner User Exists

- Create a placeholder owner user with a generated `@msg.menulist.ai` email.
- Store `pendingOwnerEmail` when the reseller provided a contact email.
- Generate a `claimToken`.
- Return `dashboardUrl = SIGNIN_URL?claim={claimToken}` so the client can claim with Google or email/password.

### Link Delivery

- Reseller shares the returned `dashboardUrl` with the client for account access.
- Reseller shares the returned `publicUrl` as the customer-facing menu link.
- For online payment, reseller also shares the returned Razorpay `shortUrl`.
- Browser-local copy/share/open failures are logged only with bounded presence/length metadata and stable handoff kinds; returned URLs, login emails, owner usernames, and passwords are never logged raw.
- Client clicks → sets up Google OAuth → gets full dashboard access

---

## 12. ADRs (Architecture Decision Records)

### ADR-1: Reuse Subscription System

**Decision:** Use existing `FirestoreSubscriptionDoc` with new fields instead of parallel "License" system.
**Rationale:** Single source of truth for billing. Same state machine. Same webhook handling. Same revenue reporting. No fork.

### ADR-2: Razorpay Subscriptions (Recurring) for Online — Same as Self-Serve

**Decision:** Use same Razorpay Subscription engine for online reseller payments. NOT Payment Links.
**Rationale:** Unified billing engine. Same webhooks, same state machine, same MRR contribution. `shortUrl` on subscription object provides shareable checkout link. Auto-renewal eliminates manual burden. Per ChatGPT feedback review (Feb 27, 2026): Payment Links would create a divergent billing model — rejected.

### ADR-3: Fixed Tiers Over Arbitrary Pricing

**Decision:** Hardcoded pricing tiers. No manual price input field.
**Rationale:** Prevents price chaos, protects anchor, simplifies accounting, reduces governance burden.

### ADR-4: Same App, Separate Routes

**Decision:** Reseller dashboard lives in same Next.js app at `/reseller/*`, not a separate deployment.
**Rationale:** Same codebase, same auth, same billing. Separate app would duplicate infrastructure.

### ADR-5: Offline = Trust-Based with Auto-Expiry

**Decision:** Offline mode activates immediately when reseller confirms. No payment verification.
**Rationale:** Early-stage trust model. Caps + immutable logs + founder oversight mitigate risk. Auto-expiry prevents immortal stores.

### ADR-6: No Commission System in v1

**Decision:** No financial incentives for resellers in v1.
**Rationale:** Keeps system simple. Resellers are motivated by relationship, not money. Commission adds billing complexity.

### ADR-7: Reseller Pricing in Codebase Constants (Not Database, Not PlatformPlansList)

**Decision:** Reseller pricing tiers live in a separate `src/config/resellerPricing.ts` constants file. NOT in `PlatformPlansList.ts`, NOT in Firestore database.

**Rationale:**

- **Not in `PlatformPlansList.ts`** — Public plans render in `PricingPlansModal.tsx` for end users. `getB2CPlansList()` is called client-side — reseller pricing would leak into the client bundle. Reseller tiers must NEVER appear in public pricing UI.
- **Not in database** — Only 3 tiers that change rarely (months between changes). Building admin CRUD + UI for 3 static entries is over-engineering. Matches existing pattern (`PlatformPlansList.ts` is hardcoded `as const`). Avoids unnecessary Firestore reads.
- **Separate file** — Clean separation of concerns. Import only in `/api/reseller/*` routes and `billingUtils.ts`. Never imported by public-facing components.

**Critical integration:** `getPlanDetailsFromConstants()` in `billingUtils.ts` must be updated to resolve reseller `planId` prefixed with `reseller_`. Without this, webhooks for reseller subscriptions would fail silently.

---

## 13. Implementation Checklist

### Foundation

- [ ] Add feature flag `ENABLE_RESELLER_DASHBOARD`
- [ ] Add `RESELLER` role constant
- [ ] Add DB collection constants
- [ ] Create `src/config/resellerPricing.ts` (separate from PlatformPlansList — ADR-7)
- [ ] Create `src/types/reseller.ts`
- [ ] Extend `FirestoreSubscriptionDoc` type
- [ ] **Update `src/lib/billing/billingUtils.ts` — `getPlanDetailsFromConstants()` to resolve reseller planIds (CRITICAL)**
- [ ] Create Zod schemas (`src/lib/validation/resellerSchemas.ts`)
- [ ] Create DAL (`src/database/reseller/index.ts`)

### API Routes

- [ ] `POST /api/reseller/onboard`
- [ ] `POST /api/reseller/confirm-payment`
- [ ] `GET /api/reseller/clients`
- [ ] `POST /api/reseller/add-location-capacity`
- [ ] `POST /api/reseller/renew`
- [ ] `GET /api/reseller/profile`
- [ ] Update `withAuth` for PLATFORM fallback

### UI — Reseller Dashboard

- [ ] Reseller layout (simplified sidebar)
- [ ] Dashboard home page
- [ ] Onboarding wizard (multi-step form)
- [ ] Clients list page
- [ ] Client detail page
- [ ] Status badges

### Scheduler + Indexes

- [ ] Add license expiry check to nightly scheduler
- [ ] Add Firestore composite index
- [ ] Test expiry flow

### Founder Admin View

- [ ] Reseller management view (in existing platform settings)
- [ ] All resellers list
- [ ] Per-reseller client count + revenue
- [ ] Activate/deactivate reseller

### Testing + Docs

- [ ] Type check (`npx tsc --noEmit`)
- [ ] Happy path testing
- [ ] Edge case testing
- [ ] Update changelog

---

## 14. Testing Scenarios

| #   | Scenario                                       | Expected                                                                                  |
| --- | ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | Reseller creates store (offline)               | Store active, subscription active, transaction logged                                     |
| 2   | Reseller creates store (online)                | Razorpay subscription created, `shortUrl` generated, status pending, activates on webhook |
| 3   | Offline store expires                          | Nightly scheduler marks expired after grace                                               |
| 4   | Reseller hits offline cap                      | Error: "Maximum offline activations reached"                                              |
| 5   | Non-reseller accesses /reseller                | Redirect to /dashboard                                                                    |
| 6   | Reseller tries to see other reseller's clients | Empty list (data isolation)                                                               |
| 7   | Client logs in after reseller onboarding       | Full dashboard access and handoff links; menu content is added through normal owner/import flows |
| 8   | Reseller renews expired offline store          | New transaction, validUntil starts from now (renewal anchor rule)                         |
| 9   | Founder views all reseller data                | Full visibility across all resellers                                                      |
| 10  | Online payment fails                           | Status stays pending, reseller can retry                                                  |
| 11  | Reseller adds prepaid location to offline client | Subscription quantity/amount increase, `ADD_LOCATION` transaction logged, owner can add outlet |
| 12  | Offline client tries to add outlet without capacity | `/api/outlets/create` returns 402 and creates no store/project                            |

---

**DOCUMENT STATUS:** ✅ IMPLEMENTED  
**Last Updated:** July 4, 2026 (v1.8 - reseller onboarding account/link boundary)

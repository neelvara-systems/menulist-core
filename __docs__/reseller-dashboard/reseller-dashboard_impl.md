# Reseller Dashboard — Implementation Plan

> **Current billing admission (August 24, 2026):** New reseller sales are online-only through Razorpay. Billing profile and frozen MenuList tax evidence are required before provisioning; the standard invoice, refund, credit-note, and notification pipeline applies after settlement. Recurring credits scale with paid locations. Manual cash/UPI collection, confirmation, renewal, and location-capacity sales are dormant and fail closed until their seller/remittance/accounting contract is approved. Historical offline detail below is retained for implementation history only.

**Feature:** Assisted Onboarding Portal for Authorized Resellers  
**Status:** Implemented - reseller boundary source gate added July 2, 2026
**Created:** February 27, 2026  
**Last Updated:** July 25, 2026
**Audience:** Developers

August 1, 2026 onboarding authority and recovery corrections:

- Reseller sessions now require both the current persisted MenuList user and
  the exact active reseller profile before side effects. Platform sessions keep
  the current platform-user authority check.
- Tenant/store/user creation commits a fingerprinted provisional operation
  before an existing Firebase Auth profile is changed. Exact retry revalidates
  the operation and current resources, then repairs claims/profile without
  recreating the business.
- Razorpay attempt notes carry exact operation/fingerprint/scope/tier/quantity.
  Provider timeouts stay in recovery; complete bounded search is required
  before absence permits another create, and multiple matches fail closed.
- Billing persistence recovery uses settled reads. Read outage returns 503;
  proven absence alone permits cancellation/compensation. The atomic writer
  upgrades only an exact provisional operation and preserves replay counters.

July 14, 2026 payment lifecycle corrections:

- Initial onboarding billing validates exact operation/subscription/reseller/profile document IDs, payment mode and safe paise before composing Firestore refs. Inside the transaction, the profile must belong to the ledger reseller; present counters/cap must be exact safe integers; all counter additions are overflow-safe and written as exact next values.
- Renewal and add-location use the same strict counter principle: present profile transaction/revenue/offline-slot values must be safe integers, expired-renewal cap state must be exact, and checked next values are written instead of atomic increments.
- Successful onboarding/replay returns only the owner handoff fields consumed by resellers; the owner's Firebase Auth UID stays server-internal. Desktop/mobile accept one shared exact response DTO with safe scope/location IDs and matching operation acknowledgement.
- A deterministic replay re-authorizes its current resources: subscription scope/reseller, store tenant aliases and active lifecycle must match the operation before entitlement/referral repair or handoff. Manual paid time must be a real persisted date; current subscription status owns the response.
- Manual renewal and add-location requests require a browser-retained UUID `operationId`. Desktop and mobile keep the same UUID across timeout/retry and clear it only after a valid success acknowledgement.
- Each route uses `resellerTransactions/{operationId}` as its deterministic operation ledger. One Firestore transaction reads the operation plus transaction-current subscription (and reseller profile when present), then writes the subscription, immutable operation result, and profile revenue counters together. A replay returns the stored result without extending prepaid validity, adding quantity, or incrementing revenue twice; reuse for different inputs fails closed.
- Manual/prepaid subscriptions remain provider-free. Owner Billing hides Razorpay self-service, and shared recurring mutation routes reject `manual_...` provider identities before provider work.
- Reseller online onboarding now handles the provider-created/local-persistence gap. It re-reads an ambiguous subscription write; when definitively absent, it cancels the Razorpay subscription before compensating tenant/store/user onboarding. If provider cancellation itself fails, local access remains available for support/reconciliation instead of deleting the only scope linked to a live provider subscription.
- Reseller pending recurring checkouts retain and expose their provider `shortUrl`; payment activation uses the same verified MenuList subscription/webhook path as self-serve checkout.
- Onboarding itself now uses a browser-retained UUID. The subscription, onboarding operation, offline-cap reservation, and profile counters commit atomically; an exact lost-response retry recovers the stored subscription/store handoff before owner uniqueness checks.
- Online onboarding records `profileRevenueRecognized: false` and does not count pending checkout value as collected revenue. Razorpay activation changes the pending onboarding row to active, but marks revenue recognized only after an exact, identity-bound reseller profile accepts exact safe-integer paise. Missing/mismatched/malformed profiles stay marker-false and can converge on a later activation retry; already-active repair rows do not report another activation. Legacy rows without the explicit marker are not recounted.
- Deterministic onboarding replay accepts only exact positive safe-integer persisted tenant/store IDs and the exact non-empty subscription ID. Numeric strings and unsafe IDs fail closed before subscription/store reads.
- Desktop and mobile now expose the existing manual renewal API. Renewal acknowledgements are scope/operation validated, active or expired manual status is required, the stored tier cannot be changed, and an expired renewal atomically reacquires an offline-cap slot.
- `/api/reseller/clients` reads bounded current reseller subscriptions directly instead of querying ledger rows and then fetching each subscription. This produces one current client row, removes duplicate renewal/location entries, and roughly halves the feature read shape.

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
- July 5, 2026 profile-id boundary: Platform reseller management validates the exact raw update `profileId` through the shared Firestore document-ID boundary before reseller profile lookup, Firebase Auth sync, or profile merge work; whitespace-mutated IDs fail request validation instead of being trimmed.
- Desktop and mobile reseller onboarding now send `/api/reseller/onboard` requests with the shared reseller request policy before reading acknowledgements through a 16KB bounded JSON parser. Successful responses must include store, tenant, subscription, and status fields before the returned login/link details are rendered.
- Desktop and mobile add-location capacity actions now send `/api/reseller/add-location-capacity` requests with the shared reseller request policy before reading acknowledgements through an 8KB bounded JSON parser. Successful responses must include `success: true`, numeric positive `amountExpected`, the requested store id, the requested tenant id, and the requested location count before the UI shows the collect amount.
- Reseller onboarding and dashboard browser handoffs now wrap returned `shortUrl`, `dashboardUrl`, `publicUrl`, owner username, login email, password, and pending payment-link copy/share/open actions in bounded diagnostics.
- Desktop failure codes: `desktop_reseller_onboarding_copy_failed`, `desktop_reseller_dashboard_payment_link_copy_failed`, and `desktop_reseller_dashboard_payment_link_open_failed`.
- Mobile failure codes: `mobile_reseller_onboarding_copy_failed`, `mobile_reseller_onboarding_share_failed`, `mobile_reseller_dashboard_payment_link_copy_failed`, and `mobile_reseller_dashboard_payment_link_open_failed`.
- Diagnostics record stable handoff kinds plus presence/length metadata for returned values and transaction context. Raw URLs, owner credentials, emails, and passwords are not written to logs.
- June 30 copy acknowledgement update: desktop onboarding copies, desktop pending-payment link copies, mobile onboarding copies, and mobile pending-payment link copies must wait for Clipboard API success or acknowledged textarea fallback success before showing copied feedback. Failed copy diagnostics add clipboard/fallback support booleans only.

June 11, 2026 runtime corrections:

- Reseller routes are server-owned through `withAuth()` and current persisted authority; Firestore client reads and writes to `resellerProfiles` and `resellerTransactions` are denied so stale claims cannot bypass API lifecycle checks.
- Platform reseller management no longer uses a client-bundled password gate. The hardcoded `ECOMSAI_PLATFORM_PASSWORD` constant was removed; `/reseller/manage`, `/api/reseller/manage`, and `/api/reseller/monthly-summary` rely on platform-role checks instead of shipping a secret to the browser.
- Reseller client lists use one bounded current-subscription query: up to 101 rows for reseller users or 201 for platform users, including the overflow row used to expose partial results. There is no ledger-to-subscription read fan-out.
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
| 5   | Offline payment mode                          | **AGREE**    | Use `billingMode: 'manual'`. Existing `subscriptionStateMachine.ts` transitions remain authoritative; expiry runs in the daily consolidated MenuList maintenance scheduler.                                                                          |
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
- Reseller onboarding creates or updates a real Firebase Auth owner and matching `users` document; the subscription is written with that owner `userId` and login email.

### 2.2 New Collection: `resellerTransactions`

```typescript
// Collection: resellerTransactions/{transactionId}
interface ResellerTransaction {
  id: string;
  operationId?: string; // Required for new onboarding/renewal/add-location rows; legacy rows may omit it
  resellerId: string; // User ID of reseller
  resellerEmail: string; // For audit
  storeId: number;
  tenantId: number;
  storeName: string;

  // Transaction details
  action: "ONBOARD" | "RENEW" | "ADD_LOCATION" | "CANCEL";
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

**Immutability rule:** Financial/action inputs are never edited. Controlled payment convergence may update `status`, confirmation metadata, `modifiedOn`, and `profileRevenueRecognized`. Every new onboarding, manual renewal, and add-location mutation uses its request UUID as both document ID and `operationId` for exact retry behavior.

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

Profile admission is transaction-current. The create transaction reads the
candidate profile, normalized email, normalized username, and bounded platform
cap before atomically creating `resellerProfiles/{authUserId}` and merging the
matching `users/{authUserId}` identity. Updates transactionally re-read the
profile plus email/username candidates and merge both Firestore documents
together. Detached checks remain an early user-facing rejection only.

Firebase Auth is necessarily outside the Firestore transaction. A newly
provisioned Auth account is removed if profile admission fails. For an existing
account, pre-change Auth metadata and claims are restored when the Firestore
transaction fails. Existing-account password rotation runs only after the
profile/user commit because Firebase Auth does not expose the prior password for
rollback; retrying the same validated update safely completes a failed rotation.

Reseller usernames are canonical lowercase login identifiers. Management trims
them and accepts 3-50 characters from letters, digits, dot, underscore, and
hyphen, beginning with a letter or digit. Credential login queries the exact
canonical `users.username` before retaining the existing phone/staff lookup
fallbacks. The resolved user email remains the Firebase Auth sign-in identity,
so password verification, lockout, lifecycle, and block checks do not fork.

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

**Resolved integration point:**
`getPlanDetailsFromConstants()` in `src/lib/billing/billingUtils.ts` resolves public and reseller plan IDs from canonical constants using provider notes. Reseller online subscriptions therefore receive the same verified activation, renewal-credit, date, entitlement, and audit handling as self-serve subscriptions. The reseller source gate locks this parity so reseller plan support cannot silently disappear.

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
  displayName: string; // What client sees: always "MenuList Official"
  monthlyPriceINR: number; // In paise
  yearlyPriceINR: number; // In paise (annual discount)
  monthlyCredits: number; // Same as Official plan — same product, different price
  description: string;
  active: boolean;
}

export const RESELLER_PRICING_TIERS: ResellerPricingTier[] = [
  {
    id: "FOUNDER_400",
    planId: "reseller_founder_400", // Unique planId for Razorpay + webhook lookup
    name: "Founder Tier A",
    displayName: "MenuList Official", // Client sees this (not "Founder Tier A")
    monthlyPriceINR: 40000, // ₹400 in paise
    yearlyPriceINR: 480000, // ₹4,800 in paise (₹400 × 12)
    monthlyCredits: 75, // Same included capacity as Official
    description: "Early supporters & close network",
    active: true,
  },
  {
    id: "FOUNDER_500",
    planId: "reseller_founder_500",
    name: "Founder Tier B",
    displayName: "MenuList Official",
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
    displayName: "MenuList Official",
    monthlyPriceINR: 49900, // ₹499 in paise; reseller pricing is independent of direct pricing
    yearlyPriceINR: 499000, // ₹4,990 in paise
    monthlyCredits: 75,
    description: "Regular reseller pricing",
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
  operationId: z.string().uuid(),
  businessName: z.string().min(2).max(100),
  businessType: z.string().min(2).max(50),
  ownerCountryCode: z.string().trim().max(8).optional(),
  ownerDialCode: z.string().trim().max(12).optional(),
  ownerPhone: z.string().trim().min(6).max(40),
  ownerEmail: z.string().email().optional(), // Optional login/contact email; phone-derived generated login is the fallback.
  ownerPassword: z.string().min(6).max(100), // Firebase Auth only; never persisted in Firestore.
  pricingTier: z.enum(["FOUNDER_400", "FOUNDER_500", "STANDARD"]),
  billingInterval: z.enum(["MONTH", "YEAR"]).optional().default("MONTH"), // For online only
  commitmentMonths: z.coerce.number().refine((value) => [3, 6, 12].includes(value)).optional(),
  locationCount: z.coerce.number().int().min(1).max(30).optional().default(1),
  paymentMode: z.enum(["online", "offline"]),
  skipMenuUpload: z.boolean().optional().default(true), // compatibility field; active route does not upload/extract menu files
});
```

**Logic:**

1. Validate reseller has `RESELLER` or `PLATFORM` role
2. Apply `DATA_WRITE` rate limit and bounded 16KB JSON parsing before validation or writes
3. Re-read current platform authority or require the active reseller profile to match Auth UID/profile claim/email
4. Normalize owner login, bind the request UUID to a SHA-256 operation fingerprint, and recover a matching already-committed operation before creating new scope
5. If offline: perform an advisory cap check; the authoritative cap check remains inside the billing transaction
6. Account transaction:
   - Create tenant (same pattern as `create-subscription/route.ts`)
   - Create store (same pattern)
   - Transactionally claim the normalized owner `users` record and attach the real Firebase Auth UID.
   - Update platformSummary counts
   - Sync storesSummary
7. For online, create the Razorpay Subscription and require a normalized HTTPS `rzp.io` checkout URL. For offline, use deterministic `manual_{operationId}` provider-free identity.
8. Billing transaction creates the subscription and `resellerTransactions/{operationId}`, rechecks profile activity/cap, and increments the correct counters together:
   - `billingMode: paymentMode === 'online' ? 'auto' : 'manual'`
   - `status: paymentMode === 'offline' ? 'active' : 'pending'`
   - `quantity: locationCount` so the owner can create prepaid/paid locations after onboarding without a second billing decision
   - `validUntil` (offline only): `now + commitmentMonths`
   - `onboardingSource: 'RESELLER_ONBOARDING'`
   - `resellerId: session.user.id`
   - `resellerPricingTier: pricingTier`
   - `commitmentPeriodMonths: commitmentMonths`
9. Offline collected revenue is counted in that transaction. Online pending value is not collected revenue; the webhook ledger convergence recognizes it exactly once after provider activation.
10. If local billing persistence fails, re-read the exact subscription plus operation to distinguish an ambiguous acknowledgement. Definite online failure cancels the provider subscription before account compensation; definite offline/cap failure compensates the tenant/store/user scope.

If a new Firebase Auth owner account is created and the Firestore onboarding transaction later fails, the route still attempts best-effort Auth rollback before returning the original failure. Failed rollback logs `reseller_onboard_auth_cleanup_failed` through bounded reseller API diagnostics with only reseller/auth/login-email presence and length metadata plus source error name/code/status. It does not log raw owner credentials, raw Auth UID, raw owner email, or the original transaction exception.

The owner user is claimed before tenant/store creation inside the same Firestore transaction. An existing candidate is re-read and must remain unlinked with the expected normalized email and compatible Firebase UID; a new candidate requires `users/{authUid}` not to exist and is created with transaction `create`. Concurrent onboarding attempts cannot both bind the owner or leave two tenant/store scopes. Rollback checks that `users/{authUid}` is still absent before deleting an Auth identity created by the request.

If online Razorpay plan lookup or provider subscription creation fails after the reseller tenant/store/user transaction succeeds, the route calls `compensateFailedTenantStoreOnboarding()`, clears the just-set owner claims back to owner identity without tenant/store scope, revalidates public menu/OBP cache, and returns the generic failure response. If provider creation succeeds but local subscription persistence throws, the route first re-reads the exact subscription ID to distinguish an ambiguous acknowledgement from a missing write. A missing row triggers provider cancellation; only after cancellation succeeds does tenant/store/user compensation run. If cancellation fails, the route preserves the local onboarding scope for support/reconciliation rather than orphaning a live provider subscription from its customer context.

**Response:**

```typescript
{
  storeId: number;
  tenantId: number;
  subscriptionId: string;
  shortUrl?: string; // Only for online — Razorpay checkout URL for client
  status: 'active' | 'pending';
  locationCount: number;
  transactionId: string; // Exact request operation UUID
  loginEmail: string;
  ownerUsername: string;
  dashboardUrl: string;
  publicUrl?: string;
}
```

**Firebase cost:** account creation uses the shared tenant/store/user/summary transaction. Billing adds one operation read, one subscription read, and optionally one profile read, then creates subscription + operation and optionally updates the profile in one transaction. Exact response-loss replay writes nothing and performs only bounded operation/subscription/store recovery reads.

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
2. Re-read the current reseller profile or platform user and reject inactive, revoked, malformed, or identity-mismatched authority
3. Transactionally re-read the subscription and require exact reseller ownership (unless current platform authority), MenuList product identity, coherent tenant/store aliases, integer paise amount, `INR`, `billingMode: 'manual'`, and `status: 'pending'`
4. Append one `active` status and set `manualPaymentConfirmed` inside the same transaction. Concurrent requests serialize; a retry after a committed/lost response returns successful `alreadyConfirmed: true` without appending another status
5. Converge the matching pending reseller ledger row to active; new online rows recognize profile revenue only from their explicit deferred marker
6. On both first success and replay, repair the authoritative store entitlement/public-assistant cache projection and idempotent owner-referral settlement from the transaction-normalized scope

**Firebase cost:** one current-authority read plus one subscription transaction read. First confirmation writes one subscription document; replay writes none. Entitlement/referral reconciliation adds its existing bounded, state-dependent reads/writes and cache invalidation.

### 4.3 `GET /api/reseller/clients` — List Reseller's Clients

**Auth:** `withAuth({ requiredPlatformRole: 'RESELLER' })` (or `PLATFORM`)

**Logic:**

1. Re-read the current platform user or exact active reseller profile and reject a stale, disabled, revoked, identity-mismatched, or ambiguous legacy session before subscription data is read
2. Query current `subscriptions` by `resellerId` (100 + one overflow row) or `onboardingSource: RESELLER_ONBOARDING` for platform (200 + one overflow row), ordered by `createdOn desc` before applying the cap
3. Project every persisted subscription through one exact current-client contract: tenant/store scope, reseller identity, status, billing mode, quantity and paise must be canonical safe values; timestamp methods are invoked defensively and serialized to ISO strings
4. Exclude/count malformed or overflow-causing rows and set `isPartial`; desktop/mobile show an incomplete-list warning instead of presenting the bounded subset as complete
5. Validate the exact response DTO in the shared hook before state settlement; ISO timestamps then drive deduplication and expiry stats without `any` casts or unchecked Firestore methods
6. Browser deduplication by store handles historical replacement subscriptions without exposing operation fingerprints or reading every ledger row

**Firebase cost:** one current-authority read plus one bounded subscription query; billed subscription reads equal returned documents (up to 101 reseller / 201 platform). Validation/projection is local. A legacy reseller profile can require one missing direct read plus up to two bounded email candidates. The former transaction-query plus up-to-N exact subscription reads is removed.

### 4.4 `POST /api/reseller/renew` — Renew Existing License

**Auth:** `withAuth({ requiredPlatformRole: 'RESELLER' })` (or `PLATFORM`)

**Request Body:**

```typescript
const RenewSchema = z.object({
  operationId: z.string().uuid(),
  storeId: z.number(),
  tenantId: z.number(),
  pricingTier: z.enum(["FOUNDER_400", "FOUNDER_500", "STANDARD"]),
  durationMonths: z.coerce.number().refine((value) => [3, 6, 12].includes(value)),
  paymentMode: z.enum(["online", "offline"]),
});
```

**Logic:**

1. Apply `DATA_WRITE` rate limit and bounded 16KB JSON parsing before validation or subscription reads
2. Find existing manual subscription for the store
3. Verify reseller ownership or platform role
4. Require active or expired manual status; reject a different tier when the subscription already has a reseller tier
5. Read `resellerTransactions/{operationId}` and the transaction-current subscription in one Firestore transaction
6. If the exact operation already exists, project its identity, safe-integer amount/quantity and defensive dates; malformed or differently scoped reuse fails closed without coercion
7. Require transaction-current quantity and calculated paise to be safe integers; active subscriptions require a valid current expiry before the renewal anchor is chosen
8. Bind any subscription `resellerProfileId` to the exact admitted reseller profile before counter writes; platform mutations reject malformed profile document IDs
9. Create the new period using the renewal anchor rule and calculate `tier × duration × subscription.quantity`
10. Atomically update subscription, create the operation ledger, update profile revenue counters, and reacquire one active-offline slot when renewing from expired; sync entitlement after commit

Desktop and mobile both expose this action with 3/6/12-month selection, calculated collection amount, 8KB bounded response parsing, exact store/tenant/subscription/operation acknowledgement checks, and the same retained UUID on transport failure.

**Firebase cost:** first application reads operation + subscription (+ profile when present) and writes subscription + operation (+ profile). Replay reads operation/subscription and writes nothing.

### 4.5 `POST /api/reseller/add-location-capacity` — Add Manual Location Capacity

**Auth:** `withAuth({ requiredPlatformRole: 'RESELLER' })` (or `PLATFORM`)

**Purpose:** Manual/offline clients cannot auto-charge a Razorpay mandate when they add an outlet. The reseller must collect cash/UPI first, then record paid capacity.

**Request Body:**

```typescript
const AddLocationCapacitySchema = z.object({
  operationId: z.string().uuid(),
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
5. Read `resellerTransactions/{operationId}` and the transaction-current subscription in one Firestore transaction
6. If the exact operation exists, project its exact identity, safe-integer amount/days/quantity and defensive expiry; malformed/string-coerced reuse fails closed
7. Recalculate against the validated transaction-current expiry and require existing/next amount and quantity to remain non-negative safe integers
8. Bind any subscription `resellerProfileId` to the exact admitted reseller profile before counter writes; platform mutations reject malformed profile document IDs
9. Atomically update `subscriptions/{subId}` (`quantity += locationCount`, `amount += topupAmount`), create the `ADD_LOCATION` operation ledger, and update tracked revenue

Desktop and mobile retain the UUID in `sessionStorage` across network/response failures and clear it only after the acknowledgement passes shape and scope checks.

**Owner-side effect:** `/api/outlets/create` now consumes this prepaid capacity. If manual capacity is exhausted, outlet creation returns 402 and no store is created.

**Firebase cost:** first application reads operation + subscription (+ profile when present) and writes subscription + operation (+ profile). Replay writes nothing.

### 4.6 `GET /api/reseller/profile` — Reseller's Own Profile

**Auth:** `withAuth({ requiredPlatformRole: 'RESELLER' })` (or `PLATFORM`)

**Returns:** an exact self-profile DTO containing the reseller's contact fields,
caps, counts, revenue, active status, and defensive ISO timestamps. Founder
notes, Auth IDs, password metadata, creator identity, soft-delete state, and
unknown persisted fields are never projected.

The direct Auth-UID document must satisfy current active actor/profile
claim/email authority. Legacy email fallback reads at most two candidates and
accepts exactly one authority match; duplicates or mismatches fail closed.

**Firebase cost:** 1 read for the current direct-ID shape; legacy fallback adds
up to 2 bounded email-candidate reads after the missing direct document.

### 4.7 `GET /api/reseller/monthly-summary` — Bounded Revenue Summary

**Auth:** `withAuth({ requiredPlatformRole: 'RESELLER' })` (or `PLATFORM`)

Before any monthly transaction or visible-profile query, the route re-reads
the current platform user or exact active reseller profile. A stale role,
disabled/revoked account, inactive profile, identity mismatch, or ambiguous
legacy email fallback returns `403` and no protected summary data. The existing
calendar validation, month range, 2,000-row cap, reseller transaction predicate,
and 50-profile platform cap remain unchanged.

Every persisted monthly transaction is projected through one runtime contract:
reseller/profile identity, store ID and status/payment mode must be canonical;
paise values must be non-negative safe integers; and all running sums must
remain safe integers. Invalid or overflow-causing rows are excluded,
`invalidRowCount` is incremented, and `isPartial` is set. The exact shared DTO
validator is used by the dashboard hook and desktop/mobile platform management.
All four owner surfaces display an incomplete-report warning instead of silently
presenting excluded or capped evidence as a complete financial report.

For a reseller, the already-authorized current profile supplies name/email
enrichment; the route does not run a second arbitrary email lookup. Platform
reporting retains the bounded 50-profile enrichment query.

**Firebase cost:** one current-authority read before the existing bounded monthly
transaction read. A legacy reseller authority lookup can require one missing
direct read plus up to two email candidates. A reseller no longer pays a second
profile enrichment read; platform reporting retains up to 50 profile reads.

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

**Webhook handling:** `/api/razorpay/webhook` handles reseller subscriptions through the same settlement state machine as self-serve, but the quantity policy remains origin-aware. A stored reseller subscription must carry `onboardingSource: 'RESELLER_ONBOARDING'`, a reseller identity, a configured reseller plan ID, and a safe paid location quantity. `subscription.updated` resizes the frozen tax snapshot and preserves already-used credits while scaling the recurring allowance per paid location. `subscription.charged` revalidates that quantity before settlement.

---

## 6. Daily Maintenance Scheduler Task

**File:** `functions/src/schedulers/menulistMaintenanceScheduler.ts`

The `reseller_license_expiry` maintenance task runs daily at 2:30 AM UTC under the existing per-task lease model. The old `functions/src/decisionBlocksScoring.ts` nightly scheduler no longer owns reseller expiry. Shared `billingEntitlementSyncPending` repair runs first even when the reseller feature flag is off, because the marker is also used by ordinary Razorpay paid-cycle expiry.

Expiry is transaction-serialized with the subscription and reseller profile count. It rechecks `billingMode`, current status, `validUntil`, exact tenant/store scope, and profile state before appending the terminal history and decrementing the counter without going below zero. The task processes up to five bounded 100-row pages per run. It writes `billingEntitlementSyncPending: true` with the expiry, clears it only after the authoritative current-active entitlement/cache sync succeeds, and scans pending markers on later runs so a post-commit cache or mirror failure is recoverable rather than silently permanent.

Runtime contract:

- Repair bounded pending billing entitlement mirrors before the reseller flag gate.
- Guard manual reseller expiry on `ENABLE_RESELLER_DASHBOARD`.
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
├── config/resellerPricing.ts                  # Pricing tiers, caps, duration helpers
├── app/(main)/reseller/                       # Dashboard, onboarding, platform management routes
├── app/api/reseller/                          # Authenticated read/mutation APIs
├── components/templates/main-app/reseller/    # Desktop dashboard, onboarding, management, diagnostics
├── components/mobile/screens/                 # Mobile dashboard, onboarding, management
├── database/reseller/server.ts                # Server-only profile reads + atomic onboarding billing
├── hooks/useResellerDashboard.ts              # Bounded current-subscription client read model
├── lib/reseller/                               # Owner claim, profile authority, retry fingerprint, ledger convergence
├── lib/validation/resellerSchemas.ts           # Zod schemas
└── types/reseller.ts                           # Shared types
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
- Platform reseller profile reads project persisted documents through `src/lib/reseller/resellerManagementProfile.ts` before HTTP serialization. The exact DTO omits Auth/password/creator/timestamp/unknown fields, admits only valid bounded identity/contact fields and safe profile counters, and shares one strict response validator across desktop/mobile. The route probes at most 51 documents, returns at most 50 valid projected profiles, and reports invalid/capped partial evidence instead of silently presenting it as complete.
- Current reseller authority treats legacy `deleted: true` as terminal regardless of a stale `active` flag. Direct Auth-UID reads, bounded email fallback and platform by-ID resolution all exclude deleted rows, while the shared authority helper repeats the denial as defense in depth.
- Offline onboarding projects current profile capacity before any owner Auth, subdomain, tenant/store/user or provider work. Missing legacy count/cap fields retain zero/configured defaults; present fields must be exact safe integers, malformed capacity returns support review, and exhaustion returns a conflict.
- Razorpay subscription creation crosses `resellerProviderSubscription.ts`: the provider ID must be a trimmed valid Firestore document ID and `short_url` must pass the approved Razorpay checkout URL normalizer before local subscription/ledger persistence or handoff.

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

### Existing Compatible Owner Identity

- Require the normalized email/Firebase UID to remain compatible and the user to remain unlinked when the account transaction re-reads it.
- Update the real Firebase Auth account with the reseller-entered password and attach its user document to the new tenant/store.
- Preserve owner role/store mappings and return the standard dashboard sign-in URL.

### New Owner Identity

- Create a Firebase Auth owner using the supplied email or phone-derived generated login email and the reseller-entered password.
- Create `users/{authUid}` transactionally with owner role, tenant/store scope, normalized phone fields, and no claim token.
- Return the username/login email plus `SIGNIN_URL`; passwords are displayed only from browser form state and are never returned by Firestore or logged.

### Link Delivery

- Reseller shares the returned `dashboardUrl` with the client for account access.
- Reseller shares the returned `publicUrl` as the customer-facing menu link.
- For online payment, reseller also shares the returned Razorpay `shortUrl`.
- Browser-local copy/share/open failures are logged only with bounded presence/length metadata and stable handoff kinds; returned URLs, login emails, owner usernames, and passwords are never logged raw.
- Client opens the dashboard sign-in link and uses the handed-off owner credentials.

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

**Critical integration:** `getPlanDetailsFromConstants()` resolves configured reseller plan IDs, while `isValidMenuListStoredSubscriptionQuantity()` keeps reseller-origin quantity validation separate from direct public-plan rules. The immediate verification route and webhook both use the same origin-aware recurring-credit allowance so a multi-location reseller subscription cannot collapse to a one-location allowance.

---

## 13. Implementation Checklist

### Local/source complete

- [x] Feature/role/collection/pricing/type/subscription contracts
- [x] Reseller plan resolution through the canonical webhook billing path
- [x] Protected platform reseller management with Firebase Auth/user/profile creation and create-failure cleanup
- [x] Onboarding, confirm-payment, current-client list, add-location, renewal, profile, and monthly-summary APIs
- [x] UUID retry boundaries for onboarding, renewal, and add-location capacity
- [x] Atomic subscription + operation + cap + reseller-counter onboarding commit
- [x] Deferred online revenue recognition and bounded payment-status convergence
- [x] Desktop/mobile onboarding, current clients, safe pending-payment link, manual renewal, add-location, and platform management parity
- [x] Daily leased manual-expiry task and required existing composite index
- [x] Source verifier, pure operation/authority tests, and Firestore emulator concurrency/cap/replay tests
- [x] Code-truth docs and changelog

### Owner/provider release checks — pending

- [ ] Razorpay test-mode online onboarding, checkout, activation webhook, and recovered `shortUrl` smoke
- [ ] Authenticated desktop browser pass for platform create/deactivate, reseller onboarding, manual renewal, and add-location
- [ ] Authenticated physical-device/PWA pass for the same mobile actions and payment-link handoff
- [ ] Production rollout/deploy and post-deploy metrics review when the owner schedules release

---

## 14. Testing Scenarios

| #   | Scenario                                       | Expected                                                                                  |
| --- | ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | Reseller creates store (offline)               | Store active, subscription active, transaction logged                                     |
| 2   | Reseller creates store (online)                | Razorpay subscription created, `shortUrl` generated, status pending, activates on webhook |
| 3   | Offline store expires                          | Daily maintenance scheduler marks expired after grace and frees one cap slot              |
| 4   | Reseller hits offline cap                      | Error: "Maximum offline activations reached"                                              |
| 5   | Non-reseller accesses /reseller                | Redirect to /dashboard                                                                    |
| 6   | Reseller tries to see other reseller's clients | Empty list (data isolation)                                                               |
| 7   | Client logs in after reseller onboarding       | Full dashboard access and handoff links; menu content is added through normal owner/import flows |
| 8   | Reseller renews expired offline store          | New UUID operation, validUntil starts from now, and one cap slot is atomically reacquired  |
| 9   | Founder views all reseller data                | Full visibility across all resellers                                                      |
| 10  | Online payment fails                           | Status stays pending, reseller can retry                                                  |
| 11  | Reseller adds prepaid location to offline client | Subscription quantity/amount increase, `ADD_LOCATION` transaction logged, owner can add outlet |
| 12  | Offline client tries to add outlet without capacity | `/api/outlets/create` returns 402 and creates no store/project                            |

---

**DOCUMENT STATUS:** ✅ IMPLEMENTED  
**Last Updated:** July 16, 2026 (v1.9 - atomic billing, renewal parity, and current-subscription client reads)

## Exact manual-subscription mutation scope (July 22, 2026)

Renewal and add-location capacity select manual subscriptions with exact dual `ML` product aliases plus both tenant/store alias pairs. The selected row is projected before the route uses reseller, tier, status or expiry facts, and the Firestore transaction reprojects current ownership against the requested workspace before changing prepaid expiry, quantity, credits, operation ledgers or reseller counters. Conflicting or incomplete rows return as unavailable and receive no mutation.

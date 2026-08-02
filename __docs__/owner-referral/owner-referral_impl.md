# Owner Referral - Implementation Blueprint

**Feature:** Owner Referral
**Status:** Implemented and locally verified; release controls remain disabled
**Acquisition flag:** `ENABLE_OWNER_REFERRAL` (implemented, default `false`)
**Pilot allowlist:** `OWNER_REFERRAL_PILOT_STORE_IDS` (implemented, default `[]`)
**Settlement flag:** `ENABLE_OWNER_REFERRAL_REWARD_PROCESSING` (implemented, default `false`)
**Last updated:** July 16, 2026
**Audience:** Engineering, security, billing, QA

---

## Governing Rule

Reward issuance revalidates each transaction-current subscription with the exact dual-MenuList product and agreeing `tenantId`/`tId` plus `storeId`/`sId` contract before changing either wallet or creating payment-ledger evidence. Malformed or conflicting persisted identity remains payment-pending for operator review.

Referral settlement has one product condition:

> Two distinct MenuList business subscription wallets are verified paid, so issue 100 credits to the referrer and 50 credits to the referred business.

Do not add:

- a reward cap;
- a usage, publish, public-source, QR, distribution, or retention requirement;
- a first-payment or qualification deadline after attribution;
- owner, business-name, phone, IP, device, reseller, agency, plan-tier, billing-interval, geography, category, or onboarding-source disqualification;
- scheduled qualification or delayed reward evaluation.

The founder amendment is [owner-referral_payment-only-policy-amendment-2026-07-10.md](./_archive/owner-referral_payment-only-policy-amendment-2026-07-10.md).

---

## Current Repository Anchors

| Runtime truth | Evidence | Implementation use |
| --- | --- | --- |
| Pack credits live in `topUpCredits`. | `src/types/razorpay.ts:92` | Reward writes increment only this field. |
| Billing capacity consumes monthly then Pack balance. | `src/lib/ai/capacityCheck.ts:136,159-215` | No new wallet or consumption model. |
| Protected billing mutations use session, tenant/store scope, and billing permission. | `src/lib/billing/billingAccess.ts:35-105` | Owner link/status API uses the same authority boundary. |
| Regular subscription creation supports existing businesses. | `src/app/api/razorpay/create-subscription/route.ts:188` | Bind a captured referral before an existing-unpaid business creates its first subscription. |
| Website onboarding creates tenant/store before provider subscription. | `src/app/api/onboarding/create-subscription/route.ts:283` | Bind referral during the server-owned onboarding flow. |
| Public Menu Entry creates tenant/store/project atomically. | `src/app/api/public/create-menu/claim/route.ts:482` | Bind referral in the same new-business transaction. |
| Verified callback validates captured payment and has an already-active branch. | `src/app/api/razorpay/verify-subscription/route.ts:295,426` | Both success paths call settlement. |
| Signed webhook owns provider activation and charge events. | `src/app/api/razorpay/webhook/route.ts:687` | First-payment settlement is idempotent across webhook/callback races. |
| Mobile Share is shell-owned. | `src/components/mobile/screens/MobileShareScreen.tsx:1486,1928` | One action and bottom sheet remain inside the existing screen. |
| Billing shows Pack balance. | `src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx:482-483` | Reward visibility reuses current Billing. |

---

## Architecture

```text
Paid MenuList business
  -> opens Invite a business owner you know
  -> receives stateless encrypted 30-day link
  -> shares through native Share / WhatsApp / Copy

Invited business
  -> opens /invite#r=<token>
  -> sees reward and privacy disclosure
  -> explicitly captures referral
  -> creates a new business or uses an existing unpaid business
  -> referral binds before first successful subscription payment

Verified MenuList subscription event
  -> records referred first paid evidence
  -> resolves both paid subscription wallets
  -> if both paid: atomic +100 / +50 and reward_issued
  -> otherwise: payment_pending with no expiry

Later verified subscription activation
  -> retries associated payment_pending referrals
  -> issues once when both wallets are paid
```

No Cloud Function scheduler, starter-activation extension, project-summary read, or delayed qualification loop is part of this architecture.

---

## Feature Controls

Add to `src/config/features.ts`:

```ts
ENABLE_OWNER_REFERRAL: false,
ENABLE_OWNER_REFERRAL_REWARD_PROCESSING: false,
OWNER_REFERRAL_PILOT_STORE_IDS: [],
```

- `ENABLE_OWNER_REFERRAL` controls new invite generation, capture, and attribution.
- `ENABLE_OWNER_REFERRAL_REWARD_PROCESSING` controls payment settlement for already-attributed referrals.
- `OWNER_REFERRAL_PILOT_STORE_IDS` is a required acquisition allowlist. An empty list, a list containing no valid positive store IDs, or a store outside the list fails closed. Broad rollout requires a later explicit implementation/governance decision; it cannot happen accidentally through an empty list.

Acquisition may be paused while settlement remains enabled. Do not abandon an attributed paid referral merely because new invitations are disabled.
Acquisition is considered enabled only when both boolean flags are on. Settlement may run by itself for repair, but acquisition may never accept a referral while settlement is off.

These are operational controls, not reward caps.

---

## Policy Source

Create `src/data/shared/ownerReferralPolicy.ts` as a portable root-app SSOT:

```ts
export const OWNER_REFERRAL_PROGRAM_VERSION = 2 as const;
export const OWNER_REFERRAL_TOKEN_TTL_DAYS = 30;
export const OWNER_REFERRAL_REFERRER_CREDITS = 100;
export const OWNER_REFERRAL_REFERRED_CREDITS = 50;
export const OWNER_REFERRAL_RECENT_LIMIT = 10;
export const OWNER_REFERRAL_PENDING_REPAIR_LIMIT = 25;
export const OWNER_REFERRAL_SUBSCRIPTION_HISTORY_LIMIT = 25;

export const OWNER_REFERRAL_STATUS = {
  ATTRIBUTED: 'attributed',
  PAYMENT_PENDING: 'payment_pending',
  REWARD_ISSUED: 'reward_issued',
} as const;
```

There is no reward-limit, retention, distribution, retry-day, qualification-day, or scheduler-batch constant.

No Functions mirror is required because settlement runs in the root billing callback/webhook paths and no referral Cloud Function is planned.

---

## Data Model

### Collection

`ownerReferrals/{referralId}`

`referralId` is a lowercase SHA-256 hash of the MenuList referral program version plus referred tenant/store scope. It is deterministic, contains no raw scope, and gives one referral/reward pair per referred business wallet. The collection is MenuList-only, so program version supplies the product boundary.

### Document

```ts
type OwnerReferralStatus =
  | 'attributed'
  | 'payment_pending'
  | 'reward_issued';

interface OwnerReferralDocument {
  programVersion: 2;
  status: OwnerReferralStatus;

  referrerTenantId: number;
  referrerStoreId: number;
  referrerBusinessNameSnapshot: string;

  referredTenantId: number;
  referredStoreId: number;
  referredBusinessNameSnapshot: string;

  attributionSource: 'owner_invite';
  onboardingSource: string;
  attributionTokenIdHash: string;
  attributedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  referredFirstPaidAt?: Timestamp;
  referredFirstPaidSubscriptionId?: string;
  referredPaymentEvidenceHash?: string;
  paymentPendingAt?: Timestamp;

  rewardIssueId?: string;
  rewardIssuedAt?: Timestamp;
  referrerSubscriptionIdAtIssue?: string;
  referredSubscriptionIdAtIssue?: string;
  referrerCreditsAdded?: 100;
  referredCreditsAdded?: 50;
  referrerTopUpBefore?: number;
  referrerTopUpAfter?: number;
  referredTopUpBefore?: number;
  referredTopUpAfter?: number;
  referrerRewardTransactionId?: string;
  referredRewardTransactionId?: string;
}
```

Do not add:

- `firstPaymentDueAt`;
- `qualificationDueAt`;
- `nextEvaluationAt`;
- activation-signal fields;
- live-source fields;
- cap counters;
- disqualification codes;
- expiry or terminal-cleanup timestamps;
- actor/email/phone/device/IP comparison values.

Business-name snapshots are normalized, bounded plain text and rendered only as escaped text.

---

## Firestore Rules and Indexes

Add a server-only rule:

```text
match /ownerReferrals/{referralId} {
  allow read, write: if false;
}
```

Add only these composite indexes:

1. `referrerTenantId ASC`, `referrerStoreId ASC`, `createdAt DESC` for ten recent owner statuses.
2. `referrerTenantId ASC`, `referrerStoreId ASC`, `status ASC`, `referredFirstPaidAt ASC` for bounded event-driven repair when a referrer becomes paid.

No scheduler, reward-cap, qualification, or terminal-cleanup index is permitted.

---

## Token Contract

### Secret

Add `MENULIST_OWNER_REFERRAL_TOKEN_SECRET`. It must be base64url encoded, decode to exactly 32 random bytes, and remain separate from auth, Firebase, and payment secrets.

### Payload

```ts
interface OwnerReferralTokenPayload {
  version: 2;
  referrerTenantId: number;
  referrerStoreId: number;
  issuedAt: number;
  expiresAt: number;
  tokenId: string;
}
```

Derive the AES-256-GCM key with HKDF-SHA-256 and a fixed domain label. Use a unique 96-bit random IV. Encode version, IV, ciphertext, and authentication tag with URL-safe base64. Put the token in `/invite#r=<token>` and build the absolute URL from `OWNER_APP_URL` plus `appendPublicPath()` so capture, onboarding, and the host-only attribution cookie stay on the canonical owner app.

Identity-comparison tags are removed because owner identity, email, phone, business name, device, IP, and onboarding source do not affect payment-only eligibility.

The link is stateless and multi-use until its 30-day security expiry. `tokenId` is correlation evidence, not a single-use or revocation registry. Emergency secret rotation invalidates outstanding links.

### Cookie

| Attribute | Value |
| --- | --- |
| Name | `ml_owner_referral` |
| HttpOnly | `true` |
| Secure | `true` outside local development |
| SameSite | `lax` |
| Path | `/` |
| Domain | omitted; host-only |
| Max-Age | 30 days |

The first valid capture wins while the cookie remains valid. The capture endpoint never overwrites a valid first capture.

The referral journey is canonical-host bound. If an invite is opened through a website alias, tenant host, or custom domain, route to the canonical MenuList owner-app host before capture while preserving the browser fragment. Keep the invite CTA, sign-in/setup continuation, and payment-start request on that host. Do not broaden the cookie to `.menulist.ai`, `.menulist.digital`, `menulist.online`, or any tenant/customer host.

---

## API Contracts

### GET `/api/owner-referrals`

Protected with `withAuth()`.

Admission order:

1. authenticated session and numeric tenant/store scope;
2. acquisition flag and pilot allowlist;
3. tenant access;
4. owner-read rate limit before the billing-permission Firestore check, failing closed on provider failure in production;
5. billing-management permission;
6. verified paid MenuList subscription evidence;
7. recent-status query limited to ten.

Response:

```ts
interface OwnerReferralOwnerResponse {
  eligible: true;
  inviteUrl: string;
  policy: {
    referrerCredits: 100;
    referredCredits: 50;
    paymentOnly: true;
    rewardCap: null;
  };
  recent: Array<{
    businessName: string;
    status: 'waiting_for_payment' | 'issued';
    date: string;
  }>;
}
```

No cap query, `canInvite`, countdown, progress threshold, or invite-unavailable reward reason exists. Use `Cache-Control: private, no-store`.

### POST `/api/public/owner-referrals/capture`

Public but same-origin, Zod-bounded, rate-limited before cryptographic work, and generic on failure.

```ts
// request
{ action: 'capture', token: string } | { action: 'decline' }

// response
{ success: true, continueTo: '/create-menu' }
```

Only an explicit invite-page choice calls this route. `capture` validates and saves the token; `decline` clears any existing referral cookie and works even when acquisition is disabled, so normal setup cannot inherit stale attribution. Page load, social preview, and iframe load never capture. Rate-limit provider errors fail closed in production; 429 responses include `Retry-After` and `X-RateLimit-Reset`. Local development may use the existing local bypass so the flow remains testable without production Upstash access.

---

## Attribution Integration

Create `src/lib/ownerReferral/ownerReferralAttributionServer.ts` with:

- `readOwnerReferralCookie(request)`;
- `validateOwnerReferralToken(token)`;
- `setOwnerReferralAttributionInTransaction(transaction, db, params)`;
- `setOwnerReferralAttributionBeforeSubscription(params)`.

### Attribution Rule

Attribution admission treats persisted store and payment state as untrusted. The store document must expose exact positive safe-integer tenant/store identity consistent with its document path, and `totalPaymentsMadeCount` must be an exact nonnegative safe integer. String, fractional, unsafe or conflicting evidence fails closed and must not be converted with `Number(...)`.

Bind only before the referred business's first successful MenuList subscription payment. This is the causal referral boundary and the only pre-payment eligibility check.

Do not compare owners, emails, phones, names, cities, devices, IPs, resellers, agencies, or onboarding sources.

### New Public Menu Entry Business

In `src/app/api/public/create-menu/claim/route.ts`, validate the cookie before the transaction and use `transaction.create()` after `createTenantStoreInTransaction()` returns scope. Do not read the referral document after onboarding writes are queued.

### New Website Subscription Business

In `src/app/api/onboarding/create-subscription/route.ts`, bind the referral in the tenant/store transaction before provider subscription creation. The existing provider-failure compensation path must delete that deterministic referral document in the same compensation transaction that deactivates the failed tenant/store and clears the user scope. This prevents a failed Razorpay subscription creation from leaving an orphan referral visible to the referrer.

### Existing Unpaid Business

In `src/app/api/razorpay/create-subscription/route.ts`, when a valid referral cookie is present:

1. verify tenant/store authority;
2. read the deterministic referral document and the bounded 25-row subscription-history query inside one Firestore transaction;
3. reject retroactive binding when that transaction finds a prior successful MenuList subscription payment or the 25-row query is saturated; saturation fails closed because older successful-payment history cannot be disproved safely;
4. create the deterministic referral record before creating the pending provider subscription;
5. preserve the record if provider checkout is abandoned so a later first payment can still settle;
6. clear the cookie after successful binding or after detecting a prior paid subscription.

Keeping the prior-payment query in the same transaction as referral creation closes the payment-versus-attribution race; a concurrently captured first payment causes the transaction to retry and reject the retroactive bind.

### Other MenuList Onboarding Sources

Onboarding source does not affect eligibility. Any server-owned MenuList onboarding path that can receive the valid token before first payment must call the same attribution helper. Do not create separate referral schemas for reseller, agency, messaging, assisted, B2B, or other MenuList flows.

Manual/offline billing does not create a second referral model. When an already-attributed business becomes paid through an authorized manual billing path, the normal settlement helper must run from that server-owned activation path.

---

## Payment Settlement

Create `src/lib/ownerReferral/ownerReferralSettlementServer.ts`.

### Canonical Payment Evidence

Accept only:

- captured payment evidence from the verified callback; or
- signed Razorpay subscription activation/first-charge evidence from the webhook; or
- an authorized MenuList manual-payment path whose server-owned subscription record is active, current, `billingMode === 'manual'`, and `manualPaymentConfirmed === true`; or
- another approved MenuList billing source that writes the same canonical paid subscription truth.

Ignore client-supplied payment status, payment date, subscription IDs outside verified scope, top-up orders, unrelated products, and pending/failed payments.

### Referred First-Payment Handler

`recordReferredOwnerReferralPaymentAndSettle(params)` must:

1. derive the deterministic referred-business referral ID;
2. return with no write when no referral exists;
3. record the first verified referred subscription payment exactly once;
4. resolve current paid wallet documents for both businesses;
5. issue immediately when both are paid;
6. otherwise set `payment_pending` without expiry;
7. never make a valid subscription activation fail because referral bookkeeping failed;
8. emit bounded monitoring on failure.

Call it from:

- `src/app/api/razorpay/verify-subscription/route.ts` after new activation and before the already-active success return;
- `src/app/api/razorpay/webhook/route.ts` for the first verified subscription payment;
- `src/app/api/reseller/onboard/route.ts` after an attributed offline subscription is created and entitlement sync succeeds;
- `src/app/api/reseller/confirm-payment/route.ts` after an attributed manual subscription is confirmed and entitlement sync succeeds;
- `src/app/api/reseller/renew/route.ts` when renewal restores paid status for a store with pending referrals;
- equivalent approved MenuList billing activation paths.

### Pending Repair on Later Payment

`settlePendingOwnerReferralsForPaidStore(params)` runs only after a verified MenuList subscription becomes paid. It:

1. checks the direct referral where the paid store is the referred business;
2. queries pending referrals where the paid store is the referrer, using the pending-repair index;
3. fetches at most 26 rows once, processes at most 25, and uses the extra row only as a `hasMore` signal;
4. does not run an unbounded cursor loop in a payment request;
5. re-reads both paid wallet and canonical store documents in each reward transaction;
6. issues exactly once when both are paid and both stores remain active, non-deleted, and unblocked;
7. leaves unpaid or ineligible-lifecycle records pending without a retry timer or expiry;
8. emits bounded operational evidence when more pending rows remain for a later verified-payment replay or operator retry.

This is event-driven repair. Do not add a daily referral scheduler.

The normal verified-payment wrapper settles the paid store's direct referral first, then calls pending repair with `skipDirectReferral: true`. This avoids repeating the same deterministic referral read while preserving the standalone repair helper's direct-check behavior.

### Atomic Reward Transaction

For each candidate:

1. read and validate the referral program, status, and two tenant/store scopes;
2. read referrer current paid subscription wallet;
3. read referred current paid subscription wallet;
4. read both canonical store documents;
5. confirm distinct store and subscription wallet scopes and active, non-deleted, non-blocked stores;
6. confirm `reward_issued` is not already set;
7. require both Pack balances to be non-negative safe integers with room for the fixed reward; malformed or overflow-prone values fail the transaction;
8. derive deterministic `rewardIssueId`;
9. add 100 to referrer `topUpCredits`;
10. add 50 to referred `topUpCredits`;
11. leave monthly fields unchanged;
12. record before/after balances, subscription IDs, evidence, and `rewardIssuedAt`;
13. create deterministic `payment_transactions` rows for the referrer and referred business with `transactionType: 'reward_credit'`, `event: 'owner_referral.reward_issued'`, recipient role, credits added, wallet before/after, subscription ID, referral ID, and reward issue ID;
14. set `reward_issued` and store both reward transaction IDs.

The transaction does not write top-up purchase records, Razorpay payment events, AI-operation records, store documents, project summaries, or analytics events. Referral reward ledger rows are zero-cash credit events and must be rendered as `Referral reward`, never as an Enhancement Pack purchase.

### Refunds and Cancellations

Once issued, referral credits are final. The pooled wallet cannot safely identify whether purchased or referral credits were consumed. Never decrement `topUpCredits`, create a negative balance, or reverse the referral reward. Existing billing/account enforcement remains separate.

---

## Owner UI

### Shared Client Logic

Create:

- `src/hooks/useOwnerReferral.ts`;
- `src/lib/ownerReferral/ownerReferralClient.ts`;
- a presentation-neutral recent-status list when desktop/mobile reuse remains clean.

Load the API only when the owner opens the referral panel. Do not add dashboard boot reads or realtime listeners.

### Desktop

Add `Invite a business owner you know` to `src/components/templates/main-app/useMenuList/index.tsx` after customer-link sharing. The panel contains:

- `Your business: 100 credits`;
- `Up to 20 generated menu images or 100 description rewrites`;
- `Invited business: 50 credits`;
- `Up to 10 generated menu images or 50 description rewrites`;
- `Credits are added when both MenuList subscriptions are paid`;
- `No referral limit`;
- native Share, WhatsApp, and Copy link;
- at most ten recent statuses;
- no progress bar, countdown, distribution checklist, rank, tier, or cap message.

### Mobile

Add one action to `MobileShareScreen` and open a shell-owned bottom sheet. Use 44px controls, native Share first, WhatsApp second, Copy third, and no route bypass.

Desktop and mobile use the app formatter for referral dates. Clipboard fallback always removes its temporary textarea, and a blocked/unavailable WhatsApp handoff reports a calm share failure instead of a false success.

### Public Invite Page

Create `src/app/(website)/invite/page.tsx` with:

- `noindex, nofollow`;
- immediate fragment removal and memory-only token handling;
- one real MenuList product proof;
- 100/50 payment-only reward disclosure;
- business-name/general-status privacy disclosure;
- primary `Create my customer link` CTA;
- secondary normal setup path that explicitly declines and clears any older referral cookie before navigation;
- privacy and no-limit disclosure before the capture CTA;
- three short setup steps;
- invalid/expired generic state;
- frame denial and same-origin capture;
- no long-form marketing page, activation checklist, or waiting-period copy.

---

## Localization and Legal Content

Add English and Hindi strings to the existing MenuList locale files.

Required concepts:

- Invite a business owner you know
- Your business receives 100 credits
- Invited business receives 50 credits
- Exact examples from `src/data/shared/contentCreditPolicy.ts`
- Credits are added after both subscriptions are paid
- No referral limit
- Their payment pending
- Credits added
- Referrer can see business name and general status

Terms must not add usage, retention, distribution, plan-tier, identity, reseller, geography, volume, or deadline restrictions.

---

## Security Requirements

Use the existing global auth, validation, secure logging, rate-limit, and payment-security patterns.

Feature controls:

- `withAuth()` and tenant/store access on owner API;
- billing-management permission for invite creation;
- feature flag and pilot admission before acquisition work;
- settlement flag checked independently;
- AES-256-GCM token encryption with unique IV;
- host-only HttpOnly cookie and same-origin CTA capture;
- frame denial and `private, no-store` responses;
- deterministic referral and reward IDs;
- deny-all client Firestore rule;
- signed/captured payment evidence only;
- two distinct subscription wallet scopes before reward;
- bounded escaped business-name snapshots;
- raw token, payment, contact, tenant, and subscription values excluded from analytics and logs;
- no client subscription/referral writes.

Identity similarity and onboarding source are not security eligibility checks. Fraudulent payment and account abuse remain governed by existing billing/security systems, not referral-specific reward limits.

---

## Analytics

No referral-specific analytics events are emitted in the current implementation. The following names are reserved if anonymous aggregate measurement is approved later:

Allowed anonymous events:

- `owner_referral_panel_opened`;
- `owner_referral_share_started` with method only;
- `owner_referral_invite_viewed`;
- `owner_referral_capture_started`;
- aggregate attributed, first-paid, payment-pending, and issued counts.

Do not send token, tenant/store/user/subscription/payment IDs, business names, contacts, plan, price, or status to website analytics.

---

## Implemented Files

### New

| Path | Purpose |
| --- | --- |
| `src/data/shared/ownerReferralPolicy.ts` | Reward/status constants |
| `src/data/shared/contentCreditPolicy.ts` | Public-safe credit rates and outcome examples |
| `src/lib/ownerReferral/ownerReferralTypes.ts` | Server referral/token types |
| `src/lib/ownerReferral/ownerReferralFeature.ts` | Acquisition, settlement dependency, and pilot-store boundary |
| `src/lib/ownerReferral/ownerReferralTokenServer.ts` | Token encryption and validation |
| `src/lib/ownerReferral/ownerReferralAttributionServer.ts` | Pre-payment attribution |
| `src/lib/ownerReferral/ownerReferralSettlementServer.ts` | Payment recording and atomic reward issue |
| `src/lib/ownerReferral/ownerReferralClient.ts` | Bounded client response parser |
| `src/hooks/useOwnerReferral.ts` | Lazy owner flow and share actions |
| `src/app/api/owner-referrals/route.ts` | Protected invite/status API |
| `src/app/api/public/owner-referrals/capture/route.ts` | CTA-only capture API |
| `src/app/(website)/invite/page.tsx` | Public invite page |
| `src/app/(website)/invite/OwnerReferralInviteClient.tsx` | Fragment handling, disclosure, and capture UI |
| `src/components/templates/main-app/useMenuList/OwnerReferralModal.tsx` | Desktop owner flow |
| `src/components/mobile/sheets/MobileOwnerReferralSheet.tsx` | Mobile flow |
| `scripts/verification/verify-owner-referral.ts` | Source contract verifier |
| `scripts/verification/test-owner-referral-emulator.ts` | Atomic accounting and Firestore rules proof |

### Modified

| Path | Change |
| --- | --- |
| `src/config/features.ts` | Acquisition, settlement, and pilot controls |
| `src/constants/database.ts` | Referral collection constant |
| `src/app/api/public/create-menu/claim/route.ts` | New-business attribution |
| `src/app/api/onboarding/create-subscription/route.ts` | New paid-onboarding attribution |
| `src/lib/onboarding/compensateFailedOnboarding.ts` | Remove deterministic referral when provider onboarding is compensated |
| `src/app/api/razorpay/create-subscription/route.ts` | Existing-unpaid attribution before first payment |
| `src/app/api/razorpay/verify-subscription/route.ts` | Payment settlement and already-active repair |
| `src/app/api/razorpay/webhook/route.ts` | Signed first-payment settlement and activation repair |
| `src/app/api/reseller/onboard/route.ts` | Authorized offline-payment settlement hook |
| `src/app/api/reseller/confirm-payment/route.ts` | Authorized manual-payment settlement hook |
| `src/app/api/reseller/renew/route.ts` | Pending referral repair after manual renewal |
| `src/components/templates/main-app/useMenuList/index.tsx` | Desktop entry |
| `src/components/mobile/screens/MobileShareScreen.tsx` | Mobile entry |
| `src/database/subscriptions/paymentTransactions.ts` | Include reward-credit rows in bounded billing history |
| `src/lib/billing/billingHistoryFormatter.ts` | Render referral credits as reward transactions |
| `src/components/website/legal/TermsOfServicePage.tsx` | Payment-only referral terms |
| `src/components/website/legal/PrivacyPolicyPage.tsx` | Private referral-status and business-name disclosure |
| `public/locales/menulist.ai/en-US.json` | English copy |
| `public/locales/menulist.ai/hi-IN.json` | Hindi copy |
| `src/lib/env/validateEnv.ts` | Feature-aware referral secret readiness check |
| `.env.production.example` | Referral token secret setup contract |
| `firestore.rules` | Server-only collection |
| `firestore.indexes.json` | Recent-status and pending-repair indexes |
| `package.json` | Verifier registration |

No referral Cloud Function, scheduler task, Functions policy mirror, starter-activation change, project-summary parser mirror, or store tracking field exists.

---

## Workstreams

### 1. Authorization and Policy

- [x] Record the founder's immediate engineering approval and cooling-period waiver.
- [x] Explicitly approve payment-only eligibility, no reward cap, and aggregate liability.
- [x] Add off-by-default acquisition/settlement controls and empty pilot allowlist.
- [x] Add policy SSOT, types, collection constant, and source verifier.

### 2. Token and Attribution

- [x] Implement encrypted stateless token and CTA-only capture.
- [x] Bind new Public Menu Entry businesses.
- [x] Bind new website-paid onboarding businesses.
- [x] Delete referral attribution atomically when website provider onboarding is compensated.
- [x] Bind existing unpaid businesses before regular subscription creation.
- [x] Route supported token-capable MenuList onboarding sources through the same helper.
- [x] Keep capture, sign-in/setup continuation, and payment start on the canonical public host.
- [x] Prove no retroactive attribution after first paid subscription.

### 3. Payment and Wallet Settlement

- [x] Implement first-payment recording and settlement helper.
- [x] Integrate verified callback new/active branches.
- [x] Integrate signed webhook first payment and activation repair.
- [x] Integrate authorized manual/offline activation and renewal repair paths.
- [x] Add event-driven pending repair for paid referrer/referred stores.
- [x] Implement atomic 100/50 top-up transaction.
- [x] Create and display two deterministic reward-credit ledger rows in the same transaction.
- [x] Prove monthly fields remain unchanged and no duplicate issue occurs.
- [x] Prove there is no cap, qualification deadline, distribution check, retention wait, or scheduler dependency.

### 4. Owner and Public Surfaces

- [x] Add desktop and mobile Share entries.
- [x] Add payment-only reward copy and no-limit statement.
- [x] Add recent `Their payment pending`/`Credits added` statuses.
- [x] Add short noindex invite page and privacy disclosure.
- [x] Add English/Hindi and Terms/help copy.

### 5. Firebase and QA

- [x] Add deny-all rule and two indexes.
- [x] Add emulator transaction/rules tests.
- [x] Add callback/webhook/concurrency/idempotency tests.
- [x] Run focused verifiers, typecheck, and lint.
- [ ] Run production-host browser/device QA.
- [ ] Deploy only required Firebase rules/index targets after validation. Blocked on July 10, 2026 because both authenticated CLI accounts received `firebaserules.googleapis.com ... 403 The caller does not have permission` for `menulist-qa`.
- [ ] Record sandbox payment and production-host evidence before pilot enablement.

---

## Verification Commands

The implementation registers both source and Firestore-emulator verification:

```bash
npm run verify:owner-referral
npm run test:owner-referral:emulator
npm run verify:billing-entitlement-boundary
npm run verify:pricing-integrity-boundary
npm run verify:reseller-dashboard-boundary
npx tsc --noEmit --incremental false --pretty false
npm run lint
npm run verify:dependency-freeze
npm run docs:check-links
npm run verify:doc-npm-scripts
git diff --check
```

Do not run a production build or Vercel deploy unless explicitly requested. Firebase rules/index changes deploy through the scoped Firebase infrastructure workflow after implementation validation.

---

## Completion Definition

Code implementation is complete when:

- all workstreams and spec acceptance criteria pass;
- two verified paid MenuList wallets issue 100/50 immediately and exactly once;
- an unpaid side stays pending without expiry and settles from a later verified activation;
- no cap, usage, publish, distribution, retention, deadline, plan-tier, source, identity, or volume condition exists;
- attribution cannot be attached after the referred first paid subscription;
- private status and token/payment boundaries pass security review;
- Firebase costs are re-measured from final code;
- the feature remains disabled outside the approved pilot.

Pilot release additionally requires finance/legal/team approval, approved pilot stores, sandbox payment evidence, production-host browser/device QA, and both feature flags enabled only for that cohort.

## Exact prior-payment evidence scope (July 22, 2026)

Pre-subscription referral attribution treats prior payment as evidence only when the history row has exact dual `ML` product aliases and present, agreeing numeric tenant/store aliases for the referred business. The bounded query constrains all aliases and the evidence projector fails closed. A conflicting row cannot block attribution or later influence reward settlement merely because its primary fields match.

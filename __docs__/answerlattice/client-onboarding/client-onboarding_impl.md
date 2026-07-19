# Answerlattice Client Onboarding — Implementation

> **Version:** 1.7.1
> **Last Updated:** 2026-07-19
> **Audience:** Developers

---

## File Structure

```
src/app/api/answerlattice/onboard/route.ts           # Onboarding API (server-side)
src/app/sites/answerlattice/get-started/page.tsx      # Get-started page (server component)
src/app/sites/answerlattice/get-started/OnboardingForm.tsx  # Signup form (client component)
src/data/answerlattice/plans.ts                       # Answerlattice plans config
src/lib/answerlattice/onboardingProvisioning.ts       # Pure attempt/provider/recovery contract
src/lib/answerlattice/onboardingProvisioningServer.ts # Transactional attempt state
```

---

## Components

### 1. Onboarding API (`/api/answerlattice/onboard`)

**Auth:** `withAuth()` — requires Google OAuth session
**Method:** POST
**Body:** `{ companyName, productName?, productUrl?, supportEmail?, billingModel?, primarySurfaces?, planId?, interval?, currency? }`

**Flow:**
1. Validate the session user document ID, feature availability, and per-user payment-onboarding rate limit.
2. Read at most 32 KB of JSON and validate company/product fields, an HTTP(S)-only credential-free product URL, selected surfaces, plan, monthly interval, and INR/USD currency. Email fallback reads at most two normalized-email records and fails closed on duplicates.
3. Build a SHA-256 request fingerprint from normalized setup inputs.
4. If the workspace is already `payment_pending`, require the exact attempt/fingerprint/store summary, restore the default-auth product bridge, and return a strictly parsed persisted checkout without exposing the original plaintext widget key.
5. If the same attempt is `provisioning` or `provider_recovery_pending`, reject changed request details. A recovery-pending attempt with no known provider ID returns a fixed 409 plus `Retry-After` until the 15-minute hold expires.
6. For a new attempt, create the provisional tenant, store, and Answerlattice user in one transaction with the attempt ID, request fingerprint, and `provisioning` status. Clear stale provider ID, recovery time/reason, and cancellation fields inherited from a compensated user record.
7. Resolve the product-scoped Razorpay plan. Copy a known provider ID into the durable recovery variable before fetching so a transient fetch failure cannot erase it. Require exact attempt/product/plan/tenant/store ownership independently from status. A recognized terminal checkout deactivates only its owned provisional scope and returns `ANSWERLATTICE_PROVIDER_CHECKOUT_EXPIRED`; unknown or nonterminal state remains held. Otherwise, after the recovery hold, search a bounded provider window before allowing one same-attempt create. Admit only provider status `created` as a fresh checkout.
8. Accept a provider checkout link only when it is an HTTPS URL on the exact `rzp.io` host, with no credentials or non-standard port. Unsafe or malformed provider/recovery links become `null` rather than a browser navigation target.
9. Generate the widget key, then transactionally commit the pending subscription, store subscription summary, widget-key manager state, and tenant/store/user `payment_pending` status.
10. Treat the local transaction as the finalization boundary. Restore `productAccounts.AL`, seed product surfaces and compact summaries, initialize compiled-context control-plane state, and return through the route-wide private/no-store response helper.
11. If a provider outcome may exist, transactionally persist `provider_recovery_pending` on the exact tenant/store/user scope and preserve it for retry. If provider creation is proven not to have occurred, or the exact known checkout is terminal and unusable, compensate only documents owned by the same product, attempt, fingerprint, tenant, and store.
12. Paid plans activate through the shared product-aware Razorpay verify/webhook flow using `productId: 'AL'` and Answerlattice Firebase persistence.

**Reuses from MenuList:**
- Same atomic transaction pattern as `create-subscription/route.ts`
- Same `platformSummary/summary` counter pattern
- Same `createDefaultRoles()` for RBAC
- Same `FirestoreSubscriptionDoc` type
- Same `createInitialSubscription()` DAL function

### 2. OnboardingForm (`OnboardingForm.tsx`)

**Type:** Client component (`'use client'`)
**Deps:** `next-auth/react` (useSession, signIn)

**4-step flow:**
1. **Auth** — Google sign-in button (if not authenticated)
2. **Details** — Company name, product name, product URL, support email, billing model, monthly plan, INR/USD checkout currency, main product pages, and exact selected price
3. **Creating** — Spinner + progress text
4. **Done** — Success: shows plan, pending subscription price/currency, one-time widget key when newly created, and next steps

**Zero external UI deps** — inline styles, no antd/tailwind in the component itself.

The submit client sends `/api/answerlattice/onboard` with same-origin credentials, no-store cache, and manual redirect handling. It applies the same HTTP(S)-only, no-embedded-credentials rule to product URLs, parses the route response through a 16 KB bounded JSON reader, and requires `workspaceCreated`, `recovered`, `widgetKeyNeedsRotation`, validated billing amount/currency/monthly interval, a current plan, a pending/created subscription, and a widget-key shape consistent with rotation before refreshing the session or showing success. The browser independently applies the same exact-host Razorpay checkout guard before accepting the response. A recovered payment-pending workspace shows the rotation instruction instead of pretending the original plaintext key can be displayed again. Malformed, oversized, redirected, rejected, unsafe-checkout, or wrong-shape responses keep fixed browser failure copy and bounded diagnostics only.

The public setup form keeps primary controls at a minimum 44px touch target, including Google sign-in, switch actions, inputs, selects, checkbox rows, checkout, and dashboard/billing actions. Checkout opens with `noopener,noreferrer` and analytics labels use the actual selected plan and currency.

### 3. Answerlattice Plans (`src/data/answerlattice/plans.ts`)

**3 plans defined:**
- `answerlattice_starter` — ₹999/mo or US$12/mo; ₹9,990/yr or US$120/yr
- `answerlattice_growth` — ₹2,999/mo or US$36/mo; ₹29,990/yr or US$360/yr
- `answerlattice_studio` — ₹6,999/mo or US$84/mo; ₹69,990/yr or US$840/yr

Each plan has limits: maxEntities, maxCanonicalAnswers, maxKBArticles, maxSignalEventsPerMonth, maxWorkspaces, widgetIncluded, and apiAccessIncluded. Public plans currently keep apiAccessIncluded false; the field is retained for a future controlled API rollout.

### 4. KB Import Entry (`src/components/templates/platform/KBGeneration/UploadModal.tsx`)

The Answerlattice import screen reuses the existing generation job pipeline, but resolves workspace scope from the Answerlattice session. Supported starter sources:

- uploaded PDFs, documents, images, videos, and other files
- pasted docs/help URLs stored as a bounded text source
- pasted starter answers / known FAQs stored as a bounded text source

The text-source path does not add a crawler. It creates `text/plain` source files and sends them through the existing `kb-generation` job, which keeps the first value path cheap and avoids a new Firestore collection or backend scan.

---

## API Contract

**POST /api/answerlattice/onboard**

Request:
```json
{
  "companyName": "Acme Inc.",
  "productName": "Acme CRM",
  "productUrl": "https://app.acme.test",
  "supportEmail": "support@acme.test",
  "billingModel": "subscription",
  "primarySurfaces": ["billing", "onboarding", "settings"],
  "planId": "answerlattice_starter",
  "interval": "MONTH",
  "currency": "INR"
}
```

Response (success):
```json
{
  "apiKey": "al_a1b2c3d4...",
  "billing": { "amount": 99900, "currency": "INR", "interval": "MONTH" },
  "recovered": false,
  "subscription": { "id": "sub_abc123", "shortUrl": "https://rzp.io/i/...", "status": "created" },
  "plan": { "id": "answerlattice_starter", "name": "Starter", "isBeta": false },
  "initialSurfaceCount": 3,
  "widgetKeyNeedsRotation": false,
  "workspaceCreated": true
}
```

`subscription` contains the Razorpay subscription id, payment URL, and provider status. A new response uses provider status `created`; a persisted recovery summary uses `pending`. The Firestore subscription remains `pending`; activation depends on the shared Razorpay verify/webhook flow, which derives `productId: 'AL'` from request body or Razorpay notes and updates Answerlattice Firebase.

Errors: 400/404 (invalid input or plan), 401 (not authenticated), 403 (feature unavailable), 409 (account exists, active setup, changed retry details, provider recovery pending, or terminal checkout retired), 413 (body too large), 429 (rate limited with `Retry-After`), 503 (Firebase unavailable), 500 (fixed onboarding failure). `ANSWERLATTICE_PROVIDER_CHECKOUT_EXPIRED` means the exact prior checkout was terminal and its provisional scope was compensated; the founder can resubmit the same details. Error responses expose fixed product codes and bounded diagnostics, not provider internals. Every route-owned response uses the private/no-store helper.

## Attempt State Machine

```text
new -> provisioning
provisioning -> provider_recovery_pending  (provider outcome unknown)
provider_recovery_pending -> payment_pending (provider recovered or safely created)
provisioning -> inactive                  (failure proven before provider creation)
provider_recovery_pending -> inactive     (exact known checkout is terminal)
payment_pending -> active/trialing        (shared verified payment lifecycle)
```

`payment_pending` is durable local truth. Optional bridge/bootstrap work after that point is retryable and is outside compensation.

---

## Tenant Isolation

Answerlattice uses the same collection names but, in separate mode, writes them to the Answerlattice Firebase project. Documents are identified by:
- `onboardingSource: 'ANSWERLATTICE_ONBOARDING'` on tenant + store docs
- `pId: 'AL'` and `productId: 'AL'` on tenant + store/user/subscription scope where the current compatibility shape requires both
- `businessType: 'SaaS'` + `businessIndustry: 'B2B'`
- Widget key prefix: `al_*` (vs `ml_*` for MenuList), persisted under `answerlatticeWidgetApi`

This allows querying Answerlattice-specific tenants without a separate collection.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-19 | 1.7.1 | Added known-provider-ID preservation, stale-retry cleanup, duplicate-email fail-closed admission, HTTP(S)-only product URLs, and route-wide private responses |
| 2026-07-19 | 1.7.0 | Added durable provider-recovery state, 15-minute unknown-outcome hold, created-only exact provider admission, local-finalization rollback boundary, strict recovered-summary parsing, private response headers, and emulator proof |
| 2026-07-11 | 1.6.1 | Restricted setup to monthly billing, added exact-host Razorpay checkout validation on server and browser, strengthened Answerlattice attempt ownership checks, and documented 44px public setup controls. |
| 2026-07-11 | 1.6.0 | Documented plan/INR/USD selection, request fingerprints, provider recovery, atomic finalization, payment-pending recovery, one-time widget-key handling, and scoped compensation |
| 2026-06-30 | 1.5.1 | Hardened the get-started client response boundary with same-origin credentials, no-store cache, manual redirect handling, a 16 KB bounded response parser, result-shape validation, and bounded diagnostics before success state |
| 2026-05-21 | 1.5.0 | Documented product-aware Razorpay activation for paid Answerlattice onboarding |
| 2026-05-21 | 1.3.0 | Added richer product profile inputs, initial product-surface bootstrap, compact context summary seed, and Starter/Growth/Studio pricing |
| 2026-05-21 | 1.2.0 | Documented separate-product onboarding sequence: Answerlattice-project user, default-auth `productAccounts.AL` bridge, tenant summary, and `answerlatticeWidgetApi` key |
| 2026-05-16 | 1.1.0 | Added paid Answerlattice Razorpay subscription path and `currency` input |
| 2026-03-07 | 1.0.0 | Initial implementation |

# Answerlattice Client Onboarding — Implementation

> **Version:** 1.6.1
> **Last Updated:** 2026-07-11
> **Audience:** Developers

---

## File Structure

```
src/app/api/answerlattice/onboard/route.ts           # Onboarding API (server-side)
src/app/sites/answerlattice/get-started/page.tsx      # Get-started page (server component)
src/app/sites/answerlattice/get-started/OnboardingForm.tsx  # Signup form (client component)
src/data/answerlattice/plans.ts                       # Answerlattice plans config
```

---

## Components

### 1. Onboarding API (`/api/answerlattice/onboard`)

**Auth:** `withAuth()` — requires Google OAuth session
**Method:** POST
**Body:** `{ companyName, productName?, productUrl?, supportEmail?, billingModel?, primarySurfaces?, planId?, interval?, currency? }`

**Flow:**
1. Validate the session user document ID, feature availability, and per-user payment-onboarding rate limit.
2. Read at most 32 KB of JSON and validate company/product fields, selected surfaces, plan, monthly interval, and INR/USD currency.
3. Build a SHA-256 request fingerprint from normalized setup inputs.
4. If the workspace is already `payment_pending`, revalidate the store scope, restore the default-auth product bridge, and return the existing checkout without exposing the original plaintext widget key.
5. If the same attempt is still `provisioning`, reject an active attempt, reject changed request details, or resume the exact expired scope.
6. For a new attempt, create the provisional tenant, store, and Answerlattice user in one transaction with the attempt ID, request fingerprint, and `provisioning` status.
7. Resolve the product-scoped Razorpay plan. On a resumed attempt or provider error, search a bounded provider window for the exact attempt/store/tenant/plan notes before creating another subscription.
8. Accept a provider checkout link only when it is an HTTPS URL on the exact `rzp.io` host, with no credentials or non-standard port. Unsafe or malformed provider/recovery links become `null` rather than a browser navigation target.
9. Generate the widget key, then transactionally commit the pending subscription, store subscription summary, widget-key manager state, and tenant/store/user `payment_pending` status.
10. Restore `productAccounts.AL`, seed product surfaces and compact summaries, initialize compiled-context control-plane state, and return the bounded result.
11. If the route fails before completion, attempt provider cancellation and transactionally compensate only documents owned by the same Answerlattice product, attempt, fingerprint, tenant, and store scope.
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

The submit client sends `/api/answerlattice/onboard` with same-origin credentials, no-store cache, and manual redirect handling. It parses the route response through a 16 KB bounded JSON reader and requires `workspaceCreated`, `recovered`, `widgetKeyNeedsRotation`, validated billing amount/currency/monthly interval, plan, optional subscription, and a string-or-null API key before refreshing the session or showing success. The browser independently applies the same exact-host Razorpay checkout guard before accepting the response. A recovered payment-pending workspace shows the rotation instruction instead of pretending the original plaintext key can be displayed again. Malformed, oversized, redirected, rejected, unsafe-checkout, or wrong-shape responses keep fixed browser failure copy and bounded diagnostics only.

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

`subscription` contains the Razorpay subscription id, payment URL, and provider status. The Firestore subscription is created as `pending`; activation depends on the shared Razorpay verify/webhook flow, which now derives `productId: 'AL'` from request body or Razorpay notes and updates Answerlattice Firebase.

Errors: 400/404 (invalid input or plan), 401 (not authenticated), 403 (feature unavailable), 409 (account exists, active setup, or changed retry details), 413 (body too large), 429 (rate limited), 503 (Firebase unavailable), 500 (fixed onboarding failure)

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
| 2026-07-11 | 1.6.1 | Restricted setup to monthly billing, added exact-host Razorpay checkout validation on server and browser, strengthened Answerlattice attempt ownership checks, and documented 44px public setup controls. |
| 2026-07-11 | 1.6.0 | Documented plan/INR/USD selection, request fingerprints, provider recovery, atomic finalization, payment-pending recovery, one-time widget-key handling, and scoped compensation |
| 2026-06-30 | 1.5.1 | Hardened the get-started client response boundary with same-origin credentials, no-store cache, manual redirect handling, a 16 KB bounded response parser, result-shape validation, and bounded diagnostics before success state |
| 2026-05-21 | 1.5.0 | Documented product-aware Razorpay activation for paid Answerlattice onboarding |
| 2026-05-21 | 1.3.0 | Added richer product profile inputs, initial product-surface bootstrap, compact context summary seed, and Starter/Growth/Studio pricing |
| 2026-05-21 | 1.2.0 | Documented separate-product onboarding sequence: Answerlattice-project user, default-auth `productAccounts.AL` bridge, tenant summary, and `answerlatticeWidgetApi` key |
| 2026-05-16 | 1.1.0 | Added paid Answerlattice Razorpay subscription path and `currency` input |
| 2026-03-07 | 1.0.0 | Initial implementation |

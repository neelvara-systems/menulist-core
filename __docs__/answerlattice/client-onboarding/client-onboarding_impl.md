# Answerlattice Client Onboarding — Implementation

> **Version:** 1.5.0
> **Last Updated:** 2026-05-21
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
1. Verify user doesn't already have `productAccounts.AL` or an Answerlattice-project tenant/store (prevents re-onboarding while allowing existing MenuList owners to add Answerlattice)
2. Rate limiting (3/hour per user)
3. Validate input (companyName min 2 chars, optional product URL, optional support email, billing model, selected product surfaces)
4. Resolve plan (beta default)
5. Atomic Firestore transaction: create Answerlattice tenant + store + Answerlattice user
6. Create subscription (beta: free, 6-month window; paid: Razorpay recurring subscription)
7. Write the default-auth bridge under `productAccounts.AL` and upsert `platformSummary/answerlatticeTenantsSummary`
8. Bootstrap initial Answerlattice product surfaces and compact context summary from selected onboarding pages
9. Generate widget key (`al_` prefix) under `stores/{sId}.answerlatticeWidgetApi`
10. Return tenantId, storeId, subscriptionId, apiKey
11. Paid plans activate through the shared product-aware Razorpay verify/webhook flow using `productId: 'AL'` and Answerlattice Firebase persistence.

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
2. **Details** — Company name, product name, product URL, support email, billing model, main product pages, and plan badge
3. **Creating** — Spinner + progress text
4. **Done** — Success: shows tenantId, plan, widget key, next steps

**Zero external UI deps** — inline styles, no antd/tailwind in the component itself.

### 3. Answerlattice Plans (`src/data/answerlattice/plans.ts`)

**4 plans defined:**
- `answerlattice_beta` — ₹0/mo, 6 months, controlled launch access
- `answerlattice_starter` — ₹999/mo or ₹9,990/yr
- `answerlattice_growth` — ₹2,999/mo or ₹29,990/yr
- `answerlattice_studio` — ₹6,999/mo or ₹69,990/yr

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
  "planId": "answerlattice_beta",
  "interval": "MONTH",
  "currency": "INR"
}
```

Response (success):
```json
{
  "tenantId": 42,
  "storeId": 43,
  "subscriptionId": "answerlattice_beta_42_43_1709...",
  "apiKey": "al_a1b2c3d4...",
  "subscription": null,
  "plan": { "id": "answerlattice_beta", "name": "Beta", "isBeta": true },
  "initialSurfaceCount": 3
}
```

For paid plans, `subscription` contains the Razorpay subscription id, payment URL, and provider status. The Firestore subscription is created as `pending`; activation depends on the shared Razorpay verify/webhook flow, which now derives `productId: 'AL'` from request body or Razorpay notes and updates Answerlattice Firebase.

Errors: 400 (already onboarded / invalid input), 401 (not authenticated), 403 (feature unavailable), 429 (rate limited), 500 (server error)

---

## Tenant Isolation

Answerlattice uses the same collection names but, in separate mode, writes them to the Answerlattice Firebase project. Documents are identified by:
- `onboardingSource: 'ANSWERLATTICE_ONBOARDING'` on tenant + store docs
- `productId: 'AL'` on tenant + store docs
- `businessType: 'SaaS'` + `businessIndustry: 'B2B'`
- Widget key prefix: `al_*` (vs `ml_*` for MenuList), persisted under `answerlatticeWidgetApi`

This allows querying Answerlattice-specific tenants without a separate collection.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-05-21 | 1.5.0 | Documented product-aware Razorpay activation for paid Answerlattice onboarding |
| 2026-05-21 | 1.3.0 | Added richer product profile inputs, initial product-surface bootstrap, compact context summary seed, and Starter/Growth/Studio pricing |
| 2026-05-21 | 1.2.0 | Documented separate-product onboarding sequence: Answerlattice-project user, default-auth `productAccounts.AL` bridge, tenant summary, and `answerlatticeWidgetApi` key |
| 2026-05-16 | 1.1.0 | Added paid Answerlattice Razorpay subscription path and `currency` input |
| 2026-03-07 | 1.0.0 | Initial implementation |

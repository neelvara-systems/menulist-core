# Canonica Client Onboarding — Implementation

> **Version:** 1.0.0
> **Last Updated:** 2026-03-07
> **Audience:** Developers

---

## File Structure

```
src/app/api/canonica/onboard/route.ts           # Onboarding API (server-side)
src/app/sites/canonica/get-started/page.tsx      # Get-started page (server component)
src/app/sites/canonica/get-started/OnboardingForm.tsx  # Signup form (client component)
src/data/CanonicaPlansList.ts                    # Canonica plans config
```

---

## Components

### 1. Onboarding API (`/api/canonica/onboard`)

**Auth:** `withAuth()` — requires Google OAuth session
**Method:** POST
**Body:** `{ companyName, productName?, planId?, interval?, currency? }`

**Flow:**
1. Verify user doesn't already have `productAccounts.CN` or a Canonica-project tenant/store (prevents re-onboarding while allowing existing MenuList owners to add Canonica)
2. Rate limiting (3/hour per user)
3. Validate input (companyName min 2 chars)
4. Resolve plan (beta default)
5. Atomic Firestore transaction: create Canonica tenant + store + Canonica user
6. Create subscription (beta: free, 6-month window; paid: Razorpay recurring subscription)
7. Write the default-auth bridge under `productAccounts.CN` and upsert `platformSummary/canonicaTenantsSummary`
8. Generate widget API key (`cn_` prefix) under `stores/{sId}.canonicaWidgetApi`
9. Return tenantId, storeId, subscriptionId, apiKey

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
2. **Details** — Company name + product name inputs + plan badge
3. **Creating** — Spinner + progress text
4. **Done** — Success: shows tenantId, plan, API key, next steps

**Zero external UI deps** — inline styles, no antd/tailwind in the component itself.

### 3. Canonica Plans (`CanonicaPlansList.ts`)

**3 plans defined:**
- `canonica_beta` — $0/mo, 6 months, all features
- `canonica_starter` — ₹2,999/mo or ₹29,990/yr
- `canonica_pro` — ₹7,999/mo or ₹79,990/yr

Each plan has limits: maxEntities, maxCanonicalAnswers, maxKBArticles, maxSignalEventsPerMonth, widgetIncluded, apiAccessIncluded.

---

## API Contract

**POST /api/canonica/onboard**

Request:
```json
{
  "companyName": "Acme Inc.",
  "productName": "Acme CRM",
  "planId": "canonica_beta",
  "interval": "MONTH",
  "currency": "INR"
}
```

Response (success):
```json
{
  "tenantId": 42,
  "storeId": 43,
  "subscriptionId": "canonica_beta_42_43_1709...",
  "apiKey": "cn_a1b2c3d4...",
  "subscription": null,
  "plan": { "id": "canonica_beta", "name": "Beta", "isBeta": true }
}
```

For paid plans, `subscription` contains the Razorpay subscription id, payment URL, and provider status. The Firestore subscription is created as `pending`; activation still depends on the existing Razorpay webhook/reconciliation flow.

Errors: 400 (already onboarded / invalid input), 401 (not authenticated), 403 (feature unavailable), 429 (rate limited), 500 (server error)

---

## Tenant Isolation

Canonica uses the same collection names but, in separate mode, writes them to the Canonica Firebase project. Documents are identified by:
- `onboardingSource: 'CANONICA_ONBOARDING'` on tenant + store docs
- `productId: 'CN'` on tenant + store docs
- `businessType: 'SaaS'` + `businessIndustry: 'B2B'`
- API key prefix: `cn_*` (vs `ml_*` for MenuList), persisted under `canonicaWidgetApi`

This allows querying Canonica-specific tenants without a separate collection.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-05-21 | 1.2.0 | Documented separate-product onboarding sequence: Canonica-project user, default-auth `productAccounts.CN` bridge, tenant summary, and `canonicaWidgetApi` key |
| 2026-05-16 | 1.1.0 | Added paid Canonica Razorpay subscription path and `currency` input |
| 2026-03-07 | 1.0.0 | Initial implementation |

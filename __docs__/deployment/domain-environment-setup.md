# Domain Environment Setup

> **Category:** Infrastructure  
> **Last Updated:** August 2, 2026
> **Launch boundary:** Environment configuration is source setup only. DNS, Vercel deployment, Firebase deployment, provider smoke, and production-host verification need separate evidence.

## Purpose

Defines the required environment variables for MenuList domain-aware URL
generation across local, staging, and production.

The key rule is that **platform domains and customer tenant domains are now
separate**:

- `menulist.ai` is the production marketing/platform root.
- `app.menulist.ai` is the production owner/staff app.
- `*.menulist.online` is the production customer menu/OBP host family.
- `menulist.digital` and `www.menulist.digital` are the MenuList QA/staging
  website hosts.
- `app.menulist.digital` is the single QA/staging owner/staff app host.
- `*.menulist.digital` is the QA/staging customer test host family.
- `menulist.online` and `www.menulist.online` are exact production redirects,
  not customer pages.

These values are used by:

- `src/constants/deploymentTargets.ts`
- `src/constants/urls.ts`
- `src/lib/multiTenant/domainResolver.ts`
- `src/proxy.ts`
- Domain/subdomain settings UI labels
- Share/feedback/screen URL generation
- Cloud Functions server-to-server public cache revalidation

## Required Variables

- `NEXT_PUBLIC_PLATFORM_DOMAIN`
- `NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES`
- `NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_DEPLOYMENT_URL`

For custom-domain provider management in the Next.js server runtime:

- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_TEAM_ID` only when the project is team-owned

These provider variables are server-only. Never expose them through
`NEXT_PUBLIC_*`. `POST/GET/DELETE /api/domain` reads them through
`src/lib/domains/vercelDomains.ts`; the owner browser receives only bounded
domain/configuration results. DNS rows come from Vercel `recommendedIPv4`,
`recommendedCNAME`, project `apexName`, and verification challenges. No generic
DNS target is an accepted fallback.

## Production

```env
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_VERCEL_ENV=production
NEXT_PUBLIC_APP_URL=https://menulist.ai
NEXT_PUBLIC_DEPLOYMENT_URL=https://menulist.ai
NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.ai
NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES=menulist.ai,www.menulist.ai,app.menulist.ai
NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN=menulist.online
NEXTAUTH_URL=https://app.menulist.ai
```

Expected production behavior:

- `https://menulist.ai` serves MenuList marketing/platform pages.
- `https://app.menulist.ai` serves the owner/staff app and sign-in.
- `https://<business-slug>.menulist.online` serves public customer pages.
- `https://menulist.online/*` and `https://www.menulist.online/*` 301 to
  `https://menulist.ai/*`.
- `menulist.digital` and `www.menulist.digital` are not production hosts and
  must not be attached to the Vercel Production environment.

## Staging / Local Shared QA

```env
NEXT_PUBLIC_ENV=preview
NEXT_PUBLIC_VERCEL_ENV=preview
NEXT_PUBLIC_APP_URL=https://menulist.digital
NEXT_PUBLIC_DEPLOYMENT_URL=https://menulist.digital
NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.digital
NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES=menulist.digital,www.menulist.digital,app.menulist.digital
NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN=menulist.digital
NEXTAUTH_URL=https://app.menulist.digital
```

Expected staging behavior:

- `https://menulist.digital` and `https://www.menulist.digital` serve the
  MenuList main website with QA/staging env values.
- `https://app.menulist.digital` serves the single owner/staff app; its
  canonical dashboard route is `/dashboard` and the authenticated session
  selects the tenant/store.
- `https://<business-slug>.menulist.digital` serves QA customer test pages.
- Local generated customer links mirror staging and use
  `*.menulist.digital`.
- `menulist.online` is not a staging app host.
- Every `menulist.digital` response is non-indexable. Apex, `www`, `app`, and
  QA customer hosts send `X-Robots-Tag: noindex, nofollow, noarchive`, serve a
  disallow-all `robots.txt`, and do not publish `/sitemap.xml`.

## Local Development

Use `.env.staging.example` as the local key inventory because local and staging
share QA Firebase/provider values. The example is not deployable as-is: retain
only configured MenuList/shared runtime rows in the actual env, omit unrelated
product rows, and never run or upload a literal `<...>` placeholder.

Recommended local override:

```env
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_VERCEL_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

Keep these staging-shape values so generated customer links stay aligned with
QA:

```env
NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.digital
NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES=menulist.digital,www.menulist.digital,app.menulist.digital
NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN=menulist.digital
```

Notes:

- Localhost routing uses current origin (`http://localhost:3000`) via
  `getPublicBaseUrl()`.
- Domain settings UI uses `NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN` for the
  customer-link suffix.
- Owner/staff dashboard links use `DASHBOARD_URL`: `http://localhost:3000/dashboard` in local development,
  `https://app.menulist.digital/dashboard` in staging, and
  `https://app.menulist.ai/dashboard` in production. `OWNER_APP_URL` is the
  corresponding app origin, and `SIGNIN_URL` is its `/signin` route.

For destructive/rule-focused local work, use the Firebase Emulator Suite first:

```env
NEXT_PUBLIC_USE_EMULATORS=true
FUNCTIONS_EMULATOR=true
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
```

This is a local safety mode, not a third deployed environment. Keep these
values `false`/blank in Vercel, and use cloud `menulist-qa` locally only for a
deliberate integration smoke.

Firebase Functions use a separate non-secret tenant-domain value because the
app/API host and customer host are intentionally different:

```env
# QA
NEXT_PUBLIC_APP_URL=https://app.menulist.digital
MENULIST_TENANT_BASE_DOMAIN=menulist.digital

# Production
NEXT_PUBLIC_APP_URL=https://app.menulist.ai
MENULIST_TENANT_BASE_DOMAIN=menulist.online
```

## Public Cache Revalidation

Owner saves made from the app invalidate public menu/OBP cache through the
same-origin `/api/revalidate/menu` route using the owner's authenticated
session. Cloud Functions cannot use that browser session and cannot call
`revalidateTag()` directly because the cache lives in the Next.js runtime.

For direct Cloud Function writes, configure:

- `NEXT_PUBLIC_APP_URL` in the Firebase Functions environment so Functions can
  reach the correct Next.js app origin.
- `REVALIDATION_SECRET` in both Vercel and Firebase Secret Manager with the
  same value. Vercel uses it to authorize `/api/revalidate/menu`; Firebase
  Functions sends it in the `x-revalidate-secret` header.

No other app URL variables are required for this path.

## Billing And Budget Alert Boundary

Budget alerts are a Google Cloud Billing console setup step, not just env
variables. Before enabling paid Firebase services, Firebase Functions, Secret
Manager, Gemini API keys, Cloud Tasks, or production traffic, create budget
alerts for the matching Google Cloud project.

`GCP_BUDGET_WEBHOOK_SECRET` only protects the optional alert-only budget
webhook. It does not create either budget type, enable Preview spend-cap
enforcement, or replace provider quotas/rate limits. Configure the Gemini API
spend cap in Cloud Billing and keep the matching product
`*_GEMINI_SPEND_LIMIT_USD_10M` below the AI Studio rolling project limit.

## Vercel Scope Mapping

- Add **Production** values in Vercel Environment Variables with scope
  `Production`.
- Add **Preview/Staging** values in Vercel Environment Variables with scope
  `Preview` and restrict the Git Branch to exact branch `staging`. Do not make
  secrets available to all Preview branches.
- Keep `NEXT_PUBLIC_ENV=preview` for staging unless the deployment target
  matrix is extended to support a separate `staging` stage.
- Keep local values only in ignored local env files.
- Add `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, and optional `VERCEL_TEAM_ID` to each
  Vercel environment where owner custom-domain management is enabled.

## Copy/Paste Safety

- Paste values without quotes.
- Keep alias lists comma-separated in one line.
- Keep `NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN` present in both staging and
  production.
- After env changes, redeploy/restart so Next.js picks up updated values.

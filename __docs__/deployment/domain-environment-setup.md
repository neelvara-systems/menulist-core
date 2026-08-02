# Domain Environment Setup

> **Category:** Infrastructure  
> **Last Updated:** August 1, 2026
> **Launch boundary:** Environment configuration is source setup only. DNS, Vercel deployment, Firebase deployment, provider smoke, and production-host verification need separate evidence.

## Purpose

Defines the required environment variables for MenuList domain-aware URL
generation across local, staging, and production.

The key rule is that **platform domains and customer tenant domains are now
separate**:

- `menulist.ai` is the production marketing/platform root.
- `app.menulist.ai` is the production owner/staff app.
- `*.menulist.online` is the production customer menu/OBP host family.
- `qa.menulist.digital` is the MenuList QA/staging app.
- `*.qa.menulist.digital` is the QA/staging customer test host family.
- `menulist.online`, `www.menulist.online`, `menulist.digital`, and
  `www.menulist.digital` are exact redirect/noindex hosts, not customer pages.

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
# NEXTAUTH_URL=https://app.menulist.ai
```

Expected production behavior:

- `https://menulist.ai` serves MenuList marketing/platform pages.
- `https://app.menulist.ai` serves the owner/staff app and sign-in.
- `https://<business-slug>.menulist.online` serves public customer pages.
- `https://menulist.online/*` and `https://www.menulist.online/*` 301 to
  `https://menulist.ai/*`.
- `https://menulist.digital/*` and `https://www.menulist.digital/*` redirect to
  `https://menulist.ai/*` or show a noindex internal page.

## Staging / Local Shared QA

```env
NEXT_PUBLIC_ENV=preview
NEXT_PUBLIC_VERCEL_ENV=preview
NEXT_PUBLIC_APP_URL=https://qa.menulist.digital
NEXT_PUBLIC_DEPLOYMENT_URL=https://qa.menulist.digital
NEXT_PUBLIC_PLATFORM_DOMAIN=qa.menulist.digital
NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES=qa.menulist.digital
NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN=qa.menulist.digital
# NEXTAUTH_URL=https://qa.menulist.digital
```

Expected staging behavior:

- `https://qa.menulist.digital` serves the MenuList QA app.
- `https://<business-slug>.qa.menulist.digital` serves QA tenant test pages.
- Local generated customer links mirror staging and use
  `*.qa.menulist.digital`.
- `menulist.online` is not a staging app host.

## Local Development

Use `.env.staging.example` as the local template because local and staging share
QA Firebase/provider values.

Recommended local override:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Keep these staging-shape values so generated customer links stay aligned with
QA:

```env
NEXT_PUBLIC_PLATFORM_DOMAIN=qa.menulist.digital
NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES=qa.menulist.digital
NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN=qa.menulist.digital
```

Notes:

- Localhost routing uses current origin (`http://localhost:3000`) via
  `getPublicBaseUrl()`.
- Domain settings UI uses `NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN` for the
  customer-link suffix.
- Owner/staff sign-in links use `DASHBOARD_URL`, which is `qa.menulist.digital`
  for staging/local and `app.menulist.ai` for production.

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

## Vercel Scope Mapping

- Add **Production** values in Vercel Environment Variables with scope
  `Production`.
- Add **Preview/Staging** values in Vercel Environment Variables with scope
  `Preview` or the custom staging environment used by the project.
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

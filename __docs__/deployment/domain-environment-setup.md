# Domain Environment Setup (Prod / Preview / Local)

> **Category:** Infrastructure  
> **Last Updated:** April 17, 2026

---

## Purpose

Defines the required environment variables for domain-aware URL generation across:
- Production (`menulist.ai`)
- Preview/Staging (`menulist.online`)
- Local development (`localhost`)

For the full product staging/production setup, including the static MyCodex reader, see
[`three-product-environment-setup.md`](./three-product-environment-setup.md).

These values are used by:
- `src/constants/urls.ts`
- Domain/subdomain settings UI labels
- Share/feedback/screen URL generation
- Cloud Functions server-to-server public cache revalidation

---

## Required Variables

- `NEXT_PUBLIC_PLATFORM_DOMAIN`
- `NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES`
- `NEXT_PUBLIC_APP_URL`

## Public Cache Revalidation

Owner saves made from the app invalidate public menu/OBP cache through the same-origin `/api/revalidate/menu` route using the owner's authenticated session. Cloud Functions cannot use that browser session and cannot call `revalidateTag()` directly because the cache lives in the Next.js runtime. For direct Cloud Function writes, configure:

- `NEXT_PUBLIC_APP_URL` in the Firebase Functions environment so Functions can reach the correct Next.js app origin.
- `REVALIDATION_SECRET` in both Vercel and Firebase Secret Manager with the same value. Vercel uses it to authorize `/api/revalidate/menu`; Firebase Functions sends it in the `x-revalidate-secret` header.

No other app URL variables are required for this path.

---

## Production (Vercel Production)

```env
NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.ai
NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES=menulist.ai,www.menulist.ai
NEXT_PUBLIC_APP_URL=https://menulist.ai
```

---

## Preview/Staging (Vercel custom `staging` or Preview branch mapping)

```env
NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.online
NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES=menulist.online,www.menulist.online
NEXT_PUBLIC_APP_URL=https://menulist.online
```

---

## Local Development (`.env.local`)

```env
NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.online
NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES=menulist.online,www.menulist.online
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Notes:
- Localhost routing uses current origin (`http://localhost:3000`) via `getPublicBaseUrl()`.
- `NEXT_PUBLIC_PLATFORM_DOMAIN` still controls the domain suffix shown in domain settings UI.

---

## Vercel Scope Mapping

- Add **Production** values in Vercel Environment Variables with scope: `Production`.
- Add **Preview/Staging** values in Vercel Environment Variables with scope: a custom `staging` environment, or `Preview` if staging is implemented as a Preview branch/domain mapping.
- Keep `NEXT_PUBLIC_ENV=preview` for staging unless the deployment target matrix is extended to support a separate `staging` stage.
- Keep local values only in `.env.local` (do not commit).

---

## Copy/Paste Safety

- Paste values **without quotes**.
- Keep alias list comma-separated in a single line.
- After env changes, redeploy/restart so Next.js picks up updated values.

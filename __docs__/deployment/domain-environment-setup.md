# Domain Environment Setup (Prod / Preview / Local)

> **Category:** Infrastructure  
> **Last Updated:** April 17, 2026

---

## Purpose

Defines the required environment variables for domain-aware URL generation across:
- Production (`menulist.ai`)
- Preview/Staging (`menulist.online`)
- Local development (`localhost`)

These values are used by:
- `src/constants/urls.ts`
- Domain/subdomain settings UI labels
- Share/feedback/screen URL generation

---

## Required Variables

- `NEXT_PUBLIC_PLATFORM_DOMAIN`
- `NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES`
- `NEXT_PUBLIC_APP_URL`

---

## Production (Vercel Production)

```env
NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.ai
NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES=www.menulist.ai,menulist.online,www.menulist.online
NEXT_PUBLIC_APP_URL=https://menulist.ai
```

---

## Preview/Staging (Vercel Preview)

```env
NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.online
NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES=www.menulist.online,menulist.ai,www.menulist.ai
NEXT_PUBLIC_APP_URL=https://menulist.online
```

---

## Local Development (`.env.local`)

```env
NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.online
NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES=www.menulist.online,menulist.ai,www.menulist.ai
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Notes:
- Localhost routing uses current origin (`http://localhost:3000`) via `getPublicBaseUrl()`.
- `NEXT_PUBLIC_PLATFORM_DOMAIN` still controls the domain suffix shown in domain settings UI.

---

## Vercel Scope Mapping

- Add **Production** values in Vercel Environment Variables with scope: `Production`.
- Add **Preview/Staging** values in Vercel Environment Variables with scope: `Preview`.
- Keep local values only in `.env.local` (do not commit).

---

## Copy/Paste Safety

- Paste values **without quotes**.
- Keep alias list comma-separated in a single line.
- After env changes, redeploy/restart so Next.js picks up updated values.

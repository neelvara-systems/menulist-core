# URL Routing Architecture — Implementation Guide

> **Audience:** Developers  
> **Last Updated:** February 19, 2026  
> **Version:** 2.0  
> **Status:** Phase 1 + Phase 2 Complete  
> **ADRs:** See [url-routing-architecture_adr.md](./url-routing-architecture_adr.md) for all architecture decisions

---

## Architecture Overview

```
Customer opens: storypizza.menulist.ai/food-menu
                                │
                    ┌───────────┴───────────┐
                    │     MIDDLEWARE          │
                    │  src/middleware.ts      │
                    │                        │
                    │  1. resolveDomain()    │
                    │     → subdomain        │
                    │  2. Set CDN headers    │
                    │  3. Set tenant headers │
                    │  4. Rewrite /_client   │
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │  _client/[[...slug]]   │
                    │  page.tsx              │
                    │                        │
                    │  1. Read headers       │
                    │  2. getStoreBySubdomain│
                    │  3. getProjectBySlug   │
                    │     a. stored slug     │
                    │     b. slugify(name)   │
                    │     c. previousSlugs   │
                    │        → 301 redirect  │
                    │  4. Render menu        │
                    └────────────────────────┘
```

---

## Database Schema

### Project Summary Data (platformSummary/projects\_{sId})

```typescript
interface ProjectSummaryData {
  name: string;
  description?: string;
  active: boolean;
  isDefault?: boolean;
  slug?: string; // NEW: Permanent URL slug
  previousSlugs?: string[]; // NEW: Old slugs for 301 redirect
}
```

### Store Data (stores/{sId})

```typescript
// Added to StoreDataType:
outletSlug?: string;  // NEW: URL path segment for outlet routing
                      // e.g., "pune" → brand.menulist.ai/pune
                      // Only set on outlet stores (isMaster=false)
```

---

## File Inventory

### New Files (Phase 1 + Phase 2)

| File                                                                | Purpose                                                   |
| ------------------------------------------------------------------- | --------------------------------------------------------- |
| `src/constants/reservedSlugs.ts`                                    | Reserved slug/subdomain namespace constants + validators  |
| `src/app/api/subdomain/check/route.ts`                              | Subdomain availability checker API (GET)                  |
| `src/app/api/domain/route.ts`                                       | MenuList store custom-domain management via Vercel API (POST/GET/DELETE) |
| `src/lib/domains/vercelDomains.ts`                                  | Shared Vercel domain add/check/remove helper used by MenuList and Answerlattice hosted help |
| `src/components/.../businessSettings/tabs/SubdomainTab.tsx`         | Subdomain settings UI tab                                 |
| `src/components/.../businessSettings/tabs/CustomDomainTab.tsx`      | Custom domain UI with DNS verification flow               |
| `src/app/_client/obp/BrandOBPContent.tsx`                           | Multi-store brand OBP (store selector)                    |
| `scripts/backfill-project-slugs.ts`                                 | Migration: backfill slugs on existing projects            |
| `__docs__/url-routing-architecture/url-routing-architecture_adr.md` | All architecture decision records (ADR-1 through ADR-11)  |

### Modified Files (Phase 1 + Phase 2)

| File                                                   | Change                                                                     |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| `src/components/.../projects/types/project.types.ts`   | Added `slug`, `previousSlugs`, `slugLockedAt` to types                     |
| `src/types/platform/store.ts`                          | Added `outletSlug` + `subdomain` to `MinimalStoreDataType`                 |
| `src/database/projects/index.ts`                       | `addProject` slug gen, `updateProjectMetadata` slug change + previousSlugs |
| `src/app/api/outlets/create/route.ts`                  | `outletSlug` generation on outlet creation                                 |
| `src/app/_client/[[...slug]]/page.tsx`                 | Stored slug resolver, previousSlugs 301, subdomain→custom domain 301       |
| `src/config/features.ts`                               | Added `ENABLE_STORED_SLUGS` feature flag                                   |
| `src/middleware.ts`                                    | CDN cache headers, lowercase + trailing slash normalization                |
| `src/app/api/onboarding/create-subscription/route.ts`  | Auto-generate subdomain, `subDomain` on tenant, `subdomain` in storesList  |
| `src/app/api/msg-preview/[sessionId]/approve/route.ts` | **BUG FIX**: Added subdomain, slug, projectsSummary, fixed publicUrl       |
| `src/app/_client/obp/OBPContent.tsx`                   | Multi-store brand detection → BrandOBP                                     |
| `src/components/.../businessSettings/index.tsx`        | Integrated SubdomainTab + CustomDomainTab into tab list                    |
| `src/components/.../businessSettings/tabs/index.ts`    | Added SubdomainTab + CustomDomainTab exports                               |

---

## Key Implementation Details

### 1. Slug Generation (addProject)

**File:** `src/database/projects/index.ts:337-345`

```typescript
let projectSlug = data.slug || slugify(data.name || "untitled");
if (isReservedProjectSlug(projectSlug)) {
  projectSlug = `${projectSlug}-menu`;
}
```

- Auto-generated from name on creation
- Reserved slugs get `-menu` suffix (e.g., "reviews" → "reviews-menu")
- Stored in `projectsSummary` alongside project name

### 2. Slug Change on Rename (updateProjectMetadata)

**File:** `src/database/projects/index.ts:396-412`

When project name changes:

1. Generate new slug from new name
2. Push old slug to `previousSlugs[]`
3. Both stored in summary

### 3. Client Resolver (getProjectBySlugOrDefault)

**File:** `src/app/_client/[[...slug]]/page.tsx:196-220`

Resolution order:

1. **Stored slug** — `p.slug === normalizedSlug`
2. **Slugified name** — `slugify(p.name) === normalizedSlug` (backward compat)
3. **Previous slugs** — `p.previousSlugs.includes(normalizedSlug)` → sets `redirectSlug`

If matched via previousSlugs, `redirect()` is called for 301.

### 4. Outlet Slug Generation

**File:** `src/app/api/outlets/create/route.ts:118-122`

```typescript
let outletSlug = slugify(outletName);
if (isReservedOutletSlug(outletSlug)) {
  outletSlug = `${outletSlug}-outlet`;
}
```

Stored on outlet store doc as `outletSlug` field.

### 5. CDN Cache Headers

**File:** `src/middleware.ts:45-49`

```typescript
response.headers.set(
  "Cache-Control",
  "public, s-maxage=60, stale-while-revalidate=300",
);
```

Set on all client domain rewrites (subdomain + custom domain).

---

## Feature Flag

```typescript
// src/config/features.ts
ENABLE_STORED_SLUGS: true;
```

When disabled: slugs derived from name at runtime (current behavior), no redirect support, no reserved namespace enforcement.

---

## Environment Variables

| Variable            | Required                 | Purpose                                                                             |
| ------------------- | ------------------------ | ----------------------------------------------------------------------------------- |
| `VERCEL_TOKEN`      | Yes (for custom domains) | Vercel API Bearer token — used by `/api/domain` and Answerlattice hosted-help settings to add/verify/remove custom domains |
| `VERCEL_PROJECT_ID` | Yes (for custom domains) | Vercel project ID — identifies which project to manage domains for                  |
| `VERCEL_TEAM_ID`    | No                       | Vercel team ID — only needed for team-owned projects                                |

**Setup:** Add to `.env.local` for development, Vercel Environment Variables for production.

```bash
# Custom Domain Management (URL Routing Architecture — ADR-5)
VERCEL_TOKEN=your_vercel_api_token
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxx
VERCEL_TEAM_ID=team_xxxxxxxxxxxx  # Optional
```

---

## Security Checklist

| Check                          | Status | Notes                                                 |
| ------------------------------ | ------ | ----------------------------------------------------- |
| API routes auth-protected      | ✅     | `/api/domain` + `/api/subdomain/check` use `withAuth` |
| Reserved slug validation       | ✅     | Blocked at project creation/rename/onboarding         |
| No user-provided slugs exposed | ✅     | Auto-generated from name via `slugify()`              |
| XSS prevention                 | ✅     | `slugify()` strips all non-alphanumeric chars         |
| Redirect loop prevention       | ✅     | Only redirects if `redirectSlug !== slug`             |
| Domain ownership validation    | ✅     | Vercel handles DNS verification + SSL                 |
| Subdomain uniqueness           | ✅     | Pre-checked before transaction in both flows          |

---

## Migration Plan

### For Existing Projects (One-Time Script)

```
For each tenant:
  For each store:
    Read projectsSummary
    For each active project:
      If project.slug is undefined:
        project.slug = slugify(project.name)
        Save to projectsSummary
```

**Safe:** Idempotent. Backward-compatible (resolver falls back to slugify).
**Scope:** Batch operation, runs in minutes.

---

## Deployment Environments & URL Configuration

### Product Domains

| Product  | Local access                 | Preview/QA domains                         | Production domains                         | Purpose                                      |
| -------- | ---------------------------- | ------------------------------------------ | ------------------------------------------ | -------------------------------------------- |
| MenuList | `localhost:3000`             | `menulist.online`, `www.menulist.online`   | `menulist.ai`, `www.menulist.ai`           | Marketing, dashboard, client menus           |
| ConstantLayer | `localhost:3000/__constantlayer` | `constantlayer.menulist.online` | `constantlayer.in`, `www.constantlayer.in` | Static parent/entity trust website |
| Answerlattice | `localhost:3000/__answerlattice`  | `answerlattice.menulist.online`, `www.answerlattice.menulist.online`           | `answerlattice.com`, `www.answerlattice.com`         | Answerlattice website and product routes          |
| CampaignCue | `localhost:3000/__campaigncue` | `campaigncue.menulist.online` | `campaigncue.ai`, `www.campaigncue.ai` | CampaignCue website and workspace routes |
| MyCodex  | `localhost:3000/__mycodex`   | `menulist.digital`, `www.menulist.digital` | `menulist.digital`, `www.menulist.digital` | Internal documentation reader on Vercel      |
| SignalDesk | `localhost:3000/signaldesk` | `signaldesk.menulist.online` | `signaldesk.menulist.ai` | Private MenuList marketing and distribution app |

Source of truth: `src/constants/deploymentTargets.ts`.

ConstantLayer is deliberately a product-domain site route, not a MenuList tenant/custom domain and not a database-backed product. It rewrites to `/sites/constantlayer`, has no owner/product app route, and uses an empty Firebase project id in `src/constants/deploymentTargets.ts`.

Internal portfolio aliases `/cl`, `/ml`, `/al`, and `/cc` are guarded by `src/middleware.ts` and only resolve on the MyCodex product host or already-resolved MyCodex requests. They do not change product slugs, env names, Firebase targets, or public canonical URLs. `/cl` is only a shortcut to the ConstantLayer public site route group.

SignalDesk also has a MyCodex-host app alias: `/sd`. `https://menulist.digital/sd` rewrites to `/signaldesk`, `/sd/targets` rewrites to `/signaldesk/targets`, and `/sd/signin` rewrites to the shared sign-in page so the callback can return to `/sd`. This alias is for private testing/operation only and does not make SignalDesk a public `/sites` product.

`menulist.digital` is deliberately a product domain, not a MenuList tenant/custom domain. Middleware must rewrite it to `/sites/mycodex` before the client-domain branch can treat unknown hosts as restaurant custom domains.

MyCodex is an internal documentation reader. It reserves `MC` as its internal product code, but runtime routing and session checks use the `mycodex` slug. Outside localhost, `src/middleware.ts` requires a signed MyCodex session cookie before rewriting protected pages to `/sites/mycodex`. Unauthenticated MyCodex requests redirect to `/login`, where `src/app/sites/mycodex/api/session/route.ts` validates `MYCODEX_BASIC_AUTH_USER` and `MYCODEX_BASIC_AUTH_PASSWORD` server-side and sets an `HttpOnly` `mycodex_session` cookie. MyCodex responses also set no-index/no-follow robot headers and serve a product-scoped disallow-all `robots.txt`; these crawler restrictions are scoped to MyCodex and do not change MenuList tenant/menu SEO or Answerlattice public-site discovery.

MyCodex PWA assets are scoped to the MyCodex product host. `src/app/sites/mycodex/layout.tsx` points to `/mycodex.webmanifest`, `/mycodex-logo.svg`, MyCodex PNG icons, and Apple startup images under `/mycodex-splash/`. `src/components/ServiceWorkerRegister.tsx` registers `/mycodex-sw.js` only when `resolveDomain()` returns the `mycodex` product host. The worker is a private-docs offline shell: it caches `/offline` plus static MyCodex logo assets only, and does not cache markdown, `__docs__` pages, or document HTML.

MyCodex reads markdown from `__docs__` at runtime. `next.config.js` therefore includes `./__docs__/**/*` in `experimental.outputFileTracingIncludes` for `/sites/mycodex` routes so Vercel serverless functions receive the same documentation files that local `/__mycodex` reads from disk. Do not broaden this include to MenuList or Answerlattice routes unless those products also gain explicit filesystem-backed runtime content.

SignalDesk is a private app route, not a public product website. It is declared in `src/constants/deploymentTargets.ts` for URL/Firebase target selection, but it is not registered in `src/constants/productDomains.ts` because there is no `/sites/signaldesk` public site. `src/middleware.ts` handles known SignalDesk hosts separately and rewrites them to `/signaldesk/*`; it also handles the MyCodex-host `/sd` alias. `src/constants/urls.ts` reserves the `signaldesk` subdomain so it is not mistaken for a restaurant tenant. `src/components/signaldesk/SignalDeskPathProvider.tsx` keeps app navigation on `/sd/*` when the request arrived through the alias.

| Env var | Required on Vercel | Purpose |
| ------- | ------------------ | ------- |
| `MYCODEX_BASIC_AUTH_USER` | Yes | Server-side username checked by the MyCodex login route |
| `MYCODEX_BASIC_AUTH_PASSWORD` | Yes | Server-side password checked by the MyCodex login route and used as session-secret fallback |
| `MYCODEX_SESSION_SECRET` | Yes | Dedicated HMAC secret for signing `mycodex_session`; env validation requires it on Vercel |

### Key Env Var: `NEXT_PUBLIC_APP_URL`

Set per environment on Vercel:

| Environment | Value                            |
| ----------- | -------------------------------- |
| Production  | `https://menulist.ai`            |
| Preview     | `https://menulist-ai.vercel.app` |

Used by: CORS (`corsValidation.ts`), sitemap (`sitemap.ts`), screen URLs (`screen/utils.ts`), QR codes (`feedbackQrCode.ts`), SEO metadata (`layout.tsx`, `SchemaMarkup.tsx`).

### Where Vercel Domains Are Registered

- **`src/constants/deploymentTargets.ts`** — stage-specific product domain matrix
- **`src/constants/productDomains.ts`** — enabled product site registry and internal route groups
- **`src/constants/urls.ts`** — derives `PLATFORM_DOMAINS` from MenuList domains plus `ALL_PRODUCT_DOMAINS`
- **`src/app/sites/mycodex/robots.txt/route.ts`** — MyCodex-only crawler disallow response
- **`corsValidation.ts`** — `ALLOWED_ORIGINS` includes `...VERCEL_URLS`
- **`csp-allowlist.ts`** — `frameSources` includes `https://vercel.live`
- **`middleware.ts`** — CSP allows `'unsafe-inline'` for styles/scripts (Ant Design + Next.js require it)

### Adding a New Vercel Domain

1. If it is a product/internal platform host, add it to the matching product in `src/constants/deploymentTargets.ts`.
2. Add or update the product site entry in `src/constants/productDomains.ts` when the host serves a public `/sites/{productId}` website.
3. For private app-only hosts such as SignalDesk, add explicit middleware handling and reserve the subdomain in `src/constants/urls.ts` instead of adding a fake public site.
4. Confirm product-site hosts appear in `ALL_PRODUCT_DOMAINS`, or private app hosts bypass tenant/custom-domain routing through their dedicated middleware branch.
5. Add the domain to the Vercel project and point DNS to Vercel.
6. Do not add product hosts through owner custom-domain flows.

---

## Testing Guide

| Test                              | Expected                                             |
| --------------------------------- | ---------------------------------------------------- |
| Create new project "Food Menu"    | slug = "food-menu" stored in summary                 |
| Create project "Reviews"          | slug = "reviews-menu" (reserved, auto-suffixed)      |
| Rename "Food Menu" → "Lunch Menu" | slug = "lunch-menu", previousSlugs = ["food-menu"]   |
| Visit `/food-menu` after rename   | 301 redirect to `/lunch-menu`                        |
| Visit non-existent slug           | Falls back to default project or "Menu Not Found"    |
| Create outlet "Pune Store"        | outletSlug = "pune-store" on store doc               |
| Create outlet "Menu"              | outletSlug = "menu-outlet" (reserved, auto-suffixed) |

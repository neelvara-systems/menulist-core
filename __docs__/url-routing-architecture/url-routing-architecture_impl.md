# URL Routing Architecture — Implementation Guide

> **Audience:** Developers
> **Last Updated:** July 2, 2026
> **Version:** 2.1
> **Status:** Slug, canonical, product-domain, and path-segment guardrails implemented
> **ADRs:** See [url-routing-architecture_adr.md](./url-routing-architecture_adr.md) for all architecture decisions
> **Local Source Gate:** `npm run verify:url-routing-boundary`

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
                    │  4. Rewrite /client    │
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
	                    │  client/[[...slug]]    │
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

`src/lib/multiTenant/getTenantFromHeaders.ts` derives public menu, OBP, compliance, sitemap, robots, and PWA handoff tenant identity only from the validated original `Host` authority. `src/middleware.ts` deletes incoming `x-tenant-*` and hosted-help routing headers, then forwards middleware-owned values on the rewritten request. Tenant headers are checked as integrity claims but never override Host; `x-forwarded-host`, deployment aliases, and environment fallbacks are not accepted as tenant selectors. If Host is missing or malformed, the helper logs bounded presence context through `secureError()` and fails closed without emitting raw request header values. `src/lib/multiTenant/domainLookup.ts` follows the same bounded logging rule for Firestore lookup failures.

Middleware also owns `x-product-id`, `x-product-name`, and `x-product-base-path`. `getSanitizedRoutingRequestHeaders()` removes tenant, hosted-help, and product routing headers before every internal rewrite or pass-through. Product branches then add only the product metadata derived from the active Host/path contract. This prevents direct request headers from changing MenuList/MyCodex aliases, Answerlattice/CampaignCue base paths, SignalDesk path handling, or server loader branding.

July 28 persisted-scope correction: brand-subdomain admission and admin rename transaction reads require every supplied canonical/legacy tenant alias on `stores/{storeId}` to represent the same exact positive identifier. A row with conflicting `tenantId` and `tId` fails before claim or redirect writes, even if one alias matches the authenticated tenant. The Firestore emulator covers this transaction-current failure path.

`src/app/client/sitemap.ts` keeps tenant sitemap lookup failures fail-closed and bounded. Master-store lookup failure logs `tenant_sitemap_master_store_lookup_failed` and returns an empty sitemap; outlet lookup failure logs `tenant_sitemap_outlets_lookup_failed` and omits outlet entries; project lookup failure logs `tenant_sitemap_projects_lookup_failed` and omits project entries. The diagnostic guard caps unique failure shapes and logs only presence/length metadata plus fallback-policy labels, never raw tenant hosts, custom domains, IDs, slugs, generated sitemap URLs, or exception text.

The current internal tenant route namespace is `/client`, backed by `src/app/client/[[...slug]]/page.tsx`. Retired route wording is kept only in archived review history, not active implementation guidance.

safe outlet path segments are enforced at public-output time through `src/lib/publicRouting/pathSegments.ts`. Brand OBP location cards, outlet OBP breadcrumbs/menu prefixes, client menu outlet lookup/canonical redirects, and `src/app/client/sitemap.ts` sitemap outlet entries must call `normalizePublicOutletSlug()` before emitting or resolving an outlet path segment. Invalid, reserved, oversized, slash/dot/query/encoded, or malformed legacy `outletSlug` values are ignored instead of being emitted as public links, redirects, canonical URLs, or sitemap URLs. Source gate: `npm run verify:url-routing-boundary`.

Outlet slugs reserve `menu` even though project slugs intentionally do not. A project may own `/menu` under R5 Layer 1, but an outlet cannot own `/menu` because outlet resolution happens at the same first path segment and would intercept the universal menu alias.

safe project path segments are enforced at public-output time through `src/lib/publicRouting/pathSegments.ts`. Client menu project lookup, previous-slug redirects, canonical menu URLs, metadata lookup, `src/app/client/sitemap.ts` project entries, and OBP menu CTA project links must call `normalizePublicProjectSlug()` before comparing or emitting a project path segment. Invalid, reserved, oversized, slash/dot/query/encoded, or malformed legacy `project.slug` and `previousSlugs[]` values are treated as unavailable instead of being emitted as public links, redirects, canonical URLs, metadata URLs, or sitemap URLs. Project slug `menu` remains allowed by design for R5 Layer 1; reserved project slugs such as `screen` remain hidden/skipped. Source gate: `npm run verify:url-routing-boundary`.

The public language parameter parse fallback lives in `src/lib/localization/publicRenderLanguage.ts`. `appendPublicLanguageParam()` still appends normalized `?lang=xx` values for valid relative and absolute public URLs, preserving query strings and fragments. If URL parsing fails, it logs bounded `public_language_param_url_parse_failed` diagnostics with URL/language presence-length metadata, relative/query/hash shape, and fixed `return_original_url` fallback policy, then returns the original URL unchanged instead of appending `lang` by raw string concatenation. Source gate: `npm run verify:url-routing-boundary`.

Owner-side domain setup browser calls use `AUTH_BROWSER_REQUEST_POLICY` from `src/lib/auth/browserRequestPolicy.ts` for desktop Domain Settings, embedded Custom Domain, and Mobile Domain Settings `/api/domain` and `/api/subdomain/check` calls. The shared policy pins no-store cache, same-origin credentials, and manual redirect handling before the existing bounded response parsers and acknowledgement checks run.

The active desktop and mobile Domain Settings surfaces are keyed by exact tenant/store identity. A store switch destroys prior subdomain/custom-domain drafts and provider/DNS status before the new store renders. Status and availability reads use latest-request ownership, mutation completions require the originating component scope to remain current, and every parent/context merge rechecks both expected tenant and store. An already-authorized old-store server operation may finish, but its response cannot replace the current store model or show stale routing truth.

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

### New Files (Slug + Canonical Milestones)

| File                                                                | Purpose                                                   |
| ------------------------------------------------------------------- | --------------------------------------------------------- |
| `src/constants/reservedSlugs.ts`                                    | Reserved slug/subdomain namespace constants + validators  |
| `src/app/api/subdomain/check/route.ts`                              | Subdomain availability checker API (GET)                  |
| `src/app/api/domain/route.ts`                                       | Server-owned custom-domain availability plus Vercel add/status/remove |
| `src/lib/routing/customDomainClaim.ts`                              | Deterministic custom-domain claim, request reservation, release lease, and legacy collision boundary |
| `src/lib/publicTruth/entityEligibility.ts`                          | Shared inactive/deleted/platform-block eligibility used by canonical public and owner-domain checks |
| `src/lib/auth/browserRequestPolicy.ts`                              | Shared authenticated browser request policy for owner domain setup calls |
| `src/database/stores/index.tsx`                                    | Owner custom-domain advisory client delegates to `/api/domain?candidate=`; no browser cross-store query |
| `src/lib/domains/vercelDomains.ts`                                  | Shared Vercel domain add/check/remove helper used by MenuList and Answerlattice hosted help |
| `src/lib/domains/vercelDnsRecords.ts`                               | Pure provider-response mapper for apex A, project-specific CNAME, and verification challenge rows |
| `src/components/.../businessSettings/tabs/SubdomainTab.tsx`         | Subdomain settings UI tab                                 |
| `src/components/.../businessSettings/tabs/CustomDomainTab.tsx`      | Custom domain UI with DNS verification flow               |
| `src/components/mobile/screens/MobileDomainSettingsScreen.tsx`      | Active combined mobile domain/subdomain UI with normalized, copyable DNS verification rows, bounded subdomain-check response parsing, and acknowledged subdomain store saves |
| `src/app/client/obp/BrandOBPContent.tsx`                             | Multi-store brand OBP (store selector)                    |
| `scripts/backfill-project-slugs.ts`                                 | Migration: backfill slugs on existing projects            |
| `__docs__/url-routing-architecture/url-routing-architecture_adr.md` | All architecture decision records (ADR-1 through ADR-11)  |

### Modified Files (Slug + Canonical Milestones)

| File                                                   | Change                                                                     |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| `src/components/.../projects/types/project.types.ts`   | Added `slug`, `previousSlugs`, `slugLockedAt` to types                     |
| `src/types/platform/store.ts`                          | Added `outletSlug` + `subdomain` to `MinimalStoreDataType`                 |
| `src/database/projects/index.ts`                       | `addProject` slug gen, `updateProjectMetadata` slug change + previousSlugs |
| `src/app/api/outlets/create/route.ts`                  | `outletSlug` generation on outlet creation                                 |
| `src/app/client/[[...slug]]/page.tsx`                  | Stored slug resolver, previousSlugs 301, subdomain→custom domain 301       |
| `src/config/features.ts`                               | Added `ENABLE_STORED_SLUGS` feature flag                                   |
| `src/middleware.ts`                                    | CDN cache headers, lowercase + trailing slash normalization                |
| `src/app/api/onboarding/create-subscription/route.ts`  | Auto-generate subdomain, `subDomain` on tenant, `subdomain` in storesList  |
| `src/app/api/msg-preview/[sessionId]/approve/route.ts` | **BUG FIX**: Added subdomain, slug, projectsSummary, fixed publicUrl       |
| `src/app/client/obp/OBPContent.tsx`                    | Multi-store brand detection → BrandOBP                                     |
| `src/components/.../businessSettings/index.tsx`        | Integrated SubdomainTab + CustomDomainTab into tab list                    |
| `src/components/.../businessSettings/tabs/index.ts`    | Added SubdomainTab + CustomDomainTab exports                               |

---

## Key Implementation Details

### 0. Custom-Domain Transaction and Provider State Machine

`POST /api/domain` normalizes the session tenant/store IDs, rate-limits, bounds the body, and transactionally reads the canonical tenant, store, deterministic claim, and bounded legacy `stores.customDomain` query before provider work. Every add attempt receives a UUID reservation ID. Another same-store or cross-store request cannot replace an active reservation or `releasing` lease; finalization must present the same reservation ID. Provider add `409` is accepted only when the pre-reservation state proves MenuList provenance and `GET /v9/projects/{projectId}/domains/{domain}` proves the hostname belongs to the configured Vercel project.

Finalization rechecks authorization, store/tenant lifecycle and identity, exact reservation ownership, and the prior hostname. Replacement writes the new store mapping/current claim and the old claim's bounded `releasing` lease atomically. Provider removal runs after that lock; a successful/404 removal is followed by `released`. Failed or ambiguous removal keeps the release lease until its 15-minute expiry, preventing a late cleanup from racing a new claimant while still permitting bounded recovery.

`GET /api/domain` performs a claim-aware transaction before the Vercel reads and another exact-domain transaction before any verification write. It sets verification only when `/v6/domains/{domain}/config` is explicitly configured and `/v9/projects/{projectId}/domains/{domain}` confirms assignment to the configured project. Explicit DNS misconfiguration or project `404` removes verification; transport, non-404 provider, unknown-shape, body-timeout, and body-parse failures preserve last confirmed state and return `providerStatusPending`. The provider abort deadline remains active through bounded body consumption, and a malformed HTTP-200 body becomes a gateway failure rather than `{ ok: true, data: {} }`. `DELETE /api/domain` locks a valid unique mapping as `releasing`, removes the store routing fields, invalidates public cache, removes the provider binding, then releases the claim. Duplicate rows, mismatched claim owners, or active incompatible claim states return `409` without mutating a store. Malformed legacy values are cleared locally but are never sent to the provider.

Public store lookup remains store-payload driven but is no longer store-only for eligibility: on a cache miss it validates exact store document identity, exact tenant reference, tenant existence, and inactive/deleted/platform-blocked state before returning the store object. Tenant fields are eligibility-only and never enter the public DTO.

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
- If the recently deleted slug reservation lookup fails, creation and duplication treat the slug as reserved and append a unique suffix instead of risking reuse of an unavailable public URL.

### 2. Slug Change on Rename (updateProjectMetadata)

**File:** `src/database/projects/index.ts:396-412`

When project name changes:

1. Generate new slug from new name
2. Push old slug to `previousSlugs[]`
3. Both stored in summary

Deleted-project slug reservation fail-closed follow-up (July 5, 2026): `src/database/projects/index.ts` treats unknown reservation state as reserved after logging bounded `deleted_project_slug_reservation_check_failed` diagnostics. Create and duplicate flows suffix the proposed slug when the reservation lookup fails. Rename and no-slug backfill flows refuse the new slug through the same path used for a confirmed 90-day reservation, preserving QR/public URL permanence over optimistic slug reuse.

### 3. Client Resolver (getProjectBySlugOrDefault)

**File:** `src/app/client/[[...slug]]/page.tsx:196-220`

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

The shared Vercel helper keeps the provider target fixed at `https://api.vercel.com`, URL-encodes every dynamic provider path segment (`VERCEL_PROJECT_ID`, custom domain, hosted-help domain) before add, status, or removal calls, uses manual redirect handling plus a provider timeout for provider requests, clears the abort timer after each request, and reads provider responses through a 64KB bounded JSON parser. Request bodies keep the normalized domain string expected by Vercel.

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
| Domain session IDs guarded     | ✅     | `/api/domain` validates session tenant/store IDs with the shared Firestore document-ID guard before permission checks, limiter keys, store refs, Vercel-flow diagnostics, and public cache invalidation |
| Domain mutation body bounded   | ✅     | `/api/domain` rejects bodies above 4KB before validation or Vercel provider calls |
| Domain management limiter      | ✅     | `/api/domain` hashes owner/store key material before storing the domain-management rate-limit key; provider outage returns retryable `503` before Vercel or Firestore work, while quota exhaustion remains `429` |
| Custom-domain advisory check   | ✅     | `/api/domain?candidate=` uses `DATA_READ`, canonical scope/permission, reserved product roots, deterministic claim, and bounded legacy collision reads; POST repeats authority |
| Subdomain check limiter        | ✅     | `/api/subdomain/check` hashes owner/tenant/store key material before storing the availability-check rate-limit key |
| Desktop subdomain check parse  | ✅     | Desktop Domain Settings caps `/api/subdomain/check` response parsing at 8KB and requires a boolean `available` field before applying availability state |
| Desktop custom-domain ack      | ✅     | Desktop Domain Settings and Custom Domain add/status/remove parse `/api/domain` responses through bounded 32KB readers and require the expected acknowledged response before local domain state changes. Remove requires `success: true` plus `removed: true`. |
| Mobile domain remove state     | ✅     | Mobile Domain Settings only clears local domain state after a successful `/api/domain` delete response with `{ success: true, removed: true }` |
| Verification downgrade parity  | ✅     | Desktop/mobile prefer an explicit server boolean over stale local `domainVerified`; provider `false` clears the verified badge and state |
| Derived-effect owner copy      | ✅     | Add/remove pending cleanup or refresh flags show bounded background follow-up copy without reverting committed local state |
| Browser request boundary       | ✅     | Desktop and mobile Domain Settings call `/api/domain` and `/api/subdomain/check` with same-origin credentials, no-store cache policy, and manual redirect handling before response parsing |
| Reserved slug validation       | ✅     | Blocked at project creation/rename/onboarding         |
| No user-provided slugs exposed | ✅     | Auto-generated from name via `slugify()`              |
| XSS prevention                 | ✅     | `slugify()` strips all non-alphanumeric chars         |
| Redirect loop prevention       | ✅     | Only redirects if `redirectSlug !== slug`             |
| Domain ownership validation    | ✅     | Vercel handles DNS verification + SSL                 |
| Custom-domain claim isolation  | ✅     | Deterministic claim plus UUID reservation prevents same-store and cross-store overlapping provider work |
| Provider conflict ownership    | ✅     | Vercel `409` requires MenuList provenance plus current-project domain confirmation |
| Replace/remove cleanup order   | ✅     | Old claim is `releasing` before provider deletion and `released` only after the awaited provider result |
| Duplicate legacy hostname      | ✅     | Duplicate/mismatched valid mappings return `409` without clearing one row or selecting a public winner |
| Verification TOCTOU            | ✅     | Exact domain, tenant/store lifecycle, permission, and claim are rechecked transactionally after provider status |
| DNS setup display              | ✅     | Desktop and mobile Domain Settings render Vercel verification/configured records as copyable rows, not raw provider JSON |
| DNS record source truth        | ✅     | Shared helper selects Vercel preferred `recommendedIPv4` for apex or project-specific `recommendedCNAME` for subdomains; missing guidance produces no invented fallback |
| Domain browser handoffs        | ✅     | Desktop and mobile copy/open/DNS-copy failures log bounded URL/DNS metadata only |
| Mobile rejected domain reads   | ✅     | Mobile Domain Settings keeps current status/availability state on rejected `/api/domain` and `/api/subdomain/check` reads; malformed subdomain-check responses log bounded parse/shape diagnostics before fixed failure copy |
| Mobile subdomain save ack      | ✅     | Mobile Domain Settings requires `updateStore()` acknowledgement before local public URL state or saved copy changes |
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
| Neelvara | `localhost:3000/__neelvara` | `neelvara.menulist.online` | `neelvara.com`, `www.neelvara.com` | Static parent/entity trust website |
| Answerlattice | `localhost:3000/__answerlattice`  | `answerlattice.menulist.online`, `www.answerlattice.menulist.online`           | `answerlattice.com`, `www.answerlattice.com`         | Answerlattice website and product routes          |
| CampaignCue | `localhost:3000/__campaigncue` | `campaigncue.menulist.online` | `campaigncue.ai`, `www.campaigncue.ai` | CampaignCue website and workspace routes |
| MyCodex  | `localhost:3000/__mycodex`   | `menulist.digital`, `www.menulist.digital` | `menulist.digital`, `www.menulist.digital` | Internal documentation reader on Vercel      |
| SignalDesk | `localhost:3000/signaldesk` | `signaldesk.menulist.online` | `signaldesk.menulist.ai` | Private MenuList marketing and distribution app |

Source of truth: `src/constants/deploymentTargets.ts`.

Neelvara is deliberately a product-domain site route, not a MenuList tenant/custom domain and not a database-backed product. It rewrites to `/sites/neelvara`, has no owner/product app route, and uses an empty Firebase project id in `src/constants/deploymentTargets.ts`.

Internal portfolio aliases `/nv`, `/ml`, `/al`, and `/cc` are guarded by `src/middleware.ts` and only resolve on the MyCodex product host or already-resolved MyCodex requests. They do not change product slugs, env names, Firebase targets, or public canonical URLs. `/nv` is only a shortcut to the Neelvara public site route group.

SignalDesk also has a MyCodex-host app alias: `/sd`. `https://menulist.digital/sd` rewrites to `/signaldesk`, `/sd/targets` rewrites to `/signaldesk/targets`, and `/sd/signin` rewrites to the shared sign-in page so the callback can return to `/sd`. This alias is for private testing/operation only and does not make SignalDesk a public `/sites` product.

`menulist.digital` is deliberately a product domain, not a MenuList tenant/custom domain. Middleware must rewrite it to `/sites/mycodex` before the client-domain branch can treat unknown hosts as restaurant custom domains.

MyCodex is an internal documentation reader. It reserves `MC` as its internal product code, but runtime routing and session checks use the `mycodex` slug. Outside localhost, `src/middleware.ts` requires a signed MyCodex session cookie before rewriting protected pages to `/sites/mycodex`. Unauthenticated MyCodex requests redirect to `/login`, where `src/app/sites/mycodex/api/session/route.ts` validates `MYCODEX_BASIC_AUTH_USER` and `MYCODEX_BASIC_AUTH_PASSWORD` server-side and sets an `HttpOnly` `mycodex_session` cookie. MyCodex responses also set no-index/no-follow robot headers and serve a product-scoped disallow-all `robots.txt`; these crawler restrictions are scoped to MyCodex and do not change MenuList tenant/menu SEO or Answerlattice public-site discovery.

MyCodex PWA assets are scoped to the MyCodex product host. `src/app/sites/mycodex/layout.tsx` points to `/mycodex.webmanifest`, `/mycodex-logo.svg`, MyCodex PNG icons, and Apple startup images under `/mycodex-splash/`. Its inline pre-paint theme script reads browser-local theme preference only; if storage or media-query access is blocked, it removes the `dark` class and falls back to light mode without adding runtime storage, network logging, Firebase, or document reads. `src/components/ServiceWorkerRegister.tsx` registers `/mycodex-sw.js` only when `resolveDomain()` returns the `mycodex` product host. The worker is a private-docs offline shell: it caches `/offline` plus static MyCodex logo assets only, and does not cache markdown, `__docs__` pages, or document HTML.

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
| Preview     | `https://menulist.online`        |

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

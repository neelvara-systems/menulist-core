# URL Routing Architecture

> **Feature:** Core URL Handling & Public Routing Infrastructure
> **Status:** 🔒 **LOCKED** — Slug, canonical, product-domain, and path-segment guardrails implemented
> **Date:** July 2, 2026
> **Author:** Cascade (Lead Architect)
> **Feature Flags:** `ENABLE_STORED_SLUGS` (ON), `ENABLE_MULTI_OUTLET` (ON), `ENABLE_OBP` (OFF), `ENABLE_MYCODEX_READER` (ON)
> **ADRs:** 12 decisions documented — see [url-routing-architecture_adr.md](./url-routing-architecture_adr.md)
> **Codebase = Single Source of Truth**
> **Local Source Gate:** `npm run verify:url-routing-boundary`

---

## Quick Navigation

| Audience   | Document                                                         | Purpose                              |
| ---------- | ---------------------------------------------------------------- | ------------------------------------ |
| CEO / PM   | [Spec](./url-routing-architecture_spec.md)                       | Business requirements & scope        |
| Developers | [Impl](./url-routing-architecture_impl.md)                       | Technical blueprint & file paths     |
| Developers | [ADRs](./url-routing-architecture_adr.md)                        | **All architecture decisions + WHY** |
| Cost       | [Firebase](./url-routing-architecture_firebase.md)               | Reads/writes/cost impact             |
| Mobile     | [Mobile Support](./url-routing-architecture_mobile-support.md)   | Infrastructure — no mobile UI        |
| CEO / PM   | [Executive Summary](#executive-summary)                          | What and why                         |
| Developers | [Current Architecture](#current-architecture-as-is)              | What exists today                    |
| Developers | [Implementation Plan](#implementation-plan)                      | Implemented source plan and file paths |
| Developers | [File Changes](#file-changes-inventory)                          | Exact files created/modified         |
| Archive    | [ChatGPT Review](./_archive/chatgpt-review.md)                   | Full cross-check                     |
| Archive    | [Architecture Validation](./_archive/architecture-validation.md) | Brand-level vs store-level audit     |

---

## Executive Summary

### What This IS

Core URL routing infrastructure for MenuList's public pages:

- **Product-domain separation** (`menulist.ai` = MenuList, `neelvara.com` = Neelvara, `answerlattice.com` = Answerlattice, `campaigncue.ai` = CampaignCue, `menulist.digital` = MyCodex)
- **Product site vs product app separation** (`src/app/sites/[productId]` is public website only; owner/product dashboards live in product route groups such as `src/app/(answerlattice)/answerlattice` or `src/app/(campaigncue)/campaigncue`)
- **Brand-level subdomain ownership** (subdomain = brand, not individual location)
- **Multi-store location routing** (`brand.menulist.ai/pune/menu`)
- **safe outlet path segments** for brand OBP location cards, outlet OBP links, sitemap outlet entries, and outlet canonical redirects
- **safe project path segments** for menu lookup, sitemap project URLs, old-slug redirects, canonical menu URLs, and OBP menu CTA links
- **public language parameter parse fallback** that preserves valid `?lang=` links but returns the original URL unchanged if URL parsing fails
- **Permanent project slugs** (stored, not derived from names)
- **Old slug → 301 redirects** (QR codes never break)
- **Reserved slug namespace** (prevent future conflicts)
- **CDN cache headers** (performance win)
- **Canonical URL normalization** (SEO improvements)

### What This IS NOT

- ❌ NOT new Firestore collections for routing (no routingIndex, no publicStores)
- ❌ NOT pre-assembled render bundles
- ❌ NOT a public data API

### Origin Story

ChatGPT proposed brand-level subdomain routing. Initial codebase review (22-point cross-check in `_archive/chatgpt-review.md`) rejected this because current code has `subdomain` on `StoreDataType`. However, deeper validation (`_archive/architecture-validation.md`) revealed:

1. **The store-level subdomain was accidental** — no explicit ADR exists, it evolved for single-store tenants before multi-outlet was built
2. **The subdomain feature is unshipped** — no auto-assignment during onboarding, no UI for owners, manually set by admins only
3. **Industry standard is brand-level** — GloriaFood, Wix, Square, Toast all use brand domain + location paths
4. **SEO best practice is brand-level** — per-location subdomains dilute domain authority
5. **ChatGPT was right about brand-level routing** — we over-aggressively rejected it

**Correction:** Subdomain ownership is now brand-level (on master store). Zero migration risk because the feature is unshipped.

---

## Current Architecture (AS-IS)

### Entity Hierarchy

```
Tenant (account container — billing, stores list)
  └── Store (rendering source — identity, settings, domain)
       └── Project (menu data — items, categories, prices)
```

**Critical fact:** The store remains the only entity whose fields are rendered as public business truth. On a cold cached lookup, the resolver also reads the referenced canonical tenant document for lifecycle/block eligibility and exact identity; tenant fields are never merged into or exposed by the public store payload.

### Durable Subdomain Claim Boundary

Subdomain ownership is serialized through `platformSummary/subdomainClaim_{subdomain}` by `src/lib/routing/subdomainClaim.ts`. Onboarding, owner assignment, and platform rename read the claim plus the canonical `stores.subdomain` and active `previousSubdomainSlugs` compatibility paths inside the same Firestore transaction that writes the canonical store and claim. A claim held by another store, any other canonical owner, an active redirect-history owner, or a saturated 20-row history lookup fails closed.

`GET /api/subdomain/check` is advisory and performs the same reservation reads in a read-only transaction after authentication, permission, normalization, and rate limiting. `POST /api/subdomain/check` owns the durable owner assignment. Platform rename writes the new current claim and converts the prior claim into a 12-month redirect claim in the same transaction as the store, summary, and audit updates. The compatibility queries remain necessary while historical stores without claim documents can exist; they are not separate preflight authority and cannot race the claim write.

After owner assignment or platform rename commits, menu/store/client-store/screen cache work, the Digital Screens version touch, and Owner Business Assistant invalidation run through the shared all-settled store public-truth boundary. A derived failure is logged and acknowledged as pending without returning a false rename failure. Platform security logs record pending/count state rather than claiming every derived effect succeeded.

Brand subdomain master-store admission is enforced inside both authenticated GET and POST transactions by `src/lib/routing/subdomainOwnerScope.ts`. An explicit `isMaster: true` store may check or assign the brand host; an explicit outlet (`isMaster: false`) is denied and continues to use the brand host plus its `outletSlug` path. A legacy store without an `isMaster` marker remains compatible only when bounded canonical `tenantId`/`tId` queries prove it is the tenant's sole store. Any sibling or ambiguous legacy topology fails closed and must be corrected through the main-location record rather than granting an outlet a second brand host.

### Durable Custom-Domain Claim Boundary

MenuList custom-domain ownership is serialized through `platformSummary/customDomainClaim_{domain}` by `src/lib/routing/customDomainClaim.ts`. `POST /api/domain` reserves a normalized domain with a request-unique reservation ID in the same transaction that rechecks the current session tenant/store lifecycle and `MANAGE_PUBLIC_PRESENCE`. Active reservations and release leases block every competing request, including another request from the same store; only the same reservation ID can finalize. Each lease expires after 15 minutes so an interrupted cleanup does not strand the hostname forever.

Custom-domain admission also rejects every current, preview, production, private-service, and declared future product root, plus every hostname below those roots. Tenant requests therefore cannot claim `menulist.ai`, tenant/service-style hosts under MenuList roots, Answerlattice/CampaignCue/Neelvara/MyCodex/SignalDesk hosts, or reserved future product namespaces. This source-of-truth refusal runs before Firestore reservation or Vercel provider work; provider conflict behavior is never the product-separation guard.

The provider call occurs only after reservation. A Vercel `409` is not accepted by itself: the route requires MenuList claim/store provenance and confirms the domain is already attached to the configured Vercel project. Replacement and removal write the old claim as `releasing` before provider deletion, await the provider result, and only then mark it `released`. This prevents delayed cleanup from deleting a newly claimed provider binding. Missing legacy claims are locked before cleanup; duplicate rows, mismatched claim owners, and in-progress legacy states return `409` without selecting a winner. A malformed legacy hostname can be removed from the current store, but provider cleanup is skipped and reported because an invalid hostname cannot be sent safely to Vercel.

`GET /api/domain` rechecks current tenant/store identity and claim ownership before and after the provider read. When compact and legacy identity aliases coexist (`storeId`/`sId`, `tenantId`/`tId`), every present value must normalize to the same exact positive document ID; conflicting legacy aliases fail closed. Verification becomes true only when Vercel reports both explicit DNS configuration and membership in MenuList's configured project; explicit DNS misconfiguration or project absence clears verification, while infrastructure errors preserve the last stored state. The 10-second provider deadline covers headers and bounded response-body parsing, and an aborted or malformed success body is not accepted as provider truth. Every committed add, verification transition, or removal attempts public cache invalidation. Responses report `providerStatusPending`, `refreshPending`, `providerCleanupPending`, or `claimReleasePending` when authoritative state committed but a provider or derived effect still needs recovery.

The advisory custom-domain check is also server-owned: `GET /api/domain?candidate={domain}` applies the cheap `DATA_READ` limiter, validates reserved product roots, rechecks canonical tenant/store permission and lifecycle, and reads the same deterministic claim plus bounded legacy collision query as POST. Desktop and mobile no longer query the cross-tenant `stores` collection directly. POST remains authoritative because availability can change after any advisory response. The advisory and provider-management limiters fail closed with retryable `503` responses when their limiter provider is unavailable; ordinary quota exhaustion remains `429`.

Desktop and mobile treat a returned boolean verification state as newer than locally cached store state. An explicit provider `verified: false` therefore clears the local verified badge instead of being masked by an older `domainVerified: true`. Add/remove responses still require their acknowledgement fields, and committed responses with `refreshPending`, `providerCleanupPending`, or `claimReleasePending` show fixed background-refresh/cleanup copy rather than a false all-done state.

DNS instructions come only from current Vercel provider data. `src/lib/domains/vercelDnsRecords.ts` uses project-domain `apexName` plus configuration `recommendedIPv4` / `recommendedCNAME` and verification challenges: apex domains show the preferred A value, subdomains show the project-specific preferred CNAME, and ownership challenges retain their provider name/value. The owner screens never invent the retired generic `cname.vercel-dns.com` fallback; missing or ambiguous guidance shows a retry message.

### Current URL Flow

#### Product / Platform Domain Gate

Requests are classified before tenant routing:

1. `src/constants/deploymentTargets.ts` defines the active domains for MenuList, Neelvara, Answerlattice, CampaignCue, MyCodex, and private SignalDesk app hosts by deployment stage.
2. `src/constants/productDomains.ts` registers enabled product sites and maps product hosts to `/sites/{productId}` route groups.
3. `src/lib/multiTenant/domainResolver.ts` checks `resolveProductSiteByHostname()` before treating a host as a platform, subdomain, or custom tenant domain.
4. `src/middleware.ts` rewrites product domains directly to their product route group and never sends them through `/client`.
5. Dedicated SignalDesk hosts are private app hosts and rewrite to `/signaldesk`, not `/sites/signaldesk` and not `/client`.
6. MyCodex product routes require the MyCodex login/session cookie outside localhost so internal docs are not publicly readable.

| Host                                    | Classification | Rewrite / Behavior                 |
| --------------------------------------- | -------------- | ---------------------------------- |
| `menulist.ai` / `www.menulist.ai` | Platform | MenuList website / platform routes |
| `neelvara.com` / `www.neelvara.com` | Product | Public site: `/sites/neelvara` |
| `answerlattice.com` / `www.answerlattice.com` | Product | Public site: `/sites/answerlattice`; app routes: `/answerlattice/*` |
| `campaigncue.ai` / `www.campaigncue.ai` | Product | Public site: `/sites/campaigncue`; owner app: `/campaigncue/app` |
| `menulist.digital` / `www.menulist.digital` | Product | `/sites/mycodex` |
| `signaldesk.menulist.ai` / `signaldesk.menulist.online` | Private app host | `/signaldesk` |
| `brand.menulist.ai` | Tenant | `/client` |
| Verified restaurant custom domain | Tenant | `/client` |

`menulist.digital` is reserved for the internal MyCodex documentation reader. It must stay in the product-domain registry so it is not mistaken for a restaurant custom domain.

MyCodex Vercel access uses a first-party login page backed by server-side credentials:

- `MYCODEX_BASIC_AUTH_USER`
- `MYCODEX_BASIC_AUTH_PASSWORD`

The browser receives only a signed `HttpOnly` `mycodex_session` cookie after login. Raw credentials are not stored in `localStorage` or exposed to client code.

MyCodex also stays out of public discovery: MyCodex responses send `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate`, its layout metadata is no-index/no-follow, and its product-scoped `robots.txt` disallows all crawlers. These restrictions are applied only to MyCodex routes/domains and must not be reused for MenuList tenant menus or Answerlattice public surfaces.

MyCodex PWA install identity is also product-scoped. `src/app/sites/mycodex/layout.tsx` links `/mycodex.webmanifest`, MyCodex-specific icons, and MyCodex Apple launch images. `src/components/ServiceWorkerRegister.tsx` registers `/mycodex-sw.js` only when the resolved product host is `mycodex`; the worker caches only the offline fallback and MyCodex static logo assets, never repository documentation content.

Because MyCodex reads markdown from `__docs__` at runtime, `next.config.js` must include `./__docs__/**/*` in `experimental.outputFileTracingIncludes` for `/sites/mycodex` routes. This keeps Vercel serverless packaging aligned with local filesystem behavior without exposing docs through MenuList or Answerlattice routing.

Localhost `/__mycodex` remains open for development.

Internal portfolio aliases `/nv`, `/ml`, `/al`, and `/cc` are only enabled on the MyCodex product host or an already-resolved MyCodex request. They are convenience path aliases for private portfolio navigation, not public canonical product URLs, tenant paths, Firebase targets, or product-code aliases. `/nv` maps to the Neelvara public site route group.

SignalDesk uses the app-only MyCodex-host alias `/sd`. `https://menulist.digital/sd` rewrites to the private `/signaldesk` app, and SignalDesk navigation preserves `/sd/*` while serving through that host. `/sd/app` is accepted as a compatibility alias for people expecting the CampaignCue-style app suffix, but it still rewrites to the same private SignalDesk app and normalizes navigation to `/sd/*`. `/sd/signin` rewrites to the shared sign-in page so the callback can return to `/sd`.

#### Product Site Vs Product App Routes

`src/app/sites/[productId]` is public website only. It is the place for unauthenticated product marketing pages, public resources, robots output, sitemap output, legal pages, and other discovery surfaces.

Authenticated owner dashboards, product workspaces, admin tools, and paid/runtime app screens must live in their product route group outside `sites/`. Current route-group examples:

| Product | Public site folder | Owner/product app folder | Product-domain mapping |
| --- | --- | --- | --- |
| Neelvara | `src/app/sites/neelvara` | None | Static entity/trust site only; no product app route. MyCodex-only alias: `/nv`. |
| Answerlattice | `src/app/sites/answerlattice` | `src/app/(answerlattice)/answerlattice` | Dashboard roots rewrite to `/answerlattice/*`. |
| CampaignCue | `src/app/sites/campaigncue` | `src/app/(campaigncue)/campaigncue` | `/app` rewrites to `/campaigncue/app`; local `/__campaigncue/app` also rewrites to `/campaigncue/app`. |
| SignalDesk | None | `src/app/(signaldesk)/signaldesk` | Local `/signaldesk`; dedicated hosts rewrite to `/signaldesk/*`; MyCodex-host aliases `/sd` and `/sd/app` rewrite to `/signaldesk/*`. |

This separation keeps public SEO/discovery surfaces away from authenticated owner runtime code, keeps product files easy to inventory, and prevents future products from hiding dashboards below `sites/`.

#### Tenant Route Flow

```
Customer opens: storypizza.menulist.ai/pune/menu
                                │
                    ┌───────────┴───────────┐
                    │     MIDDLEWARE          │
                    │  src/middleware.ts      │
                    │                        │
                    │  1. resolveDomain()    │
                    │     → type: subdomain  │
                    │     → subdomain: "storypizza" │
                    │  2. Set headers        │
                    │  3. Rewrite to /client  │
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │  client/[[...slug]]    │
                    │  page.tsx              │
                    │                        │
                    │  1. Read headers       │
                    │  2. getStoreBySubdomain│
                    │     ("storypizza")      │
                    │     → storeData        │
                    │  3. getOutletBySlug    │
                    │     ("pune")            │
                    │     → outletData       │
                    │  4. getProjectBySlug   │
                    │     (tId, sId, "menu") │
                    │     → matches slugify(name)  │
                    │  5. Render menu        │
                    └────────────────────────┘
```

Public client pages use `src/lib/multiTenant/getTenantFromHeaders.ts` to derive tenant identity from the original validated `Host` authority. Middleware deletes caller-supplied `x-tenant-*` values before forwarding its own request headers; those headers are integrity claims only and cannot override `Host`. `x-forwarded-host`, Vercel deployment hosts, and environment fallbacks are not tenant selectors. Missing or malformed Host diagnostics are bounded through secure logging and do not emit raw request header values. Domain lookup failure diagnostics in `src/lib/multiTenant/domainLookup.ts` are bounded the same way: lookup type and value length only, not raw subdomain/custom-domain values.

The same middleware-owned boundary applies to `x-product-id`, `x-product-name`, `x-product-base-path`, and Answerlattice hosted-help routing headers. Every rewrite and pass-through path removes caller values first; product/alias metadata is re-added only from the resolved Host/path branch. Server layouts may use those values for bounded base-path presentation, but a public request cannot choose a product or alias by supplying the header directly.

Tenant sitemap lookup failures in `src/app/client/sitemap.ts` keep the same public fallback behavior, but now log capped `tenant_sitemap_*_failed` diagnostics with fallback-policy labels. Master-store lookup failure returns an empty sitemap, outlet lookup failure omits outlet sitemap entries, and project lookup failure omits project sitemap entries. The diagnostic context includes only tenant/subdomain/custom-domain/store identifier presence and length metadata plus source error name, never raw hostnames, domains, store IDs, tenant IDs, project slugs, sitemap URLs, or exception text.

The public menu resolver at `src/app/client/[[...slug]]/page.tsx` follows the same logging rule for fallback paths. Multi-outlet linked-project failures and special-menu graceful degradation keep the existing public behavior, but diagnostics log only failure type, ID presence/length, and error name.

### Current URL Patterns

| URL                                | Behavior                     |
| ---------------------------------- | ---------------------------- |
| `joespizza.menulist.ai/`           | OBP (store identity page)    |
| `joespizza.menulist.ai/menu`       | Owner-claimed Menu project or explicit-default alias |
| `joespizza.menulist.ai/drinks-bar` | Project "Drinks Bar"         |
| `joespizza.com/`                   | Same via custom domain       |

#### Multi-Store Chain (5% of users)

| URL                                    | Behavior                         |
| -------------------------------------- | -------------------------------- |
| `storypizza.menulist.ai/`              | Brand OBP (location selector)    |
| `storypizza.menulist.ai/menu`          | Master store's default menu      |
| `storypizza.menulist.ai/pune`          | Pune outlet OBP                  |
| `storypizza.menulist.ai/pune/menu`     | Pune outlet's default menu       |
| `storypizza.menulist.ai/pune/bar-menu` | Pune outlet's "Bar Menu" project |
| `storypizza.com/`                      | Same via custom domain           |

### Current Caching Layers

| Layer                   | Implementation                            | TTL         |
| ----------------------- | ----------------------------------------- | ----------- |
| React `cache()`         | Within-request deduplication              | Per-request |
| Vercel `unstable_cache` | Cross-request Data Cache                  | 60 seconds  |
| `revalidateTag()`       | Instant invalidation on store/menu update | On-demand   |

Admin subdomain rename rate-limit and scope boundary: admin subdomain renames apply platform-only auth, the shared `ADMIN_SUBDOMAIN_RENAME_MUTATION` rate limit, strict tenant/store document-ID normalization, and an 8KB body cap before validation, store reads, collision reads, or public-routing writes. Successful renames update `platformSummary/storesSummary`, then revalidate `menu-store-{storeId}`, `store-{storeId}`, and `client-stores` after the transaction. This keeps old-subdomain redirect lookup, current-subdomain lookup, OBP/menu rendering, and internal store selectors aligned without owner-facing rename controls.

Owner subdomain availability checks (`GET /api/subdomain/check`) use session-scoped `MANAGE_PUBLIC_PRESENCE`, apply the cheap `DATA_READ` limiter before permission and store availability reads, and store only HMAC-hashed owner/tenant/store key material in the limiter key.

Mobile Domain Settings subdomain saves must require an explicit `updateStore()` acknowledgement before local public URL state or saved copy changes. A swallowed store-write fallback is treated as `mobile_domain_settings_subdomain_store_update_rejected` and routes through the fixed failure path.

Owner custom-domain management (`POST/GET/DELETE /api/domain`) uses session-scoped `MANAGE_PUBLIC_PRESENCE`, re-reads canonical tenant and store lifecycle/identity inside every claim or verification transaction, rejects mutation bodies above 4KB before Vercel/provider or store work, stores only HMAC-hashed owner/store key material in the domain-management rate limiter, fails closed before Vercel/Firestore work when that limiter provider is unavailable, logs bounded provider diagnostics, and revalidates public menu/OBP cache after committed domain state writes. Durable request-unique claims serialize provider coordination; duplicate or ambiguous legacy ownership fails closed.

Desktop Domain Settings, embedded Custom Domain, and Mobile Domain Settings browser calls to `/api/domain` and `/api/subdomain/check` use the shared authenticated browser request policy before bounded response parsing. This keeps owner domain setup uncached, same-origin, and manual-redirect across desktop/mobile surfaces without duplicating fetch policy blocks.

Desktop and mobile Domain Settings browser handoffs for subdomain/custom-domain copy, external open, and DNS-record copy log only bounded URL/DNS presence-length metadata on failure. They must not log raw domains, DNS record values, generated public URLs, or browser exception text.

Custom-domain removal acknowledgements must include both `success: true` and `removed: true` before desktop Domain Settings, embedded Custom Domain, or Mobile Domain Settings clear local custom-domain state. Missing `removed` is treated as an invalid remove response.

Owner-side browser update paths use `src/lib/cache/publicClientCache.ts` to request the same public menu/OBP/customer-app cache refresh after store, project, tenant, PWA, extraction, or outlet propagation changes. The helper de-duplicates in-flight requests per store, times out after 4 seconds, fails open, and uses dev-only bounded secure logging for revalidation failures instead of raw fetch exception logs.

### What's Already Well-Built

- ✅ Domain resolution (subdomain + custom domain)
- ✅ Product-domain resolution before tenant routing
- ✅ Multi-tenant middleware with security headers
- ✅ SSR with Suspense + streaming skeletons
- ✅ Timeout (5s) + retry (1x) for Firestore reads
- ✅ Schema.org JSON-LD (Restaurant, Menu, MenuItem, LocalBusiness, GeoCoordinates)
- ✅ OBP page (feature-flagged, built, flag OFF)
- ✅ OBP analytics (views, action clicks)
- ✅ Multiple menus per store with slug routing
- ✅ Custom domain support with DNS verification
- ✅ Canonical URL in metadata
- ✅ HTTPS enforcement
- ✅ Reserved subdomains (www, app, api, admin, etc.)

### Resolved Gaps (All Implemented — Feb 18-19, 2026)

| Gap                                       | Resolution                                                       | ADR           |
| ----------------------------------------- | ---------------------------------------------------------------- | ------------- |
| Brand-level subdomain model               | Subdomain on master store, auto-assigned at onboarding           | ADR-1, ADR-9  |
| No `outletSlug` on outlet stores          | Auto-generated from outlet name during creation                  | ADR-11        |
| Project slugs derived from name           | Stored in `projectsSummary` with `previousSlugs` for redirect    | ADR-3, ADR-10 |
| No old slug → redirect system             | `previousSlugs[]` → 301 redirect in client resolver              | ADR-3         |
| No reserved project slug namespace        | 52 entries in `reservedSlugs.ts` — project, outlet, subdomain    | ADR-4         |
| No subdomain auto-assignment              | Both onboarding flows auto-generate subdomain from business name | ADR-7, ADR-9  |
| No subdomain settings UI                  | `SubdomainTab.tsx` + `CustomDomainTab.tsx` in Business Settings  | ADR-5         |
| No CDN cache headers                      | `s-maxage=60, stale-while-revalidate=300` on all client pages    | ADR-8         |
| No subdomain→custom domain redirect       | Page-level 301 redirect when store has verified custom domain    | ADR-5         |
| No trailing slash/lowercase normalization | Edge middleware 301 redirect                                     | ADR-6         |
| Internal docs host could be mistaken for tenant/custom domain | `menulist.digital` registered as MyCodex product domain | ADR-12 |
| MyCodex docs could be indexed or crawled | MyCodex-only robot metadata, `X-Robots-Tag`, and disallow-all `robots.txt` | ADR-12 |

---

## Implementation Plan

### Prerequisite: Routing Freeze Before Source Changes

**Routing freeze** — Do not start URL-affecting features, experiments, or UI additions while slug permanence and canonical routing source changes are in progress. URL permanence is foundational infrastructure that must be uninterrupted.

**Why:** Slug system touches project creation, rename, and public routing. Concurrent feature work risks conflicts. Complete this foundation first, then resume normal feature work.

---

### Milestone A: Slug Infrastructure (P0) — Implemented

The most impactful change. Makes URLs permanent and reliable.

#### 1.1 Add `slug` field to project metadata

**What:** Store an explicit, immutable-ish slug on each project's metadata document.

**Schema change:** Add to project metadata documents (`projects/{tId}/{sId}/metadata/{projectId}`):

```typescript
{
  // Existing fields...
  slug: string;              // URL-safe slug, auto-generated from name on creation
  previousSlugs?: string[];  // Old slugs for 301 redirects (append-only, never remove)
  slugLockedAt?: Timestamp;  // When slug was first set (audit trail)
}
```

**Slug generation rules:**

- Auto-generated from project `name` via existing `slugify()` on creation
- Owner can customize (via settings, future UI)
- Max 2 slug changes per project lifetime
- Old slug appended to `previousSlugs[]`
- Slug must be unique within the store (not globally)
- Slug must not be in `RESERVED_PROJECT_SLUGS`

**Migration:** For existing projects without `slug` field, derive from `name` using `slugify()` at read time (backward compatible). Optionally run a one-time migration script to stamp explicit slugs.

#### 1.2 Reserved project slug namespace

**What:** Constant defining slugs that cannot be used as project names.

**File:** `src/constants/reservedSlugs.ts` (NEW)

```typescript
export const RESERVED_PROJECT_SLUGS = [
  "menu", // Reserved: OBP → default menu route
  "info", // Future: store info page
  "about", // Future: about page
  "contact", // Future: contact page
  "reviews", // Future: reviews surface
  "photos", // Future: photo gallery
  "gallery", // Future: gallery
  "offers", // Future: offers/promotions
  "updates", // Future: news/updates feed
  "order", // Future: ordering
  "book", // Future: booking
  "events", // Future: events
  "screen", // Existing: digital screens
  "feedback", // Existing: guest feedback
  "api", // Infrastructure
  "admin", // Infrastructure
  "settings", // Infrastructure
  "sitemap", // SEO
  "robots", // SEO
] as const;

export type ReservedProjectSlug = (typeof RESERVED_PROJECT_SLUGS)[number];

export function isReservedProjectSlug(slug: string): boolean {
  return RESERVED_PROJECT_SLUGS.includes(
    slug.toLowerCase() as ReservedProjectSlug,
  );
}
```

**Enforcement points:**

- Project creation (editor)
- Project rename
- Slug edit (future UI)

#### 1.3 Update resolver to use stored slug

**What:** Modify `getProjectBySlugOrDefault()` to check `project.slug` field first, then fall back to `slugify(name)` for backward compatibility.

**File:** `src/app/client/[[...slug]]/page.tsx`

Current logic:

```typescript
// Current: derives slug from name every time
targetProject = projects.find(
  (p) => p.name && slugify(p.name) === slug.toLowerCase(),
);
```

New logic:

```typescript
// New: check stored slug first, fallback to name-derived slug
targetProject = projects.find(
  (p) =>
    p.slug === slug.toLowerCase() || // Stored slug (preferred)
    (p.name && slugify(p.name) === slug.toLowerCase()), // Backward compat
);

// If not found, check previousSlugs for 301 redirect
if (!targetProject) {
  const redirectProject = projects.find((p) =>
    p.previousSlugs?.includes(slug.toLowerCase()),
  );
  if (redirectProject) {
    // Return 301 redirect to current slug
    redirect(
      `/${redirectProject.slug || slugify(redirectProject.name)}`,
      RedirectType.permanent,
    );
  }
}
```

#### 1.4 Slug validation in project creation/update

**What:** Add slug validation to project creation and rename flows.

**Where:** DAL functions that create/update projects (existing files).

**Rules:**

1. Slug must pass `slugify()` (lowercase, alphanumeric + hyphens)
2. Slug must not be in `RESERVED_PROJECT_SLUGS`
3. Slug must be unique within the store's active projects
4. On rename: old slug appended to `previousSlugs[]`
5. Max `previousSlugs` length: 5 (oldest drops off, but realistically max 2 renames)

---

### Milestone B: CDN & Canonical URL Improvements (P1) — Implemented

#### 2.1 Add CDN cache headers to public pages

**What:** Add `Cache-Control` response headers to public menu and OBP pages for Vercel Edge Network caching.

**Where:** `src/app/client/layout.tsx`

```typescript
// Add to layout or via next.config.js headers
export const metadata = {
  other: {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  },
};
```

Or via `next.config.js` headers configuration for `/client/*` paths.

**Effect:** Vercel's CDN caches rendered HTML. Most repeat visitors = 0 origin hits.

#### 2.2 Subdomain → custom domain redirect

**What:** When a store has a verified custom domain, requests to the subdomain should 301 redirect to the custom domain.

**Where:** `src/middleware.ts` or `src/app/client/[[...slug]]/page.tsx`

**Logic:**

```
If request via subdomain
  AND store has customDomain
  AND domainVerified == true
  → 301 redirect to https://{customDomain}{pathname}
```

**Implementation note:** This requires knowing the store's custom domain at middleware level. Options:

- Option A: Check at page level (after store lookup, before render) — simpler, uses existing cache
- Option B: Light cache of subdomain → customDomain mapping in middleware — faster but needs cache management

**Recommendation:** Option A (page level) — simpler, already have store data.

#### 2.3 Trailing slash normalization

**What:** Enforce consistent trailing slash behavior (no trailing slash).

**Where:** `src/middleware.ts`

```typescript
// Remove trailing slash (except root)
if (pathname !== "/" && pathname.endsWith("/")) {
  const url = request.nextUrl.clone();
  url.pathname = pathname.replace(/\/+$/, "");
  return NextResponse.redirect(url, 301);
}
```

#### 2.4 Lowercase path normalization

**What:** Redirect uppercase paths to lowercase.

**Where:** `src/middleware.ts`

```typescript
// Normalize path to lowercase
const lowerPath = pathname.toLowerCase();
if (pathname !== lowerPath) {
  const url = request.nextUrl.clone();
  url.pathname = lowerPath;
  return NextResponse.redirect(url, 301);
}
```

---

### Implemented Capability: Brand OBP for Multi-Store (Feb 19, 2026)

When a multi-store tenant's master store OBP is visited and the tenant has >1 active store, the Brand OBP store selector renders automatically.

**Implementation:** `src/app/client/obp/BrandOBPContent.tsx`

**URL patterns:**

- `storypizza.menulist.ai/` → Brand OBP (store selector with all outlets)
- `storypizza.menulist.ai/pune` → Pune outlet OBP (via outletSlug routing, ADR-11)
- `storypizza.menulist.ai/pune/food-menu` → Pune outlet's "Food Menu" project

**Detection:** `OBPContent.tsx` checks `countActiveStoresForTenant()` against active canonical store documents for that tenant → if >1, renders `BrandOBPContent` instead of single-store OBP. Public mode/location selection does not trust the client-writable global store summary.

**Single-store brands (95%):** Zero visible difference — `countActiveStoresForTenant` returns 1, normal OBP renders.

---

## File Changes Inventory

### Milestone A: Slug Infrastructure

| Action     | File                                              | Change                                                           |
| ---------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| **CREATE** | `src/constants/reservedSlugs.ts`                  | Reserved slug namespace constant + validation function           |
| **MODIFY** | `src/app/client/[[...slug]]/page.tsx`             | Update resolver to check stored slug, add previousSlugs redirect |
| **MODIFY** | `src/lib/utils/slugify.ts`                        | Add `validateProjectSlug()` function                             |
| **MODIFY** | Project creation DAL (where projects are created) | Add slug generation + validation                                 |
| **MODIFY** | Project rename flow (if exists)                   | Add old slug → previousSlugs append                              |
| **CREATE** | `scripts/migrate-project-slugs.ts`                | One-time migration: stamp slug field on existing projects        |

### Milestone B: CDN & Canonical

| Action     | File                                             | Change                                       |
| ---------- | ------------------------------------------------ | -------------------------------------------- |
| **MODIFY** | `src/middleware.ts`                              | Add trailing slash + lowercase normalization |
| **MODIFY** | `src/app/client/[[...slug]]/page.tsx`            | Add subdomain→custom domain redirect check   |
| **MODIFY** | `next.config.js` OR `src/app/client/layout.tsx`  | Add Cache-Control headers for public pages   |

---

## Firebase Cost Impact

### Milestone A: Slug Infrastructure

- **Reads:** ZERO additional reads. Slug field is read alongside existing project metadata (same document)
- **Writes:** ZERO additional writes. Slug is part of project metadata document (same `setDoc` call)
- **Migration script:** One-time batch read+write for existing projects

### Milestone B: CDN & Canonical

- **Reads:** REDUCED. CDN caching reduces origin hits
- **Writes:** ZERO
- **Net effect:** Cost DECREASE from better caching

---

## Relationship to Existing Features

| Feature             | Status              | Relationship                                                                                    |
| ------------------- | ------------------- | ----------------------------------------------------------------------------------------------- |
| **OBP**             | ✅ Built (flag OFF) | OBP routing already handles root vs /menu. Slug improvements enhance project routing under OBP  |
| **Multi-Outlet**    | ✅ Built            | Outlet stores get `outletSlug` for path routing under brand subdomain. No per-outlet subdomains |
| **SEO/AEO**         | ✅ Built            | Better slugs + canonical URLs directly improve SEO. Schema.org already complete                 |
| **Digital Screens** | ✅ Built            | Screen URLs use project-specific paths. Reserved namespace prevents `screen` conflicts          |
| **Guest Feedback**  | ✅ Built            | Reserved namespace prevents `feedback` slug conflicts                                           |
| **Custom Domains**  | ✅ Architected      | Canonical routing adds subdomain→custom domain redirect for SEO dedup                           |

---

## Design Principles

**Simplicity over power.** The system is already infrastructure-grade (caching, SSR, schema, multi-tenant). The real risk going forward is not missing capability — it's perceived complexity. Every addition must make the system _feel_ simpler to operate, not just more capable.

- URLs must be permanent and predictable (no surprises for owners or customers)
- Redirects must be invisible (old links just work)
- Reserved namespace must be invisible (owners never see blocked slugs — just validation errors)
- CDN caching must be invisible (pages just load faster)
- No new concepts for owners to learn

---

## Key Architecture Decisions (11 ADRs — Locked)

> **Full details:** See [url-routing-architecture_adr.md](./url-routing-architecture_adr.md) for complete rationale and evidence.

| ADR        | Decision                                                    | Key Rationale                                                            |
| ---------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| **ADR-1**  | Brand-level subdomain on master store                       | Industry standard (GloriaFood, Wix, Square), SEO authority consolidation |
| **ADR-2**  | Subdomain stored at 3 levels (stores, tenants, storesList)  | Different access patterns need URL without extra Firestore reads         |
| **ADR-3**  | Stored slugs on projectsSummary                             | QR code permanence, `previousSlugs[]` for 301 redirect                   |
| **ADR-4**  | Reserved slug namespace (52 entries)                        | Prevents future platform surface conflicts                               |
| **ADR-5**  | Custom domain via Vercel API                                | Auto-SSL, standard approach, no proxy needed                             |
| **ADR-6**  | URL normalization at middleware                             | 301 redirect for lowercase + trailing slash (SEO dedup)                  |
| **ADR-7**  | Onboarding parity (manual = messaging)                      | Both flows create identical data structures                              |
| **ADR-8**  | CDN cache: `s-maxage=60, stale-while-revalidate=300`        | ~80% cache hit rate, reduces Firebase reads                              |
| **ADR-9**  | Subdomain uniqueness pre-check before transaction           | Globally unique subdomains, race-safe via storeId suffix                 |
| **ADR-10** | Client resolver reads projectsSummary (not legacy metadata) | Slug field unreachable from legacy collection, 1 read vs N               |
| **ADR-11** | Outlet path routing via outletSlug                          | `brand.menulist.ai/pune/food-menu` → outlet store resolution             |

**URL patterns:**

- Single-store: `brand.menulist.ai/{projectSlug}`
- Multi-store: `brand.menulist.ai/{outletSlug}/{projectSlug}`

---

## Testing Strategy

### Slug Infrastructure Tests

| Test                                       | Expected                          |
| ------------------------------------------ | --------------------------------- |
| Create project → slug auto-generated       | `slug` field set on metadata doc  |
| Rename project → old slug in previousSlugs | `previousSlugs` array updated     |
| Visit old slug URL                         | 301 redirect to new slug URL      |
| Try reserved slug as project name          | Blocked with validation error     |
| Existing project without slug field        | Falls back to `slugify(name)`     |
| Two projects with same slugified name      | Second project gets unique suffix |
| Visit non-existent slug                    | Fallback to store OBP or 404      |

### CDN & Canonical Tests

| Test                                      | Expected                                     |
| ----------------------------------------- | -------------------------------------------- |
| Visit subdomain when custom domain exists | 301 redirect to custom domain                |
| Visit `/Menu` (uppercase)                 | 301 redirect to `/menu`                      |
| Visit `/menu/` (trailing slash)           | 301 redirect to `/menu`                      |
| CDN cache behavior                        | Second visit served from CDN (check headers) |

---

## Migration Plan

### For Existing Projects (Slug Infrastructure)

1. **Backward compatible deployment:** New code checks `slug` field first, falls back to `slugify(name)`
2. **Run migration script:** Stamp `slug` field on all existing project metadata docs
3. **Verify:** Check that all existing URLs still resolve correctly
4. **Monitor:** Watch for any 404s in Sentry/logs

**Migration script approach:**

```
For each tenant:
  For each store:
    For each active project:
      If project.slug is undefined:
        project.slug = slugify(project.name)
        project.slugLockedAt = now()
        save project metadata
```

**Estimated scope:** Batch operation, runs in minutes. Safe to run multiple times (idempotent).

---

## What ChatGPT Got Right vs Wrong

### Right (Implemented or Planned)

- **Brand-level subdomain routing** — ChatGPT was RIGHT, we initially rejected this incorrectly (see ADR-1 correction)
- URL permanence is critical infrastructure
- Project slugs must be stored, not derived
- Old slugs must 301 redirect
- Reserved namespace prevents future conflicts
- CDN caching reduces cost dramatically
- Canonical URLs must be enforced
- Schema.org structured data essential for SEO/AEO
- MenuList should become canonical business identity layer
- Multi-store chains need brand-level URL with location paths

### Wrong (Still Rejected)

- New Firestore collections for routing (caching solves the problem)
- Pre-assembled render bundles (violates single source of truth)
- "Multiple DB reads per visit" concern (already solved by Vercel caching)
- `routingIndex` per tenant (not needed with caching)

### Initially Rejected, Now Accepted

- **Brand-level subdomain ownership** — initially rejected as "over-engineering." After deeper validation (industry research, SEO best practices, competitive analysis), confirmed as correct. See `_archive/architecture-validation.md`.
- **Multi-store location paths** (`brand.menulist.ai/pune/menu`) — initially rejected because current code is store-level. Now accepted because current code was accidental, not designed.

### Already Built (ChatGPT Didn't Know)

- SSR with Suspense + streaming skeletons
- Timeout + retry for Firestore reads
- Dual-layer caching (React cache + Vercel Data Cache)
- Full Schema.org implementation
- OBP page (feature-flagged)
- Multi-menu per store support
- Custom domain infrastructure
- Security headers + HTTPS enforcement

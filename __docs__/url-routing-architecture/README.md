# URL Routing Architecture

> **Feature:** Core URL Handling & Public Routing Infrastructure
> **Status:** 🔒 **LOCKED** — Phase 1 + Phase 2 + Product-Domain Guardrails Complete
> **Date:** May 30, 2026
> **Author:** Cascade (Lead Architect)
> **Feature Flags:** `ENABLE_STORED_SLUGS` (ON), `ENABLE_MULTI_OUTLET` (ON), `ENABLE_OBP` (OFF), `ENABLE_MYCODEX_READER` (ON)
> **ADRs:** 12 decisions documented — see [url-routing-architecture_adr.md](./url-routing-architecture_adr.md)
> **Codebase = Single Source of Truth**

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
| Developers | [Implementation Plan](#implementation-plan)                      | Phase 1 + Phase 2 complete           |
| Developers | [File Changes](#file-changes-inventory)                          | Exact files created/modified         |
| Archive    | [ChatGPT Review](./_archive/chatgpt-review.md)                   | Full cross-check                     |
| Archive    | [Architecture Validation](./_archive/architecture-validation.md) | Brand-level vs store-level audit     |

---

## Executive Summary

### What This IS

Core URL routing infrastructure for MenuList's public pages:

- **Product-domain separation** (`menulist.ai` = MenuList, `canonica.app` = Canonica, `menulist.digital` = MyCodex)
- **Brand-level subdomain ownership** (subdomain = brand, not individual location)
- **Multi-store location routing** (`brand.menulist.ai/pune/menu`)
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

**Critical fact:** For public rendering, ONLY store is read. Tenant is NEVER fetched during public page rendering. This is an explicit architecture decision documented in `src/types/platform/tenant.ts:12-13`.

### Current URL Flow

#### Product / Platform Domain Gate

Requests are classified before tenant routing:

1. `src/constants/deploymentTargets.ts` defines the active domains for MenuList, Canonica, and MyCodex by deployment stage.
2. `src/constants/productDomains.ts` registers enabled product sites and maps product hosts to `/sites/{productId}` route groups.
3. `src/lib/multiTenant/domainResolver.ts` checks `resolveProductSiteByHostname()` before treating a host as a platform, subdomain, or custom tenant domain.
4. `src/middleware.ts` rewrites product domains directly to their product route group and never sends them through `/client`.
5. MyCodex product routes require Basic Auth outside localhost so internal docs are not publicly readable.

| Host                                    | Classification | Rewrite / Behavior                 |
| --------------------------------------- | -------------- | ---------------------------------- |
| `menulist.ai` / `www.menulist.ai`       | Platform       | MenuList website / platform routes |
| `canonica.app` / `www.canonica.app`     | Product        | `/sites/canonica`                  |
| `menulist.digital` / `www.menulist.digital` | Product    | `/sites/mycodex`                   |
| `brand.menulist.ai`                    | Tenant         | `/client`                          |
| Verified restaurant custom domain       | Tenant         | `/client`                          |

`menulist.digital` is reserved for the internal MyCodex documentation reader. It must stay in the product-domain registry so it is not mistaken for a restaurant custom domain.

MyCodex Vercel access requires:

- `MYCODEX_BASIC_AUTH_USER`
- `MYCODEX_BASIC_AUTH_PASSWORD`

MyCodex also stays out of public discovery: MyCodex responses send `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate`, its layout metadata is no-index/no-follow, and its product-scoped `robots.txt` disallows all crawlers. These restrictions are applied only to MyCodex routes/domains and must not be reused for MenuList tenant menus or Canonica public surfaces.

Localhost `/__mycodex` remains open for development.

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
                    │  3. Rewrite to /_client │
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │  _client/[[...slug]]   │
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

### Current URL Patterns

| URL                                | Behavior                     |
| ---------------------------------- | ---------------------------- |
| `joespizza.menulist.ai/`           | OBP (store identity page)    |
| `joespizza.menulist.ai/menu`       | Default menu (reserved slug) |
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

### Phase 0: Prerequisites (Before Starting)

**Feature freeze** — Do not start any new features, experiments, or UI additions until Phase 1 + Phase 2 are complete. URL permanence is foundational infrastructure that must be uninterrupted.

**Why:** Slug system touches project creation, rename, and public routing. Concurrent feature work risks conflicts. Complete this foundation first, then resume normal feature work.

---

### Phase 1: Slug Infrastructure (P0) — Estimated: 1 session

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

**File:** `src/app/_client/[[...slug]]/page.tsx`

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

### Phase 2: CDN & Canonical URL Improvements (P1) — Estimated: 1 session

#### 2.1 Add CDN cache headers to public pages

**What:** Add `Cache-Control` response headers to public menu and OBP pages for Vercel Edge Network caching.

**Where:** `src/app/_client/layout.tsx`

```typescript
// Add to layout or via next.config.js headers
export const metadata = {
  other: {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  },
};
```

Or via `next.config.js` headers configuration for `/_client/*` paths.

**Effect:** Vercel's CDN caches rendered HTML. Most repeat visitors = 0 origin hits.

#### 2.2 Subdomain → custom domain redirect

**What:** When a store has a verified custom domain, requests to the subdomain should 301 redirect to the custom domain.

**Where:** `src/middleware.ts` or `src/app/_client/[[...slug]]/page.tsx`

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

### Phase 3: Brand OBP for Multi-Store — IMPLEMENTED (Feb 19, 2026)

When a multi-store tenant's master store OBP is visited and the tenant has >1 active store, the Brand OBP store selector renders automatically.

**Implementation:** `src/app/_client/obp/BrandOBPContent.tsx`

**URL patterns:**

- `storypizza.menulist.ai/` → Brand OBP (store selector with all outlets)
- `storypizza.menulist.ai/pune` → Pune outlet OBP (via outletSlug routing, ADR-11)
- `storypizza.menulist.ai/pune/food-menu` → Pune outlet's "Food Menu" project

**Detection:** `OBPContent.tsx` checks `countActiveStoresForTenant()` → if >1, renders `BrandOBPContent` instead of single-store OBP.

**Single-store brands (95%):** Zero visible difference — `countActiveStoresForTenant` returns 1, normal OBP renders.

---

## File Changes Inventory

### Phase 1: Slug Infrastructure

| Action     | File                                              | Change                                                           |
| ---------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| **CREATE** | `src/constants/reservedSlugs.ts`                  | Reserved slug namespace constant + validation function           |
| **MODIFY** | `src/app/_client/[[...slug]]/page.tsx`            | Update resolver to check stored slug, add previousSlugs redirect |
| **MODIFY** | `src/lib/utils/slugify.ts`                        | Add `validateProjectSlug()` function                             |
| **MODIFY** | Project creation DAL (where projects are created) | Add slug generation + validation                                 |
| **MODIFY** | Project rename flow (if exists)                   | Add old slug → previousSlugs append                              |
| **CREATE** | `scripts/migrate-project-slugs.ts`                | One-time migration: stamp slug field on existing projects        |

### Phase 2: CDN & Canonical

| Action     | File                                             | Change                                       |
| ---------- | ------------------------------------------------ | -------------------------------------------- |
| **MODIFY** | `src/middleware.ts`                              | Add trailing slash + lowercase normalization |
| **MODIFY** | `src/app/_client/[[...slug]]/page.tsx`           | Add subdomain→custom domain redirect check   |
| **MODIFY** | `next.config.js` OR `src/app/_client/layout.tsx` | Add Cache-Control headers for public pages   |

---

## Firebase Cost Impact

### Phase 1: Slug Infrastructure

- **Reads:** ZERO additional reads. Slug field is read alongside existing project metadata (same document)
- **Writes:** ZERO additional writes. Slug is part of project metadata document (same `setDoc` call)
- **Migration script:** One-time batch read+write for existing projects

### Phase 2: CDN & Canonical

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
| **Custom Domains**  | ✅ Architected      | Phase 2 adds subdomain→custom domain redirect for SEO dedup                                     |

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

### Phase 1 Tests

| Test                                       | Expected                          |
| ------------------------------------------ | --------------------------------- |
| Create project → slug auto-generated       | `slug` field set on metadata doc  |
| Rename project → old slug in previousSlugs | `previousSlugs` array updated     |
| Visit old slug URL                         | 301 redirect to new slug URL      |
| Try reserved slug as project name          | Blocked with validation error     |
| Existing project without slug field        | Falls back to `slugify(name)`     |
| Two projects with same slugified name      | Second project gets unique suffix |
| Visit non-existent slug                    | Fallback to store OBP or 404      |

### Phase 2 Tests

| Test                                      | Expected                                     |
| ----------------------------------------- | -------------------------------------------- |
| Visit subdomain when custom domain exists | 301 redirect to custom domain                |
| Visit `/Menu` (uppercase)                 | 301 redirect to `/menu`                      |
| Visit `/menu/` (trailing slash)           | 301 redirect to `/menu`                      |
| CDN cache behavior                        | Second visit served from CDN (check headers) |

---

## Migration Plan

### For Existing Projects (Phase 1)

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

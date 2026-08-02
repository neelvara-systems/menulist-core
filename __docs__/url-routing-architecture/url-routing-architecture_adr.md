# URL Routing Architecture — Architecture Decision Records (ADRs)

> **Last Updated:** May 30, 2026
> **Version:** 2.1 (Slug + Canonical + Product-Domain Guardrails)
> **Purpose:** Single source of truth for WHY decisions were made. Future sessions read this FIRST.
> **Local Source Gate:** `npm run verify:url-routing-boundary`

---

## ADR-1: Brand-Level Subdomain on Master Store

**Decision:** Subdomain belongs to the BRAND, set on master store doc only. Outlet stores use `outletSlug` for path routing.

**Why:**

- Industry standard: GloriaFood, Wix, Square, Toast all use brand domain + location paths
- SEO authority: One domain per brand consolidates search ranking signals
- Brand cohesion: `storypizza.menulist.online` represents the brand, not one outlet
- Zero migration risk: Subdomain feature was unshipped when decision was made

**Evidence:**

- `src/types/platform/store.ts:112` — `subdomain?: string` on StoreDataType (master only)
- `src/types/platform/store.ts:127` — `outletSlug?: string` on StoreDataType (outlets only)
- Competitor audit in `_archive/architecture-validation.md`

**What ChatGPT proposed:** Brand-level subdomain (accepted)
**What we initially rejected:** This (incorrectly — see `_archive/chatgpt-review.md`)
**Correction:** Re-accepted after deeper codebase audit proved store-level was accidental

---

## ADR-2: Subdomain Stored at THREE Levels

**Decision:** Store subdomain redundantly at 3 places for different access patterns.

| Level                         | Field       | Purpose                                                                             |
| ----------------------------- | ----------- | ----------------------------------------------------------------------------------- |
| `stores/{sId}`                | `subdomain` | Canonical source — middleware looks this up for URL resolution                      |
| `tenants/{tId}`               | `subDomain` | Quick lookup — any code with tenant context gets brand URL without extra store read |
| `tenants/{tId}.storesList[i]` | `subdomain` | In-memory lookup — dashboard code knows brand URL from tenant storesList            |

**Why triple-store?**

- Middleware reads from `stores` collection (hot path, cached)
- Dashboard code has tenant in Redux — needs URL without extra Firestore read
- storesList is used in multi-store UI (store switcher, outlet list)
- All three are set atomically during onboarding (same transaction)

**Consistency rule:** When subdomain changes (via Business Settings), ALL THREE must be updated.

---

## ADR-3: Stored Slugs on Project Summary

**Decision:** Project URL slugs are stored permanently in `projectsSummary`, not derived from name at runtime.

**Why:**

- QR code permanence: Printed QR codes must work forever
- Rename safety: `previousSlugs[]` enables 301 redirect from old URLs
- Reserved namespace: Can block `menu`, `reviews`, `feedback` etc. at creation time

**Data model:**

```
projectsSummary/projects_{sId}.projects.{projectId} = {
    name: "Food Menu",
    slug: "food-menu",           // Permanent, auto-generated from name
    previousSlugs: ["old-slug"], // Old slugs for 301 redirect
    active: true,
    isDefault: true,
}
```

**Runtime contract:** Stored slugs are permanently authoritative. There is no
flag-off path that can silently revert public URLs to name-derived slugs.

---

## ADR-4: Reserved Slug Namespace

**Decision:** 40+ slugs blocked at project creation, outlet creation, and subdomain registration.

**Why:** Prevents future platform surface conflicts. If we launch `/reviews` feature later, no project named "Reviews" will collide.

**Location:** `src/constants/reservedSlugs.ts` — single source for all reserved lists.

---

## ADR-5: Custom Domain via Vercel API (Not DNS-Level)

**Decision:** Custom domains are managed via Vercel's domain API, not at DNS registrar level.

**Why:**

- Vercel handles SSL certificates automatically
- No need for proxy/nginx configuration
- Automatic edge routing to our Next.js app
- Standard approach for all Vercel-hosted apps

**Flow:**

1. Owner enters domain in Business Settings
2. `POST /api/domain` → Vercel API adds domain to project
3. Owner configures the exact Vercel-recommended DNS record returned for that project/domain: preferred IPv4/A for apex, project-specific CNAME for a subdomain, plus any ownership challenge
4. `GET /api/domain` → checks verification status
5. When verified → store doc updated with `domainVerified: true`
6. Middleware detects custom domain → renders client page
7. Subdomain visitors 301-redirect to custom domain (SEO consolidation)

**Env vars required:** `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` (optional)

---

## ADR-6: URL Normalization at Middleware Level

**Decision:** Lowercase and trailing-slash normalization happens in Edge Middleware via 301 redirect.

**Why:**

- Prevents duplicate URLs in Google index (`/Food-Menu` vs `/food-menu`)
- Edge middleware is fastest possible location (before SSR)
- 301 redirect is permanent — tells search engines to use canonical form

**Rules:**

- `/Food-Menu` → 301 → `/food-menu`
- `/food-menu/` → 301 → `/food-menu`
- Root `/` is NOT stripped

---

## ADR-7: Both Onboarding Flows Must Have Parity

**Decision:** Manual onboarding (website signup) and messaging onboarding (WhatsApp) MUST create identical data structures.

**Parity checklist:**
| Field | Manual | Messaging | Notes |
|-------|--------|-----------|-------|
| `stores.subdomain` | ✅ | ✅ (Bug B1 fixed) | Auto-generated from businessName |
| `tenants.subDomain` | ✅ | ✅ (Bug B4 fixed) | Brand subdomain for quick lookup |
| `tenants.storesList[i].subdomain` | ✅ | ✅ (Bug B4 fixed) | In storesList entry |
| `projectsSummary` with slug | ✅ | ✅ (Bug B2 fixed) | Default project with slug |
| `publicUrl` format | subdomain-based | subdomain-based (Bug B3 fixed) | Was path-based, now fixed |

**Bug found Feb 19, 2026:** Messaging onboarding was creating stores WITHOUT subdomain, WITHOUT projectsSummary entry, and with WRONG publicUrl format. All fixed in this session.

---

## ADR-8: CDN Cache Strategy

**Decision:** `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` on all public pages.

**Why:**

- 60s server cache = most visitors get cached HTML from Vercel Edge
- 300s stale-while-revalidate = even stale visitors get instant response while background refresh
- Combined with `revalidateTag()` for instant invalidation when owner saves menu
- Reduces Firebase reads by ~80% on steady-state traffic

---

## ADR-9: Subdomain Uniqueness Pre-Check Before Transaction

**Decision:** Query stores collection for existing subdomain BEFORE the atomic transaction. If collision, append `-{storeId}` suffix.

**Why:**

- Firestore transactions can't do WHERE queries on collections other than what's read via `transaction.get()`
- Pre-check outside transaction has a tiny race window (~ms) but collision auto-resolves via storeId suffix
- Guarantees globally unique subdomains across all stores

**Applied to:** Both manual onboarding (`create-subscription/route.ts`) and messaging onboarding (`approve/route.ts`)

---

## ADR-10: Client Resolver Reads projectsSummary (Not Legacy Metadata)

**Decision:** Refactored client page resolver to read from `platformSummary/projects_{sId}` instead of `projects/{tId}/{sId}/metadata`.

**Why:**

- `projectsSummary` has stored `slug` and `previousSlugs` fields — the metadata collection doesn't
- 1 read instead of N reads (summary doc has all projects in one document)
- Fallback to legacy metadata collection if summary doesn't exist (backward compat)
- This was identified as a critical data source mismatch during simulation testing

---

## ADR-11: Outlet Path Routing via outletSlug

**Decision:** When a visitor hits `brand.menulist.online/{slug}`, the resolver first checks if `{slug}` matches an outlet's `outletSlug`. If yes, switches to that outlet's store. If no, treats it as a project slug.

**Why:**

- Multi-store brands need `brand.menulist.online/pune` to route to the Pune outlet
- Outlet slugs and project slugs share the same URL namespace — outlet check runs first
- Only triggers when `storeData.isMaster && FEATURE_FLAGS.ENABLE_MULTI_OUTLET`
- Single-store brands (95% of users) are unaffected

---

## ADR-12: MyCodex Has No Active Public Domain

**Decision:** MyCodex currently has no active public product domain. It does not use `menulist.digital`. MenuList QA uses `menulist.digital` plus `www.menulist.digital` for the website, `app.menulist.digital` for the single owner/staff app, and `*.menulist.digital` for QA customer tests. MyCodex remains a static/internal reader reached locally through `/__mycodex`; any future private host must be approved and added back to `src/constants/deploymentTargets.ts` before DNS or Vercel setup.

**MenuList owner-app boundary:** `/dashboard` is the single owner entry route and
session scope selects the tenant/store. Sign-in and owner onboarding
(`/create-menu`, `/invite`) use the same `app` host. The app host is `noindex`,
has no sitemap, and does not share cookie or CORS scope with customer hosts.
Marketing-host owner paths and retired `dashboard.*`/`app.menulist.online`
aliases redirect to the active app host.

**Why:**

- The active domain/account plan assigns `menulist.digital`, `www.menulist.digital`, `app.menulist.digital`, and `*.menulist.digital` to MenuList QA/staging.
- MyCodex has no claim on `menulist.digital`; the apex and `www` alias belong to the MenuList staging website.
- MyCodex is static/no DB and does not require Firebase, Storage, Functions, or a public domain.
- Unknown production hosts should not be preserved as implicit product carve-outs.
- If a private MyCodex host is approved later, it must fail closed behind the existing MyCodex login/session cookie.

**Runtime contract:**

| Entry point | Expected classification | Expected rewrite |
| ---- | ----------------------- | ---------------- |
| `localhost:3000/__mycodex` | Local MyCodex dev prefix | `/sites/mycodex` |
| `menulist.ai` | Platform/MenuList | no MyCodex rewrite |
| `answerlattice.com` | Product: Answerlattice | `/sites/answerlattice` |

**Required Vercel env vars:**

- `MYCODEX_BASIC_AUTH_USER`
- `MYCODEX_BASIC_AUTH_PASSWORD`

The credential env var names are retained for compatibility, but runtime access is now first-party form login plus an `HttpOnly` `mycodex_session` cookie. Credentials must stay server-side and must not be stored in browser `localStorage`.

If a private MyCodex host is approved later, its PWA install identity must stay product-scoped: `/mycodex.webmanifest`, MyCodex icon assets, and `/mycodex-sw.js`. The service worker is allowed to cache the offline page and static logo assets only; it must not cache repository documentation pages, markdown, or tenant/client menu data.

Because MyCodex reads `__docs__` markdown from disk at runtime, the MyCodex route must retain a Vercel file-tracing include in `next.config.js`: `/sites/mycodex` routes include `./__docs__/**/*`. This is packaging support only; it does not add MenuList tenant routing or Answerlattice access to the docs tree.

**Source files:**

- `src/constants/deploymentTargets.ts` — `mycodex` preview/production domains
- `src/constants/productDomains.ts` — MyCodex product site entry guarded by `ENABLE_MYCODEX_READER`
- `src/lib/multiTenant/domainResolver.ts` — product-domain check runs before platform/subdomain/custom classification
- `src/middleware.ts` — product domains rewrite before tenant routing
- `next.config.js` — MyCodex route file tracing includes `__docs__`
- `src/components/ServiceWorkerRegister.tsx` — product-scoped service worker registration
- `public/mycodex.webmanifest` — MyCodex install manifest

---

## Decision Log (Chronological)

| Date         | Decision                                | Rationale                                    |
| ------------ | --------------------------------------- | -------------------------------------------- |
| Feb 18, 2026 | Brand-level subdomain (ADR-1)           | Architecture validation audit                |
| Feb 18, 2026 | Stored slugs (ADR-3)                    | QR permanence requirement                    |
| Feb 18, 2026 | Reserved namespace (ADR-4)              | Future-proof platform surfaces               |
| Feb 18, 2026 | CDN cache headers (ADR-8)               | Performance + cost reduction                 |
| Feb 19, 2026 | Subdomain auto-assignment at onboarding | Every store needs a public URL               |
| Feb 19, 2026 | Triple-store subdomain (ADR-2)          | Dashboard + middleware + API all need URL    |
| Feb 19, 2026 | Vercel custom domain API (ADR-5)        | Standard approach, auto-SSL                  |
| Feb 19, 2026 | URL normalization (ADR-6)               | SEO deduplication                            |
| Feb 19, 2026 | Onboarding parity (ADR-7)               | Bug discovered in messaging flow             |
| Feb 19, 2026 | Subdomain uniqueness pre-check (ADR-9)  | Prevents duplicate subdomains                |
| Feb 19, 2026 | Resolver reads projectsSummary (ADR-10) | Data source fix — slug field was unreachable |
| Feb 19, 2026 | Outlet path routing (ADR-11)            | Multi-store brand URL resolution             |
| May 30, 2026 | MyCodex domain carve-out (ADR-12)       | Keep internal reader off tenant/custom routing |

# Client Menu (Customer-Facing Digital Menu) — Firebase Cost Tracking

**Feature:** Client Menu — QR code digital menu for restaurant customers
**Status:** Firebase cost evidence; not current launch certification
**Last Updated:** July 1, 2026
**Priority:** HIGHEST — This is the most trafficked feature. Every customer scan = Firebase reads.

---

## Current Launch Boundary

This Firebase cost document is customer-facing menu-output cost evidence; it is not current production certification. Current client-menu launch approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, Digital Menu Output Constitution checks, physical/mobile browser QA, public cache/deploy evidence, and target production smoke.

---

## Summary

- **Collections Used:** `stores`, `platformSummary`, `projects`, `analytics`
- **Storage Buckets:** None (reads only from customer side; images served via CDN URLs)
- **Cloud Functions:** `decisionBlocksScoring` (precomputes blocks on schedule)
- **Estimated Monthly Cost:** **Medium-High** — scales linearly with customer traffic

### Internal Menu Change Log And Snapshot Boundary

The owner-side Menu Observation Layer keeps the existing one create per flushed event and one create per enabled publish snapshot; customer public pages add zero reads. Replaceable detail changes remain debounced, while completed publish/revision events intentionally remain append-only. Internal client readers page by `(timestamp, documentId)`, clamp returned rows to 500, and fail after 5,000 scanned documents rather than running unbounded. Firestore rules now require exact tenant/store claims, owner/manager/platform write authority, path/payload scope agreement, existing scoped projects, bounded canonical or supported legacy event shape, bounded snapshot structure, and deny update/delete. This changes `firestore.rules`, requires the scoped MenuList Firestore-rules deploy, adds no collection or index, and does not require a Cloud Functions or Vercel deployment.

### Public Menu External Link Normalization

Public menu external link normalization is Firebase-cost neutral. It normalizes already-loaded store `publicPresence`, `socialMedia`, and `reviewUrl` fields in browser render paths before customer-facing footer, recovery, and feedback links are emitted. It adds no Firestore read/write/delete, Storage operation, Cloud Function, API route, rule, index, cache invalidation, or deploy requirement.

### Menu Cache Revalidation Rate-Limit Boundary

Menu cache revalidation rate-limit boundary: `/api/revalidate/menu` now applies the shared `MENU_CACHE_REVALIDATION` limiter before bounded body parsing, cache-tag validation, `revalidateTag()` calls, or Owner Business Assistant packet invalidation. Authenticated app callers are keyed by hashed session actor material; `x-revalidate-secret` callers are keyed by hashed caller-source material after the secret is validated. The limit is intentionally generous at 600 requests per minute per source so normal owner save bursts and Cloud Function public-cache invalidations continue to pass while runaway loops or leaked-secret churn are bounded. This adds no Firestore read/write/delete and does not change valid cache tags, store-access checks, explicit tag handling, screen-data invalidation, or assistant-cache invalidation behavior.

Authenticated cache revalidation now derives one fail-closed session access projection before body parsing or cache work. Every present root/nested tenant and current-store alias must be canonical and equal; every present platform-role alias must agree before platform-only explicit tags are admitted. Additional multi-location store IDs remain allowed only when they are canonical members of the authenticated session list. Owner Business Assistant packet invalidation receives the exact reconciled tenant identity, never a preferred alias. Secret-authenticated server invalidation keeps its existing global per-store behavior.

---

## Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Docs Read | Indexed? | Notes |
|-----------|-----------|---------|-----------|-----------|----------|-------|
| Store lookup (subdomain) | `stores` + referenced `tenants/{tId}` | Page load (SSR) | Per unique visit (cached 60s) | 2 on a unique cold hit | Yes (`subdomain` + `active`) | Store query uses `limit(2)` and rejects duplicates; the tenant point read proves existence, identity, lifecycle, and platform-block eligibility. Only store fields are returned. |
| Store lookup (custom domain) | `stores` + referenced `tenants/{tId}` | Page load (SSR) | Per unique visit (cached 60s) | 2 on a unique cold hit | Yes (`customDomain` + `domainVerified` + `active`) | Uses `limit(2)` and rejects duplicate verified rows before the tenant eligibility read. Tenant data is never part of the public payload. |
| Project summary lookup | `platformSummary/projects_{sId}` | Page load (SSR) | Per unique menu cache miss (cached 60s) | 1 | Direct doc read | `getProjectBySlugOrDefault()` reads the store summary packet for slug/default/previousSlug routing. File: `src/app/client/[[...slug]]/page.tsx:202-244` |
| Project data fetch | `projects/{tId}/{sId}/{projectId}` | Page load (SSR) | Per unique menu cache miss (cached 60s) | 1 | Direct doc read | `getProjectData()` reads the resolved project by immutable ID. File: `src/app/client/[[...slug]]/page.tsx:138-149` |
| Embedded Decision Blocks | `projects/{tId}/{sId}/{projectId}` | Page load (SSR) | 0 extra reads | N/A | N/A | Public decision blocks are read from `projectData.publicDecisionBlocks` after the project doc is loaded. File: `src/app/client/[[...slug]]/page.tsx:185-193` |
| Store details (server truth + browser projection) | `stores` | Page load (SSR) | 0 extra reads after host lookup | N/A | N/A | Server rendering reuses the canonical store object returned by host lookup. Only `projectPublicClientStore()` output crosses into `ClientMenuRenderer`; there is no second store read and no full store-document browser payload. |
| Outlet lookup | `stores` + referenced `tenants/{tId}` | Multi-outlet project or outlet path | Only when first slug may be an outlet | 0 or 2 on a unique cold hit | Yes (`tenantId` + `outletSlug` / `previousOutletSlugs` + `active`) | `getStoreByOutletSlug()` rejects duplicate current/history rows and applies the same canonical store/tenant identity and lifecycle boundary. |
| Master project (multi-outlet) | `projects/{tId}/{sId}/{masterProjectId}` | Page load (SSR) | Only for outlet projects linked to a master project | 1 | Direct doc read | Required to merge master truth with outlet overrides before public render. File: `src/app/client/[[...slug]]/page.tsx:312-333` |
| Active special menu project | `projects/{tId}/{sId}/{activeSpecialMenuId}` | Store has active special menu | Only when `activeSpecialMenuId` exists | 1 | Direct doc read | Zero extra reads for normal menus; active special menus replace or overlay the base project. File: `src/app/client/[[...slug]]/page.tsx:356-420` |
| SEO metadata / viewport store lookup | `stores` | Metadata and viewport generation | Per unique cache miss | 0-1 | Same cached helper as page render | Uses shared `getStoreBySubdomain()` / `getStoreByCustomDomain()` helpers with `unstable_cache` and `client-stores` tag. File: `src/lib/firestore/clientStoreLookup.ts:45-116` |

Public menu project document-ID boundary: `getProjectData()` normalizes the resolved immutable project ID with `normalizePublicMenuProjectDocumentScope` before reading `projects/{tId}/{sId}/{projectId}`. It keeps the valid one-read project fetch, but the Admin SDK path now uses normalized first-segment tenant scope, final-segment store scope, and normalized project ID only. Whitespace-mutated, path-shaped, reserved, malformed, zero, negative, unsafe, or nonnumeric project scope fails closed before Firestore work. This adds no Firestore reads/writes/deletes for valid public menu requests, no Storage operations, no Cloud Functions, no provider calls, no cache invalidations, no Firestore rules/indexes, no owner-facing settings, no Firebase deploy requirement, and no Vercel deploy action.

Public customer delivery scope parity: menu rendering, OBP menu CTA summary rows, tenant sitemap project rows, Customer App `/menu` start-url admission, and the MenuList pull API all reject malformed or cross-tenant/cross-store project IDs before using a summary row. Sitemap store resolution reuses the canonical public store/tenant lifecycle helper, outlet rows must match their document/store/tenant identities, and each store summary cache is invalidated by `menu-store-{storeId}` / `store-{storeId}`. Sitemap discovery enforces the 30-outlet product cap explicitly with one master-store allowance and one overflow sentinel. A valid tenant reads at most 31 canonical store rows; a malformed over-cap tenant stops at 32 rows and omits outlet sitemap entries instead of starting unbounded project-summary fanout. Outlet project-summary reads remain parallel and add no writes.

### Writes

| Operation | Collection | Trigger | Frequency | Docs Written | Fields | Notes |
|-----------|-----------|---------|-----------|-------------|--------|-------|
| Analytics event tracking | `analytics` | Customer interactions | Per menu view, item click, search | 1 | Merge update | Daily aggregated doc `{tId}_{sId}_{projectId}_daily_{date}`. Uses increment operations. |

### Deletes

| Operation | Collection | Trigger | Frequency | Docs Deleted | Soft/Hard | Notes |
|-----------|-----------|---------|-----------|-------------|-----------|-------|
| None | — | — | — | — | — | Customer-facing menu never deletes data |

---

## Firebase Storage

| Operation | Path Pattern | Trigger | Size | Notes |
|-----------|-------------|---------|------|-------|
| Image reads (CDN) | Various — served via URL in project data | Customer viewing menu | 0 (CDN) | Images are URLs stored in Firestore, served by CDN. No direct Storage reads from client page. |

---

## Cloud Functions

| Function | Trigger | Frequency | Duration | Memory | Notes |
|----------|---------|-----------|----------|--------|-------|
| `decisionBlocksScoring` | Scheduled (daily) | 1x/day per active project | 10-30s | 256MB | Precomputes popular/quickPick/bestValue blocks. Results cached in `decisionBlocks` collection. |

---

## Security Rules Impact

- Store documents: public read for active stores (no auth required for customer menu)
- Project documents: public read for active, non-deleted projects (filtered server-side)
- Decision blocks: embedded in the public project payload (`publicDecisionBlocks`), no separate public read
- Analytics: write-only from client (no read access for customers)
- `sanitizeForClient()` allowlists the public project payload before the React client boundary; `projectPublicClientStore()` independently allowlists the already-loaded store fields needed by the customer renderer. Canonical store credentials, billing, roles, owner contacts, POS/integration secrets, notification state, and future unknown fields stay server-side.

---

## Cost Optimization Notes

### Current Optimizations
- **Vercel Data Cache** (`unstable_cache`): 60s TTL on all reads — same store/project served from cache for 60s
- **React `cache()`**: Within-request deduplication — generateMetadata + page render share same store lookup
- **`withTimeout(5s)`**: Prevents infinite SSR hangs on Firestore failures
- **`withRetry(1)`**: One retry with 1s delay handles transient failures
- **Per-store cache tags**: `menu-store-${sId}` enables precise invalidation on owner save
- **Shared store lookup helpers**: OBP/menu/compliance share cached `getStoreBySubdomain()` and `getStoreByCustomDomain()` under the `client-stores` tag.
- **Summary-first slug routing**: `platformSummary/projects_{storeId}` replaces the old metadata subcollection scan for project slug/default resolution.
- **Embedded decision blocks**: Public menu recommendation blocks come from the loaded project doc; the menu path no longer performs a separate decision-block document read.
- **Decision Blocks timezone diagnostics:** Public menu Decision Blocks timezone fallback is browser-local render logic. Invalid store-timezone formatting logs bounded `public_menu_decision_blocks_timezone_failed` diagnostics only and adds no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement.
- **Validated cache revalidation**: `/api/revalidate/menu` accepts only numeric `storeId` values or bounded valid tag arrays (`menu-store-{numericStoreId}`, `store-{numericStoreId}`, `client-stores`, `screen-data`) before calling `revalidateTag()`, and authenticated app callers can revalidate only stores present in their session unless they are platform admins. Explicit single-store tag arrays derive the same store id before clearing the Owner Business Assistant packet cache. Browser-side cache revalidation handoffs use same-origin credentials, no-store cache policy, timeout handling, and manual redirect handling so redirected API handoffs do not look like accepted invalidations. Live Digital Screens content-version touches stay in the caller helpers after public-truth writes.
- **Special note rendering is payload-only**: Public menus resolve special notes from the already-fetched project/store payload (`menuSettings.specialNote`, legacy project note fields, then `publicPresence.specialNote`). This adds no Firestore reads or writes.
- **PDP item sharing is no-write**: Public item sharing uses the Web Share API or clipboard fallback from the already-open PDP URL. Its generic `share` analytics event is GA4-only and does not add Firestore analytics writes. Browser-local copy hardening logs failed final copy fallbacks through runtime diagnostics with bounded item/share URL/title/language metadata only; it adds no Firestore, Storage, Cloud Function, provider, cache, rule, index, or schema operations.
- **Footer freshness diagnostics:** Public menu footer freshness parsing is browser-local render logic. Malformed `lastPublishedAt` values omit unverified freshness text and log bounded `public_menu_footer_freshness_relative_failed` / `public_menu_footer_freshness_iso_failed` diagnostics only; this adds no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement.
- **Feedback nudge storage diagnostics:** Public menu feedback nudge de-dupe is browser-local and tab-scoped. Failed sessionStorage guard read/write paths log bounded `public_menu_feedback_nudge_storage_read_failed` / `public_menu_feedback_nudge_storage_write_failed` diagnostics only and add no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement.
- **Language preference storage diagnostics:** Public menu language preference storage is browser-local. Failed project-scoped localStorage read/write paths log bounded `public_menu_language_storage_read_failed` / `public_menu_language_storage_write_failed` diagnostics only and add no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement.
- **Breadcrumb language preservation diagnostics:** Public menu breadcrumb language carry is browser-local. Failed `?lang=` preservation logs bounded `public_menu_breadcrumb_language_preserve_failed` diagnostics only and adds no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement.
- **Search focus diagnostics:** Public menu search focus is browser-local. Failed prevent-scroll focus or fallback focus attempts log bounded `public_menu_search_focus_prevent_scroll_failed` / `public_menu_search_focus_fallback_failed` diagnostics only and add no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement.
- **Gradient parser diagnostics:** Owner Menu Design gradient parsing is browser/runtime-local. Malformed saved gradient strings still fall back through the existing parser path, while `public_menu_gradient_parse_failed` diagnostics log only value kind, string length, angle/token shape, approximate stop count, and fixed fallback policy. This adds no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement.
- **Legacy QR download diagnostics:** The tracked legacy project QR component is browser-local. Failed branded QR generation/download logs bounded `project_share_legacy_qr_download_failed` diagnostics with URL/name/logo/color presence-length metadata, fixed owner-copy fallback policy, QR size, and logo-toggle state only. This adds no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement.

### Potential Optimizations
- **Increase cache TTL**: 60s → 300s for low-change menus (trade-off: stale data for 5 min)
- **Edge caching**: Vercel Edge Middleware could cache entire HTML for ultra-low latency

### Warnings: Expensive Patterns
- **Multi-outlet resolution**: Adds +1 read per page load for outlet stores (reads master project)
- **Heavy project docs**: ~50KB per project doc. Firestore charges per document, not per byte, but large docs increase transfer time
- **Tenant eligibility enforcement**: Every unique public store/outlet cache fill reads the canonical referenced tenant and rejects missing, inactive, deleted, identity-mismatched, or platform-blocked tenants. If compact/legacy store or tenant identity aliases coexist, all present aliases must resolve to the same exact positive document ID; `??` fallback is not used to hide a conflicting alias. The denormalized store `tenantBlocked` mirror remains an early store-level rejection signal, but it is not accepted as a substitute for canonical tenant truth. Tenant fields are eligibility-only and never rendered.

---

## Cost Estimate (per 1000 active stores, 100 scans/store/month)

| Resource | Operations/month | Unit Cost | Monthly Cost |
|----------|-----------------|-----------|-------------|
| Firestore Reads (store + tenant eligibility) | 2 × (100,000 ÷ cache factor ~10x) = 20,000 unique-hit reads | $0.06/100K | ~$0.01 |
| Firestore Reads (project summary) | 10,000 | $0.06/100K | $0.01 |
| Firestore Reads (project data) | 10,000 | $0.06/100K | $0.01 |
| Firestore Reads (decision blocks) | 0 extra reads | $0.06/100K | $0.00 |
| Firestore Reads (store details) | 0 extra reads after host lookup | $0.06/100K | $0.00 |
| Firestore Writes (analytics) | Up to 100,000 sessions before queue coalescing | $0.18/100K | <= $0.18 |
| Cloud Functions (scoring) | 1,000 (1/day × 1000 stores) | $0.40/million | $0.00 |
| **Total** | | | **~$0.25/month** |

> **Note:** Cost scales linearly with traffic. At 10x traffic (1000 scans/store), cost ≈ $2.50/month. Cache factor significantly reduces actual Firestore reads.

---

## DAL Functions Used

| Function | File | Operation Type |
|----------|------|---------------|
| `getStoreBySubdomain` | `src/lib/firestore/clientStoreLookup.ts` | Read (cached query) |
| `getStoreByCustomDomain` | `src/lib/firestore/clientStoreLookup.ts` | Read (cached query) |
| `getStoreByOutletSlug` | `src/lib/firestore/clientStoreLookup.ts` | Read (cached query, multi-outlet only) |
| `getProjectData` | `src/app/client/[[...slug]]/page.tsx` | Read (direct project doc by immutable ID) |
| `getProjectBySlugOrDefault` | `src/app/client/[[...slug]]/page.tsx` | Read (`platformSummary/projects_{storeId}` + resolved project doc) |
| `resolveProjectForRender` | `src/lib/multiOutlet/index.ts` | Read (getDoc for master) |

## API Routes & Their Firebase Impact

| Route | Method | Firebase Ops | Rate Limited? | Notes |
|-------|--------|-------------|---------------|-------|
| `/client/[[...slug]]` (SSR) | GET | 3-5 cached reads on menu path; fewer on OBP root; +1 when outlet/master/special-menu branches apply | No (public) | Server-rendered page. Reads are cached and invalidated by store/project tags. Analytics writes happen from client tracking only. |
| `/client/sitemap.ts` | GET | 2+ cached reads depending on outlet/project count | No (public) | Reads store seed, project summaries, and outlet summaries. Weak, blocked, starter, or incomplete records stay out of sitemap. |
| `/client/robots.ts` | GET | 0R | No (public) | Static response, no Firestore |
| `/api/revalidate/menu` | POST | 0 Firestore reads/writes | Yes for app callers; secret for server callers | Validates numeric `storeId`/cache-tag shape, checks authenticated store access for app callers, revalidates `menu-store-{storeId}`, `store-{storeId}`, `client-stores`, and `screen-data`, and clears Owner Business Assistant packet cache when a `storeId` or single-store explicit tag array is present. Live Digital Screen content-version touches stay in the public-truth caller helpers. |

**Public client store lookup scope document ID boundary:** Direct public store-ID reads and legacy tenant-block fallback reads are admitted by `src/lib/firestore/clientStoreLookup.ts` only after the shared Firestore document ID guard and exact positive numeric check pass. Valid subdomain, custom-domain, outlet-slug, and public store-ID lookup behavior is unchanged; malformed store IDs return no store, and malformed tenant IDs on returned store records fail closed before public output.

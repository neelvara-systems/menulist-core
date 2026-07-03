# URL Routing Architecture — Firebase Cost Tracking

> **Audience:** Founder / Cost Control
> **Last Updated:** July 2, 2026
> **Version:** 3.3 (Slug + Canonical + Product-Domain Guardrails + Source Gate)
> **Local Source Gate:** `npm run verify:url-routing-boundary`

---

## Overview

URL Routing Architecture **reduces** total Firebase reads across all public surfaces through 6 targeted optimizations. The feature itself adds zero additional writes.

The June 29, 2026 custom-domain limiter hardening adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. `/api/domain` keeps the same Vercel/provider and store update behavior, but the domain-management rate limiter stores only HMAC-hashed owner/store key material instead of raw identifiers.

The June 29, 2026 subdomain-check limiter hardening adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. `/api/subdomain/check` keeps the same `DATA_READ` cheap-fail gate and active-store availability lookup, but the limiter stores only HMAC-hashed owner/tenant/store key material instead of raw identifiers.

The June 29, 2026 Domain Settings handoff diagnostic pass adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. Desktop and mobile copy/open/DNS-copy failures log bounded URL/DNS metadata only and do not change `/api/domain`, `/api/subdomain/check`, Vercel provider calls, store writes, or public cache invalidation.

The June 29, 2026 mobile subdomain response-parse hardening adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. Mobile Domain Settings caps `/api/subdomain/check` response parsing at 8KB, logs `mobile_domain_settings_subdomain_check_response_parse_failed` or `mobile_domain_settings_subdomain_check_response_invalid` with bounded status and store/domain metadata only, and does not change the route, availability lookup, valid response contract, or public cache invalidation.

The June 30, 2026 desktop subdomain response-parse hardening adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. Desktop Domain Settings caps `/api/subdomain/check` response parsing at 8KB, logs `desktop_domain_settings_subdomain_check_response_parse_failed` or `desktop_domain_settings_subdomain_check_response_invalid` with bounded status and store/domain metadata only, and does not change the route, availability lookup, valid response contract, subdomain saves, or public cache invalidation.

The June 29, 2026 mobile domain status/add response-parse hardening adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. Mobile Domain Settings caps `/api/domain` status and add-domain response parsing at 32KB, logs `mobile_domain_settings_status_response_parse_failed` / `mobile_domain_settings_status_response_invalid` and `mobile_domain_settings_add_response_parse_failed` / `mobile_domain_settings_add_response_invalid`, and requires a returned domain before local custom-domain state updates. Valid Vercel provider calls, store writes, public cache invalidation, and DNS display behavior are unchanged.

The June 30, 2026 mobile subdomain save acknowledgement hardening adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. Mobile Domain Settings now requires the existing `updateStore()` subdomain write to return an acknowledgement before local public URL state or saved copy changes; swallowed DAL fallbacks log `mobile_domain_settings_subdomain_store_update_rejected` through the existing fixed failure path.

The July 1, 2026 custom-domain remove acknowledgement hardening adds no Firebase reads, writes, deletes, indexes, or Cloud Functions beyond existing valid `/api/domain` remove route behavior. Desktop Domain Settings, embedded Custom Domain, and Mobile Domain Settings cap remove response parsing through the existing domain response readers and require `{ success: true, removed: true }` before clearing local custom-domain state. Valid Vercel provider calls, store writes, public cache invalidation, DNS display behavior, and owner-facing settings are unchanged.

The June 30, 2026 Vercel provider redirect-boundary hardening adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. The shared Vercel domain helper keeps the same add/status/remove calls and 64KB bounded response parser, but uses manual redirect handling so bearer-token domain-management requests fail closed on provider redirects instead of following a new target.

The June 30, 2026 Vercel provider timeout hardening adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. The same helper now aborts stuck Vercel add/status/remove requests with a provider timeout and clears the abort timer after each request; valid provider calls, route responses, store writes, hosted-help registry writes, and cache invalidation behavior are unchanged.

The June 30, 2026 domain settings shared request-policy consolidation adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. Desktop Domain Settings, embedded Custom Domain, and Mobile Domain Settings now use the shared authenticated browser request policy for existing `/api/domain` and `/api/subdomain/check` browser calls before bounded response parsing. Valid subdomain availability reads, custom-domain provider calls, store writes, public cache invalidation, DNS display behavior, rules, indexes, schema fields, and owner-facing settings are unchanged.

The MyCodex product-domain carve-out (`menulist.digital` / `www.menulist.digital`) adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. It only changes host classification in middleware, requires a first-party MyCodex login/session cookie outside localhost, serves local repository markdown from `__docs__`, emits product-scoped no-index/no-follow crawler controls, and serves MyCodex PWA assets from static files.

The July 2, 2026 URL routing boundary source gate adds no Firebase reads, writes, deletes, indexes, Cloud Functions, live provider calls, or deploy steps. `npm run verify:url-routing-boundary` runs resolver/source/docs checks locally to keep product hosts, tenant subdomains, custom domains, middleware rewrite order, tenant headers, and active documentation aligned with runtime code.

The July 2, 2026 safe outlet path segments boundary adds no Firebase reads, writes, deletes, indexes, Cloud Functions, live provider calls, cache invalidations, or deploy steps. Brand OBP location cards, outlet OBP links, client menu outlet lookup/canonical redirects, and sitemap outlet entries normalize stored outlet slugs at render/resolve time and hide invalid legacy values instead of rewriting Firestore. Source gate: `npm run verify:url-routing-boundary`.

The July 2, 2026 safe project path segments boundary adds no Firebase reads, writes, deletes, indexes, Cloud Functions, live provider calls, cache invalidations, or deploy steps. Client menu lookup, previous-slug redirects, canonical URLs, metadata lookup, sitemap project entries, and OBP menu CTA links normalize stored project slugs at render/resolve time and hide invalid legacy values instead of rewriting Firestore. Source gate: `npm run verify:url-routing-boundary`.

### Cost Optimization Summary (Implemented Feb 19, 2026)

| #     | Optimization                                                  | Surface         | Reads Saved Per Visit | Annual Savings (10K visits/day) |
| ----- | ------------------------------------------------------------- | --------------- | --------------------- | ------------------------------- |
| OPT-1 | Eliminate redundant `getStoreById()` in OBP                   | OBP             | **1 read**            | ~3.6M reads/year                |
| OPT-2 | `checkHasPublishedMenu` uses projectsSummary                  | OBP             | **N→1 reads**         | Variable                        |
| OPT-3 | `countActiveStoresForTenant` uses storesSummary               | OBP             | **N→1 reads**         | Variable                        |
| OPT-5 | Eliminate redundant `getStoreById()` in menu page             | Client Menu     | **1 read**            | ~3.6M reads/year                |
| OPT-6 | Add `unstable_cache` to digital screen SSR                    | Digital Screens | **4 reads/SSR**       | ~5.8M reads/year (1K screens)   |
| CDN   | `s-maxage=60, stale-while-revalidate=300` on all client pages | All             | **~80% reduction**    | Massive                         |

---

## Reads

### Core Reads (Per Public Page Visit)

| Operation                 | Collection                         | When                                | Cost Impact                                                        |
| ------------------------- | ---------------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| Store subdomain lookup    | `stores` (WHERE subdomain)         | Every visit via subdomain           | **1 read** — cached 60s via `unstable_cache`                       |
| Project list from summary | `platformSummary/projects_{sId}`   | Every menu page visit               | **1 read** — replaces N legacy metadata reads (ADR-10). Cached 60s |
| Full project data         | `projects/{tId}/{sId}/{projectId}` | After project selected from summary | **1 read** — inside `getCachedProject`, cached 60s                 |
| Decision Blocks           | `decisionBlocks/{tId}_{sId}_{pId}` | After project resolved              | **1 read** — optional enhancement, cached 60s                      |

### Conditional Reads

| Operation                           | Collection                             | When                                         | Cost Impact                                                        |
| ----------------------------------- | -------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| Multi-store brand detection (OPT-3) | `platformSummary/storesSummary`        | OBP root for master stores only              | **1 read** — uses summary doc, not stores scan. Cached 60s         |
| Has published menu (OPT-2)          | `platformSummary/projects_{sId}`       | OBP page (single-store)                      | **1 read** — uses projectsSummary, not legacy metadata. Cached 60s |
| Outlet routing lookup               | `stores` (WHERE tenantId + outletSlug) | Slug might be outlet (master + MULTI_OUTLET) | **0-1 read** — cached 60s, only multi-store brands                 |
| Subdomain availability check        | `stores` (WHERE subdomain)             | Owner checks availability on desktop/mobile  | **0-1 reads** — authenticated `DATA_READ` gate runs before permission and store lookup; rate-limited checks perform no Firestore reads |
| Brand OBP outlet list               | `stores` (WHERE tenantId + active)     | Brand OBP store selector (multi-store)       | **N reads** — cached 60s, only multi-store brands                  |
| Custom domain verify                | Vercel API (not Firestore)             | Owner clicks "Check Verification"            | **0 Firestore reads** — Vercel API only                            |
| MyCodex host classification         | None                                   | Requests to `menulist.digital`               | **0 Firestore reads** — product-domain registry + local markdown   |
| MyCodex crawler restriction         | None                                   | MyCodex pages and `robots.txt`               | **0 Firestore reads** — metadata, headers, and static text only    |
| MyCodex PWA manifest/assets         | None                                   | Install metadata and app icons               | **0 Firestore reads** — static manifest, icons, splash files, and service worker only |

**Net public page read impact:** Same as before for single-store (cached). Multi-store adds 0-1 conditional read (cached 60s).

CDN cache headers (`s-maxage=60, stale-while-revalidate=300`) will **reduce** total reads by serving cached HTML at Vercel Edge.

---

## Writes

| Operation                           | Collection                       | When                                             | Cost Impact                                                              |
| ----------------------------------- | -------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| Store slug on project creation      | `platformSummary/projects_{sId}` | Every `addProject()` call                        | **0 additional** — slug added to existing `syncProjectToSummary()` write |
| Update slug on rename               | `platformSummary/projects_{sId}` | Every `updateProjectMetadata()` with name change | **0 additional** — slug update part of existing summary sync             |
| Store outletSlug on outlet creation | `stores/{sId}`                   | Every outlet creation                            | **0 additional** — outletSlug added to existing store doc creation       |
| MyCodex domain registration         | None                             | Static deployment-domain configuration           | **0 writes** — no Firestore document mutation                            |
| MyCodex PWA registration/assets     | None                             | Static install metadata and offline shell        | **0 writes** — no Firestore document mutation                            |

**Net write impact: ZERO additional writes.**

---

## Deletes

No deletes introduced.

---

## Migration Script (One-Time)

| Operation      | Collection                       | Scope                              | Cost                       |
| -------------- | -------------------------------- | ---------------------------------- | -------------------------- |
| Backfill slugs | `platformSummary/projects_{sId}` | All existing projects without slug | 1 read + 1 write per store |

**Estimated one-time cost:** Negligible (tens of stores × 1 read + 1 write).

---

## CDN Impact on Firebase Cost

| Metric                                       | Before                         | After                        |
| -------------------------------------------- | ------------------------------ | ---------------------------- |
| Firestore reads per public page visit        | 2-3 (store + project + blocks) | 0-1 (CDN serves cached HTML) |
| Cache hit rate (estimated)                   | 0% (no CDN headers)            | >80% (s-maxage=60)           |
| Monthly read reduction (at 10k daily visits) | —                              | ~240k fewer reads/month      |

**Net cost effect: DECREASE** from CDN caching.

---

## Collections Affected

| Collection                       | Fields Added                              | Impact                                             |
| -------------------------------- | ----------------------------------------- | -------------------------------------------------- |
| `platformSummary/projects_{sId}` | `slug`, `previousSlugs` per project entry | Marginal doc size increase (~50 bytes per project) |
| `stores/{sId}`                   | `outletSlug`                              | +10-20 bytes per outlet store                      |

No new collections created. No new indexes required.

# URL Routing Architecture — Firebase Cost Tracking

> **Audience:** Founder / Cost Control
> **Last Updated:** May 30, 2026
> **Version:** 3.1 (Phase 1 + Phase 2 + Product-Domain Guardrails)

---

## Overview

URL Routing Architecture **reduces** total Firebase reads across all public surfaces through 6 targeted optimizations. The feature itself adds zero additional writes.

The MyCodex product-domain carve-out (`menulist.digital` / `www.menulist.digital`) adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. It only changes host classification in middleware, requires Basic Auth outside localhost, serves local repository markdown from `__docs__`, and emits product-scoped no-index/no-follow crawler controls.

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

### Phase 1 — Core Reads (Per Public Page Visit)

| Operation                 | Collection                         | When                                | Cost Impact                                                        |
| ------------------------- | ---------------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| Store subdomain lookup    | `stores` (WHERE subdomain)         | Every visit via subdomain           | **1 read** — cached 60s via `unstable_cache`                       |
| Project list from summary | `platformSummary/projects_{sId}`   | Every menu page visit               | **1 read** — replaces N legacy metadata reads (ADR-10). Cached 60s |
| Full project data         | `projects/{tId}/{sId}/{projectId}` | After project selected from summary | **1 read** — inside `getCachedProject`, cached 60s                 |
| Decision Blocks           | `decisionBlocks/{tId}_{sId}_{pId}` | After project resolved              | **1 read** — optional enhancement, cached 60s                      |

### Phase 2 — Conditional Reads

| Operation                           | Collection                             | When                                         | Cost Impact                                                        |
| ----------------------------------- | -------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| Multi-store brand detection (OPT-3) | `platformSummary/storesSummary`        | OBP root for master stores only              | **1 read** — uses summary doc, not stores scan. Cached 60s         |
| Has published menu (OPT-2)          | `platformSummary/projects_{sId}`       | OBP page (single-store)                      | **1 read** — uses projectsSummary, not legacy metadata. Cached 60s |
| Outlet routing lookup               | `stores` (WHERE tenantId + outletSlug) | Slug might be outlet (master + MULTI_OUTLET) | **0-1 read** — cached 60s, only multi-store brands                 |
| Subdomain availability check        | `stores` (WHERE subdomain)             | Owner clicks "Check Availability"            | **1 read** — owner-triggered only, not public traffic              |
| Brand OBP outlet list               | `stores` (WHERE tenantId + active)     | Brand OBP store selector (multi-store)       | **N reads** — cached 60s, only multi-store brands                  |
| Custom domain verify                | Vercel API (not Firestore)             | Owner clicks "Check Verification"            | **0 Firestore reads** — Vercel API only                            |
| MyCodex host classification         | None                                   | Requests to `menulist.digital`               | **0 Firestore reads** — product-domain registry + local markdown   |
| MyCodex crawler restriction         | None                                   | MyCodex pages and `robots.txt`               | **0 Firestore reads** — metadata, headers, and static text only    |

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

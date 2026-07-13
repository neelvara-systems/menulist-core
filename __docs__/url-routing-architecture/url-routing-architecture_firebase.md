# URL Routing Architecture — Firebase Cost Tracking

> **Audience:** Founder / Cost Control
> **Last Updated:** July 2, 2026
> **Version:** 3.3 (Slug + Canonical + Product-Domain Guardrails + Source Gate)
> **Local Source Gate:** `npm run verify:url-routing-boundary`

---

## Overview

URL Routing Architecture reduces repeated public-render reads through targeted caches and summary documents, while correctness-sensitive tenant and subdomain decisions use canonical reads. Subdomain allocation now adds bounded claim-ledger reads and writes so concurrent onboarding, owner assignment, and platform rename cannot commit the same public host.

The June 29, 2026 custom-domain limiter hardening adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. `/api/domain` keeps the same Vercel/provider and store update behavior, but the domain-management rate limiter stores only HMAC-hashed owner/store key material instead of raw identifiers.

The July 6, 2026 custom-domain session document-ID boundary adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. `/api/domain` keeps the same valid add/status/remove provider calls, store reads/writes, and public cache invalidation, but validates authenticated session tenant/store IDs with the shared Firestore document-ID guard before permission checks, limiter keys, store refs, Vercel-flow diagnostics, and `revalidateMenuCache`.

The July 6, 2026 Admin subdomain rename rate-limit and scope boundary adds no Firebase reads, writes, deletes, indexes, or Cloud Functions for valid requests. `/api/admin/subdomains/rename` keeps the same platform-only public-routing mutation, collision checks, store summary update, audit log, public cache invalidation, screen invalidation, and Owner Business Assistant packet invalidation, but applies `ADMIN_SUBDOMAIN_RENAME_MUTATION` before body parsing and validates tenant/store scope with exact positive Firestore document IDs before store reads or writes. Rejected malformed or rate-limited attempts stop before Firestore work.

The July 11, 2026 durable subdomain claim boundary changes valid allocation and rename cost intentionally. `src/lib/routing/subdomainClaim.ts` reads one deterministic `platformSummary/subdomainClaim_{subdomain}` document plus bounded canonical-owner and active-history compatibility queries inside the same transaction. Owner assignment writes the canonical store, `platformSummary/storesSummary`, and current claim; changing an unpublished owner's prior slug may also mark the old claim released. Platform rename performs an initial scoped store read, repeats that store read transactionally, writes the store, summary, current claim, old redirect claim, and `subdomainRenameLog` audit document. No new collection or composite index is required. Rate-limited, malformed, unauthorized, reserved, and unavailable requests stop before mutation.

The July 11, 2026 tenant-scoped outlet slug claim boundary applies the same transactional uniqueness model to multi-location path segments. `src/lib/routing/outletSlugClaim.ts` partitions deterministic claim IDs by exact tenant document ID, so `pune` can exist in different tenants but cannot be committed by two active outlets in one tenant. Create and rename perform bounded current/history compatibility queries inside the transaction and write current/redirect claims with canonical store, tenant-list, and summary state. Deactivation releases the current claim atomically. The existing lookup indexes/queries are reused; no new collection, composite index, rules, Functions, or Firebase deployment is required.

The July 13, 2026 durable custom-domain boundary intentionally adds canonical correctness reads and claim writes. Each owner transaction reads `tenants/{tId}`, `stores/{sId}`, `platformSummary/customDomainClaim_{domain}`, and a `stores.customDomain` query capped at two rows. POST repeats that set during finalization and may read the prior claim plus prior-domain query during replacement. GET repeats the set only when explicit provider truth changes verification and now performs two bounded Vercel reads (DNS configuration plus configured-project membership); this adds no Firestore operation. DELETE performs one set before clearing routing fields. Claim writes progress through request-unique `reserved`, `current`, bounded `releasing`, and `released` states. No new collection or composite index is required because claims use deterministic documents in `platformSummary` and reuse the existing custom-domain query. These are Admin SDK app-route operations; no Firestore-rule or Firebase deploy change is required.

The June 29, 2026 subdomain-check limiter hardening adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. `/api/subdomain/check` keeps the same `DATA_READ` cheap-fail gate and active-store availability lookup, but the limiter stores only HMAC-hashed owner/tenant/store key material instead of raw identifiers.

The June 29, 2026 Domain Settings handoff diagnostic pass adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. Desktop and mobile copy/open/DNS-copy failures log bounded URL/DNS metadata only and do not change `/api/domain`, `/api/subdomain/check`, Vercel provider calls, store writes, or public cache invalidation.

The June 29, 2026 mobile subdomain response-parse hardening adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. Mobile Domain Settings caps `/api/subdomain/check` response parsing at 8KB, logs `mobile_domain_settings_subdomain_check_response_parse_failed` or `mobile_domain_settings_subdomain_check_response_invalid` with bounded status and store/domain metadata only, and does not change the route, availability lookup, valid response contract, or public cache invalidation.

The June 30, 2026 desktop subdomain response-parse hardening adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. Desktop Domain Settings caps `/api/subdomain/check` response parsing at 8KB, logs `desktop_domain_settings_subdomain_check_response_parse_failed` or `desktop_domain_settings_subdomain_check_response_invalid` with bounded status and store/domain metadata only, and does not change the route, availability lookup, valid response contract, subdomain saves, or public cache invalidation.

The June 29, 2026 mobile domain status/add response-parse hardening adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. Mobile Domain Settings caps `/api/domain` status and add-domain response parsing at 32KB, logs `mobile_domain_settings_status_response_parse_failed` / `mobile_domain_settings_status_response_invalid` and `mobile_domain_settings_add_response_parse_failed` / `mobile_domain_settings_add_response_invalid`, and requires a returned domain before local custom-domain state updates. Valid Vercel provider calls, store writes, public cache invalidation, and DNS display behavior are unchanged.

The June 30, 2026 mobile subdomain save acknowledgement hardening adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. Mobile Domain Settings now requires the existing `updateStore()` subdomain write to return an acknowledgement before local public URL state or saved copy changes; swallowed DAL fallbacks log `mobile_domain_settings_subdomain_store_update_rejected` through the existing fixed failure path.

The July 1, 2026 custom-domain remove acknowledgement hardening adds no Firebase reads, writes, deletes, indexes, or Cloud Functions beyond existing valid `/api/domain` remove route behavior. Desktop Domain Settings, embedded Custom Domain, and Mobile Domain Settings cap remove response parsing through the existing domain response readers and require `{ success: true, removed: true }` before clearing local custom-domain state. Valid Vercel provider calls, store writes, public cache invalidation, DNS display behavior, and owner-facing settings are unchanged.

The June 30, 2026 Vercel provider redirect-boundary hardening adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. The shared Vercel domain helper keeps the same add/status/remove calls and 64KB bounded response parser, but uses manual redirect handling so bearer-token domain-management requests fail closed on provider redirects instead of following a new target.

The June 30, 2026 Vercel provider timeout hardening adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. The same helper now aborts stuck Vercel add/status/remove requests with a provider timeout and clears the abort timer after each request; valid provider calls, route responses, store writes, hosted-help registry writes, and cache invalidation behavior are unchanged.

The July 5, 2026 Vercel domain provider response-parse diagnostics add no Firebase reads, writes, deletes, indexes, Cloud Functions, live provider calls, cache invalidations, or deploy steps. The shared helper keeps the same add/status/remove requests, timeout, manual redirect handling, and route compatibility fallback, but logs bounded `vercel_domain_provider_response_parse_failed` diagnostics when the 64KB provider response parser rejects. Diagnostics include method, path presence/length, query presence, response status, response OK state, max-byte cap, and source error type only; they do not log provider response text, Vercel tokens, full URLs, domains, project IDs, tenant IDs, or store IDs.

The June 30, 2026 domain settings shared request-policy consolidation adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. Desktop Domain Settings, embedded Custom Domain, and Mobile Domain Settings now use the shared authenticated browser request policy for existing `/api/domain` and `/api/subdomain/check` browser calls before bounded response parsing. Valid subdomain availability reads, custom-domain provider calls, store writes, public cache invalidation, DNS display behavior, rules, indexes, schema fields, and owner-facing settings are unchanged.

The MyCodex product-domain carve-out (`menulist.digital` / `www.menulist.digital`) adds no Firebase reads, writes, deletes, indexes, or Cloud Functions. It only changes host classification in middleware, requires a first-party MyCodex login/session cookie outside localhost, serves local repository markdown from `__docs__`, emits product-scoped no-index/no-follow crawler controls, and serves MyCodex PWA assets from static files.

The July 2, 2026 URL routing boundary source gate adds no Firebase reads, writes, deletes, indexes, Cloud Functions, live provider calls, or deploy steps. `npm run verify:url-routing-boundary` runs resolver/source/docs checks locally to keep product hosts, tenant subdomains, custom domains, middleware rewrite order, tenant headers, and active documentation aligned with runtime code.

The July 2, 2026 safe outlet path segments boundary adds no Firebase reads, writes, deletes, indexes, Cloud Functions, live provider calls, cache invalidations, or deploy steps. Brand OBP location cards, outlet OBP links, client menu outlet lookup/canonical redirects, and sitemap outlet entries normalize stored outlet slugs at render/resolve time and hide invalid legacy values instead of rewriting Firestore. Source gate: `npm run verify:url-routing-boundary`.

The July 2, 2026 safe project path segments boundary adds no Firebase reads, writes, deletes, indexes, Cloud Functions, live provider calls, cache invalidations, or deploy steps. Client menu lookup, previous-slug redirects, canonical URLs, metadata lookup, sitemap project entries, and OBP menu CTA links normalize stored project slugs at render/resolve time and hide invalid legacy values instead of rewriting Firestore. Source gate: `npm run verify:url-routing-boundary`.

The July 5, 2026 public language parameter parse fallback adds no Firebase reads, writes, deletes, indexes, Cloud Functions, live provider calls, cache invalidations, or deploy steps. Valid `?lang=xx` public links still render the same way; malformed URL parse fallbacks log bounded `public_language_param_url_parse_failed` diagnostics only and return the original URL unchanged instead of writing or mutating routing state.

The July 5, 2026 deleted-project slug reservation fail-closed update adds no Firebase reads, writes, deletes, indexes, Cloud Functions, live provider calls, cache invalidations, or deploy steps. The existing create/rename/duplicate reservation query is unchanged. If that query fails, creation and duplication treat the proposed slug as reserved and append a unique suffix, while rename and no-slug backfill refuse the new slug through the same path used for a confirmed 90-day reservation. This preserves QR/public URL permanence without changing normal valid slug creation, confirmed reservation handling, summary schema, or public resolver behavior.

The July 5, 2026 tenant sitemap lookup diagnostic cap added no Firebase reads, writes, deletes, indexes, Cloud Functions, live provider calls, cache invalidations, or deploy steps at that time. The July 10, 2026 identity-boundary correction later replaced sitemap/Brand-OBP/OBP-mode `storesSummary` reads with tenant-filtered canonical `stores` queries because a client-writable summary cannot be public tenant or store authority. Failed lookup paths still return an empty sitemap or omit project/outlet entries, and bounded `tenant_sitemap_*_failed` diagnostics remain.

### Cost Optimization Summary (Implemented Feb 19, 2026)

| #     | Optimization                                                  | Surface         | Reads Saved Per Visit | Annual Savings (10K visits/day) |
| ----- | ------------------------------------------------------------- | --------------- | --------------------- | ------------------------------- |
| OPT-1 | Eliminate redundant `getStoreById()` in OBP                   | OBP             | **1 read**            | ~3.6M reads/year                |
| OPT-2 | `checkHasPublishedMenu` uses projectsSummary                  | OBP             | **N→1 reads**         | Variable                        |
| OPT-3 | `countActiveStoresForTenant` uses cached tenant-filtered canonical stores (correctness boundary) | OBP | summary optimization intentionally removed | Security/correctness over denormalized-read savings |
| OPT-5 | Eliminate redundant `getStoreById()` in menu page             | Client Menu     | **1 read**            | ~3.6M reads/year                |
| OPT-6 | Add `unstable_cache` to digital screen SSR                    | Digital Screens | **4 reads/SSR**       | ~5.8M reads/year (1K screens)   |
| CDN   | `s-maxage=60, stale-while-revalidate=300` on all client pages | All             | **~80% reduction**    | Massive                         |

---

## Reads

### Core Reads (Per Public Page Visit)

| Operation                 | Collection                         | When                                | Cost Impact                                                        |
| ------------------------- | ---------------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| Store subdomain lookup    | `stores` (WHERE subdomain) + referenced `tenants/{tId}` eligibility | Every visit via subdomain | **2 reads on a cold unique hit** — store is the rendered payload; tenant is eligibility-only; cached 60s via `unstable_cache` |
| Store custom-domain lookup | `stores` (WHERE customDomain + verified + active) + referenced `tenants/{tId}` eligibility | Every visit via a verified custom domain | **2 reads on a cold unique hit** — duplicate store rows fail closed; tenant is never rendered; cached 60s |
| Project list from summary | `platformSummary/projects_{sId}`   | Every menu page visit               | **1 read** — replaces N legacy metadata reads (ADR-10). Cached 60s |
| Full project data         | `projects/{tId}/{sId}/{projectId}` | After project selected from summary | **1 read** — inside `getCachedProject`, cached 60s                 |
| Decision Blocks           | `decisionBlocks/{tId}_{sId}_{pId}` | After project resolved              | **1 read** — optional enhancement, cached 60s                      |

### Conditional Reads

| Operation                           | Collection                             | When                                         | Cost Impact                                                        |
| ----------------------------------- | -------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| Multi-store brand detection (OPT-3) | `stores` (WHERE tenantId)              | OBP root for master stores only              | **N canonical rows** — cached 60s; client-writable summary is not public authority |
| Has published menu (OPT-2)          | `platformSummary/projects_{sId}`       | OBP page (single-store)                      | **1 read** — uses projectsSummary, not legacy metadata. Cached 60s |
| Outlet routing lookup               | `stores` (WHERE tenantId + outletSlug) | Slug might be outlet (master + MULTI_OUTLET) | **0-1 read** — cached 60s, only multi-store brands                 |
| Subdomain availability check        | Canonical `stores/{sId}` + `platformSummary` claim + bounded `stores` owner/history queries | Main-location owner checks availability on desktop/mobile | One canonical owner-store read, one deterministic claim read, and two bounded collision/history queries in a read-only transaction; rate-limited, unauthorized, invalid, or explicit-outlet checks stop first |
| Brand OBP outlet list               | `stores` (WHERE tenantId + active)     | Brand OBP store selector (multi-store)       | **N reads** — cached 60s, only multi-store brands                  |
| Custom domain status                | Canonical tenant/store + deterministic claim + bounded store-domain query, then Vercel | Owner opens/clicks verification | **4 Firestore reads normally; up to 8 when verification changes** because the post-provider transaction rechecks the exact current scope before writing |
| MyCodex host classification         | None                                   | Requests to `menulist.digital`               | **0 Firestore reads** — product-domain registry + local markdown   |
| MyCodex crawler restriction         | None                                   | MyCodex pages and `robots.txt`               | **0 Firestore reads** — metadata, headers, and static text only    |
| MyCodex PWA manifest/assets         | None                                   | Install metadata and app icons               | **0 Firestore reads** — static manifest, icons, splash files, and service worker only |

**Net public page read impact:** A cold unique public store hit now includes one canonical tenant eligibility read in addition to the store query. The combined helper remains cached for 60 seconds, and tenant data is not returned to rendering. Multi-store routing adds its existing conditional canonical reads.

CDN cache headers (`s-maxage=60, stale-while-revalidate=300`) will **reduce** total reads by serving cached HTML at Vercel Edge.

The July 11, 2026 legacy master-store compatibility reads apply only when the canonical store lacks an `isMaster` marker. That fallback issues at most four `stores` queries (`tenantId` and `tId`, each with exact string and numeric tenant values), each capped at `.limit(2)`, and allows assignment only when the current store is the sole result after deduplication. Explicit masters and outlets do not run those topology queries; rejected outlets add no writes. This adds no collection, composite index, Firestore/Storage rule, Cloud Function, or Firebase deploy target.

---

## Writes

| Operation                           | Collection                       | When                                             | Cost Impact                                                              |
| ----------------------------------- | -------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| Store slug on project creation      | `platformSummary/projects_{sId}` | Every `addProject()` call                        | **0 additional writes** — slug is included in the atomic project/summary creation transaction |
| Update slug on rename               | `platformSummary/projects_{sId}` | Every `updateProjectMetadata()` with name change | **0 additional** — slug update part of existing summary sync             |
| Store outletSlug on outlet creation | `stores/{sId}`                   | Every outlet creation                            | **0 additional** — outletSlug added to existing store doc creation       |
| Claim owner subdomain               | `platformSummary/subdomainClaim_{subdomain}` | Onboarding or owner assignment | **1 current-claim write** in the same transaction as canonical store creation/update; an old unpublished claim may also be released |
| Preserve admin rename redirect      | `platformSummary/subdomainClaim_{oldSubdomain}` | Platform legal/support rename | **1 redirect-claim write** in the same transaction as the new current claim, canonical store, summary, and audit writes |
| Reserve/connect custom domain       | `platformSummary/customDomainClaim_{domain}` + `stores/{sId}` | `POST /api/domain` | **1 reservation claim write, then 1 store + 1 current-claim write**; replacement adds old `releasing` and later `released` claim writes |
| Reconcile custom-domain verification | `stores/{sId}` | `GET /api/domain` only when explicit provider truth differs | **0 writes when unchanged; 1 store write on configured or explicitly misconfigured transition** |
| Remove custom domain                | `platformSummary/customDomainClaim_{domain}` + `stores/{sId}` | `DELETE /api/domain` | **1 releasing claim + 1 store write, then 1 released-claim write after successful/404 provider cleanup** |
| MyCodex domain registration         | None                             | Static deployment-domain configuration           | **0 writes** — no Firestore document mutation                            |
| MyCodex PWA registration/assets     | None                             | Static install metadata and offline shell        | **0 writes** — no Firestore document mutation                            |

**Net write impact:** bounded claim-ledger writes are now part of valid subdomain allocation and rename. Public page rendering adds no claim writes.

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

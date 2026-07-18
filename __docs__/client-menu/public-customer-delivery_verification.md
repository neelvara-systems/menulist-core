# Public Customer Delivery End-To-End Verification

**Status:** Local source complete; deployment and hosted browser/device evidence pending
**Verified:** July 16, 2026
**Authority:** Current route/runtime code, shared public-truth helpers, focused tests, and maintained docs.

## Covered flow

This pass traced public delivery from request authority to the customer-visible result:

1. subdomain, previous-subdomain, verified custom-domain, and canonical tenant/store lifecycle resolution;
2. root OBP, multi-location brand selector, outlet OBP, current project slug, previous-slug redirect, `/menu` Layer 1/Layer 2 behavior, and unknown/deleted-menu recovery;
3. summary-to-full-project resolution, linked master inheritance, active special-menu consumption, public language selection, schema, canonical metadata, robots, and error/noindex behavior;
4. the React client payload used by the customer menu;
5. tenant sitemap generation and cache invalidation;
6. Customer App manifest identity/start URL and existing shortcut/service-worker policy;
7. MenuList public pull API project selection; and
8. parity with OBP, Customer App, client-menu, URL-routing, and pull-API documentation.

Media object lifecycle remains item 5 in the strict audit tracker. Feedback/review submission internals remain item 7, special-menu scheduler mutation remains item 9, and custom-domain/compliance mutation internals remain item 13. Their public consumption was checked here without pre-empting those later audits.

## Findings fixed

| Finding | Code-truth fix |
| --- | --- |
| An unknown supplied project slug could fall through to the default/first project and show the wrong menu | Supplied misses now fail to the existing not-available ladder. Literal `/menu` is the only alias exception and is default-only; first-project fallback remains only for the no-slug OBP emergency rollback path. |
| The full canonical store document crossed into `ClientMenuRenderer` | `projectPublicClientStore()` now exposes an explicit browser DTO. Credentials, roles, billing/licence state, contact-person data, POS/integration secrets, notification settings, and unknown future fields remain server-side. |
| Project sanitization was blacklist-based and retained source-upload/extraction/owner-workflow metadata | `sanitizeForClient()` now returns an explicit top-level DTO, removes source file metadata and extraction diagnostics/profile suggestions, hides owner ranking/quality state and decision-fact provenance, removes inactive items/categories/attributes, and projects public image URL variants only. |
| OBP CTA summaries, sitemap, manifest, and pull API did not all prove project IDs belonged to the current tenant/store | All four consumers now validate the immutable project ID's embedded tenant/store scope before using the summary row. |
| Tenant sitemap duplicated store resolution and could index a store the page resolver rejected | Sitemap master resolution now reuses `getStoreBySubdomain()` / `getStoreByCustomDomain()`, validates outlet document/store/tenant identity, and emits no sitemap from a previous-subdomain host. |
| Sitemap project cache used a stale global `projects-summary` tag with no matching invalidation | Per-store summary caches now use `menu-store-{storeId}`, `store-{storeId}`, and `client-stores`; outlet summary reads run in parallel within the existing 30-outlet cap. |
| Sitemap outlet discovery trusted the create-route cap but did not enforce a query/fanout ceiling for malformed legacy data | Canonical store discovery now reads at most the master plus 30 outlets and one overflow sentinel. Overflow omits outlet entries and prevents unbounded summary fanout; valid tenant output is unchanged. |
| Customer App could choose `/menu` for any active summary row even when `/menu` had no resolvable target | Manifest chooses `/menu` only for a scoped active regular owner-claimed `menu` project or explicit default; otherwise start URL is `/`, and the misleading View Menu shortcut is omitted. |
| Maintained docs claimed `menu` was reserved/universally backed, root opened the default menu, and the read ceiling was three/five | Docs now match owner-claim + explicit-default semantics, OBP root, four normal cold reads, and the true eight-read worst path. |

## Firebase and deployment impact

- No Firestore rules, indexes, Storage rules, or Cloud Function source changed.
- No new Firestore reads or writes were added to normal page rendering. Valid sitemap tenants use the same store reads with parallel outlet-summary latency and correct per-store invalidation tags; malformed over-cap tenants are bounded to 32 store reads and no outlet-summary fanout.
- The browser projections reduce serialized public payload size and prevent future canonical-document fields from becoming public by default.
- These are Next.js/app and documentation changes. Vercel deployment was not authorized and was not run.

## Local evidence

Passed on the current worktree:

- `npm run verify:public-customer-delivery`
- `npm run verify:url-routing-boundary`
- `npm run verify:customer-app-pwa`
- `npm run verify:official-business-page-boundary`
- `npm run verify:platform-pull-api-boundary`
- `npm run verify:public-business-truth`
- `npm run test:summary-project-boundaries`
- `npm run verify:doc-npm-scripts`
- `npm run docs:check-links` (zero broken links; existing generated-video naming warnings remain)
- `npx tsc --noEmit --incremental false --pretty false`
- scoped ESLint for all changed runtime and verification files

## Pending owner/release evidence

After an approved QA app release, verify the hosted route matrix on a single-store and multi-location tenant across current subdomain, verified custom domain, current/previous outlet and project slugs, owner-claimed `/menu`, default-backed `/menu`, no-default `/menu`, unknown slug, inactive/deleted/blocked state, and previous-subdomain redirect. Confirm canonical/noindex/sitemap/robots output, low-bandwidth/mobile/back behavior, installed-PWA start and shortcuts, public pull API success/failure/ETag behavior, and that browser/RSC payloads contain no canonical store credentials or internal project workflow metadata.

# MenuList Production Readiness Audit

**Audit date:** June 11, 2026  
**Product:** MenuList  
**Stage:** Stage 6 system audit with Stage 5 feature hardening loop  
**Current verdict:** **Not production ready** as a full-system certification, because the high-risk feature clusters and whole-app visual/runtime QA are controlled-owner-testing ready after the fixes below, but provider sandbox smoke, real mobile device QA, Firebase Function deployment, and production deploy smoke remain pending or blocked where noted. Authenticated platform-owner HTTP smoke passed for the audited ops/internal routes, Chrome visual QA found and fixed platform dashboard layout issues, and the follow-up pass covered public website, owner desktop, forced mobile shell, public tenant menu/OBP/compliance/feedback, public API fail-closed behavior, and authenticated localhost `npm run dev` route checks. Firestore rules for Digital Screens, Analytics/Feedback/Reviews, and Roles/Auth slices were deployed successfully. Firebase Function deployment for extraction, Decision Intelligence, messaging cleanup, and lifecycle notification hardening remains blocked by the `ecomsai` billing-disabled Secret Manager error.

This report tracks the feature-by-feature production-readiness pass requested for MenuList. Codebase truth is treated as primary. Docs are corrected only after runtime behavior is verified.

---

## Feature Inventory

Inventory sources used:

- `__docs__/index.md`
- `src/app/(main)/`
- `src/app/client/[[...slug]]/`
- `src/app/(website)/`
- `src/app/api/`
- `src/components/templates/main-app/`
- `src/components/templates/website/`
- `src/lib/`
- `src/constants/database.ts`
- `src/config/features.ts`

MenuList feature families queued for audit:

1. Client Menu (QR), public menu rendering, analytics tracking, AutoSell/decision blocks
2. Official Business Page (OBP), public metadata, sitemap, robots, discovery policy
3. URL Routing Architecture, tenant/domain routing, custom domains, public cache
4. Projects/Menu Builder parent flow
5. AI data extraction, upload/file processing, extraction review, public `/create-menu`
6. Data editor, B2B/B2C views, description generation, multi-language translation
7. AI image generation and media/image systems
8. Continuous Menu Intelligence, Decision Intelligence, MCE, output control
9. Digital Screens
10. Stores Management, Business Settings, PWA/customer app settings, compliance pages, temporary status
11. Multi-Outlet Consistency, store onboarding, outlet policy, master-update awareness
12. Multi-Chain Permissions, Roles & Permissions, Staff/user management
13. Authentication and auth onboarding
14. Billing, subscriptions, Razorpay, AI capacity/top-ups, reseller dashboard
15. Analytics dashboards, ROI metrics, owner dashboard, Today, business health/Owner Business Assistant
16. Reviews & Reputation, guest feedback/customer feedback loop
17. GBP Sync, Hours & Holiday Accuracy, Pricing Integrity System, POS Webhook Sync
18. Physical Surfaces, print assets, menu card export, Use MenuList kit
19. Staff Prompt, messaging onboarding, owner notifications, lifecycle messaging
20. Main Website (menulist.ai), resources, pricing/get-started/create-menu/trust/legal pages
21. Security, system strengthening, ops/safe mode, platform monitoring dashboards

Non-MenuList surfaces found and intentionally excluded unless separation hardening is required:

- Answerlattice routes, APIs, Firebase clients, and docs
- GrowthOS/Growth products unless they affect MenuList boundaries
- MyCodex private reader
- Website Asset Operating System internal package

---

## Follow-Up Audit: Owner Dashboard And Transactions Route And Language Support

**Audit date:** June 11, 2026  
**Scope:** Owner desktop dashboard, forced owner mobile dashboard, desktop Transactions, forced mobile Transactions, shared AI-operation transaction presentation, route-level localhost behavior, and locale-key coverage.

### Feature Identification

Relevant runtime files inspected and changed:

- `src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx`
- `src/components/templates/main-app/dashboard/OwnerDashboard/ViewModeTabs.tsx`
- `src/components/templates/main-app/dashboard/OwnerDashboard/TodaySoFarCard.tsx`
- `src/components/templates/main-app/dashboard/OwnerDashboard/DailyView.tsx`
- `src/components/templates/main-app/dashboard/OwnerDashboard/WeeklyView.tsx`
- `src/components/templates/main-app/dashboard/OwnerDashboard/MonthlyView.tsx`
- `src/components/templates/main-app/dashboard/OwnerDashboard/OverviewView.tsx`
- `src/components/templates/main-app/dashboard/OwnerDashboard/OverallFooter.tsx`
- `src/components/templates/main-app/dashboard/OwnerDashboard/OBPMetricsCard.tsx`
- `src/components/templates/main-app/dashboard/OwnerDashboard/MenuAnalyticsDetailsCard.tsx`
- `src/components/templates/main-app/dashboard/OwnerDashboard/OwnerActionPlanCard.tsx`
- `src/components/templates/main-app/dashboard/OwnerDashboard/DashboardProjectSelector.tsx`
- `src/components/templates/main-app/dashboard/OwnerDashboard/AISummaryCard.tsx`
- `src/components/templates/main-app/dashboard/OwnerDashboard/TopItemsList.tsx`
- `src/components/templates/main-app/dashboard/OwnerDashboard/HealthSignalCards.tsx`
- `src/components/templates/main-app/dashboard/OwnerDashboard/GoogleListingCard.tsx`
- `src/components/templates/main-app/dashboard/OwnerDashboard/BehaviorNudgeCard.tsx`
- `src/components/templates/main-app/dashboard/OwnerDashboard/HoursFreshnessNudge.tsx`
- `src/components/templates/main-app/dashboard/MenuQualitySignals.tsx`
- `src/components/templates/main-app/dashboard/AnalyticsDashboard/CustomerAppMetrics.tsx`
- `src/components/mobile/screens/MobileDashboardScreen.tsx`
- `src/components/mobile/screens/dashboardSections/MobileMenuAnalyticsDetailsCard.tsx`
- `src/components/mobile/screens/dashboardSections/MobileOBPMetricsCard.tsx`
- `src/components/mobile/screens/dashboardSections/MobileCustomerAppMetrics.tsx`
- `src/components/mobile/screens/dashboardSections/MobileOwnerActionPlanCard.tsx`
- `src/components/templates/main-app/transactions/index.tsx`
- `src/components/templates/main-app/transactions/TransactionDetailsModal.tsx`
- `src/components/templates/main-app/transactions/transaction-details/DescriptionDetailsView.tsx`
- `src/components/templates/main-app/transactions/transaction-details/ImageProcessingDetailsView.tsx`
- `src/components/templates/main-app/transactions/transaction-details/LanguageDetailsView.tsx`
- `src/components/mobile/screens/MobileTransactionsScreen.tsx`
- `src/lib/ai/operationPresentation.ts`
- `src/lib/analytics/ownerDashboardDetails.ts`
- `public/locales/menulist.ai/en-US.json`
- `public/locales/menulist.ai/ar-SA.json`
- `public/locales/menulist.ai/bn-IN.json`
- `public/locales/menulist.ai/en-GB.json`
- `public/locales/menulist.ai/es-ES.json`
- `public/locales/menulist.ai/gu-IN.json`
- `public/locales/menulist.ai/hi-IN.json`
- `public/locales/menulist.ai/mr-IN.json`
- `public/locales/menulist.ai/ta-IN.json`
- `public/locales/menulist.ai/te-IN.json`
- `public/locales/menulist.ai/zh-CN.json`
- `src/i18n/request.ts`

Surfaces covered:

- Owner dashboard: yes, desktop route, dashboard mode tabs, analytics/detail cards, status cards, project selector, no-action states, and forced mobile dashboard route.
- Mobile owner flow: yes, `?mobileAudit=1` dashboard and `/transactions` mapped through `MobileShell`, plus mobile dashboard section cards used by that shell.
- Public/customer page: no runtime change.
- Official Business Page: no runtime change.
- Website/marketing claim: no runtime change.
- Admin/internal operations: yes, platform-owner-visible transaction debug labels were localized.
- Billing/entitlement: no runtime change.
- Analytics/feedback/reviews: dashboard analytics presentation only; no analytics data model change.
- Multi-location behavior: no runtime change.
- Cache/public truth: no runtime change.

### End-To-End Request/Data Flow

Dashboard:

1. Authenticated owner opens `/dashboard`.
2. Main layout resolves session and wraps the route in `LocalisationProvider`.
3. `OwnerDashboard` reads selected store/project state and calls existing dashboard hooks.
4. Desktop dashboard shell now reads headings, tab labels, helper copy, and error state from `Dashboard.owner`.
5. Dashboard subcomponents build detail rows, OBP metrics, customer-app metrics, health signals, action plans, no-action states, and quick stats from `Dashboard.owner`.
6. Forced mobile shell opens `/dashboard?mobileAudit=1` and routes to the mobile Today/Dashboard screen through `MobileShell`.
7. `MobileDashboardScreen` and mobile dashboard section cards now read view-mode labels, metric labels, helper copy, cards, empty states, action-plan copy, and OBP/customer-app detail labels from `MobileDashboard` or shared `Dashboard.owner` keys.

Transactions:

1. Owner opens `/transactions` or mobile `/transactions?mobileAudit=1`.
2. Desktop/mobile screens call existing `getPaginatedAiOperations()` pagination.
3. Firestore/API read behavior is unchanged: paginated, 15 records per page, no listener.
4. Shared action labels, credit text, and owner summaries now flow through `src/lib/ai/operationPresentation.ts` with an optional `Transactions` translator and English fallbacks.
5. Desktop table, details modal, nested language/description/image panels, mobile list, mobile detail sheet, and filter sheet use `Transactions` keys.
6. Missing locale keys remain safe because `src/i18n/request.ts` deep-merges every selected locale over `en-US`.

### Correctness Findings And Fixes

Fixed:

- Desktop Transactions had hard-coded `Result`, `Credits Used`, page counters, paging buttons, filter state, and detail-modal labels.
- Mobile Transactions had hard-coded filter validation messages, detail sheet labels, empty state, platform debug labels, and transaction summaries.
- Shared transaction presentation helpers returned English-only action labels, owner summaries, and credit labels, which affected both desktop and mobile.
- Desktop dashboard shell had hard-coded view headings, tab labels, helper copy, and error state.
- Mobile dashboard top-level labels still depended on hard-coded `VIEW_MODE_CONFIG` labels and local string literals for key metric and helper copy.
- Deeper desktop dashboard cards still had hard-coded owner copy in Today, Daily, Weekly, Monthly, Overview, Overall, OBP, customer-app metrics, AI summary, top-items, quality signals, health signals, behavior nudges, Google listing, and hours freshness surfaces.
- Deeper mobile dashboard cards still had hard-coded owner copy in menu analytics details, OBP metrics, customer-app metrics, and owner action-plan sections.
- The monthly dashboard used a non-pluralized activity-days label that produced `1 days of activity recorded`.

Implementation notes:

- Existing transaction data, raw model output, IDs, language names, item names, and platform debug JSON remain unmodified.
- No entitlement, auth, billing, Firebase, cache, or public-route behavior was changed.
- Answerlattice action labels remain only ledger labels inside the shared AI operation transaction history; no Answerlattice route, collection, or behavior was changed.
- Non-English locale files were deep-filled with the new `Dashboard.owner` and `MobileDashboard` key structure from `en-US` to prevent runtime missing-key failures. This is runtime-safe fallback coverage, not a completed human translation pass.

### Firebase Cost Audit

Transactions:

- Reads per first page: unchanged existing paginated AI-operation read, page size 15.
- Writes per owner action: unchanged, none from this pass.
- Listener usage: unchanged, no new realtime listener.
- N+1 risk: unchanged; project names still load only when the current page includes project IDs.
- Cache behavior: unchanged; this feature is owner ledger UI and does not invalidate public truth.

Dashboard:

- Reads per page load: unchanged existing dashboard/OBP/business-health hooks.
- Writes per owner action: unchanged, none from this pass.
- Listener usage: unchanged.
- Public cache: no public truth write path touched.

Cost verdict for this follow-up: no new Firebase reads, writes, listeners, indexes, Cloud Functions, cache tags, or public revalidation paths.

### UI/UX And Mobile Parity

Verified on `npm run dev` localhost:

- Desktop `/dashboard?e-locale=hi-IN` returned `200 OK` and rendered for the authenticated platform-owner test user.
- Desktop dashboard mode tabs were visually checked in Chrome for `Overview`, `Yesterday`, `Last 7 Days`, `This Month`, `Overall`, and `Today` with no missing translation-key text.
- Desktop `/transactions?e-locale=hi-IN` returned `200 OK` and rendered the transaction table/list without missing transaction-key text.
- Forced mobile `/dashboard?mobileAudit=1&e-locale=hi-IN#mobile/today/dashboard` returned `200 OK` and rendered the mobile dashboard route through `MobileShell` without missing translation-key text.
- Forced mobile `/transactions?mobileAudit=1&e-locale=hi-IN` returned `200 OK` and rendered the mobile Transactions route without missing translation-key text.

Remaining UI/language parity risks:

- Supported-language translations are now present for the newly added `Dashboard.owner` and `MobileDashboard` keys across `ar-SA`, `bn-IN`, `es-ES`, `gu-IN`, `hi-IN`, `mr-IN`, `ta-IN`, `te-IN`, and `zh-CN`, with `en-GB` using British-English wording where it differs. Native-speaker review remains recommended before treating these strings as final copy.
- Chrome visual QA completed the desktop dashboard tab cycle before the Chrome native pipe dropped. In-app Browser fallback verified route render and missing-key absence for mobile routes, but a local offline modal blocked reliable interactive switching of every mobile dashboard sub-tab.
- Current in-app Browser clicks on the Transactions table action buttons did not reopen the detail modal during the final fallback pass. The transaction details modal had already been covered in the earlier Chrome pass, but it should be re-run once the Chrome pipe is reconnected.

### Documentation Alignment

Updated:

- `__docs__/audits/menulist-production-readiness-audit.md`
- `__docs__/CHANGELOG.md`

Docs were aligned only to verified runtime behavior. No future capability was documented as shipped.

### Validation

Commands run:

- `npx tsc --noEmit --incremental false --pretty false` - passed
- `npm run lint` - passed
- `git diff --check` - passed
- Locale coverage script for `Dashboard.owner` and `MobileDashboard` keys across all `public/locales/menulist.ai/*.json` files - passed
- Locale translation integrity script for `Dashboard.owner` and `MobileDashboard` - passed with zero missing keys, zero broken placeholders, zero leftover translation placeholder tokens, and zero ICU plural issues across all supported locale files.
- `npm run dev` - passed for localhost validation
- HTTP route probes with `e-locale=hi-IN` returned `200 OK` for `/dashboard`, `/transactions`, `/dashboard?mobileAudit=1`, and `/transactions?mobileAudit=1`.
- Chrome visual/DOM QA passed for the desktop dashboard route and mode tabs, desktop Transactions route, and earlier transaction details modal coverage. In-app Browser fallback verified desktop dashboard, mobile dashboard route, desktop Transactions route, and mobile Transactions route after a clean `.next` cache reset.
- `npm run build` was intentionally not run per owner instruction to validate on `npm run dev` localhost instead.

Known runtime notes:

- Local dev logs showed Upstash rate-limit provider timeouts during auth/access-status checks; route responses still completed. This is an environment/provider latency issue already isolated from this localization pass.
- A local aborted `set-claims` request appeared during mobile route switching; the authenticated session remained valid and the tested routes rendered. This pass did not modify claims behavior.

### Follow-Up Verdict

**Controlled owner testing ready for Dashboard and Transactions desktop/mobile route and supported-language coverage.**

This is not a full MenuList application certification and not a native-speaker translation certification. It covers the Dashboard and Transactions route family end to end for route availability, source-level string coverage, Firebase-cost preservation, runtime missing-key safety, and translated Dashboard/MobileDashboard locale values across the supported locale files.

---

## Follow-Up Audit: MenuList Route Inventory And Localhost Smoke

**Audit date:** June 11, 2026  
**Scope:** MenuList `src/app` page-route inventory, authenticated localhost page-route smoke, route-handler inventory, mobile shell route mapping, public/static discovery handlers, and product-boundary separation.

### Route Inventory

Source inventory from `src/app` found:

- 103 MenuList page routes.
- 115 MenuList API route handlers.
- 5 MenuList public/static route handlers.
- 103 Answerlattice page routes, intentionally excluded from MenuList QA.
- 2 CampaignCue page routes, intentionally excluded from MenuList QA.
- 5 MyCodex page routes, intentionally excluded from MenuList QA.

The MenuList mobile owner shell maps desktop owner routes into `MobileShell` through `OWNER_PATH_TO_MOBILE_ROUTE`, `PLATFORM_PATH_TO_MORE_SCREEN`, `OPS_PATH_TO_MORE_SCREEN`, and `RESELLER_PATH_TO_MORE_SCREEN` in `src/components/mobile/MobileShell.tsx`. Source inspection covered the mapped owner/mobile route families for Dashboard, Today, Projects/Menu, Share/Use MenuList, Assets/Print Assets, Print Menu, QR, Feedback, Business Settings, Transactions, Billing, Locations, Users, Roles, Platform, Ops, and Reseller screens.

### Localhost Page Smoke

Validation used `npm run dev` on localhost, not `npm run build`.

Authenticated smoke:

- A fresh in-memory NextAuth credentials session was established for the platform-owner account.
- 101 non-Sentry MenuList page routes were fetched with `?e-locale=hi-IN`.
- 100 routes returned `200`.
- The explicit `/404` page returned `404`, as expected for that route.
- 0 tested routes returned `5xx`, timed out, or rendered `MISSING_MESSAGE`, `IntlError`, or `application error` markers.
- 2 routes were skipped because they intentionally trigger monitoring errors: `/test-sentry` and `/platform/test-sentry`.

Route behavior observed:

- `/ops/extraction`, `/ops`, and `/ops/scheduler` redirect to their current platform monitor routes.
- `/qrCode` redirects to `/qr-code`.
- `/product` redirects to `/how-it-works`.
- Platform-host `/client` and `/client/pwa/*` placeholders redirect to `/` without crashing. This is not proof of tenant-menu rendering; tenant-host customer menu proof remains tracked under the public truth routing audit.

### API Route Inventory

Static API inventory found 115 MenuList API handlers:

- 83 handlers expose `POST`.
- 41 handlers expose `GET`.
- 3 handlers expose `DELETE`.
- 5 handlers expose `OPTIONS`.
- 2 handlers expose `PATCH`.

This pass did not bulk-call POST, PATCH, or DELETE route handlers because many are mutating billing, staff, outlet, public truth, image, extraction, POS, notification, or owner-assistant operations. GET API routes were covered only where already exercised by the route/page QA or targeted feature QA, such as auth/session/access-status, transactions AI operations, owner-business-assistant current state, and platform monitor reads. This preserves Firebase cost discipline and avoids destructive side effects.

### Public Static Route Findings

Safe public/static probes:

- `/sitemap.xml` returned `200`.
- `/manifest.webmanifest` returned `{}` with `404` on the platform host, which matches the route contract: the customer-app manifest is tenant-host only.
- `/client/robots.txt`, `/client/robots`, and `/client/sitemap.xml` redirected to `/` on the platform host.
- The active platform-owner store returned `{"hasDomain":false}` from `/api/domain`, so this pass did not have a configured current tenant subdomain for tenant-host manifest proof.

### Firebase Cost Impact

- Page-route smoke caused normal page-load reads for owner/platform/public routes and should not be treated as a production workload.
- No mutating API route was called in the all-routes smoke.
- No new reads, writes, listeners, indexes, Cloud Functions, revalidation paths, or cache tags were added by this route audit.
- Bulk API mutation smoke was explicitly avoided to prevent unnecessary Firestore writes and billing/provider side effects.

### Remaining Route QA Gaps

- Full visual QA of every mobile `MoreSubScreen` remains pending. The source route map is covered, and Dashboard/Transactions mobile routes were visually checked, but every mobile sub-screen was not interactively opened because Chrome's native pipe dropped and the in-app browser showed a local offline overlay during mobile shell testing.
- Tenant-host manifest and tenant-host customer PWA shortcuts need a configured test store subdomain/custom domain. The active platform-owner test store had no domain configured.
- API handlers are inventoried, but not all are live-called. Mutating handlers require feature-by-feature tests with fixture data and explicit expected write/cost assertions.

### Follow-Up Verdict

**Controlled owner testing ready for MenuList page-route availability on localhost.**

This is still not a full production certification. The page routes are smoke-clean under `npm run dev`; API mutation routes and every mobile sub-screen still require feature-specific QA before claiming full MenuList route certification.

---

## Completed Audit 1: Public Truth Routing, Client Menu, OBP Cache

### A. Feature Identification

**Feature cluster:** Public client menu + OBP + tenant/domain routing + public cache invalidation.

Relevant routes and files inspected:

- `src/middleware.ts`
- `src/lib/multiTenant/domainResolver.ts`
- `src/constants/productDomains.ts`
- `src/constants/urls.ts`
- `src/app/client/[[...slug]]/page.tsx`
- `src/app/client/sitemap.ts`
- `src/app/client/robots.ts`
- `src/app/api/revalidate/menu/route.ts`
- `src/lib/cache/publicClientCache.ts`
- `src/lib/actions/revalidateMenuCache.ts`
- `src/lib/firestore/clientStoreLookup.ts`
- `src/lib/seo/publicTruthIndexing.ts`
- `src/components/templates/website/clientWebsite/index.tsx`
- `src/components/templates/website/mainContentRenderer/index.tsx`
- `__docs__/client-menu/PUBLIC-ROUTING-DOCTRINE.md`
- `__docs__/client-menu/client-menu_firebase.md`
- `__docs__/url-routing-architecture/url-routing-architecture_firebase.md`

Affected surfaces:

- Owner dashboard: yes, via writes that call public cache revalidation.
- Mobile owner flow: yes, through shared project/store/multi-outlet DAL cache invalidation.
- Public menu/customer page: yes.
- Official Business Page: yes.
- Website/marketing claim: indirectly, through public truth and discovery promises.
- Admin/internal operations: yes, platform entity blocking and public cache revalidation.
- Billing/entitlement: no direct changes in this slice.
- Analytics/feedback/reviews: analytics write path noted; not fully audited yet.
- Multi-location behavior: yes, outlet slug and master project resolution.
- Cache/public truth: yes.

Feature flags inspected:

- `ENABLE_OBP`
- `ENABLE_MULTI_OUTLET`
- `ENABLE_SPECIAL_MENU_SWITCHING`
- `ENABLE_PUBLIC_MENU_RETRIEVAL_FOUNDATION`
- `ENABLE_CUSTOMER_APP_PWA`
- `ENABLE_COMPLIANCE_PAGES`

Firebase collections inspected for this slice:

- `stores`
- `tenants`
- `platformSummary`
- `projects`
- `analytics`
- owner-business-assistant packet cache invalidation path

### B. End-to-End Request/Data Flow

Tenant/public request flow:

1. Middleware classifies host using `resolveDomain()`.
2. Product domains are routed before tenant domains to preserve Answerlattice/MyCodex separation.
3. Tenant subdomain/custom domain requests rewrite into `/client`.
4. `/robots.txt` and `/sitemap.xml` stay tenant-aware instead of bypassing middleware.
5. Client page resolves store via `getStoreBySubdomain()` or `getStoreByCustomDomain()`.
6. Root path renders OBP when `ENABLE_OBP` is on.
7. Multi-outlet master paths check first segment with `getStoreByOutletSlug()`.
8. Project routing reads `platformSummary/projects_{storeId}` first, then reads the resolved project doc by immutable project ID.
9. `/menu` works as a two-layer route: owner-claimed slug first, default-project alias second.
10. Special-menu override performs no extra read unless `storeData.activeSpecialMenuId` exists.
11. Public payload is sanitized before reaching the client renderer.
12. Public renderer opens directly to `PageType.MENU`, not the retired intro screen.
13. Metadata and sitemap use public truth indexability gates.
14. Owner writes invalidate `menu-store-{storeId}`, `store-{storeId}`, `client-stores`, and screen/assistant cache paths where wired.

### C. Correctness Findings

1. **Fixed: public truth block-state drift.**  
   `publicTruthIndexing.ts` checked `blocked` and `tenantBlocked` manually and looked for `blockDetails.active`, while the platform block helper treats `blockDetails.blocked` as blocked. This could leave blocked entities indexable if a future or historical record relied on `blockDetails.blocked`.  
   Fix: `isStoreActiveForPublicTruth()` now uses `isPlatformEntityBlocked()`.

2. **Fixed: cache revalidation API accepted unvalidated body shapes.**  
   `/api/revalidate/menu` accepted arbitrary `storeId` values before building cache tags.  
   Fix: added Zod validation for primitive bounded `storeId` or bounded tag arrays.

3. **Fixed: authenticated cache revalidation lacked route wrapper and store scope.**  
   The route manually called `getServerSession()` and allowed any authenticated session to request store-id cache invalidation.  
   Fix: normal app callers now go through `withAuth()`. Server callers with `x-revalidate-secret` still bypass session auth. Authenticated app callers can revalidate only stores present in their session, unless they are platform admins. Explicit tag arrays are platform-only for authenticated app callers.

4. **Fixed: docs drifted from runtime.**  
   `client-menu_firebase.md` still described the removed project metadata subcollection scan, a separate decision-block document read, and `getStoreById()` as public menu reads.  
   Fix: updated the doc to the current summary-first, embedded-decision-block, shared-store-lookup model.

### D. Firebase Cost Audit

Current verified steady-state menu path:

- Store lookup: cached `stores` query by subdomain or verified custom domain.
- Project summary: cached `platformSummary/projects_{storeId}` doc read.
- Project data: cached direct project doc read.
- Decision blocks: 0 extra reads; embedded in loaded project doc.
- Store details: 0 extra reads after host lookup.
- Outlet lookup: conditional cached `stores` query only for master multi-outlet paths.
- Master project merge: conditional direct project read only for linked outlet projects.
- Special menu: conditional direct project read only when `activeSpecialMenuId` exists.
- Revalidation route: 0 Firestore reads/writes; cache-tag work only.

Remaining cost risk:

- Inherited tenant-block enforcement in `clientStoreLookup.ts` can add a tenant-doc read on public store-cache misses. This is correctness-preserving. A future optimization can denormalize `tenantBlocked` onto store docs during platform entity blocking, but that should be handled as a focused Stores Management / Platform Entity Blocks audit because it changes rare admin write fanout.

### E. UI/UX Audit

Public path checks:

- Customer menu opens directly to menu content; the retired intro screen is not in the public runtime.
- OBP remains the tenant root for single and multi-location stores.
- Unknown/unresolved project paths degrade to a menu-not-found fallback instead of a hard customer-facing crash.
- Root/outlet OBP keeps public business context before menu navigation.
- Skeleton exists for slow menu loads.

Mobile/public parity:

- The public renderer defaults to mobile device type and `PageType.MENU`.
- No separate mobile data path was introduced.
- Mobile owner write-path parity was not fully audited in this slice beyond shared cache invalidation call-site inventory.

### F. Product/Positioning Audit

The audited runtime supports MenuList as public-business truth infrastructure:

- Hostname resolves to store/project IDs before public rendering.
- Slugs remain lookup handles, not identity.
- OBP stays the public business record.
- `/menu` alias preserves customer utility without duplicating canonical indexable URLs.
- Public truth indexing suppresses weak, expired, blocked, or incomplete records.

No feature-clutter changes were added.

### G. Documentation Alignment

Updated:

- `__docs__/client-menu/client-menu_firebase.md`

Still to audit later:

- `__docs__/official-business-page/*`
- `__docs__/url-routing-architecture/*`
- Website/public claim pages that mention public discovery or QR/public menu behavior

### H. Fixes Made

Changed files:

- `src/lib/seo/publicTruthIndexing.ts`
- `src/app/api/revalidate/menu/route.ts`
- `__docs__/client-menu/client-menu_firebase.md`
- `__docs__/audits/menulist-production-readiness-audit.md`

### I. Validation Performed

Commands run:

- `npx tsc --noEmit --incremental false --pretty false` — passed
- `npm run lint` — passed
- `git diff --check` — passed

Manual/code review validation:

- Verified middleware product-domain priority before tenant routing.
- Verified client tenant rewrites preserve tenant-aware robots/sitemap.
- Verified client menu resolver uses summary-first slug/default lookup.
- Verified public renderer no longer opens to the retired intro screen.
- Verified cache revalidation call-site inventory includes projects, stores, PWA, multi-outlet, extraction, functions, outlet APIs, temp status, entity blocks, and messaging/public create-menu paths.

Browser/runtime validation:

- Not run in this slice. No local dev server was started because the first pass focused on static runtime tracing and code-level fixes. Runtime browser verification remains required before certifying the full public surface.

Build validation:

- `npm run build` not run because the full production-readiness audit is not complete. Build remains a global completion gate.

---

## Completed Audit 2: Stores Management, Business Settings, Public Store Writes

### A. Feature Identification

**Feature cluster:** Stores Management + owner Business Settings + custom domain routing + time-slot preset public-output cleanup.

Relevant routes and files inspected:

- `src/database/stores/index.tsx`
- `src/database/projects/index.ts`
- `src/database/platformSummary/index.ts`
- `src/app/api/domain/route.ts`
- `src/app/api/store/temp-status/route.ts`
- `src/app/api/store/public-api-key/route.ts`
- `src/app/api/platform/entity-blocks/route.ts`
- `src/components/templates/main-app/businessSettings/index.tsx`
- `src/components/templates/main-app/businessSettings/tabs/DomainSettingsTab.tsx`
- `src/components/templates/main-app/businessSettings/tabs/TimeSlotPresetsTab.tsx`
- `src/components/mobile/screens/MobileBasicSettingsScreen.tsx`
- `src/components/mobile/screens/MobilePublicInfoScreen.tsx`
- `src/components/mobile/screens/MobileOfficialPageScreen.tsx`
- `src/components/mobile/screens/MobileBusinessAttributesScreen.tsx`
- `src/components/mobile/screens/MobileCustomerAppScreen.tsx`
- `src/components/mobile/screens/MobileDomainSettingsScreen.tsx`
- `src/components/mobile/screens/MobileSubdomainScreen.tsx`
- `src/components/mobile/screens/MobileLocaleSettingsScreen.tsx`
- `src/components/mobile/screens/MobileHoursScreen.tsx`
- `src/components/mobile/screens/MobileWorkingHoursEditScreen.tsx`
- `src/components/mobile/screens/MobileTempStatusScreen.tsx`
- `src/components/mobile/screens/MobileTimeSlotsScreen.tsx`
- `src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx`
- `src/lib/firestore/clientStoreLookup.ts`
- `src/lib/actions/revalidateMenuCache.ts`
- `__docs__/stores-management/*`
- `__docs__/official-business-page/official-business-page_firebase.md`
- `__docs__/client-menu/autosell-features/_spec.md`
- `__docs__/client-menu/autosell-features/_impl.md`

Affected surfaces:

- Owner dashboard: yes, Business Settings, domain, hours, public profile, PWA/customer app, SEO, temp status, time-slot presets.
- Mobile owner flow: yes, mobile equivalents listed above.
- Public menu/customer page: yes, store identity, domain routing, hours/temp status, category time windows.
- Official Business Page: yes, publicPresence, custom domain, metadata, business attributes, media.
- Website/marketing claim: indirectly; docs only updated, no public website copy changed.
- Admin/internal operations: yes, Stores Dashboard and Entity Blocks.
- Billing/entitlement: only observed activePlanType summary sync; billing audit still queued.
- Analytics/feedback/reviews: feedback settings observed; analytics internals still queued.
- Multi-location behavior: yes, store summary, outlet slug, master propagation observed but not fully certified.
- Cache/public truth: yes.

Firebase collections inspected for this slice:

- `stores`
- `tenants`
- `platformSummary`
- `projects/{tId}/{sId}`
- `analytics` references for OBP/temp-status context

### B. End-to-End Request/Data Flow

Owner store-settings flow:

1. Desktop Business Settings builds normalized form state from `storeDetails`.
2. Mobile owner screens use the same `PlatformGlobalDataContext` store data and call the same DAL/API paths for their specific settings.
3. `updateStore()` normalizes language policy, resolves business category, protects published subdomains from mutation, recomputes scheduler hour when timezone/EOD changes, writes `stores/{storeId}`, and revalidates public cache through `/api/revalidate/menu`.
4. Summary-relevant store fields sync into `platformSummary/storesSummary`.
5. Master store propagation runs only for configured master-propagation fields and outlet-policy-allowed stores.
6. Public pages resolve the updated store through shared cached lookup helpers and render OBP/menu/customer app state from the store/project truth.

Custom-domain flow:

1. Owner checks availability from desktop or mobile.
2. `/api/domain` validates auth and `MANAGE_PUBLIC_PRESENCE`, validates the domain, checks existing active stores, and calls Vercel domain APIs.
3. The route writes `stores/{storeId}` domain fields only after Vercel add/remove or verification status is known.
4. The route now invalidates `menu-store-{storeId}`, `store-{storeId}`, `client-stores`, and owner-assistant packet cache.
5. Desktop and mobile screens update local state after the API succeeds without duplicating the Firestore write.

Time-slot preset flow:

1. Desktop/mobile owner creates, edits, or deletes a store-level time-slot preset.
2. `updateTimeSlotPresets()` writes `stores/{storeId}.timeSlotPresets` and stamps `modifiedOn`.
3. Editing an existing preset now calls `updatePresetInAllCategories()`.
4. That helper scans only the current store's project docs, updates category `timeSlots[]` entries with the matching `presetId`, writes only changed projects, and revalidates affected public project/store cache.
5. Deleting a preset continues to call `removePresetFromAllCategories()` and revalidates changed projects.

### C. Correctness Findings

1. **Fixed: custom-domain API invalidated only `client-stores`.**  
   Domain add/verify/remove writes affect public routing, canonical metadata, redirects, OBP, and menu lookup. The route now uses `revalidateMenuCache()` so all required public truth tags and owner-assistant cache are invalidated.

2. **Fixed: desktop custom-domain UI duplicated API-owned writes.**  
   After `/api/domain` wrote Firestore, the desktop tab called `onStoreUpdate()`, which called `updateStore()` for the same fields. This caused duplicate store writes, duplicate cache invalidation, and possible summary noise. The tab now uses a local state patch callback for API-owned domain changes while preserving `updateStore()` for subdomain saves.

3. **Fixed: edited time-slot presets did not update assigned category windows.**  
   Category visibility stores copied `startTime`/`endTime` values alongside `presetId` to avoid an extra public store read. Editing a preset changed only the store preset list, leaving already assigned categories on old windows. Desktop and mobile edit flows now cascade changed times into assigned categories and revalidate affected public cache.

4. **Fixed: time-slot preset store writes did not stamp `modifiedOn`.**  
   `updateTimeSlotPresets()` now writes `modifiedOn: serverTimestamp()` with the preset list.

5. **Fixed: TypeScript validation blocker from a separate product registry change.**  
   `DeploymentProductId` included `campaigncue`, but `PRODUCT_PROJECT_VARS` in `validateEnv.ts` did not. Added an empty CampaignCue requirement entry and display label. This does not change MenuList runtime behavior; it only restores exhaustive typing for the shared deployment map.

6. **Docs drift fixed.**  
   Stores, OBP, and time-slot docs now describe current runtime behavior: shared public store lookup helpers, full domain cache invalidation, desktop/mobile owner parity, and time-slot edit/delete cascades.

### D. Firebase Cost Audit

Verified owner store writes:

- `updateStore()` writes one store doc.
- Summary sync writes one `platformSummary/storesSummary` merge only when summary-relevant fields are present.
- `updateStore()` may read the current store only when needed for subdomain immutability, summary field resolution, scheduler recompute, or master propagation checks.
- Domain add/remove writes one store doc; verification writes only on false -> true transition.
- Time-slot preset create writes one store doc.
- Time-slot preset edit writes one store doc plus reads current-store project docs and writes only projects containing matching assigned categories.
- Time-slot preset delete writes one store doc plus existing 0-N changed project writes.
- Temp status writes one store doc and revalidates all public store tags.
- Entity block store flow writes the entity doc, summary patch, and revalidates affected store cache.
- Entity block tenant flow reads/writes `storesSummary`, falls back to a tenant stores query only when summary data is missing, and revalidates affected stores.

Cost fixes:

- Removed duplicate desktop custom-domain store writes after `/api/domain`.
- Kept time-slot edit cascade bounded to rare owner actions and changed project docs only.
- Did not denormalize tenant block state onto every store doc in this pass; correctness currently relies on a tenant-doc check on public lookup cache misses.

### E. UI/UX Audit

Desktop:

- Business Settings remains grouped by business profile, search/discovery, locale, hours, time slots, analytics, feedback, and POS sync.
- Subdomain locking remains visible after publish and enforced in `updateStore()`.
- Custom-domain add/remove/verify stays in the dedicated domain tab.
- Time-slot delete already had recoverable confirmation; edit now preserves public behavior without adding owner decisions.

Mobile:

- Owner mobile parity exists for business profile, public info, OBP, custom attributes, customer app, domains/subdomain, locale, hours/temp status, time slots, and SEO/analytics.
- Mobile time-slot edits now perform the same category cascade as desktop.
- Mobile domain screens already used `/api/domain` without duplicate `updateStore()` writes.
- Platform admin store CRUD remains desktop-only; this is acceptable because it is an internal admin workflow, not SMB owner operation.

Public/customer:

- Custom-domain changes now invalidate canonical/routing cache immediately.
- Category time-window edits now reach public menu output through changed project revalidation.
- Public pages still avoid extra reads for preset lookup because category time windows remain embedded in project data.

### F. Product/Positioning Audit

The fixes preserve MenuList's public-business truth role:

- Public routing changes are treated as truth-packet changes, not as cosmetic settings.
- Time-slot preset edits silently keep public category visibility correct without asking owners to manually revisit categories.
- No new owner-facing settings, toggles, or feature clutter were added.
- Store/admin separation remains intact: platform CRUD stays internal; SMB owner public truth controls stay mobile-capable.

### G. Documentation Alignment

Updated:

- `__docs__/stores-management/README.md`
- `__docs__/stores-management/stores-management_firebase.md`
- `__docs__/stores-management/stores-management_impl.md`
- `__docs__/stores-management/stores-management_mobile-support.md`
- `__docs__/stores-management/stores-management_spec.md`
- `__docs__/official-business-page/official-business-page_firebase.md`
- `__docs__/client-menu/autosell-features/_spec.md`
- `__docs__/client-menu/autosell-features/_impl.md`
- `__docs__/audits/menulist-production-readiness-audit.md`

### H. Fixes Made

Changed MenuList/runtime files:

- `src/app/api/domain/route.ts`
- `src/components/templates/main-app/businessSettings/index.tsx`
- `src/components/templates/main-app/businessSettings/tabs/DomainSettingsTab.tsx`
- `src/components/templates/main-app/businessSettings/tabs/TimeSlotPresetsTab.tsx`
- `src/components/mobile/screens/MobileTimeSlotsScreen.tsx`
- `src/database/projects/index.ts`
- `src/database/stores/index.tsx`

Changed shared validation file:

- `src/lib/env/validateEnv.ts`

### I. Validation Performed

Commands run:

- `npx tsc --noEmit --incremental false --pretty false` — passed after adding the missing `campaigncue` env-map key
- `npm run lint` — passed
- `git diff --check` — passed

Manual/code review validation:

- Verified desktop and mobile domain flows use `/api/domain`.
- Verified `/api/domain` is auth/permission guarded and now invalidates full public tags.
- Verified desktop custom-domain UI no longer performs duplicate store writes after API success.
- Verified `updateStore()` remains the shared cache invalidating path for owner store/publicPresence saves.
- Verified temp status and entity-block routes revalidate full public store tags.
- Verified time-slot edit/delete cascades write only changed current-store projects and revalidate affected project cache.
- Verified mobile owner parity for the audited store setting surfaces.

Browser/runtime validation:

- Not run in this slice. Local browser smoke remains required before full certification.

Build validation:

- `npm run build` not run because the full production-readiness audit is not complete. Build remains a global completion gate.

---

## Completed Audit 3: Projects/Menu Builder, Public Project Writes, Use MenuList Outputs

### A. Feature Identification

**Feature cluster:** Projects/Menu Builder lifecycle, project summary/public write paths, read-only output surfaces that consume project summaries.

Relevant routes, components, hooks, DAL, APIs, cache paths, docs, and mobile equivalents inspected:

- `src/database/projects/index.ts`
- `src/components/templates/main-app/projects/index.tsx`
- `src/components/templates/main-app/projects/editorView/Editor.tsx`
- `src/components/templates/main-app/projects/types/project.types.ts`
- `src/components/mobile/providers/MobileProjectsProvider.tsx`
- `src/components/mobile/components/MobileProjectSelectorSheet.tsx`
- `src/components/mobile/screens/MobileMenuScreen.tsx`
- `src/components/templates/main-app/useMenuList/index.tsx`
- `src/components/templates/main-app/businessSettings/OBPLinkCard.tsx`
- `src/components/templates/main-app/dashboard/OwnerDashboard/DashboardProjectSelector.tsx`
- `src/components/templates/main-app/today/PastActivity/index.tsx`
- `src/components/templates/main-app/growthos/index.tsx`
- `src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx`
- `src/components/templates/main-app/transactions/index.tsx`
- `src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthProjectScopeSelector.tsx`
- `src/hooks/useMenuCardExportController.ts`
- `src/lib/cache/publicClientCache.ts`
- `src/lib/actions/revalidateMenuCache.ts`
- `src/app/api/projects/outlet-save/route.ts` reviewed by call path from `updateProject()`
- `__docs__/projects/project-management/*`
- `__docs__/use-menulist/*`

Affected surfaces:

- Owner dashboard: yes, project selector and menu truth writes.
- Mobile owner flow: yes, mobile project provider and selector sheet use the same DAL.
- Public menu/customer page: yes, project summaries and full project docs drive public route resolution and menu rendering.
- Official Business Page: yes, default/direct project links and `/menu` alias behavior depend on project summary state.
- Website/marketing claim: no public website copy changed; Use MenuList docs aligned to runtime.
- Admin/internal operations: no direct admin change in this slice.
- Billing/entitlement: no direct billing changes; GrowthOS project selector was touched only to avoid hidden project creation.
- Analytics/feedback/reviews: Past Activity and feedback link generation were inspected as project-summary consumers; full analytics audit remains queued.
- Multi-location behavior: yes, `updateProject()` outlet-save handoff and inherited project delete/deactivate guard observed.
- Cache/public truth: yes.

Firebase collections inspected for this slice:

- `projects/{tId}/{sId}`
- `platformSummary/projects_{sId}`
- `platformSummary/campaigns_{sId}` for Use MenuList screen state
- `stores/{storeId}` only for linked feature calls and starter activation signal context

Feature flags observed:

- `ENABLE_MULTI_OUTLET`
- `ENABLE_PROJECT_PROPAGATION`
- `ENABLE_MASTER_UPDATE_AWARENESS`
- `ENABLE_MCE`
- `ENABLE_MENU_OBSERVATION`
- `ENABLE_MENU_SNAPSHOTS`
- `ENABLE_SPECIAL_MENU_SWITCHING`
- `ENABLE_USE_MENULIST`
- `ENABLE_MENU_CARD_EXPORT`
- `ENABLE_PRINTABLE_ASSET_TEMPLATES`
- `ENABLE_PRINT_ASSETS_ROUTE`
- `ENABLE_CUSTOMER_APP_PWA`
- `ENABLE_GROWTHOS_ADDON`

### B. End-to-End Request/Data Flow

Project list/menu-management flow:

1. Desktop Projects and the mobile project provider read `platformSummary/projects_{sId}` through `getProjectsList*()`.
2. If the owner enters a menu-management flow and no project exists, the DAL intentionally creates a default project and summary entry.
3. The selected project then loads full data from `projects/{tId}/{sId}/{projectId}`.
4. Editor/mobile changes call shared DAL functions for metadata, content, active status, publish, duplicate, delete, and restore.
5. Public-impacting writes call `revalidatePublicClientCacheForProject()`, which invalidates public cache, owner-assistant browser cache, and digital screen content version.

Read-only output/dashboard flow:

1. Dashboard selector, Use MenuList, OBP link card, Past Activity, GrowthOS, print/export, transactions, and business-health selectors read project summaries.
2. These surfaces now use `getExistingProjectsListWithoutLoader()` where an empty state is valid.
3. Empty stores remain empty on these surfaces instead of silently creating public menu truth.
4. Use MenuList reads screen state from `platformSummary/campaigns_{sId}` and full selected project data only for on-demand PDF/export fallback actions.

Delete/restore flow:

1. Owner deletes a project from desktop or mobile.
2. `deleteProject()` reads the current summary, stores a `deletedSummary` tombstone on the full project doc, removes the summary entry, and promotes a fallback default if needed.
3. Restore reads both the project doc and current summary.
4. `restoreProject()` rebuilds the summary from `deletedSummary` when available and clears the tombstone.
5. If another active non-special default already exists, the restored project is restored as non-default to preserve a single public default.
6. Summary sync revalidates the public truth packet.

### C. Correctness Findings

1. **Fixed: read-only project-summary consumers could create public menu truth.**  
   `getProjectsList()` and `getProjectsListWithoutLoader()` intentionally auto-create a default project when no project exists. That is correct for editor/onboarding flows but wrong for output/dashboard pages. Dashboard selector, Use MenuList, OBP link card, Past Activity, and GrowthOS now use `getExistingProjectsListWithoutLoader()`.

2. **Fixed: soft-delete restore could lose public summary fields.**  
   The active runtime stores name, slug, previous slugs, image, default state, and special-menu summary data in `platformSummary/projects_{sId}`. Deleting removed that summary, while restore rebuilt from the full project doc, which often lacks summary-only fields. `deleteProject()` now stores a `deletedSummary` tombstone and `restoreProject()` uses it.

3. **Fixed: restoring an old default could create duplicate defaults.**  
   If a deleted default project promoted a fallback default, restoring the deleted project could reintroduce a second default if old summary state was blindly restored. Restore now keeps the project non-default when another active non-special default already exists.

4. **Verified: public cache revalidation exists on high-volume project writes.**  
   `syncProjectToSummary()`, `removeProjectFromSummary()`, `updateProject()`, `publishProject()`, `setProjectActive()`, `deleteProject()`, `restoreProject()`, `duplicateProject()`, special-menu writes, and time-slot cascades invalidate public cache through the project/store cache path.

5. **Docs drift fixed.**  
   Project Management docs described retired `projectsMetadata` / `projectsData` collections and paginated list behavior. Use MenuList docs claimed mostly zero reads and older component structure. Both doc sets now match runtime.

### D. Firebase Cost Audit

Verified reads/writes:

- Project-management list load: 1 read from `platformSummary/projects_{sId}`.
- Auto-create default project: 1 full project write + 1 summary write; intentionally limited to editor/mobile management entry points.
- Read-only output/dashboard project list: 1 summary read, 0 writes.
- Full project load: 1 direct project doc read.
- Metadata update: 1 summary write and public cache invalidation.
- Full save: 1 project write, optional flag-gated reads/writes for MCE/MOL/master-awareness, and public cache invalidation.
- Publish: 1 project write, atomic version increment, optional flag-gated snapshot/event writes, and public cache invalidation.
- Delete: project doc write + summary write in one batch, no additional write for the restore tombstone because it is stored in the existing project delete write.
- Restore: 1 project write + 1 summary write + 2 reads.
- Use MenuList desktop load: 1 project-summary read + 1 screen-state summary read.
- Use MenuList full-project read: only on PDF/export fallback tap.

Cost fixes:

- Removed hidden writes from read-only owner/dashboard/output surfaces.
- Kept default auto-create only in menu-management entry points.
- Preserved restore correctness without adding a new collection or extra delete write.

Remaining cost risk:

- `updateProjectMetadata()` default switching is still coordinated by desktop/mobile callers with multiple summary writes. A future focused hardening could make default switching atomic inside the DAL, but that should be done with careful UI cache updates and regression coverage.

### E. UI/UX Audit

Desktop:

- Project manager remains the intentional creation/editing surface.
- Dashboard project selector now shows `No catalogs` for an empty store instead of creating a project.
- Use MenuList now reaches its `no_menu` CTA state for empty stores.
- OBP link card falls back to `/menu` while loading or when no default project exists, without writing data.

Mobile:

- Mobile project-management still intentionally creates/loads first project inside `MobileProjectsProvider`.
- Mobile metadata, default, deactivate, duplicate, delete, and reset flows use shared DAL primitives.
- Mobile output docs now clarify that output actions should not create project truth.

Public/customer:

- Public route correctness remains summary-first and cache-invalidated.
- Delete/restore now preserves slug/name/image/default semantics for future restores.
- The restore default guard prevents public `/menu` ambiguity after restoring a previously default project.

### F. Product/Positioning Audit

The fixes reinforce MenuList's role as public-business truth infrastructure:

- Output and dashboard surfaces now read truth; they do not create truth.
- Restore keeps public identity fields stable without asking owners to reconstruct them.
- No owner-facing setting, toggle, or explanation was added.
- Project management remains simple: edit/create where expected, no hidden writes elsewhere.

### G. Documentation Alignment

Updated:

- `__docs__/projects/project-management/README.md`
- `__docs__/projects/project-management/project-management_firebase.md`
- `__docs__/projects/project-management/project-management_impl.md`
- `__docs__/projects/project-management/project-management_spec.md`
- `__docs__/use-menulist/README.md`
- `__docs__/use-menulist/use-menulist_firebase.md`
- `__docs__/use-menulist/use-menulist_impl.md`
- `__docs__/use-menulist/use-menulist_spec.md`
- `__docs__/use-menulist/use-menulist_mobile-support.md`
- `__docs__/audits/menulist-production-readiness-audit.md`

### H. Fixes Made

Changed runtime files:

- `src/components/templates/main-app/dashboard/OwnerDashboard/DashboardProjectSelector.tsx`
- `src/components/templates/main-app/today/PastActivity/index.tsx`
- `src/components/templates/main-app/businessSettings/OBPLinkCard.tsx`
- `src/components/templates/main-app/useMenuList/index.tsx`
- `src/components/templates/main-app/growthos/index.tsx`
- `src/database/projects/index.ts`
- `src/components/templates/main-app/projects/types/project.types.ts`

### I. Validation Performed

Commands run after this slice:

- `npx tsc --noEmit --incremental false --pretty false` - passed
- `npm run lint` - passed
- `git diff --check` - passed after mechanical trailing-whitespace cleanup in touched docs

Manual/code review validation:

- Verified remaining auto-create helper call sites are menu-management entry points (`Projects` page and mobile projects provider).
- Verified read-only project consumers now call `getExistingProjectsListWithoutLoader()`.
- Verified `restoreProject()` rebuilds summary from tombstone and avoids duplicate defaults.
- Verified cache invalidation still flows through `syncProjectToSummary()` on restore and metadata writes.
- Verified Use MenuList docs no longer claim zero-read page load or old split component structure.

Browser/runtime validation:

- Not run in this slice. Local browser smoke remains required before full certification.

Build validation:

- `npm run build` not run because the full production-readiness audit is not complete. Build remains a global completion gate.

---

## Completed Audit 4: AI Data Extraction, Upload Processing, Extraction Review

### A. Feature Identification

**Feature cluster:** AI data extraction + owner upload/file processing + menu-link import + public `/create-menu` draft extraction + extraction review apply/discard.

Relevant routes and files inspected:

- `src/app/api/menu-extraction/jobs/route.ts`
- `src/app/api/menu-link-imports/route.ts`
- `src/app/api/public/create-menu/route.ts`
- `src/app/api/projects/outlet-save/route.ts`
- `src/lib/firebase/menuProcessing.ts`
- `src/lib/menu-link-import/client.ts`
- `src/lib/menu-link-import/sourceAcquisition.ts`
- `src/lib/extraction/applyChanges.ts`
- `src/lib/extraction/comparisonEngine.ts`
- `src/components/templates/main-app/projects/getProcessedFile.ts`
- `src/components/templates/main-app/projects/index.tsx`
- `src/components/templates/main-app/projects/jobScreens/ExtractionJobReviewScreen.tsx`
- `src/components/mobile/sheets/MenuUploadSheet.tsx`
- `src/components/mobile/sheets/ExtractionReviewSheet.tsx`
- `functions/src/triggers/production.ts`
- `functions/src/triggers/shared.ts`
- `functions/src/dev-triggers.ts`
- `functions/src/logic/processMenuImagesJob.ts`
- `functions/src/logic/processMenuImages.ts`
- `functions/src/logic/saveFilesToProject.ts`
- `functions/src/logic/publicCacheRevalidation.ts`
- `functions/src/schedulers/menuJobCleanup.ts`
- `functions/src/schedulers/menulistMaintenanceScheduler.ts`
- `firestore.rules`
- `scripts/verification/verify-menu-extraction-pipeline.js`
- `__docs__/menu-extraction-pipeline/*`
- `__docs__/projects/ai-data-extraction/*`

Affected surfaces:

- Owner dashboard: yes, project upload/re-extraction/review.
- Mobile owner flow: yes, mobile upload and review sheets.
- Public menu/customer page: yes, accepted extraction changes mutate public menu truth.
- Official Business Page: indirectly, menu-derived business attributes can update store truth.
- Website/marketing claim: yes, public `/create-menu` draft path and docs.
- Admin/internal operations: yes, AI operations telemetry and extraction health alerts.
- Billing/entitlement: indirectly, AI cost accounting/rate limiting.
- Analytics/feedback/reviews: no direct customer feedback changes in this slice.
- Multi-location behavior: yes, linked-outlet extraction review.
- Cache/public truth: yes, project/store/screen/assistant cache invalidation after accepted changes.

Feature flags observed:

- `ENABLE_MENU_LINK_IMPORT`
- `ENABLE_MENU_LINK_IMPORT_RENDER_FALLBACK`
- `ENABLE_PUBLIC_MENU_ENTRY`
- `ENABLE_MENU_INTAKE_IDENTITY_CHECK`
- `ENABLE_MULTI_OUTLET`
- `ENABLE_MCE`
- `ENABLE_OWNER_BUSINESS_HEALTH`

Firebase collections/storage inspected:

- `menuImageProcessingJobs`
- `projects/{tId}/{sId}/{projectId}`
- `publicMenuDrafts`
- `menuLinkImportArtifacts`
- `MENULIST_AI_OPERATIONS`
- `platformSummary/projects_{sId}`
- Firebase Storage prefixes: `projects/files/{tId}/{sId}/`, `menuLinkImports/{tId}/{sId}/{projectId}/`, `publicMenuDrafts/{draftId}/`, `messagingOnboarding/{sessionId}/`

### B. End-to-End Request/Data Flow

Owner upload flow:

1. Desktop/mobile validate and upload files to Firebase Storage under the tenant/store prefix.
2. UI calls `createProcessingJob()` / `createMenuProcessingJob()`.
3. The client helper posts to `POST /api/menu-extraction/jobs`; it does not write job docs directly.
4. The API route uses `withAuth()`, SAFE_MODE, Zod request validation, tenant/store verification, project existence checks, source URL allowlists, MIME checks, active-job reuse, identity preflight, and `AI_EXPENSIVE` rate limiting.
5. The route writes `menuImageProcessingJobs/{jobId}` with project destination metadata.
6. Production `processMenuImagesJob` Firestore trigger processes the job; development uses `dev_triggerProcessMenuImages`.
7. The worker validates tenant/project/source path again before AI, sets `processing`, runs Gemini extraction, applies hardening and deterministic category icons, and then branches.
8. First extraction saves directly to the project and revalidates public cache.
9. Re-extraction sets `preview_ready` with 24-hour TTL and waits for owner review.
10. Desktop and mobile review use the same `applyExtractionChanges()` / `discardExtractionChanges()` helpers.

Authenticated menu-link import:

1. Desktop/mobile call `createMenuLinkImportJob()`.
2. `POST /api/menu-link-imports` requires auth, SAFE_MODE, permission confirmation, rate limit, project existence, active-job reuse, and feature flag.
3. The source acquisition helper normalizes URLs, blocks credentials/unsafe protocols/unsafe hostnames/private IPs, pins DNS lookup, caps response/rendered sizes, limits redirects, validates source confidence, and optionally uses render fallback behind flag.
4. The route stores a private artifact under `menuLinkImports/{tId}/{sId}/{projectId}/{jobId}/` and writes a forced-review extraction job.

Public `/create-menu` draft flow:

1. The route is authenticated and feature-flagged.
2. Uploads/links dedupe active drafts before expensive acquisition and dedupe by content hash after acquisition.
3. Public draft extraction jobs use platform tenant/store/user IDs, `skipProjectSave`, a public-draft destination, a 24-hour draft TTL, and public draft storage.
4. The worker writes completion/failure back to `publicMenuDrafts`.
5. Claiming a completed draft creates a normal renderer-parseable project and revalidates public cache tags.

Review apply/discard flow:

1. `applyExtractionChanges()` reads the current project and job once.
2. It now rejects missing jobs, non-`preview_ready` jobs, project mismatches, tenant/store mismatches, and user mismatches before any project mutation.
3. Single-store/master review applies mutate a cloned project `files` array and write one project update.
4. Linked-outlet review applies build an outlet-local project payload and call `POST /api/projects/outlet-save`; the server route enforces permissions, tenant membership, outlet policy, and local-only ID prefixes before Admin SDK persistence.
5. Accepted changes revalidate public client cache, digital screen content version, and owner-assistant cache through the shared project cache helper.
6. Discard uses the same job ownership/status validation before marking the review job cancelled.

### C. Correctness Findings

1. **Fixed: review apply/discard did not fail closed on job ownership/status.**  
   The helper read the job but did not reject missing jobs, wrong project, wrong tenant/store, wrong owner, or wrong status before applying changes. Firestore rules limited job updates, but project mutation could still proceed from an invalid review context. `assertOwnedPreviewJob()` now blocks these cases before project or job mutation.

2. **Fixed: linked-outlet extraction review bypassed the validated outlet save route.**  
   The review helper tried to write linked outlet `files` directly. Firestore rules intentionally block arbitrary `files` writes on linked projects, while the existing `/api/projects/outlet-save` route performs the required local-only ID and outlet-policy checks. Linked-outlet review apply now uses that route.

3. **Fixed: legacy direct AI callable remained an expensive parallel entry point.**  
   `processMenuImages` was still exported as a direct callable and could invoke Gemini with arbitrary HTTPS/data URLs for any store-scoped account. No current app caller was found; the product contract is the job queue. The callable now fails closed with `failed-precondition` and does not call AI processing.

4. **Fixed: verification drift.**  
   `verify:menu-extraction-pipeline` now asserts review ownership validation, linked-outlet `outlet-save`, disabled direct callable behavior, and absence of direct AI invocation from the legacy callable.

5. **Docs drift fixed.**  
   AI extraction docs still claimed full production-ready status and described the legacy callable as an active path. Docs now describe controlled owner testing readiness, queue-only production extraction, the linked-outlet review route, and the Firebase deploy blocker.

### D. Firebase Cost Audit

Verified reads/writes:

- Owner job creation: 1 project existence read, optional original failed-job read for retry, 1 active-job query, 1 job write, optional identity preflight reads/work.
- Client active-job check: 1 bounded query by `projectId`, `uId`, and active status.
- Job listener: one direct `menuImageProcessingJobs/{jobId}` listener while the extraction UI is active.
- Worker start: 1 job transaction and 1 project read.
- First extraction save: 1 project write, job status writes, 1 `MENULIST_AI_OPERATIONS` telemetry write, and public cache revalidation.
- Re-extraction: no project write until owner approval; writes `preview_ready` result to the job document.
- Review apply single-store/master: 1 project read + 1 job read + 1 project write + 1 job terminal update; optional 1 store read/write only when menu-derived business attributes change.
- Review apply linked outlet: 1 project read + 1 job read client-side, then `/api/projects/outlet-save` performs bounded store/tenant/project reads and 1 Admin SDK project write.
- Review discard: 1 job read + 1 terminal job update.
- Cleanup scheduler: consolidated in `menulistMaintenanceScheduler`; no new scheduled function added.

Cost fixes:

- Removed an exposed direct Gemini callable path from code.
- Preserved central job queue rate limiting and source validation.
- Avoided weakening Firestore rules for linked project `files`; reused the existing validated server route.
- Kept cleanup under the consolidated maintenance scheduler.

Remaining cost/deploy risk:

- The direct callable hardening is not deployed because Firebase deploy is blocked by `ecomsai` billing-disabled Secret Manager 403. Until billing is enabled and deploy succeeds, production may still have the older callable behavior.
- `MENULIST_AI_OPERATIONS` remains append-only telemetry. Retention/archival remains queued for the broader analytics/ops audit.

### E. UI/UX Audit

Desktop:

- Desktop upload and review remain in the Projects surface.
- Existing active jobs are reused instead of creating duplicate work.
- Review save/discard now fails with a clear unavailable/not-owned error instead of silently applying from an invalid job context.

Mobile:

- Mobile upload and review sheets share the same job creation and review helpers as desktop.
- Mobile upload supports file upload and menu-link import behind the same feature flag.
- No mobile-only project mutation path was introduced.

Public/customer:

- Public `/create-menu` creates temporary drafts only; no imported data becomes public menu truth until an authenticated owner claims and approves it.
- Accepted owner extraction changes still invalidate public menu/OBP cache paths before customer refreshes.

### F. Product/Positioning Audit

The fixes reinforce MenuList as public-business truth infrastructure:

- There is one production extraction authority: the job queue.
- Linked outlet local truth is validated against outlet policy instead of bypassing governance.
- Public draft extraction stays temporary and owner-reviewed.
- No new owner settings or AI dashboard clutter were added.

### G. Documentation Alignment

Updated:

- `__docs__/menu-extraction-pipeline/menu-extraction-pipeline_impl.md`
- `__docs__/menu-extraction-pipeline/menu-extraction-pipeline_firebase.md`
- `__docs__/projects/ai-data-extraction/README.md`
- `__docs__/projects/ai-data-extraction/ai-data-extraction_firebase.md`
- `__docs__/projects/ai-data-extraction/ai-data-extraction_impl.md`
- `__docs__/projects/ai-data-extraction/ai-data-extraction_spec.md`
- `__docs__/audits/menulist-production-readiness-audit.md`

### H. Fixes Made

Changed runtime/verification files:

- `src/lib/extraction/applyChanges.ts`
- `functions/src/triggers/shared.ts`
- `scripts/verification/verify-menu-extraction-pipeline.js`

### I. Validation Performed

Commands run after this slice:

- `npx tsc --noEmit --incremental false --pretty false` - passed
- `npm --prefix functions run build` - passed
- `npm run verify:menu-extraction-pipeline` - passed after verifier correction
- `firebase deploy --only functions:processMenuImages --project ecomsai` - failed before deployment because Secret Manager validation returned HTTP 403 requiring billing on project `ecomsai`

Manual/code review validation:

- Verified app code has no current caller of the legacy direct `processMenuImages` callable.
- Verified owner job API rejects client-owned source metadata and validates Storage prefixes.
- Verified menu-link import acquisition blocks unsafe protocols, credentials, local/private/internal hostnames, unsafe DNS results, oversized responses, and excessive redirects.
- Verified public `/create-menu` queues jobs and does not run inline extraction.
- Verified Firestore rules keep browser job creation blocked and restrict review resolution job updates to `preview_ready` terminal status changes.
- Verified linked-outlet project file persistence is already handled by `/api/projects/outlet-save`, which validates local-only IDs and outlet policy.
- Verified cleanup and health monitoring run inside `menulistMaintenanceScheduler`, not a new standalone scheduler.

Browser/runtime validation:

- Not run in this slice. Desktop/mobile extraction review browser smoke remains required after Firebase deploy succeeds.

Build validation:

- `npm run build` not run because the full production-readiness audit is not complete. Build remains a global completion gate.

---

## Completed Audit 5: Data Editor, B2C Design Publish, Description Generation, Multi-Language Translation

### A. Feature Identification

**Feature cluster:** Owner data editor + desktop/mobile design publish + description generation + translation generation + linked-outlet editor governance.

Relevant routes and files inspected:

- `src/database/projects/index.ts`
- `src/app/api/projects/outlet-save/route.ts`
- `src/app/api/descriptions/route.ts`
- `src/app/api/translations/route.ts`
- `src/lib/multiOutlet/serverOutletPolicy.ts`
- `src/components/templates/main-app/projects/editorView/Editor.tsx`
- `src/components/templates/main-app/projects/editorView/editItemModal.tsx`
- `src/components/templates/main-app/projects/editorView/LanguageSelectorModal.tsx`
- `src/components/templates/main-app/projects/utils/translationsUtils.ts`
- `src/components/templates/main-app/projects/generateTranslations.ts`
- `src/components/templates/main-app/projects/b2cView/index.tsx`
- `src/components/templates/main-app/projects/b2bView.tsx`
- `src/components/mobile/screens/MobileMenuScreen.tsx`
- `src/components/mobile/screens/MobileDesignEditorScreen.tsx`
- `__docs__/projects/data-editor/*`
- `__docs__/projects/b2c-view/*`
- `__docs__/projects/b2b-view/*`
- `__docs__/projects/description-generation/*`
- `__docs__/projects/multi-language-translation/*`
- `__docs__/multi-outlet-consistency/*`

Affected surfaces:

- Owner dashboard: yes, editor and design publish.
- Mobile owner flow: yes, mobile menu editor and mobile design editor.
- Public menu/customer page: yes, accepted edits and design publishes mutate customer-visible truth.
- Official Business Page: yes, B2C view can edit public presence via store updates.
- Website/marketing claim: indirectly, feature docs and public claims about translation/design.
- Admin/internal operations: yes, AI accounting and linked-outlet policy enforcement.
- Billing/entitlement: yes, AI capacity checks for descriptions/translations.
- Analytics/feedback/reviews: not directly in this slice.
- Multi-location behavior: yes, linked outlet editor/design/translation policy.
- Cache/public truth: yes, `updateProject()`, `publishProject()`, `updateStore()`, and `outlet-save` invalidation paths.

Feature flags observed:

- `ENABLE_MULTI_OUTLET`
- `ENABLE_MCE`
- `ENABLE_MENU_OBSERVATION`
- `ENABLE_MASTER_UPDATE_AWARENESS`
- `ENABLE_BEHAVIOR_NUDGES`
- `ENABLE_OWNER_BUSINESS_HEALTH`

Firebase collections/storage inspected:

- `projects/{tId}/{sId}/{projectId}`
- `stores/{storeId}`
- `platformSummary/projects_{sId}`
- `masterOperationalState/{projectId}`
- AI operation/accounting collections through `finalizeAiOperationAccounting()`
- Storage assets uploaded through project asset helpers

### B. End-to-End Request/Data Flow

Editor save flow:

1. Desktop editor mutates local project state.
2. `Editor.syncChanges()` strips resolved linked-outlet display data before persistence.
3. Saves call `updateProject()`.
4. For normal/master projects, `updateProject()` normalizes localized project text, runs optional MCE/MOL/master-awareness checks, writes `projects/{tId}/{sId}/{projectId}`, and revalidates public cache.
5. For linked outlet projects, `updateProject()` posts to `/api/projects/outlet-save`, which validates tenant/store access, permissions, local-only IDs, outlet policy, and writes via Admin SDK.
6. Mobile menu editing uses `updateProjectWithoutLoader()`, which shares the same underlying `runUpdateProject()` behavior.

B2C/design publish flow:

1. Desktop B2C preview and mobile design editor stage design changes locally.
2. Publish calls `publishProject()`.
3. Background images are uploaded before persistence.
4. For normal/master projects, `publishProject()` validates linked master references when present, writes publish metadata, increments menu version, and revalidates public cache.
5. For linked outlet projects, `publishProject()` now posts to `/api/projects/outlet-save` with `publish: true`, so theme/brand/layout policy is enforced before publish metadata and public cache invalidation.
6. B2C official page changes call `updateStore()`, preserving store cache revalidation.

Description generation flow:

1. Desktop/mobile item description actions call `POST /api/descriptions`.
2. The route uses `withAuth()`, SAFE_MODE, AI operation rate limit, Zod validation, tenant/store check, linked-outlet description policy, AI capacity, Gemini generation, response ID validation, AI accounting, and structured logging.
3. The client merges accepted description text into project state and saves through `updateProject()`.

Translation flow:

1. Desktop/mobile language and item/category translation helpers call `POST /api/translations`.
2. The route uses `withAuth()`, SAFE_MODE, AI operation rate limit, Zod validation, AI capacity, Gemini generation, response-shape normalization, coverage logging, and AI accounting.
3. Project-scoped translation requests now validate tenant/store access, project existence, and linked-outlet translation governance before Gemini.
4. The client merges accepted translations into project state and saves through `updateProject()`.

### C. Correctness Findings

1. **Fixed: linked-outlet design publish bypassed outlet policy.**  
   `updateProject()` correctly routed linked outlet saves through `/api/projects/outlet-save`, but `publishProject()` wrote directly to Firestore after only checking that the master project existed. A linked outlet could bypass disabled theme, brand, or layout overrides from desktop B2C or mobile design publish. `publishProject()` now sends linked outlet publishes through `/api/projects/outlet-save` with `publish: true`.

2. **Fixed: outlet-save route did not support publish metadata.**  
   `/api/projects/outlet-save` only represented normal saves. It now accepts an optional `publish` flag and stamps `lastPublishedAt` and `menuVersion` in the same validated Admin SDK write.

3. **Fixed: translation API lacked project/linked-outlet server governance.**  
   The client translation utilities filter inherited linked-outlet content in the main translation flow, but the API itself could still translate arbitrary inherited IDs for a project-scoped request before Gemini. `/api/translations` now validates tenant/store/project context and rejects inherited linked-outlet item/category translation keys before AI capacity/provider work.

4. **Verified: description generation already has stronger project/policy checks.**  
   `/api/descriptions` already validates request shape, tenant context, linked-outlet description policy, AI capacity, and response IDs before returning text for client persistence.

5. **Verified: desktop/mobile editor mutation paths share cache-invalidating DALs.**  
   Direct editor writes found in desktop and mobile route through `updateProject()` / `updateProjectWithoutLoader()` or `publishProject()`, not direct component Firestore writes.

### D. Firebase Cost Audit

Verified reads/writes:

- Normal editor save: optional 1 project read for MCE/MOL/master-awareness, 1 project write, optional signal/event writes, public cache invalidation.
- Linked outlet editor save: route reads caller/outlet/master stores, tenant, project, then writes 1 outlet project doc via Admin SDK.
- Normal publish: 1 project write with version increment, optional publish event/snapshot writes, public cache invalidation.
- Linked outlet publish: same bounded `/api/projects/outlet-save` reads as linked save, 1 outlet project write with publish metadata, public cache invalidation.
- Description API: 0 Firestore reads for single-store/master policy beyond AI capacity/accounting; linked outlet requests read project + master store before provider work.
- Translation API: project-scoped requests now add 1 project read, and linked outlet projects add a master-store policy read, before provider work; non-project translation requests remain 0 Firestore reads before provider/accounting.

Cost fixes:

- Added a small pre-provider read cost to project-scoped translation to prevent wrong/unauthorized linked-outlet translation work and wasted Gemini calls.
- Reused the existing linked-outlet save route instead of adding Firestore rule exceptions or new collections.
- Kept publish metadata on the existing outlet project write.

Remaining cost risk:

- Description/translation APIs still write AI operation/accounting telemetry per call. Retention for AI operation ledgers remains queued for the analytics/ops audit.
- Translation has no translation memory/cache; this is documented as a non-goal/current tradeoff.

### E. UI/UX Audit

Desktop:

- Editor save behavior remains unchanged for owners.
- Linked-outlet policy failures now surface from the same `outlet-save` error path as normal editor saves.
- B2C publish still shows the existing publish success flow after valid writes.

Mobile:

- Mobile menu editor uses the same shared project DAL.
- Mobile design publish now inherits linked-outlet publish policy through `publishProject()`.
- Mobile category translation calls the same `/api/translations` route and now gets server-side linked-outlet protection.

Public/customer:

- Manual edits, design publishes, and accepted AI text changes still invalidate public menu/OBP cache paths.
- Linked outlets cannot publish local visual changes that the master policy disables.

### F. Product/Positioning Audit

The fixes preserve public-business truth authority:

- Master/outlet authority is enforced server-side for edits, translation, and design publish.
- Owner-facing workflow stays simple; no new setting or decision was added.
- Translation remains an owner aid, not an autonomous public publisher.
- Design changes are still public truth only after explicit owner publish/save paths.

### G. Documentation Alignment

Updated:

- `__docs__/projects/multi-language-translation/multi-language-translation_firebase.md`
- `__docs__/projects/multi-language-translation/multi-language-translation_impl.md`
- `__docs__/projects/b2c-view/b2c-view_firebase.md`
- `__docs__/multi-outlet-consistency/multi-outlet-consistency_firebase.md`
- `__docs__/audits/menulist-production-readiness-audit.md`

### H. Fixes Made

Changed runtime files:

- `src/app/api/translations/route.ts`
- `src/lib/multiOutlet/serverOutletPolicy.ts`
- `src/app/api/projects/outlet-save/route.ts`
- `src/database/projects/index.ts`

### I. Validation Performed

Commands run after this slice:

- `npx tsc --noEmit --incremental false --pretty false` - passed after runtime changes
- `npx tsc --noEmit --incremental false --pretty false` - passed after docs/report update
- `npm run lint` - passed
- `git diff --check` - passed

Manual/code review validation:

- Verified translation route now blocks linked-outlet inherited item/category keys before Gemini.
- Verified `getLinkedOutletPolicyBlockReason()` still preserves description/image policy behavior and adds translation without changing client UI.
- Verified `publishProject()` retains master existence validation before linked outlet publish handoff.
- Verified desktop B2C and mobile design both call `publishProject()`.
- Verified desktop/mobile editor saves use `updateProject()` / `updateProjectWithoutLoader()` shared DAL.

Browser/runtime validation:

- Not run in this slice. Editor and mobile design browser smoke remain required before full certification.

Build validation:

- `npm run build` not run because the full production-readiness audit is not complete. Build remains a global completion gate.

---

## Completed Audit 6: AI Image Generation and Media/Image Systems

### A. Feature Identification

**Feature cluster:** single menu image generation, image editing, batch image generation, image upload/storage, linked-outlet image policy, and generated-image owner acceptance.

Relevant routes and files inspected:

- `src/app/api/image-generation/route.ts`
- `src/app/api/image-generation/batch-trigger/route.ts`
- `src/app/api/image-generation/batch-generation/route.ts`
- `src/app/api/image-generation/generators.ts`
- `src/app/api/image-editing/route.ts`
- `src/lib/apiUtils/index.ts`
- `src/lib/google/cloudTask/index.ts`
- `src/lib/validation/apiSchemas.ts`
- `src/lib/multiOutlet/serverOutletPolicy.ts`
- `src/lib/media/*`
- `src/database/imageBatchProcessing/index.tsx`
- `src/database/imageBatchProcessing/server.ts`
- `src/database/storage/uploadBase64MediaImageAdmin.ts`
- `src/database/projects/index.ts`
- `src/services/ai/image/*`
- `src/hooks/useImageBatchJobListener.ts`
- `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx`
- `src/components/templates/main-app/projects/editorView/AiImageGenerator/*`
- `src/components/mobile/screens/MobileMenuScreen.tsx`
- `storage.rules`
- `firestore.rules`
- `__docs__/projects/ai-image-generation/*`

Affected surfaces:

- Owner dashboard: yes, editor image modal and batch generation.
- Mobile owner flow: yes, mobile menu image upload uses shared project/media upload primitives; AI generation modal remains desktop-oriented.
- Public menu/customer page: yes, accepted item images become customer-visible public truth.
- Official Business Page: indirectly through shared media profile and public image safety.
- Website/marketing claim: docs only; no public website copy changed in this slice.
- Admin/internal operations: yes, Cloud Tasks worker and AI operation/accounting records.
- Billing/entitlement: yes, AI capacity checks and operation accounting.
- Analytics/feedback/reviews: not directly.
- Multi-location behavior: yes, linked outlet image override policy.
- Cache/public truth: yes, accepted image writes go through project update paths that invalidate public menu/OBP cache.

### B. End-to-End Request/Data Flow

Single image generation:

1. Owner opens `ImageUploadModal`, selects an item, optionally adds prompt/reference image, and calls `generateImageViaApi()`.
2. Client now sends item id with item details so linked-outlet policy can identify inherited items.
3. `POST /api/image-generation` uses `withAuth()`, Safe Mode, expensive-AI rate limit, Zod payload validation, linked-outlet image policy, AI capacity, Gemini generation, summarized operation accounting, and safe response logging.
4. The route returns base64 image previews only; project data is not mutated until owner accepts/upload saves.
5. Accepted images upload through shared media/project helpers and then save through `updateProject()` with public cache invalidation.

Image editing:

1. Owner opens `EditImageModal` from an existing image.
2. Client sends only real prompt images, not empty placeholder image objects.
3. `POST /api/image-editing` validates source/reference images, linked-outlet policy, AI capacity, and provider output.
4. Provider failures and no-image responses now return errors instead of becoming false 200 OK responses.
5. Accepted edited images flow through the same owner acceptance/upload/save path as generated images.

Batch image generation:

1. Owner creates a visible batch job document, then calls `/api/image-generation/batch-trigger`.
2. Batch trigger validates payload, linked-outlet image policy, total batch AI capacity, registers requested item ids on the job, and enqueues one Cloud Task per item.
3. Cloud Tasks calls `/api/image-generation/batch-generation` with project header and shared worker secret.
4. Worker validates the secret/header, Zod payload, job/project match, requested item id, terminal status, duplicate item state, AI capacity, and provider output.
5. Worker uploads generated image bytes through Admin SDK to public `media/menuItem/{tId}/{sId}/...` Storage paths, records summarized AI accounting, and updates the batch job.
6. The owner reviews batch results and either uploads selected images to the project or discards/cancels, using existing project/cache paths.

### C. Correctness Findings

1. **Fixed: image-editing schema did not validate the actual runtime payload.**  
   The client sent `referanceImage`, `feature`, and `promptImages`, but the server schema accepted only a generic prompt/mode shape. The schema now validates the real payload and bounds image URLs/MIME types.

2. **Fixed: image editing could return 200 after provider failure.**  
   `editImageViaFlash()` returned a `NextResponse` object that the route treated as a successful provider result. Provider errors and empty image results now return failure responses without accounting as success.

3. **Fixed: single image generation did not send item id.**  
   Linked-outlet image policy could not block inherited item image generation from the single-image client path. The client now includes `itemDetails.id`.

4. **Fixed: batch worker was protected only by a spoofable project header.**  
   Task enqueue now sends `x-menulist-task-secret`; worker verifies the shared secret and project id before parsing/processing the request.

5. **Fixed: batch worker used client Firestore/Storage helpers without an owner session.**  
   Worker job reads/writes now use Admin SDK helpers, and generated images upload through an explicit Admin SDK media upload path scoped by tenant/store.

6. **Fixed: batch trigger could show false success after enqueue failure.**  
   The client wrapper now throws on trigger failure, and the modal marks the pre-created job as failed when startup fails.

7. **Fixed: raw provider/image payloads could be logged or stored in operation records.**  
   Provider responses and reference images are now summarized before logs/accounting.

### D. Firebase Cost Audit

Verified reads/writes:

- Single image generation: project/outlet policy read, optional master-store read, subscription/capacity read, provider call, AI accounting write on success; no project write until owner accepts.
- Image editing: same policy/capacity/accounting pattern as single generation; no project write until owner accepts.
- Batch trigger: project/outlet policy read, optional master-store read, subscription/capacity read for total item count, one job update for requested item ids, one Cloud Task per item.
- Batch worker: one job read, one subscription/capacity read, one Admin Storage upload on successful provider output, AI accounting/subscription writes, and one batch job update per item.
- Batch listener: one scoped query with `projectId`, status `in`, and `limit(1)`; listener remains justified only while owner has an active batch job.

Cost fixes:

- Added total batch capacity preflight before task fanout.
- Added worker idempotency guard for duplicate item tasks.
- Removed raw image/provider responses from Firestore operation logs.
- Switched worker uploads to a single explicit media upload per generated image instead of failing/retrying through unauthenticated client Storage.

Remaining cost risk:

- Batch jobs still write one progress update per item. This is acceptable for owner-visible progress but should be monitored before allowing very large batch sizes.
- Image generation/editing does not use prompt/result caching; this remains a product tradeoff because owners must review images before public truth changes.

### E. UI/UX Audit

Desktop:

- Image generation still uses the existing editor modal and owner acceptance model.
- Batch startup failures now surface as failed jobs instead of false success.
- Edit failures now surface as failures instead of silently returning empty results after a false success path.

Mobile:

- Mobile owner image upload uses the shared project/media upload path.
- Mobile does not expose the full AI generation modal as a separate mobile-native flow in this slice; this remains a parity gap for future product decision, not a regression.

Public/customer:

- Public images are only mutated after owner acceptance and project save.
- Worker-generated batch images are stored under public media profile paths so accepted item images can render on customer menus.

### F. Product/Positioning Audit

The hardening preserves MenuList's public-truth model:

- Generated images remain reviewed owner inputs, not autonomous public changes.
- Linked outlets cannot generate local inherited-item imagery when master policy blocks image overrides.
- No new owner settings or image-management dashboard were added.
- The feature stays bounded to menu truth preparation rather than expanding into a generic image tool.

### G. Documentation Alignment

Updated:

- `__docs__/projects/ai-image-generation/ai-image-generation_firebase.md`
- `__docs__/projects/ai-image-generation/ai-image-generation_impl.md`
- `__docs__/audits/menulist-production-readiness-audit.md`

### H. Fixes Made

Changed runtime files:

- `src/app/api/image-generation/route.ts`
- `src/app/api/image-generation/batch-trigger/route.ts`
- `src/app/api/image-generation/batch-generation/route.ts`
- `src/app/api/image-generation/generators.ts`
- `src/app/api/image-editing/route.ts`
- `src/lib/apiUtils/index.ts`
- `src/lib/google/cloudTask/index.ts`
- `src/lib/validation/apiSchemas.ts`
- `src/lib/env/validateEnv.ts`
- `src/lib/ai/imageOperationLogging.ts`
- `src/database/imageBatchProcessing/server.ts`
- `src/database/storage/uploadBase64MediaImageAdmin.ts`
- `src/services/ai/image/generateImageViaApi.ts`
- `src/services/ai/image/triggerBatchImageGenerationApi.ts`
- `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx`
- `src/components/templates/main-app/projects/editorView/AiImageGenerator/EditImageModal.tsx`
- `src/components/templates/main-app/projects/types/batchJob.types.ts`

### I. Validation Performed

Commands run after runtime changes:

- `npx tsc --noEmit --incremental false --pretty false` - passed
- `npx tsc --noEmit --incremental false --pretty false` - passed after docs/report update
- `npm run lint` - passed
- `git diff --check` - passed

Manual/code review validation:

- Verified server schemas now match generation/editing payloads.
- Verified worker uses Admin SDK job reads/writes and Admin SDK Storage upload.
- Verified task enqueue sends the shared worker secret and no longer logs raw task payload.
- Verified provider responses/reference images are summarized before logs/accounting.
- Verified linked-outlet image policy receives item ids from single, edit, and batch paths.
- Verified accepted images still depend on owner save/update paths for public cache invalidation.

Browser/runtime validation:

- Not run in this slice. Desktop image modal and batch job browser smoke remain required before full certification.

Build validation:

- `npm run build` not run because the full production-readiness audit is not complete. Build remains a global completion gate.

---

## Completed Audit 7: Digital Screens and Display Media

### A. Feature Identification

**Feature cluster:** Digital Screens public display, screen token routing, owner screen setup, display media upload, public live refresh, and daily seen signal.

Relevant routes and files inspected:

- `src/app/screen/[token]/page.tsx`
- `src/app/screen/[token]/ScreenDisplay.tsx`
- `src/app/screen/[token]/MenuBoardDisplay.tsx`
- `src/app/screen/[token]/ScreenAttribution.tsx`
- `src/app/api/screen/seen/route.ts`
- `src/database/campaigns/index.ts`
- `src/database/campaigns/serverScreen.ts`
- `src/lib/screen/screenContent.ts`
- `src/lib/screen/screenInvalidation.ts`
- `src/lib/screen/publicScreenState.ts`
- `src/lib/screen/utils.ts`
- `src/components/mobile/screens/MobileDigitalScreensScreen.tsx`
- `firestore.rules`
- `storage.rules`
- `__docs__/digital-screens/*`

Affected surfaces:

- Owner dashboard: yes, Digital Screen settings and owner uploads.
- Mobile owner flow: yes, shared mobile screen management surface.
- Public menu/customer page: indirectly, through menu edits triggering screen refresh.
- Official Business Page: no direct changes.
- Website/marketing claim: docs only; no website copy changed.
- Admin/internal operations: yes, Firestore rules and daily seen signal.
- Billing/entitlement: screen SSR blocks inactive/blocked stores.
- Analytics/feedback/reviews: daily seen operational signal only.
- Multi-location behavior: store-scoped screen token and store id.
- Cache/public truth: yes, public menu cache invalidation touches screen version and screen SSR cache tag.

### B. End-to-End Request/Data Flow

Public screen flow:

1. TV opens `/screen/[token]` or `/screen/[token]?mode=highlights`.
2. Server component resolves token through Admin SDK in `getScreenDataByTokenServer()`.
3. Resolver reads the matching `platformSummary/campaigns_{storeId}` summary, store doc, and automatic menu context.
4. Inactive or blocked stores return not found.
5. Menu Board uses generated `screen.menuProjection` when current; otherwise it falls back to project reads.
6. Highlights uses owner uploads only when override is enabled; otherwise it generates factual slides from menu/campaign data.
7. Client caches data in localStorage and sends at most one daily `/api/screen/seen` signal.
8. Client now listens to `platformSummary/screen_{storeId}` for content-version changes.
9. Owner menu/screen changes update canonical `campaigns_{storeId}.screen`, then sync the public-safe listener mirror.
10. Public display reloads with jitter when the mirror content version increases.

Owner flow:

1. Owner opens screen settings on desktop or mobile.
2. `getScreenState()` reads `platformSummary/campaigns_{sId}`.
3. First setup calls `initializeScreenState()`, generates a high-entropy token, writes canonical state, and writes the safe mirror.
4. Owner upload stores prepared media, adds a pinned slide, bumps content version, and syncs the safe mirror.
5. Owner delete/caption/override actions update canonical screen state, bump version when public output changes, and sync the safe mirror.

### C. Correctness Findings

1. **Fixed: public screen clients could read internal owner summary data.**  
   Firestore rules allowed unauthenticated reads of enabled `platformSummary/campaigns_{storeId}` documents. Those docs contain more than screen version data, including Today/campaign summaries, staff prompt, and physical-surface state. Public clients now listen to `platformSummary/screen_{storeId}`, a mirror with only `storeId`, `screenToken`, `enabled`, `contentVersion`, `lastContentChangeAt`, and `updatedAt`.

2. **Fixed: Firestore public rule was overbroad.**  
   Removed unauthenticated `campaigns_*` summary reads and replaced them with a strict `screen_*` state rule that enforces the exact safe key set, token format, matching store id, enabled state, timestamps, and positive integer content version.

3. **Fixed: override setting did not refresh live screens.**  
   `updateScreenSettings()` previously wrote only the override flag. It now reads existing screen state, bumps `contentVersion`, updates `lastContentChangeAt`, and syncs the safe mirror.

4. **Fixed: screen mutation paths could create partial screen state.**  
   Pinned slide add/remove/caption paths now require an initialized screen token before writing. They write full next screen state and mirror the public version.

5. **Fixed: seen endpoint accepted weak store path input and logged token fragments.**  
   `/api/screen/seen` now validates token and store id formats before direct doc lookup, rejects non-string/non-number store ids, and uses sanitized structured logging.

### D. Firebase Cost Audit

Verified steady-state reads:

- Screen SSR cold path: token query + store doc + optional project summary/project fallback; cached by `unstable_cache` for 60 seconds.
- Connected public display: one `onSnapshot` read on `platformSummary/screen_{storeId}` at connect, then one read per content-version update.
- Daily seen signal: one direct Admin SDK doc read by `campaigns_{storeId}` when `storeId` is provided and one write only when the screen was not already seen today.
- Owner settings: one canonical `campaigns_{sId}` read.

Cost changes from fixes:

- Public listener read cost is unchanged: still one exact document listener, now on the small safe mirror.
- Owner screen setup/content mutations now add one tiny `platformSummary/screen_{sId}` write after the canonical screen write.
- Public menu cache invalidation for initialized screens now writes both canonical screen version and safe mirror version.

Cost verdict:

- The extra mirror write is justified because it removes unauthenticated public reads of the larger internal campaign summary document.
- No new collection, Cloud Function, scheduler, Storage path, or index was added.
- Daily seen remains one write per day per active screen, not a heartbeat.

### E. UI/UX Audit

Desktop:

- Existing screen setup cards, QR links, last-seen status, owner upload list, caption edit, delete, and override toggle remain intact.
- Override toggle now actually refreshes connected screens.

Mobile:

- Mobile screen management uses the same shared DAL functions, so mirror sync and version bumps apply to both desktop and mobile owner actions.
- No new mobile-only route or bypass was added.

Public/customer display:

- Menu Board and Highlights keep the same visual behavior and refresh pattern.
- Public clients continue to show cached/offline content if the listener fails.
- Public screen runtime receives less internal data after the fix.

### F. Product/Positioning Audit

The fix strengthens MenuList's public-business truth model:

- Public screens still follow menu truth automatically.
- Owners do not get new screen-management decisions.
- The runtime exposes only the public reload packet needed for correctness.
- Screen display remains a physical public truth surface, not a generic signage builder.

### G. Documentation Alignment

Updated:

- `__docs__/digital-screens/README.md`
- `__docs__/digital-screens/digital-screens_impl.md`
- `__docs__/digital-screens/digital-screens_firebase.md`
- `__docs__/audits/menulist-production-readiness-audit.md`

### H. Fixes Made

Changed runtime/infrastructure files:

- `src/lib/screen/publicScreenState.ts`
- `src/app/screen/[token]/ScreenDisplay.tsx`
- `src/app/screen/[token]/MenuBoardDisplay.tsx`
- `src/database/campaigns/index.ts`
- `src/lib/screen/screenInvalidation.ts`
- `src/app/api/screen/seen/route.ts`
- `firestore.rules`

### I. Validation Performed

Commands run after runtime changes:

- `npx tsc --noEmit --incremental false --pretty false` - failed at the time on unrelated CampaignCue TypeScript errors; later re-run during Audit 8 passed after the worktree changed.
- `npm run lint` - passed
- `git diff --check` - passed
- `firebase emulators:exec --only firestore --project ecomsai "echo firestore-rules-loaded"` - passed
- `firebase deploy --only firestore:rules --project ecomsai` - passed and released `firestore.rules`

Manual/code review validation:

- Verified public display listeners now use `platformSummary/screen_{storeId}`.
- Verified unauthenticated Firestore reads no longer allow `campaigns_*` summary docs.
- Verified owner setup/upload/delete/caption/override/version-bump paths sync the safe mirror.
- Verified public menu cache invalidation syncs the safe mirror after canonical screen version changes.
- Verified daily seen direct lookup still verifies token against canonical screen state before writing.

Browser/runtime validation:

- Not run in this slice. TV display browser smoke remains required before full certification.

Build validation:

- `npm run build` not run because the full production-readiness audit is not complete and TypeScript is already blocked by unrelated CampaignCue errors.

---

## Completed Audit 8: Decision Intelligence, CMI, MCE, and Output Control

**Feature cluster:** Decision Blocks customer recommendations, Continuous Menu Intelligence observation state, Menu Correctness Engine save-time validation, and the dormant output-control rendering layer.

### A. Feature Identification

Routes and surfaces inspected:

- Public menu: `src/app/client/[[...slug]]/page.tsx`, `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`, `src/components/templates/main-app/projects/b2cView/output/DecisionBlocks.tsx`
- Owner desktop: `src/components/templates/main-app/projects/editorView/DecisionBlocksSettingsModal.tsx`, `src/components/templates/main-app/projects/editorView/decisionBlocks.shared.ts`, `src/components/templates/main-app/projects/editorView/Editor.tsx`
- Owner mobile: `src/components/mobile/sheets/SmartRecommendationsSheet.tsx`, `src/components/mobile/screens/MobileHoursScreen.tsx`
- Backend/Functions: `functions/src/decisionBlocksScoring.ts`, `functions/src/intelligence/menuIntelligence.ts`, `functions/src/intelligence/shared/analyticsAggregator.ts`, `functions/src/intelligence/shared/itemExtractor.ts`, `functions/src/intelligence/shared/scoreNormalizer.ts`
- DAL/runtime libraries: `src/lib/intelligence/dal.ts`, `src/lib/mce/index.ts`, `src/lib/mce/utils.ts`, `src/lib/outputControl/index.ts`, `src/lib/outputControl/hoursConfidence.ts`
- Public output-control consumers: `src/app/client/obp/OBPResolvedSurface.tsx`, `src/app/client/obp/BrandOBPContent.tsx`, `src/components/atoms/TrustSignals.tsx`
- Write path: `src/database/projects/index.ts`
- Configuration: `src/config/features.ts`, `src/config/decisionBlocks.ts`
- Rules/docs: `firestore.rules`, `__docs__/decision-intelligence/*`, `__docs__/continuous-menu-intelligence/*`, `__docs__/menu-correctness-engine/*`

Affected areas:

- Owner dashboard: yes, recommendation controls and MCE publish gate.
- Mobile owner flow: yes, Smart Recommendations and hours confidence nudge path.
- Public menu/customer page: yes, Decision Blocks.
- Official Business Page: yes, output control is wired but flag-disabled.
- Website/marketing claim: docs only in this slice; public website copy not changed.
- Admin/internal operations: yes, scheduler monitor/manual scoring callable and run logs.
- Billing/entitlement: no direct entitlement change in this slice.
- Analytics/feedback/reviews: analytics snapshot consumption and Decision Block events inspected; broader analytics audit still queued.
- Multi-location behavior: store-local timezone behavior corrected; broader outlet intelligence behavior still queued.
- Cache/public truth: public menu reads embedded `project.publicDecisionBlocks`; owner saves continue to invalidate public menu/OBP cache through `updateProject()`.

### B. End-to-End Request/Data Flow

Decision Blocks scheduled flow:

1. `computeDecisionBlocksScores` runs hourly at `:30` UTC.
2. Function reads `platformSummary/storesSummary`, filters stores whose local settlement window is due, then reads `platformSummary/projects_{sId}` and active project docs.
3. Per project it reads `analytics/{tId}_{sId}_{projectId}_intelligence_7d`.
4. Missing/stale analytics snapshots score as empty analytics instead of falling back to daily range reads.
5. Scheduler extracts active items, computes Decision Blocks, and writes `project.publicDecisionBlocks`.
6. It also computes CMI state and writes `menuIntelligence/{tId}_{sId}_{projectId}`.
7. Public menu route loads project truth, extracts the embedded Decision Blocks projection, and passes it to `DecisionBlocks.tsx`.
8. Runtime filters candidates by TTL, malformed timestamp safety, lifecycle gates, business type, owner toggles/pins, item active/available state, category time slots, duplicate prevention, and hidden-price rules.

Manual recovery flow:

1. `triggerDecisionBlocksScoring` requires authenticated platform role.
2. Scoped project/store/all-store requests recompute Decision Blocks.
3. After this audit fix, manual recovery uses the same compact analytics snapshot path as scheduled scoring.

MCE flow:

1. Owner saves project data through `updateProject()`.
2. When `ENABLE_MCE` is true, `mceValidate()` runs client-side on the save payload.
3. `_mce` metadata is merged into the same project write.
4. Public/admin surfaces continue reading the same project document; MCE does not create a parallel truth store.

Output-control flow:

1. `ENABLE_OUTPUT_CONTROL` is currently false.
2. OBP, Brand OBP, TrustSignals, and mobile hours screens are wired to use confidence-gated hours rendering when the flag is enabled.
3. With the flag off, current public output follows the existing hours status behavior.

### C. Correctness Findings

1. **Fixed: public Decision Blocks used viewer timezone for category time-slot checks.**  
   A customer viewing a store menu from another timezone could see the wrong time-slot-gated recommendations.

2. **Fixed: malformed `computedAt` timestamps were not treated as stale.**  
   `NaN` comparisons could allow malformed precomputed data to avoid the hard-stale guard when `validUntil` still looked valid.

3. **Fixed: platform manual scoring used a hidden daily analytics range query when analytics were not prefetched.**  
   This diverged from the scheduler's compact snapshot contract and created a cost surprise during recovery/backfill.

4. **Fixed docs/runtime drift.**  
   Decision Intelligence, CMI, and MCE docs now describe the current controlled-testing checkpoint, active `ENABLE_MCE: true` runtime, embedded `publicDecisionBlocks` write model, compact analytics snapshot cost contract, and priority-only CMI DAL.

5. **Verified: output control is dormant.**  
   `ENABLE_OUTPUT_CONTROL` is false. OBP, TrustSignals, and mobile hours consumers are wired but not production-active.

### D. Firebase Cost Audit

Reads:

- Public Decision Blocks add zero customer Firestore reads because the projection is embedded in the already-loaded project document.
- Scheduled scoring reads per active project: project doc, compact analytics snapshot, and existing intelligence doc when items are present.
- Store/project iteration uses platform summary documents before nested project reads.
- Manual recovery now reads one compact analytics snapshot per scoped active project instead of opening a daily analytics range.

Writes:

- Scheduled scoring writes one project merge for `publicDecisionBlocks`.
- CMI writes one `menuIntelligence` doc per active project with items.
- MCE adds no extra write operation because `_mce` is included in the existing project write.

Cost verdict:

- Cost improved for manual recovery/backfill by removing the hidden daily analytics range query.
- Public page cost did not increase.
- No new collection, index, Storage path, or scheduler was added.
- A targeted Functions deploy is still blocked by external Firebase billing/Secret Manager state.

### E. UI/UX Audit

Desktop:

- Owner recommendation controls remain simple toggles and pins.
- MCE remains silent during normal saves and only affects the existing publish gate when project data is critically invalid.
- No new owner decision or dashboard setting was added.

Mobile:

- Smart Recommendations uses the same project settings model as desktop.
- Mobile hours confidence nudge remains behind the disabled output-control flag.
- No mobile route bypass was added.

Public/customer:

- Decision Blocks keep the same UI, but now evaluate category time slots in the store timezone.
- Stale or malformed automatic scoring degrades to owner-pinned-only behavior rather than unsafe automatic recommendations.
- Output control remains dormant; public hours rendering is unchanged while the flag is off.

### F. Product/Positioning Audit

The fixes support MenuList's public-business truth model:

- Scheduler remains the ranking authority; the client only filters for real-time safety.
- Owner pins remain explicit owner truth but cannot override active/available/time-slot/price-visibility safety.
- CMI remains an observation and priority layer, not a truth-hiding layer.
- MCE validates the existing project document instead of creating duplicate truth stores.

### G. Documentation Alignment

Updated:

- `__docs__/decision-intelligence/README.md`
- `__docs__/decision-intelligence/decision-intelligence_impl.md`
- `__docs__/decision-intelligence/decision-intelligence_firebase.md`
- `__docs__/continuous-menu-intelligence/README.md`
- `__docs__/continuous-menu-intelligence/continuous-menu-intelligence_impl.md`
- `__docs__/continuous-menu-intelligence/continuous-menu-intelligence_firebase.md`
- `__docs__/menu-correctness-engine/README.md`
- `__docs__/menu-correctness-engine/menu-correctness-engine_impl.md`
- `__docs__/menu-correctness-engine/menu-correctness-engine_firebase.md`
- `__docs__/audits/menulist-production-readiness-audit.md`

### H. Fixes Made

Changed runtime files:

- `src/components/templates/main-app/projects/b2cView/output/DecisionBlocks.tsx`
- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`
- `functions/src/decisionBlocksScoring.ts`
- `src/config/features.ts`

Runtime changes:

- Added robust timestamp parsing for Date, ISO/number, Firestore Timestamp, and serialized timestamp shapes.
- Treated invalid/malformed `computedAt` as hard-stale.
- Used store-local minutes for category time-slot checks.
- Passed `storeDetails.timeZone` into the public Decision Blocks renderer.
- Removed the manual scoring daily analytics range-query fallback; manual scoring now uses `fetch7DayAnalytics()`.
- Corrected stale feature-flag comments that implied client-side ranking.

### I. Validation Performed

Commands run after runtime/docs changes:

- `npm --prefix functions run build` - passed
- `npm run lint` - passed
- `git diff --check` - passed after stripping trailing spaces in edited docs
- `npx tsc --noEmit --incremental false --pretty false` - passed
- `firebase deploy --only functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring --project ecomsai --non-interactive` - failed after predeploy lint/build due external Secret Manager billing-disabled HTTP 403 on project `ecomsai`

Deploy blocker details:

- Secret validation failed for `GEMINI_AI_KEY`, `GEMINI_AI_KEY_2`, `GEMINI_AI_KEY_3`, `GEMINI_AI_KEY_4`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `SENTRY_DSN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, and `WHATSAPP_APP_SECRET`.
- This is the same external billing-disabled blocker observed in earlier Firebase Function deploy attempts.

Manual/code review validation:

- Verified `DecisionBlocks` is only called from `MenuPageNew`.
- Verified `MenuPageNew` already has store timezone and now passes it explicitly.
- Verified `triggerDecisionBlocksScoring` is platform-role gated.
- Verified Firestore rules allow tenant/platform reads and deny client writes for `menuIntelligence`.
- Verified `getItemPresentation()` always returns `visible: true` and `getItemsByPriority()` sorts rather than hides.
- Verified output-control consumers are behind `ENABLE_OUTPUT_CONTROL`.

Browser/runtime validation:

- Not run in this slice. Public Decision Blocks browser smoke remains required before full certification.

Build validation:

- `npm run build` not run because the full production-readiness audit is not complete.

---

## Completed Audit 9: Business Health and Owner Business Assistant

**Feature cluster:** Business Health dashboard/page/mobile surface, owner question answering, context packet cache, Action Support, multi-location summary, workflow storage, and internal monitor primitives.

### A. Feature Identification

Routes and surfaces inspected:

- APIs: `src/app/api/owner-business-assistant/current/route.ts`, `analytics/route.ts`, `locations/route.ts`, `answer/route.ts`, `action/route.ts`, `feedback/route.ts`, `thread/[threadId]/route.ts`
- Platform monitor: `src/app/api/platform/owner-business-assistant/monitor/route.ts`
- Server helpers: `src/lib/ownerBusinessAssistant/server/*`
- Actions: `src/lib/ownerBusinessAssistant/actions/*`
- Types/schemas/constants: `src/lib/ownerBusinessAssistant/types.ts`, `schemas.ts`, `constants.ts`
- UI/hooks: `src/hooks/ownerBusinessAssistant/*`, `src/components/templates/main-app/ownerBusinessAssistant/*`, `src/components/mobile/screens/MobileBusinessHealthScreen.tsx`, `src/components/mobile/components/MobileBusinessHealthCard.tsx`
- Scheduler builders: `functions/src/ownerBusinessAssistant/*`, `functions/src/decisionBlocksScoring.ts`, `functions/src/schedulers/menulistMaintenanceScheduler.ts`
- Rules/docs: `firestore.rules`, `__docs__/owner-business-assistant/*`

Affected areas:

- Owner dashboard: yes, dashboard card, Business Health page, analytics strip, suggested questions, and action chips.
- Mobile owner flow: yes, MobileShell Business Health screen and mobile dashboard summary card.
- Public menu/customer page: indirectly, through action public-truth guardrails and cache invalidation expectations.
- Official Business Page: indirectly, through public-truth action blocking/open-screen handoff.
- Website/marketing claim: docs only in this slice.
- Admin/internal operations: yes, platform monitor and scheduler/cleanup docs.
- Billing/entitlement: no direct billing mutation; billing questions/actions stay navigate/open only.
- Analytics/feedback/reviews: yes, compact analytics index, feedback summary, answer events, feedback route.
- Multi-location behavior: yes, compact tenant summary route.
- Cache/public truth: yes, browser cache, server packet cache, and owner-assistant packet invalidation contracts.

### B. End-to-End Request/Data Flow

Scheduler/read-model flow:

1. Unified scheduler processes due stores after analytics settlement.
2. Business Health builder uses `platformSummary/projects_{sId}`, capped active project analytics docs, menu intelligence, stores summary facts, and capped guest feedback summaries.
3. Builder writes compact `platformSummary/ownerBusinessHealthCurrent_{tId}_{sId}`, optional `ownerBusinessAnalyticsIndex_{tId}_{sId}`, daily snapshot, and compact multi-location summary.
4. Function writer invalidates matching owner-assistant context packet cache keys after committing the read model.

Owner current/analytics flow:

1. Dashboard/page/mobile hooks read browser cache first.
2. API routes are protected by `withAuth`, feature flags, rate limits, store-scope checks, and `VIEW_ANALYTICS` permission checks.
3. Packet builder uses server packet cache when valid; on miss it reads only compact current/analytics docs.
4. `not_ready` fallback packets and missing analytics responses are not cached as durable business facts.

Answer flow:

1. `/answer` validates body, applies SAFE_MODE only when provider AI answers are enabled, and rate limits before work.
2. It builds a context packet cache-first, classifies the intent, refuses unsupported domains/periods without raw scans, and returns deterministic grounded answers while `ENABLE_OWNER_BUSINESS_HEALTH_AI_ANSWERS` is false.
3. Optional thread history writes one capped thread document, and optional answer-event logging writes one compact monitor event.

Action flow:

1. `/action` validates a registered action request.
2. It now requires both parent Business Health and Action Support flags.
3. Registry/permission/project-scope checks run before navigation, draft preparation, or check workflow writes.
4. Public-truth writes remain blocked by default and hand off to existing MenuList screens/services.

### C. Correctness Findings

1. **Fixed: Action Support endpoint did not require the parent Business Health flag.**  
   `/api/owner-business-assistant/action` and the executor now require both `ENABLE_OWNER_BUSINESS_HEALTH` and `ENABLE_OWNER_BUSINESS_ACTION_SUPPORT`.

2. **Fixed: multi-location summary endpoint ignored the multi-location flag.**  
   `/api/owner-business-assistant/locations` now requires `ENABLE_OWNER_BUSINESS_HEALTH_MULTI_LOCATION` in addition to the parent feature flag.

3. **Fixed: action payloads were not size-capped.**  
   `OwnerBusinessAssistantActionRequestSchema` now caps `payload` at 12,000 JSON characters before it can be stored in drafts or action audit docs.

Verified:

- Answer route remains deterministic while provider AI answers are disabled.
- Action registry and public-truth guard block direct public-truth mutation by default.
- Thread storage is capped at 20 embedded messages and expires with the thread doc.
- Feedback and answer-event writes are compact and flag-gated.
- Firestore rules deny client reads/writes for assistant workflow collections.

### D. Firebase Cost Audit

Reads:

- Current route: 0 reads on browser/server cache hit, 1 compact `platformSummary` read on miss.
- Analytics route: 0 reads on cache hit, 1 compact analytics-index read on miss.
- Answer route: 0 Firestore reads on server packet cache hit; current + analytics-index on miss.
- Locations route: 2 reads on miss, one tenant summary plus `storesSummary`.
- Scheduler analytics index: bounded to at most 10 active projects for dashboard/today docs.
- Guest feedback builder: capped scheduler-only read path, not owner question path.

Writes:

- Current/snapshot/index/multi-location docs are scheduler writes.
- Answer events, feedback, threads, drafts, and action audit docs are flag-gated and retention-backed.
- Successful low-risk navigation does not write an audit doc.
- New payload cap reduces oversized draft/action document risk.

Cost verdict:

- Hot owner question paths stay cache-first and summary-first.
- No new collection, Storage path, scheduler, or index was added in this audit slice.
- No Firebase deploy was required because only Next/API/schema/docs changed.

### E. UI/UX Audit

Desktop:

- Business Health card and page show stable state and explicitly render "No action needed." when current facts are stable.
- Analytics strip reuses compact period data and avoids raw dashboard clutter.
- Action chips remain registry-driven and open existing screens/drafts instead of direct mutation.

Mobile:

- Mobile dashboard uses the same Business Health current/analytics hooks.
- Mobile Business Health lives inside MobileShell sub-screen routing.
- Mobile action sheet uses the same Action Support API and flags as desktop.

Public/customer:

- No public/customer UI changed in this slice.
- Public-truth action writes remain disabled/guarded, so Business Health cannot silently mutate customer-facing truth.

### F. Product/Positioning Audit

The feature remains Business Health, not a generic assistant:

- It shows checked business state before chat.
- It refuses unsupported domains instead of scanning live collections.
- It presents stable "No action needed" states.
- It keeps mutations in existing owner screens and existing public-truth services.

### G. Documentation Alignment

Updated:

- `__docs__/owner-business-assistant/owner-business-assistant_impl.md`
- `__docs__/owner-business-assistant/owner-business-assistant_action-support.md`
- `__docs__/owner-business-assistant/owner-business-assistant_firebase.md`
- `__docs__/owner-business-assistant/owner-business-assistant_validation.md`
- `__docs__/audits/menulist-production-readiness-audit.md`

### H. Fixes Made

Changed runtime files:

- `src/app/api/owner-business-assistant/action/route.ts`
- `src/app/api/owner-business-assistant/locations/route.ts`
- `src/lib/ownerBusinessAssistant/actions/actionExecutor.ts`
- `src/lib/ownerBusinessAssistant/schemas.ts`

Runtime changes:

- Parent Business Health flag now gates Action Support endpoint and executor.
- Multi-location flag now gates the locations endpoint.
- Action payloads are capped before draft/audit storage.

### I. Validation Performed

Commands run after runtime/docs changes:

- `npx tsc --noEmit --incremental false --pretty false` - passed
- `npm run lint` - passed
- `git diff --check` - passed

Manual/code review validation:

- Verified current/analytics/answer routes use `withAuth`, feature flags, rate limits, scope resolution, and permission checks.
- Verified action execution validates action registry, permissions, project membership, and public-truth guardrails.
- Verified thread route checks tenant/store before returning one capped thread doc.
- Verified workflow collections are denied to client Firestore in `firestore.rules`.
- Verified maintenance scheduler has cleanup tasks for expired Business Health workflow docs.

Browser/runtime validation:

- Not run in this slice. Desktop/mobile Business Health browser smoke remains required before full certification.

Build validation:

- `npm run build` not run because the full production-readiness audit is not complete.

---

## Completed Audit 10: Analytics, Guest Feedback, Reviews, and Owner Analytics Surfaces

**Feature cluster:** public customer analytics writes, owner menu/OBP/customer-app analytics read models, legacy GA report routes, Guest Feedback inbox/public submission, Reviews & Reputation scaffolding, and weekly narrative/ROI analytics APIs.

### A. Feature Identification

Routes/surfaces inspected:

- Public writes: `src/app/api/public/analytics/track/route.ts`, `src/app/api/public/feedback/submit/route.ts`
- Owner analytics: `src/components/templates/main-app/dashboard/OwnerDashboard/*`, `src/components/templates/main-app/dashboard/AnalyticsDashboard/*`, `src/hooks/useOwnerDashboard.ts`, `src/hooks/useOBPDashboard.ts`, `src/hooks/useAnalyticsData.ts`, `src/hooks/useCustomerAppDashboard.ts`, `src/database/ownerDashboard/index.ts`, `src/database/analytics/index.ts`, `src/lib/analytics/*`
- Legacy GA routes: `src/app/api/analytics/route.ts`, `src/app/api/analytics/realtime/route.ts`, `src/app/api/analytics/reports/route.ts`, `src/app/api/analytics/menu/route.ts`, `src/app/api/analytics/locations/route.ts`
- Expensive analytics routes: `src/app/api/analytics/weekly-narrative/generate-local/route.ts`, `src/app/api/analytics/weekly-narrative/regenerate/route.ts`, `src/app/api/analytics/roi-metrics/route.ts`
- Feedback: `src/app/feedback/[projectId]/page.tsx`, `src/components/atoms/GuestFeedbackForm/index.tsx`, `src/components/templates/main-app/feedback/*`, `src/components/mobile/screens/MobileFeedbackScreen.tsx`, `src/components/mobile/screens/MobileFeedbackDetail.tsx`, `src/database/guestFeedback/*`
- Reviews: `src/app/api/reviews/states/route.ts`, `src/app/api/reviews/suggest/route.ts`, `src/components/templates/main-app/reviews/*`, `src/types/reviews.ts`
- Firebase contracts: `firestore.rules`, `firestore.indexes.json`, `src/constants/database.ts`, `src/config/features.ts`
- Docs: `__docs__/client-menu/analytics-tracking/analytics-tracking_firebase.md`, `__docs__/projects/internal-feedback-system/*`, `__docs__/reviews-reputation/README.md`, `__docs__/reputation-protection/reputation-protection_impl.md`

Affected surfaces:

- owner dashboard: yes
- mobile owner flow: yes, feedback inbox and Customer App metrics
- public menu/customer page: yes, analytics and feedback
- Official Business Page: yes, OBP analytics
- website/marketing claim: docs only, no public marketing copy changed
- admin/internal operations: yes, legacy GA routes and weekly narrative
- billing/entitlement: AI reply suggestion capacity/accounting inspected
- analytics/feedback/reviews: yes
- multi-location behavior: yes, guest feedback store-scoped update path
- cache/public truth: analytics writes do not invalidate public truth; feedback remains private and does not invalidate public packets

### B. End-to-End Request/Data Flow

Public analytics:

1. Public menu/OBP/customer-app trackers coalesce local counters in `src/database/analytics/index.ts`.
2. Browser flushes to `POST /api/public/analytics/track`.
3. Route rate-limits by IP, validates body shape, loads store/project target, enforces store analytics preferences, resolves the store-owned business-day date, strips Decision Blocks fields when disabled, and writes daily analytics via Admin SDK.
4. Owner dashboard reads `analytics/{tId}_{sId}_{projectId}_dashboard_summary` plus today's daily doc from client DAL with SWR/localStorage cache.
5. Nightly scheduler read models remain the cost boundary for settled tabs.

Guest Feedback:

1. Customer opens `/feedback/{projectId}` or feedback link from public surfaces.
2. Server page loads nested project and store with Admin SDK and blocks inactive/deleted/blocked/disabled targets.
3. Client form validates rating and visible fields, then posts to `POST /api/public/feedback/submit`.
4. API rate-limits, validates honeypot/body, re-verifies project/store, enforces store-owned field defaults, writes with Admin SDK, and returns `feedbackId` plus configured review URL.
5. Desktop and mobile owner inboxes read paginated tenant/store-scoped feedback through the shared client DAL and can mark `new`/`resolved`.

Reviews:

1. Product remains disabled by default until GBP ingestion is real.
2. `GET /api/reviews/states` is authenticated, parent-flag gated, rate-limited, and queries non-expired state docs when enabled.
3. `POST /api/reviews/suggest` is authenticated, parent+child flag gated, SAFE_MODE guarded, rate-limited, capacity/accounting checked, and returns owner-reviewed suggestions only.

### C. Correctness Findings

1. Fixed: public feedback route imported the browser Firestore DAL and relied on unauthenticated direct Firestore create rules. Added `src/database/guestFeedback/server.ts`, moved public writes to Admin SDK, and denied public Firestore creates.
2. Fixed: public feedback API accepted hidden contact fields when posted directly. The API now enforces store defaults, drops disabled fields, and validates required fields server-side.
3. Fixed: feedback single-doc read/update checked tenant but not store. Store-scoped managers now cannot update another store's feedback inside the same tenant.
4. Fixed: feedback rules allowed broad content mutation. Client updates are now limited to resolution fields.
5. Fixed: public analytics route trusted client timezone/business-day metadata and client-only tracking preferences. The route now uses store-owned settings and skips disabled surfaces server-side.
6. Fixed: legacy GA routes accepted arbitrary property IDs. Added `src/lib/analytics/googlePropertyAccess.ts` and wired store-property authorization into root, realtime, reports, menu, and locations routes.
7. Fixed: reviews feature flags were enabled despite GBP ingestion being blocked and the review UI not mounted. Both review flags are now disabled by default.
8. Fixed: review-state endpoint filtered expiration after `limit(1)`, which could miss an active warning behind an expired doc. It now queries `autoExpiresAt > now`.
9. Fixed: review suggestion route did not require the parent reviews flag or SAFE_MODE. Both guards are now enforced.
10. Fixed: weekly narrative manual generation had SAFE_MODE but no per-user throttle. Added a strict `BATCH_OPERATION` rate limit.

### D. Firebase Cost Audit

- Public analytics writes: one Admin SDK daily-doc merge per coalesced flush/action. Validation cache reads store/project target at most once per 5 minutes per target via `unstable_cache`.
- Public analytics now skips writes when the relevant store analytics category is disabled and strips Decision Blocks fields when that category is disabled.
- Owner dashboard reads: Today reads one daily doc per Menu/OBP surface with a 10-minute local cache; settled tabs read one dashboard summary per surface per scheduler cache window.
- Deep analytics range reads: read-model backed for recent ranges; range including today adds one daily read.
- Guest feedback public submit: one project read, one store read, one feedback write, plus non-blocking compact feedback event write.
- Guest feedback inbox: first desktop load reads one paginated list query plus one count query; mobile reads one paginated list query. No listeners.
- Review states: when enabled, two indexed, rate-limited queries capped to one doc each.
- Weekly narrative: expensive Gemini route is SAFE_MODE guarded and rate-limited to the existing batch-operation budget.
- Firestore indexes updated for non-expired `reviewsState` block/escalation queries.

### E. UI/UX Audit

- Owner dashboard remains read-model driven and uses stable "Today", "Overview", "Yesterday", "This Week", "This Month", and "Overall" tabs.
- Mobile Customer App analytics mirrors desktop card content and keeps compact touch-friendly cards.
- Guest Feedback public form remains mobile-first, private, and non-admin-like.
- Desktop/mobile feedback inboxes share the same DAL and status semantics.
- Reviews UI components are not mounted while the product is disabled, avoiding premature owner clutter.

### F. Product/Positioning Audit

- Analytics remains owner-visible operational evidence, not generic event tracking. Public writes are only accepted for owner dashboard/read-model surfaces.
- Guest Feedback remains a private correction inbox, not CRM, NPS, sentiment, or review gating.
- Reviews remains disabled infrastructure until GBP ingestion exists; AI reply assist is not positioned or surfaced as a generic review-management product.

### G. Documentation Alignment

Updated docs:

- `__docs__/client-menu/analytics-tracking/analytics-tracking_firebase.md`
- `__docs__/projects/internal-feedback-system/README.md`
- `__docs__/projects/internal-feedback-system/internal-feedback-system_impl.md`
- `__docs__/projects/internal-feedback-system/internal-feedback-system_validation.md`
- `__docs__/reviews-reputation/README.md`
- `__docs__/reputation-protection/reputation-protection_impl.md`

Docs now distinguish live public analytics, live Guest Feedback, and disabled Reviews/Reputation scaffolding.

### H. Fixes Made

Runtime/files changed in this slice:

- Added `src/database/guestFeedback/server.ts`
- Added `src/lib/analytics/googlePropertyAccess.ts`
- Updated `src/app/api/public/feedback/submit/route.ts`
- Updated `src/app/api/public/analytics/track/route.ts`
- Updated `src/database/guestFeedback/index.ts`
- Updated `src/lib/validation/apiSchemas.ts`
- Updated `src/app/api/reviews/states/route.ts`
- Updated `src/app/api/reviews/suggest/route.ts`
- Updated `src/app/api/analytics/weekly-narrative/generate-local/route.ts`
- Updated `src/app/api/analytics/{route,realtime,reports,menu,locations}/route.ts`
- Updated `src/config/features.ts`
- Updated `firestore.rules`
- Updated `firestore.indexes.json`

### I. Validation Performed

- `npx tsc --noEmit --incremental false --pretty false` — passed after this slice's runtime changes.
- `npm run lint` — passed.
- `git diff --check` — passed.
- `firebase deploy --only firestore:rules --project ecomsai` — passed.
- `firebase deploy --only firestore:rules,firestore:indexes --project ecomsai` — rules compiled/uploaded, but index deploy failed on an unrelated existing `kb_articles` index 409.
- Targeted `gcloud firestore indexes composite create` commands were issued for the two new `reviewsState` indexes. Both operations were accepted and later reported `done: true`:
  - `reviewsState`: `tId ASC`, `sId ASC`, `blockActive ASC`, `autoExpiresAt ASC`
  - `reviewsState`: `tId ASC`, `sId ASC`, `escalationActive ASC`, `autoExpiresAt ASC`
- Browser smoke for public feedback and owner feedback inbox remains pending.

### Remaining Risk For This Slice

- Legacy Google Analytics routes still depend on correct owner-provided GA property configuration and service-account access.
- Reviews/Reputation is not launched; GBP ingestion, owner mount points, and end-to-end review data flow remain blocked.
- Feedback QR/public form browser smoke was not run yet in this slice.

---

## Completed Audit 11: Roles, Permissions, Staff/User Management, Auth Session Guards, and Multi-Chain Access

**Feature cluster:** staff CRUD, role CRUD, owner/staff login access, session claims, store switching, route permission requirements, Firestore user rules, and multi-location staff payload isolation.

### A. Feature Identification

Routes/surfaces inspected:

- Staff APIs: `src/app/api/staff/route.ts`, `src/app/api/staff/password-reset/route.ts`, `src/app/api/staff/force-signout/route.ts`, `src/app/api/staff/roles/route.ts`, legacy wrapper `src/app/api/auth/create-staff/route.ts`
- Auth/session APIs: `src/app/api/auth/[...nextauth]/route.ts`, `src/app/api/auth/set-claims/route.ts`, `src/app/api/auth/access-status/route.ts`, `src/app/api/auth/switch-store/route.ts`, `src/app/api/auth/update-profile/route.ts`, `src/app/api/auth/change-password/route.ts`
- Runtime helpers: `src/lib/staffManagement/server.ts`, `src/lib/staffManagement/client.ts`, `src/lib/permissions/*`, `src/lib/auth/index.ts`, `src/lib/auth/firebaseAuthSync.ts`, `src/lib/multiOutlet/storeSwitchAccess.ts`, `src/middleware/auth.ts`
- Owner UI: `src/components/templates/main-app/users/usersList/*`, `src/components/templates/main-app/users/permissions/*`, `src/components/auth/SessionExpiryMonitor.tsx`
- Mobile UI: `src/components/mobile/screens/MobileUsersScreen.tsx`, `src/components/mobile/screens/MobileRolesScreen.tsx`, `src/components/mobile/screens/MobileMoreScreen.tsx`, `src/components/mobile/MobileShell.tsx`
- Firebase/rules/docs: `firestore.rules`, `src/constants/permissions.ts`, `src/data/shared/defaultRoles.ts`, `__docs__/roles-permissions/*`, `__docs__/multi-chain-permissions/*`, `__docs__/auth/*`

Affected surfaces:

- owner dashboard: yes
- mobile owner flow: yes
- public menu/customer page: no direct customer render, but role/session correctness protects public-truth write paths
- Official Business Page: indirect through permissions on public presence/domain/settings
- website/marketing claim: docs only
- admin/internal operations: yes, platform user management and Firestore rules
- billing/entitlement: indirect through `canAccessBilling`, `canManageSubscription`, and store switching
- analytics/feedback/reviews: indirect through route permission requirements
- multi-location behavior: yes
- cache/public truth: indirect through permissioned owner writes

### B. End-to-End Request/Data Flow

Staff list and management:

1. Desktop/mobile staff screens call `GET /api/staff?tenantId=&storeId=`.
2. `withAuth()` validates session/CORS and blocks inactive, deleted, unverified, or platform-blocked accounts.
3. Staff server resolves acting authority from the session store role and store document.
4. Staff list reads users assigned to the current store using `users.storeIds array-contains storeId` plus legacy `users.storeId == storeId` variants, validates tenant, loads role store options, and returns sanitized staff summaries.
5. Non-master managers receive only the current-store mapping for each staff member; master users can see/manage tenant store options.
6. Create/update/remove/reset/force-signout routes validate input with Zod, enforce `canManageUsers` and `canAssignRoles` where relevant, validate store/role mappings, update the user doc with Admin SDK, and mirror revocation/disabled state to Firebase Auth.
7. Desktop and mobile update their local staff list from the returned sanitized user. Removal from the current store removes the row even when the account remains assigned elsewhere.

Role management:

1. Desktop/mobile role screens use `POST/PATCH/DELETE /api/staff/roles`.
2. Server checks `canAssignRoles`, locks the owner role, validates role payload permissions against `ALL_PERMISSIONS`, prevents deactivating roles assigned to active current-store users, and writes the store `roles[]` array.
3. `sessionProvider` resolves permissions from the active store role and applies master/outlet policy where relevant.

Auth/session/store switching:

1. NextAuth loads a compact user context into JWT/session.
2. The session user now includes `storeIds` derived from user `storeIds`, `stores[]`, and active `storeId`.
3. Firebase claims sync uses `/api/auth/set-claims`, validates target store membership, and mints store-scoped Firebase custom claims.
4. Store switching uses `/api/auth/switch-store`, checks `canSwitchStores`, validates tenant store membership, and refreshes Firebase claims.
5. `SessionExpiryMonitor` polls `/api/auth/access-status` while visible and signs out on revoked, inactive, deleted, blocked, tenant-blocked, or store-blocked access.

### C. Correctness Findings

1. Fixed: non-master store managers could receive staff summaries containing all of a staff member's store mappings inside the tenant. Staff payloads are now current-store scoped unless the acting user has master authority.
2. Fixed: the staff list used a tenant-wide user read even though the screen is current-store scoped. It now queries by `storeIds array-contains` and filters tenant.
3. Fixed: last-owner and role-in-use checks scanned the whole tenant. They now read only users assigned to the affected store.
4. Fixed: removing a multi-store staff member from the current store left the row visible in desktop/mobile lists when the account remained assigned elsewhere. Both UIs now remove the row when the returned user no longer has the current store.
5. Fixed: NextAuth compact session omitted `storeIds`, while several guarded helpers expected it. The session payload now includes a compact derived `storeIds` array.
6. Fixed: Firestore `users/{userId}` rules allowed broad direct self-writes for any account whose Firebase Auth UID matched the Firestore doc ID. Direct owner/staff user writes are now denied; platform admins remain allowed, and normal profile/staff access writes go through server APIs.
7. Verified: legacy `/api/auth/create-staff` is only a wrapper around the current staff server implementation, not a duplicate mutation path.
8. Verified: Answerlattice staff access code is separate and was not changed.

### D. Firebase Cost Audit

- Staff list: bounded `users` queries by numeric/string current `storeId` in `storeIds` and legacy `storeId`, tenant-filtered in memory, plus one current store read for non-master users or tenant store reads for master store options.
- Role deactivation/owner-protection checks: current-store user queries instead of tenant-wide scans.
- Staff create/update/remove/reset/force-signout: one target user read and one user write in the normal path, plus Firebase Auth Admin operations for account creation, disable/enable, password reset, or refresh-token revocation where applicable.
- Role save/delete: one store read and one store write; deactivation checks current-store users.
- Session access check: one user read, and tenant/store reads only when IDs are present.
- Store switching: reads current store, tenant summary, and uses session mappings; no Firestore write.
- Firestore rules now make owner/staff direct user writes zero-cost and impossible; server APIs own user writes.

### E. UI/UX Audit

- Desktop staff and roles screens are permission-aware and use explicit destructive confirmations for removal, role deactivation, passcode reset, and force sign-out.
- Mobile staff and roles screens are present inside `MobileShell` through More sub-screens, use the same APIs as desktop, and keep 44px-class primary/destructive actions.
- Phone-only owners can add staff, reset a passcode, force sign out staff, remove staff from a store, and edit roles.
- The remaining UX limitation is that complex multi-store staff remapping is still easier on desktop; server authority protects it, but the mobile UI intentionally keeps current-store operations simple.

### F. Product/Positioning Audit

- Staff/roles remain operational guardrails, not a generic HR/team-management product.
- Current-store payload isolation supports owner trust and avoids exposing hidden location assignments to local managers.
- Server-only user writes preserve MenuList's public-truth authority by preventing owner/staff clients from directly changing role/store/access fields.

### G. Documentation Alignment

Updated docs:

- `__docs__/roles-permissions/roles-permissions_impl.md`
- `__docs__/roles-permissions/roles-permissions_firebase.md`
- `__docs__/roles-permissions/roles-permissions_mobile-support.md`
- `__docs__/auth/auth_firebase.md`
- `__docs__/auth/auth_mobile-support.md`

Docs now reflect mobile staff support, current-store staff list reads, current-store payload isolation, `storeIds` session claims, and direct Firestore user-write restrictions.

### H. Fixes Made

Runtime/files changed in this slice:

- `src/lib/staffManagement/server.ts`
- `src/lib/auth/index.ts`
- `src/components/templates/main-app/users/usersList/index.tsx`
- `src/components/mobile/screens/MobileUsersScreen.tsx`
- `firestore.rules`

### I. Validation Performed

- `npx tsc --noEmit --incremental false --pretty false` — passed after this slice's runtime/rules changes.
- `npm run lint` — passed.
- `git diff --check` — passed after removing one trailing-space doc line.
- `firebase deploy --only firestore:rules --project ecomsai` — passed; rules compiled and were released to Cloud Firestore.
- Browser smoke for desktop/mobile staff and roles screens remains pending.

### Remaining Risk For This Slice

- Legacy user documents that only have `storeId` are included by the bounded legacy query. Older multi-store user documents missing both `storeIds` and the current `storeId` still need a migration or profile/staff write to be visible in store-scoped staff lists.
- Browser smoke has not yet been run for `/users/list`, `/users/permissions`, or the mobile Staff/Roles sub-screens.
- Full billing/entitlement audit is still pending; role flags that gate billing were inspected only as permissions, not as billing correctness.

---

## Completed Audit 12: Billing, Subscriptions, Razorpay, AI Capacity/Top-Ups, Entitlement Gates, and Reseller Dashboard

**Feature cluster:** owner billing, subscription lifecycle, Razorpay checkout/verification/webhooks, AI enhancement packs, subscription entitlement mirrors, billing history, reseller-assisted onboarding, reseller renewals, reseller monthly summary, and mobile billing/reseller parity.

### A. Feature Identification

Routes/surfaces inspected:

- Razorpay APIs: `src/app/api/razorpay/create-subscription/route.ts`, `verify-subscription/route.ts`, `webhook/route.ts`, `create-topup-order/route.ts`, `verify-topup/route.ts`, `upgrade-subscription/route.ts`, `cancel-subscription/route.ts`, `pause-subscription/route.ts`, `resume-subscription/route.ts`
- Onboarding billing: `src/app/api/onboarding/create-subscription/route.ts`
- Reseller APIs: `src/app/api/reseller/onboard/route.ts`, `confirm-payment/route.ts`, `renew/route.ts`, `add-location-capacity/route.ts`, `clients/route.ts`, `profile/route.ts`, `monthly-summary/route.ts`, `manage/route.ts`
- Billing helpers/DAL: `src/lib/billing/*`, `src/lib/razorpay/*`, `src/lib/ai/capacityCheck.ts`, `src/database/subscriptions/*`, `src/database/topups/index.ts`, `src/database/reseller/server.ts`
- Owner UI: `src/components/templates/main-app/billing/*`, `src/components/templates/main-app/transactions/*`, `src/hooks/usePaymentHandler.ts`
- Mobile UI: `src/components/mobile/screens/MobileBillingScreen.tsx`, `MobileTransactionsScreen.tsx`, `MobileResellerDashboardScreen.tsx`, `MobileResellerManagementScreen.tsx`, `MobileResellerOnboardingScreen.tsx`
- Firebase/rules/docs: `firestore.rules`, `firestore.indexes.json`, `src/constants/database.ts`, `src/config/features.ts`, `__docs__/razorpay/*`, `__docs__/ai-enhancement-packs/AI_BILLING_EXPLAINER.md`, `__docs__/reseller-dashboard/*`

Affected surfaces:

- owner dashboard: yes
- mobile owner flow: yes
- public menu/customer page: indirect through paid-access entitlement mirrors and public cache invalidation
- Official Business Page: indirect through plan entitlement cache
- website/marketing claim: pricing/top-up CTA behavior inspected, not fully website-certified
- admin/internal operations: yes, reseller management and monthly summaries
- billing/entitlement: yes
- analytics/feedback/reviews: indirect through plan entitlement and AI capacity
- multi-location behavior: yes, subscription quantity and inherited master billing
- cache/public truth: yes, subscription entitlement mirror revalidates public store/menu tags and assistant packet cache

### B. End-to-End Request/Data Flow

Subscription creation and activation:

1. Owner/mobile payment action calls the shared `usePaymentHandler`.
2. API validates plan/product/currency/quantity, resolves billing scope from session, verifies tenant/store access, checks `canManageSubscription`, rate-limits, and creates a Razorpay subscription.
3. Firestore `subscriptions/{providerSubscriptionId}` is created as `pending` with `topUpCredits: 0`.
4. Razorpay Checkout returns payment/subscription/signature.
5. `/api/razorpay/verify-subscription` validates input, verifies HMAC checkout signature, fetches Razorpay payment/subscription, requires captured payment and matching provider subscription id, verifies local tenant/store ownership, activates the subscription, syncs store entitlement, and sends non-blocking lifecycle/internal messages.
6. Webhooks use signature validation, durable `razorpayWebhookEvents` idempotency locks, lean payment transaction audit writes, subscription state-machine transitions, entitlement sync, and non-blocking messaging/alerts.

Plan upgrade:

1. Owner/mobile creates and pays for a new subscription with zero browser-supplied carry-forward.
2. `/api/razorpay/upgrade-subscription` verifies old and new subscription docs belong to the same billing scope.
3. Server computes remaining credits from the old subscription, cancels/expires the old provider subscription, writes old subscription `expired`, writes server-computed carry-forward onto the new subscription, and stamps `carryForwardFromSubscriptionId` for idempotency.

Top-up:

1. Owner/mobile calls `create-topup-order`.
2. API validates auth/permission/rate limit, verifies an active subscription exists, then creates a Razorpay order and pending `topups/{orderId}`.
3. `verify-topup` validates checkout signature, fetches order/payment, verifies tenant/store/order/payment ownership, requires captured payment, finds active subscription, and transactionally increments `topUpCredits` and marks the top-up paid.

Reseller:

1. Reseller/platform APIs require `ENABLE_RESELLER_DASHBOARD` and `withAuth({ requiredPlatformRole: 'RESELLER' })` or platform-only management.
2. Onboard creates tenant/store/owner auth/user in a transaction, then creates either pending Razorpay subscription or active manual subscription.
3. Manual subscription activation/renewal/location-capacity updates use Admin SDK and sync store entitlement.
4. Client lists are bounded and merge current subscription state by subscription ID.
5. Monthly summary reads month-scoped transaction rows and only visible profile docs for non-platform resellers.

### C. Correctness Findings

1. Fixed: `create-subscription` accepted browser-supplied `rc` and wrote it to `topUpCredits`, allowing client-side credit minting during new subscription creation. New subscriptions now start with zero top-up credits.
2. Fixed: upgrade carry-forward depended on a browser-calculated value. The upgrade API now computes remaining credits server-side from the old subscription and applies it to the verified new subscription.
3. Fixed: subscription verification did not require the Razorpay checkout signature or explicitly prove the payment belonged to the submitted subscription. Verification now requires signature, captured payment status, and payment-subscription match.
4. Fixed: top-up checkout could be created before proving the store had an active subscription, risking paid orders that fail at verification. The route now verifies active subscription after rate limiting and before creating a Razorpay order.
5. Fixed: browser subscription DAL attempted to auto-expire subscriptions during a read, but Firestore rules deny subscription writes. Client reads now return no active access without writing; server-owned reads perform expiry writes.
6. Fixed: server-side grace-period auto-expiry updated subscription state but did not sync store entitlement/public cache. It now calls `safeSyncStorePlanEntitlementFromSubscription()`.
7. Fixed: owner billing history had no row limit. Desktop/mobile shared DAL now reads only the latest 50 successful payment events.
8. Fixed: reseller monthly summary read the full reseller profile collection even for normal reseller users. Non-platform users now read only their direct/email-matched profile docs.

Verified:

- Firestore rules already deny client writes to `subscriptions`, `topups`, `payment_transactions`, `razorpayWebhookEvents`, `resellerTransactions`, and `resellerProfiles`.
- Pause/resume routes are feature-flag disabled by default before provider or Firestore mutation.
- Top-up verification is transactionally idempotent and rejects payment/order mismatches.
- Reseller client list and monthly summaries are bounded.
- Answerlattice billing product paths remain product-aware and were not modified for MenuList-only behavior.

### D. Firebase Cost Audit

- Subscription create: one subscription write after provider subscription creation.
- Subscription verify: one subscription read and one write, plus entitlement mirror writes when status changes.
- Webhook: one idempotency transaction, one lean payment transaction write, one subscription read/update when event type requires it, plus entitlement mirror writes on status changes.
- Upgrade: two subscription reads and up to two subscription writes; carry-forward is idempotent by marker.
- Top-up create: one active-subscription read after rate limit and one pending top-up write.
- Top-up verify: top-up and subscription reads inside transaction, subscription/top-up writes inside transaction.
- Billing history: capped at 50 successful payment transaction reads.
- Browser subscription lookup: zero writes; server paths own expiry writes.
- Reseller clients: capped 100 reseller / 200 platform transaction rows plus bounded subscription doc reads.
- Reseller monthly summary: capped 2000 monthly transaction rows; profile reads are 1-2 for reseller users and up to 50 for platform users.

Cost increased by one read on top-up order creation, intentionally, to prevent paid orders for stores without active subscriptions. This is correctness-positive and bounded behind auth, permission, and rate limit.

### E. UI/UX Audit

- Desktop Billing and Mobile Billing share the same payment hook and DAL.
- Mobile sends Razorpay checkout signature for subscription verification and no longer sends carry-forward credit authority during subscription creation.
- Pending reseller-online subscriptions show Pay Now/copy/open paths.
- Manual reseller subscriptions are labeled as offline one-time prepaid and hide Razorpay-only pause/cancel/upgrade actions.
- Billing history remains user-triggered/lazy and now bounded.
- Exact enhancement balances remain visible in Billing. This is useful for paid feature transparency, but should not spread into public/customer surfaces or turn owner surfaces into generic credit dashboards.

### F. Product/Positioning Audit

- Billing remains infrastructure access and capacity control, not a generic payments dashboard.
- AI capacity stays tied to subscriptions/top-ups and server-side consumption, not owner-controlled toggles.
- Reseller flow remains assisted onboarding infrastructure; it does not create public pricing leakage or separate license objects.
- Entitlement mirrors continue to update public truth/cache when paid access changes.

### G. Documentation Alignment

Updated docs:

- `__docs__/razorpay/razorpay_impl.md`
- `__docs__/razorpay/razorpay_firebase.md`
- `__docs__/razorpay/razorpay_mobile-support.md`
- `__docs__/ai-enhancement-packs/AI_BILLING_EXPLAINER.md`
- `__docs__/reseller-dashboard/reseller-dashboard_impl.md`
- `__docs__/reseller-dashboard/reseller-dashboard_firebase.md`
- `__docs__/reseller-dashboard/reseller-dashboard_mobile-support.md`

Docs now reflect server-side carry-forward, checkout-signature verification, top-up active-subscription gating, client read/no-write grace behavior, bounded billing history, and reseller monthly-summary profile scoping.

### H. Fixes Made

Runtime/files changed in this slice:

- `src/lib/validation/apiSchemas.ts`
- `src/app/api/razorpay/create-subscription/route.ts`
- `src/app/api/razorpay/verify-subscription/route.ts`
- `src/app/api/razorpay/upgrade-subscription/route.ts`
- `src/app/api/razorpay/create-topup-order/route.ts`
- `src/hooks/usePaymentHandler.ts`
- `src/types/razorpay.ts`
- `src/database/subscriptions/index.ts`
- `src/database/subscriptions/server.ts`
- `src/database/subscriptions/paymentTransactions.ts`
- `src/app/api/reseller/monthly-summary/route.ts`

### I. Validation Performed

- `npx tsc --noEmit --incremental false --pretty false` — passed after this slice's runtime/doc changes.
- `npm run lint` — passed.
- `git diff --check` — passed after removing reseller-doc trailing spaces.

Pending validation for this slice:

- Browser smoke for desktop/mobile Billing and Reseller screens.
- Real Razorpay sandbox smoke was not run in this environment.

### Remaining Risk For This Slice

- Self-serve and reseller onboarding create tenant/store/user before external Razorpay subscription creation. If the external provider call fails after local onboarding, cleanup/recovery remains an operational risk and needs a focused onboarding compensation pass.
- Reseller offline active-count decrement on expiry depends on scheduler/runtime coverage outside this billing route audit; expiry scheduler behavior still needs a dedicated ops/scheduler audit.
- Billing UI still shows exact enhancement balances. That is acceptable on Billing, but should be watched so MenuList does not become a generic credits dashboard.
- No Vercel deploy or Razorpay sandbox test was run.

---

## Completed Audit 13: Multi-Outlet Consistency, Store Onboarding, Outlet Policy, Location Lifecycle, and Scheduler/Ops Maintenance

### A. Feature Identification

**Feature cluster:** Multi-outlet consistency, chain control panel, outlet lifecycle, outlet policy, linked outlet project persistence, project/brand propagation, and consolidated scheduler maintenance.

Relevant routes, components, hooks, DAL/helpers, collections, and docs inspected:

- API routes: `src/app/api/outlets/create/route.ts`, `src/app/api/outlets/deactivate/route.ts`, `src/app/api/outlets/rename/route.ts`, `src/app/api/outlets/policy/route.ts`, `src/app/api/auth/switch-store/route.ts`, `src/app/api/projects/outlet-save/route.ts`
- Owner UI: `src/app/(main)/locations/page.tsx`, `src/components/organisms/AddOutletModal/index.tsx`, `src/components/organisms/OutletPolicyEditor/index.tsx`, `src/components/organisms/OutletRenameModal/index.tsx`
- Mobile UI: `src/components/mobile/screens/MobileLocationsScreen.tsx`, `src/components/mobile/components/MobileProjectSelectorSheet.tsx`
- DAL/helpers: `src/database/multiOutlet/index.ts`, `src/database/multiOutlet/propagation.ts`, `src/database/multiOutlet/brandPropagation.ts`, `src/lib/multiOutlet/locationAccess.ts`, `src/lib/multiOutlet/storeSwitchAccess.ts`, `src/lib/multiOutlet/serverStoreAccess.ts`, `src/lib/multiOutlet/serverOutletPolicy.ts`, `src/lib/multiOutlet/outletProjectPersistence.ts`, `src/lib/multiOutlet/resolveProject.ts`
- Firebase/security: `firestore.rules`, `src/constants/database.ts`, `src/config/features.ts`
- Scheduler/ops: `functions/src/schedulers/menulistMaintenanceScheduler.ts`
- Docs: `__docs__/multi-outlet-consistency/*`, store onboarding docs, mobile support, Firebase contract docs

Affected surfaces:

- owner dashboard: yes
- mobile owner flow: yes
- public menu/customer page: yes, through outlet routing, linked project public output, and cache invalidation
- Official Business Page: yes, through outlet OBP routing and store summary propagation
- website/marketing claim: docs inspected, not full website-certified in this slice
- admin/internal operations: yes, through platform summary and scheduler patterns
- billing/entitlement: yes, through subscription quantity/prepaid capacity checks
- analytics/feedback/reviews: indirect through store switching and public cache
- multi-location behavior: yes
- cache/public truth: yes

### B. End-to-End Request/Data Flow

Outlet creation:

1. Desktop/mobile Locations validates owner input and billing capacity from active subscription state.
2. `POST /api/outlets/create` requires feature flag, auth, tenant/store access, `MANAGE_OUTLETS`, rate limit, active plan when outlet billing is enabled, and prepaid/provider capacity.
3. The route acquires a tenant creation lock, updates Razorpay/provider quantity only when needed and supported, writes internal subscription quantity only when outlet billing is enabled, creates the new store and inherited outlet projects in a transaction, grants creator access, syncs platform summaries, releases lock, and revalidates public/assistant cache paths.

Outlet deactivation/rename/policy:

1. Desktop/mobile actions call server APIs; inactive targets are blocked in UI where applicable.
2. Deactivation verifies caller master authority and validates the target against both tenant `storesList` and canonical `stores/{outletStoreId}` before Admin writes.
3. Deactivation atomically marks store inactive, updates `storesSummary`, and updates tenant `storesList`, then reduces Razorpay-backed quantity only when configured.
4. Rename requires master authority, target tenant match, non-master target, active target, reserved-slug checks, current/previous slug collision checks, transactionally updates store, storesSummary, and tenant storesList, then revalidates public cache.
5. Policy updates are server-owned, master-only, merge with default policy, repair legacy single-store master state when safe, and revalidate public/assistant cache.

Linked outlet project save and propagation:

1. `/api/projects/outlet-save` validates outlet/master project IDs, tenant/store membership, active target stores, caller permission, local ID prefixes, and OutletPolicy before writing local outlet state.
2. Owner project writes invalidate public menu/store/client cache tags and assistant packet cache.
3. Master-created project propagation now writes only to active non-master outlets.
4. Master store brand/classification propagation now updates only active non-master outlets.
5. Master delete protection now scans only active non-master outlet project collections.

Scheduler/ops:

1. `menulistMaintenanceScheduler` remains the consolidated MenuList operational scheduler.
2. Each task has its own cadence, lease, state update, compact run details, and alert path.
3. No new standalone scheduler was added in this slice.

### C. Correctness Findings

1. Fixed: `POST /api/outlets/deactivate` trusted `tenant.storesList` as the only target boundary before Admin writes. It now validates the canonical target store doc and rechecks target/tenant state inside the transaction.
2. Fixed: outlet creation could update internal subscription quantity even when `ENABLE_OUTLET_BILLING` was disabled. Subscription quantity writes are now guarded by the outlet-billing feature flag.
3. Fixed: project and brand propagation included deactivated outlets. Both propagation loops now filter to active non-master outlets.
4. Fixed: master delete protection scanned inactive stores and could let inactive outlet data block master project cleanup while increasing reads. It now checks active non-master outlets only.
5. Fixed: desktop and mobile Locations counters labeled active outlets but counted inactive outlets. Both now count active outlets.
6. Fixed: outlet rename accepted inactive outlet targets through direct API calls. It now rejects inactive outlet rename attempts.

Verified:

- Store switching rejects inactive targets and checks mapped `storeIds`.
- Firebase claims include `storeIds`; Locations refreshes claims before store-context switching.
- Linked outlet save is server-owned and enforces tenant/store membership, active stores, local IDs, policy flags, and public cache invalidation.
- Public sitemap and public analytics paths filter inactive stores.
- Firestore rules keep direct `platformSummary/storesSummary` writes scoped to the current store entry unless platform-admin/server-owned.

### D. Firebase Cost Audit

- Outlet creation reads caller store, tenant list, active subscription, lock tenant doc, master projects query, master project summary, platform summary count, and creator user doc; writes one store, one tenant update, one storesSummary update, one platform count update, N inherited project docs, N project-summary rows, and optionally one creator access update plus subscription quantity write.
- Deactivation now adds one canonical target-store read and transaction rechecks target/tenant state. This small cost increase prevents cross-tenant/stale-list Admin writes and is correctness-positive.
- Project propagation and brand propagation now skip inactive outlets, reducing writes, summary writes, and public cache revalidations after outlet deactivation.
- Master delete protection now avoids inactive stores, reducing N+1 project collection queries in tenants with old/deactivated outlets.
- Store switching remains one caller store read and one tenant list read.
- Linked outlet save uses bounded direct reads for caller/outlet/master stores, tenant, and existing project; no broad scans.
- Scheduler remains consolidated with per-task leases and compact logs.

### E. UI/UX Audit

- Desktop and mobile Locations show active outlet counts that match billing/public behavior.
- Inactive outlets remain visible for context but cannot be switched, renamed, or deactivated again from normal UI.
- Add outlet remains a single owner decision with clear billing/prepaid/UPI recovery states.
- Mobile owner flow uses the existing `MobileShell` screen, large touch buttons, bottom sheets, shared policy taxonomy, and direct Billing handoff when payment action is required.
- Public customer surfaces are unaffected except that inactive outlets no longer receive new propagated public truth.

### F. Product/Positioning Audit

The fixes preserve MenuList’s public-truth role:

- Active locations are the only locations receiving new public menu/project/brand truth.
- Admin routes no longer rely on stale denormalized tenant lists for cross-store writes.
- Billing quantity remains infrastructure capacity, not an owner-facing toggle system.
- Multi-location behavior stays simple: HQ controls chain policy; outlets get local exceptions within policy.

### G. Documentation Alignment

Updated docs:

- `__docs__/multi-outlet-consistency/multi-outlet-consistency_impl.md`
- `__docs__/multi-outlet-consistency/multi-outlet-consistency_firebase.md`
- `__docs__/multi-outlet-consistency/multi-outlet-consistency_mobile-support.md`
- `__docs__/audits/menulist-production-readiness-audit.md`

Docs now reflect active-only propagation/delete protection, canonical target-store validation for deactivation, billing-flag isolation for subscription quantity writes, and active-outlet desktop/mobile counts.

### H. Fixes Made

Runtime/files changed in this slice:

- `src/app/api/outlets/create/route.ts`
- `src/app/api/outlets/deactivate/route.ts`
- `src/app/api/outlets/rename/route.ts`
- `src/database/multiOutlet/propagation.ts`
- `src/database/multiOutlet/brandPropagation.ts`
- `src/database/multiOutlet/index.ts`
- `src/app/(main)/locations/page.tsx`
- `src/components/mobile/screens/MobileLocationsScreen.tsx`

### I. Validation Performed

- `npx tsc --noEmit --incremental false --pretty false` — passed after runtime changes.

Pending validation for this slice:

- `npm run lint` after docs/report update.
- Browser smoke for desktop/mobile Locations, Add Outlet, Rename Outlet, and Deactivate Outlet.
- No Razorpay sandbox or Firebase Function deploy was run for this slice; no Firebase rules/index/function files were changed.

### Remaining Risk For This Slice

- Reseller offline subscription expiry/count maintenance still needs a dedicated scheduler/billing reconciliation audit.
- Browser smoke for desktop/mobile Location flows was not run in this environment.
- Existing deactivated outlet slugs remain reusable in some creation paths when not present in previous-slug history; this may be intended replacement-location behavior, but it should be decided explicitly in the public-routing/outlet-policy docs if URL reuse becomes a support issue.

---

## Completed Audit 14: Public Create-Menu, Messaging Onboarding, Starter Activation, Owner Notifications, and Lifecycle Messaging

### A. Feature Identification

**Feature cluster:** public `/create-menu` intake and claim, messaging onboarding preview/approval, starter activation signals, owner notification delivery, lifecycle messaging, and related scheduler cleanup.

Relevant routes, components, DAL/helpers, functions, collections, and docs inspected:

- Public create-menu: `src/app/(website)/create-menu/*`, `src/app/api/public/create-menu/route.ts`, `src/app/api/public/create-menu/claim/route.ts`, `src/lib/menu-link-import/sourceAcquisition.ts`
- Messaging preview: `src/app/(global-pages)/msg-preview/[sessionId]/page.tsx`, `src/app/api/msg-preview/[sessionId]/route.ts`, `approve/route.ts`, `fix/route.ts`
- Functions messaging: `functions/src/messagingOnboarding/webhookHandler.ts`, `inboundQueue.ts`, `sessionEngine.ts`, `intakeProcessor.ts`, `extractionWatcher.ts`, `constants.ts`
- Scheduler: `functions/src/schedulers/messagingSessionCleanup.ts`, `functions/src/schedulers/menulistMaintenanceScheduler.ts`
- Publish/activation: `src/lib/messaging-onboarding/publish.ts`, `src/lib/onboarding/createTenantStore.ts`, `src/lib/onboarding/starterActivation.ts`, `src/app/(website)/create-menu/success/page.tsx`
- Notifications: `src/lib/owner-notifications/*`, `functions/src/ownerNotifications/processor.ts`, `functions/src/messaging/messagingEngine.ts`, `src/app/api/ops/owner-notifications/route.ts`, `src/components/templates/main-app/platform/ownerNotificationMonitor/index.tsx`
- Firebase/security/constants: `firestore.rules`, `firestore.indexes.json`, `src/constants/database.ts`, `functions/src/constants/database.ts`, `src/config/features.ts`
- Docs: `__docs__/public-menu-entry/*`, `__docs__/messaging-onboarding/*`, `__docs__/owner-notifications/*`, `__docs__/lifecycle-messaging/*`, onboarding docs

Affected surfaces:

- owner dashboard: yes, after claim/publish and ops notification recovery
- mobile owner flow: yes, public create-menu and msg-preview are phone-first web surfaces; starter activation signals also come from mobile Share/Presence paths
- public menu/customer page: yes, claimed drafts and messaging publishes create customer-facing menu truth
- Official Business Page: yes, new store/project/public identity writes feed OBP and `/menu`
- website/marketing claim: yes, `/create-menu` acquisition path and docs
- admin/internal operations: yes, owner-notification ops monitor and scheduler state
- billing/entitlement: indirect, starter activation and lifecycle messaging
- analytics/feedback/reviews: indirect, starter activation signals and notification observability
- multi-location behavior: no direct outlet write in this slice
- cache/public truth: yes, claim/publish paths revalidate public menu/store/client tags

### B. End-to-End Request/Data Flow

Public `/create-menu` flow:

1. Owner opens website `/create-menu`, signs in with phone OTP or Google, then uploads an image or submits a permission-confirmed public menu link.
2. `POST /api/public/create-menu` requires auth, feature flag, SAFE_MODE check, user rate limit, active draft/source dedupe, storage/source validation, and writes a `publicMenuDrafts` doc plus a `menuImageProcessingJobs` job.
3. Preview page polls `GET /api/public/create-menu?draftId=...`; the route is owner-bound and now rate-limited before the draft read.
4. Claim route verifies owner/draft state, creates or updates tenant/store/user/project truth, writes project summary, invalidates `menu-store-{storeId}`, `store-{storeId}`, and `client-stores`, and now preserves a single default project for existing owners.
5. Success page records starter activation signals as non-blocking client-side owner-success metadata.

Messaging onboarding flow:

1. Provider webhook verifies provider/signature, writes a durable sanitized inbound queue doc, and acknowledges quickly.
2. Immediate or scheduled queue drain claims PENDING docs, calls the session engine, sends provider replies when needed, and records processed/failed status with retry/backoff.
3. Session engine checks existing live/existing-store/rate-limit state, downloads media to isolated Storage, deduplicates uploads, and advances intake windows.
4. Intake scheduler validates assets, creates an extraction job, and sends pending preview/fix/publish provider messages.
5. Extraction watcher writes extracted menu data, generates a tokenized preview URL, sends the preview link, and leaves failed sends for retry.
6. Token preview API validates token/state/expiry, now rate-limits reads, and writes at most one `PREVIEW_VIEWED` event per session.
7. Approval route transactionally moves `AWAITING_APPROVAL` to `PUBLISHING`, validates menu structure, calls the active Next publish library, revalidates public cache, and marks the session `LIVE`.
8. Fix route validates token/state/correction count and now rate-limits mutation attempts before resetting the session for corrected uploads.

Owner notification/lifecycle flow:

1. Trigger points enqueue product-scoped owner notification events when owner-notification migration flags are on.
2. Shared app and Functions processors resolve registry policy, recipient, formatting context, channel flags, rate limits, template, delivery, and delivery logs.
3. MenuList recipient resolution now reads canonical top-level `stores/{storeId}` first, with nested tenant-store fallback only for legacy compatibility.
4. Platform-only `/ops/owner-notifications` uses bounded manual refresh, detail reads, retry, manual send, and handoff recording; no realtime listener.
5. Legacy lifecycle email remains a fallback when owner-notification migration is disabled or unavailable.

### C. Correctness Findings

1. **Fixed: public create-menu status polling had no backend throttle.**  
   The client polls every 2 seconds up to 30 times. Refresh loops could repeatedly read `publicMenuDrafts`. The GET route now rate-limits `public-menu-entry-status:{userId}:{draftId}` before reading the draft.

2. **Fixed: claiming a public draft for an existing owner could leave multiple default project summaries.**  
   Existing owners claiming a new draft could create a second `isDefault` summary, making `/menu` ambiguous. The claim transaction now demotes existing non-deleted defaults before writing the claimed project summary with the shared summary payload builder.

3. **Fixed: messaging preview reads and view events were unbounded for token links.**  
   The unauthenticated token route could be refreshed repeatedly, causing session reads and `PREVIEW_VIEWED` event writes. The route now rate-limits by session/IP before Firestore and logs preview view only once per session via `previewViewedAt`.

4. **Fixed: preview fix requests lacked an unauthenticated mutation throttle.**  
   The route enforced token/state/correction count but did not throttle before Firestore work. It now rate-limits per session/IP before reading or writing.

5. **Fixed: durable inbound webhook queue relied only on TTL cleanup.**  
   Queue docs had `expiresAt`, but no bounded scheduler fallback if TTL was not enabled or delayed. `messagingSessionCleanupLogic()` now deletes up to 100 expired inbound queue docs per daily run and reports `inboundCleaned`.

6. **Fixed: MenuList owner-notification recipients resolved from a non-canonical nested store path.**  
   The app resolver, Functions owner-notification processor, and legacy Functions lifecycle engine read `stores/{storeId}` first and fall back to `tenants/{tenantId}/stores/{storeId}` only for old compatibility.

Verified:

- `/api/public/create-menu` remains auth-first, feature-gated, SAFE_MODE checked, source-deduped, and SSRF-hardened for link import.
- Messaging onboarding collections are Admin SDK only in Firestore rules.
- Messaging indexes cover active-session, intake, cleanup, pending-message, inbound queue, and event queries already present in runtime.
- Messaging publish uses the active Next library, not the stale Functions publish copy.
- Owner notification registry is byte-for-byte mirrored between app and Functions.
- Ops owner-notification API is platform-role guarded and bounded.

### D. Firebase Cost Audit

- Public create-menu POST: bounded draft reuse/dedupe reads, 1 draft write, 1 job write, 1 storage write for new source.
- Public create-menu GET: now 1 draft read per poll, client capped at 30 polls, backend capped at 90 status reads per 5 minutes per user/draft.
- Claim: transactional tenant/store/user/project/project-summary writes; existing-owner default demotion adds only summary row updates needed to preserve one public default.
- Messaging webhook: 1 queue doc create per unique provider message, duplicate provider retries do not write a second queue doc.
- Inbound drain: capped 20 docs per intake run; stale PROCESSING reset capped 20.
- Messaging preview GET: 1 session read, now session/IP-limited; first view only writes one session merge and one event.
- Fix route: 1 session read and 1 session update only after rate-limit and token validation.
- Messaging cleanup: session expiry/reminders/expired media cleanup stay capped; inbound queue cleanup adds a capped 0-100 deletes/day fallback.
- Owner notification processing: direct event/delivery/rate-limit docs, direct store read, no realtime listener; ops dashboard list is bounded and manual refresh only.

Cost impact of fixes:

- Reduced unauthenticated token-preview event writes from unbounded per refresh to one per session.
- Added cheap rate-limit checks before public create-menu status reads and msg-preview read/mutation work.
- Added bounded inbound queue deletes to prevent document accumulation.
- Added one fallback read only when canonical top-level store lookup is missing for owner notifications.

### E. UI/UX Audit

- Public `/create-menu` remains sign-in-first and owner-bound; no anonymous AI utility behavior was introduced.
- Preview and success pages are phone-friendly web surfaces, appropriate for owners opening links from messaging apps.
- Fix requests remain simple: choose issue(s), optional short note, then send corrected photos.
- Owner notification recovery stays platform-only and does not add an owner-facing notification dashboard.
- Mobile owner parity is acceptable for this slice because the acquisition/preview surfaces are responsive public web routes, and post-activation owner tasks continue through existing mobile Share/Presence surfaces.

### F. Product/Positioning Audit

The fixes preserve MenuList as public-business truth infrastructure:

- Public starter flows create public truth only after authenticated owner claim or token approval.
- `/menu` authority remains singular after create-menu claim.
- Messaging onboarding remains a narrow acquisition/publish tunnel, not a generic chat/menu tool.
- Owner notifications remain account-critical infrastructure messages, not marketing automation or workflow chatter.
- Scheduler work remains consolidated with leases and bounded cleanup.

### G. Documentation Alignment

Updated docs:

- `__docs__/public-menu-entry/public-menu-entry_firebase.md`
- `__docs__/public-menu-entry/public-menu-entry_impl.md`
- `__docs__/messaging-onboarding/messaging-onboarding_firebase.md`
- `__docs__/messaging-onboarding/messaging-onboarding_validation.md`
- `__docs__/owner-notifications/owner-notifications_impl.md`
- `__docs__/owner-notifications/owner-notifications_firebase.md`
- `__docs__/audits/menulist-production-readiness-audit.md`

### H. Fixes Made

Runtime files changed in this slice:

- `src/app/api/public/create-menu/route.ts`
- `src/app/api/public/create-menu/claim/route.ts`
- `src/app/api/msg-preview/[sessionId]/route.ts`
- `src/app/api/msg-preview/[sessionId]/fix/route.ts`
- `src/lib/owner-notifications/recipientResolver.ts`
- `functions/src/ownerNotifications/processor.ts`
- `functions/src/messaging/messagingEngine.ts`
- `functions/src/schedulers/messagingSessionCleanup.ts`
- `functions/src/schedulers/menulistMaintenanceScheduler.ts`

### I. Validation Performed

- `npx tsc --noEmit --incremental false --pretty false` — passed after create-menu and messaging/notification fixes.
- `npm --prefix functions run build` — passed.
- `npm run lint` — passed.
- `git diff --check -- src/app/api/public/create-menu/route.ts src/app/api/public/create-menu/claim/route.ts` — passed after public create-menu fixes.
- `git diff --check -- src/app/api/msg-preview/[sessionId]/route.ts src/app/api/msg-preview/[sessionId]/fix/route.ts src/lib/owner-notifications/recipientResolver.ts functions/src/ownerNotifications/processor.ts functions/src/messaging/messagingEngine.ts functions/src/schedulers/messagingSessionCleanup.ts functions/src/schedulers/menulistMaintenanceScheduler.ts` — passed.
- Targeted deploy attempted: `firebase deploy --only functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:verifyMenuPublish --project ecomsai`.
- Deploy result: Firebase predeploy lint/build passed, then deploy failed before upload validation completed because Secret Manager returned HTTP 403 `billing-disabled` for `GEMINI_AI_KEY*`, `WHATSAPP_*`, `RAZORPAY_*`, and `SENTRY_DSN`.

Pending for this slice:

- Browser smoke for `/create-menu`, `/create-menu/preview/{draftId}`, `/msg-preview/{sessionId}`, and `/ops/owner-notifications`.
- Real WhatsApp provider smoke remains blocked until provider secrets/runtime flag are configured and Functions deployment succeeds.

---

## Completed Audit 15: Main Website, Public Claims, Trust/Legal, Resources, Pricing, and Discovery Files

### A. Feature Identification

**Feature cluster:** MenuList main website and public buyer/trust layer.

Relevant routes and files inspected:

- `src/app/(website)/`
- `src/components/website/`
- `src/content/websiteResources/`
- `public/locales/menulist.ai/`
- `src/app/sitemap.ts`
- `src/lib/seo/discoveryPolicy.ts`
- `public/robots.txt`
- `public/sitemap.xml`
- `public/llms.txt`
- `public/llms-full.txt`
- `public/manifest.json`
- `scripts/verification/verify-agent-readiness.js`
- `scripts/verification/verify-website-resource-locales.js`
- `src/config/websiteLanguages.ts`
- `__docs__/main-website/*`

Affected surfaces:

- owner dashboard: indirect, via pricing/auth/create-menu handoff copy
- mobile owner flow: indirect, via public setup and owner-phone-dashboard claims
- public menu/customer page: indirect, via website claims and resource guidance
- Official Business Page: indirect, via OBP/public discovery claims
- website/marketing claim: yes
- admin/internal operations: no direct runtime changes
- billing/entitlement: website pricing path inspected; no billing API changes
- analytics/feedback/reviews: website analytics consent and resource GA events inspected
- multi-location behavior: website multi-location page inspected
- cache/public truth: discovery files and sitemap/robots/LLM context inspected

### B. End-to-End Request/Data Flow

Website request flow:

1. Platform-domain requests are served by the website route group after middleware product/tenant separation.
2. Static website pages render server metadata, page-level structured data, header/footer, localized website copy, and no Firestore reads for anonymous visitors.
3. Website analytics scripts are not mounted from the layout directly; `WebsiteAnalyticsConsent` mounts Google Analytics and Clarity only after an accepted analytics choice and clears known analytics cookies after decline.
4. Resource hub/article pages read static content packs, emit resource JSON-LD, and use sessionStorage only for attribution IDs before sending GA events when `gtag` is already available.
5. `/create-menu` uses the already-audited auth-first public starter flow and localized `Website.CreateMenu` copy for upload, preview, error, empty, detected-detail, stats, and claim-form states.
6. `/pricing` serves anonymous visitors without Firestore reads. Authenticated visitors fetch active subscription and tenant details once to decide whether to show subscription management.
7. `/product` is guarded by middleware and the route page itself as a legacy redirect to `/how-it-works`.
8. `sitemap.ts`, `discoveryPolicy.ts`, static sitemap/robots, LLM files, and verification scripts keep platform discovery pages aligned and exclude tenant/client menu content from the platform sitemap.

### C. Correctness Findings

1. **Fixed: public website grid tracks could overflow narrow phones.**  
   Several website sections used fixed `auto-fit` grid minimums such as `minmax(320px, 1fr)`, `minmax(400px, 1fr)`, and `minmax(420px, 1fr)`. With section padding, those tracks can exceed narrow mobile containers and create horizontal scroll. The affected grids now use `minmax(min(100%, ...), 1fr)`.

2. **Verified: `/create-menu` website copy is localized through the `Website` namespace.**  
   Upload, link, auth, preview loading, processing, failure, expiry, empty, detected-detail, stats, tag, and claim states use `useTranslations('Website')` and matching `CreateMenu` locale keys in `en-US` and `hi-IN`.

3. **Verified: public discovery files are aligned.**  
   `npm run verify:agent-readiness` and `npm run verify:website-resource-locales` both passed. `/product` is omitted from sitemap/LLM discovery and redirects to `/how-it-works`.

4. **Verified: dormant locale files are not active website routes.**  
   `public/locales/menulist.ai` contains extra `en-GB`, `gu-IN`, and `zh-CN` JSON files, but `WEBSITE_LANGUAGES` exposes only `en-US`, `hi-IN`, `ta-IN`, `te-IN`, `mr-IN`, `bn-IN`, `ar-SA`, and `es-ES`. Missing active locale files: none.

5. **Verified: public trust/legal claims inspected in this slice are grounded in runtime.**  
   Analytics consent gates main website GA/Clarity loading; Razorpay checkout/payment verification handles payment details externally; owner-managed staff passcodes are set in Firebase Auth and not stored as plain text in user docs; prepared public media is redrawn through canvas-based preparation before storage, which strips source-file metadata for the public media pipeline.

### D. Firebase Cost Audit

- Anonymous website pages: 0 Firestore reads/writes.
- Website resources: 0 Firestore reads/writes; static content and optional GA events only after analytics is loaded.
- Website analytics consent: localStorage/cookie work only; no Firebase operations.
- `/pricing` anonymous path: 0 Firestore reads.
- `/pricing` authenticated path: 1 active-subscription lookup plus 1 tenant lookup when a tenant/store is present.
- `/create-menu`: uses the already-audited public create-menu API flow from Audit 14.
- Discovery files: static/dynamic metadata generation, no Firebase reads.

Cost impact of fixes:

- CSS-only grid changes; no Firebase cost change.

### E. UI/UX Audit

- Public pages keep product-truth positioning and do not present the website as a generic QR/menu maker.
- The create-menu funnel remains sign-in-first and owner-bound before AI processing.
- The trust/security page, contact page, multi-location page, pricing page, homepage, and legacy `/product` redirect were smoke-tested at 390px width with no horizontal overflow after the grid fix.
- No desktop-only owner action was introduced.
- Analytics consent remains compact and user-changeable through footer preferences.

### F. Product/Positioning Audit

The audited website layer supports MenuList as public-business truth infrastructure:

- Public copy avoids ranking guarantees, automatic Google/POS sync promises, and AI-menu-maker positioning.
- Resource articles that mention ranking or guarantees do so as explicit disclaimers.
- Public discovery claims are backed by sitemap, robots, JSON-LD, route metadata, and LLM context files.
- Legal/trust pages are written as practical operational disclosures rather than unsupported security-certification claims.

### G. Documentation Alignment

Updated docs:

- `__docs__/main-website/README.md`
- `__docs__/main-website/main-website_design-system.md`
- `__docs__/audits/menulist-production-readiness-audit.md`

No website marketing claim was added. The docs now describe the container-safe grid contract and the v3.6.52 website hardening pass.

### H. Fixes Made

Runtime files changed in this slice:

- `src/components/website/trust-security/TrustSecurityPage.tsx`
- `src/components/website/contact/ContactPage.tsx`
- `src/components/website/multi-location/MultiLocationPage.tsx`
- `src/components/website/product/ProductPage.tsx`
- `src/components/website/home/AnalyticsInsightsSection.tsx`
- `src/components/website/home/BusinessSection.tsx`
- `src/components/website/home/CustomerBrowseSection.tsx`
- `src/components/website/home/InteractiveWorkflowSection.tsx`
- `src/components/website/home/SmartFeaturesSection.tsx`

### I. Validation Performed

- `npx tsc --noEmit --incremental false --pretty false` — passed.
- `npm run lint` — passed.
- `git diff --check -- [website grid files]` — passed.
- `npm run verify:agent-readiness` — passed.
- `npm run verify:website-resource-locales` — passed.
- Local dev server smoke at `http://127.0.0.1:3015` with 390px viewport:
  - `/` — no horizontal overflow.
  - `/contact` — no horizontal overflow.
  - `/multi-location` — no horizontal overflow.
  - `/pricing` — no horizontal overflow.
  - `/trust-security` — no horizontal overflow.
  - `/product` — redirected to `/how-it-works`, no horizontal overflow.

Pending for this slice:

- Full desktop visual screenshot review across every website route was not repeated in this slice.
- `npm run build` remains global-final validation and has not been run for the full certification.

---

## Completed Audit 16: Physical Surfaces, Print/Export, QR/Menu Cards, and Use MenuList Assets

### A. Feature Identification

**Feature cluster:** Owner output hub, project Share modal, Menu Kit, QR/download assets, Print Assets, Menu Card Export, mobile Share, and physical-surface print generators.

Relevant routes and files inspected:

- `src/app/(main)/use-menulist/page.tsx`
- `src/app/(main)/use-menulist/print-assets/page.tsx`
- `src/app/(main)/use-menulist/menu-card-export/page.tsx`
- `src/components/templates/main-app/useMenuList/index.tsx`
- `src/components/templates/main-app/useMenuList/CommunicationKit.tsx`
- `src/components/templates/main-app/useMenuList/PresenceMonitor.tsx`
- `src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx`
- `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx`
- `src/components/templates/main-app/projects/b2cView/shareModal/MenuKitSection.tsx`
- `src/components/templates/main-app/projects/b2cView/shareModal/qrCodeView.tsx`
- `src/components/templates/main-app/projects/b2cView/shareModal/linkView.tsx`
- `src/components/templates/main-app/projects/b2cView/shareModal/socialShareView.tsx`
- `src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx`
- `src/components/mobile/screens/MobileShareScreen.tsx`
- `src/hooks/useMenuCardExportController.ts`
- `src/lib/menu-kit/*`
- `src/lib/menu-card-export/*`
- `src/lib/printable-asset-templates/*`
- `src/lib/print-menu-surfaces/*`
- `src/lib/physical-surfaces/*`
- `src/app/api/menu-card-export/design-advisor/route.ts`
- `src/config/features.ts`
- `__docs__/use-menulist/*`
- `__docs__/menu-kit/*`
- `__docs__/menu-card-export/*`
- `__docs__/printable-asset-templates/*`

Affected surfaces:

- owner dashboard: yes
- mobile owner flow: yes
- public menu/customer page: yes, through generated QR/link destinations
- Official Business Page: yes, through OBP QR/link destinations
- website/marketing claim: indirect, via print-ready-kit claims already checked in Audit 15
- admin/internal operations: no direct admin UI changes
- billing/entitlement: yes, MenuList attribution and AI advisor plan gates
- analytics/feedback/reviews: yes, UTM/source-attributed QR and feedback QR links
- multi-location behavior: yes, master-owner outlet QR generation
- cache/public truth: yes, generated assets must point at current public truth; no cache writes are performed here

### B. End-to-End Request/Data Flow

Use MenuList desktop flow:

1. Owner opens `/use-menulist`.
2. The page reads existing platform store/tenant context from `PlatformGlobalDataContext`.
3. It reads project summaries with `getExistingProjectsListWithoutLoader(true)` and shows `no_menu` without creating default truth when no project exists.
4. It builds OBP, project slug, feedback, install-app, store-menu alias, and outlet alias URLs from existing store/project data.
5. It reads `getScreenState()` once to expose Menu Board and Highlights links when configured.
6. Copy/open/share actions add entry-source attribution where appropriate and use clipboard/window open only.
7. QR/Menu Kit/print asset actions generate files in the browser only after owner action.
8. PDF fallback actions read the full selected project only on tap, then call the Menu Card Export renderer bridge.
9. Print Assets route reads full project data only for `print_menu` previews/downloads and caches it in the route session.
10. Menu Card Export reads summary data, one selected full project, then renders preview/preflight/PDF/packet in the browser.
11. Optional Menu Card Export AI advisor is a separate authenticated POST route with safe mode, AI operation rate limiting, tenant verification, plan gate, capacity check, provider call, response normalization, and accounting after valid output.

Mobile flow:

1. Mobile Share stays inside `MobileShell` and uses `MobileProjectsProvider` project state.
2. Mobile builds the same OBP, store-menu alias, project slug, feedback, screen, install-app, and outlet QR links.
3. Mobile QR sheets, Menu Kit downloads/shares, Print Assets, Print Menu, JSON/XLSX export, screen links, POS setup copy, and guide sheets reuse shared primitives.
4. Full project data is loaded only when PDF/export/print-menu actions need item/category data.

Public/customer-visible result:

- Store Menu QR and outlet QR intentionally use the stable `/menu` alias for reprint-safe physical placements.
- Project Menu QR and direct share links use the canonical project slug URL.
- OBP QR uses the official business page root.
- Feedback QR uses the feedback source URL for the selected project.

### C. Correctness Findings

1. **Fixed: project Share modal could emit the prohibited `/menu/{slug}` fallback.**  
   `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx` bypassed `generateProjectUrl()` when `subdomain` and `customDomain` were missing and generated `${origin}/menu/${slug}`. The shared URL doctrine explicitly forbids `/menu/{slug}`, and this could leak into QR downloads, social links, Menu Kit, and legacy PDF output from a partially initialized store. The modal now requires a store public address for customer-facing share assets and shows a clear not-ready state instead of generating an invalid public URL.

2. **Verified: Use MenuList desktop and mobile distinguish stable alias QRs from canonical project links.**  
   Physical Store Menu QR/outlet QR use `/menu` aliases intentionally for reprint safety. Project-specific links and QR assets use `generateProjectUrl()` and the real slug.

3. **Verified: read-only output hubs do not create project truth.**  
   Desktop Use MenuList and Menu Card Export use `getExistingProjectsListWithoutLoader(true)` and show empty states instead of auto-creating projects.

4. **Verified: object URL cleanup exists on heavier preview paths.**  
   Printable Asset Templates revokes preview URLs on close/unmount. Mobile Print Assets revokes the active preview URL when it changes or closes. Menu Kit immediate downloads revoke Blob URLs after click.

5. **Verified: Menu Card Export AI advisor is bounded and metered.**  
   The API route uses auth, tenant access verification, safe mode, operation rate limiting, Pro/Premium plan gate, capacity check, bounded Zod input, JSON normalization, and accounting after valid recommendation output.

### D. Firebase Cost Audit

Desktop Use MenuList page load:

- Store context: 0 additional reads from the hub; inherited provider context.
- Project summaries: 1 summary-doc read when not already cached.
- Screen state: 1 summary-doc read.
- Full selected project: 0 on page load; 0-1 on PDF/export/print-menu action.
- Writes: 0 on load; 0-1 existing starter activation signal write only when policy allows and only once per signal.

Mobile Share:

- Project state: usually inherited from `MobileProjectsProvider`.
- Screen state: 1 summary-doc read.
- Full selected project: 0-1 only when PDF/export/print-menu action needs full data.
- Writes: same starter-activation signal contract; local downloads/shares do not write Firebase.

Menu Kit / QR / Print Assets:

- QR and Menu Kit generation: 0 Firestore reads, 0 Firestore writes, 0 Storage writes, 0 Cloud Functions.
- Printable non-menu assets: use already-loaded summary/store context and browser generation.
- Printable `print_menu`: 0-1 full project read per selected project in that route session; cached for repeated template actions.
- Menu Card Export: one selected full project read after summary selection; browser PDF/ZIP/local history only.
- Menu Card Export local history: `localStorage`, no Firestore.
- AI advisor: separate owner-click server route; subscription/capacity/accounting reads/writes are AI billing-owned and only occur after plan/capacity gates.

Cost impact of fix:

- No Firebase cost increase. The Share modal now blocks invalid customer-facing asset generation when the store public address is missing.

### E. UI/UX Audit

- Owner output actions are grouped around Share, QR, Screens, Print, Menu Kit, and Resources without adding design-editor clutter.
- Desktop Print Assets gives a focused route for choosing asset type and finished style; Use MenuList remains the hub.
- Mobile Share covers the practical owner jobs without requiring a laptop: copy/open/share links, QR sheets, Menu Kit, individual assets, Print Assets, Print Menu, exports, screen links, feedback QR, POS setup copy, and guides.
- Missing public address state in the project Share modal now communicates "Public link is not ready" instead of exposing an invalid URL.
- Customer-facing generated outputs remain scan-first, non-admin-like, and tied to current public menu/OBP truth.

### F. Product/Positioning Audit

The audited slice supports MenuList's public-business truth infrastructure role:

- Generated files are deployment surfaces for the approved business/menu truth, not a generic design workspace.
- Menu Kit stays a launch/deployment pack; Menu Card Export owns full print-menu workflows.
- Public QR destinations are stable and purposeful: alias for reprint-safe placements, canonical slug for project-specific links, OBP root for business identity.
- No new owner settings, arbitrary template editing, Storage artifact system, or extra dashboard complexity was added.

### G. Documentation Alignment

Updated docs:

- `__docs__/use-menulist/use-menulist_impl.md`
- `__docs__/audits/menulist-production-readiness-audit.md`

Verified docs remain aligned:

- `__docs__/use-menulist/use-menulist_firebase.md`
- `__docs__/use-menulist/use-menulist_mobile-support.md`
- `__docs__/menu-kit/menu-kit_firebase.md`
- `__docs__/menu-card-export/menu-card-export_firebase.md`
- `__docs__/printable-asset-templates/printable-asset-templates_firebase.md`

### H. Fixes Made

Runtime files changed in this slice:

- `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx`

Documentation files changed in this slice:

- `__docs__/use-menulist/use-menulist_impl.md`
- `__docs__/audits/menulist-production-readiness-audit.md`

### I. Validation Performed

- `npx tsc --noEmit --incremental false --pretty false` — passed.
- `npm run lint` — passed.
- `git diff --check -- src/components/templates/main-app/projects/b2cView/shareModal/index.tsx` — passed.
- `npm run verify:menu-card-export` — passed.

Pending for this slice:

- Authenticated browser smoke of the project Share modal, Use MenuList, Print Assets, and Menu Card Export was not run in this checkpoint.
- Physical scan testing with printed output was not run in this environment.
- `npm run build` remains global-final validation and has not been run for the full certification.

---

## Completed Audit 17: POS Sync, GBP/External Discovery, Hours/Temporary Status, and Pricing Integrity

### A. Feature Identification

Feature cluster:

- POS Webhook Sync / External Menu Sync
- Google Business Profile sync and pre-API discovery guidance
- Hours & Holiday Accuracy plus temporary public status
- Pricing Integrity and shared price display formatting

Routes, components, hooks, DAL/functions, collections, flags, cache paths, and docs inspected:

- POS routes: `src/app/api/pos-sync/deliver/route.ts`, `src/app/api/pos-sync/test/route.ts`
- POS UI/mobile: `src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx`, `src/components/mobile/screens/MobilePosSyncScreen.tsx`
- POS libs: `src/lib/posSync/eventBuilder.ts`, `src/lib/posSync/payloadFormatter.ts`, `src/lib/posSync/signature.ts`, `src/lib/posSync/secretAudit.ts`, `src/lib/posSync/types.ts`, `src/lib/posSync/webhookUrl.ts`
- GBP/discovery UI: `src/components/templates/main-app/businessSettings/tabs/IntegrationsTab.tsx`, `src/components/mobile/screens/MobileIntegrationsScreen.tsx`, `src/components/templates/main-app/businessSettings/tabs/GoogleListingGuide.tsx`, `src/components/templates/main-app/dashboard/OwnerDashboard/GoogleListingCard.tsx`, `src/components/templates/main-app/useMenuList/PresenceMonitor.tsx`
- Hours/temp status: `src/lib/hours/hoursEngine.ts`, `src/lib/obp/hoursStatus.ts`, `src/lib/outputControl/hoursConfidence.ts`, `src/components/atoms/StoreStatusBadge/index.tsx`, `src/components/atoms/TrustSignals.tsx`, `src/components/templates/main-app/businessSettings/tabs/WorkingHoursTab.tsx`, `src/components/mobile/screens/MobileHoursScreen.tsx`, `src/components/mobile/screens/MobileWorkingHoursEditScreen.tsx`, `src/app/api/store/temp-status/route.ts`
- Pricing: `src/lib/pricing/formatMenuPrice.ts`, `src/lib/pricing/integrityEngine.ts`, `src/lib/pricing/molLogger.ts`, `src/lib/pricing/pdfQueue.ts`, `src/lib/validation/pricing.schema.ts`, `src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/PricingAction.tsx`
- Public rendering: `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`, OBP hours consumers, public temp-status banner path
- Feature flags: `ENABLE_POS_SYNC: true`, `ENABLE_GBP_SYNC: false`, `ENABLE_HOURS_STATUS_DISPLAY: true`, `ENABLE_OUTPUT_CONTROL: false`, `ENABLE_TEMP_STATUS: true`
- Firebase collections: `stores`, `stores/{storeId}/posDeliveryLogs`, `projects/{tId}/{sId}/{projectId}`, `menuChangeLog/{tId}/{sId}`, future/unused `posDeliveryQueue`
- Docs: `__docs__/pos-webhook-sync/*`, `__docs__/gbp-sync/*`, `__docs__/hours-holiday-accuracy/*`, `__docs__/pricing-integrity-system/*`

Affected surfaces:

- owner dashboard: yes, Business Settings, Today/hours, dashboard Google listing card
- mobile owner flow: yes, POS setup, Integrations, Hours, temporary status, Share POS setup copy
- public menu/customer page: yes, hours/trust signal, temp status, price rendering
- Official Business Page: yes, hours output and Google listing guidance destination
- website/marketing claim: yes, POS/GBP/pricing docs and public claim boundaries
- admin/internal operations: no new admin UI; server route hardening only
- billing/entitlement: indirect, POS flag and AI/billing untouched
- analytics/feedback/reviews: no direct analytics changes
- multi-location behavior: yes, POS is store-level and GBP/hours are store/outlet-level
- cache/public truth: yes, temp status and hours affect public truth; existing store update and temp-status invalidation paths inspected

### B. End-to-End Request/Data Flow

POS delivery flow:

1. Owner edits menu in the editor.
2. `triggerPosSyncDebounced()` waits 25 seconds and calls `POST /api/pos-sync/deliver` only when POS sync is enabled and a webhook URL exists.
3. Route enforces `withAuth()`, `ENABLE_POS_SYNC`, `MANAGE_INTEGRATIONS` or `PUBLISH_MENU`, request schema, tenant/store access, and rate limit.
4. Server reads `stores/{storeId}` via Admin SDK and validates `posSync.enabled`, webhook URL, and secret.
5. Server validates the webhook as a public HTTPS endpoint before any outbound fetch.
6. Server reads the project only from `projects/{tenantId}/{storeId}/{projectId}`; no client DAL or legacy/global fallback is used.
7. Server transaction increments `posSync.menuVersion`.
8. `buildMenuSnapshot()` builds the signed full snapshot from approved project-level extracted data, falling back to file-level extraction data only when top-level data is absent.
9. Server signs payload, POSTs to the webhook with a 5s timeout, writes one delivery log, trims logs to the last 20, and updates POS status/last error.
10. UI never blocks menu saving; owners see status/history in the POS settings panel.

POS test/setup flow:

1. Owner saves a public HTTPS provider URL from desktop or mobile.
2. Desktop/mobile use the same URL validator as server routes before saving.
3. Test route requires `MANAGE_INTEGRATIONS`, validates tenant/store, validates enabled POS config, signs a test payload, and fetches the validated endpoint.
4. Success marks status `healthy`; HTTP failures/timeouts/invalid stored URLs mark `connection_issue` with `lastError`.
5. "Send instructions" opens an owner email draft with the technical setup summary and tracks daily handoff count; MenuList does not send server-side email.

GBP/external discovery flow:

1. `ENABLE_GBP_SYNC` is false, so automated GBP OAuth/API sync UI is hidden or unavailable.
2. Desktop/manual bridge cards guide owners to copy the OBP URL into Google Business Profile.
3. Mobile integrations screen shows not available while the flag is off.
4. No GBP API routes, token storage, or sync functions run in current runtime.

Hours/temp status flow:

1. Desktop/mobile owners update working hours through existing store update paths.
2. Hour writes now stamp `hoursLastUpdatedAt` in the same `stores/{storeId}` write.
3. Public menu hours rendering uses existing loaded store data; output-control confidence remains flag-off, but the public menu now passes a freshness timestamp for future flag-on correctness.
4. Temporary status API requires auth, tenant/store session, `MANAGE_STORE` or `MANAGE_PUBLIC_PRESENCE`, validates payload/expiry, writes `tempStatus`, revalidates `menu-store-{storeId}`, `store-{storeId}`, and `client-stores`, and invalidates Owner Business Assistant packet cache.

Pricing flow:

1. Owner edits item/attribute prices in existing editor flows.
2. Public/menu/print/screen surfaces read the same project truth or generated output from that truth.
3. Shared `formatMenuPrice()` now preserves text prices and renders numeric ranges as ranges instead of coercing them to zero.

### C. Correctness Findings

1. **Fixed: POS delivery route used a client DAL reader from a server route.**  
   The old route imported `getProjectData(projectId)`, which depends on client/session context and includes a legacy fallback outside the request's tenant/store path. POS delivery now reads only `projects/{tenantId}/{storeId}/{projectId}` via Admin SDK and rejects missing/deleted projects.

2. **Fixed: POS routes could fetch owner-supplied internal/private URLs.**  
   Desktop/mobile save, test route, and delivery route now require a public HTTPS endpoint and reject localhost, `.local`, private IPv4, link-local, loopback, multicast, and private/link-local IPv6 hostnames before outbound fetch. Residual risk: DNS names resolving to private IPs are not resolved and rechecked in this runtime.

3. **Fixed: POS snapshot could be empty for approved projects.**  
   `buildMenuSnapshot()` only read `project.files[].extractedData.data`. Projects whose approved menu lives on top-level `project.extractedData` could send empty payloads. The formatter now uses top-level extracted data first and falls back to file extraction data.

4. **Fixed: POS test failures did not persist status.**  
   Test failures and timeouts now mark `posSync.status = connection_issue`, `lastStatus = failed`, and `lastError`, so desktop/mobile status matches the actual connection result.

5. **Fixed: POS "Send instructions" UI implied a backend email that did not exist.**  
   The action now validates the provider email, opens an owner email draft with the technical summary, and tracks handoff count. Docs now say email draft, not server-side email.

6. **Verified: GBP sync remains blocked/flag-off.**  
   Runtime does not expose OAuth/API sync when `ENABLE_GBP_SYNC` is false. Manual Google listing guidance remains the current shipped behavior.

7. **Fixed: temporary public status mutation lacked explicit permission enforcement.**  
   `/api/store/temp-status` was authenticated and tenant-scoped but did not require a role permission before changing customer-visible open/closed messaging. It now requires `MANAGE_STORE` or `MANAGE_PUBLIC_PRESENCE`.

8. **Fixed: hours freshness had no stable stamp on owner hour edits.**  
   Desktop and mobile hour saves now write `hoursLastUpdatedAt` in the same store update. The public menu trust signal receives this timestamp for output-control correctness when that flag is enabled.

9. **Fixed: range prices could render as `₹0`.**  
   `formatMenuPrice('199-249')` and similar range strings now render as a range; text prices like `Market Price` are preserved.

### D. Firebase Cost Audit

POS page/settings load:

- Store POS config: inherited from loaded store context on settings page.
- Delivery logs: one client query, `limit(20)`, only when POS sync is enabled and the POS tab loads.
- Secret rotation audit: one append-only MOL write only on rare owner rotation.

POS delivery:

- Reads: 1 store doc, 1 scoped project doc, transaction read of store doc for version increment.
- Writes: 1 version update in transaction, 1 delivery log write, 1 status update; plus bounded cleanup deletes after logs exceed 20.
- Outbound network: one 5-second-limited fetch per debounced delivery.
- Cost impact of fixes: no additional document reads beyond replacing the unsafe client DAL project read with the correct scoped Admin SDK read; validation is CPU-only.

POS test:

- Reads: 1 store doc.
- Writes: now 1 status update on success or failure. This is a deliberate correctness write; tests are owner-click, rate-limited, and low-frequency.

GBP:

- Runtime flag-off. No GBP token/doc reads, API calls, or Cloud Functions in current behavior.

Hours/temp status:

- Hours update: same single `stores/{storeId}` write now includes `hoursLastUpdatedAt`; no extra write/read.
- Public hours render: 0 incremental reads because hours are part of loaded store data.
- Temp status set/clear: one store write plus existing cache invalidation; permission check adds one store read through the existing permission helper.

Pricing:

- `formatMenuPrice()` fix is local render logic with 0 Firebase cost.
- Background PDF regeneration remains disabled in runtime; no Cloud Function or queue cost from this audit.

### E. UI/UX Audit

- POS setup remains quiet when healthy and visible when broken.
- Desktop and mobile now reject unsafe/non-public webhook URLs at save time with clear owner-facing messages.
- Test failures now persist a visible connection state instead of disappearing after a transient toast.
- Provider setup action now opens a real email draft instead of silently incrementing a counter.
- GBP sync does not appear as a working automation while the API integration is blocked.
- Mobile hours and desktop hours both support owner edits; updated freshness supports future confidence states.
- Temporary status remains a simple customer-facing notice and now has a server permission boundary matching its public impact.
- Price ranges and text prices stay readable on narrow/customer surfaces because the formatter no longer coerces them into numeric zero.

### F. Product/Positioning Audit

This cluster supports MenuList as public-business truth infrastructure:

- POS sync broadcasts approved MenuList truth; it does not let external systems write back.
- GBP is positioned as manual public link alignment until real API access exists.
- Hours and temp status stay low-burden: one owner action changes customer-facing truth and invalidates public cache.
- Pricing fix protects trust without adding pricing automation or owner decision clutter.

Rejected/avoided:

- No speculative POS retry queue or Cloud Function worker added.
- No automated GBP claims exposed while `ENABLE_GBP_SYNC` is false.
- No new owner toggles for URL validation, hours freshness, or price formatting.

### G. Documentation Alignment

Updated docs:

- `__docs__/pos-webhook-sync/pos-webhook-sync_impl.md`
- `__docs__/pos-webhook-sync/pos-webhook-sync_firebase.md`
- `__docs__/pos-webhook-sync/pos-webhook-sync_helpdoc.md`
- `__docs__/pos-webhook-sync/pos-webhook-sync_marketing.md`
- `__docs__/pos-webhook-sync/pos-webhook-sync_website.md`
- `__docs__/hours-holiday-accuracy/hours-holiday-accuracy_firebase.md`
- `__docs__/pricing-integrity-system/pricing-integrity-system_spec.md`
- `__docs__/pricing-integrity-system/pricing-integrity-system_firebase.md`
- `__docs__/pricing-integrity-system/README.md`
- `__docs__/audits/menulist-production-readiness-audit.md`

Docs corrected after runtime verification:

- POS project read is Admin SDK and tenant/store-scoped.
- POS webhook endpoints must be public HTTPS URLs.
- POS setup uses an owner email draft, not server-side email.
- POS delivery remains single-attempt; retry worker/queue remains deferred.
- Hours writes include a freshness stamp in the same store write.
- Range/text price display is verified in runtime formatter.

### H. Fixes Made

Runtime files changed in this slice:

- `src/lib/posSync/webhookUrl.ts`
- `src/app/api/pos-sync/deliver/route.ts`
- `src/app/api/pos-sync/test/route.ts`
- `src/lib/posSync/payloadFormatter.ts`
- `src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx`
- `src/components/mobile/screens/MobilePosSyncScreen.tsx`
- `src/app/api/store/temp-status/route.ts`
- `src/components/templates/main-app/businessSettings/index.tsx`
- `src/components/mobile/screens/MobileWorkingHoursEditScreen.tsx`
- `src/components/mobile/screens/MobileHoursScreen.tsx`
- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`
- `src/lib/pricing/formatMenuPrice.ts`

Documentation files changed in this slice are listed in §G.

### I. Validation Performed

- `npx tsc --noEmit --incremental false --pretty false` — passed.
- `npm run lint` — passed.
- `git diff --check -- [Audit 17 touched runtime files]` — passed.
- `npx tsx -e "...formatMenuPrice(...)"` — passed:
  - `199-249` -> `₹199-249`
  - `₹199 - ₹249` -> `₹199-249`
  - `Market Price` -> `Market Price`
  - `299` -> `₹299`

Pending for this slice:

- Authenticated browser smoke for POS desktop/mobile settings was not run.
- Real external webhook provider test was not run.
- DNS-resolution SSRF protection is not implemented; obvious local/private hostnames/IPs are blocked.
- Physical/public customer rendering was not browser-smoked after the formatter fix.
- No Vercel deploy was run.

---

## Completed Audit 18: Staff Prompt and Today Staff-Facing Operational Output

### A. Feature Identification

Feature cluster:

- Staff Prompt read-only Today summary display
- Today desktop and mobile maintenance-card rendering
- Weekly Growth Pack staff-line copy

Routes, components, hooks, DAL/functions, collections, flags, cache paths, and docs inspected:

- `src/database/campaigns/index.ts`
- `src/hooks/useTodayCampaigns.ts`
- `src/components/templates/main-app/today/hooks/useTodayCampaigns.ts`
- `src/components/templates/main-app/today/index.tsx`
- `src/components/templates/main-app/today/components/StaffPromptSection/index.tsx`
- `src/components/mobile/screens/MobileHoursScreen.tsx`
- `src/lib/today/weeklyGrowthPack.ts`
- `src/lib/campaigns/todayActionExecutor.ts`
- `src/types/campaigns.ts`
- `__docs__/staff-prompt/*`

Affected surfaces:

- owner dashboard: yes, desktop Today
- mobile owner flow: yes, MobileShell Today/Hours
- public menu/customer page: no direct render
- Official Business Page: no
- website/marketing claim: docs only
- admin/internal operations: upstream summary generation not implemented in this audited slice
- billing/entitlement: no
- analytics/feedback/reviews: indirect, summary may originate from analytics/campaign systems
- multi-location behavior: store-scoped summary doc per `sId`
- cache/public truth: no public cache writes; SWR Today summary cache only

### B. End-to-End Request/Data Flow

Runtime flow:

1. Desktop Today and mobile Today/Hours call shared `useTodayCampaigns()`.
2. Hook uses SWR key `today-campaigns`, `getTodayCampaigns()`, revalidate-on-focus/reconnect, and 30-second dedupe.
3. DAL reads one document: `platformSummary/campaigns_{sId}` for the active session.
4. If the summary date is not today, DAL returns an empty Today state and no staff prompt.
5. If the summary is current, DAL returns `today`, `staffPrompt`, and `physicalSurfaces`.
6. Desktop renders `StaffPromptSection` only when `staffPrompt.eligible` is true.
7. Mobile renders the same staff line card only when `staffPrompt.eligible` is true.
8. Weekly Growth Pack now receives staff prompt text only when the prompt is eligible.

### C. Correctness Findings

1. **Fixed: desktop Today hid eligible staff prompts on otherwise-empty days.**  
   The desktop state machine treated `today.isEmpty` as an empty screen before considering eligible staff prompts or physical surface maintenance cards. Mobile already rendered the card. Desktop now treats eligible maintenance cards, including Staff Prompt, as Today content.

2. **Fixed: Weekly Growth Pack could consume ineligible staff prompt text.**  
   Desktop and mobile now pass `staffPrompt.text` into weekly pack generation only when `staffPrompt.eligible` is true.

3. **Verified: Staff Prompt active runtime is read-only summary display.**  
   There is no separate staff-facing portal, no AI staff assistant, no owner settings, and no runtime helper engine in `src/lib/staff-prompt/`. Active code reads summary data only.

4. **Verified: stale summary protection exists.**  
   `getTodayCampaigns()` checks `data.today.date` against current local ISO date and suppresses staff prompt when the summary is stale.

### D. Firebase Cost Audit

- Reads: one `platformSummary/campaigns_{sId}` read per Today open/SWR cache miss, shared with campaigns and physical surfaces.
- Writes: none from Staff Prompt UI.
- Listeners: none; SWR revalidates on focus/reconnect with 30-second dedupe.
- Client fanout: none.
- Cost impact of fixes: no new Firestore reads/writes.

### E. UI/UX Audit

- Desktop and mobile now have parity for eligible Staff Prompt display.
- The component remains read-only with no owner decisions or settings.
- Empty-state behavior is clearer: if a staff line is available, Today is not empty.
- The prompt text appears as a single line owners can share verbally; it is not presented as a chat/training tool.

### F. Product/Positioning Audit

The active Staff Prompt behavior supports MenuList's infrastructure posture only as a quiet operational hint. It does not introduce a generic AI assistant, staff training product, or extra workflow. Documentation was corrected to prevent that over-positioning.

### G. Documentation Alignment

Updated docs:

- `__docs__/staff-prompt/README.md`
- `__docs__/staff-prompt/staff-prompt_mobile-support.md`
- `__docs__/staff-prompt/staff-prompt_firebase.md`
- `__docs__/staff-prompt/staff-prompt_helpdoc.md`
- `__docs__/staff-prompt/staff-prompt_spec.md`
- `__docs__/staff-prompt/staff-prompt_impl.md`
- `__docs__/staff-prompt/staff-prompt_validation.md`
- `__docs__/staff-prompt/staff-prompt_code-review.md`
- `__docs__/staff-prompt/staff-prompt_logic-verification.md`
- `__docs__/audits/menulist-production-readiness-audit.md`

Corrections made:

- Removed active-doc claims that Staff Prompt is a separate AI-powered staff training portal.
- Updated mobile support to reflect MobileShell parity.
- Updated Firebase docs to the one-summary-read runtime.
- Added runtime notes to older historical verification docs that still reference removed helper files.

### H. Fixes Made

Runtime files changed in this slice:

- `src/components/templates/main-app/today/index.tsx`
- `src/components/mobile/screens/MobileHoursScreen.tsx`

Documentation files changed in this slice are listed in §G.

### I. Validation Performed

- `npx tsc --noEmit --incremental false --pretty false` — passed.
- `npm run lint` — passed.
- `git diff --check -- [Audit 18 touched files]` — passed.

Pending for this slice:

- Authenticated browser smoke for desktop Today and mobile Today/Hours was not run.
- Upstream scheduler/generation logic for writing `staffPrompt` into the summary was not certified in this slice because no active `src/lib/staff-prompt/` generator exists.

---

## Completed Audit 19: Safe Mode, Ops Controls, Platform Monitoring, Internal Admin Routes, and Security-Adjacent System Hardening

### A. Feature Identification

**Feature cluster:** Operational controls, safe mode, platform/internal monitors, platform entity blocks, admin subdomain rename, reseller management protection, and security-adjacent internal routes.

Relevant routes, components, DAL, and docs inspected:

- `src/app/api/ops/safe-mode/route.ts`
- `src/app/api/ops/mute-alerts/route.ts`
- `src/app/api/ops/platform-notifications/route.ts`
- `src/app/api/ops/owner-notifications/route.ts`
- `src/app/api/ops/messaging-onboarding/route.ts`
- `src/app/api/admin/subdomains/rename/route.ts`
- `src/app/api/platform/entity-blocks/route.ts`
- `src/app/api/platform/owner-business-assistant/monitor/route.ts`
- `src/app/api/platform/answerlattice-intake/route.ts` (separation check only)
- `src/lib/ops/safeMode.ts`
- `src/lib/ops/alerts.ts`
- `src/database/ops/index.ts`
- `src/database/ops/scheduler.ts`
- `src/database/ops/extraction.ts`
- `src/components/templates/main-app/platform/opsControlRoom/index.tsx`
- `src/components/mobile/screens/MobileOpsControlRoomScreen.tsx`
- `src/components/templates/main-app/platform/*Monitor/index.tsx`
- `src/components/templates/main-app/reseller/ResellerManagement.tsx`
- `src/components/mobile/screens/MobileResellerManagementScreen.tsx`
- `src/constants/user.ts`
- `src/config/features.ts`
- `__docs__/ops-control-room/ops-control-room_impl.md`
- `__docs__/reseller-dashboard/*`
- `__docs__/owner-notifications/owner-notifications_impl.md`
- `__docs__/messaging-onboarding/README.md`
- `__docs__/url-routing-architecture/README.md`

Affected surfaces:

- Owner dashboard: yes, indirectly through ops recovery and cache/public truth repair.
- Mobile owner flow: yes, mobile Ops Control Room and mobile reseller management.
- Public menu/customer page: yes, admin subdomain rename and platform entity blocking affect public routing/cache.
- Official Business Page: yes, store/subdomain cache invalidation and entity blocking.
- Website/marketing claim: no direct copy change.
- Admin/internal operations: yes.
- Billing/entitlement: yes, reseller management protection.
- Analytics/feedback/reviews: yes, internal monitors only.
- Multi-location behavior: yes, force-republish and store selectors read platform summaries.
- Cache/public truth: yes.

### B. End-to-End Request/Data Flow

Safe mode:

1. Platform operator opens desktop/mobile Ops Control Room.
2. UI waits for `platformRole === 'PLATFORM'` before client Firestore reads.
3. Operator toggles SAFE_MODE through `/api/ops/safe-mode`.
4. API validates input, rate-limits per operator, writes `ops_config/system`, writes a classified `systemAlerts` alert, and returns `{ success, SAFE_MODE }`.
5. Expensive routes using `checkSafeMode()` read `ops_config/system` and return 503 when active; public menu rendering remains unaffected.

Platform monitors:

1. Platform operator opens a monitor route.
2. UI checks feature flag and platform role.
3. API routes enforce `withAuth()` / `withPlatformAuth()`, validate query/action payloads, and use bounded Admin SDK reads.
4. Recovery actions are rate-limited and write only the relevant alert/event/delivery state.

Admin subdomain rename:

1. Platform operator posts tenant/store/new-subdomain/reason/ackRef.
2. API validates shape, reserved slugs, direct collisions, and active rename-chain collisions.
3. Transaction updates the store, storesSummary subdomain, and audit log.
4. Server revalidates `menu-store-{storeId}`, `store-{storeId}`, and `client-stores`, then clears the Business Health packet cache for the store.

Reseller management:

1. Page/mobile screen permits only `platformRole === 'PLATFORM'`.
2. Runtime loads reseller profiles and monthly summary through existing platform-only APIs.
3. No client-bundled password or static secret is used.

### C. Correctness Checks

Issues found and fixed:

1. **Fixed: client-bundled platform password existed in source and browser bundles.**
   `ECOMSAI_PLATFORM_PASSWORD` exposed a literal platform password from `src/constants/user.ts`; desktop/mobile reseller management compared it in client code. The constant and password gates were removed. The route now relies on page-level platform checks and platform-only APIs.

2. **Fixed: internal monitor APIs served data even when their UI feature flag was disabled.**
   Platform notifications, owner notification ops, messaging onboarding ops, and entity blocks now return `404` before Firestore reads/writes when their governing flags are off.

3. **Fixed: desktop Ops Control Room could start client Firestore reads before platform session confirmation.**
   The desktop effect now waits for session resolution and confirmed platform role before loading ops state.

4. **Fixed: bad JSON on ops/admin mutations could fall into generic 500 handling.**
   Mute alerts, entity blocks, and admin subdomain rename now treat malformed JSON as invalid input.

5. **Fixed: admin subdomain rename missed public cache invalidation and denormalized summary sync.**
   Rename now writes the new subdomain into `platformSummary/storesSummary`, revalidates public menu/store/client-store cache tags, and clears the Business Health packet cache.

6. **Fixed: messaging onboarding ops health lookup required a missing Firestore document-id index.**
   The platform monitor queried `systemHealth` by document-id prefix and descending `__name__`, which failed for an authenticated platform owner in the built-server smoke. The API now reads the writer-owned `messaging_onboarding_control` document and then the referenced `lastSnapshotId`, avoiding the index requirement and bounding the latest-health lookup to one or two direct document reads.

7. **Fixed: Ops Control Room header actions overflowed horizontally in Chrome.**
   Authenticated Chrome visual QA at a 1512px desktop viewport showed the monitor links extending past the right edge. The header action group now wraps inside the content column instead of forcing page-level horizontal overflow.

8. **Fixed: Platform Notifications message cells collapsed into narrow wrapped columns.**
   Chrome visual QA showed alert metadata wrapping into an unreadable vertical strip. The Message column now has an explicit width and the table uses internal horizontal scroll, preserving page width while keeping operational alert details readable.

Separation checks:

- Answerlattice intake monitor remains behind its own feature flag and Answerlattice Firebase admin client.
- This audit did not change Answerlattice collections, functions, or behavior.

### D. Firebase Cost Audit

- Ops Control Room: client reads now occur only after confirmed platform role. Manual refresh only, no listener.
- SAFE_MODE toggle: one `ops_config/system` write plus one `systemAlerts` write; delivery path may read `ops_config/system` once for mute status.
- Mute alerts: one `ops_config/system` write.
- Platform notifications: bounded recent alert scan, five count aggregations, optional one detail read; no listener; zero reads when dashboard flag is off.
- Owner notifications: bounded event scan, six count aggregations, optional delivery/scope reads on selected detail; action writes only on retry/manual-send/manual-handoff; zero reads when master/dashboard flag is off.
- Messaging onboarding monitor: bounded Admin SDK counts and recent rows; latest health is one control-doc read plus one snapshot-doc read when present; zero reads when dashboard flag is off.
- Entity blocks: writes only on platform action; tenant block may read/update `storesSummary` or fallback-query tenant stores. Cache revalidation adds no Firestore write.
- Admin subdomain rename: adds one `platformSummary/storesSummary` merge write and cache invalidation after the existing store/audit transaction. This improves correctness with negligible platform-only write cost.
- Removing the client password gate does not add Firebase cost; profile/monthly reads happen once on confirmed platform mount, matching the previous post-password flow.
- Chrome visual layout fixes add zero Firebase reads, writes, listeners, routes, or indexes.

### E. UI/UX Audit

- Desktop Ops Control Room and mobile Ops Control Room both keep safe-mode/mute/republish controls platform-only.
- Mobile Ops Control Room already waits for session state and shows a platform-only empty state for non-platform users.
- Reseller management desktop/mobile now removes an extra fake password step and shows the actual platform-admin experience directly after platform session confirmation.
- Ops Control Room desktop actions now wrap instead of creating horizontal page overflow.
- Platform Notifications keeps long alert messages readable through table-level horizontal scroll rather than page-level overflow or narrow text collapse.
- Public customer pages are unaffected except they now refresh promptly after platform subdomain rename.

### F. Product/Positioning Audit

The fixes preserve MenuList as public-business truth infrastructure:

- No owner-facing ops complexity was added.
- Public routing repairs stay platform-only and audited.
- Monitoring surfaces remain internal and feature-flagged.
- No generic QR/menu-tool behavior or AI dashboard clutter was added.

### G. Documentation Alignment

Docs updated:

- `__docs__/ops-control-room/ops-control-room_impl.md`
- `__docs__/reseller-dashboard/reseller-dashboard_impl.md`
- `__docs__/reseller-dashboard/reseller-dashboard_mobile-support.md`
- `__docs__/owner-notifications/owner-notifications_impl.md`
- `__docs__/messaging-onboarding/README.md`
- `__docs__/url-routing-architecture/README.md`
- `__docs__/CHANGELOG.md`

Docs corrected to match runtime:

- Reseller management is platform-role/API protected; no client-bundled platform password exists.
- Internal ops monitor APIs are feature-flag fail-closed.
- Messaging onboarding ops latest-health lookup uses the control doc instead of a document-id prefix query.
- Chrome visual QA findings for Ops Control Room and Platform Notifications are recorded.
- Admin subdomain rename updates store summary and invalidates public cache tags.

### H. Fixes Made

Runtime files changed in this slice:

- `src/constants/user.ts`
- `src/components/templates/main-app/reseller/ResellerManagement.tsx`
- `src/components/mobile/screens/MobileResellerManagementScreen.tsx`
- `src/app/(main)/reseller/manage/page.tsx`
- `src/app/api/ops/platform-notifications/route.ts`
- `src/app/api/ops/owner-notifications/route.ts`
- `src/app/api/ops/messaging-onboarding/route.ts`
- `src/app/api/ops/mute-alerts/route.ts`
- `src/app/api/platform/entity-blocks/route.ts`
- `src/components/templates/main-app/platform/opsControlRoom/index.tsx`
- `src/components/templates/main-app/platform/platformNotificationMonitor/index.tsx`
- `src/app/api/admin/subdomains/rename/route.ts`

### I. Validation Performed

- `npx tsc --noEmit --incremental false --pretty false` - passed.
- `npm run lint` - passed.
- `npm run build` - passed. Build emitted the existing batch image generation warning that `BATCH_IMAGE_GENERATION_WORKER_SECRET` is missing from the app environment.
- `git diff --check -- [Audit 19 touched files]` - passed after removing one trailing-space doc line.
- Built-server HTTP smoke with `npm start -- --hostname 127.0.0.1 --port 3000`:
  - `GET /ops` returned `307` to `/platform/ops-control-room`.
  - `GET /platform/ops-control-room` with `x-forwarded-proto: https` returned `200`.
  - `GET /reseller/manage` with `x-forwarded-proto: https` returned `200`.
  - Unauthenticated `POST /api/ops/safe-mode` returned `401`.
  - Unauthenticated `POST /api/platform/entity-blocks` returned `401`.
- Authenticated platform-owner HTTP smoke with the provided test account:
  - NextAuth credentials flow returned `200`, established a session cookie, and `/api/auth/session` returned `platformRole: "PLATFORM"`.
  - `GET /platform/ops-control-room`, `/ops/platform-notifications`, `/ops/owner-notifications`, `/ops/messaging-onboarding`, and `/reseller/manage` returned `200` with no redirect, no client password prompt, and no access-restricted marker.
  - `GET /api/ops/platform-notifications?limit=5`, `/api/ops/owner-notifications?productId=ML&status=failed&limit=5`, and `/api/ops/messaging-onboarding` returned `200` JSON payloads with the expected top-level keys.
  - The first authenticated smoke exposed the missing `systemHealth` document-id index in `/api/ops/messaging-onboarding`; the bounded control-doc fix was applied, rebuilt, and the route then returned `200`.
- Authenticated Chrome visual QA:
  - Chrome could not open raw `localhost` or local IP URLs directly, so a temporary local proxy was used to supply the forwarded HTTPS header that production receives from the deployment proxy.
  - Signed in through Chrome as the platform test account.
  - Production-built visual pass loaded `/platform/ops-control-room`, `/ops/platform-notifications`, `/ops/owner-notifications`, `/ops/messaging-onboarding`, and `/reseller/manage`; no client password prompt, sign-in prompt, or access-restricted state appeared.
  - Found the Ops Control Room horizontal action overflow and the Platform Notifications collapsed Message column; both were fixed.
  - Source-level Chrome recheck confirmed Platform Notifications has no page-level overflow, the Message column renders at readable width, and the table owns its horizontal scroll.
  - Source-level Ops Control Room recheck confirmed no page-level horizontal overflow, but the synthetic proxy origin could not fully revalidate the loaded data state because `/api/auth/set-claims` and Firebase App Check reject the temporary `sslip.io` origin. This is a Chrome-local QA limitation, not a production route behavior.
- Built output search found no literal `MenuList@2026`, no `Enter platform password`, and no `ECOMSAI_PLATFORM_PASSWORD` reference outside docs that describe the removed issue.

Pending:

- Production-build visual recheck after the Chrome layout fixes is blocked by unrelated CampaignCue TypeScript drift. Chrome communication also dropped after the source-level recheck; extension/native-host checks passed, but opening a new Chrome window requires user confirmation under the Chrome plugin workflow.

---

## Whole-App Visual And Localhost Dev QA Follow-Up - June 11, 2026

### Scope Audited

This follow-up used a Chrome-authenticated platform-owner session and local tenant host routing to move beyond platform/ops-only coverage. The pass covered:

- Public website and marketing/legal routes: `/`, `/features`, `/pricing`, `/get-started`, `/create-menu`, `/resources`, `/resources/menu-source-audit`, `/how-it-works`, `/industries/restaurants`, `/multi-location`, `/trust-security`, `/privacy-policy`, `/terms-of-service`, `/refund-policy`, `/contact`, `/about`, and `/signin`.
- Owner desktop routes: `/dashboard`, `/today`, `/today/history`, `/projects`, `/use-menulist`, `/use-menulist/print-assets`, `/use-menulist/menu-card-export`, `/assets`, `/qr-code`, `/qrCode`, `/feedback`, `/business-settings`, `/transactions`, `/locations`, `/billing`, `/users/list`, `/users/permissions`, `/help-center`, `/business-health`, `/growth-kits`, `/users`, `/reseller`, `/reseller/onboard`, and `/reseller/manage`.
- Platform/internal MenuList routes: `/platform`, `/platform/ops-control-room`, `/platform/scheduler-monitor`, `/platform/extraction-monitor`, `/platform/answerlattice-intake`, `/platform/entity-blocks`, `/platform/tenants`, `/platform/stores`, `/platform/users`, and `/platform/owner-business-assistant`.
- Forced mobile shell owner routes: `/dashboard?mobileAudit=1`, `/today?mobileAudit=1`, `/projects?mobileAudit=1`, `/use-menulist?mobileAudit=1`, `/feedback?mobileAudit=1`, `/business-health?mobileAudit=1`, `/billing?mobileAudit=1`, `/locations?mobileAudit=1`, and `/qr-code?mobileAudit=1`.
- Public tenant/customer routes on a real local tenant fixture: OBP root `/`, `/menu`, `/bar-menu`, `/spa-menus`, `/privacy`, `/terms`, `/refund`, and `/feedback/14-mn8d5jbz-15?source=menu_footer`.
- Public pull API guards: `/api/public/v1/business?subdomain=habibis` and `/api/public/v1/menu?subdomain=habibis&slug=bar-menu` without an API key.

### Findings

1. **Fixed: desktop QR routes rendered a placeholder page.**  
   `/qr-code` showed only `QrCodePage` while the mobile owner shell correctly mapped QR/share behavior into the Share screen. `/qr-code` and the legacy `/qrCode` alias now render the same Use MenuList owner surface directly. This keeps the sidebar route stable and avoids an app-router redirect path that returned a 404 shell under localhost dev.

2. **Fixed: public compliance pages inherited menu metadata.**  
   Tenant `/privacy`, `/terms`, and `/refund` pages rendered the correct public compliance content but inherited the default menu title. Metadata now resolves the compliance page title and description before project/menu metadata fallback.

3. **Observed: Projects emits an Ant Design deprecation warning.**  
   The Projects route still logs the existing `destroyOnClose` deprecation warning from the special-menu modal path. It did not block rendering and was not changed in this pass.

4. **Observed: local provider/media warnings did not break public rendering.**  
   Local public QA saw intermittent Upstash rate-limit provider timeouts and Firebase Storage image responses with upstream `402` responses. Public pages continued to render text and navigation, but provider and media-account health remain production smoke items.

5. **Observed: `/today/history` canonicalizes to `/today`.**  
   The owner history route redirected to the Today surface in this environment. This was recorded as route behavior rather than changed, because no broken user-visible error or dead end appeared.

### Fixes Made

Changed runtime files in this follow-up:

- `src/app/(main)/qr-code/page.tsx`
- `src/app/(main)/qrCode/page.tsx`
- `src/app/client/[[...slug]]/page.tsx`
- `src/lib/security/inputValidation.ts`

Changed documentation:

- `__docs__/audits/menulist-production-readiness-audit.md`
- `__docs__/CHANGELOG.md`

### Firebase Cost Findings

- QR route surface reuse adds zero Firebase reads, writes, listeners, indexes, API calls, or cache invalidation work beyond the existing Use MenuList page behavior.
- Compliance metadata now exits before menu/project metadata fallback for compliance slugs. It reuses the store lookup already required for public metadata and avoids an unnecessary project fallback read for `/privacy`, `/terms`, and `/refund`.
- Public tenant menu pages remained on the existing cached public truth path with `client-stores`, `store-{storeId}`, and `menu-store-{storeId}` cache tags; no new listener or client fanout pattern was introduced.
- Public feedback rendering was checked without submitting feedback, so no customer feedback write was produced.
- Public pull APIs failed closed without an API key and did not expose tenant data. The API-key validation path remains the intended gate before any authorized business/menu payload read.
- The shared `validateAPIInput()` type contract now accepts schemas with unknown raw input and typed parsed output, matching Zod preprocess behavior without changing runtime validation.

### Desktop/Mobile/Public Parity

- Desktop owner navigation now has the same practical QR/share surface as the mobile Share route.
- Forced mobile shell routes rendered without auth wall, visible error, not-found state, or horizontal overflow. This proves shell routing and state coverage, but it is not a substitute for physical mobile or browser-emulated narrow-device QA.
- Public tenant OBP, menu, compliance, and feedback routes rendered without owner/admin leakage, auth wall, visible not-found state, or page-level horizontal overflow.
- The public feedback flow was verified through the menu footer project-scoped link. The bare tenant `/feedback` route is an owner route and is not the customer feedback entry point.

### Public Route And Cache Findings

- Local tenant routing required the dev server to run with `NEXT_PUBLIC_PLATFORM_DOMAIN=192-168-11-18.sslip.io` and tenant host `habibis.192-168-11-18.sslip.io`; raw localhost and synthetic proxy routing were not reliable proof for the tenant middleware path.
- Plain `http://localhost:3000` remains the correct dev target for owner/platform routes. Public customer tenant routes are host-sensitive and cannot be fully proven on plain localhost without a tenant hostname or configured local platform domain.
- OBP, default menu, non-default menu slug, compliance pages, and project-scoped feedback route all resolved on the tenant host.
- Compliance metadata now matches the rendered public surface and no longer leaks an unrelated menu title into legal/compliance pages.
- No write path was touched, so public cache invalidation requirements were unchanged.

### Validation Performed

- Chrome visual QA for the route sets listed above.
- Chrome automation could not open plain `http://localhost:3000` routes in this environment because Chrome returned `ERR_BLOCKED_BY_CLIENT`; localhost follow-up therefore used `npm run dev`, authenticated NextAuth HTTP route probes, and server logs.
- Targeted recheck after fixes:
  - `npm run dev` on `http://localhost:3000` returned `200` for authenticated `/qr-code`, `/qrCode`, and `/use-menulist`; all rendered Use MenuList content, did not render `QrCodePage`, and had no Next not-found marker.
  - `/privacy`, `/terms`, and `/refund` produced compliance-specific titles.
  - Forced mobile `/qr-code?mobileAudit=1` still resolved to the Share shell.
- Public API smoke without API key:
  - `/api/public/v1/business?subdomain=habibis` returned `MISSING_API_KEY`.
  - `/api/public/v1/menu?subdomain=habibis&slug=bar-menu` returned `MISSING_API_KEY`.
- `git diff --check -- src/app/(main)/qr-code/page.tsx src/app/(main)/qrCode/page.tsx src/app/client/[[...slug]]/page.tsx src/lib/security/inputValidation.ts __docs__/audits/menulist-production-readiness-audit.md __docs__/CHANGELOG.md` - passed.
- `npm run lint` - passed.
- `npx tsc --noEmit --incremental false --pretty false` - passed.
- `npm run build` - intentionally not used for this follow-up after owner instruction to validate with `npm run dev` on localhost.

### Remaining Risks From This Follow-Up

- True physical-device or browser-emulated narrow viewport QA remains pending because the available Chrome automation did not expose a reliable viewport emulation control in this run.
- Provider/payment/POS/WhatsApp smokes remain pending.
- Media provider/account health needs a separate production-environment check because local image proxy responses included upstream 402s.
- No Vercel deploy or production-host smoke was run, per deployment guard.

---

## Global Validation Results

- `npm run lint` - passed after the platform Chrome fixes and after the whole-app Chrome follow-up fixes.
- `npx tsc --noEmit --incremental false --pretty false` - passed after the whole-app Chrome follow-up fixes.
- `npm run build` - intentionally not used for this follow-up after owner instruction to validate with `npm run dev` on localhost.
- `git diff --check -- [MenuList whole-app follow-up touched files]` - passed.
- Built-server HTTP smoke covered unauthenticated/local behavior for `/ops`, `/platform/ops-control-room`, `/reseller/manage`, `/api/ops/safe-mode`, and `/api/platform/entity-blocks`.
- Authenticated platform-owner built-server HTTP smoke passed for platform ops pages and the audited ops APIs.
- Authenticated Chrome visual QA ran for platform/internal routes and fixed two layout issues.
- Whole-app Chrome visual QA covered public website/sign-in, owner desktop, platform/internal, reseller, public tenant OBP/menu/compliance/feedback, forced mobile shell routes, and public API missing-key fail-closed behavior.
- Authenticated localhost `npm run dev` HTTP smoke established a platform-owner session and verified `/dashboard`, `/projects`, `/use-menulist`, `/qr-code`, `/qrCode`, `/feedback`, `/business-settings`, `/business-health`, `/reseller/manage`, `/platform/ops-control-room`, and `/platform/scheduler-monitor` returned `200` without the old QR placeholder.

Build warning retained as a known environment/config item:

- `BATCH_IMAGE_GENERATION_WORKER_SECRET` is missing, so batch image generation Cloud Tasks are not fully runnable until configured.

---

## Remaining Known Risks

1. Authenticated platform-owner HTTP and Chrome visual smoke passed for the audited platform/internal route set, and the follow-up Chrome pass covered owner desktop, forced mobile shell, public website, public tenant menu/OBP/compliance/feedback, reseller, and public API missing-key guards. True physical-device or browser-emulated narrow-viewport QA remains pending.
2. Firebase Function deployments for `processMenuImages`, Decision Intelligence functions, `menulistMaintenanceScheduler`, and lifecycle notification hardening remain blocked by `ecomsai` billing-disabled Secret Manager 403; code is locally validated but not deployed.
3. Batch image generation requires `BATCH_IMAGE_GENERATION_WORKER_SECRET` in the app environment before Cloud Tasks can run.
4. Razorpay sandbox smoke was not run after the billing hardening.
5. Real WhatsApp/provider testing for messaging onboarding remains pending.
6. External POS webhook provider smoke was not run after the POS hardening.
7. Tenant-block denormalization could reduce public store-cache miss reads but needs a dedicated platform entity-blocking audit/migration decision.
8. Firestore rules for the Audit 10/11 slices deployed. Full index-file deploy remains blocked by an unrelated existing `kb_articles` index 409, but the two required `reviewsState` indexes were created directly with `gcloud` and both operations later reported `done: true`.
9. Reviews/Reputation remains disabled until GBP ingestion exists and owner mount points are intentionally added.
10. Onboarding compensation for local tenant/store/user creation followed by external provider failure remains an identified risk.
11. Reseller offline expiry/count maintenance remains queued for a focused scheduler/billing reconciliation audit.
12. Downstream GrowthOS/screen consumers of CMI were not certified in Audit 8 and remain queued for their own feature loops.
13. No Vercel deploy was run, per deployment guard.

---

## Next Step To Continue From

Continue with **external and authenticated certification gates**:

- True narrow-viewport mobile device QA for the owner shell and public customer menu.
- Razorpay sandbox subscription/top-up/reseller payment smoke.
- Real WhatsApp/provider messaging onboarding smoke.
- External POS webhook test against a real HTTPS provider endpoint.
- Production-host smoke after an explicit Vercel deploy request.
- Retry Firebase Function deploys only after the `ecomsai` billing-disabled Secret Manager blocker is resolved.

Previously completed feature-cluster files included:

- `src/components/mobile/screens/MobileMenuScreen.tsx`
- `src/app/api/descriptions/route.ts`
- `src/app/api/translations/route.ts`
- `src/components/templates/main-app/projects/editorView/*`
- `src/app/api/image-generation/*`
- `src/app/api/image-editing/route.ts`
- `src/app/screen/[token]/*`
- `src/app/api/screen/seen/route.ts`
- `src/components/templates/main-app/projects/b2cView/output/DecisionBlocks.tsx`
- `functions/src/decisionBlocksScoring.ts`
- `src/lib/intelligence/dal.ts`
- `src/lib/mce/*`
- `src/lib/outputControl/*`
- `src/app/api/owner-business-assistant/*`
- `src/lib/ownerBusinessAssistant/*`
- `src/components/templates/main-app/useMenuList/*`
- `src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx`
- `src/components/templates/main-app/projects/b2cView/shareModal/*`
- `src/components/mobile/screens/MobileShareScreen.tsx`
- `src/lib/menu-kit/*`
- `src/lib/menu-card-export/*`
- `src/lib/printable-asset-templates/*`

---

## Final Verdict For This Checkpoint

**Not production ready** as a full MenuList certification.

The completed public truth routing/client menu/OBP cache slice, Stores/Business Settings/public store write slice, Projects/Menu Builder/output slice, AI extraction/upload/review slice, editor/translation/design slice, AI image/media slice, Digital Screens slice, Decision Intelligence/CMI/MCE/output-control slice, Business Health/Owner Business Assistant slice, Analytics/Guest Feedback/Reviews scaffolding slice, Roles/Permissions/Auth/Staff slice, Billing/Razorpay/Top-ups/Reseller slice, Multi-Outlet/Location Lifecycle slice, Public Create-Menu/Messaging/Notifications slice, Main Website/Public Claims/Discovery slice, Physical Surfaces/Print/Export/Use MenuList Assets slice, POS/GBP/Hours/Pricing Integrity slice, Staff Prompt/Today staff-facing output slice, and Safe Mode/Ops/Platform Monitoring/Internal Admin slice are **controlled owner testing ready after the fixes above**, with TypeScript, lint, authenticated platform-owner HTTP smoke, Chrome visual route smoke where available, and authenticated localhost `npm run dev` route checks passing. Full production readiness remains blocked by true narrow-viewport mobile QA, provider sandbox/real-provider smoke, Firebase Function deployment, configured batch worker secret, production-host smoke, and the specific remaining risks above.

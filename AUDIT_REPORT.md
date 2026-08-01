# MenuList System Audit Report

Original audit date: 2026-06-20
Latest audited addendum: 2026-07-31
Product context: MenuList
Audit type: System data-flow correctness, public business truth, cache/auth/reliability hardening

## 1. Executive Summary

Current confidence level: High for the audited high-risk customer-visible business truth paths covered by static source tracing, targeted verifier, TypeScript, lint, and production build. Not absolute confidence: live Firebase data, production caches/CDN behavior, external provider credentials, Cloud Tasks secrets, and real owner/browser sessions were not available in this environment.

Major risks found:

- The public Platform Pull menu API could return `NO_MENU` for a valid customer menu because it queried the full project document for `isDefault`, while the customer renderer and summary read model treat `platformSummary/projects_{storeId}` as the default-project source of truth.
- Public timed categories were evaluated in the browser/customer timezone instead of the store timezone. Customers outside the business timezone could see the wrong breakfast/lunch/special categories.
- Public menu rendering could show empty categories or inactive items when category/item active state diverged.
- Missing hours could be converted into an authoritative "Open" status by the generic hours engine.
- Partial or malformed timed-category slots could throw during public menu visibility evaluation.
- Custom domain duplicate checks compared store ids by raw value, so numeric/string id shape drift could incorrectly block or allow a domain association.
- The standard `npm run build` script capped Node heap at 6144 MB and failed locally with a JavaScript heap out-of-memory abort. A direct 8192 MB run passed, so the script cap was stale for the current app size.

Major fixes applied:

- Aligned `GET /api/public/v1/menu` with `platformSummary/projects_{storeId}` default-project truth, then read the selected full project document for menu content.
- Added a public-business-truth verifier and npm script to lock the Platform Pull API, missing-hours, timed-category, inactive item/category, and domain id invariants.
- Updated public menu timed-category logic to use store timezone and to refresh visibility every minute.
- Suppressed empty public categories and inactive public items in the customer renderer.
- Changed missing-hours status to avoid inventing "Open" when hours are absent.
- Hardened timed-category slot parsing against partial values.
- Normalized custom-domain store id comparison.
- Raised build heap cap to 8192 MB for `build`, `build:prod`, `build:vercel`, and `build:analyze`; verified `npm run build` exits 0.
- Updated Platform Pull API docs and Firebase cost notes to match the extra summary read.

Remaining risks:

- No live Firebase project, seeded tenant/store/project data, Vercel cache, CDN, Storage, Cloud Tasks worker secret, POS endpoint, payment provider, or owner browser session was exercised.
- The repo had substantial pre-existing unrelated changes before this audit. This report covers the MenuList audit changes made here and does not validate unrelated Answerlattice, CampaignCue, GrowthOS, KitStamp, or prior dirty-worktree edits.
- Cloud Tasks batch image generation warned during build because `hasWorkerSecret` was false. It did not block build, but production monitoring should confirm the worker secret is present in deployed environments.

### July 31, 2026 - Public menu correctness follow-up

The customer-facing public menu was re-traced from the server projection and
structured-data path through the responsive menu renderer, timed category
admission, item deep links, item detail dialog, customer-app color, and browser
output.

Material fixes:

- Items in categories outside their configured service window are rejected by
  normal cards, Featured choices, filter chips, canonical `?item=` links, and
  legacy item paths. If every active category is scheduled for later, the menu
  now shows the localized category schedule rather than claiming that no items
  exist.
- Schedule admission refreshes at wall-clock minute boundaries and after page
  resume. Invalid or missing store timezone data now falls back to UTC instead
  of customer-device time.
- Sold-out shared items remain inspectable with their unavailable state.
  Removed, inactive, uncategorized, hidden, and empty-catalog item links settle
  to the canonical menu URL with truthful feedback.
- Visible prices, analytics currency, `currenciesAccepted`, and catalog JSON-LD
  use one normalized currency-code boundary. A missing symbol is derived from
  that code rather than defaulting every legacy store to the rupee symbol.
- Project menu color remains authoritative when configured; otherwise the
  normalized OBP `publicPresence.accentColor` reaches the menu and customer-app
  prompt before the accessible mood contrast guard is applied.
- Item detail metadata uses a boolean render condition, so empty metadata no
  longer emits a literal `0`. The dialog now receives initial focus, contains
  keyboard Tab navigation, supports Escape, and restores focus to the invoking
  control.
- Mobile descriptions and decision chips now meet the menu constitution's
  readable supporting-text floor.

No Firestore collection, document shape, rule, index, write path, cache key,
Cloud Function, dependency, or deployment behavior changed.

## 2. System Map

Framework and runtime:

- Next.js App Router with some Pages Router remnants.
- React 18, TypeScript, Ant Design desktop, antd-mobile/Tailwind mobile.
- Firebase Admin/client SDK, Firestore, Storage, Cloud Functions, NextAuth session/auth guards.
- Public/customer routes include `src/app/client/[[...slug]]/page.tsx`, public API routes under `src/app/api/public/`, SEO/site routes, screen routes, and widget/public surfaces.
- MenuList Cloud Functions live under `functions/src/`; Answerlattice has separate `functions-answerlattice/`.

Main source-of-truth entities:

- Store/business truth: `stores/{storeId}` and `storesSummary`/tenant summary read models.
- Menu/project truth: `projects/{tenantId}/{storeId}/{projectId}` for full menu content and `platformSummary/projects_{storeId}` for public listing/default state.
- Menu file payloads: `projectData.files[].extractedData.data.categories/items/languages`.
- Public cache truth: Next cache tags through `src/lib/cache/publicClientCache.ts` and menu/store revalidation helpers.
- Public API key truth: store `publicApi` fields, hashed key lookup, API auth helpers.
- Domain truth: store custom domain fields plus Vercel domain APIs.
- Hours truth: store working hours, timezone, special/temporary status helpers, output-control wrappers.
- Image truth: uploaded file metadata/Storage URLs in menu/project/store fields, plus generated PWA/public assets.
- Feedback/reputation truth: public feedback API and owner/admin feedback surfaces.
- Analytics/Business Health truth: summary documents and scheduled/function aggregation, not raw public hot-path reads.

Main customer-visible outputs:

- Public menu/customer app at tenant/custom-domain routes.
- Official business/public pages and metadata/SEO surfaces.
- Public pull API: `/api/public/v1/business` and `/api/public/v1/menu`.
- Public feedback submission and analytics tracking endpoints.
- Customer-visible menu categories, items, prices, attributes/modifiers, availability, hours, store contact/location/domain metadata, images, search/filter results, PWA assets, and screen display routes.

## 3. Flow-by-Flow Audit

### Business creation / onboarding

Files inspected:

- `src/app/api/public/create-menu/route.ts`
- `src/app/api/public/create-menu/claim/route.ts`
- `src/app/api/onboarding/create-subscription/route.ts`
- `src/database/stores/index.tsx`
- `src/constants/database.ts`
- `src/lib/cache/publicClientCache.ts`
- `src/app/api/auth/claim-account/route.ts`
- `src/app/api/auth/validate-claim/route.ts`

Data flow traced:

- Public or owner onboarding creates/claims a store, writes store/business profile data, and connects session/store ownership before public menu/profile output can become authoritative.
- Public read paths rely on store id, tenant id, active state, and summary/read-model data.

Issues found:

- No code change was needed in the onboarding write path during this pass.
- Risk noted: live claim/subscription/payment paths need provider credentials to verify fully.

Fixes applied:

- None in this flow.

Checks run:

- `npx tsc --noEmit --incremental false`
- `npm run lint`
- `npm run build`

Remaining concerns:

- Needs live seeded Firebase and provider credentials for end-to-end onboarding/claim/payment validation.

### Business profile editing

Files inspected:

- `src/database/stores/index.tsx`
- `src/lib/cache/publicClientCache.ts`
- `src/app/api/domain/route.ts`
- `src/app/api/public/v1/business/route.ts`
- `src/lib/publicApi/auth.ts`
- `src/app/client/[[...slug]]/page.tsx`
- `src/lib/firestore/clientStoreLookup.ts`

Data flow traced:

- Owner/store updates write to store truth, invalidate public cache tags, and public readers render business fields or return pull API payloads from active public store data.

Issues found:

- Custom domain duplicate check compared `existingStoreId !== storeId` without normalizing string/number shape.

Fixes applied:

- `src/app/api/domain/route.ts`: compare `String(existingStoreId) !== String(storeId)` to keep domain ownership checks stable across id representation drift.

Checks run:

- `npm run verify:public-business-truth`
- `npx tsc --noEmit --incremental false`
- `npm run lint`
- `npm run build`

Remaining concerns:

- Vercel domain API behavior was not exercised because no live Vercel credentials/deploy were used.

### Menu creation and editing

Files inspected:

- `src/database/projects/index.ts`
- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`
- `src/components/templates/main-app/projects/editorView/editCategoryModal.tsx`
- `src/components/templates/main-app/projects/types/extractedData.types.ts`
- `src/app/api/projects/outlet-save/route.ts`
- `src/app/api/menu-extraction/jobs/route.ts`
- `src/lib/cache/publicClientCache.ts`
- `src/lib/posSync/payloadFormatter.ts`

Data flow traced:

- Owner edits project/menu content, project DAL persists full project data and summary state, cache invalidation runs for public menu/OBP tags, public renderer reads the selected project and renders items/categories.

Issues found:

- Category rendering could include active categories that had no active public items.
- Item rendering could include inactive items if their category remained visible.

Fixes applied:

- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`: only includes public categories that have at least one active item and filters visible items with `item.active !== false`.

Checks run:

- `npm run verify:public-business-truth`
- `npx tsc --noEmit --incremental false`
- `npm run lint`
- `npm run build`

Remaining concerns:

- Editor browser workflows were not click-tested in this environment.

### Categories / items / modifiers / prices / availability

Files inspected:

- `src/components/templates/main-app/projects/types/extractedData.types.ts`
- `src/hooks/useTimedCategories.ts`
- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`
- `src/lib/posSync/payloadFormatter.ts`
- `src/app/api/public/v1/menu/route.ts`

Data flow traced:

- Category/item truth lives in project extracted data. Public render and public API should filter inactive/deleted/special state consistently and preserve deterministic selection.

Issues found:

- Timed categories used browser time rather than store time.
- Partial timed slots could throw while rendering customer-visible menus.

Fixes applied:

- `src/hooks/useTimedCategories.ts`: added store-timezone-aware current minute calculation, optional testable `now`, invalid-slot guards, and timezone propagation through helper APIs.
- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`: passes `storeDetails?.timeZone` and refreshes category visibility every minute.

Checks run:

- `npm run verify:public-business-truth`
- `npx tsc --noEmit --incremental false`
- `npm run lint`
- `npm run build`

Remaining concerns:

- Full price/modifier rendering was statically traced but not browser-smoked against seeded menu variants.

### Hours and special hours

Files inspected:

- `src/lib/hours/hoursEngine.ts`
- `src/lib/obp/hoursStatus.ts`
- `src/lib/outputControl/hoursConfidence.ts`
- `src/components/atoms/TrustSignals.tsx`
- `src/components/atoms/StoreStatusBadge/index.tsx`
- `src/app/api/public/v1/business/route.ts`

Data flow traced:

- Store working hours/timezone drive public hours/status output. Output-control wrappers suppress unsafe hours when confidence is broken.

Issues found:

- The base hours engine returned `Open` when no hours existed. Some wrappers already suppressed this, but the primitive itself was unsafe for future or direct public use.

Fixes applied:

- `src/lib/hours/hoursEngine.ts`: missing/empty hours now returns `isOpen: false` and `Hours not available` instead of inventing open status.

Checks run:

- `npm run verify:public-business-truth`
- `npx tsc --noEmit --incremental false`
- `npm run lint`
- `npm run build`

Remaining concerns:

- Live special-hours/calendar data was not available for runtime comparison.

### Locations / address / phone / website / metadata

Files inspected:

- `src/database/stores/index.tsx`
- `src/app/api/public/v1/business/route.ts`
- `src/app/api/domain/route.ts`
- `src/lib/firestore/clientStoreLookup.ts`
- `src/app/client/[[...slug]]/page.tsx`

Data flow traced:

- Store truth feeds business profile output, public metadata, custom-domain lookup, and API business payload.

Issues found:

- Domain id comparison shape drift, fixed under Business profile editing.

Fixes applied:

- Domain store id normalization.

Checks run:

- `npm run verify:public-business-truth`
- `npm run build`

Remaining concerns:

- Live custom-domain and CDN behavior requires deployed environment checks.

### Images / uploads / public assets

Files inspected:

- `src/app/api/image-generation/batch-generation/route.ts`
- `src/app/api/image-generation/batch-trigger/route.ts`
- `src/app/api/app-icons/[storeId]/[size]/route.tsx`
- `src/app/api/app-screenshots/[storeId]/[formFactor]/route.tsx`
- `src/app/api/app-splash/[storeId]/[size]/route.tsx`
- `worker/index.js`
- `next.config.js`

Data flow traced:

- Uploaded/generated media is referenced from store/project file metadata and rendered through public menu/PWA/screen assets. Batch image generation uses Cloud Tasks/worker environment variables.

Issues found:

- Build emitted a warning that Cloud Tasks batch image generation lacks worker secret in this environment.

Fixes applied:

- None. This is environment configuration, not a source-code invariant.

Checks run:

- `npm run build`

Remaining concerns:

- Verify production `CLOUD_TASKS_WORKER_SECRET`/equivalent secret and Storage permissions before relying on batch image generation.

### Public business pages / customer menu / SEO / discovery

Files inspected:

- `src/app/client/[[...slug]]/page.tsx`
- `src/lib/firestore/clientStoreLookup.ts`
- `src/lib/firestore/parseSummaryProjects.ts`
- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`
- `src/app/api/public/v1/menu/route.ts`
- `src/app/api/public/v1/business/route.ts`
- `src/lib/cache/publicClientCache.ts`

Data flow traced:

- Public route lookup resolves tenant/store/project through store and summary read models, renders customer menu output, and uses public cache tags. Platform Pull API should agree with that customer-visible menu truth.

Issues found:

- Public menu API selected default project from the wrong source and could disagree with customer renderer.

Fixes applied:

- `src/app/api/public/v1/menu/route.ts`: read `platformSummary/projects_{storeId}`, filter active/non-deleted/non-special projects, select `isDefault` or first active summary project, then read the full project document for payload content.
- Added `generatedAt` to the menu response to match public API response contract.
- Updated Platform Pull API docs and Firebase read-cost estimates.

Checks run:

- `npm run verify:public-business-truth`
- `npx tsc --noEmit --incremental false`
- `npm run lint`
- `npm run build`

Remaining concerns:

- Public CDN/ISR behavior was not validated against a deployed Vercel environment.

### Search / filtering / lookup flows

Files inspected:

- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`
- `src/lib/search/searchCore.ts`
- `src/lib/search/types.ts`
- `src/app/api/helpCenter/search-kb/route.ts`
- `src/app/api/widget/search/route.ts`

Data flow traced:

- Public menu search/filtering operates on rendered visible items/categories. Internal/help/widget search flows are separate products/surfaces.

Issues found:

- Public menu search could have included items from categories that should not be public if visibility filtering was loose.

Fixes applied:

- Public visible items now require active item state and a currently visible category.

Checks run:

- `npm run verify:public-business-truth`
- `npm run build`

Remaining concerns:

- Search UX was not browser-smoked on mobile/desktop with seeded multilingual data.

### Reputation / reviews / ratings / feedback

Files inspected:

- `src/app/api/public/feedback/submit/route.ts`
- `src/app/api/public/analytics/track/route.ts`
- `functions/src/aggregateDailyChatStats.ts`
- `functions/src/decisionBlocksScoring.ts`
- `src/lib/ownerBusinessAssistant` references via memory and source search

Data flow traced:

- Public feedback/analytics feeds owner/summary surfaces and Business Health style outputs. Public business truth should not depend on raw feedback reads at customer render time.

Issues found:

- No immediate source-code fix in this audit pass.

Fixes applied:

- None.

Checks run:

- `npx tsc --noEmit --incremental false`
- `npm run lint`
- `npm run build`

Remaining concerns:

- Production aggregation correctness requires live scheduled-function and Firestore data inspection.

### Dashboard / admin / analytics flows

Files inspected:

- `src/app/platform/*`
- `src/app/api/platform/*`
- `src/app/api/analytics/*`
- `functions/src/decisionBlocksScoring.ts`
- `functions/src/aggregateDailyChatStats.ts`
- `src/database/platformSummary/index.ts`

Data flow traced:

- Owner/admin surfaces consume summary documents and protected API routes. They should not become alternate public business-truth sources.

Issues found:

- No new MenuList code fix from this pass.

Fixes applied:

- None.

Checks run:

- `npx tsc --noEmit --incremental false`
- `npm run lint`
- `npm run build`

Remaining concerns:

- There are many pre-existing dirty changes in adjacent analytics/platform files that this audit did not author and did not normalize.

### API routes / server actions / public RPCs

Files inspected:

- `src/app/api/public/v1/menu/route.ts`
- `src/app/api/public/v1/business/route.ts`
- `src/app/api/domain/route.ts`
- `src/app/api/pos-sync/deliver/route.ts`
- `src/app/api/pos-sync/test/route.ts`
- `src/lib/publicApi/auth.ts`
- `src/lib/rateLimit/index.ts`
- `src/middleware/auth.ts`

Data flow traced:

- Public pull APIs use API-key auth and per-key rate limiting. Protected owner/admin routes use NextAuth/withAuth and store permission helpers.

Issues found:

- Public menu route source-of-truth mismatch.
- Domain duplicate id comparison shape drift.

Fixes applied:

- Platform Pull menu source alignment.
- Domain id normalization.

Checks run:

- `npm run verify:public-business-truth`
- `npx tsc --noEmit --incremental false`
- `npm run lint`
- `npm run build`

Remaining concerns:

- Runtime auth tests against real sessions were not run.

### Database writes / migrations / consistency

Files inspected:

- `src/database/projects/index.ts`
- `src/database/stores/index.tsx`
- `src/database/platformSummary/index.ts`
- `src/constants/database.ts`
- `functions/src/*` scheduler/aggregation references

Data flow traced:

- Full project/store docs own content and profile fields. Summary docs own public selection/read-model state. Cache invalidation should run from write paths that affect public output.

Issues found:

- Public pull route treated full project doc as default-selection truth. This was the largest source-of-truth mismatch found.

Fixes applied:

- Public pull route now uses summary document for selection and full project document for content.

Checks run:

- `npm run verify:public-business-truth`
- `npm run build`

Remaining concerns:

- No Firestore emulator/live data migration tests were run.

### Caching / revalidation / ISR / CDN behavior

Files inspected:

- `src/lib/cache/publicClientCache.ts`
- `src/lib/actions/revalidateMenuCache.ts`
- `src/database/projects/index.ts`
- `src/database/stores/index.tsx`
- `src/app/client/[[...slug]]/page.tsx`
- `src/app/api/revalidate/menu/route.ts`

Data flow traced:

- Public write paths invalidate menu/store/client tags. Public read paths use cached lookup and summary docs.

Issues found:

- No cache invalidation code change was needed for the fixed public pull API because it is `force-dynamic` and API-key based. The source-of-truth fix adds one Firestore read, not a cache tag dependency.

Fixes applied:

- None in cache helpers.

Checks run:

- Static trace and production build.

Remaining concerns:

- Deployed Vercel cache tag behavior and CDN invalidation require live verification.

### Background jobs / queues / cron

Files inspected:

- `functions/src/schedulers/menulistMaintenanceScheduler.ts`
- `functions/src/decisionBlocksScoring.ts`
- `functions/src/aggregateDailyChatStats.ts`
- `functions/src/billing/reconcileSubscriptions.ts`
- `src/app/api/image-generation/batch-trigger/route.ts`
- `src/app/api/image-generation/batch-generation/route.ts`

Data flow traced:

- MenuList scheduled/expensive work remains in Functions and summary aggregation paths. Batch image generation queues worker requests through Cloud Tasks.

Issues found:

- Build-time warning for missing Cloud Tasks worker secret in local environment.

Fixes applied:

- None.

Checks run:

- `npm run build`

Remaining concerns:

- No Firebase Functions deploy was run because this audit did not modify MenuList Firebase rules, indexes, or function logic.

### Import / export / sync flows

Files inspected:

- `src/app/api/pos-sync/deliver/route.ts`
- `src/app/api/pos-sync/test/route.ts`
- `src/lib/posSync/payloadFormatter.ts`
- `src/app/api/menu-link-imports/route.ts`
- `src/app/api/menu-card-export/design-advisor/route.ts`
- `src/app/api/public/v1/menu/route.ts`

Data flow traced:

- POS/webhook/pull/export flows should represent the same selected public menu content and not invent alternate project-selection logic.

Issues found:

- Public pull API selection drift from customer menu default logic.

Fixes applied:

- Public pull API now follows summary selection.

Checks run:

- `npm run verify:public-business-truth`
- `npm run build`

Remaining concerns:

- External POS endpoint delivery was not exercised.

### Auth, ownership, roles, tenant boundaries

Files inspected:

- `src/middleware/auth.ts`
- `src/lib/permissions/server.ts`
- `src/app/api/domain/route.ts`
- `src/lib/publicApi/auth.ts`
- `src/app/api/auth/*`
- Firestore access path constants in `src/constants/database.ts`

Data flow traced:

- Owner/admin mutations require authenticated sessions and store permission checks. Public APIs are API-key scoped to one store and expose limited public payloads.

Issues found:

- Domain guard had id shape risk.

Fixes applied:

- Domain guard normalizes ids before cross-store comparison.

Checks run:

- `npm run verify:public-business-truth`
- `npx tsc --noEmit --incremental false`
- `npm run lint`

Remaining concerns:

- Firestore rules were not changed or deployed; live rules coverage was not emulator-tested.

### Error states, empty states, loading states

Files inspected:

- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`
- `src/lib/hours/hoursEngine.ts`
- `src/lib/outputControl/hoursConfidence.ts`
- `src/app/api/public/v1/menu/route.ts`
- `src/lib/publicApi/auth.ts`

Data flow traced:

- Public/customer output should show less rather than wrong when data is missing, inactive, hidden, malformed, or temporarily unavailable.

Issues found:

- Missing hours could become "Open".
- Empty timed/category states could produce misleading category output or runtime exceptions.

Fixes applied:

- Missing hours now render as unavailable in the primitive.
- Timed category helpers skip malformed slots.
- Public menu filters inactive/no-item category output.

Checks run:

- `npm run verify:public-business-truth`
- `npm run build`

Remaining concerns:

- Visual empty/loading states were not browser-screenshot verified.

### Billing / subscription gates

Files inspected:

- `src/app/api/onboarding/create-subscription/route.ts`
- `src/app/api/razorpay/*`
- `functions/src/billing/reconcileSubscriptions.ts`
- `src/lib/billing/productBillingServer.ts`

Data flow traced:

- Billing gates exist but were not a public customer-business-truth write path in the fixes made here.

Issues found:

- None fixed in this pass.

Fixes applied:

- None.

Checks run:

- `npx tsc --noEmit --incremental false`
- `npm run build`

Remaining concerns:

- Payment provider behavior requires live/test Razorpay credentials and webhook scenarios.

## 4. Fix Log

- `src/app/api/public/v1/menu/route.ts`: Replaced full-project `where('isDefault')` lookup with summary-doc selection through `platformSummary/projects_{storeId}`. Protects the invariant that public API menu output agrees with customer renderer default project truth.
- `src/app/api/public/v1/menu/route.ts`: Added `generatedAt` and project-level `menuVersion` fallback. Protects the public API response contract and menu version accuracy.
- `src/hooks/useTimedCategories.ts`: Added store-timezone-aware time calculation and invalid-slot guards. Protects the invariant that customer-visible timed categories follow the business timezone and malformed slots cannot crash public rendering.
- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`: Passes store timezone, refreshes timed visibility every minute, suppresses empty active categories, and filters inactive visible items. Protects public menu accuracy for categories/items/availability.
- `src/lib/hours/hoursEngine.ts`: Missing hours no longer return "Open". Protects the invariant that MenuList should not claim live business status from missing data.
- `src/app/api/domain/route.ts`: Normalizes store ids before duplicate-domain cross-store comparison. Protects tenant/domain ownership consistency across string/number id shapes.
- `scripts/verification/verify-public-business-truth.js`: Added targeted static/runtime verifier for public business truth invariants. Protects against regression in the exact high-risk paths fixed here.
- `package.json`: Added `verify:public-business-truth`; raised build heap cap from 6144 MB to 8192 MB after proving the default cap caused OOM and the larger cap passed. Protects the standard build command as a useful verification gate.
- `__docs__/platform-pull-api/*`: Updated source-of-truth and Firebase cost docs for the extra summary read. Protects docs/code parity and cost visibility.
- `AUDIT_REPORT.md`: Added this report as the root audit record requested by the task.

## 5. Verification Log

Commands run:

- `npm run verify:public-business-truth`
  - Result: Passed.
  - Output: `Public business truth verifier passed`.
- `npx tsc --noEmit --incremental false`
  - Result: Passed after adding an explicit public-menu project return type.
- `npm run lint`
  - Result: Passed with `No ESLint warnings or errors`.
- `npm run build`
  - First result before heap-cap fix: Failed with Node fatal error `Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory` at the script's 6144 MB cap.
- `NODE_OPTIONS=--max-old-space-size=8192 NODE_ENV=production npx next build`
  - Result: Passed. Compiled successfully, generated 367 static pages, finalized build traces.
  - Warning: Cloud Tasks batch image generation env vars incomplete; `hasWorkerSecret: false`.
- `npm run build`
  - Result after package script heap-cap update: Passed. Compiled successfully, generated 367 static pages, finalized build traces.
  - Warning repeated: Cloud Tasks worker secret missing in this local environment.

Tests:

- No root `test` npm script is defined in `package.json`, so no generic `npm test` was available.
- The targeted verifier added in this audit covers the corrected high-risk public business truth invariants.

Manual/static checks performed:

- Traced public menu route selection against `parseSummaryProjects`, `platformSummary/projects_{storeId}`, and customer renderer selection expectations.
- Traced store/project DAL cache invalidation hooks and confirmed the fixed pull API does not add a new public cache invalidation dependency.
- Traced timed category flow from type definition to public menu renderer.
- Traced hours fallback through the generic engine and output-control wrappers.
- Traced domain ownership guard around custom domain assignment.
- Reviewed package scripts and verified the standard build command after updating the heap cap.

## 6. Final Status

Verified now:

- Public Platform Pull menu API selection is aligned with customer-rendered menu default truth.
- Missing hours no longer become an invented open status at the hours-engine layer.
- Timed categories use store timezone in the public menu path and tolerate malformed slot data.
- Public menu renderer suppresses inactive items and categories with no active public items.
- Custom domain duplicate guard is stable across string/number store ids.
- TypeScript, lint, targeted verifier, and standard production build pass in this environment.

Could not verify here:

- Live Firebase reads/writes, Firestore rules, and seeded tenant/store/project scenarios.
- Live Vercel CDN/ISR/cache tag invalidation behavior.
- Vercel domain API calls.
- Storage upload/download permissions.
- Cloud Tasks worker execution because the local build environment lacks the worker secret.
- POS provider delivery, Razorpay payment/webhook flows, and real owner/mobile browser sessions.

Highest-risk areas for production monitoring:

- Public menu/customer route and `/api/public/v1/menu` parity after project publish/default changes.
- Cache invalidation after owner edits to store/profile/project/menu data.
- Timed category transitions around store-local day boundaries.
- Hours/status output when stores have missing, partial, temporary, or special hours.
- Cloud Tasks image generation failures until worker secret presence is confirmed.
- Domain attach/remove flows, especially stores migrated across numeric/string id formats.

No known critical or high-severity customer-visible MenuList correctness issue remains in the audited and patched flows based on the verification available in this environment.

---

## 7. Digital Screens End-to-End Audit Addendum

Date: 2026-07-29

Scope: `__docs__/digital-screens/` and the complete owner-management, public-resolution, TV-rendering, cache, Firebase, migration, mobile, and operational paths for MenuList Digital Screens.

### 7.1 Executive Summary

Current confidence:

- High for source-level ownership, authorization, tenant isolation, mutation atomicity, token secrecy, public read selection, cache scoping, lifecycle behavior, and the browser-rendered states exercised locally.
- Medium for deployed runtime behavior until the ordered QA migration/deploy is completed and authenticated owner plus physical-TV checks are recorded.

Major risks found:

- The bearer screen token was duplicated in tenant-readable canonical state and an anonymously readable public listener document.
- Owner screen reads and mutations could depend on browser Firestore authority; canonical state, private token state, and public listener state were not guaranteed to change atomically.
- Public screen cache invalidation used a global tag, allowing unrelated screens to fan out together.
- A stale browser-local payload could become authoritative while online.
- Generated links were described as `Running` or `Connected` without a real heartbeat.
- 720p, 1080p, and portrait output had clipping, empty-column, footer, and long-name presentation defects.
- The current runtime did not reliably emit the screen components' styled-jsx rules, so the Menu Board could render unstyled; hidden Framer Motion initial states could also leave an approved first frame blank.
- Missing Firebase client configuration could replace valid server-rendered menu truth with the global error page.
- Owner posters could be cropped, and offline status could cover the customer QR.
- Moderate 1080p menus used a sparse third column, portrait screens rotated too little content per page, QR destinations were unexplained, and logo-bearing brand fallbacks omitted the business name.
- Digital Screens dropped the canonical OBP accent color and used a fixed gold presentation accent; saving the nested accent also did not trigger the screen-specific content-version/cache refresh.
- The repo-only visual audit route remained in the production route table; `notFound()` rendered a 404 body with HTTP 200 in the local production smoke.

Major fixes applied:

- Moved bearer tokens into server-only private controls and retained token-free canonical/public projections.
- Added a permission-checked, tenant/store-authorized, rate-limited, Zod-validated owner API with transactional writes.
- Denied client writes to server-managed screen state and denied all client access to private controls.
- Replaced global invalidation with exact hashed-token and store-scoped cache tags.
- Restricted local fallback admission to offline, version-matched content.
- Corrected responsive page capacities, content-aware fitting-column allocation, compiled style delivery, visible first frames, compact portrait paging, wide-TV names, poster fit, labeled QR clearance, persistent brand identity, and listener-failure fallback.
- Propagated the normalized OBP accent from canonical store truth into restrained decorative screen chrome and added nested accent changes to the exact screen refresh path.
- Added truthful `Link ready`, `Seen recently`, and `Check TV` health semantics.
- Added guarded migrations, Firestore emulator coverage, lifecycle tests, fixture-route absence enforcement, and a dedicated source verifier.

Remaining risks:

- The private-control and public-mirror migrations have not been written to QA in this audit.
- Firebase rules/Functions and app changes have not been deployed because the required app-first ordered rollout and Vercel deployment were not authorized.
- A real authenticated owner session, a real Firestore listener/reconnect, physical TV overscan/fullscreen, QR scan distance, and production cache propagation remain external evidence.

### 7.2 System Map And Sources Of Truth

Canonical entities:

| Entity | Canonical source | Derived/public source | Invariant |
| --- | --- | --- | --- |
| Screen configuration and slides | `platformSummary/campaigns_{storeId}.screen` | Owner API transport and public screen render | No bearer token in tenant-readable canonical state after migration |
| Screen bearer token | `platformSummary/screenControl_{storeId}` | Private hashed Next cache tag only | Server-only read/write; exact tenant/store binding |
| Listener state | `platformSummary/screen_{storeId}` | Anonymous exact-document `get` and TV snapshot listener | Token-free, no list access, no client writes |
| Menu items/prices/availability/order | Approved project/menu truth, with version-bound `screen.menuProjection` optimization | `/screen/[token]` Menu Board | Projection is accepted only when its source/version context matches; otherwise rebuild from canonical project truth |
| Store name/logo/OBP accent/locale/plan/public eligibility | Public store truth; `publicPresence.accentColor` is the canonical brand accent | Screen header, decorative accents, prices, attribution, QR | Accent is normalized before output; inactive/deleted/blocked stores must not render |
| Owner artwork | Existing Storage-backed custom slide URL and metadata | Highlights rotation | Contained inside output safe area; caption management name is not forced over artwork |
| Screen liveness hint | Canonical `screenLastSeenAt` server timestamp | Owner settings/mobile/Output Center | Hint only; never represented as a live connection |

Customer-visible outputs:

- `/screen/{token}`: full Menu Board.
- `/screen/{token}?mode=highlights`: rotating owner/campaign/evergreen/brand Highlights.
- Customer menu QR rendered on both screen modes.
- Owner setup and health in desktop settings, mobile owner shell, Output Center, and AI Menu Manager links.

Primary files inspected:

- Documentation: `__docs__/digital-screens/README.md`, spec, implementation, Firebase, mobile, help, website, marketing, test cases, improvements, and rollout guidance.
- Owner API and DAL: `src/app/api/digital-screens/route.ts`, `src/lib/screen/screenManagementServer.ts`, `screenManagementContracts.ts`, `privateScreenControl.ts`, `src/database/campaigns/index.ts`.
- Public read and seen path: `src/app/screen/[token]/page.tsx`, `src/database/campaigns/serverScreen.ts`, `src/app/api/screen/seen/route.ts`.
- Output: `MenuBoardDisplay.tsx`, `ScreenDisplay.tsx`, `screenRuntime.ts`, `screenContent.ts`, `screenHealth.ts`, `ScreenAttribution.tsx`.
- Owner surfaces: desktop Digital Screen settings, `ScreenLink.tsx`, `OwnerUploads.tsx`, mobile Digital Screens, Output Center, desktop/mobile AI Menu Manager.
- Upload presentation: `src/components/shared/media/MediaImageAdjustModal.tsx`.
- Freshness: `serverScreenInvalidation.ts`, `publicClientCache.ts`, `/api/revalidate/menu`, Functions public-cache revalidation.
- Infrastructure: `firestore.rules`, migration scripts, lifecycle/rules/source verifiers, package scripts.

### 7.3 Flow-By-Flow Audit

#### Screen creation and owner setup

Flow traced:

`Digital Screen settings` -> permission/feature admission -> owner DAL -> `/api/digital-screens` -> auth, body limit, rate limit, Zod action validation, tenant/store permission -> server transaction -> canonical/private/public state -> exact cache invalidation -> authorized owner response.

Issues and fixes:

- A read no longer creates state implicitly. Initialization is an explicit action.
- Browser code no longer writes canonical screen state directly.
- Canonical screen, private token control, and public listener mirror now settle in one transaction.
- No-op owner reads suppress unnecessary persistence.
- Output Center uses the correct Digital Screens settings deep link.
- Duplicate desktop custom-slide presentation was removed.

Remaining concern:

- Authenticated desktop/mobile setup must be exercised against deployed QA.

#### Custom slides, captions, limits, and expiry

Flow traced:

Owner upload/selection -> shared image adjustment -> bounded owner mutation -> transaction-current slide-limit and target validation -> canonical write/public version -> Highlights read -> expiry deadline reload.

Issues and fixes:

- Slide-limit checks use transaction-current state.
- Stale caption/delete targets return a conflict instead of silently succeeding.
- Expired custom slides do not consume the active cap and are pruned on the next mutation.
- Owner artwork uses `contain`, while upload adjustment shows TV safe, QR, and attribution reservations.
- Management captions remain dashboard metadata instead of being forced over owner artwork.

Remaining concern:

- Real upload failure/retry and Storage rule behavior require a seeded authenticated QA store.

#### Public token resolution and tenant isolation

Flow traced:

Public token -> strict token validation -> token-hashed state cache -> private-control token lookup -> exact canonical summary -> tenant/store reconciliation -> public-store eligibility -> screen mode data -> display.

Issues and fixes:

- Bearer token no longer belongs in public or tenant-readable documents.
- Private token resolution is reconciled against exact canonical tenant/store scope.
- Legacy lookup remains only for the ordered migration window.
- Public routes expose only display-safe store, menu, and slide data.
- The temporary audit fixture route was deleted after browser QA and is source-gated as absent.

Remaining concern:

- Legacy fallback must be removed only after migration completion is evidenced.

#### Seen signal and owner health

Flow traced:

Loaded TV -> bounded daily `/api/screen/seen` request with token/store -> exact private-control and tenant/store checks -> transaction -> server timestamp -> owner health projection.

Issues and fixes:

- Seen writes cannot update a different store using a valid token from another screen.
- Failed acknowledgements are retryable and do not become successful daily local signals.
- Owner UI now says `Link ready`, `Seen recently`, or `Check TV`.

Remaining concern:

- This remains a daily operational hint, not device inventory or a live heartbeat.

#### Menu Board truth and presentation

Flow traced:

Approved menu/project -> version-bound screen projection or canonical rebuild -> content normalization -> deterministic category/item order -> available items only -> locale-aware price -> responsive pagination -> TV render.

Issues and fixes:

- Stale or context-mismatched projections fall back to canonical reconstruction.
- Technical category IDs, malformed prices, unavailable items, and unsafe text do not become customer output.
- Category and item order are deterministic.
- Page allocation now uses the least-used fitting column instead of first-fit packing.
- 1280x720 uses compact two-column capacity; 1920x1080 chooses the smallest fitting count between two and three columns; portrait stays single-column while using compact two-category pages when capacity permits.
- Wide-TV item names may wrap to two lines; descriptions yield space at that density.
- Menu Board and Highlights share one compiled CSS module; animated wrapper elements are reached through root-scoped global selectors without depending on runtime styled-jsx.
- First-frame content uses visible motion state, so hydration or animation failure cannot turn approved menu truth into a blank screen.
- A missing Firebase client or synchronous listener failure preserves the valid server payload and marks the display offline instead of crashing.
- The canonical normalized OBP accent reaches Menu Board header/progress/category framing. The old competing category palette was removed; price, dietary, category-text, body-text, and background colors remain fixed for contrast and semantic accuracy.

Checks:

- Browser dry run at 1280x720, 1920x1080, and 768x1024.
- DOM layout inspection confirmed no horizontal item overflow in the tested 1080p state.
- Lifecycle tests cover capacities and balanced-column selection.

#### Highlights truth and presentation

Flow traced:

Canonical custom/campaign/evergreen inputs -> deterministic screen slide generation -> expiry and owner-only filtering -> normalized price/description/tags -> fixed-duration rotation -> QR and attribution.

Issues and fixes:

- A valid local fallback is admitted only offline and only for the same content version.
- Owner posters use non-cropping containment.
- Highlights wrappers are pinned to exact viewport bounds, so a square poster cannot expand a 16:9 slide and crop its lower portion.
- Offline status sits below the QR reservation.
- QR cards identify whether the destination is the `Full menu` or a custom `Scan` link.
- Brand fallback always presents the business name, with the logo as supporting identity.
- Highlights uses the same normalized OBP accent for its decorative logo frame and slide strip without applying arbitrary owner colors to readable text.
- Store watermark and MenuList attribution occupy separate zones.
- Slide expiry schedules a reload instead of waiting for a later generic refresh.
- Missing Firebase client/listener construction preserves server-rendered Highlights.

Checks:

- Browser dry run covered owner poster and item-promotion states at 1280x720.

#### Cache and refresh correctness

Flow traced:

Menu/screen/store-brand mutation -> server screen touch -> canonical content-version transaction -> token-free listener mirror replacement -> exact hashed-token revalidation plus `menu-store-{storeId}` revalidation -> connected TV listener reload -> fresh public read.

Issues and fixes:

- Removed global `screen-data` invalidation fan-out.
- Client mutation paths route the touch through the authorized server path.
- Nested `publicPresence.accentColor` changes are classified as screen-output changes and use the same exact refresh path.
- Missing screen state does not create a partial screen.
- Production cache invalidation failures use bounded secure diagnostics.

Remaining concern:

- Live ISR/CDN tag propagation and listener-to-reload timing require deployed QA evidence.

#### Desktop, mobile, and AI Menu Manager parity

Flow traced:

Feature/permission gate -> authorized screen-state read -> common URL builder and health semantics -> copy/open/setup actions.

Issues and fixes:

- Desktop and mobile no longer recover bearer tokens from stale store payloads.
- Both AI Menu Manager surfaces use the authorized screen-state read.
- Mobile and desktop share lifecycle limits and owner-control behavior.
- All audited owner surfaces use the same truthful health projector.

Remaining concern:

- Physical mobile PWA and TV handoff ergonomics still need an owner-device run.

#### Firebase rules, writes, migrations, and cost

Issues and fixes:

- Firestore rules deny private-control access, deny client listener-mirror writes, and preserve server-managed canonical screen fields.
- Public listener reads are exact-document only.
- Public-mirror and private-control migrations are dry-run by default, require explicit scope, and require exact project confirmation for writes.
- No new scheduler, queue, index, Storage family, or analytics event stream was added.
- Typical cold screen read cost remains bounded; a valid projection avoids project reconstruction reads.

Remaining concern:

- QA migration counts and post-migration absence of legacy token fields must be recorded before rule cutover.

### 7.4 Restaurant-Owner Dry Run

Scenario:

Raju owns a family restaurant with one 720p counter TV, one 1080p waiting-area TV, and occasionally previews from a portrait tablet. He changes prices and availability in MenuList, uploads a weekend poster, then expects the screens to require no separate maintenance.

Observed before hardening:

- `Running`/`Connected` implied proof the TV was active when only a link existed.
- The Menu Board could look half empty, clip in portrait, or hide long item names.
- A Firebase setup/listener problem could turn a valid menu into an error page.
- His designed poster could be cropped, and operational status could cover the customer QR.
- The settings journey contained duplicate slide presentation and a drifting setup link.

Observed after hardening:

- Setup presents one private Menu Board link and one Highlights link with truthful status.
- Menu items, categories, prices, availability, and order remain sourced from the approved menu path.
- The tested 720p board fills two columns cleanly; a moderate 1080p menu uses two balanced columns instead of a sparse third; portrait fits two categories per page without entering the footer.
- Full important names remain readable, prices align, and screen chrome stays outside customer content.
- The uploaded poster remains intact; QR purpose, store branding, MenuList attribution, and offline status are clear and do not collide.
- If real-time Firebase setup is unavailable after the server page has loaded, the restaurant still sees the last server-approved truth with an honest offline indicator and timed recovery.

Owner-feel verdict:

- The source implementation now matches the intended “open one link and leave it running” job substantially better.
- The remaining confidence gap is operational, not a known source defect: actual TV/browser setup, distance readability, QR scan distance, reconnect behavior, and deployed refresh timing.

High-value future improvements, deliberately not added in this audit:

- A bounded setup check that confirms fullscreen, QR scan distance, and full-rotation review on the owner’s actual TV. This should remain a temporary setup aid, not device management.
- Optional human-readable device nicknames only if multi-screen owner demand is evidenced. Do not add device fleets, remote control, scheduling software, or per-screen analytics by default.
- A physical-output certification matrix for the most common low-cost Android TV browsers and portrait tablets, maintained as QA evidence rather than owner configuration.

### 7.5 Fix Log

| Change | Why necessary | Invariant protected |
| --- | --- | --- |
| Server-only private screen control | Public/tenant token exposure defeated bearer secrecy | A screen URL token is revealed only through authorized server paths |
| Atomic management transaction | Partial canonical/private/public writes could diverge | One accepted mutation settles all screen representations together |
| Firestore write restrictions | Browser writes could bypass server validation | Server owns security-sensitive screen state |
| Exact cache tags | Global fan-out caused unrelated invalidation and stale authority risk | Only the affected store/screen refreshes |
| Offline/version cache guard | Old local content could override current online truth | Browser storage is never authoritative while online |
| Truthful health projector | Link generation was overclaimed as connectivity | Owner wording reflects observed evidence only |
| Responsive capacity and balancing | Screens clipped or left columns unused | Every page fits and uses available display area deterministically |
| Content-aware columns and compact portrait pages | Fixed layouts created sparse output and unnecessary rotations | Readability and useful display-area use adapt without owner configuration |
| Exact column assignment and density-guarded descriptions | Greedy placement could over-select columns and dense long rows could exceed visual capacity | Layout admission matches actual placement and secondary copy yields before names, prices, or footer space |
| Compiled root-scoped screen stylesheet | Runtime styled-jsx was absent or unreliable and first-frame motion could remain hidden | Approved output is styled and visible before animation |
| Viewport-bounded Highlights wrapper | Square artwork could enlarge the slide beyond a landscape TV | Every slide remains inside the exact display canvas |
| Listener-construction fallback | Missing client setup crashed valid SSR truth | A secondary refresh channel cannot erase approved output |
| Poster/QR/footer safe areas | Output chrome obscured customer content | Menu, price, artwork, QR, and attribution remain legible |
| Labeled QR and persistent brand name | Customers could not infer the QR destination and logo-only fallback hid business identity | Every fallback identifies the business and every QR communicates its purpose |
| Canonical OBP accent propagation | Screens dropped the owner-selected public brand color and retained a competing category palette | One normalized public brand accent reaches decorative screen chrome without weakening text or semantic-color contrast |
| OBP accent screen refresh | Nested accent saves did not wake the token-scoped screen cache/listener path | A saved public brand change reaches an initialized connected screen through the existing exact refresh transaction |
| Removed audit fixture route | A runtime `notFound()` still produced an HTTP 200 route surface | Fixture business content cannot enter the production route table |

### 7.6 Verification Log

Passed before the final visual-output corrections:

- `npm run verify:public-business-truth`
- `npm run verify:menu-project-editor-boundary`
- `npm run verify:pricing-integrity-boundary`
- `npm run verify:customer-app-pwa`
- `npm run verify:multi-location-boundary`
- `npm run verify:temporary-status-boundary`
- `npm run verify:platform-pull-api-boundary`
- `npm run verify:public-menu-entry-boundary`
- `npm run verify:menulist-api-tenant-safety`
- `npm run test:tenant-name-post-commit`
- `npm --prefix functions run build`

Digital Screens source checks:

- `npm run verify:digital-screens-boundary`: covers management authority, public read/seen behavior, scoped invalidation, display truth, owner parity, migration guards, lifecycle tests, and Firestore emulator rules.
- `npm run typecheck`: passed after the final responsive-layout and listener-fallback corrections.
- `npm run lint`: passed with zero warnings after the final corrections.
- Initial `npm run build`: passed on Next.js 16.2.11 and exposed the audit fixture in the route table despite its 404 body.
- Production smoke of `/screen-audit-preview`: returned HTTP 200 with 404 content, so the fixture route was deleted rather than accepted as production-denied.
- One intermediate rebuild failed while another shared-worktree edit temporarily passed a numeric store ID into the string analytics contract. A settled-source `npm run typecheck` passed immediately afterward; no Digital Screens code caused that failure.
- Final `npm run build`: passed, generated 440 static pages, retained `/screen/[token]`, and omitted `/screen-audit-preview` from the production route table.
- Final production-server smoke: `/screen-audit-preview` returned HTTP 404 and contained no fixture restaurant content.
- `git diff --check`: passed.
- Browser/DOM dry run: 1280x720, 1920x1080, and 768x1024 Menu Board; 1280x720 empty menu, owner poster, item promotion, and brand fallback.

Competitive presentation follow-up:

- Reviewed current official guidance and examples from ScreenCloud, OptiSigns, Yodeck, NoviSign, Samsung, and Toast, then compared the rendered MenuList output beside downloaded market references.
- 1920x1080 moderate Menu Board selected two columns, rendered all four categories, kept 56px clearance above the footer, and had no viewport overflow.
- An independent cross-check found and fixed a greedy-fit edge case where category slot order could select three columns even though two were feasible. Exact bounded assignment now controls both admission and one-page placement; `[6,4,4,6]` in two ten-slot columns is the regression case.
- An exhaustive local comparison against a brute-force solver passed 246,618 slot/capacity/column combinations.
- The same cross-check found and fixed a dense two-column overflow risk by admitting descriptions only when every wide-screen column has at most two category cards and nine item rows.
- A final OBP-color trace confirmed `store.publicPresence.accentColor` is normalized on the public server read, transported in `ScreenStoreInfo`, exposed as `--screen-brand-accent` on both display roots, and classified as a rendered store-output change for exact screen version/cache refresh.
- A non-fallback `#2c7a67` fixture at 1280x720 rendered that exact color as `rgb(44, 122, 103)` on the Menu Board header and every category frame, with category text remaining `rgb(248, 250, 252)`, prices remaining `rgb(142, 231, 173)`, and the canvas remaining `rgb(8, 11, 16)`.
- The corresponding Highlights brand fallback rendered the same OBP accent on the logo frame while keeping the business name white. Both accepted color states had no document-width or document-height overflow.
- Visual evidence: `/tmp/menulist-digital-screen-cross-check/03-obp-accent-menuboard.png` and `/tmp/menulist-digital-screen-cross-check/04-obp-accent-highlights.png`.
- A deliberately dense 1920x1080 fixture rendered twenty long two-line items in compact mode, kept all prices visible, retained 18px footer clearance, and had no viewport overflow.
- 1280x720 Menu Board retained two columns, hid secondary descriptions, kept 110px clearance above the footer, and had no viewport overflow.
- 768x1024 portrait Menu Board rendered two full categories per page, reduced the fixture rotation from four pages to two, kept 125px footer clearance, and had no viewport overflow.
- 1920x1080 item Highlights rendered the `Full menu` QR above the offline indicator with a 19px separation and no overlap.
- Owner artwork, item Highlights, and brand fallback had no viewport overflow; brand fallback visibly retained `Annapurna Family Restaurant` alongside the logo.
- Final `npm run verify:digital-screens-boundary`, `npm run typecheck`, and `npm run lint` passed.
- Final `npm run build` passed on Next.js 16.2.11, generated 440 static pages, retained `/screen/[token]`, and omitted `/screen-audit-preview`.
- The same full verifier, typecheck, lint, and production build passed again after canonical OBP accent propagation and single-accent category correction.

Environment-limited checks:

- The local visual route intentionally used fixture store data and no live Firebase configuration. Listener and seen requests therefore failed as expected, while the display fallback remained visible.
- The item-highlight fixture used an existing MenuList website image to exercise layout rather than a seeded restaurant food photograph. Real item-photo crop, color, and viewing-distance quality remain part of the physical-TV certification gap.
- A local hydration warning reflected the fixture server/client port mismatch between an existing user dev server and the isolated audit server; it is not evidence for production host behavior.
- Both QA migration scanners were invoked in dry-run mode with explicit project and all-screen scope. They stopped before reading Firestore because `GOOGLE_APPLICATION_CREDENTIALS` points to the missing `/Users/danny/Downloads/gcloud/service-account.json`; no application-default credentials are available and no write was attempted.
- The successful production build emitted existing environment warnings for MenuList Firebase project mismatch, unavailable Gemini keys on some static-generation workers, and Sass `@import` deprecation. These did not fail compilation and are not evidence of a deployed runtime configuration.
- No Vercel deployment or remote build was run.
- No Firebase write migration or rules/Functions deploy was run out of the documented app-first rollout order.

### 7.7 Final Status

Verified in source and local rendering:

- One canonical screen configuration, one server-only bearer control, and one token-free listener projection have explicit ownership.
- Owner mutations are authenticated, permission-checked, tenant/store-bound, validated, rate-limited, and atomic.
- Public reads reconcile token, tenant, store, active state, projection version, and canonical menu fallback.
- Connected refresh paths are scoped; local fallback cannot silently replace current online truth.
- Desktop/mobile owner health and links are consistent.
- Tested TV and portrait layouts preserve item names, prices, poster content, QR, footer, and attribution.

Not yet verified:

- Ordered QA app deploy, dry-run/write migrations, Firebase rule/Function cutover, and production host smoke.
- Authenticated real-owner desktop/mobile setup.
- Real listener update/reconnect and six-hour refresh behavior.
- Physical TV/tablet overscan, fullscreen retention, wake/reboot, and QR scan distance.

Production monitoring priorities:

- Screen resolution failures by bounded reason, without logging bearer tokens.
- Listener and seen acknowledgement failure rate.
- Content-version touch and cache-invalidation failures after menu/availability/price changes.
- Screens whose last-seen hint moves from recent to stale after a release.
- Migration conflict/skipped counts and any remaining legacy `screen.screenToken` fields.

No known critical or high-severity Digital Screens source correctness issue remains after this audit. Release certification remains pending the explicit external evidence above.

## 8. Public Operations Expansion Follow-up: Special Hours

**Audit date:** July 30, 2026
**Confidence:** High for local source behavior; authenticated browser/device and deployed-host evidence remain pending.

### 8.1 Decision and System Map

The attached expansion strategy was checked against current MenuList truth. “Approved Answers” and owner feedback reply handling already existed, so duplicating them would have added owner surfaces without removing work. The material, bounded gap was planned date-specific hours.

Canonical entities:

- `stores/{storeId}.workingHours`: regular weekly truth.
- `stores/{storeId}.specialHours`: bounded exact-date override truth.
- `stores/{storeId}.timeZone`: authority for the effective local date/day.
- `stores/{storeId}.hoursLastUpdatedAt`: freshness timestamp for weekly and special-hours changes.

Customer-visible outputs traced:

- Public menu status/trust/footer and analytics hours state.
- Official Business Page current status, today answer, hours panel, outlet cards, and JSON-LD.
- Public Business API and browser-safe public store projection.
- Desktop/mobile Communication Kit today-hours replies.
- Mobile Today and desktop/mobile Working Hours owner surfaces.
- Digital Screens were cross-checked; screens do not render hours, so no screen presentation or version change was introduced.

### 8.2 Flow Trace and Fixes

Owner input now follows:

`desktop/mobile date + mode + optional label -> shared normalization -> tenant/store-scoped updateStore -> store write acknowledgement -> public cache invalidation -> normalized public projection -> menu/OBP/API/message render`

Fixes:

- Added strict `YYYY-MM-DD`, range, label, extra-key, and 64-entry validation.
- Exact-date entries override the complete store-local date. A current-date closure suppresses previous-day overnight carry; absent a current-date exception, prior overnight carry remains valid.
- Added acknowledged desktop and MobileShell add/edit/remove experiences inside Working Hours.
- Upcoming dates now sort first and historical dates sort newest-first below them. Expired entries remain removable but no longer open an editor that rejects every save.
- Desktop and mobile special-date dividers use the active Ant Design theme token; the owner primary action inherits the existing theme color. Public special-hour rows reuse the OBP hours presentation and accent treatment rather than introducing a competing palette.
- Mobile Today now displays effective special hours and edits the exact date when an exception is active, avoiding a hidden regular-weekday write.
- Added exception-aware Output Control, badges, trust signals, OBP outlet cards, menu analytics state, and owner message templates.
- OBP visibly lists upcoming special dates using its existing branded hours presentation.
- Removed an English-only public-message addition. Unlabelled OBP exceptions use the formatted date as the primary text, preserving all 52 locale bundles without a generic untranslated label.
- Corrected AI Menu Manager routing so “special hours” and “holiday hours” enter the planned Working Hours flow; Temporary Status remains the live interruption flow.
- Added `specialOpeningHoursSpecification` generated from the same visible/validated truth. Closed dates omit `opens` and `closes`.
- Public browser/API projections normalize the field again so malformed owner-document data cannot become public authority.
- Reused the existing store document, DAL, cache invalidation, and freshness field. No collection, query, listener, scheduler, Function, Storage object, or provider call was added.
- A final shared-worktree build also exposed an unrelated POS signing-secret transaction result type that declared absent error-branch fields as `never`. The annotation now uses `undefined`, matching JavaScript object absence without changing authorization, transaction, or response behavior.

### 8.3 Invariants Protected

| Change | Invariant |
| --- | --- |
| Shared hours boundary | Weekly and special values cannot drift across engine, DAL, and public output |
| Store-local date authority | Browser/server locale cannot select a different exception date |
| Full-date override priority | “Closed on this date” cannot remain open because of regular overnight hours |
| Acknowledged owner writes | Owners do not see published confirmation before persistence/cache acknowledgement |
| Public normalization | Invalid or oversized exception data is omitted, never rendered as business truth |
| Mobile Today parity | A visible special date is not silently edited through the regular weekday field |
| Planned/live intent routing | AI Menu Manager cannot send planned holiday hours into temporary live status |
| Owner history ordering | Expired entries cannot obscure upcoming truth or enter an unsavable edit flow |
| Compact store map | Special hours add no incremental Firebase reads or new operational subsystem |

### 8.4 Verification Log

Passed:

- `npx tsc --noEmit --pretty false`
- `npm run lint`: zero warnings
- Scoped ESLint over all touched hours, owner, public, API, schema, and verifier files
- `npm run verify:working-hours-boundary`
- `npm run verify:ai-menu-manager`, including operation, session, proposal, project, model-route, patch-policy, domain-conversation, and presentation suites
- `npm run test:public-client-projection`
- `npm run verify:communication-kit-boundary`
- `npm run verify:public-business-truth`
- `npm run verify:platform-pull-api-boundary`
- `npm run verify:menulist-api-tenant-safety`
- `npm run verify:mobile-shell-route-map`
- `npm run verify:temporary-status-boundary`
- `npm run verify:global-localization-boundary`: 52 locale bundles and 337 public customer messages aligned
- `npm run verify:global-accessibility-boundary`
- `npm run test:presentation-style-contracts`
- `npm run verify:dependency-freeze`
- Firestore emulator tenant/store rule test on isolated port `8181`: same-store special-hours read/write passed; cross-store and cross-tenant writes were denied; platform read passed
- `npm run build`: Next.js 16.2.11 compiled, typechecked, and generated 440 static pages
- `npm run verify:next-build-compatibility`
- `npm run verify:next-deployment-bundle`: isolated website, sign-in, and auth API traces loaded
- `npm run docs:check-links`: zero broken links; 62 existing documentation naming warnings remain outside this feature
- `git diff --check`

Deterministic coverage includes weekly/special precedence, all-day closure, different hours, current-date suppression of overnight carry, prior special overnight carry, India/Los Angeles local-date rollovers, invalid calendar dates, invalid/equal ranges, control-character labels, the 64-entry bound, upcoming-result limits, owner upcoming/history ordering, browser-safe projection, and weekly/special JSON-LD.

Local production-server browser checks verified that unauthenticated `/business-settings?section=hours` and `/today` requests settle on sign-in. The sign-in boundary had no horizontal overflow at `1440x900` or `390x844`. No authenticated owner session was available, so these checks verify route protection and responsive fallback, not the editor's final visual presentation.

One intermediate `verify:working-hours-boundary` invocation observed an inconsistent file snapshot while the shared worktree was changing and reported a missing static token that was present in settled source. The immediate settled-source rerun passed, as did typecheck and scoped lint. No product change was required for that transient result.

Environment notes:

- Vercel or Firebase deployment. No Firestore rules, indexes, Storage rules, or Cloud Function logic changed.
- The normal Firestore emulator port was occupied by another active repository test, so the same rules suite was run with an isolated temporary emulator config on port `8181`.
- One post-theme build attempt failed on the concurrently edited POS signing-secret result union. A scoped type-only correction was applied; exact TypeScript, scoped lint, and the subsequent full production build passed.
- The successful build and local browser run logged existing Firebase project-mismatch, absent Gemini-key, Sass `@import` deprecation, local Upstash timeout/bypass, and CSP-report diagnostics. They did not fail compilation or the rendered auth boundary and are not deployed-environment certification.

### 8.5 Remaining Evidence and Monitoring

Still required before release certification:

- Authenticated desktop and MobileShell add/edit/remove smoke against a QA store.
- Public menu/OBP smoke near midnight in at least two store timezones.
- Deployed cache observation after special-hour add/edit/remove.
- Search structured-data validation on a deployed OBP URL.
- iOS/Android native date/time input QA.
- Optional defense in depth: Firestore store-document rules enforce tenant/store/role access but do not independently validate the nested `specialHours` shape. Current application writes validate before Firestore and public projections fail closed.

Production monitoring priorities:

- Store update or public-cache invalidation failures for `specialHours`.
- Invalid special-hour data omitted by public projections.
- Owner reports around overnight businesses and store-local midnight.
- Growth in exception-map size; retain the 64-entry bound unless measured demand proves it insufficient.

No known critical or high-severity source correctness issue remains in this bounded expansion. Automatic holiday calendars, provider sync, promotions, booking calendars, and general staff operations remain intentionally outside scope.

## 9. Public OBP Route Audit

**Audit date:** July 30, 2026
**Confidence:** High for current source behavior and local hydrated rendering;
deployed cache/search/device evidence remains pending.

### 9.1 System and Flow Map

Inspected the tenant catch-all route, host-derived tenant identity, canonical
store lookup/projection, OBP resolver, brand selector, menu resolver, metadata,
JSON-LD, public images, hours/special hours, customer actions, localization,
owner Official Page settings on desktop/mobile, PWA prompt, public cache tags,
and post-write invalidation.

Canonical public truth remains on `stores/{storeId}` plus the tenant/store
scoped project projection. Multi-location membership comes from canonical
active stores, not `storesSummary`. Public writes continue through the existing
store/project DAL and invalidate `menu-store-{storeId}`, `store-{storeId}`, and
`client-stores`.

### 9.2 Material Findings and Fixes

| Severity | Finding | Fix and protected invariant |
| --- | --- | --- |
| High | Menu/outlet read failures became false empty-menu or single-location output | Exhausted reads throw to the honest localized error boundary; outages cannot become business truth |
| High | Master store missing from multi-location root | Active master routes through canonical `/menu`; all public locations remain visible |
| High | Account email exposed in OBP/menu JSON-LD | Removed hidden email and owner-preview claim; login identity is not public contact truth |
| Medium | Brand root emitted no structured data | Added Organization JSON-LD from the same visible bounded location projection |
| Medium | Failed legacy media showed broken image text/blank cards | Added pre/post-hydration fallbacks for cover, logo, outlets, menus, and gallery |
| Medium | 5+ menus pushed actions excessively far down mobile | Added automatic compact equal mobile rows; desktop and small menu sets retain image-led cards |
| Low | Mobile language targets were 28px | Increased to 44px with no 390px overflow |
| Medium | Root metadata used outlet context for the brand site name | Root metadata now resolves canonical brand identity |

Owner color was traced end to end:
`stores.publicPresence.accentColor -> public store projection ->
resolveOBPAccentColor -> --obp-accent`, including fallback initials, status
presentation, and customer-app install color. The live fixture's `#14b8a6`
rendered consistently in dark mode.

### 9.3 Public and Owner Screens Covered

- Multi-location brand root at desktop and mobile sizes.
- Outlet OBP identity, status, official/freshness trust, menus, Call, WhatsApp,
  Feedback, Location, quick answers, hours, policy links, attribution, theme
  toggle, and install prompt.
- Owner desktop Official Page settings/preview and mobile Official Page source
  paths for accent, media, public links, saves, and cleanup.
- Linked menu route construction, metadata, outlet/brand JSON-LD, public error
  state, and empty/missing-menu decisions.

Detailed evidence and screenshots:
`__docs__/official-business-page/official-business-page_verification-2026-07-30.md`.

### 9.4 Verification Log

Passed:

- `npm run typecheck`
- Focused ESLint over changed OBP, owner-preview, and verifier files
- `npm run verify:official-business-page-boundary`
- `npm run test:obp-schema-timestamp-boundary`
- `npm run verify:public-business-truth`
- `npm run verify:public-customer-delivery`
- `npm run verify:public-customer-localization` (337 messages, 52 locales)
- `npm run verify:multi-location-boundary`
- `npm run test:project-slug-backfill-boundary`
- `git diff --check`

Hydrated browser dry runs passed at 1440x900 and 390x844 with zero horizontal
overflow. The third-visit install prompt was rendered and dismissed. Brand
schema described both visible locations; outlet and brand schema contained no
email. Failed media left intentional fallbacks instead of broken images.

### 9.5 Remaining Risks and Monitoring

- Live QA legacy Firebase Storage assets return HTTP 402. The UI is now honest
  and clean, but real photos require owner re-upload or bucket restoration.
- No full Next.js production build or Vercel deployment was run for this
  bounded route audit, so deployed behavior and cache propagation are not
  certified by this local audit.
- Search rich-result validation, deployed canonical/schema parity, and
  physical iOS/Android PWA testing remain pending.
- Local tenant-host testing used an explicit `localhost` platform alias without
  changing tracked environment files. Existing local Firebase project-mismatch
  and Sass deprecation diagnostics were observed.

Production monitoring should prioritize public error-boundary frequency,
project/store read timeout rate, broken-media fallback rate, cache invalidation
failures, PWA prompt shown/dismissed/install conversion, and unusually large
active-menu counts.

No known critical or high-severity source correctness issue remains in the
public OBP route after this audit.

## 10. Special Menu Switching Audit

**Audit date:** July 30, 2026
**Confidence:** High for local source, deterministic runtime behavior,
Firestore lifecycle rules, and Admin transition behavior. Deployed scheduler,
authenticated owner visuals, and physical display evidence remain pending.

### 10.1 Executive Summary

The feature architecture is correct after hardening: a special menu remains a
normal tenant/store project whose full `_specialMenu` metadata owns canonical
runtime truth. The compact project summary is a list/scheduler projection, and
`stores.activeSpecialMenuId` is a derived active pointer. Neither derived
representation can independently make a project public.

The audit found one high-impact divergence: configured digital screens required
a top-level `isSpecialMenu` field that creation never writes to the full project.
Public web menus could therefore switch while screens continued showing the
regular menu. Public and screen resolution now share one fail-closed full-project
validator and exact base-menu boundary.

Other material fixes align store-timezone scheduling, date-only/date-time
capabilities, business-type mode enforcement, schedule overlap enforcement,
stale-pointer recovery, desktop schedule management, duplicate submissions,
empty replacement semantics, and owner-facing schedule presentation.

No known critical or high-severity source correctness issue remains in the
audited feature. Remaining risks are deployment/device evidence and one
lower-severity composite-save limitation in the alternate mobile project editor.

### 10.2 System Map and Source of Truth

| Truth | Canonical owner | Derived/consumer role |
| --- | --- | --- |
| Menu content, files, languages, prices, availability | `projects/{tId}/{sId}/{projectId}` | Normal menu editor, public menu, screen projection |
| Special lifecycle/mode/window/base/name | Full project `_specialMenu` | Never inferred from summary-only `isSpecialMenu` |
| Owner list and due-work index | `platformSummary/projects_{sId}` | Derived `isSpecialMenu`, status/window/base/mode, `specialMenuNextTransitionAt` |
| Current active pointer/banner | `stores/{sId}` | `activeSpecialMenuId`; owned `tempStatus.sourceProjectId` |
| Business capability | Canonical store business type/category | `getSpecialMenuCapabilities()` derives replace/overlay and time precision |
| Business-local schedule interpretation | `stores.timeZone` | Desktop/mobile input conversion to persisted ISO instants |

Customer-visible outputs traced:

- Public menu and QR URL through `src/app/client/[[...slug]]/page.tsx`.
- OBP menu entry, which links into the same canonical public menu route.
- Configured digital screens through
  `src/database/campaigns/serverScreen.ts`.
- Temporary status presentation while the active project owns the banner.
- Exported PDFs/print and POS/provider outputs are intentionally not automatic;
  they require regeneration/replacement or integration-specific evidence.

### 10.3 Flow-by-Flow Results

| Flow | Files inspected and path traced | Findings and fixes | Checks / remaining concern |
| --- | --- | --- | --- |
| Create | Desktop/mobile inputs -> `useSpecialMenus` -> `createSpecialMenuProject` -> project/summary/store transaction -> cache -> reads | Canonical store is now read inside the transaction; mode capability and overlap cannot be bypassed. Immediate create validates a different active pointer and repairs stale state. Duplicate submits are synchronously blocked. | Lifecycle aggregate and TypeScript pass. |
| Owner content edit | Normal project editor/mobile editor -> project DAL -> project and public summary | Special content continues using the normal menu model. Generic default/deactivate/delete guards protect live special/base projects. Public translated name/description projection remains acknowledged. | Alternate mobile project editor performs schedule then generic image/language writes; a later generic failure can produce a partially completed composite UI save. Canonical truth stays valid, but reload may reveal an earlier successful schedule change. |
| Schedule edit | Desktop card/modal and both mobile editors -> capability-aware conversion -> `updateSpecialMenuProject` transaction | Desktop now exposes edit and full date/time range. Every surface uses store timezone and renders date-only or date-time controls according to canonical business capability. Overlap bypass removed. Active edits recover stale pointers. | Native iOS/Android date-control smoke remains pending. |
| Manual lifecycle | Owner End/Cancel/Activate -> hook acknowledgement -> shared browser transaction -> project/summary/store -> cache | Tenant/store scope, status transitions, owned banner cleanup, marker recomputation, stale-pointer recovery, and fallback acknowledgement are guarded. | Rules and lifecycle emulator pass. |
| Scheduled lifecycle | Due summary query -> Admin transition transaction -> cache/screen touch; nightly repair fallback | Two-minute indexed query is bounded to 50 summaries, expires before activation, retains retryable due markers, and treats repaired state as public mutation. | QA deployed timing and contention observation remain pending; no Functions source changed in this audit. |
| Public menu / OBP / QR | Store pointer -> exact project read -> shared runtime validator -> base match -> replace/overlay -> render | Pointer target now must be live, active, nondeleted, same tenant/store, valid, and based on the route’s regular menu. Replace is authoritative even when empty. Overlay uses one deterministic namespaced projection. | Public unauthenticated tenant route reached locally; deployed cache and midnight smoke pending. |
| Digital screen | Screen token/base -> canonical store pointer -> exact special project -> shared validator -> replace/overlay extraction | Fixed the missing-marker defect. Explicit and default screens now require the special menu’s `baseProjectId` to match their resolved regular base. Invalid base projects fail closed. Empty replace no longer leaks regular items. | Physical TV/portrait/landscape transition smoke remains pending. |
| Auth and tenancy | Session scope -> expected scope -> encoded project IDs -> Firestore rules | Every owner mutation validates current tenant/store; mobile settlement rejects stale scope. Public reads expose only projected public fields. No new collection or public mutation route was added. | Rules permit authorized tenant writers broadly, so canonical DAL use remains an application invariant; emulator proves cross-tenant/store denial. |
| UI, theme, and errors | Desktop Ant UI, mobile owner shell, screen/public presentation | Owner copy now explains replace/alongside behavior, shows exact windows and timezone, wraps actions/names, and avoids false success. Components use Ant theme tokens. Digital screens receive validated OBP accent color through the existing screen theme contract. | Authenticated owner screenshot certification was blocked by unrelated local Turbopack Firebase Admin client bundling. |

### 10.4 Fix Log and Protected Invariants

| Change | Why necessary | Invariant protected |
| --- | --- | --- |
| Added `specialMenuRuntime.ts` | One canonical public/screen eligibility decision | Derived summary data cannot become runtime authority |
| Repaired configured-screen resolution | Full projects do not contain summary-only `isSpecialMenu` | Web and screen customers see the same intended menu |
| Required exact base match on web and screen | Active store pointer is store-wide, while routes/screens can target different menus | A special menu overrides only the menu it was created from |
| Preserved empty replace output | Falling back to regular items misrepresents an intentionally empty active menu | Replace mode is authoritative |
| Enforced store capability and overlap in DAL | UI checks are not an authorization/correctness boundary | One valid special menu window and supported mode |
| Converted all owner schedules through store timezone | Device timezone can differ from business timezone | Persisted activation instant matches owner intent |
| Added capability-aware date controls | Date-only values were incompatible with mobile date-time controls | UI shape and persistence schema agree |
| Added desktop schedule edit/full range | Desktop owners could not inspect or repair precise windows | Owner-visible state matches persisted truth |
| Added synchronous submit guards | Rapid taps/clicks could create duplicate work | One owner intent produces one mutation attempt |
| Extended stale-pointer recovery to create/edit | Interrupted cleanup could block the owner indefinitely | Dead derived state cannot become permanent authority |
| Extended lifecycle regression gates | Defects crossed UI, DAL, public, and screen boundaries | Future changes must preserve end-to-end contracts |

### 10.5 Verification Log

Passed on the final source:

- `npx tsc --noEmit --incremental false --pretty false`
- `npm run verify:special-menu-lifecycle`
- `npm run test:special-menu-lifecycle:rules`
- `npm run test:special-menu-lifecycle:emulator`
- `npm run verify:digital-screens-boundary`
- `npm run verify:public-business-truth`
- Focused ESLint with zero warnings across changed owner, DAL, public, screen,
  runtime, and verifier files
- Functions TypeScript build inside the lifecycle emulator suite
- `npm run docs:check-links`: zero broken links; 62 existing naming warnings
  remain outside this feature
- `git diff --check` for the bounded feature files

Browser evidence:

- Tenant public route responded locally.
- Authenticated `/projects` visual dry run could not compile because unrelated
  current-worktree server-auth imports caused Turbopack to bundle Firebase Admin
  dependencies into a client path (`child_process` resolution failure).
- No Vercel deploy, Firebase deploy, or full production build was run. This
  audit changed no Firestore rules, indexes, Storage rules, or Cloud Functions.

### 10.6 Final Status

Verified locally:

- Canonical project/summary/store ownership and atomic lifecycle transitions.
- Tenant/store isolation on supported owner paths.
- One-active/no-overlap behavior and bounded stale-pointer repair.
- Store-timezone and business-capability schedule handling.
- Public menu, OBP-link, QR-link, and configured-screen output decisions.
- Deterministic overlay and authoritative replacement semantics.
- Cache/screen invalidation call paths after owner and scheduled mutations.
- Theme-token usage and OBP accent propagation into digital-screen data.

Not yet certified:

- Authenticated desktop/MobileShell visual flow against QA.
- Real two-minute scheduler behavior around store-local boundaries.
- Deployed public cache/CDN propagation.
- Physical screen reconnect/refresh in landscape and portrait.
- Native mobile date/date-time controls and DST edge locations.
- Automatic PDF/print/POS changes, which remain outside the supported contract.

Production monitoring should prioritize special pointer/runtime rejection rate,
blocked overlap attempts, scheduler delay and retry counts, stale-pointer
repairs, cache invalidation failures, initialized-screen refresh lag, and
owner-reported timezone discrepancies.

## 11. Public Menu Rendering Audit

Audit date: 2026-07-31

### 11.1 Executive Summary

The public menu was traced from the server-resolved store and project through
special-menu admission, catalog normalization, time-based category filtering,
Featured and Decision Blocks entry points, item deep links, item detail,
structured data, customer-app presentation, and OBP theme propagation.

No known critical or high-severity source correctness issue remains in these
audited paths. Confidence is high for source, type, lint, verifier, and
production-build behavior. It is not absolute because the current worktree was
not deployed and a live seeded Firebase tenant was unavailable for final visual
browser certification.

### 11.2 System Map and Sources of Truth

| Truth | Canonical source | Public consumer |
| --- | --- | --- |
| Menu categories, items, price, availability, order | Full selected `projects` document | Public menu renderer, item detail, catalog JSON-LD |
| Default and special-menu selection | Public project summary plus validated full project and store special pointer | `src/app/client/[[...slug]]/page.tsx` |
| Timed category window | Category `timeSlots`, interpreted in `stores.timeZone` | All category lists and every item-entry path |
| Currency | `stores.currencyCode` and optional `stores.currencySymbol` | Visible price, analytics, catalog JSON-LD, `currenciesAccepted` |
| Public brand accent | Project theme, then normalized `stores.publicPresence.accentColor` | Public menu mood and customer-app prompt |
| Public item eligibility | Active item whose active category is currently admitted | Cards, Featured, Decision Blocks, query deep link, legacy path |

Customer-visible outputs checked:

- Tenant and custom-domain public menu routes.
- OBP menu entry and customer-app prompt.
- Responsive category, item, search, Featured, and Decision Blocks views.
- Canonical `?item=` links and legacy item paths.
- Item detail dialog.
- Catalog JSON-LD and business `currenciesAccepted`.
- Genuine empty-catalog and scheduled-for-later states.

### 11.3 Flow-by-Flow Audit

| Flow | Files inspected and path traced | Findings and fixes | Remaining concern |
| --- | --- | --- | --- |
| Server read and structured data | `src/app/client/[[...slug]]/page.tsx` -> selected store/project -> menu renderer and JSON-LD | Replaced divergent currency fallback with one normalized code boundary shared with the renderer. | Deployed CDN/cache propagation was not exercised. |
| Category and item admission | `menuPageNew.tsx` -> catalog normalization -> timed visibility -> cards/search/filters/Featured/Decision Blocks | Active catalog categories are separated from currently visible categories. Every output and item-opening callback uses the admitted set. Wall-clock and visibility-resume refresh prevent mount-relative drift; invalid or missing timezones use deterministic UTC. | Live store-timezone boundary smoke remains pending. |
| Direct item routes | Query and legacy path parsing -> item/category lookup -> item detail | Sold-out links retain the unavailable detail; removed, inactive, uncategorized, hidden, and empty-catalog links fail closed, clear an open detail, and settle to the canonical menu URL. Minute refresh does not re-scroll an already-open item. | External indexed legacy links should be monitored for expected rejection behavior. |
| Empty and scheduled states | Catalog categories -> visible categories -> public empty presentation | A genuine empty menu still says no items exist; a temporarily hidden catalog shows the affected category names and next opening times. | Translation verifier passed; human review of all 52 locales was not performed. |
| Prices and metadata | Store currency -> formatter, analytics, JSON-LD | Code and symbol are normalized independently; missing symbols derive from the valid currency code. | Legacy stores without a code intentionally retain the documented INR fallback. |
| OBP theme | Project color -> OBP public accent -> accessible mood resolver | OBP color now reaches both direct renderer entry points without overriding an explicit project color. Existing contrast guards remain authoritative. | Final tenant-specific color rendering needs deployed screenshot evidence. |
| Item detail accessibility | Item activation -> modal -> close | Removed invoker blur; added initial focus, Escape close, Tab containment, and focus restoration. Replaced an array-length render expression that could display `0` with an explicit boolean. | Screen-reader certification on physical mobile devices remains pending. |
| Mobile readability | Responsive menu styles -> item descriptions and fact chips | Supporting text now stays at or above the governed readable floor while preserving compact layout hierarchy. | Current code was not visually certified on a deployed small-screen tenant. |
| Build boundary | Feedback client DAL -> session identity helper -> browser graph | Replaced the server-only current-user import with the browser-safe session document-id helper. The build verifier now forbids regression. | This was an adjacent shared-worktree blocker, not a public-menu data change. |

No public-menu write path changed. Existing project/store mutations therefore
retain their current public cache invalidation and revalidation responsibilities.
No Firestore rule, index, Storage rule, Cloud Function, dependency, schema, or
deployment target changed.

### 11.4 Fix Log and Protected Invariants

| Change | Invariant protected |
| --- | --- |
| One public currency resolver for UI, analytics, and metadata | Customers and search engines receive the same currency truth |
| One current-time category admission map | An item cannot bypass its category's service window |
| Wall-clock/resume refresh and UTC fallback | Schedule truth does not drift from the store clock or vary by customer device |
| Distinct sold-out and removed-link handling | Temporary item unavailability is not misrepresented as deletion |
| Separate scheduled-empty presentation | Temporary unavailability is not misrepresented as a missing menu |
| Project-to-OBP accent fallback chain | Owner-selected public identity reaches output without displacing explicit menu design |
| Focus-managed item dialog and boolean metadata guard | Keyboard users retain context and the UI never renders numeric implementation residue |
| Browser-safe feedback session identity import | Client compilation cannot pull Firebase Admin and Node-only modules into the browser |
| Expanded focused verifiers | The corrected truth, accessibility, routing, and build boundaries are executable contracts |

### 11.5 Verification Log

Passed on the final source:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run verify:next-deployment-bundle`
- `npm run verify:next-build-compatibility`
- `npm run verify:next-runtime-migration`
- `npm run verify:menu-design-presentation-boundary`
- `npm run verify:public-customer-delivery`
- `npm run verify:public-business-truth`
- `npm run verify:public-customer-localization` (337 messages across 52 locales)
- `npm run verify:global-accessibility-boundary`
- `npm run verify:url-routing-boundary`
- `npm run verify:pricing-integrity-boundary`
- `npm run verify:customer-app-pwa`
- `npm run verify:answerlattice-feedback-boundary`
- `npm run security-os:audit -- --product menulist`
- `npm run security-os:plan -- --product menulist`
- `npm run test:input-validation-boundary`
- `npm run verify:menulist-api-tenant-safety`
- `npm run verify:special-menu-lifecycle`
- `npm run verify:temporary-status-boundary`
- `npm run verify:working-hours-boundary`
- Digital Screens source, seen, timestamp, lifecycle, Firestore-rules, and
  management-emulator checks. The aggregate first stopped because port `8080`
  was already occupied by a local Firestore emulator; both remaining emulator
  tests passed directly against that emulator under isolated demo project IDs.
- `npm run test:time-slot-data-flow`
- `npm run test:menu-price-boundary`
- `npm run test:public-accent-and-sorting-boundaries`
- `npm run test:presentation-style-contracts`
- `npm run verify:dependency-freeze`
- `npm run docs:check-links` (zero broken links; 62 pre-existing naming
  warnings outside the client-menu feature)
- `git diff --check`

The first production build failed because the feedback DAL imported
`@lib/auth/currentPlatformUser`, which pulled Firebase Admin and Node-only
modules into client graphs. After switching to the existing browser-safe
session identity helper and extending the build compatibility verifier, the
the final build passed: compilation and TypeScript completed, 441 static pages
were generated, Serwist emitted 52 precache entries, and deployment-bundle
isolated route loading passed.

Non-failing environment diagnostics included Sass `@import` deprecations,
local Firebase project mismatch messages during page collection, and missing
optional Gemini configuration on local workers. No Vercel or Firebase deploy
was performed.

The final production server started locally on port `3027`. `/offline`
returned HTTP 200, and `/client/menu` without tenant host context followed the
expected redirect to the root. Tenant-specific public-menu screenshot,
interaction, and color evidence could not be regenerated because the local
Firebase identity does not match a seeded MenuList project.

### 11.6 Final Status

Verified locally:

- Canonical menu, category, item, price, schedule, currency, and public-theme
  truth reaches the audited customer output paths consistently.
- Hidden or inactive category state cannot be bypassed through alternate item
  entry points.
- Genuine empty state and scheduled-later state are distinct and truthful.
- Item detail keyboard behavior and supporting-text readability meet the
  audited source contracts.
- TypeScript, lint, targeted tests, cross-feature verifiers, production build,
  and isolated deployment-bundle loading pass.

Not yet certified:

- Current-source screenshots against a seeded QA tenant and custom domain.
- Real store-timezone transitions at schedule boundaries.
- Deployed cache/CDN refresh after an owner menu, currency, or OBP-color save.
- Physical mobile screen-reader behavior and low-end customer-device rendering.

Production monitoring should prioritize public-menu render failures, rejected
item deep links, timed-category transition accuracy, metadata/UI currency
parity, public cache refresh latency, and tenant-specific theme contrast.

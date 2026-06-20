# MenuList System Audit Report

Date: 2026-06-20
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

# Owner Business Assistant Validation

**Feature:** Owner Business Assistant / Business Health
**Product:** MenuList
**Status:** Enabled for owner testing behind separate safety flags
**Validated:** June 8, 2026

---

## Runtime Scope Validated

Business Health and Action Support are implemented as separate runtime tracks:

- Business Health flags control dashboard/page/mobile/API read-only health behavior.
- Action Support flags control navigation, drafts, check workflow writes, provider text/image actions, existing-screen handoffs, and public-truth guardrails.
- Separate flags let Business Health stay read-only if Action Support is disabled, and let Action Support stay limited to navigation/drafts/check workflow while public-truth confirmed writes remain guarded.

## June 8 Cross-Check Fixes

- Business Health priority-check buttons are hidden unless the matching Action Support flags are enabled.
- Priority-check `Open` now calls the action route and navigates only to existing registered routes.
- The old `/analytics` action target was corrected to the existing `/dashboard` route.
- Suggested "today" questions are omitted when the scheduler did not build a today period, and explicit today questions refuse instead of falling back to another period.
- Cached context packets refresh the action catalog from current flags before answering, so emergency Action Support disables are not delayed by server packet cache TTL.
- Thread persistence is opt-in under `ENABLE_OWNER_BUSINESS_HEALTH_THREADS` and writes only when the client supplies a bounded `threadId`.
- Review-reply and temporary-status prepare actions now create compact draft docs instead of falling through to a generic blocked result.
- Check mark/dismiss actions now use one compact audit write instead of a duplicate write.
- Desktop and mobile check review/dismiss controls now hide the check locally for the current business date after that audit write succeeds, with no extra Firestore read path.
- Browser-local Business Health current, analytics, and one-doc thread keys now include store scope as well as selected menu scope, so multi-store owners do not see stale cache/thread state after switching stores.
- SWR in-memory keys for current health and analytics now include store scope too, and the dashboard analytics strip passes the active store id, so same-session store switching cannot reuse another store's Business Health packet.
- Missing analytics-index responses are not stored in browser localStorage; this prevents a first-open `null` analytics result from hiding the first successful scheduler-built analytics index until the next calendar day.
- The client clears the visible answer/pending-question state when the selected store/menu scope changes, while preserving the one-doc thread key for that new scope.
- Store aggregate `lastSettledLocalDate` now comes from the first available indexed dashboard summary, not only the default/first indexed project, so freshness labels stay correct when one project has no dashboard summary but another does.
- Mobile send uses the shared mobile button `icon` slot with an accessible label, preventing the icon-only send control from rendering as a tiny text artifact.
- Mobile Business Health now opens returned action options through the action sheet only when Action Support is enabled.

## June 8 Monitoring And History Additions

- Owner-visible chat history is implemented only under `ENABLE_OWNER_BUSINESS_HEALTH_THREADS`; the client creates a bounded local `threadId`, `/answer` persists the exchange only when that ID is present, and `/thread/[threadId]` returns serialized JSON.
- Chat history uses one `ownerBusinessAssistantThreads/{threadId}` document with capped `messages[]`; it does not create one document per chat message.
- Thread reads and feedback writes require auth, tenant isolation, and `VIEW_ANALYTICS`, matching the answer route permission boundary.
- Internal answer-event logging is implemented separately under `ENABLE_OWNER_BUSINESS_HEALTH_USAGE_LOGGING`.
- Deterministic/template answers log zero units, zero internal cost, and zero owner charge.
- Current `aiAnswerClient` returns the deterministic grounded fallback; Business Health answer provider spend is zero until a real provider-backed answer adapter is wired and sets `providerUsed`.
- Platform-only monitor route `/api/platform/owner-business-assistant/monitor` summarizes recent answer events, actions, feedback, unsupported gaps, provider calls, units, internal cost, and owner charge.
- Internal UI route `/platform/owner-business-assistant` is linked from Ops Control Room and renders through the desktop Platform settings shell with the Business Health Monitor tab selected.
- Desktop `/platform` includes Business Health Monitor in the platform navigation for platform users.
- Mobile More includes Business Health Monitor under Platform Monitoring for platform admins and opens it inside `MobilePlatformInternalScreen`; mobile deep links to `/platform/owner-business-assistant` map to the same wrapper.
- Starter question suggestions are ranked from the current health/analytics packet through the shared suggestion catalog; answer follow-up suggestions are capped to 3 and returned with the same answer response.
- AI operation presentation now labels Business Health answer/draft operations for existing transaction dashboards if provider-backed accounting is enabled.
- Maintenance cleanup is flag-specific so disabled threads, answer events, feedback, and drafts do not add collection queries. Embedded messages expire with the thread doc.
- Upstash context-packet cache keys are stable by tenant/store/profile for zero-Firestore cache hits; selected-project packets use `p:{projectId}` only because the packet now includes project-scoped analytics facts. Cached packets are rejected after packet `validUntil`, and writes cap TTL to the earlier of `validUntil` or 24 hours.
- Today overlay analytics is folded into the scheduler-built analytics index for indexed active projects and can derive top item facts from either `topItems[]` or the existing `clicksByItem`/`viewsByItem` maps.
- Multi-project stores are handled inside one `ownerBusinessAnalyticsIndex_{tId}_{sId}` doc: store aggregate periods use indexed active projects, selected-menu answers use `projectSummaries[projectId]`, and missing selected-project facts refuse instead of falling back to the store aggregate.
- Action Support validates project/menu target membership through `platformSummary/projects_{sId}` first, with a canonical project-doc fallback, and skips that read for store-level actions.

## June 8 Reliability, Cost, And Multi-Location Hardening

- Public-truth and compact Business Health writes now invalidate Business Health packet cache as well as existing public cache tags. Covered app paths include shared public-client cache helpers, `/api/revalidate/menu`, project/outlet saves, temporary status, outlet create/rename/deactivate/policy, domain changes, public menu claim, messaging publish, subscription entitlement sync, and platform entity blocking.
- The Firebase Functions Business Health writer invalidates matching Upstash packet keys after current/snapshot/index/multi-location docs commit, so scheduler rebuilds do not leave typed-answer packets stale until TTL.
- Packet profiles are explicit and route-aligned: `health_card`, `analytics_periods`, `owner_question_actionable`, and `multi_location_summary`.
- Dashboard/current and analytics packets omit the action catalog; only actionable owner-question packets refresh and include allowed actions.
- `/current`, `/analytics`, `/answer`, and `/action` now expose route metrics for cache source, packet profile, Firestore read/write counts, packet age, provider usage, thread writes, and answer-event writes.
- Answer-event logging stores those route metrics plus compact source coverage for the platform monitor.
- Platform Business Health Monitor now shows source coverage, cache hits, fresh packet count, average/max reads, thread writes, provider calls, units, internal cost, and owner charge from compact answer-event docs.
- Successful low-risk navigation actions no longer write action audit docs; blocked navigation, drafts, check workflow, and guarded/risky outcomes remain auditable.
- Scheduler writes `platformSummary/ownerBusinessHealthMultiLocation_{tId}` with one compact `stores.{sId}` entry per store rebuild. `/api/owner-business-assistant/locations` reads that tenant summary doc plus `storesSummary`, then filters deactivated outlets and mapped store access.
- Desktop and mobile Business Health screens show compact multi-location status only for multi-store tenants, reuse scoped SWR/localStorage cache on repeat opens, and do not load every store-specific packet.
- First-run/not-ready UX hides the Ask box and shows stable navigation shortcuts until a source-backed check exists.
- Not-ready/insufficient-data visual states use neutral/info styling instead of success styling.
- Unsupported answers now include a supported alternative, such as customer attention or standard supported periods.
- Answer freshness labels use "Uses data through {date}. Today may not be complete yet." when source-window dates are available.

## Implemented Files

Core app implementation:

- `src/lib/ownerBusinessAssistant/*`
- `src/hooks/ownerBusinessAssistant/*`
- `src/app/api/owner-business-assistant/*`
- `src/app/api/platform/owner-business-assistant/monitor/route.ts`
- `src/app/(main)/business-health/page.tsx`
- `src/app/(main)/platform/owner-business-assistant/page.tsx`
- `src/components/templates/main-app/ownerBusinessAssistant/*`
- `src/components/templates/main-app/platform/ownerBusinessAssistantMonitor/index.tsx`
- `src/components/mobile/screens/MobileBusinessHealthScreen.tsx`
- `src/components/mobile/sheets/MobileBusinessHealthActionSheet.tsx`
- `src/components/mobile/sheets/MobileBusinessHealthSourceSheet.tsx`
- `src/components/mobile/components/MobileBusinessHealthCard.tsx`
- `src/components/mobile/MobileShell.tsx`
- `src/components/mobile/screens/MobileMoreScreen.tsx`
- `src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx`

Firebase and Functions implementation:

- `functions/src/ownerBusinessAssistant/*`
- `functions/src/decisionBlocksScoring.ts`
- `functions/src/schedulers/menulistMaintenanceScheduler.ts`
- `firestore.rules`
- `firestore.indexes.json`

Shared registry changes:

- `src/config/features.ts`
- `functions/src/constants/features.ts`
- `src/constants/database.ts`
- `functions/src/constants/database.ts`
- `src/constants/common.ts`
- `src/constants/AI/unitCosts.ts`
- `src/lib/ai/operationPresentation.ts`

## Cost Validation

Read model generation:

- Uses existing store-local nightly scheduler path.
- Reuses already-loaded `projectEntries` for health blocks.
- Reads capped analytics dashboard-summary docs only when `ENABLE_OWNER_BUSINESS_HEALTH_ANALYTICS_INDEX` is enabled.
- Writes compact `platformSummary` docs for current health, daily snapshot, and optional analytics index.

Answer hot path:

- Browser cache first through `swrLocalStorageProvider`.
- Browser cache keys include active store and selected menu scope; first-run `not_ready` and missing analytics-index responses are intentionally not cached as reusable business facts.
- Server packet cache via existing Upstash dependency when cache flags/env are enabled.
- Firestore cache-miss path reads only current health and optional analytics index.
- No raw analytics/menu/log collection scans from the answer API.
- Optional answer-event logging writes one compact monitoring document per answer only when usage logging is enabled.
- Answer-event logging is not the billing ledger and does not create owner charge for deterministic answers.

Action path:

- Workflow writes are compact server-side docs only.
- Public menu/store direct mutation remains blocked by guard until a safe existing adapter is used.
- Cleanup runs through the existing consolidated `menulistMaintenanceScheduler`.

## Security Validation

Protected APIs:

- All `/api/owner-business-assistant/*` routes use `withAuth`.
- Tenant/store access is checked with `verifyTenantAccess`.
- Business Health current, analytics, answer, thread, and feedback routes require `VIEW_ANALYTICS`.
- Action routes enforce action-specific permissions through the action registry.
- Zod validates request bodies and thread params.
- Rate limiting runs before Firestore work.
- AI answer path checks SAFE_MODE before provider-backed answers when that flag is enabled.

Firestore:

- Assistant workflow collections are explicit client-deny in `firestore.rules`.
- `ownerBusinessAssistantAnswerEvents` is explicit client-deny and platform-readable only through the protected monitor API.
- APIs and Functions use Admin SDK.
- Business Health chat history reads one deterministic thread doc; no message-history index is required for the active path.

## Validation Commands

Local validation:

```bash
npm run verify:owner-business-assistant
npx tsc --noEmit --incremental false
npm --prefix functions run lint
npm --prefix functions run build
git diff --check
```

All passed.

Firebase deploy validation:

```bash
firebase deploy --only firestore:rules,functions:computeDecisionBlocksScores,functions:triggerStoreNightlyScheduler,functions:menulistMaintenanceScheduler --project ecomsai
```

Deploy result:

- Firestore rules released.
- `computeDecisionBlocksScores` updated.
- `triggerStoreNightlyScheduler` updated.
- `menulistMaintenanceScheduler` updated.
- Assistant message index was created during the earlier two-collection implementation, but the active implementation now reads embedded `messages[]` from the thread doc.

June 8 redeploy result:

- `computeDecisionBlocksScores` updated.
- `triggerStoreNightlyScheduler` updated.
- `menulistMaintenanceScheduler` updated.

June 8 monitoring/history validation:

```bash
npx tsc --noEmit --incremental false
npm --prefix functions run lint
npm --prefix functions run build
git diff --check
firebase deploy --only firestore:rules,functions:menulistMaintenanceScheduler --project ecomsai
```

Result:

- TypeScript passed.
- Functions lint passed with the existing Pages directory warning from the functions ESLint setup.
- Functions build passed.
- Diff whitespace check passed.
- Firestore rules compiled and released.
- `menulistMaintenanceScheduler` updated successfully.
- Follow-up flag-specific cleanup adjustment was revalidated with the same local commands and redeployed with `firebase deploy --only functions:menulistMaintenanceScheduler --project ecomsai`.

June 8 one-doc-per-chat storage validation:

```bash
rg -n "OWNER_BUSINESS_ASSISTANT_MESSAGES|ownerBusinessAssistantMessages|messages collection|message docs|message-history index|0-2 message writes|capped messages query" src functions __docs__/owner-business-assistant __docs__/CHANGELOG.md firestore.rules firestore.indexes.json
npx tsc --noEmit --incremental false
npm --prefix functions run lint
npm --prefix functions run build
git diff --check
firebase deploy --only functions:menulistMaintenanceScheduler --project ecomsai
```

Result:

- Active runtime references to `ownerBusinessAssistantMessages` were removed. The old local index definition was removed too; the remaining collection-name reference is the deny-only Firestore rule plus docs that explicitly describe the inactive legacy guard.
- TypeScript passed.
- Functions lint passed with the existing Pages directory warning from the functions ESLint setup.
- Functions build passed.
- Diff whitespace check passed.
- `menulistMaintenanceScheduler` updated successfully after message cleanup was removed from the scheduler.

June 8 owner-testing enablement validation:

```bash
npx tsc --noEmit --incremental false
npm run lint
npm run build
npm --prefix functions run lint
npm --prefix functions run build
git diff --check
firebase deploy --only functions:computeDecisionBlocksScores,functions:triggerStoreNightlyScheduler,functions:menulistMaintenanceScheduler --project ecomsai
gcloud firestore indexes composite delete projects/ecomsai/databases/'(default)'/collectionGroups/ownerBusinessAssistantMessages/indexes/CICAgPiBmJsK --project=ecomsai --quiet
```

Result:

- Owner-testable Business Health flags are enabled in `src/config/features.ts`: dashboard card, page, suggested questions, free text, context packet cache, analytics index, today overlay, thread history, usage logging, and multi-location awareness.
- Owner-testable Action Support flags are enabled in `src/config/features.ts`: support, navigation, compact drafts, provider-text action availability, and check workflow.
- Cloud Functions Business Health builder/cleanup flags are enabled in `functions/src/constants/features.ts`.
- Provider-backed AI answers, POS-aware answers, confirmed writes, public-truth mutation, media actions, and provider image actions remain disabled for cost and safety. Upstash context packet cache is enabled and safely no-ops when Redis env vars are absent.
- TypeScript passed.
- App lint passed with no warnings or errors.
- Production build passed after restoring the documented build-memory configuration: `webpackBuildWorker: true` and webpack cache disabled for all builds.
- Functions lint passed with the existing Pages directory warning from the functions ESLint setup.
- Functions build passed.
- Diff whitespace check passed.
- Local dev route smoke passed: `/business-health` and `/platform/owner-business-assistant` compiled and returned HTTP 200 shells; `/api/owner-business-assistant/current` compiled and returned the expected unauthenticated `401` to curl without session cookies.
- `computeDecisionBlocksScores`, `triggerStoreNightlyScheduler`, and `menulistMaintenanceScheduler` updated successfully.
- The stale live `ownerBusinessAssistantMessages` composite index was deleted by exact index ID and no longer appears in `firebase firestore:indexes --project ecomsai`.

Index deploy note:

- Full `firebase deploy --only firestore:indexes` was not used because the live Firebase project has indexes not represented in `firestore.indexes.json`; using `--force` would risk deleting unrelated indexes.
- No new Firestore index is required for the current one-doc-per-chat implementation because thread reads are deterministic document reads and messages are embedded in `ownerBusinessAssistantThreads/{threadId}.messages[]`.

June 8 platform navigation wiring validation:

```bash
npx tsc --noEmit --incremental false
npm run lint
git diff --check
```

Result:

- TypeScript passed.
- App lint passed with no warnings or errors.
- Diff whitespace check passed.
- Browser smoke passed for desktop `/platform/owner-business-assistant`: route renders inside Platform settings shell with Business Health Monitor tab selected and monitor cost/question content visible.
- Browser smoke passed for mobile More root: Platform Monitoring section shows Business Health Monitor with the expected description.
- Browser smoke passed for mobile list click and mobile deep link: monitor opens inside `MobilePlatformInternalScreen` with `data-mobile-platform-screen="ownerBusinessAssistantMonitor"`, desktop settings nav absent, and monitor content visible.

June 8 reliability/cost hardening validation:

```bash
npm run verify:owner-business-assistant
npm run build:verify
npm --prefix functions run build
npm run lint
npm --prefix functions run lint
git diff --check
firebase deploy --only functions:computeDecisionBlocksScores,functions:triggerStoreNightlyScheduler --project ecomsai
```

Result:

- Owner Business Assistant hardening verifier passed.
- App TypeScript passed.
- Functions TypeScript passed.
- App lint passed with no warnings or errors.
- Functions lint passed with the existing Pages directory warning from the functions ESLint setup.
- Diff whitespace check passed.
- `computeDecisionBlocksScores` and `triggerStoreNightlyScheduler` updated successfully.

June 8 question suggestions validation:

```bash
npx tsc --noEmit --incremental false
npm run lint
npm --prefix functions run lint
npm --prefix functions run build
git diff --check
cmp -s src/data/shared/ownerBusinessHealthQuestionSuggestions.ts functions/src/sharedData/ownerBusinessHealthQuestionSuggestions.ts; printf '%s\n' $?
curl -I --max-time 5 http://localhost:3000/business-health
curl -I --max-time 8 http://localhost:3000/platform/owner-business-assistant
curl -I --max-time 8 http://localhost:3000/api/owner-business-assistant/current
curl -I --max-time 8 'http://localhost:3000/#mobile/more/business-health'
firebase deploy --only functions:computeDecisionBlocksScores,functions:triggerStoreNightlyScheduler --project ecomsai
```

Result:

- TypeScript passed.
- App lint passed with no warnings or errors.
- Functions lint passed with the existing Pages directory warning from the functions ESLint setup.
- Functions build passed.
- Diff whitespace check passed.
- Shared starter/follow-up question catalog is byte-for-byte identical between `src/data/shared/` and `functions/src/sharedData/`; `cmp` returned `0`.
- Desktop `/business-health` and `/platform/owner-business-assistant` returned HTTP 200 shells from the local dev server.
- Mobile hash shell `/#mobile/more/business-health` returned HTTP 200 from the local dev server.
- Protected `/api/owner-business-assistant/current` returned the expected unauthenticated HTTP 401.
- Starter questions are deterministic packet-ranked chips stored on the current health doc; answer follow-ups are capped to 3 and returned/stored inside the same answer/thread event flow.
- Follow-up suggestions do not create an extra AI provider call, Firestore read, collection, or per-message document.
- Not-ready Health cards no longer show the green "No action needed" state, and Ask controls remain disabled until a source-backed check is available.
- Firebase Functions predeploy lint/build passed, and `computeDecisionBlocksScores` plus `triggerStoreNightlyScheduler` updated successfully in `us-central1`.

June 8 Health screen message UI polish validation:

```bash
npx tsc --noEmit --incremental false
npm run lint
git diff --check
curl -I --max-time 8 http://localhost:3000/business-health
curl -I --max-time 8 'http://localhost:3000/#mobile/more/business-health'
```

Result:

- TypeScript passed.
- App lint passed with no warnings or errors.
- Diff whitespace check passed.
- Desktop `/business-health` and mobile hash shell `/#mobile/more/business-health` returned HTTP 200 from the local dev server.
- Desktop message UI now follows the established chat pattern used by Answerlattice/help chat: assistant avatar, owner/right bubble, Business Health/left bubble, readable role labels, bubble-tail radius, and follow-up chips below the latest assistant answer.
- Mobile Business Health uses the same role-separated bubble structure with 44px follow-up touch targets and no desktop side-panel dependency.
- Latest-assistant follow-up placement is computed from the visible bounded message window, so long thread history does not attach follow-ups to the wrong message.
- In-app browser visual inspection could not reach authenticated owner content in this session because it remained on the app loader with Firebase Auth retry warnings. Authenticated owner-device QA is still required for final visual sign-off.

June 8 final implementation cross-check fixes:

- Suggested-question IDs are now validated against the shared catalog. Unknown IDs return 400, and valid suggested IDs canonicalize the question before answer resolution, thread persistence, and answer-event logging.
- Free-text-disabled mode can no longer be bypassed by sending arbitrary text with a valid suggested-question ID.
- Answer, action, and feedback POST routes now return 400 for invalid JSON instead of leaking a 500 into monitoring.
- Server context-packet cache keys use `p:_` for store aggregate facts and `p:{projectId}` for selected-menu facts because selected-menu analytics now comes from `projectSummaries[projectId]`.
- Non-analytics questions outside available compact domains now return an unsupported/data-not-available answer instead of falling through to the generic Business Health status.
- `useOwnerBusinessAssistantAnswer()` creates or reuses the local thread ID before the first `/answer` call, so the first exchange can be persisted in the one-doc chat history.
- Desktop and mobile chat UIs render the pending owner question and latest answer immediately while the bounded thread doc refreshes, then suppress duplicates by question text and answer ID.

June 8 final implementation validation:

```bash
npx tsc --noEmit --incremental false
npm run lint
npm --prefix functions run lint
npm --prefix functions run build
git diff --check
npm run build
cmp -s src/data/shared/ownerBusinessHealthQuestionSuggestions.ts functions/src/sharedData/ownerBusinessHealthQuestionSuggestions.ts; printf '%s\n' $?
curl -I --max-time 8 http://localhost:3000/business-health
curl -I --max-time 8 'http://localhost:3000/#mobile/more/business-health'
curl -I --max-time 8 http://localhost:3000/api/owner-business-assistant/current
firebase deploy --only functions:computeDecisionBlocksScores,functions:triggerStoreNightlyScheduler --project ecomsai
```

Result:

- TypeScript passed.
- App lint passed with no warnings or errors.
- Functions lint passed with the existing Pages directory warning from the functions ESLint setup.
- Functions build passed.
- Diff whitespace check passed.
- The first production build attempt compiled but failed during page-data collection because `.next/server/pages-manifest.json` was empty from a stale/incomplete local build artifact. Clearing only `.next` and rerunning `npm run build` passed successfully.
- Shared starter/follow-up question catalog is byte-for-byte identical between `src/data/shared/` and `functions/src/sharedData/`; `cmp` returned `0`.
- Desktop `/business-health`, mobile hash shell `/#mobile/more/business-health`, and desktop `/platform/owner-business-assistant` returned HTTP 200 from the local dev server.
- Protected `/api/owner-business-assistant/current` returned the expected unauthenticated HTTP 401.
- Unauthenticated POST probes to answer, action, and feedback returned HTTP 401 before request-body parsing, confirming the auth boundary. Authenticated invalid-JSON regression coverage is still required in API tests.
- `computeDecisionBlocksScores` and `triggerStoreNightlyScheduler` updated successfully in `us-central1`.

June 8 deep review fixes:

- SWR keys for current Health and analytics index now include the active store scope, so same-session store switching cannot reuse another store's in-memory response.
- Missing analytics-index responses are no longer cached as successful `null` data; first-open not-ready state can recover as soon as the scheduler writes the store-day analytics doc.
- Visible chat answer state resets on store or selected-menu scope changes before the next scoped question is answered.
- Store freshness now uses the first available dashboard analytics summary across indexed project entries instead of only the first/default project.
- Analytics index top item/category labels are compacted to string values before writing the shared read model.
- Mobile Business Health send action uses a real send icon with accessible label/title, and starter question chips keep 44px touch targets while supporting multiline text.

June 8 deep review validation:

```bash
npm run build:verify
npm --prefix functions run build
npm run lint
npm --prefix functions run lint
git diff --check
cmp -s src/data/shared/ownerBusinessHealthQuestionSuggestions.ts functions/src/sharedData/ownerBusinessHealthQuestionSuggestions.ts; printf '%s\n' $?
npm run build
firebase deploy --only functions:computeDecisionBlocksScores,functions:triggerStoreNightlyScheduler --project ecomsai
```

Result:

- Build verification passed.
- Functions build passed.
- App lint passed with no warnings or errors.
- Functions lint passed with the existing Pages directory warning from the functions ESLint setup.
- Diff whitespace check passed.
- Shared starter/follow-up question catalog is byte-for-byte identical between `src/data/shared/` and `functions/src/sharedData/`; `cmp` returned `0`.
- Full production build passed.
- Firebase Functions predeploy lint/build passed, and `computeDecisionBlocksScores` plus `triggerStoreNightlyScheduler` updated successfully in `us-central1`.

June 8 final cost/profile review fixes:

- `health_card` packets no longer read the analytics index on cache miss and no longer include selected-menu ids in the server packet cache key, because the card packet does not carry project-scoped analytics facts.
- `analytics_periods` packets read the analytics index only and do not pay a current-health read on cache miss.
- Packet metrics now report the actual compact Firestore read count for the profile instead of a stale hardcoded current+analytics count.
- Server packet cache rejects `not_ready` fallback packets only when both health and analytics source facts are absent, so source-backed packets are not accidentally discarded.
- Multi-location summaries now reuse scoped SWR/localStorage cache on browser repeat opens; cache miss reads the tenant summary doc plus `storesSummary` and never loads every store-specific packet.
- Request schema packet-profile validation now includes the implemented profile names, preventing future callers from relying on the old dashboard/page/answer-only enum.

June 8 final cost/profile validation:

```bash
npm run verify:owner-business-assistant
npm run build:verify
npm run lint
git diff --check
npm run build
```

Additional unchanged-function checks from this pass:

```bash
npm --prefix functions run build
npm --prefix functions run lint
```

Route smoke against `PORT=3017 npm run start` with `x-forwarded-proto: https`:

- `/business-health` returned HTTP 200 HTML.
- `/platform/owner-business-assistant` returned HTTP 200 HTML.
- `/api/owner-business-assistant/current` returned HTTP 401 JSON unauthenticated.
- `/api/owner-business-assistant/locations` returned HTTP 401 JSON unauthenticated.
- `/api/owner-business-assistant/answer` returned HTTP 401 JSON unauthenticated.

Result:

- Targeted hardening verifier passed.
- TypeScript passed.
- App lint passed with no warnings or errors.
- Diff whitespace check passed.
- Full production build passed after the final schema/cache edits.
- Functions build passed.
- Functions lint passed with the existing Pages directory warning from the functions ESLint setup.

## Known Enablement Notes

- No website copy was changed.
- Owner-testable Business Health, Action Support, and Upstash packet cache flags are enabled. Provider-backed AI answers, confirmed writes, public-truth mutation, media actions, image provider actions, and POS-aware answers remain disabled for cost and safety.
- Before enabling owner-visible UI, run manual QA on desktop dashboard, `/business-health`, mobile More screen, current/analytics/answer/action APIs, and scheduler/manual recovery output.
- Public-truth direct assistant mutation remains intentionally guarded. Owners should be routed to existing MenuList editor/publish flows for menu/store truth changes until a verified adapter reuses the same cache invalidation and validation path.

## June 8 ChatGPT Feedback Hardening Pass

Validated feedback:

- Multi-location tenant summary permission filtering was already implemented in `/api/owner-business-assistant/locations`: the API reads `platformSummary/ownerBusinessHealthMultiLocation_{tId}` through Admin SDK, filters rows by mapped store access for the current session, and never makes that doc directly client-readable.
- Direct public-truth mutations remain disabled through `ENABLE_OWNER_BUSINESS_ACTION_CONFIRMED_WRITES=false`, `ENABLE_OWNER_BUSINESS_ACTION_PUBLIC_TRUTH=false`, and `ENABLE_OWNER_BUSINESS_ACTION_MEDIA=false`.
- Client-side public cache helpers already clear Business Health browser cache prefixes after project/store public-truth saves.

Fixes from this pass:

- Added `OWNER_BUSINESS_ASSISTANT_CACHE.browserReadModelTtlMs` and wired current, analytics, and locations hooks through it, so browser read-model caches cannot keep same-day Business Health facts for the full scheduler day after a missed local invalidation.
- Added `owner-business-assistant:packet-index:v1:{tId}:{sId}` to app and Functions packet cache invalidation. Packet writes add exact keys to the index; invalidation deletes indexed keys first and still runs a bounded legacy sweep so pre-index keys cannot survive until TTL.
- Desktop and mobile multi-location rows now show per-outlet freshness (`Checked {date}`) because outlet checks can rebuild at different local times.
- Architecture, implementation, Firebase cost, test-case, and changelog docs now describe the actual browser stale guard, packet key index, bounded legacy sweep, and per-location freshness behavior.

Validation commands:

```bash
npm run verify:owner-business-assistant
git diff --check
npm run build:verify
npm --prefix functions run build
npm run lint
npm --prefix functions run lint
npm run build
firebase deploy --only functions:computeDecisionBlocksScores,functions:triggerStoreNightlyScheduler --project ecomsai
```

Result:

- Targeted Business Health hardening verifier passed.
- Diff whitespace check passed.
- App TypeScript passed.
- Functions TypeScript build passed.
- App lint passed with no warnings or errors.
- Functions lint passed with the existing Pages directory warning from the Functions ESLint setup.
- Full production build passed.
- Firebase Functions predeploy lint/build passed, and `computeDecisionBlocksScores` plus `triggerStoreNightlyScheduler` updated successfully in `us-central1`.

Route smoke against `PORT=3017 npm run start` with `x-forwarded-proto: https`:

- `/business-health` returned HTTP 200 HTML.
- `/platform/owner-business-assistant` returned HTTP 200 HTML.
- `/api/owner-business-assistant/current` returned HTTP 401 JSON unauthenticated.
- `/api/owner-business-assistant/locations` returned HTTP 401 JSON unauthenticated.
- `/api/owner-business-assistant/answer` returned HTTP 401 JSON unauthenticated.

Browser QA note:

- In-app Browser could not open `http://localhost:3017/business-health` or `http://127.0.0.1:3017/business-health`; both attempts were blocked by the browser client with `ERR_BLOCKED_BY_CLIENT`.
- Authenticated owner-device QA remains required for final visual sign-off because local Browser access and authenticated owner content are not available in this pass.

## June 8 Reviewer Follow-Up Fixes

Validated reviewer findings:

- The dashboard analytics strip was reading the current Health card path. Because `health_card` packets skip analytics reads, selected-menu views could show store-wide teaser data instead of project-scoped analytics.
- The locations hook used a scoped localStorage key but an unscoped SWR key, so same-session tenant/store switches could reuse the previous locations response during the dedupe window.
- The locations API filtered the tenant summary by access only. A deactivated outlet with an old `ownerBusinessHealthMultiLocation_{tId}.stores.{sId}` row could keep appearing because the scheduler skips inactive stores and would not rewrite that row.

Fixes:

- `BusinessHealthAnalyticsStrip` now reads `useOwnerBusinessAnalyticsIndex(projectId, storeScopeKey)` and builds its tiles from the scoped analytics-index periods.
- `useOwnerBusinessLocationsSummary` now includes scope in the SWR key: `[OWNER_BUSINESS_ASSISTANT_ENDPOINTS.locations, scope]`.
- `/api/owner-business-assistant/locations` now reads `storesSummary`, parses legacy/nested summary shapes, filters inactive stores before permission filtering, and reports `firestoreReadCount: 2`.

Validation commands:

```bash
npm run verify:owner-business-assistant
git diff --check
npm run build:verify
npm run lint
```

Result:

- Targeted Business Health hardening verifier passed.
- Diff whitespace check passed.
- App TypeScript passed.
- App lint passed with no warnings or errors.

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
- Default flags are false, so existing owner dashboard, mobile shell, and Firebase hot paths do not change until enablement.

## June 8 Cross-Check Fixes

- Business Health priority-check buttons are hidden unless the matching Action Support flags are enabled.
- Priority-check `Open` now calls the action route and navigates only to existing registered routes.
- The old `/analytics` action target was corrected to the existing `/dashboard` route.
- Suggested "today" questions are omitted when the scheduler did not build a today period, and explicit today questions refuse instead of falling back to another period.
- Cached context packets refresh the action catalog from current flags before answering, so emergency Action Support disables are not delayed by server packet cache TTL.
- Thread persistence is opt-in under `ENABLE_OWNER_BUSINESS_HEALTH_THREADS` and writes only when the client supplies a bounded `threadId`.
- Review-reply and temporary-status prepare actions now create compact draft docs instead of falling through to a generic blocked result.
- Check mark/dismiss actions now use one compact audit write instead of a duplicate write.
- Mobile Business Health now opens returned action options through the action sheet only when Action Support is enabled.

## June 8 Monitoring And History Additions

- Owner-visible chat history is implemented only under `ENABLE_OWNER_BUSINESS_HEALTH_THREADS`; the client creates a bounded local `threadId`, `/answer` persists the exchange only when that ID is present, and `/thread/[threadId]` returns serialized JSON.
- Chat history uses one `ownerBusinessAssistantThreads/{threadId}` document with capped `messages[]`; it does not create one document per chat message.
- Internal answer-event logging is implemented separately under `ENABLE_OWNER_BUSINESS_HEALTH_USAGE_LOGGING`.
- Deterministic/template answers log zero units, zero internal cost, and zero owner charge.
- Current `aiAnswerClient` returns the deterministic grounded fallback; Business Health answer provider spend is zero until a real provider-backed answer adapter is wired and sets `providerUsed`.
- Platform-only monitor route `/api/platform/owner-business-assistant/monitor` summarizes recent answer events, actions, feedback, unsupported gaps, provider calls, units, internal cost, and owner charge.
- Internal UI route `/platform/owner-business-assistant` is linked from Ops Control Room.
- AI operation presentation now labels Business Health answer/draft operations for existing transaction dashboards if provider-backed accounting is enabled.
- Maintenance cleanup is flag-specific so disabled threads, answer events, feedback, and drafts do not add collection queries. Embedded messages expire with the thread doc.

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
- Analytics/answer read routes require `VIEW_ANALYTICS`.
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

- Active runtime references to `ownerBusinessAssistantMessages` were removed. Remaining references are the deny-only Firestore rule, inactive local index definition, and docs that explicitly describe the inactive legacy path.
- TypeScript passed.
- Functions lint passed with the existing Pages directory warning from the functions ESLint setup.
- Functions build passed.
- Diff whitespace check passed.
- `menulistMaintenanceScheduler` updated successfully after message cleanup was removed from the scheduler.

June 8 owner-testing enablement validation:

```bash
npx tsc --noEmit --incremental false
npm --prefix functions run lint
npm --prefix functions run build
git diff --check
firebase deploy --only functions:computeDecisionBlocksScores,functions:triggerStoreNightlyScheduler,functions:menulistMaintenanceScheduler --project ecomsai
```

Result:

- Owner-testable Business Health flags are enabled in `src/config/features.ts`: dashboard card, page, suggested questions, free text, context packet cache, analytics index, today overlay, thread history, usage logging, and multi-location awareness.
- Owner-testable Action Support flags are enabled in `src/config/features.ts`: support, navigation, compact drafts, provider-text action availability, and check workflow.
- Cloud Functions Business Health builder/cleanup flags are enabled in `functions/src/constants/features.ts`.
- Provider-backed AI answers, Upstash context packet cache, POS-aware answers, confirmed writes, public-truth mutation, media actions, and provider image actions remain disabled for cost and safety.
- TypeScript passed.
- Functions lint passed with the existing Pages directory warning from the functions ESLint setup.
- Functions build passed.
- Diff whitespace check passed.
- `computeDecisionBlocksScores`, `triggerStoreNightlyScheduler`, and `menulistMaintenanceScheduler` updated successfully.

Index deploy note:

- Full `firebase deploy --only firestore:indexes` was not used because the live Firebase project has indexes not represented in `firestore.indexes.json`; using `--force` would risk deleting unrelated indexes.
- No Firestore index deploy is required for the current one-doc-per-chat implementation because thread reads are deterministic document reads and messages are embedded in `ownerBusinessAssistantThreads/{threadId}.messages[]`.

## Known Enablement Notes

- No website copy was changed.
- Owner-testable Business Health and Action Support flags are enabled. Provider-backed AI answers, Upstash packet cache, confirmed writes, public-truth mutation, media actions, image provider actions, and POS-aware answers remain disabled for cost and safety.
- Before enabling owner-visible UI, run manual QA on desktop dashboard, `/business-health`, mobile More screen, current/analytics/answer/action APIs, and scheduler/manual recovery output.
- Public-truth direct assistant mutation remains intentionally guarded. Owners should be routed to existing MenuList editor/publish flows for menu/store truth changes until a verified adapter reuses the same cache invalidation and validation path.

# Platform Founder Monitor Firebase Notes

## Subscription Revenue Projection

Payment-evidence validation is in-memory on subscription rows already read by
the bounded snapshot job. It adds no Firestore read, write, delete, collection,
index, Storage operation, provider call, or standalone scheduler. Current MRR
requires verified payment and a current paid window; past-due MRR requires prior
verified payment; unpaid pending checkout is attention-only.

## Reads

The monitor is platform-only and manual-refresh. It reads precomputed sources:

- `platformSummary/founderMonitorSnapshot`: 1 document
- `platformSummary/founderMonitorRevenue`: 1 document
- `platformSummary/founderMonitorGrowth`: 1 document
- `platformSummary/founderMonitorRevenueDaily_YYYY-MM-DD`: 1 document per selected day
- `founderRevenueMovements`: capped at 40 documents

Worst-case manual refresh budget: 3 summary reads, up to 90 daily summary reads, and 40 capped movement reads. There are no listeners and no hot-path platform collection fan-out from the API.

## Writes

Dashboard refresh writes none.

Revenue runtime writes:

- `founderRevenueMovements/{movementId}`: one idempotent movement document per collected cash, failed payment, new MRR, churn, refund, expansion, or downgrade event.
- `founderOnboardingTransitions/{storeId}`: seeded with `paymentAt` on new MRR movement when a store ID is present.
- `platformSummary/founderMonitorRevenue`: live summary counters updated by the same transaction.
- `platformSummary/founderMonitorRevenueDaily_YYYY-MM-DD`: daily summary counters updated by the same transaction.
- `publicMenuDrafts/{draftId}.growthTelemetry` plus `platformSummary/founderMonitorGrowth`: one temporary marker update and one counter merge for each allowlisted attributed draft/claim. Existing 24-hour draft cleanup removes the marker.

Structured cancellation reason counters are nested fields in the existing founder revenue summary writes. They do not add a read, write, collection, query, index, listener, or scheduled function beyond the existing first accepted churn movement.

Scheduler writes every 30 minutes from the 30-minute `menulistMaintenanceScheduler` task `founder_monitor_snapshot`:

- `platformSummary/founderMonitorSnapshot`: store, onboarding, truth, support, risk, and source-gap snapshot.
- `platformSummary/founderMonitorRevenue`: store/reconciliation fields; revenue totals are overwritten only when the bounded subscription reconciliation is not capped.
- `platformSummary/founderMonitorRevenueDaily_YYYY-MM-DD`: daily movement reconciliation for the current India business day.
- `founderOnboardingTransitions/{storeId}`: transactionally completes up to 50 observed missing `firstLiveAt` / `timeToLiveHours` records per run. Each selected row is re-read before write; conflicting scope and already-complete rows are not overwritten. When the capped collection read is incomplete or unavailable, a non-sampled row is not treated as absent.
- `systemAlerts`: bounded Founder Monitor exception alerts for failed payments, paid-not-live stores, stale/broken stores, and critical support tickets. Existing alert cooldown logic controls repeat alerts.

Founder Monitor revenue document-ID admission is Firebase-cost neutral. `src/lib/ops/founderRevenueReadModel.ts` validates movement IDs with `src/lib/firebase/firestoreDocumentId.ts` and requires transition store IDs to be exact positive numeric MenuList store document IDs before the same guard, before `founderRevenueMovements/{movementId}` and `founderOnboardingTransitions/{storeId}` refs. Valid movement and store IDs keep the same writes; malformed, reserved, empty, path-shaped, whitespace-mutated, zero, negative, unsafe, leading-zero, or nonnumeric IDs return for optional callers and reject required financial callers before invalid refs. This adds no reads, writes, deletes, rules, indexes, Cloud Functions, provider calls, deploy action, or owner/platform setting.

Scheduler reads for store coverage:

- `platformSummary/storesSummary`: 1 document for all store identity/status/publish/distribution summary fields.
- `supportTickets`: latest 200 rows; only exact Answerlattice product rows with agreeing tenant/store aliases and a matching canonical MenuList tenant+store summary scope contribute to the snapshot.
- `founderOnboardingTransitions`: latest 500 rows; document ID and all present embedded store aliases must agree, and present tenant aliases must agree with the canonical store-summary tenant before use.
- The scheduler does not query `stores` for Founder Monitor store rows.
- Store distribution signals are mirrored into `storesSummary.stores.{storeId}.menuPresence` as bounded presence hints when owners confirm Google Business, Instagram bio, or WhatsApp profile setup.

The scope repair keeps the existing capped collection read and adds up to 50 transaction point reads for selected completion candidates. It changes persisted-row admission before aggregation and makes completion writes transaction-current; malformed, conflicting, wrong-product, foreign-tenant, already-complete, or non-sampled rows are excluded rather than attributed or overwritten through stale sampled state. No collection, index, rule, cache, provider operation, or standalone scheduled function was added.

Backfill writes, only when explicitly confirmed:

- `founderRevenueMovements/{movementId}`
- `founderOnboardingTransitions/{storeId}`
- `platformSummary/founderMonitorRevenue`
- `platformSummary/founderMonitorRevenueDaily_YYYY-MM-DD`

Backfill command:

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-founder-revenue-read-model.ts --project-id menulist-qa
```

Write mode requires `--write --confirm-project <projectId> --all-founder-revenue`.

## Indexes

No new Firestore index file entry is declared by this feature. The API catches summary and movement-read failures and reports source coverage instead of failing the whole screen.

The current query shapes are:

- `founderRevenueMovements.orderBy('occurredAt', 'desc').limit(40)`
- `founderRevenueMovements.where('businessDayKey', '==', todayKey).limit(500)`
- `founderOnboardingTransitions.limit(500)`

Required Razorpay revenue projection does not add a Firestore operation. A successful movement retains the existing one transaction with one movement read and the same movement/summary/daily/optional transition writes; a duplicate retains the existing movement read and zero writes. The change is failure semantics: required provider-backed movements reject after a failed transaction so the signed webhook or authenticated idempotent API replay can retry instead of acknowledging missing derived truth. The maintained demo emulator clears inherited Google credentials and injects a transaction failure to prove this behavior.

MenuList revenue identity is explicit: absent/other product IDs are ignored, and subscription lifecycle movements require exact dual `ML` identity plus agreeing numeric tenant/store aliases. Top-up webhook projection uses the already-settled subscription scope and immutable settlement amount; it does not add a provider call, Firestore read, write, index, or cache operation beyond the existing settlement and deterministic movement transaction.

Required movement admission validates scalar runtime shape before Firestore: paise/prior-MRR values are exact nonnegative safe integers, subscription quantity is absent or an exact positive safe integer, computed MRR remains safe, and a supplied event time is valid. Malformed required values reject for retry instead of being rounded, coerced to zero, or moved to the current India-day document. These checks add no read, write, index, Storage or provider operation.

Subscription-linked webhook revenue uses the exact product subscription as workspace authority and caches that exact read for later status/message work in the same request. Existing subscription lifecycle paths therefore add no duplicate read. A refund path that previously had no subscription consumer may add at most one exact subscription-document read to prove tenant/store attribution. Unknown non-top-up orders no longer write a movement or summary counter; maintained top-up `order.paid` keeps its existing snapshot/current-subscription reads and deterministic movement transaction.

## Security

The API uses:

- `withPlatformAuth`
- Zod query validation
- `DATA_READ` rate limiting
- bounded logging context
- generic user-facing errors

No customer, owner, or public endpoint is added.

## Deploy Boundary

This feature changes Next.js app/API code and Firebase Cloud Function scheduler logic. The Functions side must be validated with `npm --prefix functions run build` and deployed with the scoped MenuList QA target:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:menulistMaintenanceScheduler --non-interactive
```

## Billing source scope and cost (July 22, 2026)

Exact projection adds no Firestore read/write/index/Storage/provider operation. Founder Monitor keeps the existing capped product query, filters ambiguous rows in memory and retains the raw-cap reconciliation-limited signal. The dry-run-by-default revenue backfill likewise rejects conflicting aliases before constructing or writing deterministic movement IDs.
The Admin writer is not treated as sufficient runtime validation. `src/data/shared/founderMonitorPersistedBoundary.ts` and its byte-identical Functions mirror reproject every movement returned to the platform route or consumed by scheduled reconciliation. They reject conflicting product/day/scope identity, coercible amounts, arbitrary date strings and malformed text/kinds. The scheduler excludes invalid rows, logs one bounded error and records a data gap before replacing daily counters. Precomputed numeric summary fields are exact safe integers or absent; malformed persisted counters make the protected route fail visibly for repair.

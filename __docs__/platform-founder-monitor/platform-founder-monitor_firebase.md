# Platform Founder Monitor Firebase Notes

## Reads

The monitor is platform-only and manual-refresh. It reads precomputed sources:

- `platformSummary/founderMonitorSnapshot`: 1 document
- `platformSummary/founderMonitorRevenue`: 1 document
- `platformSummary/founderMonitorRevenueDaily_YYYY-MM-DD`: 1 document per selected day
- `founderRevenueMovements`: capped at 40 documents

Worst-case manual refresh budget: 2 summary reads, up to 90 daily summary reads, and 40 capped movement reads. There are no listeners and no hot-path platform collection fan-out from the API.

## Writes

Dashboard refresh writes none.

Revenue runtime writes:

- `founderRevenueMovements/{movementId}`: one idempotent movement document per collected cash, failed payment, new MRR, churn, refund, expansion, or downgrade event.
- `founderOnboardingTransitions/{storeId}`: seeded with `paymentAt` on new MRR movement when a store ID is present.
- `platformSummary/founderMonitorRevenue`: live summary counters updated by the same transaction.
- `platformSummary/founderMonitorRevenueDaily_YYYY-MM-DD`: daily summary counters updated by the same transaction.

Scheduler writes every 30 minutes from the 30-minute `menulistMaintenanceScheduler` task `founder_monitor_snapshot`:

- `platformSummary/founderMonitorSnapshot`: store, onboarding, truth, support, risk, and source-gap snapshot.
- `platformSummary/founderMonitorRevenue`: store/reconciliation fields; revenue totals are overwritten only when the bounded subscription reconciliation is not capped.
- `platformSummary/founderMonitorRevenueDaily_YYYY-MM-DD`: daily movement reconciliation for the current India business day.
- `founderOnboardingTransitions/{storeId}`: completes up to 50 missing `firstLiveAt` / `timeToLiveHours` records per run.
- `systemAlerts`: bounded Founder Monitor exception alerts for failed payments, paid-not-live stores, stale/broken stores, and critical support tickets. Existing alert cooldown logic controls repeat alerts.

Founder Monitor revenue document-ID admission is Firebase-cost neutral. `src/lib/ops/founderRevenueReadModel.ts` validates movement IDs with `src/lib/firebase/firestoreDocumentId.ts` and requires transition store IDs to be exact positive numeric MenuList store document IDs before the same guard, before `founderRevenueMovements/{movementId}` and `founderOnboardingTransitions/{storeId}` refs. Valid movement and store IDs keep the same writes; malformed, reserved, empty, path-shaped, whitespace-mutated, zero, negative, unsafe, leading-zero, or nonnumeric IDs return before invalid refs. This adds no reads, writes, deletes, rules, indexes, Cloud Functions, provider calls, deploy action, or owner/platform setting.

Scheduler reads for store coverage:

- `platformSummary/storesSummary`: 1 document for all store identity/status/publish/distribution summary fields.
- The scheduler does not query `stores` for Founder Monitor store rows.
- Store distribution signals are mirrored into `storesSummary.stores.{storeId}.menuPresence` as bounded presence hints when owners confirm Google Business, Instagram bio, or WhatsApp profile setup.

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

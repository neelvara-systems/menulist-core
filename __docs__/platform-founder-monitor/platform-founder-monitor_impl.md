# Platform Founder Monitor Implementation

## Architecture

The implementation follows the internal platform monitor pattern:

1. `src/app/(main)/platform/layout.tsx` gates the route with `requirePlatformAdminRouteAccess()`.
2. `src/app/api/platform/founder-monitor/route.ts` gates the API with `withPlatformAuth`.
3. The API validates query input with Zod.
4. The API rate-limits with the shared `DATA_READ` profile.
5. Razorpay runtime routes write small idempotent revenue movement records when money changes.
6. The shared MenuList maintenance scheduler refreshes the platform snapshot every 30 minutes.
7. The API reads bounded precomputed summaries and returns one compact response.
8. The browser DAL reads the response with `readJsonResponseWithLimit`.
9. The UI renders cards, tables, data gaps, and source coverage.

## Data Sources

| Source | Use | Boundary |
| --- | --- | --- |
| `platformSummary/founderMonitorSnapshot` | Precomputed store, onboarding, support, and truth snapshot | 1 read |
| `platformSummary/founderMonitorRevenue` | Live revenue summary updated by transaction-time Razorpay writes and reconciled by scheduler | 1 read |
| `platformSummary/founderMonitorRevenueDaily_YYYY-MM-DD` | Selected-period daily revenue counters | 1 read per selected day |
| `founderRevenueMovements` | Latest revenue movement rows | Capped read; API returns hashed row identifiers, not provider payment/order IDs |
| `founderOnboardingTransitions` | Payment-to-first-live timestamps completed by the scheduler | Scheduler-only read/write; dashboard reads precomputed average |
| `platformSummary/storesSummary` | Platform-wide store identity, status, plan, publish, and lightweight distribution-presence hints | Scheduler-only 1-read source; no raw `stores` collection scan |

## Revenue Read Model

Revenue is not calculated by scanning subscriptions or payment transactions during dashboard refresh. Runtime billing paths write idempotent movement IDs:

- `cash:<paymentId>` for collected Razorpay subscription/order payments.
- `failed_payment:<paymentId or webhookEventKey>` for failed or halted payment events.
- `new_mrr:<subscriptionId>` when a subscription first becomes active recurring revenue.
- `churn:<subscriptionId>` when a subscription leaves recurring revenue.
- `refund:<refundId or paymentId or webhookEventKey>` when Razorpay reports a processed refund.
- `expansion_mrr:<subscriptionId>:<eventKey>` and `downgrade_mrr:<subscriptionId>:<eventKey>` when quantity or replacement subscription MRR changes.

Those movements are stored in `founderRevenueMovements`. The same transaction increments `platformSummary/founderMonitorRevenue` and `platformSummary/founderMonitorRevenueDaily_YYYY-MM-DD`.

Founder revenue movement document IDs and payment-to-live transition store IDs pass through `src/lib/firebase/firestoreDocumentId.ts` before Admin Firestore refs. Valid Razorpay-derived `cash:...`, `failed_payment:...`, `new_mrr:...`, `churn:...`, `refund:...`, `expansion_mrr:...`, and `downgrade_mrr:...` movement IDs keep the same deterministic write shape; malformed, reserved, empty, or path-shaped movement/store IDs return without creating invalid `founderRevenueMovements/{movementId}` or `founderOnboardingTransitions/{storeId}` refs.

New MRR movement writes also seed `founderOnboardingTransitions/{storeId}` with `paymentAt`. The 30-minute scheduler completes `firstLiveAt` and `timeToLiveHours` once the store has a published menu. Historical data can be seeded with `scripts/backfill-founder-revenue-read-model.ts`, which is dry-run by default and uses Firestore billing/audit documents only.

The 30-minute scheduler task `founder_monitor_snapshot` refreshes operational store/support/truth data from `platformSummary/storesSummary` plus bounded support, subscription, movement, and onboarding sources. It does not read every store document. Revenue fields are reconciled only when the bounded subscription read is complete. If a safety cap is hit, the scheduler records a data gap and leaves transaction-time revenue as the live source.

The same task emits bounded founder risk alerts through `systemAlerts` for failed payments, paid-not-live stores, stale/broken stores, and critical support tickets. Alert delivery uses the existing platform notification/Telegram/email pipeline and cooldown behavior.

## Metrics

The response returns:

- `scorecard`
- `revenue`
- `storeTruth`
- `onboarding`
- `support`
- `storeRows`
- `revenueMovement`
- `dataGaps`
- `sourceCoverage`

## Known Estimate Boundaries

Net New MRR, expansion, downgrade, churn, failed-payment, refund, and cash-collected movement comes from the durable founder revenue summaries and movement ledger. If those summaries have not been populated yet, the API returns source coverage and a data gap instead of estimating from hot-path collection scans.

Store views are intentionally not scanned. The monitor does not fan out into per-store analytics documents.

Store identity and distribution readiness are intentionally summary-backed. Manual discovery confirmations mirror a bounded `menuPresence` entry into `platformSummary/storesSummary`, so the Founder Monitor can count Active Distribution Stores without reading each store document.

Average time to live comes from the capped `founderOnboardingTransitions` ledger. If the ledger is empty or capped, the snapshot records a source gap instead of estimating inside the dashboard request.

## UI

The first tab is the command center. Additional tabs show:

- Tenant/store operations
- Revenue movement
- Source coverage

## Mobile

The screen is available in the mobile platform wrapper through `founderMonitor`. It is not a restaurant owner mobile screen and does not change owner workflows.

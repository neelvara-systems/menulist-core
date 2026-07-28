# Platform Founder Monitor Implementation

July 16 authorization follow-up: `/api/platform/founder-monitor` keeps signed platform admission, then applies a fail-closed DATA_READ limiter and re-reads the exact current persisted platform user before any Founder summary, daily revenue, growth or movement read. Provider outage returns 503 and stale/downgraded/revoked authority returns 403.

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
10. The API also reads the bounded `founderMonitorGrowth` summary for allowlisted draft/claim source counts.

## Data Sources

| Source | Use | Boundary |
| --- | --- | --- |
| `platformSummary/founderMonitorSnapshot` | Precomputed store, onboarding, support, and truth snapshot | 1 read |
| `platformSummary/founderMonitorRevenue` | Live revenue summary updated by transaction-time Razorpay writes and reconciled by scheduler | 1 read |
| `platformSummary/founderMonitorGrowth` | Idempotent attributed draft and claimed-business counters by fixed source | 1 read |
| `platformSummary/founderMonitorRevenueDaily_YYYY-MM-DD` | Selected-period daily revenue counters | 1 read per selected day |
| `founderRevenueMovements` | Latest revenue movement rows | Capped read; API returns hashed row identifiers, not provider payment/order IDs |
| `founderOnboardingTransitions` | Payment-to-first-live timestamps completed by the scheduler | Scheduler-only read/write; dashboard reads precomputed average |
| `platformSummary/storesSummary` | Platform-wide store identity, status, plan, publish, and lightweight distribution-presence hints | Scheduler-only 1-read source; no raw `stores` collection scan |

## Revenue Read Model

**July 26 status and request-lifetime hardening:** the API resolves persisted snapshot status through `normalizeFounderMonitorStatus()`. Only `healthy`, `watch`, `action_required`, and `setup_required` are admitted; missing, malformed, object, or future values fail to `setup_required` rather than presenting unknown operational truth as healthy. The desktop/mobile-wrapper command center uses the shared latest-request guard and mounted ownership for every period load. Switching between 7, 30, 60, and 90 days clears the prior view, invalidates older requests, and permits only the latest selected period to settle data, error, and loading state.

Revenue is not calculated by scanning subscriptions or payment transactions during dashboard refresh. Runtime billing paths write idempotent movement IDs:

- `cash:<paymentId>` for collected Razorpay subscription/order payments.
- `failed_payment:<paymentId or webhookEventKey>` for failed or halted payment events.
- `new_mrr:<subscriptionId>` when a subscription first becomes active recurring revenue.
- `churn:<subscriptionId>` when a subscription leaves recurring revenue.
- `refund:<refundId or paymentId or webhookEventKey>` when Razorpay reports a processed refund.
- `expansion_mrr:<subscriptionId>:<eventKey>` and `downgrade_mrr:<subscriptionId>:<eventKey>` when quantity or replacement subscription MRR changes.

Those movements are stored in `founderRevenueMovements`. The same transaction increments `platformSummary/founderMonitorRevenue` and `platformSummary/founderMonitorRevenueDaily_YYYY-MM-DD`.

Razorpay cash-collected, failed-payment, and refund events use required projection mode: an invalid deterministic ID or Firestore transaction failure rejects the caller so webhook/API replay can retry. Top-up verification writes the deterministic cash movement before the credit-balance transaction; if either step fails, replay sees the same movement/payment identity and completes the missing side without double counting. Optional non-financial projection callers retain bounded logging and a non-recorded result.

Subscription new-MRR, churn, replacement, and quantity-change movements use the same required retry contract. Applied and duplicate activation/cancellation paths both attempt the deterministic movement, so a state transition that committed before projection failure is repairable. Quantity-change MRR is projected from the current subscription plus the proposed quantity before the subscription update; this preserves the prior-MRR basis across retry.

The ledger is MenuList-only: missing product identity is not treated as `ML`, and subscription-driven movements require both exact `ML` aliases plus agreeing numeric tenant/store aliases through the shared entitlement-scope projector. Top-up webhook cash movement is written only after immutable top-up/provider evidence and the transaction-current subscription settle successfully; raw provider-note scope is not revenue authority.

Required financial projection also fails closed on scalar shape before any transaction: direct paise amounts and prior-MRR values must be exact nonnegative safe integers, subscription amounts must be exact nonnegative safe integers, an optional quantity must be an exact positive safe integer, and an explicitly supplied event time must parse as a valid instant. This prevents a coercible or invalid first delivery from occupying a deterministic movement ID with zero/wrong value or the wrong India-day bucket. Optional diagnostic callers retain bounded compatibility normalization; an omitted event time still uses the current instant.

The Razorpay boundary preserves that evidence before calling the ledger: provider cash/refund/failure amounts must be positive safe-integer paise and provider timestamps must be positive safe-integer seconds. Subscription-linked webhook movement scope comes only from the exact product subscription projector, using a request-local cached read; provider notes are never workspace authority. A required movement carrying a subscription ID must carry the paired exact numeric tenant/store scope. `order.paid` enters collected-cash truth only after the maintained immutable top-up settlement; an unknown non-top-up order remains in bounded payment audit history and cannot inflate MenuList cash.

The adjacent `payment_transactions/{eventKey}` audit is also immutable financial evidence: exact dual product and paired scope, event/type, provider entity IDs, amount, currency and provider time cannot change on replay. Top-up audit history is created only after the same settlement provides canonical billing scope/value. This prevents a partial malformed audit write from becoming owner-visible before required revenue projection rejects.

Owner-initiated churn movements may include one stable cancellation reason code. The same first-write transaction increments the matching reason counter; replaying `churn:<subscriptionId>` does not double-count it. Free-form cancellation detail is never copied into the movement description or founder summary.

Founder revenue movement document IDs pass through `src/lib/firebase/firestoreDocumentId.ts`, and payment-to-live transition store IDs use exact positive numeric MenuList store document scope before the same Firestore document-ID guard. Valid Razorpay-derived `cash:...`, `failed_payment:...`, `new_mrr:...`, `churn:...`, `refund:...`, `expansion_mrr:...`, and `downgrade_mrr:...` movement IDs keep the same deterministic write shape. Malformed, reserved, empty, path-shaped, whitespace-mutated, zero, negative, unsafe, leading-zero, or nonnumeric IDs return for optional callers and reject required financial callers before any invalid `founderRevenueMovements/{movementId}` or `founderOnboardingTransitions/{storeId}` ref is created.

New MRR movement writes also seed `founderOnboardingTransitions/{storeId}` with `paymentAt`. The 30-minute scheduler completes `firstLiveAt` and `timeToLiveHours` once the store has a published menu. Completion is transaction-current: the scheduler re-reads every selected document, refuses conflicting tenant/store scope, preserves an existing payment/first-live timestamp, and does not overwrite an already complete row. If the bounded transition query is unavailable or capped, absence is not proof that an unobserved row is missing; the scheduler completes only observed incomplete rows and records a source gap instead of blind-merging sampled-out truth. Historical data can be seeded with `scripts/backfill-founder-revenue-read-model.ts`, which is dry-run by default and uses Firestore billing/audit documents only.

The 30-minute scheduler task `founder_monitor_snapshot` refreshes operational store/support/truth data from `platformSummary/storesSummary` plus bounded support, subscription, movement, and onboarding sources. It does not read every store document. Revenue fields are reconciled only when the bounded subscription read is complete. If a safety cap is hit, the scheduler records a data gap and leaves transaction-time revenue as the live source.

Support evidence is admitted only when at least one persisted product alias is present and every present `pId`/`productId` equals exact `AL`, because Answerlattice owns the support-ticket contract. Every present `tId`/`tenantId` and `sId`/`storeId` alias must normalize and agree. Counts are keyed by tenant plus store and included only when that exact scope exists in the canonical MenuList store summary, so a conflicting, wrong-product, malformed, or same-store-ID foreign-tenant row cannot change Founder Monitor risk truth. Onboarding transition document IDs and embedded store aliases must agree; present tenant aliases must agree and, when present, match the summary tenant before payment-to-live state is consumed.

The same task emits bounded founder risk alerts through `systemAlerts` for failed payments, paid-not-live stores, stale/broken stores, and critical support tickets. Alert delivery uses the existing platform notification/Telegram/email pipeline and cooldown behavior.

## Metrics

The response returns:

- `scorecard`
- `revenue`
- `growth`
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

## Exact billing source projection (July 22, 2026)

Founder Monitor subscription reconciliation and the guarded revenue backfill exclude records unless product and both tenant/store aliases are exact and agreeing. Canonical projected scope supplies store/tenant identity for internal MRR, churn, pending and client rows. When a bounded source page contains conflicts, the monitor remains conservatively limited rather than counting ambiguous financial truth.
Persisted revenue truth is admitted through one byte-identical app/Functions boundary. Movement rows require exact dual-MenuList product identity, the queried business day during scheduled reconciliation, a known kind, exact nonnegative safe-integer paise, Firestore-owned time, bounded description and either a complete agreeing canonical tenant/store alias set or a wholly unscoped record. The scheduler excludes malformed rows with a bounded error and visible data gap before rewriting daily summaries. Route summary counters accept only absent values or exact safe integers; coercible strings and fractional/unsafe values fail visibly instead of becoming founder financial truth.

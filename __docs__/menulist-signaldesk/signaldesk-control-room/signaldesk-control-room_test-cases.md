# SignalDesk Control Room - Test Cases

**Status:** Current executable matrix
**Revalidated:** July 21, 2026

## Focused Commands

```bash
npm run test:signaldesk:kill-switch-boundary
npm run verify:signaldesk
npm run test:signaldesk:workspace-contracts
npm run test:signaldesk:workspace-client-contracts
npm run test:signaldesk:action-client-contracts
npm run test:signaldesk:access-boundary
npm run test:signaldesk:source-data-lifecycle
npm run typecheck
```

## Covered Behavior

| Area | Required proof |
| --- | --- |
| Projection | Foreign, malformed, negative, mismatched and private fields do not project. |
| Active scopes | All eleven canonical pauses are point-read; invalid rows are excluded and logged. |
| Incidents | Open plus acknowledged count as unresolved; malformed rows are excluded; list caps at 50; more than 500 valid matches fails visibly. |
| Idempotency | Exact and concurrent exact retries create one transition; changed facts conflict. |
| Concurrency | Opposite valid transitions serialize without malformed state or lost audits. |
| Existing authority | Foreign/malformed current pause truth cannot be overwritten. |
| Recovery | Reactivation clears stale deactivation fields; clear retains actor/time evidence. |
| Cost | One transition adds exactly four estimated writes; replay adds zero. |
| UI | Exact incident count is shown; pause/recovery uses Ant confirmation; Controls contains no Dashboard research/lead mutations. |
| Feature flag | Navigation, both page aliases and workspace read honor the flag while safety enforcement remains independent. |
| Mobile | Only confirmed global activation is admitted; clear and scoped mutation are blocked/audited. |
| Downstream | Source, AI, outbound, campaign, content, trust and bridge paths retain their relevant pause checks. |

Expected malformed-fixture diagnostics and the lifecycle lease-failure diagnostic
are negative-test evidence when their suites exit successfully.

## External Evidence Still Pending

- Authenticated hosted desktop Controls smoke.
- Physical mobile emergency-confirmation smoke.
- Real webhook incident and pause/recovery smoke with provider sending still off.

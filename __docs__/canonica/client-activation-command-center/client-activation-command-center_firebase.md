# Client Activation Command Center Firebase Notes

## Reads

| Flow | Path | Count | Notes |
| --- | --- | ---: | --- |
| Load activation | `stores/{sId}` | 1 | Workspace, widget, subscription summary |
| Load cached activation | `platformSummary/activation_{tId}_{sId}` | 1 | Signature comparison only |
| Load context content | `platformSummary/contextContent_{tId}_{sId}` | 1 | Articles, surfaces, changelog, ticket counts |
| Load coverage | `platformSummary/coverage_{tId}_{sId}` | 1 | Optional governance KPI |
| Load trust metrics | `platformSummary/trustMetrics_{tId}_{sId}` | 1 | Trust score, entity count, active canonical answer count |
| Legacy subscription fallback | `subscriptions where storeId == sId limit 5` | 0-5 | Only when store summary is missing; API reports a 5-read cap when used |

## Writes

| Flow | Path | Count | Guard |
| --- | --- | ---: | --- |
| Activation snapshot | `platformSummary/activation_{tId}_{sId}` | 0-1 | Signature changed or older than 30 minutes |
| Widget runtime marker | `stores/{sId}.widgetRuntimeStatus` | 0-1 | At most once per 15 minutes unless route/context changed |
| Onboarding subscription mirror | `stores/{sId}.canonicaSubscription` | 1 | During account creation |

## Cost Decision

The screen intentionally uses summary docs instead of source collections. It avoids:

- KB article collection scans
- Changelog collection scans
- Ticket collection scans
- Signal event scans
- Realtime listeners

The internal API response keeps a `readModel` for platform cost audits. The product-owner UI shows activation and knowledge-health status only; it does not expose Firebase/cache implementation details to Canonica customers.

The added entity and canonical-answer readiness checks reuse the trust metrics summary. They do not add collection reads to Activation.

## Rules and Indexes

No new Firestore collection is introduced. No new index is required for the primary path. The legacy fallback uses a bounded single-field `storeId` query.

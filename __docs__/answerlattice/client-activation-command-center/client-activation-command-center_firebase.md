# Client Activation Command Center Firebase Notes

## Reads

| Flow | Path | Count | Notes |
| --- | --- | ---: | --- |
| Load activation | `stores/{sId}` | 1 | Workspace, widget, subscription summary |
| Load cached activation | `platformSummary/activation_{tId}_{sId}` | 1 | Signature comparison only |
| Load context content | `platformSummary/contextContent_{tId}_{sId}` | 1 | Articles, surfaces, changelog, ticket counts |
| Load coverage | `platformSummary/coverage_{tId}_{sId}` | 1 | Optional governance KPI |
| Load trust metrics | `platformSummary/trustMetrics_{tId}_{sId}` | 1 | Trust score, entity count, active canonical answer count |
| Load compiled context manifest | `platformSummary/bundleManifest_{tId}_{sId}` | 1 | Compiled context readiness and public/private bundle status |
| Load Daily Governance | `stores/{sId}` + `platformSummary/answerlatticeSchedulerState` + `platformSummary/answerlatticeNightlyState_{tId}_{sId}` + 5 capped `answerlattice_schedulerRunLogs` | 8 | Separate owner status call; no source collection scans |
| Legacy subscription fallback | `subscriptions where storeId == sId limit 5` | 0-5 | Only when store summary is missing; API reports a 5-read cap when used |
| Notification readiness | Environment + feature flag | 0 | No Firestore read; computed server-side |
| Surface readiness | Existing `platformSummary/contextContent_{tId}_{sId}` response | 0 additional | Derived in memory from the context summary already read for Activation/Readiness Metrics |
| First-client launch proof | Existing activation summary inputs | 0 additional | Derived in memory from store, context, coverage, trust, and compiled context manifest fields already loaded |

## Writes

| Flow | Path | Count | Guard |
| --- | --- | ---: | --- |
| Activation snapshot | `platformSummary/activation_{tId}_{sId}` | 0-1 | Signature changed or older than 30 minutes |
| Widget runtime marker | `stores/{sId}.widgetRuntimeStatus` | 0-1 | At most once per 15 minutes unless route/context changed |
| Onboarding subscription mirror | `stores/{sId}.answerlatticeSubscription` | 1 | During account creation |
| Notification test log | `answerlattice_notificationLogs/{eventHash}` | 0-1 | Only when the owner explicitly sends a test email |

## Cost Decision

The screen intentionally uses summary docs instead of source collections. The activation summary API applies the shared `DATA_READ` gate before the Answerlattice permission check and before store/summary/fallback reads, so rate-limited refreshes perform no activation Firestore reads. It avoids:

- KB article collection scans
- Changelog collection scans
- Ticket collection scans
- Signal event scans
- Realtime listeners

The internal API response keeps a `readModel` for platform cost audits. The product-owner UI shows activation and knowledge-health status only; it does not expose Firebase/cache implementation details, raw scheduler errors, raw build exceptions, or global scheduler totals to Answerlattice customers.

The added entity and canonical-answer readiness checks reuse the trust metrics summary. They do not add collection reads to Activation.

The notification readiness card does not expose raw Firebase/cache internals. It shows only whether emails are enabled, sender config exists, and which sender address will be used. The explicit test action is rate-limited to 3/hour per workspace and writes an Answerlattice-scoped delivery log for debugging.

The First-client launch proof, Surface Readiness matrix, and Test-as-Customer checklist are view-only projections of the activation summary. They add 0 reads, 0 writes, and no listeners on normal page load. Launch proof stores compact group status fields inside the activation snapshot signature; surface readiness stores compact status/count fields only. Longer recommendations and action labels remain client-side UI copy.

Activation does not scan `answerlattice_mutationProposals` to prove proposal quality. It proves that the signal source is present from compact context data, then routes the owner to Signal Queue for proposal review.

The Daily Governance panel is also summary-backed. It resolves Answerlattice session scope and rate-limits before permission/read work, caps scheduler log reads to five, filters log entries to the current workspace before display, sanitizes workspace details to counts/statuses, logs operations-status failures with bounded tenant/store metadata, and never calls the manual full-scheduler trigger from the owner UI.

Management route persisted scope checks fail closed without changing the valid cost shape. Activation summary, operations status, tenant-summary sync, and compiled-context rebuild still use the same capped reads/writes for valid requests, but malformed store, legacy subscription, scheduler run-log, or request-body scope is rejected before owner-visible state updates or summary writes.

Activation dashboard browser request and response validation adds no Firestore reads, writes, deletes, listeners, API routes, or scheduler work. The request policy only pins no-store cache, same-origin credentials, and manual redirect handling before existing route responses are parsed. The response reader only rejects malformed, oversized, rejected, or wrong-shape activation-summary, operations-status, notification-test, and compiled-context rebuild responses before local dashboard state or success copy advances.

The ticket detail Knowledge Loop card also adds 0 reads and 0 writes. It uses the already-loaded ticket document to explain whether the current support reply is useful evidence for future knowledge proposals. Actual signal writes still happen only through the existing resolved-ticket signal path.

## Rules and Indexes

No new Firestore collection is introduced. No new index is required for the primary path. The legacy fallback uses a bounded single-field `storeId` query. The operations status API uses a single-field `startedAt desc` scheduler-log query with a five-document cap.

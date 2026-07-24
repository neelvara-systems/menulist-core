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
| Load Answer Tests proof | `platformSummary/answerTests_{tId}_{sId}` | 1 | Bounded summary; derives First 10 count, latest proof state, and critical failures |
| Load current governed source versions | `platformSummary/sourceVersions_{tId}_{sId}` | 1 | Six server-side counters invalidate stale Answer Test proof without source collection scans |
| Stage-aware base-route entry | `platformSummary/activation_{tId}_{sId}` | 0-1 | One direct read after access resolution; missing/error fails to Activation |
| Load Daily Governance | `stores/{sId}` + `platformSummary/answerlatticeSchedulerState` + `platformSummary/answerlatticeNightlyState_{tId}_{sId}` + 5 capped `answerlattice_schedulerRunLogs` | 8 | Separate owner status call; no source collection scans |
| Legacy subscription fallback | `subscriptions where storeId == sId limit 5` | 0-5 | Only when store summary is missing; API reports a 5-read cap when used |
| Notification readiness | Environment + feature flag | 0 | No Firestore read; computed server-side |
| Surface readiness | Existing `platformSummary/contextContent_{tId}_{sId}` response | 0 additional | Derived in memory from the context summary already read for Activation/Readiness Metrics |
| First-client launch proof | Existing activation summary inputs | 0 additional | Derived in memory after the eight compact Activation reads for a valid store |

## Writes

| Flow | Path | Count | Guard |
| --- | --- | ---: | --- |
| Activation snapshot | `platformSummary/activation_{tId}_{sId}` | 0-1 | Signature changed or older than 30 minutes |
| Widget runtime marker | `stores/{sId}.widgetRuntimeStatus` | 0-1 | At most once per 15 minutes unless route/context changed |
| Onboarding subscription mirror | `stores/{sId}.answerlatticeSubscription` | 1 | During account creation |
| Notification test log | `answerlattice_notificationLogs/{eventHash}` | 0-1 | Only when the owner explicitly sends a test email |

## Cost Decision

The screen intentionally uses summary docs instead of source collections. The activation summary API applies the shared `DATA_READ` gate before the Answerlattice permission check and before store/summary/fallback reads, so rate-limited refreshes perform no activation Firestore reads. It then reads the store first: invalid, missing, or cross-scope workspaces stop at one store read, while valid workspaces perform the documented eight-read total. It avoids:

- KB article collection scans
- Changelog collection scans
- Ticket collection scans
- Signal event scans
- Realtime listeners

The internal API response keeps a `readModel` for platform cost audits. The product-owner UI shows activation and knowledge-health status only; it does not expose Firebase/cache implementation details, raw scheduler errors, raw build exceptions, or global scheduler totals to Answerlattice customers.

The added entity and canonical-answer readiness checks reuse the trust metrics summary. They do not add collection reads to Activation.

The notification readiness card does not expose raw Firebase/cache internals. It shows only whether emails are enabled, sender config exists, and which sender address will be used. The explicit test action is rate-limited to 3/hour per workspace and writes an Answerlattice-scoped delivery log for debugging.

The First-client launch proof, ordered founder journey, Surface Readiness matrix, and Test-as-Customer checklist are view-only projections of the activation summary. They add 0 reads, 0 writes, and no listeners after the eight compact Activation reads. Launch proof stores compact group status fields plus current runtime-proof state inside the activation snapshot signature; surface readiness stores compact status/count fields only. Longer recommendations and action labels remain client-side UI copy.

The base-route stage decision adds at most one compact activation-summary read when a management user enters `/answerlattice`. It performs no source scan, summary rebuild, listener, model call, or write. A direct visit to Activation remains eight compact reads, plus the existing bounded legacy subscription fallback only for old workspaces.

Activation does not scan `answerlattice_mutationProposals` to prove proposal quality. It proves that the signal source is present from compact context data, then routes the owner to Signal Queue for proposal review.

The Daily Governance panel is also summary-backed. It resolves Answerlattice session scope and rate-limits before permission/read work, caps scheduler log reads to five, filters log entries to the current workspace before display, sanitizes workspace details to counts/statuses, logs operations-status failures with bounded tenant/store metadata, and never calls the manual full-scheduler trigger from the owner UI.

Management route persisted scope checks fail closed without changing the valid cost shape. Activation rejects malformed store identity before the seven summary reads and accepts embedded or legacy subscriptions only with exact dual-`AL` product and tenant/store identity. A foreign/malformed embedded summary triggers the existing bounded fallback instead of suppressing it. Scoped parsers reject malformed coverage, trust, context, source-version, Answer Test, and bundle-manifest data before it can advance owner-visible proof or trigger a misleading snapshot.

Activation dashboard browser request and response validation adds no Firestore reads, writes, deletes, listeners, API routes, or scheduler work. The request policy only pins no-store cache, same-origin credentials, and manual redirect handling before existing route responses are parsed. The response reader only rejects malformed, oversized, rejected, or wrong-shape activation-summary, operations-status, notification-test, and compiled-context rebuild responses before local dashboard state or success copy advances.

Notification-test and compiled-context rebuild responses set `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`, including permission/error responses. Tightened recipient/status/version validation and the Readiness Metrics launch-proof gate add no Firestore work.

The ticket detail Knowledge Loop card also adds 0 reads and 0 writes. It uses the already-loaded ticket document to explain whether the current support reply is useful evidence for future knowledge proposals. Actual signal writes still happen only through the existing resolved-ticket signal path.

## Rules and Indexes

No new Firestore collection is introduced. No new index is required for the primary path. The legacy fallback uses a bounded single-field `storeId` query. The operations status API uses a single-field `startedAt desc` scheduler-log query with a five-document cap.

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
| First-value evidence transaction reread | `platformSummary/activation_{tId}_{sId}` | 0-5 | Only when the bounded evidence object is first established, repaired, or advanced; normally one read, with the Firestore SDK capped at five attempts under contention |
| Stage-aware base-route entry | `platformSummary/activation_{tId}_{sId}` | 0-1 | One direct read after access resolution; missing/error fails to Activation |
| Load Daily Governance | `stores/{sId}` + `platformSummary/answerlatticeSchedulerState` + `platformSummary/answerlatticeNightlyState_{tId}_{sId}` + 5 capped `answerlattice_schedulerRunLogs` | 0 or 8 | Deferred until the owner first opens technical details; then mounted for the remaining page session, with no source collection scans |
| Legacy subscription fallback | `subscriptions` exact dual-product/workspace query, `limit(5)` | 0-5 | Only when the store mirror is missing, malformed, terminal, or elapsed; exact current active truth wins within the bounded window |
| Notification readiness | Environment + feature flag | 0 | No Firestore read; computed server-side |
| Surface readiness | Existing `platformSummary/contextContent_{tId}_{sId}` response | 0 additional | Derived in memory from the context summary already read for Activation/Setup Status |
| First-client launch proof | Existing activation summary inputs | 0 additional | Derived in memory after the eight compact Activation reads for a valid store |

## Writes

| Flow | Path | Count | Guard |
| --- | --- | ---: | --- |
| Activation snapshot | `platformSummary/activation_{tId}_{sId}` | 0-1 | Signature changed, first-value evidence advances, or snapshot is older than 30 minutes |
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

The First-client launch proof, four-group progressive owner journey, Surface Readiness matrix, and Test-as-Customer checklist are view-only projections of the activation summary. Accordion state, group status, supporting checks, and the next action are computed in browser memory. They add 0 reads, 0 writes, and no listeners after the eight compact Activation reads. Launch proof stores compact group status fields plus current runtime-proof state inside the activation snapshot signature; surface readiness stores compact status/count fields only. Longer guidance and action labels remain client-side UI copy.

First-value evidence reuses the activation snapshot already read before summary construction. It stores five nullable canonical ISO timestamps in that same document. Missing, malformed, cross-scope, or newly advanced evidence uses a Firestore transaction that rereads only this summary document, so that request normally uses nine reads instead of eight and concurrent refreshes cannot erase the earliest committed observation. If contention causes a retry, the route counts every transaction callback read in its bounded read model; the installed Firestore SDK defaults to at most five attempts. Ordinary views and ordinary signature/staleness writes remain at eight reads; unchanged direct writes omit the nested evidence object. There is no activation-event collection, daily aggregate, listener, index, migration scan, Storage object, scheduled task, or AI call. Legacy workspaces are backfilled lazily only when their activation summary is normally refreshed.

Compact navigation and All tools are static projections of the existing authorized navigation registry. Reveal state lives only in the mounted sidebar component. It adds 0 Firestore reads, writes, deletes, listeners, summary documents, Storage objects, Functions, browser-storage writes, or AI calls. Directly opening a secondary route uses that route's existing cost contract; revealing its navigation label performs no data work.

The technical-details disclosure does not mount its children until the owner opens it. This removes the separate eight-read Daily Governance request from the normal Activation first paint. After the first open, the technical children remain mounted when the disclosure is closed, so reopening it during the same page session does not repeat that request. A workspace-scope change resets the deferred state before the new workspace summary is displayed.

The base-route stage decision adds at most one compact activation-summary read when a management user enters `/answerlattice`. It performs no source scan, summary rebuild, listener, model call, or write. A direct visit to Activation remains eight compact reads, plus the existing bounded legacy subscription fallback only for old workspaces.

Activation does not scan `answerlattice_mutationProposals` to prove proposal quality. It proves that the signal source is present from compact context data, then routes the owner to Suggested Updates (`signal-queue`) for proposal review.

The Daily Governance panel is also summary-backed. It resolves Answerlattice session scope and rate-limits before permission/read work, caps scheduler log reads to five, filters log entries to the current workspace before display, sanitizes workspace details to counts/statuses, logs operations-status failures with bounded tenant/store metadata, and never calls the manual full-scheduler trigger from the owner UI.

Management route persisted scope checks fail closed without changing the valid cost shape. Activation rejects malformed store identity before the seven summary reads and accepts embedded or legacy subscriptions only through the exact shared dual-`AL` product/workspace, financial/history and lifecycle-timestamp projector. A foreign, elapsed or malformed embedded summary cannot complete License and triggers the existing bounded fallback when appropriate instead of suppressing it. This is an in-memory projection and adds no read or write. Scoped parsers reject malformed coverage, trust, context, source-version, Answer Test, and bundle-manifest data before it can advance owner-visible proof or trigger a misleading snapshot.

Activation dashboard browser request and response validation adds no Firestore reads, writes, deletes, listeners, API routes, or scheduler work. The request policy only pins no-store cache, same-origin credentials, and manual redirect handling before existing route responses are parsed. The response reader only rejects malformed, oversized, rejected, or wrong-shape activation-summary, operations-status, notification-test, and compiled-context rebuild responses before local dashboard state or success copy advances.

Notification-test and compiled-context rebuild responses set `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`, including permission/error responses. Tightened recipient/status/version validation and the Setup Status launch-proof gate add no Firestore work.

The ticket detail Knowledge Loop card also adds 0 reads and 0 writes. It uses the already-loaded ticket document to explain whether the current support reply is useful evidence for future knowledge proposals. Actual signal writes still happen only through the existing resolved-ticket signal path.

## Rules and Indexes

No new Firestore collection is introduced. No new index is required for the primary path. The legacy fallback uses a bounded single-field `storeId` query. The operations status API uses a single-field `startedAt desc` scheduler-log query with a five-document cap.

# Client Activation Command Center Implementation

## Routing

`/answerlattice/activation` renders `AnswerlatticeActivationCommandCenter`.

Answerlattice management navigation is grouped into Launch Setup, Support Control, Widget & Hosted Help, Team & Access, Billing, and Knowledge Governance. Activation sits under Launch Setup, and the Answerlattice base dashboard route redirects management users to Activation so onboarding does not drop owners into a raw operations dashboard.

Activation links directly into:

- `/answerlattice/settings` for product/license details
- `/answerlattice/kb-generation` for knowledge import
- `/answerlattice/docs` for public documentation preview
- `/answerlattice/product-surfaces` for route/workflow context mapping
- `/answerlattice/widget/install` and `/answerlattice/widget/access` for install snippets, env handoff, allowed origins, blocked routes, and keys
- `/answerlattice/governance/entities` and `/answerlattice/governance/answers` for product ontology and canonical answer review
- `/answerlattice/governance/signal-queue` for support signals that should become knowledge
- `/answerlattice/knowledge-base`, `/answerlattice/changelog`, and `/answerlattice/tickets` through the shared Content Control workbench

The Content Control workbench (`src/components/templates/answerlattice/content/AnswerlatticeContentWorkbench.tsx`) is shared by Activation and Readiness Metrics. It reuses the loaded activation summary to give product owners one practical map for profile, import, articles, surfaces, changelog, signal queue, widget, and tickets without adding collection reads.

The First-client launch proof is computed in `src/lib/answerlattice/activationSummary.ts` as `summary.launchProof`. It does not change the existing `readinessScore`; it gives a stricter rollout gate for the first sellable account by grouping self-serve setup, knowledge/surfaces, ontology/canonical answers, widget runtime, governance summaries, and signal-source testing. The Activation UI renders the proof as a compact list and routes each incomplete group to its owning Answerlattice surface.

The Test-as-Customer checklist (`src/components/templates/answerlattice/content/AnswerlatticeCustomerFlowChecklist.tsx`) turns the same summary into a practical launch proof: preview help center, ask from the widget, confirm page context, submit a ticket fallback, check release notes, and open the Signal Queue. It is intentionally a checklist, not an automation layer, so owners keep control over what goes live.

Readiness Metrics also renders the Surface Readiness matrix (`src/components/templates/answerlattice/content/AnswerlatticeSurfaceReadinessMatrix.tsx`). It uses compact `summary.content.surfaceReadiness` status/count fields, derived from the context summary, to show each mapped surface as Ready, Needs mapping, Needs content, or Open signals. UI recommendations and action labels stay in the component so the persisted activation snapshot does not duplicate long copy.

The Daily Governance panel (`src/components/templates/answerlattice/activation/AnswerlatticeOperationsPanel.tsx`) loads `GET /api/answerlattice/operations/status` separately from the activation summary. It shows scheduler status, workspace-local support-day timing, last completion, and recent workspace-filtered governance runs. It links to Settings for timezone/EOD edits and does not expose the full manual scheduler trigger.

## Server API

`GET /api/answerlattice/activation/summary`:

1. Resolves tenant/store from `productAccounts.AL` through `resolveAnswerlatticeSessionScope`.
2. Reads the store document.
3. Reads compact platform summary docs.
4. Builds a `AnswerlatticeActivationSummary`, including `summary.launchProof` from already-read summary fields.
5. Persists `platformSummary/activation_{tId}_{sId}` only when the readiness signature changes or the snapshot is stale.

The API response includes an internal `readModel` so platform audits can verify Firebase cost behavior. The client-facing dashboard does not show Firebase or cache terminology to Answerlattice customers.

Entity readiness and canonical-answer readiness are derived from `platformSummary/trustMetrics_{tId}_{sId}`. Activation does not scan `answerlattice_entities` or `answerlattice_canonicalAnswers`.

Surface readiness is derived in `src/lib/answerlattice/activationSummary.ts` from the already-read `platformSummary/contextContent_{tId}_{sId}` document. The readiness signature includes the compact per-surface status so the persisted activation snapshot refreshes when a product area changes from missing content to ready, or when open ticket signals appear.

Launch proof status is also derived in `src/lib/answerlattice/activationSummary.ts`. It adds no Firestore reads and no independent collection scans. The persisted activation signature includes each launch-proof group status so the cached activation snapshot refreshes when a first-client proof blocker changes. The signal-source proof uses the compact context summary; generated proposal quality is still confirmed in Signal Queue and scheduler smoke tests, not by adding mutation-proposal scans to Activation.

Security note: the API must not fall back to the generic MenuList `session.user.tenantId/storeId`. A user needs a real Answerlattice product scope (`productAccounts.AL` or a native Answerlattice session) before any Answerlattice workspace summary is loaded.

`GET /api/answerlattice/operations/status`:

1. Resolves the same Answerlattice tenant/store scope.
2. Reads `stores/{sId}` to verify workspace ownership and timezone settings.
3. Reads `platformSummary/answerlatticeSchedulerState` and `platformSummary/answerlatticeNightlyState_{tId}_{sId}`.
4. Reads five capped `answerlattice_schedulerRunLogs` and filters results to the current workspace.
5. Returns Daily Governance status without scanning source collections or running scheduler work.

## Widget Runtime Telemetry

The public widget config request passes sanitized route/context hints:

- `path`
- `contextKey`
- `feature`
- `page`

`/api/widget/config` stores only the sanitized last-seen runtime marker on `stores/{sId}.widgetRuntimeStatus`. Writes are throttled to 15 minutes unless the route/context changes.

No user text, search query, answer text, chat transcript, email, or visitor identity is stored.

## Subscription Summary

Onboarding mirrors the created Answerlattice subscription into `stores/{sId}.answerlatticeSubscription`. This lets Activation avoid scanning subscriptions on normal loads.

If an older workspace does not yet have the store-level subscription mirror, the API uses a bounded legacy fallback query (`limit(5)`) and reports that fallback in the read model. Saving onboarding/settings should remove that fallback for future loads.

## Signal-to-Knowledge Queue

The Governance hub supports deep-link tabs. The Signal Queue tab renders generated mutation proposals from existing `answerlattice_mutationProposals` docs.

When a proposal contains a generated draft, the owner can review/edit the draft and publish it as an active canonical answer. Publishing creates the canonical answer, updates the entity search index, marks the proposal implemented, and writes an audit log. Proposals without generated drafts can still be approved or rejected for manual implementation.

The ticket detail drawer now surfaces a lightweight Knowledge Loop card for operators. It does not read additional documents; it only evaluates the current ticket status, context keys, and latest support replies already loaded in the drawer. The card explains when a resolved ticket has enough evidence for future Signal Queue proposals and gives owners a direct path to the queue.

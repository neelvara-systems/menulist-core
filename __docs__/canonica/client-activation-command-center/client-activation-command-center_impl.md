# Client Activation Command Center Implementation

## Routing

`/canonica/activation` renders `CanonicaActivationCommandCenter`.

Canonica management navigation is grouped into Launch Setup, Support Control, and Knowledge Governance. Activation sits under Launch Setup, and the Canonica base dashboard route redirects management users to Activation so onboarding does not drop owners into a raw operations dashboard.

Activation links directly into:

- `/canonica/settings` for product/license details
- `/canonica/kb-generation` for knowledge import
- `/canonica/docs` for public documentation preview
- `/canonica/product-surfaces` for route/workflow context mapping
- `/canonica/widget` for install, allowed origins, and keys
- `/canonica/governance?tab=entities` and `/canonica/governance?tab=answers` for product ontology and canonical answer review
- `/canonica/governance?tab=signal-queue` for support signals that should become knowledge

## Server API

`GET /api/canonica/activation/summary`:

1. Resolves tenant/store from `productAccounts.CN` through `resolveCanonicaSessionScope`.
2. Reads the store document.
3. Reads compact platform summary docs.
4. Builds a `CanonicaActivationSummary`.
5. Persists `platformSummary/activation_{tId}_{sId}` only when the readiness signature changes or the snapshot is stale.

The API response includes an internal `readModel` so platform audits can verify Firebase cost behavior. The client-facing dashboard does not show Firebase or cache terminology to Canonica customers.

Entity readiness and canonical-answer readiness are derived from `platformSummary/trustMetrics_{tId}_{sId}`. Activation does not scan `canonica_entities` or `canonica_canonicalAnswers`.

Security note: the API must not fall back to the generic MenuList `session.user.tenantId/storeId`. A user needs a real Canonica product scope (`productAccounts.CN` or a native Canonica session) before any Canonica workspace summary is loaded.

## Widget Runtime Telemetry

The public widget config request passes sanitized route/context hints:

- `path`
- `contextKey`
- `feature`
- `page`

`/api/widget/config` stores only the sanitized last-seen runtime marker on `stores/{sId}.widgetRuntimeStatus`. Writes are throttled to 15 minutes unless the route/context changes.

No user text, search query, answer text, chat transcript, email, or visitor identity is stored.

## Subscription Summary

Onboarding mirrors the created Canonica subscription into `stores/{sId}.canonicaSubscription`. This lets Activation avoid scanning subscriptions on normal loads.

If an older workspace does not yet have the store-level subscription mirror, the API uses a bounded legacy fallback query (`limit(5)`) and reports that fallback in the read model. Saving onboarding/settings should remove that fallback for future loads.

## Signal-to-Knowledge Queue

The Governance hub supports deep-link tabs. The Signal Queue tab renders generated mutation proposals from existing `canonica_mutationProposals` docs.

When a proposal contains a generated draft, the owner can review/edit the draft and publish it as an active canonical answer. Publishing creates the canonical answer, updates the entity search index, marks the proposal implemented, and writes an audit log. Proposals without generated drafts can still be approved or rejected for manual implementation.

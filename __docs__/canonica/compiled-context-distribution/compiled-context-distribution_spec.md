# Compiled Context Distribution Spec

## Purpose

Canonica needs a durable read architecture that can serve widget runtime, public API, gated MCP, owner readiness screens, and scheduler checks without repeated Firestore collection fanout.

The feature introduces:

- `platformSummary/sourceVersions_{tId}_{sId}` as the compact input version control plane.
- `platformSummary/bundleManifest_{tId}_{sId}` as the active compiled bundle pointer.
- Immutable Firebase Storage JSON bundles under public and private paths.
- Owner-visible bundle readiness and manual rebuild from Activation.
- Widget config bundle pointers and context-bundle capability.
- Bundle-first public entity reads with Firestore fallback.
- MCP session and JSON-RPC tool endpoint backed by private bundles.

## Doctrine Fit

Canonica remains the Support Knowledge Control Plane. Bundles are compiled approved truth, not a second database, chatbot memory, CMS, helpdesk replacement, or autonomous publisher.

Draft answers, mutation proposals, raw tickets, chat sessions, raw signals, audit logs, API keys, and billing internals must never be bundled.

## Source Of Truth

Firestore owns:

- `stores`, `tenants`, `subscriptions`, `users`
- `kb_articles`, `kb_categories`
- `canonica_entities`, `canonica_entityRelations`, `canonica_entitySearchIndex`
- `canonica_canonicalAnswers`
- `canonica_productSurfaces`
- `canonica_faqs`
- `canonica_releases`
- `canonica_signalEvents`
- `canonica_mutationProposals`
- `canonica_auditLogs`
- `supportTickets`, `chatSessions`, `aiSearchHistory`
- `platformSummary/*`

Storage owns generated read models only.

## Bundle Audiences

Public widget bundles may contain product name, safe widget config, route labels, public docs metadata, safe suggested questions, public-safe entity summaries, approved canonical previews, and public release summaries.

Private MCP bundles may contain richer approved answer bodies, route/entity relationships, procedures, warnings, release context, and install-safe product context.

Private MCP bundles still must not contain customer PII, raw support transcripts, audit logs, API keys, unapproved drafts, mutation proposals, raw signal events, or billing internals.

## Runtime Read Budgets

Widget config:

- Authenticates the widget key and origin.
- Reads at most the store auth path plus one bundle manifest/cache entry.
- Returns small config, capability flags, and public bundle pointers.

MCP session:

- Validates API key once.
- Issues short-lived signed session token.
- Loads private bundles from memory/Storage.

MCP tool call:

- Hot path: memory lookup only.
- Cold path: Storage bundle download and cache.
- Freshness path: one manifest read per TTL window.

Public API read:

- Authenticates API key.
- Reads bundled approved context first.
- Falls back to bounded Firestore query only if bundle is missing or disabled.

## Rebuild Triggers

Mark bundle stale when approved source context changes:

- Workspace profile or widget config changes.
- KB article publish/update/archive.
- FAQ publish/update/archive.
- Entity create/update/deprecate/merge.
- Entity relation create/delete.
- Canonical answer create/update/archive/governance change.
- Product surface create/update/archive.
- Release publish/activate.
- Predictive trigger summary changes.

Do not rebuild or mark stale for ordinary runtime reads, chat messages, ticket messages, feedback clicks, public API reads, or MCP read tools.

## Failure Behavior

If a build fails, keep serving `lastReadyVersion`. Set manifest status to `failed` or `stale`, persist a short error, and show the issue only on owner/admin surfaces.

Runtime widget/API/MCP should return current data from existing fallback paths when the bundle is unavailable.

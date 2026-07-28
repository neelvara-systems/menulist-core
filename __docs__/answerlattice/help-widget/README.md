# Answerlattice Help Widget

> **Status:** Implemented; Features 15 and 16 audits updated July 26, 2026
> **Role:** Governed customer-support distribution surface
> **Primary flag:** `ENABLE_ANSWERLATTICE_WIDGET`

## Purpose

The Answerlattice widget lets a SaaS company place its governed support answers inside its product. This dossier covers widget configuration, keys, allowed origins, blocked routes, runtime configuration, access control, and launch-grade branding.

Feature 16 now covers answer generation, feedback, public projection, screenshot fallback, and explicit support-ticket capture. Guided resolution, predictive support, automatic AI-failure suggestions, and advanced white label remain separate Features 17, 18, 40, and 39.

## Current Flow

```text
Answerlattice operator with canManageWidget
-> creates a named widget key
-> copies the raw key once
-> adds exact app origins
-> configures launcher, behavior, branding, and blocked routes
-> saves against the exact loaded config version
-> unchanged retries remain no-op; stale differing edits require reload/review
-> installs the public loader script
-> loader validates key + origin through /api/widget/config
-> loader receives public config and a short-lived host authorization
-> key is passed to the fixed /widget/embed iframe in memory, not in the URL
-> iframe calls scoped widget APIs
-> runtime activity updates the bounded install-status summary
```

## Trust Boundaries

- Widget keys are separate from Answerlattice Public API credentials.
- Raw widget keys are returned only when created and are not stored for recovery.
- The dashboard revokes keys instead of deleting the active record, retaining a bounded revoked-key audit entry.
- Active widget-key lookup uses SHA-256 hashes in `answerlatticeWidgetApi.keyHashes`.
- Exact allowed origins reject credentials, paths, query strings, and fragments.
- An empty origin list is an explicit open-origin mode. The dashboard warns that all origins are allowed until at least one origin is added.
- Invalid origin or blocked-route input fails the save instead of being silently discarded.
- Concurrent configuration edits cannot silently replace a newer origin policy; stale differing saves return `409`.
- Blocked routes are a local visibility policy, not an authorization control.
- The loader uses `/widget/embed`; the raw key is transferred through origin-targeted `postMessage`, avoiding raw-key iframe paths and access-log URLs.
- The public iframe and its API requests use `no-referrer` handling.
- Runtime search and feedback require the active key, required scope, exact Answerlattice workspace identity, rate limits, and either an allowed direct origin or a valid host authorization.
- Explicit support requests require the same runtime admission plus one exact stored widget search-history row and a valid reply email. Ticket evidence is server-derived and replay-safe.
- Client Firestore writes to `stores` are denied in the dedicated Answerlattice rules. The maintained shared rules also preserve widget credentials, configuration, origins, versions, timestamps, and runtime status as server-managed fields.

## Configuration Stored On The Workspace Store

- `widgetConfig`
- `widgetAllowedOrigins`
- `widgetConfigSchemaVersion`
- `widgetConfigVersion`
- `widgetConfigUpdatedAt`
- `answerlatticeWidgetApi`
- `widgetRuntimeStatus`
- optional verified-context and evidence-host fields when their rollout flags are enabled

No widget-specific collection is required.

## Public Configuration

`GET /api/widget/config` returns only the normalized public widget configuration, capability booleans, optional public bundle references, and the short-lived runtime authorization. It does not return the origin allowlist, tenant/store identifiers, key hashes, revoked records, private signing material, or workspace internals.

Runtime configuration is short-cached per key and request origin. Dashboard saves are explicit, exact retries and unchanged saves do not write, and stale differing saves preserve the browser draft while requiring reload/review.

## Answer And Fallback Runtime

- Search uses canonical answers first, then approved FAQs, then the governed RAG fallback.
- Public source URLs are positively admitted; unsafe/private URLs are omitted.
- Related labels become new support searches rather than direct access to internal objects.
- Screenshot-processing failure is visible and falls back to the text question.
- Feedback uses the server's persisted outcome.
- **Still need help** opens an explicit asynchronous support form and creates at most one deterministic ticket per stored search result.
- Automatic evaluator-driven escalation remains disabled while `ENABLE_ANSWERLATTICE_AI_ESCALATION` is `false`.

## Route And Branding Policy

Supported blocked-route forms are:

- exact: `/help-center`
- descendants: `/help-center/*`
- all routes: `*`

The launch-grade branding surface is deliberately bounded: accent color, launcher label, header title, greeting, position, shape, display, size, offsets, mobile visibility, and powered-by visibility. Arbitrary CSS, scripts, HTML, themes, or DOM selectors are not accepted.

## Maintained Documents

- `help-widget_spec.md`
- `help-widget_impl.md`
- `help-widget_firebase.md`
- `help-widget_mobile-support.md`
- `help-widget_helpdoc.md`
- `help-widget_marketing.md`
- `help-widget_website.md`
- `help-widget_test-cases.md`

## Permanent Boundaries

- The widget is not a help-desk replacement.
- A public widget key is not an account-action credential.
- Page context does not grant permissions.
- Blocked routes do not protect data or routes.
- The loader does not scrape the host DOM.
- Historical tickets do not become approved truth through the widget.
- A created ticket does not imply live support, notification, or a response-time guarantee.
- Unrestricted browser automation and account-changing actions remain outside this feature.

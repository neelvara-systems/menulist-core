# Compiled Context Distribution Test Cases

## Backend

- Onboarding initializes `sourceVersions_*` and `bundleManifest_*` without a heavy rebuild.
- Manual rebuild writes immutable Storage objects and updates `bundleManifest_*`.
- Nightly repair skips current manifests and rebuilds stale manifests from bounded source reads.
- Failed rebuild preserves `lastReadyVersion`.
- Source changes mark the manifest stale and increment only relevant counters.
- Builder excludes drafts, proposals, tickets, chats, raw signals, audit logs, API keys, and billing internals.

## Widget

- Config endpoint returns existing widget config when bundles are missing.
- Config endpoint returns bundle metadata when a ready manifest exists.
- Predictive support capability remains correct.
- Invalid key, disallowed origin, and rate-limit behavior stay unchanged.

## Public API

- Entities endpoint uses bundle-first reads when enabled and ready.
- Entities endpoint falls back to bounded Firestore query when bundle is missing.
- ETag behavior still works.

## MCP

- Session endpoint rejects missing secret, invalid key, and disabled flag.
- Session endpoint returns a short-lived token for valid scoped `cn_*` keys.
- JSON-RPC endpoint lists tools.
- Read tools return context from private bundles.
- `report_missing_context` writes one aggregated bucket update even when no ready bundle exists.
- Expired or tampered session tokens are rejected.

## Rules

- Tenant members cannot directly read `sourceVersions_*` or `bundleManifest_*`; server APIs return sanitized owner summaries.
- Tenant writes to `sourceVersions_*` and `bundleManifest_*` are limited to source counters and stale-marker fields.
- Client writes to Storage bundles are denied.
- Public Storage bundle reads use opaque `publicBundleId`.
- Private MCP bundle reads are server-only.

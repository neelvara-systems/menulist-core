# Answerlattice Help Widget - Firebase

> **Updated:** July 18, 2026
> **Status:** Current source contract

## Storage Boundary

Feature 15 adds no collection. Widget ownership, configuration, origins, key summaries, and runtime status remain on the existing dedicated Answerlattice `stores/{sId}` document.

Relevant fields include:

- `widgetConfig`;
- `widgetAllowedOrigins`;
- `widgetConfigVersion`;
- `widgetConfigUpdatedAt`;
- `widgetRuntimeStatus`;
- `answerlatticeWidgetApi`.

`answerlatticeWidgetApi` stores active key hashes and bounded metadata. Raw `al_*` keys are returned once and are not stored for later recovery.

## Management Operations

| Operation | Firestore shape | Cost control |
|---|---|---|
| Read widget settings | One scoped store read when not already resolved by the request path | Authenticated, rate-limited, private no-store response |
| Save widget settings | At most one store merge | Normalized no-op saves skip the write |
| Generate key | One transactional store read/write | Key records remain bounded |
| Rename key | One transactional store read/write | Opaque key ID; no raw-key read |
| Revoke key | One transactional store read/write | Hash removed from active lookup; only bounded recent revoked records retained |
| Copy lost key | No Firestore recovery flow | Operator creates a replacement key |

### Widget activity timestamp normalization

Recent widget activity accepts Firestore Timestamp-like values, valid dates/numbers, and canonical ISO `...Z` strings. Malformed persisted values become `null` or sort oldest rather than being permissively parsed.

### Widget management persisted scope checks fail closed

Configuration, key, and recent-activity management paths require exact Answerlattice tenant/store scope. Fallback activity rows are normalized and rechecked before serialization. Activity responses can contain support text or optional visitor identity, so every route response is private/no-store.

## Public Runtime Operations

| Operation | Firestore shape | Notes |
|---|---|---|
| Public config admission | At most one hash-based store lookup on a cache miss | Exact origin is part of the cache key |
| Widget search or feedback auth | Current key/store validation, subject to the bounded auth cache | Runtime host token does not create a collection or write |
| Explicit widget support request | Two exact transaction reads; ticket create when absent; search-history merge; optional deterministic signal after commit | No notification write; replay reuses ticket/signal identity |
| Route blocking | No Firestore operation | Loader compares the current pathname locally |
| Branding projection | No extra read | Returned in the existing public config response |
| Runtime installation status | Throttled store merge | Bounded fields only; not written on every navigation |

The search, feedback, canonical retrieval, signal, and answer-quality costs belong to their own feature audits. This document does not assign a fixed cost per widget question because the actual read/provider shape depends on the selected retrieval path, cache state, optional image context, and enabled features.

The support-request path adds no collection, index, rule, Storage path, scheduler, or Cloud Function. `aiSearchHistory` keeps its 90-day raw-data lifecycle; ticket and signal records use their existing lifecycle contracts.

## Lookup And Index Contract

Widget keys are resolved from `stores` by active hashed-key fields under `answerlatticeWidgetApi`. The runtime does not query by raw key.

The recent widget activity panel uses the existing `aiSearchHistory` tenant/store/mount-context ordering index. Feature 15 does not add or change an index.

## Rules Contract

- Dashboard access is enforced by authenticated server routes, exact Answerlattice session scope, and `canManageWidget`.
- Dedicated Firestore rules allow only scoped reads of the store from supported clients and deny direct client writes to widget configuration and credentials.
- Public widget access is mediated by server routes; a connected source or syntactically valid key is not sufficient by itself.
- `publicApi` and `answerlatticeWidgetApi` credentials remain separate.

## Cache And Revocation

- Public widget config uses a short private browser/server cache.
- Widget credential validation uses a short process cache.
- Origin-bound runtime authorization is short-lived and is accepted only while the current widget key and current allowlist still pass server validation.

Revocation is therefore bounded, not globally instantaneous. Public claims must not promise immediate invalidation across every warm process.

## Data Retention

- Active key records remain until revoked or replaced.
- Revoked key summaries are capped; raw keys are never retained for recovery.
- Widget runtime status stores only bounded installation/context metadata and is interval-throttled.
- Route blocklists, appearance settings, and exact origins remain part of the store configuration until the customer changes or deletes the workspace.

## Deployment

The July 18 Feature 15 hardening changes no Firestore rules, indexes, Storage rules, or Answerlattice Cloud Functions. No Firebase deployment is required for this audit item.

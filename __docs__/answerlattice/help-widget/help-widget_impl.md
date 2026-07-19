# Answerlattice Help Widget - Implementation

> **Updated:** July 18, 2026
> **Implementation status:** Verified in current source; live hosted behavior still requires authenticated deployment/browser evidence

## Connected Files

### Management

- `src/app/(answerlattice)/answerlattice/widget/[tab]/page.tsx`
- `src/components/templates/answerlattice/widgetManagement/AnswerlatticeWidgetManagement.tsx`
- `src/components/templates/answerlattice/widgetManagement/WidgetSecurityControls.tsx`
- `src/app/api/answerlattice/widget-config/route.ts`
- `src/app/api/answerlattice/widget-key/route.ts`
- `src/app/api/answerlattice/widget-security/route.ts`

### Contracts And Storage

- `src/lib/answerlattice/widgetConfig.ts`
- `src/lib/answerlattice/widgetKeyManager.ts`
- `src/lib/answerlattice/widgetKeyStore.ts`
- `src/lib/answerlattice/widgetRuntimeStatus.ts`
- `src/lib/answerlattice/widgetRuntimeTokenServer.ts`
- `src/lib/publicApi/auth.ts`
- `src/constants/answerlattice/permissions.ts`
- `src/config/features.ts`

### Public Runtime

- `public/widget/answerlattice-widget.js`
- `src/app/api/widget/config/route.ts`
- `src/app/widget/embed/page.tsx`
- `src/app/widget/embed/WidgetEmbedClient.tsx`
- `src/app/widget/[apiKey]/WidgetClient.tsx`
- `packages/answerlattice-web/src/index.ts`

The legacy dynamic iframe route remains available for compatibility, but the maintained loader uses `/widget/embed` so the raw key is not part of the iframe request URL.

## Management Read Flow

```text
GET /api/answerlattice/widget-config
-> authenticated Answerlattice session
-> dashboard read rate limit
-> canManageWidget
-> exact session scope
-> dedicated Answerlattice Firestore
-> stores/{sId}
-> isAnswerlatticeStoreInScope
-> normalized config, origins, key summaries, config version, runtime status
-> private no-store response
```

Key summaries contain name, prefix/suffix, status, timestamps, and active marker. They never contain a recoverable raw key.

The widget activity timestamp boundary accepts Firestore Timestamp-like values, valid dates/numbers, or canonical ISO `...Z` strings; malformed stored values become `null` or sort oldest. The widget management persisted scope checks fail closed before malformed or cross-workspace rows can enter the recent-activity response.

## Configuration Save Flow

```text
PUT /api/answerlattice/widget-config
-> canManageWidget
-> exact scope
-> fail-closed rate limit
-> bounded 32 KiB JSON body
-> strict config/origin/route validation
-> store ownership recheck
-> no-op equality check
-> merge widgetConfig + widgetAllowedOrigins + schema/version timestamps
-> mark compiled widgetConfig source stale best effort
-> private no-store response
```

The load normalizer is tolerant of bounded legacy values. The save contract is stricter: malformed origins and blocked routes reject the whole request instead of disappearing during normalization.

## Widget Key Flow

`POST /api/answerlattice/widget-key` accepts bounded `generate`, `rename`, `copy`, `revoke`, and legacy `delete` actions.

### Generate

1. Create `al_` plus cryptographically random content.
2. Hash the raw key with SHA-256.
3. Run a Firestore transaction on the exact workspace store.
4. Append a named active record under `keysByHash` and hash under `keyHashes`.
5. Return the raw key once with `Cache-Control: private, no-store`.

### Revoke

1. Resolve the active key by opaque key ID inside the transaction.
2. Remove its hash from `keyHashes`.
3. Mark the record `revoked` with `revokedAt` and `updatedAt`.
4. Select the next active hash, if any.
5. Retain only the bounded newest revoked records.

The management UI uses revoke. Copy after the initial browser session returns a controlled replacement-key instruction.

## Public Config Admission

`GET /api/widget/config` performs these checks before returning tenant-specific config:

1. widget feature enabled;
2. syntactically valid `al_*` key;
3. fail-closed pre-auth IP rate limit;
4. per-key rate limit;
5. hash-only lookup in dedicated Answerlattice Firestore;
6. `answerlatticeWidgetApi` source only;
7. `AL` product and `answerlattice_widget` purpose;
8. `widget:config` scope;
9. canonical numeric tenant/store identity and document-ID match;
10. exact origin allowlist.

The cache key is the key hash plus normalized request origin. The response is private and short-lived. It excludes the allowlist and credential state.

## Host Authorization

When an origin allowlist is configured, config admission mints a 15-minute HMAC token containing only version, audience, normalized origin, issued/expiry timestamps, and nonce. The signature is bound to:

- SHA-256 of the full widget key;
- tenant ID;
- store ID;
- dedicated `ANSWERLATTICE_WIDGET_RUNTIME_SECRET`.

Search, feedback, explicit support request, and guidance outcome verify the token only after the widget key resolves to the current workspace. They also recheck the signed origin against the current allowlist, so removing an origin invalidates its token on the next uncached store read.

## Feature 16 Answer And Support Request Runtime

`/api/widget/search` positively projects public citations and bounded related-content labels. It reports whether an image was processed and returns a fallback suggestion without exposing internal escalation debug.

`/api/widget/feedback` returns the authoritative stored outcome on both first submission and replay.

`/api/widget/escalation` reuses the bounded feedback credential scope and runtime authorization, caps JSON at 4 KiB, and accepts only the search-history ID, reply email, optional name, and optional details. `widgetEscalationServer.ts` derives ticket scope/evidence from the stored widget history, creates a deterministic ticket transactionally, links the history, and emits a deterministic best-effort signal. Automatic evaluator-driven suggestions are a separate default-off path.

## Key-Free Iframe Bootstrap

The loader creates:

```text
https://answerlattice.com/widget/embed
```

It does not append the raw key. After the iframe listener mounts:

1. iframe posts `answerlattice-widget-ready`;
2. loader sends `answerlattice-widget-bootstrap` to the exact Answerlattice origin;
3. the embed wrapper validates the `al_*` key shape and parent window source;
4. `WidgetClient` mounts with the in-memory key;
5. the normal config/context/security synchronization repeats.

The iframe element and iframe API calls use no-referrer policy. This prevents the maintained runtime from placing the host route or raw legacy key path in downstream referrer headers.

## Loader Config And Failure Behavior

Merge order is:

```text
defaults -> remote dashboard config -> explicit script attributes
```

The loader sends bounded install telemetry (`path`, `contextKey`, `feature`, `page`) on config fetch. The server stores only normalized fields and throttles runtime-status writes.

Config responses `401`, `403`, and `404` are terminal for that page load. The loader sets a separate runtime-denied state, closes any open panel, clears guidance, and hides the launcher. Calling public `show()` cannot bypass this state.

Transient failures retain script defaults and retry with bounded backoff. Stores with restricted origins still fail closed because iframe API calls require a valid host authorization.

## Origin Validation

`normalizeWidgetAllowedOrigin()` accepts only exact HTTP/HTTPS origins. It rejects:

- username/password;
- non-root path;
- query;
- fragment;
- non-HTTP schemes;
- over-limit input.

The management save validates every provided entry before deduplication. Empty remains an intentional open-origin mode and is surfaced as a warning.

## Route Matching

The server and loader share these semantics:

- `*`: every route;
- `/path`: exact route;
- `/path/*`: parent and descendants.

Patterns such as `/path*` are rejected. Route matching runs in the host loader against `window.location.pathname` and creates no Firestore request. It is a presentation control only.

## Branding Projection

The public config projects only the bounded launch fields in `AnswerlatticeWidgetConfigSchema`. It does not return advanced branding documents or arbitrary content. Script attributes can override the same bounded fields for environment-specific presentation.

## Access And Rules

- Management APIs use `withAuth`, exact Answerlattice session scope, and `canManageWidget`.
- Shared session scope accepts only exact positive numeric Firestore document IDs before widget activity reads, configuration reads, or key mutations.
- Dedicated Firestore rules allow scoped reads of the store but deny client writes.
- Widget runtime routes explicitly exclude `publicApi` credentials.
- Public API and MCP routes reject widget-only credentials.
- Keys are store-scoped and require `pId = AL`, valid tenant ID, canonical store/document identity, active store, and non-blocked entity state.
- Frame policy is host-aware: middleware omits `X-Frame-Options` only when the request is on an Answerlattice product host, or on an approved local-development host outside Vercel. A `/widget/*` path on another product host does not receive the embeddable frame policy.

## Cache And Revocation

- widget config process cache: at most the 15-second auth-cache TTL;
- browser session config cache: bounded by the public 60-second TTL;
- widget key validation cache: at most 30 seconds globally, 15 seconds on widget routes;
- runtime authorization: at most 15 minutes, with current key and current origin checks still required by runtime routes.

Do not claim globally instantaneous revocation. Current local behavior bounds warm-process admission to seconds and rejects revoked keys after cache expiry.

## Verification

- `npm run test:answerlattice-widget-config-contracts`
- `npm run test:answerlattice-widget-runtime-token`
- `npm run test:answerlattice-widget-key:emulator`
- `npm run typecheck:answerlattice`
- focused ESLint
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `npm run verify:dependency-freeze`
- `git diff --check`

No Firestore rules, indexes, Storage rules, or Answerlattice Cloud Functions were changed by the July 18 Feature 15 hardening, so Firebase deployment is not required for this feature audit.

# External Menu Sync — Implementation

> **Status:** Implemented in source
> **Last code-truth review:** July 16, 2026

## Architecture

```text
loaded store context
  -> register non-secret POS config
acknowledged project DAL save
  -> debounce by tenant/store/project for 25 seconds
  -> POST /api/pos-sync/deliver
  -> authenticate, authorize, rate-limit, validate target
  -> transaction: store + current project + server secret + menu version
  -> allow-listed full snapshot + HMAC
  -> pinned HTTPS POST, no redirects, 5 second timeout
  -> delivery log + version-ordered status
```

The provider secret has a separate protected path:

```text
desktop/mobile
  -> GET /api/pos-sync/secret (read/migrate)
  -> POST /api/pos-sync/secret action=ensure|rotate
  -> posSyncSecrets/{tId}_{sId} through Admin SDK
  -> store.posSync.secretVersion only
```

## Source ownership

| Concern | Source |
| --- | --- |
| Flag and runtime posture | `src/config/features.ts` |
| Types | `src/lib/posSync/types.ts`, `src/types/platform/store.ts` |
| Store registration/debounce | `src/lib/posSync/eventBuilder.ts` |
| Shared mutation boundary | `src/database/projects/index.ts` |
| Context registration | `src/providers/platformProviders/platformGlobalDataProvider.tsx` |
| Payload | `src/lib/posSync/payloadFormatter.ts` |
| HMAC and IDs | `src/lib/posSync/signature.ts` |
| URL validation | `src/lib/posSync/webhookUrl.ts` |
| DNS admission | `src/lib/posSync/serverWebhookTarget.ts` |
| Pinned transport | `src/lib/posSync/pinnedWebhookRequest.ts` |
| Ordered outcomes | `src/lib/posSync/deliveryState.ts` |
| Secret storage/migration | `src/lib/posSync/serverSecretStore.ts` |
| Secret browser response | `src/lib/posSync/secretResponse.ts` |
| Secret API | `src/app/api/pos-sync/secret/route.ts` |
| Test API | `src/app/api/pos-sync/test/route.ts` |
| Delivery API | `src/app/api/pos-sync/deliver/route.ts` |
| Desktop | `src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx` |
| Mobile | `src/components/mobile/screens/MobilePosSyncScreen.tsx` |
| Firestore denial | `firestore.rules` |

## Mutation integration

`PlatformGlobalDataProvider` registers the current store's enabled state and URL. It never registers the signing secret.

Desktop POS state is keyed by exact tenant/store identity. Switching stores remounts the tab before paint, clears secret/test/draft state, hides delivery rows whose recorded scope does not match the current store, and invalidates in-flight history and connection-test requests. Async owner mutations retain their original persistence target, but their completion may update browser state only while that exact tenant/store component is still mounted. The parent settings updater independently compares the transaction's expected tenant/store with the current store before applying a completed patch.

Both successful branches of `runUpdateProject()` call `triggerPosSyncForAcknowledgedProjectSave()` after persistence and cache invalidation:

- standalone/master project transaction;
- linked-outlet save API acknowledgement.

This covers all callers of `updateProject()` and `updateProjectWithoutLoader()`, including editor, description, image, translation, and other shared-DAL project updates. The editor no longer owns a separate trigger.

The trigger is intentionally not a durable queue. It does not promise a delivery when the browser closes before the debounce fires, and it does not observe unrelated Admin/Cloud Function project writes. The current product promise must stay within this boundary.

## Secret storage and compatibility

### Canonical document

`posSyncSecrets/{tenantId}_{storeId}` contains:

```typescript
{
  pId: 'ML';
  tId: number;
  sId: number;
  secret: string;
  version: number;
  createdOn: Timestamp;
  createdBy?: string;
  modifiedOn: Timestamp;
  modifiedBy?: string;
  migrationSource?: string;
}
```

Firestore rules deny every client read/write. Next.js routes use Admin SDK after canonical store permission and lifecycle checks.

### Legacy migration

`resolvePosSyncSecretInTransaction()` accepts an existing `store.posSync.webhookSecret` only as a migration source. In the same transaction it:

1. writes the secret to the server collection if needed;
2. creates or preserves a positive version;
3. writes `store.posSync.secretVersion`;
4. deletes `store.posSync.webhookSecret`.

The function runs from secret read, connection test, and live delivery. If both server and legacy values exist, the server document is authoritative and the legacy field is removed.

### Secret route

`GET` accepts strict query IDs and returns the current secret to an authorized integration manager. Compact and nested authenticated tenant/store aliases must agree with the requested scope. The secret transaction reads the current tenant as well as the store and secret, rejecting inactive, deleted, blocked, or tenant-mismatched scope before reveal, migration, ensure, or rotation. `POST` accepts a bounded strict body:

```json
{
  "action": "ensure",
  "tenantId": 1,
  "storeId": 101
}
```

`ensure` returns the current secret or creates one if absent. `rotate` always creates the next secret/version. Both responses use `Cache-Control: private, no-store`; browser parsing is capped at 4 KiB. The route is tenant-checked, permissioned, and fail-closed rate-limited.

## Delivery transaction

After URL/DNS admission, the delivery route reads these documents in one transaction:

- canonical store;
- exact tenant/store/project document;
- exact server secret document.

It rechecks store permission and exact normalized URL, resolves legacy secret migration, reads the current project snapshot, increments `posSync.menuVersion`, and returns the claimed snapshot/secret/version to the route. This coupling is required for concurrency correctness.

The completion transaction checks:

- connection still enabled;
- URL unchanged;
- `secretVersion` unchanged;
- completed menu version newer than `lastCompletedMenuVersion`.

An old request therefore cannot overwrite a new connection or new delivery state.

## Network boundary

The protected secret, connection-test, and delivery routes use store-scoped rate limits with `failClosedOnProviderError: true`. Connection test and delivery validate the bounded body and authenticated tenant/store scope, then enforce that limiter before their first Firestore read. The exact canonical store read supplies the current lifecycle and role data for the permission check, avoiding a duplicate permission read. A limiter-provider outage returns bounded `503` plus `Retry-After` before Firestore/provider work instead of bypassing admission.

`validatePosSyncWebhookUrl()` rejects non-HTTPS, credentials, fragments, local names, and literal special-use addresses. `validatePosSyncWebhookNetworkTarget()` resolves every address and rejects the whole target if any result is blocked.

`postPosSyncWebhook()` uses Node HTTPS with:

- a frozen custom DNS lookup;
- hostname TLS verification;
- no agent reuse;
- no redirect handling;
- 16 KiB max response headers;
- explicit content length;
- five-second socket timeout;
- discarded response body.

No provider response text is persisted or returned.

## Payload and signatures

The payload formatter reads top-level extracted data first and file-level data as fallback. It deduplicates categories/items and projects only allowed public fields. Localized maps reject prototype keys. Decision facts retain only bounded values, not provenance.

Signature:

```text
hex(HMAC_SHA256(secret, timestamp + "." + rawBody))
```

The receiver must verify the exact body bytes before parsing.

## Failure and retention

- One attempt; no retry loop.
- Every attempt gets a deterministic delivery document ID generated for that request.
- Log records include payload byte size and SHA-256 hash, never payload JSON or secret.
- A transaction writes the delivery log and eligible status outcome.
- Retention reads at most 100 newest logs and batch-deletes rows after the newest 20.
- Retention failure is diagnostic-only and does not change delivery acknowledgement.

## Desktop and mobile

Both surfaces:

- load secret through protected GET;
- ensure secret before enabling;
- rotate through protected POST;
- mask by default;
- reveal/copy deliberately;
- validate URL with the shared validator;
- test through the shared request/response policy;
- show only fixed owner-safe errors.

Desktop also reads the last 20 delivery logs through an explicit parent-store tenant-and-store rule. Each server-owned row passes `parsePosDeliveryHistoryEntry()` before entering component state; identity, status, timestamp and numeric fields must be valid, while internal error/payload evidence and unknown fields are never projected. Malformed rows are omitted with bounded diagnostics. Mobile exposes configuration and test inside the existing shell and does not create a separate route/data loader.

Provider setup instructions are an owner-device `mailto:` draft. No server email is sent. The counter is a preparation limit, not proof of delivery.

## Release order

This change cannot be split arbitrarily:

1. validate source and emulator gates;
2. deploy the compatible Next.js app;
3. deploy Firestore rules denying new client secret mutations and the server secret collection;
4. migrate/test legacy connections;
5. run a real staging provider test/delivery;
6. promote and repeat production smoke.

Deploying rules before the app would break the previous client-side secret write flow. Vercel deployment remains explicit-owner authorization; no Vercel deploy is implied by source completion.

## Verification

```bash
npm run verify:pos-sync-boundary
npm run test:pos-sync-boundaries
npm run test:pos-sync-secret:rules
npx tsc --noEmit
npm run lint
```

The source verifier locks auth/order/SSRF/secret/delivery-history/mutation/mobile/docs boundaries. Behavioral tests lock URL, IP, pinned lookup, version outcome, payload projection, and owner-safe delivery-history parsing. Emulator tests lock server-secret denial, legacy-field immutability, authorized delivery-history queries, cross-scope denial, and server-only log writes.

## Deliberate non-goals

No unused queue collection or queue type remains in active source. Automatic retry, provider certification, multiple destinations, server mutation events, and guaranteed delivery are not hidden commitments. If product evidence later requires one, it needs a separate architecture/cost/release decision rather than dormant schema.

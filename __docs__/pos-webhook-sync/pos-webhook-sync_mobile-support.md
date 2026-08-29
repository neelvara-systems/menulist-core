# External Menu Sync — Mobile Support

> **Decision:** Supported as an operational MobileShell screen
> **Last code-truth review:** August 28, 2026

## Route and permission

The entry appears under `MobileShell > More` only when `ENABLE_POS_SYNC` is true and the current user has `canManageIntegrations`. Share-screen handoff opens the same shell sub-screen. It must not use `window.location`, force reload, or bypass inherited auth/store context.

## Supported actions

- view Connected / Connection issue / Disabled status;
- enable or disable the connection;
- edit and validate the provider URL;
- securely load the current signing secret;
- reveal/copy the masked secret deliberately;
- rotate after typing `REGENERATE`;
- run a connection test;
- reset unsaved URL/toggle changes.

Desktop-only convenience remains delivery-history table, provider email draft, technical-summary copy, and sample download. This is intentional; mobile remains light operational control.

## Secret flow

Mobile never hydrates a secret from `storeDetails.posSync.webhookSecret` and never writes a secret through `updateStore()`.

On screen open for the active outlet:

1. call protected `GET /api/pos-sync/secret` with same-origin credentials, no cache, and manual redirect handling;
2. parse no more than 4 KiB;
3. accept only a shaped positive secret/version response;
4. keep the secret in component memory, masked by default;
5. remove any legacy secret from the local client projection.

The protected route admits the active store only when it is the login store or an explicitly mapped store in the authenticated session. It never accepts a client-supplied tenant override, and it rechecks the canonical selected-store permission before returning a secret. Switching outlets therefore loads that outlet's secret state instead of reusing or rejecting against the login store.

Enabling without a secret calls `action: ensure`. Rotation calls `action: rotate` immediately; the modal remains loading until the server acknowledgement. The server persists the rotation metadata and resets stale connection state. Mobile appends the existing non-blocking MOL audit only after success.

## Settings save

`updateStore()` persists non-secret POS configuration through the shared DAL. `assertStoreUpdateSucceeded()` is required before local saved state or success copy changes.

The save payload must not contain `webhookSecret`. It may contain `secretVersion`, which is non-secret concurrency state. Failed saves show fixed owner copy and bounded diagnostics.

The mobile screen is keyed by exact tenant/store identity, so a store switch destroys prior URL, secret, modal, test, and loading state before the new store renders. Secret reads, settings saves, rotations, and connection tests capture their originating scope; delayed completions can finish the already-authorized old-store server operation but cannot patch the newly selected store, expose an old secret/result, or show a stale success/error. Functional `setStoreDetails` updates recheck both tenant and store before merging.

## Connection test

The screen imports `POS_SYNC_TEST_REQUEST_POLICY` and the shared 16 KiB response guard. Reachable feedback requires both an OK HTTP response and `isSuccessfulPosSyncTestResponse()`.

Failure diagnostics may contain:

- bounded tenant/store identity presence;
- response status and response-shape booleans;
- secret presence/length only;
- URL presence/length only;
- clipboard/fallback availability.

They must not contain raw URL, secret, provider body, API body, exception text, email, or setup content. Owner copy remains `Could not reach connected system`.

## Touch and accessibility

- actions use existing mobile button/switch components and large targets;
- secret is not visible without an explicit tap;
- destructive rotation requires typed confirmation;
- loading disables conflicting secret/toggle actions;
- save/reset remain in the sticky mobile action area;
- status never relies on color alone.

## Cost

- store and auth context are inherited;
- screen open uses the existing bounded secret transaction reads for the selected outlet (plus migration writes only for legacy data); selected-store admission adds no Firestore operation;
- no mobile delivery-log query;
- reveal/copy/reset are local;
- ensure/rotate use three transaction reads (`store`, `tenant`, and server secret) and two writes; rotation adds the existing non-blocking owner-audit write.

## Verification

`npm run verify:pos-sync-boundary` locks MobileShell routing, permission admission, protected secret use, no client secret hydration/write, URL/test parity, fixed copy, and shared DAL trigger coverage. `npm run test:pos-sync-secret:rules` proves the browser cannot access the canonical secret collection.

These are source/emulator gates and do not prove a live provider or deployed mobile PWA.

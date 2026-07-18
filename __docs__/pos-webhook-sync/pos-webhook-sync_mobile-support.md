# External Menu Sync — Mobile Support

> **Decision:** Supported as an operational MobileShell screen
> **Last code-truth review:** July 16, 2026

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

On screen open:

1. call protected `GET /api/pos-sync/secret` with same-origin credentials, no cache, and manual redirect handling;
2. parse no more than 4 KiB;
3. accept only a shaped positive secret/version response;
4. keep the secret in component memory, masked by default;
5. remove any legacy secret from the local client projection.

Enabling without a secret calls `action: ensure`. Rotation calls `action: rotate` immediately; the modal remains loading until the server acknowledgement. The server persists the rotation metadata and resets stale connection state. Mobile appends the existing non-blocking MOL audit only after success.

## Settings save

`updateStore()` persists non-secret POS configuration through the shared DAL. `assertStoreUpdateSucceeded()` is required before local saved state or success copy changes.

The save payload must not contain `webhookSecret`. It may contain `secretVersion`, which is non-secret concurrency state. Failed saves show fixed owner copy and bounded diagnostics.

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
- screen open adds two server reads for the secret (plus migration writes only for legacy data);
- no mobile delivery-log query;
- reveal/copy/reset are local;
- ensure/rotate use two transaction reads and two writes.

## Verification

`npm run verify:pos-sync-boundary` locks MobileShell routing, permission admission, protected secret use, no client secret hydration/write, URL/test parity, fixed copy, and shared DAL trigger coverage. `npm run test:pos-sync-secret:rules` proves the browser cannot access the canonical secret collection.

These are source/emulator gates and do not prove a live provider or deployed mobile PWA.

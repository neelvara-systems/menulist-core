# Workspace Profile Implementation

## Runtime

`GET /api/answerlattice/workspace-profile` reads one scoped `stores/{sId}` document and returns:

```json
{
  "profile": {
    "productName": "Example SaaS",
    "productUrl": "https://app.example.com",
    "supportEmail": "support@example.com",
    "billingModel": "subscription",
    "primarySurfaces": ["billing", "settings"],
    "timeZone": "Asia/Kolkata",
    "businessDayEndTime": "23:00"
  },
  "revision": 1
}
```

`PUT /api/answerlattice/workspace-profile` accepts the same flat profile fields plus `expectedRevision`.

## Contract Ownership

`workspaceProfileContracts.ts` is shared by route and browser. It owns field limits, safe URL rules, IANA timezone admission, surface normalization, persisted-value sanitization, response validation, and revision normalization.

GET constructs its response through the strict response parser. A persisted workspace with no usable product name therefore fails closed instead of returning a nominal `200` payload that the browser cannot safely use.

`workspaceProfileServer.ts` owns the transaction. It rereads the store, applies `isAnswerlatticeStoreInScope`, compares the revision, skips unchanged data, and atomically writes:

1. `stores/{sId}`;
2. the workspace's tenant-summary shard;
3. `platformSummary/sourceVersions_{tId}_{sId}`;
4. `platformSummary/bundleManifest_{tId}_{sId}`.

The compiled `workspaceProfile` version increments and the manifest becomes stale only when profile truth changes.

The save preserves the original launch-profile `createdAt`. If onboarding's best-effort compiled-context bootstrap did not create the source-version or manifest document, the transaction creates complete scope-valid records. Existing malformed or cross-workspace records are rejected before any write.

## Browser Behavior

`AnswerlatticeSettings.tsx`:

- uses same-origin credentials, no-store requests, and manual redirect handling;
- reads at most 64 KB per response;
- accepts profile responses only through the strict shared response schema;
- retains the latest revision outside editable form values;
- disables save until a valid profile has loaded;
- reloads current values after a `409` conflict;
- validates product URL, email, length, and surface-count constraints before submission.

Write limiting and database-availability admission happen before permission lookup, body parsing, and the save transaction. This bounds authenticated misuse before permission reads and preserves the intended `503` response when the dedicated database is unavailable.

## Downstream Use

- `functions-answerlattice/src/answerlattice/answerlatticeMasterScheduler.ts` uses tenant-summary timezone and support-day end.
- `functions-answerlattice/src/answerlattice/contextBundleBuilder.ts` compiles product identity, URL, support email, billing context, and timing.
- notification test and routing read the scoped store support email.

## Diagnostics

Failures emit bounded runtime diagnostics without raw profile payloads. Successful changed saves log scope, revision, and surface count only.

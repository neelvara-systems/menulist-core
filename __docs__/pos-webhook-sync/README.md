# External Menu Sync (POS Webhook) — Documentation Hub

> **Runtime name:** POS Webhook Sync / `posSync`
> **Owner-facing name:** External Menu Sync
> **Status:** Implemented in source; `ENABLE_POS_SYNC: true`
> **Last code-truth review:** August 28, 2026
> **Version:** 3.0

## Documents

| Audience | Document |
| --- | --- |
| Product and acceptance contract | [Specification](./pos-webhook-sync_spec.md) |
| Engineering and release order | [Implementation](./pos-webhook-sync_impl.md) |
| Firebase operations and cost | [Firebase](./pos-webhook-sync_firebase.md) |
| Desktop/mobile parity | [Mobile support](./pos-webhook-sync_mobile-support.md) |
| Owner instructions | [Help](./pos-webhook-sync_helpdoc.md) |
| Approved internal positioning | [Marketing](./pos-webhook-sync_marketing.md) |
| Website claim boundary | [Website](./pos-webhook-sync_website.md) |
| Verification matrix | [Test cases](./pos-webhook-sync_test-cases.md) |

## Code truth

External Menu Sync is a one-way outbound webhook. For a loaded store with the feature enabled and a public HTTPS provider URL configured, an acknowledged `updateProject()` or `updateProjectWithoutLoader()` save registers a debounced delivery request. After 25 seconds without another save for the same tenant/store/project, the protected server route reads the current project, assigns a version, builds one full snapshot, signs it, and makes one five-second HTTPS attempt.

It is not a named POS connector, bidirectional sync, guaranteed job queue, retry service, real-time stream, or provider marketplace.

## End-to-end flow

1. An authorized owner or manager opens External Menu Sync on desktop or in `MobileShell > More`. The active outlet may be the login store or another store explicitly mapped into the authenticated session; the tenant remains session-derived.
2. Desktop/mobile loads the signing secret through `GET /api/pos-sync/secret`. A legacy `store.posSync.webhookSecret` is copied to the server-only `posSyncSecrets` collection and removed from the store document transactionally.
3. Enabling without a secret calls `POST /api/pos-sync/secret` with `action: ensure`. Rotation uses `action: rotate`.
4. The owner saves a validated public HTTPS provider URL and runs the connection test.
5. The loaded store context registers only non-secret delivery admission state.
6. Every acknowledged project save through the shared project DAL calls `triggerPosSyncForAcknowledgedProjectSave()`.
7. The browser debounce collapses rapid saves by tenant/store/project.
8. `/api/pos-sync/deliver` revalidates auth and tenant/store scope, applies the fail-closed store limiter before Firestore, then uses the exact canonical store read to check lifecycle and integration-or-publish permission before URL, DNS, project, connection-version, and server-owned-secret admission.
9. The project snapshot and next menu version are claimed in the same Firestore transaction.
10. The route pins the approved DNS addresses into a Node HTTPS request, follows no redirects, signs the exact raw JSON body, and waits at most five seconds.
11. A bounded delivery log is written. Status completion applies only to the same connection and a newer version.
12. The first two consecutive live failures remain owner-quiet; the third marks `connection_issue`. An explicit failed test or invalid target marks the issue immediately.

## Important limits

- One outbound destination per store.
- One attempt per debounced save; no automatic retry worker.
- Delivery is browser-triggered. Closing the app before the 25-second timer fires can prevent that attempt. The next acknowledged project save sends the latest full snapshot.
- Background project writes that do not cross the client project DAL do not create a separate webhook attempt. A later acknowledged project save sends the then-current full snapshot.
- No gzip transport and no advertised 5 MB payload contract.
- A 2xx response means the endpoint accepted the request; it does not prove the connected system applied the menu.
- Compatibility is proven only by the provider's successful test and payload implementation. MenuList does not claim support for named POS vendors without certification.

## Security invariants

- Signing secrets are server-owned in `posSyncSecrets/{tenantId}_{storeId}` and denied to direct clients by Firestore rules.
- The secret route accepts only the login store or an explicitly session-mapped selected outlet, rejects malformed/unmapped stores, derives tenant authority from the authenticated session, and rechecks the canonical target store plus integration permission before returning or mutating a secret.
- Only users with `canManageIntegrations` can read, ensure, or rotate a secret through the protected no-store route.
- Legacy secrets migrate on settings read, connection test, or delivery.
- Store documents retain only `posSync.secretVersion`; the version invalidates in-flight work after rotation.
- Provider URLs must use HTTPS, contain no credentials or fragments, resolve only to public addresses, and cannot redirect.
- Secret, test, and delivery routes refuse provider work with retry guidance when the shared rate-limit provider is unavailable.
- Provider response bodies and raw exception text are not exposed to owners or logs.

## Key source files

| Responsibility | Source |
| --- | --- |
| Feature posture | `src/config/features.ts` |
| Loaded-store registration and debounce | `src/lib/posSync/eventBuilder.ts` |
| Shared acknowledged-save trigger | `src/database/projects/index.ts` |
| Provider URL and DNS admission | `src/lib/posSync/webhookUrl.ts`, `serverWebhookTarget.ts` |
| Pinned HTTPS transport | `src/lib/posSync/pinnedWebhookRequest.ts` |
| Server secret store | `src/lib/posSync/serverSecretStore.ts` |
| Secret API | `src/app/api/pos-sync/secret/route.ts` |
| Test and delivery APIs | `src/app/api/pos-sync/test/route.ts`, `deliver/route.ts` |
| Desktop/mobile | `PosSyncTab.tsx`, `MobilePosSyncScreen.tsx` |
| Firestore client denial | `firestore.rules` |
| Source verifier | `scripts/verification/verify-pos-sync-boundary.js` |
| Behavioral tests | `scripts/verification/test-pos-sync-boundaries.ts` |
| Rules emulator test | `scripts/verification/test-pos-sync-secret-rules.ts` |

## Release boundary

The server-owned secret change needs coordinated release order:

1. deploy the app routes/UI;
2. deploy Firestore rules;
3. open/test each existing connection or run the documented migration tool when added to the release procedure;
4. run a real provider smoke in staging, then production.

Do not deploy the new Firestore rule before the compatible app: the previous browser implementation wrote `store.posSync.webhookSecret`, which the new rule intentionally rejects.

## Verification

```bash
npm run verify:pos-sync-boundary
npm run test:pos-sync-boundaries
npm run test:pos-sync-secret:rules
npx tsc --noEmit
```

These gates do not contact a real external provider. Provider smoke and coordinated deployment remain release-owner work.

## History

Historical proposals and prior external reviews remain under [`_archive`](./_archive/). They are not active runtime commitments.

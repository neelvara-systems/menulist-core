# External Menu Sync — Specification

> **Status:** Implemented in source
> **Feature flag:** `ENABLE_POS_SYNC: true`
> **Last code-truth review:** July 16, 2026

## 1. Purpose

External Menu Sync lets a store send MenuList's current menu truth to one trusted external HTTPS endpoint. MenuList remains the source; the receiver decides how to validate and apply the signed full snapshot.

## 2. Admission

The owner surface is shown only when the feature flag is enabled and the user has `canManageIntegrations`. Each outlet configures its own destination.

Required setup:

- active tenant and store;
- authorized owner/manager integration permission;
- public HTTPS endpoint supplied by the receiver;
- server-owned signing secret;
- successful connection test before operational reliance.

## 3. In scope

- one destination per store;
- full menu snapshot JSON;
- HMAC-SHA256 signature over `timestamp.rawBody`;
- delivery ID, menu version, event name, and timestamp headers;
- 25-second tenant/store/project debounce;
- one five-second delivery attempt;
- last 20 owner-visible log rows, with bounded cleanup convergence;
- connection test;
- server-owned secret reveal, copy, ensure, and typed-confirmation rotation;
- desktop and MobileShell configuration parity;
- setup email draft, technical summary, and sample payload handoffs;
- safe owner status: Connected, Connection issue, Disabled.

## 4. Out of scope

- inbound writes to MenuList;
- named vendor certification without provider proof;
- multiple destinations;
- OAuth to a POS vendor;
- webhooks received from the POS;
- automatic retry or guaranteed delivery;
- delta delivery;
- gzip transport;
- universal POS compatibility;
- claim that a 2xx response means the menu was applied;
- direct Google Business Profile synchronization;
- social publishing, ad spend, or marketplace connectors.

## 5. Trigger contract

The loaded store context registers `enabled` plus the provider URL in the browser. The signing secret is never part of the registration.

After an acknowledged `updateProject()` or `updateProjectWithoutLoader()` save, the shared project DAL calls the POS trigger. The trigger exits for an unregistered or disabled connection. Rapid saves reset the same tenant/store/project timer.

The browser owns the timer. If the tab closes before 25 seconds, no durable job remains. A subsequent acknowledged project save sends the latest full snapshot. Background server writes that do not cross the client project DAL are not separately emitted.

## 6. Delivery admission and ordering

`POST /api/pos-sync/deliver` must process in this order:

1. authenticated route wrapper;
2. feature flag;
3. bounded JSON body and strict IDs;
4. tenant access;
5. fail-closed store-scoped rate limit;
6. canonical store/lifecycle/integration-or-publish permission check;
8. HTTPS URL validation;
9. DNS resolution and public-address admission;
10. one transaction reading store, project, and server secret;
11. exact URL/enable state recheck;
12. legacy secret migration if required;
13. menu-version claim and current project snapshot in the same transaction;
14. payload construction and signing;
15. pinned-address HTTPS POST without redirects;
16. atomic log and eligible status completion;
17. bounded log retention cleanup.

Reading the project in the version transaction is mandatory. It prevents a higher version from being assigned to an older snapshot during concurrent saves.

## 7. Payload contract

Top-level fields:

- `event`: `menu.full.sync`;
- `version`: positive safe integer;
- `timestamp`: ISO time created by MenuList;
- `tenantId`, `storeId`, `projectId`;
- `currency` from the store;
- normalized project languages;
- `menu.categories` and `menu.items`.

The formatter uses an explicit allow-list. It excludes extraction metadata, prompts, costs, owner-only notes, quality-review metadata, aliases, and internal decision-fact provenance.

Headers:

```text
Content-Type: application/json
X-MenuList-Signature: <hex HMAC-SHA256>
X-MenuList-Event: menu.full.sync
X-MenuList-Version: <version>
X-MenuList-Timestamp: <unix seconds>
X-MenuList-Delivery-Id: <unique delivery id>
```

Receiver verification input is `<timestamp>.<exact raw request body>`. Receivers should reject stale timestamps and deduplicate delivery IDs/versions according to their own policy.

## 8. Secret contract

- Canonical storage: `posSyncSecrets/{tenantId}_{storeId}`.
- Direct Firestore client read/write: denied.
- Owner access: protected `/api/pos-sync/secret`, `private, no-store`, `canManageIntegrations` required.
- Store marker: `posSync.secretVersion`, not the secret.
- Legacy `posSync.webhookSecret`: migration source only.
- Rotation: creates a new secret and version atomically; the prior secret stops signing new requests immediately.
- Browser copy/reveal: deliberate action only; masked by default.
- Logs: never include raw secret, URL, provider response body, or raw exception text.

## 9. URL and transport security

- HTTPS only.
- No username/password in URL.
- No fragments.
- Local, private, link-local, multicast, documentation, special-use, and non-global IPv4/IPv6 targets rejected.
- All resolved addresses must pass admission.
- Approved addresses are frozen into the HTTPS lookup.
- TLS validates the configured hostname.
- Redirects are not followed.
- Headers are capped and response body is discarded.
- Timeout: five seconds.

## 10. Failure behavior

Live delivery:

- success resets `consecutiveFailures`, sets `healthy`, and records `lastSentAt`;
- failure one and two are logged but remain owner-quiet;
- failure three sets `connection_issue` and fixed owner copy;
- an older completion cannot overwrite a newer completed version;
- a rotated or changed connection invalidates in-flight completion.

Connection test:

- one attempt;
- a 2xx response is “reachable”;
- invalid URL, blocked DNS target, timeout, transport error, or non-2xx marks the tested current connection as an issue;
- response to the browser remains bounded and owner-safe.

## 11. Owner experience

Desktop and mobile provide the same essential operations. Mobile remains in `MobileShell > More`; no route bypass or reload is allowed. Healthy delivery is silent. Owners see technical controls only inside the integration screen.

## 12. Cost and scale

- No Cloud Function worker or scheduler.
- No delivery queue collection.
- Provider calls occur only for POS-enabled loaded stores after acknowledged project saves or explicit tests.
- Delivery, connection-test, and secret routes refuse provider work when the shared rate-limit provider cannot admit the request.
- Retention scan is capped at 100 log documents and keeps the newest 20.
- One destination and full snapshots keep state simple.
- A durable server event/queue would be a separate architecture decision justified only by real provider volume or a delivery guarantee; it is not implied by current copy.

## 13. Acceptance criteria

- All three focused gates pass.
- TypeScript and lint pass for touched source.
- A staff/browser client cannot read or write `posSyncSecrets`.
- A client cannot add/change/delete `store.posSync.webhookSecret`.
- Legacy secret migration preserves the active connection.
- Desktop and mobile can load, ensure, reveal, copy, rotate, and test through protected routes.
- Concurrent delivery cannot assign a newer version to an older project read.
- Every acknowledged shared project-DAL save uses the same debounce trigger.
- No active docs claim retries, gzip, universal vendor support, guaranteed application, or direct GBP sync.
- Staging and production provider smoke remain pending until credentials/endpoints and deployment authority are supplied.

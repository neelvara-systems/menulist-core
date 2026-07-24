# External Menu Sync — Test Cases

> **Last reviewed:** July 16, 2026

## Automated source gate

Run `npm run verify:pos-sync-boundary`.

It must verify:

- auth, feature flag, permission, tenant and strict ID admission;
- bounded request bodies and fail-closed rate limits;
- URL, DNS, frozen-address HTTPS, timeout, and no redirects;
- server-owned secret route/storage/migration;
- client rule denial and legacy-field immutability;
- project snapshot/version transaction coupling;
- version/connection-ordered status completion;
- payload allow-list, bytes, and hash;
- shared project-DAL trigger and loaded-store registration;
- absence of editor-only trigger and client secret persistence;
- desktop/mobile test/secret parity;
- MobileShell routing;
- maintained docs and pending provider smoke boundary.

## Behavioral unit cases

Run `npm run test:pos-sync-boundaries`.

Expected cases:

- public HTTPS accepted;
- HTTP, localhost, private, documentation, special-use, multicast, and invalid IPv4/IPv6 rejected;
- pinned lookup serves only approved hostname/address/family;
- blocked/malformed pinned addresses rejected;
- menu version normalizes and stops at safe-integer ceiling;
- older completion ignored;
- first/second failure owner-quiet, third failure connection issue;
- success resets failure state;
- payload includes approved public fields;
- payload excludes internal provenance, aliases, review metadata, and unsafe localized keys;
- malformed input is normalized without leaking internal data.

## Firestore emulator cases

Run `npm run test:pos-sync-secret:rules`.

Expected cases:

- unauthenticated client cannot read/write `posSyncSecrets`;
- owner cannot read/write `posSyncSecrets` directly;
- staff cannot read/write `posSyncSecrets` directly;
- platform client cannot read/write `posSyncSecrets` directly;
- owner can update non-secret POS config while legacy secret remains unchanged;
- owner cannot add, replace, or delete legacy `store.posSync.webhookSecret`;
- owner can save a config with `secretVersion` and no raw secret.

## Route cases

### Secret GET

- 401 unauthenticated;
- 403 wrong tenant/store or missing integration permission;
- 400 malformed/ambiguous IDs;
- 404 no secret;
- 429 limit exceeded;
- 503 limiter unavailable;
- 200 canonical secret/version with private no-store headers;
- legacy field migrates to canonical document and is deleted atomically;
- server secret wins if legacy and canonical values conflict.

### Secret ensure/rotate

- strict 4 KiB JSON body;
- unknown fields/action rejected;
- ensure returns existing value without rotation;
- ensure creates version 1 when absent;
- rotate increments version and replaces secret;
- rotation resets stale error/failure state;
- response body parser rejects malformed or oversized data;
- raw secret never enters diagnostics.

### Connection test

- invalid store lifecycle/permission exits before DNS/provider;
- invalid URL and blocked DNS return fixed failure;
- connection change during admission returns 409;
- legacy secret migrates;
- signature uses server secret;
- 2xx returns reachable;
- 3xx is failure and not followed;
- non-2xx, timeout, connection failure return fixed owner text;
- status write applies only to the tested URL/secret version.

### Delivery

- rate-limit provider outage returns 503 with retry guidance before Firestore/provider work;
- invalid project ID exits before Firestore/provider;
- project missing/deleted exits;
- snapshot and menu version claimed in one transaction;
- concurrent rotation invalidates completion;
- concurrent newer completion prevents older overwrite;
- HMAC covers timestamp and exact raw body;
- log contains bytes/hash but not payload/secret;
- first/second/third failure behavior;
- newest 20 retained, scan capped at 100;
- retention failure does not rewrite delivery outcome.

## Desktop cases

- tab hidden without feature/permission;
- secret loads from protected route and is masked;
- missing secret is ensured before enabling;
- URL save requires shared validation;
- copy feedback only after clipboard/fallback acknowledgement;
- typed rotation waits for server success;
- failed secret request preserves current displayed secret/status;
- test accepts only shaped OK acknowledgement;
- last 20 logs load store-scoped;
- ordered/limited history reads require matching parent tenant and store claims;
- wrong-tenant, wrong-store and unauthenticated history reads fail;
- every client log write fails, including owner, staff and platform sessions;
- malformed/mismatched delivery rows are omitted and observed rather than coerced;
- owner state excludes provider error text, payload hash/size, and unknown stored fields;
- provider email action opens a draft and counts preparation only;
- no raw provider/secret data in diagnostics.

## Mobile cases

- entry stays inside More/MobileShell;
- no direct route/reload bypass;
- secret never hydrates/writes through store document;
- ensure before enabling;
- typed rotation blocks conflicting controls while loading;
- non-secret settings require acknowledged `updateStore()`;
- reset affects only unsaved toggle/URL;
- test parity with desktop;
- touch targets, masked secret, status text, and fixed failures remain usable.

## Shared mutation cases

- standalone acknowledged `updateProject()` registers one debounce;
- `updateProjectWithoutLoader()` uses the same boundary;
- linked-outlet acknowledged save uses the same boundary;
- editor contains no separate trigger;
- disabled/unregistered store creates no timer/provider request;
- tenants/stores/projects use different debounce keys;
- repeated save resets only the matching key;
- browser close before timer is documented as non-durable, not treated as guaranteed delivery.

## Manual staging provider certification

Owner/release engineer must provide a controlled HTTPS receiver and record:

- endpoint ownership;
- test request timestamp, headers, body hash, and 2xx;
- signature verification result;
- full snapshot schema validation;
- actual applied-menu result;
- secret rotation invalidates old signature;
- redirect/private target rejection;
- timeout/non-2xx status behavior;
- two quiet failures and third visible issue;
- recovery after successful test/save;
- desktop and mobile setup;
- one linked-outlet and one standalone save;
- app-close-before-debounce limitation.

Production certification repeats a minimal test/delivery/rotation check after coordinated app and rules deployment. No local gate substitutes for this evidence.

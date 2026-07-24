# Answerlattice Help Widget - Test Cases

> **Updated:** July 18, 2026

## Automated Gates

- `npm run test:answerlattice-widget-config-contracts`
- `npm run test:answerlattice-widget-runtime-token`
- `npm run test:answerlattice-widget-key:emulator`
- `npm run typecheck:answerlattice`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `npm run verify:dependency-freeze`

## Configuration Validation

1. Accept exact `http://` and `https://` origins with optional ports.
2. Reject credentials, paths, queries, fragments, wildcard hosts, non-HTTP schemes, and over-limit values.
3. Reject the whole save when one submitted origin is invalid.
4. Accept `*`, exact paths, and descendant `/*` route rules.
5. Reject loose wildcard rules such as `/billing*`.
6. Confirm an unchanged normalized save creates no store write.

## Key Lifecycle

1. Generate a key and confirm the raw value is returned once with a private no-store response.
2. Mutate the persisted store so `pId`/`productId`, `tId`/`tenantId`, or `sId`/`storeId`/`id` conflicts and confirm the active key is rejected before any widget route derives scope.
3. Confirm only the hash and bounded summary are persisted.
4. Rename by opaque key ID.
5. Revoke and confirm the hash leaves active lookup while bounded revoked metadata remains.
6. Confirm a lost key cannot be copied from the server.
7. Confirm a revoked key fails public config admission after the bounded auth cache expires.
8. Confirm runtime-token creation/verification rejects whitespace-mutated keys plus stringified tenant, store, clock, and TTL values.
9. Confirm a managed record with unknown status, foreign product, wrong purpose, missing/unknown/duplicate scopes is rejected and cannot be resurrected through its mirrored top-level hash; confirm a true top-level-only legacy hash remains supported.

## Loader And Iframe

1. Confirm the maintained loader creates `/widget/embed` without the raw key in the iframe URL.
2. Confirm bootstrap postMessage targets only the Answerlattice origin.
3. Confirm the embed wrapper accepts messages only from its parent window and a valid `al_*` key shape.
4. Confirm iframe and runtime requests use no-referrer policy.
5. Confirm `401`, `403`, and `404` config responses hide the launcher and public `show()` cannot reopen it.
6. Confirm transient config failure uses bounded retry and does not bypass restricted-origin runtime authorization.
7. Confirm config and predictive session-storage keys contain the complete widget credential and two credentials sharing a prefix cannot reuse state.
8. Confirm oversized/malformed config responses, string/fractional versions or expiries, non-boolean capabilities, and capability/bundle disagreement fail before browser state/cache mutation.

## Access And Presentation

1. Confirm configured exact origins pass and unlisted origins fail.
2. Confirm empty origins remain explicit open-origin mode and display a warning.
3. Confirm exact and descendant route blocks match identically in server contracts and loader behavior.
4. Confirm branding output is limited to the public schema.
5. Confirm management responses are private no-store.
6. Confirm mobile key/origin/route controls meet the 44px touch contract.

## Recent Widget Activity

1. Confirm indexed and fallback activity queries constrain exact `pId: AL` before their limits; shared-Firebase rows from another product with colliding tenant/store IDs are never serialized.
2. Confirm the fallback row guard independently requires exact Answerlattice product, tenant, store, and widget-origin truth.
3. Confirm activity responses remain private/no-store and timestamp-invalid legacy rows become `null` or sort oldest.

## External Evidence Still Required

- Hosted browser smoke on an allowed origin.
- Hosted browser smoke on a denied origin.
- A real key rotation across an installed customer environment.
- Verification that production CDN/proxy behavior preserves the intended no-referrer and private-cache headers.

## Feature 16 Answer And Fallback

1. Confirm unsafe/private RAG URLs are omitted while admitted public citations remain usable.
2. Confirm article, FAQ, and changelog suggestions trigger a follow-up search.
3. Confirm failed screenshot processing produces visible text-only disclosure.
4. Confirm feedback replay returns and renders the persisted resolution outcome.
5. Confirm unresolved feedback opens a required-email support form.
6. Confirm one exact widget search-history row creates one deterministic ticket and one signal identity.
7. Confirm replay returns the existing ticket, solved history is rejected, and wrong-scope/non-widget history is denied.
8. Confirm the public caller cannot submit internal retrieval debug, tenant scope, ticket status, or priority.
9. Confirm support-request success copy promises only ticket creation.
10. Run `npm run test:answerlattice-widget-answer-contracts` and `npm run test:answerlattice-widget-escalation:emulator`.

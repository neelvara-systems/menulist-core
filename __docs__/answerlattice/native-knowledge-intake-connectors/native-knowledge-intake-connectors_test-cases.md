# Native Knowledge Intake Connectors - Test Cases

> **Last Updated:** 2026-07-19

## Current Boundary

1. `ENABLE_ANSWERLATTICE_INTAKE_NATIVE_CONNECTORS` remains false.
2. `runtimeFlagReferences.length === 0` outside the flag definition.
3. No matching Functions flag exists.
4. No connector/OAuth/credential/sync runtime path exists.
5. Public Answerlattice copy does not claim native connector availability.
6. Existing Knowledge Intake remains usable through selected URLs, files/exports, pasted evidence, repeated replies, and supported media.
7. Firestore, Storage, Functions, provider, and scheduler operation count for the reserved feature is zero.
8. Feature 41 remains a do-not-build-now decision until the evidence gate is met.

## Future Provider Tests

If one provider is approved later, test exact scopes, selected containers, cross-tenant denial, token revocation, reconnect, pagination caps, provider 401/403/429/5xx behavior, replay, duplicate/change identity, permission loss, disconnect, deletion, dependent-answer review, privacy projection, cost caps, and no automatic truth publication.

## Command

- `npm run verify:answerlattice-native-intake-connectors`


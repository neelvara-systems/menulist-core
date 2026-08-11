# GitHub Change Intake - Test Cases

> **Last Updated:** 2026-08-11

## Contract Tests

1. Setup state rejects invalid signatures, expired state, wrong purpose, unknown fields, wrong user, and wrong workspace.
2. Repository selection rejects duplicates, more than ten repositories, unknown pending repositories, unsupported settings, and a policy with no admitted event type.
3. Release admission accepts only `published` releases from selected repositories.
4. Pull-request admission accepts only merged `closed` events on the repository default branch.
5. Required labels are case-insensitive and suppress unmatched pull requests.
6. Release and pull-request evidence is bounded and excludes patch/source content.
7. Deterministic event and job identities are stable and valid Firestore document ids.
8. Delivery ids are hashed before persistence.

## API and Security Tests

1. Connect, setup, callback, get, save, and disconnect require authentication and `canManageIntegrations`.
2. The setup callback does not save an installation before GitHub user-installation verification.
3. OAuth and installation access tokens are never persisted or returned to the browser.
4. Webhook signature is verified against the raw body before JSON parsing and Firestore access.
5. Missing/invalid signature, event, delivery id, installation, repository, and oversized body fail safely.
6. Provider rate-limit failure fails closed before database work.
7. Duplicate or in-progress delivery creates no second source.
8. Failed processing can retry after the processing lease.
9. The daily workspace cap creates no source and acknowledges the event.
10. Cross-workspace repository bindings cannot modify another workspace config.
11. Setup and policy changes require an active server-verified subscription.
12. An inactive subscription stops webhook processing before replay, source, or job writes.
13. OAuth callback and return origins use the active deployment target and ignore request host headers.
14. Provider JSON is byte-bounded and malformed, oversized, or partial GraphQL data fails closed.
15. The merged-PR path query requests only file paths and never calls the REST files endpoint that returns patches.
16. Setup and webhook secrets must be distinct and meet the minimum length.

## Workflow Tests

1. An admitted event reuses the existing Knowledge Intake summary and source contracts.
2. A full or published rolling job moves to the next deterministic job slot.
3. Later events begin at the stored monthly slot and do not rescan earlier full jobs.
4. Webhook processing performs no model call and consumes no support credits.
5. Existing owner-triggered analysis creates review drafts from the imported source.
6. Imported GitHub evidence remains unreviewed and private until source governance changes it.
7. Starting a reconnect leaves the prior active binding usable until the owner saves the replacement selection.
8. Disconnect deletes bindings but not historical intake evidence.
9. A suspended or access-changed connection cannot recreate active bindings by saving old settings; only a fresh verified setup can restore it.
10. The owner can disconnect while repository selection is still pending.
11. An expired first-time pending selection returns to the restartable disconnected state without a Firebase cleanup write.
9. Installation deletion/suspension prevents later source intake.
10. Removing many repositories uses one installation-scoped binding query and removes every affected workspace binding.
11. Concurrent event completion cannot move the monthly rolling-job pointer backward.
12. The outbound GitHub issue adapter remains unchanged.
13. The responsive card works at mobile and desktop widths.
14. Public website code and copy remain unchanged.

## Commands

- `npm run test:answerlattice-github-change-intake`
- `npm run verify:answerlattice-native-intake-connectors`
- `npm run typecheck:answerlattice`
- `npx tsc --noEmit`
- focused lint for changed source files

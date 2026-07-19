# Canonical Answer Governance Test Cases

## Automated gates

| Gate | Coverage |
| --- | --- |
| `npm run test:answerlattice-governance-contracts` | Action and stored-proposal schemas, including revision fingerprint validation |
| `npm run test:answerlattice-governance-client` | Safe bounded API errors, valid success payloads, fail-closed mismatched responses |
| `npm run test:answerlattice-canonical-scope` | Scope/version applicability and canonical overlap behavior |
| `npm run test:answerlattice-governance:emulator` | Create, reviewer edits, optional clear, legacy/stale update rejection, idempotency, audit, and invalidation |
| `npm run test:answerlattice-governance:rules` | Separate-project Firestore browser permissions |
| `npm run test:answerlattice-governance:shared-rules` | Shared-rule fallback parity |
| `npm run typecheck:answerlattice` | Answerlattice TypeScript boundary |
| `npm run verify:answerlattice-runtime-truth` | Broad Answerlattice source and contract regression suite |

## Critical behavior cases

1. **Create proposal:** canonical collection remains unchanged until approval.
2. **Reviewer edit:** approval writes reviewer-edited content, not stale proposed content.
3. **Optional clear:** empty reviewer edge-case or constraint text is removed.
4. **Applicability:** plan, role, state, and version values survive proposal and approval.
5. **Legacy update:** manual update without a fingerprint returns 409 and leaves truth unchanged.
6. **Legacy signal update:** timestamp fallback rejects when the answer changed after proposal creation.
7. **Stale update:** changed fingerprinted base answer returns 409 and leaves truth unchanged.
8. **Fresh update:** matching fingerprint applies successfully.
9. **Idempotent replay:** repeated approval does not repeat cache/source invalidation.
10. **Audit:** one canonical audit event exists for each successful create or update.
11. **Browser denial:** canonical create/update/delete and proposal review updates are denied by rules.
12. **Tenant isolation:** out-of-scope answer, entity, proposal, and audit access is denied.
13. **Public error:** safe server guidance reaches the editor without exposing internal error details.

## External checks

- Authenticated narrow-width editor smoke
- Authenticated desktop create/update/review smoke
- Deployed environment verification of permission-denied and stale-proposal messaging

These checks are external evidence, not prerequisites for local source completion.

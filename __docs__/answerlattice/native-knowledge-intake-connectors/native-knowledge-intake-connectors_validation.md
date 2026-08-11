# GitHub Change Intake - Validation Record

> **Date:** 2026-08-11
> **Feature:** 41 of 44
> **Decision:** Implement one rollout-gated provider
> **Status:** Local source complete; hosted provider evidence pending

## Evidence Reconsidered

- Release-to-Truth is now a central owner workflow rather than a speculative connector use case.
- The existing manual GitHub Release handoff proves the data and governance boundary but leaves repeated copy work.
- The primary ICP already ships product changes through GitHub.
- GitHub events can feed existing Knowledge Intake, source governance, Release-to-Truth, Answer Tests, Daily Brief, and distribution without a new owner queue or model call.
- A GitHub App can be repository-scoped and webhook-driven, avoiding polling, broad workspace crawls, repository cloning, and code indexing.
- Market comparison is not sufficient by itself; the implementation is admitted because it removes a recurring owner job using existing Answerlattice authority, not because another product has a connector.

## Decision Guardrails

- GitHub only.
- Read-only.
- Owner-selected repositories.
- Releases by default; merged pull requests are optional and default-branch only.
- No source code or patch retention.
- No runtime model call.
- No automatic truth/publication.
- False rollout flag until hosted provider evidence exists.
- No public website claim in this pass.

## Evidence Still Required Before Activation

- GitHub App registration and exact permission review;
- QA callback and setup-state behavior;
- real installation ownership verification;
- signed Release and merged-PR webhook smoke;
- disconnect, suspension, deletion, replay, and provider-failure behavior;
- one real workspace proving that imported changes reduce owner maintenance work;
- measured Firestore/provider operation counts.

## Local Verification Record

Passed on 2026-08-11:

- `npm run verify:answerlattice-native-intake-connectors`;
- `npm run typecheck:answerlattice`;
- `npx tsc --noEmit --pretty false`;
- focused ESLint across the connector, routes, owner control, shared intake changes, and rule tests;
- source review confirming that suspended/access-changed bindings cannot be reactivated through settings save and pending setup remains cancellable;
- `npm run test:answerlattice-knowledge-intake:rules`;
- `npm run test:answerlattice-knowledge-intake:shared-rules`;
- `npm run verify:security-os`, the product-filtered audit, and the read-only `answerlattice.authority-and-ingress` evidence plan after registering the connector verifier;
- `npm run verify:dependency-freeze`;
- `npm run docs:check-links` with zero broken links; and
- `git diff --check` after correcting the feature-doc EOF.

The aggregate Answerlattice runtime-truth command reaches an unrelated, previously changed public-site wording assertion in `src/app/sites/answerlattice/productAreas.ts`. This pass does not alter that website file because website work is explicitly deferred. The dedicated connector verifier and all connector-owned checks pass.

## Deployment Record

The required dedicated-rules command was attempted:

```bash
firebase deploy --only firestore:rules --project answerlattice-qa --config firebase-answerlattice.json --non-interactive
```

It stopped before upload with `Error: Failed to authenticate, have you run firebase login?`. No remote rule revision changed. No Vercel, app, Functions, Storage, index, or website deployment was attempted.

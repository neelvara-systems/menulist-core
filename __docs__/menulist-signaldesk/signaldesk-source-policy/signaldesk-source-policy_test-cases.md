# SignalDesk Source Policy Test Cases

**Status:** Current executable coverage
**Last verified:** July 29, 2026

## Commands

```bash
npm run verify:signaldesk
npm run test:signaldesk:source-policy-contracts
npm run test:signaldesk:source-policy-boundary
npm run test:signaldesk:source-data-lifecycle
env -u GOOGLE_APPLICATION_CREDENTIALS GCLOUD_PROJECT=demo-signaldesk-source-import firebase emulators:exec --only firestore --project demo-signaldesk-source-import --config firebase-signaldesk.json "env -u GOOGLE_APPLICATION_CREDENTIALS SIGNALDESK_E2E_FOCUS=source-import node scripts/verification/e2e-signaldesk-local.js"
npm run test:signaldesk:rules
npm run typecheck
```

## Create and Use

| Case | Expected |
| --- | --- |
| Missing, malformed, foreign, expired, or review-required policy | Operation fails closed. |
| Throwing persisted document or timestamp getter | Stable `SOURCE_POLICY_SHAPE_INVALID`; arbitrary getter detail is not exposed. |
| Path-shaped or whitespace-mutated persisted policy/run/template reference | Dependent projection or operation fails closed before a Firestore reference is constructed. |
| Undeclared persisted private field | Omitted from the normalized policy projection. |
| Evidence disabled but import/storage/personalization/contact requested | Schema or use guard rejects. |
| Contact enabled without bounded access method/channel/field | Schema rejects. |
| Provider policy missing provider or provider refresh | Schema rejects. |
| Exact create retry | Returns one durable policy. |
| Changed create request under same key | Idempotency conflict. |
| Public/evidence-only row includes contact values | Contact identity is not established. |
| Draft requested without durable recipient authority | No draft or approval truth is created. |
| Current policy use is reduced after evidence/draft | Later dependent action rechecks and blocks. |

## Renewal

| Case | Expected |
| --- | --- |
| Valid review and extending expiry within retention | Authority window updates and status is active. |
| Exact retry | Same durable policy, no second effect set. |
| Changed facts under same key | Renewal idempotency conflict. |
| Blocked policy | Renewal blocked. |
| Regressing review/non-extending expiry/expiry beyond retention | Renewal window invalid. |
| Existing target imported under policy | Target remains byte-equivalent at its update boundary. |
| Policy terms and creation truth | Remain unchanged. |
| Previously held/tombstoned target | Remains held; no data revival. |

## Lifecycle

The source-data lifecycle emulator covers hold-first materialization, provider tombstones, route-token revocation, bounded resumable dependency phases, legal/suppression/outcome/audit retention, poison-row recovery, overflow, stale-writer protection, retries, and independent scheduler leases.

Expected warning logs in negative/lease-failure fixtures do not indicate suite failure; the command exit and explicit final pass line are authoritative.

## Release Evidence Still Pending

- authenticated QA Functions/index deploy;
- remote scheduler state/lease proof;
- controlled expired-policy cleanup smoke in disposable QA data;
- owner-authenticated desktop policy create/renew UI smoke;
- provider-source smoke only after provider terms, credentials, budgets, and feature activation are approved.

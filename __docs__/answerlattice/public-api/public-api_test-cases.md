# Answerlattice Public API v1 - Test Cases

> **Last Updated:** 2026-07-20

## Local Source and Contract Tests

| Area | Case | Expected |
| --- | --- | --- |
| Flag | Main flag off | External routes return 404; owner route/navigation/component hidden. |
| Credential | Exact AL product, purpose, valid explicit scope | Required endpoint admitted. |
| Credential | Missing product/purpose/scopes, unknown/duplicate scope, widget/ML key | Rejected. |
| Summary | Invalid hash, prefix, product, purpose, date, or scope | Management summary returns null, not a misleading active key. |
| Lifecycle | Create/rotate | Raw returned once; hash-only store write; previous key invalid immediately; audit summary created. |
| Lifecycle | Exact create/rotate retry after lost response | Same committed summary; no second rotation or audit; retained raw candidate remains usable. |
| Lifecycle | Same operation ID with changed key/scopes | `409`; committed key remains unchanged. |
| Lifecycle | Revoke | Store credential deleted immediately; audit summary created; no secret/hash in audit. |
| Workspace state | Session/access scope changes while status or mutation is in flight | Previous status/raw secret is not rendered; stale response cannot settle; mismatched request returns `409` before credential work. |
| Scope | `public:read` on signals | Rejected. |
| Tenant | Wrong/inactive/deleted/blocked workspace | Rejected before feature work. |
| Browser | External request has Origin | `403 BROWSER_ACCESS_NOT_SUPPORTED`. |
| CSRF | Key-management request has foreign Origin | `403 Origin not allowed`. |
| Rate limit | Provider unavailable | Fail closed with 503. |
| Answer | Valid canonical match | Approved public projection with normalized citations. |
| Answer | No match/context required/review required | `canonical: false` with bounded fallback/clarification. |
| Answer privacy | Internal drift reason/debug/evidence/audit/graph fields | Not present. |
| Answer privacy | Persisted `productBinding` gains an internal sibling | Only introduced/last-validated/applicable version fields are projected. |
| Guided answer | Persisted procedure is malformed or contains unknown structure | Procedure is omitted; unknown structure is never serialized publicly. |
| Canonical ranking | Validation timestamp getter throws or timestamp is invalid | Recency contributes no score; other valid ranking inputs continue. |
| Entities | Default query | Active/beta only, deterministic order, capped result. |
| Entities | Deprecated status requested | Validation fails. |
| Entities | Bounded source cannot prove completeness | `truncated: true`; no v1 cursor is implied. |
| Entities | Type/status narrowing with unrelated rows ahead of matches | Firestore applies both predicates before the cap; unrelated rows cannot consume the bounded page. |
| Entities | Same stable payload with different generated time | Same ETag; matching `If-None-Match` returns 304. |
| Public timestamp | Invalid date or throwing timestamp-like getter/Proxy | Returns `null`; the public response is not replaced by an internal error. |
| Signals | Allowed type + unique idempotency key | One accepted event. |
| Signals | Exact retry | No duplicate event. |
| Signals | Same key, changed content | 409 replay conflict. |
| Signals | Predictive widget interaction type | Rejected. |
| Metadata | Reserved source/user/request/actor fields | Stripped and replaced by server-owned values where required. |
| Metadata | Cyclic object, invalid date, nonfinite number, throwing getter, or Proxy | Failure-contained normalization; no object coercion, unstable identity, or incompatible write. |
| Response | Owner/API payload malformed or oversized | Fixed error; no raw body/error projection. |

## Automated Commands

```bash
npm run test:answerlattice-public-api-contracts
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-signal-contracts
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-public-api-key:emulator
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-public-api:rules
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-public-api:shared-rules
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-governance:rules
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-governance:shared-rules
npm run typecheck:answerlattice
npx tsc --noEmit --pretty false --incremental false
node scripts/verification/verify-answerlattice-runtime-truth.js
npm run verify:dependency-freeze
npm run docs:check-links
git diff --check
```

## Hosted/External Evidence Required Before Enablement

| Evidence | Pass condition |
| --- | --- |
| Issued QA key | Raw key shown once and stored in approved secret manager. |
| Hosted answer request | Correct approved answer or safe abstention for representative questions. |
| Hosted entity request | Stable ETag and bounded active/beta output. |
| Hosted signal replay | Exact retry deduplicated; conflict rejected. |
| Rotation/revocation drill | Old key fails immediately; new key works only with selected scopes. |
| Quota/provider outage | Rate limiting fails closed and recovers without uncontrolled traffic. |
| Privacy inspection | No private source URL, PII, audit, hash, or key leakage. |
| Customer workflow | Verified task/support outcome improves without hiding unresolved cases. |
| Responsive owner screen | Narrow-width status, copy, rotate, and revoke behavior remains usable. |

## Stop Rules

Do not enable or keep enabled if any critical evaluation question is answered incorrectly with high confidence, any revoked/wrong-tenant credential is accepted, private evidence leaks, signal replay duplicates or overwrites truth, rate limiting fails open, or the customer has no named server-side workflow that produces verified value.

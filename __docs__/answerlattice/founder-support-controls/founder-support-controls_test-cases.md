# Founder Support Controls - Test Cases

## Answerlattice Answer Tests Runtime Boundary

The runtime verifier source-gates these cases in addition to browser/API tests:

- rate limiting precedes the Firestore-backed permission check on save, run, release-check, and rollback
- full-runtime SAFE_MODE precedes suite/preload reads and provider-capable execution
- persisted summary, release, answer, audit, and existing rollback-proposal scope uses exact shared normalizers
- release IDs are normalized before Firestore document reads
- answer-test execution does not write search history or instant cache state
- browser responses are bounded and owner actions preserve 44px targets

> **Status:** Acceptance matrix

## Answer Tests

1. Owner creates a canonical test with question and expected answer ID; run passes when retrieval returns that active answer.
2. Same test fails when another answer wins, expected answer is drifted, or retrieval falls back.
3. A fallback-expected test passes only when no canonical/owner answer is returned.
4. A canonical-only run performs no provider call and creates no search history, signals, conversations, or friction data.
5. Full-runtime test mode is credit checked, capped at 10 full-runtime cases within a 25-case run, and excluded from production analytics.
6. More than 100 saved cases, duplicate case IDs, oversized questions, malformed context, or unsupported expectations are rejected.
7. Two concurrent saves use revision checking so one cannot silently overwrite the other.
8. Repeating the same provider-backed request/case definition returns the existing atomic settlement without a second credit debit; changing the case definition changes the accounting key.
9. A retained-run write failure after provider execution keeps the reservation until expiry instead of immediately releasing it for another provider run.

## Release Safety

1. A release with affected entity IDs runs only cases linked to those IDs.
2. A release with no matching tests returns an explicit `no_matching_cases` result without collection scans.
3. Propose rollback reads a prior version, creates one pending `version_update` proposal, and leaves the active answer unchanged.
4. Cross-workspace answer, release, audit event, or proposal IDs are rejected.

## Known Issues

1. An active notice matching page context appears once in the widget.
2. A notice outside its start/end window does not appear even if a stale summary still contains it.
3. Resolved and archived notices never render.
4. A notice does not suppress or replace a canonical answer.
5. Invalid status transitions, non-HTTPS related links, oversized messages, and end-before-start windows are rejected.
6. Existing non-notice predictive triggers continue working unchanged.

## Verified Context

## Answerlattice Widget Security Runtime Boundary

1. Rotation and disable share the same hashed 3/hour budget and rate-limit before permission/store reads.
2. Evidence-host updates use a hashed 20/minute budget before permission/store reads and reject malformed, duplicate-normalized, path, port, credential, or non-HTTPS values.
3. All management responses are private/no-store; rotation requires `privateKeyShownOnce: true` and the browser does not retain the private key in reusable public response state.
4. Widget-key authentication and exact tenant/store scope normalization precede signed-claim verification and evidence-link use.
5. Owner actions and confirmations remain at least 44px high on mobile.

1. A valid EdDSA token with matching key ID, audience, and future expiry returns verified claims.
2. Expired, future-issued, overlong-lifetime, wrong-audience, wrong-key, wrong-algorithm, malformed, and tampered tokens are rejected.
3. Claims outside the allowlist are discarded.
4. Tenant/store values inside a token never affect workspace scope.
5. Private key is returned once and never appears in subsequent API responses, Firestore, logs, bundles, or exports.
6. Unsigned `identify()` remains supported but is labeled unverified internally.

## Evidence Links

1. Up to three HTTPS links on configured hosts persist with private widget-search activity.
2. HTTP, credential-bearing, non-allowlisted, oversized, duplicate, and malformed URLs are dropped.
3. Links are never fetched by the server and never included in public widget responses.
4. Owner links open in a new tab with safe browser flags.

## Export

1. An authorized owner receives scoped approved support truth only.
2. Staff without `canExportData` receives 403.
3. Cross-tenant records never appear.
4. Secret-bearing fields and private support content never appear.
5. Exceeding any cap returns 409 and no partial export body; exactly-at-cap data remains exportable.
6. Export rate limits fail closed when the limiter is unavailable.
7. More than two export attempts for the same user/workspace within one hour are rejected before the Firestore-backed permission lookup.

## Owner Support Assistant

1. Summary questions answer from compact summaries.
2. Questions never trigger raw ticket, conversation, signal, or detail-record reads.
3. Mutating requests are refused; the assistant only links to governed routes.
4. No assistant transcript is written.
5. Unsupported requests return a clear boundary response.

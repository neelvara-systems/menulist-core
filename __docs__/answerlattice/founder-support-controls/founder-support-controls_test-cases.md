# Founder Support Controls - Test Cases

## Answerlattice Answer Tests Runtime Boundary

The runtime verifier source-gates these cases in addition to browser/API tests:

- rate limiting precedes the Firestore-backed permission check on save, run, release-check, rollback, and proposal impact; provider uncertainty fails closed with `503`
- full-runtime SAFE_MODE precedes suite/preload reads and provider-capable execution
- persisted summary uses exact ID/product/numeric scope/schema/revision/case admission; stored releases use the strict release schema; answer, audit, rollback proposal, and rollback audit ownership fail closed
- run idempotency binds request ID to run kind, mode, suite revision, ordered selected case IDs, and release ID
- release IDs are normalized before Firestore document reads
- answer-test execution does not write search history or instant cache state
- browser responses are bounded and owner actions preserve 44px targets
- rollback source answer/audit authority and current entity bindings are transaction-current; missing/malformed procedure snapshots and malformed acknowledgements fail closed

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
10. A limiter-provider outage admits no save, test run, release check, rollback proposal, or proposal-impact work and returns `503`.
11. Version-1 cases load with `riskLevel = standard`, `citationPolicy = not_required`, and no expected references.
12. A specific-source test is rejected unless it declares at least one expected reference ID.
13. FAQ and RAG results pass evidence checks only when the required bounded reference IDs are present; unknown reference shapes are ignored.
14. Required claims, forbidden claims, minimum confidence, expected answer/FAQ ID, source route, and evidence policy fail independently and produce explicit reasons.
15. Any failed critical case produces `proofStatus = blocked`; standard-only failures produce `review`; all-passing results produce `ready`.
16. Proof status never changes a release, deployment, canonical answer, article, FAQ, signal, or proposal automatically.
17. A retained legacy run recomputes counts/status from valid result rows; malformed durations become zero and an all-invalid result array is omitted rather than reported ready.
18. Editing any active First 10 case after a retained run marks the Activation proof stale until a new run completes.
19. Changing canonical, KB/FAQ, docs-navigation, entity, entity-relation, or release source versions marks the retained proof stale until rerun.
20. A legacy retained run without source-version evidence cannot satisfy launch readiness and requires one owner-triggered rerun.
21. Activation reads current source versions from the exact-scoped compact summary, not the last compiled bundle snapshot, and returns no source-version counters to the browser.
22. Missing, null, blank, negative, fractional, or unsafe retained source-version values fail closed and cannot satisfy current proof.
23. Save ignores browser-authored case timestamps: changed/new definitions receive server time, unchanged definitions preserve stored time, and existing creation time is immutable.
24. The launch screen labels the retained result as latest-run proof and separately renders current First 10 proof from the server projection.
25. Editing a launch case or changing governed sources makes the current-proof banner stale while preserving the historical latest-run result for diagnosis.
26. A source-version change during test execution prevents the post-run current-proof response from reporting the new run as current.
27. Standard regression-suite load, save, and post-run responses omit the launch-proof projection and its extra source-version read; only exact `includeLaunchProof=1` requests opt in.
28. Wrong product ID, deterministic document ID, loose string scope, future schema, loose revision, invalid case, or duplicate persisted case ID throws an integrity error instead of silently loading partial truth.
29. Duplicate expected reference IDs, duplicate required/blocked phrases, and a phrase present in both required and blocked lists are rejected.
30. Reusing a request ID with a different mode, selected case set, suite revision, run kind, or release ID returns a conflict; an exact retry returns the existing completed run.
31. A suite edit between route load and reservation returns `suite_changed` before execution.
32. Saving a retained run removes its reservation without incrementing the test-suite revision.
33. A retained run whose `suiteRevision` differs from the current summary remains historical, is labelled stale, and cannot satisfy Activation proof.
34. Legacy retained runs without suite revision remain visible but cannot be presented as current proof; legacy reservations without request fingerprints do not block new work.
35. The deterministic evaluator remains provider-free and the UI states that its result is regression evidence rather than an independent factual-correctness guarantee.
36. **Adopt current route and evidence** updates source, answer/FAQ IDs, confidence, and evidence while preserving required and blocked phrase checks.
37. A new or edited active critical case cannot select `rag` as its expected route; an unchanged legacy case remains save-compatible and can be deactivated safely.
38. A legacy persisted critical-RAG case continues to load, but an actual `rag` result fails with an explicit reason and produces `proofStatus = blocked`.
39. A critical test may still run in full-runtime mode; canonical, published FAQ, explicitly expected escalation, and explicitly expected no-answer outcomes can pass when all configured assertions pass.
40. The same critical-RAG rule applies to standard runs, First 10 proof, release checks, and proposal-impact current/proposed evaluation.
41. Critical-RAG blocking adds no Firestore read/write, provider call, summary migration, analytics event, or retained artifact beyond the existing run contract.
42. No test route creates multi-turn variants, scheduled suites, model-judge results, separate manifests, per-assertion documents, or Storage artifacts.
43. A validated release URL context opens the existing release-check modal and
    preselects only a release present in the exact-scope loaded list.
44. Closing a query-opened release modal removes the context without running a
    test or writing state.
45. A failed result with a valid answer ID opens the existing Canonical Answer
    Editor focused on that answer; missing or invalid IDs cannot open a
    different record.
46. A case that simultaneously fails every admitted assertion still emits at
    most 20 failure strings of at most 240 characters, non-finite or negative
    duration becomes zero, and the complete evaluator result parses through
    `AnswerlatticeAnswerTestCaseResultSchema`.

## Release Safety

1. A release with affected entity IDs runs only cases linked to those IDs.
2. A release with no matching tests returns an explicit `no_matching_cases` result without collection scans.
3. Propose rollback reads a prior version, creates one pending `version_update` proposal, and leaves the active answer unchanged.
4. Cross-workspace answer, release, audit event, or proposal IDs are rejected.
5. A release check retains its evidence and proof status using the same capped summary document and no additional collection read.
6. A malformed, wrong-product, or cross-scope stored release is rejected before test selection.
7. Repeating rollback validates the deterministic proposal and audit pair. A valid missing half is repaired; conflicting target answer, mutation type, source audit, product, scope, action, or entity identity fails closed.
8. Deleting, rebinding, or changing scope/ownership of the answer or selected audit during proposal creation causes the transaction to retry against current truth or fail without a proposal/audit write.
9. A procedure rollback requires a complete strict saved procedure; malformed or missing procedure content cannot create a partial rollback proposal.
10. The browser accepts only the strict proposal ID, created flag, and known governance status acknowledgement.
11. Release impact returns every changed entity in exactly one direct-link
    state: answer-linked, test-linked, linked by both, or without a visible
    direct answer/test link.
12. The response rejects duplicate, foreign, hidden-unmapped, zero-count with
    linked entities, positive-count without linked entities, or other
    contradictory direct-link evidence and keeps affected-answer/test counts
    aligned with the existing projections.
13. The owner modal labels the disclosure as direct entity mapping only and
    never presents it as complete article, FAQ, workflow, product-surface,
    factual, or resolution coverage.

## Proposal Impact Preview

1. Only a user with `MANAGE_GOVERNANCE` and exact session-derived workspace scope can preview a proposal.
2. The route rate-limits before the Firestore-backed permission read, fails closed when the limiter provider is unavailable, returns bounded retry guidance, and rejects oversized, malformed, unknown-field, or cross-scope input.
3. Pending proposals are parsed through the stored proposal schema; missing, implemented, rejected, incomplete, or malformed proposals fail closed.
4. Candidate content uses the same proposal builder as approval, including validated edits from the open draft form.
5. Tests match only by expected target answer ID or affected old/new entity intersection; unrelated tests are never scanned through retrieval, and the complete bounded union of proposal, current, and candidate entities keeps removed-scope and newly added-scope regressions visible.
6. Critical linked tests are selected before standard tests and execution is capped at 10.
7. No linked active tests returns an explicit missing-proof result with no search-index, canonical-answer, FAQ, provider, or write path.
8. Current and proposed checks use the deterministic canonical/FAQ path; the proposed candidate exists only in a request-local answer cache.
9. Duplicate requests are side-effect free because the route performs no write, provider call, credit settlement, or retained run.
10. A current pass that becomes a projected failure is labelled `regression`; a current failure that becomes a projected pass is labelled `improvement`.
11. Changed source, answer ID, confidence, or answer preview is visible even when both outcomes pass or both fail.
12. A projected critical failure returns `blocked`, but preview status never approves, rejects, publishes, rolls back, or changes a release.
13. Approval independently revalidates entity existence, deprecated state, active answer overlap, version/scope conflict, transaction state, audit, and cache invalidation.
14. The browser validates the bounded response schema, aborts the complete request and response read after 30 seconds, and never renders an unvalidated server payload.
15. The response schema rejects evaluated/classification counts, truncation
    state, linked/evaluated ordering, or current/proposed proof status that
    contradicts the admitted comparisons.

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

## Answer Trace

1. The route authenticates, fail-closed rate-limits, and requires
   `MANAGE_SUPPORT` before a history read.
2. Exact lookup accepts one normalized Firestore document ID and returns only
   an `AL` record in the authenticated numeric tenant/workspace scope.
3. Expired, malformed, wrong-product, wrong-scope, missing, or invalid trace
   records return no owner trace.
4. Recent review loads are owner-triggered, scan at most 30 existing indexed
   rows, return at most 12 review candidates, and disclose when the source
   window hit its cap.
5. The strict response includes bounded question/answer text, route/type,
   governed IDs, public citations, fallback/confidence/clarification evidence,
   source versions, feedback, escalation identity, and unique review signals.
6. The response excludes visitor identity, origin/path, user-agent family, raw
   cache keys, debug evidence URLs, source bodies, and arbitrary metadata.
7. A recent-list response with no review signal, duplicate IDs/signals,
   malformed citation URL, result count above scanned count, incorrect capped
   window state, or contradictory exact-mode count fails browser admission.
8. Trust Metrics performs no trace read until **Load review traces** is chosen.
9. An escalated widget ticket can open its exact trace; ordinary tickets with
   no linked search-history ID do not show a misleading action.
10. Opening or closing a trace performs no write, signal, proposal, test,
    provider call, or automatic root-cause classification.
11. Desktop and mobile use the same API and drawer; ticket support staff do not
    receive unauthorized governance actions.
12. Switching workspace or ticket invalidates the in-flight request and
    discards a late response from the previous owner context.
13. One owner surface cannot start a second trace request while its first
    request is in flight.
14. The browser aborts after 15 seconds and rejects a response larger than the
    1 MiB ceiling. An executable maximum multibyte 12-trace payload stays below
    that shared limit.
15. Recent reads use an explicit Firestore field mask and retain the existing
    30-document billing cap.
16. The Firestore emulator proves exact and recent projected reads, numeric
    workspace isolation, expiry rejection before TTL deletion, private-field
    omission, and zero repair signals for cached canonical answers.

## Export

1. An authorized owner receives scoped approved support truth only.
2. Staff without `canExportData` receives 403.
3. Cross-tenant records never appear.
4. Secret-bearing fields and private support content never appear.
5. Exceeding any cap returns 409 and no partial export body; exactly-at-cap data remains exportable.
6. Export rate limits fail closed when the limiter is unavailable.
7. More than two export attempts for the same user/workspace within one hour are rejected before the Firestore-backed permission lookup.
8. Canonical approved source IDs/citations survive the explicit projection while nested source context, tenant identity, embeddings, actor fields, tickets, chats, and raw audit rows remain absent.
9. Successful generation creates exactly one metadata-only audit row before delivery; audit failure returns a generic export failure and no file.
10. Deterministic ordering, the `complete: true` marker, collection cap-plus-one behavior, and the 8 MiB serialized response ceiling are covered by `test:answerlattice-support-truth-export-contracts`.
11. Non-`AL` rows sharing tenant/store IDs are excluded, unreviewed AI translations and reviewer identity are removed, and changelog release/entity linkage survives.
12. GET is rejected, POST generates the file, and both dedicated/shared rules deny forged `support_truth_export_generated` audit rows.

## Owner Support Assistant

1. Summary questions answer from compact summaries.
2. Questions never trigger raw ticket, conversation, signal, or detail-record reads.
3. Mutating requests are refused; the assistant only links to governed routes.
4. No assistant transcript is written.
5. Unsupported requests return a clear boundary response.

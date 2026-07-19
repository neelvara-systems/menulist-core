# Drift Governance Implementation

## Runtime flow

```text
Manual Evaluate or nightly tenant task
  -> exact-scope active answers, entities, and recent signals
  -> strict stored-shape validation and cap-plus-one overflow check
  -> shared four-class evaluator
  -> monotonic drift-state derivation
  -> answer + deterministic audit + cache/source/bundle invalidation
  -> owner review queue
  -> explicit attestation
  -> server-owned validation and audit
```

Release activation owns Class A directly:

```text
activate release
  -> identify active answers bound to changed entities
  -> append deterministic version-drift reason
  -> set driftFlag and reviewRequired
  -> invalidate canonical cache and compiled canonical source
  -> complete release activation
```

## Source ownership

- `src/data/shared/answerlatticeDrift.ts` is the application-side policy source.
- `functions-answerlattice/src/sharedData/answerlatticeDrift.ts` must remain byte-for-byte identical.
- `src/lib/answerlattice/driftDetection.ts` is only a compatibility re-export; it does not query or persist from the browser.
- `src/lib/answerlattice/governanceServer.ts` owns manual evaluation and human validation.
- `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` owns scheduled evaluation.
- `src/lib/answerlattice/releaseServer.ts` owns release-version drift.

## Security and authority

The browser may request `evaluate_drift` or `validate_drift`. It cannot send an authoritative automated reason. The authenticated governance route resolves the session workspace, reads current server-owned inputs, recomputes inside bounded transactions, and writes only after exact-scope validation.

Automated audits use deterministic answer-and-reason identities so retries do not append duplicate evidence. Human validation uses a separate append-only audit event.

## Failure behavior

- Query overflow stops evaluation before partial drift publication.
- Invalid stored entities, signals, answers, timestamps, versions, or scope stop the run.
- Missing bound entities stop the run rather than silently ignoring the dependency.
- Nightly batches are computed before writes and commit at most 200 changed answers per batch.
- Manual evaluation re-reads and recomputes each answer inside transactions of at most 150 changed answers.
- Existing drift remains when a later automated run finds no new reason.

## Product boundary

This feature creates review work. It does not create answer drafts, approve mutations, execute support actions, or replace release, ticket, signal, or ontology ownership.

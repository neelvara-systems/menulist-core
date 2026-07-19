# Drift Governance Test Cases

## Policy tests

- App and Functions policy files are byte-for-byte equal.
- Automated drift is monotonic, idempotent, and reason-deduplicated.
- Signals on a second bound entity are evaluated.
- Exactly eleven ticket events trigger Class D ticket-volume drift.
- Five negative events trigger Class B.
- Conflicting answer identifiers are deterministic and sorted.
- Non-overlapping plan scope does not trigger a conflict.
- A deprecated bound entity triggers Class D.
- A missing bound entity fails closed.
- Release-version reasons are deterministic.

## Governance tests

- `evaluate_drift` is admitted and `record_drift` is rejected.
- The server, not the browser, derives reasons.
- Evaluation writes drift and review-required state once.
- Replay with unchanged evidence reports no new update.
- Human validation clears the reviewed state and records audit evidence.
- Stored cross-scope, malformed, or over-cap input fails before partial publication.

## Release tests

- Release activation marks affected answers drifted and review-required.
- Canonical cache and compiled canonical source versions advance.
- The compiled bundle becomes stale.
- Release activation remains advisory rather than publishing replacement answer content.

## UI tests

- Load failure does not render a false all-clean state.
- Evaluation reports evaluated and updated counts.
- Revalidation is disabled until the reviewer attests to content, scope, version, and evidence.
- Narrow layouts wrap actions, tags, and long reasons without overlap.

## Current automated commands

```bash
npm run test:answerlattice-drift-state
npm run test:answerlattice-governance-contracts
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-governance:emulator
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-release:emulator
node scripts/verification/verify-answerlattice-runtime-truth.js
```

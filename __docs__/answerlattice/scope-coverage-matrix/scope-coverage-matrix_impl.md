# Scope Coverage Matrix Implementation

## 1. Architecture

```text
Answer Tests summary (one document)
        +
Current compiled source versions (one compact document)
        |
        v
Pure bounded coverage projection
        |
        v
Existing private Answer Tests response
        |
        v
Responsive matrix inside Answer Tests
```

No persisted matrix is created. This avoids invalidation writes and duplicate truth.

## 2. Files

| Path | Responsibility |
| --- | --- |
| `src/config/features.ts` | Additive rollout flag and cost contract |
| `src/lib/answerlattice/scopeCoverageMatrix.ts` | Strict DTO, current-proof selection, deterministic projection, client admission |
| `src/app/api/answerlattice/answer-tests/route.ts` | Optional matrix projection on load/save |
| `src/app/api/answerlattice/answer-tests/run/route.ts` | Return refreshed matrix after a test run |
| `src/app/api/answerlattice/answer-tests/release-check/route.ts` | Return refreshed matrix after a release check |
| `src/components/templates/answerlattice/answerTests/AnswerlatticeAnswerTests.tsx` | State/version editing, desktop matrix, mobile list, existing handoffs |
| `scripts/verification/test-answerlattice-scope-coverage-matrix.ts` | Pure status/freshness/schema contracts |
| `scripts/verification/verify-answerlattice-scope-coverage-matrix.js` | Source, cost, route, UI, docs, and non-goal gate |

## 3. API Contract

The existing routes accept `includeScopeCoverage=1` only while the feature flag is enabled.

The response adds:

```ts
scopeCoverageMatrix?: {
  schemaVersion: 1;
  suiteRevision: number;
  activeCaseCount: number;
  canonicalTargetCount: number;
  coveredCount: number;
  needsReviewCount: number;
  missingCount: number;
  unverifiedCount: number;
  otherRouteCount: number;
  rows: Array<{
    caseId: string;
    status: 'covered' | 'needs_review' | 'missing' | 'unverified' | 'other_route';
    actualSource?: 'canonical' | 'faq' | 'rag' | 'escalation' | 'no_answer';
    answerId?: string;
    verifiedAt?: string;
  }>;
}
```

The browser admits it only when:

- the schema is strict;
- the suite revision equals the returned Answer Tests summary;
- row IDs are unique;
- rows exactly match the active case IDs;
- counts match row-derived counts;
- `other_route` matches a non-canonical expected route;
- other states match a canonical expected route.

## 4. Freshness Algorithm

For each active case:

1. If its expected route is not canonical, return `other_route` without requiring a run.
2. Sort the ten retained runs by valid completion time, newest first.
3. Find the latest run with a unique result for the case, current source versions, and a completion time after the case's `updatedAt`.
4. If none exists, return `unverified`.
5. If the actual route is not canonical, return `missing`.
6. If the route is canonical but lacks an answer ID or the result failed, return `needs_review`.
7. Otherwise return `covered`.

## 5. UI Contract

Desktop:

- one unframed table inside the existing `Scope coverage` card;
- stable columns for plan, role, state, and version;
- status and last verified evidence;
- icon actions with tooltips for edit/run/review.

Narrow screens:

- one existing Card containing a plain List;
- each row stacks question, four labeled context values, status, and actions;
- no horizontal matrix canvas, pan, zoom, or nested cards;
- 44 px actions.

## 6. Error Behavior

- Missing/malformed matrix response: keep Answer Tests usable, clear matrix state, and show an unavailable warning.
- Missing source-version document: use the existing normalized zero-version contract; only matching retained proof can become current.
- Invalid source-version document: fail the private request rather than trust cross-scope or malformed counters.
- Invalid context version on save: reject through the existing strict Answer Test save contract, with client validation providing the owner-facing message first.
- More than 25 requested run cases: preserve the existing run cap; row actions run one case.

## 7. Validation Checklist

- [x] Five deterministic status branches covered.
- [x] Case edit and source-version change invalidate proof.
- [x] Unrelated case edit does not invalidate an unchanged row.
- [x] Legacy source-version-free run cannot establish coverage.
- [x] Future completion time is rejected.
- [x] Strict client projection rejects extra fields, wrong revision, wrong IDs, and contradictory counts.
- [x] Requested matrix load is source-bounded to the existing Answer Tests summary and one compact source-version document.
- [x] No collection scan, listener, scheduler, Storage operation, or model call.
- [ ] Desktop and narrow layouts retain readable labels and 44 px actions.
- [x] Existing launch proof source and runtime contracts remain unchanged.

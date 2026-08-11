# Scope Coverage Matrix Specification

## 1. Product Decision

Build one read-only coverage matrix inside Answer Tests.

The matrix answers a bounded owner question:

> Do the important questions I chose have a currently verified approved answer for the plan, role, product state, and version I specified?

It does not claim complete product coverage. The owner defines importance by creating and activating an Answer Test.

## 2. Users

- Primary: solo technical founder who wants a short release/support check.
- Secondary: a two-to-three-person startup sharing support responsibility.
- Larger workspace: product, support, or knowledge operators using the same permission-scoped evidence.

No user must maintain a separate matrix. The view is derived from existing Answer Tests.

## 3. Source Of Truth

Each active Answer Test already stores:

- the customer question;
- expected answer route;
- plan and role context;
- product state and version context supported by the shared context contract;
- risk level and expected evidence;
- retained test results;
- the source-version snapshot used by each run.

The matrix uses only those records. It does not scan canonical answers, product plans, staff roles, or release history to manufacture combinations.

## 4. Coverage Rows

One active Answer Test produces one row.

| Column | Meaning |
| --- | --- |
| Important question | Existing Answer Test title and question |
| Plan | Explicit test context, otherwise `Not specified` |
| Role | Explicit test context, otherwise `Not specified` |
| Product state | Explicit test context, otherwise `Not specified` |
| Product version | Explicit normalized version, otherwise `Not specified` |
| Coverage | Deterministic current-proof state |
| Last verified | Completion time of the current retained result |

Paused tests are excluded because they are not part of the active support contract.

## 5. Deterministic States

| State | Rule | Owner meaning |
| --- | --- | --- |
| Covered | Expected route is an approved answer; a current result used an identified approved answer and passed | Current proof supports this question and context |
| Needs review | A current result used the approved-answer route but failed a response, evidence, confidence, or identity requirement | Review the approved answer or test contract |
| Missing | A current result did not use the expected approved-answer route | Check answer availability and scope |
| Not verified | No retained result is current for both the case definition and governed source versions | Run this test |
| Different expected route | The owner intentionally expects FAQ, knowledge fallback, escalation, or no approved answer | Excluded from approved-answer coverage counts |

There is no opaque percentage or priority score. The summary may state `X of Y approved-answer questions covered`, where `Y` includes only active tests whose expected route is an approved answer.

## 6. Current-Proof Rules

A retained result can support a row only when:

1. the run contains that case ID exactly once;
2. the run has valid retained source versions;
3. those versions match the current compact source-version document;
4. the case was not edited after the run completed;
5. the completion time is valid and not more than five minutes in the future.

The latest qualifying result wins. A change to another test does not invalidate an unchanged row. A governed source-version change remains conservative and invalidates retained rows until rerun.

Legacy runs without retained source-version proof remain historical but cannot establish matrix coverage.

## 7. Owner Actions

- Edit the existing Answer Test to correct plan, role, state, version, or expected route.
- Run one current check through the existing canonical-only execution path.
- Open Canonical Answer Governance when an approved answer is missing.
- Open a specific approved answer when a current canonical result identifies it and needs review.

The matrix never creates, changes, approves, or publishes an answer.

## 8. Security And Privacy

- Existing authenticated Answer Tests route only.
- Existing `MANAGE_GOVERNANCE` permission.
- Exact Answerlattice `pId`, `tId`, and `sId` scope.
- Private, no-store, `nosniff` response.
- Strict response schema and bounded 512 KiB browser parser.
- Internal source-version counters remain server-only.
- No visitor identity, ticket body, conversation body, or source body enters the matrix.

## 9. Non-Goals

- No Cartesian product of plans, roles, states, and versions.
- No raw ontology or entity graph.
- No plan catalog, role catalog, or version catalog.
- No automatic test generation.
- No answer generation or publication.
- No new analytics, event warehouse, score, alert, or scheduled report.
- No claim that an unspecified context has been tested.

## 10. Rollout

`ENABLE_ANSWERLATTICE_SCOPE_COVERAGE_MATRIX` controls the additive matrix and state/version editor fields. Turning it off preserves the existing Answer Tests screen, API behavior, and stored context data.

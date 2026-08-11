# Answerlattice Scope Coverage Matrix

> Status: Locally source-complete on 2026-08-10. Authenticated hosted responsive QA remains pending and is tracked in `scope-coverage-matrix_validation.md`.

The Scope Coverage Matrix helps an owner verify whether important support questions have a current approved answer for the exact customer context in which they apply.

It is the fifth item in the frozen Answerlattice owner-relief expansion order:

**Plan, Role, State & Version Coverage Matrix**

The feature is a bounded view inside the existing Answer Tests screen. It does not create a spreadsheet editor, enumerate every theoretical context combination, or introduce a second answer-testing system.

## Owner Outcome

For each active Answer Test, the owner can see:

- the applicable plan;
- the applicable user role;
- the applicable product state;
- the applicable product version;
- whether a current test found the expected approved answer;
- the current route when the expected approved answer was not found;
- the last current verification time;
- the existing edit, test, and answer-review handoffs.

Unspecified dimensions are shown as `Not specified`. Answerlattice never invents plans, roles, states, versions, or missing combinations, and an omitted dimension is not proof across every possible value.

## Existing Systems Reused

- Answer Tests summary document and retained runs
- Context-aware support payload
- Canonical-first retrieval
- Compiled source-version control document
- Canonical Answer Governance
- Existing `MANAGE_GOVERNANCE` permission and private API routes

## Cost Boundary

- one existing Answer Tests summary read;
- one compact source-version read only when this matrix is requested;
- no new collection, index, listener, scheduler, Storage object, or model call;
- no write when the matrix is viewed;
- existing save and run writes remain unchanged.

## Documents

- [Specification](scope-coverage-matrix_spec.md)
- [Implementation](scope-coverage-matrix_impl.md)
- [Firebase cost](scope-coverage-matrix_firebase.md)
- [Mobile support](scope-coverage-matrix_mobile-support.md)
- [Help documentation](scope-coverage-matrix_helpdoc.md)
- [Marketing boundary](scope-coverage-matrix_marketing.md)
- [Website boundary](scope-coverage-matrix_website.md)
- [Test cases](scope-coverage-matrix_test-cases.md)
- [Validation](scope-coverage-matrix_validation.md)

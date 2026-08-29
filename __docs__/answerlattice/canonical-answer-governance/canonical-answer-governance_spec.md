# Canonical Answer Governance Specification

## Customer job

Give the company one approved answer for an important support question, show where it applies, preserve reviewer control, and prevent an older draft from silently replacing newer approved truth.

## Governed object

The current first-version canonical object contains:

- title and stable slug;
- status and answer type;
- at least one bound ontology entity;
- optional plan, role, and product-state identifiers;
- introduced, last-validated, and applicable version values;
- structured summary, detailed explanation, optional edge cases and constraints, and optional procedure;
- validation metadata, governance state, audit history, and tenant scope.

Plan, role, and state applicability uses the runtime context identifier, currently the ontology slug such as `growth`, `owner`, or `past_due`. Bound `entityIds` use ontology document IDs. Empty optional applicability arrays mean unrestricted for that dimension.

## Required workflow

1. A user with `canManageGovernance` opens the canonical answer editor.
2. The user binds at least one entity and optionally narrows plan, role, state, and version applicability.
3. Create or update submits a mutation proposal. It does not edit canonical truth.
4. A reviewer inspects the proposal, may edit the answer content, and may correct its Product Topic binding using existing in-scope ontology entities.
5. Approval validates stored data, tenant scope, the reviewer-selected entity bindings, version values, and active-answer overlap.
6. For updates, the proposal base fingerprint must match the current approved answer.
7. The transaction writes canonical truth, proposal state, audit snapshot, canonical cache version, compiled source version, and stale bundle manifest together.
8. Retrieval consumers observe the new answer after normal cache/source-version refresh behavior.

## Safety invariants

- Browser clients cannot create, update, or delete canonical answers.
- Canonical changes require the mutation pipeline.
- Reviewer edits override proposed content during approval.
- Reviewer-selected Product Topics are evaluated by impact checks and recorded in the implemented proposal and canonical audit snapshot.
- A legacy manual update without revision protection is rejected and must be resubmitted.
- A legacy non-manual update without a fingerprint is accepted only when timestamp evidence shows the answer has not changed since proposal creation.
- A fingerprinted update is rejected if approved truth changed after proposal creation.
- A rejected proposal cannot invalidate caches or write canonical audit history.
- Approval is idempotent.
- Active answers cannot overlap for the same applicable entity, scope, and version window.
- Cross-tenant reads and writes are rejected.

## Non-goals

- Direct inline publication from the editor
- Automatic approval of generated drafts
- Treating tickets or repeated replies as approved truth
- Generic document-chunk governance
- Autonomous account-changing actions

## Success measures

- priority questions covered by an approved canonical answer;
- approval time;
- stale proposal rejection rate;
- human correction rate;
- active overlap rejection rate;
- time from approved change to retrieval availability;
- canonical answer usage and verified resolution, evaluated in later feature audits.

# Canonical Answer Governance Help

## Create an approved answer

1. Open **Governance** and choose **Canonical Answers**.
2. Select **New Answer**.
3. Add a title, bind at least one product entity, and enter the approved support content.
4. Optionally limit the answer by plan, user role, product state, or product version.
5. Submit the answer for Governance review.
6. Review the proposal and approve it when the content and applicability are correct.

Submitting does not publish the answer immediately. Canonical truth changes only after approval.

## Update an approved answer

Open the answer, edit the required fields, and submit the update. The proposal records the approved revision it was based on. If another reviewer changes the answer before approval, Answerlattice rejects the older proposal and asks you to review the latest answer and submit again.

## Applicability rules

- **Bound entities:** required; identifies what the answer is about.
- **Plans, roles, and states:** optional; empty means the answer applies to all values in that dimension.
- **From version:** required.
- **Through version:** optional; empty means the answer remains current.

## Review behavior

Reviewer edits made during approval become the approved content. A reviewer can clear optional edge-case or constraint text. Rejected or stale proposals do not change the answer shown to customers or invalidate retrieval caches.

## Common recovery

- **Answer changed after proposal creation:** open the latest answer and submit a new update.
- **Proposal predates revision protection:** recreate the update from the latest approved answer.
- **Overlapping active answer:** narrow the entity, plan, role, state, or version scope.
- **Missing entity:** select an active entity in the same workspace.
- **Permission denied:** ask a workspace administrator for Governance permission.

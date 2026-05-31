# Support Board Test Cases

## Route and Access

- Owner can open `/answerlattice/support-board`.
- Support Staff can open `/answerlattice/support-board`.
- User without `canManageSupport` is redirected away.
- Public help center/widget users cannot access board data.

## Card Workflow

- Create a manual card.
- Move a card across all statuses.
- Confirm each actual status change appends a `statuses[]` entry with status, timestamp, actor, and remark.
- Confirm editing a card without changing status does not append status history.
- Edit title, description, assignee, due date, tags, and related entity ID.
- Add an internal note.
- Notes are not shown in public routes.

## Source Sync

- With `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SOURCE_SYNC=false`, ticket/signal sync CTAs are hidden and hook sync calls no-op.
- With `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SOURCE_SYNC=true`, source sync CTAs are visible.
- Sync tickets with no unresolved tickets: shows no-new-items feedback.
- Sync tickets with unresolved tickets: creates cards once.
- Re-run ticket sync: does not duplicate existing ticket cards.
- Sync signals: creates cards only for actionable signal types.
- Re-run signal sync: does not duplicate existing signal cards.

## Nightly Sync

- With `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SYNC=false`, nightly Support Board sync returns without source reads or writes.
- With `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_NIGHTLY_SUMMARY=false`, board refresh does not read `supportBoardSummary_*`.
- With `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SYNC=true`, nightly Support Board sync runs inside the existing scheduler only.
- Existing Answerlattice nightly scheduler calls Support Board sync; no standalone scheduler exists.
- Repeated canonical misses create one deduped card per entity.
- Negative feedback / escalation clusters create one deduped card per entity.
- Drifted canonical answers create review cards.
- Recent release impact creates a release-impact card only when release entity changes overlap drifted answers.
- Resolved cards are not reopened by nightly sync.
- Unchanged cards are skipped by `syncSourceHash`.
- Summary doc is written only when compact summary state changes.

## Governance Proposal

- Card without related entity cannot create an answer proposal.
- Card with related entity creates a pending mutation proposal.
- Card receives `relatedProposalId`.
- Proposal remains pending until human review in Knowledge Governance.

## Firebase

- Board load query uses `tId`, `sId`, `modifiedOn desc`, and limit.
- Firestore rules deny cross-tenant reads/writes.
- Firestore rules deny deletes.
- Firestore indexes deploy cleanly.

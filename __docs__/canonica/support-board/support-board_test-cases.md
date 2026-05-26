# Support Board Test Cases

## Route and Access

- Owner can open `/canonica/support-board`.
- Support Staff can open `/canonica/support-board`.
- User without `canManageSupport` is redirected away.
- Public help center/widget users cannot access board data.

## Card Workflow

- Create a manual card.
- Move a card across all statuses.
- Edit title, description, assignee, due date, tags, and related entity ID.
- Add an internal note.
- Notes are not shown in public routes.

## Source Sync

- Sync tickets with no unresolved tickets: shows no-new-items feedback.
- Sync tickets with unresolved tickets: creates cards once.
- Re-run ticket sync: does not duplicate existing ticket cards.
- Sync signals: creates cards only for actionable signal types.
- Re-run signal sync: does not duplicate existing signal cards.

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

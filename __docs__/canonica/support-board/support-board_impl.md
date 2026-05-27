# Support Board Implementation

## Code Paths

| Area | File |
| --- | --- |
| Route | `src/app/(canonica)/canonica/support-board/page.tsx` |
| UI | `src/components/templates/canonica/supportBoard/CanonicaSupportBoard.tsx` |
| Hook | `src/hooks/canonica/useSupportBoard.ts` |
| DAL | `src/database/canonica/supportBoard.ts` |
| Nightly sync | `functions-canonica/src/canonica/supportBoardSync.ts` |
| Nightly orchestrator | `functions-canonica/src/canonica/canonicaNightly.ts` |
| Types | `src/types/canonica/index.ts` |
| Routes | `src/constants/canonica/routes.ts` |
| Sidebar | `src/constants/canonica/navigations.ts` |
| Permissions | `src/constants/canonica/permissions.ts` |
| Feature flag | `src/config/features.ts` |
| Domain rewrite roots | `src/constants/canonica/domains.ts` |
| Firestore rules | `firestore-canonica.rules` |
| Firestore indexes | `firestore-canonica.indexes.json` |

## Data Flow

1. Owner opens `/canonica/support-board`.
2. UI calls `listCanonicaSupportBoardCards(tId, sId)`.
3. Query reads at most 120 cards ordered by `modifiedOn desc`.
4. Owner can create a manual card.
5. Ticket/signal source sync CTAs render only when `ENABLE_CANONICA_SUPPORT_BOARD_SOURCE_SYNC` is true.
6. Ticket sync reads at most 50 store tickets and creates up to 20 cards for unresolved tickets not already represented.
7. Signal sync reads at most 50 recent signal events and creates up to 20 cards for actionable signals not already represented.
8. Internal notes are embedded on the card with a cap of 25 notes.
9. Card status changes append to capped `statuses[]` history while the top-level `status` remains the query/filter field.
10. If the card has `relatedEntityId`, owner can create a `new_answer_required` mutation proposal.
11. Knowledge Governance remains the place where drafts are generated, edited, approved, and published.
12. UI reads `platformSummary/supportBoardSummary_{tId}_{sId}` only when `ENABLE_CANONICA_SUPPORT_BOARD_NIGHTLY_SUMMARY` is enabled.

## Manual Sync

Manual sync is implemented but rollout-gated. Enable `ENABLE_CANONICA_SUPPORT_BOARD_SOURCE_SYNC` only for tenants that want tickets/signals consolidated into the board.

Manual ticket sync intentionally mirrors unresolved tickets only on explicit owner action, because mirroring every ticket into Kanban would create noise.

## Nightly Sync

The existing Canonica master scheduler calls `syncSupportBoardNightly(tId, sId)` from the tenant nightly loop. No new scheduled function was added.

Nightly sync is implemented but disabled by default through `ENABLE_CANONICA_SUPPORT_BOARD_SYNC` in `functions-canonica/src/constants/features.ts`. The UI summary read is separately disabled by default through `ENABLE_CANONICA_SUPPORT_BOARD_NIGHTLY_SUMMARY`. This keeps tickets, signals, and drift surfaces as their primary dashboards until a tenant needs consolidated board preparation.

Nightly sync creates cards only for meaningful support work:

- repeated non-canonical / low-confidence answer misses
- repeated negative feedback or escalation signal clusters
- drifted canonical answers requiring review
- recent release impact when a release touches entities with drifted answers

Nightly sync does not:

- create a card for every ticket
- auto-publish answers
- create governance proposals without owner action
- scan unbounded history

Deduplication uses deterministic source keys. Existing resolved cards are not reopened by the scheduler.

## Type Model

Main type: `CanonicaSupportBoardCard`.

Required scope fields:

- `pId`
- `tId`
- `sId`

Operational fields:

- `status`
- `statuses[]`
- `priority`
- `sourceType`
- `sourceId`
- `assigneeName`
- `dueDate`
- `tags`
- related object IDs
- embedded `notes`
- `syncManaged`
- `syncReason`
- `syncSourceHash`
- `lastSyncedAt`

Status model:

- top-level `status` is used for filtering, columns, and summary counts
- `statuses[]` stores activity history entries with status, timestamp, actor, and remark
- status history is capped at 50 entries per card
- status changes use a transaction so history appends only when the status actually changes

## Summary Document

`platformSummary/supportBoardSummary_{tId}_{sId}` stores compact owner-facing state:

- open card count
- needs-answer count
- high-priority count
- status / priority / source counts
- last nightly sync counts
- top related surfaces when present

## Proposal Conversion

`createAnswerProposal(card)` creates a pending `CanonicaMutationProposal` with:

- `mutationType: new_answer_required`
- `relatedEntityIds: [card.relatedEntityId]`
- `draftStatus: pending`
- `draftSource: ticket_resolution` or `recurring_fallback`

No canonical answer is created at this step.

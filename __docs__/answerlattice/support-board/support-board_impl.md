# Support Board Implementation

> **Last verified:** July 19, 2026

## Code Paths

| Area | File |
| --- | --- |
| Route | `src/app/(answerlattice)/answerlattice/support-board/page.tsx` |
| UI | `src/components/templates/answerlattice/supportBoard/AnswerlatticeSupportBoard.tsx` |
| Hook | `src/hooks/answerlattice/useSupportBoard.ts` |
| DAL | `src/database/answerlattice/supportBoard.ts` |
| Nightly sync | `functions-answerlattice/src/answerlattice/supportBoardSync.ts` |
| Live summary | `functions-answerlattice/src/answerlattice/supportBoardSummary.ts` |
| Firestore trigger | `answerlatticeSupportBoardSummaryOnWrite` in `functions-answerlattice/src/index.ts` |
| Nightly orchestrator | `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` |
| Types | `src/types/answerlattice/index.ts` |
| Routes | `src/constants/answerlattice/routes.ts` |
| Sidebar | `src/constants/answerlattice/navigations.ts` |
| Permissions | `src/constants/answerlattice/permissions.ts` |
| Feature flag | `src/config/features.ts` |
| Domain rewrite roots | `src/constants/answerlattice/domains.ts` |
| Firestore rules | `firestore-answerlattice.rules` |
| Firestore indexes | `firestore-answerlattice.indexes.json` |

## Data Flow

1. Owner opens `/answerlattice/support-board`.
2. UI calls `listAnswerlatticeSupportBoardCards(tId, sId)`.
3. Query reads at most 120 cards ordered by `modifiedOn desc`.
4. Owner can create a manual card.
5. Ticket/signal source sync CTAs render only when `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SOURCE_SYNC` is true.
6. Ticket sync reads at most 50 store tickets and creates up to 20 cards for unresolved tickets not already represented.
7. Signal sync reads at most 50 recent signal events and creates up to 20 cards for actionable signals not already represented.
8. Ticket, feedback, and signal source cards preserve bounded source customer identity in the card document so the board does not need to re-read the original object just to show who raised it. The detail view can irreversibly clear those copied fields.
9. Internal notes are embedded on the card with a cap of 25 notes.
10. Card status changes append to capped `statuses[]` history while the top-level `status` remains the query/filter field.
11. If the card has a resolved `relatedEntityId`, owner can create a `new_answer_required` mutation proposal.
12. Knowledge Governance remains the place where drafts are generated, edited, approved, and published.
13. A Firestore write trigger refreshes exact core counts after create/status/priority changes and skips title/note-only edits. The board UI reads the summary only when its summary flag is enabled; Founder Daily Brief can consume the same compact document independently.

Non-manual source cards use `sb_source_{tId}_{sId}_{sha256-prefix}` document IDs derived from normalized tenant, workspace, source type, and source ID. Single and bulk source creation use transactions; an existing exact source identity is returned/skipped, while an impossible identity collision fails closed. Manual cards retain generated Firestore IDs.

Hook load/action failures use fixed local owner-facing copy. Ticket, signal, Firestore, mutation-proposal, scheduler-summary, or browser exception text must not be copied into Support Board toasts or error state. If the optional nightly summary read fails, the hook logs `answerlattice_support_board_summary_load_failed` with bounded tenant/store metadata and still renders the card list with `summary: null`.

Answerlattice App Support Board Card ID Boundary: `src/lib/answerlattice/supportBoardCardIdBoundary.ts` validates Support Board card document IDs before `src/database/answerlattice/supportBoard.ts` builds card document refs for detail updates, status transactions, and note writes. Malformed, reserved, empty, or path-shaped card IDs fail through the existing fixed Support Board action copy before Firestore document access.

Answerlattice App Support Board Related Entity ID Boundary: `src/database/answerlattice/supportBoard.ts`, `src/hooks/answerlattice/useSupportBoard.ts`, and `src/components/templates/answerlattice/supportBoard/AnswerlatticeSupportBoard.tsx` use the shared resolved-entity helper before Support Board card `relatedEntityId` writes, ticket/signal source-card creation, card badge/proposal eligibility, and mutation proposal `relatedEntityIds`. Malformed or unresolved related entity IDs are skipped before card persistence or governance proposal creation.

Nightly sync diagnostics in `functions-answerlattice/src/answerlattice/supportBoardSync.ts` use fixed `ANSWERLATTICE_SUPPORT_BOARD_SYNC_FAILED` result/log codes, source error name/code/status metadata, and tenant/store scope booleans. Success logs use scope booleans and counts only. Valid source scans, deterministic card upserts, unchanged/resolved skips, and compact summary writes are unchanged.

Support Board nightly derived-card source-text duplication boundary: recurring-miss and signal-cluster cards created by nightly sync store source example counts and bounded context keys only. They do not copy raw search queries, prompts, ticket subjects, reasons, or messages into the derived card description. Reviewers use the original search/signal history when source text is needed.

Answerlattice Functions signal-source entity ID boundary: `functions-answerlattice/src/answerlattice/entityIdBoundary.ts` is used by nightly Support Board sync before entity document reads, derived-card grouping, drift/release impact matching, and related-entity assignment. Stored malformed entity IDs are skipped rather than becoming `answerlattice_entities/{entityId}` refs or derived card keys.

## Manual Sync

Manual sync is implemented but rollout-gated. Enable `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SOURCE_SYNC` only for tenants that want tickets/signals consolidated into the board.

Manual ticket sync intentionally mirrors unresolved tickets only on explicit owner action, because mirroring every ticket into Kanban would create noise.

## Nightly Sync

The existing Answerlattice master scheduler calls `syncSupportBoardNightly(tId, sId)` from the tenant nightly loop. No new scheduled function was added.

Nightly sync is implemented but disabled by default through `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SYNC` in `functions-answerlattice/src/constants/features.ts`. The UI summary read is separately disabled by default through `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_NIGHTLY_SUMMARY`. This keeps tickets, signals, and drift surfaces as their primary dashboards until a tenant needs consolidated board preparation.

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

The three main source scans use cap-plus-one reads to detect a saturated window. Optional breakdown generation does the same for its bounded card scan. `sourceWindowsSaturated` and `breakdownFresh` prevent bounded analysis from being represented as exhaustive.

Failure output returned to the scheduler is an object-shaped bounded diagnostic with a fixed error code, source error name/code/status, and scope booleans. Do not return raw exception messages or scoped identifiers from `SupportBoardSyncResult.errors`.

## Type Model

Main type: `AnswerlatticeSupportBoardCard`.

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
- `sourceCustomerName`
- `sourceCustomerEmail`
- `sourceCustomerPhone`
- `sourceCustomerUserId`
- `sourceOrigin`
- `sourcePath`
- `sourceSessionId`
- `sourceIdentityRedactedAt`
- `sourceIdentityRedactedBy`
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
- a card cannot be created directly as resolved; resolution metadata is derived by the DAL when an existing card transitions to `resolved`

## Summary Document

`platformSummary/supportBoardSummary_{tId}_{sId}` stores compact owner-facing state:

- exact open, Needs Answer, high-priority, and total card counts
- live-summary version, event ordering marker, and last update
- optional bounded status / priority / source counts
- optional last nightly sync counts and top related surfaces
- `breakdownFresh` and `sourceWindowsSaturated` completeness evidence

The live trigger performs no work for title/note-only changes and leaves nightly-managed creates to the nightly writer. Event-time ordering prevents an older retried event from overwriting a newer live count refresh.

## Proposal Conversion

`createAnswerProposal(card)` creates a pending `AnswerlatticeMutationProposal` with:

- `mutationType: new_answer_required`
- `relatedEntityIds: [resolved card.relatedEntityId]`
- `draftStatus: pending`
- `draftSource: ticket_resolution` or `recurring_fallback`

No canonical answer is created at this step.

Linking the proposal ID back to the card requires governance permission. If proposal creation succeeds but the optional private note append fails, the UI reports the partial result instead of claiming the whole operation failed or retrying proposal creation blindly.

## Remaining Limits

- Board list and UI column totals cover the newest 120 cards; the compact core summary covers the exact workspace.
- There is no cursor pagination or client delete.
- The activity history is mutable only through constrained prepend transitions, but it is not an append-only compliance ledger.
- The original ticket/signal/feedback retention owner remains responsible for deleting its source record; card redaction clears only the copied fields.

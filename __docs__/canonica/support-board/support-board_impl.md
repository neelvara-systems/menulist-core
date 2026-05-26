# Support Board Implementation

## Code Paths

| Area | File |
| --- | --- |
| Route | `src/app/(canonica)/canonica/support-board/page.tsx` |
| UI | `src/components/templates/canonica/supportBoard/CanonicaSupportBoard.tsx` |
| Hook | `src/hooks/canonica/useSupportBoard.ts` |
| DAL | `src/database/canonica/supportBoard.ts` |
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
4. Owner can create a manual card or explicitly sync tickets/signals.
5. Ticket sync reads at most 50 store tickets and creates up to 20 cards for unresolved tickets not already represented.
6. Signal sync reads at most 50 recent signal events and creates up to 20 cards for actionable signals not already represented.
7. Internal notes are embedded on the card with a cap of 25 notes.
8. If the card has `relatedEntityId`, owner can create a `new_answer_required` mutation proposal.
9. Knowledge Governance remains the place where drafts are generated, edited, approved, and published.

## Why Sync Is Explicit

The first production version uses explicit bounded sync buttons instead of write-on-every-signal automation. This avoids hidden write amplification from high-volume widget events while still giving founders a clear way to pull support work into the board.

Future automation may create cards from critical events only after board volume, dedupe, and notification behavior are proven.

## Type Model

Main type: `CanonicaSupportBoardCard`.

Required scope fields:

- `pId`
- `tId`
- `sId`

Operational fields:

- `status`
- `priority`
- `sourceType`
- `sourceId`
- `assigneeName`
- `dueDate`
- `tags`
- related object IDs
- embedded `notes`

## Proposal Conversion

`createAnswerProposal(card)` creates a pending `CanonicaMutationProposal` with:

- `mutationType: new_answer_required`
- `relatedEntityIds: [card.relatedEntityId]`
- `draftStatus: pending`
- `draftSource: ticket_resolution` or `recurring_fallback`

No canonical answer is created at this step.

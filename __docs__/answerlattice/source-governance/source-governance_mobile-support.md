# Source Governance Mobile Support Assessment

## Decision

PARTIAL.

Reviewing one source is useful on mobile. Bulk source comparison and intake setup remain better on desktop.

## Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Partial | Source review is periodic, not a daily high-frequency action. |
| Speed | Pass for one source | A known source can be classified and saved quickly. |
| Touch | Pass | Selects, tags, and one save action can use 44px targets. |
| Away-from-desk value | Pass | A founder may confirm source ownership or scope from a review queue. |

## Supported Mobile Behavior

- Read governance state beside source evidence.
- Open the existing responsive modal.
- Change authority, approval, access, citation, dates, applicability, conflicts, and notes.
- Save through the same API and permission path.

## Desktop-Preferred Behavior

- Bulk imports.
- Comparing many long sources.
- Resolving complex conflicts.
- Building large applicability maps.

## Shared Contracts

- Same NextAuth and Answerlattice permission context.
- Same `MANAGE_KNOWLEDGE` permission.
- Same `useKnowledgeIntake` hook and server route.
- Same tenant and workspace scope.
- No separate mobile data path or Firestore read.
- Lucide icons from `react-icons/lu`.
- Buttons and modal actions retain at least 44px touch targets.

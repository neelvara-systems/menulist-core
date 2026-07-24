# SignalDesk Outcome Bridge - Specification

**Status:** Implemented runtime contract; local emulator verified
**Created:** June 23, 2026
**Runtime reconciled:** July 21, 2026

## Objective

Measure whether SignalDesk activity leads to meaningful MenuList outcomes while preserving MenuList as the source of truth.

## Goals

1. Create safe route tokens from a current interested conversation or the target's current exported/sent approval and draft.
2. Record outcome events from MenuList-controlled surfaces or manual operator confirmation.
3. Attribute outcomes back to target, source, channel, campaign/action, and conversation.
4. Prevent SignalDesk from mutating MenuList store/menu truth directly.
5. Produce summary metrics for activation and growth learning.

## Non-Goals

- No replacement of MenuList onboarding.
- No direct Firestore writes to MenuList store/menu documents.
- No owner/customer UI inside SignalDesk.
- No anonymous or unverified outcome mutation. The bounded public HTTP receiver accepts only timestamped raw-body HMAC requests.
- No attribution model that rewards send volume over real outcomes.

## Outcome Events

| Event | Meaning |
| --- | --- |
| `route_created` | Governed MenuList route was created. |
| `upload_started` | Owner began the MenuList input flow. |
| `preview_prepared` | MenuList preview was prepared for review. |
| `published` | MenuList public output was published. |
| `two_surface_activation` | Owner-reviewed activation evidence covers at least two distinct surfaces. |

## Requirements

| ID | Requirement |
| --- | --- |
| OUT-001 | Every route token must have scope, expiry, target, and a canonical source action: the current interested conversation or the target's current exported/sent approval and matching draft. |
| OUT-002 | Outcome events must be append-only. |
| OUT-003 | Outcome summaries must be derived from events, not hand-edited. |
| OUT-004 | MenuList writes must happen only through approved MenuList systems. |
| OUT-005 | Each accepted event must create one immutable direct attribution touch without overwriting history. |
| OUT-006 | Operator-entered outcomes require evidence note or linked MenuList record. |
| OUT-007 | Route tokens must not expose internal target IDs publicly. |

## Attribution Rules

- First-touch, last-touch, and assisted-touch values may be stored, but summaries must show the method used.
- Suppression blocks new route issuance and further outreach. A separately authenticated outcome may still be recorded without clearing suppression or creating renewed contact authority.
- Anonymous customer activity alone must not create a prospect.
- Manual operator attribution requires audit.

## Acceptance Criteria

- A current interested conversation or current exported/sent approval can produce a scoped route token; optional CTA/template lineage must match the same current draft.
- MenuList outcome event can be linked back to SignalDesk target and action.
- Duplicate outcome events do not inflate summaries.
- The same idempotency key with changed facts fails closed.
- Exact retries remain duplicates after route revocation, while new events are rejected.
- SignalDesk cannot update MenuList store/menu truth through this bridge.

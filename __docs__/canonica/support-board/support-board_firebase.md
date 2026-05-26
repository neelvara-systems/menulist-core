# Support Board Firebase Notes

## Collection

`canonica_supportBoardCards`

Each document is tenant/store scoped:

- `pId: CN`
- `tId`
- `sId`

## Rules

Firestore rules allow:

- read: authenticated Canonica support-control users
- create: authenticated Canonica support-control users
- update: authenticated Canonica support-control users with stable `tId`/`sId`
- delete: denied

Support-control permission is `canManageSupport`. Default support staff can use the board without gaining governance, billing, team, or workspace access.

## Indexes

Required indexes:

- `tId asc, sId asc, modifiedOn desc`
- `tId asc, sId asc, status asc, modifiedOn desc`

## Cost Model

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Board load | up to 120 | 0 | No realtime listener |
| Create manual card | 0 | 1 | One board document |
| Update card | 0 | 1 | One board document |
| Add note | 1 | 1 | Transaction reads card, writes capped notes array |
| Sync tickets | up to 50 | up to 20 | Explicit action only |
| Sync signals | up to 50 | up to 20 | Explicit action only |
| Create answer proposal | 0-1 | 3 | Proposal write, card update, note transaction |

## Scaling Guardrails

- No realtime board listener.
- Board load is capped at 120 cards.
- Source sync creates at most 20 cards per action.
- Notes are embedded and capped at 25 per card.
- Cards are never public.
- Delete is denied for now; resolved cards can be retained for operational context.

## Future Cost Improvements

- Add archive status and server-side compact summaries if board volume becomes high.
- Add critical-event-only automatic card creation after dedupe behavior is proven.
- Add summary doc for Weekly Digest instead of scanning board cards.

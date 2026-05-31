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

Compact nightly summary:

- document: `platformSummary/supportBoardSummary_{tId}_{sId}`
- read: authenticated Canonica support-control users
- write: Cloud Functions admin only

## Indexes

Required indexes:

- `tId asc, sId asc, modifiedOn desc`
- `tId asc, sId asc, status asc, modifiedOn desc`
- `aiSearchHistory`: `tId asc, sId asc, canonical asc, createdOn desc` for nightly recurring fallback scan

## Cost Model

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Board load | up to 120 | 0 | No realtime listener |
| Nightly summary read | 0 by default / 1 when enabled | 0 | `ENABLE_CANONICA_SUPPORT_BOARD_NIGHTLY_SUMMARY=false` skips this read |
| Create manual card | 0 | 1 | One board document with initial `statuses[]` entry |
| Update card without status change | 0 | 1 | One board document |
| Update card status | 1 | 1 | Transaction reads card, appends capped status history, and updates top-level `status` |
| Add note | 1 | 1 | Transaction reads card, writes capped notes array |
| Sync tickets | up to 50 | up to 20 | Feature-flagged explicit action only |
| Sync signals | up to 50 | up to 20 | Feature-flagged explicit action only |
| Nightly source scan | up to 1,250 + entity lookups | 0 | Disabled by default; search history, signal events, drifted answers, recent releases; capped per tenant |
| Nightly card upsert | up to 20 reads | up to 20 | Disabled by default; deterministic card docs; skips resolved and unchanged cards |
| Nightly summary | up to 121 | 0-1 | Disabled by default; reads recent cards plus existing summary; skips unchanged summary writes |
| Create answer proposal | 0-1 | 3 | Proposal write, card update, note transaction |

## Scaling Guardrails

- No realtime board listener.
- Board load is capped at 120 cards.
- Source sync is hidden unless `ENABLE_CANONICA_SUPPORT_BOARD_SOURCE_SYNC` is enabled.
- Source sync creates at most 20 cards per action when enabled.
- Nightly sync is disabled by default through `ENABLE_CANONICA_SUPPORT_BOARD_SYNC`.
- Nightly summary UI read is disabled by default through `ENABLE_CANONICA_SUPPORT_BOARD_NIGHTLY_SUMMARY`.
- Nightly sync creates or updates at most 20 cards per tenant per run when enabled.
- Nightly sync does not mirror every ticket into Kanban.
- Nightly sync skips resolved cards and skips unchanged cards by `syncSourceHash`.
- Notes are embedded and capped at 25 per card.
- Status history is embedded and capped at 50 entries per card.
- Cards are never public.
- Delete is denied for now; resolved cards can be retained for operational context.

## Future Cost Improvements

- Use cursor-based scan reduction if tenant signal volume grows beyond current caps.
- Feed Weekly Digest from `supportBoardSummary_{tId}_{sId}` instead of scanning board cards.
- Follow the Canonica-wide [Cost Read-Model Guardrails](../cost-read-model-guardrails/README.md) before adding any new Support Board source sync or realtime behavior.

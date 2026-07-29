# Support Board Firebase Notes

> **Last verified:** July 19, 2026

## Collection

`answerlattice_supportBoardCards`

Each document is tenant/store scoped:

- `pId: AL`
- `tId`
- `sId`

Source cards may also store compact requester/source metadata copied from the source record:

- `sourceCustomerName`
- `sourceCustomerEmail`
- `sourceCustomerPhone`
- `sourceCustomerUserId`
- `sourceOrigin`
- `sourcePath`
- `sourceSessionId`

These fields are internal owner/staff review metadata only. They avoid a second read against tickets, conversations, feedback, or signal events when rendering the board.

`sourceIdentityRedactedAt` and `sourceIdentityRedactedBy` record the one-way clearing of copied identity/location fields. The source ID remains for operational deduplication and traceability.

## Rules

Firestore rules allow:

- read: authenticated Answerlattice support-control users
- create: authenticated Answerlattice support-control users, allowed document shape, self actor, one initial status, no notes/resolution/scheduler fields, and not already resolved
- update: authenticated Answerlattice support-control users with an allowed mutation set, stable ownership/source fields, prepend-only notes/history, status-resolution coupling, one-way source-detail redaction, and note/status actor IDs that match the Firebase UID or canonical `uId` claim
- delete: denied

`relatedProposalId` changes additionally require `canManageGovernance` or platform-admin authority. Clients cannot forge `syncManaged` or other scheduler-owned fields.

The actor binding is mirrored in `firestore-answerlattice.rules` and `firestore.rules`. `npm run test:answerlattice-support-board:rules` and `npm run test:answerlattice-support-board:shared-rules` prove valid self-attribution and reject forged note/status authors.

The July 26 QA deploy attempt used `firebase deploy --project answerlattice-qa --config firebase-answerlattice.json --only firestore:rules --non-interactive` and stopped before upload with `Error: Failed to authenticate, have you run firebase login?`. The rule is therefore source/emulator verified but not deployed or live-certified.

Support-control permission is `canManageSupport`. Default support staff can use the board without gaining governance, billing, team, or workspace access.

Compact nightly summary:

- document: `platformSummary/supportBoardSummary_{tId}_{sId}`
- read: authenticated Answerlattice support-control users
- write: Cloud Functions admin only

## Indexes

Required indexes:

- `pId asc, tId asc, sId asc, modifiedOn desc`
- `pId asc, tId asc, sId asc, status asc, modifiedOn desc`
- `pId asc, tId asc, sId asc, priority asc`
- `answerlattice_canonicalAnswers`: `pId asc, tId asc, sId asc, governance.driftFlag asc` for product-partitioned drift candidates
- `aiSearchHistory`: `pId asc, tId asc, sId asc, canonical asc, createdOn desc` for product-partitioned nightly recurring fallback and Support Board scans; mirrored in dedicated and shared index manifests

## Cost Model

| Operation | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Board load | up to 120 | 0 | No realtime listener |
| Nightly summary read | 0 by default / 1 when enabled | 0 | `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_NIGHTLY_SUMMARY=false` skips this read |
| Create manual card | 0 | 1 | One board document with initial `statuses[]` entry |
| Create sourced card | 1 | 0-1 | Deterministic transaction reads the source-card document and creates only when absent |
| Update card without status change | 0 | 1 | One board document |
| Update card status | 1 | 1 | Transaction reads card, appends capped status history, and updates top-level `status` |
| Add note | 1 | 1 | Transaction reads card, writes capped notes array |
| Sync tickets | up to 50 source reads + up to 20 card reads | up to 20 | Feature-flagged explicit action; deterministic transaction prevents duplicates beyond the loaded board window |
| Sync signals | up to 50 source reads + up to 20 card reads | up to 20 | Feature-flagged explicit action; deterministic transaction prevents duplicates |
| Live summary refresh | 5 aggregate count queries + 1 summary read | up to 1 | Runs only on create/status/priority changes; the fifth count excludes resolved high-priority cards from owner work |
| Nightly source scan | up to 1,250 + entity lookups | 0 | Disabled by default; search history, signal events, drifted answers, recent releases; capped per tenant |
| Nightly card upsert | up to 20 reads | up to 20 | Disabled by default; deterministic card docs; skips resolved and unchanged cards |
| Nightly summary | up to 121 card reads + 5 aggregate count queries + 1 summary read | 0-1 | Disabled by default; exact core counts plus bounded breakdown; skips unchanged summary writes |
| Create answer proposal | 0-1 | 3 | Proposal write, card update, note transaction |

Nightly sync diagnostics add no Firestore operations. Success and failure logs use scope booleans, fixed failure codes, and source error name/code/status only.

## July 29, 2026 QA Deployment Evidence

The narrow deployment of `answerlatticeSupportBoardSummaryOnWrite` and
`answerlatticeNightly` stopped before upload because the local Firebase CLI was
not authenticated: `Failed to authenticate, have you run firebase login?`.
The live-summary emulator and dedicated/shared rules suites passed, but no QA
Function revision changed.

## Scaling Guardrails

- No realtime board listener.
- Board load is capped at 120 cards.
- Source customer display uses fields already present on the loaded board card; it adds no Firestore reads, listeners, joins, or indexes.
- Source sync is hidden unless `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SOURCE_SYNC` is enabled.
- Source sync creates at most 20 cards per action when enabled.
- Nightly sync is disabled by default through `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SYNC`.
- Nightly summary UI read is disabled by default through `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_NIGHTLY_SUMMARY`.
- Nightly sync creates or updates at most 20 cards per tenant per run when enabled.
- Nightly sync does not mirror every ticket into Kanban.
- Nightly sync skips resolved cards and skips unchanged cards by `syncSourceHash`.
- Notes are embedded and capped at 25 per card.
- Status history is embedded and capped at 50 entries per card.
- Cards are never public.
- Delete is denied for now; resolved cards can be retained for operational context.
- Exact core counts are not inferred from the 120-card UI window.
- `highPriorityCards` counts only unresolved cards, so resolved work cannot return to the Founder Daily Brief.
- Cap-plus-one nightly scans expose saturation/freshness state instead of implying complete analysis.

## Future Cost Improvements

- Use cursor-based scan reduction if tenant signal volume grows beyond current caps.
- Feed Weekly Digest from `supportBoardSummary_{tId}_{sId}` instead of scanning board cards.
- Define whole-workspace Support Board erasure/retention before claiming customer-controlled card deletion.
- Follow the Answerlattice-wide [Cost Read-Model Guardrails](../cost-read-model-guardrails/README.md) before adding any new Support Board source sync or realtime behavior.

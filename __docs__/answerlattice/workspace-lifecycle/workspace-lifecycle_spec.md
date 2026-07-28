# Workspace Lifecycle Specification

## Customer problem

A workspace must be closable without leaving widget keys, direct Firebase reads, support attachments, hosted-help domains, or public compiled context available. Permanent erasure must not accidentally delete financial records, another workspace, a shared identity, or data under legal hold.

## Actors

- **Workspace owner:** requests closure through support and decides whether to create a Support Truth Export.
- **Platform operator:** verifies identity, scope, billing, legal hold, and confirmation; runs closure, recovery, or erasure.
- **System:** enforces active-workspace access and records bounded lifecycle evidence.

Platform Support is not an erasure authority.

## Lifecycle

| State | Meaning | Customer access | Allowed next action |
| --- | --- | --- | --- |
| `active` | Normal workspace | Allowed by normal permissions | Close |
| `closing` | Access denied; public/runtime cleanup incomplete | Denied | Retry close |
| `closed` | Access denied; recovery window active | Denied | Recover or wait |
| `erasing` | Irreversible bounded deletion started | Denied | Continue erasure |
| `erased` | Workspace content removed; tombstone retained | Denied | None |

## Closure requirements

- Exact `pId/productId = AL`, `tId/tenantId`, `sId/storeId`, and store document ID.
- Platform operator identity verified in Answerlattice Firebase.
- Non-empty reason and exact confirmation.
- Store, tenant summary, and store summary become inactive.
- `active=false`, `deleted=true`, and `authDisabled=true` deny normal runtime scope.
- Public API/widget secrets are removed.
- Hosted-help registry rows and compiled context objects are removed.
- The result reports active billing as review-required; it does not mutate billing.

## Recovery requirements

- Exact platform confirmation.
- Lifecycle is `closed`, not `erasing` or `erased`.
- Recovery window has not expired.
- Store scope still matches.
- Store and summaries return to active.
- Removed credentials, hosted-help registry entries, and compiled bundles remain removed and must be recreated.

## Erasure requirements

- Exact `AL:{tId}:{sId}:ERASE` confirmation.
- Closure is complete and the 30-day recovery window has expired.
- No legal hold.
- Support Truth Export decision is `completed` or `waived`.
- Billing review is complete and no active Answerlattice subscription remains.
- Once closure or erasure begins, every Answerlattice subscription creation, payment activation, reactivation, active webhook update, and upgrade transactionally re-reads the workspace and fails closed. A pre-erasure billing check alone is not sufficient.
- Operator acknowledges retained financial and compact deletion evidence.

## Retained exceptions

- Provider subscription/payment records required for financial, tax, dispute, and fraud evidence.
- One scrubbed store tombstone containing numeric scope, lifecycle timestamps, a bounded internal operator reference, completion counts, and retained-record classifications.
- Bounded infrastructure logs still under their existing TTL when they contain no copied customer content.

Every other retained exception requires a new documented decision. “Keep everything for safety” is not a valid retention policy.

## Non-goals

- Self-service irreversible deletion.
- Automatic refund, cancellation, or provider action.
- Deleting another product or another Answerlattice workspace.
- Deleting a shared default-auth identity.
- Using Support Truth Export as a legal data-export claim.
- Restoring an erased workspace.

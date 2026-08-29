# Canonical Answer Governance Implementation

## End-to-end ownership

| Layer | Current implementation |
| --- | --- |
| Route and screen | Governance routes load the canonical answer editor and review surfaces. |
| Editor | `CanonicalAnswerEditor` captures entity, plan, role, state, version, content, and status inputs. `MutationProposalReview` lets a reviewer correct a generated draft's Product Topic before approval. |
| Hooks | `useCanonicalAnswers` and `useMutationProposals` coordinate owner actions and surface bounded governance errors. |
| Browser DAL | `canonicalAnswers.ts` and `mutationProposals.ts` call the governed API; they do not write canonical truth. |
| API | `POST /api/answerlattice/governance/actions` enforces session scope, flag, rate limit, permission, bounded JSON, and Zod validation. |
| Server | `governanceServer.ts` owns proposal creation, approval, status changes, validation, audit, and invalidation writes. |
| Storage | Canonical answers, mutation proposals, audit logs, cache versions, and compact source/bundle manifests are tenant-scoped. |
| Consumer | Canonical retrieval reads approved truth; Feature 2 audits retrieval behavior separately. |

## July 18 hardening

1. Manual update proposals record a SHA-256 fingerprint of the approved answer snapshot they were based on.
2. Impact review and approval reject a proposal when that fingerprint no longer matches current truth.
3. Legacy manual update proposals without a fingerprint fail closed and require resubmission.
4. Legacy signal, ticket, Support Board, and rollback updates without a fingerprint use proposal-created versus answer-modified timestamps and reject when the answer changed later or the base cannot be verified.
5. Reviewer content edits take precedence over `proposedContent`; optional edge cases and constraints can be explicitly cleared.
6. Safe API error messages reach the owner UI through `AnswerlatticeGovernanceClientError`.
7. Custom governance error subclasses restore their prototype so `instanceof` works under the current TypeScript runtime target.
8. The editor now exposes plan, role, state, and bounded version applicability for create and update.
9. Version history labels match the action names emitted by the server transaction.
10. Identity-bearing proposal, answer, entity, evidence, and request IDs are validated exactly; surrounding whitespace is rejected instead of being normalized into another mutation target or idempotency key.
11. Canonical scope arrays reject duplicate entity, plan, role, and state identifiers before proposal persistence.
12. The shared product-binding schema rejects validation versions before introduction and applicability windows whose end precedes their start, so API, stored-proposal, and server candidate checks share one contract.
13. Draft approval accepts an optional bounded Product Topic selection. Impact review uses the same selection; final approval revalidates every entity in the workspace, rejects deprecated entities and active overlaps, and records proposed versus approved bindings in the audit event.

## Data precedence on approval

For editable content fields:

`reviewer edit -> proposedContent -> legacy suggested field -> current answer`

For procedures:

`proposedContent procedure -> suggested procedure -> current procedure`

The server remains authoritative even when the editor or hook is bypassed.

## Failure behavior

| Failure | Result |
| --- | --- |
| Missing scope or permission | 400/403 before transaction work |
| Rate limit exceeded | 429 with no governance write |
| Invalid body or stored proposal | Bounded safe error; no canonical write |
| Entity missing or out of scope | Approval rejected |
| Active scope/version overlap | Approval rejected |
| Legacy manual update | 409; reviewer must resubmit from latest answer |
| Base answer changed | 409; reviewer must review latest answer and resubmit |
| Replayed completed approval | Existing implemented result; no duplicate invalidation |
| Unexpected server error | Generic 500 and runtime diagnostic without raw sensitive payload |

## Feature controls

- Flag: `ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS` (`src/config/features.ts:2365`)
- Permission: `canManageGovernance` (`src/constants/answerlattice/permissions.ts:11`)
- Product and tenant shape: `pId`, `tId`, `sId`

No new collection, route, dependency, scheduler, or Cloud Function was introduced.

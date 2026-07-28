# SignalDesk Outcome Bridge - Firebase Plan

**Status:** Implemented persistence contract; local emulator verified
**Created:** June 23, 2026
**Runtime reconciled:** July 21, 2026

## Collections

| Collection | Purpose | Read Pattern |
| --- | --- | --- |
| `signaldeskRouteTokens` | Scoped, expiring route references for qualified conversations or current exported/sent approvals. | Deterministic token lookup and bounded workspace review. |
| `signaldeskOutcomeEvents` | Append-only events from signed routes, demand signals, or operators. | Server point reads and summary validation; the current workspace does not expose a raw event stream. |
| `signaldeskAttributionTouches` | Normalized first/last/assisted touch records. | Reporting and detail view. |
| `signaldeskOutcomeSummaries` | Derived target/campaign/source/channel outcome totals. | Dashboard reads. |
| `signaldeskIdempotencyKeys` | Actor-bound route-token/outcome intent fingerprints and accepted entity links. | Server transaction point read only. |
| `signaldeskAuditEvents` | Token creation/revocation and accepted outcome audit. | Platform-admin audit view. |

## Required Fields

| Object | Required fields |
| --- | --- |
| Route token | `routeTokenId`, `pId`, `tokenHash`, `targetId`, `targetName`, `sourceActionId`, `sourcePolicyId`, `sourceRunId`, `channel`, `scope`, `status`, `ownerQualifiedAt`, `expiresAt`, `revokedAt`, `createdAt`, `createdBy`, `updatedAt` |
| Route-token claim | `actorId`, `entityId`, `idempotencyKeyHash`, `operation=route_token_create`, `requestFingerprintHash`, `tokenFingerprintHash`, `pId`, `updatedAt` |
| Outcome event | `outcomeEventId`, `pId`, `targetId`, `targetName`, `outcomeType`, `source`, `channel`, `evidenceRef`, `idempotencyKeyHash`, `integrityStatus`, `sourceEventId`, `routeTokenId`, `createdAt`, `createdBy` |
| Outcome claim | `actorId`, `entityId`, `entityType=outcome`, `idempotencyKeyHash`, `operation=outcome_record`, `requestFingerprintHash`, `pId`, `updatedAt` |
| Attribution touch | `touchId`, `targetId`, `eventId`, `actionId`, `touchType`, `weight`, `method`, `createdAt` |
| Summary | `outcomeSummaryId`, `pId`, `targetId`, `targetName`, `outcomeType`, `source`, `channel`, `count`, `day`, `evidenceRef`, `integrityStatus`, `latestOutcomeEventId`, `sourceEventId`, `updatedAt` |

## Indexes

| Query | Index |
| --- | --- |
| Token lookup | Deterministic document ID derived from token hash; no query index. |
| Latest target outcomes | `targetId`, `updatedAt desc` on `signaldeskOutcomeSummaries`. |
| Earliest target outcomes | `targetId`, `updatedAt asc` on `signaldeskOutcomeSummaries`. |

## Cost Rules

- Dashboards read `signaldeskOutcomeSummaries`, not raw events.
- Every accepted summary read also point-reads `latestOutcomeEventId` and rejects a missing, malformed, foreign-product, or mismatched event before projecting the summary.
- Workspace and revenue-consumer summary reads paginate through at most four bounded pages so malformed recent legacy rows cannot starve older valid truth; reaching the bound is logged. Revenue qualification and activation-watch reads remain inside their Firestore settlement transaction.
- Token replay reads one actor-bound claim and one route record. New token issuance additionally reads bridge pause, target lifecycle, source policy, current evidence, and current owner-qualified conversation. An explicit approval source also reads the current approval and draft.
- Every outcome requires an operation key. Outcome event, idempotency key, summary, target projection, direct attribution touch, route-use projection, audit, control summary, and cost estimate commit atomically.
- Outcome summaries use a source-scoped deterministic ID; route-token, demand-signal, and manual outcomes never share one counter.
- Summary day/ID and event/summary timestamps derive from one transaction-attempt instant, so UTC midnight cannot split the event from its daily aggregate.
- Event, idempotency claim, and attribution touch are create-only. An existing summary is replaced with a fully validated coupled record rather than broadly merged.
- New route-token issuance writes route, idempotency claim, audit, and daily-cost summary: four writes. Exact replay writes nothing.
- A new manual or demand outcome writes event, source-scoped summary, idempotency claim, attribution touch, target projection, audit, control summary, and daily-cost summary: eight writes. A signed route outcome also updates the route: nine writes. Exact replay writes nothing.
- If the target already has a revenue account and the Revenue Operating Layer is enabled, outcome settlement then runs a separate change-aware activation-watch reconciliation: four writes when only the watch changes, with one additional write for each changed account, opportunity, or revenue summary (up to seven). This follow-up is reported as `updated` or `pending`; it does not alter the accepted outcome transaction.
- Token revocation uses one route write, one audit write, and one cost-summary write.
- Manual reporting exports should use summaries unless raw evidence is explicitly needed.

## Retention

Route token records may be retained after expiry as hashed audit references. New route/outcome writes require the authoritative target lifecycle to be `active` with an unexpired `sourceDataExpiresAt`; `pending`, `failed`, and `completed` fail closed. Immutable accepted claims/events remain replayable after lifecycle cleanup or route revocation so providers can safely retry without duplicating effects. Outcome events and attribution touches retain enough history for growth learning and compliance audit under the active retention policy.

Completed route and conversation dependencies retain the exact scheduler tuple `sourceDataLifecycleCompletedAt`, `sourceDataLifecycleKind=source-data-retention-v1`, `sourceDataLifecycleState=completed`, `sourceDataLifecycleToken`, and `updatedBy=signaldesk-source-data-lifecycle`. Route tombstones must also be revoked and use the retained target label. Conversation tombstones must carry a legal-review reason; subsequent post-retention inbound merges may advance that reason and `updatedAt` without erasing the completed tuple. Strict readers reject incomplete or contradictory combinations.

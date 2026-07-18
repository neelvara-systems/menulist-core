# SignalDesk Foundation - Firebase Cost Plan

**Status:** Runtime reconciled
**Created:** June 23, 2026
**Runtime reconciled:** July 15, 2026
**Cost impact:** A pause transition uses one transaction with three document writes; overview uses fixed summary reads, eleven deterministic scope reads, and one strict incident query capped at a 501-document overflow sentinel.

## Firebase Posture

Foundation must use the dedicated SignalDesk Firebase target, not MenuList's default target.

Required before database-backed implementation:

- `menulist-signaldesk-qa` Firebase project for local/QA;
- `menulist-signaldesk` Firebase project for production;
- `firebase-signaldesk.json`;
- `firestore-signaldesk.rules`;
- `firestore-signaldesk.indexes.json`;
- `storage-signaldesk.rules`;
- `signaldeskFirebaseClient` and `signaldeskFirebaseAdmin`.

No foundation collection may be created in `menulist-qa` or `menulist` except a narrow auth/account bridge if explicitly documented.

## Collections

| Collection | Purpose | Normal reads |
| --- | --- | --- |
| `signaldeskTeamMembers` | Internal user role assignments | Login/session bootstrap |
| `signaldeskRolePolicies` | Role-permission matrix | Small policy list |
| `signaldeskAuditEvents` | Mutation/contact reveal/action audit | Admin audit page only |
| `signaldeskKillSwitches` | Emergency controls | Control room and pre-action checks |
| `signaldeskFoundationSummaries` | Control room summary | Dashboard read |
| `signaldeskIncidents` | Foundation/security/channel incidents | Control room list |
| `signaldeskIdempotencyKeys` | Retry, webhook, and mutation dedupe | Point lookup only |

## Read / Write Model

| Flow | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Load dashboard | 14 plus at most 501 incident documents | 0 normally; one-time legacy migration may add up to 3 | Reads three strict summary documents, all eleven deterministic scope documents, and one product/status-scoped incident query. The 501st row is an overflow sentinel; the overview fails and alerts instead of approximating truth beyond the 500-row strict-count ceiling. An exact pre-contract summary missing only its product/document identity is re-read transactionally and canonicalized once so rollout does not discard existing counts; the historical queue shape also receives its first required freshness timestamp. |
| Check permission | 1-2 | 0 | Cache role policy in server/runtime where safe. |
| Add/update team member | 1-2 | 2 | Server action writes `signaldeskTeamMembers`, audit, and cost summary. |
| Contact reveal | 2-4 | 1-2 | Reads role and contact state; writes audit. |
| Activate kill switch | 2 | 3 | One transaction reads the actor/request claim and current scope document, then writes the canonical switch, one audit, and one idempotency claim. |
| Deactivate kill switch | 2 | 3 | Uses the same transaction and retry contract as activation. |
| Audit search | Paginated query | 0 | Admin only, page size capped. |

## Cost Rules

- No real-time listener on audit events.
- Audit pages must paginate.
- Dashboard reads summary docs.
- Role policies should be small.
- Kill-switch checks should read compact docs.
- Contact reveal must not write multiple audit records for one action.
- A kill-switch retry must reuse its bounded actor/request key; exact and concurrent retries return the first result without another switch, audit, or claim write.
- Kill switches do not auto-expire. A pause remains active until an authorized explicit deactivation records its actor, reason, timestamp, audit, and idempotency claim; this prevents silent resume after an unattended timer.
- Kill-switch state must never overwrite provider-derived `channelStatus`; active pause truth is derived from all eleven strict scope documents.
- Control, queue, cost, kill-switch, and incident reads require exact SignalDesk product/document identity and valid persisted timestamps. Invalid rows are excluded and reported through bounded diagnostics.
- Pre-contract canonical control, queue, and daily-cost documents are accepted only at their deterministic document paths, only when the product identity is absent or already `SD`, and only after the synthesized canonical shape validates. Their identity fields are then materialized transactionally; wrong-product, mismatched-identity, or otherwise malformed rows are never migrated.
- The incident list is capped at 50, while `openIncidentCount` is computed only from strictly projected rows. The query reads at most 501 matching rows; more than 500 fails with a bounded diagnostic instead of counting unvalidated tail rows.
- Role policy reads should be cached per server request where safe.
- No real-time listener on team members, role policies, or incidents.
- No foundation dashboard may read raw audit events by default.

## Indexes

Minimum indexes:

- `signaldeskAuditEvents` by `actorId` + `createdAt`;
- `signaldeskAuditEvents` by `entityType` + `entityId` + `createdAt`;
- `signaldeskIncidents` by `status` + `severity` + `updatedAt`;
- no kill-switch composite index is required for the eleven canonical scope-document point reads.

Do not index:

- reason text;
- user agent hash;
- IP hash;
- raw request payloads.

## Retention

| Data | Default |
| --- | --- |
| Role policy | Until changed, keep version history |
| Kill-switch audit | 24 months minimum |
| Contact reveal audit | 24 months minimum |
| Incident records | 24 months minimum |

Exact retention needs legal/compliance confirmation before production.

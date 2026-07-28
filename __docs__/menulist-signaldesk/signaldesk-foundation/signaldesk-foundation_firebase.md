# SignalDesk Foundation - Firebase Cost Plan

**Status:** Runtime reconciled
**Created:** June 23, 2026
**Runtime reconciled:** July 21, 2026
**Cost impact:** Protected admission adds one current MenuList user-document read. Non-platform access then performs bounded SignalDesk membership lookups. A team-member mutation transaction reads bounded identity candidates and writes member, audit, and cost truth atomically.

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

No foundation collection may be created in `menulist-qa` or `menulist`. The documented narrow auth bridge is one current `users/{userId}` read through the existing MenuList authority helper; SignalDesk never writes that document.

## Collections

| Collection | Purpose | Normal reads |
| --- | --- | --- |
| `signaldeskTeamMembers` | Internal user role assignments | Login/session bootstrap |
| `signaldeskRolePolicies` | Reserved role-permission matrix namespace; no current runtime producer or consumer | None until separately activated |
| `signaldeskAuditEvents` | Mutation/contact reveal/action audit | Admin audit page only |
| `signaldeskKillSwitches` | Emergency controls | Control room and pre-action checks |
| `signaldeskFoundationSummaries` | Reserved foundation-summary namespace; current dashboard uses its explicit control/queue/cost and scope documents instead | None until separately activated |
| `signaldeskIncidents` | Foundation/security/channel incidents | Control room list |
| `signaldeskIdempotencyKeys` | Retry, webhook, and mutation dedupe | Point lookup only |

## Read / Write Model

| Flow | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Load dashboard | 14 plus at most 501 incident documents | 0 normally; one-time legacy migration may add up to 3 | Reads three strict summary documents, all eleven deterministic scope documents, and one product/status-scoped incident query. The 501st row is an overflow sentinel; the overview fails and alerts instead of approximating truth beyond the 500-row strict-count ceiling. An exact pre-contract summary missing only its product/document identity is re-read transactionally and canonicalized once so rollout does not discard existing counts; the historical queue shape also receives its first required freshness timestamp. |
| Check platform permission | 1 MenuList read | 0 | Revalidates the current user and derives platform authority from current truth. |
| Check member permission | 1 MenuList read plus one direct SignalDesk member read and bounded user-ID/email queries capped at two results each | 0 | Exactly one active human membership must resolve; malformed or ambiguous authority fails closed. |
| Add/update team member | Access reads plus at most two direct candidate reads and bounded user-ID/email queries capped at two results each | 3 | One transaction writes `signaldeskTeamMembers`, audit, and daily cost truth. |
| Contact reveal | 2-4 | 1-2 | Reads role and contact state; writes audit. |
| Activate kill switch | 2 | 3 | One transaction reads the actor/request claim and current scope document, then writes the canonical switch, one audit, and one idempotency claim. |
| Deactivate kill switch | 2 | 3 | Uses the same transaction and retry contract as activation. |
| Audit history page | 50 reads normally; up to 500 only if malformed rows consume every bounded scan page | 0 | Admin/API only. Orders by `createdAt` plus document ID and uses the exact pair as the next-page cursor. |

## Cost Rules

- No real-time listener on audit events.
- Audit history must paginate in 50-valid-event pages. Normal reads stop at 50 documents; extra bounded scans occur only to skip malformed/foreign rows and are diagnosed.
- Dashboard reads summary docs.
- The reserved role-policy namespace must remain unused until a separately reviewed producer, projector and consumer replace current code-owned role admission.
- Kill-switch checks should read compact docs.
- Contact reveal must not write multiple audit records for one action.
- A kill-switch retry must reuse its bounded actor/request key; exact and concurrent retries return the first result without another switch, audit, or claim write.
- Kill-switch state retains the bounded operator reason, while its audit row stores only a stable activate/deactivate event classification. Reactivation clears prior deactivation actor/time fields.
- Kill switches do not auto-expire. A pause remains active until an authorized explicit deactivation records its actor, reason, timestamp, audit, and idempotency claim; this prevents silent resume after an unattended timer.
- Kill-switch state must never overwrite provider-derived `channelStatus`; active pause truth is derived from all eleven strict scope documents.
- Control, queue, cost, kill-switch, and incident reads require exact SignalDesk product/document identity and valid persisted timestamps. Invalid rows are excluded and reported through bounded diagnostics.
- Pre-contract canonical control, queue, and daily-cost documents are accepted only at their deterministic document paths, only when the product identity is absent or already `SD`, and only after the synthesized canonical shape validates. Their identity fields are then materialized transactionally; wrong-product, mismatched-identity, or otherwise malformed rows are never migrated.
- The incident list is capped at 50, while `openIncidentCount` is computed only from strictly projected rows. The query reads at most 501 matching rows; more than 500 fails with a bounded diagnostic instead of counting unvalidated tail rows.
- Role policy reads should be cached per server request where safe.
- Do not cache current-user admission across requests. Revocation, block, deactivation, auth-disable, or role changes must take effect on the next protected request.
- Protected overview, workspace, action and kill-switch requests apply their hashed actor/operation limiter before the current-user and membership reads above. Limiter-provider uncertainty returns a retryable `503` and performs no membership, permission, workflow or blocked-mobile-audit Firestore work; quota exhaustion returns `429`.
- Membership queries are capped at two results because a second match is an authority conflict, not valid data to merge silently.
- No real-time listener on team members, role policies, or incidents.
- No foundation dashboard may read raw audit events by default.
- Audit cursor paging uses the existing single-field `createdAt` index plus document-name ordering; the emulator proves the query and no new composite index is required.

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
| Reserved role policy | No rows are produced today; define retention before activation |
| Kill-switch audit | 24 months minimum |
| Contact reveal audit | 24 months minimum |
| Incident records | 24 months minimum |

Exact retention needs legal/compliance confirmation before production.

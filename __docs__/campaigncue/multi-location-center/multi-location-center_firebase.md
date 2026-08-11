# Multi-Location Center - Firebase

## Storage Decision

No new Firestore collection or Storage object is required.

| Existing path | Use |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/locations/{locationId}` | Compact branch profile and contact overrides. |
| `.../campaigns/{campaignId}` | One normal campaign per branch, including group/root/location pointers and compact branch snapshot. |
| `.../trustReports/{trustReportId}` | Independent branch trust report. |
| `.../events/{eventId}` | One aggregate batch-created event; later actions use existing campaign events. |
| `.../analyticsSummaries/dashboard` | One atomic campaign-count increment by batch size. |
| `.../idempotencyKeys/{key}` | Existing request claim and completion receipt. |

Rejected collections: `locationGroups`, nested `locationDrafts`, `locationApprovalStates`, and `locationResultSummaries`. Existing campaign, approval inbox, and result-memory contracts already provide those lifecycles.

## Read/Write Cost

For `N` selected branches, where `1 <= N <= 8`:

### New batch

- Workspace-only bootstrap: one MenuList store verification read and one CampaignCue workspace read.
- Idempotency claim: one idempotency read, one current-workspace read, and one claim write.
- Creation transaction: six fixed reads (`idempotency`, `workspace`, `businessBrains/default`, source campaign, `sourceSnapshots/current`, bounded source-input query) plus `N` location reads.
- Creation transaction writes: `N` campaigns + `N` trust reports + one aggregate event + one summary merge + one idempotency completion.
- Total CampaignCue writes including the claim: `2N + 4`; maximum 20 for eight branches.
- Storage writes: zero.
- Provider calls: zero.

### Replay

- Reuses deterministic campaign IDs derived from the request identity and idempotency key.
- Reads each saved campaign and trust report; creates no campaign/trust/event/summary write.

## Page-Load Cost

- The owner overview keeps the existing bounded location and campaign queries; the branch UI adds no query or listener.
- Selecting locations is browser-local.
- Returned variants are merged into the loaded overview; no refetch is required.
- Branch freshness adds location reads only to low-frequency public-use actions for location campaigns.
- Asset Library branch visibility uses the existing bounded asset result and current workspace membership in memory; it adds no per-location query or listener.
- No realtime listener is used.

## Limits

- At most eight unique locations per request.
- Overview/list queries remain bounded by `CAMPAIGNCUE_PAGE_SIZE`.
- One aggregate creation event per batch, not one event per branch.
- One summary merge per batch, not one summary write per branch.
- Branch snapshot contains only the compact public-business contact/locality fields needed for trust and handoff.

## Security

- Server Admin writes run only after signed-in tenant/store/workspace scope validation.
- The transaction rereads current membership before creating variants.
- Location creation is limited to owner, admin, marketer, and agency-member roles and rechecks that role inside the write transaction.
- Local managers are restricted to assigned location IDs for create, action, approval, and hosted-page paths.
- Campaign-linked asset registration and archive finalization persist `locationId` and repeat current membership checks. Asset list, preview, and download fail closed outside assigned locations.
- URLs accept only HTTP/HTTPS at the request boundary.
- No signed URL, base64 payload, raw Fabric state, social token, customer list, or provider credential enters branch campaign state.

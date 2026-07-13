# Campaign Operating Loop - Firebase

## Cost Verdict

The feature uses existing documents and collections. Campaign rhythm, safe-reuse nomination, and readiness are derived from the already-loaded overview. It adds no collection, realtime listener, Cloud Function, scheduler, provider call, or Storage object.

## Documents Reused

| Document | Added compact state |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/businessBrains/default` | owner pulse, commercial policy, presence profile, language policy |
| `.../sourceSnapshots/current` | the same normalized facts and order-independent source hash |
| `.../campaigns/{campaignId}` | pack freshness, commercial gate, experiment, latest result receipt |
| `.../schedules/{scheduleId}` | optional staff assignee and manual task type |
| `.../approvalRequests/{campaignScopedId}` | one merged approval lifecycle record per campaign |
| `.../events/{eventId}` | existing action event with compact result metric metadata |
| `.../analyticsSummaries/dashboard` | existing action counters only |

## Operation Matrix

| Flow | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Workspace overview | 8 | 0 | Unchanged bounded overview; all new decision state is derived in memory. |
| Save Business Brain/pulse/policy | existing workspace path | existing 3-document batch | Workspace, default Business Brain, and current source snapshot. No event collection write was added. |
| Decision render | 0 | 0 | Uses overview data and constants. |
| Campaign create | existing bounded reads | existing create batch | New metadata is nested in the existing campaign document. |
| Download/export/mark used/schedule for a new pack | 1 conditional source-snapshot read after campaign/idempotency reads | existing action batch | Recheck runs only for public-use actions and only when the campaign carries a freshness hash. |
| Record result | existing campaign action reads | existing action batch | Metrics and experiment variable remain in the campaign and current event; no result collection is created. |
| Build campaign rhythm/readiness | 0 | 0 | Uses the existing bounded campaigns, schedules, pack, trust, and summary data in memory. |
| Reuse a useful pack | 0 incremental | existing campaign-create batch | Source campaign is found inside the campaign list already loaded by creation; a new current-truth pack is built. |
| Request approval | workspace read, existing idempotency claim, and one transactional campaign read | existing idempotency claim write, then campaign + approval + event + summary increment + idempotency completion in one transaction | Concurrent/repeated requests cannot create multiple approval records or double-count one accepted transition. |
| Approve/reject | workspace read, existing idempotency claim, and one transactional campaign read | existing idempotency claim write, then campaign + approval + event + idempotency completion in one transaction | The transaction rechecks that approval is still requested; the first resolution wins and no dashboard-summary write is added. |

## Cost Guards

- No separate pulse, decision, freshness, presence, language, receipt, experiment, reputation, retention, or staff-task collection.
- No campaign-rhythm, reuse-candidate, or readiness collection.
- One approval document per campaign instead of one document per request click.
- Approval mutations use one campaign read inside their transaction instead of a pre-read plus transaction re-read.
- Owner UI busy guards suppress rapid duplicate approval, schedule, export, mark-used, and result requests before they consume additional idempotency/event writes.
- Re-requesting a rejected pack preserves the deterministic approval document's original `createdAt` without adding an approval-document read.
- No source/event scan for decision learning.
- No new page-load read.
- No persisted derived `CampaignCueOutputPack` blob.
- No provider read or paid model call.
- Result metrics are bounded integers and only the latest receipt is retained on each bounded campaign document.
- Campaign lists remain capped by the existing page size.
- Source facts are sorted before hashing so order drift cannot trigger unnecessary campaign recreation.
- Source-input and Owner Pulse validity are carried in compact source truth/pack expiry; no expiry watcher or scheduled cleanup function is added.
- Expired source inputs are filtered in memory. This avoids an extra status-update write merely because time passed.
- Safe reuse copies no old output blob and creates no Storage duplicate.

# CampaignCue Product — Firebase Cost Tracking

## Cost Posture

CampaignCue is cost-sensitive because campaign generation, videos, asset processing, analytics, and future provider integrations can become expensive. The active runtime is export/download-only and has no direct provider posting, social account connection, or credit-consuming provider action.

## Product-Level Collections

| Collection family | Read pattern | Write pattern | Cost risk |
| --- | --- | --- | --- |
| `campaigncueWorkspaces/{workspaceId}` | Workspace load | Server-created workspace, members, settings | Medium |
| `campaigncueWorkspaces/{workspaceId}/businessBrains/{businessBrainId}` | Business Brain load, campaign creation | Profile, catalog, brand kit, source confidence | Medium |
| `campaigncueWorkspaces/{workspaceId}/sourceSnapshots/{snapshotId}` | Campaign generation/trust check | Snapshot with source facts, missing facts, vertical risks, and hash on changed source data | Medium |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}` | Campaign lists and detail | Brief, status, output references | Medium |
| `campaigncueWorkspaces/{workspaceId}/assets/{assetId}` | Asset library and campaign selection | Asset metadata, rights, consent type, tags, source links | Medium |
| `campaigncueWorkspaces/{workspaceId}/trustReports/{trustReportId}` | Review/export/publish gates | Issues, warnings, blockers | Medium |
| `campaigncueWorkspaces/{workspaceId}/schedules/{scheduleId}` | Calendar/manual task list | Manual schedule records | Low |
| `campaigncueWorkspaces/{workspaceId}/events/{eventId}` | Internal/debug/event audit | Meaningful campaign and asset actions | High if overused |
| `campaigncueWorkspaces/{workspaceId}/analyticsSummaries/{summaryId}` | Dashboard/report read model | Mutation-time summary updates | Low |
| `campaigncueWorkspaces/{workspaceId}/approvalRequests/{approvalId}` | Agency/client approval queue | Approval request state | Medium |
| `campaigncueWorkspaces/{workspaceId}/usageLedger/{ledgerId}` | Billing/credit screen | Future credit lifecycle | High correctness risk |
| `campaigncueWorkspaces/{workspaceId}/idempotencyKeys/{key}` | Server mutation replay protection | Idempotency result tracking | Low |

## Cost Rules

- Use paginated reads for campaign, asset, job, and analytics lists.
- Use summary/read-model documents for home dashboards.
- Do not scan raw events at runtime.
- Do not poll jobs without backoff.
- Do not write a new source snapshot unless source content changed or explicit source event requires it.
- Store large binary assets in Storage, not Firestore.
- Keep AI prompts and generated payload logs minimized and protected.

## Storage

| Path family | Contents | Cost guard |
| --- | --- | --- |
| `campaigncue/assets/{workspaceId}/...` | Uploaded photos/videos/logos/service/menu files | File size/type validation and signed URL upload. |
| `campaigncue/renders/{workspaceId}/...` | Rendered images, ZIPs, MP4s, PDFs | Expiry/retention policy required. |
| `campaigncue/reports/{workspaceId}/...` | Agency and multi-location exports | Generate on demand and retain by plan. |

## Cloud Functions

No CampaignCue Cloud Function is active in the current export/download-first runtime. These function classes remain the provider/scheduler contract only if a separate future provider layer is enabled:

| Function class | Trigger | Cost guard |
| --- | --- | --- |
| Source sync | Manual/API/webhook | Idempotency key and source hash. |
| Asset ingestion | Upload confirmed | Size caps and async jobs. |
| Generation | Campaign/output request | Credit reservation before provider calls. |
| Video render | Render request | Estimate before queue and refund failed outputs. |
| Trust check | Generation complete/export/publish | Reuse trust report if source/output unchanged. |
| Publishing | Future direct channel action | Idempotency, retry caps, consent, provider quota, and manual export fallback. |
| Analytics rollup | Scheduled or event-based | Summary docs, no raw runtime scans. |

## Current Runtime Cost Impact

The current implementation adds an export/download-first CampaignCue runtime:

- Public site: zero Firebase reads/writes.
- Workspace load: one bounded server overview read for workspace, Business Brain, source inputs, campaigns, assets, schedules, locations, and one analytics summary; zero realtime listeners. Provider connection records are not read in the active runtime.
- Standalone campaign, asset, source, read-only provider posture, location, and analytics endpoints use direct workspace-only reads instead of loading the full overview.
- First workspace load: may create workspace, business brain, source snapshot, and dashboard summary documents once for the signed-in tenant/store.
- Owner campaign creation: reads bounded source, asset, schedule, location, and summary context so the selected cue can be resolved server-side; then atomically claims one idempotency key and writes one campaign, one trust report, one event, one atomic summary increment, and one idempotency completion.
- Campaign action: reads the target campaign once, atomically claims one idempotency key, writes one event plus the scoped campaign update, then writes one idempotency completion; schedule, approval, and owner-reported outcome actions update summary counters without scanning raw events. The API response is built from known mutation state and does not reread the campaign after commit.
- Blocked trust-gate actions write an `export_action_blocked` event and a completed idempotency error record so owner retries do not leave dangling `in_progress` keys.
- Asset registration and location creation use a workspace-only guard read, then write their scoped document plus one event. Asset metadata now includes rights status, consent type, note, and tags without requiring binary upload.
- Provider setup/manual confirmation writes are not active; `/api/campaigncue/integrations` is read-only posture.
- The owner workspace UI merges successful mutation responses locally instead of reloading the full overview after every save/action.
- Social account connection, direct provider calls, paid generation, rendered video, billing checkout, and ad spend mutation: disabled, zero provider cost.

No CampaignCue Cloud Function or scheduler cost is introduced in this pass.

## Foundation Firebase Decision

| Stage | Firebase project id in deployment matrix | Runtime status |
| --- | --- | --- |
| Local | `campaigncue-qa` | Runtime uses `campaigncueFirestoreAdmin` with `CAMPAIGNCUE_FIREBASE_*` env vars or local ADC. |
| Preview | `campaigncue-qa` | Requires CampaignCue Firebase env vars and deploy using `firebase-campaigncue.json`. |
| Production | `campaigncue` | Requires CampaignCue Firebase env vars and deploy using `firebase-campaigncue.json`. |

Actual Firebase project creation, credentials, App Check configuration, and rule/index/storage deploy remain external setup. CampaignCue deploy files now exist:

- `firebase-campaigncue.json`
- `firestore-campaigncue.rules`
- `firestore-campaigncue.indexes.json`
- `storage-campaigncue.rules`

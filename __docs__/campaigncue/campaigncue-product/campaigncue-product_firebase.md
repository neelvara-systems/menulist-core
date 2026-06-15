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
| `campaigncue/renders/{workspaceId}/...` | Rendered images, server-generated ZIPs, MP4s, PDFs | Expiry/retention policy required. Not used by the current browser-local Campaign Pack ZIP. |
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
- Daily Campaign Desk and Campaign Decision Engine: computed from the same overview payload and recomputed locally after owner mutations; vertical recipes, deterministic scoring, manual delivery tasks, asset-reuse prompts, and result options add zero additional overview reads, writes, realtime listeners, Storage calls, Cloud Functions, providers, or model calls.
- Campaign Pack Output System: `CampaignCueOutputPack` is derived from the same overview payload and downloaded as a browser-local ZIP; it adds no new collection, read, write, Storage object, Cloud Function, provider call, or model call.
- Standalone campaign, asset, source, read-only provider posture, location, and analytics endpoints use direct workspace-only reads instead of loading the full overview.
- First workspace load: may create workspace, business brain, source snapshot, and dashboard summary documents once for the signed-in tenant/store.
- Owner business/profile save: after workspace/business guard reads, reads the compact `sourceSnapshots/current` read model, rebuilds current facts from the new Business Brain plus saved snapshot facts, and writes workspace/business/source snapshot updates in one batch. It does not list `sourceInputs` for profile-only changes.
- Owner source input save: after workspace/business guard reads, reads the compact `sourceSnapshots/current` read model and writes the source input, refreshed snapshot, and event in one batch. It does not scan the `sourceInputs` collection just to rebuild facts.
- Owner campaign creation: reads bounded source, campaign history, asset, schedule, location, and summary context so the selected cue and deterministic decision can be resolved server-side; then atomically claims one idempotency key and writes one campaign with compact `pack.recipeId`/`pack.decision`, one trust report, one event, one atomic summary increment, and one idempotency completion in the same Firestore batch.
- Campaign action: reads the target campaign once, atomically claims one idempotency key, then writes the scoped campaign update, event, summary increment, and idempotency completion in one Firestore batch. Schedule, approval, and owner-reported outcome actions update summary counters without scanning raw events. The API response is built from known mutation state and does not reread the campaign after commit.
- Blocked or needs-fix trust-gate public-use actions (`download`, `export`, `mark_used`, `schedule`) write an `export_action_blocked` event and completed idempotency error record in one Firestore batch so owner retries do not leave dangling `in_progress` keys. Approval requests and result recording stay available so unsafe packs can still be reviewed or historically annotated.
- Asset registration uses a workspace-only guard read, then writes the asset metadata record and event in one batch. Location creation uses a workspace-only guard read, then writes the location record plus one event. Asset metadata now includes rights status, consent type, note, and tags without requiring binary upload.
- CueLayers flat-safe upload stores `current.jobId` on the design as a summary pointer; upload replay prefers a direct job document read and only falls back to the indexed `designId` query for legacy records.
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

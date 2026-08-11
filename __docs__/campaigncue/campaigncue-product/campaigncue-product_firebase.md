# CampaignCue Product — Firebase Cost Tracking

## Cost Posture

CampaignCue is cost-sensitive because campaign generation, videos, asset processing, analytics, and future provider integrations can become expensive. The active runtime is export/download-only and has no direct provider posting, social account connection, or credit-consuming provider action.

## Product-Level Collections

| Collection family | Read pattern | Write pattern | Cost risk |
| --- | --- | --- | --- |
| `campaigncueWorkspaces/{workspaceId}` | Workspace load | Server-created workspace, members, settings | Medium |
| `campaigncueWorkspaces/{workspaceId}/businessBrains/{businessBrainId}` | Business Brain load, campaign creation | Profile, catalog, brand kit, Brand Playbook, source confidence | Medium |
| `campaigncueWorkspaces/{workspaceId}/sourceSnapshots/{snapshotId}` | Campaign generation/trust check | Snapshot with source facts, missing facts, vertical risks, and hash on changed source data | Medium |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}` | Campaign lists and detail | Brief, status, output references | Medium |
| `campaigncueWorkspaces/{workspaceId}/assets/{assetId}` | Asset library and campaign selection | Asset metadata, rights, consent type, tags, source links | Medium |
| `campaigncueWorkspaces/{workspaceId}/trustReports/{trustReportId}` | Review/export/publish gates | Issues, warnings, blockers | Medium |
| `campaigncueWorkspaces/{workspaceId}/schedules/{scheduleId}` | Calendar/manual task list | Manual schedule records | Low |
| `campaigncueWorkspaces/{workspaceId}/events/{eventId}` | Internal/debug/event audit | Meaningful campaign and asset actions | High if overused |
| `campaigncueWorkspaces/{workspaceId}/analyticsSummaries/{summaryId}` | Dashboard/report read model | Mutation-time summary updates | Low |
| `campaigncueWorkspaces/{workspaceId}/approvalRequests/{approvalId}` | Agency/client approval queue | Approval request state | Medium |
| `campaigncueWorkspaces/{workspaceId}/usageLedger/{ledgerId}` | Billing/credit screen | Future credit lifecycle | High correctness risk |
| `campaigncueWorkspaces/{workspaceId}/idempotencyKeys/{key}` | Server mutation replay protection | Actor/action/request-bound five-minute claim lease, exact worker ownership, terminal replay result, and 90-day TTL | Low |

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
| `campaigncue/assets/{workspaceId}/{uploadId}/...` | Uploaded photos/videos/audio plus one WebP preview | Direct resumable create through a short-lived `media_upload` Firebase session bound to the exact upload id/source filename, followed by authoritative server metadata/header verification. Direct client reads remain denied. |
| `campaigncue/renders/{workspaceId}/...` | Rendered images, server-generated ZIPs, MP4s, PDFs | Expiry/retention policy required. Not used by the current browser-local Campaign Pack ZIP. |
| `campaigncue/reports/{workspaceId}/campaigns/{campaignId}/archive-{a\|b}.zip` | Optional current Campaign Pack cloud copy | Two alternating immutable-safe object names per campaign, 25 MB maximum, generation-pinned reads, and deny-all direct Firebase client access. The protected server boundary issues short-lived signed URLs only. |

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

- Public site: zero Firebase reads/writes. This includes the homepage, dedicated public feature pages under `src/app/sites/campaigncue/features/[featureSlug]`, and public use-case pages such as `src/app/sites/campaigncue/use-cases/small-business/page.tsx`; previews are static website content and do not read owner workspace data.
- Protected dashboard shell: uses the same NextAuth session guard, localization, Redux theme persistence, Ant Design theme, RTL direction state, translated CampaignCue dashboard chrome, profile/settings UI, session-expiry monitor, app-update prompt, shortcuts, and network status providers as MenuList. It intentionally does not mount the MenuList store/subscription bootstrap provider for CampaignCue chrome, so opening the CampaignCue dashboard does not add MenuList tenant/store/subscription reads before CampaignCue's own workspace API request.
- Date/time handling: durable schedule/source/campaign timestamps remain Firestore `Timestamp` or UTC ISO values. Owner-facing formatting happens in the client through the shared app formatter and native datetime inputs convert through the workspace timezone before persistence. This adds no Firestore read/write, Storage object, Cloud Function, or provider cost.
- Workspace load: nine bounded reads in the healthy existing-workspace path: one shared MenuList store-scope verification plus CampaignCue workspace, Business Brain, source inputs, campaigns, assets, schedules, locations, and analytics summary; zero realtime listeners. Provider connection records are not read in the active runtime. The standalone analytics path performs three reads: shared store scope, workspace membership, and the compact summary.
- Daily Campaign Desk and Campaign Decision Engine: computed from the same overview payload and recomputed locally after owner mutations; vertical recipes, deterministic scoring, manual delivery tasks, asset-reuse prompts, and result options add zero additional overview reads, writes, realtime listeners, Storage calls, Cloud Functions, providers, or model calls.
- Campaign Pack Output System: `CampaignCueOutputPack`, including Campaign Proof Deck brief content, is derived from the same overview payload and downloaded as a browser-local ZIP; it adds no new collection, read, write, Storage object, Cloud Function, provider call, or model call.
- Optional durable Campaign Pack archive: the owner explicitly saves the already-built browser ZIP through a protected signed-upload lease. A normal new save uses one bounded transaction with workspace/campaign reads and one campaign lease write, one Storage metadata verification, then the existing idempotent campaign-action transaction; exact-current replay reuses the pointer without a new Storage upload or Firestore write. Only the campaign's current pointer and one deterministic Asset Library record are retained, while Storage rotates between `archive-a.zip` and `archive-b.zip`. No collection, listener, Cloud Function, provider, model, or background job is added.
- Standalone campaign, asset, source, read-only provider posture, location, and analytics endpoints use direct workspace-only reads instead of loading the full overview.
- First workspace load: validates the shared MenuList store’s exact tenant ownership and active state, transactionally claims one workspace owner, then create-only initializes the Business Brain, source snapshot, and dashboard summary. Existing workspaces require exact CC product/tenant/store/status and current durable membership; concurrent bootstrap cannot replace members or reset summary counters.
- Owner business/profile save: after workspace/business guard reads, reads the compact `sourceSnapshots/current` read model, rebuilds current facts from the new Business Brain plus saved snapshot facts, and writes workspace/business/source snapshot updates in one batch. It does not list `sourceInputs` for profile-only changes.
- Owner source input save: after workspace/business guard reads, reads the compact `sourceSnapshots/current` read model and writes the source input, refreshed snapshot, and event in one batch. It does not scan the `sourceInputs` collection just to rebuild facts.
- Owner campaign creation: transactionally claims or recovers one required bounded idempotency lease, reads one coherent bounded workspace/Business Brain/source/campaign/asset/schedule/location/summary authority snapshot so the selected cue and deterministic decision can be resolved server-side, then rereads and fingerprints the same complete authority inside the final transaction. A concurrent input change completes the retry as a safe conflict and writes no campaign effect; unchanged authority writes one campaign with compact `pack.recipeId`/`pack.decision`, one trust report, one event, one atomic summary increment, and exact claim-owned idempotency completion.
- Campaign action: after the workspace guard and actor/request-bound five-minute idempotency lease, one transaction reads the current claim and campaign, derives counters/result state from that snapshot, and writes campaign, event, summary increment, optional schedule, and exact claim-owned completion. Public-use actions also transaction-read the current workspace and conditionally the compact source snapshot. Schedule, approval, and owner-reported outcome actions update summary counters without scanning raw events. The API response is built from transaction state and does not reread after commit.
- Blocked or needs-fix trust-gate public-use actions (`download`, `export`, `mark_used`, `schedule`) transactionally write an `export_action_blocked` event and completed idempotency error record after the current campaign/workspace/source recheck, so owner retries do not leave dangling `in_progress` keys. Approval requests and result recording stay available so unsafe packs can still be reviewed or historically annotated.
- Metadata-only asset registration uses a workspace guard read, then writes the asset record and event in one batch. Campaign-linked registration adds one direct campaign read; Storage-backed registration adds one object-metadata lookup and stores only the workspace path plus authoritative size/type. External or signed download URLs are rejected and never persisted. Location creation uses a workspace-only guard read, then writes the location record plus one event.
- CueLayers flat-safe upload stores `current.jobId` on the design as a summary pointer; upload replay prefers a direct job document read and only falls back to the indexed `designId` query for legacy records. Pre-commit image/artifact uploads are tracked and best-effort deleted when a later upload or Firestore transaction fails; committed objects remain durable if response hydration fails.
- Primary and CueLayers retry claims write a 90-day `expiresAt`. Firestore TTL removes expired terminal/abandoned rows asynchronously, bounding arbitrary client-key growth without adding a scheduler or runtime query.
- CampaignCue and CueLayers Admin writes use the shared hardened Firestore serializer with optional `undefined` object fields omitted. Persisted read decoders normalize legacy optional `null` fields to absence, reject malformed required/scalar/scope fields, and keep invalid records out of owner output and mutation calculations.
- Provider setup/manual confirmation writes are not active; `/api/campaigncue/integrations` is read-only posture.
- The owner workspace UI merges successful mutation responses locally instead of reloading the full overview after every save/action.
- Social account connection, direct provider calls, paid generation, external/cloud-rendered video, billing checkout, and ad spend mutation: disabled, zero provider cost. In-house browser video rendering writes only compact `videoProjects` state and receipts; final media bytes stay on the owner's device.

No CampaignCue Cloud Function or scheduler cost is introduced in this pass.

## Current Index Boundary

`firestore-campaigncue.indexes.json` intentionally contains no composite index. Its only field override enables TTL for `idempotencyKeys.expiresAt` and disables unused indexing on that retention-only field. Every active query first resolves one exact `campaigncueWorkspaces/{workspaceId}` path and then uses a direct subcollection document read, a single-field equality filter, or a single-field `createdAt`/`updatedAt` order with a bounded limit. Firestore's automatic single-field indexes cover those shapes.

The previous twelve `workspaceId + createdAt/updatedAt` and `designId + createdAt` composites had no matching runtime query. Removing them avoids composite-index fanout and storage on source, campaign, asset, schedule, event, location, and CueLayers writes. Add a composite only with the exact bounded query and verifier that needs it; do not pre-provision cross-workspace or dormant-provider indexes.

QA deployment evidence (July 17, 2026): the scoped `campaigncue-qa` index deploy loaded the empty manifest and stopped before upload at the Firebase Rules test endpoint with HTTP 403 caller permission. No remote index changed. An authorized operator must repeat:

```bash
firebase deploy --project campaigncue-qa --config firebase-campaigncue.json --only firestore:indexes --non-interactive
```

## Foundation Firebase Decision

| Stage | Firebase project id in deployment matrix | Runtime status |
| --- | --- | --- |
| Local | `campaigncue-qa` | Runtime uses `campaigncueFirestoreAdmin` with `CAMPAIGNCUE_FIREBASE_*` env vars or local ADC. |
| Preview | `campaigncue-qa` | Requires CampaignCue Firebase env vars and deploy using `firebase-campaigncue.json`. |
| Production | `campaigncue` | Requires CampaignCue Firebase env vars and deploy using `firebase-campaigncue.json`. |

Production and preview runtime (`NODE_ENV=production`) always use dedicated
CampaignCue mode even if a stale environment value requests `shared`, `same`,
or `default`. Shared-mode compatibility is limited to local development and
emulator work. Public/server project values and service-account `project_id`
must exactly equal the deployment-matrix target (`campaigncue-qa` or
`campaigncue`); whitespace, MenuList/Answerlattice IDs, coercible values, and
other project IDs fail closed before a CampaignCue Admin app is initialized.

Actual Firebase project creation, credentials, App Check configuration, and rule/index/storage deploy remain external setup. CampaignCue deploy files now exist:

- `firebase-campaigncue.json`
- `firestore-campaigncue.rules`
- `firestore-campaigncue.indexes.json`
- `storage-campaigncue.rules`

# Campaign Operating Loop - Implementation

## Code Map

| Contract | Source |
| --- | --- |
| Durable types | `src/types/campaigncue.ts` |
| Recipes | `src/constants/campaigncue/dailyDesk.ts` |
| Normalization, commercial gate, presence, freshness, learning | `src/lib/campaigncue/operatingLoop.ts` |
| Deterministic ranking | `src/lib/campaigncue/decisionEngine.ts` |
| Daily Desk and output pack projection | `src/lib/campaigncue/dailyDesk.ts` |
| Firestore writes and public-use enforcement | `src/lib/campaigncue/server.ts` |
| Zod request boundaries | `src/lib/validation/campaigncueSchemas.ts` |
| Responsive owner UI | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` |
| Feature gate | `src/config/features.ts` |

## Campaign Rhythm And Reuse Flow

1. `buildCampaignCueCampaignRhythm()` receives the already-loaded bounded campaigns and schedules plus the current recipe/workspace.
2. It derives approval due, time-sensitive manual task due, result due, next scheduled task, and one positive-result reuse candidate without Firebase or provider calls.
3. `buildCampaignCueDailyDesk()` exposes the rhythm to Daily Desk, Campaign Packs, Calendar, and the output pack.
4. The owner selects **Reuse safely**.
5. `POST /api/campaigncue/campaigns` receives `reuseCampaignId`.
6. Campaign creation finds that source campaign inside the campaign list it already loaded, selects the same recipe, recomputes the current decision, and rebuilds outputs from current Business Brain/source truth.
7. The new campaign stores only the source campaign ID and `rebuild_from_current_truth` mode as provenance. Old output text, source hash, approval, and result memory are not copied.

## Approval Flow

1. `request_approval`, `approve`, and `reject` use the existing campaign-action schema and route.
2. The existing idempotency claim is acquired before mutation, then request writes or merges one deterministic `approvalRequests/{campaign-scoped-id}` document.
3. Request/approve/reject update that document, campaign state, event, idempotency completion, and request-summary increment where applicable in one Firestore transaction.
4. Public-use action validation receives the workspace and blocks agency packs without approval plus all pending/rejected packs.
5. Approve/reject skip the dashboard-summary write because no dashboard counter changes; the existing event record remains the audit trail.
6. Re-request after rejection preserves the deterministic approval document's original `createdAt` while updating request lifecycle fields.

## Readiness Projection

`buildCampaignCuePackReadiness()` derives five bounded checks from pack review state. The result is placed in `CampaignCueOutputPack.readiness`, rendered beside the pack, and included in the browser-local ZIP. It is never persisted as a second truth document.

Campaign Rhythm only labels a generated pack `pack_ready` when its saved freshness receipt still evaluates as current. Stale, expired, and legacy-unknown packs cannot receive the ready action.

The Results UI stores the selected campaign ID. Campaign Rhythm, pack rows, and editor actions open that exact campaign in Results, and the write button remains disabled until the owner selects a bounded result signal.

The editor and workspace export buttons all call the protected campaign action before starting a browser download. Shared busy guards prevent rapid repeated clicks from creating duplicate approval, schedule, export, use, or result writes.

## Existing Routes Reused

- `PATCH /api/campaigncue/workspace` saves pulse, commercial policy, presence, and language preferences in the default Business Brain and refreshes the existing current source snapshot.
- `POST /api/campaigncue/campaigns` recomputes decisions server-side and persists freshness, commercial gate, and experiment metadata in `campaign.pack`.
- The same create route accepts an optional `reuseCampaignId` and rebuilds that pack's recipe from current truth.
- `POST /api/campaigncue/campaigns/{campaignId}/actions` rechecks truth for public-use actions, writes result receipts, and stores staff task metadata on the existing schedule document.
- The action route resolves approval requests and decisions without a new API surface.

No new API route was required.

## Backward Compatibility

`normalizeCampaignCueBusinessBrain()` supplies defaults for workspaces created before this feature. Existing campaigns can omit freshness, commercial gate, experiment, and result receipt fields. Derived output represents missing freshness as `unknown`.

## Failure Behavior

- Stale truth: `409`, create a fresh pack.
- Expired pack: `409`, confirm current facts and create a fresh pack.
- Missing current snapshot: `409`, refresh before public use.
- Commercial block: decision remains blocked and campaign creation fails before campaign/trust/event/summary writes.
- Translation: produces a protected-fact handoff only; no provider call is attempted.
- Expired source input: excluded from active decision evidence and shown as expired in the owner inbox.
- `not_used` result: keeps the campaign's existing status and stores no use time.
- Result action without a selected result signal: rejected before the campaign action server runs.
- Staff task without a valid schedule date-time: rejected before the campaign action server runs.
- Reuse source missing or outside the bounded workspace list: rejected before campaign writes.
- Reused recipe no longer safe with current facts: rejected by the current decision gate.
- Agency pack without approval, requested approval, or rejected approval: public-use action rejected before export/download.
- Approve/reject by a non-review role: rejected with `403`.
- Reject without a reason: rejected by Zod before Firestore access.
- `not_used` metrics: discarded from both the latest campaign receipt and its compact action event.

## Security

Existing routes remain protected by `withAuth`, CampaignCue tenant scope, rate limits, bounded JSON parsing, Zod validation, idempotency, sanitized Firestore writes, and bounded owner-safe errors.

Owner-managed destinations accept only `http` or `https`, and target-language entries must be valid locale identifiers. Source validation rejects obvious customer contact payloads in audience/return-customer notes, and the decision gate requires a non-identifying audience description. Result receipts do not accept customer contact lists or arbitrary external evidence URLs. Review and return-customer pack copy keeps delivery in the owner's existing consented workflow.

Approval resolution uses workspace membership already loaded by the server. It never trusts a client-provided role.

# Multi-Location Center - Implementation

## Runtime Flow

```text
Owner selects an original campaign + active locations
-> POST /api/campaigncue/campaigns/variants
-> auth, tenant/store scope, rate limit, strict Zod validation
-> request-bound idempotency claim
-> transaction rereads workspace, Business Brain, source campaign,
   durable source snapshot, bounded source inputs, and selected locations
-> resolve branch truth and commercial gate
-> build outputs and trust report per branch
-> create ordinary linked campaigns
-> one aggregate event + one summary increment + idempotency completion
-> merge returned campaigns into the already-loaded overview
```

## Canonical Objects

- `CampaignCueLocation`: branch name, locality, status, source refs, and optional contact overrides.
- `CampaignCueLocationTruthSnapshot`: effective branch truth plus a hash of the location record at creation.
- `CampaignCueCampaign.locationId`: branch ownership.
- `CampaignCueCampaign.variantGroupId`: bounded batch linkage.
- `CampaignCueCampaign.variantRootCampaignId`: original workspace campaign.
- `CampaignCueCampaign.pack.locationSnapshot`: durable branch truth used for audit and freshness.
- `CampaignCueCampaign.pack.freshness.sourceHash`: SHA-256 combination of the durable global source hash and a branch-record hash built from explicit normalized fields in fixed order, so object insertion order cannot create false staleness.

Fabric JSON is not introduced. The shared editor continues to consume normal CampaignCue campaign outputs and `CreativeEditorDocument` truth.

## Important Modules

| Module | Responsibility |
| --- | --- |
| `src/lib/campaigncue/locationVariants.ts` | Contact precedence, branch snapshot/hash, deterministic group/campaign IDs. |
| `src/lib/campaigncue/server.ts` | Bounded transactional creation, role checks, list filtering, action freshness, idempotency, audit and summary writes. |
| `src/lib/campaigncue/assetVisibility.ts` | Cost-neutral local-manager filtering shared by Asset Library overview, list, preview, and download paths. |
| `src/lib/campaigncue/offerPageServer.ts` | Rechecks global and branch truth and applies effective branch contact/locality before publishing. |
| `src/lib/campaigncue/recordBoundary.ts` | Strict persisted campaign/location snapshot parsing. |
| `src/lib/validation/campaigncueSchemas.ts` | Request limits, unique locations, URL protocol validation. |
| `src/app/api/campaigncue/campaigns/variants/route.ts` | Authenticated, rate-limited HTTP boundary. |
| `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` | Branch contact form, selection, creation, local result merge. |

## Authorization

- Create or manage location records: owner, admin, marketer, or agency member.
- Create variants: owner, admin, marketer, local manager, or agency member.
- Local managers must have every requested location in their current membership `locationIds`.
- Action and approval transactions recheck assigned-location scope.
- Hosted-page publish/unpublish also checks assigned-location scope.
- Local-manager overview/list output includes global source campaigns and assigned branch campaigns, but omits other branches.
- Asset Library output includes assigned-branch files and unlinked shared workspace assets. Campaign-linked legacy files without `locationId` fail closed for local managers.

## Freshness Authority

The durable `sourceSnapshots/current` document is the global freshness authority. Campaign creation no longer reconstructs a freshness hash from only the bounded recent source-input query. This avoids an immediate false-stale result when the durable snapshot contains older retained facts.

For branch packs:

```text
combinedHash = sha256(globalSourceHash + branchRecordHash)
```

Download, export, schedule, mark-used, and hosted-page publish re-evaluate this hash. A missing/disabled branch, mismatched location snapshot, changed branch record, or changed global source blocks public use.

## Failure Behavior

- Validation failure: HTTP 400, no domain write.
- Role/scope failure: HTTP 403.
- Missing/stale source, source campaign, recipe, pattern, or branch: HTTP 409 with bounded owner copy.
- Retried completed request: existing campaigns and trust reports are returned.
- Generic/transient failure: bounded server error; the claim can be recovered through the existing idempotency lease.

## Persistence Bounds

- Branch titles are capped at the persisted campaign-title limit of 500 characters.
- Branch pack reasons are capped at the persisted reason limit of 4,000 characters.
- Every output records its own branch location first in the bounded source-reference list; a batch never copies another selected branch id into that output's provenance.

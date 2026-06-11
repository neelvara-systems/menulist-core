# Ads Studio - Implementation

## Runtime Contract

Ads Studio must default to ad-pack preparation and manual handoff. Direct ad-platform mutation must be feature-flagged, account-gated, approval-gated, and idempotent.

## Flow

1. Load campaign, creative assets, CTA, destination, and business facts.
2. Generate ad copy variants and audience notes.
3. Add budget recommendation and UTM plan.
4. Run Creative Trust Center policy checks.
5. Owner approves the ad pack.
6. Export to owner/agency or create draft/publish through provider adapter where enabled.
7. Store spend/result metrics where connected and authorized.

## Data Objects

| Object | Purpose |
| --- | --- |
| `adPacks` | Copy, creative refs, audience, budget, and destination. |
| `adPolicyReports` | Risk checks and owner acknowledgements. |
| `adProviderConnections` | Google/Meta account mapping metadata. |
| `adPublishJobs` | API mutation attempts and results. |
| `adPerformanceSnapshots` | Imported campaign/ad-set/ad metrics. |

## API Boundary

- Provider adapters must isolate Google Ads and Meta Ads logic.
- Mutation calls require idempotency keys and dry-run preview where supported.
- Spend-changing actions require explicit owner approval and role permission.
- API errors must preserve manual handoff output.

## Acceptance

- Owner can create and export an ad pack without ad account connection.
- The system never starts spend from generation alone.
- Disapproved or failed API attempts remain reviewable with reason/status.


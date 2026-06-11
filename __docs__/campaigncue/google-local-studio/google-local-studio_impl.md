# Google Local Studio - Implementation

## Runtime Contract

Google Local Studio must run through a CampaignCue Google adapter with explicit capability detection. UI must distinguish connected API publish, manual copy/export, and unsupported actions.

## Flow

1. Load campaign cue, location, Google connection status, and post capability map.
2. Generate post draft according to post type.
3. Attach media from Creative Studio or Asset Library.
4. Run Creative Trust Center checks.
5. Owner approves.
6. Publish through API if supported, otherwise provide manual steps.
7. Capture post ID and insights when available.

## Data Objects

| Object | Purpose |
| --- | --- |
| `googleConnections` | OAuth connection, account, and location mapping metadata. |
| `googleLocalDrafts` | Draft update, offer, event, CTA, or manual product-post content. |
| `googlePublishJobs` | API publish attempts and status. |
| `googleInsightsSnapshots` | Imported post and location metrics. |

## API Boundary

- OAuth tokens must be stored through approved secret/encrypted storage patterns.
- Publish jobs must be idempotent by `campaignId + locationId + draftVersionId`.
- Manual fallback must not create fake `published` status.
- Insight imports should be scheduled or owner-triggered with quotas and backoff.

## Acceptance

- Product-post content never claims direct API publishing unless support is verified.
- Disabled or unverified locations show manual fallback.
- API publish failure preserves approved copy and media for manual posting.


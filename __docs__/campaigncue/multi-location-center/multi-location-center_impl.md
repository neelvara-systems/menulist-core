# Multi-Location Center - Implementation

## Runtime Contract

Every CampaignCue entity that can vary by location must support `locationId` or a documented `global` scope. Group campaigns should generate location-specific child outputs rather than one shared output with conditional text.

## Flow

1. Central user creates campaign idea and selects locations.
2. System validates location facts and channel readiness.
3. Location-specific drafts are created.
4. Local manager or central approver reviews each draft.
5. Schedule/publish/export occurs per location.
6. Analytics roll up from location summaries.

## Current Runtime

- The workspace has a Multi-location Center screen.
- `GET /api/campaigncue/locations` reads a bounded location list.
- `POST /api/campaigncue/locations` adds active or draft location records under the CampaignCue workspace.
- Location records are server-written, scoped by the signed-in tenant/store session, and designed to avoid scanning MenuList stores at page load.
- Active location records now influence the Opportunity Engine so the owner can create local-variant cues without provider/location sync.
- Group campaign automation and provider/location sync remain disabled until a separate future provider layer exists.

## Data Objects

| Object | Purpose |
| --- | --- |
| `locations` | Location profile and manual channel-readiness metadata. |
| `locationGroups` | Grouping for campaign planning and reporting. |
| `locationCampaignDrafts` | Location-specific campaign output. |
| `locationApprovalStates` | Approval status per output version. |
| `locationResultSummaries` | Location-specific analytics summary. |

## Acceptance

- A group campaign can produce different copy for two locations with different facts.
- Local approval does not approve other locations unless policy allows it.
- Rollup reports read precomputed summaries.

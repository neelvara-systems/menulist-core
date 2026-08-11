# Multi-Location Center - Test Cases

## Deterministic Contracts

- Branch override wins over shared Business Brain contact.
- Blank branch override inherits shared contact.
- Branch snapshot hash changes for name, locality, contact, or status changes.
- Combined freshness changes for either global source or branch record changes.
- Group/campaign IDs are stable for an exact retry and distinct across branches/new idempotency keys.

## Validation

- Reject zero locations, duplicate locations, and more than eight locations.
- Reject malformed IDs, unknown fields, short idempotency keys, and non-HTTP(S) branch URLs.
- Reject missing, draft, disabled, or locality-free selected locations.
- Reject archived, branch-derived, or unregistered-recipe source campaigns.

## Authorization

- Only owner, admin, marketer, and agency member may create a location record.
- Reviewer, billing admin, and local manager cannot create a new location record.
- Owner/admin permitted across workspace.
- Marketer/agency member permitted to create bounded variants.
- Local manager permitted only for assigned location IDs.
- Local manager cannot act on a global or unassigned branch campaign.
- Approval/comment and hosted-page transactions repeat the location-scope check.
- Overview/list omits other branch campaigns and locations for local managers.
- Asset list/preview/download omit other-branch campaign files for local managers while retaining unlinked shared workspace assets.
- Campaign-linked legacy assets without `locationId` fail closed for local managers.

## Persistence And Idempotency

- Create exactly one campaign and trust report per selected branch.
- Write one aggregate event and one summary increment per batch.
- Start every variant at `ownerApprovalState=not_requested` with no copied inbox/result/offer-page state.
- Keep title and pack reason within their persisted 500/4,000-character bounds.
- Put the current branch id first in each output's bounded source references and never include another selected branch id.
- Exact retry returns existing campaigns/trust reports and adds no duplicate domain records.
- Changed payload with reused idempotency key is rejected.
- Interrupted in-progress request follows the existing bounded lease/recovery contract.

## Freshness And Delivery

- Global source change blocks download/export/schedule/mark-used/hosted publish.
- Branch contact/locality/status change blocks the same actions.
- Missing branch record or location snapshot fails closed.
- Independent approval of one branch does not approve another.
- Result recorded on one branch does not mutate another branch campaign.
- No direct social posting, provider mutation, or ad spend occurs.

## UI

- Only active locations with locality are selectable.
- Selection stops at eight with owner-facing feedback.
- Created variants merge locally without an overview refetch.
- Branch status and existing-pack state are visible.
- Contact override fields explain shared-contact fallback.

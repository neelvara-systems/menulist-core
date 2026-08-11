# Approval and Comment Inbox - Firebase Contract

## Collections

No new collection is added. The feature reuses:

- `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}`
- `campaigncueWorkspaces/{workspaceId}/approvalRequests/{approvalId}`
- `campaigncueWorkspaces/{workspaceId}/events/{eventId}`
- `campaigncueWorkspaces/{workspaceId}/idempotencyKeys/{key}`

## Read Cost

There is **no additional overview read**, listener, or approval-list query. The current thread is returned with the already-bounded campaign list.

## Write Cost

Each explicit comment or resolution uses the existing idempotent action path:

- one idempotency claim/completion lifecycle
- one campaign update
- one deterministic approval-record update
- one compact audit event
- no analytics-summary write for comment add or resolve

Only `request_approval` increments the existing compact dashboard summary.

## Size And Retention

- 20 comments maximum per current request
- 400 characters maximum per comment
- new request revision starts a new current thread
- event metadata stores no raw comment body
- no attachment or Storage object
- no background cleanup job or scheduler

This deliberate compact duplication avoids a page-load query while keeping campaign and approval state atomic.

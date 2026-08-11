# Approval and Comment Inbox - Implementation

## Source Map

- `src/lib/campaigncue/approvalInbox.ts`: shared request/comment/resolution role policy plus pure request, comment, resolve, decision, and open-comment rules.
- `src/lib/campaigncue/server.ts`: role checks, scope rechecks, idempotency, and atomic campaign/approval/event writes.
- `src/lib/validation/campaigncueSchemas.ts`: comment and resolution input requirements.
- `src/lib/campaigncue/recordBoundary.ts`: strict durable `approvalInbox` parser.
- `src/types/campaigncue.ts`: inbox and comment contracts.
- `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx`: current-thread inbox inside Agency Workspace.

## Persistence

The campaign stores the compact current `approvalInbox` because campaigns are already in the overview. The deterministic `approvalRequests/{cc_approval_campaignId}` record mirrors the same request revision and comments in the same Firestore transaction. The first is the bounded owner read model; the second is the approval record. They cannot diverge through the supported server path.

New review revisions clear the visible current-thread comments. Compact immutable audit events preserve action, comment id, request revision, location, output, and note digest metadata without duplicating the comment body.

## Mutation Flow

1. Authenticate and resolve exact CampaignCue workspace.
2. Validate strict action payload and idempotency key.
3. Check the shared role policy, then recheck the current workspace role inside the transaction. Billing-only users cannot request or comment.
4. Re-read campaign inside the transaction.
5. Revalidate output and location membership.
6. Apply the pure inbox transition.
7. Write campaign projection, deterministic approval record, compact event, and idempotency completion atomically.
8. Return the updated campaign so the browser replaces it locally without overview reload.

## Compatibility

Older requested campaigns without `approvalInbox` receive a bounded legacy-compatible current request only when the next comment or decision is processed. Older persisted campaigns remain readable because the field is optional.

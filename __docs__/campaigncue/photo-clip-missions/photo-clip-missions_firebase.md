# Photo And Clip Missions - Firebase And Cost Contract

## Reused Data Shape

No new collection is introduced.

```text
campaigncueWorkspaces/{workspaceId}/assets/{assetId}
campaigncueWorkspaces/{workspaceId}/events/{eventId}
campaigncueWorkspaces/{workspaceId}/idempotencyKeys/{idempotencyKey}
campaigncue/assets/{workspaceId}/{uploadId}/source.{ext}
campaigncue/assets/{workspaceId}/{uploadId}/preview.webp
```

## Operation Budget

One successful upload uses:

- one bounded token request;
- one private source Storage upload;
- one private preview Storage upload;
- one guarded registration request;
- existing workspace/idempotency/asset/event reads and writes;
- zero listener reads;
- zero post-upload overview refresh reads.

The registration response is merged into the current browser overview.

## Cost Rules

- Missions are derived from recipes; do not write mission or completion documents.
- Do not persist local preview state.
- Do not duplicate the source file into a campaign folder.
- Reuse the Asset Library asset reference from packs and decisions.
- Do not generate multiple previews or thumbnails in the initial runtime.
- Retain source and preview only while their registered private asset is retained.
- Failed registration triggers best-effort deletion of both uploaded objects.

## Security Rules

- Firebase Auth custom claims scope writes to one CampaignCue workspace.
- Storage paths include the workspace claim and cannot cross tenants.
- Source and preview objects are create-only; overwrites are denied.
- Per-media size and MIME limits are enforced in Storage rules and repeated server-side.
- The server uses Storage metadata and object headers rather than trusting browser metadata.
- Download access remains private and short-lived; signed URLs are not persisted in Firestore.

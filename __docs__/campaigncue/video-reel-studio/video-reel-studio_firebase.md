# Video Reel Studio - Firebase Notes

## Current Collection

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/videoProjects/{projectId}` | One compact project containing storyboard, bounded version evidence, review notes, approval, result/reuse memory, and render receipts. |
| `campaigncueWorkspaces/{workspaceId}/events/{eventId}` | Existing audit stream for create/save/approval/render events. |
| `campaigncueWorkspaces/{workspaceId}/idempotencyKeys/{key}` | Existing server-only mutation replay protection. |

Do not create nested `videoBriefs`, `videoRenders`, `videoTrustReports`, or `videoExports` for the current runtime. Their state is bounded and belongs in one project read model.

## Storage

- Owner media uploads directly to `campaigncue/assets/{workspaceId}/{uploadId}/source.{ext}` with an optional `preview.{png|jpeg|webp}`. The browser receives a short-lived custom token; Storage rules enforce the current CampaignCue workspace and type/size boundary.
- The registration API reads authoritative object metadata and header bytes before saving Asset Library ids. Failed registration triggers best-effort client cleanup.
- The current renderer downloads the final binary to the owner's device. It does not upload a render to `campaigncue/renders/...`.
- `campaigncue/renders/{workspaceId}/...` remains client-read/server-write reserved for a separately approved durable-render upload path.
- Never embed base64 image, audio, or video in Firestore.

## Read/Write Cost

- List: one workspace access check plus one bounded `videoProjects` query; no realtime listener.
- Create: workspace/campaign verification plus one transaction writing project, event, and idempotency completion.
- Save/approve/reject/review/result/render mutation: one transaction reading workspace, project, campaign when required, and idempotency claim, then writing bounded state, an event except progress-only checkpoints, and completion.
- Browser render: three optional durable progress checkpoints plus start/terminal receipts; zero provider calls and zero credit writes outside the compact project.
- Storyboard download: zero Firestore reads/writes; the plain-text file is derived locally from the already-loaded project.
- History: maximum ten snapshots, twenty review notes, and twelve render receipts in the project document.

## Security

- Firestore client writes are denied. Authenticated workspace members may read admitted project documents under existing workspace rules.
- All writes use the protected API, strict schema, exact workspace/campaign/output binding, optimistic version checks, and `sanitizeForFirestore` through the existing Admin wrapper.
- Project records reject external URLs, signed URLs, data URLs, blob URLs, and raw media.
- Audit events contain ids, action, status, format, and bounded sizes only; no media, token, or raw request payload is logged.
- Invalid mutation input is returned generically and logged only through the bounded CampaignCue security context.

## Deployment Boundary

The CampaignCue Firestore and Storage rules must be deployed to the matching CampaignCue Firebase project. Repository policy requires the smallest matching Firebase deploy after validation; credentials/project access may remain an external blocker.

# Design Cue - Firebase Notes

## Active Cost Posture

Design Cue is implemented as a mostly browser-local feature.

| Action | Firestore reads | Firestore writes | Provider calls |
| --- | ---: | ---: | ---: |
| Open editor with already-loaded CampaignCue overview | 0 additional | 0 | 0 |
| Run known command chip | 0 | 0 | 0 |
| Preview patch | 0 | 0 | 0 |
| Apply local patch in transient editor | 0 | 0 | 0 |
| Export/register asset | Existing Asset Library write path | Existing Asset Library write path | 0 |
| CueLayers autosave after applied patch | Existing CueLayers autosave path | Existing CueLayers autosave path | 0 |
| Model-backed ambiguous turn today | 0 | 0 | 0; guarded route fails closed while model assist is disabled |
| Future enabled model-backed turn | 0-1 config/capacity read if not cached | 1 usage/operation record after real provider work | 1 bounded call |

## Firestore Collections

Do not create persistent conversation documents for transient blank/campaign-output editor sessions by default.

Persistent storage is only justified when the design already has a durable product id, such as a CueLayers design or a future persisted creative document. The current local CampaignCue editor test route and transient campaign-output editor do not create Design Cue thread documents.

| Collection | Purpose | Status |
| --- | --- | --- |
| `campaigncueWorkspaces/{workspaceId}/cueLayerDesigns/{designId}/designCueThreads/{threadId}` | Review comments and patch history for durable CueLayers designs. | Planned |
| `campaigncueWorkspaces/{workspaceId}/creativeEditorDocuments/{documentId}/designCueThreads/{threadId}` | Review comments for future persisted editor documents. | Planned only when persisted editor docs exist. |
| `campaigncueWorkspaces/{workspaceId}/usageEvents` | Provider usage event after a real model-backed turn. | Existing usage posture |
| `campaigncueWorkspaces/{workspaceId}/aiOperations/{operationId}` | Optional AI accounting/audit record if CampaignCue adopts repo AI operation ledger. | Planned |

## Document Shape

```ts
type DesignCueThreadDoc = {
  id: string;
  workspaceId: string;
  productId: "campaigncue";
  documentId?: string;
  designId?: string;
  status: "open" | "resolved" | "archived";
  target: DesignCueTarget;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  latestSummary: string;
};

type DesignCueTurnDoc = {
  id: string;
  threadId: string;
  actor: "owner" | "design_cue";
  mode: "programmatic" | "model_assisted_intent" | "model_assisted_copy" | "model_assisted_critique";
  ownerTextRedacted?: string;
  patchSetSummary?: string;
  appliedPatchSetId?: string;
  status: "previewed" | "applied" | "rejected" | "failed";
  createdAt: Timestamp;
};
```

Do not store raw prompts, full screenshots, base64 images, signed URLs, or raw model responses in Firestore.

## Storage

No Storage write is needed for normal Design Cue commands.

If visual critique later needs a screenshot artifact:

- keep it temporary
- downscale aggressively
- store only under a diagnostic temporary prefix
- attach retention metadata
- never persist signed URLs in Firestore

Example prefix:

`campaigncue/design-cue/{workspaceId}/{documentId}/diagnostics/{turnId}/preview.png`

## Security Rules

Rules must enforce:

- authenticated workspace membership
- workspace id match
- no public reads
- no owner-controlled `workspaceId` trust
- writes only for durable design/document ids that belong to the workspace
- no writes to provider/account/spend state

## API Route Controls

The implemented model route at `POST /api/campaigncue/design-cue/turns` uses:

- `withAuth()`
- `requireCampaignCueRuntime()`
- `requireCampaignCueSessionScope()`
- `applyCampaignCueRateLimit()` with `AI_OPERATION`
- Zod schemas
- safe generic errors

It returns a fail-closed response while `ENABLE_CAMPAIGNCUE_DESIGN_CUE_MODEL_ASSIST` is disabled. Before enabling provider calls, add:

- SAFE_MODE/provider availability preflight
- AI capacity check before provider call
- operation log after real provider work
- bounded response schema validation
- no raw prompt/contact dump in logs

## Cost Guardrails

- Deterministic commands are the default.
- Model calls require explicit owner action or ambiguous free-text fallback.
- Do not stream every keystroke to a provider.
- Do not persist every transient local turn.
- Batch durable comment writes when possible.
- Use bounded context, not full workspace dumps.
- Limit turns per design/session.
- Cache business context already loaded by workspace.

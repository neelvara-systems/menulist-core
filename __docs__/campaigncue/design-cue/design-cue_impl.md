# Design Cue - Implementation

## Current Codebase State

The active CampaignCue editor uses the shared Creative Editor and now includes Design Cue as a deterministic assistant inside the AI Tools drawer:

- Shared editor types live in `src/modules/creative-editor/types.ts`.
- Shared editor UI lives in `src/modules/creative-editor/CreativeEditor.tsx`.
- CampaignCue editor actions live in `src/constants/campaigncue/creativeEditorAiTools.ts`.
- CampaignCue deterministic handler lives in `src/lib/campaigncue/creativeEditorAiTools.ts`.
- CampaignCue workspace wires the handler through `CampaignCueWorkspaceApp.tsx`.
- CampaignCue Design Cue constants live in `src/constants/campaigncue/designCue.ts`.
- CampaignCue Design Cue resolver, patch, validation, and apply code lives in `src/lib/campaigncue/design-cue/`.
- The product-neutral Design Cue panel lives in `src/modules/creative-editor/DesignCuePanel.tsx`.

Design Cue builds on this shape rather than introducing a separate editor runtime.

## Architecture Decision

Do not send every owner action to an AI model.

Use this hierarchy:

1. **Programmatic command**
   - Known, bounded, cheap, safe.
   - Runs client-side from current document/context.

2. **Programmatic patch resolver**
   - Converts an intent into allowed document operations.
   - Owns geometry, source refs, selected-layer updates, and validation.

3. **AI model intent/candidate service**
   - Used only when deterministic logic cannot safely classify the request or when candidate copy/critique is needed.
   - Returns structured intent/candidate data, not a final document.

4. **Patch validator**
   - Rejects unsafe fields, unknown layer ids, unsupported element types, external URLs, direct posting actions, or protected fact changes.

5. **Owner approval**
   - Applies the patch through existing editor state/history only after owner approval.

## Implemented File Map

| Path | Purpose |
| --- | --- |
| `src/constants/campaigncue/designCue.ts` | Action ids, command chips, copy, limits, patch allowlists, feature ids. |
| `src/lib/campaigncue/design-cue/context.ts` | Builds `DesignCueContext` from current document and CampaignCue overview. |
| `src/lib/campaigncue/design-cue/intent.ts` | Deterministic command and comment intent resolver. Unsupported product-neutral strings fail closed. |
| `src/lib/campaigncue/design-cue/patches.ts` | Patch builders for text, selected layer, canvas presets, business checks, brand checks, and export checklist actions. |
| `src/lib/campaigncue/design-cue/validate.ts` | Patch validation, layer existence/lock checks, text safety, numeric bounds, color safety, and layer patch allowlist. |
| `src/lib/campaigncue/design-cue/apply.ts` | Applies validated patch sets to `CreativeEditorDocument`. |
| `src/lib/campaigncue/design-cue/modelAdapter.ts` | Optional provider adapter boundary; currently disabled/fail-closed. |
| `src/modules/creative-editor/DesignCuePanel.tsx` | Product-neutral panel shell rendered by the shared editor. |
| `src/modules/creative-editor/CreativeEditor.tsx` | Product-neutral Design Cue props, selected-layer context, patch preview, owner approval, and document commit. |
| `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` | CampaignCue wiring for commands, deterministic resolver, and patch apply handler. |
| `src/app/(campaigncue)/campaigncue/app/editor-test/CampaignCueEditorTestClient.tsx` | Local in-memory test route wiring. |
| `src/app/api/campaigncue/design-cue/turns/route.ts` | Guarded model-backed route; validates and rate-limits, then fails closed while model assist is disabled. |
| `src/lib/validation/campaigncueDesignCueSchemas.ts` | Zod schema for bounded model-backed route input. |

Keep CampaignCue-specific constants under `src/constants/campaigncue/`. Do not put CampaignCue constants in a flat shared file.

## Core Types

```ts
type DesignCueIntentSource =
  | "command_chip"
  | "selected_layer_comment"
  | "canvas_comment"
  | "free_text";

type DesignCueExecutionMode =
  | "programmatic"
  | "model_assisted_intent"
  | "model_assisted_copy"
  | "model_assisted_critique";

type DesignCueTarget =
  | { type: "document" }
  | { type: "canvas_region"; x: number; y: number; width: number; height: number }
  | { type: "layer"; elementId: string };

type DesignCuePatchOperation =
  | { op: "add_text"; text: string; placement: "center" | "near_target" | "cta_zone" }
  | { op: "update_text"; elementId: string; text: string }
  | { op: "update_layer"; elementId: string; patch: SafeLayerPatch }
  | { op: "resize_canvas"; preset: "square" | "story" | "poster" | "wide" }
  | { op: "add_finding"; tone: "ready" | "review" | "blocked"; text: string };

type DesignCuePatchSet = {
  id: string;
  title: string;
  summary: string;
  executionMode: DesignCueExecutionMode;
  target: DesignCueTarget;
  operations: DesignCuePatchOperation[];
  protectedFactsUsed: string[];
  needsReview: boolean;
};
```

`SafeLayerPatch` must be an allowlisted subset of `CreativeEditorElement`. It must not allow arbitrary object classes, external script URLs, Fabric JSON, hidden data blobs, or product-authority fields.

## Deterministic Command Matrix

| Owner command | Resolver | Model needed? |
| --- | --- | --- |
| Bigger offer | Selected text size/weight/position patch or add offer text from campaign output. | No |
| Shorter text | Truncate to channel-safe length; optional model rewrite if owner asks for nicer wording. | Usually no |
| Add location | Insert Business Brain locality or selected location. | No |
| Add contact line | Insert approved WhatsApp, phone, booking, menu, or website contact from Business Brain. If none is confirmed, show a review finding and do not add placeholder text. | No |
| Make square/story/poster | Resize canvas and scale layers. | No |
| Check facts | Text scan against source facts and protected facts. | No |
| Check brand | Brand color/name/logo presence check. | No |
| Export checklist | Static checklist from delivery boundary and rights status. | No |
| Make it premium/simple | Current implementation uses deterministic style patches or review findings. Model may later propose style direction, but patch stays programmatic. | No today; optional later |
| This looks too busy | Current implementation uses heuristic review findings and does not delete layers automatically. | No today; optional later |
| Rewrite this more friendly | Current implementation uses deterministic fallback copy on selected text. Model candidate copy remains disabled. | No today; optional later |

## Model Boundary

The model must never receive or return:

- tenant/store authority as trusted input
- raw private signed URLs
- full unbounded asset libraries
- raw owner contact payloads beyond necessary business facts
- Fabric JSON as source of truth
- direct mutation instructions

The model may receive:

- normalized visible text
- selected layer summary
- canvas dimensions
- bounded business facts
- brand voice/color/name
- low-resolution screenshot only when visual critique is explicitly requested and allowed

The model must return:

- intent candidate
- copy candidates
- critique findings
- confidence/review flags

The programmatic resolver creates the patch set.

## Guarded Model API Route

Route: `POST /api/campaigncue/design-cue/turns`

Use only for future model-backed turns. Deterministic command chips and known selected-layer/document comments stay client-side.

Implemented server controls:

- `withAuth()`
- `requireCampaignCueRuntime()`
- `requireCampaignCueSessionScope()`
- `applyCampaignCueRateLimit({ feature: "AI_OPERATION" })`
- Zod validation
- safe security logging for validation failures
- model-assist feature flag fail-closed response

Controls required before provider enablement:

- SAFE_MODE and provider-enabled feature flag
- AI capacity/accounting before provider call
- sanitized logs with no raw prompt or contact dump
- bounded response schema

## UI Contract

Desktop:

- Design Cue panel opens from the AI Tools drawer.
- Owner sees command chips first.
- Free text is secondary.
- Comment mode anchors to the selected layer when one is selected, otherwise to the document.
- Results show patch cards with Apply, Try another, Cancel.
- Applied changes enter existing undo/history.

Mobile:

- Current shared editor mobile layout keeps Design Cue in the responsive AI Tools drawer and uses 44px Apply/Cancel actions.
- A dedicated bottom sheet should be added before exposing a full mobile-first CampaignCue editor flow.
- Avoid right inspector density.

## Implementation Order

Implemented:

1. Add constants and feature flag:
   - `ENABLE_CAMPAIGNCUE_DESIGN_CUE`
   - `ENABLE_CAMPAIGNCUE_DESIGN_CUE_MODEL_ASSIST`
2. Add `DesignCueContext` builder from current document and CampaignCue overview.
3. Add deterministic intent resolver for command chips.
4. Add patch builders and patch validator.
5. Add preview/apply/revert inside shared editor path.
6. Add desktop panel inside the AI Tools drawer.
7. Add selected-layer/document comment anchoring.
8. Add guarded model route and disabled adapter boundary.

Not implemented yet:

1. Canvas-coordinate comment regions.
2. Dedicated mobile bottom sheet wrapper.
3. Provider-backed intent/copy/critique adapters.
4. Model fixture tests for provider enablement.

## Acceptance

- No model call for known command chips.
- No Firebase write for local patch preview.
- Owner approval required before applying a patch.
- Applied patch updates `CreativeEditorDocument`, not Fabric runtime JSON.
- Model response cannot bypass patch validation.
- Export/download boundary remains visible.

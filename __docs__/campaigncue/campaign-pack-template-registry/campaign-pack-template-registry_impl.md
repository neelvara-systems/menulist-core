# Campaign Pack Template Registry - Implementation

## Codebase Alignment

| Existing source | Decision for this feature |
| --- | --- |
| `src/data/shared/businessTypes.ts:48` defines canonical categories. | CampaignCue platform catalog doc ids must match these category values. |
| `src/data/shared/businessTypes.ts:212` resolves stored category before type-derived category. | The template resolver must call the same resolver path and fall back to `specialty`. |
| `__docs__/creative-editor-template-registry/creative-editor-template-registry_firebase.md:31` uses one category platform catalog read for MenuList print assets. | CampaignCue should reuse the cost pattern, not the MenuList collection names or store scope. |
| `__docs__/campaigncue/campaign-pack-output-system/README.md:7` defines CampaignCue output as a full output pack. | Templates must support campaign packs, not isolated design files. |
| `__docs__/campaigncue/creative-studio/creative-studio_impl.md:55` forbids CampaignCue from using MenuList `storeAssetTemplates`. | CampaignCue needs a product-owned workspace template registry. |

## Feature Flag

CampaignCue owns a product flag for owner-visible template surfaces:

```ts
ENABLE_CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY: true
```

The flag gates owner-visible template surfaces. Seed/admin tooling exists separately behind platform access.

## Proposed Files

| Path | Purpose |
| --- | --- |
| `src/constants/campaigncue/outputPicker.ts` | Owner-output intent registry and local template-matching helper. |
| `src/constants/campaigncue/packTemplates.ts` | Collection names, storage roots, category overflow constants, template tags, owner copy. |
| `src/types/campaigncuePackTemplates.ts` | Template summary, payload, search, workspace save, and hydration types. |
| `src/lib/validation/campaigncuePackTemplateSchemas.ts` | Zod schemas for platform summaries, workspace saves, and payload references. |
| `src/lib/campaigncue/pack-templates/category.ts` | Resolve category from business type/category using shared business type helpers. |
| `src/lib/campaigncue/pack-templates/catalog.ts` | Load one platform category catalog, filter/search in memory, and hydrate payload refs. |
| `src/lib/campaigncue/pack-templates/workspaceTemplates.ts` | Workspace saved-template DAL. |
| `src/lib/campaigncue/pack-templates/applyTemplate.ts` | Convert a selected template into CampaignCue pack intent, editor document, handoff fields, and missing-input checks. |
| `src/components/templates/campaigncue/PackTemplatePicker.tsx` | Owner UI for recommended pack templates, CampaignCue output choices, local search, and explicit save. |
| `scripts/campaigncue/seed-platform-pack-templates.js` | Admin seed/update script for platform category docs and Storage payloads. |
| `scripts/verification/verify-campaigncue-pack-templates.js` | Static verifier for docs/code/category/cost guardrails. |

Implementation status: these files exist in the repo. `verify:campaigncue` now chains the CampaignCue runtime verifier and the pack-template verifier.

## Firestore Shape

```text
campaigncuePlatformPackTemplates/{businessCategory}
campaigncuePlatformPackTemplates/{businessCategory}_2
campaigncueWorkspaces/{workspaceId}/packTemplateIndexes/default
```

`{businessCategory}` must be one of:

```text
service
retail
food
professional
creative
health
specialty
```

The `_2` suffix is reserved for overflow docs. It must not be read during the default owner template load.

## Storage Shape

```text
campaigncue/templates/platform/{businessCategory}/{templateId}/pack-template.json
campaigncue/templates/platform/{businessCategory}/{templateId}/editor-document.json
campaigncue/templates/platform/{businessCategory}/{templateId}/preview.webp
campaigncue/templates/workspaces/{workspaceId}/{templateId}/pack-template.json
campaigncue/templates/workspaces/{workspaceId}/{templateId}/editor-document.json
campaigncue/templates/workspaces/{workspaceId}/{templateId}/preview.webp
```

If one shared payload is used by multiple category summaries, the summaries can point to:

```text
campaigncue/templates/platform/shared/{templateId}/pack-template.json
```

Only metadata is duplicated across category docs. Payloads do not need to be duplicated.

## Platform Catalog Document

```ts
export interface CampaignCuePlatformPackTemplateCatalog {
  schemaVersion: number;
  businessCategory: string;
  catalogId: string;
  catalogStatus: "active" | "hidden";
  data: CampaignCuePackTemplateSummary[];
  overflowDocIds?: string[];
  updatedAt: number;
  updatedBy: string;
}
```

## Template Summary

```ts
export interface CampaignCuePackTemplateSummary {
  templateId: string;
  title: string;
  description: string;
  status: "active" | "hidden" | "retired";
  templateType: "platform" | "workspace";
  templateKind: "campaign_pack" | "editor_layout" | "handoff_pack" | "reuse_asset";
  businessCategory: string;
  supportedBusinessTypes: string[];
  eventTags: string[];
  recipeIds: string[];
  ownerGoals: string[];
  channels: string[];
  outputTypes: string[];
  requiredFactTypes: string[];
  optionalFactTypes: string[];
  trustChecks: string[];
  styleTags: string[];
  searchTokens: string[];
  priority: number;
  qualityTier: "platform_curated" | "workspace_saved";
  payloadPath: string;
  editorDocumentPath?: string;
  previewPath?: string;
  createdAt: number;
  updatedAt: number;
  schemaVersion: number;
}
```

## Template Payload

```ts
export interface CampaignCuePackTemplatePayload {
  schemaVersion: number;
  templateId: string;
  decisionSeed: {
    recipeId: string;
    ownerGoal: string;
    whyThis: string[];
    whyNow: string[];
  };
  factSlots: {
    type: string;
    required: boolean;
    ownerQuestion: string;
    protected: boolean;
  }[];
  outputPackShape: {
    channels: string[];
    deliveryCards: string[];
    copyBlocks: string[];
    printFormats: string[];
    resultQuestion: string;
  };
  trustChecks: string[];
  reuseRules: {
    allowCueLayersSource: boolean;
    allowSavedAssetSource: boolean;
    staleFactPolicy: "rehydrate_or_block";
  };
}
```

## Category Resolution

Implementation must use the shared data helper path:

```ts
resolveBusinessCategoryOrFallback(businessType, businessCategory)
```

No CampaignCue-specific category enum may diverge from `BUSINESS_CATEGORIES`. CampaignCue can add template tags such as `diwali`, `christmas`, `birthday`, and `new_year`, but category doc ids must remain the shared category values.

## Owner UI Integration

| Surface | Behavior |
| --- | --- |
| Daily Campaign Desk | Show at most one matching template suggestion for the top cue after the category catalog is loaded. Let the owner optionally choose a CampaignCue output intent without leaving the pack flow. |
| Campaign Pack Review | Let owner save the current pack as reusable when trust state allows. |
| Creative Studio | Offer category-relevant pack templates and output intents only after campaign intent exists. |
| Shared Creative Editor | Do not import template DAL directly; CampaignCue adapter owns save/load callbacks and opens saved layouts with Campaign Pack editor context. |
| CueLayers | Offer "Save as reusable pack base" only after source preservation and safety checks. |

Runtime behavior: selecting a template hydrates its Storage payload only on click. The CampaignCue output picker filters loaded summaries locally by output types, channels, template kind, required facts, and tags. If the template has a saved neutral editor document, CampaignCue opens it in the shared editor with `pack_template` context so task-based editing, protected facts, output/print formats, Trust Center status, manual delivery cards, result memory, and mobile-review messaging stay visible. The selected output intent is carried into that editor context as an owner task, output/print format focus, title/subtitle context, and delivery instruction, so choosing "WhatsApp", "Google", "print", or another pack type is not lost when the template opens directly in the editor. If there is no saved editor document and required fact slots are missing, the owner is routed to inputs. If no required template facts are missing, CampaignCue creates a campaign pack through the existing guarded campaign API using the template title, brief, and selected output-intent channels; the server still applies the normal decision gate and trust report.

If the owner chooses an output intent without selecting a template, CampaignCue creates a pack with the intent's bounded channel set through the same guarded campaign API. The `custom_size` intent opens the existing blank shared-editor flow instead of creating a new format marketplace or new persistence path.

## Search Behavior

Search is client-side over the loaded category doc:

```text
query -> normalize -> compare against title, description, eventTags, recipeIds, ownerGoals, channels, searchTokens
```

No Firestore query or extra read occurs for normal search/filter.

## Platform Template Management

Platform templates are managed by admin tooling, not owner UI.

Admin script responsibilities:

1. Validate every category id against `BUSINESS_CATEGORIES`.
2. Reject catalog docs above the configured soft byte limit.
3. Reject summaries without payload paths.
4. Upload Storage payloads first.
5. Write category catalog doc after payload upload succeeds.
6. Preserve `schemaVersion`, `updatedAt`, and `updatedBy`.
7. Produce a dry-run cost summary before writes.

## Workspace Saved Templates

Workspace saved templates use:

```text
campaigncueWorkspaces/{workspaceId}/packTemplateIndexes/default
```

The index stores summary metadata only. The full reusable pack/editor document lives in Storage. Saving is explicit and should never happen during preview, open, download, or autosave.

When the owner saves a reusable pack from an active non-CueLayers editor session, CampaignCue stores the current `CreativeEditorDocument` as the optional editor document artifact. CueLayers reuse documents are not automatically saved as generic pack templates because the original image preservation and safety metadata belong to the CueLayers source package.

## Security

| Surface | Requirement |
| --- | --- |
| Platform category docs | Owner read allowed; writes platform/admin only. |
| Workspace template index | Read/write only for users with workspace access. |
| Storage platform payloads | Owner read allowed through scoped path/rules; writes admin only. |
| Storage workspace payloads | Read/write only for workspace users. |
| Template application | Recompute trust/missing inputs on server before campaign pack creation. |
| URL persistence | No signed URLs, external URLs, or base64 payloads in saved template metadata. |

## Verification

Add a verifier that checks:

- all docs exist,
- category ids match shared `BUSINESS_CATEGORIES`,
- no CampaignCue code imports or references `storeAssetTemplates`,
- shared editor does not import CampaignCue template DAL,
- platform default load reads one category doc,
- search/filter stays in memory,
- output-intent filtering stays in memory,
- full payloads are Storage-backed,
- saved editor documents reopen with `pack_template` context rather than blank editor context,
- saved templates are explicit only,
- no generic/shared doc read is required for default category load,
- overflow docs are loaded only on explicit action.

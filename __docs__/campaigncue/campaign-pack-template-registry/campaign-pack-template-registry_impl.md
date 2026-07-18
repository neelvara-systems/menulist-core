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
| `src/lib/campaigncue/pack-templates/templateScopeBoundary.ts` | Bind catalog/index identity, template type, quality tier, payload identity, and exact owned artifact paths. |
| `src/lib/campaigncue/pack-templates/editorDocumentBoundary.ts` | Reduce saved documents to reusable layout truth and hydrate only current approved business facts. |
| `src/lib/campaigncue/pack-templates/factSlotReadiness.ts` | Deterministically resolve supported fact slots from current Business Brain, active/fresh source evidence, and rights-confirmed assets. Unknown slot types remain unresolved. |
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
campaigncue/templates/platform/{businessCategory}/{templateId}/pack-template-{contentHash}.json
campaigncue/templates/platform/{businessCategory}/{templateId}/editor-document-{contentHash}.json
campaigncue/templates/platform/{businessCategory}/{templateId}/preview-{contentHash}.webp
campaigncue/templates/workspaces/{workspaceId}/{templateId}/versions/{saveId}/pack-template.json
campaigncue/templates/workspaces/{workspaceId}/{templateId}/versions/{saveId}/editor-document.json
campaigncue/templates/workspaces/{workspaceId}/{templateId}/versions/{saveId}/preview.webp
```

If one shared payload is used by multiple category summaries, the summaries can point to:

```text
campaigncue/templates/platform/shared/{templateId}/pack-template-{contentHash}.json
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

Runtime behavior: selecting a template hydrates its Storage payload only on click. The CampaignCue output picker filters loaded summaries locally by output types, channels, template kind, required facts, and tags. The output picker includes `source_to_channel_pack` as a recommended intent with `whatsapp_message`, `google_update`, `instagram_square`, `poster_pdf`, `staff_share_text`, and `manual_task` output types. That intent turns the current source-backed campaign cue into a bounded manual pack through the existing campaign-create path; it does not force-select one individual source update, and it does not create blog/podcast/video repurposing, autopilot distribution, direct posting, posting-time optimization, provider analytics, or a new persistence path. The output picker includes `campaign_proof_deck` as a handoff intent with `campaign_proof_deck_pdf` output type, meaning proof decks are review artifacts inside a CampaignCue pack rather than a generic design-format library. It also includes `local_creator_test_brief` as a handoff intent with `creator_script`, `reel_brief`, and `manual_task` output types. That intent produces a creator-fit checklist, lightweight creator brief, 3-test plan, flat-fee boundary, disclosure, consent, CTA, and result prompt through the existing campaign pack path; it does not create a creator marketplace, roster, contract, payment, or provider workflow. Required fact slots are checked before any saved editor layout can open. When none remain, CampaignCue may open a saved neutral layout in the shared editor with `pack_template` context so task-based editing, protected facts, output/print formats, Trust Center status, manual delivery cards, result memory, and mobile-review messaging stay visible. The selected output intent is carried into that editor context as an owner task, output/print format focus, title/subtitle context, and delivery instruction. If required fact slots remain, the owner is routed to inputs even when a saved layout exists. If no saved editor document exists and no required template facts remain, CampaignCue creates a campaign pack through the existing guarded campaign API; the server still applies the normal decision gate and trust report. Workspace-saved templates include Brand Playbook style tags and search tokens from saved owner fields only.

Fact readiness is deterministic and conservative. Business name, locality, approved contacts, available catalog items/services, confirmed prices, current capacity signals, active/fresh source evidence, and rights-confirmed assets can satisfy their matching slots. Unknown slot types and unsupported claim/date/rights evidence remain unresolved. The runtime does not ask a model whether a fact exists.

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
4. Write content-hashed immutable Storage payloads first with a create-only generation precondition; reruns reuse an existing hash object instead of overwriting it.
5. Switch all affected category catalog docs in one Firestore batch after every payload upload succeeds.
6. Require explicit `CAMPAIGNCUE_FIREBASE_PROJECT_ID` and `CAMPAIGNCUE_FIREBASE_STORAGE_BUCKET`; honor the optional named database id.
7. Preserve `schemaVersion`, `updatedAt`, and `updatedBy`.
8. Produce a dry-run cost summary before writes.

## Workspace Saved Templates

Workspace saved templates use:

```text
campaigncueWorkspaces/{workspaceId}/packTemplateIndexes/default
```

The index stores summary metadata only. The full reusable pack/editor document lives in Storage. Saving is explicit and should never happen during preview, open, download, or autosave.

When the owner saves a reusable pack from an active non-CueLayers editor session, CampaignCue derives an optional layout-only `CreativeEditorDocument`. It removes image layers, source references, campaign/output identifiers, visible watermark state, logo URLs, old brand names/voice, and old text or QR values. Text and QR values become deterministic slots; current Business Brain values are applied only when the owner reopens the layout. If no reusable non-image layout survives, the pack is saved without an editor document. CueLayers reuse documents are not automatically saved as generic pack templates because the original image preservation and safety metadata belong to the CueLayers source package.

Workspace template Storage cleanup is best-effort but not silent. If a save uploads new payload/editor/preview artifacts and the index write later fails, CampaignCue attempts to delete only newly-created artifacts that do not belong to the previous saved template record. If an owner deletes a saved template, CampaignCue first removes the visible index record and then attempts to delete the payload/editor/preview artifacts. Missing Storage objects are treated as already-cleaned state, while unexpected delete failures log bounded `campaigncue_workspace_template_storage_cleanup_failed` diagnostics with cleanup target plus storage path, template id, and workspace id presence-length metadata only.

## Security

| Surface | Requirement |
| --- | --- |
| Platform category docs | Owner read allowed; writes platform/admin only. |
| Workspace template index | Read/write only for users with workspace access. |
| Storage platform payloads | Owner read allowed through scoped path/rules; writes admin only. |
| Storage workspace payloads | Read/write only for workspace users. |
| Template application | Recompute trust/missing inputs on server before campaign pack creation. |
| Output intent | Accept only a registry id, resolve requirements/channels server-side, reject editor-only intents on the campaign API, and persist intent/output provenance in the existing campaign pack. |
| URL persistence | No signed URLs, external URLs, or base64 payloads in saved template metadata or layout artifacts. |
| Artifact admission | Catalog, index, payload id/schema, and exact owned Storage paths must agree before hydration. Downloads are size-bounded by the Storage SDK. |

## Verification

Add a verifier that checks:

- all docs exist,
- category ids match shared `BUSINESS_CATEGORIES`,
- no CampaignCue code imports or references `storeAssetTemplates`,
- shared editor does not import CampaignCue template DAL,
- platform default load reads one category doc,
- search/filter stays in memory,
- output-intent filtering stays in memory,
- fact-only similarity cannot admit an incompatible template kind,
- output-intent requirement alternatives are evaluated deterministically in browser and server,
- output-intent ids, canonical channels, compatible decision goals, source-template provenance, and requested output types survive campaign persistence,
- `reuse_old_asset` opens CueLayers and `custom_size` opens the shared editor instead of creating a normal campaign,
- picker actions are disabled while an open/create request is in flight,
- full payloads are Storage-backed,
- saved editor documents reopen with `pack_template` context rather than blank editor context,
- saved templates are explicit only,
- no generic/shared doc read is required for default category load,
- overflow docs are loaded only on explicit action.

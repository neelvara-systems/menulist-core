# Creative Editor Template Registry Implementation

**Status:** Implemented
**Last Updated:** July 13, 2026

## Files

| Purpose | File |
| --- | --- |
| Feature flags | `src/config/features.ts` |
| Shared template types | `src/modules/creative-editor/types.ts` |
| Shared editor callback UI | `src/modules/creative-editor/CreativeEditor.tsx` |
| DAL schemas | `src/lib/validation/creativeEditorTemplateSchemas.ts` |
| Client registry DAL | `src/lib/creative-editor/templateRegistryDal.ts` |
| Transaction/index boundary | `src/lib/creative-editor/templateRegistryIndexBoundary.ts` |
| Storage ownership boundary | `src/lib/creative-editor/templateRegistryStorageBoundary.ts` |
| Platform manager route | `src/app/(main)/platform/asset-templates/page.tsx` |
| Platform manager UI | `src/components/templates/platform/assetTemplates/index.tsx` |
| Platform settings navigation | `src/components/templates/platform/settings/index.tsx` |
| Firestore rules | `firestore.rules` |
| Storage rules | `storage.rules` |
| Print asset rehydration | `src/lib/printable-asset-templates/editorDocumentAdapter.ts` |
| Print asset UI | `src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx` |

## Feature Flags

```ts
ENABLE_CREATIVE_EDITOR_TEMPLATE_REGISTRY: true
ENABLE_CREATIVE_EDITOR_USER_TEMPLATES: true
ENABLE_PRINTABLE_ASSET_USER_TEMPLATES: true
ENABLE_PLATFORM_ASSET_TEMPLATE_MANAGER: true
```

Flags live in `src/config/features.ts`. This intentionally avoids env-var bloat.

## Data Shape

Firestore catalog/index metadata is intentionally small and safe for list reads:

```ts
{
  id: string,
  templateType: "platform" | "user",
  title: string,
  description?: string,
  productId: string,
  sourceSurface: string,
  assetTypeId?: string,
  businessCategory?: "generic" | "food" | "service" | "retail" | "professional" | "creative" | "health" | "specialty",
  templateFamilyId?: string,
  documentPath?: string,
  documentStorage?: "storage",
  previewPath?: string,
  width: number,
  height: number,
  elementCount: number,
  status: "draft" | "published" | "archived",
  version: number,
  createdAtMs: number,
  updatedAtMs: number
}
```

Platform asset templates live in one metadata document per business category:

```text
platformAssetTemplates/{businessCategory}
```

`businessCategory` follows `src/data/shared/businessTypes.ts`; `generic` is used only as the fallback/default category when no owner category can be resolved. Each category document holds the platform template summaries for all printable asset types in that category. Common templates that should appear for every owner are mirrored into each category document's `data` array by one multi-document transaction. The route requests one resolved owner category catalog, then filters the in-document templates by `assetTypeId` for the selected asset in UI state.

User template indexes live in one metadata document per tenant/store:

```text
storeAssetTemplates/{tenantId}/{storeId}/default
```

The index document stores `id: "default"` and `data: []`. Each template summary inside `data` carries its own `productId`, `sourceSurface`, `assetTypeId`, and normal MenuList write metadata from pure `composeRequestBody` using one session captured before the retryable transaction, including `tId`, `sId`, `uId`, `createdBy`, `createdOn`, `modifiedBy`, and `modifiedOn`. User identity is metadata, not part of the document path, so saved templates are store-level assets. Product/source/asset filtering happens in UI after this one store document is loaded.

Full documents live in Storage by `documentPath` and are read only when a template is opened:

```text
creative-editor/templates/platform/{businessCategory}/{templateId}/document-{versionId}.json
creative-editor/templates/user/{tenantId}/{storeId}/{templateId}/document-{versionId}.json
```

Template document saves and opens both enforce `MAX_DOCUMENT_BYTES` in `src/lib/creative-editor/templateRegistryDal.ts`. If a stored document blob exceeds the cap, the DAL throws the fixed `TEMPLATE_DOCUMENT_TOO_LARGE` local error before decoding JSON. Open additionally validates the decoded payload with `creativeEditorDocumentSchema` and proves that `documentPath` belongs to the exact platform category/template or tenant/store/template scope before the Storage read.

Tenant/store scope is projected by `templateRegistryScopeBoundary.ts`. Every
present alias inside the selected store context (or session fallback) must
normalize to the same exact positive Firestore document ID. Conflicting,
malformed, or incomplete scope returns no registry account instead of being
sanitized into a different document path. A selected multi-location store may
legitimately differ from the session's default store; Firestore and Storage
rules independently authorize that selected exact scope.

User template previews use the same Storage store scope:

```text
creative-editor/templates/user/{tenantId}/{storeId}/{templateId}/preview-{versionId}.{png|jpg|webp}
```

## DAL

The registry is a client-side DAL because it does not need AI or server-only credentials. Firestore transactions prevent concurrent store-index loss and make generic platform-catalog mirrors atomic; Firebase security is enforced by Firestore and Storage rules.

### `listCreativeEditorTemplates`

- `productId`
- `sourceSurface`
- `assetTypeId`
- `businessCategory` optional, platform-only; `generic|food|service|retail|professional|creative|health|specialty`
- `limit`
- `templateType=platform|user|all`
- `scope` required for user/all template reads

Returns bounded metadata summaries. It does not return full documents. `platform` reads one resolved category catalog; `user` reads the current store's single bounded `default` index doc. The printable asset route filters the returned summaries by `productId`, `sourceSurface`, and `assetTypeId` in UI state, so switching asset tabs does not refetch Firestore.

Registry calls are intentionally route/editor-managed client DAL operations. The `/assets` route owns inline loading and fallback states, so an unavailable optional registry catalog does not trigger a global app error while generated templates remain usable. Save, open, and delete operations preserve feature-specific errors for the editor or route UI instead of returning global composer fallback arrays.

Expected local registry failures use typed local error codes mapped to fixed copy, including not found, document-too-large, missing account scope, user-template save failure, and platform-template save failure. The wrapper maps Firebase Storage quota/permission indicators to fixed copy and falls back to the caller's fixed load/open/save/update/delete message for all other exceptions; it must not branch on raw `Error.message` text.

### `listCreativeEditorPlatformTemplateCatalog`

Platform manager helper for `/platform/asset-templates`.

- reads one `platformAssetTemplates/{businessCategory}` document,
- returns up to 200 summaries,
- can include archived templates for platform users,
- filters product/source/asset metadata in UI.

### `saveCreativeEditorPlatformTemplate`

Platform manager helper that creates or replaces a platform template document.

- validates the neutral editor document,
- uploads an immutable `document-{versionId}.json` attempt to `creative-editor/templates/platform/{businessCategory}/{templateId}/`,
- uploads an optional bounded preview to the same Storage folder,
- transactionally updates the selected category catalog document,
- preserves existing `sortIndex` and increments `version`.
- when `businessCategory` is `generic`, stores one shared immutable Storage payload under `platform/generic/{templateId}` and atomically mirrors summary metadata into `generic` plus every shared business-category catalog. This keeps owner browsing to one category read.
- after commit, deletes only prior or cap-evicted paths that are no longer referenced by any committed target catalog. A failed acknowledgement triggers one authoritative catalog probe; a failed probe preserves the new attempt for reconciliation.

### `updateCreativeEditorPlatformTemplateMetadata`

Updates title, description, template family, and status without uploading the full editor document. This is the low-cost path for draft/publish/archive changes. The mutation target is derived from the stored template record, and all generic mirrors update in one transaction even when the platform user edits from a category view. If a category mirror is stale, the canonical stored business-category record wins.

### `deleteCreativeEditorPlatformTemplate`

Removes the template summary transactionally, then best-effort deletes every removed mirror's owned Storage document and preview. Generic template deletes fan out atomically only across catalogs that actually contain the summary, avoiding no-op writes. Ambiguous acknowledgements are probed before cleanup. Platform delete is not exposed through owner Assets. Missing Storage objects are treated as an expected cleanup no-op; other Storage cleanup failures log the stable `creative_editor_template_storage_cleanup_failed` diagnostic with bounded path, template, product, source, asset-type, business-category, origin, and cleanup-target metadata.

### `saveCreativeEditorTemplate`

Body:

- `title`
- `productId`
- `sourceSurface`
- `assetTypeId`
- `templateFamilyId`
- `document`
- `thumbnailDataUrl` optional; when present and bounded, it is stored as a private Storage preview object, never in Firestore metadata
- `scope` required

Creates or replaces a user template. The DAL uploads attempt-unique document/preview paths, then transactionally updates the bounded Firestore index doc. The requested upsert is retained even when the index is already at its cap; replaced and evicted objects are cleaned only after commit and only when no committed summary still references them.

### `getCreativeEditorTemplate`

Returns metadata summary and full `CreativeEditorDocument`. `templateType=platform` searches the resolved category catalog before loading Storage; owner-facing opens require published platform templates, while the platform manager passes `includeUnpublished` so drafts and archived templates can be edited. `templateType=user` loads from the store `default` index and store-scoped Storage document. Both paths match the template id plus `productId`, `sourceSurface`, and optional `assetTypeId` before loading the Storage payload.

### `deleteCreativeEditorTemplate`

Transactionally deletes the current store's matching index entry, then cleans up Storage document/preview objects after acknowledgement or an authoritative absence probe. The match uses template id, `productId`, `sourceSurface`, and optional `assetTypeId`; metadata removal happens before best-effort Storage cleanup so a failed write cannot leave a broken visible template. Missing Storage objects are treated as an expected cleanup no-op; other cleanup failures log `creative_editor_template_storage_cleanup_failed` with bounded context and do not restore deleted metadata. Platform templates cannot be deleted from the owner DAL.

## Security

- Tenant/store scope is derived from the authenticated session and current store context.
- Firestore rules restrict store template indexes to the matching `{tenantId, storeId}` path.
- Storage rules restrict user document/preview files to the matching `{tenantId, storeId}` path.
- Logged-in user metadata is composed once outside transaction retries through `composeRequestBody`; creation metadata is preserved on updates.
- Inputs are validated with Zod before Firestore/Storage access.
- Template IDs and path parts are sanitized.
- Owner can only list/read/delete templates in their own `{tenant, store}` scope.
- Platform manager route checks `platformRole` before rendering management actions.
- Raw file paths are not accepted from the client.

## Print Asset Integration

The printable asset route now shows:

- **Ready templates** from the business-category platform template catalog, with generated families as fallback.
- **Saved designs** from the registry, filtered by product, source, and selected asset type.

Saved documents are rehydrated before use:

- product context is refreshed,
- metadata brand values are updated,
- QR values are replaced with the current menu/feedback URL,
- locked QR/source refs stay locked,
- updated document ID avoids overwriting the saved template while editing.

## Rollout

The flow is enabled by feature flags. Turning off `ENABLE_PRINTABLE_ASSET_USER_TEMPLATES` hides Saved designs and disables Save as template while leaving existing generated templates intact. Turning off `ENABLE_PLATFORM_ASSET_TEMPLATE_MANAGER` hides the platform manager navigation and direct route content.

## Failure Behavior

- If platform catalog or registry list fails, generated templates still render.
- If Storage is unavailable during user save, save fails without corrupting the existing index; the editor stays open. Quota and permission messages are derived from structured Storage error code/status/name indicators, while owner-visible local validation errors stay allowlisted.
- If save fails, the editor stays open and shows a message.
- If a saved template document is missing, the owner sees a failure message; generated templates still work.
- If Storage cleanup fails after a successful template metadata delete, the delete remains successful and the cleanup failure is logged with bounded diagnostics for operational follow-up.
- If a Firestore save/delete acknowledgement is ambiguous, the DAL performs one authoritative metadata probe. It deletes attempt-owned objects only when absence is proven and retains uncertain objects if the probe itself fails.
- Template previews are stored in Storage only when the editor provides a bounded preview data URL; no preview base64 is written into Firestore metadata.

# Creative Editor Template Registry Implementation

**Status:** Implemented
**Last Updated:** June 15, 2026

## Files

| Purpose | File |
| --- | --- |
| Feature flags | `src/config/features.ts` |
| Shared template types | `src/modules/creative-editor/types.ts` |
| Shared editor callback UI | `src/modules/creative-editor/CreativeEditor.tsx` |
| DAL schemas | `src/lib/validation/creativeEditorTemplateSchemas.ts` |
| Client registry DAL | `src/lib/creative-editor/templateRegistryDal.ts` |
| Firestore rules | `firestore.rules` |
| Storage rules | `storage.rules` |
| Print asset rehydration | `src/lib/printable-asset-templates/editorDocumentAdapter.ts` |
| Print asset UI | `src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx` |

## Feature Flags

```ts
ENABLE_CREATIVE_EDITOR_TEMPLATE_REGISTRY: true
ENABLE_CREATIVE_EDITOR_USER_TEMPLATES: true
ENABLE_PRINTABLE_ASSET_USER_TEMPLATES: true
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

`businessCategory` follows `src/data/shared/businessTypes.ts`; `generic` is used only as the fallback/default category when no owner category can be resolved. Each category document holds the platform template summaries for all printable asset types in that category. Common templates that should appear for every owner are duplicated or seeded into each category document's `data` array. The route requests one resolved owner category catalog, then filters the in-document templates by `assetTypeId` for the selected asset in UI state.

User template indexes live in one metadata document per tenant/store:

```text
storeAssetTemplates/{tenantId}/{storeId}/default
```

The index document stores `id: "default"` and `data: []`. Each template summary inside `data` carries its own `productId`, `sourceSurface`, `assetTypeId`, and normal MenuList write metadata from `requestBodyComposer`, including `tId`, `sId`, `uId`, `createdBy`, `createdOn`, `modifiedBy`, and `modifiedOn`. User identity is metadata, not part of the document path, so saved templates are store-level assets. Product/source/asset filtering happens in UI after this one store document is loaded.

Full documents live in Storage by `documentPath` and are read only when a template is opened:

```text
creative-editor/templates/platform/{businessCategory}/{templateId}/document.json
creative-editor/templates/user/{tenantId}/{storeId}/{templateId}/document.json
```

User template previews use the same Storage store scope:

```text
creative-editor/templates/user/{tenantId}/{storeId}/{templateId}/preview.{png|jpg|webp}
```

## DAL

The registry is a client-side DAL because it does not need AI, server-only credentials, or transaction-only logic. Firebase security is enforced by Firestore and Storage rules.

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

Creates or replaces a user template. The DAL writes the full document JSON to Storage, writes an optional Storage preview when provided, then updates the bounded Firestore index doc.

### `getCreativeEditorTemplate`

Returns metadata summary and full `CreativeEditorDocument`. `templateType=platform` searches the resolved category catalog before loading Storage; `templateType=user` loads from the store `default` index and store-scoped Storage document. Both paths match the template id plus `productId`, `sourceSurface`, and optional `assetTypeId` before loading the Storage payload.

### `deleteCreativeEditorTemplate`

Deletes the current store's matching index entry, then cleans up Storage document/preview objects. The match uses template id, `productId`, `sourceSurface`, and optional `assetTypeId`; metadata removal happens before best-effort Storage cleanup so a failed write cannot leave a broken visible template. Platform templates cannot be deleted from the owner DAL.

## Security

- Tenant/store scope is derived from the authenticated session and current store context.
- Firestore rules restrict store template indexes to the matching `{tenantId, storeId}` path.
- Storage rules restrict user document/preview files to the matching `{tenantId, storeId}` path.
- Logged-in user metadata is stored in the template/index documents through `requestBodyComposer`.
- Inputs are validated with Zod before Firestore/Storage access.
- Template IDs and path parts are sanitized.
- Owner can only list/read/delete templates in their own `{tenant, store}` scope.
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

The flow is enabled by feature flags. Turning off `ENABLE_PRINTABLE_ASSET_USER_TEMPLATES` hides Saved designs and disables Save as template while leaving existing generated templates intact.

## Failure Behavior

- If platform catalog or registry list fails, generated templates still render.
- If Storage is unavailable during user save, save fails without corrupting the existing index; the editor stays open.
- If save fails, the editor stays open and shows a message.
- If a saved template document is missing, the owner sees a failure message; generated templates still work.
- Template previews are stored in Storage only when the editor provides a bounded preview data URL; no preview base64 is written into Firestore metadata.

# Creative Editor Template Registry - Firebase Cost

**Status:** Implemented
**Last Updated:** June 17, 2026

## Summary

The registry adds Firebase cost when an owner explicitly saves, opens, lists, or deletes their own saved templates. Platform template catalogs are Firebase-managed metadata so they can be updated without a code deploy, but they remain read-only to owners and do not create user documents until the owner saves a copy. Platform users manage those catalogs through a platform-only client DAL surface.

There are no new Cloud Functions and no new Firestore indexes. Access is through the client-side MenuList DAL, with Firestore and Storage rules enforcing platform/admin and tenant/store scope. Acting-user details are stored as document metadata through the shared `requestBodyComposer` flow.

## Operation Ledger

| Operation | Firestore Reads | Firestore Writes | Storage | Functions | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| Open `/platform/asset-templates` | 1 | 0 | 0 | 0 | One selected `platformAssetTemplates/{businessCategory}` catalog read. Switching asset type filters local `data`. |
| Create/update category platform template design | 1 | 1 | 1 document upload + optional preview upload | 0 | Reads current category catalog, writes updated bounded `data`, and stores the neutral editor document in Storage. |
| Create/update generic platform template design | 8 | 8 | 1 shared document upload + optional preview upload | 0 | Writes metadata into `generic` plus every shared business-category catalog while storing one shared Storage payload. This preserves one owner platform read. |
| Save category platform template metadata/status | 1 | 1 | 0 | 0 | Reads current category catalog and rewrites only the bounded metadata array; use this for draft/publish/archive changes. |
| Save generic platform template metadata/status | 8 | 8 | 0 | 0 | Derives the mutation fan-out from the stored record, then updates every category copy so generic templates cannot drift when edited from a category view. |
| Delete category platform template | 1 | 1 | Up to 2 deletes | 0 | Removes the summary from the category catalog, then best-effort deletes document and preview objects. |
| Delete generic platform template | Up to 8 | Up to 8 | Up to 2 deletes | 0 | Removes every copied generic summary from category catalogs, then best-effort deletes the shared Storage payload once. |
| Open `/assets` with registry templates | 2 | 0 | 0 | 0 | One platform business-category catalog plus one store-level `default` user template doc. Generated fallback remains non-blocking if either read is empty/blocked. |
| Select generated template | 0 | 0 | 0 | 0 | Local state. |
| Customize generated template | 0 | 0 | 0 | 0 | Document generated in browser memory. |
| Switch asset type after load | 0 | 0 | 0 | 0 | UI filters the already-loaded platform/user `data` arrays by `productId`, `sourceSurface`, and `assetTypeId`. |
| List Saved designs | 1 | 0 | 0 | 0 | One bounded store-level `default` template index metadata doc; no full payload or preview blob read. |
| Save as template | 1 | 1 | 1 document upload + optional preview upload | 0 | Reads current store index, writes updated index; Storage is primary for JSON/preview. |
| Open saved template | 1 | 0 | 1 document download | 0 | Reads store index, downloads document JSON, then rehydrates live QR/source values. |
| Delete saved template | 1 | 1 | Up to 2 deletes | 0 | Reads index, rewrites `data` without that template, deletes Storage document/preview. The `default` doc is not deleted. |

## Firestore Shape

```text
platformAssetTemplates/{businessCategory}
storeAssetTemplates/{tenantId}/{storeId}/default
```

Platform catalog `businessCategory` values are `generic`, `food`, `service`, `retail`, `professional`, `creative`, `health`, and `specialty`. The owner business category is resolved from `src/data/shared/businessTypes.ts`; `generic` is only the fallback/default category when no business category is available. Templates that should appear for every category are stored inside each category document's `data` array so the owner page does not need a second platform read. Each `platformAssetTemplates/{businessCategory}` document holds all platform printable asset template summaries for that category, with `productId`, `sourceSurface`, and `assetTypeId` used for UI filtering. Platform catalogs and store asset template indexes store summary arrays only. They do not contain full editor documents or preview image bytes.

The previous user-id path is intentionally not used. The index doc is always `default` and stores `data: []`. Nested template summaries carry `productId`, `sourceSurface`, `assetTypeId`, `uId`, `createdBy`, `createdOn`, `modifiedBy`, and `modifiedOn` metadata from `requestBodyComposer`, while sharing saved templates at store level.

## Payload Shape

```text
creative-editor/templates/platform/{businessCategory}/{templateId}/document.json
creative-editor/templates/user/{tenantId}/{storeId}/{templateId}/document.json
```

The payload stores the size-limited neutral `CreativeEditorDocument`. List calls do not read this payload. Open calls check the Storage blob size against `MAX_DOCUMENT_BYTES` before decoding JSON, so an oversized stored document fails before the browser materializes the full text payload.

## Cost Guardrails

- No automatic save on editor change.
- No realtime listener.
- No full editor document in the list metadata document.
- No thumbnail/base64 image payload in Firestore.
- Full document JSON and thumbnail previews go to Storage when available.
- Firestore and Storage rules cap user template metadata/files and enforce tenant/store scope.
- User indexes are capped at 100 summaries per store-level `default` document to avoid Firestore document growth.
- Platform category catalogs are capped at 200 summaries per document to keep each category doc bounded.
- No per-preview write.
- No per-download write.
- No platform template clones until the owner explicitly saves.
- List endpoint caps returned templates.
- Print Menu project data continues using the existing selected-project cache.

## Monthly Cost Estimate

| Scenario | Incremental Firebase Cost |
| --- | --- |
| Platform user loads a category manager page 100 times | 100 platform category catalog reads. |
| Platform user publishes 50 category-specific platform templates | 50 catalog reads + 50 catalog writes + 50 Storage document uploads, plus optional preview uploads. |
| Platform user publishes 50 generic platform templates | 400 catalog reads + 400 catalog writes + 50 shared Storage document uploads, plus optional preview uploads. This is platform-only curation cost in exchange for one owner read. |
| Platform user changes status for 50 category-specific templates | 50 catalog reads + 50 catalog writes, no Storage uploads. |
| Platform user changes status for 50 generic templates | 400 catalog reads + 400 catalog writes, no Storage uploads. |
| 1,000 owners browse Assets with registry templates | 1,000 platform catalog reads + 1,000 store `default` doc reads; generated fallback still works if catalogs are empty or blocked. |
| 1,000 owners save one template | 1,000 store-index reads + 1,000 store-index writes + 1,000 Storage document uploads; optional preview uploads only when enabled. |
| 1,000 owners reopen one saved template | 1,000 store-index reads + 1,000 Storage document downloads. |
| 1,000 owners switch asset types after page load | 0 extra registry reads; filtering uses the already-loaded `data` arrays. |

## Rejected Cost Patterns

| Pattern | Reason |
| --- | --- |
| Save every editor draft to Firestore | High write cost and poor owner value. |
| Store Fabric JSON in Firestore | Locks persistence to the rendering engine and grows documents. The registry stores the neutral editor document only. |
| Store PNG/PDF output for every saved template | Adds storage and cleanup lifecycle before proven need. |
| Realtime listener for templates | Low owner value; polling/list action is enough. |
| Clone platform template on first open | Creates writes for owners who only preview/download. |

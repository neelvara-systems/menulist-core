# Creative Editor Template Registry Spec

**Status:** Implemented
**Last Updated:** June 16, 2026
**Owner:** Shared editor infrastructure + MenuList product adapter

## Owner Problem

An SMB owner often edits one printable asset until it feels right, then wants to reuse that style for the next menu, table card, entrance poster, or feedback QR. Without saved templates, the owner repeats layout work or depends on programmatic templates that can never cover every local brand preference.

## Product Decision

Add a product-owned template registry that saves edited shared-editor documents as reusable owner templates and lets platform template catalogs be managed outside the application bundle. Save user templates only when the owner explicitly asks.

## Goals

- Let owners save a customized design under **Saved designs**.
- Let owners reopen a saved template from the relevant product surface.
- Keep live MenuList source data current when templates are reused.
- Keep the shared editor product-neutral.
- Keep Firebase cost bounded and predictable.
- Let platform users manage business-category platform templates without a code deploy.
- Support future products without copying Fabric-specific persistence.

## Non-Goals

- No remote public template marketplace.
- No automatic template save on every edit.
- No realtime template listener.
- No raw Fabric JSON as the persistence contract.
- No default template document per owner or project.
- No Cloud Function render service.
- No generated PDF/image storage unless a future explicit asset-library flow owns it.

## Template Types

| Type | Owner-visible Label | Persistence |
| --- | --- | --- |
| Platform template | Ready templates | Firestore catalog metadata + Storage `CreativeEditorDocument` payload. Code-generated templates remain a seed/fallback path only. |
| User template | Saved designs | Bounded `storeAssetTemplates/{tenantId}/{storeId}/default` metadata + Storage `CreativeEditorDocument` payload after explicit save. |

All template summaries use `templateType: "platform" | "user"` so the UI can share one card/opening flow while still separating platform-managed templates from owner-saved templates.

Platform template targeting is **business category** scoped, not exact business type scoped. MenuList uses the shared `businessTypes.ts` category system (`food`, `service`, `retail`, `professional`, `creative`, `health`, `specialty`) and may use `generic` only as a fallback/default category when a store category cannot be resolved. A normal owner page load reads one platform category document. Generic/common templates that should appear for every owner must be present inside each category document's `data` array instead of requiring a second Firestore read. Exact business types such as `Cafe` or `Salon` should influence template copy and source rehydration, but not create separate platform catalog documents.

## Platform Template Manager Flow

1. Platform user opens `/platform/asset-templates`.
2. Platform user selects business category, asset type, template family, and status.
3. Platform user starts a new design or reopens an existing category template.
4. The shared editor opens full-screen with platform save enabled.
5. Saving writes the editor document to Storage and updates the selected `platformAssetTemplates/{businessCategory}` catalog document.
6. Draft templates stay hidden from owner Ready templates.
7. Published templates appear in the owner Assets route for the matching business category and asset type.
8. Archived templates stay available to platform users but stay hidden from owner catalogs.

## MenuList Printable Asset Flow

1. Owner opens `/assets`.
2. Owner chooses an asset type.
3. Ready templates render from the platform template catalog when available; generated template families remain a non-blocking fallback.
4. Owner clicks **Customize in editor**.
5. Shared editor opens full-screen with a neutral document.
6. Owner edits copy, colors, layout, and visual elements.
7. Owner clicks **Save as template**.
8. Product-owned registry DAL writes metadata and document payload under Firebase rules.
9. Saved template appears in **Saved designs** for that asset type.
10. Reopening the template updates QR/source refs from the currently selected project.

## Acceptance Criteria

- Saved templates are scoped to authenticated tenant and store; acting user details are metadata.
- Template list reads are capped.
- Template saves are explicit, scoped by rules, and capped by document/index limits.
- Saved templates store `CreativeEditorDocument` JSON, not raw Fabric JSON.
- Firestore list metadata does not contain base64 image payloads or full editor documents.
- Platform template list reads use one owner business-category catalog document, then filter in-document summaries by `productId`, `sourceSurface`, and `assetTypeId` in UI.
- Platform users can create, edit, publish, archive, and delete templates from a platform-only route without adding API routes.
- User template list reads use one bounded `storeAssetTemplates/{tenantId}/{storeId}/default` document, then filter in-document summaries by `productId`, `sourceSurface`, and `assetTypeId` in UI.
- Full template documents and previews are stored outside metadata documents.
- Document payload is size-limited.
- Saved printable-asset templates are filtered by asset type.
- Reopened QR layers use the current selected menu/feedback URL.
- Default MenuList template preview/download remains free of new writes.

## SMB Owner UX

- **Ready templates** means templates we provide.
- **Saved designs** means templates the owner saved.
- The owner can reuse designs without understanding documents, JSON, persistence, or QR source refs.
- Locked QR/source layers should stay protected, but current links refresh automatically.

## Governance

The registry is a shared infrastructure feature. Product adapters decide:

- where template actions are shown,
- what product/source metadata is saved,
- which templates are visible,
- which live source refs must be rehydrated,
- whether thumbnails are needed.

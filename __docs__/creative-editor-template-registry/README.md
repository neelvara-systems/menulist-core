# Creative Editor Template Registry - Documentation Hub

> **Feature:** Creative Editor Template Registry
> **Status:** Implemented for MenuList printable asset customization
> **Last Updated:** June 16, 2026
> **Version:** 1.5

---

## Quick Navigation

| Audience | Document | Purpose |
| --- | --- | --- |
| CEO / PM | [Spec](./creative-editor-template-registry_spec.md) | Owner value, scope, template types, guardrails |
| Developers | [Implementation](./creative-editor-template-registry_impl.md) | Files, APIs, persistence shape, editor integration |
| Sales | [Marketing](./creative-editor-template-registry_marketing.md) | Internal positioning and packaging |
| Website | [Website](./creative-editor-template-registry_website.md) | Public copy boundary |
| Support | [Help Doc](./creative-editor-template-registry_helpdoc.md) | Owner-facing usage guide |
| Cost | [Firebase](./creative-editor-template-registry_firebase.md) | Read/write model and limits |
| Mobile | [Mobile Support](./creative-editor-template-registry_mobile-support.md) | Mobile behavior and admission |
| QA | [Test Cases](./creative-editor-template-registry_test-cases.md) | Verification matrix |
| QA | [Validation](./creative-editor-template-registry_validation.md) | Commands and review evidence |

---

## What Is This Feature?

The Creative Editor Template Registry lets a product surface expose reusable editor templates without making the shared editor own product data. MenuList uses it first in printable assets:

- Platform template metadata is registry-owned and can be updated without changing application code.
- Platform users can manage category-scoped platform templates from the platform settings surface.
- Owners can open a generated asset in the shared editor.
- Owners can save that edited editor document as a reusable template.
- Saved templates appear in **Saved designs** for the same printable asset type.
- Reopening a saved template refreshes live QR/source values from the current selected project so stale links do not survive.

The registry stores compact template catalog/index metadata in Firestore and the full neutral `CreativeEditorDocument` JSON in Firebase Storage. Platform catalogs are business-category scoped, and each category document already contains every platform template that category should see, including any generic/common templates. User saves are handled by a client-side MenuList DAL guarded by Firestore and Storage rules. It does not persist raw Fabric JSON, generated PDFs, or generated download artifacts.

## Architecture

```text
Product surface
  -> platform template catalog (Firestore metadata)
  -> template document (Storage JSON)
  -> shared CreativeEditorDocument
  -> owner edits in shared editor
  -> explicit Save as template
      -> product-owned registry DAL
      -> Firestore store template metadata
      -> Storage document + optional Storage preview
```

## Boundaries

| Boundary | Decision |
| --- | --- |
| Shared editor | Renders template sources and save callbacks, but does not import Firebase or product DAL code. |
| Platform templates | `platformAssetTemplates/{businessCategory}` Firestore catalog metadata + Storage document payload. Code templates are fallback/seed only. |
| Platform template manager | Platform-only `/platform/asset-templates` surface creates, edits, publishes, archives, and deletes category catalog entries. |
| User templates | Stored only after explicit owner action in `storeAssetTemplates/{tenantId}/{storeId}/default`. |
| Persistence contract | Neutral `CreativeEditorDocument`, not raw Fabric state. |
| Firebase rules | Client DAL uses explicit Firestore and Storage rules for platform catalogs, store template indexes, documents, and previews. |
| Print assets | Saved templates are rehydrated with current menu/feedback QR values before editing/download. |

## Current Implementation Anchors

| Area | Path |
| --- | --- |
| Feature flags | `src/config/features.ts` |
| Shared editor types | `src/modules/creative-editor/types.ts` |
| Shared editor UI | `src/modules/creative-editor/CreativeEditor.tsx` |
| Registry validation | `src/lib/validation/creativeEditorTemplateSchemas.ts` |
| Registry DAL | `src/lib/creative-editor/templateRegistryDal.ts` |
| Platform manager page | `src/app/(main)/platform/asset-templates/page.tsx` |
| Platform manager UI | `src/components/templates/platform/assetTemplates/index.tsx` |
| Firestore rules | `firestore.rules` |
| Storage rules | `storage.rules` |
| Print asset adapter | `src/lib/printable-asset-templates/editorDocumentAdapter.ts` |
| Print assets route | `src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx` |

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 1.5 | June 16, 2026 | Added platform asset template manager for category catalogs, draft/published/archived status, platform editor save, metadata edits, and platform template delete. |
| 1.4 | June 15, 2026 | Simplified user templates to one store-level `default` document with `data: []`; platform/user list loading is now one category doc plus one store doc, with asset filtering in UI. |
| 1.3 | June 15, 2026 | Moved template registry persistence from Next.js API routes to the client-side DAL, with Firestore/Storage rules enforcing scope. |
| 1.2 | June 15, 2026 | Simplified platform asset template catalogs to `platformAssetTemplates/{businessCategory}` with `assetTypeId` filtering inside each category document. |
| 1.1 | June 15, 2026 | Moved the registry contract to unified `templateType`, Firestore catalog/index docs, and Storage-backed documents/previews. |
| 1.0 | June 15, 2026 | Added server-owned user template registry, print-assets Saved designs flow, explicit Save as template, bounded reads/writes, and QR/source rehydration. |

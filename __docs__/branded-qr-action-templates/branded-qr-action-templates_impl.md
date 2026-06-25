# Branded QR Action Templates Implementation Alignment

**Status:** Docs-ready alignment layer
**Last Updated:** June 25, 2026

## Current Implementation Fit

This layer is already partly implemented through existing systems:

| Existing System | Role |
| --- | --- |
| Assets | Owner selects print asset type, template, preview, and download. |
| Printable Asset Templates | Template families, editor-backed documents, locked QR/link source layers, and platform/store template registry. |
| Menu Kit | Bundled deployment assets for current MenuList link. |
| Print Menu Surfaces | Physical table/card layout ownership. |
| QR WhatsApp Experiments | Future measured campaign layer for WhatsApp-specific tests. |
| `src/lib/utils/qrCode.ts` | Shared QR generation safety helpers. |

## Implementation Contract

Use the existing rendering stack. Do not create a new QR generator product.

```text
action intent
-> asset type
-> template family
-> brand tokens
-> scan-safe QR source layer
-> preview/download
```

## Template Metadata Extension

When runtime work needs richer filtering, use metadata on platform/store templates instead of a separate collection:

```ts
type BrandedQrActionTemplateMetadata = {
  actionIntent:
    | "menu"
    | "order"
    | "feedback"
    | "review"
    | "booking"
    | "loyalty"
    | "whatsapp_offer"
    | "reorder"
    | "event"
    | "product_info";
  qrTreatment: "standard" | "constrained" | "experimental";
  scanSafetyTier: 1 | 2 | 3;
  destinationMode: "live_page" | "external_link" | "experiment_token";
};
```

For current templates, `qrTreatment` should remain `standard` and `scanSafetyTier` should remain `1`.

## Routing

No new route is needed for standard branded action templates.

| Job | Route |
| --- | --- |
| Download standard action surface | `/assets` |
| Full bundle | Menu Kit flow through existing outputs |
| Measured WhatsApp experiment | Future `/assets/experiments` behind `ENABLE_QR_WHATSAPP_EXPERIMENTS` |

## Safety Gate

Any future constrained QR styling must pass:

- generated QR quiet zone check;
- contrast check;
- finder-pattern preservation check;
- logo obstruction check;
- iPhone/Android browser smoke scan;
- printed-material sample scan;
- `npm run verify:printable-asset-templates` extension or dedicated verifier.

Until that suite exists, use Tier 1 only.

## Code Change Guidance

If implementation later adds action-intent filtering:

- extend existing `assetTypes` / template metadata;
- do not add API routes for Firestore-only work;
- do not add a new generated-output Storage path;
- keep platform templates under `platformAssetTemplates/{businessCategory}`;
- keep store templates under `storeAssetTemplates/{tenantId}/{storeId}/default`;
- keep QR/link layers locked in editor documents.

## Relationship To QR WhatsApp Experiments

Branded QR Action Templates provide the creative shell. QR WhatsApp Experiments owns tokens, tracked public route, consent copy, event rollups, and winner logic.

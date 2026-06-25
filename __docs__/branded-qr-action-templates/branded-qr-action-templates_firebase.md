# Branded QR Action Templates Firebase Cost

**Status:** Editor-backed alignment layer
**Last Updated:** June 25, 2026

## Cost Decision

Standard branded QR action templates add no new Firebase reads, writes, Storage uploads, Cloud Functions, API routes, or indexes.

They reuse the current Assets and Printable Asset Templates data model.

## Operation Ledger

| Operation | Firebase Impact | Notes |
| --- | --- | --- |
| Owner opens Assets | Existing Assets/template reads | No new action-template collection. |
| Owner filters by action intent | 0 additional reads | Filter existing in-memory template metadata. |
| Owner previews standard action template | 0 writes | Browser render only. |
| Owner downloads PDF/image | 0 writes | Browser download only. |
| Owner customizes standard action template | 0 writes unless explicitly saved | Same governed editor behavior as Printable Asset Templates. |
| Owner saves as template | Existing store template write | Same `storeAssetTemplates/{tenantId}/{storeId}/default` path. |
| Platform manages templates | Existing platform template writes | Same `platformAssetTemplates/{businessCategory}` path. |
| Owner launches measured WhatsApp test | QR WhatsApp Experiments cost model | Separate feature and flag. |

## Explicit Rejections

- No per-scan Firestore event documents for standard templates.
- No generated PDF/image Storage uploads for standard downloads.
- No new QR analytics API route for standard templates.
- No separate `brandedQrTemplates` collection.
- No raw scan/device/location storage.

## Future Measured Campaign Cost

If a branded action template becomes part of a measured campaign, the cost belongs to QR WhatsApp Experiments and must follow aggregate-first storage. Do not retrofit measurement into standard Assets downloads.

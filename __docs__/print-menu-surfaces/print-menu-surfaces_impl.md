# Print Menu Surfaces Implementation

**Status:** Implemented
**Last Updated:** June 4, 2026

## Architecture

Print Menu Surfaces is a client-side renderer layer. It owns physical scan-first layouts and exposes generators that other features can consume.

| Layer | File |
| --- | --- |
| Feature flag | `src/config/features.ts` |
| Shared card-face renderer | `src/lib/print-menu-surfaces/templates/printMenuCardFace.ts` |
| Table tent renderer | `src/lib/print-menu-surfaces/templates/tableTentTemplate.ts` |
| Single table/counter card renderer | `src/lib/print-menu-surfaces/templates/singleTableCardTemplate.ts` |
| Menu Kit compatibility wrapper | `src/lib/menu-kit/templates/tableTentTemplate.ts` |
| Menu Kit bundle consumer | `src/lib/menu-kit/menuKitGenerator.ts` |
| Shared brand tokens | `src/lib/menu-kit/brandTokens.ts` |
| Shared canvas helpers | `src/lib/menu-kit/canvasPrimitives.ts` |
| Shared attribution | `src/lib/menu-kit/platformAttribution.ts` |
| Verification | `scripts/verification/verify-menu-card-export.js` |

## Renderer Contract

`generatePrintMenuTableTent(input)` and `generatePrintMenuSingleTableCard(input)` return browser `Blob` objects containing PDFs.

The table tent renderer:

- creates an A5 landscape sheet: 210 mm x 148 mm
- divides the sheet into two A6 portrait faces
- rotates one face 180 degrees for opposite-side table viewing
- renders at 300 DPI through Canvas
- embeds the rendered canvas in jsPDF
- uses `qrcode` with `margin: 4` and error correction `H`
- draws MenuList attribution through the shared plan-aware attribution helper

The single table/counter card renderer:

- creates one A6 portrait page: 105 mm x 148 mm
- uses the same `drawPrintMenuCardFace()` visual contract as each table-tent face
- stays upright for non-folded acrylic holders, counter stands, wall clips, and single-sided table stands
- uses `qrcode` with `margin: 4` and error correction `H`
- draws MenuList attribution through the shared plan-aware attribution helper

## Design Contract

| Element | Rule |
| --- | --- |
| QR | Near-black modules on white. No brand-colored QR by default. |
| CTA | `OUR {MENU/SERVICES/CATALOG}` from business-type labels. |
| Brand | Brand-color top band with a floating white rounded card, soft badge, and accent underline; brand color is used for framing, not QR modules. |
| Store name | Fitted and truncated within safe width. |
| Fallback | Short URL under the QR instruction. |
| Attribution | Hidden only for Premium stores through shared policy. |

## Menu Kit Relationship

Menu Kit imports `generatePrintMenuTableTent()` and `generatePrintMenuSingleTableCard()` and includes both resulting PDFs in the ZIP. The old Menu Kit table tent file is intentionally a compatibility wrapper so older imports do not break.

## Firebase and Security

There is no API route and no database write. The only input accepted by the renderer is already-loaded owner/store context. URL validation remains in Menu Kit before QR encoding.

## Validation

Run:

```bash
npm run verify:menu-card-export
npx eslint --max-warnings=0 src/lib/print-menu-surfaces/templates/tableTentTemplate.ts src/lib/menu-kit/templates/tableTentTemplate.ts src/lib/menu-kit/menuKitGenerator.ts
npx tsc --noEmit --incremental false
```

Manual QA:

1. Generate the Menu Kit.
2. Open the table tent PDF.
3. Confirm each standing face is portrait.
4. Confirm QR is black and scan-safe.
5. Confirm store name, short URL, and attribution are inside the card.

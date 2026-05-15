# Sharable Item Card Generation Implementation

## Code

- `src/lib/menu/sharableItemCard.ts` generates a 1200x630 PNG in browser canvas.
- `src/components/templates/main-app/projects/editorView/editItemModal.tsx` exposes desktop owner actions.
- `src/components/mobile/sheets/ItemEditSheet.tsx` exposes mobile owner actions.
- `src/components/templates/main-app/projects/b2cView/output/PDPModal.tsx` keeps only the customer-facing Share action.

## Data Flow

Editor state -> `SharableItemCardInput` -> canvas PNG -> native share or browser download.

No server renderer exists for this feature.

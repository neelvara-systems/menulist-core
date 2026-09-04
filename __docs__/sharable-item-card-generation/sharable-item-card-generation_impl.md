# Sharable Item Card Generation Implementation

## Code

- `src/lib/menu/sharableItemCard.ts` generates a 1200x630 PNG in browser canvas.
- `src/components/templates/main-app/projects/editorView/editItemModal.tsx` exposes desktop owner actions.
- `src/components/mobile/sheets/ItemEditSheet.tsx` exposes mobile owner actions.
- `src/components/templates/main-app/projects/b2cView/output/PDPModal.tsx` keeps only the customer-facing Share action.

## Data Flow

Editor state -> `SharableItemCardInput` -> canvas PNG -> native share or browser download.

No server renderer exists for this feature.

`getPublicItemDisplayOptions()` is the shared projection for desktop and mobile. It resolves localized active names, preserves valid unpriced options, formats valid option prices with the store currency, and excludes inactive or nameless records. `SharableItemCardInput.options` preserves a real description when supplied, renders up to three option values plus an exact remaining count according to available space, and never horizontally stretches copy.

# Item Truth Export Implementation

## Runtime Files

- `src/lib/menu/itemTruthUrls.ts`
- `src/lib/menu/itemTruthRenderer.tsx`
- `src/app/api/og/item/[itemId]/route.tsx`
- `src/app/api/item-card/[itemId]/route.tsx`
- `src/app/client/[[...slug]]/page.tsx`
- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`
- `src/components/templates/main-app/projects/b2cView/output/PDPModal.tsx`
- `src/lib/analytics/unified.ts`
- `src/config/features.ts`

## Resolution

The public image endpoint parses the item ID prefix to derive tenant and store, reads `platformSummary/projects_{storeId}`, filters active public projects, and loads project documents until the item is found.

The route supports optional `project` query narrowing for current-page downloads while preserving the public `/api/og/item/{itemId}?v={version}` contract.

## Client Behavior

The public menu reads `?item={itemId}` first and falls back to legacy `/item/{segment}` parsing.

When the item resolves:
- scrolls to the item
- highlights briefly
- opens PDP
- tracks `link_open`

When it does not resolve:
- keeps the menu page open
- shows `Item not available`
- removes the stale `item` query param


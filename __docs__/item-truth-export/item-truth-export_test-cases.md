# Item Truth Export Test Cases

- Opening `/{projectSlug}?item={itemId}` scrolls, highlights, and opens PDP.
- Opening a legacy `/item/{slug-shortId}` link still resolves.
- Missing item opens the menu and shows `Item not available`.
- Unavailable item opens the menu and shows `Item not available`.
- Share calls native share when available.
- Copy link writes canonical `?item={itemId}` URL.
- Download calls `/api/item-card/{itemId}` and returns PNG.
- OG route returns a 1200x630 PNG for active published items.
- Item with no image renders a clean fallback card.
- Multi-language menu keeps `lang` in the item link.


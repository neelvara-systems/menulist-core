# Item Truth Export

Item Truth Export makes a published menu item addressable, shareable, and downloadable without adding owner customization decisions.

Core contract:
- Canonical item link: `/{projectSlug}?item={itemId}`
- OG image: `/api/og/item/{itemId}?v={version}`
- Download image: `/api/item-card/{itemId}?v={version}`
- Identity is item-ID based. Slugs are legacy aliases only.

This is public menu infrastructure. It must stay fast, deterministic, and neutral.


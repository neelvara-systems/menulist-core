# Sharable Item Card Generation

Owner-side item card generation creates a clean PNG for one menu item from data already loaded in the Menu tab editor.

Scope:
- Desktop item edit modal: Share card, Download card.
- Mobile item edit sheet: Share card, Download card.
- Public PDP: no Copy Link or Download Card owner actions.
- Backend: no API route, no dynamic OG route, no Firebase read/write for generation.

The feature is a lightweight owner utility, not a public customer feature and not an SEO layer.

Item options follow the public saved-item contract. The card includes active named options, keeps options without a separate price, excludes inactive/nameless values, and uses the neutral label `Options` because the current data model does not distinguish variants from add-ons.

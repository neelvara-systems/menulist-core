# Client Menu Retrieval Foundation Mobile Support

## Admission

Required. Public menus are primarily opened from QR codes, messaging apps, mobile browsers, and installed customer PWAs.

## Mobile Requirements

- Search must stay fast on small Android devices and large menus.
- No extra owner settings or customer controls.
- Empty states must remain short and recovery-oriented.
- Offline behavior must be clear and must not show stale menu content.
- Sticky search/sections controls remain the main mobile retrieval layer.

## Touch and Performance

- No new tap targets are added for search.
- Matching runs after existing debounce.
- Search terms are generated once from already-loaded data.
- Service worker changes affect navigation fallback only.

## Offline Rule

Installed app users see `/offline` when the network cannot return a current page. MenuList must not show cached menu content that could be stale.


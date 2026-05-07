# Client Menu Retrieval Foundation Test Cases

## Search

- `paneer`, `panir`, and `panner` match a Paneer item.
- Accent-insensitive terms match localized Latin text.
- Devanagari or Gujarati item/category text can be found through same-script input.
- Practical transliteration fold matches common Devanagari/Gujarati menu terms where possible.
- Business-category aliases match the shared SMB categories from `businessTypes.ts`, for example food spelling variants, salon color/colour, retail jewelry/jewellery, warranty/guarantee, and professional consultation/session.
- Attribute name search finds an item variant.
- Tag and decision fact search finds matching items.
- Present decision-fact labels such as warranty, material, duration, spice, allergens, and nutrition are searchable when that public fact exists.
- Search remains client-side and does not trigger new network calls.

## Structured Data

- JSON-LD includes active public categories/items only.
- Item `offers` are omitted when public prices are disabled.
- `dateModified` uses project freshness first.
- `menuVersion` appears as structured additional property only when real project data exists.
- Non-food SMB pages do not fall back to `Restaurant` schema type.
- No fake verification claims are emitted.

## Low Network

- Navigation succeeds normally when online.
- Navigation falls back to `/offline` when fetch fails.
- Navigation falls back to `/offline` after bounded timeout on stalled network.
- No menu HTML/data/image runtime cache is created by `sw-customer.js`.

## Verification Run

May 7, 2026:

- `npx tsc --noEmit --incremental false` passed.
- `npm run build` passed; existing website i18n dynamic-server warnings still log during static generation.
- Tenant route smoke passed: `Host: mysalon.menulist.ai:4013` `HEAD /bar-menu` returned `200 OK`.
- Full tenant menu GET rendered after a defensive Decision Blocks time-slot guard; saved HTML contained `_publicSearch`, `menuVersion`, and `dateModified`.
- `/offline` route smoke returned `200 OK`.

Business-type alignment follow-up:

- `src/data/shared/businessTypes.ts` and `functions/src/sharedData/businessTypes.ts` matched byte-for-byte.
- Real tenant data with `businessType: B2C` and `businessIndustry: Restaurant` resolves to the restaurant search/schema path for public rendering.
- Public search smoke passed for restaurant, salon, retail, and professional examples.
- Business schema smoke passed for food, service, retail, professional, health, and specialty examples.

Final public search UX pass:

- Browser-tested `http://mysalon.menulist.ai:4014/bar-menu` with tenant host routing.
- Query `chay` returned `Chai` and `Masala chai` only after the fuzzy false-positive guard; `French omelette` no longer matched that phonetic query.
- Query `zzzzzz` showed the recovery empty state with `Show all`, section jump buttons, and business action fallbacks.
- Search mode hides recommendation blocks and feedback nudge so results stay focused.
- Active category styling is suppressed while search is active; section/category clicks from search clear the query, wait for full content to render, and then scroll to the selected section.
- Session state no longer restores a non-top active category when the saved scroll position is at the top.

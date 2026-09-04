# Client Menu (Customer-Facing Digital Menu) — Mobile Support

**Last Updated:** July 31, 2026
**Decision:** ✅ ALREADY MOBILE-FIRST — Public page, not inside owner MobileShell

---

## Feature Admission Test

Not applicable — this is a CUSTOMER-facing feature, not an owner-operational feature. It runs as a public Next.js page at `/{subdomain}.menulist.online/{slug}`, separate from the owner dashboard MobileShell.

---

## Mobile Status

| Aspect | Status | Notes |
|--------|--------|-------|
| Customer mobile browsing | ✅ | Mobile-first responsive design, 70%+ users on mobile |
| Category navigation | ✅ | Sticky touch rail plus sticky-row `Sections` navigator only for 3+ sections; public icons preserve owner-selected icon choices |
| Item display (name/price/image) | ✅ | Responsive grid/list layouts, including compact two-column mobile grid when Grid is selected; odd final grid cards span full row, and image frames render only for items that have images |
| Search/filter | ✅ | Debounced fuzzy/transliteration search with exact visible-name results first, any-term recovery for multi-term searches, 16px mobile input sizing, clear exits search mode, and compact data-based search suggestions |
| Item detail | ✅ | Mobile uses a bottom sheet with contain-fit images, arrow/dot controls, touch swiping, fullscreen pinch-to-zoom image inspection, category identity, item sharing, and owner-entered nutrition facts when enabled |
| SEO (generateMetadata) | ✅ | Server-side, device-independent |
| Schema.org JSON-LD | ✅ | Server-side active menu data with real freshness fields |
| Analytics tracking | ✅ | Device-independent |
| Auto-sell features | ✅ | Decision blocks render on all devices |
| Low-network fallback | ✅ | Customer service worker stays network-first and shows `/offline`; no stale menu cache |

## Mobile Output Rules

- Customer-facing category labels, item labels, and footer language actions must use localization fallback instead of active-language-only reads.
- Owner-selected category icons, including emoji values, render on public mobile output through the shared icon system.
- Image-enabled layouts must not show blank image cards for items without images; broken image URLs may keep their reserved frame to avoid a late scroll jump.
- Item image reads must use the public image normalizer so legacy object-shaped image data cannot crash mobile PDP galleries or featured/item cards.
- Item descriptions use a 14px mobile floor and compact-grid descriptions use a 13px floor; decision chips use at least 12px text.
- Scheduled categories must govern cards, filters, Featured choices, and shared item links. Admission refreshes at the wall-clock minute boundary and after returning to a backgrounded page, using deterministic UTC only when store timezone truth is unavailable. When every category opens later, the mobile empty surface shows the localized upcoming day and time.
- Sold-out shared items remain inspectable as unavailable. Removed, inactive, uncategorized, or currently hidden item links return to the canonical menu URL with a bounded notice, including when the catalog is empty.
- PDP close must not leave stale sticky-row hit-test regions; iPhone PWA top-of-page detail views use lightweight scroll lock and history-driven close without synthetic scroll/resize events after close.
- PDP open moves focus to the close control, traps Tab inside the sheet, supports Escape, and restores focus to the invoking item after close.
- PDP close must not remount the sticky command row or synthesize scroll/resize events because that can move the horizontal category rail after closing a featured item.
- PDP content must remain inside a viewport-capped scroll container with touch scrolling enabled and the close control reachable during long detail scrolls.
- Back-to-top must not perform scroll work on pointerdown; it scrolls on completed tap/click and stops press propagation so the item card below it cannot receive the same gesture.
- Featured choices must open PDP directly on mobile when the public menu provides a PDP handler; they must not also scroll the underlying menu before the modal opens.
- Featured choices keep the horizontal scroller on mobile/tablet; the desktop-only grid treatment must not remove touch-friendly horizontal browsing on smaller screens.
- Public menu shell padding is capped by device: mobile uses 12px, tablet uses 18px, and desktop keeps the configured design spacing so small screens do not lose usable width.
- Public mobile navigation uses one command row for search plus `Sections`; floating controls remain limited to secondary accessibility actions such as back-to-top.
- Search-row taps must focus the real input immediately on the first tap, including while the command row expands and side controls animate away.
- The public mobile command row must stay visually stable during vertical scroll; it avoids transform-based compositor hints and clipped sticky ancestors, and switches to a measured fixed layer after it reaches the top to avoid iOS sticky jitter.
- On iPhone Chrome/PWA, the fixed command row must anchor at `top: 0`; any visual top gap or notch breathing room belongs inside row padding, not in a dynamic sticky `top` offset or negative cover layer.
- The `Sections` command is shown only for menus with three or more visible sections.
- The compact top-row language action shows only the language initials; the picker itself keeps full native language labels.
- `Sections` and language controls must remain reachable while search is focused, and their popovers must render above sticky/overflow containers.
- The `Sections` popup header must stay compact while preserving a reachable close tap target; the close button visual should not set the whole header height.
- Selecting a section from the `Sections` popup must dismiss the popup before triggering the category scroll jump.
- Expanded sticky search must not reserve the command-row side-control gap; the gap is present only when `Sections` or language controls are visible.
- Footer freshness must not repeat on mobile: the publish row owns exact update time, and bottom trust signals show only location/open state in that placement.
- Menu special notes must render centered in the footer trust zone when present in menu settings, legacy project note fields, or the store public note fallback.
- Call, WhatsApp, and Directions should stay in one compact footer row when those are the only primary actions; mobile keeps equal-width touch targets, desktop uses centered compact chips, and extra public actions can wrap.
- Public menu language persistence must be project-scoped so an installed PWA cannot reuse a different menu's previous language selection.
- Compact public payloads must preserve the resolved initial render language description so installed PWAs and browser tabs do not show a default-language control with another language's description text.
- Public mobile analytics must enter the local coalescing queue directly; it must not run through the authenticated DAL wrapper or fetch owner auth/session state per anonymous customer event.
- Search must stay client-side against the already-loaded public payload; no mobile search API or extra Firestore reads are allowed.
- Search suggestions must be derived from the loaded menu payload and must not create a new retrieval endpoint or owner setting.
- One-character search input must not activate mobile filtering or show a hard no-result state. Typo recovery must stay explainable and avoid broad compressed-token false positives.
- Multi-term search should rank exact phrases first, then items matching all terms, then items matching any term so searches such as `coffee chai` recover both coffee and chai results.
- Starting search from a scrolled mobile position must bring the result area under the sticky command row so filtered output is immediately visible without manual scroll correction.
- Offline mode must show a clear reconnect screen instead of cached menu content that could be stale.
- Platform attribution stays compact and quiet, matches the OBP `Powered by MenuList. All rights reserved` treatment, and does not add a marketing CTA by default.
- Mobile public menus lock pinch zoom on the client route and suppress text selection on menu/category controls while keeping footer/business content selectable.
- Fullscreen PDP image preview supports its own two-finger pinch zoom; this is scoped to the image viewer and does not re-enable browser-level zoom for the whole menu.
- Public menu language changes must keep names, descriptions, category labels, and URL `?lang=` state aligned after OBP-to-menu navigation or installed PWA launches.
- Public item URLs must preserve the selected language query and update client head metadata while the PDP is open so mobile browser share sheets render the matching item URL, title, and description.
- Public item PDPs must expose a quiet share action for installed PWAs, using native device sharing when available and copy-link fallback when unavailable. The shared URL must be the item URL with the current `?lang=` value.
- Active public menu temporary status belongs in the bottom trust zone as a centered pill, not above the business identity header where it can compete with sticky controls. Expired status data must render nothing and reserve no space.
- Item decision marks remain inline after item names. When the currently available menu uses any admitted dietary, spice, or audience marks, one compact wrapping guide appears before the bottom trust footer and labels only the distinct marks actually used. Search and filters never make the guide jump; menus without marks render no guide or reserved gap.

## Owner Mobile Interaction

Owners can still open the saved customer-facing link from `MobileShareScreen`. The mobile Menu Design screen also has a persistent `Preview` action for draft design changes; it opens a full-screen preview-only sheet that renders the same public menu component without saving, tracking customer analytics, or mutating public menu URL/session state.

## Sub-Features

- **Analytics Tracking**: Server-side/client tracking — device-independent, no mobile UI needed
- **Auto-Sell Features**: Decision blocks rendered on customer-facing page — already mobile-responsive

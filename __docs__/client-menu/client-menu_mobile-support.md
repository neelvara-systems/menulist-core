# Client Menu (Customer-Facing Digital Menu) — Mobile Support

**Last Updated:** May 7, 2026
**Decision:** ✅ ALREADY MOBILE-FIRST — Public page, not inside owner MobileShell

---

## Feature Admission Test

Not applicable — this is a CUSTOMER-facing feature, not an owner-operational feature. It runs as a public Next.js page at `/{subdomain}.menulist.ai/{slug}`, separate from the owner dashboard MobileShell.

---

## Mobile Status

| Aspect | Status | Notes |
|--------|--------|-------|
| Customer mobile browsing | ✅ | Mobile-first responsive design, 70%+ users on mobile |
| Category navigation | ✅ | Sticky touch rail plus sticky-row `Sections` navigator; public icons preserve owner-selected icon choices |
| Item display (name/price/image) | ✅ | Responsive grid/list layouts with line limits and reserved image slots |
| Search/filter | ✅ | Debounced fuzzy/transliteration search with stronger focus state, business-type placeholder, and compact sticky command-row behavior |
| SEO (generateMetadata) | ✅ | Server-side, device-independent |
| Schema.org JSON-LD | ✅ | Server-side active menu data with real freshness fields |
| Analytics tracking | ✅ | Device-independent |
| Auto-sell features | ✅ | Decision blocks render on all devices |
| Low-network fallback | ✅ | Customer service worker stays network-first and shows `/offline`; no stale menu cache |

## Mobile Output Rules

- Customer-facing category labels, item labels, and footer language actions must use localization fallback instead of active-language-only reads.
- Owner-selected category icons, including emoji values, render on public mobile output through the shared icon system.
- Image-enabled layouts reserve thumbnail/card image space so missing or broken images do not move the user's scroll position.
- Public mobile navigation uses a sticky command row for search plus `Sections`; floating controls remain limited to secondary accessibility actions such as back-to-top.
- Search must stay client-side against the already-loaded public payload; no mobile search API or extra Firestore reads are allowed.
- Offline mode must show a clear reconnect screen instead of cached menu content that could be stale.
- Platform attribution stays compact and quiet; no extra marketing CTA is added to the mobile footer by default.

## Owner Mobile Interaction

Owners preview their customer-facing menu by tapping the share link from `MobileShareScreen`. No separate owner mobile UI needed — the public page IS already mobile-optimized.

## Sub-Features

- **Analytics Tracking**: Server-side/client tracking — device-independent, no mobile UI needed
- **Auto-Sell Features**: Decision blocks rendered on customer-facing page — already mobile-responsive

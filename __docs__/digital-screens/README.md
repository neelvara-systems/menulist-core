# Digital Screens — Documentation Hub

**Feature:** In-Store Digital Menu Display (TV/Tablet Screens)
**Status:** 🔒 v2.3 LOCKED (readability, owner-trust, public-read, listener-isolation, bounded-diagnostics hardening, and dedicated source-gate verification applied July 2026) — Only readability/reliability/scale fixes allowed.
**One-liner:** "Your current menu on your shop TV. One link. No separate screen editing."

## Source Gate

Digital Screens copy must stay tied to the active screen runtime: `/screen/[token]` uses a 60-second `screen-data` server cache, both screen clients render cache-first from localStorage, and connected screens refresh after an acknowledged public-output change bumps `screen.contentVersion` and the public-safe `platformSummary/screen_{storeId}` listener mirror. Do not describe screen freshness as immediate, absolute, or independent of the cache/listener boundary. Guard with `npm run verify:digital-screens-boundary`.

---

## What Is It?

Digital Screens extends MenuList's authority into the physical store environment. Two rendering modes from one truth system:

- **Menu Board** (default) — full menu with categories, items, prices (primary ordering screen)
- **Highlights** — rotating promotional slides (secondary/ambiance screen)

Both modes use the same data pipeline, same URL base. Owner opens a link on their TV. That's it. Content management IS menu management — there's no separate "screen content" to manage.

Both screen modes keep the same quiet public attribution as OBP and menu pages: `Powered by MenuList. All rights reserved`.

June 2026 hardening keeps that boundary while making the feature owner-trustworthy:

- TV setup now shows the two screen types as distinct setup cards with compact links, QR blocks, and last-seen status.
- Menu Board now uses screen-grade typography, price alignment, fewer rows per page, and the owner/menu category order instead of bestseller-first sorting.
- Screen content now normalizes item/category text, currency-bearing prices, tags, descriptions, and custom slide captions before display, and TV price symbols follow the store's selected `currencySymbol`.
- Highlights owner-only mode now truly uses custom slides only, with brand fallback if no valid upload remains.
- Highlights no longer overlays management captions on custom poster slides; owner-uploaded artwork is treated as the screen content.
- Public menu cache invalidation now also touches screen content version when a screen exists, so ordinary menu edits can refresh connected TVs.
- Public screen cold renders now use a generated available-item menu projection inside the existing screen summary when it matches the current menu/version and base menu slug context, with the old project-read fallback still intact.
- Public screen clients now listen to a tiny safe `platformSummary/screen_{storeId}` mirror instead of the internal `campaigns_{storeId}` owner summary document.
- The daily seen signal rejects oversized anonymous requests, applies the IP rate limit before JSON parsing or Firestore lookup, requires an enabled screen plus public-safe active/non-blocked store eligibility before writing, and public display clients send it as same-origin/no-store/manual-redirect before caching the daily local marker only after an OK response.
- Public token resolvers, menu fallback helpers, invalidation, and reload utilities no longer direct-console raw screen tokens, project IDs, slide IDs, settings, or error objects; failures use normalized bounded diagnostics.
- `npm run verify:digital-screens-boundary` now locks the screen-token route, public-safe `platformSummary/screen_{storeId}` mirror, seen-signal cheap-fail ordering, screen cache invalidation touches, owner copy/open acknowledgement guards, and Digital Screens docs parity as a dedicated source gate.

**Problem solved:** Shop TVs showing outdated slideshows or blank screens because nobody remembers to update them. And the 70%+ of restaurants that need a full menu board on screen, not just promotional slides.

---

## Quick Navigation

| Document                                          | Audience         | Purpose                                                           |
| ------------------------------------------------- | ---------------- | ----------------------------------------------------------------- |
| [Spec](./digital-screens_spec.md)                 | CEO, PM, Team    | Product specification, requirements, two-surface architecture     |
| [Implementation](./digital-screens_impl.md)       | Developer        | Technical implementation — file map, data flows, v2.0 plan        |
| [Marketing](./digital-screens_marketing.md)       | Sales, Marketing | Pitch decks, talking points, two-surface positioning              |
| [Firebase Cost](./digital-screens_firebase.md)    | Developer, Ops   | Actual Firestore operations, cost per screen, v2.0 cost impact    |
| [Improvements](./digital-screens_improvements.md) | Developer        | Cost optimization + v2.0 findings (price display, menu board)     |
| [Website Content](./digital-screens_website.md)   | Marketing        | Website page copy and SEO                                         |
| [Help Doc](./digital-screens_helpdoc.md)          | Customer Support | End-user setup, two-TV guide, content management, troubleshooting |

### Archived (Historical)

Historical docs in `_archive/`:

- Hardening spec, validation report, code review, logic verification, testing guide
- `digital-screens_chatgpt-review.md` — Market research + ChatGPT strategic review v1 (Feb 2026)
- `digital-screens_chatgpt-review-v2.md` — Post-v2.2 strategic review, QR pairing rejection, feature LOCK decision (Feb 2026)
- `digital-screens_chatgpt-review-v3.md` — System-level strategic + architecture + UX review. 47 items evaluated, 12 implemented (Mar 2026)
- `digital-screens_chatgpt-review-v4.md` — Physical surfaces / Menu Kit / scan network / architecture / UX / growth loops / moats deep review. 159 items evaluated, 72% accuracy. Validated identity > recommendation strategy (Mar 2026)

---

## Key Files (Code)

```
src/types/campaigns.ts                      # ScreenSlide, DigitalScreenState types
src/config/features.ts                      # DIGITAL_SCREENS_* feature flags + MODE
src/lib/screen/                             # Utilities, slide generators, renderer
src/lib/screen/screenContent.ts             # Content normalization, price parsing, tags, captions, screen menu extraction
src/lib/screen/publicScreenState.ts         # Public-safe listener mirror for screen content version
src/lib/screen/screenInvalidation.ts        # Public-cache-linked screen content version touch + menu projection refresh
src/app/screen/[token]/page.tsx             # Server component (SSR, projection/fallback menu resolution, mode routing)
src/app/screen/[token]/ScreenDisplay.tsx    # Highlights mode client (rotation, cache, listener)
src/app/screen/[token]/MenuBoardDisplay.tsx # Menu Board mode client (v2.0 — full menu, pagination)
src/app/screen/[token]/ScreenAttribution.tsx # Shared quiet public attribution
src/app/api/screen/seen/route.ts            # Daily seen signal endpoint
src/database/campaigns/serverScreen.ts      # Public screen DAL: token lookup, projection guard, project fallback
src/database/campaigns/index.ts             # Owner/session DAL: setup, settings, uploads, version bumps
src/components/.../DigitalScreenSettings/   # Owner settings UI (4 components)
scripts/verification/verify-digital-screens-boundary.js # Dedicated local source gate for Digital Screens
```

---

## How Owners Use It

**One TV (most common):**

1. Settings → Digital Screen → copy Menu Board link from the TV setup card → open on TV → fullscreen → done. Copied feedback appears only after the browser acknowledges the copy handoff.

**Two TVs:**

1. Counter TV → Menu Board link (full menu with prices)
2. Waiting area TV → Highlights link (rotating promotions + QR)

**Trust signal:** The settings screen shows when a TV was last seen after it sends the daily screen signal.

**Content management:** Owner edits menu in Projects/Editor. A saved public-output change refreshes the screen path through cache invalidation and the screen content-version listener. No separate screen content management.

**Upload acknowledgement:** Custom slide uploads only show success after the DAL returns a shaped owner-upload slide. Storage or add-slide fallback values route to the existing failed-upload message.

---

## Extending This Feature

1. **Add a new slide type** → Edit `ScreenSlide.type` in `campaigns.ts`, update `SlideContent` in `ScreenDisplay.tsx`
2. **Change slide timing** → `SCREEN_CONFIG` in `screenRenderer.ts`
3. **Add more owner uploads** → Change `DIGITAL_SCREENS_MAX_UPLOADS` in `features.ts`
4. **Change default mode** → `DIGITAL_SCREENS_MODE` in `features.ts`
5. **Modify menu board layout** → `MenuBoardDisplay.tsx` (v2.0)

Run `npm run verify:digital-screens-boundary` after any Digital Screens route, DAL, cache, rules, desktop/mobile settings, or docs change. This local source gate does not replace browser TV smoke, physical-device QA, Firebase deploy evidence, Vercel deploy evidence, or production-host runtime verification.

---

## Firebase Cost Summary

- **Per screen/month:** ~$0.00027-$0.00041
- **1,000 screens:** ~$0.28-$0.43/month
- **Menu Board mode:** $0.00 additional (same menu data resolver)
- **Two screens per store (1K stores):** ~$0.58-$0.86/month

See `digital-screens_firebase.md` for full breakdown.

---

**Last Updated:** July 1, 2026

# Digital Screens — Documentation Hub

**Feature:** In-Store Digital Menu Display (TV/Tablet Screens)  
**Status:** 🔒 v2.2 LOCKED (v2.3 hardening applied Mar 2026) — Only readability/reliability/scale fixes allowed.  
**One-liner:** "Your full menu on your shop TV. Always up to date. Never touch it."

---

## What Is It?

Digital Screens extends MenuList's authority into the physical store environment. Two rendering modes from one truth system:

- **Menu Board** (default) — full menu with categories, items, prices (primary ordering screen)
- **Highlights** — rotating promotional slides (secondary/ambiance screen)

Both modes use the same data pipeline, same URL base. Owner opens a link on their TV. That's it. Content management IS menu management — there's no separate "screen content" to manage.

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
src/app/screen/[token]/page.tsx             # Server component (SSR, DAL fetch, mode routing)
src/app/screen/[token]/ScreenDisplay.tsx    # Highlights mode client (rotation, cache, listener)
src/app/screen/[token]/MenuBoardDisplay.tsx # Menu Board mode client (v2.0 — full menu, pagination)
src/app/api/screen/seen/route.ts            # Daily seen signal endpoint
src/database/campaigns/index.ts             # DAL: getScreenDataByToken + 8 screen functions
src/components/.../DigitalScreenSettings/   # Owner settings UI (4 components)
```

---

## How Owners Use It

**One TV (most common):**

1. Settings → Digital Screen → copy Menu Board link → open on TV → bookmark → done

**Two TVs:**

1. Counter TV → Menu Board link (full menu with prices)
2. Waiting area TV → Highlights link (rotating promotions + QR)

**Content management:** Owner edits menu in Projects/Editor. Screen updates automatically. No separate screen content management.

---

## Extending This Feature

1. **Add a new slide type** → Edit `ScreenSlide.type` in `campaigns.ts`, update `SlideContent` in `ScreenDisplay.tsx`
2. **Change slide timing** → `SCREEN_CONFIG` in `screenRenderer.ts`
3. **Add more owner uploads** → Change `DIGITAL_SCREENS_MAX_UPLOADS` in `features.ts`
4. **Change default mode** → `DIGITAL_SCREENS_MODE` in `features.ts`
5. **Modify menu board layout** → `MenuBoardDisplay.tsx` (v2.0)

---

## Firebase Cost Summary

- **Per screen/month:** ~$0.0005
- **1,000 screens:** ~$0.41/month
- **Menu Board mode:** $0.00 additional (same data pipeline)
- **Two screens per store (1K stores):** ~$0.82/month

See `digital-screens_firebase.md` for full breakdown.

---

**Last Updated:** March 15, 2026

# Public Menu Entry — No-Auth Menu Creation Pipeline

**Version:** 1.0
**Status:** 📝 DOCUMENTED — Ready for review, then implementation
**Feature Flag:** `ENABLE_PUBLIC_MENU_ENTRY` (default: OFF)
**Last Updated:** March 10, 2026

---

## What Is This?

A public-facing page at `/create-menu` that lets any business owner upload a menu image and instantly see a structured digital menu — **without creating an account first**. After preview, the owner claims the page by signing up, which creates their MenuList account + publishes the page.

**Core loop:** Upload → AI extraction → Preview → Sign up to publish

## Why This Matters

MenuList's long-term asset is **canonical public business pages**. This feature removes the biggest friction: forcing signup before showing value. The owner sees the result first, then commits.

## Architecture Summary

- **Zero new backend infrastructure** — reuses existing AI extraction pipeline, menu rendering, and auth flow
- **One new public page** — `src/app/(website)/create-menu/page.tsx`
- **One new API route** — `/api/public/create-menu` (handles anonymous upload + extraction)
- **Temporary storage** — extracted data stored in `publicMenuDrafts` collection with 24h TTL
- **Conversion flow** — after signup, draft is converted to real project via existing `createProject` DAL

## Documents

| File | Audience | Purpose |
|------|----------|---------|
| `public-menu-entry_spec.md` | CEO/PM | Business requirements, user flows |
| `public-menu-entry_impl.md` | Developers | Technical blueprint, file paths, schemas |
| `public-menu-entry_firebase.md` | DevOps/Cost | Every Firestore read/write, cost estimates |
| `public-menu-entry_marketing.md` | Sales/Marketing | Pitch, positioning, go-to-market |
| `public-menu-entry_website.md` | Content | Landing page copy, SEO meta |
| `public-menu-entry_helpdoc.md` | Support | Customer help article |
| `public-menu-entry_mobile-support.md` | Engineering | Mobile admission test |

## Key Decisions

1. **No account required for upload + extraction** — value shown before commitment
2. **24-hour TTL on drafts** — unclaimed drafts auto-deleted (cost control)
3. **Rate limiting by IP** — 3 extractions per IP per day (abuse prevention)
4. **Reuses existing extraction pipeline** — same Gemini 2.5 Flash, same parallel processing
5. **Preview uses existing menu renderer** — same B2C view components
6. **Feature-flagged** — `ENABLE_PUBLIC_MENU_ENTRY` controls entire flow
7. **Mobile-first design** — SMB owners will use this from phone

## Related Features

- `__docs__/free-tools-strategy/` — Strategic context (ChatGPT review)
- `__docs__/messaging-onboarding/` — WhatsApp onboarding (complementary channel)
- `__docs__/official-business-page/` — OBP created on publish
- Menu extraction pipeline: `src/lib/firebase/menuProcessing.ts`
- Menu rendering: `src/app/_client/[[...slug]]/page.tsx`

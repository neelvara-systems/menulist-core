# Public Menu Entry — Controlled Free Preview Pipeline

**Version:** 1.0
**Status:** ✅ IMPLEMENTED — Active funnel
**Feature Flag:** `ENABLE_PUBLIC_MENU_ENTRY`
**Last Updated:** May 20, 2026

---

## What Is This?

A public-facing page at `/create-menu` that lets any business owner create a free account, upload a current menu image, and see a structured owner-review preview. The public marketing promise is **free to start, review before publishing**, not an anonymous free AI utility.

**Core loop:** Free account → Upload → extraction → Preview → official source setup

## Why This Matters

MenuList's long-term asset is **canonical public business pages**. This feature removes the biggest friction: forcing payment before showing value, while still preventing anonymous AI-processing cost leakage. The owner creates a free account first, then sees the prepared source before choosing how far to continue.

## Architecture Summary

- **Zero new backend infrastructure** — reuses existing AI extraction pipeline, menu rendering, and auth flow
- **One new public page** — `src/app/(website)/create-menu/page.tsx`
- **One API route** — `/api/public/create-menu` (POST requires auth for upload + extraction; GET polls token-based preview status)
- **Temporary storage** — extracted data stored in `publicMenuDrafts` collection with 24h TTL
- **Conversion flow** — authenticated draft is converted to real project via existing project/store creation path

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

1. **Free account before upload** — value shown before payment, without spending AI processing on anonymous uploads
2. **24-hour TTL on drafts** — unclaimed drafts auto-deleted (cost control)
3. **Rate limiting by IP** — 3 extractions per IP per day (abuse prevention)
4. **Reuses existing extraction pipeline** — same shared extraction/client patterns as the current implementation
5. **Preview uses existing menu renderer** — same B2C view components
6. **Feature-flagged** — `ENABLE_PUBLIC_MENU_ENTRY` controls entire flow
7. **Mobile-first design** — SMB owners will use this from phone

## Related Features

- `__docs__/marketing/menulist-growth-and-funnel-strategy.md` — controlled free-preview and distribution strategy
- `__docs__/messaging-onboarding/` — WhatsApp onboarding (complementary channel)
- `__docs__/official-business-page/` — OBP created on publish
- Menu extraction pipeline: `src/lib/firebase/menuProcessing.ts`
- Menu rendering: `src/app/_client/[[...slug]]/page.tsx`

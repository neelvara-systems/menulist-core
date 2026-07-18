# Public Menu Entry — Controlled Free Preview Pipeline

**Version:** 1.0
**Status:** Source-implemented funnel — not current launch or deploy certification
**Feature Flag:** `ENABLE_PUBLIC_MENU_ENTRY`
**Last Updated:** July 10, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document is source-gated Public Menu Entry evidence only. The `/create-menu` page is public, but source submission, acquisition, extraction, preview polling, claim, and publish require a signed-in owner. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:public-business-truth`, `npm run verify:auth-security-failure-matrix`, signed-in desktop/mobile browser QA, physical-device camera/link/preview/claim QA, Gemini extraction provider smoke, Razorpay sandbox evidence where conversion is in scope, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

---

## What Is This?

A public-facing page at `/create-menu` that lets any business owner start the setup flow, sign in, upload a current menu image or paste a permission-confirmed public menu link, and see a structured owner-review preview. The public marketing promise is **free first setup preview, review before publishing**, not an anonymous free AI utility.

**Core loop:** Open `/create-menu` → sign in → upload/paste source → extraction → owner-bound preview → official source setup

## Why This Matters

MenuList's long-term asset is **canonical public business pages**. This feature removes payment friction while preventing broad AI-processing cost leakage through authentication, user-keyed rate limits, active draft reuse, source dedupe, SAFE_MODE, file validation, and TTL cleanup. The owner sees the prepared source before choosing how far to continue.

## Architecture Summary

- **Zero new backend infrastructure** — reuses existing AI extraction pipeline, menu rendering, and auth flow
- **One new public page** — `src/app/(website)/create-menu/page.tsx`
- **One API route** — `/api/public/create-menu` (POST and GET are authenticated, owner-bound, rate-limited, and reusable for photo/link source + extraction status)
- **Temporary storage** — extracted data stored in `publicMenuDrafts` collection with 24h TTL
- **Conversion flow** — preview draft is converted after authenticated claim; existing accounts are rechecked for store/tenant eligibility before public truth writes

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
| `public-menu-entry_verification.md` | Engineering/Ops | Historical source/local/QA evidence and remaining external certification gates |

## Key Decisions

1. **Sign in before source processing** — value shown before payment, while expensive extraction stays attached to an owner identity
2. **24-hour TTL on drafts** — unclaimed drafts auto-deleted (cost control)
3. **Rate limiting by owner** — 5 new extractions per user per day across photo and link inputs, with active draft reuse and source dedupe
4. **Reuses existing extraction pipeline** — same shared extraction/client patterns as the current implementation
5. **Preview uses existing menu renderer** — same B2C view components
6. **Feature-flagged** — `ENABLE_PUBLIC_MENU_ENTRY` controls the public flow; `ENABLE_MENU_LINK_IMPORT` additionally gates the public link input
7. **Mobile-first design** — SMB owners will use this from phone
8. **Nested storesSummary writes** — starter claim/payment mirrors store plan fields into the scheduler-readable `stores.{storeId}` map, not only flat dot-notation keys
9. **Existing-account claims fail closed** — claim writes only proceed when the session store exists, belongs to the session tenant, and the store/tenant are not inactive, deleted, or platform-blocked

## Related Features

- `__docs__/marketing/menulist-growth-and-funnel-strategy.md` — controlled free-preview and distribution strategy
- `__docs__/messaging-onboarding/` — WhatsApp onboarding (complementary channel)
- `__docs__/official-business-page/` — OBP created on publish
- Menu extraction pipeline: `src/lib/firebase/menuProcessing.ts`
- Menu rendering: `src/app/_client/[[...slug]]/page.tsx`

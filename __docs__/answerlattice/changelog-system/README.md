# Changelog System — Feature Documentation

> **Status:** DOCUMENTED (Forensic Audit)
> **Last Updated:** 2026-03-02
> **Parent Feature:** Help Center
> **Audit Type:** Codebase-first, every file read

---

## What Is This

The Changelog System is MenuList's **release notes infrastructure** — a paginated, tenant-scoped system where platform administrators create rich changelog entries (with TipTap content, tags, file attachments, YouTube embeds, and KB article references), and SMB owners browse them in a timeline view with search, tag filtering, infinite scroll, and feedback (likes/dislikes/comments).

---

## Document Index

| # | Document | Audience | Purpose |
|---|----------|----------|---------|
| 1 | **README.md** (this file) | Everyone | Master index |
| 2 | `changelog-system_spec.md` | CEO/PM | Business requirements |
| 3 | `changelog-system_impl.md` | Developers | Technical blueprint |
| 4 | `changelog-system_firebase.md` | Developers/Ops | Firestore operations, cost |
| 5 | `changelog-system_marketing.md` | Sales/Marketing | Pitch points |
| 6 | `changelog-system_website.md` | Public | Landing page content |
| 7 | `changelog-system_helpdoc.md` | End users | Customer help article |
| 8 | `changelog-system_mobile-support.md` | Mobile team | Mobile assessment |

---

## Key Files

### Owner-Side
- `src/components/templates/main-app/helpCenter/ChangelogView.tsx` — Owner wrapper (39 lines)
- `src/components/templates/main-app/helpCenter/landing/WhatsNew.tsx` — Landing page widget

### Platform Admin
- `src/components/templates/platform/changelog/displayChangelog.tsx` — Timeline display (282 lines)
- `src/components/templates/platform/changelog/addEditChangelog.tsx` — Create/edit drawer (333 lines)
- `src/components/templates/platform/changelog/ChangelogPreview.tsx` — Entry preview renderer
- `src/components/templates/platform/changelog/ChangelogTagRenderer.tsx` — Tag display component

### Database Layer
- `src/database/changelog/index.ts` — 6 DAL functions (317 lines)
- `src/database/changelog/feedback.ts` — Changelog feedback
- `src/database/contentFeedback/index.ts` — Content feedback (shared with articles)

### Types & Constants
- `src/types/changelog.ts` — ChangelogEntry, ChangelogPage (35 lines)
- `src/constants/changelog.ts` — Tag options, tag config with icons/colors

### Hooks
- `src/hooks/useChangelogCache.ts` — Cache management

---

## Architecture: Paginated Document Model

Changelog entries are stored in **page documents** within a tenant+store-scoped subcollection:
- Path: `changelog/{tId}/{sId}/page_XXXXXX`
- Each page holds multiple entries as an array
- Pages have a ~900KB size limit with automatic rollover
- Linked list: each page has `nextPageId` for older page navigation
- All mutations use Firestore transactions for atomicity

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-02 | 1.0.0 | Initial forensic documentation — 8 component files, 6 DAL functions |

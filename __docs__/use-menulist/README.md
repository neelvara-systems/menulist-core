# Use MenuList — Output Center

> **Status:** v1.0 — READY FOR IMPLEMENTATION
> **Feature Flag:** `ENABLE_USE_MENULIST`
> **Route:** `/use-menulist`
> **Mobile:** `/use-menulist` (responsive, mobile-first priority)

## What It Is

A unified output hub where restaurant owners get every usable output from MenuList in one place — links to share, screen URLs to display, and print-ready assets to deploy in the restaurant.

**Not** a dashboard. **Not** a settings page. **Not** a marketing tool.
It answers one question: *"Where do I get the things I need to use or share my menu?"*

## Why It Matters

MenuList already generates multiple outputs scattered across the product:
- Menu link (in Share Modal)
- Screen link (in Settings > Digital Screen)
- QR codes (in Share Modal / Menu Kit)
- Feedback QR (in Feedback Settings)
- Print Menu / Menu Card Export (successor to Menu PDF)
- Menu Kit ZIP (in Share Modal)

Owners miss half of them. This page aggregates everything into one operational hub.

## Architecture Principle

**Hub remains a UI aggregation layer.** Use MenuList should not absorb complex workflows. It links to existing outputs and to routed child workflows such as Menu Card Export.

The hub itself should add zero new backend logic, zero new collections, and zero Firebase cost. Routed child features may own their own APIs, records, and cost docs.

## Page Structure

```
Quick Actions (top — daily use)
  Copy Menu Link | Open Menu | Copy Screen Link | Download Menu Kit

Share Your Menu (links)
  Official Page Link
  Direct Menu Link

Digital Screens (display)
  Menu Board Link
  Highlights Link

Print for Your Restaurant (assets)
  Table Tent | Counter Sticker | Entrance Poster | Feedback QR | Print Menu

Resources (guides)
  Setup Guide | Printing Guide | Sharing Guide
```

## Key Files

| File | Purpose |
|------|---------|
| `src/app/(main)/use-menulist/page.tsx` | Page route |
| `src/components/templates/main-app/useMenuList/index.tsx` | Main component |
| `src/components/templates/main-app/useMenuList/QuickActions.tsx` | Quick action buttons |
| `src/components/templates/main-app/useMenuList/ShareSection.tsx` | Share links |
| `src/components/templates/main-app/useMenuList/ScreensSection.tsx` | Screen links |
| `src/components/templates/main-app/useMenuList/PrintSection.tsx` | Print assets |
| `src/components/templates/main-app/useMenuList/ResourcesSection.tsx` | Micro-guides |
| `src/components/templates/main-app/useMenuList/types.ts` | Types |

## Existing Infrastructure Reused

| System | File | Reused For |
|--------|------|-----------|
| URL Generation | `src/lib/utils/slugify.ts` | Menu link construction |
| OBP URL | `src/lib/obp/generateOBPUrl.ts` | Official Page link |
| Screen URL | `src/lib/screen/utils.ts` | Screen link construction |
| Feedback QR | `src/lib/utils/feedbackQrCode.ts` | Feedback QR generation |
| Menu Kit | `src/lib/menu-kit/menuKitGenerator.ts` | ZIP bundle generation |
| Menu Card Export | `__docs__/menu-card-export/` | Routed print workflow |
| Menu PDF | `src/lib/export/menuPdfGenerator.ts` | Legacy lightweight PDF generation while migration is active |
| Screen State DAL | `src/database/campaigns/index.ts` | Screen token retrieval |

## Documents

| Doc | Audience |
|-----|----------|
| [use-menulist_spec.md](./use-menulist_spec.md) | Product/Business |
| [use-menulist_impl.md](./use-menulist_impl.md) | Engineering |
| [use-menulist_firebase.md](./use-menulist_firebase.md) | Engineering |
| [use-menulist_marketing.md](./use-menulist_marketing.md) | Marketing |
| [use-menulist_website.md](./use-menulist_website.md) | Website |
| [use-menulist_helpdoc.md](./use-menulist_helpdoc.md) | Help Center |
| [use-menulist_mobile-support.md](./use-menulist_mobile-support.md) | Mobile |
| [_archive/chatgpt-review.md](./_archive/chatgpt-review.md) | Archive |

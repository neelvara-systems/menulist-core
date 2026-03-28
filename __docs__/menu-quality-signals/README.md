# Menu Quality Signals

> **Status:** ✅ IMPLEMENTED — Feature flag OFF by default
> **Feature Flag:** `ENABLE_MENU_QUALITY_SIGNALS`
> **Route:** Dashboard panel on owner dashboard (`/dashboard`)
> **Mobile:** Panel on MobileMenuScreen
> **Source:** ChatGPT Owner Features Session (March 15, 2026) → Cascade Review

## What It Is

A gentle quality nudge panel that surfaces actionable improvement signals about the owner's menu — descriptions missing, images missing, category balance, pricing consistency — and connects each signal directly to the existing AI feature that fixes it.

**Not** analytics. **Not** a score. **Not** criticism. Just simple signals like "5 items missing descriptions" with a button to generate them.

## Why It Matters

MCE (Menu Correctness Engine) exists but operates silently — it stamps `_mce` metadata and blocks publishing only on critical errors. Owners never see the quality data. Meanwhile, MenuList already has AI descriptions, AI images, and AI translations — but owners don't know when to use them. Menu Quality Signals bridges the gap: it reads MCE data and surfaces improvement opportunities that connect directly to existing AI features.

## Architecture Principle

**Pure read layer.** Reads existing `_mce` metadata from the project document + basic item counting. Zero new collections. Zero new API routes. Connects to existing AI features (description generator, image generator) as action buttons.

## Signal Types (v1.1 — 5 signals)

| Signal               | Source                                              | Action Button                               |
| -------------------- | --------------------------------------------------- | ------------------------------------------- |
| Descriptions missing | Count items without `description` in primary lang   | "Generate" → opens AI description generator |
| Images missing       | Count items without `images` array                  | "Generate" → opens AI image generator       |
| Pricing gaps         | Count items without `price` (skips variant items)   | "Review" → opens editor                     |
| Hidden items         | Count items with `active: false`                    | "Review" → opens editor                     |
| Price outliers       | Median-based detection within categories (≥4 items) | "Review" → opens editor                     |

## Three Surfaces

| Surface           | Location                       | Trigger                                                     |
| ----------------- | ------------------------------ | ----------------------------------------------------------- |
| Dashboard Panel   | OwnerDashboard below hero card | All signals, capped at 4 warnings                           |
| Editor Banner     | Top of editor view             | Actionable signals only (desc≥3, img≥3, price≥1, outlier≥1) |
| Publish Intercept | onContinueClick in Editor.tsx  | Actionable signals, soft modal with "Publish Anyway"        |

## Key Files

| File                                                                            | Purpose                                  |
| ------------------------------------------------------------------------------- | ---------------------------------------- |
| `src/lib/mce/qualitySignals.ts`                                                 | Signal computation (5 signals + helpers) |
| `src/components/templates/main-app/dashboard/MenuQualitySignals.tsx`            | Dashboard panel component                |
| `src/components/templates/main-app/projects/editorView/EditorQualityBanner.tsx` | Editor banner (closable)                 |
| `src/components/mobile/components/MenuQualitySignals.tsx`                       | Mobile version                           |
| `src/components/templates/main-app/projects/editorView/Editor.tsx`              | Publish intercept (in onContinueClick)   |

## Documents

| Doc                                                                                | Audience         |
| ---------------------------------------------------------------------------------- | ---------------- |
| [menu-quality-signals_spec.md](./menu-quality-signals_spec.md)                     | Product/Business |
| [menu-quality-signals_impl.md](./menu-quality-signals_impl.md)                     | Engineering      |
| [menu-quality-signals_firebase.md](./menu-quality-signals_firebase.md)             | Engineering      |
| [menu-quality-signals_marketing.md](./menu-quality-signals_marketing.md)           | Marketing        |
| [menu-quality-signals_website.md](./menu-quality-signals_website.md)               | Website          |
| [menu-quality-signals_helpdoc.md](./menu-quality-signals_helpdoc.md)               | Help Center      |
| [menu-quality-signals_mobile-support.md](./menu-quality-signals_mobile-support.md) | Mobile           |

## Existing Infrastructure Reused

| System            | File                                          | Reused For                    |
| ----------------- | --------------------------------------------- | ----------------------------- |
| AI Descriptions   | `src/app/api/descriptions/route.ts`           | Action: generate descriptions |
| AI Images         | `src/app/api/image-generation/route.ts`       | Action: generate images       |
| Project data      | `src/database/projects/index.ts`              | Read item counts              |
| Editor navigation | `src/components/templates/main-app/projects/` | Action: open editor           |

---

**Created:** March 15, 2026
**Last Updated:** March 16, 2026 — v1.1 (ChatGPT review applied)

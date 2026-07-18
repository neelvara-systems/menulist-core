# Menu Quality Signals

> **Status:** ✅ IMPLEMENTED — Feature flag ON in current config
> **Feature Flag:** `ENABLE_MENU_QUALITY_SIGNALS`
> **Route:** Dashboard panel on owner dashboard (`/dashboard`)
> **Mobile:** Panel on MobileMenuScreen
> **Owner-facing name:** Menu Check
> **Source:** ChatGPT Owner Features Session (March 15, 2026) → Cascade Review

## What It Is

A gentle menu check panel that surfaces actionable improvement signals about the owner's menu — descriptions missing, images missing, category icons, pricing consistency, and language gaps — and connects each signal to the existing repair or review path.

**Not** analytics. **Not** a score. **Not** criticism. Just simple signals like "5 items missing descriptions" with a button to generate them.

## Why It Matters

MCE (Menu Correctness Engine) supplies the critical editor validation gate and standalone project stamps. Menu Quality Signals is a separate advisory layer: it computes improvement opportunities directly from the current project and connects them to existing repair and review paths.

## Architecture Principle

**Pure read-and-compute layer.** Reads the current project files, languages, public-content fields, and design visibility already loaded by each surface. It does not read `_mce`. Zero new collections and zero new API routes.

## Signal Types (v1.2 — 8 signals)

| Signal                     | Source                                               | Action Button                           |
| -------------------------- | ---------------------------------------------------- | --------------------------------------- |
| Descriptions missing       | Count visible items without descriptions             | "Repair Menu" → opens Command Center repair |
| Images missing             | Count visible items without public menu images       | "Generate" → opens no-image editor filter |
| Category icons missing     | Count visible categories without icons               | "Repair Menu" → opens Command Center repair |
| Pricing gaps               | Count visible non-variant items without prices       | "Review" → opens no-price editor filter |
| Hidden items               | Count items with `active: false`                     | "Review" → opens hidden-items filter |
| Price outliers             | Median-based detection within categories (≥4 items)  | "Review" → opens editor review context |
| Item translations missing  | Count visible items incomplete in selected languages | "Repair Menu" → opens Command Center repair |
| Project details missing    | Count project public-content translation gaps        | "Repair Menu" → opens Command Center repair |

## Four Surfaces

| Surface           | Location                       | Trigger                                                     |
| ----------------- | ------------------------------ | ----------------------------------------------------------- |
| Dashboard Panel   | OwnerDashboard overview below hero card | All signals, capped at 4 warnings                           |
| Editor Banner     | Top of editor view                      | Actionable signals only (desc≥3, img≥3, price≥1, outlier≥1) |
| Publish Intercept | onContinueClick in Editor.tsx           | Actionable signals, soft modal with "Publish Anyway"        |
| Mobile Menu Check | `MobileMenuScreen` inside `MobileShell`  | Current project signals with repair and exact review filters |

## Key Files

| File                                                                            | Purpose                                  |
| ------------------------------------------------------------------------------- | ---------------------------------------- |
| `src/lib/mce/qualitySignals.ts`                                                 | Signal computation (8 signals + helpers) |
| `src/components/templates/main-app/dashboard/MenuQualitySignals.tsx`            | Dashboard panel component                |
| `src/components/templates/main-app/projects/editorView/EditorQualityBanner.tsx` | Editor banner (closable)                 |
| `src/components/templates/main-app/projects/editorView/EditorFiltersPopover.tsx` | Editor filters, including no-price review |
| `src/components/mobile/components/MenuQualitySignals.tsx`                       | Mobile version                           |
| `src/components/templates/main-app/projects/editorView/Editor.tsx`              | Publish intercept (in onContinueClick)   |

## June 1, 2026 Action Routing Update

The desktop dashboard panel is mounted in the owner dashboard overview below the hero card, including the no-analytics state when a project is selected. Dashboard quality actions hand off to `/projects` with a short-lived pending action in `sessionStorage`. The editor selects the matching project and opens the relevant context: repair flow for descriptions/project details/category icons, no-image or no-price filters for manual review, language management for translation gaps, hidden-item review, and price review. The editor banner now uses the same quality-action router.

## June 1, 2026 Owner Polish Update

Owner-facing UI now says **Menu Check** instead of **Menu Quality**. Dashboard, editor, and mobile surfaces show one primary action first. If repairable gaps exist, the primary action opens Repair Menu; otherwise it opens the highest-priority manual review path. The all-clear state reads "No action needed" / "Your public menu is ready." Mobile also shows "Checked just now" so owners know the check reflects current menu data.

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
**Last Updated:** July 16, 2026 — v1.4 (false-positive and flow audit)

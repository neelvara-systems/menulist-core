# Menu Quality Signals — Spec

> **Version:** 1.2
> **Last Updated:** June 1, 2026
> **Audience:** CEO, PM, Business stakeholders

---

## 1. Executive Summary

**What:** A small owner-facing Menu Check panel showing simple, actionable signals about the owner's menu — items missing descriptions, images, prices, icons, language text, or review — with one primary action.

**Why:** MenuList already has Repair Menu, AI description generation, image workflows, language repair, and a validation engine (MCE). But owners don't know when to use them. Menu Check surfaces the need ("5 items missing descriptions") and opens the safest path first: Repair Menu for fixable gaps, review filters for facts the owner must confirm.

**For Whom:** All MenuList business owners with a published menu.

**Success Metric:** Owners who see Menu Check use Repair Menu and issue filters more often than owners who do not see it.

---

## 2. Goals

1. Surface menu quality gaps as simple, non-judgmental signals
2. Connect each signal directly to the existing repair or review path
3. Encourage continuous menu improvement without creating anxiety
4. Never show more than 4 warning rows and one primary action (avoid overwhelming the owner)

## 3. Non-Goals (Out of Scope)

- ❌ Quality scores or letter grades (A/B/C/D)
- ❌ Competitive benchmarking ("Your menu is worse than 60% of restaurants")
- ❌ Analytics or trends ("Your quality improved this month")
- ❌ Mandatory fixes or blocking actions
- ❌ Complex category restructuring suggestions
- ❌ Nutritional or allergen analysis

---

## 4. Target Users

**ICP:** Non-tech SMB owner who uploaded a menu and wants to make it better but doesn't know where to start.
**Moment:** Owner opens dashboard and sees "5 items missing descriptions" → taps "Repair Menu" → descriptions are generated → signal disappears.
**Tone:** Helpful suggestions, not criticism. "Add descriptions to help customers understand your dishes" — not "Your menu quality is low."

---

## 5. Signal Definitions (v1.2)

### Signal 1: Description Coverage

- **Trigger:** Any item in the active project lacks a `description` field (empty or undefined)
- **Display:** "X items missing descriptions"
- **Action:** "Repair Menu" → opens Command Center repair / mobile Repair Menu
- **Resolution:** Signal disappears when all items have descriptions
- **Priority:** High (descriptions are the #1 quality factor for digital menus)

### Signal 2: Image Coverage

- **Trigger:** Any item lacks an `imageUrl` field
- **Display:** "X items missing images"
- **Action:** "Review" → filters no-image items for owner review
- **Resolution:** Signal disappears when all items have images
- **Priority:** High (images drive ordering decisions)

### Signal 3: Category Icon Coverage

- **Trigger:** Any active category has no icon while category icons are enabled
- **Display:** "X categories missing icons"
- **Help text:** "Icons make categories easier to scan on your menu"
- **Action:** "Repair Menu" → adds safe suggested category icons
- **Resolution:** Signal disappears when active categories have icons
- **Priority:** High (helps mobile scanning)

### Signal 4: Pricing Gaps

- **Trigger:** Any item lacks a `price` field or has empty price
- **Display:** "X items missing prices"
- **Action:** "Review in Editor" → opens editor with price column visible
- **Resolution:** Signal disappears when all items have prices
- **Design override:** If `project.config.design.menu.showItemPrices === false`, pricing-gap and price-outlier signals are hidden because prices are intentionally not public on the menu.
- **Priority:** Medium (some items legitimately have no price, e.g., "Ask")

### Signal 5: Hidden Items

- **Trigger:** Any item has `active: false` (invisible to customers)
- **Display:** "X items are hidden from customers"
- **Help text:** "These items won't appear on your public menu"
- **Action:** "Review" → opens editor
- **Resolution:** Signal disappears when no items are hidden
- **Priority:** Medium (operational awareness — owner may have forgotten)

### Signal 6: Price Outliers

- **Trigger:** An item's price deviates significantly from the median price of its category (< 35% or > 300% of median). Only evaluated when category has ≥ 4 priced items. Items with variants (attributes) are excluded.
- **Display:** "X prices look unusual"
- **Help text:** "A price may be significantly different from similar items"
- **Action:** "Review" → opens editor
- **Resolution:** Signal disappears when prices are corrected
- **Priority:** Medium (catches OCR errors, typos like 299→29)

### Signal 7: Item Translation Gaps

- **Trigger:** Visible menu item name, description, or attribute text exists in the primary language but is missing in another selected menu language
- **Display:** "X items missing translations"
- **Action:** "Repair Menu" → repairs language gaps
- **Resolution:** Signal disappears when selected menu languages have required item text

### Signal 8: Project Detail Translation Gaps

- **Trigger:** Project name, description, or notes exist in the primary language but are missing in another selected menu language
- **Display:** "X project details missing translations"
- **Action:** "Repair Menu" → repairs project public-content translations
- **Resolution:** Signal disappears when selected menu languages have project public content

---

## 6. UI Design

### 6.1 Surface #1: Dashboard Panel (Awareness)

Compact card on the owner dashboard, below the hero status card. Max 4 warning signals shown.

```
┌─────────────────────────────────────────────────────┐
│ Menu Check                                          │
│ Checked just now                                    │
│                                                     │
│ Repair what can be fixed now        [Repair Menu]  │
│ 5 items missing descriptions                        │
│                                                     │
│ ⚠ 5 items missing descriptions           [Repair]  │
│   Customers understand offerings better with details│
│ ⚠ 12 items missing images                [Review]  │
│   Customers choose faster when they see the item    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 6.2 Surface #2: Editor Banner (Action Context)

Lightweight closable alert banner at the top of the editor. Only shows when actionable signals meet thresholds (descriptions ≥ 3, images ≥ 3, prices ≥ 1, outliers ≥ 1).

```
ℹ Menu Check: 8 items missing descriptions · 5 items missing images  [Repair Menu]
```

### 6.3 Surface #3: Publish Intercept (Highest Leverage)

Soft modal shown before publishing when actionable signals exist. **Never blocks publishing.** Owner can always click "Publish Anyway".

```
┌──────────────────────────────────────┐
│ Before publishing                    │
│                                      │
│ • 8 items missing descriptions       │
│   Customers understand offerings...  │
│ • 5 items missing images             │
│   Customers choose faster...         │
│                                      │
│ [Go Back]           [Publish Anyway] │
└──────────────────────────────────────┘
```

### 6.4 All Clear State

When all signals are resolved:

```
┌─────────────────────────────────────────────┐
│ Menu Check                                  │
│                                             │
│ ✓ No action needed                          │
│   Your public menu is ready                 │
│                                             │
└─────────────────────────────────────────────┘
```

### 6.5 No Menu State

If no project exists or menu is not published:

```
(Panel not shown)
```

---

## 7. Data Source

All signals are computed from the active project document — specifically the `extractedData` array of categories and items. No new collections. MCE `_mce` metadata can be used for duplicate detection but is not required for v1 (simple counting suffices for signals 1-4).

---

## 8. Risks & Open Questions

1. **False positives for images/descriptions** — Some menus intentionally skip descriptions (e.g., simple price list). Signals should feel like suggestions, not errors.
2. **Price outlier false positives** — Category median comparison may flag intentionally cheap items (e.g., "Water" in a restaurant). Kept as soft suggestion. Mobile already supports marking a flagged price reviewed while unchanged.
3. **Dashboard space** — Capped at max 4 warning signals. Editor banner is closable.

---

## 9. Success Criteria

- Owner sees quality signals within 2 seconds of dashboard load
- One primary action appears before the issue list
- Repairable issues route to Repair Menu
- Manual issues route to filtered review
- "All clear" state shows "No action needed" when menu is complete
- Zero new Firebase collections
- Zero new API routes
- Feature flag is enabled in current config

---

**Document Signature:** Product Specification
**Created:** March 15, 2026
**Updated:** June 1, 2026 — owner-facing Menu Check polish and Repair Menu-first routing

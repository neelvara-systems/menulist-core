# Menu Quality Signals — Spec

> **Version:** 1.1
> **Last Updated:** March 16, 2026
> **Audience:** CEO, PM, Business stakeholders

---

## 1. Executive Summary

**What:** A small dashboard panel showing simple, actionable quality signals about the owner's menu — items missing descriptions, items missing images, category issues — with one-tap access to the AI features that fix them.

**Why:** MenuList already has AI description generation, AI image generation, and a validation engine (MCE). But owners don't know when to use them. Menu Quality Signals surfaces the need ("5 items missing descriptions") and connects it to the solution ("Generate Descriptions" button). This gently drives menu improvement without overwhelming owners.

**For Whom:** All MenuList business owners with a published menu.

**Success Metric:** Owners who see quality signals use AI description/image generation 2x more than those who don't.

---

## 2. Goals

1. Surface menu quality gaps as simple, non-judgmental signals
2. Connect each signal directly to the existing AI feature that solves it
3. Encourage continuous menu improvement without creating anxiety
4. Never exceed 5 signals (avoid overwhelming the owner)

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
**Moment:** Owner opens dashboard and sees "5 items missing descriptions" → taps "Generate" → AI writes descriptions → signal disappears.
**Tone:** Helpful suggestions, not criticism. "Add descriptions to help customers understand your dishes" — not "Your menu quality is low."

---

## 5. Signal Definitions (v1 — Max 5)

### Signal 1: Description Coverage

- **Trigger:** Any item in the active project lacks a `description` field (empty or undefined)
- **Display:** "X items missing descriptions"
- **Action:** "Generate Descriptions" → navigates to AI Description Generator in editor
- **Resolution:** Signal disappears when all items have descriptions
- **Priority:** High (descriptions are the #1 quality factor for digital menus)

### Signal 2: Image Coverage

- **Trigger:** Any item lacks an `imageUrl` field
- **Display:** "X items missing images"
- **Action:** "Generate Images" → navigates to AI Image Generator in editor
- **Resolution:** Signal disappears when all items have images
- **Priority:** High (images drive ordering decisions)

### Signal 3: Pricing Gaps

- **Trigger:** Any item lacks a `price` field or has empty price
- **Display:** "X items missing prices"
- **Action:** "Review in Editor" → opens editor with price column visible
- **Resolution:** Signal disappears when all items have prices
- **Priority:** Medium (some items legitimately have no price, e.g., "Ask")

### Signal 4: Hidden Items

- **Trigger:** Any item has `active: false` (invisible to customers)
- **Display:** "X items are hidden from customers"
- **Help text:** "These items won't appear on your public menu"
- **Action:** "Review" → opens editor
- **Resolution:** Signal disappears when no items are hidden
- **Priority:** Medium (operational awareness — owner may have forgotten)

### Signal 5: Price Outliers

- **Trigger:** An item's price deviates significantly from the median price of its category (< 35% or > 300% of median). Only evaluated when category has ≥ 4 priced items. Items with variants (attributes) are excluded.
- **Display:** "X prices look unusual"
- **Help text:** "A price may be significantly different from similar items"
- **Action:** "Review" → opens editor
- **Resolution:** Signal disappears when prices are corrected
- **Priority:** Medium (catches OCR errors, typos like 299→29)

---

## 6. UI Design

### 6.1 Surface #1: Dashboard Panel (Awareness)

Compact card on the owner dashboard, below the hero status card. Max 4 warning signals shown.

```
┌─────────────────────────────────────────────────────┐
│ Menu Quality                                        │
│                                                     │
│ ⚠ 5 items missing descriptions          [Generate] │
│   Customers understand offerings better with details│
│ ⚠ 12 items missing images               [Generate] │
│   Customers choose faster when they see the item    │
│ ✓ All items have prices                             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 6.2 Surface #2: Editor Banner (Action Context)

Lightweight closable alert banner at the top of the editor. Only shows when actionable signals meet thresholds (descriptions ≥ 3, images ≥ 3, prices ≥ 1, outliers ≥ 1).

```
ℹ 8 items missing descriptions · 5 items missing images  [Generate Descriptions] [Generate Images]
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
│ Menu Quality                                │
│                                             │
│ ✓ Your menu looks great                     │
│   Descriptions, images, prices — all set    │
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
2. **Price outlier false positives** — Category median comparison may flag intentionally cheap items (e.g., "Water" in a restaurant). Kept as soft suggestion.
3. **Dashboard space** — Capped at max 4 warning signals. Editor banner is closable.

---

## 9. Success Criteria

- Owner sees quality signals within 2 seconds of dashboard load
- Each signal has a clear action button
- Tapping action button navigates to the correct feature
- "All clear" state shows when menu is complete
- Zero new Firebase collections
- Zero new API routes
- Feature flag OFF by default

---

**Document Signature:** Product Specification
**Created:** March 15, 2026

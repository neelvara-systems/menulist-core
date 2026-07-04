# Auto-Sell Features — Specification

**Sub-Feature of:** Client Menu  
**Document Type:** Product Specification  
**Status:** ✅ Implemented (Features 1-3)  
**Last Updated:** January 12, 2026

---

## Executive Summary

Auto-Sell Features make the digital menu **visibly different** from paper and static QR menus, creating word-of-mouth distribution without owner effort.

### Core Philosophy

> "Currently it's just an ordinary menu for end users."

**The fix:** Add **visible behaviors** that customers notice and talk about.

---

## The Auto-Sell Ladder

| #   | Feature               | Customer Sees                | Effect       | Status    |
| --- | --------------------- | ---------------------------- | ------------ | --------- |
| 1   | Live Indicator        | "🟢 Live · updated just now" | **Trust**    | ✅ Done   |
| 2   | Availability State    | Item fades after public menu refresh | **Trust** | ✅ Done   |
| 3   | Time-Based Categories | "Lunch starts in 12 min"     | **Stories**  | ✅ Done   |
| 4   | Menu-as-Marketing     | Tasteful branding            | Distribution | 🔮 Future |

---

## Feature #1: Live Indicator

### Purpose

Creates **trust** by showing customers the menu is current and actively maintained.

### What Customers See

At the top of the menu:

```
🟢 Live menu · updated just now
```

### Timestamp Decay Rule

| Time Since Update | Display                              |
| ----------------- | ------------------------------------ |
| < 1 minute        | "🟢 Live · updated just now"         |
| 1-59 minutes      | "🟢 Live · updated X minutes ago"    |
| Same day          | "🟢 Live · updated today at 3:40 PM" |
| 1-3 days          | "🟢 Live · updated 2 days ago"       |
| > 3 days          | "🟢 Live" (no time)                  |

**Why:** Scarcity creates meaning. If every menu shows "updated just now," it becomes noise.

### Visual Behavior

- Small dot pulse once on update
- No flashing, no animation loops
- Subtle = premium

### Forbidden Copy

- ❌ "Auto-synced"
- ❌ "Real-time Firestore updates"
- ❌ "Powered by AI"
- ❌ "Dynamic menu"

---

## Feature #2: Availability State

### Purpose

Creates **trust** when customers see unavailable items clearly marked after the public menu refresh, breaking paper menu expectations without promising instant customer freshness.

### What Customers See

- Item fades to ~40% opacity
- Shows label: "Sold out"
- Uses the loaded public menu data
- Customer-visible freshness follows the current public cache path

### Owner Experience

1. Tap item in editor
2. Toggle: `Available / Unavailable`
3. Done. One tap.

**No:**

- ❌ Reason selection
- ❌ Scheduling
- ❌ Confirmation modal

### Business-Type Labels

| Business Type | Customer Label | Owner Label    |
| ------------- | -------------- | -------------- |
| Food          | "Sold out"     | "Unavailable"  |
| Retail        | "Out of stock" | "Out of stock" |
| Service       | "Unavailable"  | "Unavailable"  |

### Why NOT Add More

| Feature            | Why NOT Build                          |
| ------------------ | -------------------------------------- |
| Inventory counts   | Most restaurants don't track inventory |
| Reason selection   | Slows down the toggle (1 tap → 3 taps) |
| Confirmation modal | Rush hour doesn't wait                 |

---

## Feature #3: Time-Based Categories

### Purpose

Creates **stories** when customers see the menu switch automatically, a behavior paper cannot replicate.

### What Customers See

- Breakfast category visible until 11:00 AM
- At 10:55: "Breakfast ends in 5 minutes"
- At 11:00: Breakfast fades, Lunch appears
- No reload, no owner action

**Customer reaction:** "Oh… it changes by itself."

### Owner Experience

For each category:

1. Toggle: `Show by time`
2. Two inputs: Start time, End time
3. That's all.

### Architecture: Store-Level Presets

Categories reference store-level time slot presets (not inline custom times).

```
Store (timeSlotPresets)          Category (timeSlots)
├── Breakfast (07:00-11:00)  ←── [{ presetId: "1ABC15", ... }]
├── Lunch (11:00-15:00)      ←── [{ presetId: "1DEF15", ... }]
└── Dinner (18:00-22:00)     ←── [{ presetId: "1GHI15", ... }]
```

Categories keep copied start/end times for public rendering, so editing a store-level preset cascades the changed times into assigned categories before public cache is revalidated. Deleting a preset removes its assigned category windows.

### Default Presets by Business Type

| Business Type | Presets                              |
| ------------- | ------------------------------------ |
| Food          | Breakfast, Lunch, Dinner, Late Night |
| Service       | Off-Peak, Regular, Peak              |
| Health        | Morning, Afternoon, Evening          |
| Retail        | Morning, Afternoon, Evening          |

### Excluded Features (v1)

| Feature              | Why NOT Build                              |
| -------------------- | ------------------------------------------ |
| Days of week         | Adds complexity, most menus same every day |
| Item-level schedules | Over-engineering                           |
| Holidays/exceptions  | Edge case, not v1 priority                 |
| Multiple windows     | One window per category is enough          |
| Calendars            | Feature bloat                              |

---

## Validation Framework

Before building any Auto-Sell feature:

| Question                                             | Must Answer  |
| ---------------------------------------------------- | ------------ |
| Does this remove a decision from the user's life?    | YES          |
| Would this still matter if AI models got 10× better? | YES          |
| Can this be explained in one human sentence?         | YES          |
| What would we ruthlessly remove?                     | Clear answer |

**If a feature fails 2+ of these → kill it.**

---

## Staff Outcome (Implicit)

> Staff interacts with the menu 10× more than the owner.

| Before                                  | After                                 |
| --------------------------------------- | ------------------------------------- |
| Constant "is this available?" questions | Customers see availability themselves |
| Apologies for sold-out items            | Menu already shows it                 |
| Explaining menu during rush             | Menu explains itself                  |
| Uncertainty about current menu          | Confidence pointing to live menu      |

**Why this is NOT a feature:** No staff-facing UI needed. Benefit is emergent from customer-facing features.

---

## Success Criteria

After implementing features 1-3:

**Owners can say:**

- "Our menu refreshes from the approved source."
- "Sold out items are clearly marked."
- "Our menu switches automatically by time."

**These sentences are distribution.**

---

## The Final Test

Before shipping each feature:

> "Can a restaurant set this up in under 30 seconds without instructions?"

If YES → Ship  
If NO → Simplify again

---

## What NOT to Build

❌ **Never add:**

- Inventory counts
- Reason selection for unavailability
- AI recommendations on menu (visible)
- Customer profiles
- Analytics dashboards visible to customers
- Personalization (yet)
- Chatbots on menu

**Why:** All invisible to customers = no auto-sell effect.

---

## Related Documents

| Document                             | Purpose             |
| ------------------------------------ | ------------------- |
| `CUSTOMER_MENU_AUTOSELL_FEATURES.md` | Full specification  |
| `CLIENT_MENU_PAGE.md`                | Technical reference |
| `CUSTOMER_UI_ANALYSIS.md`            | UI analysis         |

---

_Document Status: ✅ IMPLEMENTED (Features 1-3)_

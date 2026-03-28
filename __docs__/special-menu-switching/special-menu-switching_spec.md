# Special Menu Switching — Spec

**Status:** 🧊 FROZEN — Structurally Complete, Flag OFF. See `__docs__/constitution/14-feature-lifecycle-doctrine.md`  
**Author:** Cascade (Lead Architect)  
**Date:** February 20, 2026  
**Audience:** CEO, PM, Clients (non-technical)

---

## Executive Summary

**What:** A temporary menu override system that lets business owners activate special menus (festival, seasonal, event, limited-time) without touching their regular menu — with automatic revert.

**Why:** During festivals, events, and seasons, businesses change what they offer. Without this, owners manually edit and rebuild menus, forget to revert, and customers see wrong information. This creates operational chaos during peak revenue days.

**For whom:** Primarily food businesses (restaurants, cafés, bakeries, sweet shops, bars). Secondary: salons, gyms, spas with occasional special packages.

**Impact:** Retention weapon. Businesses depend on MenuList during peak revenue days → switching cost rises → lock-in increases. Makes MenuList a living, time-aware menu system instead of a static page.

---

## Goals & Success Metrics

| Goal                                         | Metric                                              |
| -------------------------------------------- | --------------------------------------------------- |
| Reduce manual menu edits during festivals    | Owners use special menu instead of editing base     |
| Prevent "wrong menu live" incidents          | Zero customer-facing errors during festival periods |
| Increase product stickiness during peak days | Feature adoption during Diwali, Christmas, Ramadan  |
| Auto-revert reliability                      | 100% of special menus revert on schedule            |

---

## Target Customers (Tiered)

### Tier 1 — Must-Have (High Frequency of Menu Changes)

| Segment                  | Why They Need This                                                    |
| ------------------------ | --------------------------------------------------------------------- |
| Restaurants & cafés      | Festival menus, Sunday brunch, IPL night, seasonal dishes             |
| Bakeries & dessert shops | Christmas specials, Valentine boxes, Diwali sweets, rotating desserts |
| Sweet shops (mithai)     | Operate on festival cycles — Diwali boxes, Rakhi combos, Eid sweets   |
| Bars & pubs              | Happy hour menu, match-day specials, ladies night, weekend pricing    |
| Cloud kitchens           | Limited-time combos, seasonal items                                   |

### Tier 2 — Good to Have (Occasional Changes)

| Segment                | Why                                                   |
| ---------------------- | ----------------------------------------------------- |
| Salons & spas          | Wedding packages, festive offers, seasonal treatments |
| Gyms & fitness studios | New year plans, summer packages, bootcamps            |
| Caterers & home chefs  | Weekly rotating menus, event menus                    |

### Not Needed

Hardware stores, medical stores, electronics shops, general retail — their catalog rarely changes temporarily.

---

## Scope

### In-Scope

- Create special menu (uses existing menu editor — zero new UI for menu building)
- Schedule activation and deactivation (date + time)
- Two modes: **Replace** (full menu swap) or **Add Section** (overlay on base menu)
- Multiple scheduled, only **one active at a time**
- Automatic activation at scheduled time
- Automatic revert to base menu when expired
- Business-type-aware behavior (food gets full power, salon gets simpler version)
- Integration with Temp Status Layer (auto-show "Special menu available" banner)
- Works on digital menu, OBP, screens, PDF — all surfaces automatically
- MCE validation on special menu before activation
- Mobile support for creating and managing special menus

### Out-of-Scope

- Discounts or coupon engine
- Marketing campaign manager
- Push notifications to customers
- Promotional badges or banners (beyond temp status)
- Offer builder or pricing rules
- Customer analytics for special menus
- Recurring schedules (e.g., "every Sunday brunch") — deferred, can add later
- Multiple simultaneous active special menus

---

## Core Use Cases

### Use Case 1: Diwali Special Menu (Replace Mode)

> Owner creates a Diwali menu with 12 sweets + gift packs. Sets it to run Oct 20–Oct 25. During those 5 days, customers see only the Diwali menu. On Oct 26, regular menu automatically returns.

### Use Case 2: Sunday Brunch (Overlay Mode)

> Café owner adds a "Sunday Brunch" section with different items and pricing. Sets it for this Sunday 8am–2pm. Customers see regular menu + brunch section on top. After 2pm, brunch section disappears.

### Use Case 3: IPL Night Menu (Replace Mode)

> Bar owner creates a snacks-only menu with beer combos for IPL match evening. Sets it for 6pm–midnight. Only IPL menu visible during that window.

### Use Case 4: Seasonal Menu (Replace Mode)

> Restaurant adds a mango menu for April–June. Three months later, it auto-expires. Owner plans Monsoon menu in advance while mango menu is still active.

### Use Case 5: Wedding Package (Overlay Mode)

> Salon owner adds a "Wedding Packages" section for Feb–March. Normal services visible + wedding section on top. After March, section disappears.

---

## How It Works (Owner Flow)

### Step 1: Create Special Menu

Owner goes to their menu list and clicks **"Create Special Menu"**.

System creates a new menu (project) pre-filled with their current base menu (duplicate). Owner can then:

- Remove items they don't want
- Add new festival/special items
- Change prices
- Rearrange categories

Uses the **exact same editor** they already know.

### Step 2: Choose Mode

- **Replace my regular menu** — Only special menu visible to customers
- **Add as special section** — Special items appear alongside regular menu

(For non-food businesses like salons, only "Add as special section" is shown.)

### Step 3: Set Schedule

- **Start date & time** — When to activate
- **End date & time** — When to auto-revert

### Step 4: Done

System handles everything:

- Activates at scheduled time
- Shows "Special menu available" banner (via Temp Status Layer)
- Reverts automatically when expired
- Owner sees clear status: "Diwali Menu — Active until Oct 25"

---

## Behavior by Business Type (Internal — Owner Never Sees This)

| Business Category | Behavior Template | Modes Available   | Scheduling      |
| ----------------- | ----------------- | ----------------- | --------------- |
| Food & Beverage   | **Dynamic**       | Replace + Overlay | Full date/time  |
| Service           | **Occasional**    | Overlay only      | Date range only |
| Retail            | **Minimal**       | Overlay only      | Date range only |
| Health            | **Occasional**    | Overlay only      | Date range only |
| Creative          | **Occasional**    | Overlay only      | Date range only |
| Professional      | **Minimal**       | Overlay only      | Date range only |
| Specialty         | **Occasional**    | Overlay only      | Date range only |

System uses `getBusinessCategory(businessType)` to determine template. **No owner-facing configuration.**

---

## Non-Negotiable Principles (Invariants)

| ID    | Invariant                       | Rationale                                                                   |
| ----- | ------------------------------- | --------------------------------------------------------------------------- |
| INV-1 | Base menu is NEVER modified     | Special menu is a separate project. Base menu remains canonical truth.      |
| INV-2 | Auto-revert guaranteed          | After end time, menu returns to base. No manual action required.            |
| INV-3 | Owner always sees current state | Dashboard shows "Special Menu Active" or "Scheduled for..." clearly.        |
| INV-4 | Zero learning required          | Same editor, same flow. Only new thing = schedule picker.                   |
| INV-5 | One active at a time            | No overlapping active menus. Block at creation time.                        |
| INV-6 | System decides behavior         | Business type determines available modes. No configuration UI.              |
| INV-7 | Not a campaign engine           | No discounts, coupons, notifications, marketing. Pure menu truth switching. |
| INV-8 | All surfaces auto-update        | Digital menu, OBP, screens, PDF — all get resolved menu automatically.      |

---

## Relationship to Existing Features

| Feature                           | Relationship                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Temp Status Layer**             | Complementary. When special menu activates, system auto-sets `special_menu` temp status banner. |
| **MCE (Menu Correctness Engine)** | Special menu validated by MCE before activation — same as regular menu.                         |
| **Decision Blocks**               | Run on active menu (base or special). Seamless.                                                 |
| **Digital Screens**               | Auto-display active menu. No separate config needed.                                            |
| **Multi-Outlet**                  | Each outlet manages own special menus independently.                                            |
| **POS Webhook**                   | Sends resolved menu snapshot (base or special) on activation change.                            |
| **OBP**                           | Shows active menu link. If special menu active, OBP reflects it.                                |

---

## Competitive Analysis

| Competitor           | What They Do                                   | How MenuList Differs                           |
| -------------------- | ---------------------------------------------- | ---------------------------------------------- |
| TouchBistro          | Schedule menus by time/season (POS-integrated) | MenuList is customer-facing truth, not POS     |
| LOOK Digital Signage | Day-parting for menu boards                    | MenuList covers ALL surfaces, not just screens |
| UpMenu               | Quick digital menu creation for specials       | MenuList reuses existing editor — zero new UI  |
| Orders.co            | Real-time menu updates across platforms        | MenuList adds scheduling + auto-revert         |

**MenuList's unique advantage:** Not signage, not POS — **operational menu infrastructure** with automatic lifecycle control across all customer touchpoints.

---

## Requirements

| ID    | Requirement                                        | Priority |
| ----- | -------------------------------------------------- | -------- |
| FR-01 | Create special menu (duplicate from base + edit)   | P0       |
| FR-02 | Schedule activation date/time                      | P0       |
| FR-03 | Schedule deactivation date/time (auto-revert)      | P0       |
| FR-04 | Replace mode (full menu swap)                      | P0       |
| FR-05 | Overlay mode (add section to base)                 | P0       |
| FR-06 | One-active constraint enforcement                  | P0       |
| FR-07 | Feature flag `ENABLE_SPECIAL_MENU_SWITCHING`       | P0       |
| FR-08 | Auto-set temp status banner on activation          | P1       |
| FR-09 | Business-type-aware mode availability              | P1       |
| FR-10 | MCE validation before activation                   | P1       |
| FR-11 | Mobile support for management                      | P1       |
| FR-12 | Clear dashboard status indicator                   | P0       |
| FR-13 | Cancel/delete scheduled special menu               | P0       |
| FR-14 | Edit scheduled (not yet active) special menu       | P0       |
| FR-15 | Manual early deactivation ("End special menu now") | P0       |
| FR-16 | Cache invalidation on activation/deactivation      | P0       |

---

**Last Updated:** February 21, 2026

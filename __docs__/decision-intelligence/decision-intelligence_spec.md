# Decision Intelligence - Product Specification

**Created:** January 11, 2026  
**Status:** 🔒 **LOCKED — Production Ready**  
**Source:** Codebase (Single Source of Truth)  
**Applies:** 3-Year Architecture Freeze Rule

---

## Executive Summary

### Goals

Transform MenuListAi QR menus from **passive item lists** into **active decision engines** that help customers choose faster. Decision Blocks appear at the top of every menu, reducing decision time from 60-90 seconds to under 15 seconds.

### The Core Problem

| Current State        | With Decision Blocks         |
| -------------------- | ---------------------------- |
| Customer scans QR    | Customer scans QR            |
| Scrolls through menu | Sees 3 smart recommendations |
| Hesitates, compares  | Taps recommendation          |
| Asks staff for help  | Orders immediately           |
| Orders "safe" item   | Better item selected         |
| **60-90 seconds**    | **< 15 seconds**             |

### The Solution

Three Decision Blocks at the top of every menu:

| Block                 | Icon | Purpose                  | Example             |
| --------------------- | ---- | ------------------------ | ------------------- |
| **Popular Right Now** | ⭐   | What others are ordering | "Customer favorite" |
| **Quick Pick**        | ⚡   | What's ready fast        | "Ready in 5 min"    |
| **Best Value**        | 💰   | Best price/value ratio   | "Great value"       |

### One-Line Value Proposition

> **"Help customers decide faster with smart recommendations that learn from behavior."**

---

## Scope

| In Scope                       | Out of Scope                |
| ------------------------------ | --------------------------- |
| ✅ 3 Decision Block types      | ❌ Per-item analytics UI    |
| ✅ Nightly scoring scheduler   | ❌ Real-time scoring        |
| ✅ Runtime availability filter | ❌ ML model training        |
| ✅ Owner pin controls          | ❌ A/B testing framework    |
| ✅ Business category configs   | ❌ Customer-facing settings |
| ✅ i18n translations (EN/HI)   | ❌ All 95+ languages        |
| ✅ Analytics tracking          | ❌ Analytics dashboard      |

---

## User Stories / Flows

### Primary: Customer

#### Story 1: The Rushed Customer

> "I'm on my lunch break with 15 minutes. I scan the menu and immediately see 'Quick Pick: Veggie Wrap - Ready in 5 min'. Perfect. I tap it, order, done."

**Flow:** Scan QR → See Quick Pick → Tap → Scroll to item → Order

#### Story 2: The Indecisive Customer

> "There are 50 items. I don't know what's good here. But there's a 'Popular Right Now' block showing butter chicken. If everyone orders it, it must be good."

**Flow:** Scan QR → See Popular → Social proof → Confident decision

#### Story 3: The Budget-Conscious Customer

> "I want something good but affordable. The 'Best Value' block shows a combo deal. High popularity, reasonable price. Sold."

**Flow:** Scan QR → See Best Value → Value confirmation → Order

### Secondary: Shop Owner

#### Story 4: The Promotional Owner

> "I want to push my new signature dish. I pin it to Popular Right Now. Now every customer sees it first, even if it doesn't have the most orders yet."

**Flow:** Editor → Smart Recommendations → Pin item → Customers see it

#### Story 5: The Seasonal Owner

> "Quick Pick doesn't make sense for my spa. Massages shouldn't be rushed. I disable Quick Pick. Now customers only see Popular and Best Value."

**Flow:** Editor → Smart Recommendations → Disable Quick Pick → Cleaner UI

---

## Requirements

### Functional Requirements

| ID    | Requirement                           | Priority    | Evidence                                  |
| ----- | ------------------------------------- | ----------- | ----------------------------------------- |
| FR-1  | Show 3 Decision Blocks at top of menu | Must Have   | `DecisionBlocks.tsx:472-573`              |
| FR-2  | Nightly scoring at 2:30 AM UTC        | Must Have   | `decisionBlocksScoring.ts:506`            |
| FR-3  | 48-hour TTL with fallback             | Must Have   | `decisionBlocksScoring.ts:67`             |
| FR-4  | Runtime availability filtering        | Must Have   | `DecisionBlocks.tsx:126-179`              |
| FR-5  | Owner enable/disable per block        | Must Have   | `DecisionBlocksSettingsModal.tsx:116-118` |
| FR-6  | Owner pin items to blocks             | Must Have   | `DecisionBlocksSettingsModal.tsx:119-121` |
| FR-7  | Business category awareness           | Must Have   | `decisionBlocks.ts:190-228`               |
| FR-8  | i18n translated reasons               | Must Have   | `decisionBlockTranslations.ts`            |
| FR-9  | Track renders and clicks              | Must Have   | `DecisionBlocks.tsx:424-430, 453-458`     |
| FR-10 | Scroll to item on tap                 | Should Have | `DecisionBlocks.tsx:432-441`              |

### Non-Functional Requirements

| ID    | Requirement          | Target        | Evidence                       |
| ----- | -------------------- | ------------- | ------------------------------ |
| NFR-1 | Scheduler timeout    | < 540 seconds | `decisionBlocksScoring.ts:509` |
| NFR-2 | Candidates per block | 3             | `decisionBlocksScoring.ts:64`  |
| NFR-3 | Runtime filter       | O(n) items    | `selectAvailableCandidate()`   |
| NFR-4 | TTL buffer           | 48 hours      | `decisionBlocksScoring.ts:67`  |

---

## UI/UX Requirements

### Block Layout

- Horizontal scrollable container on mobile
- First block slightly larger (visual hierarchy)
- Show item image, name, reason, price
- Tap scrolls to item + 2-second highlight

### Labels (Softened - P2.5/P2.6)

| Category | Popular                  | Quick Pick      | Best Value   |
| -------- | ------------------------ | --------------- | ------------ |
| Food     | "People often choose"    | "Ready quickly" | "Good value" |
| Service  | "Clients often book"     | "Quick session" | "Good value" |
| Retail   | "Customers often choose" | (disabled)      | "Good value" |

### Visibility Rules

| Condition                   | Behavior                    |
| --------------------------- | --------------------------- |
| No items                    | Hide all blocks             |
| All unavailable             | Hide all blocks             |
| TTL expired, no pins        | Hide all blocks             |
| TTL expired, with pins      | Show pinned only            |
| Block disabled by owner     | Hide that block             |
| Category time slot inactive | Exclude item from selection |

---

## Scoring Formulas

### Popular Right Now

```
score = (views × 0.4) + (clicks × 0.3) + (orders × 0.2) + (ownerBoost × 0.1) + bestSellerBonus
```

### Quick Pick

```
score = ((1/duration) × 0.6) + (popularity × 0.3) + (ownerBoost × 0.1)
```

- Ineligible if `duration > threshold × 2`

### Best Value

```
score = ((popularity/price) × 0.7) + (popularity × 0.2) + (ownerBoost × 0.1)
```

- Ineligible if no price

---

## Constraints

### Data Limitations

| Missing              | Impact                     | Workaround                |
| -------------------- | -------------------------- | ------------------------- |
| POS/Sales data       | Can't measure conversions  | Use clicks as proxy       |
| Real-time inventory  | Can't auto-detect sold out | Owner toggles `available` |
| Per-item impressions | CTR approximation          | Use page views            |

### Business Rules

| Rule                            | Rationale                     |
| ------------------------------- | ----------------------------- |
| Quick Pick disabled for Health  | Speed ≠ quality in healthcare |
| Quick Pick disabled for Retail  | Items are instant (no prep)   |
| Owner pin overrides scoring     | Business knows best sometimes |
| Availability beats intelligence | Never show unavailable items  |

---

_Stage 2 Complete: Spec from Code_

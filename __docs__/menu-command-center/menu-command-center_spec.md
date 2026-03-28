# Menu Command Center — Specification

**Version:** 1.2
**Last Updated:** February 14, 2026
**Status:** ✅ Implementation Complete
**Audience:** CEO, PM, Clients (non-technical)

---

## Executive Summary

### What

A multi-action bulk operations panel inside the MenuList editor that lets owners change prices, availability, categories, and item visibility for many items at once — safely, with preview, and in a single session.

### Why

SMB owners regularly need to update many items at once: supplier cost increases, seasonal pricing, stock changes, category reorganization. Doing this one item at a time is slow, stressful, and error-prone. The Command Center makes mass changes **safe, fast, and predictable** — turning MenuList into the place where operational menu decisions happen first.

### For Whom

- Restaurant/salon/spa owners who manage 50-800+ item menus
- Chain operators managing master + outlet menus
- Any SMB owner who needs to update many items quickly

### Strategic Value

This feature moves MenuList from **menu display tool** to **menu control surface**. When owners start updating prices inside MenuList first, MenuList becomes the source of truth — and POS, screens, PDFs all follow.

---

## Goals & Success Metrics

| Goal                                                | Metric                                                         |
| --------------------------------------------------- | -------------------------------------------------------------- |
| Owners use bulk pricing instead of one-by-one edits | >60% of price changes happen via Command Center within 90 days |
| Zero pricing mistakes from bulk operations          | 0 support tickets about wrong bulk pricing                     |
| Owners feel safe making bulk changes                | Undo usage <5% (means preview is working)                      |
| Feature feels calm and predictable                  | No UI confusion tickets                                        |

---

## Target Customers (ICP)

1. **Solo restaurant owner** — 80-150 items, needs to increase prices due to inflation, wants it done in under 30 seconds
2. **Chain operator** — 2-5 outlets, needs to apply master price change that respects outlet overrides
3. **Multi-category business** — Salon/spa with services + products, needs to mark seasonal items unavailable in bulk

---

## Scope

### In-Scope (v1)

| Feature                    | Description                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Bulk Pricing**           | Increase/decrease by %, add/reduce flat amount, set fixed price                                        |
| **Bulk Availability**      | Mark items available/unavailable in bulk                                                               |
| **Move to Category**       | Move selected items to a different category                                                            |
| **Show/Hide Items**        | Permanently show or hide items from the customer menu (replaces standalone "Show or Hide" action)      |
| **Selection System**       | Category selection, multi-item selection, select all, mixed selection                                  |
| **Live Preview**           | Real-time impact preview before applying (affected items, price before/after, summary stats)           |
| **Safety Guardrails**      | Max increase +200%, max decrease -80%, no zero/negative prices, rounding to whole numbers              |
| **Multi-Outlet Awareness** | Respect inherited/locked items, show locked count, exclude from operations                             |
| **Undo (Toast)**           | 30-second undo window via toast notification after apply                                               |
| **Multi-Action Session**   | Modal stays open between actions; owner can apply pricing, then availability, then move — sequentially |
| **Single Batch Save**      | All changes sent to Firebase in one `updateProject()` call, not per-item                               |

### Out-of-Scope (not building)

| Feature                              | Why                                              |
| ------------------------------------ | ------------------------------------------------ |
| Scheduling price changes             | Future feature; adds complexity                  |
| AI pricing suggestions               | Not aligned with calm infrastructure             |
| Tax/GST management                   | Separate feature                                 |
| Inventory/stock integration          | We're not an inventory system                    |
| Margin calculations                  | Creates analytics obsession                      |
| Price history/audit log UI           | Internal logging only; no owner-facing dashboard |
| Automatic outlet sync notifications  | Handled silently by existing infrastructure      |
| Templates/presets (seasonal pricing) | Future feature if organic demand appears         |

---

## User Stories & Flows

### US-1: Inflation Price Increase (Most Common)

**As** a restaurant owner,
**I want to** increase my entire menu by 8% because supplier costs increased,
**So that** I can update all 120 items in under 30 seconds instead of editing each one.

**Flow:**

1. Owner opens editor
2. Clicks "Menu Command Center" in More Actions popover
3. Command Center modal opens with action list
4. Selects "Adjust Pricing"
5. Chooses "Increase by %" → enters "8"
6. Sees live preview: 120 items, avg ₹210 → ₹227, +8%
7. Clicks "Apply Changes"
8. Confirms in mini-dialog
9. Toast: "Prices updated for 120 items — Undo"
10. Prices update instantly in editor

### US-2: Category-Only Price Change

**As** a café owner,
**I want to** increase only beverage prices by 12% because coffee bean costs rose,
**So that** food prices stay unchanged.

**Flow:**

1. Opens Command Center
2. In selection panel, selects "Beverages" category (32 items auto-selected)
3. Selects "Adjust Pricing" → Increase by 12%
4. Preview shows only 32 beverage items affected
5. Applies → toast confirmation

### US-3: Bulk Out-of-Stock

**As** a restaurant owner during a busy evening,
**I want to** mark 15 items as unavailable because kitchen is running low,
**So that** customers don't order items we can't serve.

**Flow:**

1. Opens Command Center
2. Selects 15 specific items across categories
3. Selects "Change Availability" → "Mark as Unavailable"
4. Preview: "15 items will be marked unavailable"
5. Applies → instant update everywhere

### US-4: Multi-Outlet Master Price Change

**As** a chain owner with 3 outlets,
**I want to** increase master menu prices, knowing outlet overrides stay untouched,
**So that** branches with custom pricing aren't affected.

**Flow:**

1. Editing master menu
2. Opens Command Center → Adjust Pricing → +10%
3. Left panel shows: "Outlet: Master menu"
4. Preview excludes items with outlet overrides
5. Applies → master prices update, outlets inherit automatically (except overridden items)

### US-5: Move Items to Different Category

**As** a restaurant owner reorganizing the menu,
**I want to** move 8 items from "Specials" to "Main Course",
**So that** the menu structure is cleaner.

**Flow:**

1. Opens Command Center
2. Selects 8 items from "Specials"
3. Selects "Move to Category" → picks "Main Course"
4. Preview: "8 items will move to Main Course"
5. Applies → items appear in new category

### US-6: Multi-Action Session

**As** a restaurant owner doing end-of-month menu cleanup,
**I want to** adjust prices, mark some items unavailable, AND move items between categories — all in one session,
**So that** I don't have to open the tool three separate times.

**Flow:**

1. Opens Command Center
2. Action 1: Adjust pricing for all items → Apply
3. Modal stays open → action list reappears
4. Action 2: Change availability for 5 items → Apply
5. Modal stays open
6. Action 3: Move 3 items to different category → Apply
7. Closes modal → all 3 actions saved

---

## Requirements

### Functional Requirements

| ID    | Requirement                                                                                                    | Priority |
| ----- | -------------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Command Center opens as large centered modal (~70% width, ~80% height) with backdrop blur                      | P0       |
| FR-2  | Three-panel layout: Selection Context (left), Action Engine (center), Impact Preview (right)                   | P0       |
| FR-3  | Selection panel shows: items selected count, categories, outlet name, editable vs locked counts                | P0       |
| FR-4  | Action list: Adjust Pricing, Change Availability, Move to Category, Show/Hide Items                            | P0       |
| FR-5  | Pricing methods: Increase %, Decrease %, Add flat, Reduce flat, Set fixed price                                | P0       |
| FR-6  | Live impact preview with sample items, average price before/after, net change %                                | P0       |
| FR-7  | Safety guardrails: max +200%, max -80%, no zero/negative, auto-round to whole number                           | P0       |
| FR-8  | Apply confirmation dialog before executing                                                                     | P0       |
| FR-9  | Toast notification with 30-second undo after apply                                                             | P0       |
| FR-10 | Multi-action session: modal stays open after apply, action list resets                                         | P0       |
| FR-11 | Respect multi-outlet inheritance: exclude locked items, show locked count                                      | P0       |
| FR-12 | Discard confirmation if closing modal with unsaved action in progress                                          | P0       |
| FR-13 | Single batch save: all changes to Firebase via one `updateProject()` call                                      | P0       |
| FR-14 | Include both active AND inactive/hidden items in selection (with breakdown shown)                              | P0       |
| FR-15 | Selection system: select by category (selects all items inside), mixed selection across categories, select all | P0       |
| FR-16 | Availability action: mark available/unavailable, show count already in target state                            | P1       |
| FR-17 | Move category action: select destination category, prevent same-category move                                  | P1       |
| FR-18 | Action-first default: modal opens to action list, not directly to pricing                                      | P0       |

### Non-Functional Requirements

| ID    | Requirement                                                                   |
| ----- | ----------------------------------------------------------------------------- |
| NFR-1 | Preview must feel instant for menus up to 800 items (client-side computation) |
| NFR-2 | Modal must open within 200ms                                                  |
| NFR-3 | No UI lag when selecting/deselecting items                                    |
| NFR-4 | Works on desktop browsers (mobile responsive via stacked layout — future)     |
| NFR-5 | Visual tone: calm, financial-grade (like Stripe), not playful or animated     |
| NFR-6 | Follows Language Governance — no forbidden phrases                            |

---

## Architecture Overview (High Level)

```
EditorActionsPopover.tsx
    ↓ new action: 'commandCenter'
Editor.tsx
    ↓ handleActionClick → setIsCommandCenterOpen(true)
CommandCenterModal
    ├── SelectionContext (left panel — read-only summary)
    ├── ActionEngine (center panel — action list → action-specific UI)
    └── ImpactPreview (right panel — live computed preview)
    ↓ onApply(updatedProject: Project)
Editor.tsx → syncChanges() → updateProject() → Firebase (single write)
```

All changes are computed **locally in frontend** on `projectData` clone. Only the final result is sent to Firebase as a single `updateProject()` call — matching the existing pattern used by `BulkStatusMenuModal`, `ReorderMenuModal`, and `DecisionBlocksSettingsModal`.

---

## Risks & Open Questions

| Risk                            | Mitigation                                                          |
| ------------------------------- | ------------------------------------------------------------------- |
| Owner applies wrong bulk change | Preview + confirmation + undo toast                                 |
| Large menus cause UI lag        | Compute preview client-side, show only sample (8 items) + summary   |
| Multi-outlet confusion          | Always show outlet name in selection panel                          |
| Rounding creates odd prices     | Auto-round to nearest whole number; future: configurable rounding   |
| Feature unused                  | Entry point via existing "More Actions" popover — no learning curve |

### Open Questions

1. **Rounding granularity**: Round to nearest ₹1 (default) or nearest ₹5? → **Decision: ₹1 for v1, configurable later**
2. **Attribute pricing**: Should bulk pricing also affect attribute prices (Small/Medium/Large)? → **Decision: Yes, include attributes in bulk pricing**
3. **Selection persistence**: Should selection persist after modal close? → **Decision: No, clear on close for safety**

---

## Alignment with MenuList Doctrine

### Feature Rejection Gate (5/5 PASS)

| Question                                   | Answer                                                          | Result |
| ------------------------------------------ | --------------------------------------------------------------- | ------ |
| Does it remove a decision?                 | Yes — removes need to edit items one-by-one                     | PASS   |
| Would anyone notice if we didn't build it? | Yes — owners doing seasonal price changes would complain        | PASS   |
| Does it strengthen the core moment?        | Yes — correct pricing = customer decides faster with confidence | PASS   |
| One sentence without "and"?                | "Update many menu items at once with safe preview."             | PASS   |
| Will this still matter in 3 years?         | Yes — price changes are fundamental to menu operations          | PASS   |

### MenuList Identity Alignment

- **Dependability > Features**: Preview + guardrails + undo = dependable
- **Invisible infrastructure**: Changes propagate silently to all surfaces
- **Calm system**: Financial-grade UI, no drama, no celebration screens
- **Reduces owner responsibility**: Bulk operations replace manual item-by-item editing

---

## Strategic Insights from ChatGPT Conversation

### Key Strategic Decisions (Locked)

1. **MenuList = Global SMB infrastructure from day one** — not a fast-moving feature SaaS
2. **Menu correctness across all surfaces** is the single non-negotiable promise
3. **Reliable system that never surprises** — the emotional goal for every feature
4. **Problem-fixing speed** determines which system owners open first
5. **Authority is fragile** — one pricing mistake = permanent trust loss

### Infrastructure vs SaaS Classification

This feature is **infrastructure-grade**, not feature-grade. It moves MenuList from "digital menu tool" to "operational control system." The distinction matters:

- **SaaS feature:** solves a workflow problem, can be removed without business impact
- **Infrastructure layer:** becomes the place where real decisions happen, removal causes user panic

The Command Center passes the infrastructure test: if MenuList shut down tomorrow, this is one of the top features owners would panic about losing.

### Extensibility (Control Surface Architecture)

The Command Center is a **control surface**, not a single-purpose tool. The 3-panel architecture (Selection → Action → Preview) supports future actions without rebuilding:

- Tax/GST adjustments
- Tag management
- Promotional pricing
- Attribute-level bulk changes
- Chain-wide controls

All would plug into the same `ActionEngine` + `bulkOperations.ts` pattern. This is how infrastructure evolves — build the control surface once, add capabilities over time.

### Expected Adoption Curve

- **Month 1:** Cautious first use. Preview builds confidence.
- **Month 2:** Regular usage for price changes, out-of-stock, category cleanup.
- **Month 3:** Behavior shift — owners open MenuList first. Authority transfers from POS → MenuList.

Key indicator: when owners say "I’ll fix it in MenuList" instead of "I’ll fix it in the POS."

### Billing-Grade Safety Standard

This feature touches money. Safety matters more than UX. Every safety system (preview, guardrails, undo, confirmation) exists because a single pricing mistake causes:

- Revenue loss (wrong prices visible to customers)
- Permanent trust damage in the platform
- Support overhead

Treat this feature with zero tolerance for bugs — same standard as a billing system.

### The 5 Relief Pillars for SMB Owners

1. "If I change it here, it’s correct everywhere"
2. Nothing breaks accidentally
3. Out-of-stock handled instantly
4. Multi-outlet consistency without headache
5. Menu always ready to share

### Worst-Case Business Scenario

A client accidentally changes prices across their menu and doesn’t realize until customers see wrong prices — causing revenue loss and permanent trust damage in MenuList. **Every design decision in this feature exists to prevent this.**

### North Star Sentence

> "We don’t worry about menu anymore — it’s handled."

---

**Document Signature:** Feature Specification
**Version:** 2.0
**Created:** February 13, 2026

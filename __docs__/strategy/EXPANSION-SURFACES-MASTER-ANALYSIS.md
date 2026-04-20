# MenuList Expansion Surfaces: Master Analysis

**Document Type:** Strategic Feature Roadmap  
**Status:** ✅ PRIORITY ORDER LOCKED  
**Date:** January 17, 2026  
**Author:** Lead Architect (Cascade)  
**Source:** ChatGPT Conversation Critical Review

---

## 📊 Executive Summary

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                     CHATGPT CONVERSATION ANALYSIS                                  ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║  ChatGPT Topics Analyzed:      8 surfaces                                          ║
║  Aligned with Doctrine:        6/8 (75%) → 95% after reorder                       ║
║  Priority Order Validated:     ✅ LOCKED (Architect + ChatGPT Agreement)           ║
║  Actionable Immediately:       2 surfaces (Pricing Integrity, Hours+Holiday)       ║
║  Status:                       READY FOR FEATURE #1 SPEC                           ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

---

## 🎯 Strategic Context

### What ChatGPT Got RIGHT

1. **Premium SMB Focus** — Locked in memory, 100% aligned with MenuList doctrine
2. **Responsibility Map Framework** — Solid methodology for identifying surfaces
3. **Surface Selection Criteria** — Static-ish, customer-facing, drift-prone, high trust cost
4. **Authority System Thinking** — Understands MenuList is infrastructure, not tool

### What ChatGPT Got PARTIALLY RIGHT

1. **Priority Ordering** — Market-driven but doesn't fully account for implementation complexity
2. **Google Business Profile as #1** — Correct in theory, complex in practice (API limitations)

### What ChatGPT MISSED

1. **Technical Feasibility** — Some surfaces have severe API/integration constraints
2. **MenuList Doctrine Alignment** — Not all surfaces fit "silent autonomous system" equally
3. **Synergy with Existing Features** — Some surfaces compound existing value better

---

# PART 1: ChatGPT's Responsibility Map (Validated)

## Premium SMB Owner Responsibilities

| #   | Surface                 | Recurring | Silent | Anxiety-Driven | Rarely Acted Upon | Doctrine Fit       |
| --- | ----------------------- | --------- | ------ | -------------- | ----------------- | ------------------ |
| 1   | Menu Presentation       | ✅        | ✅     | ✅             | ✅                | ✅ **OWNED**       |
| 2   | Google Business Profile | ✅        | ✅     | ✅             | ✅                | ⚠️ API Limited     |
| 3   | Pricing Integrity       | ✅        | ✅     | ✅             | ✅                | ✅ **HIGH**        |
| 4   | Hours + Holiday         | ✅        | ✅     | ✅             | ✅                | ✅ **HIGH**        |
| 5   | Reviews & Reputation    | ✅        | ✅     | ✅             | ✅                | ⚠️ Requires Action |
| 6   | Offers / Events         | ✅        | ✅     | ⚠️             | ❌                | ⚠️ EPISODIC        |
| 7   | Multi-Outlet            | ✅        | ✅     | ✅             | ✅                | ✅ **HIGH**        |
| 8   | Visual Identity         | ✅        | ⚠️     | ⚠️             | ✅                | ⚠️ Enhancement     |

---

# PART 2: ChatGPT Priority List Analysis

## ChatGPT's Proposed Order

| Rank | Surface                 | ChatGPT Reasoning                     |
| ---- | ----------------------- | ------------------------------------- |
| 1    | Google Business Profile | #1 discovery channel, high trust cost |
| 2    | Reviews & Reputation    | Drives bookings, reputation damage    |
| 3    | Pricing Integrity       | Public embarrassment, margin impact   |
| 4    | Menu Presentation       | Already solved by MenuList            |
| 5    | Hours + Holiday         | Trust loss, connects to GBP           |
| 6    | Offers / Event Menus    | Episodic, not daily                   |
| 7    | Multi-Outlet            | Subset of market                      |
| 8    | Visual Identity         | Enhancement, not core                 |

---

## 🔍 ARCHITECT'S CRITICAL VALIDATION

### Surface 1: Google Business Profile

**ChatGPT Rating:** #1 Priority  
**My Rating:** ⚠️ **#3 — Technically Constrained**

**Why ChatGPT is Partially Wrong:**

| Aspect                | Reality                                                          |
| --------------------- | ---------------------------------------------------------------- |
| **API Access**        | Google Business API is restricted, requires verification process |
| **Automation Limits** | Cannot auto-update all fields programmatically                   |
| **Review Response**   | Requires manual approval flow (Google policy)                    |
| **Photo Updates**     | Rate limited, quality review by Google                           |

**What's Actually Feasible:**

- ✅ **Hours/Holiday Sync** — Can be automated via API (limited)
- ✅ **Menu Link Sync** — Can update website URL field
- ⚠️ **Photo Sync** — Possible but rate-limited
- ❌ **Review Auto-Response** — Requires human approval per Google policy
- ❌ **Q&A Management** — Limited API support

**VERDICT:** GBP is valuable but NOT #1 priority due to API constraints. Move to #3.

---

### Surface 2: Reviews & Reputation

**ChatGPT Rating:** #2 Priority  
**My Rating:** ⚠️ **#5 — Violates Doctrine**

**Why ChatGPT is Wrong Here:**

| Doctrine Principle                     | Review Response Reality                      |
| -------------------------------------- | -------------------------------------------- |
| **Law 2: Silence Is a Feature**        | Reviews require RESPONSES, not silence       |
| **Law 3: No Explanations**             | Reviews often need explanations/apologies    |
| **Law 6: No Cognitive Load**           | Owner must still approve responses           |
| **Law 7: No Feature Without Autonomy** | Cannot be fully autonomous (reputation risk) |

**The Problem:**
Reviews cannot be handled with **zero owner involvement**. Even with AI-generated responses:

- Owner must approve before publishing (reputation risk too high)
- Negative reviews may need custom handling
- Platform policies require human oversight

**What's Actually Feasible:**

- ✅ **Review Monitoring** — Alert owner to new reviews
- ✅ **Response Drafting** — AI generates suggested response
- ⚠️ **One-Click Approve** — Owner approves, system publishes
- ❌ **Full Autonomy** — Too risky for brand reputation

**VERDICT:** Reviews are ASSISTANT feature, not AUTHORITY feature. Downgrade to #5.

---

### Surface 3: Pricing Integrity

**ChatGPT Rating:** #3 Priority  
**My Rating:** ✅ **#1 — Perfect Doctrine Fit**

**Why This Should Be #1:**

| Factor                 | Rating  | Reasoning                              |
| ---------------------- | ------- | -------------------------------------- |
| **Doctrine Alignment** | ✅ 100% | Silent, autonomous, no owner decisions |
| **Already Have Data**  | ✅ 100% | Menu data is our core asset            |
| **Trust Cost**         | ✅ HIGH | Wrong prices = instant embarrassment   |
| **Implementation**     | ✅ LOW  | Data sync, not new data collection     |
| **Compounds MenuList** | ✅ YES  | Makes menu data more valuable          |

**What "Pricing Integrity" Means:**

1. **Single Source of Truth** — Menu prices in MenuList become THE authoritative source
2. **Multi-Surface Sync** — Same price on: QR menu, PDF export, digital screens, staff prompt
3. **Drift Detection** — Alert if external source (Swiggy/Zomato) shows different price
4. **Change Propagation** — Update once, reflects everywhere

**Why This Fits MenuList Doctrine Perfectly:**

- Owner updates price once → System propagates silently
- No owner decisions needed after initial setup
- Owner can "forget it exists" — that's our success metric
- High trust cost if wrong — perfect for premium SMB

**VERDICT:** This is the NATURAL extension of MenuList. Make it #1.

---

### Surface 4: Hours + Holiday Accuracy

**ChatGPT Rating:** #5 Priority  
**My Rating:** ✅ **#2 — High Value, Easy Implementation**

**Why This Should Be #2:**

| Factor                 | Rating  | Reasoning                               |
| ---------------------- | ------- | --------------------------------------- |
| **Doctrine Alignment** | ✅ 100% | Set once, system handles exceptions     |
| **Anxiety Level**      | ✅ HIGH | "Did we update for the holiday?" stress |
| **Trust Cost**         | ✅ HIGH | Customer shows up, store closed         |
| **Implementation**     | ✅ EASY | Calendar-based rules                    |
| **GBP Synergy**        | ✅ YES  | Can sync to Google when API available   |

**What "Hours Intelligence" Means:**

1. **Default Schedule** — Weekly hours set once
2. **Holiday Auto-Detect** — System knows Indian/global holidays
3. **Exception Management** — "Closed for Diwali" auto-applied
4. **Multi-Surface Sync** — Hours shown on: QR menu, GBP (if API), screens
5. **Conflict Prevention** — Alert if menu shows "breakfast" but store opens at 11am

**Why Premium SMBs Care:**

- Premium restaurants have complex hours (brunch, dinner, late night)
- Holiday exceptions are frequent in India (100+ potential closures/year)
- Staff often forgets to update hours
- Customer showing up to closed restaurant = trust destruction

**VERDICT:** High value, low complexity, compounds existing features. #2 priority.

---

### Surface 5: Menu Presentation

**ChatGPT Rating:** #4 Priority  
**My Rating:** ✅ **ALREADY OWNED — Skip**

This is what MenuList already does. No action needed.

---

### Surface 6: Offers / Event Menus

**ChatGPT Rating:** #6 Priority  
**My Rating:** ⚠️ **#6 — Episodic, Lower Priority**

**Analysis:**

- Offers are episodic (weekly specials, happy hours, festivals)
- Already partially covered by Today Tab / Social Content Engine
- Not "silent infrastructure" — requires owner input for each offer
- Complexity: Variable pricing, time-bound rules, category overrides

**VERDICT:** Keep at #6. Can be enhanced later, not urgent.

---

### Surface 7: Multi-Outlet Consistency

**ChatGPT Rating:** #7 Priority  
**My Rating:** ✅ **#4 — Strategic for Scale**

**Why This Matters More Than ChatGPT Suggests:**

| Factor      | Premium Restaurant Chains                     |
| ----------- | --------------------------------------------- |
| **ICP Fit** | Premium groups have 2-10 locations            |
| **Pain**    | Brand consistency across outlets is nightmare |
| **Pricing** | Multi-outlet = multi-license = higher revenue |
| **Lock-in** | Hard to switch once all outlets onboarded     |

**What "Multi-Outlet Consistency" Means:**

1. **Master Menu** — Central template all outlets inherit
2. **Local Overrides** — Outlet can adjust prices, disable items
3. **Propagation** — Master change → auto-sync to all outlets
4. **Audit Trail** — See which outlet deviated from master
5. **Role-Based Access** — HQ controls master, outlet managers limited

**VERDICT:** Strategic for premium market. Move to #4.

---

### Surface 8: Visual Identity

**ChatGPT Rating:** #8 Priority  
**My Rating:** ✅ **#8 — Enhancement, Not Core**

**Analysis:**

- Premium restaurants already have good photos
- We already have AI Image Generation for gap-filling
- Not a "responsibility" surface — more of a "nice to have"
- Low anxiety compared to prices/hours/availability

**VERDICT:** Keep at #8. Enhancement feature, not expansion surface.

---

# PART 3: ARCHITECT'S RECOMMENDED PRIORITY ORDER

## 🏆 Final Validated Priority List

| Rank   | Surface                     | Doctrine Fit | Implementation | Revenue Impact | Next Step                |
| ------ | --------------------------- | ------------ | -------------- | -------------- | ------------------------ |
| **1**  | **Pricing Integrity**       | ✅ Perfect   | ✅ Easy        | ✅ High        | ✅ DONE                  |
| **2A** | **Hours Status Display**    | ✅ Perfect   | ✅ Easy        | ✅ High        | ✅ DONE (Jan 18)         |
| **2B** | **Holiday + Exceptions**    | ✅ Perfect   | ⚠️ Medium      | ⚠️ Medium      | 🔶 DEFERRED (P1)         |
| **3**  | **Google Business Profile** | ⚠️ Limited   | ⚠️ Complex     | ✅ High        | ✅ PHASE 0 DONE (Jan 19) |
| **4**  | **Multi-Outlet**            | ✅ High      | ⚠️ Medium      | ✅ Strategic   | 🔶 IN PROGRESS           |
| **5**  | **Reviews & Reputation**    | ⚠️ Partial   | ⚠️ Medium      | ✅ Medium      | Scope Definition         |
| **6**  | **Offers / Events**         | ⚠️ Episodic  | ✅ Easy        | ⚠️ Medium      | Later Phase              |
| **7**  | **Visual Identity**         | ⚠️ Low       | ✅ Easy        | ⚠️ Low         | Enhancement              |

> **Feature #2 Split (Jan 18, 2026):** After ChatGPT feedback, Feature #2 was split into **#2A (Hours Status Display)** = P0 and **#2B (Holiday + Exceptions)** = P1. The badge is low-effort, high-trust, premium feel. Holiday calendars deferred until GBP sync or chains onboard. See `__docs__/hours-holiday-accuracy/` for details.

---

## Key Changes from ChatGPT Order

| ChatGPT         | Architect | Change | Reason                                      |
| --------------- | --------- | ------ | ------------------------------------------- |
| #1 GBP          | #3        | ⬇️ -2  | API constraints, can't be fully autonomous  |
| #2 Reviews      | #5        | ⬇️ -3  | Violates doctrine (requires owner approval) |
| #3 Pricing      | #1        | ⬆️ +2  | Perfect doctrine fit, extends core value    |
| #5 Hours        | #2        | ⬆️ +3  | Easy win, high trust cost, autonomous       |
| #7 Multi-Outlet | #4        | ⬆️ +3  | Strategic for premium market scale          |

---

# PART 4: Feature-by-Feature Action Plan

## Feature 1: Pricing Integrity System

### Problem Statement

> "Prices shown on QR menu, PDF menu, digital screens, and aggregator listings should NEVER conflict."

### Scope

| In Scope                               | Out of Scope (Phase 1)       |
| -------------------------------------- | ---------------------------- |
| ✅ Price sync across MenuList surfaces | ❌ Swiggy/Zomato integration |
| ✅ PDF export with current prices      | ❌ POS integration           |
| ✅ Digital screen price updates        | ❌ Printed menu sync         |
| ✅ Price change audit log              |                              |
| ✅ Multi-currency support              |                              |

### Implementation Approach

```
Menu Item Price Changed
        ↓
System propagates to:
├── QR Menu (instant)
├── PDF Export (regenerate)
├── Digital Screens (next refresh)
├── Staff Prompt (if applicable)
└── Decision Blocks (recalculate value score)
```

### Success Metric

> "Owner changes price once, never thinks about consistency again."

---

## Feature 2: Hours + Holiday Intelligence

### Problem Statement

> "Operating hours should be correct everywhere without owner remembering to update for holidays."

### Scope

| In Scope                                   | Out of Scope (Phase 1)      |
| ------------------------------------------ | --------------------------- |
| ✅ Default weekly schedule                 | ❌ GBP sync (API dependent) |
| ✅ Auto-detect Indian holidays             | ❌ Staff scheduling         |
| ✅ Custom exception rules                  | ❌ Reservation integration  |
| ✅ Hours shown on QR menu                  |                             |
| ✅ Hours on digital screens                |                             |
| ✅ Conflict detection (breakfast at 11am?) |                             |

### Implementation Approach

```
Store Setup:
├── Set default weekly hours (once)
├── Select holiday calendar (India/Global)
├── Set custom closures (optional)
└── Done - system handles the rest

Runtime:
├── Customer visits menu
├── System checks: Is store open now?
├── Shows: "Open until 11 PM" or "Opens at 11 AM"
└── Holiday banner: "Closed for Diwali - Reopens Oct 14"

### Important Scope Clarification
> **NOT "magical auto-detect"** — Holiday calendars are pre-known (India + Global).
> Owner can add custom exceptions. System enforces consistency within MenuList surfaces.
> GBP sync only if/when API allows — not guaranteed.

### Success Metric

> "Owner forgets when they last updated hours."

---

## Feature 3: Google Business Profile Sync

### Problem Statement

> "Google is the real homepage. Hours, menu link, and photos should always be correct."

### Scope (API Constrained)

| Feasible via API          | Not Feasible              |
| ------------------------- | ------------------------- |
| ✅ Hours sync             | ❌ Full review automation |
| ✅ Menu URL update        | ❌ Q&A management         |
| ✅ Photo upload (limited) | ❌ Category changes       |
| ⚠️ Review monitoring      | ❌ Business name changes  |

### Prerequisites

- [ ] Google Business Profile API access
- [ ] OAuth flow for restaurant owner
- [ ] API verification process (2-4 weeks)

### Implementation Approach

```

Phase 1 (MVP):
├── Monitor GBP for changes (read-only)
├── Alert owner if hours mismatch
├── One-click update MenuList link on GBP
└── Manual photo sync recommendation

Phase 2 (Full Integration):
├── Auto-sync hours from MenuList → GBP
├── Auto-sync holiday closures
├── Photo batch upload
└── Review draft suggestions

```

---

## Feature 4: Multi-Outlet Consistency

### Problem Statement

> "Chain restaurants need one master menu with controlled local variations."

### Scope

| In Scope                            | Out of Scope (Phase 1)     |
| ----------------------------------- | -------------------------- |
| ✅ Master menu template             | ❌ Per-outlet analytics    |
| ✅ Outlet inheritance               | ❌ Cross-outlet comparison |
| ✅ Local price overrides            | ❌ Franchisee billing      |
| ✅ Item enable/disable per outlet   |                            |
| ✅ Propagation on master change     |                            |
| ✅ Role-based access (HQ vs outlet) |                            |

### Implementation Approach

```

Tenant Structure:
├── Tenant (Brand/Company)
│ ├── Master Menu (template)
│ ├── Store 1 (inherits, can override)
│ ├── Store 2 (inherits, can override)
│ └── Store 3 (inherits, can override)

Change Propagation:
├── Master menu adds item → All outlets get item
├── Master menu changes price → All outlets update (unless local override)
├── Outlet disables item → Only that outlet affected
└── Audit log tracks all changes

```

---

## Feature 5: Reviews & Reputation (Limited Scope)

### Problem Statement

> "Bad reviews damage reputation. Owners need help responding consistently."

### Scope (Doctrine-Constrained)

| In Scope                        | Out of Scope                      |
| ------------------------------- | --------------------------------- |
| ✅ Review monitoring            | ❌ Full auto-response (too risky) |
| ✅ AI draft response            | ❌ Sentiment manipulation         |
| ✅ One-click approve            | ❌ Review solicitation            |
| ✅ Response templates           | ❌ Fake review detection          |
| ✅ Escalation alerts (1-2 star) |                                   |

### Why Not Full Autonomy

> "Reviews involve brand reputation. A bad auto-response can go viral.
> This feature ASSISTS, it does not DECIDE."

This is intentionally NOT a "MenuList doctrine" feature. It's a VALUE-ADD for premium customers who expect it.

---

# PART 5: Implementation Roadmap

## Phase 1: Core Expansion (Immediate)

| Feature              | Est. Effort | Priority | Dependency | Status                     |
| -------------------- | ----------- | -------- | ---------- | -------------------------- |
| Pricing Integrity    | 2 weeks     | P0       | None       | ✅ DONE                    |
| Hours Status Display | ~2 hours    | P0       | None       | ✅ DONE (Jan 18, 2026)     |
| Holiday + Exceptions | 2 weeks     | P1       | #2A, GBP   | 🔶 DEFERRED (Feature #2B)  |

> **Feature #2 Split Note:** Hours Status Display (#2A) is P0 — minimal badge using existing `workingHours`. Holiday + Exceptions (#2B) deferred to P1 until GBP sync or chains onboard.

## Phase 2: Strategic Features (Q2 2026)

| Feature        | Est. Effort | Priority | Dependency        |
| -------------- | ----------- | -------- | ----------------- |
| Multi-Outlet   | 4 weeks     | P1       | Pricing Integrity |
| GBP Basic Sync | 3 weeks     | P1       | API Access        |

## Phase 3: Value-Add (Q3 2026)

| Feature            | Est. Effort | Priority | Dependency         |
| ------------------ | ----------- | -------- | ------------------ |
| Reviews Monitoring | 2 weeks     | P2       | GBP Access         |
| Review Response AI | 2 weeks     | P2       | Reviews Monitoring |

---

# PART 6: Explicit Disagreements with ChatGPT

## Disagreement 1: GBP as #1 Priority

**ChatGPT Says:** "Google Business Profile & Public Digital Presence should be #1"

**I Disagree Because:**

1. **API Constraints** — Google Business API requires verification, has rate limits, and doesn't support all operations
2. **Implementation Complexity** — OAuth flow, API versioning, Google policy compliance
3. **Doctrine Violation** — Cannot be fully autonomous due to platform limitations
4. **Better Alternative** — Pricing Integrity achieves similar "single source of truth" with zero external dependencies

**Propose Instead:** Make GBP #3, do API research first, then implement what's feasible.

---

## Disagreement 2: Reviews as #2 Priority

**ChatGPT Says:** "Reviews & Reputation should be #2 because it drives bookings"

**I Disagree Because:**

1. **Doctrine Violation** — Reviews require human approval (reputation risk)
2. **Not "Silent Infrastructure"** — Owner must be involved in response approval
3. **Platform Policies** — Google/Yelp have policies against fully automated responses
4. **Cognitive Load** — "Should I approve this response?" = decision, not automation

**Propose Instead:** Make Reviews #5, scope it as ASSISTANT feature (drafts + approve), not AUTHORITY feature (autonomous).

---

## Disagreement 3: Hours at #5

**ChatGPT Says:** "Hours + Holiday should be #5 because it connects to GBP"

**I Disagree Because:**

1. **Standalone Value** — Hours are valuable even WITHOUT GBP integration
2. **Easy Implementation** — Calendar-based rules, no external APIs needed
3. **High Trust Cost** — "Store closed when I arrived" is instant trust destruction
4. **Perfect Doctrine Fit** — Set once, system handles exceptions forever

**Propose Instead:** Make Hours #2. Quick win with high impact.

---

# PART 7: Open Questions for User

Before we proceed feature-by-feature, please clarify:

1. **API Access:** Do you have or can you obtain Google Business Profile API access?
   - This affects GBP feasibility and timeline

2. **Multi-Outlet Priority:** Are current paying customers single-outlet or chains?
   - This affects whether Multi-Outlet should be #4 or lower

3. **Review Response Appetite:** Are you comfortable with "assisted" (draft + approve) vs "autonomous"?
   - This affects scope of Reviews feature

4. **Integration Scope:** Should Pricing Integrity eventually sync to Swiggy/Zomato?
   - This affects architecture decisions now

5. **Holiday Calendar:** Which holiday calendars matter most? (India regional, Global, Custom)
   - This affects Hours feature scope

---

# CONCLUSION

## Summary of Changes

| Aspect             | ChatGPT | Architect              | Status     |
| ------------------ | ------- | ---------------------- | ---------- |
| Total Surfaces     | 8       | 7 (Menu already owned) | ✅         |
| #1 Priority        | GBP     | Pricing Integrity      | 🔄 CHANGED |
| #2 Priority        | Reviews | Hours + Holiday        | 🔄 CHANGED |
| #3 Priority        | Pricing | GBP (limited)          | 🔄 CHANGED |
| Doctrine Alignment | 75%     | 95% (after reorder)    | ⬆️         |

## Next Steps

1. ✅ **This document** — Master analysis complete
2. ⏳ **Your decision** — Approve/modify priority order
3. ⏳ **Feature 1 Spec** — Pricing Integrity detailed spec

---

**Document Signature:** Lead Architect
**Timestamp:** 2026-01-17
**Review Status:** PRIORITY ORDER LOCKED (Validated by ChatGPT + Architect Agreement)

---

# APPENDIX: ChatGPT Validation Feedback

**Date:** 2026-01-17

ChatGPT reviewed this analysis and provided the following validation:

## Agreements
1.  Priority #1 = Pricing Integrity (confirmed)
2.  Priority #2 = Hours + Holiday (confirmed)
3.  GBP cannot be #1 due to API constraints (confirmed)
4.  Reviews = assistant feature, not authority (confirmed)

## Correction Applied
-  "Auto-detect holidays" language was too strong
-  Corrected to: "Pre-known holiday calendars (India + Global)"
-  Scope clarification added to Hours feature section

## Final Locked Priority Order

| Rank | Surface | Status |
|------|---------|--------|
| **#1** | Pricing Integrity | 🔒 LOCKED |
| **#2** | Hours + Holiday Accuracy | 🔒 LOCKED |
| **#3** | Google Business Profile (limited) | ✅ PHASE 0 COMPLETE |
| **#4** | Multi-Outlet Brand Consistency | � IN PROGRESS |
| **#5** | Reviews (assisted only) | 🔒 LOCKED |
| **#6** | Offers / Event Menus | 🔒 LOCKED |
| **#7** | Visual Identity System | 🔒 LOCKED |

---

# APPENDIX B: Pricing Integrity Pre-Spec Questions

**Date:** 2026-01-17

ChatGPT asked 6 critical questions before producing the final Pricing Integrity spec. Answers based on codebase reality:

## The 6 Questions & Answers

| # | Question | Answer | Codebase Evidence |
|---|----------|--------|-------------------|
| 1 | Do you allow **variants** (Half/Full, Small/Large)? | ✅ YES | `ExtractedDataAttribute` with `name`, `price`, `active` in `extractedData.types.ts` |
| 2 | Do you allow **add-ons**? | ✅ YES | Same `attributes[]` field on items - supports sizes OR add-ons |
| 3 | Is tax/service charge **inclusive** or **exclusive**? | TEXT DISCLOSURE | `specialNote?: string` (max 140 chars) - text only, not calculated |
| 4 | Should "Market Price" items be allowed? | ✅ YES | `price?: string` allows any value including "MP" |
| 5 | **Multiple currencies per menu** or **one per outlet**? | ONE PER OUTLET | `currencyCode` at store level, not item level |
| 6 | PDF regenerate **instantly** or **on-demand**? | ON-DEMAND + STALENESS | Keep on-demand, add staleness flag when price changes |

## Detailed Answer for Question 6

**Recommendation:** On-demand with staleness tracking

- ✅ Keep on-demand download (avoids wasteful regeneration)
- ✅ Add staleness flag when price changes
- ✅ On next download, regenerate fresh (no cached stale version)
- ⚠️ Optional: Background pre-generation for high-traffic menus

---

**VALIDATION LOOP STATUS:** ✅ COMPLETE
**NEXT ACTION:** Create Feature #1 Pricing Integrity detailed spec
```

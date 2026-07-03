# 📋 MenuList Future Ideas Bucket List

**Created:** January 2, 2026  
**Source:** ChatGPT Brainstorm Analysis  
**Purpose:** Quick reference for future product decisions

---

## The Golden Filter

Before adding ANY idea to development queue, ask:

> **"How does this help a customer choose faster or an owner sell more using the menu?"**

If it doesn't pass → Don't build it.

---

## ✅ APPROVED: Add to Roadmap

### 1. AI Social Content Generator (HIGH PRIORITY)

**What:** Campaign-based social content from menu data

**Why it fits:**

- Same customer (SMB owners)
- Same data (menu items, prices, images)
- Same outcome (more footfall → more orders)

**Key Constraint:**

- ❌ NOT an agency
- ❌ NOT account management
- ❌ NOT a social media scheduler
- ✅ Campaign-based content generation + export

#### The Three Core Differentiators (Non-Negotiable)

**1️⃣ Campaign Containers (THE KILLER FEATURE)**

Not random posts. Think in micro-campaigns:

- 🍽️ **Meal Push** (Lunch 12-3pm, Breakfast 8-10am)
- 🐢 **Slow Item Rescue** (promote low-tap items)
- 🎉 **Festival Spike** (Diwali, Holi, etc.)
- 🆕 **New Item Launch** (3-post sequence)
- ⭐ **Best Seller Boost** (trending items)

Each campaign auto-generates 2-3 posts + channel + timing.

> Without campaigns = "post generator" (commodity)
> With campaigns = "marketing engine" (value)

**2️⃣ Smart Distribution Logic**

Not: "Share to Instagram / WhatsApp" buttons
Instead: "This works best on WhatsApp Status at 11:30 AM"

Phase 1: Rule-based heuristics
Phase 2: Learned from export patterns

**We decide WHERE. Owner executes.**

**3️⃣ Outcome Framing (Closure, Not Direction)**

Owners don't want charts. They want closure.

- "This item got more attention than usual. Good to note."
- "Some attention, no clear change. Nothing unusual here."
- NOT "15% increase after Lunch Push" (attribution)
- NOT "Repeat this campaign?" (piggybacks on outcome)

**Key principle:** Next campaign comes from SYSTEM confidence, not "last time worked."

**4️⃣ Passive Campaigns (Added After Stress Test)**

For the ~70% of SMBs who avoid marketing:

- **Today's Special** - daily, picks bestseller/high-margin
- **This Weekend's Pick** - Friday morning trigger
- **Now Available** - triggered by availability change

No "Campaign" label. One tap → export → done.

**5️⃣ Execution Surfaces (Added After Stress Test)**

Same campaign → multiple places to act:

- **WhatsApp Status** (primary India)
- **WhatsApp Message** (copy-ready for customers)
- **Printable Poster** (A4/A5 with QR)
- **Counter QR Tent** (table tent)
- **Digital Screen/TV** (16:9)

Owner never chooses. MenuList decides ONE primary surface.

**6️⃣ Menu Highlight (Evergreen Fallback)**

Safety net when nothing else qualifies:

- Always available, no trigger dependency
- Picks ANY item purely descriptively
- System never feels dead

**Launch Scope (All At Once, 3-Year Architecture Freeze):**

- ✅ 5 active campaign types + 4 passive types
- ✅ 5 execution surfaces
- ✅ Smart distribution (heuristic mode, learned mode architecture ready)
- ✅ Outcome framing (minimal mode, standard mode architecture ready)
- ✅ Image generation (on-demand)
- ✅ Owner memory (passive)
- ✅ Confidence gate (formalized thresholds)
- ⏸️ Direct posting (architecture exists, disabled until 100+ stores)

**Detailed Strategy:** See [social-content-product-strategy.md](../social-content/social-content-product-strategy.md)

**Priority:** High-priority historical strategy candidate; not current implementation approval or launch certification

---

### 2. Menu-Specific Local SEO (LOW PRIORITY)

**What:** Auto-generate SEO-optimized text for menus

**Includes:**

- Item descriptions optimized for search
- Category summaries
- Google Business Profile text
- Menu schema markup (structured data)

**Why it fits:**

- Uses existing menu data
- Improves discoverability
- Zero ongoing effort for owner

**What it's NOT:**

- ❌ Generic SEO SaaS
- ❌ Keyword research tool
- ❌ Competitor analysis

**Priority:** 🟡 LOW - Add as supporting feature later

---

### 3. Lightweight Loyalty Signals (CONTROLLED)

**What:** Simple behavioral signals to influence choice

**Allowed:**

- "Ordered 3 times this week" badge
- "Most repeat customers choose this"
- "New this week" indicator

**NOT Allowed:**

- ❌ Points and badges system
- ❌ Gamification circus
- ❌ Streaks and leaderboards
- ❌ Referral programs

**Why the constraint:**

- SMB owners don't want "games"
- Over-gamifying kills trust
- Simple > Complex

**Priority:** 🟡 MEDIUM - Evaluate after Decision Blocks proven

---

## ❌ REJECTED: Do NOT Build

### 1. AI Assistants Agency ❌

**Why rejected:**

- Different buyer (founders/execs, not SMB operators)
- Different usage moment (thinking/planning vs in-store decision)
- Agency-heavy, people-dependent
- Zero product moat
- Memory systems, long-context agents = different company

**Verdict:** If you do this, it's a separate company or never.

---

### 2. Polymarket for Colleges ❌

**Why rejected:**

- Different users (students, not SMB owners)
- Different behavior (prediction/betting)
- Different regulations
- Zero data or customer overlap
- Classic founder trap: "Interesting" ≠ "Strategic"

**Verdict:** Complete distraction. Don't think about it again.

---

### 3. Generic SEO SaaS ❌

**Why rejected:**

- Crowded, red ocean market
- No moat without menu data
- Competes with established players

**Verdict:** Only menu-specific SEO belongs (see #2 in Approved list)

---

### 4. Full Gamification System ❌

**Why rejected:**

- SMB owners don't understand it
- Adds complexity without clear ROI
- Over-gamifying menus kills trust
- Points/badges = agency work, not product

**Verdict:** Only lightweight loyalty signals allowed (see #3 in Approved list)

---

## ⏸️ PARKED: Future Consideration

### 1. Booking/Ordering Integration

**Status:** Not MVP, Phase 3+

**Why parked:**

- Complex external APIs
- High integration cost
- Not needed for core value

**Revisit when:** 200+ paying customers

---

### 2. Multi-Location Intelligence

**Status:** Not MVP, Phase 3+

**Why parked:**

- Premature optimization
- Single location first
- Adds complexity

**Revisit when:** Franchise/chain customers express demand

---

### 3. AR/Visual Try-Ons

**Status:** Long-term vision (12-24 months)

**Why parked:**

- Expensive experiments
- Low early ROI
- Requires stable foundation

**Revisit when:** 500+ paying customers, stable extraction pipeline

---

## Decision Framework

### Before Adding Any Feature

1. **Does it remove a decision from the user's life?**

   - If NO → Challenge it. Why add complexity?

2. **Could we cut this and no one would notice?**

   - If YES → Don't build it.

3. **Does this strengthen the core moment or dilute it?**

   - Core moment: "Update my menu, everywhere, now"
   - If dilutes → Don't build it.

4. **Who is the customer?**

   - If not current MenuList customer → Separate product or skip

5. **What data does it use?**
   - If not menu data → Probably doesn't belong

---

## Priority Order (Next 12 Months)

| Priority | Feature                     | Status                |
| -------- | --------------------------- | --------------------- |
| 🔴 1     | AI Social Content Generator | Start Q1 2026         |
| 🟡 2     | Lightweight Loyalty Signals | Evaluate Q2 2026      |
| 🟡 3     | Menu-Specific Local SEO     | Q3 2026               |
| ⏸️ 4     | Booking Integration         | Post-200 customers    |
| ⏸️ 5     | Multi-Location              | Post-franchise demand |
| ⏸️ 6     | AR/Visual Features          | Post-500 customers    |

---

## Quick Reference Card

### ✅ BUILD IF:

- Uses menu data
- Serves existing customer
- Reduces owner decisions
- Increases customer speed

### ❌ DON'T BUILD IF:

- Requires new customer segment
- Agency/service heavy
- Gamification focused
- Generic tool (not menu-specific)
- "Interesting" but not strategic

---

**Last Updated:** January 2, 2026  
**Review Frequency:** Quarterly  
**Owner:** Product Strategy

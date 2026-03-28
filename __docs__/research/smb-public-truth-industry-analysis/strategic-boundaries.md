# Strategic Boundary Map — What MenuList Must Never Solve

**Version:** 1.0 | **Date:** February 22, 2026  
**Source:** ChatGPT strategic analysis + Cascade doctrine validation  
**Authority:** Locked to existing doctrine. No implementation without Feature Rejection Gate.

---

## Core Rule

> MenuList should only solve problems that increase its authority as the canonical public business truth layer. Everything else must remain intentionally unsolved — even if customers ask for it.

---

## 1. Permanent No (Never Build)

### A. Delivery Platform Sync & Aggregator Control

**Temptation:** Sync menus to Swiggy/Zomato/UberEats. Central delivery dashboard.

**Why it looks attractive:** Huge visible pain. Daily frustration. Revenue-linked.

**Why it must remain unsolved:**
- Pulls MenuList into transactional layer
- Enters commission/ordering ecosystem
- Requires deep POS + order logic
- Creates support burden
- Turns MenuList into ops tool instead of truth layer

**Correct stance:** MenuList = upstream truth. Aggregators = downstream consumers (eventually). Do not reverse.

**Doctrine violations:** Doc 11 Rule 2 (customer-facing only), Doc 15 Rule 1 (upstream positioning)

### B. Inventory & Kitchen Management

**Temptation:** Auto-86 items from POS/inventory. Stock-based availability sync.

**Why it must remain unsolved:**
- Inventory belongs to POS/kitchen/ERP layer
- Complexity explodes, reliability expectations rise
- Blame shifts to MenuList for kitchen accuracy
- Architecture bloats

**MenuList cares about:** Public availability state. NOT inventory mechanics.

**Doctrine violations:** Doc 11 Rule 2, Doc 08 pre-rejected (POS integration)

### C. Analytics & Insight Dashboards

**Temptation:** Traffic sources, menu views, item popularity, conversion analytics.

**Why it must remain unsolved:**
- Shifts product identity from infrastructure → SaaS tool
- Adds noise, creates dashboard culture
- Weakens silent authority positioning
- Adds cognitive load (Doc 01 Law 6)

**MenuList should feel like:** Electricity. Not Google Analytics.

**Doctrine violations:** Doc 08 pre-rejected, Doc 01 Law 6 + Law 8

### D. Marketing & Growth Tools

**Temptation:** Promotions, campaigns, push notifications, loyalty, CRM, ads.

**Why it must remain unsolved:**
- Shifts identity to revenue optimization tool
- Crowded space with low switching cost
- Creates feature creep
- Attracts wrong customer expectations

**Doctrine violations:** Doc 11 Rule 2, Doc 08 pre-rejected (CRM, loyalty)

### E. Review & Reputation Management Expansion

**Why it must remain unsolved:**
- Turns MenuList into reputation SaaS
- Current minimal reputation layer is sufficient
- Expansion creates analytics dependency

**Stay only at:** Truth correctness → fewer complaints. Not review optimization.

### F. Website Builder / Customization Layer

**Temptation:** Turn OBP into full website builder with themes, sections, SEO tools.

**Why it must remain unsolved:**
- Infinite customization surface
- Support heavy
- Low authority leverage
- Highly competitive space

**OBP must remain:** Official identity page. NOT website builder.

---

## 2. Partial Solve Only (Minimal Touch)

| Area | What We DO | What We DON'T Do |
|------|-----------|------------------|
| Item availability | Fast public truth toggle | Connect to inventory/POS |
| Multi-platform presence | Let platforms reference us | Depend on platforms |
| Multi-language | Structured translation | Build localization engine |
| Real-time status | Manual toggle → auto-propagate | Automated prediction/detection |

---

## 3. The Discipline Test

Before approving any build, ask:

1. Will businesses rely on MenuList MORE after this?
2. Will public truth BREAK without MenuList?
3. Does this remove daily cognitive load?
4. Can this run silently?
5. Does this keep product minimal?

**If any answer = no → don't build.**

---

## 4. Why This Discipline Matters

From all 5 research sources: the market has abundant tools but zero infrastructure. The reason is that every tool tries to solve too many problems. They become feature-rich but replaceable.

MenuList wins by refusing. Infrastructure companies solve one thing so completely that removal is unthinkable. Adding adjacent features makes MenuList easier to compare, easier to replace, and harder to trust.

> "The only acceptable future expansions are: becoming canonical everywhere (search/platforms), real-time correctness of public truth, and pull-based ecosystem dependence on MenuList. Everything else is distraction." — ChatGPT synthesis, validated against doctrine.

---

**Document Signature:** Strategic Boundaries  
**Created:** February 22, 2026  
**Cross-References:** Doc 01, Doc 08, Doc 09, Doc 11, Doc 15

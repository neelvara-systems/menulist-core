# Menu Correctness Engine — Marketing & Sales Collateral

**Version:** 3.1  
**Status:** Source-gated marketing evidence; not current launch certification
**Audience:** Sales, Marketing, Internal Teams  
**Last Updated:** February 14, 2026

---

> **Language Governance Reminder:** This document follows MenuList Language Governance v2.0.  
> No "AI-powered", "Smart", "Dynamic", "Helps you", "Recommends", "Optimized".  
> MenuList manages, runs, handles, determines, executes.

---

## Current Launch Boundary

This marketing collateral describes the current Menu Correctness Engine source contract and active runtime flag. It is not current launch certification and must not be used as a sales guarantee that every surface has been externally certified.

Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:public-business-truth`, browser/mobile save and publish-gate QA, customer-facing surface smoke for validated project data, QR/menu device QA where sales copy references live menus or screens, PDF artifact review where PDF copy is used, POS/provider smoke where POS copy is used, target deploy evidence, and production-host smoke.

Sales language may say supported surfaces read from the same verified project truth. It must not promise instant sync, universal surface certification, or POS/PDF/device behavior without matching target evidence.

---

## 1. Elevator Pitch

### One-Liner (Internal)

MenuList validates menu state on save and keeps supported menu surfaces reading from the same verified project truth after their normal refresh, download, or provider flow completes.

### 30-Second Pitch

When a restaurant owner changes a price or marks an item unavailable, that change should flow through the same verified project truth before customer-facing publishing continues. The Menu Correctness Engine eliminates the validation gap. Every edit passes through save-time validation, and release teams still verify surface-specific refresh, download, provider, and device behavior before launch.

### For CEO/Board

MenuList's core value proposition is trust. Trust requires consistency. The Menu Correctness Engine is the infrastructure that validates menu truth at save time, while release evidence still proves the exact surfaces and outlets included in a launch. This is not a feature we sell. This is the foundation that makes everything we sell trustworthy.

---

## 2. Feature Narrative

### The Problem We Solve

Restaurant owners today manage menus across multiple touchpoints: QR codes on tables, digital screens on walls, PDF printouts at the counter, websites, and POS systems. When they change a price in one place, they worry: "Did it update everywhere?"

This worry is justified. Different surfaces update at different speeds. A screen might show the old price for 18 seconds. A downloaded PDF is permanently stale. A POS webhook fires after a debounce delay. The owner has no way to verify consistency without manually checking each surface.

This creates a specific kind of anxiety: **"Is my menu correct right now?"**

### How MCE Eliminates This

The Menu Correctness Engine runs in the project save path before customer-facing publishing flows continue. When an owner saves, MCE:

1. **Validates** — checks that the menu is complete and correct (all items have names, prices are valid, categories are intact)
2. **Stamps** — marks the project data as verified, so supported surfaces can read the same validated project truth through their existing paths

No duplicate data. No separate collections. No background monitoring needed. Validation at save-time is the entire mechanism.

The result: **One verified project truth that supported surfaces use through their existing refresh and regeneration paths.**

### Why This Matters for MenuList's Position

MenuList's identity is "the calm system businesses depend on daily." Calmness requires validated source data and target-specific release evidence. MCE makes save-time validation invisible and automatic — the owner doesn't even know it's there, which is exactly the point.

---

## 3. Key Messages

### For Sales Conversations

| Situation                                                 | Message                                                                                                                                                          |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner asks "How do I know my menu is using the right source?" | "MenuList verifies your menu automatically and keeps supported surfaces reading from the same project truth."                                                    |
| Owner worries about price errors                          | "When you change a price, MenuList validates the menu state before customer-facing publishing flows continue."                                                   |
| Multi-outlet owner asks about consistency                 | "Every location reads from verified project truth. Master changes and outlet overrides still need target QA for the exact release scope."                         |
| Competitor comparison                                     | "Most menu systems write changes directly. MenuList verifies first, then publishing flows continue. That's the difference between hoping and having source evidence." |

### For Support Conversations

| Situation                                        | Message                                                                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Owner reports "my screen shows old price"        | "MenuList verified and saved your latest menu. Screens refresh through their device polling and cache path, so check the target screen state before closing the issue." |
| Owner asks "how long until my changes are live?" | "Your changes are verified on save. Each surface then follows its own refresh, download, provider, or device timing."                       |
| Owner asks "can I check if my menu is correct?"  | "MenuList verifies your menu automatically every time you save. No manual checking needed."                                           |

---

## 4. Positioning

### What MCE Is

- Infrastructure that makes MenuList trustworthy
- Automatic verification of menu correctness on every save
- Zero additional Firebase cost
- Invisible to the owner — works without configuration

### What MCE Is NOT

- Not a new dashboard or analytics screen
- Not a manual verification tool
- Not an approval workflow
- Not something the owner needs to learn, configure, or think about

### Competitive Differentiation

| Aspect                | Typical Menu System                             | MenuList with MCE                                   |
| --------------------- | ----------------------------------------------- | --------------------------------------------------- |
| Price change          | Written directly, hope it syncs                 | Validated, verified, then surfaced through audited paths |
| Multi-surface         | Each surface reads independently                | Supported surfaces read from the same validated project data |
| Error detection       | Owner discovers errors from customer complaints | System validates and catches errors at save-time    |
| Consistency claim | "Should be in sync"                             | "Verified project truth, with surface-specific QA"  |

---

## 5. Internal FAQ

### Q: Is MCE a feature we advertise to customers?

**A:** No. MCE is invisible infrastructure. Customers experience the benefit (consistent menus) without knowing the mechanism. We don't add a "Verified" badge or "MCE Protected" label. The absence of problems is the feature.

### Q: Does MCE change how owners use the editor?

**A:** No. The editing experience is identical. MCE adds validation behind the scenes. If something is wrong (e.g., an item has no name), the owner sees a clear message before proceeding — same as existing validation, just more comprehensive.

### Q: What happens if MCE blocks a save?

**A:** MCE never blocks a save. The raw data is always written to Firestore. MCE stamps verification metadata on the data indicating whether it passed all checks. If validation finds issues, the owner sees clear messages prompting them to fix the issues.

### Q: How does this affect our pricing/plans?

**A:** MCE is core infrastructure included in all plans. It's not a premium feature. Every MenuList user gets menu correctness by default. This aligns with our principle: dependability is not optional.

### Q: What's the Firebase cost impact?

**A:** $0.00/month additional. MCE validation runs client-side and adds verification metadata to the existing Firestore write. No new collections, no extra reads, no extra writes.

### Q: Does this work for single-store owners?

**A:** Yes. MCE validates and verifies menus for every store — single or multi-outlet. The multi-outlet validation is an additional layer for chain operators, but single-store owners benefit equally from price validation, field checking, and surface consistency.

---

## 6. Pitch Deck Outline (Internal Use)

### Slide 1: The Problem

"When a restaurant changes a price, how do they know supported surfaces use the validated source?"

### Slide 2: The Gap

- QR menu: follows the public refresh/cache path
- Digital screen: follows its device polling/cache path
- PDF: generated artifacts should be replaced after later edits
- POS: updates after debounce
- Owner: no way to verify

### Slide 3: The Solution

"MenuList validates menu truth on save before customer-facing publishing flows continue."

### Slide 4: How It Works

1. Owner saves (no change to workflow)
2. System validates completeness and correctness
3. Verification metadata stamped on project data
4. Supported surfaces read the same validated project data through their audited paths

### Slide 5: The Source Commitments

- Single source of truth for supported surfaces
- Validation before supported publishing flows continue
- Owner's work never lost (save always succeeds)
- Zero owner configuration
- Zero Firebase cost increase

### Slide 6: Why This Matters

"Trust requires consistency. Consistency requires verification. MenuList is the only menu system that verifies before publishing."

### Slide 7: What Owners Experience

"Nothing extra. They save their menu, and MenuList validates the project truth before publishing flows continue."

---

## 7. Strategic Positioning: Infrastructure, Not Feature

### The Category Shift

MCE is what transforms MenuList from a SaaS tool into infrastructure. This distinction matters for every internal conversation.

| Dimension          | Menu SaaS (Before MCE)     | Menu Infrastructure (With MCE)                 |
| ------------------ | -------------------------- | ---------------------------------------------- |
| What it does       | Creates and displays menus | Validates menu truth before publishing flows continue |
| Owner relationship | "Tool I use"               | "System I depend on"                           |
| Failure mode       | "Wrong price on screen"    | "Detected at save time or caught by surface QA" |
| Switching risk     | Low — just export data     | High — lose correctness guarantee              |
| Category           | Menu management software   | Customer-facing truth infrastructure           |

### Why This Matters for Business

When MenuList is a tool, owners evaluate alternatives every renewal. When MenuList is infrastructure, removing it creates risk. Infrastructure has lower churn, higher pricing power, and stronger word-of-mouth.

**The sentence owners should say after 8 months:** "We don't worry about menu anymore — it's handled."

### 3-Layer Strategic Vision (Internal Only)

MCE is Layer 1 of a 3-layer strategy. Do not share this externally.

| Layer | Name                           | Timeline | What It Enables                                                            |
| ----- | ------------------------------ | -------- | -------------------------------------------------------------------------- |
| 1     | **Truth Infrastructure** (MCE) | Source-gated runtime | Save-time validation for supported MenuList surfaces                       |
| 2     | **Presence Authority**         | Separate audited scope | MenuList as source of truth for public business info                       |
| 3     | **Distribution Control**       | Separate audited scope | Verified data distribution to approved external channels                   |

**Key insight:** You cannot distribute incorrect data globally. MCE is the prerequisite for Layer 2 and 3. Without it, every future distribution channel carries risk.

### The Identity Shift (From External Review)

With MCE live, MenuList is no longer just a "menu builder." It becomes a **validated customer-facing truth system**.

| Before MCE                        | After MCE                                       |
| --------------------------------- | ----------------------------------------------- |
| Menu management software          | Customer-facing truth infrastructure            |
| "Saves and publishes menus"       | "Validates menu truth before surface publishing" |
| Competitor can replicate features | Competitor cannot replicate embedded validation |
| Owner evaluates alternatives      | Owner depends on correctness guarantee          |

This is the foundation for: distribution layer, GBP sync, global presence control, and any future surface expansion. Without a correctness layer, none of those can be stable.

### The Real Moat

Competitors can build:

- AI menu generators
- Design tools
- Marketing features
- POS integrations

What they cannot easily replicate:
**Deterministic validation enforcement on every save with zero-cost verification metadata.**

That is infrastructure thinking. It is hard to copy because it requires embedding validation into the core data flow, not just adding a feature.

### MCE Stability Doctrine (Locked)

MCE is DONE once stable. Infrastructure value comes from **stability over time**, not constant evolution. Do NOT:

- Keep adding rules to "improve" MCE
- Add analytics/dashboards for MCE
- Add background monitoring systems
- Add "enhanced" validation modes

If MCE is boring and invisible for 3 years — it's working perfectly.

---

## 8. Content Do's and Don'ts

### Do

- Say "verified" — it's accurate and reassuring
- Say "supported surfaces read from the same verified project truth" — it matches the current source contract
- Say "automatic" — MCE requires zero owner action
- Focus on the outcome (correct menus) not the mechanism (validation rules, metadata)
- Use calm, confident language

### Don't

- Don't say "AI-powered" — MCE is rule-based validation, not AI
- Don't say "smart" or "intelligent" — it's systematic, not clever
- Don't say "helps you verify" — the system verifies, the owner does nothing
- Don't say "monitor your menu" — monitoring implies owner attention
- Don't explain the technical mechanism to customers
- Don't create urgency ("your menu might be wrong!") or overstate release evidence ("every surface has been certified")
- Don't compare to competitors by name

---

## 8. Relationship to Other Features in Sales Conversations

| Feature                 | How to Position MCE with It                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Digital Screens**     | "Your screen reads from the same verified project truth as your QR code after its device refresh path completes." |
| **Multi-Outlet**        | "Every location reads from verified project truth while preserving outlet overrides through the existing location flow." |
| **POS Sync**            | "Your POS connection reads from the same verified project truth when the connected provider flow runs."       |
| **PDF Export**          | "PDFs are generated from the same verified source as your digital menu when the owner regenerates the artifact." |
| **Menu Command Center** | "Bulk changes go through the same verification path before publishing flows continue." |

---

_Document Classification: Internal — Sales & Marketing Teams_  
_This document follows MenuList Language Governance v2.0_

# Staff Prompt Mode — Product Specification

**Created:** January 11, 2026  
**Status:** Historical spec evidence; active runtime is read-only Today summary display; not current launch certification
**Source:** ChatGPT Brainstorm (Jan 11, 2026) + Architecture Validation  
**Applies:** 3-Year Architecture Freeze Rule  
**Related:** `@__docs__/governance/AUTHORITY_ENFORCEMENT.md`

> **Runtime note (June 11, 2026):** Active MenuList code does not expose a separate staff-facing interface. It renders a read-only `staffPrompt` card in desktop/mobile Today when the existing Today summary marks the prompt eligible.

---

## Current Runtime Boundary

This specification is historical source evidence for the Staff Prompt idea. The active runtime is the read-only Today summary consumer only: `getTodayCampaigns()` reads `platformSummary/campaigns_{sId}.staffPrompt`, desktop/mobile Today render it only when `eligible` is true, and there is no standalone Staff Prompt generator, provider call, staff-facing route, owner setting, mobile-only write, or public Staff Prompt landing page.

Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:staff-prompt-runtime`, authenticated desktop/mobile Today QA with an eligible target-store `staffPrompt`, target deploy evidence, and production-host smoke. If the release scope claims generated prompts end-to-end, upstream summary-writer evidence for `platformSummary/campaigns_{sId}.staffPrompt` is also required.

---

## Executive Summary

Staff Prompt Mode is the **most dangerous** and **most powerful** surface in MenuListAi. It determines what humans say to other humans at the moment of interaction.

### The Surface Hierarchy

| Surface           | Customer Experience                 | Risk Level  |
| ----------------- | ----------------------------------- | ----------- |
| Digital Screens   | Customer **sees** recommendation    | Medium      |
| Physical Surfaces | Customer **notices** recommendation | Low         |
| **Staff Prompt**  | Customer **hears** recommendation   | **HIGHEST** |

This is **behavioral infrastructure** — not a UI feature.

### The Goal

> **Standardize human speech without staff knowing they're being standardized.**

---

## What Staff Prompt Mode Is

**NOT:**

- Staff training system
- Scripts or playbooks
- "Sales tips"
- Notifications to staff phones
- Separate app
- Performance tracking

**IS:**

- ONE sentence staff naturally repeats
- Shown to owner in Today tab
- Owner reads → repeats verbally → staff mirrors
- Appears rarely (authority through scarcity)

### Why It Works

In real SMBs:

1. Customer asks: "What's good?"
2. Staff panics or defaults to: "Everything is good."
3. That kills upsell opportunity

With Staff Prompt:

1. Customer asks: "What's good?"
2. Staff says: "Most people take the Paneer Tikka."
3. Customer feels safe, decides faster

**MenuList just standardized human speech.**

---

## Where This Lives

**CRITICAL:** Staff Prompt lives **inside Today tab**. NOT:

- ❌ Separate sidebar item
- ❌ Separate settings page
- ❌ Staff-facing app
- ❌ Push notification
- ❌ Email/SMS

### Why Inside Today

In SMBs:

- Staff follows owner
- Owner sets tone
- Owner repeats what they see

MenuList influences staff **through the owner**, not directly.

---

## Owner Experience

In Today tab (only when extremely confident):

```
┌─────────────────────────────────────────┐
│  Staff prompt for today                 │
│                                         │
│  Say this when customers ask:           │
│                                         │
│  "Most people take the paneer tikka."   │
│                                         │
│  Applies today                          │
└─────────────────────────────────────────┘
```

**No button.** No copy. No "send to staff". No settings.

Owner reads this once → repeats it verbally → staff mirrors it.

That's how behavior spreads in SMBs.

---

## Copy Structure (ABSOLUTELY LOCKED)

### The ONE Sentence (No Variants)

```
"Most people take ___."
```

**This is immutable.** No alternatives. No synonyms.

| ❌ ChatGPT Suggested (REJECTED)  | Why Rejected                         |
| -------------------------------- | ------------------------------------ |
| "Many customers choose \_\_\_."  | Linguistic variance = authority leak |
| "Regulars usually order \_\_\_." | Creates explanation questions        |

**Disagree with ChatGPT on variants** because humans notice phrasing changes more than content changes. Consistency builds authority. If "most" feels too strong → don't show the prompt at all.

> **Silence > Softening**

### Forbidden Phrases

- ❌ "You should"
- ❌ "Try"
- ❌ "Best"
- ❌ "Recommended"
- ❌ "Trending"
- ❌ "Popular" (as adjective)
- ❌ Any verb suggesting action

**Authority comes from social proof, not commands.**

---

## Confidence Gate (HIGHEST OF ALL)

Staff Prompt shows **ONLY** if ALL conditions are met:

| Requirement                  | Threshold                                                          |
| ---------------------------- | ------------------------------------------------------------------ |
| Confidence score             | ≥ 0.8 (vs 0.6 for campaigns, 0.7 for screens)                      |
| Stability (consecutive days) | ≥ 10 days                                                          |
| Validated on other surfaces  | Must have appeared on Decision Blocks, Screen, OR Physical Surface |
| Price-sensitive              | FALSE                                                              |
| Availability-risky           | FALSE                                                              |
| Item availability            | TRUE (runtime check)                                               |
| Stock volatility             | ❌ Not sold out in last 7 days                                     |
| Item type                    | ❌ Never alcoholic items                                           |
| Modifier complexity          | ❌ Items with >3 modifiers excluded                                |

**If nothing qualifies → DO NOT SHOW THIS SECTION**

Silence = authority.

---

## Prompt Inertia Rules (CRITICAL — Per ChatGPT Validation)

These rules prevent "AI mood swings" and build staff memory:

| Rule                  | Value                                              |
| --------------------- | -------------------------------------------------- |
| Same sentence minimum | **3 consecutive days** (no mid-week changes)       |
| Maximum appearance    | **2 days per week** (rarity = authority)           |
| Item change rule      | If eligibility breaks → prompt disappears entirely |
| No substitution       | Never swap to "next best item"                     |
| Weekly reset          | Inertia resets on Monday                           |

**Why:**

- Staff memorizes through repetition
- Owner trusts through consistency
- Rare appearance = higher impact

---

## Eligibility Gates (Complete List)

### Gate 1: Confidence (0.8 minimum)

Higher than any other surface. One wrong suggestion destroys trust permanently.

### Gate 2: Stability (10+ days)

Item must have been consistently high-confidence for 10+ days. No flash-in-the-pan items.

### Gate 3: Prior Validation

Must have appeared on at least one other surface:

- Decision Blocks (customer-facing menu)
- Digital Screen
- Physical Surface (Tent Card/Counter Sticker)

This ensures the recommendation has been "tested" silently before reaching human speech.

### Gate 4: Availability Certainty

- `available === true` at runtime
- Zero stock-outs in last 7 days
- Not time-restricted (no breakfast-only items at dinner)

### Gate 5: Item Restrictions

| Restriction                | Reason                                  |
| -------------------------- | --------------------------------------- |
| No alcoholic items         | Legal/cultural sensitivity              |
| No items with >3 modifiers | Staff can't explain complex items       |
| No high-variance items     | Items with seasonal/weekly availability |

---

## What We Must NEVER Do

| Action                      | Why Forbidden                      |
| --------------------------- | ---------------------------------- |
| ❌ Notify staff directly    | If staff feels managed, they rebel |
| ❌ Track staff compliance   | Creates surveillance anxiety       |
| ❌ A/B test wording         | Introduces uncertainty             |
| ❌ Show multiple prompts    | Creates choice paralysis           |
| ❌ Add explanation          | Explanations invite debate         |
| ❌ Add "why this works"     | Same as above                      |
| ❌ Show history             | Creates comparison and doubt       |
| ❌ Allow owner override     | Dual authority kills system trust  |
| ❌ Morning/evening variants | Complexity creep                   |
| ❌ Staff analytics          | Surveillance anxiety               |

---

## Support Rule (HARD — Non-Negotiable)

If owner asks:

- "Why this item?"
- "How did it decide?"
- "Can I change the sentence?"

**Support response is ALWAYS:**

> "MenuList only shows staff prompts when customer behavior is extremely consistent. If it's shown, it's already safe to say."

No metrics. No confidence scores. No reasoning.

**Reference:** `@__docs__/governance/AUTHORITY_ENFORCEMENT.md`

---

## Failure Modes & Protections

| Failure               | Cause              | Protection                                         |
| --------------------- | ------------------ | -------------------------------------------------- |
| Staff says wrong item | Unavailable item   | Runtime availability check + 7-day volatility gate |
| Sounds salesy         | Marketing copy     | Plain declarative language only                    |
| Owner ignores         | Too frequent       | Max 2 days/week appearance                         |
| Staff forgets line    | Phrase changes     | 3-day minimum inertia                              |
| Owner loses trust     | "AI experimenting" | No substitution rule                               |
| Chaos                 | Multiple prompts   | One sentence, one item, always                     |

---

## Success Criteria (Internal Only — Never Expose)

| Metric              | Target            | Measurement           |
| ------------------- | ----------------- | --------------------- |
| Appearance rate     | < 30% of days     | Rarity = authority    |
| Owner action needed | None              | Read-only, no buttons |
| Prompt changes/week | ≤ 1               | Inertia enforcement   |
| Verbal adoption     | N/A (qualitative) | User interviews only  |

---

## Scope

### In Scope

- Single staff prompt in Today tab
- Eligibility calculation (backend)
- Inertia rules (backend)
- Frontend component (read-only display)

### Out of Scope (FOREVER)

- Staff app
- Staff notifications
- Compliance tracking
- Owner customization
- Multiple prompts
- Phrase variants
- Explanation UI
- History/analytics

---

## Firebase Cost Impact

**Zero additional reads/writes** — Reuses existing `CampaignsSummaryDocument`.

The `staffPrompt` field is computed during the daily campaign sync and stored in the same document.

---

## Risks & Mitigations

| Risk                       | Likelihood | Impact | Mitigation                                  |
| -------------------------- | ---------- | ------ | ------------------------------------------- |
| Wrong item suggested       | Low        | High   | 0.8 confidence gate + stability requirement |
| Staff ignores prompt       | Medium     | Low    | Expected; owner repetition creates pressure |
| Owner asks for explanation | High       | Medium | Support playbook (never explain)            |
| Feature creep requests     | High       | High   | LOCKED spec + governance docs               |

---

## Open Questions

None. Spec is complete.

---

## Historical Definition of Done

The original Staff Prompt Mode plan treated the feature as complete when the checklist below passed. For the current release, treat this as historical planning evidence only; the active source gate is `npm run verify:staff-prompt-runtime` plus the launch evidence listed in the runtime boundary above.

- [ ] Appears in Today tab only when eligible
- [ ] Uses exact sentence structure ("Most people take \_\_\_.")
- [ ] Respects 3-day inertia rule
- [ ] Appears max 2 days per week
- [ ] Never shows explanation or settings
- [ ] Support team trained on response pattern

---

**Document Status:** Historical spec evidence; not current implementation or launch approval
**Estimated Effort:** 3 days  
**Priority:** P1 (after Digital Screen Hardening)  
**ChatGPT Validation:** ✅ Approved with corrections applied

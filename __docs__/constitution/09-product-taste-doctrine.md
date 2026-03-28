# Product Taste Doctrine

**Version:** 1.0  
**Status:** 🔒 LOCKED — APPLY TO EVERY DECISION  
**Authority:** Founder Only  
**Source:** ChatGPT Session #6 + Independent Web Research + Codebase Cross-Check  
**Companion To:** `08-feature-rejection-gate.md` (formal features) — this doc covers **everything else**

---

## Why This Exists

The Feature Rejection Gate (`08-feature-rejection-gate.md`) governs formal feature proposals — 5 questions, all must pass. It works.

But most daily product decisions are not features:
- Button label choices
- Toast message wording
- Whether a tooltip should exist
- Flow simplification
- UI copy changes
- Micro-interaction additions
- Information density decisions

These decisions happen dozens of times per session. The Feature Rejection Gate is too heavy for them. This doctrine provides the **lightweight daily filter** for everything that isn't a formal feature proposal.

---

## The Definition

> **"Taste is the ability to consistently choose what should exist and reject what shouldn't — before results or data prove it."**

In MenuList context:

- **High taste:** Removing options, simplifying flows, making things invisible, choosing silence
- **Low taste:** Adding dashboards, settings, toggles, explanations, "helpful" messages

Taste is not visual polish. It is **product judgment** — knowing what deserves to exist.

---

## The Taste Check (Daily Decision Filter)

For every non-feature product decision, ask these 5 questions. If any answer is wrong, stop.

### 1. Should this exist at all?

Most things should not exist. The default answer is **no**.

```
Ask: "If I don't add this, will anyone suffer?"
If no one suffers → don't add it.
```

### 2. Does this increase or dilute authority?

MenuList's authority comes from **calm confidence**. Anything that makes it feel anxious, over-helpful, or noisy dilutes authority.

```
Ask: "Does this make MenuList feel more like infrastructure or more like software?"
Infrastructure → keep.
Software → cut.
```

### 3. Does this simplify or add noise?

Every element on screen competes for attention. More elements = more cognitive load = less trust.

```
Ask: "After adding this, is the screen calmer or busier?"
Calmer → keep.
Busier → cut.
```

### 4. Is this infrastructure-level or feature-level thinking?

Infrastructure-level: solves a problem so deeply the owner forgets it was a problem.  
Feature-level: gives the owner a new capability they must learn, decide about, or manage.

```
Ask: "Will the owner need to think about this?"
No → infrastructure. Keep.
Yes → feature-level. Apply Feature Rejection Gate instead.
```

### 5. Is this the right thing at the current stage?

Even good ideas at the wrong time are bad ideas. Right now MenuList needs **behavioral adoption**, not new capabilities.

```
Ask: "Does this help the owner use MenuList as their default customer link?"
Yes → right timing.
No → park it.
```

---

## How This Relates to Existing Governance

| Decision Type | Governance Tool | Weight |
|---------------|----------------|--------|
| **New feature proposal** | Feature Rejection Gate (08) — 5 questions, 5/5 required | Heavy (formal) |
| **Daily product decision** (UI, copy, flow, micro-interaction) | **Taste Check** (this doc) — 5 questions, mental check | Light (daily) |
| **Strategic direction** | Strategic Frameworks (03) — 3 frameworks | Strategic |
| **What to say / not say** | Language Governance (02) — forbidden/allowed words | Specific |

The Taste Check is NOT a replacement for the Feature Rejection Gate. It fills the gap for the hundreds of small decisions that aren't formal features.

---

## The Builder Hierarchy

In the AI era, execution is cheap. What matters is what you choose to execute.

```
Layer 1: TASTE          ← What should exist
Layer 2: JUDGMENT        ← What to remove
Layer 3: SYSTEMS THINKING ← How it compounds over time
Layer 4: AI EXECUTION    ← Build it fast
```

**Most people start at Layer 4.** They use AI to build fast, then wonder why the result feels mediocre.

**MenuList starts at Layer 1.** We decide what should exist (taste), then what to cut (judgment), then how it fits the system (architecture), then execute (AI-assisted development).

### Applied to MenuList Development

| Layer | MenuList Practice | Governance Doc |
|-------|------------------|----------------|
| Taste | "Should this exist?" | This doc (09) |
| Judgment | "Does this pass the gate?" | Feature Rejection Gate (08) |
| Systems | "Does this compound authority?" | Strategic Frameworks (03) |
| Execution | "Build it" | IDE_PROMPTS/, .windsurf/workflows/ |

---

## The Editor Mindset

> **"The best founders in the AI era won't be the best builders. They'll be the best editors."**
> — Validated by Typeform co-founder David Okuniev (ProductLed, 2025): *"Taste and design and being able to direct it is going to be the big differentiator."*

An editor's job:
- **Remove** what doesn't earn its place
- **Simplify** what remains
- **Tighten** every flow until nothing is wasted
- **Kill** anything that needs explanation to justify

This is not about being minimalist for aesthetics. It is about **ruthless quality control**.

### What Editors Do (Apply to MenuList)

| Editor Action | MenuList Application |
|---------------|---------------------|
| Cut unnecessary paragraphs | Remove unnecessary screens, modals, steps |
| Tighten sentences | Simplify flows — fewer clicks, fewer decisions |
| Remove filler words | Remove "helpful" tooltips, info banners, explanatory text |
| Ensure every word earns its place | Ensure every UI element earns its pixel space |
| Say more with less | Show less, communicate more through silence |

### The One Rule

> **If you have to explain why something exists, it probably shouldn't.**

This aligns with Feature Rejection Gate: *"If a feature requires explanation to justify its existence, it is rejected."*

The Editor Mindset extends this from features to **everything** — every label, every icon, every message, every screen.

---

## Stage-Appropriate Execution

Even with perfect taste, building the right thing at the wrong time wastes effort.

### The 3 Phases (Where MenuList Is Now)

| Phase | Focus | MenuList Status |
|-------|-------|----------------|
| **Phase 1: Niche Dominance** | Win one specific wedge deeply. Premium cafés/restaurants. Become their default customer-facing link. | ← **WE ARE HERE** |
| **Phase 2: Infrastructure Expansion** | Expand horizontally after dominance. More business types, more surfaces, more distribution. | Future (after 50+ active stores) |
| **Phase 3: Ecosystem** | Capital allocation, multiple products, platform plays. | Future (after proven PMF) |

### The Rule

> **"Be category-obsessed until you win. Then expand without mercy."**
> — Validated by every billion-dollar startup: Amazon (books), Stripe (developer payments), Airbnb (air mattresses), Facebook (Harvard).

**What this means right now:**
- Do NOT build features for business types we haven't onboarded
- Do NOT expand to new surfaces until current surfaces prove adoption
- Do NOT add capabilities until current capabilities create dependency
- DO focus entirely on making MenuList the **default customer link** for onboarded stores

---

## Taste Anti-Patterns (Recognize and Reject)

### Anti-Pattern 1: "Just a Small Addition"

> "Can we just add a small info text here?"

**Response:** Every "small addition" competes for attention. Small additions compound into noisy interfaces. The question is not "is this small?" but "does this earn its existence?"

### Anti-Pattern 2: "It Might Help Someone"

> "Some owners might find this useful."

**Response:** "Might help someone" is not a reason to exist. Everything must help the **core moment** (customer decides faster) or strengthen **behavioral adoption** (owner sends MenuList link).

### Anti-Pattern 3: "Other Products Do This"

> "Competitors have this feature/element/pattern."

**Response:** We don't compete on features. We compete on **confidence**. If competitors add complexity, that's their problem — not our cue to follow.

### Anti-Pattern 4: "It's Just UI, Not a Feature"

> "This is just a label change / tooltip / banner — not a feature."

**Response:** UI IS the product. Every element shapes how the owner feels. The Taste Check applies to UI changes with the same rigor as the Feature Rejection Gate applies to features.

### Anti-Pattern 5: "We Already Built the Backend"

> "The API exists, we just need the UI."

**Response:** Sunk cost is not a reason to ship. If the UI doesn't pass the Taste Check, the backend waits. (Already in Feature Rejection Gate — Pattern 5.)

---

## The Taste Spectrum (MenuList Examples)

### High Taste Decisions (What We Do)

- Save status shows "· Live" instead of "Saved successfully at 14:32:01 IST"
- No onboarding wizard — menu appears, link works, done
- BehaviorNudgeCard is dismissible and shows once (not persistent)
- Post-save confidence toast fires once per session (not every save)
- OBP page shows only: name, logo, hours, actions, menu button (not everything we know)
- Error state: silence or "No action needed" — never stack traces or technical detail
- Digital Screens: cached-first rendering, graceful fallback to brand slide

### Low Taste Decisions (What We Avoid)

- ❌ Analytics dashboards with charts and numbers
- ❌ "Did you know?" tips or "Pro tip" banners
- ❌ Feature announcement modals
- ❌ Gamification (streaks, badges, progress bars)
- ❌ "You haven't logged in for 7 days" emails
- ❌ Comparison views ("this vs that")
- ❌ "Why this recommendation" explanations
- ❌ Settings pages with dozens of toggles

---

## Integration with Development Workflow

### When Cascade (AI) Makes Product Decisions

Before adding ANY UI element, copy change, or micro-interaction:

1. **Run the Taste Check** (5 questions above)
2. If element is a new feature → **also run Feature Rejection Gate** (08)
3. If element involves public copy → **also check Language Governance** (02)
4. If element involves expansion → **also check Strategic Frameworks** (03)

### The Quick Version (Memorize This)

> **"Does this earn its existence? Does this make MenuList feel more like infrastructure? Is the screen calmer after adding this?"**
>
> If all three → proceed.  
> If any fail → cut it.

---

## The Connection to Core Doctrine

This doctrine is the **practical application** of Core Doctrine laws to daily decisions:

| Core Doctrine Law | Taste Doctrine Application |
|-------------------|---------------------------|
| Law 2: Silence Is a Feature | Default to not adding. Every addition needs justification. |
| Law 5: Public Surfaces Demand Perfection | Show less, not wrong. Less is almost always better. |
| Law 6: No Cognitive Load | If the owner notices it, it's probably too loud. |
| Law 8: Trust > Engagement | Don't add things to increase engagement. Add things that increase trust. |
| Law 10: Authority Is Fragile | One noisy element can make the whole product feel amateur. |

---

**Document Signature:** Founder Constitution  
**Last Updated:** February 2026  
**Web Research Sources:** Typeform/ProductLed (2025), Forbes (2025), LA Times (2025)  
**Cross-References:** 01-core-doctrine.md, 03-strategic-frameworks.md, 08-feature-rejection-gate.md

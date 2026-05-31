# Product Separation Doctrine

**Version:** 1.0
**Status:** 🔒 LOCKED — Permanent separation rules
**Authority:** Maximum — Overrides all bundling, merging, or feature-sharing proposals
**Source:** ChatGPT Strategic Session → Cascade Review + Codebase Cross-Check
**Review:** `__docs__/growthos-addon/_archive/growth-execution-strategy-2026-05-31/_archive/chatgpt-review.md`
**GrowthOS Current Plan:** `__docs__/growthos-addon/README.md`
**Positioning Map:** `__docs__/strategy/product-positioning-map.md`

---

## The Single Rule

> **MenuList, GrowthOS, and KitStamp are three independent products forming a vertical stack. They must never merge, share identity, or blur boundaries.**

---

## Rule 1 — Product Identity Lock

Each product has exactly one identity. If any product answers more than one question, it has drifted.

| Product | Identity | The One Question It Answers |
|---------|----------|---------------------------|
| **MenuList** | Customer-facing infrastructure | "What should my menu be doing right now?" |
| **GrowthOS** | Transactional execution engine | "Give me something I can post or send right now." |
| **KitStamp** | Content preparation workspace | "Prepare this content perfectly before I publish it." |

### Enforcement

- If a feature answers two questions → **reject it**
- If a feature answers none → **reject it**
- If someone says "it's a bit of all three" → **kill it**

---

## Rule 2 — AI Posture Rules (Non-Negotiable)

Each product uses AI differently. Mixing these collapses trust.

| Product | AI Posture | Behavior |
|---------|-----------|----------|
| **MenuList** | **Authority** | Silent, decisive. System knows best. Never explains. |
| **GrowthOS** | **Delegate** | Invisible, transactional. System delivers. Never discusses. |
| **KitStamp** | **Assistant** | Visible, collaborative. System helps. Can explain when asked. |

### What Happens If Mixed

| Mix | Result |
|-----|--------|
| Authority + explanation | Broken trust (MenuList fails) |
| Assistant + silence | Confusion (KitStamp fails) |
| Delegate + chat | Paralysis (GrowthOS fails) |

---

## Rule 3 — Time Horizon Lock

Each product operates on exactly one time horizon. If the time model shifts, the product identity collapses.

| Product | Time Model | Hard Rule |
|---------|-----------|-----------|
| **MenuList** | Continuous / nightly / always-on | MenuList never feels urgent |
| **GrowthOS** | Moment-based / immediate | GrowthOS never feels thoughtful |
| **KitStamp** | Project-based / slow / deliberate | KitStamp never feels rushed |

---

## Rule 4 — Dependency Direction Lock

```
MenuList  ──►  GrowthOS   (read-only, one-way)
MenuList  ──►  KitStamp  (read-only, one-way)
```

### Allowed

- GrowthOS reads public MenuList data (store name, hours, menu items)
- KitStamp reads public MenuList data (store name, menu items, images)

### Permanently Forbidden

- GrowthOS or KitStamp writing to MenuList
- GrowthOS or KitStamp triggering MenuList jobs
- GrowthOS or KitStamp influencing MenuList UI or behavior
- MenuList depending on GrowthOS or KitStamp for any function
- GrowthOS depending on KitStamp or vice versa

### Independence Test

Each product must be able to exist, operate, and be sold **without the other two.** If any product disappeared tomorrow, the other two must still function.

---

## Rule 5 — Surface & UI Firewall

No UI component, surface, or interaction pattern may cross product boundaries.

| Product | Allowed Surfaces | Kill Rules |
|---------|-----------------|-----------|
| **MenuList** | Dashboards (operational), rules, settings | ❌ Never gets "campaigns", "posts", or "canvas" |
| **GrowthOS** | Task → Input → Output (4 surfaces only) | ❌ Never gets a canvas, dashboard, or iteration UI |
| **KitStamp** | Canvas, preview, versions, approval | ❌ Never gets "instant generate" or transactional flow |

### Shared UI Components

No shared navigation, no embedded widgets, no cross-links implying dependency. At most: a soft link-out.

---

## Rule 6 — Monetization Separation

Each product has its own pricing logic. No blended pricing.

| Product | Pricing Model |
|---------|--------------|
| **MenuList** | Subscription (infrastructure) |
| **GrowthOS** | Per kit / prepaid bundle |
| **KitStamp** | Project / deliverable-based |

### Only Allowed Bundle

✅ "MenuList + X Growth Kits per month" (separate line items, separate value statements)

### Permanently Banned

- ❌ "Unlimited everything"
- ❌ "All-in-one plan"
- ❌ "AI access" as a pricing unit
- ❌ Blended claims across products

---

## Rule 7 — Language Separation

| Product | Language Style |
|---------|--------------|
| **MenuList** | Silent, neutral, authoritative |
| **GrowthOS** | Short, calm, execution-focused |
| **KitStamp** | Explicit, professional, preparatory |

### Shared Language Bans (All Three)

- "AI-powered" / "AI-driven"
- "We suggest" / "We recommend"
- "Based on intelligence"
- All hype, urgency manipulation, or comparative language

---

## Rule 8 — Failure Isolation

If one product fails, the others must remain unaffected.

- Separate auth (or cleanly scoped)
- Separate databases (or cleanly partitioned)
- Separate error handling
- No shared failure modes

If GrowthOS produces bad content → MenuList remains trustworthy.
If KitStamp is unavailable → MenuList runs normally.
If MenuList has a bug → GrowthOS and KitStamp degrade gracefully.

---

## Rule 9 — Priority Order (Locked)

| Priority | Product | Time Allocation | Condition |
|----------|---------|----------------|-----------|
| 🥇 **#1** | **MenuList** | 80-90% | Always. Non-negotiable. |
| 🥈 **#2** | **GrowthOS** | When available | Only after MenuList stable + organic demand |
| 🥉 **#3** | **KitStamp** | Optional | Only if everything else stable |

### Kill Triggers

- If GrowthOS slows MenuList → **pause GrowthOS immediately**
- If KitStamp distracts from core → **pause KitStamp immediately**
- If all three feel "equally important" → **that's the danger signal**

### The Honest Truth

- If KitStamp is never built → **you still win**
- GrowthOS is a monetization lever, not the OS
- Only MenuList can become an SMB OS

---

## Rule 10 — The Red-Flag Test

Use this test for every feature proposal, partnership, or expansion idea:

| Question | If Yes → |
|----------|----------|
| Does it run continuously? | **MenuList** |
| Does it require review and refinement? | **KitStamp** |
| Does it deliver immediate usable output? | **GrowthOS** |
| Is it "a bit of all three"? | **Kill it** |
| "Can we reuse logic across products"? | **Stop and examine** |
| "Let's merge this for efficiency"? | **Hard no** |

---

## Relationship to Existing Doctrine

| Document | This Doc Extends It By |
|----------|----------------------|
| `11-product-evolution-doctrine.md` — Product sequence | Adding formal separation rules between products |
| `01-core-doctrine.md` — 10 Laws | Adding AI posture rules per product |
| `03-strategic-frameworks.md` — Expansion | Adding inter-product dependency constraints |
| `08-feature-rejection-gate.md` — Feature gate | Adding Red-Flag Test for product assignment |

---

## The Success Sentence

> **"MenuList runs the business. GrowthOS gets the word out. KitStamp makes it look right. They never step on each other."**

---

**Document Signature:** Founder Constitution
**Created:** February 19, 2026
**Lock:** Permanent — no expiry
**Modification:** Founder only, requires explicit unlock decision

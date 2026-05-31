# GrowthOS — SMB Growth Execution Engine (Complete Product Strategy)

> **A transactional execution engine that produces ready-to-use promotion & visibility content for SMBs, without requiring them to think, learn, configure, or supervise marketing decisions.**

**Created:** February 19, 2026  
**Source:** ChatGPT Product Design Session (10 documents) → Cascade Codebase Audit + Web Research + Repo Analysis  
**Status:** 🔮 DEFERRED — Not active development. MenuList's Social Content Engine is GrowthOS v0 (prototype).  
**Governance:** `__docs__/constitution/11-product-evolution-doctrine.md` (Rule 1 — Stage 2)  
**Separation:** `__docs__/constitution/12-product-separation-doctrine.md`  
**Review:** `./_archive/chatgpt-review.md`
**Planning Addendum:** `__docs__/growthos-command-center/README.md` captures the May 31, 2026 GrowthOS Command Center / GrowthAction conversation as planning only. It does not unlock implementation or change the Stage 2 gate.
**Current Implementation Planning:** `__docs__/growthos-addon/README.md` supersedes this folder for active GrowthOS planning. The current approved direction is a MenuList higher-tier add-on labelled Growth Kits, not a standalone GrowthOS product.

---

## Quick Navigation

| Section                                                                              | Purpose                                    |
| ------------------------------------------------------------------------------------ | ------------------------------------------ |
| [What GrowthOS Is](#1-what-growthos-is)                                              | Definition, identity, permanent exclusions |
| [GrowthOS v0 — What Already Exists](#2-growthos-v0--what-already-exists-in-menulist) | Codebase reality                           |
| [SMB Reality Model](#3-smb-reality-model)                                            | User constraints that govern all decisions |
| [Problem Taxonomy](#4-problem-taxonomy)                                              | What we solve (and permanently reject)     |
| [Output-First Philosophy](#5-output-first-product-philosophy)                        | Why deliverables, not advice               |
| [Core Product Surfaces](#6-core-product-surfaces)                                    | Allowed UX — and permanently banned UX     |
| [Canonical Use Cases](#7-canonical-use-cases)                                        | The only situations GrowthOS acts in       |
| [Workflow Engine Design](#8-workflow-engine-design)                                  | How generation works silently              |
| [Content Quality & Brand Safety](#9-content-quality--brand-safety-rules)             | Trust firewall                             |
| [MenuList Relationship Contract](#10-menulist-relationship-contract)                 | Separation rules                           |
| [Monetization & Packaging](#11-monetization--packaging)                              | How this makes money                       |
| [Kill Criteria & Expansion Rules](#12-kill-criteria--expansion-rules)                | Discipline governance                      |
| [Market Landscape](#13-market-landscape--competitive-analysis)                       | Why this is differentiated                 |
| [Command Center Planning Addendum](../growthos-command-center/README.md)             | May 31, 2026 GrowthAction planning review  |

---

## Prerequisites (LOCKED)

**Nothing in this document should be built as a separate product until ALL are met:**

1. MenuList stable and trusted by real SMBs (>200 active stores)
2. Control Layer (business truth) proven with daily usage
3. > 70% of onboarded stores using MenuList as primary menu link
4. Strong retention and dependency forming
5. Founder explicitly unlocks Stage 2

**Estimated timeline:** 12-24 months from now, at earliest.

---

## 1. What GrowthOS Is

### One-Sentence Intent

This system exists to produce ready-to-use local growth assets for SMB owners, without requiring them to think, learn, configure, or supervise marketing decisions.

**If a feature does not produce an asset, it is invalid.**

### What It Is

- A **content production system**, not a marketing advisor
- A **workflow executor**, not a thinking partner
- A **delivery engine**, not a performance analyzer
- A **force multiplier**, not a coach

It converts: **Minimal business context → finished growth material**

### What It Is NOT (Permanent Exclusions)

These are permanently rejected — not "phase 2", not "later."

| Rejected                  | Why                                |
| ------------------------- | ---------------------------------- |
| ❌ A chatbot              | Introduces back-and-forth, doubt   |
| ❌ A marketing course     | Cognitive load, low retention      |
| ❌ A CRM                  | Internal operations, wrong product |
| ❌ An analytics dashboard | Reintroduces supervision           |
| ❌ A growth consultant    | Advice, not output                 |
| ❌ A campaign optimizer   | Creates dependency                 |
| ❌ A prompt playground    | Power-user creep                   |
| ❌ A tool for marketers   | Wrong user entirely                |

### Who It Is For (Precisely)

**Primary user:** Owner-operator SMBs who want visibility and sales without becoming marketers.

Characteristics:

- Runs the business personally
- Has <30 minutes/day for "marketing"
- Hates dashboards, theory, configuration
- Wants something to post/send/use today

**Explicitly NOT for:** Agencies, freelancers, marketing teams, growth hackers, "AI power users."

### Definition of "Helpful"

> **"I can download this and use it immediately without editing."**

Helpful does NOT mean: insightful, educational, strategic, informative, optimized, explainable.

### Success Definition

GrowthOS is successful if:

- SMB owners use outputs without modification
- They return only when they need another asset
- They do NOT ask how it works
- They do NOT explore features
- They do NOT request analytics

If users start asking "Can I tweak this?" — the product has failed.

---

## 2. GrowthOS v0 — What Already Exists in MenuList

**Critical finding:** MenuList's Social Content Engine already implements ~60% of GrowthOS's vision.

### Existing Campaign Engine

| Component                                 | File                                       | Status   |
| ----------------------------------------- | ------------------------------------------ | -------- |
| Campaign generation engine                | `src/lib/campaigns/engine.ts`              | ✅ Built |
| 9 campaign types (5 active + 4 passive)   | `src/types/campaigns.ts`                   | ✅ Built |
| Confidence scoring & threshold gating     | `engine.ts:calculateConfidence()`          | ✅ Built |
| 5 execution surfaces                      | `src/lib/campaigns/executionSurfaces.ts`   | ✅ Built |
| Heuristic surface selection               | `engine.ts:SURFACE_HEURISTICS`             | ✅ Built |
| Today screen UI (desktop)                 | `src/components/templates/main-app/today/` | ✅ Built |
| Today screen (mobile)                     | Mobile Today screen                        | ✅ Built |
| Campaign CRUD + summary sync              | `src/database/campaigns/index.ts`          | ✅ Built |
| Suppression logic (skip tracking)         | `updateSuppressionStats()`                 | ✅ Built |
| Silence Governor (intentional quiet days) | `generateTodayCampaigns()`                 | ✅ Built |
| WhatsApp message generation               | `generateWhatsAppMessage()`                | ✅ Built |
| AI caption generation API                 | `src/app/api/campaigns/caption/route.ts`   | ✅ Built |
| AI image generation                       | Gemini 2.0 + Imagen 3                      | ✅ Built |
| Staff prompt mode                         | `staffPrompt` on summary doc               | ✅ Built |
| Physical surfaces (tent cards, stickers)  | `physicalSurfaces` on summary doc          | ✅ Built |
| Non-comparative outcome signals           | `OutcomeSignal` type                       | ✅ Built |
| Feature flags                             | `SOCIAL_CONTENT_ENABLED` + sub-flags       | ✅ Built |

### Existing Campaign Types

| Type               | Kind    | Description                          |
| ------------------ | ------- | ------------------------------------ |
| `meal_push`        | Active  | Push specific meal during meal hours |
| `bestseller_boost` | Active  | Amplify proven popular items         |
| `slow_item_rescue` | Active  | Revive low-engagement items          |
| `festival`         | Active  | Festival/event campaigns             |
| `new_item`         | Active  | Announce new additions               |
| `todays_special`   | Passive | Daily highlight                      |
| `weekend_pick`     | Passive | Friday suggestion                    |
| `now_available`    | Passive | Availability signal                  |
| `menu_highlight`   | Passive | Evergreen fallback (confidence=0)    |

### Existing Execution Surfaces

| Surface            | Primary Use                         |
| ------------------ | ----------------------------------- |
| `whatsapp_status`  | Broadcast attention (primary India) |
| `whatsapp_message` | Direct customer copy-paste          |
| `print_poster`     | In-store reinforcement              |
| `qr_tent`          | Table-top decision influence        |
| `digital_screen`   | In-store display                    |

### What This Means

The existing Social Content Engine IS GrowthOS v0 — a fully functional prototype living inside MenuList. The GrowthOS "separate product" is the **future extraction** of this capability when:

- MenuList's identity risks being confused with "marketing tool"
- Scale demands separate infrastructure
- Monetization as a standalone product makes business sense

Until then, Social Content Engine stays inside MenuList as an operational feature.

---

## 3. SMB Reality Model

This section grounds all decisions in real SMB behavior, not founder fantasies.

### Time Reality (Non-Negotiable)

| Scenario   | Available Time    |
| ---------- | ----------------- |
| Best case  | 15-30 minutes/day |
| Typical    | 5-10 minutes/day  |
| Worst case | Zero, for weeks   |

This time is fragmented, between tasks, not focused or calm.

### Decision Exhaustion

By the time SMBs think about marketing:

- They've already made dozens of decisions
- Tolerance for ambiguity = near zero
- Patience for "options" = gone

**Rule: More choices reduce perceived value.**

### Technology Tolerance

Assume: Low trust in new tools, zero patience for bugs, fear of "doing something wrong", suspicion of AI hype.

They are NOT impressed by: agents, intelligence, automation, fancy terminology.

They ARE impressed by: "This looks ready", "I can use this", "I don't need to think."

### Motivation Triggers

SMBs act because of **events**, not plans:

- Slow footfall this week
- Festival/holiday coming
- New competitor nearby
- Staff telling them business is slow
- Someone asking "why don't you post?"

**Product must align to moments, not plans.**

### Trust Formation

Trust is built when output looks usable, sounds appropriate, doesn't overpromise, doesn't require fixing.

Trust is DESTROYED when output needs editing, feels generic, feels AI-ish, asks follow-up questions.

**One bad output can kill the relationship permanently.**

### Editing Aversion Rule

> **If an SMB owner has to edit, they feel the tool failed.**

Even minor edits break confidence, reintroduce thinking, create blame.

Therefore: simpler, safer content beats "clever but risky" content.

### Hard Constraint Summary

These are system invariants:

- ≤ 2 minutes thinking time
- ≤ 3 inputs per task
- 1 clear output
- No choices unless unavoidable
- No iteration loops
- No "improve / regenerate" bait

---

## 4. Problem Taxonomy

### Core Principle

We do not solve "marketing." We solve: **SMB owners know they should promote their business, but they fail to execute consistently and confidently.**

This is an execution problem, not a strategy problem.

### Problem Selection Criteria

A problem is valid only if ALL are true:

1. SMB owner already believes this matters
2. Problem occurs repeatedly (weekly/monthly/seasonal)
3. Fix can be delivered as a finished artifact
4. Fix does not require learning or optimization
5. Outcome is visible immediately (posted, shared, used)

### The 5 Allowed Problem Categories

| Category                            | Problem Statement                                             | What Fixes It                                         |
| ----------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| **A — Visibility Gaps**             | "People nearby don't know or remember my business"            | Timely, ready-to-post local content                   |
| **B — Promotion Execution Failure** | "I want to run offers but don't know what to say"             | Pre-written promotion packs tied to real moments      |
| **C — Local Trust Signaling**       | "People see my business but don't feel confident choosing it" | Clean, professional, ready-to-use descriptive content |
| **D — Moment-Based Misses**         | "Opportunities come and go, and I react too late"             | Pre-built content kits for predictable moments        |
| **E — Channel Friction**            | "Adapting content for each channel is tiring"                 | Channel-ready variants of the same core message       |

### Problem → Output Mapping

| Problem Category  | Output Type                   | Existing Campaign Type                 |
| ----------------- | ----------------------------- | -------------------------------------- |
| Visibility Gap    | Post / Message / Announcement | `menu_highlight`, `now_available`      |
| Promotion Failure | Promotion Content Pack        | `meal_push`, `bestseller_boost`        |
| Trust Weakness    | Descriptive / Authority Copy  | OBP (exists in MenuList)               |
| Moment Miss       | Festival / Event Kit          | `festival`, `new_item`                 |
| Channel Friction  | Channel-Specific Variants     | Execution surfaces already handle this |

### Permanently Rejected Problems

| Category                      | Why Rejected                               |
| ----------------------------- | ------------------------------------------ |
| ❌ Strategy & Planning        | Requires thinking, no immediate artifact   |
| ❌ Optimization & Performance | Introduces supervision, creates dependency |
| ❌ Education & Guidance       | Cognitive load, high abandonment           |
| ❌ Automation & Scheduling    | Operational risk, trust erosion            |
| ❌ CRM / Audience Management  | Data sensitivity, complexity               |

---

## 5. Output-First Product Philosophy

### The Core Thesis

SMBs don't fail at marketing because they lack ideas. They fail because they **don't turn intent into finished material.**

Only completed outputs create value. Ideas, suggestions, insights are useless.

### Output vs Advice

| Advice-Based Systems | Output-Based Systems (GrowthOS) |
| -------------------- | ------------------------------- |
| Ask questions        | Ask minimal factual inputs      |
| Offer suggestions    | Execute internally              |
| Explain reasoning    | Deliver finished assets         |
| Present options      | Exit                            |
| Increase doubt       | Build trust                     |

### The Delegation Model

This product must feel like: **"I handed this off, and it came back done."**

NOT: "I collaborated with AI" / "I iterated with a system" / "I learned something"

### Why These Are Banned

| Banned Element          | Why                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| **Chat**                | Back-and-forth, clarifications, doubt. Implies "system is thinking WITH you" instead of "FOR you" |
| **Suggestions**         | Uncertainty, optionality, responsibility returned to user                                         |
| **Analytics**           | Reintroduce thinking, performance anxiety, endless tweaking                                       |
| **Iteration loops**     | Choice paralysis, endless regeneration, lower confidence                                          |
| **"Regenerate" button** | Creates doubt about any single output                                                             |

### Final Content Artifact Definition

A Final Content Artifact must be:

- **Complete** — nothing missing
- **Channel-ready** — formatted for target platform
- **Grammatically clean** — no errors
- **Context-appropriate** — matches local culture
- **Copy-paste usable** — zero editing required

### The Clipboard Test

> "Would the user copy this directly into the target app without edits?"

If not → simplify, reduce cleverness, remove risky phrasing.

**Boring but usable > smart but fragile.**

### Confidence Threshold

Borrowed from MenuList doctrine:

- Deliver only when confidence is high
- Reduce scope if context is weak
- Prefer safe, generic correctness over risky specificity
- Silently downgrade output if needed
- **Never ask the user to fix missing context**

---

## 6. Core Product Surfaces

There are exactly **4 allowed surfaces.** No fifth surface may be added.

### Surface 1 — Task Selection

User answers: "What do you want done right now?"

- Flat list of tasks, no categories
- No explanations, no marketing language
- Each task implies a fixed workflow and fixed output type
- No "custom" task. No "other."

### Surface 2 — Minimal Input

Capture facts only, not preferences.

- Max 3-5 fields
- Only factual information (business name, offer, date, location)
- **Forbidden inputs:** tone, audience, style, goals, keywords, strategy

### Surface 3 — Processing / Waiting

Reinforce delegation.

- Simple status ("Preparing content…")
- No step breakdowns, no agent names, no "thinking" animations

### Surface 4 — Delivery & Export

Hand over the finished asset.

- Clear separation of outputs
- Channel-labelled sections
- Copy-ready formatting
- Export affordances (copy / download)
- **NO:** edit-in-place, suggestions, variants explosion, "try another", feedback prompts

### Permanently Forbidden Surfaces

| Surface                        | Why Banned                                |
| ------------------------------ | ----------------------------------------- |
| ❌ Dashboard                   | Reintroduces evaluation                   |
| ❌ Configuration / Preferences | Turns product into a tool, not a delegate |
| ❌ Iteration / Regenerate      | Creates doubt and endless loops           |
| ❌ Education / Tooltips        | Cognitive overload                        |
| ❌ Chat / Assistant            | Breaks delegation model                   |

### Interaction Count Rule

From open → output:

- ≤ 4 taps/clicks
- ≤ 2 short text inputs
- ≤ 1 decision

---

## 7. Canonical Use Cases

### Admission Rules

A use case is valid only if:

1. Corresponds to a real SMB moment
2. Triggered by an event, not a plan
3. Solved with one content kit
4. Produces immediate action
5. Does not require follow-up thinking

### Use Case #1 — Weekly Promotion Execution

**Trigger:** Slow weekdays, excess inventory, need footfall boost  
**Inputs:** Offer text, validity window (optional), business name  
**Output:** WhatsApp broadcast + Instagram caption + Google post  
**Existing prototype:** `meal_push` + `bestseller_boost` campaign types

### Use Case #2 — Festival / Event Campaign

**Trigger:** Upcoming festival (Diwali, Eid, Christmas, etc.)  
**Inputs:** Festival name, business name, optional offer  
**Output:** Festive WhatsApp greeting + Instagram caption + short poster copy  
**Existing prototype:** `festival` campaign type

### Use Case #3 — Local Visibility Boost (Google Post)

**Trigger:** Low visibility, no recent Google activity  
**Inputs:** Business name, short update (optional), location  
**Output:** Google Business post with neutral CTA  
**Existing prototype:** `menu_highlight` + `now_available` types

### Use Case #4 — Business Description Refresh

**Trigger:** Outdated description, new positioning  
**Inputs:** Business name, category, location  
**Output:** Professional trust-focused copy for Google/website/listings  
**Existing prototype:** OBP description (partially)

### Use Case #5 — WhatsApp Broadcast Message

**Trigger:** New offer, new stock, update for regulars  
**Inputs:** Message purpose, optional offer, business name  
**Output:** Short, clear, non-spammy WhatsApp message  
**Existing prototype:** `generateWhatsAppMessage()` in `executionSurfaces.ts`

### Use Case #6 — New Opening / Relaunch Announcement

**Trigger:** New store, renovation complete, reopening  
**Inputs:** Business name, opening date, location  
**Output:** WhatsApp announcement + Instagram caption + Google post  
**Existing prototype:** ❌ None — genuinely new use case

### Hard Exclusions

Not supported: long-term campaigns, monthly calendars, brand strategy, lead funnels, customer segmentation, retargeting, paid ads copy, email marketing.

---

## 8. Workflow Engine Design

### Core Principle

**Workflows are internal. Outputs are external.** Users never see agents, steps, reasoning, or retries.

### What a "Workflow" Means

A fixed sequence of generation + validation steps, triggered by a specific use case, producing a specific output shape. NOT a conversational agent, flexible planner, or reasoning partner.

### Internal Role Decomposition (Invisible)

Each workflow may involve multiple roles internally:

1. **Context normalizer** — Clean text, validate dates, standardize names
2. **Content generator** — Only inside locked structure
3. **Channel adapter** — Minimal adaptation per platform
4. **Quality validator** — Language safety, channel constraints, spam risk
5. **Safety filter** — No false claims, no urgency manipulation

### Processing Order (Deterministic First, Creative Second)

1. **Normalize inputs** → Clean, validate, standardize
2. **Lock structure** → Output length, sections, tone boundaries
3. **Generate content** → Only inside locked constraints
4. **Validate** → Safety, channels, spam risk
5. **Finalize** → Freeze output. No iteration.

### Confidence Gating

Borrowed from existing `calculateConfidence()` in `engine.ts`:

- If confidence ≥ threshold → deliver full output
- If confidence < threshold → **silently downgrade scope** (e.g., festival promo → festival greeting only)
- Never ask user for more info unless factual and minimal

### Channel Adaptation Logic

Not rewriting from scratch. Process:

1. Generate one canonical message
2. Adapt phrasing minimally per channel
3. Preserve intent and meaning

### Relationship to agentkits-marketing Repo

**What we take:** Role-based internal steps, workflow structure pattern, command-like task mapping  
**What we reject:** Visible agents, slash commands, prompt exposure, conversational control  
**We convert:** Prompt ops → Workflow ops

See: `./agentkits-repo-analysis.md` for detailed extraction plan.

---

## 9. Content Quality & Brand Safety Rules

### Primary Quality Objective

> Every output must sound like a competent local business owner on a good day — not a marketer, not an AI, not a brand consultant.

### Tone Baseline (Locked)

All content: **Calm, neutral, direct, respectful, locally appropriate.**

### Forbidden Language (Hard Ban)

| Category             | Examples                                          |
| -------------------- | ------------------------------------------------- |
| AI language          | "AI-powered", "Generated by", "Based on data"     |
| Marketing jargon     | "Best in class", "Game-changing", "Revolutionary" |
| Manipulative urgency | "Hurry", "Last chance", "Don't miss out"          |
| Exaggerated claims   | "Guaranteed", "Number one", "Top-rated"           |

### Channel-Specific Rules

| Channel             | Rules                                                                  |
| ------------------- | ---------------------------------------------------------------------- |
| **WhatsApp**        | Short, human, non-pushy, no hashtags, no multiple CTAs                 |
| **Instagram**       | Clear message, minimal hashtags, no emoji overload, no engagement bait |
| **Google Business** | Neutral, informational, no promotional exaggeration                    |

### Safety Rules

- Never invent claims (only use provided facts)
- Safety over creativity (boring usable > clever fragile)
- No spam patterns (repetitive CTAs, all-caps, excessive punctuation)
- Human plausibility test: "Could a real owner have written this in 5 minutes?"

### Consistency Over Brilliance

Across repeated uses, outputs must feel consistent — not wildly different in tone, not stylistically experimental.

---

## 10. MenuList Relationship Contract

### Prime Directive

> **MenuList is infrastructure. GrowthOS is a tool. Infrastructure never bends for tools.**

### Independence Requirement

GrowthOS must be able to exist, operate, and be sold **without MenuList.** If MenuList disappeared tomorrow, GrowthOS must still function with manual inputs.

### Dependency Direction (Locked)

```
MenuList  ──►  GrowthOS
(read-only)    (consumer)
```

**Forbidden:** GrowthOS writing to MenuList, triggering MenuList jobs, influencing MenuList UI, changing MenuList behavior.

### Allowed Data Access (Strict Whitelist)

If connected in the future, GrowthOS may read only:

- Store name, category, location, hours
- Public menu item names (read-only)
- Public menu highlights (read-only)

**Permanently forbidden:** MenuList Decision Blocks, confidence thresholds, MOL logs, pricing integrity signals, reputation signals, analytics, customer data.

### UX Isolation

Even if bundled: Separate UI, separate flows, separate mental models. No shared dashboards, no embedded widgets inside MenuList, no cross-navigation implying dependency.

### Failure Isolation

If GrowthOS produces bad content / is unavailable / is misused → MenuList remains unaffected, trustworthy, and autonomous. No shared failure modes.

### Doctrine Conflict Resolution

If conflict between GrowthOS usability and MenuList doctrine purity → **MenuList doctrine always wins.**

---

## 11. Monetization & Packaging

### First Principle

Charge for **finished outputs**, not for access, intelligence, or time.

### Canonical Pricing Unit: The Content Kit

One atomic unit of value = **One Final Content Kit** (1-3 channel-ready outputs, generated in one workflow).

### Allowed Pricing Models

| Model                            | Description                                      | Best For                                |
| -------------------------------- | ------------------------------------------------ | --------------------------------------- |
| **A — Pay Per Kit**              | Pay per generated kit, no commitment             | Early adoption, seasonal users          |
| **B — Prepaid Bundles**          | Buy 5/10/20 kits upfront, use anytime            | Regular SMBs, festival-heavy businesses |
| **C — MenuList Bundle (future)** | MenuList + X kits per month, separate line items | Established MenuList users              |

### Forbidden Monetization

| Model                   | Why Banned                  |
| ----------------------- | --------------------------- |
| ❌ Unlimited plans      | Incentivize overuse, gaming |
| ❌ Per-token billing    | Calculation anxiety         |
| ❌ Feature-based tiers  | Feature pressure            |
| ❌ Seat-based pricing   | Wrong model for solo SMBs   |
| ❌ "AI credits" framing | Opaque, anxiety-inducing    |

### Pricing Psychology (SMB-Specific)

SMBs evaluate: "Is this cheaper than hiring someone or doing it myself?"

Price must feel like a **shortcut**, not a tool rental or learning investment.

### Trial Philosophy

If allowed: limit to 1-2 kits, no feature unlocking, immediate delivery. Trial answers only: "Can I use this output?"

### Cascade's Note on Indian Market

Indian SMBs have extreme price sensitivity and strong "unlimited" expectations. The **prepaid bundle model (Model B)** is more likely to succeed than pure pay-per-use. Consider: ₹199 for 5 kits, ₹499 for 15 kits. Anchor against "₹500 for a freelancer to write one WhatsApp message."

---

## 12. Kill Criteria & Expansion Rules

### When to Kill GrowthOS

Kill or pause GrowthOS if:

- It slows MenuList development
- It reopens doctrine debates
- It consumes founder mental bandwidth
- Users treat it as "the main product"
- Content quality drops below trust threshold
- Revenue doesn't justify maintenance cost within 6 months of launch
- It requires support staff

### Expansion Rules

Expansion is allowed only if:

- New use case fits within DOC 5 admission rules
- New output passes the Clipboard Test
- No new surfaces are required
- No dashboard is needed
- No iteration is introduced
- It can be built without touching MenuList core

### Permanently Banned Expansions

| Expansion                    | Why Banned                      |
| ---------------------------- | ------------------------------- |
| Auto-posting to platforms    | Operational risk, trust erosion |
| Campaign scheduling calendar | Complexity, planning mindset    |
| Performance analytics        | Dashboard addiction             |
| Customer segmentation        | CRM territory                   |
| A/B testing                  | Optimization theater            |
| "Advanced mode"              | Power-user creep                |
| Multi-step campaign flows    | Complexity explosion            |
| Email marketing              | Different product category      |

### The Red-Flag Test (From 3-Product Positioning Map)

If someone proposes a feature, ask:

- Does it run continuously? → **MenuList**
- Does it require review and refinement? → **KitStamp**
- Does it deliver immediate usable output? → **GrowthOS**

If the answer is "a bit of all three" → **kill it.**

---

## 13. Market Landscape & Competitive Analysis

### SMB Marketing Tools Market (2025-2026)

From Cascade web research:

- **90%+ of SMBs** now use AI tools for cost reduction and ROI (AInvest, 2026)
- **7-8% of revenue** allocated to marketing by SMBs (RevenueMemo, 2026)
- **#1 AI use case** for SMBs is content creation
- SMBs want **"done for you"** not "tools to use"
- Execution speed > quality perfection for SMB segment

### Competitive Landscape

| Tool                       | What It Is        | Why GrowthOS Is Different                   |
| -------------------------- | ----------------- | ------------------------------------------- |
| **Canva**                  | Design tool       | Requires decisions, exploration, creativity |
| **Buffer/Hootsuite**       | Scheduling tool   | Dashboard-heavy, no content generation      |
| **Jasper/Copy.ai**         | Writing assistant | Requires prompting, power-user tool         |
| **Vendasta**               | Agency platform   | Not direct SMB tool                         |
| **ContentShake (Semrush)** | SEO content tool  | Not local SMB, knowledge-heavy              |
| **ChatGPT/Gemini direct**  | General AI        | Requires prompt skill, no structure         |

### Gap Confirmed

**No product produces ready-to-use, channel-specific promotional content for local SMBs without requiring marketing knowledge.**

GrowthOS's "output-first" positioning is genuinely differentiated. The closest competition is hiring a WhatsApp freelancer (₹500/message) — GrowthOS replaces that.

---

## Document Cross-References

| Document                                                     | Relevance                                     |
| ------------------------------------------------------------ | --------------------------------------------- |
| `__docs__/constitution/11-product-evolution-doctrine.md`     | Stage 2 = GrowthOS timing                     |
| `__docs__/constitution/12-product-separation-doctrine.md`    | 3-product separation rules                    |
| `__docs__/control-layer-strategy/README.md`                  | What must be built BEFORE GrowthOS            |
| `__docs__/strategy/product-positioning-map.md`               | Stack model: MenuList → KitStamp → GrowthOS |
| `__docs__/strategy/menulist-future-roadmap-ssot.md`          | Overall build sequence                        |
| `__docs__/social-content/social-content-product-strategy.md` | GrowthOS v0 strategy                          |
| `src/config/features.ts` — `SOCIAL_CONTENT_ENABLED`          | Existing prototype flags                      |
| `src/lib/campaigns/engine.ts`                                | GrowthOS v0 campaign engine                   |
| `src/types/campaigns.ts`                                     | Existing campaign types + surfaces            |
| `./agentkits-repo-analysis.md`                               | What to extract from inspiration repo         |
| `./_archive/chatgpt-review.md`                               | Full review with corrections                  |

---

## Warning

> **If you are reading this document and considering building GrowthOS as a separate product:**
>
> 1. Have ALL prerequisites been met?
> 2. Is MenuList proven as system-of-record?
> 3. Has the founder explicitly unlocked Stage 2?
> 4. Is MenuList's Social Content Engine insufficient for current scale?
>
> If ANY answer is "no" → **STOP. The existing Social Content Engine inside MenuList IS GrowthOS v0. Use it.**

### May 31, 2026 Command Center Addendum

The latest GrowthOS Command Center conversation is preserved under `__docs__/growthos-command-center/`.

Decision status:

- `GrowthAction` is accepted as a planning abstraction.
- Freshness Check plus Weekly Growth Pack is accepted as the narrow candidate product kernel.
- Separate GrowthOS app implementation remains blocked until the Stage 2 gates above are explicitly satisfied or overridden.
- GrowthOS writing back to MenuList truth remains blocked by Product Separation Doctrine unless the founder changes that boundary.

---

**Last Updated:** May 31, 2026
**Next Review:** Only when prerequisites met  
**Authority:** Founder reference document — strategic planning only

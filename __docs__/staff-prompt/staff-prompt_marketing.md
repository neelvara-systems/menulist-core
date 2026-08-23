# Staff Prompt Mode — Marketing & Sales Collateral

**Created:** January 11, 2026  
**Status:** Source-gated marketing evidence; active runtime is read-only Today summary display; not current launch certification
**Audience:** Sales, Marketing, Support  
**Parent Spec:** `@__docs__/staff-prompt/staff-prompt_spec.md`  
**Required Reading:** `@__docs__/governance/AUTHORITY_ENFORCEMENT.md`

---

## Current Runtime Boundary

This marketing document is source-gated positioning evidence, not standalone sales approval. Active Staff Prompt behavior is a read-only Today line sourced from `platformSummary/campaigns_{sId}.staffPrompt` when the Today summary marks it eligible. There is no standalone Staff Prompt product, staff-facing route, staff app, provider call, owner setting, prompt generator, mobile-only write, or public Staff Prompt landing page in active code.

Current approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:staff-prompt-runtime`, authenticated desktop/mobile Today QA with an eligible target-store `staffPrompt`, target deploy evidence, and production-host smoke. If sales copy claims generated prompts end-to-end, upstream summary-writer evidence for `platformSummary/campaigns_{sId}.staffPrompt` is also required.

Use this only as supporting proof for Today/MenuList owner workflow copy. Do not pitch a standalone Staff Prompt product or promise staff behavior changes without target runtime evidence.

---

## Elevator Pitch (30 Seconds)

### The Hook

> "What do your customers usually ask when they can't decide?"

_(Wait for answer: "What's good?" / "What should I order?")_

### The Value

> "When the Today summary has a safe staff line, MenuList shows the owner one sentence to repeat."

### The Differentiation

> "No staff app. No scripts. Just a quiet Today line when the source data supports it."

---

## Feature Narrative (Business Value)

### The Problem

Every day in SMBs:

1. Customer walks in, looks at menu
2. Customer asks: "What's good?"
3. Staff panics, says: "Everything is good"
4. Customer hesitates, orders safe/cheap option
5. Revenue lost. Staff stressed. Customer unsatisfied.

### The Solution

When the Today summary includes an eligible staff prompt, MenuList shows the owner **one sentence** to repeat:

> "Most people take the paneer tikka."

Owner can repeat it during service. Any staff or customer behavior outcome still needs target evidence before sales use.

### Why This Matters

- **No staff workflow required** — The active runtime shows the owner a read-only Today line
- **No scripts to memorize** — Just one sentence
- **No guessing** — Only use this claim when upstream summary evidence exists for the release scope
- **No pressure** — It's social proof, not selling

---

## Competitive Positioning

| Alternative             | Problem                                 | MenuList Difference               |
| ----------------------- | --------------------------------------- | --------------------------------- |
| Staff training programs | Expensive, inconsistent, staff turnover | No separate staff workflow in active code |
| Sales scripts           | Staff resists, sounds robotic           | One owner-visible line when source data supports it |
| Manager oversight       | Owner can't watch staff all day         | Today surfaces one line when eligible |
| "Trust your gut"        | Inconsistent results, staff anxiety     | Source-backed confidence when upstream evidence exists |

---

## Pitch Deck Outline (7 Slides)

### Slide 1: The Problem

**Headline:** _"What's good?" is the most expensive question in your business._

**Visual:** Staff looking confused, customer waiting

**Copy:**

- Customers often ask staff what to order
- Staff may default to generic answers
- Use release-specific evidence before making numeric conversion or ticket-size claims

---

### Slide 2: The Solution

**Headline:** _One sentence. Every time._

**Visual:** Today tab showing Staff Prompt

**Copy:**

- Today can show one staff line when the summary marks it eligible
- When source evidence is clear, the owner sees one sentence
- Owner can use it during service; behavior outcomes need target evidence

---

### Slide 3: Key Features

**Headline:** _How it works_

**Visual:** Simple 3-step flow

**Copy:**

1. **Automatic** — No setup, no configuration
2. **Confident** — Only shows when patterns are clear
3. **Simple** — One sentence, plain language

---

### Slide 4: Why It Works

**Headline:** _Social proof, not sales pitch_

**Visual:** Two conversation examples (bad vs good)

**Copy:**

- ❌ "You should try our paneer tikka" (sounds salesy)
- ✅ "Most people take the paneer tikka" (sounds helpful)

The difference: customers trust what others choose, not what you recommend.

---

### Slide 5: Use Cases

**Headline:** _Where it matters_

**Use Case 1: Restaurant**

> Customer: "What's good here?"
> Staff: "Most people take the butter chicken."
> Result: Customer orders, no hesitation

**Use Case 2: Café**

> Customer: "What's your popular coffee?"
> Staff: "Most people take the cold brew."
> Result: Faster decision, happy customer

**Use Case 3: Bakery**

> Customer: "What should I get?"
> Staff: "Most people take the chocolate croissant."
> Result: Upsell happens naturally

---

### Slide 6: The Outcome

**Headline:** _What happens when staff knows what to say_

**Visual:** Before/After comparison

**Copy:**

- Staff stops guessing
- Customers stop hesitating
- Owner stops worrying about training
- Orders get faster, tickets get higher

_(No metrics — outcomes only)_

---

### Slide 7: Next Steps

**Headline:** _Ready to try it?_

**Copy:**

- Set it up once
- Let it run for 7 days
- If customers stop asking questions, it worked

**CTA:** "Start your free trial" or "Schedule a demo"

---

## Landing Page Copy Hooks

### Hero Headline

> **"Give your staff the right words — automatically."**

### Subheading

> MenuList tells your staff exactly what to say when customers ask "What's good?" — based on what customers actually choose.

### Key Benefit Bullets

- **No scripts to memorize** — Just one sentence that works
- **No training required** — Staff learns by hearing the owner
- **No guessing** — Based on real customer behavior
- **No sales pressure** — It's social proof, not selling
- **Shows only when confident** — Silence when uncertain

### Social Proof Placeholders

> "Now my staff knows exactly what to say. No more 'everything is good.'"
> — [Restaurant Owner Name], [City]

> "Customers decide faster. Staff is less stressed. Win-win."
> — [Café Owner Name], [City]

### CTA Copy Variants

- "Start free trial" (neutral)
- "See it in action" (curiosity)
- "Get started today" (action)

_(No urgency, no scarcity, no pressure)_

---

## Go-to-Market Messaging

### India Messaging (WhatsApp-first, daily operations)

**Primary Message:**

> "Ab staff ko pata hai kya bolna hai — 'Most people take the \_\_\_'"

**Context:**

- Focus on daily operations
- WhatsApp Status as distribution
- Owner-staff verbal chain emphasized
- Hindi/regional language friendly

**Talking Point:**

> "Jab customer puche 'kya acha hai?', staff ko nahi sochna padega."

---

### Non-India Messaging (Full platform, automation narrative)

**Primary Message:**

> "Your staff always knows what to say — without training."

**Context:**

- Focus on automation and consistency
- Part of full MenuList platform
- Emphasis on time savings
- Integration with digital presence

**Talking Point:**

> "No more 'everything is good.' Just the right answer, every time."

---

## Sales Talking Points (Objection Handlers)

### Objection: "This is just content generation."

**Response:**

> "No, it's a daily decision system. Content generation creates posts. This tells your staff what to say to customers. Different problem."

### Objection: "We already train our staff."

**Response:**

> "Training is expensive and staff turns over. MenuList gives new hires the right words from day one — through the owner, not a manual."

### Objection: "Will this really help sales?"

**Response:**

> "When staff gives confident answers, customers decide faster. Faster decisions usually mean higher tickets. But the real win is less stress for everyone."

### Objection: "I know my customers better."

**Response:**

> "That's exactly why MenuList stays quiet unless patterns are obvious. It only speaks when it's confident."

### Objection: "Can I control what it says?"

**Response:**

> "You don't need to. MenuList only shows something when customer behavior is consistent. If it's shown, it's already safe to say."

### Objection: "What if it's wrong?"

**Response:**

> "Then it doesn't show anything. Silence is better than being wrong."

---

## Approved Language

### Terms to Use

| ✅ Use                    | Why                              |
| ------------------------- | -------------------------------- |
| "Most people take..."     | Social proof, not recommendation |
| "Staff knows what to say" | Outcome-focused                  |
| "Customers decide faster" | Business benefit                 |
| "No training required"    | Removes friction                 |
| "Automatic"               | No effort positioning            |
| "Confident"               | Implies reliability              |
| "Runs quietly"            | Infrastructure positioning       |

### Terms to Avoid

| ❌ Avoid                | Why                           |
| ----------------------- | ----------------------------- |
| "AI recommends"         | Invites skepticism            |
| "Algorithm decides"     | Technical, creates doubt      |
| "Data-driven"           | Overused, means nothing       |
| "Smart"                 | Vague, oversold               |
| "Upsell"                | Sounds manipulative           |
| "Sales enablement"      | Enterprise jargon             |
| "Recommendation engine" | Technical                     |
| "You can customize"     | Creates dual authority        |
| "Based on analytics"    | Invites questions about logic |

**Reference:** `@__docs__/governance/AUTHORITY_ENFORCEMENT.md` for full forbidden list

---

## Pricing/Packaging Story

### Positioning

Staff Prompt Mode is **included** in the standard MenuList subscription. It is NOT:

- A separate add-on
- A premium feature
- An upsell

### Why

Staff Prompt is part of the core value proposition — helping customers decide faster. Charging separately would:

1. Create feature complexity
2. Invite questions about what's "extra"
3. Undermine the "runs quietly" narrative

### Pricing Anchor

When discussing pricing, never mention Staff Prompt as a line item. Say:

> "MenuList plans start at ₹599/month. The Today line is supporting owner workflow context, not a separate paid product."

---

## Support Playbook (Quick Reference)

### If Owner Asks About Staff Prompt

**Only allowed response:**

> "MenuList only shows a staff prompt when customer behavior is extremely consistent. If it's shown, it's already safe to say."

### If Owner Wants to Change the Prompt

**Response:**

> "No changes needed. MenuList adjusts automatically based on customer patterns."

### If Owner Asks Why a Specific Item

**Response:**

> "Because that's what helps customers decide right now. If the situation changes, so will the prompt."

### If Prompt Disappears

**Response:**

> "That means patterns changed or confidence dropped. When there's nothing certain to show, silence is the correct behavior."

---

## Internal Scorecard

### Sales Success Signals

| ✅ Winning                      | ❌ Losing                     |
| ------------------------------- | ----------------------------- |
| Short calls                     | Long explanations             |
| Fewer questions                 | "How does it work?" repeated  |
| Owner says "so I don't manage?" | Owner asks for customization  |
| Fast close                      | Feature-by-feature comparison |

### The Ultimate Win

When the owner says:

> "So my staff will just know what to say?"

That means you've positioned it correctly.

---

**Document Status:** Source-gated marketing evidence; not current sales or launch approval
**Version:** 1.0  
**Last Updated:** January 11, 2026

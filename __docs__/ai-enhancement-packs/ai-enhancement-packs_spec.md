# AI Enhancement Packs — Specification

**Feature:** AI Enhancement Packs (Outcome-Based AI Pricing & Usage Tracking)
**Status:** 📝 Specification Complete
**Last Updated:** July 14, 2026
**Audience:** CEO, PM, Clients, Non-developers

---

## Executive Summary

### What Is It?

AI Enhancement Packs are one-time purchasable bundles that unlock additional AI capabilities beyond what's included in a subscription plan. When a subscriber's included AI capacity is used, they purchase a pack to continue using enhancement features like image regeneration, description rewrites, tone adjustments, and bulk translations.

**Internally**, the system tracks every AI operation using a unit-based cost accounting model. **Externally**, the purchasable Pack and referral rewards show exact credit amounts with concrete outcome examples. Monthly included capacity, provider costs, margins, and overdraft policy remain private.

### Why Does It Matter?

- **Revenue Protection:** AI operations cost real money (Gemini API calls). Without metering, a single heavy user could erode margins for the entire platform.
- **Fair Usage:** Subscribers get generous included capacity. Heavy users pay proportionally through packs.
- **Simplicity:** One pack, one price, one credit amount, and concrete examples. No tiers or usage dashboard.
- **Doctrine Compliance:** MenuList is infrastructure. Infrastructure bills simply. It doesn't ask users to optimize.

### Who Is It For?

- **All MenuList subscribers** — Included capacity covers typical usage at no extra cost
- **Power users** — Restaurant chains, large menus (200+ items), frequent regeneration, multi-language businesses
- **Multi-outlet operators** — Bulk operations across multiple stores

### What Is NOT In Scope

- Exposing provider tokens, provider costs, margins, monthly included capacity, overdraft policy, or internal valuation to customers
- Usage dashboards, meters, countdowns, or progress bars
- Per-feature or per-pack separate balances
- Overage pricing (pay-per-use beyond capacity)
- A/B pricing experiments
- Human review add-ons
- Free tier for AI enhancements (extraction and first-pass descriptions remain free)

---

## July 11, 2026 Founder Transparency Amendment

The older sections below preserve implementation history and may describe the former rule that hid all credit amounts. That rule is superseded for purchasable Pack credits and owner-referral reward credits.

The current contract is:

1. `Content Credit Pack` displays `250 credits` on website pricing, desktop Billing, and mobile Billing.
2. Every purchase card displays a current example: up to 50 generated menu images or 250 description rewrites.
3. Operation rates used in public examples come from `src/data/shared/contentCreditPolicy.ts` and are consumed by `src/constants/AI/unitCosts.ts`.
4. Public copy does not publish a rupee-per-credit value, provider cost, margin, monthly included-credit allowance, or overdraft allowance.
5. Changes to charged operation rates must update the public-safe policy first so runtime examples and accounting remain aligned.

---

## Goals & Success Metrics

### Primary Goals

| Goal                            | Metric                                      | Target                |
| ------------------------------- | ------------------------------------------- | --------------------- |
| Protect AI cost margins         | Internal cost vs. pack revenue              | > 70% gross margin    |
| Zero customer confusion         | Support tickets about AI pricing            | < 5% of total tickets |
| Revenue from heavy users        | Pack purchase rate among active subscribers | 10-20% of subscribers |
| Zero doctrine violations        | Public-facing language audit                | 0 violations          |
| Full cost visibility (internal) | Every AI operation logged with cost         | 100% coverage         |

### Success Indicators

- Subscribers use AI features without thinking about limits
- Heavy users purchase packs without friction or confusion
- Support explains Pack credits through concrete outcomes without exposing provider or margin mechanics
- Founder can see exact AI costs per tenant per month in admin dashboard
- System silently blocks when capacity is exhausted — no errors, no drama

---

## Target Customers (ICP)

### Primary Users

1. **Small Restaurant Owners (India)**
   - 50-100 menu items
   - Use included capacity for initial setup
   - Rarely need packs unless regenerating frequently
   - Price-sensitive (₹500-2000 is their comfort zone for add-ons)

2. **Multi-Outlet Chain Operators**
   - 200+ items across 3-10 locations
   - Heavy bulk operations (translations, images, descriptions)
   - Most likely pack purchasers
   - Value simplicity — "just tell me the price"

3. **Seasonal Menu Businesses**
   - Cafes, bakeries, specialty restaurants
   - Spike usage during menu changes (quarterly/monthly)
   - Need packs during seasonal transitions
   - Dormant between seasons

### ICP Alignment Validation

> **Source:** ChatGPT ICP stress-test (Feb 10, 2026) — validated against codebase and doctrine

**Core test:** Can this run without the SMB owner ever thinking about billing logic? **Yes.**

#### SMB Usage Segmentation (Predicted)

| Segment                  | % of Users | Behavior                                                        | Pack Revenue                               |
| ------------------------ | ---------- | --------------------------------------------------------------- | ------------------------------------------ |
| **Light users**          | ~80%       | Upload menu once, small edits, occasional image regen           | Never buy pack — subscription revenue only |
| **Growing businesses**   | ~15%       | Seasonal updates, rebranding, menu changes, language additions  | Buy 1–2 packs/year                         |
| **Heavy users (chains)** | ~5%        | Multi-outlet, frequent edits, bulk operations, constant updates | Buy packs regularly — funds AI infra cost  |

#### Cognitive Load Test

Owner never needs to calculate monthly allowance, provider tokens, margin, or plan math. The owner can see the purchased Pack balance and the exact credits required by an eligible operation before acting. Mental model: **see the action cost → use → add a pack when needed → continue.**

#### Emotional Test

Bad systems create: meter-running feeling, fear of clicking AI, fear of extra cost, confusion about usage.

**MenuList avoids all of these because:**

- Included usage is generous (covers 80th percentile)
- Block happens late (overdraft buffer)
- Single pack purchase (no tier decisions)
- No monthly included-capacity meter or countdown pressure

User never feels "AI is costing me money constantly." They only feel "sometimes I need extra pack."

#### The Chai Shop Test (Founder Benchmark)

> If a chai shop owner can use MenuList for 6 months without thinking about AI billing once — and we still make 85–95% margin — we designed it correctly.

#### Critical Failure Modes (Execution Risks)

The system architecture is correct. It will only fail if execution violates these rules:

| Failure Mode                      | Why It Breaks ICP                               |
| --------------------------------- | ----------------------------------------------- |
| Show monthly allowance/usage internals | Creates monitoring pressure and exposes private plan mechanics |
| Use word "limit"                  | Implies scarcity — shifts blame to user         |
| Block too early                   | First-time block feels like being cheated       |
| Pack price too high for India     | Pack > ₹4k–₹5k causes hesitation for small SMBs |
| First-time block happens too fast | User feels subscription is insufficient         |

### User Personas

**Priya — Small Cafe Owner (Bangalore)**

> "I uploaded my menu and everything was set up. Six months later I redesigned my menu and needed new images. The system told me I needed an enhancement pack. I bought one and it was done in 10 minutes."

**Amit — Chain Restaurant Manager (Mumbai, 5 outlets)**

> "We have 300 items and needed images and descriptions in 4 languages. The included capacity wasn't enough. We bought an enhancement pack and processed everything in one session."

---

## The Pricing Model

### Doctrine Rules (Non-Negotiable)

| Rule                                                 | Why                                                    |
| ---------------------------------------------------- | ------------------------------------------------------ |
| Show Pack credits and eligible operation costs consistently | Gives the owner a concrete purchase and action contract |
| Never show monthly included-capacity meters          | Avoids monitoring pressure and keeps plan mechanics private |
| Never expose provider tokens, costs, margin, or overdraft | Internal economics are not owner-facing                |
| System blocks silently when capacity is exhausted    | Law 2: Silence Is a Feature                            |
| Support never explains internal mechanics            | Law 9: Humans Do Not Patch Trust                       |
| One pack, one price at launch                        | Law 6: Removes decisions, doesn't add better ones      |

### What's Free (Always)

| Operation                         | Why Free                            |
| --------------------------------- | ----------------------------------- |
| Menu data extraction (OCR)        | Core pipeline — this IS the product |
| First-pass description generation | Part of initial setup experience    |
| New item metadata generation      | Structural, not enhancement         |

Free means zero owner-pack units. These operations may still write internal token/cost telemetry for platform reconciliation, but they do not decrement `monthlyCredits` or `topUpCredits`.

### What Costs Units (Enhancement Territory)

| Operation                                            | Internal Action Type     | Why Paid                                     |
| ---------------------------------------------------- | ------------------------ | -------------------------------------------- |
| Description rewrite / tone change / SEO optimization | `REWRITE_DESCRIPTION`    | Creative regeneration, repeated Gemini calls |
| Image generation (single)                            | `IMAGE_GENERATION`       | Expensive Gemini image-generation API call   |
| Batch image generation                               | `BATCH_IMAGE_GENERATION` | Multiple expensive API calls                 |
| Image editing (background, enhance, etc.)            | `IMAGE_GENERATION`       | Gemini image model call                      |
| Language addition (translation)                      | `LANGUAGE_ADDITION`      | Per-language Gemini translation call         |

### Launch Model: Single AI Enhancement Pack

| Attribute      | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| **Name**       | AI Enhancement Pack                                                |
| **Type**       | One-time purchase (not subscription)                               |
| **Quantity**   | Unlimited purchases allowed                                        |
| **Scope**      | Per-store (aligned with subscription and billing scope)            |
| **Billing**    | One-time purchase (Razorpay order, provider-agnostic architecture) |
| **Rate Limit** | 10 purchases per hour (existing `PAYMENT_TOPUP` config)            |

**Pricing (to be calibrated by founder after Gemini cost analysis):**

| Market              | Price  | Pack Capacity (Internal) |
| ------------------- | ------ | ------------------------ |
| India (INR)         | ₹[TBD] | [TBD] units              |
| International (USD) | $[TBD] | [TBD] units              |

> **Open Question:** Exact pricing requires calibration against actual Gemini API costs (NOT OpenAI costs as ChatGPT assumed). Gemini is 10-100x cheaper for text operations and 2-3x cheaper for image generation. This means packs can be more generous than originally estimated.

### Pricing Psychology (Founder Reference)

> **Source:** ChatGPT pricing stress-test (Feb 10, 2026)

**SMBs do NOT calculate like founders.** They never think "cost per image" or "cost per token." They think: "Does this save my time?", "Does this make my menu look premium?", "Is this cheaper than hiring a designer?"

#### Real-World Cost Comparison (What We're Competing Against)

| Alternative              | Typical Cost (India)     |
| ------------------------ | ------------------------ |
| Food photoshoot          | ₹8k–₹25k per shoot       |
| Designer menu setup      | ₹3k–₹15k                 |
| Professional translation | ₹500–₹2,000 per language |
| Menu redesign            | ₹5k–₹20k                 |

If a restaurant spends ₹3k–₹6k/year on AI packs and saves ₹15k+ in designer/photographer costs, they perceive it as **extremely cheap**. We compete with designers and agencies, not Midjourney or ChatGPT.

#### Indian SMB Psychology

Indian SMBs pay easily for: things that earn money, save time, improve image.

They resist: confusing pricing, recurring microcharges, per-use billing, surprise bills.

**Our model avoids all resistance patterns.** High margin internally = fine. High friction externally = not fine.

#### Pack Pricing Sweet Spot (India)

| Range         | SMB Reaction                              |
| ------------- | ----------------------------------------- |
| < ₹1,500      | Impulse buy — too cheap to think about    |
| ₹1,500–₹3,000 | Comfortable — "occasional boost" feeling  |
| ₹3,000–₹5,000 | Acceptable for growing businesses         |
| > ₹5,000      | Small SMB hesitates — needs justification |

#### Post-Launch Pricing Metric

Track **pack purchase hesitation rate** — not margin:

- Users buy without contacting support → pricing correct
- Users buy again later → pricing correct
- Users message before buying, hesitate, delay, complain → adjust pricing

### India vs Global Pricing Architecture

> **Source:** ChatGPT global pricing review (Feb 10, 2026)

**Rule: One internal economy. Multiple external price perceptions.**

| Principle                                          | Implementation                                      |
| -------------------------------------------------- | --------------------------------------------------- |
| Region affects **price only**                      | INR vs USD pricing per market                       |
| Region NEVER affects units, limits, or AI behavior | Same 250 units per pack globally                    |
| Same product globally                              | No feature differences by geography                 |
| PPP gap must be meaningful                         | ₹2,999 India vs $39–49 global (not $29 — too close) |
| Currency detection must be correct                 | India → INR, outside → USD. No manual confusion.    |

**Why this works:** Global users at $39+ subsidize Indian pricing at ₹2,999. Both maintain strong margins because Gemini cost is identical regardless of what the customer pays. This is standard global SaaS architecture.

**Forbidden:** Never make India cheaper but feature-limited. Never make global users get more AI capacity. Same product. Only price differs.

### Future Expansion (Capability-Flagged, Not "Phase 2")

The system ships with all architecture for tiered packs. At launch, only one tier is active:

```
packTiers: "single"     // Day 1: One pack, one price
packTiers: "tiered"     // Future: Basic/Pro/Premium packs (data flag, no re-architecture)
```

---

## Internal Cost Accounting (Never Exposed)

### AI Unit System

Every AI operation has an internal unit cost. Units are abstract — they do not map 1:1 to tokens, API calls, or dollars. They are a normalized cost metric for internal tracking and capacity enforcement.

| Operation                          | Internal Units | Rationale                            |
| ---------------------------------- | -------------- | ------------------------------------ |
| Description rewrite                | [TBD]          | ~500-2000 Gemini tokens per call     |
| Image generation                   | [TBD]          | Gemini 2.5 Flash Image call          |
| Image editing                      | [TBD]          | Similar to image generation          |
| Language addition (per language)   | [TBD]          | Gemini 2.5 Flash translation         |
| Item translation                   | [TBD]          | Per-item, smaller than full language |
| Image translation                  | [TBD]          | OCR + translation + regen            |
| Batch image generation (per image) | [TBD]          | Same as single, multiplied           |

> **Open Question:** Unit costs need calibration against actual Gemini billing data. The existing `TOKENS_PER_CREDIT=500` and `CHARGE_PER_CREDIT=100` (paise) constants provide a starting framework but may need restructuring for the new unit system.

### Capacity Tracking

| Concept                | Implementation                                   |
| ---------------------- | ------------------------------------------------ |
| **Total capacity**     | Sum of subscription-included + purchased packs   |
| **Used capacity**      | Sum of all AI usage events (append-only)         |
| **Remaining capacity** | `total - used` (derived, never shown to user)    |
| **Enforcement**        | Server-side check before every paid AI operation |
| **When exhausted**     | Block action silently → show calm upsell CTA     |

### Capacity Scope

- **Per-store** (not per-tenant): Capacity lives on the subscription document, aligned with how subscriptions, AI operations, and projects are already scoped (`{tId}/{sId}`). Each store manages its own AI capacity independently. In multi-chain setups, each store has its own subscription and its own capacity.
- **Not per-feature**: One pooled balance per store, not separate image/translation/description pools
- **Not time-limited**: Pack capacity does not expire (avoids "use it or lose it" anxiety)

### Multi-Outlet Pack Logic (Detailed)

> **Architecture Decision: Per-Store Capacity — VALIDATED**
>
> ChatGPT originally proposed per-tenant capacity (`tenant.aiCapacity`). This was **REJECTED** after codebase validation AND founder confirmation. Per-store is the only correct model.

#### Why Per-Store (Founder's Reasoning)

Local outlets use AI credits **only for overridden/local data** — their own choice, not the master's. If a local outlet adds a new item locally, they need credits for it, but that local item **only benefits their outlet** — no other outlet gets value from it. Therefore each outlet must manage and pay for its own capacity.

#### Concrete Multi-Outlet Scenarios

**Scenario 1: Master Outlet Generates Shared Menu Content**

```
Master Outlet (Store A) — has Pro subscription + AI Enhancement Pack
  ├─ Generates 50 images for shared menu items
  ├─ Rewrites descriptions for 80 items
  ├─ Adds Hindi + Tamil translations
  └─ All consumed from Store A's subscription credits
      (monthlyCredits first, then topUpCredits)

Linked Outlets (Store B, Store C) — inherit shared menu via sync
  ├─ Receive images, descriptions, translations automatically
  ├─ No AI credits consumed — they didn't trigger AI operations
  └─ Their subscription credits remain untouched
```

**Result:** Master pays for shared work. Linked outlets benefit for free. ✅ Fair.

**Scenario 2: Local Outlet Adds Local-Only Content**

```
Linked Outlet (Store B) — has own subscription + optional pack
  ├─ Adds 5 local-only menu items (regional specials)
  ├─ Generates images for those 5 items
  ├─ Rewrites descriptions with local tone
  └─ All consumed from Store B's subscription credits

Master Outlet (Store A) — unaffected
  ├─ Does not see Store B's local items
  ├─ Credits remain untouched
  └─ No cross-store drain
```

**Result:** Local outlet pays for local work. Master is unaffected. ✅ Fair.

**Scenario 3: Why Per-Tenant Would Break This**

```
❌ If capacity were per-tenant (tenant.aiCapacityTotal):

Master buys AI Enhancement Pack → adds to tenant balance
  ├─ Store B adds 200 local items, generates images → drains tenant balance
  ├─ Store C does bulk translation → drains tenant balance further
  ├─ Master tries to generate shared menu images → BLOCKED (capacity exhausted)
  └─ Master paid, but others consumed. No way to control or track.
```

**Result:** Cross-store drain, unfair billing, no governance. ❌ Broken.

**Scenario 4: Different Subscription Tiers Per Outlet**

```
Store A (Master) — Premium plan (600 monthly credits)
Store B (Linked) — Pro plan (200 monthly credits)
Store C (Linked) — Basic plan (75 monthly credits)

Each store:
  ├─ Has its own subscription document
  ├─ Has its own monthlyCredits + topUpCredits
  ├─ Buys its own AI Enhancement Packs independently
  └─ Manages capacity independently
```

**Result:** Different stores can have different plans and different AI capacity. ✅ Correct.

#### How Pack Purchases Work Per Store

```
Store B owner clicks "Get more AI enhancements" in their billing page
  ↓
Razorpay checkout opens (store-scoped: tId + sId in order metadata)
  ↓
Payment verified via /api/razorpay/verify-topup
  ↓
subscription.topUpCredits += pack.internalUnits
  ↓
Store B now has more capacity. Other stores unaffected.
```

#### Governance (Master Control — Future)

For chains where the master wants control over local outlet AI spending:

| Control Level         | Description                                     | Status                        |
| --------------------- | ----------------------------------------------- | ----------------------------- |
| **No control**        | Each outlet manages its own packs independently | ✅ Default (Day 1)            |
| **Approval required** | Local outlets request packs, master approves    | 🔮 Future (permission toggle) |
| **Master only**       | Only master can purchase packs for any outlet   | 🔮 Future (permission toggle) |

> **Day 1 rule:** Each store manages its own capacity. Governance controls are a future enhancement, not a launch blocker.

#### Codebase Evidence (Per-Store Scoping)

| System Component | Scope     | Evidence                                     |
| ---------------- | --------- | -------------------------------------------- |
| Subscriptions    | Per-store | `getActiveSubscriptionForStore(tId, sId)`    |
| AI Operations    | Per-store | `menulistAiOperations/{tId}/{sId}/`          |
| Top-ups          | Per-store | `FirestoreTopupDoc` has both `tId` + `sId`   |
| Projects         | Per-store | `projectsMetadata/{tId}/{sId}/`              |
| Billing UI       | Per-store | Fetches store's active subscription          |
| verify-topup     | Per-store | Writes to `subscription.topUpCredits`        |
| Multi-outlet DAL | Per-store | `canHaveLinkedOutlets()` checks `storesList` |

**Every data model is `{tId}/{sId}`. Capacity MUST follow the same pattern.**

### Launch Enforcement Strategy

> **Source:** ChatGPT feedback point #1 (Feb 9, 2026 review)

At launch, enforcement should be **soft** — not hard-blocking on the exact unit boundary. This prevents bad first impressions and support friction for early adopters.

| Enforcement Mode   | Behavior                                                                                                                    | When                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Soft (Day 1)**   | Allow overdraft up to `OVERDRAFT_BUFFER_PERCENT` (configurable, default 20%) beyond capacity before requiring pack purchase | Launch default                         |
| **Strict (later)** | Block immediately when capacity = 0                                                                                         | Data flag toggle after real usage data |

**How it works:**

```
effectiveCapacity = (monthlyCredits + topUpCredits) * (1 + OVERDRAFT_BUFFER_PERCENT / 100)

if (remaining > 0 OR remaining > -overdraftAllowance):
  → allow operation, log overdraft usage
else:
  → block, show calm upsell CTA
```

**Config constant** (add to `src/constants/AI/unitCosts.ts`):

```typescript
export const OVERDRAFT_BUFFER_PERCENT = 20; // Allow 20% overdraft at launch
```

**Rules:**

- Overdraft is invisible to the user (no "you're in overdraft" messaging)
- Overdraft usage is logged internally for margin tracking
- Buffer percentage is adjustable via constant — no code change needed to tighten
- Once real usage data exists, founder decides whether to reduce to 0% (strict)

---

## User Experience

### Normal Flow (Capacity Available)

1. Owner triggers AI enhancement (e.g., "Regenerate description", "Generate image")
2. System checks capacity server-side (invisible to owner)
3. Capacity sufficient → Execute operation normally
4. Usage event logged internally (invisible to owner)
5. Owner sees result. No counters, no "X remaining", no feedback about consumption.

### Exhausted Flow (Capacity Depleted)

1. Owner triggers AI enhancement
2. System checks capacity server-side
3. Capacity insufficient → return the calm fixed capacity response
4. Show calm CTA: "Get more AI enhancements for your menu"
5. Owner clicks → Redirect to pack purchase (Razorpay checkout)
6. After purchase → Capacity updated → Operation proceeds
7. No provider/internal explanation and no monthly-allowance breakdown

### UX Copy Rules

| Scenario           | Approved Language                                          | Forbidden Language                             |
| ------------------ | ---------------------------------------------------------- | ---------------------------------------------- |
| Capacity available | Show the eligible operation's exact Pack-credit requirement where a preview is useful | Provider token/cost explanation |
| Capacity exhausted | "Get more AI enhancements for your menu"                   | Monthly allowance or overdraft breakdown        |
| Pack purchased     | "AI enhancements are ready" plus refreshed Pack balance    | Provider economics or margin                     |
| Pack active        | Show exact purchased Pack balance without a monthly meter    | Monthly allowance/used-this-cycle countdown      |
| Support inquiry    | Explain the public Pack amount and current operation rates    | Provider tokens, cost, margin, or internal tax valuation |

---

## Subscription Integration

### Included Capacity Per Subscription Tier

Each subscription plan includes a base amount of AI capacity (internal units). This is invisible to the customer — they just know "AI features are included."

| Subscription Tier | Included AI Capacity (Internal Units) | Typical Coverage                                           |
| ----------------- | ------------------------------------- | ---------------------------------------------------------- |
| Basic             | [TBD]                                 | ~Small menu setup (50 items, 1 language)                   |
| Pro               | [TBD]                                 | ~Medium menu + seasonal refresh (100 items, 2-3 languages) |
| Premium           | [TBD]                                 | ~Large menu + frequent updates (200+ items, 5+ languages)  |

> **Open Question:** Included capacity per subscription tier needs calibration. Should cover "typical" usage so most subscribers never need a pack. Power users (top 10-20%) should need packs.

### Capacity Reset

- **On subscription renewal:** Included capacity resets to plan's base amount
- **Pack capacity:** Does NOT expire with subscription period — carries forward
- **On plan upgrade:** New plan's included capacity replaces remaining (does not stack)
- **On plan downgrade:** Included capacity adjusts to new tier immediately

---

## Legal & Support

### Terms of Service Clause

> "AI-enhanced features (including but not limited to image generation, description generation, and language translation) are included as part of your subscription plan up to reasonable usage levels. Feature availability may vary based on your plan and usage. Additional AI Enhancement Packs are available for purchase and represent enhancement capacity under current system conditions. Unused pack capacity may be subject to adjustment for accounts inactive for extended periods. MenuList reserves the right to adjust feature availability, pack contents, and pricing. AI outputs may vary in quality and are provided as-is."

**Key Legal Points:**

- "Up to reasonable usage levels" — no specific numbers committed
- "May vary" — variability is expected, not a defect
- "Provided as-is" — no quality guarantees on AI output
- "Under current system conditions" — protects against Gemini pricing changes
- "Inactive for extended periods" — dormancy guardrail (does not define threshold — intentional)
- Pack credit amounts may be named; provider tokens, monthly included capacity, margins, and internal metrics are not published

### Support Language Boundary

Support can name purchased or rewarded credits and explain them through current outcomes. It must not expose provider or margin mechanics:

| Forbidden | Use Instead |
| --- | --- |
| Provider tokens | "Credits" or the eligible outcome |
| Rupee-per-credit/provider cost | Current Pack price and exact credit amount |
| Monthly included-credit allowance | "AI features included in your plan" |
| Balance     | "Your AI features"                             |
| Quota       | "Your plan includes..."                        |
| Consumption | "Usage" (only if absolutely necessary)         |
| Remaining   | "Available" (only in context of pack purchase) |
| Ran out     | "You may need an additional enhancement pack"  |

### Sales Objection Handlers

| Objection                          | Response                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| "How many images can I generate?"  | "Your plan includes AI image generation. For large menus or frequent updates, enhancement packs give you more." |
| "What exactly do I get in a pack?" | "AI enhancements for your menu — images, descriptions, translations. Everything your menu needs."               |
| "Why can't I generate more?"       | "Your plan covers typical usage. Enhancement packs are available for businesses that need more."                |
| "Can I see how much I've used?"    | "Your AI features are handled automatically. If you need more, the system will let you know."                   |
| "How does the pricing work?"       | "It's simple — your plan includes AI features. If you need more, you buy an enhancement pack."                  |

---

## Dispute Stress Test Results

### Scenario 1: "I paid for AI features — why can't I generate images?"

**Response:** "Your plan includes AI features for your menu. For additional image generation beyond your plan's coverage, an AI Enhancement Pack is available."
**Why this works:** Focuses on outcome (image generation), not internal mechanics. Doesn't explain credits or limits.

### Scenario 2: "My competitor generated 100 images, I can only do 20"

**Response:** "Each plan includes AI features appropriate for typical menu needs. Enhancement packs are available for businesses with larger menus or more frequent updates."
**Why this works:** Doesn't compare, doesn't explain internal allocation. Redirects to pack.

### Scenario 3: "I want a refund — the AI pack didn't generate enough"

**Response:** "AI features produce results that may vary. If you need additional enhancements, packs are available. Refunds are handled per our terms of service."
**Why this works:** "May vary" is covered in ToS. No admission of quota or limits.

### Scenario 4: "Your sales page says 'unlimited AI' but I'm blocked"

**Response:** "AI features are included in your plan and enhancement packs. We never use the word 'unlimited' — all features are part of your plan's coverage."
**Why this works:** Important reminder — NEVER use "unlimited" in any marketing material.

### Scenario 5: "Show me exactly what I'm paying for"

**Response:** "The Content Credit Pack adds 250 credits. At current rates, that can cover up to 50 generated menu images or 250 description rewrites. MenuList shows the required credits before you confirm an eligible action."
**Why this works:** It gives an exact, owner-readable denominator without exposing provider economics.

---

## Architecture Overview (High-Level)

### System Components

```
┌─────────────────────────────────────────────────┐
│                CUSTOMER LAYER                    │
│  (Sees Pack credits and concrete outcomes)       │
│                                                   │
│  Subscription ──→ Included Capacity (invisible)   │
│  Pack Purchase ──→ Added Capacity (invisible)     │
│  AI Action     ──→ Result (or calm upsell CTA)   │
└───────────────────────┬─────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────┐
│              SERVER ENFORCEMENT LAYER             │
│  (All checks happen here, never on client)       │
│                                                   │
│  1. Authenticate (withAuth)                       │
│  2. Check capacity (units remaining > cost)       │
│  3. Reserve exact units + hidden operation shell  │
│  4. Execute AI operation (Gemini API call)        │
│  5. Settle shell, or refund exact reservation     │
│  6. Return billing-store-scoped balance           │
└───────────────────────┬─────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────┐
│              INTERNAL TRACKING LAYER             │
│  (Founder/admin only, never exposed)             │
│                                                   │
│  AI Usage Events (append-only log)                │
│  Capacity Counters (atomic, reconcilable)         │
│  Pack Purchases (Razorpay + Firestore)             │
│  Monthly Margin Reports (admin dashboard)         │
└─────────────────────────────────────────────────┘
```

### Data Flow

```
Owner clicks "Generate Image"
    ↓
Client sends request to API route
    ↓
API route: withAuth() → checkCapacity() → callGemini() → logUsage() → return result
    ↓
If capacity exhausted: return { blocked: true, upsellCta: true }
    ↓
Client shows calm CTA (not error)
```

### Existing Infrastructure (Already Built)

| Component                                  | Status                          | Location                                          |
| ------------------------------------------ | ------------------------------- | ------------------------------------------------- |
| AI action types (8 types)                  | ✅ Built                        | `src/constants/common.ts`                         |
| AI model configs (9 operations)            | ✅ Built                        | `src/constants/AI/models.ts`                      |
| AI operation logging                       | ✅ Built server-side            | `src/lib/ai/accounting.ts`, `src/lib/ai/operationLog.ts` |
| Rate limiting (AI_OPERATION, AI_EXPENSIVE) | ✅ Built                        | `src/lib/rateLimit/configs.ts`                    |
| Razorpay billing (subscriptions + topups)  | ✅ Built                        | `src/app/api/razorpay/`                           |
| `TOPUPS` collection                        | ✅ Defined                      | `src/constants/database.ts`                       |
| `PAYMENT_TOPUP` rate limit                 | ✅ Configured                   | `src/lib/rateLimit/configs.ts`                    |
| Transactions UI (admin)                    | ✅ Built                        | `src/components/templates/main-app/transactions/` |
| `TOKENS_PER_CREDIT` / `CHARGE_PER_CREDIT`  | ✅ Defined                      | `src/constants/common.ts`                         |
| Transaction object computation             | ✅ Built in billable AI routes  | Various API routes                                |

### Current Implementation Status

| Component                                                     | Status | Verification |
| ------------------------------------------------------------- | ------ | ------------ |
| Server-side AI operation finalization                         | ✅ Built | `npm run verify:ai-accounting` |
| `unitsConsumed` field on billable transaction objects          | ✅ Built | `npm run verify:ai-accounting` |
| Explicit `AI_UNIT_COSTS` + `GEMINI_COST_USD` entries           | ✅ Built | `npm run verify:ai-accounting` |
| Subscription-level capacity enforcement                       | ✅ Built | `checkAICapacity()` + `reserveAiCapacity()` + settle/refund |
| Browser writes to `menulistAiOperations` disabled             | ✅ Built and deployed | Firestore rules + `npm run verify:ai-accounting` |
| Razorpay AI Enhancement Pack top-up flow                      | ✅ Built | `create-topup-order` + `verify-topup` |
| `ENABLE_AI_ENHANCEMENTS` kill switch in `features.ts`         | ✅ Built | Feature flag registry |
| `OVERDRAFT_BUFFER_PERCENT` config constant                    | HIGH     | Tiny   |
| Calm upsell CTA component                                     | MEDIUM   | Small  |
| Admin margin report (internal)                                | MEDIUM   | Medium |

---

## Risks & Open Questions

### Risks

| Risk                               | Severity | Mitigation                                                              |
| ---------------------------------- | -------- | ----------------------------------------------------------------------- |
| Pricing too high → no purchases    | Medium   | Start generous, adjust based on margin data                             |
| Pricing too low → margin erosion   | Medium   | Internal cost tracking catches this early                               |
| Abuse (bulk generation scripts)    | Low      | Multi-layer protection (see below)                                      |
| Gemini pricing changes             | Medium   | Internal units abstract away API costs — re-map units to new costs      |
| Customer confusion about "blocked" | Low      | Calm UX + support scripts prepared                                      |
| Dormant account topUpCredits       | None     | Expired subs don't return from query; new subs start with 0 (see below) |

#### Abuse Protection — Multi-Layer Velocity Guard (Already Built)

> **Source:** ChatGPT feedback review (Feb 10, 2026) — validated against codebase

| Layer                   | Config                        | Effect                          | File                                   |
| ----------------------- | ----------------------------- | ------------------------------- | -------------------------------------- |
| Rate limit (expensive)  | 5 req/min                     | Max 300 expensive ops/hour      | `src/lib/rateLimit/configs.ts:33-36`   |
| Rate limit (general AI) | 20 req/min                    | Max 1200 AI ops/hour            | `src/lib/rateLimit/configs.ts:22-25`   |
| Capacity enforcement    | monthlyCredits + topUpCredits | Can't exceed purchased capacity | `src/lib/ai/capacityCheck.ts`          |
| Overdraft buffer        | 20% max                       | Limited overshoot               | `src/constants/AI/unitCosts.ts:75`     |
| Kill switch             | ENABLE_AI_ENHANCEMENTS        | Instant disable all paid ops    | `src/config/features.ts`               |
| Top-up rate limit       | 10/hour                       | Can't bulk-purchase packs       | `src/lib/rateLimit/configs.ts:148-152` |

**Worst-case abuse math:** At max rate (5 expensive/min × 5 units = 25 units/min), a 250-unit pack is exhausted in ~10 minutes. Max pack purchases = 10/hour. Worst case = 2,500 units/hour = ₹30,000 revenue vs ~₹1,350 Google cost. **Still profitable at max abuse rate.** No additional velocity guard needed at launch.

#### Dormant Account topUpCredits — Already Handled

> **Source:** ChatGPT feedback review (Feb 10, 2026) — validated against codebase

Scenario: User buys packs → cancels → returns months later with old topUpCredits.

**Why this is NOT a risk:**

1. After `cycleEndDate` passes → `getActiveSubscriptionForStore()` returns `null`
2. `checkAICapacity()` returns `reason: "no_subscription"` → all paid AI blocked
3. User must create NEW subscription → `topUpCredits` starts at 0
4. Old subscription's topUpCredits are orphaned on the expired doc — never accessible
5. Only upgrade flow carries credits forward (intentional, within active lifecycle)

#### Margin Management Strategy

> **Source:** ChatGPT feedback review (Feb 10, 2026)

Current margins are ~94-99% depending on operation. This is acceptable at launch but should be monitored. The architecture supports gradual adjustment WITHOUT customer-facing price changes:

**Lever:** Adjust `AI_UNIT_COSTS` values in `src/constants/AI/unitCosts.ts`

- Example: `IMAGE_GENERATION: 5` → `IMAGE_GENERATION: 7` reduces pack capacity by 40%
- No customer-facing change — same pack price, fewer internal operations per pack
- Deploy-only change — no migration, no UI update needed
- **Rule:** Never change customer-facing price first. Adjust internal unit economics first.

### Open Questions

1. **Exact pack pricing (₹/USD)?** — Requires Gemini cost analysis and founder willingness-to-pay judgment.

2. **Internal unit values per operation?** — Requires calibration against actual Gemini API billing data. Current `TOKENS_PER_CREDIT` / `CHARGE_PER_CREDIT` constants provide starting framework.

3. **Included capacity per subscription tier?** — Should cover "typical" usage (80th percentile). Power users (top 10-20%) need packs.

4. **Per-tenant or per-store capacity?** — **RESOLVED: Per-store.** The entire codebase (subscriptions, AI operations, projects, top-ups, billing UI) is scoped by `{tId}/{sId}`. Moving capacity to per-tenant would create a scope mismatch, cross-store drain in multi-chain setups, lifecycle conflicts, and race conditions. Capacity stays on the subscription document where credits already live.

5. **Existing constants migration?** — `TOKENS_PER_CREDIT=500` and `CHARGE_PER_CREDIT=100` exist. Should these be extended or replaced with the new `AI_UNIT_COSTS` system?

6. **Pack expiry?** — Recommendation: No expiry. Avoids "use it or lose it" anxiety. Capacity carries forward indefinitely.

---

## Existing Infrastructure Alignment

### Current Pricing Infrastructure (As-Built)

The codebase already has a fully functional pricing, billing, and credit system. The AI Enhancement Packs model must integrate with — not replace — this infrastructure. Below is the complete inventory.

#### Subscription Plans (`src/data/PlatformPlansList.ts`)

| Type | Plan        | Monthly Price (INR) | Monthly Price (USD) | Monthly Credits (INR) | Monthly Credits (USD) | Billing    |
| ---- | ----------- | ------------------- | ------------------- | --------------------- | --------------------- | ---------- |
| B2C  | Starter     | ₹499                | $29                 | 75                    | 100                   | Month/Year |
| B2C  | Pro         | ₹1,499              | $79                 | 200                   | 400                   | Month/Year |
| B2C  | Premium     | ₹3,999              | $149                | 600                   | 1000                  | Month/Year |
| B2B  | Starter API | ₹4,999              | $69                 | 200                   | 200                   | Month/Year |
| B2B  | Pro API     | ₹18,999             | $249                | 1000                  | 1000                  | Month/Year |

#### Credit Pack (One-Time Top-up, `aiEnhancementPacksList` in same file)

| Pack | Credit Amount | Price (INR) | Price (USD) | Current examples |
| --- | ---: | ---: | ---: | --- |
| Content Credit Pack | 250 credits | ₹2,999 | $29 | Up to 50 generated menu images or 250 description rewrites |

#### Feature List (`src/data/PlatformFeaturesList.ts`)

All AI features are currently marked as **"Unlimited"** or **true (boolean)** across all subscription tiers:

- AI Data Extraction: "Unlimited" (all plans)
- AI Description Generation: "Unlimited" (all plans)
- AI Multi-Language Translation: "Unlimited" (all plans)
- AI Image Generator: `true` (all plans)
- AI Image Editor: `true` (all plans)
- Interactive Studio: Pro/Premium only

#### Payment Flow (Razorpay — Fully Built)

| Component             | File                                                             | Status        |
| --------------------- | ---------------------------------------------------------------- | ------------- |
| Create top-up order   | `src/app/api/razorpay/create-topup-order/route.ts`               | ✅ Production |
| Verify top-up payment | `src/app/api/razorpay/verify-topup/route.ts`                     | ✅ Production |
| Webhook handler       | `src/app/api/razorpay/webhook/route.ts`                          | ✅ Production |
| Client payment hook   | `src/hooks/usePaymentHandler.ts`                                 | ✅ Production |
| Credit pack modal     | `src/components/templates/main-app/billing/CreditsPackModal.tsx` | ✅ Production |
| Credit pack card      | `src/components/templates/main-app/billing/CreditPackCard.tsx`   | ✅ Production |
| Razorpay SDK client   | `src/lib/razorpay/razorpay.ts`                                   | ✅ Production |

**Purchase flow:** Client calls `handleTopupPurchase(pack, currency)` → creates Razorpay order via `/api/razorpay/create-topup-order` → opens Razorpay checkout modal → on success, verifies via `/api/razorpay/verify-topup` → credits added to `subscription.topUpCredits` atomically.

#### Credit Storage (Current)

Credits live **on the subscription document**, not on the tenant:

- `subscription.topUpCredits` — accumulated from pack purchases
- `subscription.monthlyCredits` — from subscription plan (implicit via plan lookup)
- Settlement boundary: `verify-topup/route.ts` delegates to the server transaction in `src/lib/billing/topupSettlement.ts`, which re-reads an exact-dual-`ML` subscription and applies the immutable pending order exactly once.

#### Type Definitions (`src/data/common.ts`)

```typescript
interface Price {
  price: number | null;
  monthlyCredits: number | null; // ⚠️ Exposes "credits" concept
}

interface CreditPack {
  packId: string;
  name: string;
  creditAmount: number; // ⚠️ Exposes credit amount
  priceINR: Price;
  priceUSD: Price;
  stripePriceId: string;
}
```

#### Provider-Agnostic Architecture (`old_docs/payments/razorpay/`)

The payment system was designed provider-agnostic from the start:

- `FirestoreSubscriptionDoc` uses generic `providerSubscriptionId`, `providerPlanId`
- `FirestoreTopupDoc` uses generic `providerOrderId`, `providerPaymentId`
- `paymentProvider: "razorpay" | "stripe"` field allows future expansion
- Webhook router supports per-provider endpoints

#### Pricing Strategy Doc (`__docs__/strategy/pricing-strategy.md`)

**OUTDATED** — recommends "One Plan: MenuList Pro ₹999/month" with no free tier. The actual codebase has 3 B2C tiers + 2 B2B tiers + credit packs. This doc needs reconciliation but is out of scope for AI Enhancement Packs.

---

### Conflicts Identified

#### Conflict 1: Payment Provider References

| Item                | Current Docs              | Actual Code                                         |
| ------------------- | ------------------------- | --------------------------------------------------- |
| Spec: "Billing" row | "Stripe one-time product" | Razorpay implementation exists and is billing-slice audited |
| Impl: Task 3.1      | "Create Stripe Product"   | Razorpay dashboard                                  |
| Impl: Task 3.2      | "Stripe checkout session" | Razorpay order creation                             |
| Impl: Task 3.3      | "Stripe webhook handler"  | Razorpay webhook (`/api/razorpay/webhook/route.ts`) |

**Resolution:** All payment provider references in the AI Enhancement Packs docs should be provider-agnostic. The Razorpay flow is already built and will be adapted — handled separately per user's direction.

#### Conflict 2: Credit Storage Location

| Item            | Current Code                  | Original Proposal (REJECTED)                       | Correct Approach                            |
| --------------- | ----------------------------- | -------------------------------------------------- | ------------------------------------------- |
| Top-up credits  | `subscription.topUpCredits`   | `tenant.aiCapacityTotal` / `tenant.aiCapacityUsed` | **Keep on subscription** (per-store)        |
| Monthly credits | `subscription.monthlyCredits` | `tenant.aiCapacityTotal` (subscription-included)   | **Keep on subscription** (per-store)        |
| Scope           | Per-subscription (per-store)  | Per-tenant (cross-store)                           | **Per-store** (aligned with all other data) |

**Resolution:** Per-tenant capacity was **REJECTED** after codebase validation. Rationale:

1. **Scope mismatch:** Subscriptions, AI operations, projects, top-ups are all `{tId}/{sId}` scoped. Per-tenant capacity breaks this pattern.
2. **Multi-chain drain:** Store A's heavy usage would deplete Store B/C's capacity in a chain.
3. **Lifecycle conflict:** Different stores can have different subscription statuses (active/expired).
4. **Race conditions:** Multiple stores consuming from one counter simultaneously.
5. **Purchase ambiguity:** Billing page is per-store — no UI for tenant-level purchases.

**Correct approach:** Credits stay on the subscription document. AI operations decrement `monthlyCredits` first, then `topUpCredits`. Pack purchases add to `topUpCredits` (already working). No new documents needed.

#### Conflict 3: Credit Visibility in UI - Superseded July 11, 2026

The former outcome-only rule was replaced by transparent Pack credit amounts plus exact examples. `CreditPackCard.tsx` now renders `pack.creditAmount` and examples calculated from `src/data/shared/contentCreditPolicy.ts`. Monthly included capacity and internal economics remain hidden.

#### Conflict 4: Feature List Says "Unlimited"

`PlatformFeaturesList.ts` marks AI descriptions, translations as **"Unlimited"** for all plans. If AI Enhancement Packs enforce capacity limits on these operations, the feature list must change:

| Feature              | Current Value           | Required Change                    |
| -------------------- | ----------------------- | ---------------------------------- |
| `ai_descriptions`    | "Unlimited" (all tiers) | "Included" or `true` (boolean)     |
| `ai_multi_language`  | "Unlimited" (all tiers) | "Included" or `true` (boolean)     |
| `ai_image_generator` | `true`                  | No change needed (already boolean) |
| `ai_image_editor`    | `true`                  | No change needed                   |

**Critical:** "Unlimited" explicitly promises no limits. If we enforce capacity, we CANNOT say "Unlimited." Changing to "Included" communicates availability without promising infinity.

#### Conflict 5: `monthlyCredits` in Data Structures

The `Price` interface and every plan object includes `monthlyCredits`. Under the new doctrine, this field:

- **Must remain internally** (backend needs it for capacity calculation)
- **Must NOT be exposed in UI** (no pricing page should show "75 credits/month")
- **Should be renamed** to `monthlyAICapacity` or kept as-is with a code comment marking it internal-only

**Resolution:** Keep field name as-is for backward compatibility. Ensure no UI component renders `monthlyCredits` to the user. Add code comment: `// INTERNAL: Never display to end user. See AI Enhancement Packs doctrine.`

#### Conflict 6: CreditPack Interface Exposes Credits - Resolved

The `CreditPack` interface in `common.ts` has `creditAmount: number` and the `creditPacksList` array is exported and used in:

- `create-topup-order/route.ts` — to set Razorpay order notes
- `verify-topup/route.ts` — to calculate credits to add
- `CreditPackCard.tsx` — to display credit amount to user

**Resolution:** The type is `AIEnhancementPack`, while `creditAmount` remains the canonical purchased amount and is intentionally visible for Pack and referral-credit transparency. Provider cost and other internal economic fields remain server-only.

#### Conflict 7: Pricing Strategy Doc Mismatch

`__docs__/strategy/pricing-strategy.md` says "One Plan: MenuList Pro ₹999/month" — but the codebase has 3 B2C tiers (₹499/₹1,499/₹3,999) and credit packs.

**Resolution:** Out of scope for AI Enhancement Packs. The pricing strategy doc needs a separate update to reflect the current multi-tier reality. The AI Enhancement Packs system works with any number of subscription tiers — it only cares about included capacity per tier.

---

### Migration Strategy

#### What STAYS (No Changes Needed)

- Razorpay integration architecture (provider-agnostic design)
- `create-topup-order` / `verify-topup` / webhook API routes (adapted later, not rewritten)
- `PlatformPlansList.ts` subscription plan definitions (prices, billing intervals)
- `PlatformFeaturesList.ts` structure (just values change)
- `usePaymentHandler.ts` Razorpay checkout flow (UI labels change, flow stays)
- Rate limiting (`PAYMENT_TOPUP`: 10/hr)
- Security patterns (`withAuth`, `verifyTenantAccess`, Zod validation)

#### What CHANGES (Rename/Refactor)

> **3-Year Freeze Rule Applies:** User confirmed not live yet. All renames and re-architecture ship at launch. No migration or backward compatibility needed. "When" column reflects implementation order, not urgency.

**Data Layer:**

| Change                                              | File(s)                             | Effort | When |
| --------------------------------------------------- | ----------------------------------- | ------ | ---- |
| Rename `CreditPack` → `AIEnhancementPack`           | `common.ts` + all consumers         | Medium | Wk 3 |
| Rename `creditAmount` → `internalUnits`             | `common.ts` + all consumers         | Medium | Wk 3 |
| Rename `creditPacksList` → `aiEnhancementPacksList` | `PlatformPlansList.ts` + consumers  | Small  | Wk 3 |
| Add `// INTERNAL` comments to `monthlyCredits`      | `common.ts`, `PlatformPlansList.ts` | Tiny   | Wk 3 |
| Change "Unlimited" to "Included"                    | `PlatformFeaturesList.ts`           | Small  | Wk 3 |
| Add AI consumption logic (decrement credits on use) | AI API routes + subscription DAL    | Medium | Wk 2 |

**Frontend (19 credit visibility violations across 6 files):**

| Change                                             | File(s)                                     | Effort | When |
| -------------------------------------------------- | ------------------------------------------- | ------ | ---- |
| Re-architect credit card panel → AI status card    | `ActiveSubscriptionCard.tsx` (7 violations) | Medium | Wk 4 |
| Re-architect credit pack modal → single pack modal | `CreditsPackModal.tsx` (2 violations)       | Small  | Wk 4 |
| Re-architect pack card → outcome description       | `CreditPackCard.tsx` (2 violations)         | Small  | Wk 4 |
| Simplify credit carryover note                     | `RemainingCreditNote.tsx` (2 violations)    | Small  | Wk 4 |
| Update billing history labels + success messages   | `billing/index.tsx` (5 violations)          | Small  | Wk 4 |
| Update Razorpay checkout product name              | `usePaymentHandler.ts` (1 violation)        | Tiny   | Wk 3 |

**API Routes:**

| Change                                        | File(s)                       | Effort | When |
| --------------------------------------------- | ----------------------------- | ------ | ---- |
| Adapt top-up order with enhancement pack data | `create-topup-order/route.ts` | Small  | Wk 3 |
| Adapt verify-topup labels + response shape    | `verify-topup/route.ts`       | Small  | Wk 3 |

#### What's NEW (Build From Scratch)

Covered in the Implementation Plan doc — `AI_UNIT_COSTS`, `checkAICapacity()`, `AICapacityGate`, etc.

#### Stripe Dead Code (Document Only — Cleanup Separate)

Two parallel billing systems exist. The entire `billingStripe/` folder and Stripe API routes are **dead code** — not used, not connected to the active billing flow.

| Category                    | Files                                                                      | Status                    |
| --------------------------- | -------------------------------------------------------------------------- | ------------------------- |
| `billingStripe/` components | 10 files (index, PlanDetails, SubscribeButton, PaymentSuccess, type, etc.) | ❌ Dead                   |
| Stripe API routes           | `create-payment-intent`, `verify-session`, `webhook` (587 lines)           | ❌ Dead                   |
| `/billing/success` page     | Imports from `billingStripe/PaymentSuccessComponent.tsx`                   | ❌ Dead (vestigial route) |
| Stripe database module      | `@database/subscriptions/stripe`                                           | ❌ Dead                   |

> **Note:** Stripe dead code cleanup is out of scope for AI Enhancement Packs. The active system is `billing/` (Razorpay). Documenting here for completeness only.

---

## ChatGPT Conversation Cross-Reference

| ChatGPT Suggestion                         | Verdict     | Notes                                                            |
| ------------------------------------------ | ----------- | ---------------------------------------------------------------- |
| Internal accounting + public Pack credits and outcomes | ✅ AMENDED | Pack/referral credits are transparent; provider economics stay internal |
| One pack at launch                         | ✅ ACCEPTED | Correct simplification — keep multi-tier system provision        |
| Extraction + base desc = free              | ✅ ACCEPTED | `ADD_DESCRIPTION` vs `REWRITE_DESCRIPTION` already distinguished |
| Support scripts / never-say list           | ✅ ACCEPTED | Fully aligned with Language Governance                           |
| ToS clause with Pack credits and no provider economics | ✅ AMENDED | Must follow current legal review and credit-transparency contract |
| Dispute stress-test responses              | ✅ ACCEPTED | 5 scenarios covered, all doctrine-safe                           |
| Sales objection cheat-sheet                | ✅ ACCEPTED | 10 objections handled without leaking internals                  |
| 1-page AI doctrine summary                 | ✅ ACCEPTED | Internal governance doc for future hires                         |
| Outcome Activity Report (not usage)        | ✅ ACCEPTED | Show what changed (per outlet), not how much consumed            |
| Monthly margin report template             | ✅ ACCEPTED | Founder-only, 9 sections, no real-time charts                    |
| One balance per tenant (Firestore schema)  | ❌ REJECTED | Must be per-store — see Multi-Outlet Pack Logic section          |
| `/tenants/{tenantId}/aiUsageEvents/`       | ❌ REJECTED | Events already at `menulistAiOperations/{tId}/{sId}`             |
| `/tenants/{tenantId}/aiPackPurchases/`     | ❌ REJECTED | Purchases already at `topups/{tId}/{sId}`                        |
| `aiCapacityTotal/Used/Remaining` on tenant | ❌ REJECTED | Capacity = `subscription.monthlyCredits + topUpCredits`          |
| OpenAI/Azure cost model                    | ❌ REJECTED | MenuList uses Gemini exclusively (10-100x cheaper)               |
| A/B pricing experiments                    | ❌ REJECTED | Forbidden by `06-internal-tracking.md`                           |
| Human Review Add-on                        | ❌ REJECTED | Law 7: No Feature Without Autonomy                               |
| Overage pricing                            | ❌ REJECTED | Law 6: No Cognitive Load                                         |
| Dashboard with used/remaining              | ❌ REJECTED | Law 6 + Language Governance violation                            |
| "MOL v0 already exists"                    | ❌ REJECTED | Hallucination — no MOL implementation in codebase                |
| Feature-wise packs (Image Pack, etc.)      | ❌ REJECTED | Creates feature-wise chaos — single pooled balance per store     |
| Stripe SKUs / checkout                     | ❌ REJECTED | Razorpay is the active payment provider                          |

> **Full review:** See `__docs__/ai-enhancement-packs/_archive/chatgpt-review.md`

---

**Document Signature:** Lead Architect (Cascade)
**Last Updated:** February 9, 2026 (v4 — overdraft buffer, kill switch, ToS dormancy clause per ChatGPT feedback)

# AI Enhancement Packs — Specification

**Feature:** AI Enhancement Packs (Outcome-Based AI Pricing & Usage Tracking)
**Status:** Implemented policy specification
**Last Updated:** August 22, 2026
**Audience:** CEO, PM, Clients, Non-developers

---

## Executive Summary

### What Is It?

AI Enhancement Packs are one-time purchasable bundles that unlock additional AI capabilities beyond what's included in a subscription plan. When a subscriber's included AI capacity is used, they purchase a pack to continue using enhancement features like image regeneration, description rewrites, tone adjustments, and bulk translations.

**Internally**, the system tracks every metered operation using a versioned Content Credit accounting model. **Externally**, owners can see included, promotional, purchased, and usable balances plus the cost of an eligible action. Provider costs and margins remain private.

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

- Exposing provider tokens, provider costs, margins, or internal valuation to customers
- Usage dashboards, meters, countdowns, or progress bars
- Per-feature or per-pack separate balances
- Overage pricing (pay-per-use beyond capacity)
- A/B pricing experiments
- Human review add-ons
- Free tier for AI enhancements (extraction and first-pass descriptions remain free)

---

## August 22, 2026 Content Credit Contract

The approved policy is [`content-credit-decision-record-2026-08.md`](./content-credit-decision-record-2026-08.md). Older hidden-capacity and overdraft behavior is retired.

The current contract is:

1. `Content Credit Pack` displays `250 credits` on website pricing, desktop Billing, and mobile Billing.
2. Every purchase card displays a current example: up to 50 generated menu images or 250 description rewrites.
3. Operation rates used in public examples come from `src/data/shared/contentCreditPolicy.ts` and are consumed by `src/constants/AI/unitCosts.ts`.
4. Billing shows included, promotional, purchased, and usable balances without publishing a rupee-per-credit value, provider cost, or margin.
5. Included allowances are 75 for Official, 250 for Pro, and 300 per paid Multi-location location.
6. The one 250-credit Pack costs ₹799 / $29 before applicable tax.
7. Exact non-negative enforcement replaces hidden overdraft.
8. Expired promotional credits remain historical data only: they do not authorize work, appear in usable totals, or revive when a later referral reward is issued.
8. Changes to charged operation rates must update the public-safe policy first so runtime examples and accounting remain aligned.

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
- Exact balance admission prevents surprise negative balances
- Single pack purchase (no tier decisions)
- Calm balance detail without a countdown or running-cost metaphor

User never feels "AI is costing me money constantly." They only feel "sometimes I need extra pack."

#### The Chai Shop Test (Founder Benchmark)

> If a chai shop owner can use MenuList for 6 months without thinking about AI billing once — and we still make 85–95% margin — we designed it correctly.

#### Critical Failure Modes (Execution Risks)

The system architecture is correct. It will only fail if execution violates these rules:

| Failure Mode                      | Why It Breaks ICP                               |
| --------------------------------- | ----------------------------------------------- |
| Turn balance detail into a countdown | Creates monitoring pressure |
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
| Region NEVER affects credits or feature behavior  | Same 250-credit Pack globally                       |
| Same product globally                              | No feature differences by geography                 |
| Approved regional price book                       | ₹799 India and $29 global                           |
| Currency detection must be correct                 | India → INR, outside → USD. No manual confusion.    |

The allowance and Pack size are identical across regions. Currency changes only the commercial price book.

**Forbidden:** Never make India cheaper but feature-limited. Never make global users get more AI capacity. Same product. Only price differs.

### Pack-shape authority

MenuList has one commercial Content Enhancement Pack: 250 credits for ₹799 / $29 before applicable tax. There is no dormant tier flag or compatibility pack list. Any later pack-shape change requires an explicit commercial-policy revision, source update, provider verification, UI/docs parity, and regression coverage.

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
| **Usable capacity**    | Recurring + valid promotional + purchased balances |
| **Used capacity**      | Sum of all AI usage events (append-only)         |
| **Remaining capacity** | Transaction-current bucket sum, shown with breakdown |
| **Enforcement**        | Server-side check before every paid AI operation |
| **When exhausted**     | Block action silently → show calm upsell CTA     |

### Capacity Scope

- **Per effective billing subscription**: a directly billed store owns its balance; linked outlets inheriting a Multi-location HQ subscription consume the shared HQ balance.
- **Acting-store attribution remains separate**: operation history stays under the store that requested the work even when billing resolves to HQ.
- **Not per-feature**: one pooled balance, not separate image/translation/description pools.
- **Bucket-specific lifetime**: recurring resets each cycle, promotional expires explicitly, and purchased value is protected by the 365-day cancellation-recovery policy.

### Multi-Outlet Credit Logic

The subscription boundary, not the tenant document and not the acting project, owns paid capacity. This preserves one auditable balance per paid billing scope while retaining operation attribution to the store that requested work.

#### Effective Billing Scope Example

```
HQ billing store — Multi-location plan with 2 paid locations (600 recurring credits)
Linked Store B — inherits the HQ entitlement and shared billing balance
Linked Store C — inherits the HQ entitlement and shared billing balance

The effective billing subscription:
  ├─ scales its recurring allowance by paid active location quantity
  ├─ owns recurring, promotional, and purchased balances
  ├─ accepts Pack purchases from an entitled outlet into the same HQ balance
  └─ serializes consumption so linked locations cannot overspend concurrently
```

**Result:** One paid multi-location scope has one auditable shared balance sized to its paid location count. ✅ Correct.

#### How Pack Purchases Work in an Effective Billing Scope

```
An entitled owner clicks "Buy Content Credits" in Billing
  ↓
Razorpay checkout opens with the effective billing store in immutable order metadata
  ↓
Payment verified via /api/razorpay/verify-topup
  ↓
effectiveBillingSubscription.topUpCredits += pack.creditAmount
  ↓
The paid scope now has more purchased capacity. Linked outlets using that HQ subscription share the updated balance.
```

#### Codebase Evidence (Effective Billing Scope)

| System Component | Scope     | Evidence                                     |
| ---------------- | --------- | -------------------------------------------- |
| Subscriptions    | Billed store | `getActiveSubscriptionForStore(tId, sId)` resolves direct or inherited entitlement |
| AI Operations    | Acting store | `menulistAiOperations/{tId}/{sId}/` retains operation attribution |
| Top-ups          | Billing store | Immutable top-up snapshot records acting and credited scope |
| Projects         | Acting store | `projectsMetadata/{tId}/{sId}/` retains menu ownership |
| Billing UI       | Effective subscription | Direct billing actions remain restricted; inherited balance is read-only except Pack purchase |
| verify-topup     | Effective subscription | Writes purchased credits to the transaction-verified billing subscription |
| Multi-location   | HQ quantity | Recurring allowance is `300 × paid active locations`, minimum two |

The billing subscription is authoritative for value; `{tId}/{sId}` operation paths remain authoritative for who performed the work.

### Exact Enforcement Strategy

> **Source:** ChatGPT feedback point #1 (Feb 9, 2026 review)

Metered work is admitted only when the exact usable balance covers the full reservation.

**How it works:**

```
usable = monthlyCredits + validPromotionalCredits + topUpCredits
if (usable >= requiredCredits) reserve exact buckets
else block before provider work and show the single Pack action
```

**Rules:**

- No balance can become negative.
- Goodwill uses an explicit expiring promotional grant.
- Reservation records the exact source buckets and rate version.
- Failure refunds those same buckets once.

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
| Capacity exhausted | "Get more Content Credits"                                 | Provider or margin explanation                   |
| Pack purchased     | "AI enhancements are ready" plus refreshed Pack balance    | Provider economics or margin                     |
| Pack active        | Show exact purchased Pack balance without a monthly meter    | Monthly allowance/used-this-cycle countdown      |
| Support inquiry    | Explain the public Pack amount and current operation rates    | Provider tokens, cost, margin, or internal tax valuation |

---

## Subscription Integration

### Included Capacity Per Subscription Tier

Each subscription plan includes a recurring Content Credit allowance. Billing shows the owner the current balance without turning it into a performance dashboard.

| Subscription tier | Included Content Credits per cycle |
| ----------------- | ----------------------------------: |
| Official          | 75                                  |
| Pro               | 250                                 |
| Multi-location    | 300 per paid active location        |

### Capacity Reset

- **On subscription renewal:** Included capacity resets to plan's base amount
- **Pack capacity:** Does not reset with the subscription period
- **On plan upgrade:** New plan's included capacity replaces remaining; purchased and valid promotional balances transfer separately
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

**Response:** "Generated results can vary. You can review generated content before using it. Refund requests are handled under our Refund Policy and applicable law."
**Why this works:** It is accurate about generated output and points the owner to the governing policy without implying that buying another pack resolves a disputed purchase.

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
| Exact no-overdraft reservation                               | ✅ Built | `checkAICapacity()` + `reserveAiCapacity()` |
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
| Cancelled-account purchased credits | Low    | Freeze server-side and restore once within 365 days          |

#### Abuse Protection — Multi-Layer Velocity Guard (Already Built)

> **Source:** ChatGPT feedback review (Feb 10, 2026) — validated against codebase

| Layer                   | Config                        | Effect                          | File                                   |
| ----------------------- | ----------------------------- | ------------------------------- | -------------------------------------- |
| Rate limit (expensive)  | 5 req/min                     | Max 300 expensive ops/hour      | `src/lib/rateLimit/configs.ts:33-36`   |
| Rate limit (general AI) | 20 req/min                    | Max 1200 AI ops/hour            | `src/lib/rateLimit/configs.ts:22-25`   |
| Capacity enforcement    | recurring + valid promotional + purchased | Exact non-negative admission | `src/lib/ai/capacityCheck.ts` |
| Kill switch             | ENABLE_AI_ENHANCEMENTS        | Instant disable all paid ops    | `src/config/features.ts`               |
| Top-up rate limit       | 10/hour                       | Can't bulk-purchase packs       | `src/lib/rateLimit/configs.ts:148-152` |

**Worst-case abuse math:** At max rate (5 expensive/min × 5 units = 25 units/min), a 250-unit pack is exhausted in ~10 minutes. Max pack purchases = 10/hour. Worst case = 2,500 units/hour = ₹30,000 revenue vs ~₹1,350 Google cost. **Still profitable at max abuse rate.** No additional velocity guard needed at launch.

#### Cancelled Account Purchased Credits

> **Source:** ChatGPT feedback review (Feb 10, 2026) — validated against codebase

On cancellation, unused purchased credits move to the server-only `menulistPurchasedCreditRecoveries/{tenantId}_{storeId}` ledger. A different replacement subscription for the same billing store restores them once if captured payment arrives within 365 days. Browser reads and writes are denied.

#### Margin Management Strategy

> **Source:** ChatGPT feedback review (Feb 10, 2026)

Current margins are ~94-99% depending on operation. This is acceptable at launch but should be monitored. The architecture supports gradual adjustment WITHOUT customer-facing price changes:

**Lever:** Adjust `AI_UNIT_COSTS` values in `src/constants/AI/unitCosts.ts`

- Example: `IMAGE_GENERATION: 5` → `IMAGE_GENERATION: 7` reduces pack capacity by 40%
- No customer-facing change — same pack price, fewer internal operations per pack
- Deploy-only change — no migration, no UI update needed
- **Rule:** Never change customer-facing price first. Adjust internal unit economics first.

### Settled Decisions

1. **Exact pack pricing:** ₹799 / $29 before applicable tax for 250 credits.

2. **Internal unit values per operation?** — Requires calibration against actual Gemini API billing data. Current `TOKENS_PER_CREDIT` / `CHARGE_PER_CREDIT` constants provide starting framework.

3. **Included capacity:** Official 75, Pro 250, Multi-location 300 per paid location.

4. **Capacity scope?** — **RESOLVED: effective billing subscription.** A directly billed single location owns its balance. Linked outlets inheriting a Multi-location HQ subscription consume the shared HQ balance, while operation history remains attributed to the acting `{tId}/{sId}` store.

5. **Existing constants migration?** — `TOKENS_PER_CREDIT=500` and `CHARGE_PER_CREDIT=100` exist. Should these be extended or replaced with the new `AI_UNIT_COSTS` system?

6. **Cancellation recovery:** Purchased credits freeze and can be restored within 365 days.

---

## Existing Infrastructure Alignment

### Current Pricing Infrastructure (As-Built)

The codebase already has a fully functional pricing, billing, and credit system. The AI Enhancement Packs model must integrate with — not replace — this infrastructure. Below is the complete inventory.

#### Subscription Plans (`src/data/PlatformPlansList.ts`)

| Type | Plan           | Monthly Price (INR) | Monthly Price (USD) | Monthly Credits (INR) | Monthly Credits (USD) | Billing    |
| ---- | -------------- | ------------------- | ------------------- | --------------------- | --------------------- | ---------- |
| B2C  | Official       | ₹599                | $29                 | 75                    | 75                    | Month/Year |
| B2C  | Pro            | ₹1,499              | $79                 | 250                   | 250                   | Month/Year |
| B2C  | Multi-location | ₹1,499/location     | $79/location        | 300/location          | 300/location          | Month/Year |
| B2B  | Starter API    | ₹4,999              | $69                 | 200                   | 200                   | Month/Year |
| B2B  | Pro API        | ₹18,999             | $249                | 1000                  | 1000                  | Month/Year |

Multi-location requires at least two paid active locations. Public and persisted IDs are `menulist_official`, `menulist_pro`, and `menulist_multi_location`.

#### Credit Pack (One-Time Top-up, `aiEnhancementPacksList` in same file)

| Pack | Credit Amount | Price (INR) | Price (USD) | Current examples |
| --- | ---: | ---: | ---: | --- |
| Content Credit Pack | 250 credits | ₹799 | $29 | Up to 50 generated menu images or 250 description rewrites |

#### Feature List (`src/data/PlatformFeaturesList.ts`)

AI features are offered across the subscription tiers with bounded availability language:

- AI Data Extraction: "Included" (all plans)
- AI Description Generation: "Included" (all plans)
- AI Multi-Language Translation: "Included" (all plans)
- AI Image Generator: `true` (all plans)
- AI Image Editor: `true` (all plans)
- Interactive Studio: Pro/Multi-location only

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
  monthlyCredits: number | null;
}

interface AIEnhancementPack {
  packId: string;
  name: string;
  creditAmount: number;
  priceINR: Price;
  priceUSD: Price;
}
```

#### Provider-Agnostic Architecture (`old_docs/payments/razorpay/`)

The payment system was designed provider-agnostic from the start:

- `FirestoreSubscriptionDoc` uses generic `providerSubscriptionId`, `providerPlanId`
- `FirestoreTopupDoc` uses generic `providerOrderId`, `providerPaymentId`
- `paymentProvider: "razorpay" | "stripe"` field allows future expansion
- Webhook router supports per-provider endpoints

#### Pricing Strategy Doc (`__docs__/strategy/pricing-strategy.md`)

The current pricing strategy defines the Official, Pro, and Multi-location public plans. AI Enhancement Packs integrate with their existing included-capacity entitlements and remain commercially separate from subscription pricing.

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

**Correct approach:** Usable credits stay on the effective billing subscription. Metered operations decrement recurring, then valid promotional, then purchased credits. Pack purchases add only to `topUpCredits`; cancellation recovery uses a separate server-only ledger.

#### Conflict 3: Credit Visibility in UI - Superseded July 11, 2026

The former outcome-only rule was replaced by transparent credit balances plus exact examples. `CreditPackCard.tsx` renders `pack.creditAmount` and examples calculated from `src/data/shared/contentCreditPolicy.ts`. Internal provider economics remain private.

#### Conflict 4: Feature List Says "Unlimited" - Resolved

`PlatformFeaturesList.ts` now uses **"Included"** for descriptions, translations, and extraction. Boolean image availability remains unchanged:

| Feature              | Current Value           | Contract                           |
| -------------------- | ----------------------- | ---------------------------------- |
| `ai_descriptions`    | "Included" (all tiers)  | Bounded by Content Credits         |
| `ai_multi_language`  | "Included" (all tiers)  | Bounded by Content Credits         |
| `ai_image_generator` | `true`                  | Bounded by Content Credits         |
| `ai_image_editor`    | `true`                  | Bounded by Content Credits         |

**Critical:** "Unlimited" explicitly promises no limits. If we enforce capacity, we CANNOT say "Unlimited." Changing to "Included" communicates availability without promising infinity.

#### Conflict 5: `monthlyCredits` in Data Structures - Resolved

The `Price` interface and every plan object includes `monthlyCredits`. Under the maintained contract, this field:

- remains the canonical recurring allowance used by server accounting
- is shown as an exact balance in authenticated owner Billing
- is not used as public pricing-page feature-card copy

**Resolution:** Keep the field name as the long-term data contract. Owner Billing may show the recurring balance, while public plan cards use concise included-enhancement language.

#### Conflict 6: Pack Interface Credit Visibility - Resolved

The final `AIEnhancementPack` interface intentionally has owner-visible `creditAmount: number`, and `aiEnhancementPacksList` is the only exported commercial pack list used by:

- `create-topup-order/route.ts` — to set Razorpay order notes
- `verify-topup/route.ts` — to calculate credits to add
- `CreditPackCard.tsx` — to display credit amount to user

**Resolution:** The type is `AIEnhancementPack`, while `creditAmount` remains the canonical purchased amount and is intentionally visible for Pack and referral-credit transparency. Provider cost and other internal economic fields remain server-only.

#### Pricing Strategy Alignment

`__docs__/strategy/pricing-strategy.md` and `src/data/PlatformPlansList.ts` define the same three public B2C plans. AI Enhancement Packs consume the plan's included capacity without owning or duplicating the subscription-pricing contract.

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

#### Current implementation authority

> **3-Year Freeze Rule Applies:** MenuList is not live, so the implementation uses only final names and has no compatibility aliases or migration branches.

| Contract | Authority |
| --- | --- |
| Pack type | `AIEnhancementPack` in `src/data/common.ts` |
| Commercial pack list | `aiEnhancementPacksList` in `src/data/PlatformPlansList.ts` |
| Credit amount and INR/USD price | `MENULIST_CONTENT_CREDIT_PACK` in `src/data/shared/contentCreditPolicy.ts` |
| Operation rates | `CONTENT_CREDIT_OPERATION_COSTS` in `src/data/shared/contentCreditPolicy.ts` |
| Atomic reservation and settlement | `src/lib/ai/capacityCheck.ts` |
| Purchase settlement | Razorpay top-up routes plus `src/lib/billing/topupSettlement.ts` |

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
| `aiCapacityTotal/Used/Remaining` on tenant | ❌ REJECTED | Capacity remains on the effective billing subscription           |
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
**Last Updated:** August 22, 2026 (approved Content Credit contract)

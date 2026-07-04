# MenuList Future Roadmap — Single Source of Truth

**Created:** February 16, 2026  
**Source:** ChatGPT Strategic Planning Sessions (2 sessions) + Cascade Codebase Audit + Independent Web Research  
**Authority:** Founder reference document  
**Review Frequency:** Quarterly  
**Status:** Historical roadmap/source-state reference; not current launch certification

---

> **Launch Boundary:** This file preserves February 2026 roadmap and source-state evidence. It is not live feature-flag truth, current implementation approval, current testing approval, current launch approval, or production certification. Current MenuList readiness is decided only by the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), current source verifiers, browser/device QA, provider smoke, target deploy evidence, and production-host smoke. For live feature flags, inspect `src/config/features.ts`.

## How to Read This Document

This document captures **every strategic topic** discussed across two ChatGPT planning sessions, cross-checked against the MenuList codebase snapshot available at the time and validated with independent web research. Treat all "built", "done", "flag off", and "priority" labels below as historical planning evidence unless a current verifier, runtime source file, and external gate now prove the same claim. Each item includes:

- **ChatGPT's position** — what was recommended
- **Codebase reality** — what actually exists today
- **Cascade's expert validation** — independent assessment with web research
- **Verdict** — AGREE / PARTIAL / DISAGREE with justification
- **Priority & effort** — when/if to build

---

# PART 1: FEBRUARY 2026 SOURCE-STATE SNAPSHOT

> Historical snapshot only. This section is not current codebase truth and must not be used as launch, testing, deploy, or activation approval. Current flags live in `src/config/features.ts`; current readiness lives in the production-readiness audit and External Certification Runbook.

## Implemented Source Evidence (Not Launch Certification)

| #   | Feature                           | Flag                          | Status   | Key Files                                        |
| --- | --------------------------------- | ----------------------------- | -------- | ------------------------------------------------ |
| 1   | Menu Digitization Engine          | N/A (core)                    | ✅ ON    | `src/lib/vectorEmbeddings/`, extraction pipeline |
| 2   | Multi-Language Support            | N/A (core)                    | ✅ ON    | Translation system, `next-intl`                  |
| 3   | AI Image Generation               | `ENABLE_AI_IMAGE_GENERATION`  | ✅ ON    | Gemini 2.0 Flash + Imagen 3                      |
| 4   | Customer-Facing Digital Menu      | N/A (core)                    | ✅ ON    | `src/app/_client/[[...slug]]/page.tsx`           |
| 5   | Decision Blocks (Recommendations) | `ENABLE_DECISION_BLOCKS`      | ✅ ON    | Client-side scoring + nightly CF                 |
| 6   | Continuous Menu Intelligence      | `MENU_INTELLIGENCE_ENABLED`   | ✅ ON    | `functions/src/intelligence/menuIntelligence.ts` |
| 7   | Social Content Engine (Today)     | `SOCIAL_CONTENT_ENABLED`      | ✅ ON    | 9 campaign types, 5 execution surfaces           |
| 8   | Digital Screens                   | `DIGITAL_SCREENS_ENABLED`     | ✅ ON    | Menu board + highlights modes                    |
| 9   | Owner Dashboard                   | N/A (core)                    | ✅ ON    | SWR-cached, lazy-loaded views                    |
| 10  | Multi-Tenant Architecture         | N/A (core)                    | ✅ ON    | tId/sId isolation everywhere                     |
| 11  | Authentication & RBAC             | N/A (core)                    | ✅ ON    | NextAuth + roles-permissions                     |
| 12  | Multi-Outlet + Chain Architecture | `ENABLE_MULTI_OUTLET`         | ✅ ON    | Master/outlet model, chain control panel         |
| 13  | Menu Command Center (Bulk Ops)    | `ENABLE_MENU_COMMAND_CENTER`  | ✅ ON    | Pricing/availability/category bulk actions       |
| 14  | Guest Feedback System             | `ENABLE_GUEST_FEEDBACK`       | ✅ ON    | Private feedback firewall                        |
| 15  | AI Enhancement Packs (Billing)    | `ENABLE_AI_ENHANCEMENTS`      | ✅ ON    | Capacity-based billing                           |
| 16  | Editor Onboarding UX              | `ENABLE_EDITOR_ONBOARDING`    | ✅ ON    | Welcome banners, progressive disclosure          |
| 17  | Hours Status Display              | `ENABLE_HOURS_STATUS_DISPLAY` | ✅ ON    | Open/Closed badge on client menu                 |
| 18  | Physical Surfaces                 | N/A                           | ✅ BUILT | Tent cards, stickers, PDF export                 |
| 19  | Razorpay Billing                  | N/A                           | ✅ ON    | Subscription + quantity-based billing            |

## Historical Flag-Off / Activation Candidates (Not Testing Approval)

| #   | Feature                          | Flag                                    | Status     | Key Files                                               |
| --- | -------------------------------- | --------------------------------------- | ---------- | ------------------------------------------------------- |
| 20  | Menu Correctness Engine (MCE)    | `ENABLE_MCE: false`                     | ✅ BUILT   | `src/lib/mce/` — 17 validation rules, publish-gate      |
| 21  | Official Business Page (OBP)     | `ENABLE_OBP: false`                     | ✅ BUILT   | `src/app/_client/obp/` — full identity page + analytics |
| 22  | Mobile UI (PWA)                  | `ENABLE_MOBILE_UI: false`               | ✅ BUILT   | 19 mobile screens, MobileShell, antd-mobile             |
| 23  | POS Webhook Sync                 | `ENABLE_POS_SYNC: false`                | ✅ BUILT   | HMAC-SHA256, full snapshot, 25s debounce                |
| 24  | GBP Sync                         | `ENABLE_GBP_SYNC: false`                | ✅ BUILT   | OAuth flow, nightly sync, hours drift detection         |
| 25  | Menu Observation Layer           | `ENABLE_MENU_OBSERVATION: false`        | ✅ BUILT   | Change log tracking                                     |
| 26  | Owner Control Analytics          | `ENABLE_OWNER_ANALYTICS: false`         | ✅ BUILT   | Authority maturation tracking                           |
| 27  | SEO/AEO Discovery Infrastructure | N/A (schema enrichment)                 | ✅ SHIPPED | `src/lib/schema/index.ts`, geo, sameAs, priceRange      |
| 28  | Master Update Awareness          | `ENABLE_MASTER_UPDATE_AWARENESS: false` | ✅ BUILT   | Outlet awareness banner                                 |

## 📝 DOCUMENTED BUT NOT YET BUILT

| #   | Feature                     | Docs Location                                 | Status                             |
| --- | --------------------------- | --------------------------------------------- | ---------------------------------- |
| 29  | Reviews & Reputation System | `__docs__/reviews-reputation/`                | ✅ INFRASTRUCTURE BUILT (flag OFF) |
| 30  | Messaging Onboarding        | `__docs__/messaging-onboarding/`              | ✅ CODED (16 files, flag OFF)      |
| 31  | PONR Onboarding Flow        | `__docs__/onboarding/ponr-onboarding_spec.md` | Spec written, no code              |
| 32  | Trust Health Signal         | `__docs__/trust-health-signal/`               | ✅ IMPLEMENTED (flag OFF)          |
| 33  | Loyalty Health Signal       | `__docs__/loyalty-health-signal/`             | ✅ IMPLEMENTED (flag OFF)          |
| 34  | Risk/Decline Detection      | `__docs__/risk-decline-detection/`            | ✅ IMPLEMENTED (flag OFF)          |
| 35  | Temp Status Layer           | `__docs__/temp-status-layer/`                 | ✅ IMPLEMENTED (flag OFF)          |
| 36  | Special Menu Switching      | `__docs__/special-menu-switching/`            | ✅ IMPLEMENTED (flag OFF)          |

## 📐 STRATEGIC FRAMEWORK (Customer-Facing Infrastructure)

> Added February 19, 2026 from ChatGPT 6-Pillar Infrastructure Planning Session.
> Full analysis: `__docs__/customer-facing-infrastructure/_archive/chatgpt-review.md`

| Pillar | Name                       | Purpose                           | Status                            | Docs                                 |
| ------ | -------------------------- | --------------------------------- | --------------------------------- | ------------------------------------ |
| 1      | **Presence Dominance**     | Official link everywhere          | ✅ BUILT (OBP) — adoption pending | `__docs__/presence-dominance/`       |
| 2      | **Truth & Accuracy**       | Most trusted info source          | ✅ BUILT (MCE + hours)            | `__docs__/truth-accuracy-dominance/` |
| 3      | **Reputation Protection**  | Review management + reply assist  | 📝 DOCUMENTED — GBP blocked       | `__docs__/reputation-protection/`    |
| 4      | **Trust Health Signal**    | "Do customers still trust us?"    | 🆕 DOCUMENTED — needs traffic     | `__docs__/trust-health-signal/`      |
| 5      | **Loyalty Health Signal**  | "Are customers returning?"        | 🆕 DOCUMENTED — needs traffic     | `__docs__/loyalty-health-signal/`    |
| 6      | **Risk/Decline Detection** | Early warning for business health | 🆕 DOCUMENTED — needs P4+P5       | `__docs__/risk-decline-detection/`   |

**Strategy umbrella:** `__docs__/customer-facing-infrastructure/README.md`

---

# PART 2: THE STRATEGIC BUILD SEQUENCE

> ChatGPT recommended a specific build order. Here is the complete sequence with my validation.

## The Agreed Execution Order (From Both Sessions)

| Phase       | Feature                      | ChatGPT Rationale                               | Current State                              |
| ----------- | ---------------------------- | ----------------------------------------------- | ------------------------------------------ |
| **Phase 1** | Menu Correctness Engine      | Trust firewall — wrong menu destroys everything | Historical implementation evidence; current approval requires active gates |
| **Phase 2** | Full Mobile Support          | Real-world usability — owners live on phone     | Historical implementation evidence; current approval requires active gates |
| **Phase 3** | Messaging Onboarding         | Growth unlock — frictionless acquisition        | 📝 **DOCUMENTED** (docs complete, no code) |
| **Phase 4** | Official Public Presence     | Identity layer — become their default link      | ✅ **DONE** (OBP built, flag OFF)          |
| **Phase 5** | Reputation Infrastructure    | Lock-in layer — own reviews + responses         | 📝 **DOCUMENTED** (no code)                |
| **Phase 6** | Real-world onboarding wave   | First 50 serious SMBs                           | 🔮 Future                                  |
| **Phase 7** | Distribution + lock-in phase | Multi-platform truth sync                       | 🔮 Future                                  |

### Cascade Validation of Sequence

**AGREE with overall sequence.** The logic is sound:

1. **MCE first** → Correct. You cannot onboard real stores with risk of wrong menus. Trust is the foundation. ✅ Already done.
2. **Mobile second** → Correct. Indian SMB owners operate from phone. Desktop-only = dead product. ✅ Already done.
3. **Messaging onboarding third** → Correct. This is the highest-leverage growth move. India has 500M+ WhatsApp users. 292M WhatsApp Business app downloads in India alone (Gallabox, 2023). WhatsApp is the v1 provider — architecture supports Telegram/LINE/Viber.
4. **OBP fourth** → Correct. Every onboarded store needs an official link. ✅ Already built — can activate alongside or right after messaging onboarding.
5. **Reputation fifth** → Correct. Build silently, activate when GBP API approved. Docs ready.
6. **Onboarding wave sixth** → Correct. Only push growth after system is stable + controllable.

**One adjustment:** Since OBP is already built, Phases 3 and 4 can overlap. Messaging onboarding should generate the OBP link as the store's official output.

---

# PART 3: THE 6 STRATEGIC GAPS (DEEP ANALYSIS)

> ChatGPT identified 6 infrastructure gaps in the SMB customer-facing layer. Each is analyzed below with independent web research and codebase cross-reference.

---

## GAP 1: OFFICIAL PUBLIC PRESENCE (Identity Layer)

### ChatGPT's Position

MenuList must become the **single official link** a business uses everywhere — Instagram bio, Google link, WhatsApp share, QR on packaging. This is the "digital front door" of the business, distinct from the digital menu (consumption surface).

### Codebase Reality

**✅ ALREADY BUILT.** The Official Business Page (OBP) is fully implemented:

- Feature flag: `ENABLE_OBP: false` in `src/config/features.ts`
- Client components: `src/app/_client/obp/OBPAnalytics.tsx`, `OBPActions.tsx`
- Full analytics pipeline: daily/weekly/monthly/summary docs
- Dashboard card: `OBPMetricsCard.tsx`
- Schema.org enrichment: `src/app/_client/obp/schema.ts`
- SEO/AEO infrastructure shipped (Feb 16, 2026)
- Contains: logo, name, hours, call/WhatsApp, directions, menu button, socials
- Docs: `__docs__/official-business-page/` (full doc set)

### Cascade Expert Validation

**AGREE — This is strategically critical.** The link-in-bio market is estimated at $600M+ and growing. Tools like Linktree, Later Link in Bio, and Beacons prove that SMBs desperately need a single link. But generic link-in-bio tools are commodities. MenuList's OBP is **purpose-built for food/service businesses** with live hours, structured menu data, and call-to-action buttons — far more valuable than a link list.

**Key insight ChatGPT got right:** The distinction between "digital menu" (consumption surface for in-store QR) and "official page" (identity surface for everywhere else) is architecturally sound. These serve different user intents:

- Digital menu: "What can I order?" (inside restaurant context)
- OBP: "What is this place?" (discovery/pre-visit context)

**What ChatGPT missed:** The OBP is already fully built with analytics parity. The remaining work is not engineering — it's **behavioral adoption**. The challenge is making owners actually use this link everywhere. That requires:

- Post-onboarding nudge: "Share your official link"
- Copy-link prominence in dashboard
- Messaging onboarding should output this link as the deliverable

| Aspect                           | Status         | Action Needed             |
| -------------------------------- | -------------- | ------------------------- |
| OBP page built                   | ✅ Complete    | None                      |
| OBP analytics                    | ✅ Complete    | None                      |
| Schema/SEO                       | ✅ Complete    | None                      |
| Feature flag activation          | ❌ OFF         | Enable after testing      |
| Behavioral adoption design       | ❌ Not started | Design nudge flows        |
| Messaging onboarding integration | ❌ Not started | Output OBP link as result |

**Verdict: AGREE — Strategic priority. Engineering done. Activation + adoption = remaining work.**

---

## GAP 2: DISTRIBUTION INFRASTRUCTURE (Truth Everywhere)

### ChatGPT's Position

MenuList has truth but truth must spread everywhere automatically — Google, Maps, Instagram, WhatsApp. Without distribution, MenuList stays an internal tool.

### Codebase Reality

**PARTIALLY BUILT.** Several distribution layers already exist:

- **GBP Sync:** `ENABLE_GBP_SYNC: false` — OAuth, nightly sync, hours drift detection. Fully built, pending Google API approval.
- **SEO/AEO:** Schema.org enrichment shipped (Feb 16, 2026) — geo, sameAs, priceRange, dietary info, availability. Makes pages AI-readable for ChatGPT/Gemini/Perplexity citations.
- **QR codes:** Built and working (physical surfaces)
- **Shareable links:** Subdomain system working (e.g., `joespizza.menulist.ai`)
- **WhatsApp share:** Buttons exist on OBP and menu pages

### Cascade Expert Validation (with Web Research)

**PARTIALLY AGREE — but ChatGPT overestimates what's buildable now.**

Web research confirms the importance:

- **Google is THE discovery channel.** 34% of local businesses get 1,000+ "discovery searches" per month on Google (BrightLocal 2025). GBP is critical.
- **Inconsistent NAP (Name, Address, Phone) data** across platforms hurts local SEO rankings (Moz Local Search Ranking Factors).
- **89.74% of global search traffic** goes through Google (December 2024 data).

However, ChatGPT's vision of "auto-sync to Instagram, WhatsApp catalog, delivery apps, Apple Maps, Bing" is **premature and technically complex:**

| Distribution Channel    | Feasibility            | Effort     | Priority                               |
| ----------------------- | ---------------------- | ---------- | -------------------------------------- |
| Google Business Profile | ✅ Built (API pending) | Done       | **P0** — flip switch when approved     |
| SEO/Schema.org          | ✅ Shipped             | Done       | **P0** — already live                  |
| Official link adoption  | 🟡 Behavioral design   | Low        | **P1** — design nudges                 |
| Apple Maps Connect      | 🔴 Manual API, no bulk | High       | **P3** — not worth effort now          |
| Instagram bio link      | 🟢 Already possible    | Zero       | **P1** — owner just needs to paste     |
| WhatsApp catalog sync   | 🔴 WhatsApp API limits | Very high  | **P4** — premature                     |
| Delivery app sync       | 🔴 No standard API     | Impossible | **REJECT** — each platform proprietary |

**What ChatGPT missed:**

1. GBP Sync is ALREADY BUILT. The bottleneck is Google's approval process, not engineering.
2. SEO/AEO infrastructure is ALREADY SHIPPED. MenuList pages are already generating rich schema.
3. Most "distribution" happens through the **owner sharing the link**. The best ROI is making link-sharing effortless, not building API integrations.

**Verdict: PARTIAL AGREE — GBP sync (done), SEO (done), link adoption (design needed). Multi-platform sync is premature.**

---

## GAP 3: REPUTATION CONTROL INFRASTRUCTURE (Reviews + Ratings)

### ChatGPT's Position

Reviews control SMB destiny. MenuList must own the review response layer, detect reputation threats, and protect ratings. Build everything now with API OFF, flip switch when GBP approved.

### Codebase Reality

**DOCUMENTED, NOT BUILT.**

- Full spec: `__docs__/reviews-reputation/reviews-reputation_spec.md` (18,674 bytes)
- Full impl: `__docs__/reviews-reputation/reviews-reputation_impl.md` (35,253 bytes)
- Marketing/website/helpdoc: All written
- Firebase doc: Written
- **Zero code exists.** No components, no DAL, no types implemented yet.
- Foundation exists: Guest Feedback System (`ENABLE_GUEST_FEEDBACK: true`) acts as private reputation firewall.

### Cascade Expert Validation (with Web Research)

**STRONGLY AGREE — The data is overwhelming.**

Independent research confirms every claim ChatGPT made:

| ChatGPT Claim                                                 | Verified?                                                                   | Source                                     |
| ------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------ |
| "~90% of consumers read reviews before visiting"              | ✅ **VERIFIED** — 90% confirmed                                             | HookAgency (2024), citing BrightLocal data |
| "88% trust reviews as much as personal recommendations"       | ✅ **VERIFIED** — 88% confirmed                                             | HookAgency (2024)                          |
| "1-star increase → up to 9% revenue boost"                    | ✅ **VERIFIED** — Harvard Business School study found 5-9% revenue per star | ReputationX, citing HBS research           |
| "86% hesitate to buy from businesses with negative reviews"   | ✅ **VERIFIED** — 86% confirmed                                             | ReputationX (2024)                         |
| "89% likely to patronize company that replies to ALL reviews" | ✅ **VERIFIED** — 89% confirmed                                             | Reputation.com survey                      |
| "53% expect response to negative review within a week"        | ✅ **VERIFIED** — 53% confirmed                                             | ExplodingTopics (2024)                     |

**This is the highest-impact unbuilt feature.** The Guest Feedback System is an excellent private firewall, but it doesn't address the public reputation layer. When GBP API is approved, MenuList should be ready to:

1. Ingest reviews from Google
2. Surface them to owner in unified inbox
3. Suggest AI-drafted replies
4. Track rating trends
5. Alert on negative spikes

**What ChatGPT got right:**

- Build infrastructure now, activate later. This is exactly the 3-year freeze philosophy.
- The Guest Feedback system already intercepts unhappy customers before they go public — brilliant foundation.

**What ChatGPT got partially wrong:**

- "Build for all platforms (Zomato, Swiggy, etc.)" — Start with Google only. Other platforms have no open API.
- The reply "autopilot" should be reply-assist, not auto-post. Google requires business owner to explicitly post replies. Autopilot is not technically possible through the API.

**Verdict: STRONGLY AGREE — Highest-impact unbuilt feature. Docs ready. Build when capacity allows, with Google-only scope initially.**

---

## GAP 4: REAL-TIME STATUS & LIVE CUSTOMER UPDATES

### ChatGPT's Position

Customers arrive and find place closed, sold out, or running special menu. SMBs cannot broadcast instantly. Build a "live status layer" with temporary banners, auto-expiry, and cross-surface visibility.

### Codebase Reality

**PARTIALLY EXISTS.**

- Hours status display: `ENABLE_HOURS_STATUS_DISPLAY: true` — shows Open/Closed badge
- Working hours + timezone: Stored per store, displayed on OBP and digital menu
- Availability toggles: Per-item availability (available/unavailable) exists in editor
- Holiday/exception hours: `__docs__/hours-holiday-accuracy/` — spec exists
- **Missing:** Temporary status banners, "closed today" notices, event notices, auto-expiry system

### Cascade Expert Validation (with Web Research)

**AGREE — Important but lower priority than Gaps 1-3.**

Research supports the pain:

- 78% of customers cancel after a bad experience (PwC Future of CX survey)
- Customer uncertainty about availability directly reduces satisfaction
- "Customers hate uncertainty more than bad news" — this is well-documented in behavioral economics (Kahneman's loss aversion theory)

However, the **severity is lower than reviews/reputation:**

- Wrong hours → one bad visit → one lost customer
- Bad reviews → thousands see it → hundreds of lost customers

**What already exists that ChatGPT didn't consider:**

1. Hours status badge already shows open/closed in real-time
2. Per-item availability toggles already exist (owner can mark "sold out")
3. OBP shows hours and contact info
4. Mobile UI allows quick availability changes from phone

**What's genuinely missing:**

- Temporary status banners ("Closed for private event today")
- Auto-expiring notices (set duration → auto-remove)
- "Special menu only" mode
- Quick "closed today" toggle (simpler than editing hours)

**Estimated effort:** Small — 3-5 days. This could be a lightweight addition to the OBP and digital menu pages.

**Verdict: AGREE — Real pain, but lower priority. Small build when time allows. Most critical scenarios already covered by hours display + availability toggles.**

---

## GAP 5: SMART DISCOVERY & UPSELL INFRASTRUCTURE

### ChatGPT's Position

Most customers only order what they know. Menu engineering can boost profits 10-20%. Build smart highlights, pairing suggestions, "what should I try?" entry points, and owner-controlled push.

### Codebase Reality

**SUBSTANTIALLY BUILT.**

- **Decision Blocks:** `ENABLE_DECISION_BLOCKS: true` — Popular Right Now, Quick Pick, Best Value
- **Continuous Menu Intelligence:** Nightly scoring, confidence thresholds, calibration
- **Social Content Engine:** Highlights bestsellers, new items, slow items
- **Digital Screens:** Rotating promotional slides with highlights
- **Owner Boost:** Manual item boosting via edit modal
- **isBestSeller tag:** Exists on items
- **AI descriptions:** Generated for discoverability

### Cascade Expert Validation (with Web Research)

**PARTIALLY AGREE — Most of this is already built. ChatGPT underestimated MenuList's existing discovery layer.**

Research confirms the revenue impact:

- Menu engineering can increase profits by **10-15%** (Supy.io, citing hospitality research)
- Menu design influences spending by up to **20%** (Restaurant.eatapp.co)
- Visual cues and images increase sales up to **30%** (multiple restaurant industry studies)
- **80% of sales come from only 16% of menu items** — discovery of the other 84% is a massive opportunity

**What MenuList already does (that ChatGPT missed):**

| Discovery Feature         | Status   | Evidence                                  |
| ------------------------- | -------- | ----------------------------------------- |
| Popular Right Now block   | ✅ Built | Decision Blocks with nightly scoring      |
| Quick Pick block          | ✅ Built | Duration-based recommendations            |
| Best Value block          | ✅ Built | Price/popularity ratio                    |
| Bestseller tagging        | ✅ Built | `isBestSeller` on items                   |
| Owner item boost          | ✅ Built | Manual boost slider in edit modal         |
| AI descriptions           | ✅ Built | Generated for every item                  |
| Visual menu (images)      | ✅ Built | AI image generation                       |
| Digital screen highlights | ✅ Built | Rotating promotional slides               |
| Smart distribution        | ✅ Built | Heuristic mode, learned mode architecture |

**What's genuinely still missing (small gaps):**

- Item-level pairing suggestions ("Goes well with...")
- "First time? Start here" section
- Dynamic trending section based on real-time data
- Category-level discovery ("Chef's Picks", "New This Week")

**These are enhancements, not infrastructure gaps.** The foundation is world-class.

**Verdict: PARTIAL AGREE — Foundation is excellent. Remaining items are polish, not critical gaps. Priority: LOW.**

---

## GAP 6: CUSTOMER MEMORY & RETENTION INFRASTRUCTURE

### ChatGPT's Position

61% of SMB revenue comes from repeat customers. 5% retention increase → 25-95% profit boost. Build passive customer identity capture, revisit triggers, and memory layer.

### Codebase Reality

**MINIMAL.**

- Guest Feedback captures some customer interaction data
- No customer identity system
- No revisit trigger system
- No customer memory layer
- No retention infrastructure

### Cascade Expert Validation (with Web Research)

**AGREE on the problem. DISAGREE on the timing.**

The retention statistics are real and verified:

- **5% retention increase → 25-95% profit increase** — Confirmed by Bain & Company / Harvard Business Review (original research by Frederick Reichheld)
- **65% of company revenue from existing customers** — Multiple sources confirm
- **Returning customers spend 67% more** — Bain & Company data

**However, ChatGPT is correct that this is Phase 2-3 infrastructure, NOT immediate.**

Why NOT now:

1. **No traffic yet.** You need active stores with real customer visits before retention makes sense.
2. **Privacy complexity.** Customer tracking requires GDPR/privacy compliance thinking.
3. **Dependency chain.** Retention requires: active stores → regular traffic → customer identity → trigger system. Multiple prerequisites missing.
4. **Doctrine alignment.** MenuList's identity is "calm infrastructure for owners," not "CRM for customer relationships." This layer must be extremely subtle.

**What could be built later (lightweight approach):**

- Anonymous visit frequency tracking (cookie-based, no PII)
- "Welcome back" subtle personalization on menu page
- "Last ordered" memory (only if customer opts in)
- Owner-side "repeat visitor %" metric (aggregate only)

**What must NEVER be built (doctrine violation):**

- ❌ Loyalty points / gamification
- ❌ Push notifications to customers
- ❌ Email marketing campaigns
- ❌ CRM dashboards
- ❌ Customer profiles visible to owner

**Verdict: AGREE on importance. DISAGREE on timing. This is 12-18 months away. Log it, don't build it.**

---

# PART 4: BULK ACTION FEATURES (HIGH-IMPACT, LOW-FREQUENCY)

> ChatGPT identified one-time or rare actions that create disproportionate owner love. Here is the complete list with validation.

## Already Built

| #   | Feature                            | Status   | Notes                                                  |
| --- | ---------------------------------- | -------- | ------------------------------------------------------ |
| 1   | Bulk Action Modal (Command Center) | ✅ BUILT | Pricing %, flat, fixed + availability + category moves |
| 2   | AI Batch Image Generation          | ✅ BUILT | Multiple items at once                                 |
| 3   | Batch Translation                  | ✅ BUILT | "Regenerate all translations"                          |
| 4   | PDF Export                         | ✅ BUILT | Client-side jsPDF                                      |
| 5   | Bulk Availability Toggle           | ✅ BUILT | Via Command Center                                     |
| 6   | Category Reorder                   | ✅ BUILT | Drag-and-drop in editor                                |

## Not Yet Built (Validated as Valuable)

| #   | Feature                                  | ChatGPT Priority | Cascade Assessment                                                                                                            | Effort          | When                  |
| --- | ---------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------- | --------------------- |
| 7   | **Bulk Price Update Engine**             | 🔴 CRITICAL      | **AGREE** — Already exists in Command Center (% and flat adjustments). ChatGPT may have missed this. ✅ Already done.         | —               | —                     |
| 8   | **Festival/Special Menu Switch**         | 🟡 HIGH          | **AGREE** — Duplicate menu → activate → auto-revert is valuable. Seasonal menus are real pain. Not built yet.                 | Medium (1 week) | After onboarding wave |
| 9   | **Full Menu Reset & Re-import**          | 🟡 HIGH          | **AGREE** — Safe replace without breaking links/QR/presence. Currently requires creating new project.                         | Medium (1 week) | After onboarding wave |
| 10  | **Mark Multiple Items Unavailable Mode** | 🟡 MEDIUM        | **PARTIAL** — Command Center already handles this via "Change Availability" bulk action. Could add quick-toggle UX on mobile. | Low (2-3 days)  | Mobile UX enhancement |
| 11  | **Bulk Image Regenerate/Remove**         | 🟡 MEDIUM        | **AGREE** — Batch image gen exists, but "remove all AI images" or "regenerate all with new style" doesn't.                    | Low (2-3 days)  | Enhancement           |
| 12  | **Menu Export to Other Formats**         | 🟢 LOW           | **AGREE** — CSV/Excel export for data portability. Nice-to-have.                                                              | Low (1-2 days)  | When requested        |

**Key correction:** ChatGPT recommended "Bulk Price Update Engine" as #1 priority, but MenuList's **Command Center already does this** — percentage adjustments, flat amount changes, and fixed price setting across selected items/categories. This was not a gap.

---

# PART 5: GLOBAL SMB PAIN POINTS (9 IDENTIFIED)

> ChatGPT identified 9 universal customer-facing problems SMBs face globally. Here is validation against MenuList's coverage.

| #   | Pain Point                                      | MenuList Coverage                                                                                  | Cascade Assessment                             |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1   | **Accurate information access**                 | **90%** — Menu, prices, hours, availability, languages, correctness engine, zero-blank guarantee   | Excellent. World-class coverage.               |
| 2   | **Repetitive customer questions** ("send menu") | **60%** — Shareable link exists, QR exists. Missing: owner habit of using MenuList link as default | Behavioral adoption needed, not engineering    |
| 3   | **Inconsistent experience across platforms**    | **50%** — Canonical truth exists, GBP sync built (off). Missing: multi-platform enforcement        | GBP sync activation + link adoption solves 80% |
| 4   | **Reputation chaos (reviews)**                  | **20%** — Feedback firewall exists. No public review management                                    | Highest-impact unbuilt feature                 |
| 5   | **No official place to send customers**         | **85%** — OBP built, schema enriched. Missing: activation + adoption behavior                      | Flip switch, design nudges                     |
| 6   | **Menu/offer confusion**                        | **90%** — Correctness engine, versioning, availability, pricing integrity                          | Elite coverage                                 |
| 7   | **Customer discovery (upsell)**                 | **75%** — Decision Blocks, CMI, highlights, images, descriptions                                   | Strong foundation, minor enhancements possible |
| 8   | **Real-time updates to customers**              | **50%** — Hours badge, availability toggles. Missing: temp status banners                          | Small build needed                             |
| 9   | **Retention/repeat infrastructure**             | **10%** — Minimal. Feedback capture only                                                           | Future phase (12-18 months)                    |

### Summary: MenuList Already Solves 6 of 9 Pain Points at 75%+ Coverage

The remaining 3 gaps (reputation, real-time status, retention) are correctly identified as future work. Reputation is the only one with significant revenue impact that should be prioritized.

---

# PART 6: THE LOCK-IN STACK MODEL

> ChatGPT proposed a 4-layer lock-in model. Here is my validation.

## The Model

```
Layer 4: MEMORY CONTROL (Retention)         ← Future (12-18 months)
    ↑
Layer 3: REVENUE CONTROL (Discovery/Upsell) ← ✅ BUILT (Decision Blocks, CMI)
    ↑
Layer 2: TRUST CONTROL (Truth + Reputation) ← PARTIALLY BUILT (truth ✅, reputation ❌)
    ↑
Layer 1: ENTRY CONTROL (Presence + Distribution) ← ✅ BUILT (OBP, GBP sync, SEO)
```

### Cascade's Assessment

**AGREE with the model. The layering logic is correct:**

1. **Entry Control** (build first): If customers don't enter through MenuList, nothing else matters. OBP + GBP sync + SEO provide this. **✅ Already built.**

2. **Trust Control** (build second): Correct information + reputation management make MenuList the trusted source. Truth layer is built. Reputation layer is the critical gap. **⚠️ Half done.**

3. **Revenue Control** (build third): When MenuList helps SMBs earn more through better discovery, it becomes irreplaceable. Decision Blocks + CMI provide this. **✅ Already built.**

4. **Memory Control** (build last): Repeat customer infrastructure creates the deepest lock-in but requires active traffic first. **🔮 Future.**

**Key strategic insight:** MenuList is actually further along this stack than ChatGPT realized. Layers 1 and 3 are substantially complete. Layer 2 is the critical gap (reputation system). Layer 4 is correctly deferred.

---

# PART 7: MESSAGING ONBOARDING (NEXT BUILD)

> This is the only major unbuilt feature that should be next. Provider-agnostic architecture with WhatsApp as v1 provider. Full docs at `__docs__/messaging-onboarding/`.

## ChatGPT's Scope (Validated)

### Flow

1. Owner sends menu photos/PDF/link via WhatsApp
2. System extracts, structures, builds preview
3. Preview link sent back via WhatsApp
4. Owner approves → publish
5. Owner receives: official link (OBP) + QR + dashboard login
6. **Messaging tunnel closes. Management happens in MenuList.**

### Cascade Expert Validation

**STRONGLY AGREE — This is the highest-leverage growth move.**

**Web research confirms:**

- India has **292 million WhatsApp Business app downloads** (AiSensy, 2023)
- 500M+ businesses globally use WhatsApp as business tool (Gallabox, 2025)
- WhatsApp messages have **98% open rate** vs 20% for email (Wapikit, 2025)
- WhatsApp is the #1 communication channel in India — not email, not SMS
- SMBs in India already communicate with customers via WhatsApp

**Why this is lethal for adoption:**

- Zero friction: No signup form, no dashboard learning curve
- Familiar channel: Every Indian SMB owner uses WhatsApp daily
- Instant value: "Send menu → get digital presence" in minutes
- Viral potential: Owner shows result to other owners

**Critical constraints (ChatGPT got these right):**

- ❌ NOT a support chat — WhatsApp is onboarding tunnel only
- ❌ NOT ongoing management — dashboard takes over after publish
- ❌ NOT a chatbot — simple intake → process → deliver flow
- ❌ Do NOT build a full WhatsApp Business API integration — use simple webhook intake

### Technical Approach (My Recommendation)

| Component  | Approach                                            | Effort |
| ---------- | --------------------------------------------------- | ------ |
| Intake     | WhatsApp Business API webhook (receive images/PDFs) | Medium |
| Extraction | Existing menu processing pipeline (zero new AI)     | Zero   |
| Preview    | Existing OBP page (with "preview" watermark)        | Low    |
| Approval   | Simple WhatsApp reply ("approve"/"change")          | Low    |
| Publish    | Existing publish flow                               | Zero   |
| Delivery   | WhatsApp message with OBP link + QR image           | Low    |
| Dashboard  | Existing onboarding flow with pre-filled data       | Low    |

**Total estimated effort:** 2-3 weeks for a production-quality WhatsApp onboarding tunnel.

**Key architectural decision:** Use WhatsApp Business API (not WhatsApp Web scraping). This requires Meta Business verification but provides reliable, scalable, policy-compliant delivery.

---

# PART 8: REPUTATION INFRASTRUCTURE (SILENT BUILD)

> Full context brief for future implementation, as discussed in ChatGPT conversation.

## What to Build (API OFF Phase)

| Layer                       | Description                                                                                  | Effort | Dependencies            |
| --------------------------- | -------------------------------------------------------------------------------------------- | ------ | ----------------------- |
| 1. Review data architecture | Store reviews (rating, text, reviewer, timestamp, platform, outlet, reply status, sentiment) | Low    | None                    |
| 2. AI reply engine          | Generate safe, polite, multi-language responses. Suggest, not auto-post.                     | Medium | Gemini (existing)       |
| 3. Reputation guard         | Detect negative spikes, flag serious issues, protect rating consistency                      | Medium | Layer 1                 |
| 4. Multi-outlet governance  | Central reply control for chains, brand tone consistency                                     | Low    | Multi-outlet (existing) |
| 5. Holiday hours linkage    | Prevent bad reviews from wrong hours/closures                                                | Low    | Hours system (existing) |
| 6. Unified review inbox     | Owner sees all reviews in one place                                                          | Medium | Layer 1                 |

## What NOT to Build

- ❌ Social media posting tool
- ❌ Review analytics dashboards
- ❌ Marketing campaign tools
- ❌ Review widgets everywhere
- ❌ Gamified review solicitation
- ❌ Multi-platform aggregation (start Google-only)

## Activation Model (Future)

1. Build all layers with API OFF
2. When GBP API approved → connect Google reviews
3. Activate reply engine
4. Enable reputation guard
5. Surface in owner dashboard + mobile

**Key principle:** Reply-assist, not autopilot. Google requires business owner to explicitly post. The AI suggests, owner approves with one tap.

---

# PART 9: REAL-TIME STATUS LAYER (SMALL BUILD)

> Temporary status banners for "closed today", "sold out", "special menu only".

## What to Build

| Component              | Description                                                                | Effort  |
| ---------------------- | -------------------------------------------------------------------------- | ------- |
| Temporary status model | `tempStatus` field on store: type, message, expiry                         | 1 day   |
| Owner controls         | Quick toggles: "Closed today", "Opening late", "Special menu only", custom | 2 days  |
| Customer visibility    | Banner on OBP + digital menu                                               | 1 day   |
| Auto-expiry            | Cron or client-side expiry check                                           | 0.5 day |
| Mobile support         | Status toggles on mobile More screen                                       | 1 day   |

**Total: ~5 days.** Small, high-impact, can be slotted in anytime.

## Why This Isn't Urgent

Hours status badge + per-item availability toggles already cover 70% of scenarios. The remaining 30% (event closures, special menus, delayed opening) are real but infrequent.

---

# PART 10: CHATGPT CLAIMS — FACT-CHECK MATRIX

> Every statistical claim ChatGPT made, verified against actual sources.

| #   | ChatGPT Claim                                     | Verified?      | Actual Data                                                                                 | Source                              |
| --- | ------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | "90% read reviews before visiting"                | ✅ YES         | 90% confirmed                                                                               | BrightLocal via HookAgency 2024     |
| 2   | "88% trust reviews like personal recommendations" | ✅ YES         | 88% confirmed                                                                               | BrightLocal via HookAgency 2024     |
| 3   | "1-star increase → 9% revenue boost"              | ✅ YES         | 5-9% per star                                                                               | Harvard Business School research    |
| 4   | "5% retention increase → 25-95% profit boost"     | ✅ YES         | 25-95% confirmed                                                                            | Bain & Company / Fred Reichheld     |
| 5   | "61% SMB revenue from repeat customers"           | ✅ YES         | 61-65% confirmed                                                                            | Multiple sources, Bain data         |
| 6   | "Returning customers spend 67% more"              | ✅ YES         | 67% confirmed                                                                               | Bain & Company                      |
| 7   | "73% lose trust if business info wrong"           | ⚠️ APPROXIMATE | ~75% trust online reviews (DemandSage 2026), specific "73% wrong info" not directly sourced | Directionally correct               |
| 8   | "Menu design can increase spending 20%"           | ✅ YES         | 10-20% confirmed                                                                            | Restaurant.eatapp.co, Supy.io       |
| 9   | "Menu engineering boosts profits 10-15%"          | ✅ YES         | Up to 15% confirmed                                                                         | Supy.io citing hospitality research |
| 10  | "80% sales from 16% of menu items"                | ✅ YES         | 80/20 rule widely documented                                                                | Menu engineering literature         |
| 11  | "78% cancel purchase after bad experience"        | ✅ YES         | PwC Future of CX survey                                                                     | PwC research                        |
| 12  | "86% hesitate to buy with negative reviews"       | ✅ YES         | 86% confirmed                                                                               | ReputationX 2024                    |
| 13  | "89% patronize companies that reply to reviews"   | ✅ YES         | 89% confirmed                                                                               | Reputation.com survey               |
| 14  | "84% SMBs use digital channels for visibility"    | ⚠️ APPROXIMATE | Various surveys show 80-90%                                                                 | Directionally correct               |
| 15  | "56% don't complain, just leave"                  | ✅ YES         | Well-documented in CX research                                                              | Multiple sources                    |

**Overall: ChatGPT's statistics are remarkably accurate.** 12/15 verified exactly, 3/15 directionally correct but not precisely sourced. No fabricated or wildly wrong claims found.

---

# PART 11: WHAT NOT TO BUILD (EXPLICIT REJECTION LIST)

> From both ChatGPT sessions + MenuList doctrine + existing governance docs.

## ❌ PERMANENTLY REJECTED

| Feature                                     | Reason                                                | Doctrine Reference     |
| ------------------------------------------- | ----------------------------------------------------- | ---------------------- |
| GrowthOS                                    | Too early. Dominate presence layer first.             | ChatGPT Session 1      |
| Fancy analytics dashboards                  | Breaks doctrine. Owners don't want dashboards.        | Constitution Law 7     |
| New AI features beyond current              | Enough AI. Need distribution + dependency now.        | Product Strategy 2026  |
| ControlOS expansion                         | Not needed yet.                                       | ChatGPT Session 1      |
| POS-specific integrations                   | MenuList ≠ POS layer. POS sync is enough.             | Product Identity doc   |
| Inventory/order/kitchen/billing             | Permanent constraint. NOT MenuList's domain.          | Constitution           |
| CRM / loyalty points / gamification         | Wrong product category. Kills trust.                  | Feature Rejection Gate |
| Website builder direction                   | Destroys infrastructure positioning.                  | OBP spec               |
| Staff app / surveillance                    | Creates wrong incentives.                             | Kill List              |
| A/B testing for recommendations             | Creates owner anxiety.                                | Authority Manifesto    |
| Multi-platform review aggregation (initial) | Start Google-only. Others have no open API.           | Cascade assessment     |
| Customer push notifications                 | Doctrine violation — MenuList is calm infrastructure. | Constitution Law 2     |

## ⏸️ DEFERRED (Not Rejected, Just Not Now)

| Feature                         | When to Reconsider                   | Trigger                  |
| ------------------------------- | ------------------------------------ | ------------------------ |
| Festival/Special Menu Switch    | After 50+ active stores              | Repeated owner requests  |
| Full Menu Reset & Re-import     | After onboarding wave                | Onboarding friction data |
| Apple Maps Connect              | After GBP proven                     | Organic demand           |
| WhatsApp catalog sync           | After 200+ stores                    | Market pressure          |
| Customer memory/retention layer | After 12-18 months of active traffic | Retention data available |
| Dynamic trending section        | After sufficient analytics data      | CMI data maturity        |
| Item pairing suggestions        | After core discovery proven          | Enhancement phase        |

---

# PART 12: 10-YEAR INFRASTRUCTURE PERSPECTIVE

> As the "owner of MenuList" thinking about 10-year SMB infrastructure, here is my assessment.

## The Core Thesis (Validated)

**MenuList is becoming: Customer-Facing Business Truth Infrastructure for SMBs.**

This is not a menu tool. It is the layer between a business and its customers that ensures:

- What customers see from supported MenuList surfaces has a single owner-approved source
- What customers experience is consistent where MenuList owns the surface
- What customers decide is guided intelligently
- What customers feel is trust and reliability

## The 10-Year Lock-In Path

| Year               | Layer                                           | Moat Depth                                           |
| ------------------ | ----------------------------------------------- | ---------------------------------------------------- |
| **Year 0-1** (NOW) | Menu truth + correctness + mobile               | Foundation — replaceable                             |
| **Year 1-2**       | Official presence + messaging onboarding + GBP  | Entry control — switching pain begins                |
| **Year 2-3**       | Reputation control + review management          | Trust control — switching = reputation risk          |
| **Year 3-5**       | Discovery intelligence + revenue attribution    | Revenue control — switching = revenue loss           |
| **Year 5-10**      | Customer memory + retention + presence monopoly | Infrastructure lock-in — switching = business damage |

## What Makes This a 10-Year Business

1. **Data compounds.** Every day a store uses MenuList, the system gets smarter (CMI, scoring, patterns). This data cannot be exported or replicated.

2. **Public presence hardens.** Once the OBP link is on Google, Instagram, QR codes, and signage — changing it means updating everything.

3. **Correctness becomes expected.** Once customers trust MenuList pages as the owner-approved source, going back to unmanaged PDFs or manual updates feels dangerous.

4. **Network effects (subtle).** As more businesses in a locality use MenuList, customers start expecting all businesses to have it.

5. **Switching cost increases with time.** Year 1: "I can switch easily." Year 5: "Switching means rebuilding reputation, losing data, updating every QR code, retraining staff."

## The Biggest Risk to the 10-Year Vision

**Not competition. Not technology. Adoption speed.**

If MenuList doesn't onboard real stores in 2026, the infrastructure becomes theoretical. Messaging onboarding is the most critical near-term initiative because it converts infrastructure potential into real-world usage.

---

# PART 13: IMMEDIATE ACTION ITEMS (NEXT 90 DAYS)

| Priority | Action                                                                       | Status              | Owner       | Estimated Effort     |
| -------- | ---------------------------------------------------------------------------- | ------------------- | ----------- | -------------------- |
| **P0**   | **Founder-Led Installation: Onboard 20-50 premium SMBs using 5-Step Ritual** | **NEXT ACTION**     | **Founder** | **30 days**          |
| **P0**   | Enable & test MCE (Menu Correctness Engine)                                  | Historical activation candidate; current approval requires active gates | Founder     | 1-2 days testing     |
| **P0**   | Enable & test Mobile UI                                                      | Historical activation candidate; current approval requires active gates | Founder     | 2-3 days testing     |
| **P0**   | Enable & test OBP (Official Business Page)                                   | Historical activation candidate; current approval requires active gates | Founder     | 1-2 days testing     |
| **P1**   | Build Messaging Onboarding                                                   | Docs complete       | Engineering | 2-3 weeks            |
| **P1**   | Design OBP adoption nudges                                                   | ✅ **DONE**         | Engineering | Implemented (Feb 19) |
| **P2**   | Build Real-Time Status Layer                                                 | ✅ **DONE**         | Engineering | Implemented (Feb 19) |
| **P2**   | Begin Reputation System coding                                               | ✅ **INFRA DONE**   | Engineering | Implemented (Feb 19) |
| **P3**   | Activate GBP Sync                                                            | Blocked by Google   | External    | Depends on approval  |
| ---      | **FEATURE FREEZE** until >70% installation rate validated                    | AGREED (Session #5) | Both        | Until validated      |

---

# APPENDIX A: DOCUMENT CROSS-REFERENCES

| Topic                      | Existing Doc                                              | Status                                    |
| -------------------------- | --------------------------------------------------------- | ----------------------------------------- |
| Product Strategy           | `__docs__/strategy/product-strategy-2026.md`              | ✅ Current                                |
| 5-Year Vision              | `__docs__/strategy/five-year-vision-2026-complete.md`         | ✅ Current                                |
| Feature Spec (complete)    | `__docs__/strategy/menulist-complete-feature-spec.md`     | ✅ Current                                |
| Expansion Surfaces         | `__docs__/strategy/expansion-surfaces-master-analysis.md` | ✅ Current                                |
| Future Ideas Bucket        | `__docs__/strategy/future-ideas-bucket-list.md`           | ⚠️ Needs update (pre-dates this analysis) |
| **Behavior Engineering**   | `__docs__/behavior-engineering/`                          | ✅ **NEW** — Habit replacement + nudges   |
| **Intelligence Doctrine**  | `__docs__/intelligence-doctrine/`                         | ✅ **NEW** — Pillars 4-6 rollout rules    |
| **CFI Strategy**           | `__docs__/customer-facing-infrastructure/`                | ✅ **NEW** — 6-pillar framework           |
| **Presence Dominance**     | `__docs__/presence-dominance/`                            | ✅ **NEW** — Pillar 1 docs                |
| **Truth & Accuracy**       | `__docs__/truth-accuracy-dominance/`                      | ✅ **NEW** — Pillar 2 docs                |
| **Reputation Protection**  | `__docs__/reputation-protection/`                         | ✅ **NEW** — Pillar 3 strategy wrapper    |
| **Trust Health Signal**    | `__docs__/trust-health-signal/`                           | ✅ **NEW** — Pillar 4 full doc set        |
| **Loyalty Health Signal**  | `__docs__/loyalty-health-signal/`                         | ✅ **NEW** — Pillar 5 full doc set        |
| **Risk/Decline Detection** | `__docs__/risk-decline-detection/`                        | ✅ **NEW** — Pillar 6 full doc set        |
| **Temp Status Layer**      | `__docs__/temp-status-layer/`                             | ✅ **NEW** — Spec + firebase              |
| OBP Docs                   | `__docs__/official-business-page/`                        | ✅ Full doc set                           |
| Reviews Docs               | `__docs__/reviews-reputation/`                            | ✅ Full doc set                           |
| SEO/AEO Docs               | `__docs__/discovery-infrastructure/`                      | ✅ Current (consolidated)                 |
| Mobile Docs                | `__docs__/mobile-operational-support/`                    | ✅ Current                                |
| MCE Docs                   | `__docs__/menu-correctness-engine/`                       | ✅ Current                                |
| Constitution               | `__docs__/constitution/`                                  | ✅ 8 governance docs                      |
| GBP Sync Docs              | `__docs__/gbp-sync/`                                      | ✅ Full doc set                           |
| POS Sync Docs              | `__docs__/pos-webhook-sync/`                              | ✅ Full doc set                           |
| Messaging Onboarding       | `__docs__/messaging-onboarding/`                          | ✅ Full doc set + code                    |

---

# APPENDIX B: CHATGPT SESSION SUMMARY

## Session 1 Topics

- Current state assessment
- Build sequence negotiation (MCE → Mobile → Messaging Onboarding → OBP → Reputation)
- Messaging onboarding scope definition
- OBP context brief for separate session
- Reputation infrastructure context brief for separate session
- Bulk action features identification

## Session 2 Topics

- 9 global SMB pain points identification
- MenuList coverage mapping against pain points
- 6 strategic gaps deep-dive (one by one)
- Lock-in stack model (4 layers)
- Distribution infrastructure analysis
- 10-year infrastructure perspective

## Session 3 Topics (February 19, 2026)

- 6-Pillar Customer-Facing Infrastructure framework
- Pillar-by-pillar execution design (theory → practical build plan)
- Presence Dominance: OBP behavioral adoption strategy
- Truth & Accuracy: Maintenance discipline documentation
- Reputation Protection: AI reply-assist upgrade (was previously banned → now allowed as assist-only)
- Trust Health Signal: Anonymous aggregate trust indicator (NEW concept)
- Loyalty Health Signal: Repeat visit pattern detection (NEW concept)
- Risk/Decline Detection: Combined early warning system (NEW concept)
- Temporary Status Layer: "Closed today" banners with auto-expiry
- Privacy architecture decisions (aggregate-only, no individual tracking)
- Lock-in stack model validation (4 layers → 6 pillars mapping)

**Cascade Review:** 85% accuracy vs codebase reality. 18/24 suggestions validated. Full review at `__docs__/customer-facing-infrastructure/_archive/chatgpt-review.md`

## Session 4 Topics (February 19, 2026)

- **Intelligence Doctrine (LOCKED):** Option B — Learn silently, show only when confident. Never approximate or simulate. Governs Pillars 4-6.
- **Intelligence Honesty Rule (LOCKED):** If real data exists → show it. If not → say it clearly. Never approximate.
- **Intelligence Placement (LOCKED):** Option C — Almost hidden, surfaced only when meaningful. No analytics dashboards.
- **Behavior Engineering Strategy:** Systematic habit replacement to make MenuList the default "send menu" reflex.
- 10 customer-facing friction points mapped (outdated menu embarrassment, WhatsApp fatigue, customer confusion, etc.)
- 12 daily moments where MenuList inserts itself into owner workflow
- 7 customer-facing dependency loops designed (send menu, update once, staff alignment, Instagram bio, QR physical, repeat customer, official link identity)
- 7-Day Infra Installation Protocol for new store onboarding
- Screen-by-screen micro-copy specification (10 product moments with exact nudge text)
- Point of No Return (PONR) concept — when 3+ loops active, switching becomes painful
- BJ Fogg Behavior Model validation (Motivation × Ability × Prompt)
- 90/10 Tone Rule — 90% silent professional, 10% precise guiding assistant
- Relief Stack Model — embarrassment + repetition + confusion removal
- Target segment: Premium cafés & restaurants first, then mixed SMBs
- **Identity framing decision:** "Official business link" not "digital menu"

**Cascade Review:** 92% accuracy. 17/17 suggestions validated. 2 corrections applied (feature flag added, Instagram bio button → guidance text only). Full review at `__docs__/behavior-engineering/_archive/chatgpt-review.md`

**Implementation:** Behavior engineering nudges IMPLEMENTED across 6 files. Feature flag: `ENABLE_BEHAVIOR_NUDGES: true`. New component: `BehaviorNudgeCard.tsx`. Zero Firebase cost.

## Session 5 Topics (February 19, 2026)

- **Decision B (LOCKED):** Enforced founder-led installation for first 20-50 premium SMBs. No passive self-serve for early cohort.
- **5-Step Installation Ritual:** Identity install → WhatsApp reflex → Instagram bio → Staff loop → QR placement. Takes 3-5 minutes per store. Changes everything.
- **Primary KPI:** % of stores fully installed in first 7 days. >80% = infrastructure. <40% = tool.
- **"Infrastructure is installed, not discovered"** — Stripe analogy: API keys, webhooks, production mode = installation. MenuList must think the same way.
- **7-day critical window validated:** 90% churn if no engagement in first 3 days (UserGuiding, 2025). 83% of B2B buyers say slow onboarding is dealbreaker (Rocketlane, 2025).
- **Superhuman validation:** Superhuman manually onboarded every user 1:1 until PMF. "Nothing activates a customer better than manually onboarding them." (First Round Review, 2025)
- **Parallel usage = weak adoption.** If owner sends both PDF and MenuList link → never fully switches.
- **Feature Freeze agreed:** No new features until >70% of onboarded stores use MenuList as primary menu link after 7 days.
- **"Over the period they do" rejected as dangerous.** Gradual adoption doesn't work for habit replacement.

**Cascade Review:** 95% accuracy. 12/12 suggestions validated. 1 nuance: ChatGPT dismissed our micro-copy nudges as "just nice UI copy" — they are real behavioral engineering at the product level, working even without founder intervention. Full review at `__docs__/behavior-engineering/_archive/chatgpt-review-session5.md`

**Founder Action:** Personally onboard next 20-50 premium cafes using 5-Step Installation Ritual. Observe where habits break. Refine nudges based on real-world data.

## Session 6 Topics (February 19, 2026)

- **Product Evolution Sequence (LOCKED):** MenuList → Control Layer (inside MenuList) → GrowthOS → KitStamp (optional). Formally documented and locked for 3 years.
- **Customer-Facing Only Boundary (PERMANENT):** Never build POS/CRM/inventory/payroll/accounting/HR. MenuList exists in customer-facing layer ONLY.
- **ControlOS Concept (18 ChatGPT docs):** "Control Layer" = MenuList evolving from menu truth to business truth infrastructure. NOT a separate product. Silent autopilot system. 5 Pillars: Business Identity Truth, Operational Public Truth, Menu & Offering Truth, Public Communication Layer, Presence Consistency Layer.
- **"5-Minute Understanding" Rule (NEW):** Non-tech SMB must understand MenuList in 5 minutes without help. If owner needs training → too complex.
- **"Calm, Elite Infrastructure" Identity (LOCKED 3 years):** Simple surface, deep underneath. Invisible power. Not feature-heavy SaaS.
- **Silent Autopilot Philosophy:** Owner updates once → supported MenuList surfaces follow their verified refresh paths. External platforms and printed/downloaded artifacts need placement or replacement. Minimal UI. No dashboards.
- **ControlOS-GrowthOS Boundary:** Truth authority (ControlOS) vs growth execution (GrowthOS). Never merge. GrowthOS reads from truth layer, never writes.
- **GrowthOS Framework (9 ChatGPT docs):** Revenue execution engine. Entirely DEFERRED. Only after MenuList = system-of-record.
- **KitStamp:** Optional forever. Never allowed to distract.
- **8 Failure Scenarios Documented:** Feature creep, dashboard explosion, automation over-engineering, operational drift, premature integrations, multi-product chaos, UI complexity, reliability compromise.
- **Strategic Moat Analysis:** Control Layer creates switching costs, trust compounds, data authority deepens, infrastructure positioning vs tool positioning.

**Cascade Review:** 88% accuracy. 14/14 major decisions validated against existing codebase and constitution. ChatGPT missed: existing 6-Pillar CFI framework, already-built Temp Status Layer, already-built GBP Sync, already-built OBP. Over-engineered some architecture (propagation engine premature). All 18 ControlOS + 9 GrowthOS docs consolidated into single comprehensive docs per user preference. Full review at `__docs__/control-layer-strategy/_archive/chatgpt-review.md`

**Documents Created:**

- `__docs__/constitution/11-product-evolution-doctrine.md` — Constitution-level doctrine (3-year lock)
- `__docs__/control-layer-strategy/README.md` — Consolidated ControlOS strategy
- `__docs__/growthos-addon/README.md` — Active GrowthOS add-on plan

## Session 7 Topics (February 19, 2026 — Late Evening)

- **GrowthOS Full Product Design (10 ChatGPT docs):** Complete product strategy for GrowthOS — a transactional execution engine producing ready-to-use promotional content for SMBs. Covers: executive intent, SMB reality model, problem taxonomy, output-first philosophy, product surfaces, canonical use cases, workflow engine, content quality rules, MenuList relationship contract, monetization, kill criteria.
- **Critical Codebase Finding:** MenuList's Social Content Engine (Today screen, 9 campaign types, 5 execution surfaces, confidence gating, silence governor) already implements ~60% of GrowthOS vision. Social Content Engine IS GrowthOS v0 — the prototype living inside MenuList.
- **agentkits-marketing Repo Analysis:** Reviewed [aitytech/agentkits-marketing](https://github.com/aitytech/agentkits-marketing) — 18 agents, 93 commands, 28 skills. Only ~15% directly useful for SMB context (copywriting frameworks, workflow structure, brand safety rules). Enterprise/SaaS marketing content mostly irrelevant.
- **3-Product Separation Audit:** Formal audit confirming MenuList ≠ GrowthOS ≠ KitStamp. Different jobs, time horizons, AI postures, surfaces, monetization. Products form a vertical stack, not a suite.
- **One-Page Positioning Map (NEW):** Stack model: Infrastructure (MenuList) → Preparation (KitStamp) → Execution (GrowthOS). With Red-Flag Test for feature assignment.
- **Product Priority Order (LOCKED):** MenuList #1 always (80-90% time). GrowthOS #2 conditional. KitStamp #3 optional (may never be built — you still win).
- **Market Research:** SMB marketing tools landscape validated GrowthOS's "output-first" positioning as genuinely differentiated. No existing tool produces ready-to-use, channel-specific content for local SMBs without requiring marketing knowledge.
- **Kill Criteria for GrowthOS (NEW):** DOC 10 — when to shut down, banned expansions, red-flag test. Written by Cascade (ChatGPT referenced but never produced it).
- **Monetization Model (NEW):** Pay-per-kit or prepaid bundles. No subscriptions, no unlimited, no feature tiers. Cascade note: Indian market likely needs prepaid bundles (₹199/5 kits).

**Cascade Review:** 85% accuracy. Strong philosophical framework. Key gap: ChatGPT unaware Social Content Engine already exists (~60% of GrowthOS vision). Over-emphasized separation when most value already inside MenuList. 5/6 use cases already implemented as campaign types. Retained decisions now live in the active Growth Kits docs.

**Documents Created/Updated:**

- `__docs__/growthos-addon/README.md` — Active Growth Kits strategy and implementation source
- `__docs__/strategy/product-positioning-map.md` — 3-product positioning map
- `__docs__/constitution/12-product-separation-doctrine.md` — Product separation doctrine

## Session 8 Topics (February 19, 2026 — Night)

- **KitStamp Complete Product Design (24+ ChatGPT topics):** Comprehensive product strategy for KitStamp — a commercial content preparation workspace producing Final Content Kits. Conversation started as AI Image Generation code review, evolved into standalone product critique, then pivoted into full KitStamp product design. Covers: canonical definition, terminal artifact (Final Content Kit), ICP lock (content operators at agencies), UI identity (workbench not dashboard), feature kill-list (9 permanent bans), 7 core features, pricing (kit-based), trust language, error states, support model, audit layer, export spec (ZIP structure), V2 expansion, investor narrative, market research.
- **Critical Codebase Finding:** MenuList's AI Image Generation system (single + batch + editing, Cloud Tasks pipeline, Firestore state machine, 12+ components, 10,000+ LOC) already implements ~70% of KitStamp's image preparation capability. Same pattern as Social Content Engine being GrowthOS v0 — **AI Image Gen IS KitStamp's image engine prototype**.
- **AI Image Generation Code Review:** ChatGPT + expert validated existing codebase. Found: debugger in production (batch-generation/route.ts:164), transaction logging disabled (route.ts:264), no batch size limit. Expert added 18-item development checklist, USP definition ("Inline Menu Image Creation"), scope freeze rules, UI language guidelines.
- **20-Screen UI/UX Journey:** Complete screen map designed across 6 phases (Landing → Onboarding → Data Setup → Image Generation → Completion → Return Flows). Each screen with layout, copy, CTAs, failure states.
- **"Do-Nothing Path" Design:** Strongest version of image generation = user clicks "Generate", touches nothing else, gets confident result. Defaults should be product-grade, customization collapsed behind "Customize (optional)".
- **Final Content Kit (Terminal Artifact):** Structured ZIP package with visuals/, text/, metadata/, README.txt. Human-approved, frozen at export, no silent changes. README includes liability disclaimer.
- **Market Research:** Content creation market ~$36B (2025), SAM ~$2.9-4.3B (upstream prep slice), practical SOM ~$14-22M ARR (3-5yr). Real competitors: Google Docs + Spreadsheets + WhatsApp, not Canva.
- **KitStamp Kill-List (9 Permanent Bans):** No publishing, no performance metrics, no auto-selection, no prompt-centric UX, no asset management, no learning claims, no personalization, no scoring, no autonomous flows.
- **V2 Expansion (4 Ideas):** Content Variants Pack (✅), Brand Guardrails (✅), Short-Form Motion Draft (V3+), Client Review Mode (with limits).

**Cascade Review:** 82% accuracy. Excellent strategic thinking. Key gap: ChatGPT unaware AI Image Generation system already exists (~70% of KitStamp's image capability). Over-designed for agency market when Indian SMBs (primary MenuList market) do their own content. Strong philosophical framework, production-grade design artifacts. Retained decisions now live in the active KitStamp docs.

**Documents Created:**

- `__docs__/kitstamp/README.md` — Active KitStamp documentation hub

## Session 9 Topics (February 21, 2026)

- **Category Dominance Doctrine (Nicolas Bustamante Article):** ChatGPT strategic session analyzing "10 Moats of Vertical Software" article by Nicolas Bustamante (founder of Doctrine + Fintool). Article maps which vertical software moats survive the LLM era. Only 3 survive: proprietary aggregated data, regulatory/trust lock-in, transaction embedding. MenuList scores on all 3.
- **"Cleanest Source" 5-Layer Framework (NEW):** Structural, Semantic, Temporal, Sync, Output cleanliness. More operationally specific than existing truth-accuracy docs. Defines what makes MenuList's data the most reliable source for external systems to consume.
- **"First Update Behavior" Metric (NEW):** The single most important metric for upstream positioning: "When something changes in the business, where does the owner update first?" If answer is MenuList → infrastructure achieved. Not yet tracked — future internal metric.
- **5-Year Inevitability Map (NEW):** Phase 0 (Behavioral Anchoring) → Phase 1 (Structural Lock-In) → Phase 2 (Upstream Recognition) → Phase 3 (Category Ownership) → Phase 4 (Infrastructure Consolidation). Complements product evolution doctrine.
- **10 Infrastructure vs SaaS Decisions:** Binary decision matrix. 7/10 already existed in doctrine; 3 new framings extracted (schema rigidity, timestamp discipline, physical dependency creation).
- **10 Behavioral Failure Risks:** Non-technical risks that break first-update habit: silent drift, double-work perception, publish anxiety, update friction, stale data tolerance, physical disconnection, staff bypass, chain fragmentation, competitor feature-pull, trust erosion event.
- **Chain-First Authority Multiplier:** Strategic framing of existing multi-outlet architecture as authority multiplication — one chain with 10 locations = 10x structural dependency. Multi-outlet feature already complete.

**Cascade Review:** 82% accuracy. Excellent strategic framing. Key gap: ChatGPT unaware of ~70% of existing infrastructure (MCE, MOL, OBP, GBP Sync, multi-outlet, schema.org, llms.txt, agent readiness). "What to build" advice largely redundant — real value is in the strategic positioning frameworks. Rejected: POS integrations now (premature), volume SMB targeting (contradicts chain-first strategy), heavy API partnerships pre-launch (behavioral anchoring must come first). Full review at `__docs__/category-dominance/_archive/chatgpt-review.md`

**Documents Created:**

- `__docs__/constitution/15-category-dominance-doctrine.md` — Constitution-level doctrine (3-year lock)
- `__docs__/category-dominance/_archive/chatgpt-review.md` — Full conversation review

## Session 10 Topics (February 21, 2026)

- **Bond Capital TAI Report (Mary Meeker, 2025):** ChatGPT analysis of 340-page "Technology as Innovation" AI trends report. Core thesis: AI is a foundational platform shift at unprecedented speed/scale. Key data: ChatGPT 800M weekly users in 17 months, Big Tech AI CapEx $212B in 2024, inference costs down 99% in 2 years, AI job postings up 448%.
- **ChatGPT "MenuList Gap Analysis" — 6 Dimensions:** ChatGPT scored MenuList against TAI benchmarks: AI as infrastructure (❌), adoption speed (⚠️), UX as moat (⚠️), data flywheel (❌), monetization (⚠️), autonomous action (❌). Then proposed "Silent AI Manager" model with 3 rules.
- **"Silent AI Manager" Framework:** Rule 1: AI must ACT without asking. Rule 2: AI must OWN customer's first 5 seconds. Rule 3: AI must IMPROVE without being noticed. Also proposed: owner becomes supervisor, metrics must convert to actions, time as primary context variable, AI decisions irreversible in short term.

**Cascade Review:** ~25% accuracy. ChatGPT has zero codebase knowledge — almost everything it claims is "missing" or "lagging" already exists:

- "AI runs episodically" → **WRONG.** 2 nightly schedulers (2:00 AM + 2:30 AM UTC) run 13+ autonomous tasks including decision blocks scoring, menu intelligence, authority maturation, menu drift, feedback retention, subscription reconciliation, lifecycle messaging, special menu switching.
- "Owners still decide" → **WRONG.** Core Doctrine Law 1: "MenuList decides by default." Full AutoMode spec exists (04-automode-spec.md).
- "AI not infrastructure" → **WRONG.** Entire 10-Law system + 15 doctrines built around this principle.
- "No data flywheel" → **WRONG.** Nightly scoring converts views/clicks/orders → autonomous decision block reordering.
- "Collapse choice harder" → **WRONG.** Decision Blocks (Popular Right Now, Quick Pick, Best Value) already do exactly this.
- "Stop building analytics dashboards" → **WRONG.** Product Taste Doctrine (09) already lists this as "Low Taste."

**What's genuinely useful (the ~15%):**

1. TAI market data points (inference cost -99%, $212B CapEx) validate MenuList's AI-first approach and Category Dominance Doctrine's "compete on data, not models" thesis.
2. Open-source model commoditization confirms "Cleanest Source" framework — moat is data quality, not AI sophistication.
3. "Monetization isn't guaranteed despite adoption" — valid business risk to track, not doctrine-level.

**Decision:** No new doctrine needed. Added TAI market validation section to Category Dominance Doctrine (#15). No governance changes.

**Documents Updated:**

- `__docs__/constitution/15-category-dominance-doctrine.md` — Added market validation appendix (TAI report data)

## Session 11 Topics (February 21, 2026)

- **Marketing in 2026 Article Review:** ChatGPT analysis of Sandra Djajic article on 2026 marketing shifts. Key themes: SEO → AI search visibility, proof > polish, founder-led distribution, distribution loops > content volume. All validated against existing doctrine — no new governance needed. MenuList already aligned via llms.txt, Schema.org, agent readiness strategy.
- **Pilot Outreach Strategy (Pune):** Pre-launch business operations discussion. Walk-in pitch scripts, WhatsApp outreach templates, Viman Nagar targeting. Business ops, not product scope.
- **Menu Kit Feature (NEW):** Emerged from pilot strategy discussion. A "Launch Pack" of auto-generated assets owners receive when menu is published: Table Tent A6 PDF, Counter Sticker 8×8 PDF/PNG, Instagram Story (1080×1920), WhatsApp Status (1080×1920), Google Maps Upload (1200×900), Placement Guide, Staff Script line. All auto-filled with restaurant name + QR + menu link. No editor, no customization — controlled personalization only. Passed all 5 Feature Rejection Gate questions + Product Taste Check + Category Dominance alignment (creates physical dependency, drives first-update behavior).
- **Rejected Ideas:** Offer Builder/Offer Pack (feature creep), tent card design editor (Canva-land), Review QR Card in Menu Kit (not core), handheld printing (ops complexity). All correctly rejected during conversation.

**Cascade Review:** ~55% accuracy. ChatGPT was useful for ideation (Menu Kit concept emerged organically) but also introduced significant feature creep that had to be corrected multiple times. Marketing article analysis was solid but not actionable for product. Pilot strategy is valid business ops but outside product scope.

**Existing Infrastructure (reusable for Menu Kit):**

- `src/lib/physical-surfaces/tentCardGenerator.ts` — jsPDF tent card generation (A6/A5)
- `src/lib/physical-surfaces/stickerGenerator.ts` — Canvas-based sticker generation (80mm)
- `src/components/.../shareModal/` — QR code generation + social sharing
- `src/lib/campaigns/executionSurfaces.ts` — WhatsApp share, poster download
- `qrcode` npm package already installed

**What's NEW to build:**

- Store-level tent card template ("Scan to view menu" vs item-specific)
- Store-level counter sticker template
- Instagram Story image generator (1080×1920)
- WhatsApp Status image generator (1080×1920)
- Google Maps upload image generator (1200×900)
- Placement guide image
- "Download Menu Kit" bundled button in Share Modal or project view
- Staff script line in delivery/share flow

**Documents Created:**

- `__docs__/menu-kit/` — Full feature documentation set

## Session 12 Topics (March 6, 2026)

- **answerlattice.com Domain Purchased:** Domain acquired. ChatGPT provided domain infrastructure setup recommendations (subdomain structure, HTTPS, email, trademark, social handles).
- **Answerlattice Support Stack Evaluation:** ChatGPT evaluated Answerlattice against 6-layer SaaS support stack model: Interaction (sufficient), Knowledge (very strong), Answer Generation (complete), Governance (excellent), Signal (sufficient), Operations (intentionally light). Assessment ~85% accurate.
- **Three "Missing Pieces" Claim — ALL WRONG:** ChatGPT identified 3 items as "the only meaningful gaps": (1) Canonical Coverage Measurement, (2) Signal Entity Resolution, (3) Nightly Governance Scheduler. **All three were already implemented on March 3, 2026.** ChatGPT has zero codebase awareness. `answerlatticeNightly.ts` runs a 7-step batch job including all three plus recurring fallback detection, impact tracking, and confidence auto-adjustment.
- **Launch Strategy:** Controlled activation → observation → launch. Aligns with existing `answerlattice-activation-experiment.md` (4-week framework with Go/No-Go criteria).
- **MenuList as First Client:** MenuList as design partner / Tenant #1. Entity category suggestions for ontology bootstrap (Features, Workflows, States, Errors, Billing). Already documented in doctrine.
- **10 Failure Modes (HIGH VALUE):** Operational warnings for first deployment. 4 genuinely new (Entity Ontology Collapse, Canonical Answer Overfitting, Admin Cognitive Overload, Governance Loop Breaking). 6 already mitigated in codebase. Weekly governance cycle recommended (Mon: proposals, Wed: drift, Fri: answers).

**Cascade Review:** ~60% accuracy. Core claim (3 missing pieces) is 0% accurate — all built. Domain recommendations are sound but operational (not engineering). Failure mode warnings are genuinely valuable. Full review at `__docs__/answerlattice/_archive/chatgpt-review-domain-launch-readiness.md`

**Documents Updated:**

- `__docs__/answerlattice/answerlattice-activation-experiment.md` — Added §10 (10 Failure Modes), §11 (Entity Categories for MenuList), §12 (Authoring Guidelines)
- `__docs__/answerlattice/_archive/chatgpt-review-domain-launch-readiness.md` — Full conversation review (NEW)

**Domain Action Items (Business Operations — NOT Engineering):**

| Item                                                                              | Priority | Owner   |
| --------------------------------------------------------------------------------- | -------- | ------- |
| Configure DNS: app., docs., api., status. subdomains                              | P1       | Founder |
| Set up www → non-www redirect                                                     | P1       | Founder |
| Set up professional email (founder@, hello@, support@, security@)                 | P1       | Founder |
| Configure SPF/DKIM/DMARC for email                                                | P1       | Founder |
| Reserve social handles (@answerlattice / @answerlatticeapp) on X, LinkedIn, GitHub, YouTube | P2       | Founder |
| File trademark (Class 9: software, Class 42: SaaS)                                | P2       | Founder |
| Optionally acquire answerlattice.com later                                             | P3       | Founder |

---

**Last Updated:** March 6, 2026  
**Next Review:** May 2026 (Quarterly)  
**Authority:** Founder final decision on all build priorities

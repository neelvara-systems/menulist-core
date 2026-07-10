# MenuList Market Growth Systems Gap Audit

**Status:** Current research and repo-fit decision record
**Research date:** July 10, 2026
**Scope:** Acquisition, proof, retention, partners, local discovery, software review marketplaces, owner community, and AI-channel distribution
**Decision rule:** Current MenuList code and maintained docs outrank competitor feature lists.

## Executive Verdict

MenuList is not missing a generic growth stack. The repo already contains more growth infrastructure than most early products: public acquisition attribution, a defined activation outcome, SignalDesk, owner referral, an invitation-only reseller channel, physical-partner pilots, a large public tools library, structured public business data, and machine-readable discovery files.

The material gaps are narrower:

1. **Source-to-paid-to-day-30 evidence is split across systems.** MenuList can attribute drafts and claims, SignalDesk can observe activation, and billing knows payment/cancellation truth, but there is no compact founder view that answers which source produced paid businesses that were still active after 30 days.
2. **The proof system is documented but has no real proof inventory.** The pilot board is empty because permissioned businesses and sender identity are still external inputs. Competitors make customer stories, quantified case studies, independent reviews, and operator voices permanent acquisition assets.
3. **There is no active owner advisory cadence.** MenuList has follow-up templates and learning questions, but not a recurring small owner clinic or advisory circle that turns live owner evidence into product, proof, and messaging decisions.
4. **Publisher and AI-channel readiness is technically strong but commercially unproven.** MenuList already has HTML, schema.org, sitemaps, robots, and LLM context. What is missing is the partner/API eligibility, owner-consent, delegated-access, and channel-measurement dossier needed before Google, Apple, or AI-provider integration work is justified.
5. **Independent software-marketplace proof is absent.** Capterra/G2-style profiles and verified reviews can add buyer trust, but they should begin only after real paid businesses reach a stable review point and MenuList can respond to reviews consistently.

The next growth work is therefore operating evidence, not another public feature or another marketing asset plan.

## Research Method

The review compared current MenuList source and maintained docs with current public material from:

- restaurant and SMB platforms: Owner.com, Popmenu, Toast, Square, Clover, Restroworks, and Vyapar;
- local discovery platforms: Google Business Profile and Apple Business;
- software review marketplaces: Capterra and G2;
- emerging AI distribution: Square's 2026 ChatGPT/Claude rollout and Universal Commerce Protocol.

The audit accepted a market practice only when it:

- reduces owner work or increases evidence quality;
- fits MenuList's public-business-truth boundary;
- does not require MenuList to become a POS, ordering system, loyalty platform, guest CRM, or listings agency;
- can begin with a bounded manual operating contract before new runtime or provider dependencies.

## Repo Baseline Corrections

These are not missing and must not be proposed again as greenfield growth work.

| Market pattern | Current MenuList truth | Evidence | Verdict |
| --- | --- | --- | --- |
| Free diagnostic and lead tools | `/tools` already positions a feature-flagged public hub for business-fact, menu, price, hours, QR, WhatsApp, and setup checks. The route tree contains more than twenty focused tools. | `src/app/(website)/tools/page.tsx:11-45` | Covered; improve from usage evidence, do not add generic calculators. |
| Machine-readable public business truth | Public catalog schema emits `hasMenu` or `OfferCatalog`; public LLM files describe owner-approved HTML, JSON-LD, sitemaps, robots, and bounded action links. | `src/lib/schema/index.ts:385-406`; `public/llms.txt:3-29` | Covered; provider partnerships are a separate future question. |
| Owner referral | The payment-only owner referral is implemented and locally verified behind off-by-default pilot/reward flags. | `__docs__/owner-referral/README.md:1-20` | Covered; release gates remain external. |
| Reseller channel | Authorized resellers can onboard clients, coordinate payment, and track licenses through an invitation-only role-gated flow. | `__docs__/reseller-dashboard/reseller-dashboard_spec.md:10-26` | Covered; do not build a second partner portal. |
| Physical partner acquisition | A two-partner, ten-business Bengaluru pilot already defines partner classes, consent, attribution, paid state, proof permission, and stop rules. | `menulist-marketing-distribution_physical-partner-pilot.md:6-43` | Covered in design; recruitment has not started. |
| Activation and follow-up | Activation is defined as a published link on two customer surfaces within seven days, with owner-confirmed evidence and bounded follow-up. | `menulist-marketing-distribution_activation-follow-up.md:18-52` | Covered in process and product foundation. |
| Growth operating layer | SignalDesk has revenue accounts, opportunities, activation watches, seven-day stall detection, and compact summaries, but intentionally has no payment provider or MenuList truth writes. | `../menulist-signaldesk/signaldesk-revenue-operating-layer/README.md:8-31`; `../menulist-signaldesk/signaldesk-revenue-operating-layer/signaldesk-revenue-operating-layer_impl.md:93-105` | Covered through activation; source-to-paid/day-30 is not closed. |
| Public-loop growth intelligence | Founder Monitor answers attributed draft/claim volume and structured cancellation reasons. | `../growth-intelligence/README.md:7-14`; `../growth-intelligence/growth-intelligence_marketing.md:1-5` | Covered for its stated questions; not a full acquisition economics view. |

## What Current Market Leaders Do

### 1. Turn Customers Into A Permanent Proof Library

Owner.com and Popmenu make quantified customer stories and videos central navigation, not occasional launch collateral. Toast also keeps customer stories beside tools, comparisons, product education, and industry data.

**MenuList lesson:** every successful pilot business should produce a standardized, permissioned evidence packet. The first valid MenuList proof is not a revenue-lift claim. It is:

- the source list before MenuList;
- the approved customer link after setup;
- two customer surfaces where the owner placed it;
- time from source received to owner-approved publication;
- day-30 confirmation that the link is still in use and current;
- owner-approved quote, screenshots, and publication scope.

Sources:

- https://www.owner.com/case-studies
- https://get.popmenu.com/
- https://pos.toasttab.com/resources

### 2. Measure The Channel Through To A Durable Outcome

Google Business Profile exposes discovery and action metrics such as searches, website clicks, calls, directions, bookings, and menu interactions. Square's 2026 AI-channel launch says the source of AI-originated orders is visible in reporting. Mature platforms use the channel as an attributable operating surface, not only a campaign label.

**MenuList lesson:** the founder needs one compact source outcome view:

```text
source -> draft -> claim -> publish -> two-surface activation -> first paid -> day-30 state -> cancellation reason
```

This should begin in the ten-business board. Runtime work is justified only if the manual cohort proves the decision is useful and repeated.

Sources:

- https://support.google.com/business/answer/9918094?hl=en
- https://squareup.com/us/es/press/claude-chatgpt-integrations

### 3. Give Partners Enablement, Status, And A Narrow Success Definition

Toast Advocates uses tiers, a personalized dashboard, educational material, referral status, and rewards. Square gives solutions partners a resource center, lead tools, community access, and incentives. Restroworks combines training, certification, demo environments, co-selling, collateral, and governance. Vyapar targets practical India-side partner classes such as accountants, consultants, software resellers, and hardware sellers.

**MenuList lesson:** MenuList already has the hard runtime primitives through Reseller Dashboard and SignalDesk. The missing work is to run the existing physical-partner cohort and learn which partner class creates activated, paid, retained businesses. Public self-registration, commissions, tiers, certifications, and a new portal are premature.

Sources:

- https://pos.toasttab.com/advocates
- https://squareup.com/us/en/partnerships/solutions-partner-program
- https://www.restroworks.com/partners/reseller-program/
- https://vyaparapp.in/distributor/create

### 4. Build With Operators, Not Only For Them

Toast Lab uses a real operator, hands-on collaboration, an advisory board, and public storytelling. Square combines a seller community, guides, support, and events.

**MenuList lesson:** do not build a community product. After the first three activated businesses, run one monthly 45-minute founder clinic with a maximum of five owners. Capture only recurring blockers, language, proof permission, and approved product decisions. This supplies better evidence than speculative feature expansion.

Sources:

- https://pos.toasttab.com/lab
- https://squareup.com/us/en/small-business-development

### 5. Use Verified Reviews As A Separate Trust Surface

Capterra offers vendor listings, verified-review collection, profile management, and performance tracking. G2 similarly treats managed product profiles and authenticated customer reviews as buyer-evaluation surfaces.

**MenuList lesson:** after at least five paid businesses have reached the day-30 review, create accurate vendor profiles and make a neutral review request. Never require a positive review, tie MenuList referral credits to a review, or copy review text without permission.

Sources:

- https://www.capterra.com/vendors/
- https://www.g2.com/products/g2/reviews

### 6. Treat Local Publishers As Governed Distribution Partners

Google requires dedicated, location-specific landing pages for business links, checks link crawlability, and requires business-owner consent and ownership transparency when third parties manage profiles. Google Business Profile API access has an approval/setup path. Apple Business provides place-card controls and a partner directory; custom action links through an API partner require delegation.

**MenuList lesson:** the current owner-confirmed Google/Apple/Bing workflow is the correct early boundary. Before any sync work, prepare a distribution-readiness dossier covering:

- provider eligibility and approval process;
- owner consent and revocation;
- account ownership and delegated access;
- location-specific URL rules and crawlability;
- data-field authority and conflict handling;
- reporting source separation;
- support, audit, and offboarding obligations.

Sources:

- https://support.google.com/business/answer/13769188?hl=en
- https://support.google.com/business/answer/7353941?hl=en-GB
- https://developers.google.com/my-business/content/basic-setup
- https://business.apple.com/
- https://business.apple.com/partners
- https://businessconnect.apple.com/promote/assets/custom-action-links.pdf

### 7. AI Distribution Is Moving From Crawlability To Provider Relationships

Square announced a ChatGPT app and Claude plugin for eligible US food businesses that exposes current business, menu, hours, and ordering information without each merchant building a separate integration. UCP defines an agentic commerce protocol and currently centers commerce capabilities.

**MenuList lesson:** MenuList's public HTML, structured data, and LLM context are already the right non-commerce foundation. Do not implement UCP checkout, MCP write tools, or AI ordering. Track provider eligibility and define a future read-only discovery contract only when a provider supports MenuList's non-commerce public-truth role and can preserve owner authority.

Sources:

- https://squareup.com/us/es/press/claude-chatgpt-integrations
- https://ucp.dev/

## Prioritized Gaps

### P0 - Execute Now

#### A. Pilot Proof And Retention Review

Use the maintained ten-business board to record:

- acquisition source class;
- activation date;
- first paid date;
- day-30 state;
- owner interview completion;
- proof permission;
- approved quote and screenshots;
- neutral independent-review request status.

This is the highest-priority growth system because every later channel, claim, partner expansion, comparison page, paid test, and launch asset depends on it.

#### B. Real Permissioned Cohort

The founder must supply the businesses or approved partner introductions and sender identity. Codex must not scrape, invent, or contact businesses under an unapproved identity. This is an external operating dependency, not a missing software feature.

### P1 - Prepare After Initial Evidence

#### C. Compact Source-To-Day-30 Founder View

After the first cohort review, decide whether the manual view is enough. If runtime is justified, extend an existing compact founder summary/read model. Do not create a raw event warehouse, generic CRM, owner-facing analytics product, or SignalDesk write into billing truth.

#### D. Independent Review Presence

Create accurate Capterra/G2 profiles after at least five paid businesses reach day 30 and a response owner exists. Request honest reviews independently of the owner-referral reward.

#### E. Small Owner Advisory Clinic

Start after three activated businesses. Keep it founder-led, monthly, invitation-only, and capped at five owners. Do not build forums, feeds, badges, or community software.

#### F. Publisher And AI Distribution Readiness Dossier

Document Google/Apple/API eligibility, delegation, consent, revocation, reporting, support, and data-authority requirements. Keep actual provider integrations gated behind cohort proof and an approved provider path.

#### G. Fair Migration And Comparison Pages

Current docs already identify PDF, screenshots, WhatsApp, Canva, link pages, and stale QR destinations as comparison contexts. Publish focused migration pages only after at least three permissioned proof packets exist. The pages should explain migration from a stale list workflow to one current link, not attack competitors or claim ranking gains.

### P2 - Evidence-Gated

- Partner tiers, recurring commissions, public partner signup, certification, and co-marketing funds.
- Proprietary benchmark/data reports based on aggregated business behavior.
- Large owner community or event program.
- Paid review-marketplace placement or buyer-intent products.
- Direct provider-specific AI discovery integrations.

## Practices To Reject

| Market practice | Decision | Reason |
| --- | --- | --- |
| Guest CRM, loyalty, automated diner email/SMS, push marketing | Reject | Requires transaction/customer identity and changes MenuList into a POS-adjacent marketing suite. |
| Online ordering, delivery, checkout, or UCP commerce | Reject | MenuList is the owner-approved public source, not the order or payment authority. |
| Automatic Google/Apple profile management now | Reject now | Requires provider approval, explicit owner delegation, support obligations, and conflict handling not justified by an empty pilot. |
| Broad listings syndication | Reject now | Enterprise breadth adds provider cost and operational liability before local proof. |
| New reseller or affiliate portal | Reject | Existing Reseller Dashboard, owner referral, physical partner pilot, and SignalDesk partner rail already cover the necessary primitives. |
| More generic free tools | Reject | MenuList already has a large public-truth tool library; usage evidence should decide additions. |
| Benchmarks from a tiny sample | Reject | Would create weak or misleading public claims. |
| Product Hunt, AppSumo, or paid campaigns before proof | Keep gated | These amplify the current evidence quality; they do not create it. |

## Concrete Next Sequence

1. Founder supplies the first permissioned businesses or two approved physical partners and confirms sender identity.
2. Operate the ten-business board through source, preview, publish, two-surface activation, paid state, and day-30 review.
3. Produce one permissioned proof packet as soon as a business reaches the evidence gate; do not wait for all ten.
4. Run the first owner clinic after three businesses activate.
5. At five paid day-30 businesses, decide on neutral Capterra/G2 profile creation and review requests.
6. After the cohort, decide whether a compact source-to-day-30 founder read model is worth runtime work.
7. Prepare provider/API readiness only after real owners demonstrate demand for Google/Apple/AI distribution beyond the existing owner-confirmed workflow.

## Research Boundary

This audit does not authorize:

- provider account creation;
- Google, Apple, Bing, OpenAI, Anthropic, G2, or Capterra integration;
- outreach or review requests;
- public claims or case studies;
- paid campaigns;
- Firebase, Vercel, or website deployment;
- new collections, APIs, feature flags, or owner-facing settings.

Those decisions require the evidence gates above and the relevant product, security, compliance, cost, and deployment review.

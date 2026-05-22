# Canonica Website — Spec

> **Version:** 1.2.4
> **Last Updated:** 2026-05-22
> **Audience:** CEO / PM / Marketing

---

## Purpose

Public-facing marketing website for Canonica at `canonica.app`. Serves as the primary discovery, demo, pricing, and onboarding surface for small SaaS founders considering Canonica as accurate page-aware support infrastructure with launch setup, support control, page-aware widget, branded hosted help domains, safe ticket context, and knowledge governance.

---

## Target Audience (ICP)

| Attribute | Value |
|-----------|-------|
| Role | Solo SaaS founder, technical founder, small SaaS operator, dev studio owner |
| Business stage | Live or near-live SaaS product |
| Release cadence | Frequent product, plan, onboarding, billing, or settings changes |
| Team size | Founder-led or small team before a dedicated support team |
| Pain | Support answers drift as the product changes, and users need help on exact product pages |
| Current tools | Existing docs, FAQs, changelogs, tickets, or rough starter answers |

---

## Pages & Content Architecture

### 1. Homepage (`/`)
**Goal:** Communicate what Canonica is in < 10 seconds. Drive to the static demo or self-service onboarding.

**Sections:**
1. **Hero** — Founder outcome first: "You build revenue. Canonica keeps support accurate." Backed by approved page-aware answers before fallback and missed answers becoming review work
2. **Embedded Demo** — Horizontal product-surface tabs plus one large product-canvas view comparing generic chatbot output with Canonica's page-aware answer path
3. **Closed Loop Visual** — User question → safe page context → canonical answer → fallback signal → proposal → human approval → future canonical answer
4. **Product Scene** — Screenshot-led responsive Canonica workflow view showing activation, product surfaces, widget support, and signal-to-knowledge queue without exposing private workspace data
5. **Product Areas** — Buyer navigation cards for Launch Setup, Page-Aware Widget, Support Control, and Knowledge Governance so the product-suite structure is visible from the homepage
6. **Best Fit / Not Fit** — Qualifies solo founders and small SaaS teams while rejecting helpdesk replacement and auto-publish expectations
7. **10-Minute Setup Funnel** — Google sign-in, product details, surfaces, import, widget script, verification, and answer review
8. **Widget Install** — Bento-style proof grid for page-aware widget, install script, allowed domains, blocked routes, hosted help domains such as help.yourapp.com, safe context, and support-gap review
9. **Security At A Glance** — Widget key, origin, blocked route, bounded context, owner-approval, and workspace-scope controls
10. **Canonica Engine** — Product Ontology, Canonical Answer Engine, Drift Governance, Signal Mutation
11. **Product System** — Launch Setup, Support Control, Knowledge Governance, and Runtime Layer from implemented code
12. **How It Works** — Create workspace, import knowledge, map surfaces, install widget, govern gaps
13. **Comparison** — Contrasts AI chatbot, helpdesk, knowledge base, and Canonica without positioning Canonica as a helpdesk replacement
14. **Pricing Preview** — Starter/Growth/Studio guidance and plain-language support-credit explanation
15. **Objections** — Top buyer objections before final CTA
16. **CTA** — Final conversion section with demo and start-free actions

### 2. Product (`/product`)
**Goal:** Explain the product in founder/operator language while preserving the real Canonica architecture.

**Sections:**
- Hero with page-aware support knowledge promise
- Product area cards that route to landing-style subpages for Launch Setup, Page-Aware Widget, Support Control, and Knowledge Governance
- Product scene reused from the homepage so buyers see the owner workflow before the architecture deep dive
- Canonica Engine section:
  - Product Ontology
  - Canonical Answer Engine
  - Drift Governance
  - Signal Mutation
- 5 feature deep-dive sections:
  - Badge (Launch Setup / Support Control / Knowledge Governance / Release Awareness / Support Gap Loop)
  - Title + description
  - 5 capability bullet points
- Product page should frame custom help domains as buyer-visible value and ticket debugging context as support reliability, not as raw console logging.
- Bottom CTA

Product-area subpages:
- `/product/launch-setup`
- `/product/page-aware-widget`
- `/product/support-control`
- `/product/knowledge-governance`

Each subpage must feel like its own landing page, not a thin documentation page: hero, horizontal product-area tabs, large browser-style product canvas, bento benefit grid, workflow steps, and CTA. These pages stay static and may only claim implemented Canonica behavior.

### 3. Use Cases (`/use-cases`)
**Goal:** Help small SaaS operators recognize when Canonica is useful.

**Sections:**
- Billing and plan questions
- Onboarding confusion
- Settings and configuration
- Release support
- Hosted help for public support
- Support fallback
- Errors and edge cases
- Each card includes a sample user question, generic answer, Canonica answer, and outcome.

Role-specific pages:
- `/use-cases/founders`
- `/use-cases/support-teams`
- `/use-cases/product-teams`
- `/use-cases/engineering`

Rules:
- Use implemented page-aware support, canonical answer, fallback, drift, signal, and widget behavior only
- Do not claim broad helpdesk integrations or public API availability on these pages

### Positioning Guardrail

The homepage may use founder-relief language such as "ship fast", "support chaos", and "keep support accurate", but it must not say Canonica "handles all support" or imply human outsourcing, helpdesk replacement, full AI autopilot, or automatic publishing. The accurate buyer promise is: Canonica keeps support knowledge and answers accurate through page context, approved answers, fallback signals, and human review.

### 3A. SEO Landing Pages
**Goal:** Capture founder search intent without overclaiming product behavior.

Routes:
- `/page-aware-support-widget`
- `/hosted-help-center-for-saas`
- `/support-widget-for-solo-founders`

Rules:
- Static content only
- No Firebase reads
- No external API calls
- Each page includes problem, concrete user question, generic answer, Canonica answer, owner-review explanation, setup steps, and CTAs to demo/get-started

### 4. Widget Install (`/install`)
**Goal:** Explain how Canonica connects to a client product through the implemented widget and hosted help center without overclaiming disabled API or adapter surfaces.

**Sections:**
- Widget key and script model
- Allowed origins
- Blocked routes
- Hosted help domains for docs, articles, FAQ, changelog, robots, and sitemap
- Custom help domain examples such as help.yourapp.com
- Safe page context
- Runtime verification
- Framework handoff examples for plain HTML, Next.js/React, and SPA routers
- Runtime verification mock: key, origin, blocked route, context marker, hosted help
- Owner dashboard controls

### 5. Resources (`/resources`)
**Goal:** Give buyers and new users a website-side learning hub.

**Sections:**
- Product-area entry cards for Launch Setup, Page-Aware Widget, Support Control, and Knowledge Governance
- Start guide
- Widget install guide
- Knowledge governance guide
- Product surface guide
- Cost and cache guide
- Links into demo, product, pricing, and get-started

### 6. Updates (`/updates`)
**Goal:** Show public product momentum without using dashboard-owned changelog routes that are reserved for Canonica workspaces.

**Sections:**
- Static public website update timeline
- Links to product, install, resources, and demo
- Calm factual update language only

### 7. Demo (`/demo`)
**Goal:** Let visitors understand Canonica without creating an account.

**Rules:**
- Static demo data only
- No Firebase reads
- No AI calls
- Show canonical answer, fallback answer, and support gap states
- Show page-aware behavior by switching product surfaces

### 8. Pricing (`/pricing`)
**Goal:** Transparent founder-friendly pricing.

**Sections:**
- Starter, Growth, and Studio INR packaging
- Predictable limits, no public per-resolution pricing
- Plain-language support-credit definition:
  - Support credits are plan capacity for governed answers, chat assistance, and knowledge governance work
  - Static hosted help pages, docs/FAQ/changelog browsing, and widget loading do not consume support credits
- Plan guidance:
  - Starter: solo founder launching one SaaS product
  - Growth: active SaaS product with recurring support questions
  - Studio: studios/agencies running multiple small SaaS products
- Public setup starts with beta workspace creation
- Paid plan changes, transactions, invoices, and support-credit top-ups are handled through Canonica Billing with product-scoped Razorpay requests

### 9. Security (`/security`)
**Goal:** Give buyers a concise trust page without overclaiming compliance.

**Sections:**
- Security-at-a-glance facts for data boundary, runtime database, widget key storage, widget placement, answer authority, expensive request limits, scheduler output, and MenuList product boundary
- Tenant-scoped data and workspace isolation
- Safe widget context that is bounded to support relevance and never treated as trusted identity
- Origin and blocked-route controls for widget placement
- Hosted help domain registry for anonymous public docs/FAQ/changelog without exposing tickets or workspace internals
- Safe ticket debugging context that is capped, sanitized, ticket-scoped, and captured only when a ticket is created
- Owner-approved authority through canonical answers, drafts, proposals, and drift checks
- Cost and abuse controls through rate-limited widget endpoints, cache freshness checks, and summary-backed dashboards
- Separate Canonica product infrastructure with MenuList as a client/use case, not a hardcoded dependency
- Responsible disclosure contact and safe reporting guidance

### 10. FAQ (`/faq`)
**Goal:** Answer common founder/buyer objections and support SEO with structured FAQ content.

**Sections:**
- Setup speed
- Difference from a helpdesk
- Page-aware context
- Fallback behavior
- Widget visibility controls
- Hosted help domains
- Custom help domains
- Safe ticket debugging context
- Article-backed FAQ generation and review
- Release-aware answer review
- Pricing model
- Product separation from MenuList

### 11. About (`/about`)
**Goal:** Build trust. Explain the "why" behind Canonica.

**Sections:**
- Problem statement for fast-built SaaS products
- 5 belief cards around correct answers, page context, measured fallback, founder approval, and coverage
- Team origin (built by MenuList team)

### 12. Contact (`/contact`)
**Goal:** Multiple contact paths for different intents.

**Sections:**
- Email (hello@canonica.app)
- Partnerships (partners@canonica.app)
- Founder setup help and early customer program description

### 13. Get Started (`/get-started`)
**Goal:** Self-service onboarding flow for a new Canonica workspace.

**Sections:**
- Best-fit criteria for live/near-live SaaS products
- Google sign-in and product details form
- Product URL, support email, billing model, and main product pages
- What-you-need-before-signup copy
- 7-step first-session checklist

## Conversion Tracking

The website may emit optional GA/measurement events when `NEXT_PUBLIC_CANONICA_FIREBASE_MEASUREMENT_ID` or `NEXT_PUBLIC_GA_MEASUREMENT_ID` is configured. Tracking is client-only and does not write to Firestore.

Tracked events:
- `hero_cta_clicked`
- `homepage_demo_link_clicked`
- `demo_surface_changed`
- `demo_cta_clicked`
- `homepage_pricing_clicked`
- `pricing_plan_cta_clicked`
- `pricing_beta_setup_clicked`
- `product_cta_clicked`
- `about_cta_clicked`
- `install_cta_clicked`
- `updates_cta_clicked`
- `google_signin_clicked`
- `onboarding_create_clicked`
- `onboarding_completed`
- `widget_key_generated`
- `onboarding_activation_clicked`
- `seo_page_cta_clicked`
- `final_cta_clicked`

### 14. Privacy Policy (`/privacy-policy`)
**Goal:** Provide a public policy summary for account, workspace, support, and widget data.

### 15. Terms of Service (`/terms-of-service`)
**Goal:** Provide a public terms summary for account, support content, AI-assisted drafts, widget usage, billing, and acceptable use.

## Market Pattern Check

Comparable support platforms commonly expose product depth, pricing, demo/start actions, install/developer setup, resources, security/trust, and updates. Canonica leads with the implemented widget install path because non-widget delivery paths are rollout-gated, not default buyer-facing package promises. The site also avoids unsupported pages such as a live status page, because there is no implemented status/incident backend yet.

Final product-suite polish follows the observed pattern from product-led sites where the main nav exposes product families, each family can stand as its own landing page, and resource/use-case pages cross-link back into those families. Canonica applies that pattern without adding runtime reads, unimplemented integrations, or unsupported public docs routes.

Route naming must avoid conflicts with Canonica dashboard roots. Public website learning content uses `/resources` and public release communication uses `/updates`; dashboard-owned support routes keep `/docs`, `/help`, `/changelog`, and `/release-notes`.

---

## Design System

| Element | Value |
|---------|-------|
| Primary color | Indigo 500 (#6366f1) |
| Background | Dark navy (#0a0a1a) |
| Text primary | White (#ffffff) |
| Text secondary | Muted lavender (#a0a0c0) |
| Text muted | Deep gray (#6b6b8a) |
| Cards | White 3% opacity + 6% border |
| Font | Inter (system fallback) |
| Border radius | 0.75rem (cards), 0.5rem (buttons) |
| Max content width | 6xl (1152px) |

---

## SEO

| Page | Title | Description |
|------|-------|-------------|
| `/` | Canonica — Accurate Page-Aware Support for SaaS | Canonica helps SaaS founders ship fast without support chaos: approved page-aware answers before fallback, hosted help on their own domain, and reviewable fixes for missed questions. |
| `/product` | Product \| Canonica | Canonica brings page-aware support truth, launch setup, hosted help domains, canonical answers, drift review, and support-gap governance into one SaaS support control plane. |
| `/product/launch-setup` | Launch Setup \| Canonica | Create a Canonica workspace, add product details, import starter knowledge, map product surfaces, and verify the widget before launch. |
| `/product/page-aware-widget` | Page-Aware Widget \| Canonica | Install Canonica as a page-aware widget with safe context, allowed origins, blocked routes, hosted help, and approved answers before fallback. |
| `/product/support-control` | Support Control \| Canonica | Operate Canonica help center, docs, FAQ, changelog, tickets, conversations, and weekly support review from one support control layer. |
| `/product/knowledge-governance` | Knowledge Governance \| Canonica | Govern Canonica product ontology, canonical answers, drift, signal mutation, coverage KPI, and trust/readiness metrics. |
| `/use-cases` | Use Cases \| Canonica | See how Canonica helps small SaaS teams launch support, reduce repeated tickets, and govern product knowledge. |
| `/use-cases/founders` | Support for SaaS Founders \| Canonica | Page-aware support, approved answers, and support-gap review for solo SaaS founders. |
| `/use-cases/support-teams` | Support Teams \| Canonica | Reduce repeated tickets with approved answers, ticket fallback, and a signal-to-knowledge queue. |
| `/use-cases/product-teams` | Product Teams \| Canonica | See which product surfaces create support friction, stale answers, and review work after releases. |
| `/use-cases/engineering` | Engineering Teams \| Canonica | A support layer with safe page context, widget controls, and governed retrieval. |
| `/page-aware-support-widget` | Page-Aware Support Widget \| Canonica | A page-aware support widget for SaaS products that uses safe product context and owner-approved answers before fallback. |
| `/hosted-help-center-for-saas` | Hosted Help Center for SaaS \| Canonica | Hosted SaaS help center for docs, FAQ, and changelog content connected to Canonica product surfaces and approved answers. |
| `/support-widget-for-solo-founders` | Support Widget for Solo Founders \| Canonica | A support widget for solo SaaS founders who need approved answers, page-aware help, and support-gap review before hiring support. |
| `/demo` | Demo \| Canonica | Try a static page-aware support demo with canonical answers, fallback, and support gap states. |
| `/install` | Widget Install \| Canonica | Install Canonica with one widget script, allowed origins, blocked routes, help.yourapp.com hosted help domains, runtime verification, and safe page context. |
| `/pricing` | Pricing \| Canonica | Founder-friendly INR pricing, beta setup, and paid Canonica plans for small SaaS teams. |
| `/resources` | Resources \| Canonica | Guides for setting up Canonica, installing the widget, mapping product surfaces, and governing support knowledge. |
| `/updates` | Updates \| Canonica | Product updates for Canonica website, launch setup, widget management, and knowledge governance. |
| `/security` | Security \| Canonica | How Canonica protects support knowledge, widget context, ticket debugging context, hosted help domains, and customer workspaces. |
| `/faq` | FAQ \| Canonica | Answers to common questions about Canonica setup, widget context, pricing, tickets, and data handling. |
| `/about` | About \| Canonica | Canonica helps small SaaS teams keep support answers correct as products change. |
| `/contact` | Contact \| Canonica | Contact Canonica for product questions, onboarding help, and partnerships. |
| `/get-started` | Get Started \| Canonica | Create your Canonica workspace and launch page-aware support for your SaaS product. |
| `/privacy-policy` | Privacy Policy \| Canonica | How Canonica handles product support knowledge, account information, and widget data. |
| `/terms-of-service` | Terms of Service \| Canonica | Terms for using Canonica website, dashboard, widget, and support knowledge features. |

OpenGraph and Twitter cards configured in layout.tsx with `public/canonica-og-image.png`.
Canonica product domains must serve their own `/sitemap.xml` and `/robots.txt`; do not rely on the MenuList platform sitemap.

---

## Conversion Funnel

```
Visitor lands on homepage
  ↓
Reads pain-led hero + embedded demo → "Try page-aware demo" or "Start free setup"
  ↓
Demo page → understands canonical answer vs fallback vs support gap
  ↓
Pricing → chooses Starter/Growth/Studio direction
  ↓
Get Started → signs in → creates workspace → lands in Activation Command Center
```

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-07 | 1.0.0 | Initial spec |
| 2026-05-21 | 1.1.0 | Repositioned website for small SaaS self-serve funnel, added demo/security/FAQ/legal pages, Canonica sitemap/robots, structured data, and removed enterprise/private-beta-first spec language |
| 2026-05-21 | 1.1.1 | Restored implemented Canonica engine pillars on homepage and product page without claiming deferred API/integration pillar |
| 2026-05-21 | 1.1.2 | Added homepage system coverage section from the codebase inventory |
| 2026-05-21 | 1.1.3 | Added product preview plus public use-cases, integrations, resources, and updates pages based on website benchmark gaps and implemented Canonica capabilities |
| 2026-05-21 | 1.1.4 | Replaced public integrations positioning with widget-first install positioning and removed API/adapters from buyer-facing website package copy |
| 2026-05-21 | 1.1.5 | Expanded the security page from the MenuList trust-page reference pattern with Canonica-specific facts, widget runtime controls, tenant isolation, cost controls, product separation, and responsible disclosure |
| 2026-05-22 | 1.1.6 | Refreshed website to match current Canonica implementation: hosted help, FAQ generation/management, product-scoped billing/support credits, cache freshness, and separate Firebase/product boundaries |
| 2026-05-22 | 1.1.7 | Added buyer-facing custom help domain positioning and safe ticket debugging context across homepage, product, install, security, FAQ, privacy, and updates copy |
| 2026-05-22 | 1.1.8 | Applied self-sell website feedback: outcome-led hero, embedded generic-vs-Canonica demo, buyer qualification, setup funnel, trust strip, pricing credit clarity, objection handling, optional no-Firestore conversion events, and three SEO landing pages |
| 2026-05-22 | 1.1.9 | Added screenshot-led product proof after the hero and on `/product`, using responsive HTML/CSS product scenes instead of static screenshots so the website stays privacy-safe, responsive, and zero-Firebase-cost |
| 2026-05-22 | 1.2.0 | Applied positioning review: hero now leads with page-aware support truth, demo is primary CTA, homepage includes a support truth loop, comparison distinguishes chatbot/helpdesk/KB/Canonica, FAQ defines canonical answers and non-chatbot positioning, and role-specific use-case pages were added |
| 2026-05-22 | 1.2.1 | Added founder-relief positioning without helpdesk overclaiming: homepage hero now leads with revenue/support-accuracy language while preserving approved-answer, page-aware, fallback-signal, and human-review guardrails |
| 2026-05-22 | 1.2.2 | Redesigned presentation quality for the public site: demo now uses top product-surface tabs and a large product canvas, product proof uses clearer dashboard-style tabs, and widget content moved into a bento-style install/runtime/governance grid |
| 2026-05-22 | 1.2.3 | Added landing-style product area pages for Launch Setup, Page-Aware Widget, Support Control, and Knowledge Governance so each major product part can be understood and sold independently |
| 2026-05-22 | 1.2.4 | Final product-suite polish: header Product dropdown, homepage product-area section, resources product-area hub, and SEO/use-case product-area cross-links make the current product easier to evaluate without adding Firebase cost |

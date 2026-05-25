# Canonica Website — Spec

> **Version:** 1.2.15
> **Last Updated:** 2026-05-25
> **Audience:** CEO / PM / Marketing

---

## Purpose

Public-facing marketing website for Canonica at `canonica.app`. Serves as the primary discovery, demo, pricing, and onboarding surface for AI-built SaaS founders considering Canonica as accurate page-aware support infrastructure with launch setup, support control, in-app widget, branded hosted help domains, safe ticket context, and knowledge governance.

---

## Target Audience (ICP)

| Attribute | Value |
|-----------|-------|
| Role | AI-native SaaS founder, solo SaaS founder, technical founder, small SaaS operator, dev studio owner |
| Business stage | Live or near-live SaaS product |
| Release cadence | Frequent product, plan, onboarding, billing, or settings changes |
| Team size | Founder-led or small team before a dedicated support team |
| Pain | Support answers drift as the product changes, and users need help on exact product pages |
| Current tools | Existing docs, FAQs, changelogs, tickets, AI-generated setup notes, or rough starter answers |

---

## Pages & Content Architecture

### 1. Homepage (`/`)
**Goal:** Communicate what Canonica is in < 10 seconds. Drive to the static demo or self-service onboarding.

**Sections:**
1. **Hero** — AI-built SaaS outcome first: "You shipped the app. Now users need correct answers." Backed by page-aware widget, hosted help, ticket fallback, and owner-approved answers
2. **Embedded Demo** — Horizontal app-page tabs plus one large product-canvas view comparing generic chatbot output with Canonica's page-aware answer path; this is the first proof after the hero
3. **Support Knowledge Map** — Docs, FAQs, changelogs, setup notes, tickets, feedback, and safe page context flow through a logo-only Canonica center with dotted paths, smooth ripple rings, homepage-style pulse strokes, and border-only output highlights, then out to widget, hosted help, approved answers, and review queues
4. **Closed Loop Visual** — Animated loop diagram for user question → approved answer check → fallback only when needed → repeated miss → owner-reviewed fix → future approved answer
5. **Product Scene** — Screenshot-led responsive Canonica workflow view showing setup, app pages, widget support, and answer review without exposing private workspace data
6. **Product Areas** — Buyer navigation cards for Set Up Support, In-App Help Widget, Help Center + Tickets, and Review Approved Answers so the product-suite structure is visible from the homepage
7. **Best Fit / Not Fit** — Decision tiles that qualify solo founders and small SaaS teams while rejecting helpdesk replacement and auto-publish expectations
8. **Setup Funnel** — Animated sequence for adding product, picking 2-5 stuck pages, importing docs/FAQs/changelogs, installing the widget, and reviewing first approved answers
9. **Day-One Launch Pack** — Buyer-facing pack for framework quickstarts, typed browser helper, starter surface templates, import starter pack, install verifier, ROI calculator, proof pack, and security one-pager. This section links to existing pages instead of creating another route.
10. **Widget Install** — Product-scene proof and status snapshots for page-aware widget, install script, allowed domains, blocked routes, hosted help domains such as help.yourapp.com, safe context, user-initiated screenshot attachments, configured proactive prompts, and support-gap review
11. **Security At A Glance** — Status snapshots for widget key, origin, blocked route, bounded context, compiled approved context, owner-approval, and workspace-scope controls
12. **Canonica Engine** — Animated sequence for product structure, approved answers, stale-answer review, and repeated-question queue
13. **Product System** — Animated hub diagram for Launch Setup, Support Control, Knowledge Governance, and Runtime Layer from implemented code
14. **How It Works** — Animated sequence for create workspace, import knowledge, map surfaces, install widget, govern gaps
15. **Comparison** — Contrasts AI chatbot, helpdesk, knowledge base, and Canonica without positioning Canonica as a helpdesk replacement
16. **Pricing Preview** — Starter/Growth/Studio guidance and plain-language support-credit explanation
17. **Objections** — Top buyer objections before final CTA
18. **CTA** — Final conversion section with demo and start-free actions

### 2. Product (`/product`)
**Goal:** Explain the product in founder/operator language while preserving the real Canonica architecture.

**Sections:**
- Hero with AI-built SaaS support-layer promise
- Product area cards that route to landing-style subpages for Set Up Support, In-App Help Widget, Help Center + Tickets, and Review Approved Answers
- Day-One Launch Pack section that packages quickstarts, starter surfaces, import templates, install verification, ROI/proof, and security handoff as the practical first rollout layer
- Product scene reused from the homepage so buyers see the owner workflow before the architecture deep dive
- Canonica Engine section:
  - Your product structure
  - Approved answers first
  - Stale answer review
  - Repeated-question queue
- 5 feature deep-dive sections:
  - Badge (Launch Setup / Support Control / Knowledge Governance / Release Awareness / Support Gap Loop)
  - Title + description
  - 5 capability bullet points
- Product page should frame custom help domains as buyer-visible value and ticket debugging context as support reliability, not as raw console logging.
- Product page should include runtime readiness as a core reliability section: Firestore source of truth, approved public widget context, private server context, cache-first delivery, owner-visible bundle readiness, workspace-local governance, and controlled agent-context rollout. Do not create a standalone MCP page while MCP remains rollout-gated.
- Bottom CTA

Product-area subpages:
- `/product/launch-setup`
- `/product/page-aware-widget`
- `/product/support-control`
- `/product/knowledge-governance`

Each subpage must feel like its own landing page, not a thin documentation page: hero, horizontal product-area tabs, large browser-style product canvas, bento benefit grid, animated workflow sequence, and CTA. These pages stay static and may only claim implemented Canonica behavior.

Product-feature subpages:
- `/product/knowledge-base`
- `/product/faq-management`
- `/product/changelog`
- `/product/tickets`
- `/product/workflow-notifications`
- `/product/proactive-help`

Feature pages must use buyer-facing wording and avoid overclaiming. Workflow Notifications can claim Slack/email self-service setup, event filters, send-test delivery, compact health, digest-first behavior, critical alerts, and bounded delivery. Proactive Help can claim configured page-aware prompts tied to active triggers and approved support summaries, but must not imply always-on autonomous widget behavior.

### 3. Use Cases (`/use-cases`)
**Goal:** Help small SaaS operators recognize when Canonica is useful.

**Sections:**
- AI-built app launch
- Billing and plan questions
- Onboarding confusion
- Settings and configuration
- Release support
- Hosted help for public support
- Support fallback
- Errors and edge cases
- Each proof block includes a sample user question, generic answer, Canonica answer, and outcome.

Role-specific pages:
- `/use-cases/ai-built-saas`
- `/use-cases/vibe-coded-saas` (canonicalized campaign/search alias only)
- `/use-cases/founders`
- `/use-cases/support-teams`
- `/use-cases/product-teams`
- `/use-cases/engineering`

Rules:
- Use implemented page-aware support, canonical answer, fallback, drift, signal, and widget behavior only
- Do not claim broad helpdesk integrations or public API availability on these pages

### Positioning Guardrail

The homepage may use founder-relief language such as "AI-built SaaS", "ship fast", "support chaos", and "users need correct answers", but it must not say Canonica "handles all support" or imply human outsourcing, helpdesk replacement, full AI autopilot, or automatic publishing. The accurate buyer promise is: Canonica keeps support knowledge and answers accurate through page context, approved answers, fallback signals, and human review. "Vibe-coded SaaS" can be used for SEO/campaign content, but it is not the primary public ICP label.

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
- Each page includes an animated problem-to-reviewed-answer hub, setup sequence, concrete user question, generic answer, Canonica answer, owner-review explanation, and CTAs to demo/get-started

### 4. Widget Install (`/install`)
**Goal:** Explain how Canonica connects to a client product through the implemented widget and hosted help center without overclaiming disabled API or adapter surfaces.

**Sections:**
- Widget key and script model
- Allowed origins
- Blocked routes
- Hosted help domains for docs, articles, FAQ, changelog, robots, and sitemap
- Custom help domain examples such as help.yourapp.com
- Safe page context
- User-initiated screenshot upload/paste boundary
- Runtime verification
- Framework handoff examples for plain HTML, Next.js/React, and SPA routers
- Runtime verification mock: key, origin, blocked route, context marker, manual image input boundary, hosted help
- Animated install flow and owner-control hub diagram
- Owner dashboard controls
- Configured proactive help should be referenced only as owner-controlled and capability-gated.

### 4A. Integrations (`/integrations`)
**Goal:** Explain the production-ready workflow notification path without turning Canonica into a broad integration marketplace.

**Sections:**
- Slack alerts
- Email recipients
- Digest-first delivery
- Critical coverage / repeated answer-failure alerts
- Send-test notification
- Compact delivery health
- Bounded delivery through rate caps and retention
- Controlled rollout guardrail for broader workflow adapters

### 5. Resources (`/resources`)
**Goal:** Give buyers and new users a website-side learning hub.

**Sections:**
- Product-area entry cards for Launch Setup, Page-Aware Widget, Support Control, and Knowledge Governance
- Animated resource path from evaluation to rollout
- Start guide
- Widget install guide
- Knowledge governance guide
- Product surface guide
- Workflow notification guide
- Proactive help guide
- Cost and cache guide
- Developer quickstarts, ROI calculator, proof pack, and security one-pager
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
- Show approved answer, fallback answer, and support gap states
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
- Animated security-boundary diagram for allowed origins, safe page context, blocked routes, workspace scope, hosted help boundary, compiled context boundary, and owner-approved authority
- Status snapshots for workspace scope, safe context, origin/route controls, hosted help boundary, ticket context, owner approval, bounded logging, and product separation
- Runtime context safety: public widget bundles contain only approved public-safe context; drafts, tickets, audit logs, API keys, raw signals, and billing internals stay out.
- Tenant-scoped data and workspace isolation
- Safe widget context that is bounded to support relevance and never treated as trusted identity
- User-initiated screenshot attachments only; no automatic host-app capture or DOM scraping
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
- User-initiated widget screenshots and no automatic capture
- Fallback behavior
- Widget visibility controls
- Hosted help domains
- Custom help domains
- Safe ticket debugging context
- Article-backed FAQ generation and review
- Slack/email workflow notifications and adapter boundaries
- Configured proactive help and widget call gating
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

## Agent-Readable Website Context

Canonica product domains must serve Canonica-specific agent context instead of inheriting MenuList's public business-truth framing.

Routes:

- `/llms.txt` — short product definition, key public pages, product areas, and agent guidance
- `/llms-full.txt` — extended route map, runtime boundaries, action boundaries, and machine-readable surfaces
- `/sitemap.xml` — product-domain route inventory from `CANONICA_PUBLIC_PAGES` and product feature routes
- `/robots.txt` — product-domain crawler policy with explicit AI/search crawler allow rules and LLM context links

Rules:

- Define Canonica as the Support Knowledge Control Plane for SaaS.
- State that Canonica is not a helpdesk replacement, chatbot autopilot, documentation CMS, compliance platform, or autonomous publisher.
- Route agents to public pages, demo, install, pricing, security, FAQ, resources, updates, sitemap, and robots.
- Do not imply public agents can mutate customer workspaces, canonical answers, tickets, widget settings, billing, or private knowledge.
- Every public route in `CANONICA_PUBLIC_PAGES` must emit page-level WebPage and BreadcrumbList JSON-LD, either directly or through the shared page wrapper.
- Homepage structured data must reference the active public route registry so the WebSite graph, sitemap, and agent context do not drift.
- Future route changes must update `CANONICA_PUBLIC_PAGES`, sitemap/robots/LLM context as needed, and pass `npm run verify:agent-readiness`.
- WebMCP and MCP are future implementation surfaces unless a specific public page explicitly exposes them.

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

Comparable support platforms commonly expose product depth, pricing, demo/start actions, install/developer setup, integrations, resources, security/trust, and updates. Canonica now exposes integrations only for the implemented Slack/email workflow notification path. Broader workflow adapters remain controlled rollout, and the site avoids unsupported pages such as a live status page because there is no implemented status/incident backend yet.

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
| `/` | Canonica — Support for AI-Built SaaS Apps | Canonica helps AI-built SaaS apps launch support without chaos: page-aware widget, hosted help, ticket fallback, approved answers, and reviewable fixes for missed questions. |
| `/product` | Product \| Canonica | Canonica is the support layer for AI-built SaaS apps: page-aware widget, hosted help, ticket fallback, approved answers, and reviewable support gaps. |
| `/product/launch-setup` | Set Up Support \| Canonica | Create a Canonica workspace, add product details, import starter knowledge, map app pages, and verify the widget before launch. |
| `/product/page-aware-widget` | In-App Help Widget \| Canonica | Install Canonica as a page-aware widget with safe context, explicit screenshot attachments, allowed origins, blocked routes, hosted help, and approved answers before fallback. |
| `/product/support-control` | Help Center and Tickets \| Canonica | Operate Canonica hosted help, docs, FAQ, changelog, tickets, conversations, and weekly support review from one support layer. |
| `/product/knowledge-governance` | Review Approved Answers \| Canonica | Review approved answers, stale support, repeated-question signals, coverage KPI, and trust/readiness metrics. |
| `/use-cases` | Use Cases \| Canonica | Canonica use cases for AI-built SaaS apps across billing, onboarding, settings, releases, errors, and support fallback. |
| `/use-cases/ai-built-saas` | AI-Built SaaS \| Canonica | Support path for AI-built SaaS apps with page-aware widget, hosted help, approved answers, ticket fallback, and reviewable support gaps. |
| `/use-cases/vibe-coded-saas` | Vibe-Coded SaaS \| Canonica | Canonicalized campaign/search alias for the AI-built SaaS use case. |
| `/use-cases/founders` | Support for SaaS Founders \| Canonica | Page-aware support, approved answers, and support-gap review for solo founders launching AI-built SaaS apps. |
| `/use-cases/support-teams` | Support Teams \| Canonica | Reduce repeated tickets with approved answers, ticket fallback, and a signal-to-knowledge queue. |
| `/use-cases/product-teams` | Product Teams \| Canonica | See which product surfaces create support friction, stale answers, and review work after releases. |
| `/use-cases/engineering` | Engineering Teams \| Canonica | A support layer with safe page context, widget controls, and governed retrieval. |
| `/page-aware-support-widget` | Page-Aware Support Widget \| Canonica | A page-aware support widget for AI-built SaaS that uses safe product context, optional screenshot attachments, and owner-approved answers before fallback. |
| `/hosted-help-center-for-saas` | Hosted Help Center for SaaS \| Canonica | Hosted SaaS help center for AI-built SaaS with docs, FAQ, changelog content, and the same knowledge powering the app widget. |
| `/support-widget-for-solo-founders` | Support Widget for Solo Founders \| Canonica | A support widget for solo founders shipping with AI who need page-aware help, optional screenshot context, hosted docs, ticket fallback, and approved answers. |
| `/demo` | Demo \| Canonica | Try a static page-aware support demo with approved answers, fallback, and support gap states. |
| `/install` | Widget Install \| Canonica | Install Canonica with one widget script, allowed origins, blocked routes, help.yourapp.com hosted help domains, runtime verification, safe page context, and explicit screenshot attachments. |
| `/pricing` | Pricing \| Canonica | Founder-friendly INR pricing, beta setup, support credits, and paid Canonica plans for AI-built SaaS teams. |
| `/resources` | Resources \| Canonica | Canonica resources for founders launching support for AI-built SaaS apps: demo, fit, install, screenshot boundaries, pricing, safety, and setup. |
| `/updates` | Updates \| Canonica | Product updates for Canonica website, launch setup, widget management, and knowledge governance. |
| `/security` | Security \| Canonica | How Canonica protects support knowledge, widget context, screenshot boundaries, ticket debugging context, hosted help domains, and customer workspaces. |
| `/faq` | FAQ \| Canonica | Answers to common questions founders ask about Canonica setup, AI-built apps, page-aware support, screenshots, pricing, tickets, and data handling. |
| `/about` | About \| Canonica | Canonica helps AI-built SaaS teams keep support answers correct as products change. |
| `/contact` | Contact \| Canonica | Contact Canonica for setup help, partnership questions, or to check if Canonica fits your AI-built SaaS app. |
| `/get-started` | Get Started \| Canonica | Create your Canonica workspace and launch page-aware support for your AI-built SaaS app. |
| `/privacy-policy` | Privacy Policy \| Canonica | How Canonica handles product support knowledge, account information, and widget data. |
| `/terms-of-service` | Terms of Service \| Canonica | Terms for using Canonica website, dashboard, widget, and support knowledge features. |

OpenGraph and Twitter cards configured in layout.tsx with `public/canonica-og-image.png`.
Canonica product domains must serve their own `/sitemap.xml` and `/robots.txt`; do not rely on the MenuList platform sitemap.
Canonica public routes emit server-rendered Organization/WebSite/SoftwareApplication/WebPage/BreadcrumbList JSON-LD. The FAQ route also emits FAQPage JSON-LD. Route-level structured data must stay tied to `CANONICA_PUBLIC_PAGES`.

---

## Conversion Funnel

```
Visitor lands on homepage
  ↓
Reads pain-led hero + embedded demo → "Try page-aware demo" or "Start free setup"
  ↓
Demo page → understands approved answer vs fallback vs support gap
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
| 2026-05-23 | 1.2.5 | Added Canonica-specific `llms.txt` and `llms-full.txt` routes so product-domain agents read Canonica product context, non-goals, and mutation boundaries |
| 2026-05-23 | 1.2.6 | Added server-rendered WebPage/BreadcrumbList JSON-LD coverage across public Canonica routes, explicit AI/search crawler robots rules, route-registry Website graph references, and `verify:agent-readiness` coverage |
| 2026-05-24 | 1.2.7 | Reframed public copy for AI-built SaaS founders, moved the page-aware demo into first-proof position, simplified first-visit vocabulary, added `/use-cases/ai-built-saas`, and kept `/use-cases/vibe-coded-saas` as a canonicalized campaign/search alias rather than the primary ICP label |
| 2026-05-24 | 1.2.8 | Matched the shared Canonica support knowledge map diagram to the MenuList visual treatment with a logo-only center, Canonica-colored ripple rings, dotted SVG paths, homepage-style pulse strokes, and border-only output highlights |
| 2026-05-24 | 1.2.9 | Expanded the same animated diagram language across Canonica workflow-heavy sections: homepage loops/sequences, product-area and feature workflows, connected surfaces, SEO/use-case pages, install, security, resources, engine pillars, and system coverage |
| 2026-05-24 | 1.2.10 | Added non-diagram proof blocks for text compression: homepage fit decisions, widget state snapshots, trust controls, use-case before/after examples, and security status snapshots |
| 2026-05-24 | 1.2.11 | Aligned reusable Canonica sequence-diagram endpoints and output-highlight timing with the MenuList homepage source-map reference while keeping the Canonica logo, ripple, and color treatment unchanged |
| 2026-05-24 | 1.2.12 | Converted reusable workflow sequence diagrams into the same input column, logo center, and output column layout used by Canonica source-map diagrams |
| 2026-05-25 | 1.2.15 | Added the day-one launch pack to homepage and Product so quickstarts, starter surfaces, import templates, install verification, ROI/proof, and security handoff are visible in the main buyer path without adding another public route |
| 2026-05-25 | 1.2.16 | Updated existing widget/install/security/FAQ/SEO pages to present user-initiated screenshot attachments as part of the page-aware widget while explicitly rejecting automatic screenshot capture or DOM scraping |

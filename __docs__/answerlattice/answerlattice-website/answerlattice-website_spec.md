# Answerlattice Website — Spec

> **Version:** 1.2.31
> **Last Updated:** 2026-06-02
> **Audience:** CEO / PM / Marketing

---

## Purpose

Public-facing marketing website for Answerlattice at `answerlattice.com`. Serves as the primary discovery, demo, pricing, and onboarding surface for SaaS and digital-product founders considering Answerlattice as a page-aware support-answer layer with launch setup, support control, in-product widget, custom owner Q&A, branded hosted help domains, safe ticket context, private feedback review, private Support Board follow-up, and knowledge governance.

---

## Target Audience (ICP)

| Attribute | Value |
|-----------|-------|
| Role | AI-native SaaS founder, solo digital-product founder, technical founder, small product operator, dev studio owner |
| Business stage | Live or near-live SaaS app or digital product |
| Release cadence | Frequent product, plan, onboarding, billing, or settings changes |
| Team size | Founder-led or small team before a dedicated support team |
| Pain | Support answers drift as the product changes, and users need help on exact product pages |
| Current tools | Existing docs, FAQs, changelogs, tickets, AI-generated setup notes, or rough starter answers |

---

## Pages & Content Architecture

### 1. Homepage (`/`)
**Goal:** Communicate what Answerlattice is in < 5 seconds. Drive to the static demo or self-service onboarding.

**Sections:**
1. **Hero** — Founder-readable page-aware support promise: "Page-aware support answers for SaaS and digital products." Backed by inline sample workspace proof, setup/demo/source-prep CTAs, and chips for page-aware widget, approved answers, hosted help, tickets, feedback, Pre-Onboarding, and safe context.
2. **Conversion Proof Band** — Compact proof of the must-sell points: exact app-page context, approved answers before fallback, hosted help/FAQs/custom Q&A, tickets and feedback as support gaps, practical widget install, and source preparation.
3. **Product Scene** — Early responsive Answerlattice workflow view showing setup readiness, product pages, widget support, feedback review, and answer review without exposing private workspace data.
4. **Embedded Demo** — Horizontal app-page tabs plus one large product-canvas view showing why a billing question should get billing-specific support rather than a generic reply.
5. **Support Knowledge Map** — Docs, FAQs, custom owner Q&A, changelogs, setup notes, tickets, feedback, and safe page context flow through a logo-only Answerlattice center with dotted paths, smooth ripple rings, homepage-style pulse strokes, and border-only output highlights, then out to widget, hosted help, owner answers, approved answers, and review queues.
6. **How It Works** — Animated sequence for map product, import starter sources, review answers, install widget, and improve from support gaps.
7. **Product Areas** — Buyer navigation cards for Set Up Support, In-App Help Widget, Help Center and Tickets, and Review Approved Answers so the product-suite structure is visible from the homepage. Set Up Support includes workspace team access now that Answerlattice roles and owner reset are implemented.
8. **Widget Install** — Product-scene proof and status snapshots for page-aware widget, install script, allowed domains, blocked routes, hosted help domains such as help.yourapp.com, safe context, user-initiated screenshot attachments, approved answers first, published owner FAQ answers before fallback, configured proactive prompts, and support-gap review.
9. **Closed Loop Visual** — Animated loop diagram for user question -> approved answer check -> fallback only when needed -> repeated miss -> owner-reviewed fix -> future approved answer.
10. **Security At A Glance** — Status snapshots for widget key, origin, blocked route, bounded context, compiled approved context, owner approval, and workspace-scope controls.
11. **Best Fit / Not Fit** — Decision tiles that qualify solo founders and small product teams while rejecting helpdesk replacement and auto-publish expectations.
12. **Setup Funnel** — Animated sequence for adding product, picking 2-5 stuck pages, importing docs/FAQs/changelogs, installing the widget, and reviewing first approved answers.
13. **Pre-Onboarding Kit** — Source-preparation section placed after product value is clear; sends buyers to prompt, guide, source rules, and safety boundary.
14. **Day-One Launch Pack** — Buyer-facing pack for framework quickstarts, agent install packet, starter surface templates, import starter pack, install verifier, ROI calculator, proof pack, and security one-pager. This section links to existing pages instead of creating another route.
15. **Answerlattice Engine** — Animated sequence for product structure, approved answers, stale-answer review, and repeated-question queue.
16. **Product System** — Animated hub diagram for Launch Setup, Support Control, Knowledge Governance, and Runtime Layer from implemented code.
17. **Comparison** — Contrasts AI chatbot, helpdesk, knowledge base, and Answerlattice without positioning Answerlattice as a helpdesk replacement.
18. **Pricing Preview** — Starter/Growth/Studio guidance and plain-language support-credit explanation.
19. **Objections** — Top buyer objections before final CTA.
20. **CTA** — Final conversion section with demo and start-free actions.

### 2. Product (`/product`)
**Goal:** Explain the product in founder/operator language while preserving the real Answerlattice architecture.

**Sections:**
- Hero with SaaS and digital-product support-layer promise, setup/demo/source-prep CTAs, and compact proof strip explaining what Answerlattice is, what it connects, why it converts, and what stays safe
- Product area cards that route to landing-style subpages for Set Up Support, In-App Help Widget, Help Center and Tickets, and Review Approved Answers
- Team access should be presented as production readiness inside setup, security, pricing, and a dedicated feature page because it affects workspace trust and buyer evaluation.
- Day-One Launch Pack section that packages quickstarts, starter surfaces, import templates, install verification, ROI/proof, and security handoff as the practical first rollout layer
- Product scene reused from the homepage so buyers see the owner workflow before the architecture deep dive
- Answerlattice Engine section:
  - Your product structure
  - Approved answers first
  - Stale answer review
  - Repeated-question queue
- 5 feature deep-dive sections:
  - Badge (Launch Setup / Support Control / Knowledge Governance / Release Awareness / Support Gap Loop)
  - Title + description
  - 5 capability bullet points
- Product page should frame custom help domains as buyer-visible value, owner Q&A as a fast reviewed shortcut for repeated questions, and ticket debugging context as support reliability, not as raw console logging.
- Product page should include runtime readiness as a core reliability section: Firestore source of truth, approved public widget context, private server context, cache-first delivery, owner-visible bundle readiness, workspace-local governance, and controlled agent-context rollout. Do not create a standalone MCP page while MCP remains rollout-gated.
- Bottom CTA

Product-area subpages:
- `/product/launch-setup`
- `/product/page-aware-widget`
- `/product/support-control`
- `/product/knowledge-governance`

Each subpage must feel like its own landing page, not a thin documentation page: hero, horizontal product-area tabs, compact proof strip, large browser-style product canvas, bento benefit grid, animated workflow sequence, and CTA. These pages stay static and may only claim implemented Answerlattice behavior.

Each product-area subpage must include the same proof-and-action treatment above the product canvas: Start support setup, page-aware demo, source-preparation CTA, and proof items for page context, approved-answer authority, owner review, and connected runtime surfaces.

Product-feature subpages:
- `/product/team-access`
- `/product/knowledge-base`
- `/product/faq-management`
- `/product/changelog`
- `/product/tickets`
- `/product/support-board`
- `/product/feedback-review`
- `/product/workflow-notifications`
- `/product/proactive-help`

Feature pages must use buyer-facing wording and avoid overclaiming. FAQ Management can claim owner-written Q&A, article-backed FAQ suggestions, article links, tags, entities, surface/context assignment, and published answers before fallback, while preserving canonical-answer priority. Team Access can claim Answerlattice workspace members, Answerlattice role permissions, email or owner-passcode login, owner reset, and force sign-out, while keeping access scoped to Answerlattice workspaces. Support Board can claim private owner/staff cards, internal notes, status history, selected support follow-up, assignee context, and governed answer-proposal handoff, but must not imply every ticket/signal syncs by default or that cards publish answers automatically. Feedback Review can claim private ratings, product-area feedback, feature requests, suggestions, owner review, Support Board handoff, and answer-proposal governance, but must not imply a public roadmap, public voting board, or automatic knowledge publishing. Workflow Notifications can claim Slack/email self-service setup, event filters, send-test delivery, compact health, digest-first behavior, critical alerts, and bounded delivery. Proactive Help can claim configured page-aware prompts tied to active triggers and approved support summaries, but must not imply always-on autonomous widget behavior. Each feature page must include a compact proof strip near the hero so the buyer sees how the feature connects to the widget, hosted help, tickets, and review queue before reading deeper workflow detail.

### 3. Use Cases (`/use-cases`)
**Goal:** Help small SaaS operators recognize when Answerlattice is useful.

**Sections:**
- Hero CTAs to demo/proof, plus compact proof strip for best pages, target teams, and before/after proof
- AI-built app launch
- Billing and plan questions
- Onboarding confusion
- Settings and configuration
- Release support
- Hosted help for public support
- Support fallback
- Errors and edge cases
- Each proof block includes a sample user question, generic answer, Answerlattice answer, and outcome.

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
- Role-specific and SEO landing pages must include proof strips that state the page-context, answer-order, and screenshot/context identity boundaries before the workflow diagrams.

### Positioning Guardrail

The homepage may use founder-relief language such as "SaaS", "digital products", "ship fast", "support chaos", and "users need correct answers", but it must not say Answerlattice "handles all support" or imply human outsourcing, helpdesk replacement, full AI autopilot, or automatic publishing. The accurate buyer promise is: Answerlattice keeps support knowledge and answers accurate through page context, approved answers, fallback signals, and human review. "AI-built SaaS" and "vibe-coded SaaS" can be used for use-case and campaign content, but the top-level positioning should not imply Answerlattice only works for SaaS.

### Non-Home Page Conversion Pattern

All non-home pages should preserve the current theme colors and use compact proof strips where the page could otherwise read as generic documentation. Proof strips must communicate one of these concrete jobs:

- what the product/page is for
- what implemented surfaces are connected
- what safety boundary applies
- what proof or placeholder state is being shown
- what the buyer should do next

Proof strips must not use fake customer logos, fake testimonials, unsupported usage metrics, or random decorative assets. If a number is only sample UI state, prefer a named status such as "Mapped", "Tracked", "Ready for review", or "Checklist active".

Mobile page headings and proof-strip text must wrap within the viewport. Non-home pages should keep the shared theme, but small-screen H1 sizing may be slightly tightened so buyer-facing claims remain readable without horizontal clipping.

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
- Each page includes an animated problem-to-reviewed-answer hub, setup sequence, concrete user question, generic answer, Answerlattice answer, owner-review explanation, and CTAs to demo/get-started
- Each page includes a final source-preparation CTA so high-intent traffic can move from example problem to Answerlattice-ready setup.

### 4. Agent Install Layer (`/install`)
**Goal:** Give product owners a copyable Answerlattice install packet for AI coding agents while preserving the implemented widget contract, hosted help scope, and rollout-gated API boundaries.

**Sections:**
- Primary CTA: copy AI install packet
- Secondary actions: download agent kit, copy AGENTS.md, copy CLAUDE.md, copy Cursor rule, copy Windsurf rule, verify installation
- Widget key and v1 script model
- Allowed origins
- Blocked routes
- Hosted help domains for docs, articles, FAQ, changelog, robots, and sitemap
- Custom help domain examples such as help.yourapp.com
- Safe page context
- User-initiated screenshot upload/paste boundary
- Runtime verification
- Framework handoff examples for Next.js, React, Vue, Plain HTML, Shopify-style, and Webflow
- Runtime verification mock: key, origin, blocked route, context marker, manual image input boundary, hosted help
- Compact install proof strip for one-script install, safe context shape, and dashboard verification
- Animated install flow and owner-control hub diagram
- Owner dashboard controls
- Configured proactive help should be referenced only as owner-controlled and capability-gated.

Routes:
- `/install`
- `/install/ai-agent`
- `/install/manual`
- `/install/frameworks/nextjs`
- `/install/frameworks/react`
- `/install/frameworks/vue`
- `/install/frameworks/plain-html`
- `/install/frameworks/shopify`
- `/install/frameworks/webflow`
- `/install.md`
- `/install/ai-agent.md`
- `/install/manual.md`
- `/install/contracts.md`
- `/install/frameworks/*.md`
- `/agents/answerlattice/AGENTS.md`
- `/agents/answerlattice/CLAUDE.md`
- `/agents/answerlattice/cursor.mdc`
- `/agents/answerlattice/windsurf.md`
- `/agents/answerlattice/skill/SKILL.md`
- `/agents/answerlattice/answerlattice-agent-kit.zip`

Stability:
- New installs must use `https://answerlattice.com/widget/v1/answerlattice-widget.js`.
- The v1 browser API is `window.AnswerlatticeWidget.setContext(context)` and `window.AnswerlatticeWidget.page(context)`.
- Safe context fields are `path`, `title`, `feature`, `workflow`, `role`, and `locale`.
- Browser context must never carry tenant IDs, store IDs, user IDs, emails, tokens, secrets, billing data, or private account metadata.
- The Public API remains secondary/account-gated unless enabled for the account.

### 4A. Integrations (`/integrations`)
**Goal:** Explain the production-ready workflow notification path without turning Answerlattice into a broad integration marketplace.

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
- Support Board guide
- Knowledge governance guide
- Product surface guide
- Workflow notification guide
- Proactive help guide
- Cost and cache guide
- Developer quickstarts, ROI calculator, proof pack, and security one-pager
- Links into demo, product, pricing, and get-started

### 6. Updates (`/updates`)
**Goal:** Show public product momentum without using dashboard-owned changelog routes that are reserved for Answerlattice workspaces.

**Sections:**
- Static public website update timeline
- Links to product, install, resources, and demo
- Calm factual update language only

### 7. Demo (`/demo`)
**Goal:** Let visitors understand Answerlattice without creating an account.

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
- Paid plan changes, transactions, invoices, and support-credit top-ups are handled through Answerlattice Billing with product-scoped Razorpay requests

### 9. Security (`/security`)
**Goal:** Give buyers a concise trust page without overclaiming compliance.

**Sections:**
- Security-at-a-glance facts for data boundary, runtime database, widget key storage, widget placement, answer authority, expensive request limits, scheduler output, and product boundary
- Animated security-boundary diagram for allowed origins, safe page context, blocked routes, workspace scope, hosted help boundary, compiled context boundary, and owner-approved authority
- Status snapshots for workspace scope, safe context, origin/route controls, hosted help boundary, ticket context, owner approval, bounded logging, and product separation
- Runtime context safety: public widget bundles contain only approved public-safe context; drafts, tickets, audit logs, API keys, raw signals, and billing internals stay out.
- Tenant-scoped data and workspace isolation
- Safe widget context that is bounded to support relevance and never treated as trusted identity
- User-initiated screenshot attachments only; no automatic host-app capture or DOM scraping
- Origin and blocked-route controls for widget placement
- Hosted help domain registry for anonymous public docs/FAQ/changelog without exposing tickets or workspace internals
- Safe ticket debugging context that is capped, sanitized, ticket-scoped, and captured only when a ticket is created
- Owner-approved authority through canonical answers, published owner FAQ/custom answers, drafts, proposals, and drift checks
- Cost and abuse controls through rate-limited widget endpoints, cache freshness checks, and summary-backed dashboards
- Separate Answerlattice product infrastructure with client products treated as integrations, not hardcoded dependencies
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
- Manual owner Q&A, article-backed FAQ generation, source linking, and review
- Support Board as a private owner/staff workboard, with sync/nightly prep called rollout-gated when mentioned
- Slack/email workflow notifications and adapter boundaries
- Configured proactive help and widget call gating
- Release-aware answer review
- Pricing model
- Answerlattice product boundary

### 11. About (`/about`)
**Goal:** Build trust. Explain the "why" behind Answerlattice.

**Sections:**
- Problem statement for fast-built SaaS products
- 5 belief cards around correct answers, page context, measured fallback, founder approval, and coverage
- Answerlattice operating principles

### 12. Contact (`/contact`)
**Goal:** Let qualified buyers, founders, partners, and security reviewers contact Answerlattice without crossing product data boundaries.

**Sections:**
- Contact hero explaining what to include: product URL, repeated user questions, and first stuck page
- Inquiry form for setup, demo, pricing, partnership, security, and other requests
- Direct email (hello@answerlattice.com)
- Partnerships (partners@answerlattice.com)
- Security one-pager path
- Privacy/terms consent and no-secrets warning

**Runtime:**
- Form submits to an Answerlattice-owned public API route
- Anonymous submissions are rate-limited and honeypot-protected
- Accepted submissions add one Answerlattice Firestore write; normal browsing remains static

### 13. Get Started (`/get-started`)
**Goal:** Self-service onboarding flow for a new Answerlattice workspace.

**Sections:**
- Best-fit criteria for live/near-live SaaS products
- Google sign-in and product details form
- Product URL, support email, billing model, and main product pages
- What-you-need-before-signup copy
- 7-step first-session checklist

## Conversion Tracking

The website may emit optional GA/measurement events when `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MEASUREMENT_ID` or `NEXT_PUBLIC_GA_MEASUREMENT_ID` is configured. Tracking is client-only and does not write to Firestore.

## Agent-Readable Website Context

Answerlattice product domains must serve Answerlattice-specific agent context instead of inheriting generic platform framing.

Routes:

- `/llms.txt` — short product definition, key public pages, product areas, and agent guidance
- `/llms-full.txt` — extended route map, runtime boundaries, action boundaries, and machine-readable surfaces
- `/sitemap.xml` — product-domain route inventory from `ANSWERLATTICE_PUBLIC_PAGES` and product feature routes
- `/robots.txt` — product-domain crawler policy with explicit AI/search crawler allow rules and LLM context links

Rules:

- Define Answerlattice as the Governed Answer Infrastructure for SaaS Support.
- State that Answerlattice is not a helpdesk replacement, chatbot autopilot, documentation CMS, compliance platform, or autonomous publisher.
- Route agents to public pages, demo, install, pricing, security, FAQ, resources, updates, sitemap, and robots.
- Route coding agents that need implementation details to `/install/ai-agent.md`, `/install/contracts.md`, and `/agents/answerlattice/answerlattice-agent-kit.zip`.
- Do not imply public agents can mutate customer workspaces, canonical answers, tickets, widget settings, billing, or private knowledge.
- Every public route in `ANSWERLATTICE_PUBLIC_PAGES` must emit page-level WebPage and BreadcrumbList JSON-LD, either directly or through the shared page wrapper.
- Homepage structured data must reference the active public route registry so the WebSite graph, sitemap, and agent context do not drift.
- Future route changes must update `ANSWERLATTICE_PUBLIC_PAGES`, sitemap/robots/LLM context as needed, and pass `npm run verify:agent-readiness`.
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

Comparable support platforms commonly expose product depth, pricing, demo/start actions, install/developer setup, integrations, resources, security/trust, and updates. Answerlattice now exposes integrations only for the implemented Slack/email workflow notification path. Broader workflow adapters remain controlled rollout, and the site avoids unsupported pages such as a live status page because there is no implemented status/incident backend yet.

Final product-suite polish follows the observed pattern from product-led sites where the main nav exposes product families, each family can stand as its own landing page, and resource/use-case pages cross-link back into those families. Answerlattice applies that pattern without adding runtime reads, unimplemented integrations, or unsupported public docs routes.

The mobile hamburger mirrors the same information hierarchy in a right-side drawer: Product Overview, Product Areas, Product Features, and an Other card for Use Cases, Demo, Install, Pricing, Resources, Updates, and Contact. The mobile drawer must open from right to left, include backdrop/close behavior, lock page scroll while open, and leave safe-area bottom space so the primary setup CTA is not clipped on phone browsers.

Route naming must avoid conflicts with Answerlattice dashboard roots. Public website learning content uses `/resources` and public release communication uses `/updates`; dashboard-owned support routes keep `/docs`, `/help`, `/changelog`, and `/release-notes`.

---

## Design System

| Element | Value |
|---------|-------|
| Visual direction | Verdigris Answer Layer |
| Primary color | Deep teal (#0f766e) |
| Hover color | Dark teal (#115e59) |
| Signal accent | Teal 300 (#5eead4) |
| Background | Dark navy (#0a0a1a) |
| Surface | White 3% opacity (`rgba(255,255,255,0.03)`) |
| Border | White 6% opacity (`rgba(255,255,255,0.06)`) |
| Text primary | White (#ffffff) |
| Text body | Soft lavender (#d6d6ef) |
| Text secondary | Muted lavender (#a0a0c0) |
| Text muted | Deep gray (#6b6b8a) |
| Success | Emerald 500 (#10b981) |
| Warning | Amber 500 (#f59e0b) |
| Danger | Red 500 (#ef4444) |
| Cards | White 3% opacity + 6% border |
| Font | Inter (system fallback) |
| Border radius | 0.75rem (cards), 0.5rem (buttons) |
| Max content width | 6xl (1152px) |

The website should stay dark, canonical, and infrastructure-grade. Verdigris/teal is the action and signal accent; deep navy remains the page and PWA theme background so browser chrome does not become a bright band.

Answerlattice website CSS must remain root-loadable and product-scoped. Clean-cache public routes should receive Tailwind utilities, dark background, page spacing, and reveal-motion styles from the root `app/layout.css` bundle, while selectors that change colors, layout rhythm, or motion must stay scoped to `.answerlattice-site`, `.al-home-flow`, `.al-page-flow`, or explicit Answerlattice classes.

---

## SEO

| Page | Title | Description |
|------|-------|-------------|
| `/` | Answerlattice — Page-Aware Support Answers for SaaS and Digital Products | Answerlattice helps SaaS and digital-product teams turn docs, FAQs, release notes, screenshots, recordings, and repeated questions into approved page-aware answers for the app widget, hosted help, and support review queue. |
| `/product` | Product \| Answerlattice | Answerlattice is the support layer for SaaS and digital products: team access, page-aware widget, hosted help, feedback review, Support Board, custom owner Q&A, approved answers, and reviewable support gaps. |
| `/product/launch-setup` | Set Up Support \| Answerlattice | Create an Answerlattice workspace, add team access, import starter knowledge, map product pages, and verify the widget before launch. |
| `/product/team-access` | Team Access \| Answerlattice | Manage Answerlattice workspace members, roles, custom permissions, owner reset, and force sign-out with workspace-scoped access. |
| `/product/page-aware-widget` | In-App Help Widget \| Answerlattice | Install Answerlattice as a page-aware widget with safe context, explicit screenshot attachments, allowed origins, blocked routes, hosted help, canonical answers, and owner FAQ answers before fallback. |
| `/product/support-control` | Help Center and Tickets \| Answerlattice | Operate Answerlattice hosted help, docs, FAQ, custom owner Q&A, changelog, tickets, feedback, Support Board, conversations, and weekly support review from one support layer. |
| `/product/knowledge-governance` | Review Approved Answers \| Answerlattice | Review approved answers, stale support, repeated-question signals, coverage KPI, and trust/readiness metrics. |
| `/product/support-board` | Support Board \| Answerlattice | Private owner/staff support cards, internal notes, status history, selected follow-up, and answer-proposal handoff. |
| `/product/feedback-review` | Feedback Review \| Answerlattice | Collect ratings, product feedback, feature requests, and suggestions, then review useful items as support signals before board or answer-proposal handoff. |
| `/use-cases` | Use Cases \| Answerlattice | Answerlattice use cases for AI-built SaaS apps across billing, onboarding, settings, releases, errors, and support fallback. |
| `/use-cases/ai-built-saas` | AI-Built SaaS \| Answerlattice | Support path for AI-built SaaS apps with page-aware widget, hosted help, custom owner Q&A, approved answers, ticket fallback, and reviewable support gaps. |
| `/use-cases/vibe-coded-saas` | Vibe-Coded SaaS \| Answerlattice | Canonicalized campaign/search alias for the AI-built SaaS use case. |
| `/use-cases/founders` | Support for SaaS Founders \| Answerlattice | Page-aware support, approved answers, and support-gap review for solo founders launching AI-built SaaS apps. |
| `/use-cases/support-teams` | Support Teams \| Answerlattice | Reduce repeated tickets with approved answers, ticket fallback, private Support Board follow-up, and a signal-to-knowledge queue. |
| `/use-cases/product-teams` | Product Teams \| Answerlattice | See which product surfaces create support friction, stale answers, and review work after releases. |
| `/use-cases/engineering` | Engineering Teams \| Answerlattice | A support layer with safe page context, widget controls, and governed retrieval. |
| `/page-aware-support-widget` | Page-Aware Support Widget \| Answerlattice | A page-aware support widget for AI-built SaaS that uses safe product context, optional screenshot attachments, canonical answers, and owner FAQ answers before fallback. |
| `/hosted-help-center-for-saas` | Hosted Help Center for SaaS \| Answerlattice | Hosted SaaS help center for AI-built SaaS with docs, owner FAQ, changelog content, and the same knowledge powering the app widget. |
| `/support-widget-for-solo-founders` | Support Widget for Solo Founders \| Answerlattice | A support widget for solo founders shipping with AI who need page-aware help, optional screenshot context, hosted docs, owner Q&A, ticket fallback, and approved answers. |
| `/demo` | Demo \| Answerlattice | Try a static page-aware support demo with approved answers, fallback, and support gap states. |
| `/install` | Install Answerlattice with your AI coding agent \| Answerlattice | Copy the Answerlattice agent packet, install the v1 widget once, pass safe page context, block sensitive routes, and verify the integration. |
| `/pricing` | Pricing \| Answerlattice | Founder-friendly INR pricing, beta setup, support credits, and paid Answerlattice plans for SaaS and digital-product teams. |
| `/resources` | Resources \| Answerlattice | Answerlattice resources for founders launching support for SaaS apps and digital products: demo, fit, team access, feedback review, Support Board, install, screenshot boundaries, pricing, safety, and setup. |
| `/updates` | Updates \| Answerlattice | Product updates for Answerlattice website, launch setup, team access, feedback review, Support Board, widget management, and knowledge governance. |
| `/security` | Security \| Answerlattice | How Answerlattice protects support knowledge, widget context, screenshot boundaries, ticket debugging context, role-scoped team access, hosted help domains, and customer workspaces. |
| `/security-one-pager` | Security and Ops One-Pager \| Answerlattice | Shareable Answerlattice security and operations summary for allowed origins, blocked routes, safe context, team roles, manual screenshots, hashed keys, owner approval, and rate limits. |
| `/faq` | FAQ \| Answerlattice | Answers to common questions founders ask about Answerlattice setup, team access, digital products, page-aware support, feedback review, Support Board, owner Q&A, screenshots, pricing, tickets, and data handling. |
| `/about` | About \| Answerlattice | Answerlattice helps SaaS and digital-product teams keep support answers correct as products change. |
| `/contact` | Contact \| Answerlattice | Contact Answerlattice for setup help, demos, pricing, security questions, or partnership requests for your SaaS app or digital product. |
| `/get-started` | Get Started \| Answerlattice | Create your Answerlattice workspace, add your app, invite the first team members, pick pages where users get stuck, and get a widget key for page-aware support. |
| `/privacy-policy` | Privacy Policy \| Answerlattice | How Answerlattice handles product support knowledge, account information, team access data, and widget data. |
| `/terms-of-service` | Terms of Service \| Answerlattice | Terms for using Answerlattice website, dashboard, widget, and support knowledge features. |

OpenGraph and Twitter cards configured in layout.tsx with `public/answerlattice-og-image.png`.
Answerlattice product domains must serve their own `/sitemap.xml` and `/robots.txt`; do not rely on a platform sitemap.
Answerlattice public routes emit server-rendered Organization/WebSite/SoftwareApplication/WebPage/BreadcrumbList JSON-LD. The FAQ route also emits FAQPage JSON-LD. Route-level structured data must stay tied to `ANSWERLATTICE_PUBLIC_PAGES`.

---

## Conversion Funnel

```
Visitor lands on homepage
  ↓
Reads launch-ready support hero + embedded demo -> "Start support setup" or "Try page-aware demo"
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
| 2026-05-21 | 1.1.0 | Repositioned website for small SaaS self-serve funnel, added demo/security/FAQ/legal pages, Answerlattice sitemap/robots, structured data, and removed enterprise/private-beta-first spec language |
| 2026-05-21 | 1.1.1 | Restored implemented Answerlattice engine pillars on homepage and product page without claiming deferred API/integration pillar |
| 2026-05-21 | 1.1.2 | Added homepage system coverage section from the codebase inventory |
| 2026-05-21 | 1.1.3 | Added product preview plus public use-cases, integrations, resources, and updates pages based on website benchmark gaps and implemented Answerlattice capabilities |
| 2026-05-21 | 1.1.4 | Replaced public integrations positioning with widget-first install positioning and removed API/adapters from buyer-facing website package copy |
| 2026-05-21 | 1.1.5 | Expanded the security page from a trust-page reference pattern with Answerlattice-specific facts, widget runtime controls, tenant isolation, cost controls, product separation, and responsible disclosure |
| 2026-05-22 | 1.1.6 | Refreshed website to match current Answerlattice implementation: hosted help, FAQ generation/management, product-scoped billing/support credits, cache freshness, and separate Firebase/product boundaries |
| 2026-05-22 | 1.1.7 | Added buyer-facing custom help domain positioning and safe ticket debugging context across homepage, product, install, security, FAQ, privacy, and updates copy |
| 2026-05-22 | 1.1.8 | Applied self-sell website feedback: outcome-led hero, embedded generic-vs-Answerlattice demo, buyer qualification, setup funnel, trust strip, pricing credit clarity, objection handling, optional no-Firestore conversion events, and three SEO landing pages |
| 2026-05-22 | 1.1.9 | Added screenshot-led product proof after the hero and on `/product`, using responsive HTML/CSS product scenes instead of static screenshots so the website stays privacy-safe, responsive, and zero-Firebase-cost |
| 2026-05-22 | 1.2.0 | Applied positioning review: hero now leads with page-aware support truth, demo is primary CTA, homepage includes a support truth loop, comparison distinguishes chatbot/helpdesk/KB/Answerlattice, FAQ defines canonical answers and non-chatbot positioning, and role-specific use-case pages were added |
| 2026-05-22 | 1.2.1 | Added founder-relief positioning without helpdesk overclaiming: homepage hero now leads with revenue/support-accuracy language while preserving approved-answer, page-aware, fallback-signal, and human-review guardrails |
| 2026-05-22 | 1.2.2 | Redesigned presentation quality for the public site: demo now uses top product-surface tabs and a large product canvas, product proof uses clearer dashboard-style tabs, and widget content moved into a bento-style install/runtime/governance grid |
| 2026-05-22 | 1.2.3 | Added landing-style product area pages for Launch Setup, Page-Aware Widget, Support Control, and Knowledge Governance so each major product part can be understood and sold independently |
| 2026-05-22 | 1.2.4 | Final product-suite polish: header Product dropdown, homepage product-area section, resources product-area hub, and SEO/use-case product-area cross-links make the current product easier to evaluate without adding Firebase cost |
| 2026-05-23 | 1.2.5 | Added Answerlattice-specific `llms.txt` and `llms-full.txt` routes so product-domain agents read Answerlattice product context, non-goals, and mutation boundaries |
| 2026-05-23 | 1.2.6 | Added server-rendered WebPage/BreadcrumbList JSON-LD coverage across public Answerlattice routes, explicit AI/search crawler robots rules, route-registry Website graph references, and `verify:agent-readiness` coverage |
| 2026-05-24 | 1.2.7 | Reframed public copy for AI-built SaaS founders, moved the page-aware demo into first-proof position, simplified first-visit vocabulary, added `/use-cases/ai-built-saas`, and kept `/use-cases/vibe-coded-saas` as a canonicalized campaign/search alias rather than the primary ICP label |
| 2026-05-24 | 1.2.8 | Refined the shared Answerlattice support knowledge map diagram with a logo-only center, Answerlattice-colored ripple rings, dotted SVG paths, homepage-style pulse strokes, and border-only output highlights |
| 2026-05-24 | 1.2.9 | Expanded the same animated diagram language across Answerlattice workflow-heavy sections: homepage loops/sequences, product-area and feature workflows, connected surfaces, SEO/use-case pages, install, security, resources, engine pillars, and system coverage |
| 2026-05-24 | 1.2.10 | Added non-diagram proof blocks for text compression: homepage fit decisions, widget state snapshots, trust controls, use-case before/after examples, and security status snapshots |
| 2026-05-24 | 1.2.11 | Aligned reusable Answerlattice sequence-diagram endpoints and output-highlight timing with the shared source-map reference while keeping the Answerlattice logo, ripple, and color treatment unchanged |
| 2026-05-24 | 1.2.12 | Converted reusable workflow sequence diagrams into the same input column, logo center, and output column layout used by Answerlattice source-map diagrams |
| 2026-05-25 | 1.2.15 | Added the day-one launch pack to homepage and Product so quickstarts, starter surfaces, import templates, install verification, ROI/proof, and security handoff are visible in the main buyer path without adding another public route |
| 2026-05-25 | 1.2.16 | Updated existing widget/install/security/FAQ/SEO pages to present user-initiated screenshot attachments as part of the page-aware widget while explicitly rejecting automatic screenshot capture or DOM scraping |
| 2026-05-26 | 1.2.17 | Added Team Access to the public website story with a dedicated `/product/team-access` page and updates to setup, security, pricing, resources, FAQ, privacy, metadata, and LLM context |
| 2026-05-26 | 1.2.18 | Formalized the Verdigris Answer Layer visual direction with shared theme tokens, deep-navy PWA/browser theme color, and documented success/warning/danger colors |
| 2026-05-27 | 1.2.19 | Removed client-specific public relationship framing from Answerlattice website pages, route docs, and agent context so Answerlattice presents as an independent product |
| 2026-05-27 | 1.2.20 | Added Answerlattice-owned contact form requirements and mobile hamburger grouping/safe-area requirements |
| 2026-05-27 | 1.2.21 | Added Support Board public-site requirements: dedicated product-feature page, Support Control/FAQ/Resources/Updates copy, route metadata, and LLM context with manual-first private workboard boundaries |
| 2026-05-27 | 1.2.22 | Added Answerlattice Agent Install Layer requirements: generated install pages, Markdown mirrors, public agent files, dashboard AI packet actions, and the stable v1 widget contract URL |
| 2026-05-27 | 1.2.23 | Updated the mobile hamburger requirement to use a right-side drawer with backdrop, close handling, and scroll lock |
| 2026-05-27 | 1.2.24 | Synced the install-route requirements to the live generated public install pages and Markdown contract mirrors after the end-to-end website audit |
| 2026-05-31 | 1.2.25 | Applied the shared ChatGPT conversation's corrected homepage strategy: the hero now leads with launch-ready support for SaaS founders, setup is the primary CTA, and the public claim separates generated support knowledge from owner-managed tickets, changelog publishing, feedback, ratings, and feature requests |
| 2026-05-31 | 1.2.26 | Added Feedback Review to the main Answerlattice website as a dedicated product-feature page and homepage/product preview tab with private review, Support Board handoff, and no-public-roadmap guardrails |
| 2026-06-01 | 1.2.27 | Reworked homepage requirements around a fresh conversion-first product story: clearer page-aware support-answer hero, inline sample workspace proof, conversion proof band, earlier product proof/demo, lower Pre-Onboarding source-prep placement, and final asset-preparation requirements |
| 2026-06-01 | 1.2.28 | Extended the conversion-first pattern to the rest of the public website: reusable proof strips, clearer hero CTAs on product/product-area/feature/SEO/setup/trust pages, grouped FAQ sections, safer placeholder-state wording, and non-home asset requirements |
| 2026-06-01 | 1.2.29 | Added clean-cache CSS loading requirements and completed wording cleanup around buyer-facing product-page terminology and product-area labels |
| 2026-06-02 | 1.2.30 | Broadened top-level positioning from SaaS-only language to "SaaS and digital products" while keeping AI-built SaaS as a targeted use-case path |
| 2026-06-02 | 1.2.31 | Completed the rendered dedupe and positioning sweep across all public routes: product-feature, SEO/use-case, and resources templates no longer repeat long page-body copy, and Resources/Pricing/ROI/FAQ/Proof now use top-level SaaS plus digital-product framing |

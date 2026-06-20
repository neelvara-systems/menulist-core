# AnswerLattice Website — Spec

> **Version:** 1.2.86
> **Last Updated:** 2026-06-18
> **Audience:** CEO / PM / Marketing

---

## Purpose

Public-facing marketing website for AnswerLattice at `answerlattice.com`. Serves as the primary discovery, demo, pricing, and onboarding surface for founder-led SaaS and digital-product teams considering AnswerLattice as their first 24/7 support layer: launch setup, in-product widget, hosted help, FAQs, changelog, ticket fallback, feedback review, private Support Board follow-up, approved answers, and reviewable support gaps.

---

## Target Audience (ICP)

| Attribute | Value |
|-----------|-------|
| Role | AI-native SaaS founder, solo digital-product founder, technical founder, small product operator, dev studio owner |
| Business stage | Live, beta, or near-launch SaaS app or digital product with starter support truth |
| Release cadence | Frequent product, plan, onboarding, billing, or settings changes |
| Team size | Founder-led or small team before a dedicated support team |
| Pain | Support answers drift as the product changes, and users need help on exact product pages |
| Current tools | Existing docs, FAQs, changelogs, tickets, AI-generated setup notes, or rough starter answers |

Public fit and setup copy must not imply founders need existing support volume before starting. Eligibility language should include live, beta, and near-launch products with a working app, launch path, and starter support truth. Use "expected or recurring questions" when describing launch preparation; reserve "repeated questions" for specific FAQ, support-gap, and review-loop capabilities rather than buyer qualification gates.

## Brand and Domain Requirements

- Public product name: `AnswerLattice`
- Internal route/code slug: `answerlattice` unless a separate tested runtime migration changes it
- Production canonical host: `answerlattice.com`
- Preview / QA host: `ecomsai.com`
- Local dev prefix: `/__answerlattice`
- Legacy Canonica public hosts must redirect to the active AnswerLattice public host instead of serving duplicate public brand content.
- Public copy, metadata, OpenGraph, Twitter cards, schema, header, footer, resources, comparison pages, developer docs, robots, sitemap, and LLM context must use `AnswerLattice` as the standalone brand.
- `Canonica` may remain only in internal historical docs, migration notes, or code names where renaming is not part of the tested runtime plan; it must not appear in rendered public AnswerLattice site copy.

---

## Pages & Content Architecture

### 1. Homepage (`/`)
**Goal:** Communicate what AnswerLattice is in < 5 seconds: a complete first support layer for founder-led SaaS and digital products. Drive to self-service setup first, with the product simulation, install path, and product-suite pages as supporting proof paths.

**Sections:**
1. **Hero** — Centered founder-readable promise: "Support your product users without hiring a support team." The eyebrow should make the answer-order contract immediate: approved answers before fallback. The supporting copy must explain that scattered product knowledge becomes reviewed support knowledge, approved answers are served first, fallback opens only when coverage is missing, and each miss becomes review work. Keep in-product help, hosted help, FAQs, changelog, ticket fallback, feedback, approved answers, and reviewable gaps visible without claiming outsourced support, full helpdesk replacement, or autonomous support.
2. **Support Suite** — Four compact suite cards for in-app support, hosted help, ticket fallback, and owner-approved answers. This is the homepage's clearest product-suite framing and must not turn into a helpdesk or chatbot replacement claim.
3. **Support Surfaces in Motion** — Scroll-led product surface story showing the complete support layer: owner inputs, in-app help, hosted help, gaps/fallback, and the review loop. This section exists to make the product feel broader than Q&A or a chatbot while keeping the copy founder-readable.
4. **Product Overview** — Feature-wise product cards for in-app widget, hosted help, tickets, FAQ, changelog, feedback, Support Board, knowledge intake, and workflow notifications.
5. **Support Improvement Loop** — Large loop diagram: user asks, approved answers checked, trusted help served, fallback ticket if missing, repeated gaps become review work, owner approves improvement.
6. **Install Surface Quickstarts** — Install confidence section for the widget contract, framework-specific setup paths, safe context rules, and verification before launch.
7. **AI-Built SaaS Fit** — Compact fit strip for AI-built SaaS, solo founders, technical founders, and small SaaS teams launching faster than traditional support processes.
8. **Positioning Boundary** — Three-card boundary: not a chatbot, not static docs, not a full helpdesk.
9. **Pricing Preview** — Starter/Growth/Studio guidance and beta setup note.
10. **Objections / FAQ Preview** — Top setup, safety, pricing, and fit objections.
11. **CTA** — Final conversion panel with `Create workspace` as primary and demo as secondary.

The homepage must stay compressed, diagram-controlled, and product-led: one hero product scene with capability proof, one support-suite section, the sticky support-surface story, one feature-wise product overview card section, one large support-improvement loop diagram, one install-confidence section, concise fit/positioning/pricing/FAQ sections, and final CTA. Detailed setup path, trust cards, founder review proof, and category comparison belong on Product, feature, resource, security, and comparison pages instead of returning as separate homepage sections. Pre-Onboarding/source-preparation content stays available through Resources, Get Started, footer, and its dedicated route, but should not add another homepage section unless the primary funnel becomes too thin.

Visual assets for the homepage and feature pages must be planned through `src/content/answerlatticePublic/visualAssets.ts` before generation or capture. Current stable PNG slots are generated product-scene assets at `1440 x 1200`; final screenshots or GIFs may replace them only when they preserve the same product-truth, safe-context, fallback, and owner-review meaning. Concept illustrations may use inline SVG when the subject is abstract, such as safe context, install verification, source-to-answer flow, governance loop, or category positioning. Decorative mascot/cartoon assets, fake customers, fake metrics, and unsupported helpdesk/chatbot claims are not part of the AnswerLattice public-site style.

### 2. Product (`/product`)
**Goal:** Explain the product in founder/operator language while preserving the real AnswerLattice architecture.

**Sections:**
- Hero with SaaS and digital-product support-layer promise, setup/demo/source-prep CTAs, and compact proof strip explaining what AnswerLattice is, what it connects, why it converts, and what stays safe
- Product area cards that route to landing-style subpages for Set Up Support, In-App Help Widget, Help Center and Tickets, and Review Approved Answers
- Product feature directory that exposes the support-system details behind team access, knowledge intake, knowledge base, FAQ management, changelog, tickets, Support Board, feedback review, workflow notifications, and proactive help without making the homepage longer
- Team access should be presented as production readiness inside setup, security, pricing, and a dedicated feature page because it affects workspace trust and buyer evaluation.
- Connected support-suite section that shows setup, in-app help, hosted help, tickets, feedback, and approved-answer review as one product system before the page moves into narrower feature detail.
- Category comparison section that separates AnswerLattice from chatbots, helpdesks, and static knowledge bases without unsupported competitor-specific claims.
- Day-One Launch Pack section that packages quickstarts, starter surfaces, import templates, install verification, ROI/proof, and security handoff as the practical first rollout layer
- Product scene reused from the homepage so buyers see the owner workflow before the architecture deep dive
- AnswerLattice Engine section:
  - Your product structure
  - Approved answers first
  - Stale answer review
  - Repeated-question queue
- 5 feature deep-dive sections:
  - Badge (Launch Setup / Support Control / Knowledge Governance / Release Awareness / Support Gap Loop)
  - Title + description
  - 5 capability bullet points
- Product page should frame custom help domains as buyer-visible value, owner answers as a fast reviewed shortcut for repeated questions, and ticket debugging context as support reliability, not as raw console logging.
- Product page should include runtime readiness as a core reliability section: Firestore source of truth, approved public widget context, private server context, cache-first delivery, owner-visible bundle readiness, workspace-local review, and controlled agent-context rollout. Do not create a standalone MCP page while MCP remains rollout-gated.
- Bottom CTA

Product-area subpages:
- `/product/launch-setup`
- `/product/page-aware-widget`
- `/product/support-control`
- `/product/knowledge-governance`

Each subpage must feel like its own landing page, not a thin documentation page: hero, horizontal product-area tabs, connected support-suite framing, compact proof strip, large browser-style product canvas, bento benefit grid, animated workflow sequence, evaluation strip for setup/security/category-fit checks, and CTA. These pages stay static and may only claim implemented AnswerLattice behavior.

Each product-area subpage must include the same proof-and-action treatment above the product canvas: Create workspace, demo, source-preparation CTA, and proof items for page context, approved answers, owner review, and connected runtime surfaces.

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

Feature pages must use buyer-facing wording and avoid overclaiming. FAQ Management can claim owner-written answers, article-backed FAQ suggestions, article links, tags, entities, surface/context assignment, and published answers before fallback, while preserving approved-answer priority. Team Access can claim AnswerLattice workspace members, AnswerLattice role permissions, email or owner-passcode login, owner reset, and force sign-out, while keeping access scoped to AnswerLattice workspaces. Support Board can claim private owner/staff cards, internal notes, status history, selected support follow-up, assignee context, and reviewed answer handoff, but must not imply every ticket/signal syncs by default or that cards publish answers automatically. Feedback Review can claim private ratings, product-area feedback, feature requests, suggestions, owner review, Support Board handoff, and answer-proposal review, but must not imply a public roadmap, public voting board, or automatic knowledge publishing. Workflow Notifications can claim Slack/email self-service setup, event filters, send-test delivery, compact health, digest-first behavior, critical alerts, and bounded delivery. Proactive Help can claim configured prompts tied to active triggers and approved support summaries, but must not imply always-on autonomous widget behavior. Each feature page must include a compact proof strip near the hero, a connected-suite section after the detailed workflow, and a buyer evaluation strip for setup path, security boundary, and category comparison so the buyer sees how the feature connects to setup, widget, hosted help, tickets, feedback, review queue, and product-fit checks before the FAQ/CTA.

### 3. Use Cases (`/use-cases`)
**Goal:** Help small SaaS operators recognize when AnswerLattice is useful.

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
- Each proof block includes a sample user question, generic answer, AnswerLattice answer, and outcome.

Role-specific pages:
- `/use-cases/ai-built-saas`
- `/use-cases/vibe-coded-saas` (campaign/search alias only)
- `/use-cases/founders`
- `/use-cases/small-saas-teams`
- `/use-cases/studios-agencies`
- `/use-cases/support-teams`
- `/use-cases/product-teams`
- `/use-cases/engineering`

Rules:
- Use implemented in-app support, approved answer, fallback, stale-answer review, signal, and widget behavior only
- Do not claim broad helpdesk integrations or public API availability on these pages
- Role-specific and SEO landing pages must include proof strips that state the page-context, answer-order, and screenshot/context identity boundaries before the workflow diagrams.

### Positioning Guardrail

The homepage may use founder-relief language such as "SaaS", "digital products", "ship fast", "24/7", "support pressure", and "product users need trusted support", but it must not say AnswerLattice "handles all support" or imply human outsourcing, helpdesk replacement, full AI autopilot, or automatic publishing. The accurate buyer promise is: AnswerLattice gives founders a 24/7 support layer through an in-app widget, hosted help, FAQs, changelog, ticket fallback, feedback review, approved answers, and a human review loop. "AI-built SaaS" and "vibe-coded SaaS" can be used for use-case and campaign content, but the top-level positioning should not imply AnswerLattice only works for SaaS.

### Non-Home Page Conversion Pattern

All non-home pages should preserve the current theme colors and use compact proof strips where the page could otherwise read as generic documentation. Proof strips must communicate one of these concrete jobs:

- what the product/page is for
- what implemented surfaces are connected
- what safety boundary applies
- what proof or placeholder state is being shown
- what the buyer should do next

Proof strips must not use fake customer logos, fake testimonials, unsupported usage metrics, or random decorative assets. If a number is only sample UI state, prefer a named status such as "Mapped", "Tracked", "Ready for review", or "Checklist active".

Any non-home page section that looks like a product screen must use the shared screen-asset registry and preserve the current `1440 x 1200` slot dimensions unless the asset-preparation document is updated at the same time. Diagrams, proof strips, status cards, and flow visuals can remain HTML/SVG because they are explanatory website components rather than screenshot placeholders.

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
- Each page includes an animated problem-to-reviewed-answer hub, setup sequence, concrete user question, generic answer, AnswerLattice answer, owner-review explanation, and CTAs to demo/get-started
- Each page includes a final source-preparation CTA so high-intent traffic can move from example problem to AnswerLattice-ready setup.

### 4. Agent Install Layer (`/install`)
**Goal:** Give product owners a copyable AnswerLattice install packet for AI coding agents while preserving the implemented widget contract, hosted help scope, and rollout-gated API boundaries.

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
**Goal:** Explain the production-ready workflow notification path without turning AnswerLattice into a broad integration marketplace.

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
- Product-area entry cards for Set Up Support, In-App Help Widget, Help Center and Tickets, and Review Approved Answers
- Animated resource path from evaluation to rollout
- Start guide
- Widget install guide
- Support Board guide
- Approved answer review guide
- Product surface guide
- Workflow notification guide
- Proactive help guide
- Cost and cache guide
- Developer quickstarts, ROI calculator, proof pack, and security one-pager
- Links into demo, product, pricing, and get-started
- Resource cards are sourced from `ANSWERLATTICE_RESOURCE_GROUPS` in `src/content/answerlatticePublic/` so the hub, sitemap, LLM context, and analytics labels do not drift.
- Resource article routes are sourced from `ANSWERLATTICE_RESOURCE_ARTICLES` in `src/content/answerlatticePublic/`.
- Resource article pages must use the shared article renderer, Article/BreadcrumbList JSON-LD, FAQPage JSON-LD only when visible FAQ copy exists, and resource analytics with no Firestore writes.
- Article copy must stay scoped to implemented behavior: in-app support, approved answers before fallback, safe page context, reviewable support gaps, human-reviewed answer changes, launch-ready support setup, hosted help, support credits, and runtime safety.
- Article copy must not claim perfect answer behavior, guaranteed ticket reduction, autonomous support, helpdesk replacement, public voting, automatic publishing, SOC/GDPR status, ratings/reviews, or competitor rankings.

Resource article routes:
- `/resources/launch-support-checklist`
- `/resources/pre-onboarding-source-package`
- `/resources/safe-page-context`
- `/resources/widget-install-verification`
- `/resources/approved-answers-before-fallback`
- `/resources/support-board-workflow`
- `/resources/feedback-review-workflow`
- `/resources/support-credits-and-pricing`
- `/resources/hosted-help-setup`
- `/resources/support-runtime-safety`

### 5A. Developer Docs (`/developers`)
**Goal:** Give implementation teams enough public setup context to wire the existing v1 widget safely without exposing private dashboard, API, or workspace routes.

Routes:
- `/developers`
- `/developers/safe-page-context`
- `/developers/widget-verification`

Rules:
- Static content only
- No Firebase reads
- No private API examples beyond the public widget contract
- Safe page-context docs must show allowed fields and explicitly reject tenant IDs, store IDs, user IDs, emails, tokens, secrets, billing data, and private account metadata
- Widget verification must remain tied to the implemented public v1 script URL and dashboard verification flow
- Developer docs are sourced from `ANSWERLATTICE_DEVELOPER_DOCS` in `src/content/answerlatticePublic/`

### 5B. Comparisons (`/comparisons`)
**Goal:** Help buyers compare categories without unsupported competitor claims, fake ratings, or replacement positioning.

Routes:
- `/comparisons`
- `/comparisons/answerlattice-vs-chatbots`
- `/comparisons/answerlattice-vs-helpdesks`
- `/comparisons/answerlattice-vs-knowledge-bases`

Rules:
- Compare product categories, not named competitors
- No Review or AggregateRating schema
- No guaranteed ticket reduction, no autonomous-support claims, and no helpdesk-replacement claims
- Each comparison must route back to product areas, demo, install, pricing, or get-started
- Comparison content is sourced from `ANSWERLATTICE_COMPARISONS` in `src/content/answerlatticePublic/`

### 6. Updates (`/updates`)
**Goal:** Show public product momentum without using dashboard-owned changelog routes that are reserved for AnswerLattice workspaces.

**Sections:**
- Static public website update timeline
- Links to product, install, resources, and demo
- Calm factual update language only

### 7. Demo (`/demo`)
**Goal:** Let visitors understand AnswerLattice without creating an account.

**Rules:**
- Product simulation data only
- No Firebase reads
- No AI calls
- Show approved answer, fallback answer, and support gap states
- Show in-app context behavior by switching product surfaces

### 8. Pricing (`/pricing`)
**Goal:** Transparent founder-friendly pricing.

**Sections:**
- Starter, Growth, and Studio INR packaging
- Predictable limits, no public per-resolution pricing
- Plain-language support-credit definition:
  - Support credits are plan capacity for reviewed answers, chat assistance, and support review work
  - Static hosted help pages, docs/FAQ/changelog browsing, and widget loading do not consume support credits
- Plan guidance:
  - Starter: solo founder launching one SaaS product
  - Growth: active SaaS product with recurring support questions
  - Studio: studios/agencies running multiple small SaaS products
- Public setup starts with beta workspace creation
- Paid plan changes, transactions, invoices, and support-credit top-ups are handled through AnswerLattice Billing with product-scoped Razorpay requests

### 9. Security (`/security`)
**Goal:** Give buyers a concise trust page without overclaiming compliance.

**Sections:**
- Security-at-a-glance facts for data boundary, runtime database, widget key storage, widget placement, answer approval, expensive request limits, scheduler output, and product boundary
- Animated security-boundary diagram for allowed origins, safe page context, blocked routes, workspace scope, hosted help boundary, compiled context boundary, and owner-approved answers
- Status snapshots for workspace scope, safe context, origin/route controls, hosted help boundary, ticket context, owner approval, bounded logging, and product separation
- Runtime context safety: public widget bundles contain only approved public-safe context; drafts, tickets, audit logs, API keys, raw signals, and billing internals stay out.
- Tenant-scoped data and workspace isolation
- Safe widget context that is bounded to support relevance and never treated as trusted identity
- User-initiated screenshot attachments only; no automatic host-app capture or DOM scraping
- Origin and blocked-route controls for widget placement
- Hosted help domain registry for anonymous public docs/FAQ/changelog without exposing tickets or workspace internals
- Safe ticket debugging context that is capped, sanitized, ticket-scoped, and captured only when a ticket is created
- Owner-approved answers through reviewed answers, published owner FAQ/custom answers, drafts, proposals, and stale-answer checks
- Cost and abuse controls through rate-limited widget endpoints, cache freshness checks, and summary-backed dashboards
- Separate AnswerLattice product infrastructure with client products treated as integrations, not hardcoded dependencies
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
- Manual owner answers, article-backed FAQ generation, source linking, and review
- Support Board as a private owner/staff workboard, with sync/nightly prep called rollout-gated when mentioned
- Slack/email workflow notifications and adapter boundaries
- Configured proactive help and widget call gating
- Release-aware answer review
- Pricing model
- AnswerLattice product boundary

### 11. About (`/about`)
**Goal:** Build trust. Explain the "why" behind AnswerLattice.

**Sections:**
- Problem statement for fast-built SaaS products
- 5 belief cards around correct answers, page context, measured fallback, founder approval, and coverage
- AnswerLattice operating principles

### 12. Contact (`/contact`)
**Goal:** Let qualified buyers, founders, partners, and security reviewers contact AnswerLattice without crossing product data boundaries.

**Sections:**
- Contact hero explaining what to include: product URL, expected or recurring questions, and first support page
- Inquiry form for setup, demo, pricing, partnership, security, and other requests
- Direct email (hello@answerlattice.com)
- Partnerships (partners@answerlattice.com)
- Security one-pager path
- Privacy/terms consent and no-secrets warning

**Runtime:**
- Form submits to an AnswerLattice-owned public API route
- Anonymous submissions are rate-limited and honeypot-protected
- Accepted submissions add one AnswerLattice Firestore write; normal browsing remains static

### 13. Get Started (`/get-started`)
**Goal:** Self-service onboarding flow for a new AnswerLattice workspace.

**Sections:**
- Best-fit criteria for live, beta, and near-launch SaaS or digital products
- Google sign-in and product details form
- Product URL, support email, billing model, and main product pages
- What-you-need-before-signup copy
- 7-step first-session checklist

## Conversion Tracking

The website may emit optional GA/measurement events when `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MEASUREMENT_ID` or `NEXT_PUBLIC_GA_MEASUREMENT_ID` is configured. Tracking is client-only and does not write to Firestore.

## Agent-Readable Website Context

AnswerLattice product domains must serve AnswerLattice-specific agent context instead of inheriting generic platform framing.

Routes:

- `/llms.txt` — short product definition, key public pages, product areas, and agent guidance
- `/llms-full.txt` — extended route map, runtime boundaries, action boundaries, and machine-readable surfaces
- `/sitemap.xml` — product-domain route inventory from `ANSWERLATTICE_PUBLIC_PAGES` and product feature routes
- `/robots.txt` — product-domain crawler policy with explicit AI/search crawler allow rules and LLM context links

Rules:

- Define AnswerLattice as the Governed Answer Infrastructure for SaaS Support.
- State that AnswerLattice is not a helpdesk replacement, chatbot autopilot, documentation CMS, compliance platform, or autonomous publisher.
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
- `developer_doc_cta_clicked`
- `comparison_cta_clicked`
- `resource_path_clicked`
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

Comparable support platforms commonly expose product depth, pricing, demo/start actions, install/developer setup, integrations, resources, security/trust, and updates. AnswerLattice now exposes integrations only for the implemented Slack/email workflow notification path. Broader workflow adapters remain controlled rollout, and the site avoids unsupported pages such as a live status page because there is no implemented status/incident backend yet.

Final product-suite polish follows the observed pattern from product-led sites where the main nav exposes product families, each family can stand as its own landing page, and resource/use-case/developer/comparison pages cross-link back into those families. AnswerLattice applies that pattern without adding runtime reads, unimplemented integrations, unsupported public API claims, or unsupported public docs routes.

The desktop header should stay product-led and high-intent: Product, Demo, Install, Use Cases, Resources, Pricing, and the primary `Create workspace` CTA. Demo and Install are top-level because the buyer needs to see the product and implementation path quickly. The desktop Product nav item should use the same compact title-only navigation treatment as the Resources dropdown: a Product overview row, a Support areas section, a Support tools section, small icon tiles, and tight two-column rows rather than a full-width mega panel. Support areas should use founder-readable labels: Set up support, In-app support widget, Help center, FAQ and tickets, and Review approved answers. Support tools should expose the concrete terms founders understand: Team access, Import support knowledge, Docs / Knowledge Base, FAQ, Changelog, Tickets, Support Board, Feedback review, Slack/email notifications, and Proactive help. Avoid navigation terms such as governance, ontology, canonical, retrieval, and control plane.

The desktop Resources nav item should use the same compact title-only navigation treatment as the Product dropdown: a Resources overview row, a Resource guides section, small icon tiles, and rows for the highest-priority public resource articles: launch proof checklist, pre-onboarding source package, safe page context, widget verification, approved answers, hosted help setup, runtime safety, and all resources. It must not link to private dashboard, widget runtime, or API routes.

The mobile/tablet hamburger mirrors the same information hierarchy in a right-side drawer: Product Overview, Product Areas, Support Tools, and an Other card for Use Cases, Resources, Pricing, Demo, Pre-Onboarding, Install, Security, Developers, Comparisons, Updates, and Contact. The mobile drawer must use the same founder-readable support labels as the desktop Product dropdown, open from right to left, include backdrop/close behavior, lock page scroll while open, and leave safe-area bottom space so the primary setup CTA is not clipped on phone browsers. Full desktop navigation should start only at the `xl` breakpoint so the header and Product dropdown remain inside the viewport; the hamburger trigger must not render on confirmed desktop viewports.

Route naming must avoid conflicts with AnswerLattice dashboard roots. Public website learning content uses `/resources`, public implementation content uses `/developers`, public category education uses `/comparisons`, and public release communication uses `/updates`; dashboard-owned support routes keep `/docs`, `/help`, `/changelog`, and `/release-notes`.

---

## Design System

| Element | Value |
|---------|-------|
| Visual direction | Verdigris Answer Layer |
| Primary color | Deep teal (#0f766e) |
| Hover color | Dark teal (#115e59) |
| Signal accent | Teal 300 (#5eead4) |
| Theme modes | Light, System, Dark |
| Dark background | Dark navy (#0a0a1a) |
| Light background | Pale slate (#f8fafc) |
| Surface | Theme-scoped surface token (`--al-surface` / `--al-surface-raised`) |
| Border | Theme-scoped border token (`--al-border`) |
| Text primary | Theme-scoped primary text (`--al-text`) |
| Text body | Theme-scoped body text (`--al-text-body`) |
| Text secondary | Theme-scoped secondary text (`--al-text-secondary`) |
| Text muted | Theme-scoped muted text (`--al-text-muted`) |
| Success | Emerald 500 (#10b981) |
| Warning | Amber 500 (#f59e0b) |
| Danger | Red 500 (#ef4444) |
| Cards | White 3% opacity + 6% border |
| Font | Inter (system fallback) |
| Border radius | 0.75rem (cards), 0.5rem (buttons) |
| Max content width | 6xl or 7xl by section; header uses 7xl (1280px) so desktop navigation does not crowd |

The website must support Light/System/Dark modes end to end while staying canonical and infrastructure-grade. Verdigris/teal remains the action and signal accent in both modes. Dark mode uses the deep-navy AnswerLattice background; light mode uses pale slate surfaces and dark slate text without changing product positioning or adding decorative marketing colors. The selected mode is persisted only for the AnswerLattice public site.

All non-home public routes should use the shared non-home hero treatment: centered eyebrow, title, subheading, CTA row, and proof strip when the route is not intentionally split; split heroes still use the same typography, color tokens, spacing, and eyebrow styling on the copy column. The homepage is excluded because it owns the larger first-viewport product promise and hero asset composition.

The footer should preserve broad public-route discoverability without turning the top navigation into a directory. It uses the brand column plus Product, Features, Evaluate, Resources, and Trust columns. Product and Features should expose all public product-area and product-feature pages. Evaluate should expose use cases, route-backed use-case pages for AI-built SaaS, solo founders, small SaaS teams, studios/agencies, support teams, product teams, and engineering teams, plus demo, pricing, setup, Page-Aware Widget, and Hosted Help Center. Resources should expose the resource hub, pre-onboarding kit and guide, widget install, developer docs, quickstarts, comparisons, integrations, ROI calculator, and proof pack. Trust should expose updates, FAQ, security, security one-pager, company, contact, privacy, and terms. Footer links must target public website routes only, use unique keys even when several labels point to the same hub route, and avoid private dashboard, widget runtime, API, placeholder social, or fake external-profile URLs. Add social icon links only after official profiles exist. The Light/System/Dark selector belongs in the bottom footer strip and in the mobile drawer, not in the desktop header or brand-column intro block.

AnswerLattice website CSS must remain root-loadable and product-scoped. Clean-cache public routes should receive Tailwind utilities, theme-aware backgrounds, page spacing, reveal-motion styles, and dark/light compatibility rules from the root `app/layout.css` bundle, while selectors that change colors, layout rhythm, or motion must stay scoped to `.answerlattice-site`, `.al-home-flow`, `.al-page-flow`, `html[data-answerlattice-theme]`, or explicit AnswerLattice classes.

---

## SEO

| Page | Title | Description |
|------|-------|-------------|
| `/` | AnswerLattice - 24/7 Support Layer for Founder-Led SaaS | AnswerLattice helps founder-led SaaS products manage support 24/7 with an in-app widget, hosted help center, FAQs, changelog, ticket fallback, feedback review, approved answers, and a weekly support review loop. |
| `/product` | Product \| AnswerLattice | One support layer for founder-led SaaS: launch setup, in-app widget, hosted help, FAQs, changelog, ticket fallback, feedback review, approved answers, and support-gap review. |
| `/product/launch-setup` | Set Up Support \| AnswerLattice | Create an AnswerLattice workspace, add team access, import starter knowledge, map product pages, and verify the widget before launch. |
| `/product/team-access` | Team Access \| AnswerLattice | Manage AnswerLattice workspace members, roles, custom permissions, owner reset, and force sign-out with workspace-scoped access. |
| `/product/page-aware-widget` | In-App Help Widget \| AnswerLattice | Install AnswerLattice as an in-app widget with safe context, explicit screenshot attachments, allowed origins, blocked routes, hosted help, approved answers, and owner answers before fallback. |
| `/product/support-control` | Help Center and Tickets \| AnswerLattice | Operate AnswerLattice hosted help, docs, FAQ, custom owner answers, changelog, tickets, feedback, Support Board, conversations, and weekly support review from one support layer. |
| `/product/knowledge-governance` | Review Approved Answers \| AnswerLattice | Review approved answers, stale support, repeated-question signals, coverage signals, and launch readiness. |
| `/product/support-board` | Support Board \| AnswerLattice | Private owner/staff support cards, internal notes, status history, selected follow-up, and answer-proposal handoff. |
| `/product/feedback-review` | Feedback Review \| AnswerLattice | Collect ratings, product feedback, feature requests, and suggestions, then review useful items as support signals before board or answer-proposal handoff. |
| `/use-cases` | Use Cases \| AnswerLattice | AnswerLattice use cases for AI-built SaaS apps across billing, onboarding, settings, releases, errors, and support fallback. |
| `/use-cases/ai-built-saas` | AI-Built SaaS \| AnswerLattice | Support path for AI-built SaaS apps with in-app widget, hosted help, owner answers, approved answers, ticket fallback, and reviewable support gaps. |
| `/use-cases/vibe-coded-saas` | Vibe-Coded SaaS \| AnswerLattice | Canonicalized campaign/search alias for the AI-built SaaS use case. |
| `/use-cases/founders` | Support for SaaS Founders \| AnswerLattice | In-app support, approved answers, and support-gap review for solo founders launching AI-built SaaS apps. |
| `/use-cases/small-saas-teams` | Small SaaS Teams \| AnswerLattice | Support layer for small SaaS teams with in-app help, hosted help, FAQs, changelog, ticket fallback, feedback review, approved answers, and support-gap review. |
| `/use-cases/studios-agencies` | Studios and Agencies \| AnswerLattice | A repeatable first support layer for studios and agencies launching SaaS products with hosted help, widget support, ticket fallback, feedback review, and owner-approved answers. |
| `/use-cases/support-teams` | Support Teams \| AnswerLattice | Reduce repeated tickets with approved answers, ticket fallback, private Support Board follow-up, and a signal-to-knowledge queue. |
| `/use-cases/product-teams` | Product Teams \| AnswerLattice | See which product surfaces create support friction, stale answers, and review work after releases. |
| `/use-cases/engineering` | Engineering Teams \| AnswerLattice | A support layer with safe page context, widget controls, and reviewed support answers. |
| `/page-aware-support-widget` | In-App Support Widget \| AnswerLattice | An in-app support widget for AI-built SaaS that uses safe product context, optional screenshot attachments, approved answers, and owner answers before fallback. |
| `/hosted-help-center-for-saas` | Hosted Help Center for SaaS \| AnswerLattice | Hosted SaaS help center for AI-built SaaS with docs, owner FAQ, changelog content, and the same knowledge powering the app widget. |
| `/support-widget-for-solo-founders` | Support Widget for Solo Founders \| AnswerLattice | A support widget for solo founders shipping with AI who need in-app help, optional screenshot context, hosted docs, owner answers, ticket fallback, and approved answers. |
| `/demo` | Demo \| AnswerLattice | Try a static in-app support demo with approved answers, fallback, and support gap states. |
| `/install` | Install AnswerLattice with your AI coding agent \| AnswerLattice | Copy the AnswerLattice agent packet, install the v1 widget once, pass safe page context, block sensitive routes, and verify the integration. |
| `/pricing` | Pricing \| AnswerLattice | Founder-friendly INR pricing, beta setup, support credits, and paid AnswerLattice plans for SaaS and digital-product teams. |
| `/resources` | Resources \| AnswerLattice | AnswerLattice resources for founders launching support for SaaS apps and digital products: demo, fit, team access, feedback review, Support Board, install, screenshot boundaries, pricing, safety, and setup. |
| `/resources/launch-support-checklist` | Launch Support Checklist \| AnswerLattice Resources | Launch in-app support with product pages, starter sources, approved answers, widget checks, fallback, and reviewable support gaps. |
| `/resources/pre-onboarding-source-package` | Pre-Onboarding Source Package \| AnswerLattice Resources | Prepare repo, website, docs, owner notes, policies, screenshots, and product exclusions before AnswerLattice intake. |
| `/resources/safe-page-context` | Safe Page Context \| AnswerLattice Resources | Explain which widget context fields are safe and which private identifiers or sensitive fields stay blocked. |
| `/resources/widget-install-verification` | Widget Install Verification \| AnswerLattice Resources | Verify the v1 widget script, key, origin, blocked routes, safe context, and support output before launch. |
| `/resources/approved-answers-before-fallback` | Approved Answers Before Fallback \| AnswerLattice Resources | Explain the approved-answer path, fallback boundary, and reviewable missing-coverage workflow. |
| `/resources/support-board-workflow` | Support Board Workflow \| AnswerLattice Resources | Use private support cards, internal notes, status history, selected follow-up, and answer-proposal handoff safely. |
| `/resources/feedback-review-workflow` | Feedback Review Workflow \| AnswerLattice Resources | Turn private ratings, suggestions, and feature requests into support signals without public-roadmap or automatic-publishing claims. |
| `/resources/support-credits-and-pricing` | Support Credits and Pricing \| AnswerLattice Resources | Explain support credits, beta setup, plan fit, top-ups, and pricing boundaries in the same language as visible pricing. |
| `/resources/hosted-help-setup` | Hosted Help Setup \| AnswerLattice Resources | Set up hosted help with docs, FAQ, changelog, robots, sitemap, support domains, and widget-aligned knowledge. |
| `/resources/support-runtime-safety` | Support Runtime Safety \| AnswerLattice Resources | Runtime safety guide for allowed origins, blocked routes, safe context, cache-first delivery, and owner review. |
| `/developers` | Developer Docs \| AnswerLattice | Public AnswerLattice developer docs for safe page context, widget verification, and the v1 widget handoff. |
| `/developers/safe-page-context` | Safe Page Context \| AnswerLattice | Pass safe page context to the AnswerLattice widget without tenant IDs, user IDs, billing data, secrets, or private account metadata. |
| `/developers/widget-verification` | Widget Verification \| AnswerLattice | Verify the AnswerLattice widget script, allowed origin, blocked routes, safe page context, and support output before launch. |
| `/comparisons` | Comparisons \| AnswerLattice | Compare AnswerLattice with chatbots, helpdesks, and knowledge bases by category without replacement claims or unsupported ratings. |
| `/comparisons/answerlattice-vs-chatbots` | AnswerLattice vs Chatbots \| AnswerLattice | Compare approved in-app answers before fallback with open-ended chatbot-style support. |
| `/comparisons/answerlattice-vs-helpdesks` | AnswerLattice vs Helpdesks \| AnswerLattice | Compare support knowledge review with ticket-queue ownership while preserving helpdesk boundaries. |
| `/comparisons/answerlattice-vs-knowledge-bases` | AnswerLattice vs Knowledge Bases \| AnswerLattice | Compare in-app runtime answers with static article libraries and manual article discovery. |
| `/updates` | Updates \| AnswerLattice | Product updates for AnswerLattice website, launch setup, team access, feedback review, Support Board, widget management, and support review. |
| `/security` | Security \| AnswerLattice | How AnswerLattice protects support knowledge, widget context, screenshot boundaries, ticket debugging context, role-scoped team access, hosted help domains, and customer workspaces. |
| `/security-one-pager` | Security and Ops One-Pager \| AnswerLattice | Shareable AnswerLattice security and operations summary for allowed origins, blocked routes, safe context, team roles, manual screenshots, hashed keys, owner approval, and rate limits. |
| `/faq` | FAQ \| AnswerLattice | Answers to common questions founders ask about AnswerLattice setup, team access, digital products, in-app support, feedback review, Support Board, owner answers, screenshots, pricing, tickets, and data handling. |
| `/about` | About \| AnswerLattice | AnswerLattice helps SaaS and digital-product teams keep support answers correct as products change. |
| `/contact` | Contact \| AnswerLattice | Contact AnswerLattice for setup help, demos, pricing, security questions, or partnership requests for your SaaS app or digital product. |
| `/get-started` | Get Started \| AnswerLattice | Create your AnswerLattice workspace, add your app, invite the first team members, pick pages where users need help, and get a widget key for in-app support. |
| `/privacy-policy` | Privacy Policy \| AnswerLattice | How AnswerLattice handles product support knowledge, account information, team access data, and widget data. |
| `/terms-of-service` | Terms of Service \| AnswerLattice | Terms for using AnswerLattice website, dashboard, widget, and support knowledge features. |

OpenGraph and Twitter cards configured in layout.tsx with `public/answerlattice-og-image.png`.
AnswerLattice product domains must serve their own `/sitemap.xml` and `/robots.txt`; do not rely on a platform sitemap.
AnswerLattice public routes emit server-rendered Organization/WebSite/SoftwareApplication/WebPage/BreadcrumbList JSON-LD. The FAQ route also emits FAQPage JSON-LD. Resource article routes emit Article JSON-LD and FAQPage JSON-LD only when the visible article includes FAQ copy. Route-level structured data must stay tied to `ANSWERLATTICE_PUBLIC_PAGES`.

---

## Conversion Funnel

```
Visitor lands on homepage
  ↓
Reads launch-ready support hero + embedded demo -> "Create workspace" or "See 60-sec demo"
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
| 2026-06-18 | 1.2.86 | Sharpened the homepage first-fold contract around approved answers before fallback, missing coverage becoming support gaps, and founder review without changing the domain/deployment setup |
| 2026-06-10 | 1.2.85 | Added the concept-illustration requirement for abstract AnswerLattice boundaries such as safe context, install verification, source-to-answer, governance loop, and category positioning |
| 2026-06-10 | 1.2.84 | Required stable website visual slots to use concrete product-scene assets or approved final captures rather than generic placeholders or decorative illustrations |
| 2026-06-07 | 1.2.59 | Updated the homepage contract around product-user support, a vertical input-to-support output diagram, and a scroll-led support-surface story inspired by modern product pages while preserving helpdesk/autopilot guardrails |
| 2026-06-06 | 1.2.58 | Synced launch-setup, product preview, and updates copy with Activation first-client launch proof while keeping Signal Queue as the proposal-quality confirmation surface |
| 2026-06-06 | 1.2.57 | Removed desktop hamburger exposure by gating the mobile drawer trigger to confirmed mobile viewports and normalized shared non-home hero alignment, spacing, and typography while leaving the homepage hero unchanged |
| 2026-06-06 | 1.2.56 | Added route-backed Small SaaS Teams and Studios/Agencies use-case pages, exposed all primary use-case routes from the footer Evaluate column, and synchronized public route metadata |
| 2026-06-06 | 1.2.55 | Restored footer discoverability for the full old Product and Resources link set because all listed destinations are real public routes; organized them into Product, Features, Evaluate, Resources, and Trust columns with unique link keys |
| 2026-06-06 | 1.2.54 | Routed product-host `/` and `/home` requests to the working AnswerLattice index route so local and hosted homepage verification do not depend on the internal `/home` wrapper |
| 2026-06-06 | 1.2.53 | Compact Product dropdown to match the Resources dropdown sizing, spacing, icon scale, and title-only row treatment while preserving all support-area and support-tool links |
| 2026-06-06 | 1.2.52 | Removed placeholder footer social links from the rendered site and updated the footer contract to avoid fake external profile URLs |
| 2026-06-06 | 1.2.51 | Replaced the compact Product dropdown with the wider support-system mega menu and founder-readable labels for support areas and support tools |
| 2026-06-06 | 1.2.50 | Added product-feature directory and restored footer/resource discoverability for hosted help center, solo-founder widget, and AI-assisted builder campaign routes; 71 routes render and 70 are reachable from the public link graph, with `/home` kept as an unlinked homepage alias |
| 2026-06-06 | 1.2.49 | Repositioned the live website around the first 24/7 support layer for founder-led SaaS, moved support surfaces ahead of answer mechanics, and verified 71 rendered routes against old positioning vocabulary |
| 2026-06-06 | 1.2.48 | Simplified the v1 header and footer contract so Product, Use Cases, Resources, Pricing, and setup remain primary while deeper pages stay discoverable off the main homepage path |
| 2026-06-06 | 1.2.47 | Shortened the homepage layout contract from the full planning sitemap to the v1 diagram-controlled homepage: one major loop diagram, product proof, compact use cases, pricing, FAQ, and CTA |
| 2026-06-06 | 1.2.46 | Repositioned the homepage and Product overview around AnswerLattice as the first support layer for founder-led SaaS, with explicit helpdesk/autopilot guardrails |
| 2026-06-06 | 1.2.45 | Updated the Resources dropdown requirement to mirror the compact Product dropdown pattern with an overview row and title-only guide rows |
| 2026-06-05 | 1.2.44 | Added the compact Product dropdown requirement: title-only icon rows in the header, with explanatory content left to destination pages |
| 2026-06-05 | 1.2.43 | Added the footer placement requirement: social icon links live in the brand column, while the Light/System/Dark selector moves to the bottom footer strip and remains available in the mobile drawer |
| 2026-06-05 | 1.2.42 | Removed the requirement for desktop-header theme control; Light/System/Dark access stays available through the mobile drawer and footer so the desktop header remains focused on navigation and setup |
| 2026-06-05 | 1.2.41 | Added the Verdigris primary-token visual requirement: public-site accents, feature-card diagrams, hover states, and section glows must use AnswerLattice primary colors and shared accent utilities rather than ad hoc cyan or sky values; shared feature proof cards must also fit mobile grid width without clipping |
| 2026-06-05 | 1.2.40 | Replaced the sticky product-proof chapter requirement with a stable tabbed proof-frame requirement after the image-backed screenshot slots made the sticky side-card layout too crowded |
| 2026-06-05 | 1.2.39 | Added the header breakpoint requirement: full desktop navigation starts at `xl`, narrower tablet/narrow-desktop widths use the drawer, and the wide Product dropdown must remain inside the viewport |
| 2026-06-05 | 1.2.38 | Added the image-backed screen-slot requirement: product-screen placeholders must use fixed-size 1440 x 1200 image/GIF asset slots so final captures replace dummy assets without changing layout |
| 2026-06-05 | 1.2.37 | Added the shared diagram-motion requirement: single soft logo ripple, no inner static center strip, synchronized cross-diagram logo-origin pulses, guide-line endpoint alignment, and endpoint fade-out |
| 2026-06-04 | 1.2.36 | Added the desktop Resources dropdown requirement for high-priority public resource articles, preserving private-route and runtime-route boundaries |
| 2026-06-02 | 1.2.35 | Added resource article requirements, typed public content source, Article/FAQ structured data rules, resource analytics, sitemap/LLM coverage, and claim guardrails for ten resource article routes |
| 2026-03-07 | 1.0.0 | Initial spec |
| 2026-05-21 | 1.1.0 | Repositioned website for small SaaS self-serve funnel, added demo/security/FAQ/legal pages, AnswerLattice sitemap/robots, structured data, and removed enterprise/private-beta-first spec language |
| 2026-05-21 | 1.1.1 | Restored implemented AnswerLattice engine pillars on homepage and product page without claiming deferred API/integration pillar |
| 2026-05-21 | 1.1.2 | Added homepage system coverage section from the codebase inventory |
| 2026-05-21 | 1.1.3 | Added product preview plus public use-cases, integrations, resources, and updates pages based on website benchmark gaps and implemented AnswerLattice capabilities |
| 2026-05-21 | 1.1.4 | Replaced public integrations positioning with widget-first install positioning and removed API/adapters from buyer-facing website package copy |
| 2026-05-21 | 1.1.5 | Expanded the security page from a trust-page reference pattern with AnswerLattice-specific facts, widget runtime controls, tenant isolation, cost controls, product separation, and responsible disclosure |
| 2026-05-22 | 1.1.6 | Refreshed website to match current AnswerLattice implementation: hosted help, FAQ generation/management, product-scoped billing/support credits, cache freshness, and separate Firebase/product boundaries |
| 2026-05-22 | 1.1.7 | Added buyer-facing custom help domain positioning and safe ticket debugging context across homepage, product, install, security, FAQ, privacy, and updates copy |
| 2026-05-22 | 1.1.8 | Applied self-sell website feedback: outcome-led hero, embedded generic-vs-AnswerLattice demo, buyer qualification, setup funnel, trust strip, pricing credit clarity, objection handling, optional no-Firestore conversion events, and three SEO landing pages |
| 2026-05-22 | 1.1.9 | Added screenshot-led product proof after the hero and on `/product`, using responsive HTML/CSS product scenes instead of static screenshots so the website stays privacy-safe, responsive, and zero-Firebase-cost |
| 2026-05-22 | 1.2.0 | Applied positioning review: hero now leads with page-aware support truth, demo is primary CTA, homepage includes a support truth loop, comparison distinguishes chatbot/helpdesk/KB/AnswerLattice, FAQ defines canonical answers and non-chatbot positioning, and role-specific use-case pages were added |
| 2026-05-22 | 1.2.1 | Added founder-relief positioning without helpdesk overclaiming: homepage hero now leads with revenue/support-accuracy language while preserving approved-answer, page-aware, fallback-signal, and human-review guardrails |
| 2026-05-22 | 1.2.2 | Redesigned presentation quality for the public site: demo now uses top product-surface tabs and a large product canvas, product proof uses clearer dashboard-style tabs, and widget content moved into a bento-style install/runtime/governance grid |
| 2026-05-22 | 1.2.3 | Added landing-style product area pages for Launch Setup, Page-Aware Widget, Support Control, and Knowledge Governance so each major product part can be understood and sold independently |
| 2026-05-22 | 1.2.4 | Final product-suite polish: header Product dropdown, homepage product-area section, resources product-area hub, and SEO/use-case product-area cross-links make the current product easier to evaluate without adding Firebase cost |
| 2026-05-23 | 1.2.5 | Added AnswerLattice-specific `llms.txt` and `llms-full.txt` routes so product-domain agents read AnswerLattice product context, non-goals, and mutation boundaries |
| 2026-05-23 | 1.2.6 | Added server-rendered WebPage/BreadcrumbList JSON-LD coverage across public AnswerLattice routes, explicit AI/search crawler robots rules, route-registry Website graph references, and `verify:agent-readiness` coverage |
| 2026-05-24 | 1.2.7 | Reframed public copy for AI-built SaaS founders, moved the page-aware demo into first-proof position, simplified first-visit vocabulary, added `/use-cases/ai-built-saas`, and kept `/use-cases/vibe-coded-saas` as a campaign/search alias rather than the primary ICP label |
| 2026-05-24 | 1.2.8 | Refined the shared AnswerLattice support knowledge map diagram with a logo-only center, AnswerLattice-colored ripple rings, dotted SVG paths, homepage-style pulse strokes, and border-only output highlights |
| 2026-05-24 | 1.2.9 | Expanded the same animated diagram language across AnswerLattice workflow-heavy sections: homepage loops/sequences, product-area and feature workflows, connected surfaces, SEO/use-case pages, install, security, resources, engine pillars, and system coverage |
| 2026-05-24 | 1.2.10 | Added non-diagram proof blocks for text compression: homepage fit decisions, widget state snapshots, trust controls, use-case before/after examples, and security status snapshots |
| 2026-05-24 | 1.2.11 | Aligned reusable AnswerLattice sequence-diagram endpoints and output-highlight timing with the shared source-map reference while keeping the AnswerLattice logo, ripple, and color treatment unchanged |
| 2026-05-24 | 1.2.12 | Converted reusable workflow sequence diagrams into the same input column, logo center, and output column layout used by AnswerLattice source-map diagrams |
| 2026-05-25 | 1.2.15 | Added the day-one launch pack to homepage and Product so quickstarts, starter surfaces, import templates, install verification, ROI/proof, and security handoff are visible in the main buyer path without adding another public route |
| 2026-05-25 | 1.2.16 | Updated existing widget/install/security/FAQ/SEO pages to present user-initiated screenshot attachments as part of the page-aware widget while explicitly rejecting automatic screenshot capture or DOM scraping |
| 2026-05-26 | 1.2.17 | Added Team Access to the public website story with a dedicated `/product/team-access` page and updates to setup, security, pricing, resources, FAQ, privacy, metadata, and LLM context |
| 2026-05-26 | 1.2.18 | Formalized the Verdigris Answer Layer visual direction with shared theme tokens, deep-navy PWA/browser theme color, and documented success/warning/danger colors |
| 2026-05-27 | 1.2.19 | Removed client-specific public relationship framing from AnswerLattice website pages, route docs, and agent context so AnswerLattice presents as an independent product |
| 2026-05-27 | 1.2.20 | Added AnswerLattice-owned contact form requirements and mobile hamburger grouping/safe-area requirements |
| 2026-05-27 | 1.2.21 | Added Support Board public-site requirements: dedicated product-feature page, Support Control/FAQ/Resources/Updates copy, route metadata, and LLM context with manual-first private workboard boundaries |
| 2026-05-27 | 1.2.22 | Added AnswerLattice Agent Install Layer requirements: generated install pages, Markdown mirrors, public agent files, dashboard AI packet actions, and the stable v1 widget contract URL |
| 2026-05-27 | 1.2.23 | Updated the mobile hamburger requirement to use a right-side drawer with backdrop, close handling, and scroll lock |
| 2026-05-27 | 1.2.24 | Synced the install-route requirements to the live generated public install pages and Markdown contract mirrors after the end-to-end website audit |
| 2026-05-31 | 1.2.25 | Applied the shared ChatGPT conversation's corrected homepage strategy: the hero now leads with launch-ready support for SaaS founders, setup is the primary CTA, and the public claim separates generated support knowledge from owner-managed tickets, changelog publishing, feedback, ratings, and feature requests |
| 2026-05-31 | 1.2.26 | Added Feedback Review to the main AnswerLattice website as a dedicated product-feature page and homepage/product preview tab with private review, Support Board handoff, and no-public-roadmap guardrails |
| 2026-06-01 | 1.2.27 | Reworked homepage requirements around a fresh conversion-first product story: clearer page-aware support-answer hero, inline sample workspace proof, conversion proof band, earlier product proof/demo, lower Pre-Onboarding source-prep placement, and final asset-preparation requirements |
| 2026-06-01 | 1.2.28 | Extended the conversion-first pattern to the rest of the public website: reusable proof strips, clearer hero CTAs on product/product-area/feature/SEO/setup/trust pages, grouped FAQ sections, safer placeholder-state wording, and non-home asset requirements |
| 2026-06-01 | 1.2.29 | Added clean-cache CSS loading requirements and completed wording cleanup around buyer-facing product-page terminology and product-area labels |
| 2026-06-02 | 1.2.30 | Broadened top-level positioning from SaaS-only language to "SaaS and digital products" while keeping AI-built SaaS as a targeted use-case path |
| 2026-06-02 | 1.2.31 | Completed the rendered dedupe and positioning sweep across all public routes: product-feature, SEO/use-case, and resources templates no longer repeat long page-body copy, and Resources/Pricing/ROI/FAQ/Proof now use top-level SaaS plus digital-product framing |
| 2026-06-02 | 1.2.32 | Added the market-aligned sticky product-proof layout requirement: desktop keeps a proof frame visible while support-loop chapters scroll; mobile/tablet keeps compact tabs, with no heavy parallax or decorative motion requirement |
| 2026-06-02 | 1.2.33 | Added the launch-readiness copy requirement so best-fit, FAQ, pricing, Get Started, About, ROI, metadata, and use-case copy include beta and near-launch founders instead of existing-volume-only phrasing |
| 2026-06-02 | 1.2.34 | Added the public brand/domain decision, claim guardrails, resource/comparison/developer registries, developer docs, category comparisons, Canonica legacy public-host redirect requirement, LLM/sitemap coverage, and discovery verification requirements while preserving existing AnswerLattice runtime routes |
| 2026-06-05 | 1.2.35 | Added the Light/System/Dark public-site theme requirement, including AnswerLattice-scoped persistence, browser theme-color handling, root-loaded light-mode compatibility styling, and mobile/footer access to the theme control |

# Canonica Website — Spec

> **Version:** 1.1.7
> **Last Updated:** 2026-05-22
> **Audience:** CEO / PM / Marketing

---

## Purpose

Public-facing marketing website for Canonica at `canonica.app`. Serves as the primary discovery, demo, pricing, and onboarding surface for small SaaS founders considering Canonica as a support knowledge control plane with launch setup, support control, page-aware widget, branded hosted help domains, safe ticket context, and knowledge governance.

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
1. **Hero** — Support knowledge control plane category promise with Launch Setup, Support Control, and Knowledge Governance proof
2. **Product Preview** — Static dashboard/widget/hosted-help/governance mock that shows the actual product shape, including branded help domains and safe ticket context, without relying on external screenshots
3. **Widget Install** — Page-aware widget, hosted help domains such as help.yourapp.com, allowed domains, blocked routes, and safe context
4. **Canonica Engine** — Product Ontology, Canonical Answer Engine, Drift Governance, Signal Mutation
5. **Product System** — Launch Setup, Support Control, Knowledge Governance, and Runtime Layer from implemented code
6. **How It Works** — Create workspace, import knowledge, map surfaces, install widget, govern gaps
7. **Comparison** — Separates Canonica from helpdesks, chatbots, and documentation CMS tools
8. **CTA** — Final conversion section with demo and start-free actions

### 2. Product (`/product`)
**Goal:** Explain the product in founder/operator language while preserving the real Canonica architecture.

**Sections:**
- Hero with page-aware support knowledge promise
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

### 3. Use Cases (`/use-cases`)
**Goal:** Help small SaaS operators recognize when Canonica is useful.

**Sections:**
- Launching a new SaaS product
- Shipping frequent product changes
- Supporting billing, roles, and settings flows
- Reducing repeated tickets
- Turning support friction into knowledge updates
- Connecting use cases to Canonica's operating system

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
- Owner dashboard controls

### 5. Resources (`/resources`)
**Goal:** Give buyers and new users a website-side learning hub.

**Sections:**
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
- 3-step "what happens next" process

### 14. Privacy Policy (`/privacy-policy`)
**Goal:** Provide a public policy summary for account, workspace, support, and widget data.

### 15. Terms of Service (`/terms-of-service`)
**Goal:** Provide a public terms summary for account, support content, AI-assisted drafts, widget usage, billing, and acceptable use.

## Market Pattern Check

Comparable support platforms commonly expose product depth, pricing, demo/start actions, install/developer setup, resources, security/trust, and updates. Canonica leads with the implemented widget install path because non-widget delivery paths are rollout-gated, not default buyer-facing package promises. The site also avoids unsupported pages such as a live status page, because there is no implemented status/incident backend yet.

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
| `/` | Canonica — Support Knowledge Control Plane for SaaS | Canonica is the support knowledge control plane for SaaS products: launch setup, page-aware widget, hosted help on your own domain, canonical answers, drift review, and support-gap governance. |
| `/product` | Product \| Canonica | Canonica brings launch setup, support control, page-aware widget, hosted help domains, safe ticket context, canonical answers, and knowledge governance into one SaaS support control plane. |
| `/use-cases` | Use Cases \| Canonica | See how Canonica helps small SaaS teams launch support, reduce repeated tickets, and govern product knowledge. |
| `/demo` | Demo \| Canonica | Try a static page-aware support demo with canonical answers, fallback, and support gap states. |
| `/install` | Widget Install \| Canonica | Install Canonica with one widget script, allowed origins, blocked routes, help.yourapp.com hosted help domains, runtime verification, and safe page context. |
| `/pricing` | Pricing \| Canonica | Founder-friendly INR pricing, beta setup, support credits, and paid Canonica plans for small SaaS teams. |
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
Reads hero + pillars → "Try Demo" or "Start Setup"
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
| 2026-05-22 | 1.1.6 | Refreshed website claims for current Canonica implementation: support knowledge control plane positioning, hosted help domains, FAQ generation/management, product-scoped billing and support credits, cache freshness, and separate product/Firebase boundaries |

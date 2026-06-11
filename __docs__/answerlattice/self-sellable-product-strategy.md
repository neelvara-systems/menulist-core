# Answerlattice — Self-Sellable Product Strategy and Task List

> **Status:** Strategy Logged
> **Last Updated:** 2026-06-06
> **Owner:** Answerlattice Product
> **Audience:** Product, Engineering, Website, Sales
> **Doctrine:** Must follow `doctrine/01-core-doctrine.md`, `02-non-goals-charter.md`, and `03-infrastructure-freeze-v1.md`

---

## Decision

Answerlattice should not compete as another helpdesk, chatbot, or documentation CMS.

Answerlattice should position itself as:

> **The support layer for AI-built SaaS apps that keeps answers correct as the product changes.**

The durable category is:

> **Support Knowledge Infrastructure for small SaaS teams.**

This keeps Answerlattice aligned with the locked doctrine: knowledge is the spine, canonical answers come before generation, and tickets/chat remain fallback signal sources rather than the product center.

Website and campaign copy may refer to "vibe-coded" SaaS only as an SEO or campaign wedge. The core brand should use "AI-built SaaS", "AI-native SaaS founders", "solo founders", and "small SaaS teams" so the product stays credible for serious operators and does not sound like a prototype-only tool.

---

## Why This Matters Now

More SaaS products are being launched by small teams and solo founders because AI coding tools make development faster. Those products still need support, but most founders do not want to buy or configure an enterprise support suite before they have a support team.

Answerlattice should win this gap:

- AI-built apps need support immediately after launch
- small teams need support immediately after launch
- support answers drift whenever product screens, billing, plans, or workflows change
- generic chat answers become risky when docs are stale
- founders need a system that turns docs, tickets, changelogs, and page context into approved support truth
- the value is not "more AI"; the value is correct answers tied to the actual product state

---

## Target Customers

Answerlattice should focus on non-enterprise customers:

- solo SaaS founders
- AI-native SaaS founders shipping quickly with AI-assisted development
- fast-built SaaS products
- micro-SaaS owners
- small teams under 20 people
- dev studios and agencies launching many SaaS products
- SaaS products before they hire a support team

Answerlattice should not optimize the first product experience for enterprise procurement, large support teams, complex agent routing, or compliance-heavy governance.

---

## Core Offer

Answerlattice should sell a simple promise:

1. **Guided install without a fixed-time promise**
   - founder creates account
   - adds product details
   - imports docs or starter knowledge
   - installs widget
   - verifies the install

2. **Canonical answers instead of guesses**
   - approved answers are served first
   - fallback answers are marked and measured
   - repeated fallback becomes a knowledge improvement queue

3. **Page-aware support**
   - widget receives current page, route, product surface, tags, and safe context
   - billing pages show billing help
   - onboarding pages show onboarding help
   - settings pages show settings help

4. **Release-aware support**
   - changelogs connect to affected product surfaces
   - changed features can trigger answer review
   - stale answers become visible before users get wrong help

5. **Support gap queue**
   - unanswered or low-confidence questions become owner-reviewable tasks
   - tickets and chat sessions are signals for canonical answer improvement
   - human approval stays required before canonical answers become active

6. **Canonical Coverage as the main metric**
   - show how much support is answered from approved knowledge
   - show where fallback reliance is still high
   - show which product surfaces are under-documented

---

## Expansion Execution Guardrail

The self-sellable path must prove the first-client governed answer loop before adding new connector or distribution work.

Required loop:

1. Founder signs in and creates an Answerlattice workspace.
2. Product profile captures product URL, support email, billing model, and starting product context.
3. Knowledge Intake adds reviewed product sources.
4. Product surfaces map routes, pages, workflows, entities, tags, articles, changelogs, and tickets.
5. Entity candidates and canonical answer drafts appear in Governance.
6. Owner approves canonical answers before they become active.
7. Widget install is verified on a separate client page with safe page context.
8. Feedback, fallback, tickets, and escalation signals create reviewable mutation proposals.
9. Weekly digest, coverage, trust, drift, and friction surfaces read compact summaries.

This means:

- Do not build Jira before the canonical-answer, governance, and signal mutation loop is proven.
- Do not add native helpdesk OAuth/API connectors before export/import through Knowledge Intake is proven.
- Do not expand distribution channels until the source of truth is stable.
- Keep Public API v1 off by default until a tenant has enough approved canonical coverage and verified API keys.
- Keep white-label and multi-language as market-expansion controls, not the core launch proof.

---

## Differentiation

Answerlattice should be differentiated by what it refuses to become.

| Market category | What users expect | Answerlattice stance |
| --- | --- | --- |
| Helpdesk | Agent inbox, routing, SLA operations | Tickets are fallback and signals, not the product center |
| Chatbot | Answer generation and automation | Canonical answers first; generation is fallback |
| Documentation CMS | Rich publishing and website tooling | Presentation is secondary; governed product truth is primary |
| Enterprise support suite | Permissions, procurement, complex workflows | Small-team setup, install, and support correctness first |

The simplest competitive sentence:

> Answerlattice does not replace your helpdesk. It makes sure every support surface answers from the same approved product truth.

---

## Public Messaging Bank

Use these messages as website and sales input. They must be checked against the live product before publishing.

- Launch your SaaS with support already built.
- Answerlattice prepares docs, FAQs, answer drafts, hosted help, and page-aware widget support from the product material you already have.
- Tickets, changelogs, feedback, ratings, and feature requests stay owner-managed, but Answerlattice connects them to the support review loop.
- Your product changes. Your support answers should not drift.
- Turn docs, release notes, and ticket patterns into approved answer drafts.
- A support system for AI-built SaaS teams before they hire support.
- AI helped you build the app. Answerlattice helps you support it correctly.
- Support for apps built fast with AI.
- Stop shipping support answers from stale docs.
- Install support that understands the page your user is on.
- Give users the right answer before they open a ticket.
- Keep product support correct as features, plans, and workflows change.
- Use "vibe-coded SaaS" only in SEO/campaign contexts, not as the main product category.

Avoid overclaiming:

- do not say Answerlattice generates tickets
- do not say Answerlattice generates changelogs
- do not say Answerlattice fully replaces human support
- do not say it resolves every user issue automatically
- do not present it as a full helpdesk replacement
- do not sell complex enterprise support operations as the main promise

---

## Pricing Direction

The pricing should stay founder-friendly and INR-first.

| Plan | Suggested price | Best fit | Product promise |
| --- | ---: | --- | --- |
| Starter | ₹999/month | solo founder, one product | widget, help center, basic canonical coverage |
| Growth | ₹2,999/month | growing SaaS | product surfaces, changelog binding, signal queue, weekly digest |
| Studio | ₹6,999/month | agencies/dev studios | multiple products, reusable setup, client workspace management |

The pricing model should avoid per-resolution pricing as the main mental model. It makes founders nervous and can punish successful support deflection. Usage limits can exist internally, but the public purchase decision should feel predictable.

---

## Product Guardrails

Do not build these as core differentiators:

- omnichannel inbox
- complex SLA or agent-routing engine
- enterprise permission matrix
- heavy BI dashboards
- full documentation website builder
- autonomous ticket resolution without canonical grounding
- raw generative answer automation as the main feature
- compliance or GRC workflows

Build only when the work increases at least one of:

- canonical coverage
- page/context relevance
- release binding
- drift detection
- mutation proposal quality
- owner trust in support correctness

---

## Task List

### A. Positioning and Website

- [x] Update Answerlattice website homepage to lead with the AI-built SaaS support correctness promise.
- [x] Add a clear category line: "Support Knowledge Infrastructure for small SaaS teams."
- [x] Add comparison copy that separates Answerlattice from helpdesks, chatbots, and docs CMS products.
- [x] Add founder-friendly examples for billing, onboarding, settings, changelog, and account pages.
- [x] Add proof sections for canonical answers, page-aware support, release-aware support, and support gap queue.
- [x] Keep claims conservative and backed by implemented product behavior.
- [x] Avoid enterprise-heavy language and enterprise-first objections.
- [x] Add an AI-built SaaS use-case page and keep "vibe-coded SaaS" as a canonicalized campaign/search alias rather than the primary buyer label.

### B. Public Interactive Demo

- [x] Build a public demo that works without account creation.
- [x] Let visitors ask support questions against a sample SaaS product.
- [x] Show the difference between canonical answer, fallback answer, and support gap.
- [x] Show page-aware behavior by changing the demo surface, such as billing vs onboarding.
- [x] Keep demo data static or cached to protect Firebase and AI cost.
- [x] Add clear "Start with your product" CTA after the demo.

### C. Launch Setup Onboarding

- [x] Keep the activation checklist as the client owner's first dashboard.
- [x] Make the setup path read as a guided launch checklist without promising a fixed setup time.
- [x] Capture product name, product URL, support email, billing model, and primary product surfaces.
- [x] Let founders import docs, URLs, PDFs, and starter answers.
- [x] Generate initial entity candidates and canonical answer drafts after import.
- [x] Require human review before generated drafts become active canonical answers.
- [x] Show install verification for widget, allowed origins, context capture, and first answer readiness.

### D. Widget and Install

- [x] Keep the widget client-agnostic and not hardcoded to MenuList.
- [x] Provide copy-paste install script and verified install status.
- [x] Provide allowed-origin controls.
- [x] Provide blocked route controls so clients can hide the widget on selected routes.
- [x] Provide UI configuration for launcher position, theme, greeting, and visibility.
- [x] Provide context snippets and examples for route/page/product-surface context.
- [x] Show page-aware preview so owners understand what users will see.

### E. Knowledge Bootstrap

- [x] Keep KB import as the fastest route to working support.
- [x] Auto-extract entity candidates from imported knowledge.
- [x] Auto-generate canonical answer drafts where confidence is strong enough.
- [x] Send weak or ambiguous content to the governance queue instead of publishing it.
- [x] Show coverage by product surface, not only total article count.
- [x] Keep RAG fallback available while canonical coverage grows.
- [x] Do not make founders manually model ontology before they get value.

### F. Support Control

- [x] Keep help center, KB, changelog, tickets, conversations, and widget settings under Support Control.
- [x] Use tickets as fallback workflow and signal source.
- [x] Make changelog entries assignable to product surfaces, tags, and affected canonical answers.
- [x] Make article links and related changelog links reliable across desktop and mobile.
- [x] Ensure client owners can see how support content reaches end users.
- [x] Keep day-to-day operations simple enough for a founder without a support team.

### G. Knowledge Governance

- [x] Keep Canonical Coverage as the primary operating metric.
- [x] Show product surfaces with weak coverage.
- [x] Show drift, stale answers, and release impact checks.
- [x] Show the signal-to-knowledge queue for recurring fallback questions.
- [x] Keep mutation proposals human-approved.
- [x] Keep trust/readiness metrics summary-based to avoid expensive scans.
- [x] Avoid BI-style dashboards that do not improve support truth.

### H. Weekly Digest

- [x] Add a weekly founder digest surface with support gaps, stale setup items, coverage movement, and next actions.
- [x] Keep the digest actionable: review these drafts, update these answers, inspect these surfaces.
- [x] Avoid noisy analytics.
- [x] Build from compact summaries where possible.
- [x] Include clear links back to the exact setup/governance surfaces.

### I. Studio / Agency Mode

- [x] Add a Studio plan for agencies and dev studios managing multiple small SaaS products.
- [ ] Allow multiple client workspaces without enterprise complexity.
- [x] Support reusable setup patterns, install instructions, and workspace switching direction in packaging.
- [x] Keep agency mode scoped to setup and management, not white-label enterprise operations.

### J. Billing and Packaging

- [x] Replace beta/free-first website framing with simple Starter, Growth, and Studio packaging when payments are ready.
- [x] Keep INR pricing on public materials.
- [x] Keep usage limits understandable and predictable.
- [x] Avoid per-resolution pricing as the default public model.
- [x] Keep paid onboarding optional, not required for first value.

### K. Cost and Production Readiness

- [x] Use summary docs for activation, readiness, coverage, trust metrics, and scheduler discovery.
- [x] Avoid collection scans in dashboard landing pages.
- [x] Keep stable public demo data static so it performs as cached public code and does not call Firebase.
- [x] Keep freshness validation for support answers where stale answers would be harmful.
- [x] Keep widget config reads bounded by hashed widget key.
- [x] Keep signal writes fire-and-forget, rate-limited, and low-payload.
- [x] Document every new Firebase read/write/listener added for the public demo, widget, onboarding, or governance surfaces.

### M. Implementation Pass — 2026-05-21

- Public website now leads with the small-SaaS support correctness promise.
- `/sites/answerlattice/demo` provides a static, account-free page-aware demo with canonical, fallback, and support-gap states.
- Pricing now exposes Starter, Growth, and Studio INR packaging while keeping beta onboarding available.
- Onboarding captures product URL, support email, billing model, and main product pages.
- Onboarding creates initial Answerlattice product surfaces and a compact context summary without scanning KB, changelog, tickets, or signals.
- `/answerlattice/settings` now lets owners edit product profile fields after onboarding.
- Widget management now includes greeting text in saved config, install code, runtime config, and iframe empty-state UI.
- Widget management now shows install verification, latest route/origin, context receipt, blocked-route controls, allowed-origin controls, copy-paste snippets, and a page-aware preview.
- `/answerlattice/dashboard` now uses the compact activation/readiness summary instead of full entity and canonical-answer collection reads.
- KB import now resolves Answerlattice workspace scope from the Answerlattice session, uploads source files to Answerlattice storage in separate-Firebase mode, and accepts bounded text sources for docs URLs and starter answers.
- `/answerlattice/weekly-digest` gives owners an actionable digest built from existing compact activation/readiness summaries.
- The Answerlattice public website now has a coherent self-serve funnel across homepage, product, pricing, demo, about, contact, get-started, privacy policy, and terms of service pages.
- The Answerlattice public website now includes security and FAQ pages, product-domain sitemap/robots, page canonicals, Answerlattice manifest/icons, OpenGraph image, and homepage structured data.
- Public website footer links now stay on public Answerlattice website routes instead of pointing visitors into dashboard/support routes.
- Email delivery for the digest is intentionally not added in this pass; that would require notification policy, SMTP cost/rate controls, and schedule ownership. The dashboard digest surface is ready for that delivery layer later.

### L. QA Checklist Before Sellable Launch

- [ ] Fresh Answerlattice account can complete onboarding.
- [ ] Fresh account can import knowledge.
- [ ] Entity candidates and canonical answer drafts appear.
- [ ] Owner can approve a draft into an active canonical answer.
- [ ] Widget install script works on a separate test client page.
- [ ] Widget receives page-aware context without leaking sensitive data.
- [ ] Blocked routes hide the widget.
- [ ] Changelog entries can be assigned to product surfaces and viewed by users.
- [ ] Related articles/changelogs/tickets are filtered by product surface context.
- [ ] Weekly digest and governance queues use compact summary data.
- [ ] Mobile dashboard works for activation, support control, widget settings, and governance review.
- [ ] MenuList remains an independent client integration, not a hardcoded Answerlattice management surface.

---

## Definition of Done

Answerlattice becomes self-sellable when a founder can:

1. understand the product in under one minute
2. create an account without sales help
3. add product details
4. import starter knowledge
5. install the widget
6. verify context-aware support on their own product page
7. publish or review initial canonical answers
8. see coverage gaps and next actions
9. receive a digest that tells them what to fix
10. trust that Answerlattice is keeping support answers aligned with product changes

The final product promise:

> **Answerlattice keeps your support answers correct, approved, and connected to the exact product screen where users need help.**

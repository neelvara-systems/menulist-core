# Canonica — Self-Sellable Product Strategy and Task List

> **Status:** Strategy Logged
> **Last Updated:** 2026-05-21
> **Owner:** Canonica Product
> **Audience:** Product, Engineering, Website, Sales
> **Doctrine:** Must follow `doctrine/01-core-doctrine.md`, `02-non-goals-charter.md`, and `03-infrastructure-freeze-v1.md`

---

## Decision

Canonica should not compete as another helpdesk, chatbot, or documentation CMS.

Canonica should position itself as:

> **The support layer for fast-built SaaS products that keeps answers correct as the product changes.**

The durable category is:

> **Support Knowledge Infrastructure for small SaaS teams.**

This keeps Canonica aligned with the locked doctrine: knowledge is the spine, canonical answers come before generation, and tickets/chat remain fallback signal sources rather than the product center.

---

## Why This Matters Now

More SaaS products are being launched by small teams and solo founders because development is faster. Those products still need support, but most founders do not want to buy or configure an enterprise support suite before they have a support team.

Canonica should win this gap:

- small teams need support immediately after launch
- support answers drift whenever product screens, billing, plans, or workflows change
- generic chat answers become risky when docs are stale
- founders need a system that turns docs, tickets, changelogs, and page context into approved support truth
- the value is not "more AI"; the value is correct answers tied to the actual product state

---

## Target Customers

Canonica should focus on non-enterprise customers:

- solo SaaS founders
- fast-built SaaS products
- micro-SaaS owners
- small teams under 20 people
- dev studios and agencies launching many SaaS products
- SaaS products before they hire a support team

Canonica should not optimize the first product experience for enterprise procurement, large support teams, complex agent routing, or compliance-heavy governance.

---

## Core Offer

Canonica should sell a simple promise:

1. **Install in 10 minutes**
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

## Differentiation

Canonica should be differentiated by what it refuses to become.

| Market category | What users expect | Canonica stance |
| --- | --- | --- |
| Helpdesk | Agent inbox, routing, SLA operations | Tickets are fallback and signals, not the product center |
| Chatbot | Answer generation and automation | Canonical answers first; generation is fallback |
| Documentation CMS | Rich publishing and website tooling | Presentation is secondary; governed product truth is primary |
| Enterprise support suite | Permissions, procurement, complex workflows | Small-team setup, install, and support correctness first |

The simplest competitive sentence:

> Canonica does not replace your helpdesk. It makes sure every support surface answers from the same approved product truth.

---

## Public Messaging Bank

Use these messages as website and sales input. They must be checked against the live product before publishing.

- Your product changes. Your support answers should not drift.
- Turn docs, changelogs, and tickets into approved answers.
- A support system for SaaS teams before they hire support.
- Stop shipping support answers from stale docs.
- Install support that understands the page your user is on.
- Give users the right answer before they open a ticket.
- Keep product support correct as features, plans, and workflows change.

Avoid overclaiming:

- do not say Canonica fully replaces human support
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

- [x] Update Canonica website homepage to lead with the small-SaaS support correctness promise.
- [x] Add a clear category line: "Support Knowledge Infrastructure for small SaaS teams."
- [x] Add comparison copy that separates Canonica from helpdesks, chatbots, and docs CMS products.
- [x] Add founder-friendly examples for billing, onboarding, settings, changelog, and account pages.
- [x] Add proof sections for canonical answers, page-aware support, release-aware support, and support gap queue.
- [x] Keep claims conservative and backed by implemented product behavior.
- [x] Avoid enterprise-heavy language and enterprise-first objections.

### B. Public Interactive Demo

- [x] Build a public demo that works without account creation.
- [x] Let visitors ask support questions against a sample SaaS product.
- [x] Show the difference between canonical answer, fallback answer, and support gap.
- [x] Show page-aware behavior by changing the demo surface, such as billing vs onboarding.
- [x] Keep demo data static or cached to protect Firebase and AI cost.
- [x] Add clear "Start with your product" CTA after the demo.

### C. Launch Setup Onboarding

- [x] Keep the activation checklist as the client owner's first dashboard.
- [x] Make the setup path read as "Launch support in 10 minutes."
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
- `/sites/canonica/demo` provides a static, account-free page-aware demo with canonical, fallback, and support-gap states.
- Pricing now exposes Starter, Growth, and Studio INR packaging while keeping beta onboarding available.
- Onboarding captures product URL, support email, billing model, and main product pages.
- Onboarding creates initial Canonica product surfaces and a compact context summary without scanning KB, changelog, tickets, or signals.
- `/canonica/settings` now lets owners edit product profile fields after onboarding.
- Widget management now includes greeting text in saved config, install code, runtime config, and iframe empty-state UI.
- Widget management now shows install verification, latest route/origin, context receipt, blocked-route controls, allowed-origin controls, copy-paste snippets, and a page-aware preview.
- `/canonica/dashboard` now uses the compact activation/readiness summary instead of full entity and canonical-answer collection reads.
- KB import now resolves Canonica workspace scope from the Canonica session, uploads source files to Canonica storage in separate-Firebase mode, and accepts bounded text sources for docs URLs and starter answers.
- `/canonica/weekly-digest` gives owners an actionable digest built from existing compact activation/readiness summaries.
- The Canonica public website now has a coherent self-serve funnel across homepage, product, pricing, demo, about, contact, get-started, privacy policy, and terms of service pages.
- The Canonica public website now includes security and FAQ pages, product-domain sitemap/robots, page canonicals, Canonica manifest/icons, OpenGraph image, and homepage structured data.
- Public website footer links now stay on public Canonica website routes instead of pointing visitors into dashboard/support routes.
- Email delivery for the digest is intentionally not added in this pass; that would require notification policy, SMTP cost/rate controls, and schedule ownership. The dashboard digest surface is ready for that delivery layer later.

### L. QA Checklist Before Sellable Launch

- [ ] Fresh Canonica account can complete onboarding.
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
- [ ] MenuList remains only a client/test host, not a hardcoded Canonica management surface.

---

## Definition of Done

Canonica becomes self-sellable when a founder can:

1. understand the product in under one minute
2. create an account without sales help
3. add product details
4. import starter knowledge
5. install the widget
6. verify context-aware support on their own product page
7. publish or review initial canonical answers
8. see coverage gaps and next actions
9. receive a digest that tells them what to fix
10. trust that Canonica is keeping support answers aligned with product changes

The final product promise:

> **Canonica keeps your support answers correct, approved, and connected to the exact product screen where users need help.**

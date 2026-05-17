# Stage 1 Output - MenuList Repo Context Synthesis Codebase-First

**Status:** Stage 1 codebase-first revision  
**Created:** May 16, 2026  
**Supersedes:** `stage-01-output-repo-context-synthesis.md` for Stage 2 input  
**Scope:** Main website strategy preparation only. No production website code changed.  
**Source prompt:** `__docs__/main-website/website-prep-codex-prompts/stage-01-repo-context-synthesis.md`  

## Authority Model For This Revision

This revision uses the hierarchy clarified by the owner:

1. Current runtime code, routes, DAL behavior, feature flags, APIs, UI components, and public rendering paths.
2. Current feature docs and implementation docs when they match the code.
3. Founder/product strategy docs as strategic intent.
4. Existing website implementation and website docs as historical psychology, content backup, and conversion context.
5. External conversations or web research only as optional supporting input.

The existing website is not ignored. It explains the psychology of the current landing page: owner-first language, low technical load, public trust, and restrained infrastructure framing. But it is not the primary source of truth for current product scope because the codebase now contains many deeper systems that are not fully reflected in the active homepage.

No external web search was used for this Stage 1 revision. That is intentional: Stage 1 is a repo-truth synthesis. Web search may be useful in Stage 2 or Stage 3 for market/category comparison, but it should not outrank this codebase for product reality.

## Section 1 - Product Reality Summary

- Product name: MenuList.
- One-sentence explanation:
  - MenuList is customer-facing business truth infrastructure: it lets an SMB owner control the public menu, business identity, hours, links, status, customer actions, customer app, physical surfaces, public APIs, POS sync, and multi-location consistency from one source.
- What MenuList structurally is:
  - A public-output authority layer, not just an editing surface.
  - A canonical menu and business data system.
  - A multi-surface publishing and distribution system.
  - A public URL/routing and cache-invalidation system.
  - A growing chain/location governance layer.
  - A silent correctness and observation layer.
  - Evidence: product strategy says MenuList exists so business owners stop worrying about public-facing presence and that customer-visible truth becomes correct on QR, digital screen, official business page, Google listing, and printed PDF (`__docs__/strategy/product-universe-ssot.md:27-77`).
  - Evidence: canonical truth infrastructure defines schema/data integrity, event ledger, versioning, menu snapshots, and reliability metrics as the foundation that makes MenuList infrastructure rather than a tool (`__docs__/canonical-truth-infrastructure/README.md:11-30`).
- What category it superficially looks like:
  - Digital menu maker.
  - QR menu software.
  - Restaurant website/menu page.
  - AI menu extraction tool.
  - Evidence: `/create-menu` exposes a public upload/preview flow and can look like the category entry point (`src/app/(website)/create-menu/page.tsx`, `src/app/api/public/create-menu/route.ts`).
- What category it is actually moving toward:
  - Menu-led public business truth infrastructure.
  - Public-presence authority layer for local businesses.
  - Customer-facing business data control plane.
  - Chain-capable consistency/governance system.
  - Evidence: current flags show OBP, multi-outlet, POS sync, public API, customer app, public menu entry, Menu Kit, temp status, reviews/reputation, trust/loyalty/risk signals, MCE, menu observation, and menu snapshots are enabled or present in current code (`src/config/features.ts:481-526`, `src/config/features.ts:626-905`, `src/config/features.ts:1020-1253`, `src/config/features.ts:1478-1741`, `src/config/features.ts:2259-2275`).
- What layer of the SMB stack it occupies:
  - Above POS and below customer discovery surfaces.
  - The canonical source that customer-facing surfaces should point to.
  - The operational truth layer that keeps customer-visible data consistent.
- What the product avoids becoming:
  - Generic restaurant software.
  - A full website builder.
  - A noisy analytics dashboard.
  - A generic AI content/productivity app.
  - A social media growth tool.
  - Evidence: customer-facing infrastructure strategy forbids analytics dashboards, website builder drift, review marketing tools, push-notification behavior, and generic SaaS expansion (`__docs__/customer-facing-infrastructure/README.md:64-113`).
- Business model if inferable:
  - Subscription plans, paid AI/credit packs, Razorpay subscription/top-up flows, and likely chain/outlet billing.
  - Evidence: pricing route uses live auth/subscription/payment state, not static marketing only (`src/app/(website)/pricing/page.tsx`, `src/components/website/pricing/PricingWrapper.tsx`, `src/hooks/usePaymentHandler.ts`, `src/app/api/razorpay/create-subscription/route.ts`, `src/app/api/razorpay/verify-subscription/route.ts`).

Surface perception vs underlying architecture:

- What an owner sees:
  - Upload or edit a menu.
  - Publish a public link.
  - Set official page details.
  - Share QR and customer-facing assets.
  - Check calm health or action cards.
- What the codebase shows underneath:
  - Public routing doctrine, route resolution, SSR/caching, cache revalidation, canonical URL behavior, slug/tenant handling, OBP/menu routing, public APIs, POS delivery, menu versioning, MCE validation, MOL event memory, multi-outlet read-time inheritance, and health/reputation infrastructure.
- Strategic meaning:
  - The owner experience should stay simple, but the website should no longer under-market the infrastructure depth. It should translate the depth into owner outcomes, not show raw architecture.

## Section 2 - Strategic Product Identity

- Strategic role:
  - MenuList is the official customer-facing truth layer for SMBs and small chains.
  - The strongest identity is: "the source your customers and public surfaces can trust."
- System-of-record characteristics:
  - MCE runs during save and stamps `_mce` metadata without extra Firebase collections (`src/lib/mce/index.ts:1-49`).
  - Menu Observation Layer is an immutable, append-only change log with no owner UI and debounced cost-aware writes (`src/database/menuChangeLog/index.ts:1-17`, `src/database/menuChangeLog/index.ts:110-169`).
  - Publish flow increments version and invalidates public output (`src/database/projects/index.ts:1146-1160`).
  - Menu snapshots are enabled in current flags (`src/config/features.ts:481-496`).
- Truth authority mechanisms:
  - Owner-controlled save/publish pipeline.
  - Deterministic public routing.
  - OBP as official public identity endpoint.
  - Public cache invalidation after public-facing writes.
  - API/POS layers consuming canonical menu/business data.
  - Owner acceptance boundary for extracted business identity.
- Hidden infrastructure behaviors:
  - MCE validates correctness silently.
  - MOL learns from menu changes silently.
  - Customer App/PWA creates repeat access without app-store complexity.
  - Menu Kit creates physical deployment assets from the canonical menu URL.
  - Health signals show only simple states after enough data, not dashboards (`src/components/templates/main-app/dashboard/OwnerDashboard/HealthSignalCards.tsx:3-16`, `src/components/templates/main-app/dashboard/OwnerDashboard/HealthSignalCards.tsx:80-166`).
- Classification:
  - Utility: yes, at the owner interaction layer.
  - Workflow software: yes, for setup, publishing, sharing, payment, reviews, and chain operations.
  - Infrastructure: strongest identity.
  - Publishing layer: yes.
  - Presence layer: yes.
  - Synchronization layer: yes.
  - Operational control layer: yes.
  - Identity layer: yes, through OBP, public routes, canonical business metadata, and customer actions.

## Section 3 - Ideal Customer Profiles

- Primary ICP: non-technical SMB owner/operator whose customers need current public information.
  - Pain profile: menu/hours/links/photos/status are scattered across WhatsApp, Instagram, Google, PDFs, QR, staff phones, and old files.
  - Operational chaos reduced: repeated manual sharing, wrong menu links, stale PDFs, inconsistent customer answers, public embarrassment.
  - What MenuList centralizes: menu, public business identity, hours/status, official actions, customer app, QR/physical assets, public page.
  - Public-facing risk reduced: customers see old prices, wrong hours, broken links, outdated photos, or untrusted pages.
  - Codebase fit: owner/mobile surfaces, public menu renderer, OBP, temp status, Menu Kit, customer app, share flow.
- Secondary ICP: multi-location SMB or small chain.
  - Pain profile: master vs outlet menu drift, outlet-specific overrides, local changes, outlet onboarding, quantity billing.
  - Operational chaos reduced: separate menus and uncontrolled branch differences.
  - What MenuList centralizes: master menu, outlet inherited projects, override rules, propagation, location controls.
  - Public-facing risk reduced: customers see different prices/items across outlets without explanation.
  - Codebase fit: `ENABLE_MULTI_OUTLET`, outlet creation, project propagation, chain control panel, resolver, override DAL (`src/config/features.ts:658-708`, `src/lib/multiOutlet/resolveProject.ts`, `src/database/multiOutlet/propagation.ts`).
- Secondary ICP: public-presence trust businesses beyond restaurants.
  - Pain profile: they need one credible page for services, menu/catalog, contact, directions, reviews, compliance, and status.
  - Operational chaos reduced: no separate website builder or profile maintenance.
  - Codebase fit: business attributes, OBP, compliance pages, temp status, customer app, public API, website language support.
- Secondary ICP: integration-ready operators, POS vendors, resellers, and platform partners.
  - Pain profile: need stable structured menu/business data without scraping or manual exports.
  - Operational chaos reduced: duplicate entry and stale external data.
  - Codebase fit: public API, POS webhook sync, reseller dashboard, platform entity controls, public API keys.

## Section 4 - Core Problems Solved

- Problem: public information is inconsistent.
  - Who feels it: owner, staff, customers, chain HQ.
  - Operational consequence: staff and owner repeatedly answer "which menu/link/hour is current?"
  - Customer-facing consequence: lost trust before a visit/order.
  - How MenuList solves it: one canonical data source renders public menu, OBP, customer app, QR/physical surfaces, public API, and POS output.
  - Evidence: OBP files, public menu route, public API, POS sync, Menu Kit, customer app.
  - Visible or infrastructural: both.
- Problem: menus drift after edits.
  - Operational consequence: old PDFs, screens, outlet copies, and POS exports become stale.
  - Customer-facing consequence: price/item/availability mismatches.
  - How MenuList solves it: MCE, publish versioning, public cache invalidation, menu snapshots, MOL, POS signed delivery.
  - Evidence: MCE entry point (`src/lib/mce/index.ts:1-55`), MOL (`src/database/menuChangeLog/index.ts:1-17`), publish/cache behavior (`src/database/projects/index.ts:1146-1160`).
  - Visible or infrastructural: mostly infrastructural.
- Problem: owner setup is slow and brittle.
  - Operational consequence: business never reaches a clean live public state.
  - Customer-facing consequence: customers continue seeing screenshots and stale files.
  - How MenuList solves it: public menu upload, extraction, preview, claim flow, owner acceptance, onboarding.
  - Evidence: public create-menu and claim APIs (`src/app/api/public/create-menu/route.ts`, `src/app/api/public/create-menu/claim/route.ts`).
  - Visible or infrastructural: visible acquisition backed by hidden safeguards.
- Problem: public presence is not deployed into real-world surfaces.
  - Operational consequence: the official link exists but is not used on Google, Instagram, WhatsApp, counters, tables, bags, or screens.
  - Customer-facing consequence: customers still discover old links.
  - How MenuList solves it: Use MenuList, Presence Monitor, Menu Kit, UTM-tagged physical/social assets, public attribution.
  - Evidence: Menu Kit generator creates table tent, stickers, poster, delivery bag, takeaway card, Instagram story, WhatsApp status, Google Maps image, placement guide, and ZIP (`src/lib/menu-kit/menuKitGenerator.ts:1-97`).
  - Visible or infrastructural: both.
- Problem: chains need controlled local variation.
  - Operational consequence: master changes and local exceptions become conflict-prone.
  - Customer-facing consequence: inconsistent location experience.
  - How MenuList solves it: master/outlet inheritance, local overrides, propagation, billing/location controls.
  - Evidence: multi-outlet flags and resolver (`src/config/features.ts:658-708`, `src/lib/multiOutlet/resolveProject.ts`).
  - Visible or infrastructural: both.
- Problem: customers need timely operational notices.
  - Operational consequence: owners must manually warn customers on every surface.
  - Customer-facing consequence: customers arrive/order during closures or changed service.
  - How MenuList solves it: temp status cards/API and public banners.
  - Evidence: TempStatusCard sets auto-expiring public notices for OBP and digital menu (`src/components/templates/main-app/businessSettings/TempStatusCard.tsx:1-20`), feature flag enabled (`src/config/features.ts:1253`).
  - Visible or infrastructural: visible to customer, controlled by owner.
- Problem: reviews and reputation need controlled response, not hype.
  - Operational consequence: owner reacts badly or spends too much time.
  - Customer-facing consequence: public review response damages trust.
  - How MenuList solves it: review state API returns only booleans; reply suggestion route has safety rules, rate limits, billing/capacity checks, and fallbacks.
  - Evidence: review states API returns block/escalation booleans only (`src/app/api/reviews/states/route.ts:1-64`); reply suggestion route validates, rate limits, checks capacity, and validates output (`src/app/api/reviews/suggest/route.ts:1-140`).
  - Visible or infrastructural: mostly owner-side; public effect through better responses.
- Problem: the business needs proof that public surfaces are working.
  - Operational consequence: owner may abandon deployment if value is invisible.
  - Customer-facing consequence: public surfaces stay underused.
  - How MenuList solves it: calm owner dashboard, OBP metrics, analytics, health signals, customer app metrics.
  - Evidence: health signal cards show Strong/Stable/Weak/Watch/At Risk states only (`src/components/templates/main-app/dashboard/OwnerDashboard/HealthSignalCards.tsx:3-16`).
  - Visible or infrastructural: visible to owner, but should stay calm.

## Section 5 - Core Workflows

- Workflow: upload/extract/review/claim/publish.
  - Entry point: `/create-menu` and authenticated project creation.
  - Actor: SMB owner.
  - Hidden systems: public rate limiting, draft token, extraction, validation, claim transaction, onboarding.
  - Key UI: `CreateMenuClient`, preview/success pages, owner project/job review screens.
  - Strategic value: easiest acquisition proof of "simple outside, infrastructure inside."
  - Screenshot score: 9.
- Workflow: edit once, public outputs update.
  - Entry point: project editor/menu command center.
  - Actor: owner/operator.
  - Hidden systems: MCE, MOL, publish version, snapshots, cache invalidation.
  - Key UI: editor, quality banner, public menu, OBP, share outputs.
  - Strategic value: core public-truth loop.
  - Screenshot score: 10.
- Workflow: official business page setup.
  - Entry point: desktop/mobile business settings and OBP pages.
  - Actor: owner.
  - Hidden systems: business attributes, public route, action gating, language, schema, analytics, cache invalidation.
  - Key UI: `OfficialPageTab`, `MobileOfficialPageScreen`, `OBPResolvedSurface`.
  - Strategic value: strongest proof that MenuList is more than a menu.
  - Screenshot score: 10.
- Workflow: public customer opens menu/OBP/customer app.
  - Entry point: QR, custom domain, subdomain, OBP CTA, saved PWA.
  - Actor: customer.
  - Hidden systems: route resolver, SSR, public cache, analytics, language state, PWA handoff.
  - Key UI: `src/app/client/[[...slug]]/page.tsx`, OBP, customer app controller.
  - Strategic value: the customer-facing output is the product proof.
  - Screenshot score: 10.
- Workflow: deploy official link into real world.
  - Entry point: Share, Use MenuList, Presence Monitor, Menu Kit.
  - Actor: owner/staff.
  - Hidden systems: UTM-tagged assets, physical/social templates, public attribution.
  - Key UI: Menu Kit section, Presence Monitor, Share card.
  - Strategic value: shifts MenuList from software to deployed infrastructure.
  - Screenshot score: 9.
- Workflow: multi-location governance.
  - Entry point: Locations/chain controls.
  - Actor: HQ/master owner.
  - Hidden systems: master/outlet resolver, propagation, override event logging, outlet billing.
  - Key UI: locations/mobile locations, project inheritance indicators, outlet public pages.
  - Strategic value: chain-capable expansion narrative.
  - Screenshot score: 9.
- Workflow: temporary status and special menu.
  - Entry point: business settings/mobile temp status/special menu.
  - Actor: owner.
  - Hidden systems: auto-expiry, public banner, special menu switching, cache update.
  - Key UI: TempStatusCard, MobileTempStatusScreen, SpecialMenuCard, public banner.
  - Strategic value: public truth is time-sensitive, not just static menu data.
  - Screenshot score: 8.
- Workflow: reputation protection.
  - Entry point: review tool/guard.
  - Actor: owner.
  - Hidden systems: boolean risk states, AI reply suggestion with guardrails, capacity accounting.
  - Key UI: ReputationGuard, ReviewReplyTool.
  - Strategic value: extends public trust beyond menu correctness.
  - Screenshot score: 7.
- Workflow: integration/data authority.
  - Entry point: public API key, POS delivery, platform pull API.
  - Actor: technical partner/operator.
  - Hidden systems: API key hashing, ETags, signed payloads, delivery logs.
  - Key UI: public API settings, POS sync tab, integration docs.
  - Strategic value: proof that MenuList can become upstream data authority.
  - Screenshot score: 6 for SMB homepage; 9 for future infrastructure page.

## Section 6 - Infrastructure Signals

- Signal: MCE correctness validation.
  - Evidence: MCE runs client-side during save and stamps metadata with zero new Firestore collections (`src/lib/mce/index.ts:1-49`).
  - Strategic meaning: correctness is built into the save path, not bolted onto marketing.
  - Customer visibility: indirect.
  - Defensibility: medium-high.
- Signal: MOL append-only memory.
  - Evidence: "NO UI, NO owner visibility", immutable append-only log, debounced writes, future autonomous foundation (`src/database/menuChangeLog/index.ts:1-17`, `src/database/menuChangeLog/index.ts:48-56`, `src/database/menuChangeLog/index.ts:110-169`).
  - Strategic meaning: product learns operational patterns quietly.
  - Customer visibility: none.
  - Defensibility: high over time.
- Signal: publish versioning and snapshots.
  - Evidence: snapshots flag enabled and publish stamps version/freshness (`src/config/features.ts:481-496`, `src/database/projects/index.ts:1146-1160`).
  - Strategic meaning: public truth can be versioned, audited, and trusted.
- Signal: public cache invalidation.
  - Evidence: project/store/PWA/multi-outlet write paths revalidate public menu/OBP cache tags.
  - Strategic meaning: "update once" has technical backing.
- Signal: deterministic public routing.
  - Evidence: public routing doctrine fixes OBP root, `/menu`, canonical URLs, slug rules, and performance boundaries (`__docs__/client-menu/PUBLIC-ROUTING-DOCTRINE.md`).
  - Strategic meaning: links and QR codes behave like infrastructure.
- Signal: multi-outlet read-time inheritance.
  - Evidence: resolver merges master and outlet overrides instead of copying state (`src/lib/multiOutlet/resolveProject.ts`).
  - Strategic meaning: chain consistency without sync drift.
- Signal: physical deployment generator.
  - Evidence: Menu Kit creates multiple physical/social assets from the canonical URL in parallel and bundles a ZIP (`src/lib/menu-kit/menuKitGenerator.ts:33-97`).
  - Strategic meaning: the product extends into real-world customer surfaces.
- Signal: health/reputation signals avoid dashboards.
  - Evidence: health signals are single calm labels and review states return booleans only (`src/components/templates/main-app/dashboard/OwnerDashboard/HealthSignalCards.tsx:3-16`, `src/app/api/reviews/states/route.ts:1-64`).
  - Strategic meaning: MenuList keeps the owner from drowning in analytics.
- Signal: public API/POS sync.
  - Evidence: public business/menu API routes and POS delivery route exist (`src/app/api/public/v1/business/route.ts`, `src/app/api/public/v1/menu/route.ts`, `src/app/api/pos-sync/deliver/route.ts`).
  - Strategic meaning: MenuList can serve machine consumers, not only human pages.
- Signal: feature flag discipline.
  - Evidence: code flags separate enabled, future, cost-sensitive, and external-dependency features (`src/config/features.ts`).
  - Strategic meaning: the product can evolve without putting every system into public marketing.

## Section 7 - Hidden Strengths

- Hidden strength: codebase has outgrown the current homepage.
  - Why it matters: the next website should not be limited to old copy.
  - Evidence: current enabled flags include public API, POS Sync, OBP, Customer App, Menu Kit, temp status, reviews, health signals, MCE, MOL, and multi-outlet (`src/config/features.ts:481-1741`).
  - Competitor difficulty: these require route, data, public output, owner UX, and reliability systems together.
- Hidden strength: old website psychology is still valuable.
  - Why it matters: current page learned to speak to owners in outcomes, not internals.
  - Evidence: current website docs emphasize customer-facing readiness and language governance (`__docs__/main-website/main-website_content.md`, `__docs__/main-website/main-website_design-system.md`).
  - Competitor difficulty: many products either over-explain infrastructure or trivialize it as QR/menu builder.
- Hidden strength: physical and digital surfaces reinforce each other.
  - Why it matters: QR, Menu Kit, Customer App, OBP, screens, and public APIs create real dependency.
  - Evidence: Menu Kit templates plus customer app and OBP paths.
- Hidden strength: health and reputation systems preserve calm.
  - Why it matters: the product can report "Strong/Stable/Watch" without becoming analytics software.
  - Evidence: HealthSignalCards and Review States API.
- Hidden strength: MenuList can be chain-capable without becoming enterprise-heavy.
  - Why it matters: the same product can serve SMB and growing chains if marketed carefully.
  - Evidence: multi-outlet flags, resolver, propagation, outlet billing.
- Hidden strength: owner approval boundary protects trust.
  - Why it matters: AI/extraction can help setup without replacing business truth.
  - Evidence: menu intake identity docs and API.
- Hidden strength: public API/POS/pull layers create future ecosystem value.
  - Why it matters: once MenuList is the cleanest source, other systems can depend on it.
  - Evidence: public API routes and POS sync.

## Section 8 - Screenshot-Worthy Systems

- Official Business Page runtime.
  - Message: one official public identity for the business.
  - Supports: hero, proof, public-presence section.
  - Value obviousness: high.
  - Cleanup: use realistic store data, good cover/logo/photos, customer actions, menu CTA, language.
- Live public menu/customer browse.
  - Message: customers see a clean current menu.
  - Supports: hero, feature proof, workflow strip.
  - Value obviousness: high.
  - Cleanup: realistic menu items, prices, images, language/search/freshness.
- Owner publish/control surface.
  - Message: owner updates the source once.
  - Supports: workflow section.
  - Value obviousness: medium.
  - Cleanup: crop to publish/control/quality state; avoid editor clutter.
- MCE/menu quality surface.
  - Message: correctness is checked before public output.
  - Supports: proof section.
  - Value obviousness: medium.
  - Cleanup: show plain owner language, not internal rule details.
- Presence Monitor / Use MenuList.
  - Message: official link is deployed to customer touchpoints.
  - Supports: workflow/proof.
  - Value obviousness: medium-high.
  - Cleanup: show done/not done states without implying external verification.
- Menu Kit.
  - Message: the official menu moves into physical surfaces.
  - Supports: differentiation section and visual assets.
  - Value obviousness: high.
  - Cleanup: show actual generated assets, not generic marketing graphics.
- Customer App.
  - Message: customers can keep live access without an app-store app.
  - Supports: feature section.
  - Value obviousness: high.
  - Cleanup: use "Customer App" wording, not technical PWA language.
- Multi-outlet governance.
  - Message: one master, controlled outlet differences.
  - Supports: chain section.
  - Value obviousness: medium.
  - Cleanup: use clear HQ/location demo data.
- Temp Status banner/control.
  - Message: urgent public changes expire automatically.
  - Supports: operational truth section.
  - Value obviousness: high.
  - Cleanup: show a real customer-facing banner plus owner card.
- Health signals.
  - Message: MenuList watches customer-facing trust calmly.
  - Supports: proof/trust section.
  - Value obviousness: medium.
  - Cleanup: only show if enough real/demo data; avoid dashboard framing.
- Review reply/protection.
  - Message: public reputation is protected, not gamified.
  - Supports: secondary proof.
  - Value obviousness: medium.
  - Cleanup: avoid fake reviews/testimonials; use UI workflow.
- Public API/POS Sync.
  - Message: structured menu/business truth can feed other systems.
  - Supports: advanced proof/future infrastructure page.
  - Value obviousness: low for SMB homepage.
  - Cleanup: visualize as "POS receives update", not raw JSON.
- Public menu entry.
  - Message: start from a menu photo and become official.
  - Supports: acquisition/onboarding.
  - Value obviousness: high.
  - Cleanup: do a parity check before hero-leading with it.

## Section 9 - Public Positioning Opportunities

- Strongest territories:
  - Customer-facing business truth infrastructure.
  - One official source for menu, hours, links, actions, and public surfaces.
  - Public presence that stays correct after the owner changes the source.
  - Menu-led public authority for local businesses.
  - The system behind every customer-facing menu link.
- Strongest "why now":
  - Customers decide from public surfaces before visiting.
  - Business information changes faster than static PDFs/photos.
  - SMBs need a source that can feed QR, public page, screens, customer app, POS, and machine-readable endpoints.
- Strongest authority narratives:
  - OBP root as official public identity.
  - Public menu and customer app from the same source.
  - Physical surface deployment through Menu Kit.
  - MCE/MOL/snapshots as hidden proof of seriousness.
  - Public API/POS as advanced authority.
- Strongest workflow narratives:
  - Start with current menu -> review -> publish -> deploy official link.
  - Change once -> menu, OBP, customer app, physical assets, and integrations stay aligned.
  - HQ changes master -> outlets inherit safely.
  - Set temporary status -> public surfaces show it until expiry.
- Dangerous traps:
  - "Digital menu maker."
  - "AI menu generator."
  - "Restaurant website builder."
  - "All-in-one restaurant management."
  - "Social media/growth platform."
  - "Analytics dashboard."
  - "AI-powered smart dynamic platform."

## Section 10 - Proof & Trust Signals

- Proof: codebase feature breadth is real.
  - Evidence: feature flags and corresponding routes/components across OBP, PWA, POS, public API, Menu Kit, health, reviews, MCE, MOL, public menu entry.
  - Confidence: high for code existence, medium for public messaging until each workflow is visually verified.
  - Best use: internal strategy and screenshot planning.
- Proof: canonical truth pipeline.
  - Evidence: MCE, MOL, snapshots, publish/cache invalidation.
  - Confidence: high.
  - Best use: trust/proof section in plain language.
- Proof: public presence authority.
  - Evidence: OBP, public routing doctrine, customer app, Menu Kit, Presence Monitor.
  - Confidence: high.
  - Best use: hero/first proof block.
- Proof: chain governance.
  - Evidence: multi-outlet flags/resolver/propagation.
  - Confidence: high for implementation; market proof needs real customers.
  - Best use: mid-page or dedicated chain block.
- Proof: public API/POS.
  - Evidence: public API and POS routes.
  - Confidence: medium-high.
  - Best use: advanced trust, not primary SMB hero.
- Proof: health/reputation layer.
  - Evidence: HealthSignalCards, Review APIs, ReputationGuard, reply suggestion.
  - Confidence: medium. Needs live data/founder validation before making strong outcome claims.
  - Best use: subtle trust narrative.
- Proof: old website is preserved.
  - Evidence: current content backup and prompt README guardrail.
  - Confidence: high.
  - Best use: internal safety, not public marketing.

## Section 11 - Strategic Defensibility

- Switching costs:
  - QR, OBP links, Menu Kit assets, Google/Instagram/WhatsApp placement, Customer App installs, POS/public API consumers, and public URLs all increase replacement pain.
- Operational dependence:
  - Owner learns to update MenuList as the source and expects public outputs to follow.
- Authority accumulation:
  - Public page, schema, sitemaps, APIs, PWA identity, public attribution, and real-world deployed assets can turn MenuList into the default reference.
- Data gravity:
  - MOL, snapshots, analytics, health signals, review states, menu changes, API events, and customer app behavior compound over time.
- Behavioral lock-in:
  - "No action needed" operating mode is more defensible than engagement dashboards.
- Moat layers:
  - Canonical data quality, public route permanence, physical surface deployment, chain inheritance, machine-readable APIs, and historical event memory.
- Weak defensibility today:
  - Customer proof and adoption proof are not yet strong enough for bold public claims.
  - Some docs appear stale against current flags; codebase verification must continue before publishing exact feature availability.
  - GBP Sync and infrastructure discovery taxonomy/provenance/semantic/index are not ready for public promise because flags are off (`src/config/features.ts:626`, `src/config/features.ts:2193-2237`).

## Section 12 - Messaging Inputs

Raw headline territories:

1. The official source for what your customers see.
2. Keep your menu, hours, links, and public page correct from one place.
3. One business truth across QR, menu, page, app, screens, and integrations.
4. Update once. Every customer-facing surface follows.
5. Your public business presence, kept current.
6. Turn your menu into customer-facing infrastructure.
7. The source behind your official menu and business page.
8. Public presence that does not drift.
9. One controlled source for every customer link.
10. Your business looks current wherever customers check.
11. Menu truth is only the start.
12. The stable public layer for local businesses.
13. Publish once. Stay correct everywhere.
14. A live menu, official page, and customer app from one source.
15. Built for owners who cannot afford stale public information.

Subheadline territories:

1. Start with your current menu, then keep every public surface aligned.
2. Customers see the same approved information across your menu, official page, QR, screens, and customer app.
3. MenuList handles the public output while you keep one source current.
4. Built for owners who want correct public information without managing another dashboard.
5. Chains can keep a master menu while outlets stay locally accurate.
6. Temporary changes, public actions, customer app access, and physical QR assets all point back to one truth.
7. MenuList is simple where owners use it and serious where public reliability matters.
8. The menu is the wedge; customer-facing correctness is the system.
9. Your official link becomes the place customers can trust.
10. Public APIs and POS sync can consume the same source when your operation is ready.

Positioning directions:

1. Customer-facing business truth infrastructure.
2. Public presence authority layer.
3. Menu-led business data control plane.
4. Official page plus canonical menu source.
5. Public-output consistency system.
6. Multi-surface publishing infrastructure.
7. SMB public data authority.
8. Chain-capable menu governance.
9. Public business identity and action layer.
10. Quiet infrastructure for customer-facing correctness.

Category framings:

1. Public business truth infrastructure.
2. Customer-facing source-of-truth system.
3. Menu and public presence infrastructure.
4. Official business presence layer.
5. Canonical menu authority system.
6. Multi-surface publishing layer.
7. Local business public data system.
8. Customer-facing business information control plane.
9. Public output infrastructure.
10. Menu-led presence operating layer.

Trust/proof themes:

1. Correctness checks before output.
2. Change memory and snapshots.
3. Public pages revalidated after owner writes.
4. One official business page and menu source.
5. Physical deployment assets from the same link.
6. Customer app access without app-store complexity.
7. Master/outlet consistency for chains.
8. Temporary public notices with expiry.
9. Public API/POS integration readiness.
10. Calm health and reputation indicators.

CTA angle directions:

1. Create your official menu source.
2. Start from your current menu.
3. See your public page.
4. Publish your official link.
5. Build your live menu.
6. Prepare your customer-facing presence.
7. Turn your menu into a live source.
8. Set up your business truth.
9. Preview what customers will open.
10. Keep your public menu current.

## Section 13 - Weaknesses & Risks

- Stage 1 correction:
  - The previous Stage 1 output was directionally useful but gave too much authority to the existing website wording. This codebase-first revision supersedes it.
- Current website age risk:
  - The existing homepage was carefully crafted, but it predates or underrepresents newer code paths such as Menu Kit, health signals, reputation protection, temp status, public API/POS proof, stronger OBP, and public menu entry.
- Documentation drift risk:
  - Some strategy docs mention flags as off while current `src/config/features.ts` shows several now enabled. Code must win over older docs.
- Overclaim risk:
  - Enabled code does not automatically mean public proof, customer adoption, or production usage. Claims about outcomes, customer lift, reliability percentages, and adoption require founder/customer validation.
- Feature-bloat risk:
  - The product now has many surfaces. Website strategy must not become a feature catalog.
- SMB comprehension risk:
  - "Infrastructure", "canonical", "API", and "schema" can sound too technical. The homepage should translate them into "customers see the right thing."
- Pricing/payment risk:
  - Pricing is functional production code with auth, subscription, Razorpay, onboarding, top-ups, and account state. Do not treat it as static marketing.
- Visual proof risk:
  - Many strongest systems are hidden. Stage 3 and Stage 6 must create product-truth visuals without fake dashboards.
- External research risk:
  - Generic SaaS landing page research could dilute MenuList. Use it only to validate conversion mechanics, not to define product identity.

## Section 14 - Strategic Marketing Recommendation

- Best primary ICP to target first:
  - Non-technical SMB owner/operator with menu or service information that customers repeatedly check.
- Best workflow to lead homepage with:
  - Start from current menu -> publish official source -> deploy to OBP/menu/QR/customer app/physical surfaces -> keep it current from one place.
- Strongest proof block candidate:
  - "One source, every customer surface": OBP, live menu, QR/Menu Kit, Customer App, screens, POS/public API as layers from the same business truth.
- Strongest hero visual candidate:
  - A real product composite with the public OBP/live menu as the dominant surface, supported by small owner-side source controls and a few deployment surfaces. Do not use fake analytics dashboards.
- Strongest infrastructure narrative:
  - Public correctness: menu, business info, status, and customer actions stay aligned after owner changes the source.
- Strongest trust narrative:
  - MenuList has correctness checks, public routing, cache refresh, snapshots/change memory, and calm public health/reputation signals under the surface.
- Strongest operational-pain narrative:
  - "Customers keep seeing old information because no single system owns what is correct."
- Biggest messaging mistake to avoid:
  - Treating MenuList as a digital menu maker or AI menu generator.
- Biggest positioning opportunity:
  - Own the plain-language version of "customer-facing business truth infrastructure" for SMBs.
- Best long-term category framing:
  - Menu-led public presence authority layer for local businesses and chains.
- What to keep from the old website:
  - Owner psychology, restraint, public-readiness framing, clean visual calm, and avoidance of internal jargon.
- What not to keep as binding:
  - Exact old section order, exact copy, and any limitation that hides newer product truth.

## Section 15 - Evidence Map

- Codebase authority:
  - `src/config/features.ts`: current enabled/off capability map. Reveals actual product scope and claim boundaries.
  - `src/database/projects/index.ts`: save/publish/cache/version behavior. Reveals public truth propagation.
  - `src/lib/mce/index.ts`: correctness validation entry point. Reveals silent quality infrastructure.
  - `src/database/menuChangeLog/index.ts`: MOL event memory. Reveals data gravity and silent learning.
- Public runtime:
  - `src/app/client/[[...slug]]/page.tsx`: public menu route resolution.
  - `src/app/client/obp/*`: official business page runtime.
  - `src/components/templates/website/clientWebsite/index.tsx`: public menu renderer and analytics/PWA mount.
  - `src/app/api/revalidate/menu/route.ts`: public cache revalidation.
  - `__docs__/client-menu/PUBLIC-ROUTING-DOCTRINE.md`: public URL authority rules.
- Owner surfaces:
  - `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx`: desktop OBP controls.
  - `src/components/mobile/screens/MobileOfficialPageScreen.tsx`: mobile OBP controls.
  - `src/components/templates/main-app/useMenuList/PresenceMonitor.tsx`: public presence deployment.
  - `src/components/templates/main-app/businessSettings/TempStatusCard.tsx`: temporary public status.
  - `src/components/templates/main-app/dashboard/OwnerDashboard/HealthSignalCards.tsx`: calm owner health signals.
- Deployment/distribution:
  - `src/lib/menu-kit/menuKitGenerator.ts`: physical/social asset generation.
  - `src/components/customer/PublicMenuListAttribution.tsx`: platform attribution.
  - `src/lib/pwa/*`, `src/app/manifest.webmanifest/route.ts`, `src/components/customerApp/CustomerAppController.tsx`: customer app/PWA.
- Integration:
  - `src/app/api/public/v1/business/route.ts`: public business data.
  - `src/app/api/public/v1/menu/route.ts`: public menu data.
  - `src/lib/publicApi/auth.ts`: public API auth behavior.
  - `src/app/api/pos-sync/deliver/route.ts`: POS push sync.
- Chain:
  - `src/lib/multiOutlet/resolveProject.ts`: read-time master/outlet resolution.
  - `src/database/multiOutlet/propagation.ts`: outlet project propagation.
  - `src/database/multiOutlet/index.ts`: override and cache/event behavior.
- Reputation/trust:
  - `src/app/api/reviews/states/route.ts`: boolean reputation state.
  - `src/app/api/reviews/suggest/route.ts`: guarded AI reply suggestion.
  - `src/components/templates/main-app/reviews/ReputationGuard.tsx`: passive warning UI.
- Onboarding/acquisition:
  - `src/app/(website)/create-menu/*`: public menu entry UI.
  - `src/app/api/public/create-menu/route.ts`: menu upload/extraction draft.
  - `src/app/api/public/create-menu/claim/route.ts`: authenticated claim.
- Website history and psychology:
  - `__docs__/main-website/main-website_content.md`: old/current content intent and language guardrails.
  - `__docs__/main-website/main-website_design-system.md`: calm visual language.
  - `src/components/website/home/*`: implemented website section psychology.
  - Canonical cleanup later removed this restore backup; active docs and code are source truth.
- Pricing/payment boundary:
  - `src/app/(website)/pricing/page.tsx`
  - `src/components/website/pricing/*`
  - `src/components/website/pricing-pages/*`
  - `src/hooks/usePaymentHandler.ts`
  - `src/hooks/useRazorpayScript.ts`
  - `src/app/api/razorpay/*`

## Section 16 - Preservation And Scope Boundary Recommendation

- Preserve current website as backup:
  - Canonical cleanup later removed this restore backup; active docs and code are source truth.
  - Continue creating dated backups before Stage 4 implementation.
- Future website strategy should be codebase-first:
  - Old website content is not binding.
  - Old website psychology is useful.
  - Current codebase determines the product story.
- Safe default for future implementation:
  - Start with static/homepage/locale/website-only visual changes.
  - Do not touch pricing, auth, subscription, Razorpay, onboarding, or plan constants unless explicitly approved after a risk review.
- Protected surfaces:
  - Pricing route and pricing components.
  - Razorpay create/verify/top-up/webhook routes.
  - Payment hooks and Razorpay script hook.
  - Auth/sign-in/onboarding flows.
  - Plan constants and entitlement sync.
- Stage 2 instruction:
  - Use this codebase-first report as the Stage 2 source of truth.
  - Treat the old website as a psychology input: owner clarity, public readiness, conversion restraint, and visual calm.
  - Do not let the old page stop us from choosing a stronger current product narrative.

## Section 17 - Existing Website Psychology To Preserve

- The old/current website was built around an important owner psychology:
  - Owners do not buy infrastructure language directly.
  - They buy confidence that customers see a ready, current, trustworthy business.
  - The homepage must not feel like enterprise software or a technical architecture page.
  - The page should show public outcomes before internal systems.
- What this means for the new strategy:
  - Lead with customer-facing correctness, not feature count.
  - Show the public result before the owner dashboard.
  - Use screenshots of real customer surfaces.
  - Introduce infrastructure depth as proof, not as jargon.
  - Keep visual calm and premium restraint.
  - Avoid "AI", "smart", "dynamic", generic SaaS claims, and dashboard overload.
- What can change:
  - Section order.
  - Hero message.
  - Proof architecture.
  - Screenshots and visual system.
  - Feature emphasis.
  - Category framing.
- What should not change:
  - Owner-first clarity.
  - Product truth.
  - Low cognitive load.
  - Calm authority.
  - Preservation of existing website backup.
  - Pricing/payment safety boundaries.

## Stage 1 Cross-Check Log

- Authority hierarchy corrected:
  - README and Stage 1 prompt now state codebase-first, existing website as historical psychology/context.
- Codebase breadth checked:
  - Re-scanned feature flags, public routes, owner/mobile surfaces, OBP, public menu, MCE, MOL, Menu Kit, health signals, review routes, temp status, public API, POS Sync, multi-outlet, public menu entry, and customer app paths.
- Old website role corrected:
  - Existing site is no longer treated as the source of truth for product scope.
  - It is preserved as backup and used for psychology/conversion learning.
- Web search decision:
  - Not used in Stage 1 because the repo is the necessary authority. External research can be used later if Stage 2 needs category or competitive framing.
- Pricing boundary re-confirmed:
  - Pricing/payment/auth/onboarding/Razorpay remain protected high-risk surfaces.
- Main strategic change from previous output:
  - The next website may and probably should evolve beyond the current homepage if Stage 2 confirms the stronger codebase-first narrative.

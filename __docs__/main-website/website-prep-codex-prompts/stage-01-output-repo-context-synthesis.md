# Stage 1 Output - MenuList Repo Context Synthesis

**Status:** Stage 1 analysis output  
**Created:** May 16, 2026  
**Revision status:** Superseded by `stage-01-output-repo-context-synthesis-codebase-first.md` after owner clarified that current codebase truth outranks the existing website content. Keep this file only as the first-pass record.  
**Scope:** Main website strategy preparation only. No production website code changed.  
**Source prompt:** `__docs__/main-website/website-prep-codex-prompts/stage-01-repo-context-synthesis.md`  

## Section 1 - Product Reality Summary

- Product name: MenuList.
- One-sentence explanation: MenuList is a customer-facing business truth system that turns a business's menu, public identity, hours, links, screens, QR surfaces, customer app, and external machine-readable data into one controlled public source.
- What MenuList structurally appears to be:
  - Explicit evidence: the current website schema says MenuList manages "official menu and business information from one place" and keeps it correct across "QR, screens, web, print, official pages, and Customer Apps" (`src/components/website/SchemaMarkup.tsx:30`).
  - Explicit evidence: discovery docs define MenuList as "customer-facing business truth infrastructure" and the canonical structured source of menu truth, hours truth, public business identity, and structured restaurant data (`__docs__/discovery-infrastructure/README.md:9-14`).
  - Inference: the product is not just a menu editor. It is a canonical public-output layer with owner-side authoring, public rendering, routing, cache invalidation, metadata, discovery, and integration behavior.
- What category it superficially looks like:
  - Digital menu software, QR menu maker, restaurant menu page, or menu-from-photo tool.
  - This superficial category is visible in `/create-menu`, which lets a public visitor upload a menu photo and preview a structured menu (`src/app/(website)/create-menu/page.tsx:1-8`, `src/app/(website)/create-menu/CreateMenuClient.tsx:134-145`).
- What category it may actually be evolving toward:
  - Public business truth infrastructure.
  - Public-presence authority layer for SMBs.
  - Canonical menu + offering data layer for customer-facing surfaces and machine consumers.
  - Evidence: platform pull APIs expose business and menu truth to external systems with API keys, ETags, schema versioning, and rate limits (`__docs__/platform-pull-api/README.md:22-30`, `src/app/api/public/v1/menu/route.ts:20-103`, `src/app/api/public/v1/business/route.ts:20-138`).
- What layer of the SMB stack it occupies:
  - Owner-side source of truth for what customers see.
  - Public rendering and routing layer.
  - Distribution layer across QR, official page, customer app, screens, public APIs, POS webhooks, and discovery metadata.
  - Evidence: the website content states "Your menu becomes your single source of truth across all customer touchpoints" (`src/components/website/pricing-pages/index.tsx:163-172`).
- What MenuList explicitly avoids becoming:
  - A generic restaurant management suite.
  - A generic AI startup.
  - A restaurant website builder.
  - A digital signage/campaign management product.
  - Evidence: website/docs language guardrails reject "AI-powered", "Smart", "Dynamic", "website builder", and similar phrases across OBP, digital screens, POS sync, and main website docs (`__docs__/official-business-page/official-business-page_website.md:127-143`, `__docs__/digital-screens/digital-screens_website.md:78-82`, `__docs__/pos-webhook-sync/pos-webhook-sync_website.md:112-132`, `__docs__/main-website/main-website_content.md:813-850`).
- Business model if inferable:
  - Subscription plans plus credit packs/top-ups and Razorpay billing.
  - Evidence: `/pricing` renders `PricingWrapper`, which decides between pricing cards and subscription management based on session/subscription state (`src/app/(website)/pricing/page.tsx:1-30`, `src/components/website/pricing/PricingWrapper.tsx:15-99`).
  - Evidence: pricing UI uses plans, currency, billing interval, onboarding modal, payment success modal, and credit pack CTA (`src/components/website/pricing-pages/index.tsx:39-60`, `src/components/website/pricing-pages/index.tsx:280-379`).
  - Evidence: payment flow calls Razorpay subscription/top-up APIs through `usePaymentHandler` (`src/hooks/usePaymentHandler.ts:20-74`, `src/hooks/usePaymentHandler.ts:189-259`).

Surface perception vs underlying architecture:

- Surface perception:
  - A business owner uploads or edits a menu.
  - Customers open a menu, official business page, QR link, screen, or saved customer app.
  - Chains see a master menu and outlet controls.
- Underlying architecture:
  - Public route resolution maps tenant/subdomain/custom domain/outlet/project slugs into immutable store/project identity (`__docs__/client-menu/PUBLIC-ROUTING-DOCTRINE.md:24-31`, `__docs__/client-menu/PUBLIC-ROUTING-DOCTRINE.md:153-172`).
  - SSR public menus and OBP use cached Firestore reads, deterministic fallback behavior, cache tags, and schema output (`__docs__/client-menu/_impl.md:59-99`, `src/app/client/[[...slug]]/page.tsx:88-122`, `src/app/api/revalidate/menu/route.ts:1-84`).
  - Owner writes invalidate public cache across menu and OBP surfaces (`src/database/projects/index.ts:847-852`, `src/database/projects/index.ts:1146-1160`, `src/lib/cache/publicClientCache.ts:17-78`).
  - Multi-outlet menus are resolved at read-time by merging master data with outlet overrides, instead of relying on brittle copied data (`__docs__/multi-outlet-consistency/README.md:120-152`, `src/lib/multiOutlet/resolveProject.ts:169-235`).

## Section 2 - Strategic Product Identity

- Strategic role:
  - MenuList is the owner-approved source for customer-facing business truth.
  - It is strongest when framed as "customers see one correct version everywhere" rather than "make a beautiful menu."
- System-of-record characteristics:
  - Publish increments `menuVersion` and stamps `lastPublishedAt` (`src/database/projects/index.ts:1146-1155`).
  - Menu snapshots are feature-flagged as immutable publish records (`src/config/features.ts:483-496`).
  - Menu Observation logs owner interventions to an append-only event ledger with cost controls (`src/config/features.ts:450-481`).
  - Discovery docs explicitly describe entity identity invariants: IDs never change, imports reuse existing IDs, slugs are locked/redirected, and `menuVersion` is monotonic (`__docs__/discovery-infrastructure/README.md:174-186`).
- Truth authority mechanisms:
  - Owner acceptance boundary for menu-intake identity: extraction suggestions never overwrite store truth without owner confirmation (`__docs__/menu-intake-identity/menu-intake-identity_spec.md:38-56`).
  - MCE validation metadata is stamped during project saves without blocking owner flow (`src/database/projects/index.ts:820-840`).
  - Public output sanitizes internal metadata and strips implementation-only fields before customer rendering (`__docs__/client-menu/_impl.md:92-99`).
  - Public APIs expose structured, authenticated read-only truth using API keys, ETags, schema versions, and cache headers (`src/lib/publicApi/auth.ts:1-21`, `src/app/api/public/v1/business/route.ts:118-133`).
- Synchronization/control behavior:
  - Public pages are invalidated through `menu-store-{storeId}`, `store-{storeId}`, and `client-stores` tags (`src/app/api/revalidate/menu/route.ts:8-18`, `src/app/api/revalidate/menu/route.ts:53-77`).
  - Multi-outlet updates invalidate affected outlet project cache and log MOL events (`src/database/multiOutlet/index.ts:117-122`, `src/database/multiOutlet/index.ts:612-638`).
  - Project propagation auto-creates linked outlet projects and revalidates public output (`src/database/multiOutlet/propagation.ts:17-23`, `src/database/multiOutlet/propagation.ts:62-87`).
  - POS Sync sends signed full menu snapshots with versioning, timeout handling, delivery logs, and status updates (`src/app/api/pos-sync/deliver/route.ts:75-110`, `src/app/api/pos-sync/deliver/route.ts:148-206`).
- Infrastructure hidden beneath simple UX:
  - Public menu request flow uses middleware host routing, tenant lookup, project slug/default resolution, metadata, schema, analytics, and renderer handoff (`__docs__/client-menu/_impl.md:33-55`).
  - OBP resolves menu availability and project CTAs from `platformSummary/projects_{storeId}` through cached server reads (`src/app/client/obp/OBPContent.tsx:55-129`).
  - Customer App PWA is a public install surface behind simple owner/customer behavior, with dynamic manifest/icons and analytics (`src/config/features.ts:1635-1666`).
- Product behavior classification:
  - Utility: yes, because owners need simple upload/edit/share flows.
  - Workflow software: yes, for onboarding, extraction, publish, share, pricing, and billing.
  - Infrastructure: strongest identity; it controls public truth propagation.
  - Publishing layer: yes, through menu, OBP, QR, screens, customer app, public APIs, POS webhooks.
  - Presence layer: yes, through OBP, discovery setup, Google/Instagram/WhatsApp placement, schema, robots, sitemaps.
  - Synchronization layer: yes, through cache invalidation, POS delivery, multi-outlet propagation, public API, and future GBP.
  - Operational control layer: yes, for chain master/outlet governance and pricing/payment account state.
  - Identity layer: yes, through OBP and public routing doctrine.

## Section 3 - Ideal Customer Profiles

- Primary ICP: non-technical SMB owner/operator with a menu or service list that customers repeatedly need to see.
  - Pain profile: outdated PDFs/photos, customers asking for menu/hours/contact, scattered WhatsApp/Instagram/Google presence, no confidence that customers see current information.
  - Operational chaos reduced: repeated link sending, manual QR/screen/menu updates, manual menu typing, public info drift.
  - What MenuList centralizes/stabilizes: menu data, public business identity, customer action links, language output, official page, share surfaces.
  - Public-facing risk reduced: customers see stale prices, old hours, wrong contact info, broken menu links, or untrusted public pages.
  - Evidence: current homepage content leads with "Your business looks ready before customers decide" and positions MenuList as customer-facing output, not an internal dashboard (`__docs__/main-website/main-website_content.md:22-45`).
- Secondary ICP: growing multi-location SMB or small chain.
  - Pain profile: price/name/menu drift across locations; HQ cannot trust what each outlet displays.
  - Operational chaos reduced: separate menus, local unauthorized changes, outlet onboarding, billing quantity changes.
  - What MenuList centralizes/stabilizes: master menu, linked outlet projects, controlled local overrides, locations panel.
  - Public-facing risk reduced: customers at different outlets see inconsistent menus/prices/availability.
  - Evidence: multi-outlet docs define "HQ updates menu once -> All stores update instantly" (`__docs__/multi-outlet-consistency/README.md:46-53`) and master/outlet inheritance with overrides (`__docs__/multi-outlet-consistency/README.md:120-152`).
- Secondary ICP: businesses that depend on public-presence trust more than table-service menu workflow.
  - Pain profile: customers need a reliable public page, contact actions, photos, reviews, hours, and services.
  - Operational chaos reduced: sending different links, updating many public profiles, maintaining a separate website-like page.
  - What MenuList centralizes/stabilizes: OBP identity, action buttons, review link, photos, attributes, public menu links.
  - Public-facing risk reduced: scattered public identity and weak trust signals.
  - Evidence: OBP website content says it shows menu, hours, location, Google rating, photos, social links, service options, payment methods, and contact actions from MenuList business data (`__docs__/official-business-page/official-business-page_website.md:24-72`).
- Secondary ICP: integration-ready operators or vendors.
  - Pain profile: need structured menu/business data in POS, external tools, or machine-readable endpoints.
  - Operational chaos reduced: duplicate entry and divergent systems.
  - What MenuList centralizes/stabilizes: signed POS webhooks, public pull APIs, schema.org/JSON-LD, sitemaps.
  - Public-facing risk reduced: counter/POS price mismatches and stale external data.
  - Evidence: POS Sync website content says "edit once" and POS receives full updated menu automatically (`__docs__/pos-webhook-sync/pos-webhook-sync_website.md:21-30`, `__docs__/pos-webhook-sync/pos-webhook-sync_website.md:67-72`).

## Section 4 - Core Problems Solved

- Problem: inconsistent public information.
  - Who feels it: owner, customer, staff, chain HQ.
  - Operational consequence: repeated manual updates across Google, WhatsApp, Instagram, QR, screens, POS, public page.
  - Customer-facing consequence: stale menu, wrong hours, wrong link, lost trust before purchase.
  - How MenuList solves/reduces it: one public data layer powers OBP, menu, customer app, screens, APIs, and POS.
  - Evidence: website content says public business details stay updated from MenuList business data (`__docs__/official-business-page/official-business-page_website.md:11-27`); public API exposes business/menu truth (`src/app/api/public/v1/business/route.ts:67-117`, `src/app/api/public/v1/menu/route.ts:68-85`).
  - Visible or infrastructural: both.
- Problem: menu drift after edits.
  - Who feels it: owner and customer; HQ for chains.
  - Operational consequence: data divergence across PDFs, screens, outlet menus, POS, and public URLs.
  - Customer-facing consequence: mismatch between online menu and in-store/counter reality.
  - How MenuList solves/reduces it: publish versioning, cache invalidation, direct public SSR, POS signed snapshots, multi-outlet read-time resolution.
  - Evidence: `publishProject` increments `menuVersion`, stamps `lastPublishedAt`, writes project, and invalidates public cache (`src/database/projects/index.ts:1146-1160`).
  - Visible or infrastructural: mostly infrastructural; visible through fresh public outputs.
- Problem: update propagation friction.
  - Who feels it: busy SMB owner.
  - Operational consequence: every menu change becomes a checklist of downstream updates.
  - Customer-facing consequence: some surfaces lag behind.
  - How MenuList solves/reduces it: owner updates one project; public cache tags and downstream outputs refresh.
  - Evidence: `updateProject` invalidates public menu/OBP cache after each save (`src/database/projects/index.ts:847-852`); pricing page reinforces "QR, link, screens - instantly" (`src/components/website/pricing-pages/index.tsx:292-307`).
  - Visible or infrastructural: infrastructural.
- Problem: public routing ambiguity.
  - Who feels it: customers and operators using QR/custom domains/subdomains.
  - Operational consequence: broken or ambiguous URLs after renames, outlet additions, default menu changes.
  - Customer-facing consequence: customer does not reach the expected official page/menu.
  - How MenuList solves/reduces it: deterministic public-routing doctrine, immutable IDs, slug aliases/redirects, OBP root, `/menu` fallback.
  - Evidence: routing doctrine locks tenant URL -> OBP, QR permanence, canonical URL rules, ID vs slug model, deterministic resolver order (`__docs__/client-menu/PUBLIC-ROUTING-DOCTRINE.md:24-31`, `__docs__/client-menu/PUBLIC-ROUTING-DOCTRINE.md:153-190`).
  - Visible or infrastructural: infrastructural; visible as working links.
- Problem: multi-location inconsistency.
  - Who feels it: chain owner/HQ.
  - Operational consequence: every outlet becomes a separate source of truth.
  - Customer-facing consequence: inconsistent brand/menu/pricing experience.
  - How MenuList solves/reduces it: master menu, inheritance, overrides, propagation, chain control panel, outlet billing flags.
  - Evidence: multi-outlet feature flags and docs describe master menus, linking, overrides, instant propagation, outlet creation, billing, and chain panel (`src/config/features.ts:633-690`, `__docs__/multi-outlet-consistency/multi-outlet-consistency_website.md:20-63`).
  - Visible or infrastructural: both.
- Problem: onboarding/setup effort.
  - Who feels it: first-time owner.
  - Operational consequence: owner delays setup because menu entry is tedious.
  - Customer-facing consequence: no live menu or weak public page.
  - How MenuList solves/reduces it: `/create-menu` anonymous upload, image validation, temporary draft, extraction, preview, claim-to-store/project flow.
  - Evidence: public menu entry API is public, rate-limited, feature-gated, stores temporary drafts, triggers extraction, and returns preview URLs (`src/app/api/public/create-menu/route.ts:1-13`, `src/app/api/public/create-menu/route.ts:76-186`).
  - Visible or infrastructural: visible onboarding backed by infrastructure.
- Problem: proof of public effectiveness.
  - Who feels it: owner evaluating whether the public page/menu is worth maintaining.
  - Operational consequence: low motivation to keep outputs deployed.
  - Customer-facing consequence: public surfaces may not be installed/shared.
  - How MenuList solves/reduces it: OBP and public menu analytics show views, menu clicks, actions, shares, link taps, sources, and language usage.
  - Evidence: owner and mobile OBP metrics cards render page views, View Menu clicks, actions, link taps, shares, sources, and language usage (`src/components/templates/main-app/dashboard/OwnerDashboard/OBPMetricsCard.tsx:181-220`, `src/components/mobile/screens/dashboardSections/MobileOBPMetricsCard.tsx:170-214`).
  - Visible or infrastructural: visible to owner; analytics collection is infrastructural.

## Section 5 - Core Workflows

- Workflow: upload/extract/review/publish first menu.
  - Entry point: `/create-menu` or authenticated owner project flow.
  - Primary actor: SMB owner.
  - Workflow steps: upload photo/image -> validate/optimize -> draft/extract -> preview -> sign in/claim -> create tenant/store/project -> publish/share.
  - Hidden systems: public rate limit, safe mode, temporary signed URL, draft TTL, extraction operation log, auth claim transaction.
  - Key UI surfaces: `CreateMenuClient`, preview page, claim route, success page.
  - Trust/reliability mechanisms: crypto-random draft token, 24h TTL, file validation, auth required for claim, secure logs (`src/app/api/public/create-menu/route.ts:121-178`, `src/app/api/public/create-menu/claim/route.ts:43-80`, `src/app/api/public/create-menu/claim/route.ts:117-170`).
  - Why it matters strategically: proves "simple at surface, infrastructure underneath."
  - Screenshot-worthiness score: 9.
- Workflow: owner updates menu, public outputs refresh.
  - Entry point: authenticated project editor.
  - Primary actor: owner/operator.
  - Workflow steps: edit menu/project -> save or publish -> validate/stamp -> revalidate public cache -> customer sees fresh public menu/OBP.
  - Hidden systems: MCE metadata, `menuVersion`, `lastPublishedAt`, cache tags, MOL publish events.
  - Key UI surfaces: project editor, public menu renderer, OBP/menu footer freshness.
  - Trust/reliability mechanisms: cache invalidation after `updateProject` and `publishProject` (`src/database/projects/index.ts:847-852`, `src/database/projects/index.ts:1146-1175`).
  - Why it matters strategically: this is the core public truth loop.
  - Screenshot-worthiness score: 10.
- Workflow: official business page setup and sharing.
  - Entry point: business settings Official Page tab, mobile Official Page screen, Use MenuList/Discovery Setup.
  - Primary actor: owner.
  - Workflow steps: set descriptor/actions/photos/review/order/reservation/socials -> preview OBP -> copy/share official link -> mark placement on Google/Instagram/WhatsApp.
  - Hidden systems: OBP SSR, action toggles, localized public presence, media profiles, analytics attribution, cache invalidation via store updates.
  - Key UI surfaces: `OfficialPageTab`, `MobileOfficialPageScreen`, `OBPResolvedSurface`, `PresenceMonitor`.
  - Trust/reliability mechanisms: OBP runtime schema, language switcher, action gating by available store data, official page analytics (`src/app/client/obp/OBPResolvedSurface.tsx:447-650`, `src/components/templates/main-app/useMenuList/PresenceMonitor.tsx:56-96`).
  - Why it matters strategically: OBP is the canonical public identity endpoint, not a decorative landing page.
  - Screenshot-worthiness score: 10.
- Workflow: customer opens public menu.
  - Entry point: subdomain/custom domain/QR/PWA/OBP menu CTA.
  - Primary actor: end customer.
  - Workflow steps: route resolves tenant/store/project -> SSR menu payload -> renderer mounts analytics/PWA/customer controls -> customer searches, changes language, opens PDP, taps footer actions.
  - Hidden systems: deterministic route resolution, SSR timeout/retry, structured data, search/transliteration, analytics milestones, PWA session state.
  - Key UI surfaces: `src/app/client/[[...slug]]/page.tsx`, `ClientMenuRenderer`, `MainContentRenderer`, `MenuPageNew`.
  - Trust/reliability mechanisms: timeout/retry, fallback/default routing, low-network boundary, structured freshness (`__docs__/client-menu/_impl.md:59-99`, `__docs__/client-menu/_impl.md:122-136`).
  - Why it matters strategically: the customer-facing output is the product proof.
  - Screenshot-worthiness score: 10.
- Workflow: multi-outlet master-to-outlet consistency.
  - Entry point: Locations/chain controls, master project settings, outlet override controls.
  - Primary actor: chain HQ/owner.
  - Workflow steps: designate master -> add/link outlets -> propagate projects -> apply local overrides -> public outlet menus resolve master + overrides at render time.
  - Hidden systems: single-file constraint, in-memory master cache, read-time merge, override event logging, cache invalidation.
  - Key UI surfaces: Locations page, store switcher, outlet badges, inherited item states, public outlet OBP/menu.
  - Trust/reliability mechanisms: feature flags, chain invariants, cache invalidation, MOL events (`src/lib/multiOutlet/resolveProject.ts:169-252`, `src/database/multiOutlet/index.ts:44-119`, `src/database/multiOutlet/index.ts:590-638`).
  - Why it matters strategically: chain readiness creates higher-value positioning than "menu maker."
  - Screenshot-worthiness score: 9.
- Workflow: public-presence deployment checklist.
  - Entry point: Use MenuList / Discovery Setup.
  - Primary actor: owner.
  - Workflow steps: copy official link -> add to Google/Instagram/WhatsApp -> mark done -> auto-detected QR/screens/feedback show coverage.
  - Hidden systems: source attribution, timestamp-only menuPresence writes, auto-detection from existing data.
  - Key UI surfaces: `PresenceMonitor`, mobile More/Discovery Setup.
  - Trust/reliability mechanisms: manual status is clearly not external verification (`src/components/templates/main-app/useMenuList/PresenceMonitor.tsx:1-12`, `src/components/templates/main-app/useMenuList/PresenceMonitor.tsx:136-224`).
  - Why it matters strategically: turns MenuList into a public deployment system, not just an editor.
  - Screenshot-worthiness score: 8.
- Workflow: customer app/PWA.
  - Entry point: repeated customer visit/install prompt.
  - Primary actor: end customer, indirectly owner.
  - Workflow steps: customer visits menu -> eligible install prompt -> add to home screen -> opens live menu later.
  - Hidden systems: manifest route, icon endpoint, visit threshold, analytics events, privacy constraints.
  - Key UI surfaces: customer menu renderer, PWA controller, customer app docs.
  - Trust/reliability mechanisms: feature flag, no device fingerprinting, network-first offline boundary (`src/config/features.ts:1640-1666`, `__docs__/customer-app/customer-app_website.md:44-105`).
  - Why it matters strategically: makes MenuList a persistent customer access layer.
  - Screenshot-worthiness score: 8.
- Workflow: pricing/subscription activation.
  - Entry point: `/pricing`.
  - Primary actor: buyer/owner.
  - Workflow steps: choose plan/currency/billing -> onboarding modal if needed -> sign in -> create Razorpay subscription -> verify payment -> sync entitlement.
  - Hidden systems: session state, active subscription lookup, Razorpay scripts, API validation, tenant/store access checks, rate limit, entitlement sync.
  - Key UI surfaces: Pricing page, PlanCard, OnboardingModal, SubscriptionManagement.
  - Trust/reliability mechanisms: `withAuth`, tenant verification, billing mutation gate, rate limit, server-side payment verification (`src/app/api/razorpay/create-subscription/route.ts:21-83`, `src/app/api/razorpay/verify-subscription/route.ts:21-80`, `src/app/api/razorpay/verify-subscription/route.ts:123-216`).
  - Why it matters strategically: business model and onboarding are production-critical; do not casually redesign during marketing work.
  - Screenshot-worthiness score: 5 for strategy, 10 for risk boundary.

## Section 6 - Infrastructure Signals

- Signal: append-only menu observation.
  - Evidence: feature flag tracks price changes, availability toggles, item/category changes with debounced writes and no read-before-write (`src/config/features.ts:450-481`).
  - Why it matters strategically: creates operational memory/data gravity.
  - Customer visibility: not directly.
  - Defensibility: high over time if used for drift, history, and intelligence.
- Signal: immutable snapshots and monotonic publish state.
  - Evidence: snapshots on publish and `menuVersion`/`lastPublishedAt` during publish (`src/config/features.ts:483-496`, `src/database/projects/index.ts:1146-1155`).
  - Why it matters strategically: supports freshness, rollback/audit, public trust.
  - Customer visibility: through freshness/schema, not as internal mechanics.
  - Defensibility: medium to high.
- Signal: public cache invalidation contract.
  - Evidence: project/store/multi-outlet/PWA/domain writes call `revalidatePublicClientCache` or revalidate tags (`src/app/api/revalidate/menu/route.ts:8-18`, `src/database/stores/index.tsx:349-354`, `src/database/pwa/index.ts:102-127`).
  - Why it matters strategically: makes "update once" credible.
  - Customer visibility: customers see current output.
  - Defensibility: high operational reliability.
- Signal: deterministic public routing doctrine.
  - Evidence: doctrine locks OBP root, immutable IDs, canonical URL per resource, no heuristic routing, 3 cached-read performance bound (`__docs__/client-menu/PUBLIC-ROUTING-DOCTRINE.md:24-31`, `__docs__/client-menu/PUBLIC-ROUTING-DOCTRINE.md:174-210`).
  - Why it matters strategically: protects QR permanence and public trust.
  - Customer visibility: links keep working.
  - Defensibility: high because it prevents URL chaos.
- Signal: SSR timeout/retry/graceful degradation.
  - Evidence: public menu implementation lists SSR timeout, transient retry, skeleton loading, and graceful degradation (`__docs__/client-menu/_impl.md:59-71`); OBP has timeout/retry wrappers (`src/app/client/obp/OBPContent.tsx:30-53`).
  - Why it matters strategically: public pages behave like infrastructure, not dashboard screens.
  - Customer visibility: pages load or degrade quietly.
  - Defensibility: medium.
- Signal: multi-outlet read-time inheritance.
  - Evidence: outlet project inherits master and resolves at render time instead of copying data (`__docs__/multi-outlet-consistency/README.md:145-152`, `src/lib/multiOutlet/resolveProject.ts:169-235`).
  - Why it matters strategically: chain consistency without sync drift.
  - Customer visibility: outlet menus stay consistent.
  - Defensibility: high for chain fit.
- Signal: public API and POS sync.
  - Evidence: API key hashing, ETags, rate limit, structured errors; POS signed webhooks with version/delivery logs (`src/lib/publicApi/auth.ts:1-21`, `src/app/api/pos-sync/deliver/route.ts:107-164`).
  - Why it matters strategically: MenuList can become an upstream menu/business data authority for external systems.
  - Customer visibility: not directly.
  - Defensibility: high if integrations grow.
- Signal: controlled feature flags and cost notes.
  - Evidence: `FEATURE_FLAGS` includes public API, OBP, customer app, menu kit, multi-outlet, infrastructure taxonomy/provenance/semantic/discovery flags, many with cost notes (`src/config/features.ts:1000-1020`, `src/config/features.ts:1540-1686`, `src/config/features.ts:2180-2237`).
  - Why it matters strategically: supports gradual activation without breaking current product.
  - Customer visibility: only enabled features.
  - Defensibility: medium; execution discipline matters.

## Section 7 - Hidden Strengths

- Hidden strength: OBP as canonical identity endpoint.
  - Why it matters: gives each business one official public presence surface, not just a menu URL.
  - Evidence: OBP root routing and cached menu info (`src/config/features.ts:1006-1020`, `src/app/client/obp/OBPContent.tsx:171-225`).
  - Why competitors may struggle: requires routing, business metadata, action links, menu CTAs, language, schema, analytics, and cache logic to work together.
- Hidden strength: public truth propagation.
  - Why it matters: "update once" only works if cache and downstream public surfaces stay coherent.
  - Evidence: project save/publish and multi-outlet override paths revalidate public output (`src/database/projects/index.ts:847-852`, `src/database/multiOutlet/index.ts:617-638`).
  - Why competitors may struggle: many menu tools stop at editing and do not own public runtime correctness.
- Hidden strength: current website already evolved beyond generic menu-maker copy.
  - Why it matters: future stages should sharpen, not reset.
  - Evidence: website README says active site is v2 Hype/Domination with v3 Infrastructure Authority preserved for future evolution (`__docs__/main-website/README.md:1-16`, `__docs__/main-website/README.md:79-92`).
  - Why competitors may struggle: positioning can compound only if the current content layer stays coherent.
- Hidden strength: chain-grade architecture under SMB-simple UX.
  - Why it matters: allows SMB start and multi-location expansion without category jump.
  - Evidence: master/outlet inheritance, override, propagation, outlet billing, chain control flags (`__docs__/multi-outlet-consistency/README.md:155-210`, `src/config/features.ts:633-708`).
  - Why competitors may struggle: balancing local overrides with canonical master truth is not a simple CRUD feature.
- Hidden strength: discovery and machine readability as future authority.
  - Why it matters: menu/business truth becomes useful beyond human webpages.
  - Evidence: 18+ schema types shipped; public API; POS webhook; llms docs; sitemaps/robots (`__docs__/discovery-infrastructure/README.md:57-115`).
  - Why competitors may struggle: requires structured data discipline and public-output governance.
- Hidden strength: owner-control boundary around automated extraction.
  - Why it matters: avoids damaging business truth with over-automation.
  - Evidence: Menu Intake Identity explicitly says AI identity is suggestion, not truth, and never overwrites fields without owner acceptance (`__docs__/menu-intake-identity/menu-intake-identity_spec.md:38-56`).
  - Why competitors may struggle: "AI menu generator" positioning often hides quality/control risks.
- Hidden strength: product-led distribution loops.
  - Why it matters: public pages, QR, Customer App, Menu Kit, and "Powered by MenuList" can create organic acquisition.
  - Evidence: marketing docs describe product-embedded distribution (`__docs__/main-website/main-website_marketing.md:45-58`, `src/components/customer/PublicMenuListAttribution.tsx:14`).
  - Why competitors may struggle: requires public surface quality and not just paid ads.

## Section 8 - Screenshot-Worthy Systems

- Public menu customer browse.
  - Strategic message: customers see a clean, searchable, current menu.
  - Visual strength: direct product proof; works as hero or first feature proof.
  - Supports: hero, feature section, workflow strip, proof block.
  - Obviousness: high.
  - Cleanup needed: capture with realistic business data, good item images, visible language/search/freshness, no internal debug state.
- OBP official business page.
  - Strategic message: one official link carries business identity, hours, actions, menu, reviews, photos, attributes.
  - Visual strength: shows MenuList as public-presence authority.
  - Supports: hero, public presence section, proof block.
  - Obviousness: high.
  - Cleanup needed: use a real-looking store with cover, logo, Google rating, action buttons, and menu CTA.
- OBP setup controls in desktop/mobile.
  - Strategic message: owner controls public presence from one place.
  - Visual strength: proves infrastructure has a manageable owner surface.
  - Supports: feature section, workflow strip.
  - Obviousness: medium; needs callouts.
  - Cleanup needed: avoid showing too many toggles; crop to link/actions/photo area.
- Use MenuList / Discovery Setup presence monitor.
  - Strategic message: MenuList helps deploy the official page to Google, Instagram, WhatsApp, QR, screens, feedback.
  - Visual strength: turns "public presence" into an action checklist.
  - Supports: proof block, workflow strip.
  - Obviousness: medium.
  - Cleanup needed: show partial completion plus one next action; avoid implying automatic verification (`src/components/templates/main-app/useMenuList/PresenceMonitor.tsx:222-224`).
- Multi-outlet master/outlet governance.
  - Strategic message: one master menu, outlet overrides, brand consistency.
  - Visual strength: strong differentiator for chains.
  - Supports: feature section, comparison visual, proof block.
  - Obviousness: medium-high.
  - Cleanup needed: use clear HQ/outlet names, visible inherited/override states, no test IDs.
- Public routing / OBP-to-menu flow.
  - Strategic message: official page leads to the right menu without broken/ambiguous URLs.
  - Visual strength: multi-surface diagram or browser strip can show canonical routing.
  - Supports: workflow strip.
  - Obviousness: medium; needs concise labels.
  - Cleanup needed: use real domain/subdomain examples and avoid over-technical route names.
- Upload menu -> preview -> publish.
  - Strategic message: easy start, infrastructure output.
  - Visual strength: strong acquisition funnel.
  - Supports: onboarding story, hero alternate, feature section.
  - Obviousness: high.
  - Cleanup needed: current `/create-menu` copy leans "digital menu creator"; later strategy should refine to truth-infrastructure without hurting conversion (`src/app/(website)/create-menu/page.tsx:18-29`).
- Analytics insights / OBP metrics.
  - Strategic message: owners see customer interaction signals, not vanity dashboards.
  - Visual strength: concrete proof of customer actions.
  - Supports: proof section.
  - Obviousness: medium.
  - Cleanup needed: avoid dashboard overload; use 3-5 key metrics and calm explanatory text.
- Customer App install surface.
  - Strategic message: repeat customers get one-tap live access without app-store work.
  - Visual strength: phone home screen + live menu.
  - Supports: feature section, social asset.
  - Obviousness: high.
  - Cleanup needed: must not say PWA publicly; use "Customer App" language (`__docs__/customer-app/customer-app_website.md:204-220`).
- Digital screens.
  - Strategic message: public output from the same source appears in-store.
  - Visual strength: TV/menu board proof.
  - Supports: feature section, surfaces strip.
  - Obviousness: high.
  - Cleanup needed: avoid signage/campaign language; show actual menu, not decorative slides (`__docs__/digital-screens/digital-screens_website.md:78-82`).
- Public API / POS Sync system.
  - Strategic message: MenuList can feed external systems.
  - Visual strength: better as understated integration/proof graphic than hero.
  - Supports: proof section, FAQ, future infrastructure page.
  - Obviousness: low for SMB; high for technical buyers.
  - Cleanup needed: show "POS receives update" status, not raw API payload.
- Pricing page.
  - Strategic message: plan/business model clarity.
  - Visual strength: not a hero proof asset for Stage 1.
  - Supports: conversion path, not infrastructure storytelling.
  - Obviousness: high.
  - Cleanup needed: do not change in Stage 1; treat as high-risk because it controls auth/payment/subscription behavior.

## Section 9 - Public Positioning Opportunities

- Strongest positioning territories:
  - "Your business truth, live everywhere customers look."
  - "The official source for your menu, hours, and customer actions."
  - "Update once. Every customer surface stays correct."
  - "Public presence infrastructure for serious local businesses."
  - "Menus are the start. Public correctness is the system."
- Strongest why-now narratives:
  - Customers decide before they visit, and they decide from public surfaces owners do not fully control.
  - Businesses now need their own official source because Google, WhatsApp, Instagram, QR codes, and customer apps all point somewhere.
  - Menus, prices, hours, and service details change too often for static PDFs/photos.
- Strongest authority narratives:
  - Official Business Page as canonical public identity.
  - Deterministic public URLs and QR permanence.
  - Structured data/schema/public APIs for machines.
  - Owner-approved truth boundary before extraction writes business identity.
- Strongest workflow narratives:
  - Upload -> review -> publish -> share everywhere.
  - Edit once -> public menu/OBP/screens/customer app/POS stay current.
  - HQ master menu -> outlet menus inherit and adjust safely.
- Strongest infrastructure narratives:
  - Public cache invalidation after owner writes.
  - Monotonic `menuVersion`, publish timestamps, immutable snapshots.
  - Public routing doctrine and canonical URL rules.
  - Pull/push integration layer.
- Strongest SMB operational pain narratives:
  - No more sending stale screenshots/PDFs.
  - No more "which menu link is current?"
  - No more mismatch between menu, counter, Google, and WhatsApp.
  - No more per-outlet drift.
- Dangerous positioning traps:
  - Calling MenuList a "QR menu generator" commoditizes the product.
  - Calling it a "website builder" conflicts with OBP language and overpromises design freedom.
  - Leading with "AI menu generator" undermines owner-truth controls and language governance.
  - Over-indexing on integrations/architecture risks enterprise heaviness for SMBs.
  - Overusing "restaurant" may hide service-menu/SMB expansion; current code and copy already support non-food/service catalog behavior.

## Section 10 - Proof & Trust Signals

- Proof point: active current website is documented/versioned and locale-backed.
  - Evidence: main website README, content doc, implementation doc, locales (`__docs__/main-website/README.md:1-16`, `__docs__/main-website/main-website_impl.md:139-147`).
  - Confidence: high.
  - Marketing use: internal confidence and content governance, not public proof.
  - Belongs: planning docs, not homepage.
- Proof point: OBP official page includes structured trust signals.
  - Evidence: OBP renders status, actions, language, schema, FAQ schema, Google reviews/photos/attributes (`src/app/client/obp/OBPResolvedSurface.tsx:630-677`, `src/app/client/obp/OBPResolvedSurface.tsx:743-760`).
  - Confidence: high.
  - Marketing use: public presence authority.
  - Belongs: hero/feature/proof.
- Proof point: public output is SSR/cached/revalidated.
  - Evidence: public menu infrastructure docs and revalidation API (`__docs__/client-menu/_impl.md:59-80`, `src/app/api/revalidate/menu/route.ts:1-84`).
  - Confidence: high.
  - Marketing use: "stays current" proof.
  - Belongs: proof/FAQ, subtly.
- Proof point: chain consistency via master/outlet model.
  - Evidence: multi-outlet docs and resolver (`__docs__/multi-outlet-consistency/README.md:120-152`, `src/lib/multiOutlet/resolveProject.ts:169-235`).
  - Confidence: high.
  - Marketing use: multi-location section.
  - Belongs: feature/proof.
- Proof point: public API/POS Sync.
  - Evidence: public API docs and POS route (`__docs__/platform-pull-api/README.md:22-30`, `src/app/api/pos-sync/deliver/route.ts:86-206`).
  - Confidence: medium-high.
  - Marketing use: infrastructure trust; avoid leading with it for basic SMBs.
  - Belongs: proof/FAQ/future infrastructure page.
- Proof point: customer app/PWA.
  - Evidence: feature flag docs and customer-app content (`src/config/features.ts:1640-1666`, `__docs__/customer-app/customer-app_website.md:44-105`).
  - Confidence: high.
  - Marketing use: repeat customer access.
  - Belongs: feature section.
- Proof point: language/multilingual public rendering.
  - Evidence: website languages list and public language state rules (`src/config/websiteLanguages.ts:18-27`, `__docs__/client-menu/_impl.md:129-133`).
  - Confidence: high.
  - Marketing use: India-first/multilingual trust.
  - Belongs: feature/proof.
- Proof point: pricing/payment security gates.
  - Evidence: Razorpay create/verify routes use `withAuth`, tenant access, billing mutation gate, rate limit, validation, server-side verification (`src/app/api/razorpay/create-subscription/route.ts:21-83`, `src/app/api/razorpay/verify-subscription/route.ts:21-80`).
  - Confidence: high.
  - Marketing use: not public headline; important implementation boundary.
  - Belongs: internal scope guardrail.

## Section 11 - Strategic Defensibility

- Switching costs:
  - Once a business deploys MenuList links to QR, Google, Instagram, WhatsApp, screens, POS, and customer app, replacing it risks breaking public access.
  - Evidence: Presence Monitor covers Google/Instagram/WhatsApp plus auto-detected QR/screens/feedback (`src/components/templates/main-app/useMenuList/PresenceMonitor.tsx:56-131`).
- Operational dependence:
  - Owner saves/publishes in one place; public outputs and downstream systems depend on that source.
  - Evidence: cache invalidation and POS delivery are tied to project changes (`src/database/projects/index.ts:847-852`, `src/app/api/pos-sync/deliver/route.ts:3-9`).
- Authority accumulation:
  - OBP, schema.org, sitemaps, public API, and stable URLs make MenuList the reference layer for a business.
  - Evidence: discovery infrastructure lists schema, robots/sitemaps, llms docs, public API, POS webhook (`__docs__/discovery-infrastructure/README.md:57-115`).
- Data gravity:
  - Menu Observation, snapshots, analytics, language usage, customer actions, and POS/public API events can build historical context.
  - Evidence: Menu Observation flag and analytics rate/debounce/session logic (`src/config/features.ts:450-481`, `src/lib/analytics/unified.ts:1-30`).
- Behavioral lock-in:
  - Owners learn "publish once, share official link, public surfaces stay current."
  - Evidence: current pricing and website copy already express "one system" and "go live in minutes" (`src/components/website/pricing-pages/index.tsx:163-172`, `src/components/website/pricing-pages/index.tsx:284-323`).
- Default-presence dynamics:
  - OBP root and `/menu` alias make MenuList the default public endpoint.
  - Evidence: routing doctrine locks tenant root to OBP and `/menu` fallback (`__docs__/client-menu/PUBLIC-ROUTING-DOCTRINE.md:73-85`, `__docs__/client-menu/PUBLIC-ROUTING-DOCTRINE.md:146-151`).
- Long-term moat layers:
  - Canonical public URLs, public API, schema, POS delivery, multi-outlet graph, event history, customer app installs, and public placement footprint.
- Currently weak or not yet defensible:
  - Customer proof/testimonials are placeholders in several feature website docs and need founder/customer validation (`__docs__/official-business-page/official-business-page_website.md:84-89`, `__docs__/customer-app/customer-app_website.md:134-155`).
  - Discovery infrastructure has built-but-off future layers such as taxonomy/provenance/semantic/discovery index (`src/config/features.ts:2180-2237`).
  - GBP Sync is documented but feature flag is off until prerequisites are met (`src/config/features.ts:620-626`).
  - Some `/create-menu` docs are draft while the route exists and flag is on; this needs a future parity check before heavily marketing it (`__docs__/public-menu-entry/public-menu-entry_impl.md:1-7`, `src/config/features.ts:2244-2259`).

## Section 12 - Messaging Inputs

Raw headline territories:

1. The official source for everything your customers see.
2. One menu truth across every customer surface.
3. Your menu, hours, and public links kept correct from one place.
4. A business page and menu that stay current together.
5. Where your public business information lives.
6. Update once. Customers see the right version everywhere.
7. Public presence infrastructure for local businesses.
8. Menus are the start. Public correctness is the system.
9. One controlled source for menu, contact, hours, and actions.
10. Keep your business ready wherever customers check.
11. Your customer-facing business data, handled from one place.
12. The stable public layer for your menu and business identity.
13. Make every link customers open show the right information.
14. One official link. One live menu. One current business profile.
15. Built for owners who cannot afford stale public information.

Subheadline territories:

1. Upload, review, publish, and keep every public surface aligned.
2. Customers open your menu, official page, QR, screens, and app from the same live source.
3. Change a price or hour once; MenuList handles the public output.
4. Built for SMB owners who need the result right without managing a dashboard all day.
5. Your official page, live menu, and share surfaces stay tied to approved business data.
6. For chains, one master menu keeps outlet menus aligned while local changes stay controlled.
7. For customers, every link opens a clean, current version of your business.
8. For owners, setup stays simple while the public layer stays dependable.
9. Connect menu truth to public pages, screens, customer apps, and external systems.
10. Keep Google, WhatsApp, QR codes, and customer links pointing to a reliable source.
11. MenuList turns messy menu files and public details into a stable customer-facing presence.
12. Your team updates the source; customers see the finished surface.
13. The owner sees simple controls; customers see current information.
14. Public links, structured data, and customer actions stay under one controlled system.
15. Designed for businesses that need trust, not another tool to manage.

Positioning directions:

1. Customer-facing business truth infrastructure.
2. Public-presence authority layer.
3. Canonical menu and business information system.
4. Multi-surface publishing control layer.
5. Operational consistency layer for SMBs and chains.
6. Official business page + menu source of truth.
7. Menu truth propagation system.
8. Public output infrastructure for local businesses.
9. Owner-approved customer information layer.
10. Business identity and offering data authority.

Category framings:

1. Public business truth infrastructure.
2. Customer-facing source-of-truth system.
3. Menu and public presence infrastructure.
4. Official business presence layer.
5. Public menu authority system.
6. Multi-surface menu publishing layer.
7. SMB public data infrastructure.
8. Customer-facing business information control plane.
9. Canonical local business data layer.
10. Menu-led public presence system.

Trust/proof themes:

1. Update once, public output refreshes.
2. Official page root, menu links, QR permanence.
3. Monotonic publish version and freshness metadata.
4. OBP actions and customer analytics.
5. Multi-outlet inheritance and controlled overrides.
6. Public schema, sitemap, and API output.
7. Owner approval before business identity changes.
8. Server-side payment verification and billing gates.
9. Signed POS delivery with versioning.
10. Feature-flagged, cost-aware infrastructure.

CTA angle directions:

1. Start from your current menu.
2. Create your official menu source.
3. See what customers will open.
4. Publish your business page.
5. Set up your public menu.
6. Upload and preview your menu.
7. Keep your menu current.
8. Build your official link.
9. Start with one menu.
10. Prepare your customer-facing presence.

## Section 13 - Weaknesses & Risks

- Unclear positioning risk:
  - The product can look like a QR menu builder if marketing leads with upload/photo/QR instead of public truth and presence authority.
- Current website risk:
  - The active homepage is already crafted and versioned; a generic rebuild would erase current content investment. The README explicitly preserves current v2 and future v3 direction (`__docs__/main-website/README.md:1-16`).
- UI may undersell infrastructure depth:
  - Many strongest systems are invisible by design: cache invalidation, snapshots, routing doctrine, public API, POS signatures, multi-outlet read-time resolution.
  - Future website visuals must show outcomes and workflows, not raw architecture.
- Product may look simpler than it really is:
  - OBP, customer app, menu kit, public API, POS sync, discovery, chain governance can be hidden behind "menu".
  - This is strategically good only if the homepage hints at infrastructure without overwhelming SMB owners.
- Risk of unsupported public claims:
  - Customer proof, adoption metrics, speed claims, repeat-visit lift, and "used by X businesses" placeholders need founder validation before publishing (`__docs__/customer-app/customer-app_website.md:134-155`, `__docs__/official-business-page/official-business-page_website.md:84-89`).
- Pricing/payment risk:
  - `/pricing` is not static marketing only; it contains auth, subscription state, onboarding, Razorpay scripts, plan selection, payment verification, top-ups, subscription management.
  - Later website implementation must not casually change pricing components or routes.
- Feature-flag/state risk:
  - GBP Sync is off; infrastructure taxonomy/provenance/semantic/discovery index are off; public claims must distinguish shipped from future/flagged.
- Public Menu Entry parity risk:
  - Docs say draft/pending while code has routes and feature flag on. Before using `/create-menu` as primary acquisition hero, do a dedicated parity check.
- Language governance risk:
  - Public copy must avoid "AI-powered", "Smart", "Dynamic", generic hype, and technical jargon.
- Visual proof risk:
  - Current image-assets doc says hero phone screenshot is still a placeholder and needs real capture (`__docs__/main-website/main-website_image-assets.md:54-63`, `__docs__/main-website/main-website_image-assets.md:129-138`).

## Section 14 - Strategic Marketing Recommendation

- Best primary ICP to target first:
  - Non-technical SMB owner with a menu/service list and public-presence drift pain.
  - Reason: current product and website are strongest when showing "your customers see the right thing everywhere" without enterprise-heavy explanation.
- Best workflow to lead homepage with:
  - Owner updates/publishes once -> customer-facing surfaces stay current.
  - Support with OBP + menu + QR/screens/customer app proof.
- Strongest proof block candidate:
  - "Where your business stays current" showing menu, official page, QR, screens, Customer App, public API/POS as layers from one source.
- Strongest hero visual candidate:
  - Real product composite: official business page + live menu + owner-side publish/control state, with small propagation labels.
- Strongest infrastructure narrative:
  - Public truth consistency: one approved source powers every customer surface.
- Strongest trust narrative:
  - Official page and live menu are updated from MenuList business data, with cache/freshness/routing under the hood.
- Strongest operational-pain narrative:
  - Customers keep seeing stale menus, old PDFs, wrong hours, and scattered links unless the business owns one public source.
- Biggest messaging mistake to avoid:
  - Reducing MenuList to "digital menu maker" or "AI menu generator."
- Biggest positioning opportunity:
  - Own "customer-facing business truth infrastructure" in plain SMB language.
- Best long-term category framing:
  - Menu-led public presence authority system for local businesses and chains.

## Section 15 - Evidence Map

- Website governance:
  - `__docs__/main-website/README.md`: current v2.6 website status, active v2 strategy, future v3 infrastructure authority, website file map, archive link. Marketing value: protects existing landing-page craft and avoids generic resets.
  - `__docs__/main-website/main-website_content.md`: current approved content, hero/problem/solution/surfaces/workflow/analytics/pricing/about/meta/language governance. Marketing value: source of current story and copy constraints.
  - `__docs__/main-website/main-website_impl.md`: website route/component architecture and pricing page reuse decision. Marketing value: identifies static vs functional website surfaces.
  - `.codex/workflows/website.md`: website workflow rules, version awareness, i18n, content governance, component preservation. Marketing value: prevents unsafe website edits.
- Current website implementation:
  - `src/app/(website)/page.tsx`: renders SchemaMarkup, Header, HomePage, Footer, ScrollToTop. Marketing value: current homepage route.
  - `src/components/website/home/HomePage.tsx`: current homepage section order. Marketing value: shows live narrative stack.
  - `src/components/website/home/HeroSection.tsx`: current hero, session-aware CTA, rotating surface cards. Marketing value: existing hero investment.
  - `src/components/website/home/CustomerBrowseSection.tsx`: current customer menu preview. Marketing value: screenshot proof source.
  - `src/components/website/home/AnalyticsInsightsSection.tsx`: current analytics/presence proof story. Marketing value: proof section source.
  - `public/locales/menulist.ai/*.json`: locale-backed website copy. Marketing value: any copy edits must maintain i18n.
- Public runtime:
  - `src/app/client/[[...slug]]/page.tsx`: public route resolver, project lookup, special menu logic, metadata/schema, cached rendering. Marketing value: product truth behind "official/current links."
  - `__docs__/client-menu/_impl.md`: customer-facing menu implementation and infrastructure hardening. Marketing value: credible public-output proof.
  - `__docs__/client-menu/PUBLIC-ROUTING-DOCTRINE.md`: public URL doctrine, OBP root, QR permanence, ID/slug rules. Marketing value: authority/URL permanence narrative.
  - `src/components/templates/website/clientWebsite/index.tsx`: customer menu renderer, analytics/PWA/controller mount. Marketing value: customer-facing runtime proof.
- Official Business Page:
  - `src/app/client/obp/OBPContent.tsx`: server-side OBP data resolution, menu info, brand/outlet OBP branching. Marketing value: official page as real infrastructure.
  - `src/app/client/obp/BrandOBPContent.tsx`: multi-store brand OBP location selector. Marketing value: chain public presence proof.
  - `src/app/client/obp/OBPResolvedSurface.tsx`: shared OBP visual/runtime surface, schema, actions, language, attributes. Marketing value: strongest screenshot source.
  - `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx`: owner-side OBP controls. Marketing value: owner simplicity proof.
  - `src/components/mobile/screens/MobileOfficialPageScreen.tsx`: mobile OBP management surface. Marketing value: mobile owner parity proof.
- Multi-outlet:
  - `__docs__/multi-outlet-consistency/README.md`: master/outlet model, docs hub, flags, key files. Marketing value: chain-grade story.
  - `src/lib/multiOutlet/resolveProject.ts`: read-time master/outlet merge, cache, single-file constraint. Marketing value: hidden infrastructure proof.
  - `src/database/multiOutlet/propagation.ts`: master project propagation to outlets. Marketing value: update-once story.
  - `src/database/multiOutlet/index.ts`: master designation, overrides, cache invalidation, event logging. Marketing value: governance proof.
- Public presence and distribution:
  - `src/components/templates/main-app/useMenuList/PresenceMonitor.tsx`: deployment checklist and surface tracking. Marketing value: public-presence workflow proof.
  - `src/config/features.ts`: Menu Kit, Customer Communication Kit, Customer App, Public API, Public Menu Entry, OBP, multi-outlet, infrastructure flags. Marketing value: capability map and claim boundaries.
  - `src/components/customer/PublicMenuListAttribution.tsx`: platform attribution. Marketing value: product-led growth loop.
- Onboarding/extraction:
  - `src/app/(website)/create-menu/*`: no-auth upload/preview/success website flow. Marketing value: acquisition/onboarding visual.
  - `src/app/api/public/create-menu/route.ts`: public, rate-limited, feature-gated upload + draft extraction. Marketing value: simple setup backed by safeguards.
  - `src/app/api/public/create-menu/claim/route.ts`: authenticated claim to tenant/store/project. Marketing value: conversion path.
  - `__docs__/menu-intake-identity/menu-intake-identity_spec.md`: owner-accepted identity suggestions and truth risk guard. Marketing value: trust boundary.
- Discovery and external systems:
  - `__docs__/discovery-infrastructure/README.md`: schema, robots/sitemap, freshness, machine truth endpoints, identity invariants. Marketing value: future authority narrative.
  - `src/app/api/public/v1/business/route.ts` and `src/app/api/public/v1/menu/route.ts`: read-only public API. Marketing value: infrastructure proof.
  - `src/lib/publicApi/auth.ts`: hashed API keys, ETags, structured errors. Marketing value: integration trust.
  - `src/app/api/pos-sync/deliver/route.ts`: signed menu snapshots to POS. Marketing value: synchronization proof.
- Pricing/payment:
  - `src/app/(website)/pricing/page.tsx`: pricing route wrapper.
  - `src/components/website/pricing/PricingWrapper.tsx`: session/subscription branching.
  - `src/components/website/pricing-pages/index.tsx`: plan selection, billing interval, currency, onboarding modal, success modal, credit packs.
  - `src/hooks/usePaymentHandler.ts`: Razorpay subscription/top-up actions.
  - `src/app/api/razorpay/create-subscription/route.ts` and `src/app/api/razorpay/verify-subscription/route.ts`: auth, tenant, validation, rate-limit, server verification. Marketing value: scope boundary and conversion-risk awareness.

## Section 16 - Canonical Scope Boundary Recommendation

- Current website implementation is the canonical default. Do not keep parallel source-code website versions in the repo.
- Historical strategy, audit, and planning documents may remain as context, but they are not restoration sources and must not override current runtime code.
- Future implementation work should:
  - edit the canonical files directly,
  - validate the changed routes before handoff,
  - remove any dead alternate source code introduced during exploration,
  - preserve pricing, subscription, onboarding, auth, and payment logic unless that logic is explicitly in scope.
- Current approved website-state docs:
  - `__docs__/main-website/README.md`
  - `__docs__/main-website/main-website_content.md`
  - `__docs__/main-website/main-website_impl.md`
  - `__docs__/main-website/main-website_design-system.md`
  - `__docs__/main-website/main-website_image-assets.md`
  - `__docs__/main-website/main-website_marketing.md`
  - `__docs__/main-website/main-website_seo-aeo.md`
- Changes that can safely stay static/homepage-only in later stages:
  - Main homepage section strategy and copy.
  - `src/components/website/home/*` visual/story refinements.
  - Website locale keys under `Website.*` only.
  - CSS/layout styles in website-only CSS if they do not affect pricing/shared payment components.
  - Screenshot placeholders/composites for homepage storytelling.
- Changes that are broader website-surface changes:
  - Header/footer navigation.
  - Shared website layout/provider changes.
  - Locale restructuring.
  - SEO metadata/schema changes across multiple website routes.
  - `/create-menu` acquisition flow.
  - New feature pages under `(website)`.
- Changes that could affect pricing/auth/subscription/payment/onboarding/Razorpay:
  - `src/app/(website)/pricing/page.tsx`
  - `src/components/website/pricing/*`
  - `src/components/website/pricing-pages/*`
  - `src/hooks/usePaymentHandler.ts`
  - `src/hooks/useRazorpayScript.ts`
  - `src/app/api/razorpay/*`
  - `src/app/(global-pages)/signin/*`
  - onboarding routes/utilities including `src/lib/onboarding/createTenantStore.ts`
  - plan constants in `src/data/PlatformPlansList*` or `src/data/common`
- Pricing page recommendation:
  - Leave `/pricing` unchanged for the next implementation stage unless the approved strategy explicitly requires pricing copy/layout work.
  - Treat pricing as a production payment/onboarding surface, not static marketing content.
  - If pricing copy needs alignment, start with docs and low-risk visible copy only, then run a dedicated billing/payment risk review before code edits.
- What requires separate pricing/payment risk review:
  - Any change to plan selection, currency defaults, billing interval, onboarding modal behavior, `purchaseIntent`, session refresh, subscription lookup, Razorpay API calls, payment verification, top-up flow, subscription management, plan constants, or billing entitlement sync.

## Stage 1 Cross-Check Log

- Current website preserved: verified the prompt pack guardrail and existing backup path are recorded in `__docs__/main-website/website-prep-codex-prompts/README.md:35-58`; backup file exists under `_archive/`.
- Current website strategy checked: reviewed main website README/content/impl/design/image/SEO docs and active homepage component order before writing conclusions.
- Public runtime checked: reviewed public routing doctrine, public menu implementation, route resolver behavior, OBP server surface, OBP shared runtime surface, and public cache invalidation.
- Owner/mobile parity checked at synthesis level: reviewed desktop OBP settings, mobile OBP screen, desktop/mobile OBP metrics, and Presence Monitor.
- Pricing boundary checked: reviewed pricing route, wrapper, pricing renderer, payment hook, create-subscription API, and verify-subscription API; recommendation is to leave pricing/payment unchanged in Stage 2-4 unless separately approved.
- Shipped vs future/flagged checked: separated enabled production capabilities from flagged/off or founder-validation areas, especially GBP Sync and infrastructure discovery layers.
- Main risk after Stage 1: many capabilities are real, but the homepage must not overclaim unvalidated customer outcomes or feature-flagged future infrastructure.

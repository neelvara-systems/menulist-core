# Canonica Website (canonica.app)

> **Feature:** Public marketing website for Canonica product
> **Status:** ✅ IMPLEMENTED — refreshed for AI-built SaaS founders, self-service Canonica, and agent-readable public discovery
> **Date:** 2026-05-31
> **Domain:** canonica.app (production) | ecomsai.com (Vercel Preview / QA) | localhost:3000/__canonica (dev)
> **Feature Flag:** None required (static marketing site)
> **Route Group:** `src/app/sites/canonica/`

---

## Document Index

| # | Document | Audience | Purpose |
|---|----------|----------|---------|
| 1 | **README.md** (this file) | Everyone | Master index |
| 2 | `canonica-website_spec.md` | CEO/PM | Business requirements, page architecture |
| 3 | `canonica-website_impl.md` | Developers | Technical blueprint, file paths, routing |

## Related Strategy

- `../self-sellable-product-strategy.md` — Canonica's non-enterprise ICP, AI-built SaaS founder positioning, pricing direction, website message bank, and sellable-launch task list. Use this before changing public Canonica website copy.

---

## Quick Reference

### Pages and Public Agent Files

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Homepage | Launch-ready support hero for SaaS founders + first-screen page-aware demo + support knowledge map + missed-question review loop + dashboard-style product proof + best-fit/not-fit + setup funnel + day-one launch pack + bento widget/hosted-help install + trust controls + behind-the-scenes engine + system coverage + comparison + pricing preview + objections + CTA |
| `/product` | Product | Self-serve product overview with visual workflow proof for setup, team access, in-app widget, hosted help, custom owner Q&A, safe ticket context, approved answers, releases, and support gaps |
| `/product/launch-setup` | Product Area | Landing-style page for setting up support: workspace setup, team access, starter knowledge, app pages, widget key, and readiness |
| `/product/page-aware-widget` | Product Area | Landing-style page for in-app widget runtime, safe context, allowed origins, blocked routes, canonical answers, and owner FAQ answers |
| `/product/support-control` | Product Area | Landing-style page for hosted help, docs, FAQ, custom owner Q&A, changelog, ticket fallback, feedback review, Support Board, conversations, and weekly support review |
| `/product/knowledge-governance` | Product Area | Landing-style page for reviewing approved answers, stale support, repeated-question signals, coverage, and trust metrics |
| `/product/team-access` | Product Feature | Standalone feature page for workspace members, Canonica roles, owner-passcode sharing, owner reset, force sign-out, and workspace-scoped access |
| `/product/knowledge-base` | Product Feature | Standalone feature page for reviewed articles, imports, product-surface assignment, FAQ generation, and hosted help publishing |
| `/product/faq-management` | Product Feature | Standalone feature page for owner-written Q&A, article-backed FAQs, owner review, surface-aware display, and source-linked refresh |
| `/product/changelog` | Product Feature | Standalone feature page for release notes connected to product surfaces, affected support answers, and drift review |
| `/product/tickets` | Product Feature | Standalone feature page for fallback tickets, safe debugging context, and ticket-to-knowledge signal loops |
| `/product/support-board` | Product Feature | Standalone feature page for private owner/staff support cards, internal notes, status history, selected follow-up, and answer-proposal handoff |
| `/product/feedback-review` | Product Feature | Standalone feature page for private feedback review, ratings, feature requests, suggestions, Support Board handoff, and answer-proposal governance |
| `/product/workflow-notifications` | Product Feature | Standalone feature page for Slack/email workflow notifications, digest-first governance alerts, test delivery, health summaries, and bounded delivery |
| `/product/proactive-help` | Product Feature | Standalone feature page for configured page-aware proactive prompts backed by active triggers and approved support summaries |
| `/use-cases` | Use Cases | AI-built SaaS and founder/operator scenarios by support problem |
| `/use-cases/ai-built-saas` | Use Case | Support path for AI-built SaaS apps that launched before docs, tickets, and approved answers caught up |
| `/use-cases/vibe-coded-saas` | Use Case Alias | Canonicalized campaign/search alias for the AI-built SaaS use case; do not use as the main navigation label |
| `/use-cases/founders` | Use Case | Solo-founder support loop for launching before hiring support |
| `/use-cases/support-teams` | Use Case | Reduce repeated tickets while keeping owner-approved answer control |
| `/use-cases/product-teams` | Use Case | Product-surface drift, release review, and support friction visibility |
| `/use-cases/engineering` | Use Case | Safe widget install, route context, and governed retrieval for engineering teams |
| `/page-aware-support-widget` | SEO Landing | Page-aware support widget page with concrete before/after support example and manual screenshot boundary |
| `/hosted-help-center-for-saas` | SEO Landing | Hosted SaaS help center page for docs, FAQ, and changelog on support domains |
| `/support-widget-for-solo-founders` | SEO Landing | Solo-founder support widget page focused on launching support before hiring a team, including optional user-attached visual context |
| `/demo` | Demo | Static page-aware support demo with no Firebase or AI calls |
| `/pre-onboarding` | Pre-Onboarding Kit | Public preparation page for customers using AI coding agents to create Canonica-ready source packages before Knowledge Intake |
| `/pre-onboarding.md` | Pre-Onboarding Prompt | Machine-readable master prompt for Codex, Cursor, Windsurf, Antigravity, Claude Code, and other AI agents using repo, multi-product repo, docs, website, or owner-note sources |
| `/pre-onboarding/guide` | Pre-Onboarding Guide | End-to-end public runbook for owners and AI agents before Canonica Knowledge Intake |
| `/pre-onboarding/owner-guide.md` | Owner Guide | Machine-readable owner checklist for source preparation, review, upload, and live-support gates |
| `/pre-onboarding/agent-guide.md` | Agent Guide | Machine-readable operating rules for AI coding agents preparing Canonica input packages |
| `/install` | Agent Install Layer | Primary install surface for copying the Canonica AI install packet, downloading the agent kit, reading the frozen v1 widget contract, and verifying runtime status |
| `/install/ai-agent` | AI Agent Install | Copyable agent packet for Codex, Claude Code, Cursor, Windsurf, and other coding agents |
| `/install/manual` | Manual Install | Human-readable v1 widget script install steps |
| `/install/frameworks/*` | Framework Install Guides | Next.js, React, Vue, Plain HTML, Shopify-style, and Webflow install pages with agent-ready snippets |
| `/install.md`, `/install/**/*.md` | Machine-Readable Install Docs | Markdown mirrors generated from the Canonica install contract for coding agents, including `/install/contracts.md` for the v1 widget contract |
| `/agents/canonica/*` | Agent Kit Files | Public AGENTS.md, CLAUDE.md, Cursor, Windsurf, skill, and ZIP download generated from the same v1 contract |
| `/integrations` | Integrations | Slack and email workflow notifications for support governance, including test delivery, compact health, bounded delivery, and controlled adapter boundaries |
| `/pricing` | Pricing | INR Starter/Growth/Studio packaging, beta setup, and support-credit top-up explanation |
| `/resources` | Resources | Canonica learning hub for AI-built SaaS evaluation, setup, feedback review, widget install, governance, and safety |
| `/updates` | Updates | Public product update timeline for product and website changes without using dashboard-owned changelog routes |
| `/security` | Security | Trust controls for widget context, user-initiated screenshots, hosted help domains, safe ticket debugging context, tenant separation, Canonica role permissions, owner-approved answers, runtime limits, and responsible disclosure |
| `/faq` | FAQ | Founder questions about setup, team access, widget context, feedback review, screenshots, hosted help, custom domains, safe ticket context, FAQ generation, pricing, tickets, and data handling |
| `/about` | About | Company beliefs + Canonica operating principles |
| `/contact` | Contact | Canonica-owned inquiry form plus direct contact paths for setup, demos, pricing, security, and partnerships |
| `/get-started` | Get Started | Self-service onboarding for a new Canonica workspace, first team members, app pages, and widget key |
| `/privacy-policy` | Privacy Policy | Public privacy summary for account, team access, workspace, support, and widget data |
| `/terms-of-service` | Terms of Service | Public terms summary for account, content, widget, and service usage |
| `/llms.txt` | Agent Context | Short agent-readable Canonica product, route, and non-goal context |
| `/llms-full.txt` | Extended Agent Context | Detailed agent-readable product boundaries, public routes, runtime limits, and structured-data guidance |

### Key Files

| File | Purpose |
|------|---------|
| `src/app/sites/canonica/layout.tsx` | Layout with metadata, OG tags, SEO |
| `src/app/sites/canonica/theme.ts` | Canonica public-site theme contract: Dark Control Plane colors, primary accent, status colors, and browser theme color |
| `src/app/sites/canonica/styles.css` | Tailwind directives + CSS variables |
| `src/app/sites/canonica/scroll-reveal.css` | Canonica-specific viewport reveal motion for public website sections, cards, CTAs, and footer groups |
| `src/app/sites/canonica/page.tsx` | Homepage (server component) |
| `src/app/sites/canonica/productAreas.ts` | Shared product-area navigation and descriptions |
| `src/app/sites/canonica/product/launch-setup/page.tsx` | Product-area landing page for Launch Setup |
| `src/app/sites/canonica/product/page-aware-widget/page.tsx` | Product-area landing page for Page-Aware Widget |
| `src/app/sites/canonica/product/support-control/page.tsx` | Product-area landing page for Support Control |
| `src/app/sites/canonica/product/knowledge-governance/page.tsx` | Product-area landing page for Knowledge Governance |
| `src/app/sites/canonica/product/ProductFeatureRoutePage.tsx` | Shared server wrapper for product feature pages |
| `src/app/sites/canonica/product/team-access/page.tsx` | Product feature page for Team Access |
| `src/app/sites/canonica/product/knowledge-base/page.tsx` | Product feature page for Knowledge Base |
| `src/app/sites/canonica/product/faq-management/page.tsx` | Product feature page for FAQ Management |
| `src/app/sites/canonica/product/changelog/page.tsx` | Product feature page for Changelog |
| `src/app/sites/canonica/product/tickets/page.tsx` | Product feature page for Tickets |
| `src/app/sites/canonica/product/support-board/page.tsx` | Product feature page for Support Board |
| `src/app/sites/canonica/product/feedback-review/page.tsx` | Product feature page for Feedback Review |
| `src/app/sites/canonica/product/workflow-notifications/page.tsx` | Product feature page for Workflow Notifications |
| `src/app/sites/canonica/product/proactive-help/page.tsx` | Product feature page for Proactive Help |
| `src/app/sites/canonica/productFeatures.ts` | Shared product-feature route data, copy, and sitemap source |
| `src/app/sites/canonica/use-cases/page.tsx` | Use-case page for AI-built SaaS and founder/operator support scenarios |
| `src/app/sites/canonica/use-cases/ai-built-saas/page.tsx` | AI-built SaaS use-case landing page |
| `src/app/sites/canonica/use-cases/vibe-coded-saas/page.tsx` | Canonicalized campaign/search alias for the AI-built SaaS use-case page |
| `src/app/sites/canonica/use-cases/founders/page.tsx` | Founder use-case landing page |
| `src/app/sites/canonica/use-cases/support-teams/page.tsx` | Support-team use-case landing page |
| `src/app/sites/canonica/use-cases/product-teams/page.tsx` | Product-team use-case landing page |
| `src/app/sites/canonica/use-cases/engineering/page.tsx` | Engineering use-case landing page |
| `src/app/sites/canonica/page-aware-support-widget/page.tsx` | SEO landing page for page-aware widget search intent |
| `src/app/sites/canonica/hosted-help-center-for-saas/page.tsx` | SEO landing page for hosted help-center search intent |
| `src/app/sites/canonica/support-widget-for-solo-founders/page.tsx` | SEO landing page for solo-founder support search intent |
| `src/app/sites/canonica/install/page.tsx` | Agent install overview generated from Canonica Widget Contract v1 |
| `src/app/sites/canonica/install/InstallContractPage.tsx` | Shared public install page renderer for overview, AI-agent, framework, verification, security, contract, and changelog pages |
| `src/app/sites/canonica/install/markdownRoute.ts` | Shared Markdown response helper for install `.md` mirrors |
| `src/app/sites/canonica/agents/canonica/agentRoute.ts` | Public generated AGENTS.md, CLAUDE.md, Cursor, Windsurf, skill, and ZIP responses |
| `src/lib/canonica/installContract/` | Single source of truth for the v1 widget contract, Markdown docs, llms text, agent prompts, and agent kit files |
| `src/app/widget/v1/canonica-widget.js/route.ts` | Stable public v1 script URL backed by the existing widget runtime |
| `src/app/sites/canonica/integrations/page.tsx` | Integrations landing page for Slack/email workflow notifications, test delivery, compact health, and controlled adapter boundaries |
| `src/app/sites/canonica/resources/page.tsx` | Public resources hub |
| `src/app/sites/canonica/updates/page.tsx` | Public website update log |
| `src/app/sites/canonica/demo/page.tsx` | Static product demo route |
| `src/app/sites/canonica/demo/CanonicaPublicDemo.tsx` | Client-side demo interaction state |
| `src/app/sites/canonica/pre-onboarding/page.tsx` | Public Pre-Onboarding Kit page |
| `src/app/sites/canonica/pre-onboarding.md/route.ts` | Machine-readable pre-onboarding master prompt route |
| `src/app/sites/canonica/pre-onboarding/guide/page.tsx` | Detailed public owner/agent guide page |
| `src/app/sites/canonica/pre-onboarding/owner-guide.md/route.ts` | Machine-readable owner guide route |
| `src/app/sites/canonica/pre-onboarding/agent-guide.md/route.ts` | Machine-readable agent guide route |
| `src/lib/canonica/preOnboardingPrompt.ts` | Shared Canonica pre-onboarding prompt text and output contract |
| `src/app/sites/canonica/security/page.tsx` | Public security/trust page with facts, runtime controls, and disclosure |
| `src/app/sites/canonica/faq/page.tsx` | Public FAQ page with FAQ structured data |
| `src/app/sites/canonica/contact/page.tsx` | Public contact page |
| `src/app/sites/canonica/contact/ContactForm.tsx` | Client contact form that posts to the Canonica public contact API |
| `src/app/sites/canonica/privacy-policy/page.tsx` | Public privacy policy page |
| `src/app/sites/canonica/terms-of-service/page.tsx` | Public terms of service page |
| `src/app/api/canonica/public/contact/route.ts` | Canonica-only public contact endpoint with validation, rate limiting, honeypot handling, and Firestore write |
| `src/app/sites/canonica/sitemap.xml/route.ts` | Canonica product-domain sitemap |
| `src/app/sites/canonica/robots.txt/route.ts` | Canonica product-domain robots policy |
| `src/app/sites/canonica/llms.txt/route.ts` | Short Canonica-specific agent-readable context for product-domain crawlers and browser agents |
| `src/app/sites/canonica/llms-full.txt/route.ts` | Extended Canonica-specific agent-readable context, product boundaries, and action limits |
| `src/app/sites/canonica/siteConfig.ts` | Public site URL, sitemap page list, and shared metadata constants |
| `src/app/sites/canonica/enginePillars.ts` | Shared implemented Canonica engine pillar content |
| `src/app/sites/canonica/systemCoverage.ts` | Shared implemented Canonica system coverage groups |
| `src/app/sites/canonica/components/StructuredData.tsx` | Homepage Organization/WebSite/SoftwareApplication JSON-LD |
| `public/canonica-og-image.png` | 1200x630 public social preview image |
| `public/canonica-logo.svg` | Single Canonica icon-mark SVG asset for metadata and static asset references |
| `public/canonica-logo-mark-wide.png` | Cropped infinity-mark PNG source for splash/icon generation and metadata-adjacent surfaces |
| `src/app/sites/canonica/components/CanonicaLogoMark.tsx` | Shared inline SVG icon-mark component used across header, footer, diagrams, loaders, and dashboard navigation without PNG UI usage |
| `src/app/sites/canonica/components/CanonicaFlowDiagram.tsx` | Reusable Canonica hub, column-based sequence, and loop diagrams with logo-only core, ripple rings, dotted SVG paths, homepage-style pulse strokes, and border-only output highlights |
| `src/app/sites/canonica/components/CanonicaProofBlocks.tsx` | Reusable proof blocks for before/after examples, status snapshots, and fit/decision tiles that reduce text-heavy sections without adding runtime data calls |
| `src/app/sites/canonica/components/SectionHeader.tsx` | Shared centered section-introduction treatment for eyebrow, heading, and supporting copy across homepage, product, high-intent public pages, and SEO page templates |
| `public/canonica-favicon.ico` | Canonica favicon bundle with 16, 32, and 48px PNG entries |
| `public/canonica-icon-*.png` | Canonica square favicon/PWA icon family generated from the same recolored source mark |
| `public/canonica-splash/apple-splash-*.png` | Canonica iOS startup image family used by Canonica website and dashboard PWA metadata |
| `public/canonica.webmanifest` | Canonica web app manifest |
| `src/lib/canonica/pwaAssets.ts` | Canonica PWA startup image helper that keeps splash metadata out of root app defaults |
| `src/app/sites/canonica/components/Header.tsx` | Shared header with desktop nav and right-side mobile drawer |
| `src/app/sites/canonica/components/Footer.tsx` | Shared footer with link columns |
| `src/app/sites/canonica/components/CanonicaLink.tsx` | Dev/production-aware Link component |
| `src/app/sites/canonica/components/CanonicaAnalytics.tsx` | Optional GA/measurement-id conversion event tracker with no Firestore writes |
| `src/app/sites/canonica/components/CanonicaScrollReveal.tsx` | Layout-level client island that applies restrained viewport reveal effects across Canonica public pages |
| `src/constants/canonica/routes.ts` | Lightweight Canonica dashboard route constants used by public client islands without importing sidebar icon metadata |
| `src/app/sites/canonica/components/HeroSection.tsx` | Launch-ready support hero with setup-first CTAs |
| `src/app/sites/canonica/components/SupportKnowledgeMapSection.tsx` | Homepage and product-page visual map showing support knowledge inputs, Canonica control plane, and output surfaces |
| `src/app/sites/canonica/components/HomePageAwareDemoSection.tsx` | Homepage tabbed static page-aware demo section |
| `src/app/sites/canonica/components/ClosedLoopSection.tsx` | Homepage animated missed-question loop from page question to reviewed support fix |
| `src/app/sites/canonica/components/BestFitSection.tsx` | Homepage best-fit/not-fit buyer qualification decision tiles |
| `src/app/sites/canonica/components/ProductPreviewSection.tsx` | Responsive dashboard/widget/governance product scene used on homepage and product page |
| `src/app/sites/canonica/components/ProductAreasSection.tsx` | Homepage product-suite cross-link section for Set Up Support, In-App Help Widget, Help Center + Tickets, and Review Approved Answers |
| `src/app/sites/canonica/components/SetupFunnelSection.tsx` | Homepage 10-minute setup visual funnel |
| `src/app/sites/canonica/components/DayOneLaunchPackSection.tsx` | Homepage and Product section packaging quickstarts, starter surfaces, import templates, install verification, ROI/proof, and security handoff without adding another route |
| `src/app/sites/canonica/components/WidgetSection.tsx` | Homepage page-aware widget proof with UI scene and status snapshots |
| `src/app/sites/canonica/components/HomeTrustSection.tsx` | Homepage trust/security status snapshots |
| `src/app/sites/canonica/components/PillarsSection.tsx` | Canonica engine pillar sequence diagram |
| `src/app/sites/canonica/components/SystemCoverageSection.tsx` | Launch Setup, Support Control, Knowledge Governance, and Runtime Layer hub diagram |
| `src/app/sites/canonica/components/HowItWorksSection.tsx` | 5-step animated setup sequence |
| `src/app/sites/canonica/components/ComparisonSection.tsx` | Traditional KB vs Canonica table |
| `src/app/sites/canonica/components/PricingPreviewSection.tsx` | Homepage pricing preview and support-credit explanation |
| `src/app/sites/canonica/components/ObjectionsSection.tsx` | Homepage objection-handling FAQ strip |
| `src/app/sites/canonica/components/SeoLandingPage.tsx` | Shared component for static SEO landing pages |
| `src/app/sites/canonica/components/UseCaseLandingPage.tsx` | Shared wrapper for role-specific use-case pages |
| `src/app/sites/canonica/components/ProductCapabilityLandingPage.tsx` | Shared landing-page template for major product capability pages |
| `src/app/sites/canonica/components/ProductFeatureLandingPage.tsx` | Shared Bugasura-inspired feature-page template with outcome hero, visual proof grid, workflow, connected surfaces, FAQ, and CTA |
| `src/app/sites/canonica/components/PageStructuredData.tsx` | Per-route WebPage and BreadcrumbList JSON-LD for public Canonica pages |
| `src/app/sites/canonica/components/CTASection.tsx` | Bottom CTA section |
| `src/components/seo/JsonLdScript.tsx` | Shared server-rendered JSON-LD script helper |
| `scripts/verification/verify-agent-readiness.js` | Route/discovery/structured-data verifier |

### Routing Architecture

```
Production:
  canonica.app/*  →  middleware detects hostname  →  rewrites to /sites/canonica/*

Vercel Preview / QA:
  ecomsai.com/*   →  middleware detects hostname  →  rewrites to /sites/canonica/*

Local Dev:
  localhost:3000/__canonica/*  →  middleware detects dev prefix  →  rewrites to /sites/canonica/*
```

See `src/constants/productDomains.ts` for the full multi-product domain registry.

---

## Design Decisions

1. **Dark theme** — Deep navy with verdigris/teal controls. Infrastructure-grade support knowledge visual direction without generic AI-product indigo.
2. **Tailwind CSS** — Same build pipeline as rest of app. `@tailwind` directives in `styles.css`.
3. **Server components by default** — Pages stay server-rendered. The public header is a small client island so the mobile hamburger can open a right-side drawer with route icons, backdrop, Escape close, body scroll lock, and link-close behavior.
4. **basePath pattern** — `getBasePath()` reads `x-product-id` header + `host` to determine if dev mode. Passed as prop to components that contain links.
5. **CanonicaLink** — Wraps `next/link` with basePath prefix for dev mode compatibility.
6. **No external dependencies** — Zero new npm packages. Uses existing Tailwind, React, and icon stack.
7. **Contact boundary** — `/contact` posts to a Canonica-owned API route and Canonica Firestore collection. It does not reuse another product's public enquiry storage.
8. **Viewport reveal motion** — A single Canonica-specific client island adds restrained section/card/CTA reveal effects across public pages with reduced-motion support. Motion stays product-site polish, not decorative animation.

---

## Version History

| Date | Change |
|------|--------|
| 2026-03-07 | Initial implementation: 6 pages, shared components, Tailwind, multi-product routing |
| 2026-05-21 | Added small-SaaS positioning, `/demo`, Starter/Growth/Studio pricing copy, founder-friendly product/get-started/contact pages, public security/FAQ/legal pages, Canonica sitemap/robots, manifest, icons, and structured data |
| 2026-05-21 | Restored implemented Canonica engine pillars to homepage and product page while keeping the deferred API/integration pillar off public claims |
| 2026-05-21 | Added homepage system coverage map from the Canonica codebase inventory |
| 2026-05-21 | Added static product preview and market-standard public pages for use cases, integrations, resources, and updates |
| 2026-05-21 | Replaced public integrations positioning with widget-first install positioning; API/adapters stay rollout-gated and out of buyer-facing package copy |
| 2026-05-21 | Expanded the security page using a reusable trust-page structure while keeping Canonica-specific product boundaries, widget controls, owner-reviewed answers, rate limits, and responsible disclosure |
| 2026-05-22 | Refreshed public website for current Canonica runtime: support knowledge control plane hero, hosted help domains, FAQ management/generation, product-scoped billing/support credits, source-version cache freshness, and separate Firebase/product boundaries |
| 2026-05-22 | Added buyer-facing custom help domain positioning and safe ticket debugging context across homepage, product, install, security, FAQ, privacy, and updates copy |
| 2026-05-22 | Reworked homepage for self-sell conversion: pain/outcome-led hero, embedded generic-vs-Canonica demo, best-fit/not-fit, 10-minute setup funnel, trust strip, pricing preview, objections, optional no-Firestore GA events, and three SEO landing pages |
| 2026-05-22 | Added a screenshot-led product scene inspired by modern product websites: activation command center, product surfaces, widget answer, and signal-to-knowledge queue now appear directly after the hero and on the product page without adding Firebase reads or static screenshot assets |
| 2026-05-22 | Applied the Canonica positioning pass: demo is the primary hero CTA, homepage leads with page-aware support truth, a closed-loop visual explains question → canonical answer → signal → human approval, comparison now contrasts chatbot/helpdesk/KB/Canonica, FAQ defines the category, and four role-specific use-case pages were added |
| 2026-05-22 | Applied founder-relief positioning safely: homepage now says "You build revenue. Canonica keeps support accurate." while avoiding "we handle your support" because Canonica is not a helpdesk replacement, outsourcing service, or AI autopilot |
| 2026-05-22 | Improved website presentation quality using product-site patterns from Circle/Upvoty references: the demo now uses a horizontal page-tab row and large product canvas, product proof has clearer dashboard tabs, and widget content is organized as a bento-style install/runtime/governance grid |
| 2026-05-22 | Added standalone landing-style product area pages for Launch Setup, Page-Aware Widget, Support Control, and Knowledge Governance, following the Swell/Abyssale/Circle pattern where each product part can sell and explain itself |
| 2026-05-22 | Final product-suite polish: header Product dropdown now exposes the four product-area pages, homepage/resources/use-case/SEO pages cross-link those areas, and buyer navigation stays static with zero Firebase cost |
| 2026-05-23 | Added standalone product-feature landing pages for Knowledge Base, FAQ Management, Changelog, and Tickets using a reusable feature-page pattern inspired by Bugasura's individual feature pages while keeping routes under `/product/*` and browsing at zero Firebase cost |
| 2026-05-23 | Re-themed the shared product-feature page template so Knowledge Base, FAQ Management, Changelog, and Tickets follow the Canonica dark visual system instead of rendering a light-mode proof band; also set the Canonica route background to prevent white body bleed |
| 2026-05-23 | Hardened product-feature routing by replacing the dynamic `[feature]` page with explicit Knowledge Base, FAQ Management, Changelog, and Tickets pages backed by a shared route wrapper |
| 2026-05-23 | Removed remaining light-mode product mockups from the public demo, product capability template, and homepage widget section so newly added Canonica website pages stay aligned with the dark theme |
| 2026-05-23 | Reworked `/resources` grouped links from tall category cards into row-wise decision paths so each category and its subcards scan together on desktop and stack cleanly on mobile |
| 2026-05-23 | Replaced the temporary Canonica `C` mark with the dimensional infinity mark across website metadata, favicon/PWA icons, OpenGraph preview, header, footer, and dashboard navigation |
| 2026-05-23 | Removed the outer card treatment from `/resources` decision rows so the resources hub keeps row grouping without nested-card visual noise |
| 2026-05-23 | Updated shared product capability bento sections so five-card layouts render as two wide cards on row one and three balanced cards on row two |
| 2026-05-23 | Replaced the public website header/footer raster logo image with an inline true SVG mark so the Canonica brand stays crisp on high-density displays |
| 2026-05-23 | Added signed-in Google account visibility and an account-switch action to the get-started form so founders can change email before creating a workspace |
| 2026-05-23 | Added an existing Canonica workspace state to the get-started form so valid signed-in accounts are sent to Activation/Billing instead of seeing the setup form again |
| 2026-05-23 | Added homepage section-band background rhythm and larger vertical spacing so public sections have clearer visual separation without extra runtime cost |
| 2026-05-23 | Added Canonica-specific viewport reveal effects across public pages and card/link panels through the shared website layout, preserving reduced-motion behavior and product-specific styling |
| 2026-05-23 | Added a support knowledge map to the homepage and Product page so buyers can understand docs, releases, tickets, feedback, and page context flowing into Canonica, then out to widget, hosted help, approved answers, and review queues |
| 2026-05-25 | Added a day-one launch-pack section to homepage and Product so the completed quickstarts, starter surfaces, import starter pack, install verifier, ROI/proof, and security one-pager are visible from the main buyer path without creating another public page |
| 2026-05-25 | Updated existing widget, install, quickstart, security, FAQ, SEO, updates, metadata, and LLM-context pages so user-initiated screenshot upload/paste is presented accurately without adding a separate screenshot page or claiming automatic screen capture |
| 2026-05-26 | Formalized the Dark Control Plane theme contract, aligned PWA manifest background/theme color to deep navy, and moved website inline-style primary/status colors onto Canonica theme tokens |
| 2026-05-27 | Added a Canonica-owned contact inquiry flow with public API validation/rate limiting and regrouped the mobile hamburger menu into Product Areas, Product Features, and Other cards with safe-area bottom padding |
| 2026-05-27 | Added the Canonica Agent Install Layer: public install pages, Markdown mirrors, llms install context, generated AGENTS/CLAUDE/Cursor/Windsurf/skill files, ZIP download, dashboard AI packet actions, and the frozen `/widget/v1/canonica-widget.js` URL |
| 2026-05-26 | Added Team Access as a buyer-facing product feature page and updated Product, Launch Setup, Pricing, Security, Security One-Pager, Get Started, FAQ, Privacy, Resources, Updates, sitemap metadata, and LLM context to include Canonica roles, owner reset, force sign-out, and workspace-scoped access |
| 2026-05-23 | Added Canonica-specific PWA startup images and loader branding so Canonica website/dashboard installs use Canonica splash screens and loader identity |
| 2026-05-23 | Added Canonica-specific `llms.txt` and `llms-full.txt` routes so product-domain agents read Canonica as a support knowledge control plane, not as generic platform context, a helpdesk replacement, or an AI autopilot |
| 2026-05-23 | Added server-rendered WebPage/BreadcrumbList JSON-LD coverage across public Canonica routes, route-registry Website graph references, explicit AI/search crawler robots rules, and `verify:agent-readiness` checks |
| 2026-05-31 | Reframed the homepage hero around the founder-readable launch promise "Launch your SaaS with support already built", made setup the primary CTA, and clarified that Canonica prepares docs/FAQs/answer drafts/widget support while tickets, changelogs, feedback, ratings, and feature requests remain owner-managed surfaces |
| 2026-05-31 | Added Feedback Review as a buyer-facing product-feature page and added a homepage/product preview tab showing ratings, requests, suggestions, Support Board handoff, and answer-governance boundaries |
| 2026-05-24 | Reframed the public website for AI-built SaaS founders: homepage opened with "You shipped the app. Now users need correct answers.", demo became the first proof, public copy teaches approved answers before advanced Canonica vocabulary, `/use-cases/ai-built-saas` was added, and `/use-cases/vibe-coded-saas` remains only a canonicalized campaign/search alias |
| 2026-05-24 | Refined the shared homepage/Product support knowledge map diagram with a Canonica-colored logo-only core, ripple rings, dotted SVG paths, homepage-style pulse strokes, and border-only output highlights |
| 2026-05-24 | Added a reusable animated Canonica diagram system and applied it to closed-loop, setup, how-it-works, product-area workflow, product-feature workflow/connected surfaces, SEO/use-case, install, security, resources, engine pillar, and system coverage sections |
| 2026-05-24 | Aligned reusable Canonica sequence-diagram endpoints and output-highlight timing with the shared source-map reference while keeping the Canonica logo, ripple, and color treatment unchanged |
| 2026-05-27 | Removed client-specific public relationship framing from Canonica website pages, route docs, and LLM context so Canonica presents independently |
| 2026-05-27 | Added Support Board as a buyer-facing product-feature page and updated Support Control, FAQ, Resources, Updates, route metadata, and LLM context with manual-first, private-owner-workboard wording |
| 2026-05-24 | Synchronized the closed-loop diagram ring pulse and six card border highlights so the loop reads as one ordered motion from step 01 through step 06 |
| 2026-05-24 | Converted reusable sequence diagrams from horizontal card strips into the same input column, logo center, and output column layout used by the source-map diagrams |
| 2026-05-24 | Slowed the closed-loop ring and card-highlight animation to an 8.4-second loop-specific cycle while keeping the card highlights synchronized with the ring pulse |
| 2026-05-24 | Added reusable proof blocks and applied them to fit qualification, widget states, homepage trust controls, use-case before/after examples, and security controls so text-heavy sections read as visual product proof |
| 2026-05-24 | Added public Workflow Notifications and Proactive Help product-feature pages plus a real `/integrations` page now that Slack/email delivery, test notifications, compact health, proactive trigger gating, and bounded delivery are production-ready enough for buyer-facing claims |
| 2026-05-27 | Converted the Canonica public hamburger menu into a right-side mobile drawer while preserving Product Areas, Product Features, Other, and setup CTA grouping |
| 2026-05-27 | Completed an end-to-end Canonica website audit across public routes, internal links, desktop/mobile rendered layout, and docs; synced the install-route documentation to the live generated install and Markdown contract surfaces |
| 2026-05-27 | Fixed the mobile drawer animation lifecycle so the drawer paints off-screen before opening and transitions out before unmounting |
| 2026-05-27 | Added route icons to every Canonica mobile drawer item and the setup CTA while keeping the existing grouped drawer behavior |
| 2026-05-28 | Adjusted the desktop Product dropdown so product-feature labels stay on one line while descriptions remain clamped |
| 2026-05-28 | Added a shared centered section-header component and applied it across homepage, product, high-intent public pages, and SEO page templates so eyebrow, heading, and subheading presentation stays consistent |

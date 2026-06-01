# Answerlattice Website (answerlattice.com)

> **Feature:** Public marketing website for Answerlattice product
> **Status:** ✅ IMPLEMENTED — refreshed for page-aware SaaS support conversion, self-service Answerlattice, and agent-readable public discovery
> **Date:** 2026-06-01
> **Domain:** answerlattice.com (production) | ecomsai.com (Vercel Preview / QA) | localhost:3000/__answerlattice (dev)
> **Feature Flag:** None required (static marketing site)
> **Route Group:** `src/app/sites/answerlattice/`

---

## Document Index

| # | Document | Audience | Purpose |
|---|----------|----------|---------|
| 1 | **README.md** (this file) | Everyone | Master index |
| 2 | `answerlattice-website_spec.md` | CEO/PM | Business requirements, page architecture |
| 3 | `answerlattice-website_impl.md` | Developers | Technical blueprint, file paths, routing |
| 4 | `answerlattice-website_assets-preparation.md` | Marketing / Design / Product | Final screenshot, video, and placeholder asset capture plan |

## Related Strategy

- `../self-sellable-product-strategy.md` — Answerlattice's non-enterprise ICP, AI-built SaaS founder positioning, pricing direction, website message bank, and sellable-launch task list. Use this before changing public Answerlattice website copy.

---

## Quick Reference

### Pages and Public Agent Files

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Homepage | Page-aware SaaS support hero with inline sample workspace preview + conversion proof band + dashboard-style product proof + page-aware demo + support knowledge map + how-it-works flow + product areas + bento widget/hosted-help install + missed-question review loop + trust controls + best-fit/not-fit + setup funnel + Pre-Onboarding Kit source-prep placement + day-one launch pack + behind-the-scenes engine + system coverage + comparison + pricing preview + objections + CTA |
| `/product` | Product | Self-serve product overview with hero CTAs, conversion proof strip, visual workflow proof for setup, team access, in-app widget, hosted help, custom owner Q&A, safe ticket context, approved answers, releases, and support gaps |
| `/product/launch-setup` | Product Area | Landing-style page for setting up support: workspace setup, team access, starter knowledge, product pages, widget key, readiness proof strip, and setup/demo/source-prep CTAs |
| `/product/page-aware-widget` | Product Area | Landing-style page for in-app widget runtime, safe context, allowed origins, blocked routes, canonical answers, owner FAQ answers, and widget proof strip |
| `/product/support-control` | Product Area | Landing-style page for hosted help, docs, FAQ, custom owner Q&A, changelog, ticket fallback, feedback review, Support Board, conversations, weekly support review, and connected-runtime proof |
| `/product/knowledge-governance` | Product Area | Landing-style page for reviewing approved answers, stale support, repeated-question signals, coverage, trust metrics, and human-review proof |
| `/product/team-access` | Product Feature | Standalone feature page for workspace members, Answerlattice roles, owner-passcode sharing, owner reset, force sign-out, and workspace-scoped access |
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
| `/pre-onboarding` | Pre-Onboarding Kit | Public preparation page for customers using AI coding agents to create Answerlattice-ready source packages before Knowledge Intake |
| `/pre-onboarding.md` | Pre-Onboarding Prompt | Machine-readable master prompt for Codex, Cursor, Windsurf, Antigravity, Claude Code, and other AI agents using repo, multi-product repo, docs, website, or owner-note sources |
| `/pre-onboarding/guide` | Pre-Onboarding Guide | End-to-end public runbook for owners and AI agents before Answerlattice Knowledge Intake |
| `/pre-onboarding/owner-guide.md` | Owner Guide | Machine-readable owner checklist for source preparation, review, upload, and live-support gates |
| `/pre-onboarding/agent-guide.md` | Agent Guide | Machine-readable operating rules for AI coding agents preparing Answerlattice input packages |
| `/install` | Agent Install Layer | Primary install surface for copying the Answerlattice AI install packet, downloading the agent kit, reading the frozen v1 widget contract, and verifying runtime status |
| `/install/ai-agent` | AI Agent Install | Copyable agent packet for Codex, Claude Code, Cursor, Windsurf, and other coding agents |
| `/install/manual` | Manual Install | Human-readable v1 widget script install steps |
| `/install/frameworks/*` | Framework Install Guides | Next.js, React, Vue, Plain HTML, Shopify-style, and Webflow install pages with agent-ready snippets |
| `/install.md`, `/install/**/*.md` | Machine-Readable Install Docs | Markdown mirrors generated from the Answerlattice install contract for coding agents, including `/install/contracts.md` for the v1 widget contract |
| `/agents/answerlattice/*` | Agent Kit Files | Public AGENTS.md, CLAUDE.md, Cursor, Windsurf, skill, and ZIP download generated from the same v1 contract |
| `/integrations` | Integrations | Slack and email workflow notifications for support governance, including test delivery, compact health, bounded delivery, and controlled adapter boundaries |
| `/pricing` | Pricing | INR Starter/Growth/Studio packaging, beta setup, and support-credit top-up explanation |
| `/resources` | Resources | Answerlattice learning hub for pre-onboarding, AI-built SaaS evaluation, setup, feedback review, widget install, governance, and safety |
| `/updates` | Updates | Public product update timeline for product and website changes without using dashboard-owned changelog routes |
| `/security` | Security | Trust controls for widget context, user-initiated screenshots, hosted help domains, safe ticket debugging context, tenant separation, Answerlattice role permissions, owner-approved answers, runtime limits, and responsible disclosure |
| `/faq` | FAQ | Grouped founder questions about setup, team access, widget context, feedback review, screenshots, hosted help, custom domains, safe ticket context, FAQ generation, pricing, tickets, runtime safety, and data handling |
| `/about` | About | Company beliefs + Answerlattice operating principles |
| `/contact` | Contact | Answerlattice-owned inquiry form plus direct contact paths for setup, demos, pricing, security, and partnerships |
| `/get-started` | Get Started | Self-service onboarding for a new Answerlattice workspace, with a pre-onboarding prompt for owners who have source material before signup |
| `/privacy-policy` | Privacy Policy | Public privacy summary for account, team access, workspace, support, and widget data |
| `/terms-of-service` | Terms of Service | Public terms summary for account, content, widget, and service usage |
| `/llms.txt` | Agent Context | Short agent-readable Answerlattice product, route, and non-goal context |
| `/llms-full.txt` | Extended Agent Context | Detailed agent-readable product boundaries, public routes, runtime limits, and structured-data guidance |

### Key Files

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root app layout that imports scoped Answerlattice CSS so clean-cache public routes receive the dark theme and Tailwind utilities from `app/layout.css` |
| `src/app/sites/answerlattice/layout.tsx` | Answerlattice route layout with metadata, OG tags, SEO, analytics, and reveal client islands |
| `src/app/sites/answerlattice/theme.ts` | Answerlattice public-site theme contract: Verdigris Answer Layer colors, primary accent, status colors, and browser theme color |
| `src/app/sites/answerlattice/styles.css` | Root-loaded Tailwind directives, scoped Answerlattice CSS variables, and page/section rhythm |
| `src/app/sites/answerlattice/scroll-reveal.css` | Root-loaded Answerlattice viewport reveal motion for public website sections, cards, CTAs, and footer groups |
| `src/app/sites/answerlattice/page.tsx` | Homepage (server component) |
| `src/app/sites/answerlattice/productAreas.ts` | Shared product-area navigation and descriptions |
| `src/app/sites/answerlattice/product/launch-setup/page.tsx` | Product-area landing page for Launch Setup |
| `src/app/sites/answerlattice/product/page-aware-widget/page.tsx` | Product-area landing page for Page-Aware Widget |
| `src/app/sites/answerlattice/product/support-control/page.tsx` | Product-area landing page for Support Control |
| `src/app/sites/answerlattice/product/knowledge-governance/page.tsx` | Product-area landing page for Knowledge Governance |
| `src/app/sites/answerlattice/product/ProductFeatureRoutePage.tsx` | Shared server wrapper for product feature pages |
| `src/app/sites/answerlattice/product/team-access/page.tsx` | Product feature page for Team Access |
| `src/app/sites/answerlattice/product/knowledge-base/page.tsx` | Product feature page for Knowledge Base |
| `src/app/sites/answerlattice/product/faq-management/page.tsx` | Product feature page for FAQ Management |
| `src/app/sites/answerlattice/product/changelog/page.tsx` | Product feature page for Changelog |
| `src/app/sites/answerlattice/product/tickets/page.tsx` | Product feature page for Tickets |
| `src/app/sites/answerlattice/product/support-board/page.tsx` | Product feature page for Support Board |
| `src/app/sites/answerlattice/product/feedback-review/page.tsx` | Product feature page for Feedback Review |
| `src/app/sites/answerlattice/product/workflow-notifications/page.tsx` | Product feature page for Workflow Notifications |
| `src/app/sites/answerlattice/product/proactive-help/page.tsx` | Product feature page for Proactive Help |
| `src/app/sites/answerlattice/productFeatures.ts` | Shared product-feature route data, copy, and sitemap source |
| `src/app/sites/answerlattice/use-cases/page.tsx` | Use-case page for AI-built SaaS and founder/operator support scenarios |
| `src/app/sites/answerlattice/use-cases/ai-built-saas/page.tsx` | AI-built SaaS use-case landing page |
| `src/app/sites/answerlattice/use-cases/vibe-coded-saas/page.tsx` | Canonicalized campaign/search alias for the AI-built SaaS use-case page |
| `src/app/sites/answerlattice/use-cases/founders/page.tsx` | Founder use-case landing page |
| `src/app/sites/answerlattice/use-cases/support-teams/page.tsx` | Support-team use-case landing page |
| `src/app/sites/answerlattice/use-cases/product-teams/page.tsx` | Product-team use-case landing page |
| `src/app/sites/answerlattice/use-cases/engineering/page.tsx` | Engineering use-case landing page |
| `src/app/sites/answerlattice/page-aware-support-widget/page.tsx` | SEO landing page for page-aware widget search intent |
| `src/app/sites/answerlattice/hosted-help-center-for-saas/page.tsx` | SEO landing page for hosted help-center search intent |
| `src/app/sites/answerlattice/support-widget-for-solo-founders/page.tsx` | SEO landing page for solo-founder support search intent |
| `src/app/sites/answerlattice/install/page.tsx` | Agent install overview generated from Answerlattice Widget Contract v1 |
| `src/app/sites/answerlattice/install/InstallContractPage.tsx` | Shared public install page renderer for overview, AI-agent, framework, verification, security, contract, and changelog pages |
| `src/app/sites/answerlattice/install/markdownRoute.ts` | Shared Markdown response helper for install `.md` mirrors |
| `src/app/sites/answerlattice/agents/answerlattice/agentRoute.ts` | Public generated AGENTS.md, CLAUDE.md, Cursor, Windsurf, skill, and ZIP responses |
| `src/lib/answerlattice/installContract/` | Single source of truth for the v1 widget contract, Markdown docs, llms text, agent prompts, and agent kit files |
| `src/app/widget/v1/answerlattice-widget.js/route.ts` | Stable public v1 script URL backed by the existing widget runtime |
| `src/app/sites/answerlattice/integrations/page.tsx` | Integrations landing page for Slack/email workflow notifications, test delivery, compact health, and controlled adapter boundaries |
| `src/app/sites/answerlattice/resources/page.tsx` | Public resources hub |
| `src/app/sites/answerlattice/updates/page.tsx` | Public website update log |
| `src/app/sites/answerlattice/demo/page.tsx` | Static product demo route |
| `src/app/sites/answerlattice/demo/AnswerlatticePublicDemo.tsx` | Client-side demo interaction state |
| `src/app/sites/answerlattice/pre-onboarding/page.tsx` | Public Pre-Onboarding Kit page |
| `src/app/sites/answerlattice/pre-onboarding.md/route.ts` | Machine-readable pre-onboarding master prompt route |
| `src/app/sites/answerlattice/pre-onboarding/guide/page.tsx` | Detailed public owner/agent guide page |
| `src/app/sites/answerlattice/pre-onboarding/owner-guide.md/route.ts` | Machine-readable owner guide route |
| `src/app/sites/answerlattice/pre-onboarding/agent-guide.md/route.ts` | Machine-readable agent guide route |
| `src/lib/answerlattice/preOnboardingPrompt.ts` | Shared Answerlattice pre-onboarding prompt text and output contract |
| `src/app/sites/answerlattice/security/page.tsx` | Public security/trust page with facts, runtime controls, and disclosure |
| `src/app/sites/answerlattice/faq/page.tsx` | Public FAQ page with FAQ structured data |
| `src/app/sites/answerlattice/contact/page.tsx` | Public contact page |
| `src/app/sites/answerlattice/contact/ContactForm.tsx` | Client contact form that posts to the Answerlattice public contact API |
| `src/app/sites/answerlattice/privacy-policy/page.tsx` | Public privacy policy page |
| `src/app/sites/answerlattice/terms-of-service/page.tsx` | Public terms of service page |
| `src/app/api/answerlattice/public/contact/route.ts` | Answerlattice-only public contact endpoint with validation, rate limiting, honeypot handling, and Firestore write |
| `src/app/sites/answerlattice/sitemap.xml/route.ts` | Answerlattice product-domain sitemap |
| `src/app/sites/answerlattice/robots.txt/route.ts` | Answerlattice product-domain robots policy |
| `src/app/sites/answerlattice/llms.txt/route.ts` | Short Answerlattice-specific agent-readable context for product-domain crawlers and browser agents |
| `src/app/sites/answerlattice/llms-full.txt/route.ts` | Extended Answerlattice-specific agent-readable context, product boundaries, and action limits |
| `src/app/sites/answerlattice/siteConfig.ts` | Public site URL, sitemap page list, and shared metadata constants |
| `src/app/sites/answerlattice/enginePillars.ts` | Shared implemented Answerlattice engine pillar content |
| `src/app/sites/answerlattice/systemCoverage.ts` | Shared implemented Answerlattice system coverage groups |
| `src/app/sites/answerlattice/components/StructuredData.tsx` | Homepage Organization/WebSite/SoftwareApplication JSON-LD |
| `public/answerlattice-og-image.png` | 1200x630 public social preview image |
| `public/answerlattice-logo.svg` | Design-final Answerlattice SVG with the exported canvas/frame removed; canonical transparent mark source for UI, metadata, favicon, PWA, OpenGraph, and splash derivatives |
| `public/answerlattice-logo-mark-wide.png` | Transparent PNG derivative generated from the final SVG source for splash/icon generation and metadata-adjacent surfaces |
| `scripts/website-assets/generate-answerlattice-logo-assets.js` | Deterministic generator for transparent logo PNGs, favicons, PWA icons, and OpenGraph logo embeds |
| `src/app/sites/answerlattice/components/AnswerlatticeLogoMark.tsx` | Shared wrapper for the atom-level inline SVG path logo used across header, footer, diagrams, and dashboard navigation |
| `src/components/atoms/answerlatticeLogoMark/index.tsx` | Canonical inline SVG-path logo atom that preserves the final design geometry, colors, gradients, filters, stroke widths, and transparent background |
| `src/components/atoms/answerlatticeLoaderLogo/index.tsx` | Loader atom that animates the shared inline SVG-path logo with the same 3-second stroke-draw cycle used by the MenuList global loader |
| `src/app/sites/answerlattice/components/AnswerlatticeFlowDiagram.tsx` | Reusable SVG-only Answerlattice hub, column-based sequence, and loop diagrams with logo-only core, ripple rings, dotted SVG paths, homepage-style pulse strokes, and border-only output highlights |
| `src/app/sites/answerlattice/components/AnswerlatticeProofBlocks.tsx` | Reusable proof blocks for before/after examples, status snapshots, and fit/decision tiles that reduce text-heavy sections without adding runtime data calls |
| `src/app/sites/answerlattice/components/SectionHeader.tsx` | Shared centered section-introduction treatment for eyebrow, heading, and supporting copy across homepage, product, high-intent public pages, and SEO page templates |
| `public/answerlattice-favicon.ico` | Answerlattice favicon ICO generated from the final SVG logo source |
| `public/answerlattice-icon-*.png` | Answerlattice square favicon/PWA icon family generated from the final SVG logo source |
| `public/answerlattice-splash/apple-splash-*.png` | Answerlattice iOS startup image family rendered on the PWA startup background with the transparent logo mark composited on top |
| `public/answerlattice.webmanifest` | Answerlattice web app manifest |
| `src/lib/answerlattice/pwaAssets.ts` | Answerlattice PWA startup image helper that keeps splash metadata out of root app defaults |
| `src/app/sites/answerlattice/components/Header.tsx` | Shared header with desktop nav and right-side mobile drawer |
| `src/app/sites/answerlattice/components/Footer.tsx` | Shared footer with link columns |
| `src/app/sites/answerlattice/components/AnswerlatticeLink.tsx` | Dev/production-aware Link component |
| `src/app/sites/answerlattice/components/AnswerlatticeAnalytics.tsx` | Optional GA/measurement-id conversion event tracker with no Firestore writes |
| `src/app/sites/answerlattice/components/AnswerlatticeScrollReveal.tsx` | Layout-level client island that applies restrained viewport reveal effects across Answerlattice public pages |
| `src/constants/answerlattice/routes.ts` | Lightweight Answerlattice dashboard route constants used by public client islands without importing sidebar icon metadata |
| `src/app/sites/answerlattice/components/HeroSection.tsx` | Page-aware support-answer hero with inline sample workspace preview and setup/demo/source-prep CTAs |
| `src/app/sites/answerlattice/components/HomeProofBandSection.tsx` | Homepage conversion proof band for page-aware answers, approved knowledge, hosted help, feedback gaps, widget install, and source preparation |
| `src/app/sites/answerlattice/components/PageProofStrip.tsx` | Reusable compact proof-strip cards used across non-home pages to keep hero proof, safety boundaries, and next-step clarity consistent without fake logos or metrics |
| `src/app/sites/answerlattice/components/PreOnboardingHomeSection.tsx` | Homepage source-preparation placement that sends buyers to the Pre-Onboarding Kit after the product value is clear |
| `src/app/sites/answerlattice/components/SupportKnowledgeMapSection.tsx` | Homepage and product-page visual map showing support knowledge inputs, the Answerlattice answer layer, and output surfaces |
| `src/app/sites/answerlattice/components/HomePageAwareDemoSection.tsx` | Homepage tabbed static page-aware demo section |
| `src/app/sites/answerlattice/components/ClosedLoopSection.tsx` | Homepage animated missed-question loop from page question to reviewed support fix |
| `src/app/sites/answerlattice/components/BestFitSection.tsx` | Homepage best-fit/not-fit buyer qualification decision tiles |
| `src/app/sites/answerlattice/components/ProductPreviewSection.tsx` | Early responsive dashboard/widget/governance product scene used on homepage and product page |
| `src/app/sites/answerlattice/components/ProductAreasSection.tsx` | Homepage product-suite cross-link section for Set Up Support, In-App Help Widget, Help Center and Tickets, and Review Approved Answers |
| `src/app/sites/answerlattice/components/SetupFunnelSection.tsx` | Homepage 10-minute setup visual funnel |
| `src/app/sites/answerlattice/components/DayOneLaunchPackSection.tsx` | Homepage and Product section packaging quickstarts, starter surfaces, import templates, install verification, ROI/proof, and security handoff without adding another route |
| `src/app/sites/answerlattice/components/WidgetSection.tsx` | Homepage page-aware widget proof with UI scene and status snapshots |
| `src/app/sites/answerlattice/components/HomeTrustSection.tsx` | Homepage trust/security status snapshots |
| `src/app/sites/answerlattice/components/PillarsSection.tsx` | Answerlattice engine pillar sequence diagram |
| `src/app/sites/answerlattice/components/SystemCoverageSection.tsx` | Launch Setup, Support Control, Knowledge Governance, and Runtime Layer hub diagram |
| `src/app/sites/answerlattice/components/HowItWorksSection.tsx` | 5-step animated setup sequence |
| `src/app/sites/answerlattice/components/ComparisonSection.tsx` | Traditional KB vs Answerlattice table |
| `src/app/sites/answerlattice/components/PricingPreviewSection.tsx` | Homepage pricing preview and support-credit explanation |
| `src/app/sites/answerlattice/components/ObjectionsSection.tsx` | Homepage objection-handling FAQ strip |
| `src/app/sites/answerlattice/components/SeoLandingPage.tsx` | Shared component for static SEO landing pages |
| `src/app/sites/answerlattice/components/UseCaseLandingPage.tsx` | Shared wrapper for role-specific use-case pages |
| `src/app/sites/answerlattice/components/ProductCapabilityLandingPage.tsx` | Shared landing-page template for major product capability pages |
| `src/app/sites/answerlattice/components/ProductFeatureLandingPage.tsx` | Shared Bugasura-inspired feature-page template with outcome hero, visual proof grid, workflow, connected surfaces, FAQ, and CTA |
| `src/app/sites/answerlattice/components/PageStructuredData.tsx` | Per-route WebPage and BreadcrumbList JSON-LD for public Answerlattice pages |
| `src/app/sites/answerlattice/components/CTASection.tsx` | Bottom CTA section |
| `src/components/seo/JsonLdScript.tsx` | Shared server-rendered JSON-LD script helper |
| `scripts/verification/verify-agent-readiness.js` | Route/discovery/structured-data verifier |

### Routing Architecture

```
Production:
  answerlattice.com/*  →  middleware detects hostname  →  rewrites to /sites/answerlattice/*

Vercel Preview / QA:
  ecomsai.com/*   →  middleware detects hostname  →  rewrites to /sites/answerlattice/*

Local Dev:
  localhost:3000/__answerlattice/*  →  middleware detects dev prefix  →  rewrites to /sites/answerlattice/*
```

See `src/constants/productDomains.ts` for the full multi-product domain registry.

---

## Design Decisions

1. **Dark theme** — Deep navy with verdigris/teal controls. Infrastructure-grade support knowledge visual direction without generic AI-product indigo.
2. **Tailwind CSS** — Same build pipeline as rest of app. Answerlattice `@tailwind` directives and scoped theme rules are root-loaded through `src/app/layout.tsx` so public routes do not depend on a nested CSS chunk.
3. **Server components by default** — Pages stay server-rendered. The public header is a small client island so the mobile hamburger can open a right-side drawer with route icons, backdrop, Escape close, body scroll lock, and link-close behavior.
4. **basePath pattern** — `getBasePath()` reads `x-product-id` header + `host` to determine if dev mode. Passed as prop to components that contain links.
5. **AnswerlatticeLink** — Wraps `next/link` with basePath prefix for dev mode compatibility.
6. **No external dependencies** — Zero new npm packages. Uses existing Tailwind, React, and icon stack.
7. **Contact boundary** — `/contact` posts to an Answerlattice-owned API route and Answerlattice Firestore collection. It does not reuse another product's public enquiry storage.
8. **Viewport reveal motion** — A single Answerlattice-specific client island adds restrained section/card/CTA reveal effects across public pages with reduced-motion support. Motion stays product-site polish, not decorative animation.

---

## Version History

| Date | Change |
|------|--------|
| 2026-06-01 | Reworked the homepage from a setup-first story into a conversion-first story: clearer page-aware support-answer hero, inline sample workspace preview, new conversion proof band, earlier product proof/demo, Pre-Onboarding moved lower as a source-preparation accelerator, refreshed metadata, and final asset-preparation plan added |
| 2026-06-01 | Extended the homepage conversion pattern across the rest of the public site: product, product-area, feature, SEO/use-case, setup, pricing, resources, proof, security, install, FAQ, contact, legal, and updates pages now expose compact proof strips, clearer CTAs, grouped FAQ scanning, and safer sample-state wording |
| 2026-06-01 | Completed rendered wording QA across all public Answerlattice routes and root-loaded scoped Answerlattice CSS through `src/app/layout.tsx` so clean-cache pages keep the dark theme, Tailwind utilities, and route styling without relying on a nested CSS chunk |
| 2026-03-07 | Initial implementation: 6 pages, shared components, Tailwind, multi-product routing |
| 2026-05-21 | Added small-SaaS positioning, `/demo`, Starter/Growth/Studio pricing copy, founder-friendly product/get-started/contact pages, public security/FAQ/legal pages, Answerlattice sitemap/robots, manifest, icons, and structured data |
| 2026-05-21 | Restored implemented Answerlattice engine pillars to homepage and product page while keeping the deferred API/integration pillar off public claims |
| 2026-05-21 | Added homepage system coverage map from the Answerlattice codebase inventory |
| 2026-05-21 | Added static product preview and market-standard public pages for use cases, integrations, resources, and updates |
| 2026-05-21 | Replaced public integrations positioning with widget-first install positioning; API/adapters stay rollout-gated and out of buyer-facing package copy |
| 2026-05-21 | Expanded the security page using a reusable trust-page structure while keeping Answerlattice-specific product boundaries, widget controls, owner-reviewed answers, rate limits, and responsible disclosure |
| 2026-05-22 | Refreshed public website for current Answerlattice runtime: governed answer infrastructure hero, hosted help domains, FAQ management/generation, product-scoped billing/support credits, source-version cache freshness, and separate Firebase/product boundaries |
| 2026-05-22 | Added buyer-facing custom help domain positioning and safe ticket debugging context across homepage, product, install, security, FAQ, privacy, and updates copy |
| 2026-05-22 | Reworked homepage for self-sell conversion: pain/outcome-led hero, embedded generic-vs-Answerlattice demo, best-fit/not-fit, 10-minute setup funnel, trust strip, pricing preview, objections, optional no-Firestore GA events, and three SEO landing pages |
| 2026-05-22 | Added a screenshot-led product scene inspired by modern product websites: activation command center, product surfaces, widget answer, and signal-to-knowledge queue now appear directly after the hero and on the product page without adding Firebase reads or static screenshot assets |
| 2026-05-22 | Applied the Answerlattice positioning pass: demo is the primary hero CTA, homepage leads with page-aware support truth, a closed-loop visual explains question → canonical answer → signal → human approval, comparison now contrasts chatbot/helpdesk/KB/Answerlattice, FAQ defines the category, and four role-specific use-case pages were added |
| 2026-05-22 | Applied founder-relief positioning safely: homepage now says "You build revenue. Answerlattice keeps support accurate." while avoiding "we handle your support" because Answerlattice is not a helpdesk replacement, outsourcing service, or AI autopilot |
| 2026-05-22 | Improved website presentation quality using product-site patterns from Circle/Upvoty references: the demo now uses a horizontal page-tab row and large product canvas, product proof has clearer dashboard tabs, and widget content is organized as a bento-style install/runtime/governance grid |
| 2026-05-22 | Added standalone landing-style product area pages for Launch Setup, Page-Aware Widget, Support Control, and Knowledge Governance, following the Swell/Abyssale/Circle pattern where each product part can sell and explain itself |
| 2026-05-22 | Final product-suite polish: header Product dropdown now exposes the four product-area pages, homepage/resources/use-case/SEO pages cross-link those areas, and buyer navigation stays static with zero Firebase cost |
| 2026-05-23 | Added standalone product-feature landing pages for Knowledge Base, FAQ Management, Changelog, and Tickets using a reusable feature-page pattern inspired by Bugasura's individual feature pages while keeping routes under `/product/*` and browsing at zero Firebase cost |
| 2026-05-23 | Re-themed the shared product-feature page template so Knowledge Base, FAQ Management, Changelog, and Tickets follow the Answerlattice dark visual system instead of rendering a light-mode proof band; also set the Answerlattice route background to prevent white body bleed |
| 2026-05-23 | Hardened product-feature routing by replacing the dynamic `[feature]` page with explicit Knowledge Base, FAQ Management, Changelog, and Tickets pages backed by a shared route wrapper |
| 2026-05-23 | Removed remaining light-mode product mockups from the public demo, product capability template, and homepage widget section so newly added Answerlattice website pages stay aligned with the dark theme |
| 2026-05-23 | Reworked `/resources` grouped links from tall category cards into row-wise decision paths so each category and its subcards scan together on desktop and stack cleanly on mobile |
| 2026-05-23 | Replaced the temporary Answerlattice `C` mark with the dimensional infinity mark across website metadata, favicon/PWA icons, OpenGraph preview, header, footer, and dashboard navigation |
| 2026-05-23 | Removed the outer card treatment from `/resources` decision rows so the resources hub keeps row grouping without nested-card visual noise |
| 2026-05-23 | Updated shared product capability bento sections so five-card layouts render as two wide cards on row one and three balanced cards on row two |
| 2026-05-23 | Replaced the public website header/footer raster logo image with an inline true SVG mark so the Answerlattice brand stays crisp on high-density displays |
| 2026-05-23 | Added signed-in Google account visibility and an account-switch action to the get-started form so founders can change email before creating a workspace |
| 2026-05-23 | Added an existing Answerlattice workspace state to the get-started form so valid signed-in accounts are sent to Activation/Billing instead of seeing the setup form again |
| 2026-05-23 | Added homepage section-band background rhythm and larger vertical spacing so public sections have clearer visual separation without extra runtime cost |
| 2026-05-23 | Added Answerlattice-specific viewport reveal effects across public pages and card/link panels through the shared website layout, preserving reduced-motion behavior and product-specific styling |
| 2026-05-23 | Added a support knowledge map to the homepage and Product page so buyers can understand docs, releases, tickets, feedback, and page context flowing into Answerlattice, then out to widget, hosted help, approved answers, and review queues |
| 2026-05-25 | Added a day-one launch-pack section to homepage and Product so the completed quickstarts, starter surfaces, import starter pack, install verifier, ROI/proof, and security one-pager are visible from the main buyer path without creating another public page |
| 2026-05-25 | Updated existing widget, install, quickstart, security, FAQ, SEO, updates, metadata, and LLM-context pages so user-initiated screenshot upload/paste is presented accurately without adding a separate screenshot page or claiming automatic screen capture |
| 2026-05-26 | Formalized the Verdigris Answer Layer theme contract, aligned PWA manifest background/theme color to deep navy, and moved website inline-style primary/status colors onto Answerlattice theme tokens |
| 2026-05-27 | Added an Answerlattice-owned contact inquiry flow with public API validation/rate limiting and regrouped the mobile hamburger menu into Product Areas, Product Features, and Other cards with safe-area bottom padding |
| 2026-05-27 | Added the Answerlattice Agent Install Layer: public install pages, Markdown mirrors, llms install context, generated AGENTS/CLAUDE/Cursor/Windsurf/skill files, ZIP download, dashboard AI packet actions, and the frozen `/widget/v1/answerlattice-widget.js` URL |
| 2026-05-26 | Added Team Access as a buyer-facing product feature page and updated Product, Launch Setup, Pricing, Security, Security One-Pager, Get Started, FAQ, Privacy, Resources, Updates, sitemap metadata, and LLM context to include Answerlattice roles, owner reset, force sign-out, and workspace-scoped access |
| 2026-05-23 | Added Answerlattice-specific PWA startup images and loader branding so Answerlattice website/dashboard installs use Answerlattice splash screens and loader identity |
| 2026-05-23 | Added Answerlattice-specific `llms.txt` and `llms-full.txt` routes so product-domain agents read Answerlattice as governed answer infrastructure, not as generic platform context, a helpdesk replacement, or an AI autopilot |
| 2026-05-23 | Added server-rendered WebPage/BreadcrumbList JSON-LD coverage across public Answerlattice routes, route-registry Website graph references, explicit AI/search crawler robots rules, and `verify:agent-readiness` checks |
| 2026-05-31 | Reframed the homepage hero around the founder-readable launch promise "Launch your SaaS with support already built", made setup the primary CTA, and clarified that Answerlattice prepares docs/FAQs/answer drafts/widget support while tickets, changelogs, feedback, ratings, and feature requests remain owner-managed surfaces |
| 2026-05-31 | Added Feedback Review as a buyer-facing product-feature page and added a homepage/product preview tab showing ratings, requests, suggestions, Support Board handoff, and answer-governance boundaries |
| 2026-06-01 | Replaced all Answerlattice logo surfaces with the design-final SVG source, regenerated favicon/PWA/OpenGraph/splash derivatives from that source, and documented that the logo must not be redrawn, recolored, reshaped, or simplified |
| 2026-06-01 | Regenerated Answerlattice splash screens so the startup surface owns the background and the logo asset does not carry a visible rectangular box |
| 2026-06-01 | Added a dedicated Answerlattice loader SVG atom using the final logo paths, gradients, filters, and a MenuList-matched 3-second stroke-draw animation for server and global loading states |
| 2026-06-01 | Removed the exported black SVG canvas/frame from the canonical Answerlattice logo and regenerated logo, favicon, PWA, OpenGraph, and splash derivatives with transparent logo backgrounds |
| 2026-06-01 | Aligned `AnswerlatticeLogoMark` with the MenuList inline SVG-path pattern so static logo UI and loaders share the same canonical path geometry instead of an image wrapper |
| 2026-06-01 | Added verification that visible Answerlattice website diagram components stay vector-based and do not reintroduce PNG/image-wrapped logo usage |
| 2026-06-01 | Removed extra CSS blur/drop-shadow from Answerlattice loader logo surfaces so the logo renders only with the SVG-native design filters |
| 2026-06-01 | Removed the persistent post-reveal `translate3d`/`will-change` layer from Answerlattice website sections so inline SVG diagram logos do not look rasterized when zoomed |
| 2026-05-24 | Reframed the public website for AI-built SaaS founders: homepage opened with "You shipped the app. Now users need correct answers.", demo became the first proof, public copy teaches approved answers before advanced Answerlattice vocabulary, `/use-cases/ai-built-saas` was added, and `/use-cases/vibe-coded-saas` remains only a canonicalized campaign/search alias |
| 2026-05-24 | Refined the shared homepage/Product support knowledge map diagram with an Answerlattice-colored logo-only core, ripple rings, dotted SVG paths, homepage-style pulse strokes, and border-only output highlights |
| 2026-05-24 | Added a reusable animated Answerlattice diagram system and applied it to closed-loop, setup, how-it-works, product-area workflow, product-feature workflow/connected surfaces, SEO/use-case, install, security, resources, engine pillar, and system coverage sections |
| 2026-05-24 | Aligned reusable Answerlattice sequence-diagram endpoints and output-highlight timing with the shared source-map reference while keeping the Answerlattice logo, ripple, and color treatment unchanged |
| 2026-05-27 | Removed client-specific public relationship framing from Answerlattice website pages, route docs, and LLM context so Answerlattice presents independently |
| 2026-05-27 | Added Support Board as a buyer-facing product-feature page and updated Support Control, FAQ, Resources, Updates, route metadata, and LLM context with manual-first, private-owner-workboard wording |
| 2026-05-24 | Synchronized the closed-loop diagram ring pulse and six card border highlights so the loop reads as one ordered motion from step 01 through step 06 |
| 2026-05-24 | Converted reusable sequence diagrams from horizontal card strips into the same input column, logo center, and output column layout used by the source-map diagrams |
| 2026-05-24 | Slowed the closed-loop ring and card-highlight animation to an 8.4-second loop-specific cycle while keeping the card highlights synchronized with the ring pulse |
| 2026-05-24 | Added reusable proof blocks and applied them to fit qualification, widget states, homepage trust controls, use-case before/after examples, and security controls so text-heavy sections read as visual product proof |
| 2026-05-24 | Added public Workflow Notifications and Proactive Help product-feature pages plus a real `/integrations` page now that Slack/email delivery, test notifications, compact health, proactive trigger gating, and bounded delivery are production-ready enough for buyer-facing claims |
| 2026-05-27 | Converted the Answerlattice public hamburger menu into a right-side mobile drawer while preserving Product Areas, Product Features, Other, and setup CTA grouping |
| 2026-05-27 | Completed an end-to-end Answerlattice website audit across public routes, internal links, desktop/mobile rendered layout, and docs; synced the install-route documentation to the live generated install and Markdown contract surfaces |
| 2026-05-27 | Fixed the mobile drawer animation lifecycle so the drawer paints off-screen before opening and transitions out before unmounting |
| 2026-05-27 | Added route icons to every Answerlattice mobile drawer item and the setup CTA while keeping the existing grouped drawer behavior |
| 2026-05-28 | Adjusted the desktop Product dropdown so product-feature labels stay on one line while descriptions remain clamped |
| 2026-05-28 | Added a shared centered section-header component and applied it across homepage, product, high-intent public pages, and SEO page templates so eyebrow, heading, and subheading presentation stays consistent |

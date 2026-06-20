# AnswerLattice Website (answerlattice.com)

> **Feature:** Public marketing website for AnswerLattice product
> **Status:** ✅ IMPLEMENTED — refreshed for approved-answers-first homepage positioning, product-led support-suite conversion, self-service AnswerLattice, concept illustrations, and agent-readable public discovery
> **Date:** 2026-06-18
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
| 4 | `answerlattice-website_assets-preparation.md` | Marketing / Design / Product | Generated product-scene asset contract, concept illustration inventory, final screenshot/video plan, visual-slot inventory, and capture rules |

## Related Strategy

- `../self-sellable-product-strategy.md` — AnswerLattice's non-enterprise ICP, AI-built SaaS founder positioning, pricing direction, website message bank, and sellable-launch task list. Use this before changing public AnswerLattice website copy.

---

## Quick Reference

### Pages and Public Agent Files

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Homepage | Product-user support hero with approved-answers-first proof, inline sample workspace preview, support-suite cards, scroll-led support-surface story, feature-wise product overview cards, support improvement loop, install-surface quickstarts, AI-built SaaS fit, positioning boundary, pricing checkpoint, objections, and CTA |
| `/product` | Product | Self-serve product overview for SaaS and digital products with hero CTAs, conversion proof strip, connected support-suite framing, visual workflow proof for setup, team access, in-product widget, hosted help, custom owner Q&A, safe ticket context, approved answers, releases, support gaps, and category comparison |
| `/product/launch-setup` | Product Area | Landing-style page for setting up support: workspace setup, team access, starter knowledge, product pages, widget key, first-client launch proof, and setup/demo/source-prep CTAs |
| `/product/page-aware-widget` | Product Area | Landing-style page for in-app widget runtime, safe context, allowed origins, blocked routes, canonical answers, owner FAQ answers, and widget proof strip |
| `/product/support-control` | Product Area | Landing-style page for hosted help, docs, FAQ, custom owner Q&A, changelog, ticket fallback, feedback review, Support Board, conversations, weekly support review, and connected-runtime proof |
| `/product/knowledge-governance` | Product Area | Landing-style page for reviewing approved answers, stale support, repeated-question signals, coverage, trust metrics, and human-review proof |
| `/product/team-access` | Product Feature | Standalone feature page for workspace members, AnswerLattice roles, owner-passcode sharing, owner reset, force sign-out, and workspace-scoped access |
| `/product/knowledge-base` | Product Feature | Standalone feature page for reviewed articles, imports, product-surface assignment, FAQ generation, and hosted help publishing |
| `/product/faq-management` | Product Feature | Standalone feature page for owner-written Q&A, article-backed FAQs, owner review, surface-aware display, and source-linked refresh |
| `/product/changelog` | Product Feature | Standalone feature page for release notes connected to product surfaces, affected support answers, and drift review |
| `/product/tickets` | Product Feature | Standalone feature page for fallback tickets, safe debugging context, and ticket-to-knowledge signal loops |
| `/product/support-board` | Product Feature | Standalone feature page for private owner/staff support cards, internal notes, status history, selected follow-up, and answer-proposal handoff |
| `/product/feedback-review` | Product Feature | Standalone feature page for private feedback review, ratings, feature requests, suggestions, Support Board handoff, and answer-proposal governance |
| `/product/workflow-notifications` | Product Feature | Standalone feature page for Slack/email workflow notifications, digest-first governance alerts, test delivery, health summaries, and bounded delivery |
| `/product/proactive-help` | Product Feature | Standalone feature page for configured page-aware proactive prompts backed by active triggers and approved support summaries |
| `/use-cases` | Use Cases | AI-built SaaS and founder/operator scenarios by support problem |
| `/use-cases/ai-built-saas` | Use Case | Support path for AI-built SaaS apps preparing support before first users, docs, tickets, and approved answers fall behind |
| `/use-cases/vibe-coded-saas` | Use Case Alias | Canonicalized campaign/search alias for the AI-built SaaS use case; do not use as the main navigation label |
| `/use-cases/founders` | Use Case | Solo-founder support loop for launching before hiring support |
| `/use-cases/small-saas-teams` | Use Case | Support layer for small SaaS teams before support becomes a team problem |
| `/use-cases/studios-agencies` | Use Case | Repeatable support layer for studios and agencies launching SaaS products |
| `/use-cases/support-teams` | Use Case | Reduce repeated tickets while keeping owner-approved answer control |
| `/use-cases/product-teams` | Use Case | Product-surface drift, release review, and support friction visibility |
| `/use-cases/engineering` | Use Case | Safe widget install, route context, and governed retrieval for engineering teams |
| `/page-aware-support-widget` | SEO Landing | Page-aware support widget page with concrete before/after support example and manual screenshot boundary |
| `/hosted-help-center-for-saas` | SEO Landing | Hosted SaaS help center page for docs, FAQ, and changelog on support domains |
| `/support-widget-for-solo-founders` | SEO Landing | Solo-founder support widget page focused on launching support before hiring a team, including optional user-attached visual context |
| `/demo` | Demo | Static page-aware support demo with no Firebase or AI calls |
| `/pre-onboarding` | Pre-Onboarding Kit | Public preparation page for customers using AI coding agents to create AnswerLattice-ready source packages before Knowledge Intake |
| `/pre-onboarding.md` | Pre-Onboarding Prompt | Machine-readable master prompt for Codex, Cursor, Windsurf, Antigravity, Claude Code, and other AI agents using repo, multi-product repo, docs, website, or owner-note sources |
| `/pre-onboarding/guide` | Pre-Onboarding Guide | End-to-end public runbook for owners and AI agents before AnswerLattice Knowledge Intake |
| `/pre-onboarding/owner-guide.md` | Owner Guide | Machine-readable owner checklist for source preparation, review, upload, and live-support gates |
| `/pre-onboarding/agent-guide.md` | Agent Guide | Machine-readable operating rules for AI coding agents preparing AnswerLattice input packages |
| `/install` | Agent Install Layer | Primary install surface for copying the AnswerLattice AI install packet, downloading the agent kit, reading the frozen v1 widget contract, and verifying runtime status |
| `/install/ai-agent` | AI Agent Install | Copyable agent packet for Codex, Claude Code, Cursor, Windsurf, and other coding agents |
| `/install/manual` | Manual Install | Human-readable v1 widget script install steps |
| `/install/frameworks/*` | Framework Install Guides | Next.js, React, Vue, Plain HTML, Shopify-style, and Webflow install pages with agent-ready snippets |
| `/install.md`, `/install/**/*.md` | Machine-Readable Install Docs | Markdown mirrors generated from the AnswerLattice install contract for coding agents, including `/install/contracts.md` for the v1 widget contract |
| `/agents/answerlattice/*` | Agent Kit Files | Public AGENTS.md, CLAUDE.md, Cursor, Windsurf, skill, and ZIP download generated from the same v1 contract |
| `/integrations` | Integrations | Slack and email workflow notifications for support governance, including test delivery, compact health, bounded delivery, and controlled adapter boundaries |
| `/pricing` | Pricing | INR Starter/Growth/Studio packaging, beta setup, and support-credit top-up explanation |
| `/resources` | Resources | AnswerLattice learning hub for pre-onboarding, product evaluation, setup, feedback review, widget install, governance, and safety |
| `/resources/launch-support-checklist` | Resource Article | Launch setup checklist for page-aware support, approved answers, fallback, and support-gap review |
| `/resources/pre-onboarding-source-package` | Resource Article | Source-preparation guide for repo, website, docs, owner notes, policies, screenshots, and product exclusions |
| `/resources/safe-page-context` | Resource Article | Public explanation of safe widget context and blocked private data |
| `/resources/widget-install-verification` | Resource Article | Widget install verification path for script, key, origin, blocked routes, and output checks |
| `/resources/approved-answers-before-fallback` | Resource Article | Approved answer order, fallback boundary, and reviewable missing-coverage workflow |
| `/resources/support-board-workflow` | Resource Article | Private Support Board workflow for selected follow-up and answer-proposal handoff |
| `/resources/feedback-review-workflow` | Resource Article | Private feedback review workflow for ratings, suggestions, feature requests, and support signals |
| `/resources/support-credits-and-pricing` | Resource Article | Support-credit and pricing explanation tied to visible pricing copy |
| `/resources/hosted-help-setup` | Resource Article | Hosted help setup for docs, FAQ, changelog, robots, sitemap, and support domains |
| `/resources/support-runtime-safety` | Resource Article | Runtime-safety guide for allowed origins, blocked routes, cache-first delivery, and owner review |
| `/developers` | Developer Docs | Developer-facing public docs for safe page context and widget verification without exposing dashboard or private API routes |
| `/developers/safe-page-context` | Developer Doc | Safe page-context fields, blocked sensitive data, and widget handoff guidance |
| `/developers/widget-verification` | Developer Doc | Verification checklist for script install, allowed origins, blocked routes, and support output checks |
| `/comparisons` | Comparisons | Category-level comparisons for chatbots, helpdesks, and knowledge bases without unsupported competitor claims |
| `/comparisons/answerlattice-vs-chatbots` | Comparison | Explains approved answers before fallback versus open-ended chatbot behavior |
| `/comparisons/answerlattice-vs-helpdesks` | Comparison | Explains support knowledge governance versus ticket-queue ownership |
| `/comparisons/answerlattice-vs-knowledge-bases` | Comparison | Explains page-aware runtime answers versus static article libraries |
| `/updates` | Updates | Public product update timeline for product and website changes without using dashboard-owned changelog routes |
| `/security` | Security | Trust controls for widget context, user-initiated screenshots, hosted help domains, safe ticket debugging context, tenant separation, AnswerLattice role permissions, owner-approved answers, runtime limits, and responsible disclosure |
| `/faq` | FAQ | Grouped founder questions about setup, team access, widget context, feedback review, screenshots, hosted help, custom domains, safe ticket context, FAQ generation, pricing, tickets, runtime safety, and data handling |
| `/about` | About | Company beliefs + AnswerLattice operating principles |
| `/contact` | Contact | AnswerLattice-owned inquiry form plus direct contact paths for setup, demos, pricing, security, and partnerships |
| `/get-started` | Get Started | Self-service onboarding for a new AnswerLattice workspace, with a pre-onboarding prompt for owners who have source material before signup |
| `/privacy-policy` | Privacy Policy | Public privacy summary for account, team access, workspace, support, and widget data |
| `/terms-of-service` | Terms of Service | Public terms summary for account, content, widget, and service usage |
| `/llms.txt` | Agent Context | Short agent-readable AnswerLattice product, route, and non-goal context |
| `/llms-full.txt` | Extended Agent Context | Detailed agent-readable product boundaries, public routes, runtime limits, and structured-data guidance |

### Key Files

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root app layout that imports scoped AnswerLattice CSS so clean-cache public routes receive theme-aware styling and Tailwind utilities from `app/layout.css` |
| `src/app/sites/answerlattice/layout.tsx` | AnswerLattice route layout with metadata, OG tags, SEO, OS-aware theme-color metadata, pre-hydration theme bootstrap, analytics, reveal, and theme provider islands |
| `src/app/sites/answerlattice/theme.ts` | AnswerLattice public-site theme contract: Verdigris Answer Layer dark/light colors, theme storage key, primary accent, status colors, and browser theme colors |
| `src/app/sites/answerlattice/answerlatticeWebsiteAssets.ts` | Screen-asset registry for image-backed generated/final website product scenes with fixed 1440 x 1200 dimensions |
| `src/content/answerlatticePublic/visualAssets.ts` | Maintained inventory for current generated assets, future animation slots, must-show notes, and must-avoid guardrails |
| `src/app/sites/answerlattice/styles.css` | Root-loaded Tailwind directives, scoped AnswerLattice CSS variables, dark/light compatibility rules, diagram theming, and page/section rhythm |
| `src/app/sites/answerlattice/scroll-reveal.css` | Root-loaded AnswerLattice viewport reveal motion for public website sections, cards, CTAs, and footer groups |
| `src/app/sites/answerlattice/page.tsx` | Compressed homepage server component with hero proof, support-suite cards, sticky support-surface story, feature-wise product overview cards, support improvement loop, install-surface quickstarts, AI-built SaaS fit, positioning boundary, pricing, objections, and final CTA |
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
| `src/app/sites/answerlattice/publicContent.ts` | Compatibility re-export for the AnswerLattice public content module |
| `src/content/answerlatticePublic/` | Typed public content source of truth for brand/domain decisions, claim guardrails, resource hub groups, article pages, comparison pages, and developer-doc pages |
| `src/app/sites/answerlattice/use-cases/page.tsx` | Use-case page for AI-built SaaS and founder/operator support scenarios |
| `src/app/sites/answerlattice/use-cases/ai-built-saas/page.tsx` | AI-built SaaS use-case landing page |
| `src/app/sites/answerlattice/use-cases/vibe-coded-saas/page.tsx` | Canonicalized campaign/search alias for the AI-built SaaS use-case page |
| `src/app/sites/answerlattice/use-cases/founders/page.tsx` | Founder use-case landing page |
| `src/app/sites/answerlattice/use-cases/small-saas-teams/page.tsx` | Small SaaS team use-case landing page |
| `src/app/sites/answerlattice/use-cases/studios-agencies/page.tsx` | Studio and agency use-case landing page |
| `src/app/sites/answerlattice/use-cases/support-teams/page.tsx` | Support-team use-case landing page |
| `src/app/sites/answerlattice/use-cases/product-teams/page.tsx` | Product-team use-case landing page |
| `src/app/sites/answerlattice/use-cases/engineering/page.tsx` | Engineering use-case landing page |
| `src/app/sites/answerlattice/page-aware-support-widget/page.tsx` | SEO landing page for page-aware widget search intent |
| `src/app/sites/answerlattice/hosted-help-center-for-saas/page.tsx` | SEO landing page for hosted help-center search intent |
| `src/app/sites/answerlattice/support-widget-for-solo-founders/page.tsx` | SEO landing page for solo-founder support search intent |
| `src/app/sites/answerlattice/install/page.tsx` | Agent install overview generated from AnswerLattice Widget Contract v1 |
| `src/app/sites/answerlattice/install/InstallContractPage.tsx` | Shared public install page renderer for overview, AI-agent, framework, verification, security, contract, and changelog pages |
| `src/app/sites/answerlattice/install/markdownRoute.ts` | Shared Markdown response helper for install `.md` mirrors |
| `src/app/sites/answerlattice/agents/answerlattice/agentRoute.ts` | Public generated AGENTS.md, CLAUDE.md, Cursor, Windsurf, skill, and ZIP responses |
| `src/lib/answerlattice/installContract/` | Single source of truth for the v1 widget contract, Markdown docs, llms text, agent prompts, and agent kit files |
| `src/app/widget/v1/answerlattice-widget.js/route.ts` | Stable public v1 script URL backed by the existing widget runtime |
| `src/app/sites/answerlattice/integrations/page.tsx` | Integrations landing page for Slack/email workflow notifications, test delivery, compact health, and controlled adapter boundaries |
| `src/app/sites/answerlattice/resources/page.tsx` | Public resources hub |
| `src/app/sites/answerlattice/resources/ResourceArticlePage.tsx` | Shared static renderer for AnswerLattice resource article routes |
| `src/app/sites/answerlattice/resources/ResourceStructuredData.tsx` | WebPage, Article, BreadcrumbList, ItemList, and FAQPage JSON-LD for the resources hub and resource articles |
| `src/app/sites/answerlattice/resources/*/page.tsx` | Explicit resource article route wrappers backed by `ANSWERLATTICE_RESOURCE_ARTICLES` |
| `src/app/sites/answerlattice/components/AnswerlatticeResourceAnalytics.tsx` | Client-only resource page analytics/referrer event helper with no Firestore writes |
| `src/app/sites/answerlattice/developers/page.tsx` | Public developer docs hub backed by `src/content/answerlatticePublic/` |
| `src/app/sites/answerlattice/developers/DeveloperDocPage.tsx` | Shared developer-doc renderer |
| `src/app/sites/answerlattice/developers/safe-page-context/page.tsx` | Safe page-context developer doc |
| `src/app/sites/answerlattice/developers/widget-verification/page.tsx` | Widget verification developer doc |
| `src/app/sites/answerlattice/comparisons/page.tsx` | Public comparisons hub backed by `src/content/answerlatticePublic/` |
| `src/app/sites/answerlattice/comparisons/ComparisonDetailPage.tsx` | Shared comparison renderer |
| `src/app/sites/answerlattice/comparisons/answerlattice-vs-chatbots/page.tsx` | Category comparison page for chatbots |
| `src/app/sites/answerlattice/comparisons/answerlattice-vs-helpdesks/page.tsx` | Category comparison page for helpdesks |
| `src/app/sites/answerlattice/comparisons/answerlattice-vs-knowledge-bases/page.tsx` | Category comparison page for knowledge bases |
| `src/app/sites/answerlattice/updates/page.tsx` | Public website update log |
| `src/app/sites/answerlattice/demo/page.tsx` | Static product demo route |
| `src/app/sites/answerlattice/demo/AnswerlatticePublicDemo.tsx` | Client-side demo interaction state |
| `src/app/sites/answerlattice/pre-onboarding/page.tsx` | Public Pre-Onboarding Kit page |
| `src/app/sites/answerlattice/pre-onboarding.md/route.ts` | Machine-readable pre-onboarding master prompt route |
| `src/app/sites/answerlattice/pre-onboarding/guide/page.tsx` | Detailed public owner/agent guide page |
| `src/app/sites/answerlattice/pre-onboarding/owner-guide.md/route.ts` | Machine-readable owner guide route |
| `src/app/sites/answerlattice/pre-onboarding/agent-guide.md/route.ts` | Machine-readable agent guide route |
| `src/lib/answerlattice/preOnboardingPrompt.ts` | Shared AnswerLattice pre-onboarding prompt text and output contract |
| `src/app/sites/answerlattice/security/page.tsx` | Public security/trust page with facts, runtime controls, and disclosure |
| `src/app/sites/answerlattice/faq/page.tsx` | Public FAQ page with FAQ structured data |
| `src/app/sites/answerlattice/contact/page.tsx` | Public contact page |
| `src/app/sites/answerlattice/contact/ContactForm.tsx` | Client contact form that posts to the AnswerLattice public contact API |
| `src/app/sites/answerlattice/privacy-policy/page.tsx` | Public privacy policy page |
| `src/app/sites/answerlattice/terms-of-service/page.tsx` | Public terms of service page |
| `src/app/api/answerlattice/public/contact/route.ts` | AnswerLattice-only public contact endpoint with validation, rate limiting, honeypot handling, and Firestore write |
| `src/app/sites/answerlattice/sitemap.xml/route.ts` | AnswerLattice product-domain sitemap |
| `src/app/sites/answerlattice/robots.txt/route.ts` | AnswerLattice product-domain robots policy |
| `src/app/sites/answerlattice/llms.txt/route.ts` | Short AnswerLattice-specific agent-readable context for product-domain crawlers and browser agents |
| `src/app/sites/answerlattice/llms-full.txt/route.ts` | Extended AnswerLattice-specific agent-readable context, product boundaries, and action limits |
| `src/app/sites/answerlattice/siteConfig.ts` | Public site URL, sitemap page list, and shared metadata constants |
| `src/app/sites/answerlattice/enginePillars.ts` | Shared implemented AnswerLattice engine pillar content |
| `src/app/sites/answerlattice/systemCoverage.ts` | Shared implemented AnswerLattice system coverage groups |
| `src/app/sites/answerlattice/components/StructuredData.tsx` | Homepage Organization/WebSite/SoftwareApplication JSON-LD |
| `public/answerlattice-og-image.png` | 1200x630 public social preview image |
| `public/answerlattice-logo.svg` | Design-final AnswerLattice SVG with the exported canvas/frame removed; canonical transparent mark source for UI, metadata, favicon, PWA, OpenGraph, and splash derivatives |
| `public/answerlattice-logo-mark-wide.png` | Transparent PNG derivative generated from the final SVG source for splash/icon generation and metadata-adjacent surfaces |
| `scripts/website-assets/generate-answerlattice-logo-assets.js` | Deterministic generator for transparent logo PNGs, favicons, PWA icons, and OpenGraph logo embeds |
| `src/app/sites/answerlattice/components/AnswerlatticeLogoMark.tsx` | Shared wrapper for the atom-level inline SVG path logo used across header, footer, diagrams, and dashboard navigation |
| `src/components/atoms/answerlatticeLogoMark/index.tsx` | Canonical inline SVG-path logo atom that preserves the final design geometry, colors, gradients, filters, stroke widths, and transparent background |
| `src/components/atoms/answerlatticeLoaderLogo/index.tsx` | Loader atom that animates the shared inline SVG-path logo with the same 3-second stroke-draw cycle used by the MenuList global loader |
| `src/app/sites/answerlattice/components/AnswerlatticeFlowDiagram.tsx` | Reusable SVG-only AnswerLattice hub, column-based sequence, and loop diagrams with a logo-only core, single soft ripple, dotted SVG paths, endpoint-fading pulse strokes, and border-only output highlights |
| `src/app/sites/answerlattice/components/AnswerlatticeConceptIllustration.tsx` | Reusable inline SVG concept illustrations for source-to-answer, governance loop, install verification, safe-context boundary, and category positioning |
| `src/app/sites/answerlattice/components/AnswerlatticeProofBlocks.tsx` | Reusable proof blocks for before/after examples, status snapshots, and fit/decision tiles that reduce text-heavy sections without adding runtime data calls |
| `src/app/sites/answerlattice/components/SectionHeader.tsx` | Shared centered section-introduction treatment for eyebrow, heading, and supporting copy across homepage, product, high-intent public pages, and SEO page templates |
| `src/app/sites/answerlattice/components/AnswerlatticeThemeProvider.tsx` | AnswerLattice-scoped Light/System/Dark theme provider with `answerlattice-theme` localStorage persistence and dynamic browser theme-color updates |
| `src/app/sites/answerlattice/components/AnswerlatticeThemeSwitcher.tsx` | Shared Light/System/Dark segmented icon control used by the mobile drawer and bottom footer strip |
| `src/app/sites/answerlattice/components/AnswerlatticeAssetImage.tsx` | Shared image renderer for website screen assets, preserving intrinsic aspect ratio and exposing data attributes for QA |
| `public/answerlattice-favicon.ico` | AnswerLattice favicon ICO generated from the final SVG logo source |
| `public/answerlattice-icon-*.png` | AnswerLattice square favicon/PWA icon family generated from the final SVG logo source |
| `public/answerlattice-splash/apple-splash-*.png` | AnswerLattice iOS startup image family rendered on the PWA startup background with the transparent logo mark composited on top |
| `public/answerlattice.webmanifest` | AnswerLattice web app manifest |
| `public/answerlattice-website-assets/dummy/*.png` | Public 1440 x 1200 generated product-scene PNG slots used by homepage, product preview, product-area, feature, widget, and demo screens; the directory name is retained for compatibility |
| `packages/asset-factory/answerlattice-website-assets/dummy-sources/` | Internal source SVGs and manifest for regenerating website product-scene assets; not referenced by public pages |
| `scripts/website-assets/generate-answerlattice-website-dummy-assets.js` | Deterministic generator for AnswerLattice website product-scene PNG assets, with zero npm dependencies |
| `src/lib/answerlattice/pwaAssets.ts` | AnswerLattice PWA startup image helper that keeps splash metadata out of root app defaults |
| `src/app/sites/answerlattice/components/Header.tsx` | Shared header with Product, Demo, Install, Use Cases, Resources, Pricing, compact Product/Resources dropdowns, and right-side mobile drawer |
| `src/app/sites/answerlattice/components/Footer.tsx` | Shared footer with broad public-route link columns and bottom theme control |
| `src/app/sites/answerlattice/components/AnswerlatticeLink.tsx` | Dev/production-aware Link component |
| `src/app/sites/answerlattice/components/AnswerlatticeAnalytics.tsx` | Optional GA/measurement-id conversion event tracker with no Firestore writes |
| `src/app/sites/answerlattice/components/AnswerlatticeScrollReveal.tsx` | Layout-level client island that applies restrained viewport reveal effects across AnswerLattice public pages |
| `src/constants/answerlattice/routes.ts` | Lightweight AnswerLattice dashboard route constants used by public client islands without importing sidebar icon metadata |
| `src/app/sites/answerlattice/components/HeroSection.tsx` | Page-aware support-answer hero with inline sample workspace preview and setup/demo/source-prep CTAs |
| `src/app/sites/answerlattice/components/HomeProofBandSection.tsx` | Homepage conversion proof band for page-aware answers, approved knowledge, hosted help, feedback gaps, widget install, and source preparation |
| `src/app/sites/answerlattice/components/PageProofStrip.tsx` | Reusable compact proof-strip cards used across non-home pages to keep hero proof, safety boundaries, and next-step clarity consistent without fake logos or metrics |
| `src/app/sites/answerlattice/components/PreOnboardingHomeSection.tsx` | Homepage source-preparation placement that sends buyers to the Pre-Onboarding Kit after the product value is clear |
| `src/app/sites/answerlattice/components/SupportKnowledgeMapSection.tsx` | Homepage and product-page visual map showing support knowledge inputs, the AnswerLattice answer layer, and output surfaces |
| `src/app/sites/answerlattice/components/HomePageAwareDemoSection.tsx` | Homepage tabbed static page-aware demo section |
| `src/app/sites/answerlattice/components/ClosedLoopSection.tsx` | Homepage animated missed-question loop from page question to reviewed support fix |
| `src/app/sites/answerlattice/components/BestFitSection.tsx` | Homepage best-fit/not-fit buyer qualification tiles for live, beta, and near-launch products with starter support knowledge |
| `src/app/sites/answerlattice/components/ProductPreviewSection.tsx` | Early product-proof scene with compact tabs, active-state explanation, and image-backed dashboard/widget/governance preview slots |
| `src/app/sites/answerlattice/components/ProductAreasSection.tsx` | Homepage product-suite cross-link section for Set Up Support, In-App Help Widget, Help Center and Tickets, and Review Approved Answers |
| `src/app/sites/answerlattice/components/SetupFunnelSection.tsx` | Homepage 10-minute setup visual funnel |
| `src/app/sites/answerlattice/components/DayOneLaunchPackSection.tsx` | Homepage and Product section packaging quickstarts, starter surfaces, import templates, install verification, ROI/proof, and security handoff without adding another route |
| `src/app/sites/answerlattice/components/WidgetSection.tsx` | Homepage page-aware widget proof with UI scene and status snapshots |
| `src/app/sites/answerlattice/components/HomeTrustSection.tsx` | Homepage trust/security status snapshots |
| `src/app/sites/answerlattice/components/PillarsSection.tsx` | AnswerLattice engine pillar sequence diagram |
| `src/app/sites/answerlattice/components/SystemCoverageSection.tsx` | Launch Setup, Support Control, Knowledge Governance, and Runtime Layer hub diagram |
| `src/app/sites/answerlattice/components/HowItWorksSection.tsx` | 5-step animated setup sequence |
| `src/app/sites/answerlattice/components/ComparisonSection.tsx` | Product category comparison table separating AnswerLattice from chatbots, helpdesks, and static knowledge bases |
| `src/app/sites/answerlattice/components/PricingPreviewSection.tsx` | Compact homepage pricing checkpoint that links to the full pricing page for plan details, support credits, top-ups, and fit |
| `src/app/sites/answerlattice/components/ObjectionsSection.tsx` | Homepage objection-handling FAQ strip |
| `src/app/sites/answerlattice/components/SeoLandingPage.tsx` | Shared component for static SEO landing pages |
| `src/app/sites/answerlattice/components/UseCaseLandingPage.tsx` | Shared wrapper for role-specific use-case pages |
| `src/app/sites/answerlattice/components/ProductCapabilityLandingPage.tsx` | Shared landing-page template for major product capability pages with suite-fit framing, workflow proof, and setup/security/category-fit evaluation links |
| `src/app/sites/answerlattice/components/ProductFeatureLandingPage.tsx` | Shared product feature-page template with outcome hero, buyer proof strip, visual proof grid, workflow, connected suite section, evaluation strip, FAQ, and CTA |
| `src/app/sites/answerlattice/components/PageStructuredData.tsx` | Per-route WebPage and BreadcrumbList JSON-LD for public AnswerLattice pages |
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

1. **Theme modes** — Light/System/Dark public-site theme control. Dark remains deep navy with verdigris/teal controls; light uses restrained slate text, pale surfaces, and the same verdigris action/signal language. The selected mode is AnswerLattice-scoped and stored under `answerlattice-theme`.
2. **Tailwind CSS** — Same build pipeline as rest of app. AnswerLattice `@tailwind` directives and scoped theme rules are root-loaded through `src/app/layout.tsx` so public routes do not depend on a nested CSS chunk.
3. **Server components by default** — Pages stay server-rendered. The public header is a small client island so the desktop Product and Resources dropdowns can stay CSS-driven at `xl` widths while narrower screens use the right-side drawer with route icons, backdrop, Escape close, body scroll lock, and link-close behavior.
4. **basePath pattern** — `getBasePath()` reads `x-product-id` header + `host` to determine if dev mode. Passed as prop to components that contain links.
5. **AnswerlatticeLink** — Wraps `next/link` with basePath prefix for dev mode compatibility.
6. **No external dependencies** — Zero new npm packages. Uses existing Tailwind, React, and icon stack.
7. **Contact boundary** — `/contact` posts to an AnswerLattice-owned API route and AnswerLattice Firestore collection. It does not reuse another product's public enquiry storage.
8. **Viewport reveal motion** — A single AnswerLattice-specific client island adds restrained section/card/CTA reveal effects across public pages with reduced-motion support. Motion stays product-site polish, not decorative animation.
9. **Diagram motion** — AnswerLattice diagrams use one soft logo-centered ripple without an inner static strip. Cross-diagram pulses start from the logo together, run to the visible guide-line endpoints, and fade at the endpoint instead of disappearing abruptly.
10. **Screen assets** — Website product-screen sample scenes render from 1440 x 1200 PNG slots instead of HTML/CSS mockup screens. Production screenshots or GIFs can replace the same named slots later so layout, crop, and page rhythm stay stable.
11. **Non-home hero treatment** — `styles.css` keeps non-home route heroes aligned through `.al-page-flow` and `.al-page-hero`: centered eyebrows, titles, descriptions, actions, and proof strips use one type scale and color system, while the homepage keeps its own larger first-viewport treatment.

---

## Version History

| Date | Change |
|------|--------|
| 2026-06-10 | Added reusable inline SVG concept illustrations across Product, Install, Security, and Comparisons for source-to-answer, governance loop, install verification, safe-context boundary, and category positioning |
| 2026-06-06 | Synced public launch-setup and product-proof copy with Activation `summary.launchProof`, keeping proposal-quality confirmation in Signal Queue instead of claiming connector readiness |
| 2026-06-07 | Updated the homepage around product-user support, the owner-input-to-support-output diagram, modern vertical frame rails, and a scroll-led support-surface story covering in-app help, hosted help, fallback gaps, and review loops |
| 2026-06-06 | Hid the mobile hamburger on confirmed desktop viewports and normalized non-home route hero alignment, spacing, type scale, and eyebrow styling through the shared AnswerLattice stylesheet |
| 2026-06-06 | Added dedicated Small SaaS Teams and Studios/Agencies use-case routes, exposed route-backed use-case links from the footer, and updated the public page registry |
| 2026-06-06 | Restored full public-route footer discoverability across Product, Features, Evaluate, Resources, and Trust without placeholder social links |
| 2026-06-06 | Reworked the desktop Resources dropdown to match the compact Product dropdown pattern with an overview row, small icon tiles, and title-only resource guide rows |
| 2026-06-05 | Simplified the desktop Product dropdown into compact title-only rows with icons, keeping all product routes while removing dense explanatory copy from the header |
| 2026-06-05 | Moved the Light/System/Dark control to the bottom footer strip |
| 2026-06-05 | Removed the Light/System/Dark selector from the desktop header while keeping theme control available in the mobile drawer and footer |
| 2026-06-05 | Normalized AnswerLattice website accent colors across feature-card layouts, header dropdowns, product/resources cards, onboarding pages, and radial section glows so all public-site visual accents now use the Verdigris primary token system |
| 2026-06-05 | Reworked the Product proof section from a sticky side-card walkthrough into a stable tabbed product-proof preview with one centered image-backed frame and readable active-state copy |
| 2026-06-05 | Fixed the desktop header layout: full navigation now starts at `xl`, tablet/narrow desktop widths use the drawer, the header uses a wider container, and the Product dropdown stays inside the viewport |
| 2026-06-05 | Replaced HTML/CSS product-screen placeholders with image-backed 1440 x 1200 dummy PNG slots, added the screen-asset registry/renderer/generator, and documented the final asset replacement contract |
| 2026-06-05 | Refined AnswerLattice website diagrams with a single soft logo ripple, removed the inner static center strip, synchronized cross-diagram logo-origin pulses, and made pulse strokes fade at route endpoints |
| 2026-06-05 | Added AnswerLattice public-site Light/System/Dark mode end to end: scoped theme provider, mobile/footer switcher, pre-hydration preference bootstrap, light/dark browser theme colors, global light-mode compatibility rules, inline-style route updates, and all-route smoke verification |
| 2026-06-04 | Added a compact desktop Resources dropdown in the AnswerLattice public header, linking to the highest-priority resource articles and the resources hub without adding runtime or dashboard routes |
| 2026-06-02 | Added a typed AnswerLattice public content module and ten explicit resource article routes with Article/FAQ structured data, resource analytics, sitemap registry coverage, LLM context, and verifier checks |
| 2026-06-01 | Reworked the homepage from a setup-first story into a conversion-first story: clearer page-aware support-answer hero, inline sample workspace preview, new conversion proof band, earlier product proof/demo, Pre-Onboarding moved lower as a source-preparation accelerator, refreshed metadata, and final asset-preparation plan added |
| 2026-06-01 | Extended the homepage conversion pattern across the rest of the public site: product, product-area, feature, SEO/use-case, setup, pricing, resources, proof, security, install, FAQ, contact, legal, and updates pages now expose compact proof strips, clearer CTAs, grouped FAQ scanning, and safer sample-state wording |
| 2026-06-01 | Completed rendered wording QA across all public AnswerLattice routes and root-loaded scoped AnswerLattice CSS through `src/app/layout.tsx` so clean-cache pages keep theme styling, Tailwind utilities, and route styling without relying on a nested CSS chunk |
| 2026-06-02 | Broadened the top-level homepage, metadata, Product, About, Contact, and footer positioning from SaaS-only wording to SaaS and digital products while keeping AI-built SaaS as a focused use-case and SEO path |
| 2026-06-02 | Completed the full rendered page-content cross-check: removed repeated long body copy from shared templates and broadened Resources, Pricing, ROI, FAQ, Proof, homepage CTA, and homepage pricing copy to SaaS plus digital-product framing |
| 2026-06-02 | Upgraded the homepage product-proof section into a restrained desktop sticky walkthrough for setup, surfaces, widget, feedback, and governance while preserving the mobile tabbed preview and dark/teal theme |
| 2026-06-02 | Tightened the homepage pricing block into a compact pricing checkpoint so it reduces buyer uncertainty without duplicating the dedicated `/pricing` page |
| 2026-06-02 | Reframed the homepage best-fit section so launch-ready founders are included before existing support volume becomes a requirement |
| 2026-06-02 | Completed a launch-readiness wording audit across homepage, Get Started, FAQ, About, Pricing, ROI, metadata, and AI-built SaaS use-case copy so beta and near-launch founders are not excluded |
| 2026-03-07 | Initial implementation: 6 pages, shared components, Tailwind, multi-product routing |
| 2026-05-21 | Added small-SaaS positioning, `/demo`, Starter/Growth/Studio pricing copy, founder-friendly product/get-started/contact pages, public security/FAQ/legal pages, AnswerLattice sitemap/robots, manifest, icons, and structured data |
| 2026-05-21 | Restored implemented AnswerLattice engine pillars to homepage and product page while keeping the deferred API/integration pillar off public claims |
| 2026-05-21 | Added homepage system coverage map from the AnswerLattice codebase inventory |
| 2026-05-21 | Added static product preview and market-standard public pages for use cases, integrations, resources, and updates |
| 2026-05-21 | Replaced public integrations positioning with widget-first install positioning; API/adapters stay rollout-gated and out of buyer-facing package copy |
| 2026-05-21 | Expanded the security page using a reusable trust-page structure while keeping AnswerLattice-specific product boundaries, widget controls, owner-reviewed answers, rate limits, and responsible disclosure |
| 2026-05-22 | Refreshed public website for current AnswerLattice runtime: governed answer infrastructure hero, hosted help domains, FAQ management/generation, product-scoped billing/support credits, source-version cache freshness, and separate Firebase/product boundaries |
| 2026-05-22 | Added buyer-facing custom help domain positioning and safe ticket debugging context across homepage, product, install, security, FAQ, privacy, and updates copy |
| 2026-05-22 | Reworked homepage for self-sell conversion: pain/outcome-led hero, embedded generic-vs-AnswerLattice demo, best-fit/not-fit, 10-minute setup funnel, trust strip, pricing preview, objections, optional no-Firestore GA events, and three SEO landing pages |
| 2026-05-22 | Added a screenshot-led product scene inspired by modern product websites: activation command center, product surfaces, widget answer, and signal-to-knowledge queue now appear directly after the hero and on the product page without adding Firebase reads or static screenshot assets |
| 2026-05-22 | Applied the AnswerLattice positioning pass: demo is the primary hero CTA, homepage leads with page-aware support truth, a closed-loop visual explains question → canonical answer → signal → human approval, comparison now contrasts chatbot/helpdesk/KB/AnswerLattice, FAQ defines the category, and four role-specific use-case pages were added |
| 2026-05-22 | Applied founder-relief positioning safely: homepage now says "You build revenue. AnswerLattice keeps support accurate." while avoiding "we handle your support" because AnswerLattice is not a helpdesk replacement, outsourcing service, or AI autopilot |
| 2026-05-22 | Improved website presentation quality using product-site patterns from Circle/Upvoty references: the demo now uses a horizontal page-tab row and large product canvas, product proof has clearer dashboard tabs, and widget content is organized as a bento-style install/runtime/governance grid |
| 2026-05-22 | Added standalone landing-style product area pages for Launch Setup, Page-Aware Widget, Support Control, and Knowledge Governance, following the Swell/Abyssale/Circle pattern where each product part can sell and explain itself |
| 2026-05-22 | Final product-suite polish: header Product dropdown now exposes the four product-area pages, homepage/resources/use-case/SEO pages cross-link those areas, and buyer navigation stays static with zero Firebase cost |
| 2026-05-23 | Added standalone product-feature landing pages for Knowledge Base, FAQ Management, Changelog, and Tickets using a reusable feature-page pattern inspired by Bugasura's individual feature pages while keeping routes under `/product/*` and browsing at zero Firebase cost |
| 2026-05-23 | Re-themed the shared product-feature page template so Knowledge Base, FAQ Management, Changelog, and Tickets follow the AnswerLattice dark visual system instead of rendering a light-mode proof band; also set the AnswerLattice route background to prevent white body bleed |
| 2026-05-23 | Hardened product-feature routing by replacing the dynamic `[feature]` page with explicit Knowledge Base, FAQ Management, Changelog, and Tickets pages backed by a shared route wrapper |
| 2026-05-23 | Removed remaining light-mode product mockups from the public demo, product capability template, and homepage widget section so newly added AnswerLattice website pages stay aligned with the dark theme |
| 2026-05-23 | Reworked `/resources` grouped links from tall category cards into row-wise decision paths so each category and its subcards scan together on desktop and stack cleanly on mobile |
| 2026-05-23 | Replaced the temporary AnswerLattice `C` mark with the dimensional infinity mark across website metadata, favicon/PWA icons, OpenGraph preview, header, footer, and dashboard navigation |
| 2026-05-23 | Removed the outer card treatment from `/resources` decision rows so the resources hub keeps row grouping without nested-card visual noise |
| 2026-05-23 | Updated shared product capability bento sections so five-card layouts render as two wide cards on row one and three balanced cards on row two |
| 2026-05-23 | Replaced the public website header/footer raster logo image with an inline true SVG mark so the AnswerLattice brand stays crisp on high-density displays |
| 2026-05-23 | Added signed-in Google account visibility and an account-switch action to the get-started form so founders can change email before creating a workspace |
| 2026-05-23 | Added an existing AnswerLattice workspace state to the get-started form so valid signed-in accounts are sent to Activation/Billing instead of seeing the setup form again |
| 2026-05-23 | Added homepage section-band background rhythm and larger vertical spacing so public sections have clearer visual separation without extra runtime cost |
| 2026-05-23 | Added AnswerLattice-specific viewport reveal effects across public pages and card/link panels through the shared website layout, preserving reduced-motion behavior and product-specific styling |
| 2026-05-23 | Added a support knowledge map to the homepage and Product page so buyers can understand docs, releases, tickets, feedback, and page context flowing into AnswerLattice, then out to widget, hosted help, approved answers, and review queues |
| 2026-05-25 | Added a day-one launch-pack section to homepage and Product so the completed quickstarts, starter surfaces, import starter pack, install verifier, ROI/proof, and security one-pager are visible from the main buyer path without creating another public page |
| 2026-05-25 | Updated existing widget, install, quickstart, security, FAQ, SEO, updates, metadata, and LLM-context pages so user-initiated screenshot upload/paste is presented accurately without adding a separate screenshot page or claiming automatic screen capture |
| 2026-05-26 | Formalized the Verdigris Answer Layer theme contract, aligned PWA manifest background/theme color to deep navy, and moved website inline-style primary/status colors onto AnswerLattice theme tokens |
| 2026-05-27 | Added an AnswerLattice-owned contact inquiry flow with public API validation/rate limiting and regrouped the mobile hamburger menu into Product Areas, Product Features, and Other cards with safe-area bottom padding |
| 2026-05-27 | Added the AnswerLattice Agent Install Layer: public install pages, Markdown mirrors, llms install context, generated AGENTS/CLAUDE/Cursor/Windsurf/skill files, ZIP download, dashboard AI packet actions, and the frozen `/widget/v1/answerlattice-widget.js` URL |
| 2026-05-26 | Added Team Access as a buyer-facing product feature page and updated Product, Launch Setup, Pricing, Security, Security One-Pager, Get Started, FAQ, Privacy, Resources, Updates, sitemap metadata, and LLM context to include AnswerLattice roles, owner reset, force sign-out, and workspace-scoped access |
| 2026-05-23 | Added AnswerLattice-specific PWA startup images and loader branding so AnswerLattice website/dashboard installs use AnswerLattice splash screens and loader identity |
| 2026-05-23 | Added AnswerLattice-specific `llms.txt` and `llms-full.txt` routes so product-domain agents read AnswerLattice as governed answer infrastructure, not as generic platform context, a helpdesk replacement, or an AI autopilot |
| 2026-05-23 | Added server-rendered WebPage/BreadcrumbList JSON-LD coverage across public AnswerLattice routes, route-registry Website graph references, explicit AI/search crawler robots rules, and `verify:agent-readiness` checks |
| 2026-05-31 | Reframed the homepage hero around the founder-readable launch promise "Launch your SaaS with support already built", made setup the primary CTA, and clarified that AnswerLattice prepares docs/FAQs/answer drafts/widget support while tickets, changelogs, feedback, ratings, and feature requests remain owner-managed surfaces |
| 2026-05-31 | Added Feedback Review as a buyer-facing product-feature page and added a homepage/product preview tab showing ratings, requests, suggestions, Support Board handoff, and answer-governance boundaries |
| 2026-06-01 | Replaced all AnswerLattice logo surfaces with the design-final SVG source, regenerated favicon/PWA/OpenGraph/splash derivatives from that source, and documented that the logo must not be redrawn, recolored, reshaped, or simplified |
| 2026-06-01 | Regenerated AnswerLattice splash screens so the startup surface owns the background and the logo asset does not carry a visible rectangular box |
| 2026-06-01 | Added a dedicated AnswerLattice loader SVG atom using the final logo paths, gradients, filters, and a MenuList-matched 3-second stroke-draw animation for server and global loading states |
| 2026-06-01 | Removed the exported black SVG canvas/frame from the canonical AnswerLattice logo and regenerated logo, favicon, PWA, OpenGraph, and splash derivatives with transparent logo backgrounds |
| 2026-06-01 | Aligned `AnswerlatticeLogoMark` with the MenuList inline SVG-path pattern so static logo UI and loaders share the same canonical path geometry instead of an image wrapper |
| 2026-06-01 | Added verification that visible AnswerLattice website diagram components stay vector-based and do not reintroduce PNG/image-wrapped logo usage |
| 2026-06-01 | Removed extra CSS blur/drop-shadow from AnswerLattice loader logo surfaces so the logo renders only with the SVG-native design filters |
| 2026-06-01 | Removed the persistent post-reveal `translate3d`/`will-change` layer from AnswerLattice website sections so inline SVG diagram logos do not look rasterized when zoomed |
| 2026-05-24 | Reframed the public website for AI-built SaaS founders: homepage opened with "You shipped the app. Now users need correct answers.", demo became the first proof, public copy teaches approved answers before advanced AnswerLattice vocabulary, `/use-cases/ai-built-saas` was added, and `/use-cases/vibe-coded-saas` remains only a campaign/search alias |
| 2026-05-24 | Refined the shared homepage/Product support knowledge map diagram with an AnswerLattice-colored logo-only core, ripple rings, dotted SVG paths, homepage-style pulse strokes, and border-only output highlights |
| 2026-05-24 | Added a reusable animated AnswerLattice diagram system and applied it to closed-loop, setup, how-it-works, product-area workflow, product-feature workflow/connected surfaces, SEO/use-case, install, security, resources, engine pillar, and system coverage sections |
| 2026-05-24 | Aligned reusable AnswerLattice sequence-diagram endpoints and output-highlight timing with the shared source-map reference while keeping the AnswerLattice logo, ripple, and color treatment unchanged |
| 2026-05-27 | Removed client-specific public relationship framing from AnswerLattice website pages, route docs, and LLM context so AnswerLattice presents independently |
| 2026-05-27 | Added Support Board as a buyer-facing product-feature page and updated Support Control, FAQ, Resources, Updates, route metadata, and LLM context with manual-first, private-owner-workboard wording |
| 2026-05-24 | Synchronized the closed-loop diagram ring pulse and six card border highlights so the loop reads as one ordered motion from step 01 through step 06 |
| 2026-05-24 | Converted reusable sequence diagrams from horizontal card strips into the same input column, logo center, and output column layout used by the source-map diagrams |
| 2026-05-24 | Slowed the closed-loop ring and card-highlight animation to an 8.4-second loop-specific cycle while keeping the card highlights synchronized with the ring pulse |
| 2026-05-24 | Added reusable proof blocks and applied them to fit qualification, widget states, homepage trust controls, use-case before/after examples, and security controls so text-heavy sections read as visual product proof |
| 2026-05-24 | Added public Workflow Notifications and Proactive Help product-feature pages plus a real `/integrations` page now that Slack/email delivery, test notifications, compact health, proactive trigger gating, and bounded delivery are production-ready enough for buyer-facing claims |
| 2026-05-27 | Converted the AnswerLattice public hamburger menu into a right-side mobile drawer while preserving Product Areas, Product Features, Other, and setup CTA grouping |
| 2026-05-27 | Completed an end-to-end AnswerLattice website audit across public routes, internal links, desktop/mobile rendered layout, and docs; synced the install-route documentation to the live generated install and Markdown contract surfaces |
| 2026-05-27 | Fixed the mobile drawer animation lifecycle so the drawer paints off-screen before opening and transitions out before unmounting |
| 2026-05-27 | Added route icons to every AnswerLattice mobile drawer item and the setup CTA while keeping the existing grouped drawer behavior |
| 2026-05-28 | Adjusted the desktop Product dropdown so product-feature labels stay on one line while descriptions remain clamped |
| 2026-05-28 | Added a shared centered section-header component and applied it across homepage, product, high-intent public pages, and SEO page templates so eyebrow, heading, and subheading presentation stays consistent |

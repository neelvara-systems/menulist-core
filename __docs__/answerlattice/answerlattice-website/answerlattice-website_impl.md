# AnswerLattice Website — Implementation

> **Version:** 1.2.61
> **Last Updated:** 2026-06-02
> **Audience:** Developers

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS (shared app pipeline) |
| Routing | Middleware hostname-based rewrite (multi-product) |
| Components | React Server Components by default; client islands only where interaction needs state |
| Links | `AnswerlatticeLink` wrapper for public-site links; `src/constants/answerlattice/routes.ts` for dashboard route constants without sidebar icon bundle cost |
| Dependencies | Zero new npm packages |

## Public Brand and Domain Decision

AnswerLattice is the public product brand for this surface. Internal code paths, dashboard routes, constants, and file names may continue using the lowercase `answerlattice` slug or `Answerlattice*` component identifiers until a separate tested runtime migration is planned.

Production canonical URLs use `https://answerlattice.com`. `https://ecomsai.com` remains the Vercel Preview / QA host in deployment-domain routing and must not be promoted to production canonical copy without a deployment-target change. Legacy Canonica public hosts are redirected by middleware to the active AnswerLattice public target so crawlers do not see two public brands for the same product.

`src/content/answerlatticePublic/` is the shared public-content registry for this release. `src/app/sites/answerlattice/publicContent.ts` remains as a compatibility re-export so existing public pages can keep stable imports while the content source is separated from route code. The module stores:

- `ANSWERLATTICE_PUBLIC_BRAND`
- canonical/preview/local domain decisions
- public claim guardrails and private route-prefix exclusions
- resources grouped by buyer workflow
- resource article pages
- comparison pages
- developer-doc pages

Public copy uses `AnswerLattice` as the standalone brand. Internal file paths and JavaScript identifiers can remain `answerlattice` or `Answerlattice*` where renaming would create runtime churn.

## PWA Brand Assets

AnswerLattice website and dashboard metadata use `src/lib/answerlattice/pwaAssets.ts` for iOS startup image declarations. The generated startup PNGs live in `public/answerlattice-splash/apple-splash-*.png` and are produced by `npm run generate:answerlattice-splash` from the transparent `public/answerlattice-logo-mark-wide.png` source mark. Logo PNGs, favicons, PWA icons, and the OpenGraph logo embed are produced by `node scripts/website-assets/generate-answerlattice-logo-assets.js`. The splash renderer owns the full startup background before compositing the unchanged source mark so the logo itself never carries a separate rectangle.

The root app layout defines default startup images in `metadata.appleWebApp.startupImage`; AnswerLattice child layouts override that metadata with `getStaticAnswerlatticeAppleStartupImages()` so AnswerLattice install/splash contexts use AnswerLattice-specific startup images.

`src/app/loading.tsx` exposes `brand="answerlattice"` for explicit AnswerLattice fallback loaders and auto-detects `x-product-id: answerlattice` for root streamed loading payloads. The Redux overlay loader in `src/components/organisms/loader/index.tsx` detects AnswerLattice runtime routes and swaps to the shared `AnswerlatticeLoaderLogo` atom. Static logo UI and loaders now share `src/components/atoms/answerlatticeLogoMark/index.tsx`, which follows the MenuList inline SVG-path pattern and carries the final logo paths, gradients, filters, stroke widths, and transparent background directly. `AnswerlatticeLoaderLogo` only adds path classes for the same 3-second stroke-draw cycle as the MenuList global loader without changing final color or shape output. Loader surfaces must not add CSS blur or drop-shadow to the AnswerLattice logo; any path shadow/effect must come only from the SVG-native design filters.

Visible AnswerLattice website diagrams stay vector-based. `AnswerlatticeFlowDiagram`, `SupportKnowledgeMapSection`, and routed product/SEO diagram surfaces use inline SVG paths plus the shared `AnswerlatticeLogoMark` atom; they should not use PNGs, raster screenshots, or image-wrapped logo assets for diagram marks. `scripts/verification/verify-answerlattice-pwa-assets.js` enforces this by scanning the public website component directory, with the metadata-only `StructuredData.tsx` logo reference excluded because it is not a visible diagram.

`src/app/sites/answerlattice/scroll-reveal.css` must not leave visible sections on a persistent `translate3d(0, 0, 0)` or `will-change` compositing layer. Pending reveal can use a temporary transform, but the visible state returns to `transform: none` and `will-change: auto` so inline SVG diagrams remain vector-painted and do not look rasterized when the browser zoom level changes.

`src/app/layout.tsx` imports `src/app/sites/answerlattice/styles.css` and `src/app/sites/answerlattice/scroll-reveal.css` from the root app layout. This keeps the AnswerLattice CSS in the root `app/layout.css` bundle and avoids clean-cache requests for a missing nested `app/sites/answerlattice/layout.css` chunk. AnswerLattice visual rules must remain scoped to `.answerlattice-site`, `.al-home-flow`, `.al-page-flow`, or explicit AnswerLattice selectors so root loading does not recolor MenuList or other product pages.

---

## File Structure

```
src/app/sites/answerlattice/
├── layout.tsx                     # Route layout (metadata, OG, viewport, analytics/reveal client islands)
├── theme.ts                       # Verdigris Answer Layer theme contract and browser theme color
├── styles.css                     # Root-loaded Tailwind directives, scoped CSS variables, and section rhythm
├── scroll-reveal.css              # Root-loaded AnswerLattice viewport reveal motion with reduced-motion support
├── page.tsx                       # Homepage (server component)
├── home/page.tsx                  # Internal root-rewrite wrapper for the homepage; public canonical URL remains /
├── not-found.tsx                  # 404 page
├── productAreas.ts                # Shared product-area navigation and descriptions
├── product/page.tsx               # Product deep-dive
├── product/launch-setup/page.tsx  # Landing page for Launch Setup
├── product/page-aware-widget/page.tsx # Landing page for Page-Aware Widget
├── product/support-control/page.tsx # Landing page for Support Control
├── product/knowledge-governance/page.tsx # Landing page for Knowledge Governance
├── product/ProductFeatureRoutePage.tsx # Shared server wrapper for feature pages
├── product/team-access/page.tsx # Team Access feature page
├── product/knowledge-base/page.tsx # Knowledge Base feature page
├── product/faq-management/page.tsx # FAQ Management feature page
├── product/changelog/page.tsx     # Changelog feature page
├── product/tickets/page.tsx       # Tickets feature page
├── product/support-board/page.tsx # Support Board feature page
├── product/feedback-review/page.tsx # Feedback Review feature page
├── product/workflow-notifications/page.tsx # Workflow Notifications feature page
├── product/proactive-help/page.tsx # Proactive Help feature page
├── productFeatures.ts             # Shared product-feature route data and sitemap source
├── publicContent.ts                # Compatibility re-export for src/content/answerlatticePublic
├── use-cases/page.tsx             # AI-built SaaS and founder/operator use-case page
├── use-cases/ai-built-saas/page.tsx # AI-built SaaS use-case page
├── use-cases/vibe-coded-saas/page.tsx # Canonicalized campaign alias to AI-built SaaS use case
├── use-cases/founders/page.tsx    # Founder use-case page
├── use-cases/support-teams/page.tsx # Support team use-case page
├── use-cases/product-teams/page.tsx # Product team use-case page
├── use-cases/engineering/page.tsx # Engineering use-case page
├── page-aware-support-widget/page.tsx      # SEO page for page-aware widget search intent
├── hosted-help-center-for-saas/page.tsx    # SEO page for hosted help-center search intent
├── support-widget-for-solo-founders/page.tsx # SEO page for solo-founder support intent
├── demo/page.tsx                  # Static interactive demo page
├── demo/AnswerlatticePublicDemo.tsx    # Account-free page-aware support demo
├── install/page.tsx               # Agent install overview generated from AnswerLattice Widget Contract v1
├── install/InstallContractPage.tsx # Shared install/contract/framework page renderer
├── install/markdownRoute.ts       # Shared Markdown response helper for install .md mirrors
├── install/ai-agent/page.tsx      # Copyable AI agent install packet page
├── install/manual/page.tsx        # Manual v1 widget install page
├── install/frameworks/*/page.tsx  # Framework-specific install pages
├── install.md/route.ts            # Machine-readable install overview
├── install/**/*.md/route.ts       # Machine-readable framework and contract docs
├── agents/answerlattice/*              # Public generated AGENTS/CLAUDE/Cursor/Windsurf/skill/ZIP files
├── integrations/page.tsx          # Slack/email workflow notifications page
├── pricing/page.tsx               # Pricing page
├── resources/page.tsx             # Public learning hub
├── resources/ResourceArticlePage.tsx # Shared resource article renderer
├── resources/ResourceStructuredData.tsx # Resources hub/article JSON-LD
├── resources/*/page.tsx           # Explicit resource article route wrappers
├── developers/page.tsx            # Developer docs hub
├── developers/DeveloperDocPage.tsx # Shared developer-doc renderer
├── developers/safe-page-context/page.tsx # Safe page context developer doc
├── developers/widget-verification/page.tsx # Widget verification developer doc
├── comparisons/page.tsx           # Category comparison hub
├── comparisons/ComparisonDetailPage.tsx # Shared comparison renderer
├── comparisons/answerlattice-vs-chatbots/page.tsx # Chatbot category comparison
├── comparisons/answerlattice-vs-helpdesks/page.tsx # Helpdesk category comparison
├── comparisons/answerlattice-vs-knowledge-bases/page.tsx # Knowledge-base category comparison
├── updates/page.tsx               # Public website update log
├── security/page.tsx              # Security and trust page
├── faq/page.tsx                   # FAQ page with FAQPage JSON-LD
├── about/page.tsx                 # About page
├── contact/page.tsx               # Contact page
├── contact/ContactForm.tsx        # AnswerLattice public inquiry form client island
├── get-started/page.tsx           # Self-service onboarding page
├── privacy-policy/page.tsx        # Public privacy policy
├── terms-of-service/page.tsx      # Public terms of service
├── sitemap.xml/route.ts           # AnswerLattice sitemap.xml route handler
├── robots.txt/route.ts            # AnswerLattice robots.txt route handler
├── llms.txt/route.ts              # Short product-domain agent-readable context
├── llms-full.txt/route.ts         # Extended product-domain agent-readable context and boundaries
├── siteConfig.ts                  # Shared public site metadata and route registry
├── enginePillars.ts               # Implemented AnswerLattice engine pillar copy
├── systemCoverage.ts              # Code-backed system coverage groups for homepage
└── components/
    ├── Header.tsx                 # Shared header with desktop nav and right-side mobile drawer
    ├── Footer.tsx                 # Shared footer
    ├── AnswerlatticeLogoMark.tsx       # Shared wrapper for the atom-level inline SVG-path logo
    ├── AnswerlatticeFlowDiagram.tsx    # Reusable animated hub, column-sequence, and loop diagrams
    ├── AnswerlatticeProofBlocks.tsx    # Reusable before/after, status snapshot, and decision proof blocks
    ├── PageProofStrip.tsx         # Reusable compact proof strip for non-home page hero/value sections
    ├── SectionHeader.tsx          # Shared centered eyebrow, heading, and subheading treatment for section intros
    ├── AnswerlatticeLink.tsx           # Dev/production-aware Link wrapper
    ├── AnswerlatticeAnalytics.tsx      # Optional GA/measurement event tracker, no Firestore writes
    ├── AnswerlatticeResourceAnalytics.tsx # Resource/referrer analytics tracker, no Firestore writes
    ├── AnswerlatticeScrollReveal.tsx   # Layout-level reveal observer for public sections, cards, CTA controls, and footer groups
    ├── HeroSection.tsx            # Page-aware support-answer hero with inline sample workspace preview
    ├── HomeProofBandSection.tsx   # Homepage conversion proof band for core buyer claims
    ├── SupportKnowledgeMapSection.tsx # Visual source map for support inputs, the AnswerLattice answer layer, and output surfaces
    ├── HomePageAwareDemoSection.tsx # Embedded generic-vs-AnswerLattice demo
    ├── ClosedLoopSection.tsx      # Page question to reviewed support-fix loop diagram
    ├── BestFitSection.tsx         # Buyer qualification tiles for live, beta, and near-launch products
    ├── ProductPreviewSection.tsx  # Desktop sticky product-proof walkthrough with mobile tabbed dashboard/widget/governance fallback
    ├── ProductAreasSection.tsx    # Homepage product-suite cross-link section
    ├── SetupFunnelSection.tsx     # 10-minute setup visual sequence
    ├── DayOneLaunchPackSection.tsx # Homepage/Product day-one launch pack links for quickstarts, starter surfaces, imports, verifier, proof, ROI, and security handoff
    ├── WidgetSection.tsx          # Homepage widget install, page-aware support scene, and status snapshots
    ├── HomeTrustSection.tsx       # Homepage trust/security status snapshots
    ├── PillarsSection.tsx         # Homepage AnswerLattice engine pillar sequence diagram
    ├── SystemCoverageSection.tsx  # Homepage Launch/Support/Governance/Runtime hub diagram
    ├── HowItWorksSection.tsx      # Homepage 5-step animated sequence
    ├── ComparisonSection.tsx      # Homepage comparison table
    ├── PricingPreviewSection.tsx  # Compact homepage pricing checkpoint linking to full pricing details
    ├── ObjectionsSection.tsx      # Top buyer objections before final CTA
    ├── SeoLandingPage.tsx         # Shared static SEO landing page component
    ├── UseCaseLandingPage.tsx     # Shared wrapper for role-specific use-case pages
    ├── ProductCapabilityLandingPage.tsx # Shared template for product-area landing pages
    ├── ProductFeatureLandingPage.tsx # Shared template for KB/FAQ/changelog/ticket feature pages
    ├── StructuredData.tsx         # Homepage Organization/WebSite/SoftwareApplication/WebPage/Breadcrumb JSON-LD
    ├── PageStructuredData.tsx     # Per-route WebPage + BreadcrumbList JSON-LD from ANSWERLATTICE_PUBLIC_PAGES
    └── CTASection.tsx             # Homepage bottom CTA
```

Public content data lives outside the route tree:

```
src/content/answerlatticePublic/
├── index.ts        # Public exports
├── guardrails.ts   # Brand/domain decision and claim/schema/private-route guardrails
├── resources.ts    # Resource hub groups
├── articles.ts     # Resource article registry and related-article lookup
├── comparisons.ts  # Category comparison registry
├── developerDocs.ts # Developer-doc registry
└── types.ts        # Shared public-content types
```

Related AnswerLattice route constants live in `src/constants/answerlattice/routes.ts`. `src/constants/answerlattice/navigations.ts` re-exports those constants for existing dashboard imports while keeping icon-heavy sidebar metadata out of lightweight public client islands such as `/get-started`.

Public contact submissions use `src/app/api/answerlattice/public/contact/route.ts`. The route is Node-only, rate-limited as `ANSWERLATTICE_CONTACT_FORM`, validates with Zod, ignores honeypot submissions, hashes requester IPs, and writes accepted submissions to `DB_COLLECTIONS.ANSWERLATTICE_CONTACT_ENQUIRIES` in AnswerLattice Firebase.

## Self-Sellable Positioning Pass

The public website now follows `../self-sellable-product-strategy.md`:

- homepage leads with "SaaS and digital products" so the first viewport does not imply AnswerLattice only works for SaaS, while AI-built SaaS remains a targeted use-case path
- "vibe-coded SaaS" is treated as an SEO/campaign alias, not the main public buyer label
- homepage and product page expose the implemented AnswerLattice engine pillars: Product Ontology, Canonical Answer Engine, Drift Governance, and Signal Mutation
- homepage exposes the implemented system map: Launch Setup, Support Control, Knowledge Governance, and Runtime Layer
- homepage now leads with the page-aware support-answer value proposition, an inline sample workspace preview, and setup/demo/source-prep CTAs
- homepage adds `HomeProofBandSection.tsx` immediately after the hero so page-aware answers, approved knowledge, hosted help, feedback gaps, widget install, and source preparation are not missed before the deeper story
- homepage includes a restrained sticky product-proof walkthrough on desktop and tabbed product scene on mobile/tablet, showing activation, product surfaces, widget install, feedback review, and governance queue states
- public website pages now include use cases, widget install, resources, and updates so the site matches the buying-page shape expected from support tooling without adding unsupported API or adapter claims
- `/integrations` now explains the supported Slack/email workflow notification path, including test delivery and compact delivery health, while keeping broader adapters controlled rollout
- header links include `/demo`
- `/demo` is static and account-free; it does not call Firebase or an AI provider
- pricing exposes Starter, Growth, and Studio INR packaging
- `/security` uses a trust-page shape of facts, controls, and disclosure while keeping AnswerLattice-specific claims around widget context, tenant-scoped rules, owner-approved answers, rate-limited runtime endpoints, compact summaries, and separate product infrastructure
- `/faq` answers founder objections and includes FAQ structured data
- `/product`, `/get-started`, `/about`, and `/contact` no longer use enterprise/design-partner-first copy
- `/contact` now uses an AnswerLattice-owned inquiry form plus direct email, partnership, and security paths. It does not reuse another product's public enquiry storage.
- footer links only target public website routes; public legal links now resolve to real pages
- AnswerLattice product domains serve AnswerLattice-owned `/sitemap.xml` and `/robots.txt`
- homepage emits Organization, WebSite, and SoftwareApplication structured data
- AnswerLattice website layout sets AnswerLattice metadata, manifest, icons, and the Verdigris Answer Layer theme color so public pages do not inherit root app title metadata
- `theme.ts` is the public website theme contract. It keeps the verdigris primary, deep navy background, surface/border tokens, text colors, and success/warning/danger colors in one source for metadata-adjacent and inline-style usage.
- copy differentiates AnswerLattice from helpdesks, chatbots, and documentation CMS products without claiming to replace them
- May 22 refresh changed the hero from page-aware support copy to the implemented governed answer infrastructure category.
- Website copy now includes hosted help domains, FAQ management/article-backed FAQ generation, product-scoped AnswerLattice billing/support credits, source-version cache freshness, and separate Firebase/product boundaries.
- Custom help domains are now buyer-facing website content because they make AnswerLattice feel native to the client's product instead of a third-party bolt-on.
- Ticket debugging context is now presented as capped, sanitized support context in product, security, FAQ, and privacy copy; public copy avoids raw "console log" wording except where implementation docs need it.
- `/pricing` now explains that public setup starts on beta while paid plan changes and support-credit top-ups happen from AnswerLattice Billing using product-scoped Razorpay requests.
- `/install`, `/security`, `/faq`, `/resources`, `/updates`, privacy, and terms now account for hosted help and current support-surface scope.
- `/resources` now has a typed article layer for launch setup, pre-onboarding, safe context, widget verification, approved answers before fallback, Support Board, feedback review, pricing/support credits, hosted help, and runtime safety. Article routes are explicit wrappers backed by `ANSWERLATTICE_RESOURCE_ARTICLES`, not ad hoc page code.
- May 31 shared-conversation pass changed the homepage hero to "Launch your SaaS with support already built.", made support setup the primary CTA, and clarified that AnswerLattice prepares docs, FAQs, answer drafts, hosted help, and page-aware widget support while tickets, changelogs, feedback, ratings, and feature requests remain owner-managed.
- June 1 fresh-product conversion pass changed the homepage hero to "Give every SaaS page the right support answer.", added a sample workspace preview to the hero, added the conversion proof band, moved product proof and page-aware demo above setup-heavy sections, and moved Pre-Onboarding lower as a source-preparation accelerator.
- June 2 positioning pass changed the top-level hero/title/footer/product-page language to "Page-aware support answers for SaaS and digital products" so AnswerLattice can sell beyond SaaS without weakening the SaaS-focused use-case pages.
- June 1 full-site conversion pass added `PageProofStrip.tsx` and applied compact proof strips/clearer CTAs to product overview, product-area pages, product-feature template, SEO/use-case template, setup, pricing, resources, proof, security, install, FAQ, contact, pre-onboarding, updates, privacy, and terms pages. It also grouped the FAQ into scannable sections, replaced exact fake-looking mockup metrics with status-style placeholder states, and tightened shared mobile heading wrapping for non-home page readability.
- June 1 final copy/CSS pass corrected rendered wording across all public AnswerLattice routes, replaced plus-sign product labels with plain-language labels where they appear as buyer-facing copy, changed ambiguous page terminology to "product pages", and moved scoped AnswerLattice CSS imports to the root app layout so clean-cache renders keep Tailwind utilities and dark theme styling.
- May 31 feedback website pass added `/product/feedback-review`, registered it through `ANSWERLATTICE_SUPPORT_FEATURES`, exposed it in header/footer/resources/product grids through shared feature data, and added a homepage/Product preview tab for ratings, feature requests, suggestions, Support Board handoff, and answer-governance boundaries.
- May 24 AI-built SaaS pass changed the homepage hero to "You shipped the app. Now users need correct answers.", moved the page-aware demo directly after the hero, and teaches approved answers before advanced AnswerLattice vocabulary.
- May 24 AI-built SaaS pass added `/use-cases/ai-built-saas` and `/use-cases/vibe-coded-saas` as a canonicalized alias for campaign/search traffic.
- May 22 conversion pass changed the homepage hero to outcome-first buyer language while keeping "governed answer infrastructure" as secondary category language.
- Homepage now embeds the static demo directly in the buying path and shows generic answer vs AnswerLattice answer for each demo surface.
- Homepage adds best-fit/not-fit qualification, 10-minute setup sequence, security-at-a-glance controls, a compact pricing checkpoint, and top buyer objections.
- `/pricing` now defines support credits in plain language and gives plan-fit guidance for Starter, Growth, and Studio.
- `/install` now includes developer handoff examples and a runtime verification mock so technical founders can see the implementation path.
- `/install` is now the AnswerLattice Agent Install Layer: the public site exposes copyable AI-agent instructions, framework pages, Markdown mirrors, public agent files, and the frozen v1 widget contract from one generator.
- `/use-cases` now includes concrete sample questions, generic answers, and AnswerLattice answers for each scenario.
- Three static SEO landing pages were added: `/page-aware-support-widget`, `/hosted-help-center-for-saas`, and `/support-widget-for-solo-founders`.
- Optional conversion tracking uses GA/measurement events only when a public measurement ID exists; it does not call Firestore or AnswerLattice APIs.
- The homepage now borrows the modern product-scene pattern from high-performing SaaS sites: the first proof after the hero is a restrained desktop sticky walkthrough plus mobile tabbed preview rather than another text grid or decorative parallax effect.
- The product scene is implemented as responsive HTML/CSS instead of a static raster screenshot so it does not expose private workspace data, does not become stale after dashboard UI changes, and keeps public browsing at zero Firebase cost.
- The `/product` page reuses the same product scene before the architecture deep dive so buyers see the working owner flow before reading implementation concepts.
- May 23 agent-context pass added product-domain `llms.txt` and `llms-full.txt` routes so agents reading `answerlattice.com` get AnswerLattice-specific product context, route links, non-goals, mutation boundaries, and structured-data guidance instead of falling back to generic platform context.
- May 22 positioning pass made the demo the hero primary CTA and reframed the homepage around page-aware support truth rather than generic AI support.
- May 22 founder-relief pass changed the hero to "You build revenue. AnswerLattice keeps support accurate." while keeping the product promise scoped to approved page-aware answers, fallback signals, and human-reviewed knowledge updates.
- May 22 presentation pass replaced the dense demo layout with a tabbed product-surface row and large browser-style product canvas, moved product proof closer to modern SaaS screenshot sections, and rebuilt the widget section as a bento grid without adding runtime data calls.
- May 22 product-area pass added landing-style pages for Launch Setup, Page-Aware Widget, Support Control, and Knowledge Governance so each major capability can be evaluated independently while reusing static, zero-Firebase-cost product proof components.
- May 22 final polish pass made those product areas first-class in the header Product dropdown, homepage product-area section, resources hub, and SEO/use-case cross-link blocks so visitors can evaluate AnswerLattice like a product suite instead of a single long page.
- May 23 product-feature pass added standalone `/product/knowledge-base`, `/product/faq-management`, `/product/changelog`, and `/product/tickets` pages using a reusable outcome-hero, visual proof grid, workflow, connected-surfaces, FAQ, and CTA pattern inspired by modern feature-specific SaaS pages.
- May 24 workflow notification/proactive help pass added standalone `/product/workflow-notifications` and `/product/proactive-help` pages, converted `/integrations` from an install redirect to a real Slack/email notification page, and updated sitemap/LLM context/resources/FAQ so public claims match the hardened runtime.
- May 26 Team Access pass added standalone `/product/team-access`, then updated Product, Launch Setup, Pricing, Security, Security One-Pager, Get Started, FAQ, Privacy, Resources, Updates, sitemap metadata, and LLM context to include AnswerLattice roles, owner reset, force sign-out, and workspace-scoped access.
- May 26 FAQ/custom-answer pass kept the existing `/product/faq-management` page as the canonical buyer surface, then updated homepage support map, page-aware demo, widget section, Product, Support Control, FAQ, SEO pages, sitemap metadata, LLM context, and Updates to explain the implemented retrieval path: canonical answer first, published owner FAQ/custom answer next, fallback only when coverage is missing.
- May 27 Support Board pass added standalone `/product/support-board`, then updated Support Control, FAQ, Resources, Updates, sitemap metadata, LLM context, and route docs to explain private owner/staff support cards, internal notes, status history, selected follow-up, and answer-proposal handoff while keeping ticket/signal sync and nightly board preparation marked as controlled rollout instead of default website claims.
- May 27 contact/mobile pass added a full `/contact` inquiry form backed by an AnswerLattice-only public API route and regrouped the mobile hamburger into Product Areas, Product Features, and Other cards with safe-area bottom padding.
- May 27 drawer pass converted the public hamburger from an inline mobile panel to a right-side drawer with backdrop, Escape close, body scroll lock, and link-close behavior.
- May 27 drawer-icon pass added Lucide route icons to every mobile drawer row and the setup CTA while preserving the same Product Areas, Product Features, and Other grouping.
- May 28 product-menu label pass widened the desktop Product dropdown feature column and made feature labels single-line so Knowledge Base, FAQ Management, Workflow Notifications, and similar headings do not wrap.
- May 28 section-header pass added `SectionHeader.tsx` and applied the same centered eyebrow, heading, and subheading treatment across homepage sections, Product sections, Integrations, Pricing, Quickstarts, Security, and shared product/SEO page templates.
- May 25 runtime-scaling pass updated the existing homepage, `/product`, `/security`, `/resources`, `/updates`, FAQ, and LLM context to explain compiled approved context, bundle readiness, workspace-local daily governance, and cache-first runtime delivery without adding a standalone MCP page or promising public agent write access.
- May 25 day-one launch-pack pass added `DayOneLaunchPackSection.tsx` to the homepage and `/product`, then linked the existing `/quickstarts`, `/product/launch-setup`, `/product/knowledge-base`, `/install`, `/roi-calculator`, `/proof`, and `/security-one-pager` resources from the main buyer path instead of creating another public route.
- May 25 widget image-support pass updated existing buyer paths instead of adding a standalone screenshot page: homepage widget proof, `/product/page-aware-widget`, `/install`, `/quickstarts`, `/security`, `/security-one-pager`, FAQ, widget SEO pages, route metadata, LLM context, and updates now describe user-initiated screenshot upload/paste and reject automatic host-app screen capture or DOM scraping.
- May 23 product-feature theme pass removed the light proof band from those feature pages, aligned the shared feature template with AnswerLattice's dark surface, verdigris, and cyan theme, and set the AnswerLattice route stylesheet background so white body bleed does not appear around dark pages.
- May 23 product-feature route hardening replaced the dynamic `[feature]` route with four explicit product-feature page files backed by `ProductFeatureRoutePage`, avoiding fragile Next dev static-path worker failures while keeping shared feature data and sitemap registry coverage.
- May 23 dark-theme consistency pass removed remaining light-mode product mockups from the account-free demo, product capability landing template, and homepage widget section so newly added public pages stay visually consistent with AnswerLattice's dark infrastructure theme.
- May 23 resources layout pass changed grouped resources from four tall category columns to stacked horizontal decision rows so each group title and its three linked subcards read together on desktop while remaining stacked on mobile.
- May 23 resources polish removed the outer row cards from the decision-path rows so the resources hub reads as clean rows of links instead of nested boxes.
- May 23 product capability bento pass changed five-card capability sections to a 2-card first row and 3-card second row, improving visual balance and moving the third card, such as Support Control's Changelog support, into the second row.
- May 23 viewport motion pass added an AnswerLattice-specific layout-level reveal observer that applies restrained appearance effects to sections, semantic article cards, rounded grid/link cards, CTA controls, and footer groups across public pages without adding a dependency or mixing unrelated website classes.
- May 23 support knowledge map pass added `SupportKnowledgeMapSection.tsx` to the homepage and `/product` page. It is a static visual explanation of docs/FAQs, releases/product pages, tickets/feedback, and page context flowing into AnswerLattice, then out to the page-aware widget, hosted help, approved answers, and governance queue. The map intentionally avoids helpdesk-replacement and autopilot claims.
- May 24 support map visual polish kept the shared homepage and `/product` section, removed center explanatory copy from the diagram core, and refined the diagram with an AnswerLattice-colored logo-only center, smooth ripple rings, dotted SVG paths, homepage-style pulse strokes, and border-only output arrival highlights with reduced-motion fallback.
- May 24 flow-diagram pass added `AnswerlatticeFlowDiagram.tsx` as a reusable static-rendered visual system for AnswerLattice hub, column-sequence, and loop diagrams. It preserves the same AnswerLattice logo-only core, ripple rings, dotted SVG paths, homepage-style pulse strokes, mobile path variants, and border-only output highlights, then applies that system to closed-loop, setup, how-it-works, product-area workflow, product-feature workflow/connected surfaces, SEO/use-case, install, security, resources, engine pillar, and system coverage sections.
- May 24 final diagram polish aligned the reusable sequence diagram path endpoints and output highlight timing with the shared source-map reference, while leaving the existing AnswerLattice logo, ripple, and color treatment intact.
- May 24 loop-diagram timing polish made the closed-loop ring pulse start at step 01 and staggered all six card border highlights in the same cycle, so the loop reads as one synchronized motion instead of independent flashes.
- May 24 loop pacing polish slowed the closed-loop ring/card animation from the shared 5.6-second pulse cycle to an 8.4-second loop-specific cycle, with card-highlight delays scaled to keep the sequence synchronized.
- May 24 sequence layout polish converted reusable sequence diagrams from horizontal card strips into the shared input column, logo center, and output column pattern so setup, install, resources, product-area, product-feature, SEO/use-case, engine, and how-it-works diagrams use one visual grammar.
- May 24 proof-block pass added `AnswerlatticeProofBlocks.tsx` for non-diagram visual proof: decision tiles, before/after answer strips, and status snapshots. It is used to make fit qualification, widget states, homepage trust controls, `/use-cases`, and `/security` easier to scan without adding screenshots, Firebase reads, or unsupported product claims.
- `ClosedLoopSection.tsx` now explains the loop in first-visit language: user asks from a product page, AnswerLattice checks approved answers, fallback opens only when coverage is missing, repeated misses become review items, the owner approves the fix, and future users receive the correct answer.
- Comparison now explicitly separates AI chatbot, helpdesk, knowledge base, and AnswerLattice so buyers do not misclassify AnswerLattice as a helpdesk replacement.
- FAQ now defines "not a chatbot", canonical answers, missing-answer behavior, and human approval before authoritative answers.
- Role-specific use-case pages were added for founders, support teams, product teams, and engineering using static content only.
- May 23 agent-readable SEO/AEO hardening added page-level WebPage and BreadcrumbList JSON-LD for every public AnswerLattice route in `ANSWERLATTICE_PUBLIC_PAGES`, switched homepage/FAQ JSON-LD to the shared server-rendered `JsonLdScript`, added `hasPart` route references to the WebSite graph, and made `robots.txt` explicitly enumerate the shared AI/search crawler allowlist. `npm run verify:agent-readiness` now checks AnswerLattice route registry, structured-data wrappers, robots, sitemap, and LLM context coverage.

---

## Routing Architecture

### Multi-Product Domain Registry

**File:** `src/constants/productDomains.ts`

All product domains are registered here. The middleware reads the hostname and rewrites to the correct internal route.

```
answerlattice.com/*  →  middleware  →  /sites/answerlattice/*        (production)
ecomsai.com/*   →  middleware  →  /sites/answerlattice/*        (Vercel Preview / QA)
localhost/__answerlattice/*  →  middleware  →  /sites/answerlattice/*  (dev only)
```

### Middleware Flow

**File:** `src/middleware.ts`

Priority order:
1. Active product website domains (QA ecomsai.com / production answerlattice.com → /sites/answerlattice)
2. Dev path prefixes (/__answerlattice → /sites/answerlattice) — local dev only
3. Client tenant domains (*.client-domain.example → /_client)
4. Platform domain (platform.example → (website) route group)

### Domain Resolver

**File:** `src/lib/multiTenant/domainResolver.ts`

Added `'product'` domain type. Detects product websites before platform/client detection. Returns `ProductDomainConfig` for middleware to use.

### URL Constants

**File:** `src/constants/urls.ts`

`PLATFORM_DOMAINS` array now includes all product domains via `ALL_PRODUCT_DOMAINS` spread. This prevents product domains from being treated as client tenant subdomains.

---

## basePath Pattern (Dev/Production Link Resolution)

### Problem
In production (`answerlattice.com`), internal links like `/pricing` work naturally.
In dev mode (`localhost:3000/__answerlattice`), unprefixed links such as `/pricing` navigate to the root app's pricing page.

### Solution
Each page reads the `x-product-id` header (set by middleware) and `host` header to determine if dev mode:

```typescript
function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}
```

`basePath` is passed as a prop to components that contain links (Header, Footer, HeroSection, CTASection).

### AnswerlatticeLink Component

```typescript
// Wraps next/link with basePath prefix
export default function AnswerlatticeLink({ href, basePath = '', children, ...props }) {
    const resolvedHref = href.startsWith('/') ? `${basePath}${href}` : href;
    return <Link href={resolvedHref} {...props}>{children}</Link>;
}
```

---

## Component Architecture

### Server Components (default)
- `layout.tsx` — Root layout with metadata
- `page.tsx` — Homepage
- `product/page.tsx` — Product page
- `use-cases/page.tsx` — Use-case page
- `install/page.tsx` — Widget install and page context page
- `integrations/page.tsx` — Slack/email workflow notification page
- `resources/page.tsx` — Resources hub
- `updates/page.tsx` — Public website update log
- `pricing/page.tsx` — Pricing page
- `security/page.tsx` — Security page
- `faq/page.tsx` — FAQ page
- `about/page.tsx` — About page
- `contact/page.tsx` — Contact page
- `get-started/page.tsx` — Get Started page
- `privacy-policy/page.tsx` — Privacy policy page
- `terms-of-service/page.tsx` — Terms of service page
- `Footer.tsx` — Footer (no state needed)
- `HeroSection.tsx`, `ProductPreviewSection.tsx`, `WidgetSection.tsx`, `PillarsSection.tsx`, `SystemCoverageSection.tsx`, `HowItWorksSection.tsx`, `ComparisonSection.tsx`, `CTASection.tsx`

### Client Components (`'use client'`)
- `demo/AnswerlatticePublicDemo.tsx` — Account-free demo state
- `contact/ContactForm.tsx` — Contact form state, submission handling, success/error states, and privacy/terms links
- `get-started/OnboardingForm.tsx` — Self-service onboarding form state, signed-in account switching, and existing-workspace dashboard handoff
- `components/AnswerlatticeAnalytics.tsx` — Optional GA script plus delegated click tracking for `data-answerlattice-event` elements
- `components/AnswerlatticeScrollReveal.tsx` — Lightweight IntersectionObserver client island for viewport reveal motion across public website pages

### Native Interaction
- `Header.tsx` — Desktop Product dropdown stays CSS-driven. Mobile navigation is a small client drawer that opens from the right, locks body scroll, closes on backdrop/Escape/link click, groups Product Areas, Product Features, and Other into separate cards, includes route icons for every drawer item, and includes safe-area bottom padding. The drawer uses separate mounted and visible states so it paints off-screen before opening and stays mounted long enough to animate closed.

---

## Production Deployment

### Prerequisites
1. Add `answerlattice.com` domain to Vercel project dashboard
2. Configure DNS for answerlattice.com pointing to Vercel
3. Keep `public/answerlattice-og-image.png`, `public/answerlattice.webmanifest`, `public/answerlattice-logo.svg`, `public/answerlattice-logo-mark-wide.png`, `public/answerlattice-favicon.*`, and AnswerLattice icon PNGs available for OpenGraph, app metadata, splash generation, dashboard branding, and favicon previews. `public/answerlattice-logo.svg` is the design-final canonical source and must not be redrawn, recolored, reshaped, or simplified; the exported black canvas/frame is removed so the SVG behaves like a transparent mark. Splash, OpenGraph, and loader surfaces own their backgrounds separately. Header, footer, diagrams, dashboard navigation, server loaders, and global loaders use the shared `AnswerlatticeLogoMark` inline SVG-path atom so UI renders the exact canonical geometry/colors while loader classes only animate the path strokes.

### Security
- `/sites/*` direct access blocked in production (middleware redirects to `/`)
- Only accessible via hostname-based rewrite
- All OWASP security headers applied via `applySecurityHeaders()`

### Caching
- Static pages: Vercel automatic static optimization
- No Firestore reads, no API calls, zero Firebase cost

---

## Firebase Cost

**$0.00/month for normal browsing** — The website pages are static. No database reads, no Cloud Functions, and no API calls unless a visitor explicitly submits a form.

The public demo is static interaction state only. Security, FAQ, privacy, and terms pages are static content. The self-service onboarding form and contact form are the only public website surfaces that call AnswerLattice APIs, and both run only after explicit user submission.

The contact form adds one AnswerLattice Firestore write per accepted submission to `answerlattice_contactEnquiries`. It performs IP-based public rate limiting and honeypot handling before the Firestore write path.

Existing AnswerLattice workspace detection on `/get-started` uses the already-loaded NextAuth session/product account. It does not add a Firestore read to normal page rendering; owners with a valid AnswerLattice scope get Activation/Billing links plus a switch-account action.

Use-cases, install, resources, updates, and the homepage product/widget preview sections are static server-rendered website content. They do not read Firestore and do not call AnswerLattice APIs.

Conversion analytics is client-side only:

- `AnswerlatticeAnalytics.tsx` loads Google Analytics only when `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MEASUREMENT_ID` or `NEXT_PUBLIC_GA_MEASUREMENT_ID` exists.
- CTA/demo/pricing/onboarding events are emitted through `window.gtag`.
- No event is written to Firestore, no API route is called, and no AnswerLattice Firebase cost is introduced by normal tracking.
- `src/config/csp-allowlist.ts` allows Google Analytics connect destinations so the optional script can report when enabled.

---

## Adding a New Page

1. Create `src/app/sites/answerlattice/[page-name]/page.tsx`
2. Import `headers` from `next/headers`, `AnswerlatticeHeader`, `AnswerlatticeFooter`
3. Add `getBasePath()` function (copy from any existing page)
4. Add page to `NAV_LINKS` in `Header.tsx` if it should appear in navigation
5. Add to `FOOTER_LINKS` in `Footer.tsx` if needed
6. Add the route to `ANSWERLATTICE_PUBLIC_PAGES` in `siteConfig.ts` so AnswerLattice sitemap output stays complete
7. Avoid public website route names reserved by AnswerLattice dashboard rewrites, including `/docs`, `/help`, `/changelog`, and `/release-notes`
8. For SEO landing pages, reuse `SeoLandingPage.tsx` unless the page needs materially different layout or behavior
9. Prefer optional client-side analytics markers (`data-answerlattice-event`) over Firestore-backed tracking on public website pages
10. For install content, update `src/lib/answerlattice/installContract/` first so public pages, Markdown mirrors, llms context, dashboard packets, and downloadable agent files do not drift.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-06-02 | 1.2.61 | Added the AnswerLattice public content module, ten resource article routes, shared article renderer, Article/FAQ/ItemList structured data, resource analytics, sitemap/LLM wiring, and verifier coverage |
| 2026-03-07 | 1.0.0 | Initial implementation |
| 2026-05-21 | 1.1.0 | Self-sellable website pass, demo, pricing update, founder-friendly product funnel, security/FAQ/legal pages, sitemap/robots, manifest/icons, and structured data |
| 2026-05-21 | 1.1.1 | Restored implemented AnswerLattice engine pillars on homepage and product page without claiming deferred API/integration pillar |
| 2026-05-21 | 1.1.2 | Added homepage system coverage section from codebase inventory: Launch Setup, Support Control, Knowledge Governance, and Runtime Layer |
| 2026-05-21 | 1.1.3 | Added static product preview and public use-cases, integrations, resources, and updates pages; updated nav, footer, sitemap registry, and docs |
| 2026-05-21 | 1.1.4 | Added widget-first `/install`, made `/integrations` a redirect alias, and removed rollout-only API/adapters from buyer-facing website claims |
| 2026-05-21 | 1.1.5 | Expanded `/security` with a trust-page structure adapted to AnswerLattice's implemented widget runtime, tenant isolation, governed answers, rate limits, summaries, and product separation |
| 2026-05-22 | 1.1.6 | Refreshed website to match current AnswerLattice implementation: governed answer infrastructure hero, hosted help, FAQ generation/management, product-scoped billing/support credits, cache freshness, and separate Firebase/product boundaries |
| 2026-05-22 | 1.1.7 | Added buyer-facing custom help domain positioning and safe ticket debugging context across homepage, product, install, security, FAQ, privacy, and updates copy |
| 2026-05-22 | 1.1.8 | Applied self-sell website feedback: outcome-led hero, homepage demo, buyer qualification, setup funnel, trust strip, pricing credit clarity, objection handling, optional no-Firestore conversion events, and three SEO landing pages |
| 2026-05-22 | 1.1.9 | Added screenshot-led product proof after the hero and on `/product`: activation, product surfaces, widget support, and signal-to-knowledge queue are shown as responsive product scenes with no Firebase reads |
| 2026-05-22 | 1.2.0 | Applied positioning review: demo-first hero, page-aware support truth copy, closed-loop support truth visual, sharper chatbot/helpdesk/KB comparison, category-defining FAQ entries, and four static role-specific use-case pages |
| 2026-05-22 | 1.2.1 | Applied founder-relief copy safely: homepage now leads with support accuracy and revenue focus without promising helpdesk replacement, outsourcing, or AI autopilot behavior |
| 2026-05-22 | 1.2.2 | Improved visual presentation: tabbed demo canvas, clearer product-proof tabs, and bento-style widget/install/governance grid while keeping the website static and zero-Firebase-cost for normal browsing |
| 2026-05-22 | 1.2.3 | Added standalone landing-style product area routes for Launch Setup, Page-Aware Widget, Support Control, and Knowledge Governance; wired them into product page cards, footer, sitemap registry, and docs |
| 2026-05-22 | 1.2.4 | Final product-suite polish: added first-class Product dropdown navigation, homepage product-area cross-link section, resources product-area hub, and SEO/use-case product-area cross-links with no new runtime dependencies or Firebase reads |
| 2026-05-23 | 1.2.5 | Added reusable product-feature landing pages for Knowledge Base, FAQ Management, Changelog, and Tickets; wired them into Product dropdown, homepage product-area section, product page, resources, footer, and sitemap registry |
| 2026-05-23 | 1.2.6 | Reworked `/resources` grouped links into row-wise decision paths: group summary on the left and same-row subcards on the right for clearer scanning |
| 2026-05-23 | 1.2.7 | Updated shared product capability bento sections so five-card layouts render as two wide cards on row one and three balanced cards on row two |
| 2026-05-23 | 1.2.8 | Removed the outer card treatment from `/resources` decision rows so the section keeps row structure without nested-box visual noise |
| 2026-05-23 | 1.2.9 | Replaced placeholder AnswerLattice `C` assets with an AnswerLattice-colored dimensional infinity logo family: SVG/PNG logo assets, favicon bundle, PWA icons, maskable icons, Apple touch icon, OpenGraph image, website header/footer, and dashboard sidebar |
| 2026-05-23 | 1.2.10 | Re-themed the shared product-feature page template so Knowledge Base, FAQ Management, Changelog, and Tickets no longer render a light-mode proof section, and set the AnswerLattice route background to prevent white body bleed |
| 2026-05-23 | 1.2.11 | Replaced the dynamic product-feature route with explicit Knowledge Base, FAQ Management, Changelog, and Tickets pages backed by a shared route wrapper to avoid Next dev static-path worker failures |
| 2026-05-23 | 1.2.12 | Removed remaining light-mode mockup panels from the public demo, product capability template, and homepage widget section so newly added AnswerLattice website pages match the dark visual system |
| 2026-05-23 | 1.2.13 | Replaced the simplified path-redrawn AnswerLattice website mark with the approved dimensional mark SVG wrapper in public header and footer branding while keeping raster assets for metadata, favicon, and dashboard compatibility |
| 2026-05-23 | 1.2.14 | Added signed-in account visibility and an account-switch logout action to the self-service get-started form; Google sign-in now prompts account selection so founders can change email before workspace creation |
| 2026-05-23 | 1.2.15 | Added an existing-workspace state to `/get-started`: signed-in users with a valid AnswerLattice product account now see Activation/Billing handoff actions instead of the workspace creation form, with no extra Firebase read; pure route constants were split from icon-heavy navigation metadata for public client-bundle discipline |
| 2026-05-23 | 1.2.16 | Added homepage-only section-band styling in `styles.css` so sections alternate through subtle dark shades with more vertical breathing space while keeping normal website browsing static and zero-Firebase-cost |
| 2026-05-23 | 1.2.17 | Added AnswerLattice-specific viewport reveal motion through `AnswerlatticeScrollReveal` and `scroll-reveal.css`, covering public page sections, semantic cards, rounded grid/link panels, CTA controls, and footer groups with reduced-motion support |
| 2026-05-23 | 1.2.18 | Added `SupportKnowledgeMapSection` on the homepage and Product page to make AnswerLattice's source-map model self-explanatory without positioning it as a chatbot, helpdesk replacement, docs CMS, or autopilot |
| 2026-05-23 | 1.2.19 | Added AnswerLattice-specific `llms.txt` and `llms-full.txt` routes so product-domain agents read AnswerLattice as governed answer infrastructure, not as generic platform context, a helpdesk replacement, or an AI autopilot |
| 2026-05-23 | 1.2.20 | Added server-rendered WebPage/BreadcrumbList JSON-LD coverage across public AnswerLattice routes, switched JSON-LD injection to the shared server helper, added WebSite route references, and verified robots/sitemap/LLM coverage with `verify:agent-readiness` |
| 2026-05-24 | 1.2.21 | Applied AI-built SaaS founder positioning: homepage hero now starts from the post-launch support problem, demo is the first proof, product/use-case/install/pricing/security/FAQ copy uses simpler buyer language before AnswerLattice vocabulary, and `/use-cases/ai-built-saas` plus the `/use-cases/vibe-coded-saas` canonical alias were added without Firebase reads or new dependencies |
| 2026-05-24 | 1.2.22 | Updated the shared support knowledge map diagram on homepage and Product with an AnswerLattice-colored logo core, ripple rings, dotted SVG routes, homepage-style pulse strokes, and border-only output arrival highlights |
| 2026-05-24 | 1.2.23 | Added the reusable AnswerLattice flow-diagram system and applied it across homepage workflow sections, product-area pages, product-feature pages, SEO/use-case pages, install, security, resources, engine pillars, and system coverage while keeping normal browsing static and zero-Firebase-cost |
| 2026-05-24 | 1.2.24 | Added reusable proof blocks for decision tiles, before/after examples, and status snapshots; applied them to homepage fit qualification, widget states, trust controls, `/use-cases`, and `/security` to reduce text-heavy reading while preserving static zero-Firebase-cost browsing |
| 2026-05-24 | 1.2.25 | Aligned reusable AnswerLattice sequence-diagram endpoints and output-highlight timing with the shared source-map reference while keeping the AnswerLattice logo, ripple, and color treatment unchanged |
| 2026-05-24 | 1.2.26 | Synchronized the closed-loop diagram ring pulse and six card border highlights so the ring starts at step 01 and the cards flash in order within the same cycle |
| 2026-05-24 | 1.2.27 | Converted reusable sequence diagrams from horizontal strips into the shared input column, logo center, and output column layout used by the source-map diagrams |
| 2026-05-24 | 1.2.28 | Slowed the closed-loop ring and card-highlight animation to an 8.4-second loop-specific cycle while keeping the highlights synchronized with the ring pulse |
| 2026-05-24 | 1.2.29 | Added public Workflow Notifications and Proactive Help product-feature pages, converted `/integrations` from install alias to Slack/email notification page, and updated route registry, resources, FAQ, updates, LLM context, and docs for the hardened runtime scope |
| 2026-05-25 | 1.2.30 | Added website runtime-scaling copy across existing high-intent pages: compiled approved context, owner-visible bundle readiness, workspace-local daily governance, cache-first runtime delivery, and rollout-gated MCP boundaries without adding a dedicated public MCP page |
| 2026-05-25 | 1.2.31 | Added `DayOneLaunchPackSection` to homepage and Product, updated Resources/Pricing/Get Started/Security/LLM context, and kept the completed quickstarts, starter surfaces, import pack, install verifier, ROI/proof, and security one-pager as linked existing pages rather than new routes |
| 2026-05-25 | 1.2.32 | Refreshed existing public pages for production-ready widget image support: user-initiated screenshot upload/paste is now described on widget, install, quickstart, security, FAQ, SEO, updates, route metadata, and LLM surfaces, while automatic screenshot capture remains explicitly out of scope |
| 2026-05-26 | 1.2.33 | Formalized the initial dark website theme contract in `theme.ts`, aligned CSS variables and PWA manifest colors to the deep-navy palette, and moved inline-style primary/status colors onto shared AnswerLattice theme tokens |
| 2026-05-27 | 1.2.34 | Replaced the public website's indigo primary with the Verdigris Answer Layer palette: deep teal controls, teal signal accents, refreshed AnswerLattice logo/SVG social colors, and matching docs |
| 2026-05-27 | 1.2.35 | Removed client-specific public relationship framing from AnswerLattice website pages, route docs, and agent context so AnswerLattice presents as an independent governed answer infrastructure |
| 2026-05-27 | 1.2.36 | Added an AnswerLattice-only contact inquiry API and client form, plus a mobile hamburger Other group card with safe-area bottom padding |
| 2026-05-27 | 1.2.37 | Added Support Board as a standalone public product-feature page and synchronized Support Control, FAQ, Resources, Updates, route metadata, LLM context, and docs with manual-first private workboard boundaries |
| 2026-05-27 | 1.2.38 | Added the AnswerLattice Agent Install Layer: generated install pages, Markdown mirrors, public agent files, dashboard AI packet actions, and the stable `/widget/v1/answerlattice-widget.js` contract URL |
| 2026-05-27 | 1.2.39 | Converted AnswerLattice public mobile navigation to a right-side drawer with backdrop, close handling, body scroll lock, and preserved grouped links |
| 2026-05-27 | 1.2.40 | Completed an end-to-end public-site audit and aligned install-route implementation docs with the live generated HTML install pages plus Markdown-only contract docs |
| 2026-05-27 | 1.2.41 | Fixed the mobile drawer animation lifecycle by separating mounted and visible state for right-to-left open and close transitions |
| 2026-05-27 | 1.2.42 | Added route icons to every AnswerLattice mobile drawer row and the setup CTA using the existing Lucide icon stack |
| 2026-05-28 | 1.2.43 | Adjusted the desktop Product dropdown feature column and single-line labels so product-feature headings do not wrap |
| 2026-05-28 | 1.2.44 | Added a shared centered section-header component across homepage, product, high-intent public pages, and SEO page templates so section intros use one visual treatment |
| 2026-05-31 | 1.2.45 | Updated the homepage hero, metadata, structured data title, final CTA, and product-area support-control copy to the corrected launch-ready support positioning from the shared AnswerLattice/Crisp conversation without claiming generated tickets or generated changelogs; follow-up pass restored the implemented feedback, ratings, and feature-request surface into public claims |
| 2026-06-01 | 1.2.46 | Replaced all AnswerLattice logo surfaces with the design-final SVG source, regenerated favicon/PWA/OpenGraph/splash derivatives from that source, and documented the no-redraw/no-recolor/no-reshape handling rule |
| 2026-06-01 | 1.2.47 | Regenerated AnswerLattice splash images so the startup surface owns the background and the logo source does not show a separate rectangular background on startup screens |
| 2026-06-01 | 1.2.48 | Added a dedicated AnswerLattice loader SVG atom that preserves the final logo paths, colors, and filters while matching the MenuList 3-second stroke-draw loading cycle across server and global loaders |
| 2026-06-01 | 1.2.49 | Removed the exported black canvas/frame from the canonical AnswerLattice SVG, loader SVG, transparent logo PNGs, favicons, PWA icons, OpenGraph image, and splash source mark while preserving the mark paths, gradients, filters, and stroke animation |
| 2026-06-01 | 1.2.50 | Refactored `AnswerlatticeLogoMark` to the MenuList-style inline SVG-path pattern, made the loader reuse that same canonical geometry/color source for animation, removed extra CSS blur/drop-shadow from AnswerLattice logo loader surfaces, removed persistent post-reveal compositing from website sections, and added verification that visible website diagrams stay vector-based |
| 2026-06-01 | 1.2.51 | Reworked the homepage implementation for conversion clarity: page-aware support-answer hero, inline sample workspace preview, new `HomeProofBandSection`, product proof/demo moved earlier, Pre-Onboarding repositioned as source preparation, metadata refreshed, and final asset-preparation doc added |
| 2026-06-01 | 1.2.52 | Extended the conversion pass across non-home pages with reusable `PageProofStrip`, clearer hero CTAs, grouped FAQ rendering, safer sample-state wording, and install/product/SEO template updates without adding Firebase reads, external calls, or new dependencies |
| 2026-06-01 | 1.2.53 | Completed rendered copy QA across all public AnswerLattice routes and root-loaded scoped AnswerLattice CSS from `src/app/layout.tsx` so clean-cache route loads no longer depend on a nested website CSS chunk |
| 2026-06-02 | 1.2.54 | Broadened top-level public positioning to SaaS and digital products across homepage hero, site metadata, Product, About, Contact, footer, and docs while preserving AI-built SaaS as a focused use-case route |
| 2026-06-02 | 1.2.55 | Removed repeated long rendered copy from the product-feature, SEO/use-case, and resources shared templates, then completed the top-level SaaS plus digital-product copy sweep for Resources, Pricing, ROI, FAQ, Proof, and homepage pricing/CTA surfaces |
| 2026-06-02 | 1.2.56 | Converted `ProductPreviewSection` into a desktop sticky product-proof walkthrough for setup, surfaces, widget, feedback, and governance while preserving the mobile/tablet tabbed preview and avoiding heavy parallax or new dependencies |
| 2026-06-02 | 1.2.57 | Tightened `PricingPreviewSection` into a compact homepage pricing checkpoint that gives price shape and sends detailed plan, credit, top-up, and fit decisions to `/pricing` |
| 2026-06-02 | 1.2.58 | Reframed `BestFitSection` so the homepage includes launch-ready founders with expected support questions instead of implying AnswerLattice requires existing support volume |
| 2026-06-02 | 1.2.59 | Completed a launch-readiness wording audit across homepage, Get Started, FAQ, About, Pricing, ROI, metadata, and AI-built SaaS use-case copy so beta and near-launch founders are not excluded by existing-volume-only phrasing |
| 2026-06-02 | 1.2.60 | Added the public brand/domain decision registry, claim guardrails, resource/comparison/developer content registries, comparison pages, developer docs, LLM/sitemap coverage, Canonica legacy public-host redirect, internal homepage rewrite wrapper, and public discovery verification checks while preserving the existing AnswerLattice runtime routes |

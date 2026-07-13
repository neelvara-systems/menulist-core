# AnswerLattice Website — Implementation

> **Version:** 1.3.2
> **Last Updated:** 2026-07-13
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

Production canonical URLs use `https://answerlattice.com`. `https://answerlattice.menulist.online` remains the Vercel Preview / QA host in deployment-domain routing and must not be promoted to production canonical copy without a deployment-target change. Legacy Canonica public hosts are redirected by middleware to the active AnswerLattice public target so crawlers do not see two public brands for the same product.

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

`SupportKnowledgeMapSection` keeps the source-map diagram but now labels the center hub as a reviewed support layer with three proof chips: approved first, fallback tracked, and review loop. This makes the "one governed support layer" contract visible inside the map without adding another product section or implying autopilot support.

Diagram centers use a single soft outer ripple around the logo mark and do not render a second static inner strip. Shared pulse keyframes travel to the visible route endpoint and fade there; cross diagrams launch all logo-origin pulses together so the center reads as one listening source.

Screen-like product scenes use raster website assets, not hand-drawn HTML/CSS dashboard mockups. The asset registry in `src/app/sites/answerlattice/answerlatticeWebsiteAssets.ts` points to stable PNG slots under `public/answerlattice-website-assets/dummy/`; the directory name is retained for compatibility, but the current files are production-ready generated sample workspace visuals. `AnswerlatticeAssetImage.tsx` preserves their intrinsic `1440 x 1200` aspect ratio while exposing `data-answerlattice-asset-slot` and `data-answerlattice-asset-role` for future visual QA. The maintained future visual inventory lives in `src/content/answerlatticePublic/visualAssets.ts`. The generator `scripts/website-assets/generate-answerlattice-website-dummy-assets.js` creates concrete AnswerLattice dashboard, widget, support, and governance scenes without new npm dependencies and keeps source SVGs plus the manifest in `packages/asset-factory/answerlattice-website-assets/dummy-sources/`.

Concept illustrations use `AnswerlatticeConceptIllustration.tsx`, a zero-dependency inline SVG component for abstract buyer concepts that should not be represented as fake dashboard screenshots. Current variants cover source-to-answer, governance loop, install verification, safe-context boundary, and category positioning. These panels are used on Product, Install, Security, and Comparisons pages to reduce explanatory text while preserving the AnswerLattice non-goals: no mascot art, no helpdesk replacement framing, no chatbot/autopilot claims, and no fake customer proof.

`src/app/sites/answerlattice/scroll-reveal.css` must not leave visible sections on a persistent `translate3d(0, 0, 0)` or `will-change` compositing layer. Pending reveal can use a temporary transform, but the visible state returns to `transform: none` and `will-change: auto` so inline SVG diagrams remain vector-painted and do not look rasterized when the browser zoom level changes.

`src/app/layout.tsx` imports `src/app/sites/answerlattice/styles.css` and `src/app/sites/answerlattice/scroll-reveal.css` from the root app layout. This keeps the AnswerLattice CSS in the root `app/layout.css` bundle and avoids clean-cache requests for a missing nested `app/sites/answerlattice/layout.css` chunk. AnswerLattice visual rules must remain scoped to `.answerlattice-site`, `.al-home-flow`, `.al-page-flow`, `html[data-answerlattice-theme]`, or explicit AnswerLattice selectors so root loading does not recolor MenuList or other product pages.

Prism-glass card hover uses `AnswerlatticeSpotlightCards.tsx` as a route-level pointer tracker for fine-pointer devices. The client island delegates `pointerover` and `pointermove`, writes `--al-card-pointer-x` / `--al-card-pointer-y` on matching AnswerLattice cards, and leaves touch/mobile cards on the centered CSS fallback. The hover glow must follow the pointer like the Neelvara cards without adding per-card state, changing section layouts, or altering AnswerLattice color tokens.

AnswerLattice public pages support Light/System/Dark mode through `AnswerlatticeThemeProvider.tsx` and `AnswerlatticeThemeSwitcher.tsx`. The provider stores the site-scoped preference in `answerlattice-theme`, resolves System through `prefers-color-scheme`, marks the wrapper with `data-al-theme`, mirrors the resolved mode onto `html[data-answerlattice-theme]`, and updates browser `theme-color` metadata. The route layout includes a pre-hydration bootstrap script so a saved preference applies before React mounts.

---

## File Structure

```
src/app/sites/answerlattice/
├── layout.tsx                     # Route layout (metadata, OG, viewport, theme bootstrap/provider, analytics/reveal client islands)
├── theme.ts                       # Verdigris Answer Layer dark/light theme contract, storage key, and browser theme colors
├── styles.css                     # Root-loaded Tailwind directives, scoped CSS variables, light/dark compatibility rules, and section rhythm
├── scroll-reveal.css              # Root-loaded AnswerLattice viewport reveal motion with reduced-motion support
├── page.tsx                       # Homepage (server component)
├── home/page.tsx                  # Legacy homepage alias wrapper; middleware routes public / and /home to page.tsx
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
├── use-cases/small-saas-teams/page.tsx # Small SaaS team use-case page
├── use-cases/studios-agencies/page.tsx # Studio and agency use-case page
├── use-cases/support-teams/page.tsx # Support team use-case page
├── use-cases/product-teams/page.tsx # Product team use-case page
├── use-cases/engineering/page.tsx # Engineering use-case page
├── page-aware-support-widget/page.tsx      # SEO page for page-aware widget search intent
├── hosted-help-center-for-saas/page.tsx    # SEO page for hosted help-center search intent
├── support-widget-for-solo-founders/page.tsx # SEO page for solo-founder support intent
├── demo/page.tsx                  # Interactive governance proof page
├── demo/AnswerlatticePublicDemo.tsx    # No sign-in required page-aware support demo
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
├── trust/page.tsx                 # Provider, retention, and claim-status facts
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
├── answerlatticeWebsiteAssets.ts  # Fixed-size website screen-asset registry for generated/final product-scene slots
├── enginePillars.ts               # Implemented AnswerLattice engine pillar copy
├── systemCoverage.ts              # Code-backed system coverage groups for homepage
└── components/
    ├── Header.tsx                 # Shared header with Product/Demo/Install/Use Cases/Resources/Pricing nav and right-side mobile drawer
    ├── Footer.tsx                 # Shared footer with public-route link columns, AI summary shortcut, and bottom theme switcher
    ├── AnswerlatticeThemeProvider.tsx # Light/System/Dark provider with AnswerLattice-scoped persistence and browser theme-color updates
    ├── AnswerlatticeThemeSwitcher.tsx # Shared icon segmented control for Light/System/Dark
    ├── AnswerlatticeAssetImage.tsx    # Shared raster screen-asset renderer that preserves intrinsic dimensions and exposes asset-slot metadata
    ├── AnswerlatticeConceptIllustration.tsx # Reusable inline SVG concept panels for safe context, install, source-to-answer, governance, and positioning boundaries
    ├── AnswerlatticeLogoMark.tsx       # Shared wrapper for the atom-level inline SVG-path logo
    ├── AnswerlatticeFlowDiagram.tsx    # Reusable animated hub, column-sequence, and loop diagrams
    ├── AnswerlatticeProofBlocks.tsx    # Reusable before/after, status snapshot, and decision proof blocks
    ├── PageProofStrip.tsx         # Reusable compact proof strip for non-home page hero/value sections
    ├── SectionHeader.tsx          # Shared centered eyebrow, heading, and subheading treatment for section intros
    ├── AnswerlatticeLink.tsx           # Dev/production-aware Link wrapper
    ├── AnswerlatticeAnalytics.tsx      # Optional GA/measurement event tracker, no Firestore writes
    ├── AnswerlatticeResourceAnalytics.tsx # Resource/referrer analytics tracker, no Firestore writes
    ├── AnswerlatticeScrollReveal.tsx   # Layout-level reveal observer for public sections, cards, CTA controls, and footer groups
    ├── AnswerlatticeSpotlightCards.tsx # Layout-level pointer tracker for Prism-glass card hover glows
    ├── HeroSection.tsx            # Page-aware support-answer hero with inline sample workspace preview
    ├── HomeProofBandSection.tsx   # Retained conversion proof band component; compressed homepage uses PageProofStrip inside the hero
    ├── SupportKnowledgeMapSection.tsx # Visual source map for support inputs, the AnswerLattice answer layer, and output surfaces
    ├── HomePageAwareDemoSection.tsx # Embedded generic-vs-AnswerLattice demo
    ├── ClosedLoopSection.tsx      # Page question to reviewed support-fix loop diagram
    ├── BestFitSection.tsx         # Buyer qualification tiles for live, beta, and near-launch products
    ├── ProductPreviewSection.tsx  # Tabbed product-proof preview with image-backed dashboard/widget/governance slots
    ├── ProductAreasSection.tsx    # Homepage product-suite cross-link section
    ├── SetupFunnelSection.tsx     # 10-minute setup visual sequence
    ├── DayOneLaunchPackSection.tsx # Homepage/Product day-one launch pack links for quickstarts, starter surfaces, imports, verifier, proof, ROI, and security handoff
    ├── WidgetSection.tsx          # Homepage widget install, page-aware support scene, and status snapshots
    ├── HomeTrustSection.tsx       # Homepage trust/security status snapshots
    ├── PillarsSection.tsx         # Homepage AnswerLattice engine pillar sequence diagram
    ├── SystemCoverageSection.tsx  # Homepage Launch/Support/Governance/Runtime hub diagram
    ├── HowItWorksSection.tsx      # Homepage 5-step animated sequence
    ├── ComparisonSection.tsx      # Product category comparison table
    ├── PricingPreviewSection.tsx  # Compact homepage pricing checkpoint linking to full pricing details
    ├── ObjectionsSection.tsx      # Top buyer objections before final CTA
    ├── SeoLandingPage.tsx         # Shared static SEO landing page component
    ├── UseCaseLandingPage.tsx     # Shared wrapper for role-specific use-case pages
    ├── ProductCapabilityLandingPage.tsx # Shared template for product-area landing pages with suite-fit framing
    ├── ProductFeatureLandingPage.tsx # Shared template for product feature pages with connected-suite framing
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
├── visualAssets.ts # Maintained visual-slot inventory and asset guardrails
└── types.ts        # Shared public-content types
```

Related AnswerLattice route constants live in `src/constants/answerlattice/routes.ts`. `src/constants/answerlattice/navigations.ts` re-exports those constants for existing dashboard imports while keeping icon-heavy sidebar metadata out of lightweight public client islands such as `/get-started`.

Public contact submissions use `src/app/api/answerlattice/public/contact/route.ts`. The route is Node-only, rate-limited as `ANSWERLATTICE_CONTACT_FORM`, caps JSON bodies at 8KB before Zod validation, ignores honeypot submissions, verifies `captchaToken` when `TURNSTILE_SECRET_KEY` is configured, hashes requester IPs, and writes accepted submissions to `DB_COLLECTIONS.ANSWERLATTICE_CONTACT_ENQUIRIES` in AnswerLattice Firebase. The client form renders Cloudflare Turnstile from `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; both env keys must be configured together. Public contact browser submissions use same-origin credentials, no-store cache, manual redirect handling, and an 8KB bounded JSON response parser before accepting `{ accepted: true }`. `/get-started` uses a 16KB bounded response parser, plan/currency billing validation, and resumable provisioning states before success. Public contact, `/get-started` onboarding, and the hosted widget use fixed failure copy in the browser and must not display API response text, provider text, or local exception messages.

Pricing renders INR and USD amounts from `src/data/answerlattice/plans.ts` and sends the selected plan in the Get Started URL. `get-started/page.tsx` admits only the three current plan IDs and INR/USD currency values before passing defaults into `OnboardingForm.tsx`. The form submits the selected monthly plan and currency to the existing paid onboarding route and confirms the server-returned billing amount/currency.

`demo/AnswerlatticePublicDemo.tsx` is a deterministic client-only state machine with six governance stages. It does not read Firebase or call an AI provider. Its outer grid, stage navigation, and content pane use explicit `min-w-0` boundaries so the desktop two-column layout collapses without min-content overflow on a 390px viewport. Stage and reset actions keep 44px minimum targets. `trust/page.tsx` is a server-rendered factual page sourced from current runtime/provider/retention contracts; it explicitly separates operational facts from certifications, DPA/subprocessor terms, residency commitments, and deletion claims. The page states that QA uses a separate project while the production target remains deployment/certification pending; it does not imply two currently certified live environments.

## Self-Sellable Positioning Pass

The public website now follows `../self-sellable-product-strategy.md`:

- homepage leads with "SaaS and digital products" so the first viewport does not imply AnswerLattice only works for SaaS, while AI-built SaaS remains a targeted use-case path
- "vibe-coded SaaS" is treated as an SEO/campaign alias, not the main public buyer label
- homepage and product page expose the implemented AnswerLattice engine pillars: Product Ontology, Canonical Answer Engine, Drift Governance, and Signal Mutation
- homepage exposes the implemented system map: Launch Setup, Support Control, Knowledge Governance, and Runtime Layer
- June 10 market-pattern pass moved the homepage from a long feature catalog toward a product-led support-suite story: support-suite cards, setup path, install quickstarts, positioning boundary, and category comparison entered the main conversion path without adding runtime reads or unsupported helpdesk claims.
- June 10 homepage compression pass reduced the rendered homepage from 18 sections to 11, shortened hero/suite/support-surface copy, preserved the sticky support-surface story and feature-wise product overview cards, and moved repeated setup/trust/comparison detail into Product, feature, resource, security, and comparison pages.
- June 29 switch-positioning pass added a compact category-switch strip inside the homepage Support Suite. It compares generic chatbots, helpdesks, static knowledge bases, and scattered support sources by where the official answer comes from, while full comparison detail stays on `/comparisons` and its child routes.
- June 18 first-fold sharpening pass changed the homepage hero eyebrow, subtitle, proof strip, suite intro, metadata description, reusable hero copy, and final CTA so the first screen states the doctrine-safe contract: approved answers first, fallback when coverage is missing, and reviewable support gaps for founder approval.
- June 10 product page and shared feature/capability templates now reconnect every narrower feature page back to the broader suite: setup, in-app support, hosted help, fallback, feedback, and owner-approved answers.
- June 10 competitive cross-check pass added shared evaluation strips to product-area and product-feature templates so each page answers setup path, security boundary, and category-fit questions before the final CTA.
- June 10 visual asset pass replaced generic dummy frames with 25 production-ready generated product-scene PNGs and matching internal SVG sources for homepage, Product, product-area, feature, widget, and demo slots while preserving stable filenames and dimensions.
- June 10 concept illustration pass added reusable inline SVG explainers for source-to-answer flow, governance loop, install verification, safe-context boundary, and category positioning on Product, Install, Security, and Comparisons without adding homepage length.
- homepage now leads with product-user support rather than SaaS-user-only wording, keeps the 24/7 claim in the eyebrow, and uses setup/demo CTAs plus capability chips
- homepage includes a support-surface story section in `page.tsx` that walks from owner inputs to in-app help, hosted help, fallback gaps, and the review loop using image-backed product assets and sticky desktop cards
- homepage folds compact proof into the hero through `PageProofStrip` so page-aware answers, approved knowledge, hosted help, fallback, feedback gaps, widget install, and source preparation are not missed before the deeper story
- public website pages now include use cases, widget install, resources, and updates so the site matches the buying-page shape expected from support tooling without adding unsupported API or adapter claims
- `/integrations` now explains the supported Slack/email workflow notification path, including test delivery and compact delivery health, while keeping broader adapters controlled rollout
- header links include `/demo` and `/install`, the desktop Product dropdown uses compact title-only rows for product areas and features, and the desktop Resources navigation now uses the same compact title-only overview-plus-guides pattern for high-priority resource articles plus the resources hub
- header mobile navigation is client-gated to confirmed sub-1280px viewports so the hamburger trigger does not appear beside desktop navigation on wide screens
- `/demo` is static and no sign-in required; it does not call Firebase or an AI provider
- pricing exposes Starter, Growth, and Studio INR packaging
- `/security` uses a trust-page shape of facts, controls, and disclosure while keeping AnswerLattice-specific claims around widget context, tenant-scoped rules, owner-approved answers, rate-limited runtime endpoints, compact summaries, and separate product infrastructure
- `/faq` answers founder objections and includes FAQ structured data
- `/product`, `/get-started`, `/about`, and `/contact` no longer use enterprise/design-partner-first copy
- `/contact` now uses an AnswerLattice-owned inquiry form plus direct email, partnership, and security paths. It does not reuse another product's public enquiry storage.
- footer links only target public website routes; public legal links now resolve to real pages
- footer public-route discovery is intentionally broad: Product, Features, Evaluate, Resources, and Trust columns expose the implemented product-area, product-feature, use-case, resource, setup, security, proof, and legal pages without placeholder social links
- AnswerLattice product domains serve AnswerLattice-owned `/sitemap.xml` and `/robots.txt`
- homepage emits Organization, WebSite, and SoftwareApplication structured data
- AnswerLattice website layout sets AnswerLattice metadata, manifest, icons, OS-aware theme-color metadata, and a pre-hydration theme bootstrap so public pages do not inherit root app title metadata or flash the wrong browser chrome color.
- `theme.ts` is the public website theme contract. It keeps the verdigris primary, dark/light backgrounds, surface/border tokens, text colors, success/warning/danger colors, theme storage key, and browser theme colors in one source for metadata-adjacent, inline-style, and provider usage.
- Mobile drawer and footer expose the shared `AnswerlatticeThemeSwitcher`, so public pages keep a visible Light/System/Dark control without crowding the desktop header or adding page-local implementations.
- `styles.css` owns the shared non-home route hero treatment through `.al-page-flow` and `.al-page-hero`: centered heroes align the eyebrow, title, subheading, CTAs, and proof strip; split heroes keep the same type scale, color tokens, and spacing while preserving their copy/media layout. `.al-home-flow` is intentionally excluded from these generic non-home overrides.
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
- June 1 final copy/CSS pass corrected rendered wording across all public AnswerLattice routes, replaced plus-sign product labels with plain-language labels where they appear as buyer-facing copy, changed ambiguous page terminology to "product pages", and moved scoped AnswerLattice CSS imports to the root app layout so clean-cache renders keep Tailwind utilities and theme-aware styling.
- May 31 feedback website pass added `/product/feedback-review`, registered it through `ANSWERLATTICE_SUPPORT_FEATURES`, exposed it in header/footer/resources/product grids through shared feature data, and added a homepage/Product preview tab for ratings, feature requests, suggestions, Support Board handoff, and answer-governance boundaries.
- May 24 AI-built SaaS pass changed the homepage hero to "You shipped the app. Now users need correct answers.", moved the page-aware demo directly after the hero, and teaches approved answers before advanced AnswerLattice vocabulary.
- May 24 AI-built SaaS pass added `/use-cases/ai-built-saas` and `/use-cases/vibe-coded-saas` as an alias for campaign/search traffic.
- May 22 conversion pass changed the homepage hero to outcome-first buyer language while keeping "governed answer infrastructure" as secondary category language.
- Homepage links to the product simulation from the buying path; the deeper generic-answer vs AnswerLattice-answer walkthrough stays on `/demo` so the homepage remains shorter.
- Homepage keeps a compact pricing checkpoint and top buyer objections; detailed fit qualification, setup sequence, and security controls stay on Product, Install, Pricing, Security, and resource routes.
- `/pricing` now defines support credits in plain language and gives plan-fit guidance for Starter, Growth, and Studio.
- `/install` now includes developer handoff examples and a runtime verification mock so technical founders can see the implementation path.
- `/install` is now the AnswerLattice Agent Install Layer: the public site exposes copyable AI-agent instructions, framework pages, Markdown mirrors, public agent files, and the frozen v1 widget contract from one generator.
- `/use-cases` now includes concrete sample questions, generic answers, and AnswerLattice answers for each scenario.
- Three static SEO landing pages were added: `/page-aware-support-widget`, `/hosted-help-center-for-saas`, and `/support-widget-for-solo-founders`.
- Optional conversion tracking uses GA/measurement events only when a public measurement ID exists; it does not call Firestore or AnswerLattice APIs.
- The compressed homepage uses an image-backed hero product scene plus compact proof strip instead of another long text grid or decorative parallax effect.
- Homepage Product Overview now uses a priority bento so high-intent surfaces such as ticket fallback, approved answers, and knowledge intake carry more visual weight while FAQ, changelog, feedback, Support Board, and notifications stay available without turning the page into another uniform card wall.
- Homepage founder fit and category boundary copy now render as one section: a larger best-fit panel plus three compact boundary cards for not-a-chatbot, not-a-full-helpdesk, and not-static-docs. Keep these messages consolidated unless a future funnel test proves they need separate sections again.
- Public product scenes are static website assets or controlled HTML/CSS previews; they do not expose private workspace data, do not call Firebase, and keep public browsing at zero Firebase cost.
- The `/product` page reuses the same product scene before the architecture deep dive so buyers see the working owner flow before reading implementation concepts.
- May 23 agent-context pass added product-domain `llms.txt` and `llms-full.txt` routes so agents reading `answerlattice.com` get AnswerLattice-specific product context, route links, non-goals, mutation boundaries, and structured-data guidance instead of falling back to generic platform context.
- May 22 positioning pass made the demo the hero primary CTA and reframed the homepage around page-aware support truth rather than generic AI support.
- May 22 founder-relief pass changed the hero to "You build revenue. AnswerLattice keeps support accurate." while keeping the product promise scoped to approved page-aware answers, fallback signals, and human-reviewed knowledge updates.
- May 22 presentation pass replaced the dense demo layout with a tabbed product-surface row and large browser-style product canvas, moved product proof closer to modern SaaS screenshot sections, and rebuilt the widget section as a bento grid without adding runtime data calls.
- May 22 product-area pass added landing-style pages for Launch Setup, Page-Aware Widget, Support Control, and Knowledge Governance so each major capability can be evaluated independently while reusing static, zero-Firebase-cost product proof components.
- May 22 final polish pass made those product areas prominent in the header Product dropdown, homepage product-area section, resources hub, and SEO/use-case cross-link blocks so visitors can evaluate AnswerLattice like a product suite instead of a single long page.
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
- May 23 product-feature theme pass removed the light proof band from those feature pages, aligned the shared feature template with AnswerLattice's dark surface and Verdigris primary-token theme, and set the AnswerLattice route stylesheet background so white body bleed does not appear around dark pages.
- May 23 product-feature route hardening replaced the dynamic `[feature]` route with four explicit product-feature page files backed by `ProductFeatureRoutePage`, avoiding fragile Next dev static-path worker failures while keeping shared feature data and sitemap registry coverage.
- May 23 dark-theme consistency pass removed remaining light-mode product mockups from the no sign-in required demo, product capability landing template, and homepage widget section so newly added public pages stay visually consistent with AnswerLattice's dark infrastructure theme.
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
- FAQ now defines "not a chatbot", approved answers, missing-answer behavior, and human approval before official answers.
- Role-specific use-case pages were added for founders, support teams, product teams, and engineering using static content only.
- May 23 agent-readable SEO/AEO hardening added page-level WebPage and BreadcrumbList JSON-LD for every public AnswerLattice route in `ANSWERLATTICE_PUBLIC_PAGES`, switched homepage/FAQ JSON-LD to the shared server-rendered `JsonLdScript`, added `hasPart` route references to the WebSite graph, and made `robots.txt` explicitly enumerate the shared AI/search crawler allowlist. `npm run verify:agent-readiness` now checks AnswerLattice route registry, structured-data wrappers, robots, sitemap, and LLM context coverage.

---

## Routing Architecture

### Multi-Product Domain Registry

**File:** `src/constants/productDomains.ts`

All product domains are registered here. The middleware reads the hostname and rewrites to the correct internal route.

```
answerlattice.com/*  →  middleware  →  /sites/answerlattice/*        (production)
answerlattice.menulist.online/*   →  middleware  →  /sites/answerlattice/*        (Vercel Preview / QA)
localhost/__answerlattice/*  →  middleware  →  /sites/answerlattice/*  (dev only)
```

Product-host `/` and `/home` requests both rewrite to `/sites/answerlattice`, the working AnswerLattice index route. Do not point homepage rewrites at `/sites/answerlattice/home`; that wrapper is retained as a legacy alias surface, but the canonical homepage route is `page.tsx`.

### Middleware Flow

**File:** `src/middleware.ts`

Priority order:
1. Active product website domains (QA answerlattice.menulist.online / production answerlattice.com → /sites/answerlattice)
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
- `trust/page.tsx` — Trust and Data Handling page
- `faq/page.tsx` — FAQ page
- `about/page.tsx` — About page
- `contact/page.tsx` — Contact page
- `get-started/page.tsx` — Get Started page
- `privacy-policy/page.tsx` — Privacy policy page
- `terms-of-service/page.tsx` — Terms of service page
- `Footer.tsx` — Footer (no state needed)
- `src/components/shared/publicAiSummaryLinks/PublicAiSummaryLinks.tsx` — shared footer-level AI summary strip; AnswerLattice passes a prompt that points to `answerlattice.com` and `/llms.txt` while rejecting generic chatbot, helpdesk-replacement, CMS, autonomous support, and analytics-platform framing
- `HeroSection.tsx`, `ProductPreviewSection.tsx`, `WidgetSection.tsx`, `PillarsSection.tsx`, `SystemCoverageSection.tsx`, `HowItWorksSection.tsx`, `ComparisonSection.tsx`, `CTASection.tsx`
- `page.tsx` also owns the homepage-only support-suite, support-surface story, install-surface, AI-built SaaS fit, and positioning-boundary sections as server-rendered static content. Founder-pressure, product-overview, trust/fallback, founder-review, setup-path, and category-comparison detail remains available through Product, feature, resource, security, and comparison routes instead of rendering as separate homepage sections.

### Client Components (`'use client'`)
- `demo/AnswerlatticePublicDemo.tsx` — No sign-in required demo state
- `contact/ContactForm.tsx` — Contact form state, submission handling, success/error states, and privacy/terms links
- `get-started/OnboardingForm.tsx` — Self-service onboarding form state, signed-in account switching, and existing-workspace dashboard handoff
- `components/AnswerlatticeAnalytics.tsx` — Shared public cookie banner plus optional GA script and delegated click tracking for `data-answerlattice-event` elements after accepted analytics consent
- `components/AnswerlatticeScrollReveal.tsx` — Lightweight IntersectionObserver client island for viewport reveal motion across public website pages

### Native Interaction
- `Header.tsx` — Desktop Product and Resources dropdowns stay CSS-driven, while Demo and Install are direct top-level links for high-intent evaluation. Full desktop navigation starts at the `xl` breakpoint so tablet and narrow laptop widths use the drawer instead of a cramped desktop header. The Product dropdown is left-aligned from the Product nav group, stays inside the viewport, and uses compact title-only rows with icons instead of descriptive body copy so the menu remains a fast chooser. The Resources dropdown mirrors that compact treatment with a Resources overview row, a Resource guides section, small icon tiles, and title-only rows for high-priority public resource articles. Both dropdowns include a hover bridge, viewport-height scroll containment, and Escape-to-blur behavior for keyboard users. Mobile navigation opens from the right, locks body scroll, closes on backdrop/Escape/link click, groups Product Areas, Product Features, and Other into separate cards, includes route icons for every drawer item, and includes safe-area bottom padding. On phone widths the drawer uses the full viewport width so the underlying page is not exposed as a broken side strip; on larger mobile/tablet widths it keeps the right-side drawer presentation. The drawer uses separate mounted and visible states so it paints off-screen before opening and stays mounted long enough to animate closed, with internal scroll containment and high overlay stacking for cookie/summary/floating-control compatibility.

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

- `AnswerlatticeAnalytics.tsx` shows the shared public cookie banner first. It loads Plausible only after accepted analytics consent and only when `NEXT_PUBLIC_ANSWERLATTICE_PLAUSIBLE_DOMAIN` exists. It loads Google Analytics only after accepted analytics consent and only when `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MEASUREMENT_ID` or `NEXT_PUBLIC_GA_MEASUREMENT_ID` exists and matches the GA4 `G-...` measurement-id shape.
- Answerlattice website analytics URL minimization boundary: `answerlatticeAnalyticsUtils.ts` strips query strings and hash fragments from GA4 page-location, click-link, resource target, referrer, and entry-page URL fields before emission while bounding analytics text fields.
- CTA/demo/pricing/onboarding events are emitted to Plausible as property-free custom events and to `window.gtag` when GA4 is configured.
- Resource page/referrer events keep page, entry-page, referrer, UTM, slug, and target URL context for GA4 compatibility, but do not send raw full URLs or a custom repo-generated `session_id` parameter to third-party website analytics.
- Public get-started completion analytics do not send API key material or token prefixes.
- No event is written to Firestore, no API route is called, and no AnswerLattice Firebase cost is introduced by normal tracking.
- `src/config/csp-allowlist.ts` allows Plausible and Google Analytics destinations so optional website analytics can report when enabled.

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
| 2026-07-11 | 1.3.1 | Closed the 390px governance-demo min-content overflow, normalized public action touch targets, and bounded the Trust page environment claim to current QA/deployment evidence. |
| 2026-07-13 | 1.3.2 | Hardened the public Product and Resources dropdowns with hover-bridge, Escape close, and viewport scroll containment; upgraded the mobile drawer to full-width phone behavior with internal scroll containment, safe-area CTA padding, and high overlay stacking |
| 2026-07-11 | 1.3.0 | Implemented the six-stage governance demo, plan/currency-accurate INR/USD setup path, factual Trust and Data Handling page, privacy disclosure sync, and public route registry/navigation updates |
| 2026-06-29 | 1.2.95 | Added the compact homepage Support Suite category-switch strip that compares AnswerLattice by official answer source while keeping full comparison tables on `/comparisons` and preserving static public-site behavior |
| 2026-06-27 | 1.2.94 | Replaced fixed-position Prism-glass card hover glows with a fine-pointer spotlight controller so card highlights follow the mouse while preserving existing AnswerLattice theme tokens, layouts, and product claims |
| 2026-06-26 | 1.2.93 | Converted the homepage Product Overview feature grid into a priority bento and merged AI-built SaaS fit plus positioning-boundary sections into one founder-fit/category-boundary section without removing product routes, features, or public claims |
| 2026-06-26 | 1.2.92 | Added a token-led Prism-glass polish pass to AnswerLattice website cards and surface frames: inset highlights, backdrop blur, softer shadows, hover lift/glow, and reduced-motion fallbacks while preserving the existing Verdigris theme, diagrams, layout, and product claims |
| 2026-06-26 | 1.2.91 | Added consent-gated Plausible Cloud support for public website events and removed API-key material from onboarding success analytics labels |
| 2026-06-25 | 1.2.90 | Removed the custom repo-generated resource analytics `session_id` parameter from GA4 payloads while preserving consent-gated page, entry-page, referrer, UTM, slug, and target URL context |
| 2026-06-21 | 1.2.89 | Refined the homepage support-suite presentation after reviewing Supahub, Peppermint, Front, and the supplied Grabee reference, then simplified it after visual QA: the section now uses a lighter `Collect → Shape → Serve` flow rail, keeps the four suite cards, and renders the build path as a stable non-sticky panel without adding runtime behavior or unsupported product claims |
| 2026-06-21 | 1.2.88 | Added reviewed-support-layer center copy to `SupportKnowledgeMapSection` so the support knowledge map makes approved-first, fallback-tracked, and review-loop behavior visible without changing runtime surfaces |
| 2026-06-21 | 1.2.87 | Added the shared public AI summary footer strip with AnswerLattice-specific Claude, ChatGPT, and Gemini prompt links, preserving governed-answer positioning and non-goal boundaries |
| 2026-06-18 | 1.2.86 | Sharpened homepage first-fold copy, site metadata, reusable hero copy, and final CTA around approved answers before fallback and reviewable support gaps without changing routes, domains, runtime data calls, or dependencies |
| 2026-06-10 | 1.2.85 | Added reusable AnswerLattice concept illustrations for source-to-answer, governance loop, install verification, safe-context boundary, and category positioning across Product, Install, Security, and Comparisons |
| 2026-06-10 | 1.2.84 | Generated 25 production-ready AnswerLattice product-scene PNGs and internal source SVGs for the maintained website visual slots while preserving stable asset paths |
| 2026-06-10 | 1.2.83 | Added the maintained AnswerLattice visual asset inventory and data attributes for current/future visual slots without generating new assets |
| 2026-06-10 | 1.2.82 | Restored the feature-wise Product Overview cards after the sticky support-surface story while keeping the homepage compressed at 11 rendered sections |
| 2026-06-10 | 1.2.81 | Compressed the homepage render path from 18 sections to 10, shortening hero, support-suite, and support-surface copy while preserving widget, hosted help, tickets, approved answers, feedback, changelog, install, pricing, and not-helpdesk signals |
| 2026-06-10 | 1.2.80 | Added shared product-area and product-feature evaluation strips for setup, security, and category-fit checks after cross-checking high-performing support feature-page patterns |
| 2026-06-10 | 1.2.79 | Applied the product-led support-suite website pass: homepage now adds suite, install, and comparison sections; Product now includes category comparison; shared product-area and product-feature templates reconnect each page to the broader support suite; header promotes Demo and Install as top-level high-intent paths |
| 2026-06-07 | 1.2.78 | Added the homepage support-surface story, frame rail motion, product-user hero wording, and input-to-support output diagram updates while keeping the public site static and scoped to existing product routes |
| 2026-06-06 | 1.2.77 | Synced public launch-setup, product-preview, and updates copy with Activation first-client launch proof without claiming Jira, native helpdesk, or mutation-proposal scans from the website |
| 2026-06-06 | 1.2.76 | Gated the mobile hamburger trigger to confirmed mobile viewports and normalized shared non-home hero typography/alignment in the product-scoped stylesheet without changing the homepage hero |
| 2026-06-06 | 1.2.75 | Added dedicated Small SaaS Teams and Studios/Agencies use-case routes, linked them from the use-case hub and footer Evaluate column, and registered them in the public page registry |
| 2026-06-06 | 1.2.74 | Restored the full old Product and Resources footer link set across public-route columns, kept duplicate hub links render-safe with label-qualified keys, and preserved the footer theme switcher without placeholder social links |
| 2026-06-06 | 1.2.73 | Compacted the Product dropdown to the same width, outer panel, overview row, icon scale, and title-only row pattern as Resources, and routed product-host `/` plus `/home` to the working AnswerLattice index route instead of the internal `/home` wrapper |
| 2026-06-06 | 1.2.72 | Reworked the desktop Resources dropdown to match the compact Product dropdown pattern with an overview row, small icon tiles, and title-only resource guide rows |
| 2026-06-05 | 1.2.71 | Simplified the desktop Product dropdown into compact title-only rows with icons, removing the dense per-item descriptions from header navigation while preserving all product routes |
| 2026-06-05 | 1.2.70 | Replaced the footer brand-column theme switcher with placeholder social icon links and moved the Light/System/Dark control into the bottom footer strip |
| 2026-06-05 | 1.2.69 | Removed the Light/System/Dark selector from the desktop header action group while keeping the shared theme switcher in the mobile drawer and footer |
| 2026-06-05 | 1.2.68 | Normalized public-site feature-card, hover, icon, diagram-mockup, and radial-glow accents onto the Verdigris primary token system by replacing hardcoded cyan/sky values with shared AnswerLattice accent utilities; also constrained shared feature proof cards with `min-w-0` so mobile grids do not clip wide visual cards |
| 2026-06-05 | 1.2.67 | Reworked `ProductPreviewSection` from the oversized sticky side-card walkthrough into a stable tabbed product-proof frame with the active explanation above the image-backed screen slot, fixing the broken desktop card layout and keeping mobile/tablet aligned |
| 2026-06-05 | 1.2.66 | Fixed the public header desktop breakpoint and Product dropdown placement: full nav now starts at `xl`, narrower desktop/tablet widths use the drawer, the header container uses `max-w-7xl`, and the wide Product menu no longer opens off-screen |
| 2026-06-05 | 1.2.65 | Replaced public website HTML/CSS product-screen mockups with image-backed 1440 x 1200 dummy PNG slots across homepage hero, product preview, widget proof, product-area canvases, feature pages, and the public demo; added the shared asset registry, renderer, deterministic generator, and internal source/manifest path |
| 2026-06-05 | 1.2.64 | Refined AnswerLattice diagram motion across reusable flow diagrams and the support knowledge map: removed the inner center strip, converted the center ring into a single soft ripple, synchronized cross-diagram logo-origin pulses, extended those paths to the visible guide endpoints, and made pulse strokes fade at their endpoints |
| 2026-06-05 | 1.2.63 | Added AnswerLattice Light/System/Dark mode end to end with site-scoped persistence, layout bootstrap/provider, mobile/footer switchers, OS-aware theme-color metadata, light-mode CSS compatibility rules for existing dark utilities, themed diagrams, inline-style route token updates, TypeScript verification, PWA asset verification, preference bootstrap verification, and 70-route public smoke verification |
| 2026-06-04 | 1.2.62 | Added the desktop Resources dropdown to `Header.tsx`, mirroring the MenuList resources-menu pattern with AnswerLattice-specific resource article links and no new runtime routes |
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
| 2026-05-22 | 1.2.4 | Final product-suite polish: added Product dropdown navigation, homepage product-area cross-link section, resources product-area hub, and SEO/use-case product-area cross-links with no new runtime dependencies or Firebase reads |
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
| 2026-06-30 | 1.2.61 | Hardened the AnswerLattice public contact browser submission with same-origin credentials, no-store cache, manual redirect handling, an 8KB bounded response parser, accepted-shape validation, and bounded diagnostics without changing the contact API or Firebase write path |
| 2026-07-05 | 1.2.63 | Added the Answerlattice onboarding user ID boundary on `/api/answerlattice/onboard` so `/get-started` cannot pass malformed session user IDs into user document refs while preserving the valid onboarding browser flow |
| 2026-06-30 | 1.2.62 | Hardened the `/get-started` onboarding browser response boundary with same-origin credentials, no-store cache, manual redirect handling, a 16KB bounded response parser, onboarding-result shape validation, and bounded diagnostics before success state |

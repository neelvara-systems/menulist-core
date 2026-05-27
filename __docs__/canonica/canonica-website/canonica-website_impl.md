# Canonica Website — Implementation

> **Version:** 1.2.42
> **Last Updated:** 2026-05-27
> **Audience:** Developers

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS (shared app pipeline) |
| Routing | Middleware hostname-based rewrite (multi-product) |
| Components | React Server Components by default; client islands only where interaction needs state |
| Links | `CanonicaLink` wrapper for public-site links; `src/constants/canonica/routes.ts` for dashboard route constants without sidebar icon bundle cost |
| Dependencies | Zero new npm packages |

## PWA Brand Assets

Canonica website and dashboard metadata use `src/lib/canonica/pwaAssets.ts` for iOS startup image declarations. The generated startup PNGs live in `public/canonica-splash/apple-splash-*.png` and are produced by `npm run generate:canonica-splash` from the approved `public/canonica-logo-mark-wide.png` source mark.

The root app layout defines default startup images in `metadata.appleWebApp.startupImage`; Canonica child layouts override that metadata with `getStaticCanonicaAppleStartupImages()` so Canonica install/splash contexts use Canonica-specific startup images.

`src/app/loading.tsx` exposes `brand="canonica"` for explicit Canonica fallback loaders and auto-detects `x-product-id: canonica` for root streamed loading payloads. The Redux overlay loader in `src/components/organisms/loader/index.tsx` detects Canonica runtime routes and swaps to the shared `CanonicaAnimatedLogo` atom.

---

## File Structure

```
src/app/sites/canonica/
├── layout.tsx                     # Root layout (metadata, OG, viewport)
├── theme.ts                       # Dark Control Plane theme contract and browser theme color
├── styles.css                     # Tailwind directives, CSS variables, and homepage section-band rhythm
├── scroll-reveal.css              # Canonica-specific viewport reveal motion with reduced-motion support
├── page.tsx                       # Homepage (server component)
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
├── product/workflow-notifications/page.tsx # Workflow Notifications feature page
├── product/proactive-help/page.tsx # Proactive Help feature page
├── productFeatures.ts             # Shared product-feature route data and sitemap source
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
├── demo/CanonicaPublicDemo.tsx    # Account-free page-aware support demo
├── install/page.tsx               # Agent install overview generated from Canonica Widget Contract v1
├── install/InstallContractPage.tsx # Shared install/contract/framework page renderer
├── install/markdownRoute.ts       # Shared Markdown response helper for install .md mirrors
├── install/ai-agent/page.tsx      # Copyable AI agent install packet page
├── install/manual/page.tsx        # Manual v1 widget install page
├── install/frameworks/*/page.tsx  # Framework-specific install pages
├── install.md/route.ts            # Machine-readable install overview
├── install/**/*.md/route.ts       # Machine-readable framework and contract docs
├── agents/canonica/*              # Public generated AGENTS/CLAUDE/Cursor/Windsurf/skill/ZIP files
├── integrations/page.tsx          # Slack/email workflow notifications page
├── pricing/page.tsx               # Pricing page
├── resources/page.tsx             # Public learning hub
├── updates/page.tsx               # Public website update log
├── security/page.tsx              # Security and trust page
├── faq/page.tsx                   # FAQ page with FAQPage JSON-LD
├── about/page.tsx                 # About page
├── contact/page.tsx               # Contact page
├── contact/ContactForm.tsx        # Canonica public inquiry form client island
├── get-started/page.tsx           # Self-service onboarding page
├── privacy-policy/page.tsx        # Public privacy policy
├── terms-of-service/page.tsx      # Public terms of service
├── sitemap.xml/route.ts           # Canonica sitemap.xml route handler
├── robots.txt/route.ts            # Canonica robots.txt route handler
├── llms.txt/route.ts              # Short product-domain agent-readable context
├── llms-full.txt/route.ts         # Extended product-domain agent-readable context and boundaries
├── siteConfig.ts                  # Shared public site metadata and route registry
├── enginePillars.ts               # Implemented Canonica engine pillar copy
├── systemCoverage.ts              # Code-backed system coverage groups for homepage
└── components/
    ├── Header.tsx                 # Shared header with desktop nav and right-side mobile drawer
    ├── Footer.tsx                 # Shared footer
    ├── CanonicaLogoMark.tsx       # Inline vector infinity mark for crisp website header/footer branding
    ├── CanonicaFlowDiagram.tsx    # Reusable animated hub, column-sequence, and loop diagrams
    ├── CanonicaProofBlocks.tsx    # Reusable before/after, status snapshot, and decision proof blocks
    ├── CanonicaLink.tsx           # Dev/production-aware Link wrapper
    ├── CanonicaAnalytics.tsx      # Optional GA/measurement event tracker, no Firestore writes
    ├── CanonicaScrollReveal.tsx   # Layout-level reveal observer for public sections, cards, CTA controls, and footer groups
    ├── HeroSection.tsx            # AI-built SaaS homepage hero
    ├── SupportKnowledgeMapSection.tsx # Visual source map for support inputs, Canonica control plane, and output surfaces
    ├── HomePageAwareDemoSection.tsx # Embedded generic-vs-Canonica demo
    ├── ClosedLoopSection.tsx      # Page question to reviewed support-fix loop diagram
    ├── BestFitSection.tsx         # Buyer qualification decision tiles
    ├── ProductPreviewSection.tsx  # Responsive dashboard/widget/governance product scene
    ├── ProductAreasSection.tsx    # Homepage product-suite cross-link section
    ├── SetupFunnelSection.tsx     # 10-minute setup visual sequence
    ├── DayOneLaunchPackSection.tsx # Homepage/Product day-one launch pack links for quickstarts, starter surfaces, imports, verifier, proof, ROI, and security handoff
    ├── WidgetSection.tsx          # Homepage widget install, page-aware support scene, and status snapshots
    ├── HomeTrustSection.tsx       # Homepage trust/security status snapshots
    ├── PillarsSection.tsx         # Homepage Canonica engine pillar sequence diagram
    ├── SystemCoverageSection.tsx  # Homepage Launch/Support/Governance/Runtime hub diagram
    ├── HowItWorksSection.tsx      # Homepage 5-step animated sequence
    ├── ComparisonSection.tsx      # Homepage comparison table
    ├── PricingPreviewSection.tsx  # Homepage pricing preview and credit explanation
    ├── ObjectionsSection.tsx      # Top buyer objections before final CTA
    ├── SeoLandingPage.tsx         # Shared static SEO landing page component
    ├── UseCaseLandingPage.tsx     # Shared wrapper for role-specific use-case pages
    ├── ProductCapabilityLandingPage.tsx # Shared template for product-area landing pages
    ├── ProductFeatureLandingPage.tsx # Shared template for KB/FAQ/changelog/ticket feature pages
    ├── StructuredData.tsx         # Homepage Organization/WebSite/SoftwareApplication/WebPage/Breadcrumb JSON-LD
    ├── PageStructuredData.tsx     # Per-route WebPage + BreadcrumbList JSON-LD from CANONICA_PUBLIC_PAGES
    └── CTASection.tsx             # Homepage bottom CTA
```

Related Canonica route constants live in `src/constants/canonica/routes.ts`. `src/constants/canonica/navigations.ts` re-exports those constants for existing dashboard imports while keeping icon-heavy sidebar metadata out of lightweight public client islands such as `/get-started`.

Public contact submissions use `src/app/api/canonica/public/contact/route.ts`. The route is Node-only, rate-limited as `CANONICA_CONTACT_FORM`, validates with Zod, ignores honeypot submissions, hashes requester IPs, and writes accepted submissions to `DB_COLLECTIONS.CANONICA_CONTACT_ENQUIRIES` in Canonica Firebase.

## Self-Sellable Positioning Pass

The public website now follows `../self-sellable-product-strategy.md`:

- homepage leads with the AI-built SaaS launch problem instead of enterprise control-plane language
- "vibe-coded SaaS" is treated as an SEO/campaign alias, not the main public buyer label
- homepage and product page expose the implemented Canonica engine pillars: Product Ontology, Canonical Answer Engine, Drift Governance, and Signal Mutation
- homepage exposes the implemented system map: Launch Setup, Support Control, Knowledge Governance, and Runtime Layer
- homepage includes a screenshot-led responsive product scene showing activation, widget context, product surfaces, and governance queue states
- public website pages now include use cases, widget install, resources, and updates so the site matches the buying-page shape expected from support tooling without adding unsupported API or adapter claims
- `/integrations` now explains the supported Slack/email workflow notification path, including test delivery and compact delivery health, while keeping broader adapters controlled rollout
- header links include `/demo`
- `/demo` is static and account-free; it does not call Firebase or an AI provider
- pricing exposes Starter, Growth, and Studio INR packaging
- `/security` uses a trust-page shape of facts, controls, and disclosure while keeping Canonica-specific claims around widget context, tenant-scoped rules, owner-approved answers, rate-limited runtime endpoints, compact summaries, and separate product infrastructure
- `/faq` answers founder objections and includes FAQ structured data
- `/product`, `/get-started`, `/about`, and `/contact` no longer use enterprise/design-partner-first copy
- `/contact` now uses a Canonica-owned inquiry form plus direct email, partnership, and security paths. It does not reuse another product's public enquiry storage.
- footer links only target public website routes; public legal links now resolve to real pages
- Canonica product domains serve Canonica-owned `/sitemap.xml` and `/robots.txt`
- homepage emits Organization, WebSite, and SoftwareApplication structured data
- Canonica website layout sets Canonica metadata, manifest, icons, and the Dark Control Plane theme color so public pages do not inherit root app title metadata
- `theme.ts` is the public website theme contract. It keeps the verdigris primary, deep navy background, surface/border tokens, text colors, and success/warning/danger colors in one source for metadata-adjacent and inline-style usage.
- copy differentiates Canonica from helpdesks, chatbots, and documentation CMS products without claiming to replace them
- May 22 refresh changed the hero from page-aware support copy to the implemented support knowledge control plane category.
- Website copy now includes hosted help domains, FAQ management/article-backed FAQ generation, product-scoped Canonica billing/support credits, source-version cache freshness, and separate Firebase/product boundaries.
- Custom help domains are now buyer-facing website content because they make Canonica feel native to the client's product instead of a third-party bolt-on.
- Ticket debugging context is now presented as capped, sanitized support context in product, security, FAQ, and privacy copy; public copy avoids raw "console log" wording except where implementation docs need it.
- `/pricing` now explains that public setup starts on beta while paid plan changes and support-credit top-ups happen from Canonica Billing using product-scoped Razorpay requests.
- `/install`, `/security`, `/faq`, `/resources`, `/updates`, privacy, and terms now account for hosted help and current support-surface scope.
- May 24 AI-built SaaS pass changed the homepage hero to "You shipped the app. Now users need correct answers.", moved the page-aware demo directly after the hero, and teaches approved answers before advanced Canonica vocabulary.
- May 24 AI-built SaaS pass added `/use-cases/ai-built-saas` and `/use-cases/vibe-coded-saas` as a canonicalized alias for campaign/search traffic.
- May 22 conversion pass changed the homepage hero to outcome-first buyer language while keeping "support knowledge control plane" as secondary category language.
- Homepage now embeds the static demo directly in the buying path and shows generic answer vs Canonica answer for each demo surface.
- Homepage adds best-fit/not-fit qualification, 10-minute setup sequence, security-at-a-glance controls, pricing preview, and top buyer objections.
- `/pricing` now defines support credits in plain language and gives plan-fit guidance for Starter, Growth, and Studio.
- `/install` now includes developer handoff examples and a runtime verification mock so technical founders can see the implementation path.
- `/install` is now the Canonica Agent Install Layer: the public site exposes copyable AI-agent instructions, framework pages, Markdown mirrors, public agent files, and the frozen v1 widget contract from one generator.
- `/use-cases` now includes concrete sample questions, generic answers, and Canonica answers for each scenario.
- Three static SEO landing pages were added: `/page-aware-support-widget`, `/hosted-help-center-for-saas`, and `/support-widget-for-solo-founders`.
- Optional conversion tracking uses GA/measurement events only when a public measurement ID exists; it does not call Firestore or Canonica APIs.
- The homepage now borrows the modern product-scene pattern from high-performing SaaS sites: the first proof after the hero is a large desktop-style Canonica workflow view rather than another text grid.
- The product scene is implemented as responsive HTML/CSS instead of a static raster screenshot so it does not expose private workspace data, does not become stale after dashboard UI changes, and keeps public browsing at zero Firebase cost.
- The `/product` page reuses the same product scene before the architecture deep dive so buyers see the working owner flow before reading implementation concepts.
- May 23 agent-context pass added product-domain `llms.txt` and `llms-full.txt` routes so agents reading `canonica.app` get Canonica-specific product context, route links, non-goals, mutation boundaries, and structured-data guidance instead of falling back to generic platform context.
- May 22 positioning pass made the demo the hero primary CTA and reframed the homepage around page-aware support truth rather than generic AI support.
- May 22 founder-relief pass changed the hero to "You build revenue. Canonica keeps support accurate." while keeping the product promise scoped to approved page-aware answers, fallback signals, and human-reviewed knowledge updates.
- May 22 presentation pass replaced the dense demo layout with a tabbed product-surface row and large browser-style product canvas, moved product proof closer to modern SaaS screenshot sections, and rebuilt the widget section as a bento grid without adding runtime data calls.
- May 22 product-area pass added landing-style pages for Launch Setup, Page-Aware Widget, Support Control, and Knowledge Governance so each major capability can be evaluated independently while reusing static, zero-Firebase-cost product proof components.
- May 22 final polish pass made those product areas first-class in the header Product dropdown, homepage product-area section, resources hub, and SEO/use-case cross-link blocks so visitors can evaluate Canonica like a product suite instead of a single long page.
- May 23 product-feature pass added standalone `/product/knowledge-base`, `/product/faq-management`, `/product/changelog`, and `/product/tickets` pages using a reusable outcome-hero, visual proof grid, workflow, connected-surfaces, FAQ, and CTA pattern inspired by modern feature-specific SaaS pages.
- May 24 workflow notification/proactive help pass added standalone `/product/workflow-notifications` and `/product/proactive-help` pages, converted `/integrations` from an install redirect to a real Slack/email notification page, and updated sitemap/LLM context/resources/FAQ so public claims match the hardened runtime.
- May 26 Team Access pass added standalone `/product/team-access`, then updated Product, Launch Setup, Pricing, Security, Security One-Pager, Get Started, FAQ, Privacy, Resources, Updates, sitemap metadata, and LLM context to include Canonica roles, owner reset, force sign-out, and workspace-scoped access.
- May 26 FAQ/custom-answer pass kept the existing `/product/faq-management` page as the canonical buyer surface, then updated homepage support map, page-aware demo, widget section, Product, Support Control, FAQ, SEO pages, sitemap metadata, LLM context, and Updates to explain the implemented retrieval path: canonical answer first, published owner FAQ/custom answer next, fallback only when coverage is missing.
- May 27 Support Board pass added standalone `/product/support-board`, then updated Support Control, FAQ, Resources, Updates, sitemap metadata, LLM context, and route docs to explain private owner/staff support cards, internal notes, status history, selected follow-up, and answer-proposal handoff while keeping ticket/signal sync and nightly board preparation marked as controlled rollout instead of default website claims.
- May 27 contact/mobile pass added a full `/contact` inquiry form backed by a Canonica-only public API route and regrouped the mobile hamburger into Product Areas, Product Features, and Other cards with safe-area bottom padding.
- May 27 drawer pass converted the public hamburger from an inline mobile panel to a right-side drawer with backdrop, Escape close, body scroll lock, and link-close behavior.
- May 27 drawer-icon pass added Lucide route icons to every mobile drawer row and the setup CTA while preserving the same Product Areas, Product Features, and Other grouping.
- May 25 runtime-scaling pass updated the existing homepage, `/product`, `/security`, `/resources`, `/updates`, FAQ, and LLM context to explain compiled approved context, bundle readiness, workspace-local daily governance, and cache-first runtime delivery without adding a standalone MCP page or promising public agent write access.
- May 25 day-one launch-pack pass added `DayOneLaunchPackSection.tsx` to the homepage and `/product`, then linked the existing `/quickstarts`, `/product/launch-setup`, `/product/knowledge-base`, `/install`, `/roi-calculator`, `/proof`, and `/security-one-pager` resources from the main buyer path instead of creating another public route.
- May 25 widget image-support pass updated existing buyer paths instead of adding a standalone screenshot page: homepage widget proof, `/product/page-aware-widget`, `/install`, `/quickstarts`, `/security`, `/security-one-pager`, FAQ, widget SEO pages, route metadata, LLM context, and updates now describe user-initiated screenshot upload/paste and reject automatic host-app screen capture or DOM scraping.
- May 23 product-feature theme pass removed the light proof band from those feature pages, aligned the shared feature template with Canonica's dark surface, verdigris, and cyan theme, and set the Canonica route stylesheet background so white body bleed does not appear around dark pages.
- May 23 product-feature route hardening replaced the dynamic `[feature]` route with four explicit product-feature page files backed by `ProductFeatureRoutePage`, avoiding fragile Next dev static-path worker failures while keeping shared feature data and sitemap registry coverage.
- May 23 dark-theme consistency pass removed remaining light-mode product mockups from the account-free demo, product capability landing template, and homepage widget section so newly added public pages stay visually consistent with Canonica's dark infrastructure theme.
- May 23 resources layout pass changed grouped resources from four tall category columns to stacked horizontal decision rows so each group title and its three linked subcards read together on desktop while remaining stacked on mobile.
- May 23 resources polish removed the outer row cards from the decision-path rows so the resources hub reads as clean rows of links instead of nested boxes.
- May 23 product capability bento pass changed five-card capability sections to a 2-card first row and 3-card second row, improving visual balance and moving the third card, such as Support Control's Changelog support, into the second row.
- May 23 viewport motion pass added a Canonica-specific layout-level reveal observer that applies restrained appearance effects to sections, semantic article cards, rounded grid/link cards, CTA controls, and footer groups across public pages without adding a dependency or mixing unrelated website classes.
- May 23 support knowledge map pass added `SupportKnowledgeMapSection.tsx` to the homepage and `/product` page. It is a static visual explanation of docs/FAQs, releases/product pages, tickets/feedback, and page context flowing into Canonica, then out to the page-aware widget, hosted help, approved answers, and governance queue. The map intentionally avoids helpdesk-replacement and autopilot claims.
- May 24 support map visual polish kept the shared homepage and `/product` section, removed center explanatory copy from the diagram core, and refined the diagram with a Canonica-colored logo-only center, smooth ripple rings, dotted SVG paths, homepage-style pulse strokes, and border-only output arrival highlights with reduced-motion fallback.
- May 24 flow-diagram pass added `CanonicaFlowDiagram.tsx` as a reusable static-rendered visual system for Canonica hub, column-sequence, and loop diagrams. It preserves the same Canonica logo-only core, ripple rings, dotted SVG paths, homepage-style pulse strokes, mobile path variants, and border-only output highlights, then applies that system to closed-loop, setup, how-it-works, product-area workflow, product-feature workflow/connected surfaces, SEO/use-case, install, security, resources, engine pillar, and system coverage sections.
- May 24 final diagram polish aligned the reusable sequence diagram path endpoints and output highlight timing with the shared source-map reference, while leaving the existing Canonica logo, ripple, and color treatment intact.
- May 24 loop-diagram timing polish made the closed-loop ring pulse start at step 01 and staggered all six card border highlights in the same cycle, so the loop reads as one synchronized motion instead of independent flashes.
- May 24 loop pacing polish slowed the closed-loop ring/card animation from the shared 5.6-second pulse cycle to an 8.4-second loop-specific cycle, with card-highlight delays scaled to keep the sequence synchronized.
- May 24 sequence layout polish converted reusable sequence diagrams from horizontal card strips into the shared input column, logo center, and output column pattern so setup, install, resources, product-area, product-feature, SEO/use-case, engine, and how-it-works diagrams use one visual grammar.
- May 24 proof-block pass added `CanonicaProofBlocks.tsx` for non-diagram visual proof: decision tiles, before/after answer strips, and status snapshots. It is used to make fit qualification, widget states, homepage trust controls, `/use-cases`, and `/security` easier to scan without adding screenshots, Firebase reads, or unsupported product claims.
- `ClosedLoopSection.tsx` now explains the loop in first-visit language: user asks from a product page, Canonica checks approved answers, fallback opens only when coverage is missing, repeated misses become review items, the owner approves the fix, and future users receive the correct answer.
- Comparison now explicitly separates AI chatbot, helpdesk, knowledge base, and Canonica so buyers do not misclassify Canonica as a helpdesk replacement.
- FAQ now defines "not a chatbot", canonical answers, missing-answer behavior, and human approval before authoritative answers.
- Role-specific use-case pages were added for founders, support teams, product teams, and engineering using static content only.
- May 23 agent-readable SEO/AEO hardening added page-level WebPage and BreadcrumbList JSON-LD for every public Canonica route in `CANONICA_PUBLIC_PAGES`, switched homepage/FAQ JSON-LD to the shared server-rendered `JsonLdScript`, added `hasPart` route references to the WebSite graph, and made `robots.txt` explicitly enumerate the shared AI/search crawler allowlist. `npm run verify:agent-readiness` now checks Canonica route registry, structured-data wrappers, robots, sitemap, and LLM context coverage.

---

## Routing Architecture

### Multi-Product Domain Registry

**File:** `src/constants/productDomains.ts`

All product domains are registered here. The middleware reads the hostname and rewrites to the correct internal route.

```
canonica.app/*  →  middleware  →  /sites/canonica/*        (production)
ecomsai.com/*   →  middleware  →  /sites/canonica/*        (Vercel Preview / QA)
localhost/__canonica/*  →  middleware  →  /sites/canonica/*  (dev only)
```

### Middleware Flow

**File:** `src/middleware.ts`

Priority order:
1. Active product website domains (QA ecomsai.com / production canonica.app → /sites/canonica)
2. Dev path prefixes (/__canonica → /sites/canonica) — local dev only
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
In production (`canonica.app`), internal links like `/pricing` work naturally.
In dev mode (`localhost:3000/__canonica`), unprefixed links such as `/pricing` navigate to the root app's pricing page.

### Solution
Each page reads the `x-product-id` header (set by middleware) and `host` header to determine if dev mode:

```typescript
function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}
```

`basePath` is passed as a prop to components that contain links (Header, Footer, HeroSection, CTASection).

### CanonicaLink Component

```typescript
// Wraps next/link with basePath prefix
export default function CanonicaLink({ href, basePath = '', children, ...props }) {
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
- `demo/CanonicaPublicDemo.tsx` — Account-free demo state
- `contact/ContactForm.tsx` — Contact form state, submission handling, success/error states, and privacy/terms links
- `get-started/OnboardingForm.tsx` — Self-service onboarding form state, signed-in account switching, and existing-workspace dashboard handoff
- `components/CanonicaAnalytics.tsx` — Optional GA script plus delegated click tracking for `data-canonica-event` elements
- `components/CanonicaScrollReveal.tsx` — Lightweight IntersectionObserver client island for viewport reveal motion across public website pages

### Native Interaction
- `Header.tsx` — Desktop Product dropdown stays CSS-driven. Mobile navigation is a small client drawer that opens from the right, locks body scroll, closes on backdrop/Escape/link click, groups Product Areas, Product Features, and Other into separate cards, includes route icons for every drawer item, and includes safe-area bottom padding. The drawer uses separate mounted and visible states so it paints off-screen before opening and stays mounted long enough to animate closed.

---

## Production Deployment

### Prerequisites
1. Add `canonica.app` domain to Vercel project dashboard
2. Configure DNS for canonica.app pointing to Vercel
3. Keep `public/canonica-og-image.png`, `public/canonica.webmanifest`, `public/canonica-logo.svg`, `public/canonica-logo-mark-wide.png`, `public/canonica-favicon.*`, and Canonica icon PNGs available for OpenGraph, app metadata, splash generation, dashboard branding, and favicon previews. Header, footer, diagrams, loaders, and dashboard navigation use the shared inline SVG `CanonicaLogoMark` so the mark stays consistent without PNG UI usage.

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

The public demo is static interaction state only. Security, FAQ, privacy, and terms pages are static content. The self-service onboarding form and contact form are the only public website surfaces that call Canonica APIs, and both run only after explicit user submission.

The contact form adds one Canonica Firestore write per accepted submission to `canonica_contactEnquiries`. It performs IP-based public rate limiting and honeypot handling before the Firestore write path.

Existing Canonica workspace detection on `/get-started` uses the already-loaded NextAuth session/product account. It does not add a Firestore read to normal page rendering; owners with a valid Canonica scope get Activation/Billing links plus a switch-account action.

Use-cases, install, resources, updates, and the homepage product/widget preview sections are static server-rendered website content. They do not read Firestore and do not call Canonica APIs.

Conversion analytics is client-side only:

- `CanonicaAnalytics.tsx` loads Google Analytics only when `NEXT_PUBLIC_CANONICA_FIREBASE_MEASUREMENT_ID` or `NEXT_PUBLIC_GA_MEASUREMENT_ID` exists.
- CTA/demo/pricing/onboarding events are emitted through `window.gtag`.
- No event is written to Firestore, no API route is called, and no Canonica Firebase cost is introduced by normal tracking.
- `src/config/csp-allowlist.ts` allows Google Analytics connect destinations so the optional script can report when enabled.

---

## Adding a New Page

1. Create `src/app/sites/canonica/[page-name]/page.tsx`
2. Import `headers` from `next/headers`, `CanonicaHeader`, `CanonicaFooter`
3. Add `getBasePath()` function (copy from any existing page)
4. Add page to `NAV_LINKS` in `Header.tsx` if it should appear in navigation
5. Add to `FOOTER_LINKS` in `Footer.tsx` if needed
6. Add the route to `CANONICA_PUBLIC_PAGES` in `siteConfig.ts` so Canonica sitemap output stays complete
7. Avoid public website route names reserved by Canonica dashboard rewrites, including `/docs`, `/help`, `/changelog`, and `/release-notes`
8. For SEO landing pages, reuse `SeoLandingPage.tsx` unless the page needs materially different layout or behavior
9. Prefer optional client-side analytics markers (`data-canonica-event`) over Firestore-backed tracking on public website pages
10. For install content, update `src/lib/canonica/installContract/` first so public pages, Markdown mirrors, llms context, dashboard packets, and downloadable agent files do not drift.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-07 | 1.0.0 | Initial implementation |
| 2026-05-21 | 1.1.0 | Self-sellable website pass, demo, pricing update, founder-friendly product funnel, security/FAQ/legal pages, sitemap/robots, manifest/icons, and structured data |
| 2026-05-21 | 1.1.1 | Restored implemented Canonica engine pillars on homepage and product page without claiming deferred API/integration pillar |
| 2026-05-21 | 1.1.2 | Added homepage system coverage section from codebase inventory: Launch Setup, Support Control, Knowledge Governance, and Runtime Layer |
| 2026-05-21 | 1.1.3 | Added static product preview and public use-cases, integrations, resources, and updates pages; updated nav, footer, sitemap registry, and docs |
| 2026-05-21 | 1.1.4 | Added widget-first `/install`, made `/integrations` a redirect alias, and removed rollout-only API/adapters from buyer-facing website claims |
| 2026-05-21 | 1.1.5 | Expanded `/security` with a trust-page structure adapted to Canonica's implemented widget runtime, tenant isolation, governed answers, rate limits, summaries, and product separation |
| 2026-05-22 | 1.1.6 | Refreshed website to match current Canonica implementation: support knowledge control plane hero, hosted help, FAQ generation/management, product-scoped billing/support credits, cache freshness, and separate Firebase/product boundaries |
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
| 2026-05-23 | 1.2.9 | Replaced placeholder Canonica `C` assets with a Canonica-colored dimensional infinity logo family: SVG/PNG logo assets, favicon bundle, PWA icons, maskable icons, Apple touch icon, OpenGraph image, website header/footer, and dashboard sidebar |
| 2026-05-23 | 1.2.10 | Re-themed the shared product-feature page template so Knowledge Base, FAQ Management, Changelog, and Tickets no longer render a light-mode proof section, and set the Canonica route background to prevent white body bleed |
| 2026-05-23 | 1.2.11 | Replaced the dynamic product-feature route with explicit Knowledge Base, FAQ Management, Changelog, and Tickets pages backed by a shared route wrapper to avoid Next dev static-path worker failures |
| 2026-05-23 | 1.2.12 | Removed remaining light-mode mockup panels from the public demo, product capability template, and homepage widget section so newly added Canonica website pages match the dark visual system |
| 2026-05-23 | 1.2.13 | Replaced the simplified path-redrawn Canonica website mark with the approved dimensional mark SVG wrapper in public header and footer branding while keeping raster assets for metadata, favicon, and dashboard compatibility |
| 2026-05-23 | 1.2.14 | Added signed-in account visibility and an account-switch logout action to the self-service get-started form; Google sign-in now prompts account selection so founders can change email before workspace creation |
| 2026-05-23 | 1.2.15 | Added an existing-workspace state to `/get-started`: signed-in users with a valid Canonica product account now see Activation/Billing handoff actions instead of the workspace creation form, with no extra Firebase read; pure route constants were split from icon-heavy navigation metadata for public client-bundle discipline |
| 2026-05-23 | 1.2.16 | Added homepage-only section-band styling in `styles.css` so sections alternate through subtle dark shades with more vertical breathing space while keeping normal website browsing static and zero-Firebase-cost |
| 2026-05-23 | 1.2.17 | Added Canonica-specific viewport reveal motion through `CanonicaScrollReveal` and `scroll-reveal.css`, covering public page sections, semantic cards, rounded grid/link panels, CTA controls, and footer groups with reduced-motion support |
| 2026-05-23 | 1.2.18 | Added `SupportKnowledgeMapSection` on the homepage and Product page to make Canonica's source-map model self-explanatory without positioning it as a chatbot, helpdesk replacement, docs CMS, or autopilot |
| 2026-05-23 | 1.2.19 | Added Canonica-specific `llms.txt` and `llms-full.txt` routes so product-domain agents read Canonica as a support knowledge control plane, not as generic platform context, a helpdesk replacement, or an AI autopilot |
| 2026-05-23 | 1.2.20 | Added server-rendered WebPage/BreadcrumbList JSON-LD coverage across public Canonica routes, switched JSON-LD injection to the shared server helper, added WebSite route references, and verified robots/sitemap/LLM coverage with `verify:agent-readiness` |
| 2026-05-24 | 1.2.21 | Applied AI-built SaaS founder positioning: homepage hero now starts from the post-launch support problem, demo is the first proof, product/use-case/install/pricing/security/FAQ copy uses simpler buyer language before Canonica vocabulary, and `/use-cases/ai-built-saas` plus the `/use-cases/vibe-coded-saas` canonical alias were added without Firebase reads or new dependencies |
| 2026-05-24 | 1.2.22 | Updated the shared support knowledge map diagram on homepage and Product with a Canonica-colored logo core, ripple rings, dotted SVG routes, homepage-style pulse strokes, and border-only output arrival highlights |
| 2026-05-24 | 1.2.23 | Added the reusable Canonica flow-diagram system and applied it across homepage workflow sections, product-area pages, product-feature pages, SEO/use-case pages, install, security, resources, engine pillars, and system coverage while keeping normal browsing static and zero-Firebase-cost |
| 2026-05-24 | 1.2.24 | Added reusable proof blocks for decision tiles, before/after examples, and status snapshots; applied them to homepage fit qualification, widget states, trust controls, `/use-cases`, and `/security` to reduce text-heavy reading while preserving static zero-Firebase-cost browsing |
| 2026-05-24 | 1.2.25 | Aligned reusable Canonica sequence-diagram endpoints and output-highlight timing with the shared source-map reference while keeping the Canonica logo, ripple, and color treatment unchanged |
| 2026-05-24 | 1.2.26 | Synchronized the closed-loop diagram ring pulse and six card border highlights so the ring starts at step 01 and the cards flash in order within the same cycle |
| 2026-05-24 | 1.2.27 | Converted reusable sequence diagrams from horizontal strips into the shared input column, logo center, and output column layout used by the source-map diagrams |
| 2026-05-24 | 1.2.28 | Slowed the closed-loop ring and card-highlight animation to an 8.4-second loop-specific cycle while keeping the highlights synchronized with the ring pulse |
| 2026-05-24 | 1.2.29 | Added public Workflow Notifications and Proactive Help product-feature pages, converted `/integrations` from install alias to Slack/email notification page, and updated route registry, resources, FAQ, updates, LLM context, and docs for the hardened runtime scope |
| 2026-05-25 | 1.2.30 | Added website runtime-scaling copy across existing high-intent pages: compiled approved context, owner-visible bundle readiness, workspace-local daily governance, cache-first runtime delivery, and rollout-gated MCP boundaries without adding a dedicated public MCP page |
| 2026-05-25 | 1.2.31 | Added `DayOneLaunchPackSection` to homepage and Product, updated Resources/Pricing/Get Started/Security/LLM context, and kept the completed quickstarts, starter surfaces, import pack, install verifier, ROI/proof, and security one-pager as linked existing pages rather than new routes |
| 2026-05-25 | 1.2.32 | Refreshed existing public pages for production-ready widget image support: user-initiated screenshot upload/paste is now described on widget, install, quickstart, security, FAQ, SEO, updates, route metadata, and LLM surfaces, while automatic screenshot capture remains explicitly out of scope |
| 2026-05-26 | 1.2.33 | Formalized the initial dark website theme contract in `theme.ts`, aligned CSS variables and PWA manifest colors to the deep-navy palette, and moved inline-style primary/status colors onto shared Canonica theme tokens |
| 2026-05-27 | 1.2.34 | Replaced the public website's indigo primary with the Verdigris Control Plane palette: deep teal controls, teal signal accents, refreshed Canonica logo/SVG social colors, and matching docs |
| 2026-05-27 | 1.2.35 | Removed client-specific public relationship framing from Canonica website pages, route docs, and agent context so Canonica presents as an independent support knowledge control plane |
| 2026-05-27 | 1.2.36 | Added a Canonica-only contact inquiry API and client form, plus a mobile hamburger Other group card with safe-area bottom padding |
| 2026-05-27 | 1.2.37 | Added Support Board as a standalone public product-feature page and synchronized Support Control, FAQ, Resources, Updates, route metadata, LLM context, and docs with manual-first private workboard boundaries |
| 2026-05-27 | 1.2.38 | Added the Canonica Agent Install Layer: generated install pages, Markdown mirrors, public agent files, dashboard AI packet actions, and the stable `/widget/v1/canonica-widget.js` contract URL |
| 2026-05-27 | 1.2.39 | Converted Canonica public mobile navigation to a right-side drawer with backdrop, close handling, body scroll lock, and preserved grouped links |
| 2026-05-27 | 1.2.40 | Completed an end-to-end public-site audit and aligned install-route implementation docs with the live generated HTML install pages plus Markdown-only contract docs |
| 2026-05-27 | 1.2.41 | Fixed the mobile drawer animation lifecycle by separating mounted and visible state for right-to-left open and close transitions |
| 2026-05-27 | 1.2.42 | Added route icons to every Canonica mobile drawer row and the setup CTA using the existing Lucide icon stack |

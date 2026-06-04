# MenuList Main Website (menulist.ai)

**Version:** 3.6.25 (Website Auth Friction Cleanup)
**Status:** ✅ IMPLEMENTED — Canonical
**Last Updated:** June 2, 2026
**Workflow:** `.codex/workflows/website.md`

---

## Canonical Website Source

The current implementation is the only default MenuList marketing website.

| Canonical Version | Name | Core Message | Status |
| ----------------- | ---- | ------------ | ------ |
| **3.6.25** | **Website Auth Friction Cleanup** | **"Upload your current menu. Publish one official version customers can trust."** | **ACTIVE** |

Version 3.6.25 reduces public website auth friction without changing pricing, payment, or extraction runtime. Header, mobile drawer, `/get-started`, pricing purchase handoffs, and credit-pack handoffs now route owners to the central `/signin` page so phone OTP, Google, and passcode options remain available from one place. `/get-started` now acts as a calm directional page toward `/create-menu` or dashboard login, and footer/create-menu preview copy avoids defensive setup-protection language.

Version 3.6.15 adds the public `/resources` layer as an evergreen MenuList website surface. It ships a resources hub, 12 server-rendered article routes including Menu Source Audit, QR/Google/PDF/SEO/AI discovery guides, checklists, worksheet content, resource schema, platform discovery registry entries, static sitemap entries, robots crawler-policy sync, `llms.txt`/`llms-full.txt` coverage, a homepage resources section, and header/footer navigation. This is static public website content only; owner dashboard, auth, billing, Firebase, Cloud Functions, customer menu runtime, Canonica, Answerlattice, MyCodex, GrowthOS, and KitStamp surfaces were not changed.

Version 3.6.16 keeps Menu Card Export off the homepage as a standalone feature block and folds it into the existing lightweight website surfaces as `Print files`. The homepage workflow output, Features page card, and `/resources/digital-menu-vs-pdf-menu` now describe PDFs and printer handoff files as generated outputs from the current approved menu, not as a separate public source. This is copy/content alignment only; pricing, payment, subscription, auth, onboarding, Firebase, Cloud Functions, customer menu runtime, and Vercel deployment were not changed.

Version 3.6.17 adds structured resource localization guardrails and completes Hindi long-form resource coverage. Resource localization now uses source-versioned locale packs, stable section IDs, stable FAQ IDs, reviewed status, and `npm run verify:website-resource-locales` to catch missing article sections, stale source versions, forbidden claims, and English body fallback. Hindi (`hi-IN`) now covers the resources hub and all 12 resource articles. Tamil, Telugu, Marathi, and Bengali were deferred at this stage until full reviewed packs and locale-prefixed routes were implemented.

Version 3.6.18 adds reviewed Hindi resource URLs at `/hi-IN/resources` and `/hi-IN/resources/[slug]`. The Hindi routes share the same resource shell as English, expose localized metadata and JSON-LD `inLanguage`, include `hreflang` alternates in sitemap coverage, and are listed in LLM context files. Tamil, Telugu, Marathi, and Bengali were still held out of discovery at this stage until full reviewed packs existed.

Version 3.6.19 completes the first Indian-language resource rollout by adding reviewed Tamil, Telugu, Marathi, and Bengali packs for the resources hub and all 12 resource articles. The reviewed route layer now covers `/hi-IN/resources`, `/ta-IN/resources`, `/te-IN/resources`, `/mr-IN/resources`, and `/bn-IN/resources`, with localized metadata, JSON-LD `inLanguage`, sitemap `hreflang`, and LLM context coverage. This is static public website content only; owner dashboard, customer menu runtime, auth, billing, Firebase, Cloud Functions, Answerlattice, Canonica, MyCodex, GrowthOS, and KitStamp surfaces were not changed.

Version 3.6.20 completes long-form resource coverage for every language in the public website switcher by adding reviewed Arabic and Spanish packs for the resources hub and all 12 resource articles. Reviewed resource routes now cover `/hi-IN/resources`, `/ta-IN/resources`, `/te-IN/resources`, `/mr-IN/resources`, `/bn-IN/resources`, `/ar-SA/resources`, and `/es-ES/resources`, with localized metadata, JSON-LD `inLanguage`, sitemap `hreflang`, LLM context coverage, locale JSON loading, and Arabic RTL direction support. This is static public website content only; owner dashboard, customer menu runtime, auth, billing, Firebase, Cloud Functions, Answerlattice, Canonica, MyCodex, GrowthOS, and KitStamp surfaces were not changed.

Version 3.6.21 updates the website to match the complete resources navigation and discovery strategy without changing product runtime. Header navigation is Features -> How it works -> Multi-location -> Pricing -> Resources, desktop Resources opens a compact dropdown, mobile navigation exposes the same resource cluster, the homepage includes the eight-card "Learn how to keep your public menu current" bridge, footer resource links point to the core resource set, robots/LLM files carry modest official-source positioning, and GA4-only resource measurement includes resource-to-upload and resource-to-pricing events.

Version 3.6.22 expands the public content/discovery layer with three additional resource articles (`/resources/restaurant-menu-schema`, `/resources/official-menu-url-checklist`, and `/resources/restaurant-qr-menu-mistakes`), reviewed coverage for those articles across all active resource locale packs, four industry landing pages under `/industries/`, sitemap/LLM discovery coverage, and a real checklist-copy UI that emits `resource_checklist_copy` only when checklist content exists. Downloadable template tracking remains intentionally unimplemented until real downloadable assets are designed and QA'd.

Version 3.6.23 applies the marketing-team feedback pass to the highest-value English resource and industry surfaces without adding thin pages or changing product runtime. `/resources/official-menu-source`, `/resources/menu-source-audit`, `/resources/google-business-profile-menu`, `/resources/qr-menu-for-restaurants`, `/resources/multi-location-menu-management`, and `/industries/restaurants` now use `Official Menu Source` as the category concept and `current approved menu` as the owner-readable explanation. Candidate pages for WhatsApp links, price changes, cleanup, and comparisons remain documented for later content work after the core pages are polished.

Version 3.6.24 adds the long-term public truth indexing guardrail from the business-page strategy review. Existing tenant OBP/menu metadata and per-tenant sitemap output now use `src/lib/seo/publicTruthIndexing.ts` so expired, blocked, starter, weak, or incomplete public truth records stay reachable but receive `noindex, follow` and stay out of sitemap. OBP runtime now relies on visible business-record schema instead of generated hidden FAQPage JSON-LD. This does not create directory pages, keyword-variant restaurant pages, unclaimed business records, owner dashboard changes, Firebase changes, Cloud Function changes, or new marketing resource pages.

Version 3.5.0 keeps the official customer-source hero but compresses the homepage around a faster buyer path: Hero -> Problem -> Source-to-public bridge -> Setup relief -> Public surfaces -> Customer preview -> Real-world rollout -> FAQ -> CTA. Dense advanced proof sections such as analytics, search/AEO, POS Sync, staff access, and industry breadth remain available in supporting pages/components, but they are no longer part of the primary homepage scroll. The header now exposes a Demo path to the customer preview, public branding renders as `MenuList`, hero setup copy matches the 7-day setup pricing language, and security copy avoids absolute password-breach claims. Pricing, payment, subscription, Razorpay, auth, onboarding, and `/create-menu` runtime logic were not changed.

Version 3.5.1 adds system dark mode to the public website without changing the default light-mode positioning. Dark mode uses dark gray `#121212`-family surfaces instead of pure black, and the shared website tokens now cover headers, sections, cards, pricing, forms, drawers, and supporting create-menu pages. Pricing, payment, subscription, Razorpay, auth, onboarding, and `/create-menu` runtime logic were not changed.

Version 3.5.2 is a final theme polish pass after dark-mode QA. It keeps the same website structure and copy, but tightens sticky CTA theming, dark panel microcopy contrast, footer utility-link contrast, and the How It Works / Multi-location flow-diagram supporting text so dark mode reads as a finished design instead of a token-only inversion.

Version 3.5.3 moves non-primary preferences out of the header and into the revenue footer. The header no longer carries the language selector; social links sit under the company email, the footer source line is centered in the bottom row, and compact Language / Theme dropdowns sit on the bottom-right. The theme dropdown is backed by the existing `ThemeProvider`.

Version 3.5.4 tightens the homepage hero vertical rhythm and introduces a shared `WebsiteFeatureCard` pattern for public website cards. Homepage proof cards, setup/rollout cards, Product page surface cards, Features page cards, About principles, Get Started setup cards, Pricing decision cards, and Trust/Security pillars now use the same spacious top-right-icon card language. Pricing, payment, subscription, Razorpay, auth, onboarding, and `/create-menu` runtime logic were not changed.

Version 3.5.5 tightens dark-mode color cohesion across the public website. Dark mode now uses one dark-gray surface family, one blue action family, muted semantic colors, and shared contrast-panel tokens for footer, proof bands, discovery panels, phone frames, and supporting card surfaces. Light mode structure/copy, pricing, payment, subscription, Razorpay, auth, onboarding, and `/create-menu` runtime logic were not changed.

Version 3.5.6 replaces the compact homepage workflow pipeline with a source map: current menu inputs on the left, the official MenuList logo plus owner-review gate in the center, and public customer outputs on the right. This improves first-visit comprehension while keeping the hero focused on product/customer proof. Pricing, payment, subscription, Razorpay, auth, onboarding, and `/create-menu` runtime logic were not changed.

Version 3.5.7 replaces the older animated dark SVG diagrams on `/how-it-works` and `/multi-location` with calmer supporting-page source maps. `/how-it-works` now shows current menu inputs -> MenuList owner review -> customer surfaces. `/multi-location` now shows an approved master menu -> outlet update governance. Labels were tightened away from generic "web page/app" wording. Pricing, payment, subscription, Razorpay, auth, onboarding, and `/create-menu` runtime logic were not changed.

Version 3.5.8 removes the old homepage `SolutionSection` because its one-source diagram and bullet grid repeated the hero, public-drift problem, new workflow source map, setup proof, and public-surface proof. The category bridge now flows directly from Problem into `InteractiveWorkflowSection`, reducing homepage length and visual repetition without removing the official-source claim from active copy. Pricing, payment, subscription, Razorpay, auth, onboarding, and `/create-menu` runtime logic were not changed.

Version 3.5.9 hardens the public agent-readable context files after reviewing Chrome's agentic web / WebMCP guidance. `public/llms.txt` and `public/llms-full.txt` now state what public agents may read, which official handoff links they may route to, and which actions remain owner/admin-only. Homepage layout, pricing, payment, subscription, Razorpay, auth, onboarding, and `/create-menu` runtime logic were not changed.

Version 3.6.0 completes the website-layer SEO/AEO hardening pass for the agentic web. Homepage JSON-LD is server-rendered, active marketing/legal pages emit page-level WebPage and BreadcrumbList JSON-LD, discovery URLs use `https://menulist.ai`, `/product` remains a framework-level permanent legacy redirect but is omitted from sitemap/LLM discovery, and `npm run verify:agent-readiness` validates MenuList and Answerlattice discovery surfaces. WebMCP, MCP, pricing, payment, subscription, Razorpay, auth, onboarding, and `/create-menu` runtime logic were not changed.

Version 3.6.1 removes repeated reassurance and surface-list copy from the public website. The homepage final CTA is now title/subtitle/CTA only, supporting-page heroes no longer repeat the phone/PWA and review-before-publish helper lines, the pricing page no longer repeats the full customer-surface promise, and the footer/FAQ/hero copy now use shorter official-source language. Pricing, payment, subscription, Razorpay, auth, onboarding, and `/create-menu` runtime logic were not changed.

Version 3.6.2 keeps the homepage workflow source map as a three-part structure on mobile instead of collapsing it into a long vertical list. The compact phone layout preserves inputs -> MenuList owner review -> public outputs while reducing mobile scroll height. Copy, pricing/payment runtime, subscription behavior, auth behavior, owner-dashboard behavior, upload/extraction flow, and public customer menu runtime were not changed.

Version 3.6.3 extends the same mobile source-map treatment to the supporting-page diagrams. `/how-it-works` now keeps source inputs -> MenuList owner review -> customer surfaces on phone screens, and `/multi-location` keeps approved master -> linked outlet cards instead of collapsing into a plain vertical stack. The active source-map audit found three mounted website diagrams: homepage workflow, How It Works, and Multi-location. Copy, locale strings, pricing/payment runtime, subscription behavior, auth behavior, owner-dashboard behavior, upload/extraction flow, and public customer menu runtime were not changed.

Version 3.6.4 adjusts the mobile-only diagram rules after visual review. The homepage workflow and `/how-it-works` source map now read as three mobile rows: inputs spread horizontally, MenuList owner review centered, and outputs below, with subtle static dotted connectors aligned to that row layout and anchored to card edges. `/how-it-works` keeps outputs as two rows of three cards; `/multi-location` keeps a compact mobile master-to-outlet flow with three outlet cards while desktop still shows five. The homepage, How It Works, and Multi-location diagrams now share theme-aware light and dark treatment instead of mixing light homepage cards with dark supporting-page maps in light mode. Copy, locale strings, desktop layouts, pricing/payment runtime, subscription behavior, auth behavior, owner-dashboard behavior, upload/extraction flow, and public customer menu runtime were not changed.

Version 3.6.5 adds a subtle live pulse layer to the three website source-map diagrams. The static dotted connector paths remain in place, and the pulse travels from source inputs into MenuList, pauses while the center rings keep a light always-on pulse around the logo, then moves from MenuList toward the output cards; the multi-location diagram pulses from the approved master toward outlet cards. Destination cards briefly highlight only their existing border when the pulse reaches them. The animation is CSS/SVG-only and disabled for reduced-motion users. Copy, locale strings, desktop layouts, pricing/payment runtime, subscription behavior, auth behavior, owner-dashboard behavior, upload/extraction flow, and public customer menu runtime were not changed.

Version 3.6.6 renames the homepage workflow section from a literal "How it works" framing to a source-to-public value bridge: "One menu becomes every customer surface." The homepage keeps the simpler four-output diagram after the problem section, while `/how-it-works` remains the deeper explanation page with the fuller output set. Diagram structure, route order, pricing/payment runtime, subscription behavior, auth behavior, owner-dashboard behavior, upload/extraction flow, and public customer menu runtime were not changed.

Version 3.6.7 changes the multi-location diagram pulse from sequential outlet lines to simultaneous outlet propagation, matching the product promise that approved master updates can reach linked outlets together. The master card now uses the same card surface, border radius, and border treatment as outlet cards, and the MenuList logo no longer sits inside a separate filled icon tile. Copy, route order, pricing/payment runtime, subscription behavior, auth behavior, owner-dashboard behavior, upload/extraction flow, and public customer menu runtime were not changed.

Version 3.6.8 rebuilds the multi-location pulse layer away from sequential outlet timing so approved master updates read as simultaneous propagation to linked outlets. Copy, route order, pricing/payment runtime, subscription behavior, auth behavior, owner-dashboard behavior, upload/extraction flow, and public customer menu runtime were not changed.

Version 3.6.9 aligns the `/how-it-works` supporting source-map output connector origin with the homepage source-map pattern so output paths begin under the center logo/ring and visually emerge from the core boundary. It also strengthens the supporting source-map ring ripple in light mode while preserving the calmer dark-mode ring treatment. Copy, route order, pricing/payment runtime, subscription behavior, auth behavior, owner-dashboard behavior, upload/extraction flow, and public customer menu runtime were not changed.

Version 3.6.10 changes the multi-location diagram to use the same animated pulse-stroke pattern as the homepage source map instead of custom moving circle dots. The static dotted paths remain in place, the pulse path uses `ws-map-pulse-flow` with the same dash shape and duration as the homepage, and all outlet paths stay synchronized. Copy, route order, pricing/payment runtime, subscription behavior, auth behavior, owner-dashboard behavior, upload/extraction flow, and public customer menu runtime were not changed.

Version 3.6.11 aligns the main website with production-ready Menu Link Import without adding a separate homepage section. The homepage workflow and `/how-it-works` source maps now include an owner-provided existing menu link as a source input beside photo, PDF, and typed text. Copy stays conservative: MenuList prepares an owner-reviewed version and does not claim generic scraping, marketplace import, or automatic publishing. Pricing, payment, subscription, Razorpay, auth, onboarding, public `/create-menu` runtime internals, and public customer menu runtime were not changed.

Version 3.6.12 tightens the shared `WebsiteFeatureCard` vertical rhythm after visual QA found excessive empty space between blue subtitles and body copy in public-surface cards. Cards now stack heading, subtitle, and description as one readable proof unit, and grid rows size from their tallest card content instead of a fixed-feeling card minimum. Copy, locale strings, page order, pricing/payment runtime, subscription behavior, auth behavior, owner-dashboard behavior, upload/extraction flow, and public customer menu runtime were not changed.

Version 3.6.13 reverses the shared headline/accent gradient so large highlighted text starts with the stronger MenuList blue and resolves into the lighter accent. The official logo mark gradient was not changed. Copy, locale strings, page order, pricing/payment runtime, subscription behavior, auth behavior, owner-dashboard behavior, upload/extraction flow, and public customer menu runtime were not changed.

Version 3.6.14 makes Menu Link Import a public `/create-menu` input after validating the feature against the existing authenticated importer. The public starter funnel now supports either a menu photo upload or an owner-provided public menu link before sign-in. Link import stays guarded by `ENABLE_MENU_LINK_IMPORT`, requires explicit permission confirmation, reuses the SSRF-safe acquisition helper, stays under the public menu-entry IP rate limit, creates only a temporary review draft, and never publishes imported content until an authenticated owner claims and approves the setup.

Old runnable/source-code backups have been removed. Historical research and staged planning docs may remain as reasoning records, but they are not website versions and must not be used as restoration sources.

---

## Quick Navigation

| Audience        | Document                                         | Purpose                                             |
| --------------- | ------------------------------------------------ | --------------------------------------------------- |
| CEO / PM        | [Spec](./main-website_spec.md)                   | Product and website strategy context                |
| Developers      | [Impl](./main-website_impl.md)                   | File structure, routes, components, technical stack |
| Sales/Marketing | [Marketing](./main-website_marketing.md)         | Marketing and growth context                         |
| Design/Dev      | [Design System](./main-website_design-system.md) | Colors, typography, spacing, components             |
| Design/Dev      | [Image Assets](./main-website_image-assets.md)   | Image & asset requirements                          |
| Content         | [Content](./main-website_content.md)             | Page-by-page copy specification                     |
| Content/Strategy | [Resources Plan](./main-website_resources-plan.md) | Planning tracker for Resources + AI discovery content layer |
| Content/Strategy | [Resources Localization Plan](./main-website_resources-localization-plan.md) | Resource translation and management plan for active website languages |
| Dev / QA        | [Resources Validation](./main-website_resources-validation.md) | Implementation verification log for the Resources layer |
| Dev / SEO       | [SEO & AEO](./main-website_seo-aeo.md)           | Title tags, meta, schema, AEO strategy              |
| Marketing / SEO | [SEO/AEO Marketing Brief](./main-website_seo-aeo-marketing-brief.md) | Shareable summary of resource, industry, discovery, page-title, and marketing-review coverage |
| Strategy/AI     | [Website Prep Codex Prompts](./website-prep-codex-prompts/README.md) | Staged prompt pack for repo-grounded website strategy, visual direction, implementation, launch, and governance |

### Archive (Historical Research Only)

| Document                                                                                                  | Purpose                                            |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [\_archive/main-website_chatgpt-analysis.md](./_archive/main-website_chatgpt-analysis.md)                 | ChatGPT conversation analysis                      |
| [\_archive/main-website_web-research.md](./_archive/main-website_web-research.md)                         | Industry research (2025-2026)                      |
| [\_archive/main-website_cascade-approach.md](./_archive/main-website_cascade-approach.md)                 | Cascade's independent design approach              |
| [\_archive/main-website_final-approach.md](./_archive/main-website_final-approach.md)                     | Historical merged approach, superseded by current implementation |
| [\_archive/main-website_site-architecture.md](./_archive/main-website_site-architecture.md)               | Historical wireframes, superseded by current implementation |
| [\_archive/main-website_existing-site-audit.md](./_archive/main-website_existing-site-audit.md)           | Pre-rebuild audit of old site                      |

These archived documents are not source-code backups and are not restoration targets.

---

## Key Files in Codebase

| File                                                        | Purpose                                        |
| ----------------------------------------------------------- | ---------------------------------------------- |
| `src/app/(website)/layout.tsx`                              | Shared layout (locale, auth, theme, analytics) |
| `src/app/(website)/page.tsx`                                | Homepage route                                 |
| `src/app/(website)/WebsiteAuthProvider.tsx`                 | Auth context for pricing/onboarding flows      |
| `src/components/website/home/HomePage.tsx`                  | Current compressed homepage composition plus sticky CTA |
| `src/components/website/Header.tsx`                         | Shared header (all pages)                      |
| `src/components/website/Footer.tsx`                         | Shared footer (all pages)                      |
| `src/components/website/resources/`                          | Resource hub, article layout, cards, schema, and GA4-only resource tracking |
| `src/components/website/industries/`                          | Shared industry landing-page component for MenuList-fit pages |
| `src/content/websiteResources/`                              | Typed localized resource content registry      |
| `src/content/websiteIndustries.ts`                            | Typed industry landing-page registry           |
| `src/lib/website/resourceSchema.ts`                           | Resource WebPage, Article, BreadcrumbList, FAQPage, and ItemList JSON-LD builders |
| `src/components/seo/JsonLdScript.tsx`                       | Shared server-rendered JSON-LD script helper   |
| `src/components/website/shared/LogoMark.tsx`                | Official MenuList logo mark used by website header/footer |
| `src/components/website/shared/WebsiteFeatureCard.tsx`      | Shared spacious top-right-icon card for website proof and feature grids |
| `src/components/website/SchemaMarkup.tsx`                   | Server-rendered homepage JSON-LD schema        |
| `src/components/website/WebsitePageStructuredData.tsx`      | Page-level WebPage and BreadcrumbList JSON-LD  |
| `src/components/website/GoogleAnalytics.tsx`                | GA tracking                                    |
| `src/components/website/ClarityAnalytics.tsx`               | Microsoft Clarity tracking                     |
| `src/components/website/shared/WebsiteLanguageSwitcher.tsx` | Language dropdown (8 languages)                |
| `src/config/websiteLanguages.ts`                            | Language configuration                         |
| `public/locales/menulist.ai/en-US.json`                     | Website locale default + base file (Website namespace) |
| `src/styles/website.css`                                    | Website-specific styles                        |
| `src/config/features.ts`                                    | `ENABLE_PUBLIC_MENU_ENTRY` and `ENABLE_WEBSITE_RESOURCES` flags |
| `scripts/verification/verify-agent-readiness.js`            | MenuList + Answerlattice route/discovery/structured-data verifier |

Supported website locale files:
- `public/locales/menulist.ai/en-US.json`
- `public/locales/menulist.ai/hi-IN.json`
- `public/locales/menulist.ai/ta-IN.json`
- `public/locales/menulist.ai/te-IN.json`
- `public/locales/menulist.ai/mr-IN.json`
- `public/locales/menulist.ai/bn-IN.json`
- `public/locales/menulist.ai/ar-SA.json`
- `public/locales/menulist.ai/es-ES.json`

---

## Feature Flags

| Flag                       | Default | Purpose                           |
| -------------------------- | ------- | --------------------------------- |
| `ENABLE_PUBLIC_MENU_ENTRY` | `true` | Gates `/create-menu` public entry |
| `ENABLE_WEBSITE_RESOURCES` | `true` | Gates `/resources`, resource navigation, and public discovery content |

**Note:** `ENABLE_NEW_WEBSITE` was removed. The current active homepage is the Stage 4/5 official-source implementation.

---

## Current Canonical Scope

The current homepage is the default. It preserves official-source positioning while prioritizing first-visit conversion jobs: fast problem recognition, upload/review/publish clarity, public-surface proof, customer-preview proof, rollout confidence, FAQ trust, and final CTA confidence.

Protected production surfaces remain out of scope unless separately approved:

- `/pricing`
- pricing components
- subscription/payment hooks
- Razorpay APIs
- auth wrappers
- onboarding/payment behavior
- `/create-menu` extraction, preview, claim, and publish runtime internals

No old website source-code backup is kept in this repo. If future changes replace the canonical website, remove dead alternate source code after validation instead of keeping parallel website implementations.

## Stage 6 Asset Production Scope

Stage 6 is complete as a production plan, not a homepage rebuild. It defines the screenshot capture order, demo-data needs, hero/OG composite direction, public-menu/OBP screenshot requirements, and launch asset priority matrix.

Current Stage 6 output:

- `__docs__/main-website/website-prep-codex-prompts/stage-06-output-screenshot-asset-production-system.md`

Active asset requirements:

- `__docs__/main-website/main-website_image-assets.md`

Stage 6 keeps the current coded homepage visuals as launch-safe placeholders until real product-derived screenshots and composites are produced. Pricing, payment, subscription, Razorpay, auth wrappers, onboarding payment behavior, and `/create-menu` runtime logic remain protected out of scope.

## Stage 8 Homepage Compression + Conversion Proof Pass

Stage 8 is complete as a homepage flow/copy pass driven by live-site audit feedback. It validates the useful parts of the external feedback without treating it as source-of-truth over the repo.

Active decisions:

- Keep the codebase and current product capability as the source of truth.
- Move the public drift/problem section directly after the hero.
- Merge the old revenue-path/workflow repetition by removing `RevenuePathSection` from the homepage composition and letting `InteractiveWorkflowSection` carry upload -> review -> publish -> share.
- Keep advanced proof sections (`SearchDiscoverySection`, `AnalyticsInsightsSection`, `SmartFeaturesSection`, `BusinessSection`, `IndustrySection`, `StatsSection`) in the repo for supporting pages/future use, but remove them from the primary homepage scroll.
- Add a header Demo link to `#customer-demo`.
- Point the hero secondary CTA to the customer menu preview.
- Align hero pricing microcopy with the 7-day setup language.
- Render the public website wordmark as `MenuList`, not `MenuList AI`.
- Use "saved menu shortcut" in homepage-facing copy where "Customer app" could sound like a native app-store promise.
- Keep search/AEO, POS Sync, analytics, staff access, multi-location, and industry breadth conservative and supporting-page-led.
- Include feedback on the homepage only as a small public-correction card: customers can flag wrong public details, and owners correct the same approved source. Do not frame it as reviews, reputation management, or testimonials.

## Stage 6.3 P0 Fictional Demo Asset Pack

Stage 6.3 supersedes the earlier Stage 6.1 draft asset pack with a fictional founder-approved demo business named **The Daily Plate**. This was needed because current tenant data is temporary and unapproved third-party extracted menu data must not be used publicly.

The latest generator pass was cross-checked against the real MenuList public surface anatomy and the Habibis reference captures in `asset-production/stage-06-4-reference/`. The generated pack intentionally keeps the website's light marketing theme instead of copying Habibis' dark customer theme, because customer public pages can follow each business brand. The OBP/menu structures now mirror the real product pattern: language pills, business identity, service modes, official/open badges, action buttons, menu cards, search, category chips, featured/category rhythm, item cards, and owner-approved source status.

Generated assets:

- `public/images/website/menulist-hero-official-source.webp`
- `public/images/website/menulist-og-official-source.png`
- `public/images/website/menulist-public-menu-mobile.webp`
- `public/images/website/menulist-obp-browser.webp`
- `public/images/website/menulist-setup-relief-workflow.webp`
- `public/images/website/menulist-public-surfaces-matrix.webp`
- `public/images/website/menulist-analytics-proof.webp`
- `public/images/website/menulist-launch-square.png`
- `public/images/website/menulist-linkedin-launch.png`
- `public/og-image.png`

Generator:

- `scripts/website-assets/generate-stage6-assets.mjs`

Stage output:

- `__docs__/main-website/asset-production/stage-06-3/stage-06-3-p0-fictional-demo-asset-pack.md`

Reference captures used for structure only:

- `__docs__/main-website/asset-production/stage-06-4-reference/habibis-root-mobile.png`
- `__docs__/main-website/asset-production/stage-06-4-reference/habibis-root-desktop.png`
- `__docs__/main-website/asset-production/stage-06-4-reference/habibis-menu-mobile.png`

These visuals are launch-safe demo product visuals, not screenshots from a real customer account. They should be replaced with routed product screenshots after a clean founder-approved demo tenant is prepared.

Historical Stage 6.1 draft output:

- `__docs__/main-website/website-prep-codex-prompts/stage-06-1-output-synthetic-launch-asset-pack.md`

## Stage 6.2 Clean Demo Captures

Stage 6.2 produced private browser-rendered synthetic demo captures for asset planning without adding a deployed route or touching tenant data.

Capture board:

- `__docs__/main-website/asset-production/stage-06-2/demo-screenshot-board.html`

Private captures:

- `__docs__/main-website/asset-production/stage-06-2/captures/hero-official-source.png`
- `__docs__/main-website/asset-production/stage-06-2/captures/public-menu-mobile.png`
- `__docs__/main-website/asset-production/stage-06-2/captures/official-business-page.png`
- `__docs__/main-website/asset-production/stage-06-2/captures/setup-review-workflow.png`
- `__docs__/main-website/asset-production/stage-06-2/captures/public-surfaces-matrix.png`
- `__docs__/main-website/asset-production/stage-06-2/captures/analytics-proof.png`

Stage output:

- `__docs__/main-website/website-prep-codex-prompts/stage-06-2-output-clean-demo-screenshot-capture.md`

These captures are private art-direction/source references. They are not public customer proof and should not be moved into `public/images/website/` until the synthetic identity is explicitly approved or replaced by a founder-approved demo tenant.

## Stage 7 Final Launch Polish

Stage 7 completed the final launch-readiness pass for the current homepage and asset system.

Stage output:

- `__docs__/main-website/website-prep-codex-prompts/stage-07-output-final-launch-polish-production-readiness.md`

Visual QA captures:

- `__docs__/main-website/asset-production/stage-07/homepage-desktop-stage-07.png`
- `__docs__/main-website/asset-production/stage-07/homepage-mobile-stage-07.png`

Stage 7 fixed:

- small-screen hero headline/subtitle clipping,
- small-screen header width pressure,
- small-screen hero source-card value clipping,
- website locale wording that violated launch language rules (`Smart menu upload`, exclamation-mark success copy).
- one older supporting-page line that implied automatic accuracy beyond the current source model.

Stage 7 recommendation:

- Homepage is ready for controlled launch/founder review.
- Full marketing-site launch still needs supporting page claim-hardening and founder-approved demo tenant screenshots.

## Brand Mark Source

Website header/footer logo rendering must use the official MenuList mark geometry from `public/icons/android-chrome-512x512.png` / `src/components/atoms/animatedVerticalLogo/index.tsx`. Do not recreate alternate rounded-stroke logo SVGs for website surfaces. All files under `public/icons/` remain the PWA/app-icon source and should not be overwritten during website logo polish.

## Stage 7.2 Reference-Informed Revenue Readiness

Stage 7.2 reviewed reference sites and successful marketing-site patterns, then applied only the parts that fit MenuList's owner-trust strategy.

Reference output:

- `__docs__/main-website/website-prep-codex-prompts/stage-07-2-output-reference-revenue-readiness-pass.md`

Implemented change:

- Footer upgraded into a revenue-focused conversion/resource layer with closing CTA, proof cards, product/start/resource/legal navigation, and clearer approved-menu positioning.

Rejected from references:

- generic SaaS decoration,
- playful hype tone,
- unsupported logos/testimonials/metrics,
- enterprise-heavy proof claims,
- AI-startup visual language.

## Stage 7.3 Reference-Informed Whole-Page Layout

Stage 7.3 corrected the Stage 7.2 scope issue. The reference review now affects the homepage flow, not only the footer.

Reference output:

- `__docs__/main-website/website-prep-codex-prompts/stage-07-3-output-reference-informed-page-layout-pass.md`

Implemented change:

- Added a revenue-path section after the hero so visitors understand how a current menu source becomes customer action.
- Redesigned the problem section into a split public-drift narrative instead of generic issue cards.
- Redesigned the source/proof numbers into a stronger proof band.
- Added setup and industry anchors so the page can route visitors into proof areas.

## Stage 7.5 Supporting-Page Revenue Polish

Stage 7.5 extended the current canonical website direction across supporting pages so the marketing site feels like one system, not a polished homepage with older secondary pages.

Implemented changes:

- Added `WebsitePageHero.tsx` and `WebsiteProofStrip.tsx` for consistent supporting-page hero and proof treatment.
- Strengthened `/about`, `/contact`, `/get-started`, and `/trust-security` around official-source, owner-control, setup clarity, and trust language.
- Hardened pricing page marketing copy while preserving existing pricing, payment, Razorpay, auth, subscription, and onboarding runtime logic.
- Softened public overclaims around "instant" propagation and raw implementation jargon on `/how-it-works`, `/multi-location`, pricing support copy, and trust/security.
- Kept the current website as the only source-code version. No old website backup or alternate version was reintroduced.

Protected scope:

- Pricing, payment, Razorpay, subscription, billing, auth, checkout, and create-menu logic remained untouched.

## Stage 7.4 Copy, Case, and Motion Polish

Stage 7.4 reviewed visible homepage wording, grammar, capitalization, CSS typography rules, and motion behavior after the whole-page reference pass.

Stage output:

- `__docs__/main-website/website-prep-codex-prompts/stage-07-4-output-copy-css-motion-polish.md`

Implemented change:

- Normalized owner-facing wording in the homepage `Website` copy, especially `RevenuePath`, workflow labels, analytics labels, public-surface names, and footer navigation.
- Replaced internal/revenue-review phrasing with customer-facing wording that explains how a current menu source becomes public action.
- Standardized casing for public surfaces such as `QR menu`, `public page`, `Official Business Page`, `digital screens`, `Print/PDF`, and `saved menu shortcut`.
- Removed viewport-based website font scaling and negative letter spacing from `website.css`; website headings and labels now keep stable letter spacing.
- Added subtle hover motion to proof/path/problem elements and reduced-motion safeguards for CSS transitions and Framer Motion scroll reveals.

Protected scope:

- Pricing, payment, Razorpay, subscription, billing, auth, checkout, and create-menu logic remained untouched.

---

## Key Decisions (Canonical)

| Decision         | Choice                                                        | Reason                                                |
| ---------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| Positioning      | Official customer-facing source                               | Preserves MenuList as business truth infrastructure   |
| ICP              | Non-technical SMB owner first; chain operators second          | Clear buying pain without enterprise-heavy language   |
| Visual direction | Direction A — Official Source Authority                       | Calm, credible, product-led                           |
| Tone             | Premium calm, operationally clear, low hype                   | Supports trust and owner comprehension                |
| CTA              | "Upload your menu →"                                          | Matches the non-technical owner action and routes to `/create-menu` |
| Hero message     | "Upload your current menu. Publish one official version customers can trust." | Explains the owner-controlled transformation before infrastructure depth |
| Homepage shape   | 16 focused sections plus sticky CTA                           | Adds a whole-page revenue path while preserving official-source discipline |
| Proof strategy   | Public output, customer browse proof, deployment surfaces      | Shows value through believable product evidence       |
| Protected scope  | Pricing/payment/auth/onboarding logic untouched               | Avoids breaking production billing and subscription flows |
| Dark/Light mode  | Light mode primary (website only)                             | SMB trust and readability                             |
| Asset data policy | Synthetic demo content until a clean demo tenant exists       | Avoids publishing unapproved customer or extracted third-party menu data |
| Private capture policy | Stage 6.2 captures stay under `__docs__/` until approved | Keeps screenshot planning separate from public website assets |
| Launch readiness policy | Homepage and supporting pages now share official-source claim discipline; screenshots still need founder-approved demo data before broad proof-heavy launch | Prevents older v2 copy from weakening current official-source positioning |
| Reference adaptation policy | Borrow conversion architecture only, not visual trends | Keeps MenuList self-selling without diluting infrastructure trust |
| Copy/case policy | Use owner-facing grammar and consistent product-surface casing | Prevents the homepage from sounding internal, generic, or visually inconsistent |
| Motion policy | Subtle hover/reveal motion with reduced-motion support | Adds polish without creating noisy SaaS animation |
| Version policy | Current website is the only source-code version | Prevents drift, duplicate code paths, and accidental restoration of stale marketing |

## Stage 7.6 Funnel Clarity and Claim Discipline

Stage 7.6 keeps `/create-menu` as the canonical public path while requiring a free owner account before upload/extraction and keeping billing/payment internals protected.

Implemented change:

- Primary public CTAs now route to `/create-menu`.
- Header and setup-page login actions call Google sign-in directly instead of sending returning owners to pricing.
- `/get-started` now acts as a guided setup/sign-in page with `/create-menu` as the primary action.
- Pricing gained a decision strip above the plan cards to explain start free, publish/share, and scale by location before plan comparison.
- Public copy was softened where it previously implied automatic external sync, instant correctness, or always-correct public data.

Protected scope:

- Pricing, payment, Razorpay, subscription, billing, checkout, plan selection, and `/create-menu` upload/extraction/claim internals were not redesigned.

## Stage 7.7 Mobile Website Polish

Stage 7.7 reviewed the website from a phone viewport and tightened the mobile layout without changing the product strategy.

Implemented change:

- Fixed the missing `--ws-space-18` website spacing token.
- Increased mobile tap targets for header controls, website CTAs, sticky CTA, and footer/social links.
- Compacted homepage mobile rhythm for the hero, revenue path, workflow cards, proof band, and footer navigation.
- Kept revenue-path links in a safe two-column mobile grid where the viewport supports it.
- Rechecked key website pages at a 390px mobile viewport: `/`, `/pricing`, `/features`, `/how-it-works`, `/multi-location`, `/get-started`, and `/create-menu`.
- Normalized stale non-primary locale overrides on `/multi-location` so mobile visitors do not see older "instant / in seconds / always consistent" claims.

Reference principles used:

- Mobile layout starts from readable first-screen clarity and one clear primary action.
- Interactive targets should be comfortably tappable on phones.
- Marketing sections must reduce scroll fatigue by using tighter cards, smaller gaps, and safe two-column grids only where labels remain readable.

Protected scope:

- Pricing, payment, Razorpay, subscription, billing, checkout, auth, and `/create-menu` runtime logic were not changed.

## Stage 7.8 Search & AI Discovery Homepage Proof

Stage 7.8 added a homepage `SearchDiscoverySection` after public surfaces. The section translates shipped owner/product capability into non-technical buyer language:

- SEO and AEO settings exist on owner desktop and mobile surfaces.
- Business Copy Setup can prepare Official Page, SEO/AEO, and Customer App copy from current business/menu details.
- Public pages expose structured business/menu facts, sitemap signals, robots rules, and LLM discovery files.
- The page explicitly avoids ranking, citation, and placement guarantees.

Protected scope:

- SEO/AEO runtime, `/api/seo`, Business Copy Setup, mobile owner screens, pricing, payment, Razorpay, auth, and create-menu runtime logic were not changed.

## Stage 7.9 Owner Reassurance Placement

Stage 7.9 added small reusable website reassurance lines for non-technical SMB owners. Stage 3.6.1 later removed the repeated helper components from supporting-page heroes because the same promise was appearing too often across the site.

- Phone/PWA operation should stay as a compact proof idea only where it answers an immediate owner doubt, such as homepage hero chips or a dedicated Features owner-mobile card.
- Review-before-publish should stay near upload/review flows and FAQ answers, not as a repeated line below every page hero or CTA.
- Full surface lists should stay in the homepage hero visual, workflow map, and surfaces section; pricing and final CTA should not repeat them.
- `WebsiteMobileSupportHint` and `WebsiteOwnerApprovalHint` were removed after the cleanup pass.

Protected scope:

- Pricing, payment, Razorpay, subscription, billing, checkout, auth, and `/create-menu` runtime logic were not changed.

## Stage 7.10 POS Sync Website Proof

Stage 7.10 adds POS Sync as operations proof, not as a standalone homepage category:

- `SmartFeaturesSection` now includes one quiet-reliability proof point for connected POS webhook updates.
- The Features page Operations group now includes one POS Sync card.
- Copy is grounded in current runtime truth: `ENABLE_POS_SYNC` is enabled and POS Sync sends a signed full-menu snapshot to a store-level POS webhook after approved publish-triggering changes.
- The website deliberately avoids "works with any POS", "real-time sync", "seamless integration", and POS-connector-suite language.

Protected scope:

- POS Sync runtime, webhook delivery APIs, test API, secret regeneration behavior, owner settings behavior, pricing, payment, Razorpay, subscription, billing, checkout, auth, and `/create-menu` runtime logic were not changed.

## Stage 7.11 Features Page Mobile Owner Operations Proof

Stage 7.11 adds a dedicated Features page Operations card for phone-first owner work:

- The Features page Operations group now includes "Owner dashboard on your phone."
- Copy is grounded in existing mobile owner surfaces: dashboard, More/settings screens, digital screens, POS Sync, daily operations, customer signals, and menu publishing support.
- The homepage and supporting-page helper line remains the short reassurance version; the Features page carries the fuller capability explanation.
- The wording avoids overclaiming exact desktop/mobile parity for every advanced edge case.

Protected scope:

- Mobile owner runtime, dashboard logic, settings behavior, digital screens runtime, POS Sync runtime, pricing, payment, Razorpay, subscription, billing, checkout, auth, and `/create-menu` runtime logic were not changed.

## Stage 7.12 Staff Access Website Proof

Stage 7.12 adds staff access control as operations proof for team-run businesses:

- `SmartFeaturesSection` now includes one quiet-reliability proof point for staff access control.
- The Features page Operations group now includes "Staff accounts and roles."
- Homepage FAQ now answers whether staff can use MenuList without full owner access.
- Copy is grounded in shipped staff management: email or Staff ID/passcode access, role assignment, passcode reset, and owner force sign-out.
- The website deliberately avoids HR, payroll, attendance, shift-planning, or workforce-management claims.

Protected scope:

- Staff/auth runtime, role/permission APIs, pricing, payment, Razorpay, subscription, billing, checkout, and `/create-menu` runtime logic were not changed.

## Stage 7.13 Staff Access Policy Alignment

Stage 7.13 aligns public policy/security pages with the staff access feature:

- Privacy Policy now discloses staff account information, role/store assignment, account status, reset/session metadata, authorized team access, and the fact that MenuList does not store plain-text staff passcodes.
- Terms of Service now defines owner responsibility for staff access, safe sharing of Staff ID/passcode details, role assignment, and ending access when staff leave.
- Trust & Security now avoids the older "Google Sign-In only" framing and explains Firebase/Google Auth handling, role-scoped staff access, and owner reset/sign-out controls.
- Public copy remains factual and does not present this as GDPR certification, HR software, payroll, attendance, or a legal compliance guarantee.

Protected scope:

- Staff/auth runtime, legal entity details, cookie consent, DPA/SLA pages, pricing, payment, Razorpay, subscription, billing, checkout, and `/create-menu` runtime logic were not changed.

## Stage 7.14 Whole Website Polish

Stage 7.14 aligns the website's shared visual system after the mobile hero and brand pass:

- The old reusable reassurance helpers were removed in v3.6.1, so supporting-page heroes now rely on page-specific proof strips and body copy instead of repeated phone/PWA and review-before-publish lines.
- The Pricing page Tailwind/shadcn variable bridge now uses the same MenuList website palette, muted text contrast, and 8px radius as the main website system.
- The Features hero now keeps the owner-benefit framing direct: "Everything your menu needs. No extra work for you."
- Locale-backed Features hero copy was updated across the website locale files.

Protected scope:

- Pricing, payment, Razorpay, subscription, billing, checkout, auth, staff/auth runtime, and `/create-menu` runtime logic were not changed.

## Stage 7.15 Deployed Scroll Visibility Fix

Stage 7.15 fixes a deployed rendering failure where hash navigation or fast mobile scrolling could show a white viewport until scroll observers fired:

- `AnimateOnScroll` and `AnimateStaggerChild` no longer render children with initial `opacity: 0`.
- The older shadcn website `SectionHeading` also renders visible static headings instead of waiting for `useInView`.
- The global app template no longer wraps all routes in an initial `opacity: 0` Framer Motion fade.
- Website content now stays visible by default; scroll animation can no longer be a dependency for reading marketing sections.
- The footer background/canvas was not the cause. The blank viewport was caused by hidden Framer Motion scroll-reveal wrappers in deployed HTML.

Protected scope:

- Footer layout, pricing/payment runtime, auth, onboarding, and `/create-menu` runtime logic were not changed.

## Stage 7.16 Mobile Safari Scroll Paint Hardening

Stage 7.16 fixes the remaining mobile-only white viewport behavior after scroll-reveal animations were removed. The second issue was not footer ambience or hidden section content. It was the public website still sharing owner-app PWA/fixed-layer behavior on marketing pages:

- `ServiceWorkerRegister` now unregisters Workbox on platform marketing routes, reloads once when a stale worker was controlling the current public page, and registers `/sw.js` only on owner/app routes such as `/dashboard`, `/projects`, `/billing`, `/today`, `/reseller`, `/signin`, and `/screen`.
- The public website header now uses a solid white sticky surface instead of a blurred translucent layer.
- The floating sticky CTA and scroll-to-top control no longer render on mobile, removing fixed transformed controls from mobile scrolling.
- Customer tenant domains still register `sw-customer.js`; owner app routes on platform domains still register `sw.js`.

Protected scope:

- Customer menu service worker behavior, tenant PWA manifest behavior, owner app runtime, pricing/payment runtime, auth, onboarding, and `/create-menu` runtime logic were not changed.

## Stage 7.17 Production Build Compatibility

Stage 7.17 adds explicit minimal Pages Router defaults because the production build's generated `pages-manifest.json` includes `/_app`, `/_document`, and `/_error` entries even though the website itself is App Router based:

- `src/pages/_app.tsx` passes Pages Router pages through unchanged.
- `src/pages/_document.tsx` uses the standard `Html`, `Head`, `Main`, and `NextScript` shell.
- `src/pages/_error.tsx` delegates to Next's default error component.
- These files exist only to satisfy Next's page-data loader and do not wrap, restyle, or reroute the App Router website.

Protected scope:

- App Router website layout, owner app layout, pricing/payment runtime, auth, onboarding, and `/create-menu` runtime logic were not changed.

## Stage 7.18 System Dark Mode Theme Pass

Stage 7.18 adds a complete system-preference dark theme for the public website while keeping light mode as the default brand experience for light system preferences:

- `ThemeProvider` is no longer forced to light inside the website layout, so Tailwind/shadcn pricing `dark:` styles and website token dark mode can activate.
- `src/styles/website.css` now defines dark-mode token values for page backgrounds, subtle sections, cards, elevated menus, inputs, semantic states, borders, shadows, and the brighter dark-mode headline gradient.
- Dark mode uses dark gray surfaces (`#121212` family) instead of pure black, preserving depth and readability.
- Shared surfaces were tokenized so headers, cards, proof strips, dropdowns, mobile drawers, create-menu upload/preview/success states, How It Works mockups, Multi-location mockups, and subscription management do not stay hardcoded light.
- Pricing-page shadcn variables now support both `.dark` and system dark preference.

Protected scope:

- Pricing, payment, Razorpay, subscription, billing, checkout, auth, owner dashboard, upload/extraction, claim/publish APIs, and `/create-menu` runtime logic were not changed.

## Stage 7.19 Dark Mode Final UI Polish

Stage 7.19 completes the final UI/UX theme audit after the system dark-mode pass:

- The desktop sticky CTA now uses a theme token for its translucent blurred surface instead of staying white in dark mode.
- Footer legal/utility microcopy was raised to the same readable muted tone used by other dark footer links.
- Dark flow-diagram subtitles on How It Works and Multi-location now use readable muted text instead of the older low-contrast slate tone.
- The Multi-location flow secondary SVG labels were raised for dark-panel readability.
- The pricing currency switcher and billing labels now use website tokens instead of Tailwind-only dark classes, so key pricing controls stay readable before hydration and under system dark preference.

Protected scope:

- No homepage structure, website copy, pricing/payment logic, subscription behavior, upload/extraction flow, auth flow, owner-dashboard behavior, or public customer runtime was changed.

## Stage 7.20 Footer Preferences Controls

Stage 7.20 moves site preferences into the footer so the header stays focused on navigation, demo, login, and upload:

- Removed `WebsiteLanguageSwitcher` from the desktop header and mobile drawer footer.
- Moved social links under the company email in the left footer brand column.
- Moved the public-source footer line to the center of the bottom row.
- Added compact Language and Theme dropdown controls to the bottom-right of the footer.
- Added `WebsiteThemeSwitcher.tsx`, a localized Light/System/Dark dropdown wired to the existing website `ThemeProvider`.
- Kept the theme control in the footer rather than the hero/header so dark mode is available without making theme choice part of the first conversion decision.

Protected scope:

- No page hierarchy, homepage sections, pricing/payment runtime, auth behavior, owner-dashboard behavior, upload/extraction flow, or public customer menu runtime was changed.

## Stage 7.21 Hero + Card Rhythm Polish

Stage 7.21 responds to visual QA on the dark homepage hero and repeated card grids:

- Reduced homepage hero top/bottom padding so the first viewport has less dead space while preserving the official-source hero composition.
- Added `WebsiteFeatureCard.tsx` for a consistent public website card language: spacious body, top-right icon, stable min-height, and calm border/background treatment.
- Moved homepage public-surface, setup-relief, and rollout cards to the shared card pattern.
- Reused the same card pattern on Product, Features, About, Get Started, Pricing decision, and Trust/Security pages where compact icon-left cards previously felt inconsistent.
- Kept MenuList visual identity separate from Answerlattice: same disciplined card rhythm, not Answerlattice colors, copy, or product framing.

Protected scope:

- No copy, pricing/payment runtime, subscription behavior, auth behavior, owner-dashboard behavior, upload/extraction flow, or public customer menu runtime was changed.

---

## Canonical Change Log

| Version | Date | Changes |
| ------- | ---- | ------- |
| 3.6.24 | June 2, 2026 | Added the public truth indexing guardrail for tenant OBP/menu metadata and per-tenant sitemap inclusion, and removed generated hidden FAQPage JSON-LD from OBP runtime. |
| 3.6.23 | June 2, 2026 | Applied the marketing feedback quality pass to the official-source, audit, Google menu, QR menu, multi-location, and restaurant industry pages while deferring comparison/extra industry pages to avoid thin expansion. |
| 3.6.22 | June 2, 2026 | Added three resource articles, four industry pages, expanded reviewed locale resource coverage, sitemap/LLM discovery entries, and checklist-copy measurement while leaving downloadable templates absent until real files exist. |
| 3.6.21 | June 2, 2026 | Hardened the Resources layer with a desktop Resources dropdown, mobile nested resource links, the eight-card homepage resources block, updated footer resource links, grouped robots rules for named search/AI crawlers, `CCBot` discovery policy coverage, LLM positioning limits, and GA4 resource conversion/referrer events. |
| 3.6.20 | June 1, 2026 | Added reviewed Arabic and Spanish resource packs, completed reviewed resource coverage for every public website-switcher language, and added verifier coverage for active language parity. |
| 3.6.19 | June 1, 2026 | Added reviewed Tamil, Telugu, Marathi, and Bengali resource packs and locale-prefixed resource discovery coverage. |
| 3.6.18 | June 1, 2026 | Added reviewed Hindi resource URLs, localized resource metadata/schema, sitemap hreflang alternates, LLM coverage, and route/discovery verifier checks. |
| 3.6.17 | June 1, 2026 | Added source-versioned resource locale packs, stable FAQ IDs, full Hindi long-form coverage for all 12 resource articles, and `npm run verify:website-resource-locales`. |
| 3.6.16 | June 1, 2026 | Kept Menu Card Export out of the homepage as a standalone block and folded PDFs/print files into existing website and resource copy as generated outputs from the approved menu. |
| 3.6.15 | June 1, 2026 | Added `/resources`, 12 resource article routes, resource schema, homepage/header/footer resource links, and discovery coverage in sitemap, robots, LLM files, and agent-readiness verification. |
| 3.6.14 | May 31, 2026 | Added public `/create-menu` menu-link input with permission confirmation, SSRF-safe acquisition reuse, review-first draft behavior, and updated website FAQ/copy. |
| 3.6.13 | May 30, 2026 | Reversed the shared headline/accent gradient so highlighted text starts with stronger blue and finishes with the lighter accent, without changing the official logo mark. |
| 3.6.12 | May 30, 2026 | Tightened shared website feature-card spacing so subtitles and descriptions read as one grouped proof unit, with card rows sized from the tallest content in that row. |
| 3.6.7 | May 24, 2026 | Changed the multi-location diagram to pulse all outlet paths together and aligned the master card treatment with outlet cards. |
| 3.6.6 | May 24, 2026 | Renamed the homepage workflow section to a source-to-public value bridge while keeping the simpler homepage diagram distinct from the fuller `/how-it-works` diagram. |
| 3.6.5 | May 24, 2026 | Added a reduced-motion-aware pulse overlay, light always-on center-ring pulse, and synchronized destination-card border-only highlight to the homepage, How It Works, and Multi-location source-map diagrams while keeping the static dotted paths in place. |
| 3.6.4 | May 24, 2026 | Switched homepage and How It Works diagrams to mobile rows with edge-anchored static dotted paths; grouped How It Works outputs into two mobile rows, reduced Multi-location mobile outlet cards to three, and aligned diagram light/dark theme treatment across pages while leaving desktop layouts unchanged. |
| 3.6.3 | May 24, 2026 | Extended compact mobile source-map treatment to `/how-it-works` and `/multi-location`; verified the active website diagram set is homepage workflow, How It Works, and Multi-location. |
| 3.6.2 | May 24, 2026 | Kept the homepage workflow source map as a compact three-column mobile layout instead of a long vertical stack, preserving the desktop structure on phone screens. |
| 3.6.1 | May 23, 2026 | Removed repeated phone/PWA, review-before-publish, and full surface-list reassurance copy from final CTA, supporting-page heroes, pricing, footer, FAQ, and locale-backed copy. |
| 3.5.9 | May 23, 2026 | Hardened `llms.txt` and `llms-full.txt` with PAL agent boundaries: read public facts, route to official handoffs, do not mutate owner truth, do not infer missing/sensitive claims, and treat WebMCP as future gated scope. |
| 3.5.8 | May 23, 2026 | Removed the old homepage SolutionSection because the one-source diagram repeated the hero, workflow source map, setup proof, and public-surface proof. |
| 3.5.7 | May 23, 2026 | Replaced generic animated SVG diagrams on How It Works and Multi-location with static supporting-page source maps using official-source labels and shared dark-panel tokens. |
| 3.5.6 | May 23, 2026 | Replaced the compact homepage workflow pipeline with an input -> MenuList owner-review -> public outputs source map while keeping the hero product-proof led. |
| 3.5.5 | May 23, 2026 | Tightened dark-mode color cohesion around one dark-gray surface family, one blue action family, muted semantic colors, and shared contrast-panel tokens. |
| 3.5.4 | May 23, 2026 | Tightened homepage hero spacing and introduced a shared spacious website feature-card pattern across homepage, Product, Features, About, Get Started, Pricing decision, and Trust/Security card grids. |
| 3.5.3 | May 23, 2026 | Moved website language selection from header to footer, placed social links under the company email, centered the public-source line, and added a localized Light/System/Dark footer theme dropdown backed by the existing ThemeProvider. |
| 3.5.2 | May 22, 2026 | Final dark-mode UI polish: theme-safe sticky CTA surface, stronger dark footer utility contrast, clearer dark flow-diagram supporting text, and tokenized pricing controls. |
| 3.5.1 | May 22, 2026 | Added system dark mode across the public website using dark gray surfaces instead of pure black, with shared token coverage for headers, sections, cards, pricing, forms, drawers, and create-menu support pages. |
| 3.4.16 | May 22, 2026 | Kept the public website light by default and deepened the light-mode headline gradient to a calmer teal-to-blue accent with stronger contrast on white. |
| 3.4.15 | May 20, 2026 | Added minimal Pages Router defaults so production builds resolve generated `/_app`, `/_document`, and `/_error` page-manifest entries without changing App Router website behavior. |
| 3.4.14 | May 20, 2026 | Required a free owner account before `/create-menu` upload/extraction, preserving free preview before payment while removing anonymous AI-processing cost leakage. |
| 3.4.13 | May 20, 2026 | Hardened mobile Safari public-website scrolling by unregistering the owner Workbox service worker on marketing routes and removing mobile fixed/blur repaint triggers. |
| 3.4.12 | May 20, 2026 | Repositioned the homepage hero from generic online-menu language to current-menu/official-version trust language, removed visible "no account needed" upload positioning, and aligned the create-menu preview CTA with the controlled free-preview funnel. |
| 3.4.11 | May 20, 2026 | Fixed deployed white-screen-on-scroll behavior by making website scroll reveal wrappers visible by default instead of relying on IntersectionObserver to reveal content. |
| 3.4.10 | May 20, 2026 | Final whole-site theme/content polish: stronger shared reassurance-line contrast, pricing theme variables aligned to the website palette, and Features hero copy tightened to owner-benefit language. |
| 3.4.9 | May 20, 2026 | Polished the mobile hero and brand lockup: solid website wordmark text, gradient retained in the mark and headline accent, "Publish your official menu online" hero copy, and a compact higher-contrast proof strip. |
| 3.4.8 | May 19, 2026 | Aligned Privacy Policy, Terms of Service, and Trust & Security with owner-managed staff access, role-scoped permissions, passcode reset metadata, and session revocation. |
| 3.4.7 | May 19, 2026 | Added staff access control as homepage/features/FAQ operations proof without changing staff/auth runtime. |
| 3.4.6 | May 19, 2026 | Added a dedicated Features page Operations card for phone-browser/PWA owner management without changing mobile runtime. |
| 3.4.5 | May 18, 2026 | Added POS Sync as a low-prominence operations proof on homepage/features and corrected stale POS Sync docs status without changing POS runtime. |
| 3.4.4 | May 18, 2026 | Added reusable phone-first and owner-approval reassurance helpers across website conversion pages with English and Hindi locale coverage. |
| 3.4.3 | May 18, 2026 | Added homepage search/AI discovery proof section and FAQ caveat grounded in existing SEO/AEO, schema, crawler, sitemap, and LLM discovery infrastructure. |
| 3.4.2 | May 17, 2026 | Mobile website polish: touch targets, section rhythm, revenue/workflow compactness, footer mobile navigation, and stale multi-location locale claim cleanup. |
| 3.4.0 | May 17, 2026 | Supporting pages polished across About, Contact, Get Started, Trust & Security, Pricing, How It Works, and Multi-Location; shared page hero/proof components added; pricing copy hardened without touching payment/auth/onboarding logic. |
| 3.3.0 | May 17, 2026 | Current website established as the only source-code version. Old source-code backups, backup restore docs, dead homepage code, and unused old landing-template visuals removed. |

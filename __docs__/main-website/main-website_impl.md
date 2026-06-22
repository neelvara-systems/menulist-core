# Main Website (menulist.ai) — Implementation

**Status:** IMPLEMENTED — v3.6.70 Official Customer Link Framing Pass
**Last Updated:** June 22, 2026
**Audience:** Developers

---

## 1. Architecture Overview

The main website lives in the `(website)` route group under Next.js App Router. All pages use a shared layout with system-aware light/dark theme tokens, localization, and analytics.

The latest metadata parity pass keeps the existing website copy and page structure intact while aligning shared SEO/AEO metadata to the production MenuList canonical URL. Root fallback metadata, website layout metadata, homepage JSON-LD, and page-level JSON-LD read from `src/constants/menulist/website.ts`; `/create-menu/success` is a server metadata wrapper around the existing client success UI and is intentionally `noindex, nofollow, nocache` with a self canonical to the non-query success path.

```
Route Group: src/app/(website)/
Layout:      LocalisationProvider → WebsiteAuthProvider → ThemeProvider (system preference or footer override)
Analytics:   GoogleAnalytics + ClarityAnalytics (injected in layout)
Styles:      @styles/app.scss (layout) + @/styles/website.css (per-page)
Build:       Minimal src/pages defaults satisfy generated Pages Router manifest entries
```

---

## 2. Pages & Routes

| Route | File | Component | Type | Metadata |
|-------|------|-----------|------|----------|
| `/` | `(website)/page.tsx` | `HomePage` | Server shell with client homepage sections | Default from layout + server JSON-LD |
| `/ai-menu-manager` | `(website)/ai-menu-manager/page.tsx` | `AiMenuManagerPage` | Server route + client feature page | Per-page `export const metadata` |
| `/features` | `(website)/features/page.tsx` | `FeaturesPage` | Server | Per-page `export const metadata` |
| `/features/menu-import` | `(website)/features/menu-import/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/menu-content-prep` | `(website)/features/menu-content-prep/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/featured-choices` | `(website)/features/featured-choices/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/official-business-page` | `(website)/features/official-business-page/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/qr-menu-links` | `(website)/features/qr-menu-links/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/print-ready-kit` | `(website)/features/print-ready-kit/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/owner-phone-dashboard` | `(website)/features/owner-phone-dashboard/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/menu-quality-validation` | `(website)/features/menu-quality-validation/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/business-health` | `(website)/features/business-health/page.tsx` | `BusinessHealthFeaturePage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/customer-feedback-loop` | `(website)/features/customer-feedback-loop/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/public-discovery` | `(website)/features/public-discovery/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/how-it-works` | `(website)/how-it-works/page.tsx` | `ProductPage` | Server | Per-page |
| `/pricing` | `(website)/pricing/page.tsx` | `PricingWrapper` | Server | Per-page |
| `/about` | `(website)/about/page.tsx` | `AboutPage` | Server | Per-page |
| `/contact` | `(website)/contact/page.tsx` | `ContactPage` | Server | Per-page |
| `/get-started` | `(website)/get-started/page.tsx` | `GetStartedPage` | Server | Per-page |
| `/multi-location` | `(website)/multi-location/page.tsx` | `MultiLocationPage` | Server | Per-page |
| `/trust-security` | `(website)/trust-security/page.tsx` | `TrustSecurityPage` | Server | Per-page |
| `/create-menu` | `(website)/create-menu/page.tsx` | `CreateMenuClient` | Server (gate) | Per-page |
| `/create-menu/preview/[draftId]` | `(website)/create-menu/preview/[draftId]/page.tsx` | `PreviewClient` | — | — |
| `/create-menu/success` | `(website)/create-menu/success/page.tsx` + `CreateMenuSuccessClient.tsx` | `CreateMenuSuccessClient` | Server metadata wrapper + client success UI | `noindex, nofollow, nocache` |
| `/resources` | `(website)/resources/page.tsx` | `ResourcesHub` | Server | Per-page |
| `/resources/[slug]` | `(website)/resources/[slug]/page.tsx` | `ArticleLayout` | Server static params | Dynamic per article |
| `/{locale}/resources` | `(website)/[locale]/resources/page.tsx` | `ResourceHubPageShell` | Server static params | Localized per-page for `hi-IN`, `ta-IN`, `te-IN`, `mr-IN`, `bn-IN`, `ar-SA`, `es-ES` |
| `/{locale}/resources/[slug]` | `(website)/[locale]/resources/[slug]/page.tsx` | `ResourceArticlePageShell` | Server static params | Localized per article for `hi-IN`, `ta-IN`, `te-IN`, `mr-IN`, `bn-IN`, `ar-SA`, `es-ES` |
| `/industries/restaurants` | `(website)/industries/restaurants/page.tsx` | `IndustryLandingPage` | Server | Per-page |
| `/industries/cafes-bakeries` | `(website)/industries/cafes-bakeries/page.tsx` | `IndustryLandingPage` | Server | Per-page |
| `/industries/takeaway-cloud-kitchens` | `(website)/industries/takeaway-cloud-kitchens/page.tsx` | `IndustryLandingPage` | Server | Per-page |
| `/industries/multi-location-food-businesses` | `(website)/industries/multi-location-food-businesses/page.tsx` | `IndustryLandingPage` | Server | Per-page |
| `/product` | `(website)/product/page.tsx` | **Permanent redirect → `/how-it-works`** | Server | — |
| `/privacy-policy` | `(website)/privacy-policy/page.tsx` | `PrivacyPolicyPage` | Server | Per-page |
| `/terms-of-service` | `(website)/terms-of-service/page.tsx` | `TermsOfServicePage` | Server | Per-page |
| `/refund-policy` | `(website)/refund-policy/page.tsx` | `RefundPolicyPage` | Server | Per-page |

**Total: 152 routes (8 core + feature campaign pages + 3 create-menu + 16 English resources + 112 reviewed localized resources + 4 industry pages + 1 redirect + 3 legal + 1 trust)**

### Notes
- Homepage (`/`) is a server route that renders `SchemaMarkup` as server HTML before mounting the client homepage composition.
- `/product` is a framework-level permanent redirect to `/how-it-works` (legacy URL preservation) and is intentionally omitted from sitemap and LLM discovery inventories.
- `/create-menu` is feature-gated by `ENABLE_PUBLIC_MENU_ENTRY` — shows a locale-backed guided-setup fallback when OFF.
- `/create-menu/success` is a post-setup utility route that may carry query-string menu URLs. It must remain outside discovery inventories and emit explicit `noindex, nofollow, nocache` robots metadata from the server wrapper, with a self canonical to `/create-menu/success`.
- `/resources` and resource article routes are feature-gated by `ENABLE_WEBSITE_RESOURCES`.
- Resource article routes are generated from `src/content/websiteResources/` and use `generateStaticParams()` for the 15 article slugs.
- Reviewed localized resource routes are generated from the same resource registry for `hi-IN`, `ta-IN`, `te-IN`, `mr-IN`, `bn-IN`, `ar-SA`, and `es-ES`; non-reviewed locales are not exposed as resource routes.
- Public website CTAs route to `/create-menu` for free-account-first menu intake. `/get-started` remains a guided setup/sign-in page and no longer acts as the primary homepage funnel.
- `src/pages/_app.tsx`, `src/pages/_document.tsx`, and `src/pages/_error.tsx` are build-compatibility defaults only. They satisfy Next's generated Pages Router entries during production page-data collection and do not define marketing routes. `next.config.js` repairs emitted special Pages Router and App Router manifest entries if the worker build emits route files while leaving generated manifests incomplete.

---

## 3. Layout

**File:** `src/app/(website)/layout.tsx`

```
LocalisationProvider (locale from next-intl/server)
  → WebsiteAuthProvider (`src/app/(website)/WebsiteAuthProvider.tsx`)
    → ThemeProvider
      → WebsiteDocumentTheme
      → WebsiteThemeShortcut
      → WebsiteAnalyticsConsent (wraps shared PublicCookieConsentBanner and gates GoogleAnalytics/ClarityAnalytics after accepted consent)
      → {children}
```

`src/components/shared/publicCookieConsent/PublicCookieConsentBanner.tsx` is the shared compact public-site cookie banner used by MenuList and sibling public product/brand websites. MenuList uses it for optional analytics consent; it must not be mounted on owner dashboards, customer menu/OBP output, or widget surfaces without a separate privacy review.

`src/components/shared/publicAiSummaryLinks/PublicAiSummaryLinks.tsx` is the shared footer-level AI summary shortcut used by MenuList, AnswerLattice, and CampaignCue public marketing websites. MenuList mounts it in `Footer.tsx` with a localized label and a product-boundary prompt that points to the canonical website and `llms.txt`.

**Default metadata (from layout):**
- Title: `MenuList - One Official Menu Source for Customers`
- Description: `Turn your current menu or service list into one official customer link for business page, QR, print files, customer actions, owner updates, feedback, and health checks.`
- Metadata base: production `https://menulist.ai` from `src/constants/menulist/website.ts`
- Canonical: `https://menulist.ai`
- OG image: `/images/website/menulist-og-official-source.png`
- Backward-compatible OG copy: `/og-image.png`
- Robots: index, follow (full crawling enabled)
- Viewport: device-width, initialScale 1, maximumScale 1

---

## 4. Homepage Sections (13 sections plus sticky CTA, in order)

**File:** `src/components/website/home/HomePage.tsx`

| # | Section | Component File |
|---|---------|---------------|
| 1 | Hero | `HeroSection.tsx` |
| 2 | Problem | `ProblemSection.tsx` |
| 3 | Interactive Workflow | `InteractiveWorkflowSection.tsx` |
| 4 | Public Truth Loop | `PublicTruthLoopSection.tsx` |
| 5 | Website Replacement Doubt Block | `WebsiteReplacementBlock.tsx` |
| 6 | AI Menu Manager | `AiMenuManagerSection.tsx` |
| 7 | Setup Relief | `SetupReliefSection.tsx` |
| 8 | Surfaces | `SurfacesSection.tsx` |
| 9 | Customer Browse | `CustomerBrowseSection.tsx` |
| 10 | Prepared For You | `PreparedForYouSection.tsx` |
| 11 | Business Health | `BusinessHealthSection.tsx` |
| 12 | Resources | `ResourcesSection.tsx` |
| 13 | FAQ | `FaqSection.tsx` |
| 14 | Final CTA | `FinalCtaSection.tsx` |

`RevenuePathSection.tsx`, `StatsSection.tsx`, `SearchDiscoverySection.tsx`, `AnalyticsInsightsSection.tsx`, `SmartFeaturesSection.tsx`, `BusinessSection.tsx`, and `IndustrySection.tsx` remain in the codebase as supporting components/future page material, but they are not mounted in the current compressed homepage. The old `SolutionSection.tsx` was removed in v3.5.8 because its one-source SVG and bullet grid duplicated the hero, problem, workflow source map, setup proof, and public-surface proof.

**Official customer link framing pass:** v3.6.70 makes the current website story explicit: one approved menu source becomes one official customer link, then QR, print, actions, owner updates, feedback, and health checks stay connected. `InteractiveWorkflowSection.tsx` now uses six guided lifecycle steps, `WebsiteReplacementBlock.tsx` is mounted on the homepage, pricing, and Official Business Page feature page, Pricing/Features/OBP metadata and locale copy are updated, and `public/llms.txt` / `public/llms-full.txt` use the same customer-link framing. The public Features page adds a lifecycle strip before the feature catalog. External-sync website copy is bounded as supported connected-system snapshot export only. This is public website component/CSS/locale/metadata/discovery/docs work only; owner dashboard runtime labels, customer menu/OBP runtime, pricing/payment/Razorpay/subscription logic, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

**Public truth loop homepage bridge:** v3.6.69 adds `PublicTruthLoopSection.tsx` immediately after `InteractiveWorkflowSection`. The section makes the post-publish loop visible: current menu source -> owner approval -> customer surfaces -> feedback/activity signals -> source stays current. It also shows the three practical output families owners understand fastest: customer menu, Official Business Page, and print/QR kit. This is a compact proof bridge, not a new dashboard/analytics/SEO section, and it does not claim automatic external-platform updates, ranking, citation, POS sync, or fake customer metrics.

**Business Health homepage proof:** v3.6.31 adds `BusinessHealthSection.tsx` after `PreparedForYouSection` and before `ResourcesSection`. The section uses a localized product-style owner dashboard preview plus four compact proof cards to show Business Health as an AI health check for latest menu/public-presence state, No action needed state, freshness, cached analytics periods, safe handoff to AI Menu Manager or existing owner screens, multi-location/customer-attention awareness, and mobile support. It intentionally avoids chatbot, realtime sales, revenue optimization, prediction, competitor tracking, automatic external updates, and Business Health-owned public-truth mutation claims. This is public website component/CSS/locale/docs only; owner dashboard runtime, Business Health APIs, scheduler read models, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, customer menu runtime, and Vercel deployment were not changed.

**AI Menu Manager launch hook:** v3.6.59 adds `/ai-menu-manager`, `AiMenuManagerSection`, and a first-level header/footer navigation link for the public AI Menu Manager launch. The homepage introduces AI Menu Manager after the source-to-public workflow and public-truth loop, so the story remains: one approved MenuList source first, then message-based approved updates. The page and homepage section use localized copy, card-native visuals, and approval-safe language: owner intent -> prepared card -> approval when needed -> existing MenuList operation -> receipt. Discovery is updated through `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt`. This is public website component/CSS/locale/docs only; owner dashboard runtime, AMM API behavior, Firebase rules, Cloud Functions, pricing/payment runtime, auth, extraction, and customer menu runtime were not changed.

**AI Menu Manager guided context copy:** v3.6.63 updates only the dedicated `/ai-menu-manager` locale copy to reflect the product's guided context workflow. The page now says owners can ask naturally, or choose an item, category, or menu area first for tighter control. The copy still keeps selected store/project scope, broad-work approval, registered MenuList actions, and manual external handoff boundaries visible. This is static website locale/docs work only; the owner AMM UI, AMM DAL/API behavior, Firebase rules, Cloud Functions, pricing/payment runtime, auth, extraction, and customer menu runtime were not changed.

**Business Health Features-page proof:** v3.6.32 adds Business Health as a compact Operations card in `FeaturesPage.tsx`. The card uses the shared `WebsiteFeatureCard` pattern and localized `Features.group4F1*` copy to explain AI health checks, latest MenuList check, last checked date, customer attention, whether anything needs action, the No action needed stable state, and safe handoff to AI Menu Manager or existing owner screens. This is public website component import/locale/docs only; owner dashboard runtime, Business Health APIs, scheduler read models, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, customer menu runtime, and Vercel deployment were not changed.

**Business Health campaign page:** v3.6.33 adds `/features/business-health` for marketing campaigns. The route shell lives in `src/app/(website)/features/business-health/page.tsx`, renders `BusinessHealthFeaturePage`, emits `WebsitePageStructuredData` with `path="/features/business-health"`, and uses a product-style Business Health preview followed by a MenuList-styled sticky story section modeled on Answerlattice's "From inputs to support surfaces" layout. The page now frames Business Health as the diagnostic counterpart to AI Menu Manager: Business Health finds issues; AI Menu Manager prepares approved fixes. The left rail tabs are `What it checks`, `Owner outcome`, and `Why owners can trust it`; the right side uses stacked sticky cards for the matching check/outcome/trust content. The homepage Business Health section links to the page through `View Business Health`, and the `/features` Operations card links to the same route. Platform discovery is updated through `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt`. `/business-health` remains the protected owner route and is not used as a public marketing URL.

**Feature navigation and campaign pages:** v3.6.34 adds a compact Features dropdown to `Header.tsx`, backed by `src/components/website/features/featureNavigation.ts`. Desktop navigation promotes owner-readable feature surfaces that help SMB owners self-sell fastest. v3.6.35 adds `/features/print-ready-kit` for Menu Kit and print-file value: table cards, counter cards, stickers, posters, social files, and printer handoff from the current approved menu source. v3.6.36 adds `/features/menu-content-prep` for the setup/content job of preparing customer-friendly descriptions, menu images, and customer languages from the same approved menu source. v3.6.37 adds `/features/featured-choices` for customer-facing Featured, Quick, and Value choices from the current approved menu. v3.6.38 reshapes the desktop dropdown into a viewport-centered elevated overview row, three-column feature grid, and compact proof/CTA strip so it separates clearly from the hero. v3.6.39 adds `FeatureDetailJourney.tsx` so every generic `FeatureDetailPage` route uses a Business Health-style sticky journey: desktop left-rail steps, stacked right-side story panels, and a mobile sticky horizontal pill rail. It also adds `/features/menu-quality-validation` for menu quality, pricing integrity, and customer trust indicators while folding narrower suggestions into existing pages: content generation into Menu Content Prep, temporary status into Owner PWA Dashboard, business discovery attributes into Official Business Page/Public Discovery, and web sharing/presence placement into QR Menu and Links/Print-ready Kit. Desktop navigation remains restrained; mobile navigation groups the same top feature links as Start, Publish, and Operate. Selected `/features` cards now link into these campaign pages, including the Generated images, Descriptions written for you, and One-click translations cards pointing to Menu Content Prep, the Featured section card pointing to Featured Choices, and menu-quality/pricing-integrity/trust cards pointing to Menu Quality Validation. Discovery is updated through `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt`.

**Print-ready Kit copy parity:** v3.6.41 updates `/features/print-ready-kit` copy to match the implemented Assets workflow: owners pick an asset type, choose a supported finished style family, preview generated output, then download PDF/image files or the Menu Kit ZIP. QR/display assets can mention up to nine materially different style families; assets with fewer real unique layouts must be described as showing only supported choices. This is public website locale/docs copy only; owner Assets runtime, printable renderer, mobile shell, Firebase, Cloud Functions, pricing, payment, auth, extraction, and customer menu runtime were not changed.

**Feature-detail copy parity:** v3.6.42 updates the remaining generic feature pages to the same readiness bar as Print-ready Kit. `/features/menu-import`, `/features/menu-content-prep`, `/features/featured-choices`, `/features/official-business-page`, `/features/qr-menu-links`, `/features/owner-phone-dashboard`, `/features/menu-quality-validation`, and `/features/public-discovery` now have deeper locale copy, claim-safe metadata/discovery descriptions, and full `FeatureDetail` key parity across English and Hindi. Menu Quality Validation remains out of the desktop dropdown by design, but stays reachable from `/features`, sitemap, and LLM context. The same pass fixes `getPlatformDiscoveryBaseUrl()` so generated platform discovery URLs default to the MenuList production deployment target (`https://menulist.ai`) instead of local or preview platform defaults. v3.6.55 repositions `/features/owner-phone-dashboard` publicly as Owner PWA Dashboard: core owner workflows stay available from phone browser or installed PWA, while desktop remains useful for heavier review or precision setup. This is public website locale/metadata/discovery/docs copy only; owner dashboard runtime, mobile shell runtime, extraction workers, Assets runtime, Firebase, Cloud Functions, pricing, payment, auth, and customer menu runtime were not changed.

**Customer Feedback Loop campaign page:** v3.6.43 adds `/features/customer-feedback-loop` as a generic `FeatureDetailPage` route for public guest feedback. The page frames the shipped Internal Feedback System as a correction loop: customers can report wrong prices, missing items, outdated details, or service concerns from public menu/OBP/QR/direct-link surfaces; owners review feedback privately; real issues route back to the approved source. The `/features` Operations group, desktop Features dropdown, and mobile hamburger feature list now include a linked `Customer feedback loop` entry through `websiteFeatureNavLinks` / `websiteFeatureNavGroups`. Platform discovery is updated through `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt`. This is public website locale/metadata/discovery/docs copy only; guest feedback runtime, owner inbox runtime, mobile shell runtime, Firebase, Cloud Functions, pricing, payment, auth, and customer menu runtime were not changed.

**Feature dropdown interaction polish:** v3.6.44 changes the desktop `Features` top-nav item from a direct `/features` link into a menu trigger button. The `/features` route is still available through the `Feature overview` row inside the panel. The desktop panel now renders the same Start, Publish, and Operate groups used by the mobile hamburger, and `websiteFeatureNavGroups` is the shared grouping source. CSS adds a small invisible hover bridge between the trigger and fixed panel so pointer travel does not close the dropdown, and the panel border/shadow is softened for dark mode. This is static website header/CSS/docs only; feature routes, owner dashboard runtime, customer menu runtime, Firebase, Cloud Functions, pricing, payment, auth, and Vercel deployment were not changed.

**Mobile feature drawer accordion:** v3.6.62 changes the mobile hamburger drawer from an always-expanded feature map into a two-level accordion. `Header.tsx` keeps the top-level Features accordion open by default, keeps Resources collapsed unless the visitor is already on a resource route, opens the active Start/Publish/Operate feature group, and removes the duplicate top-level AI Menu Manager mobile entry because it already appears inside Features -> Operate. `website.css` owns the drawer accordion triggers, nested group panels, Feature overview card, active route states, and light/dark token styling. This is static website header/CSS/docs only; feature routes, owner dashboard runtime, customer menu runtime, Firebase, Cloud Functions, pricing, payment, auth, and Vercel deployment were not changed.

**Feature card link affordance:** v3.6.44 also makes `/features` cards with a dedicated route visually distinct from static informational cards. `WebsiteFeatureCard` supports optional `leadingIcon` and `action` props. `FeaturesPage.tsx` opts into the leading-icon row for every feature card and passes a localized top-right `Features.cardAction` pill only when `feature.href` exists, while the link `aria-label` keeps the fuller `Features.cardCta` text. `website.css` gives `.ws-feature-card-link` cards a stronger resting border, subtle accent wash, compact `View` action, and clearer hover/focus movement. Non-clickable cards keep the same leading-icon structure without the action pill.

**Feature card mobile layout:** v3.6.48 adds a narrow-screen override for `WebsiteFeatureCard` when `leadingIcon` and `action` are both present. Mobile cards use a two-column `icon + heading` row and place the `View` action below the heading, so long headings stay left-aligned and do not compete with the action pill. The desktop top-right action layout is unchanged.

**Feature page visual proof system:** v3.6.49 adds `src/components/website/features/FeatureDetailVisual.tsx` and wires it into the shared `FeatureDetailPage` hero media slot. The component uses each `FeatureDetailConfig` slug, existing icon config, and existing `Website.FeatureDetail` locale keys to render feature-specific code-native product visuals: import source flow, content prep board, Featured Choices phone, Official Business Page public-surface card, QR/link kit, Print-ready Kit asset board, Owner PWA Dashboard phone panel, Menu Quality Validation checklist, Customer Feedback Loop correction flow, and Public Discovery source card. v3.6.51 widens the hero visual column, removes the nested browser border and redundant bottom pills from the Official Business Page visual, raises microcopy label sizes for mobile readability, and changes Print-ready Kit mobile assets from compressed three-column mini cards to compact rows. v3.6.53 removes the shared trailing proof-chip row from all generic feature visuals so internal visual labels and the page-level signal strip do not create repeated tag stacks on mobile. `website.css` owns the theme-aware visual system, responsive sizing, and mobile compaction rules. This is static public website component/CSS/docs work only; it does not add generated bitmap dependencies, owner dashboard runtime changes, customer menu runtime changes, Firebase changes, pricing/payment changes, auth changes, or Vercel deployment.

**Print-ready Kit editor proof:** v3.6.56 updates the print-specific feature visual and adds `src/components/website/features/PrintReadyKitProofGallery.tsx`, rendered only when `FeatureDetailPage` receives `slug="print-ready-kit"`. The hero visual now shows a template panel, editor artboard, and export row. The proof gallery uses localized copy, an always-visible asset-type rail, and current product screenshots from `public/images/website/print-ready-kit/` to show the Assets template-list view and editor customization view so owners understand the new template-to-editor workflow. The asset rail deliberately replaces carousel-style slides because file types should be visible without extra interaction. The dashboard screenshot is cropped to the product workspace so account-header details are not published. `website.css` owns the responsive print gallery and mobile compaction. This is static public website route/component/CSS/locale/docs/image-asset work only; owner Assets runtime, shared creative editor runtime, printable renderer, Firebase rules, Cloud Functions, pricing, payment, auth, and Vercel deployment were not changed.

**Feature screenshot proof galleries:** v3.6.57 adds `src/components/website/features/FeatureScreenshotProofGallery.tsx`, rendered from `FeatureDetailPage` after the sticky feature journey. The shared gallery maps approved screenshots by `FeatureDetailSlug` and currently mounts launch-clean captures for Menu Import, QR Menu and Links, Customer Feedback Loop, and Public Discovery. The public assets live under `public/images/website/features/{feature-slug}/`; raw captures and rejected/held-back source material stay under `__docs__/main-website/asset-production/feature-screenshots/raw/`. Official Business Page, Featured Choices, Owner PWA Dashboard, Business Health, Menu Content Prep, and Menu Quality Validation intentionally remain on code-native or existing polished visuals until a cleaner demo tenant/state is available. `website.css` owns the theme-aware gallery cards, portrait/wide screenshot handling, and responsive one/two-column layouts. This is public website component/CSS/locale/docs/image-asset work only; authenticated owner runtime, customer menu runtime, guest feedback runtime, Business Health runtime, Firebase, Cloud Functions, pricing, payment, auth, and Vercel deployment were not changed.

**Native homepage motion polish:** v3.6.58 adds `WorkflowGuidedFrame.tsx` around the homepage workflow source map. The frame provides a sticky desktop story rail, scroll-aware progress bar, active-step emphasis, and a compact active-proof chip while keeping all content readable without animation. Mobile keeps the rail in normal document flow so phone scrolling stays native and stable. The old four-step card grid below the source map was removed because the guided rail now carries the same source/review/publish/share story. This deliberately does not mount Lenis or any global smooth-scroll behavior.

**Reference-site proof polish:** v3.6.68 keeps the existing MenuList source-to-public workflow section but adds localized side labels in `InteractiveWorkflowSection.tsx` so the map reads as `Start with` inputs flowing through owner review and `Publishes as` customer outputs. The same pass updates sibling public sites without changing MenuList runtime behavior: CampaignCue's Creative Output System mini visuals now render named artifacts from `POWERHOUSE_FEATURES`, and AnswerLattice's `SupportKnowledgeMapSection` center hub now names the reviewed-support-layer contract. This is public marketing component/CSS/locale/docs polish only.

**Feature journey panel polish:** v3.6.45 changes the shared `FeatureDetailJourney` desktop story panel from a nested two-column layout into a single parent story card with a top narrative row and full-width proof-card row. The parent panel owns the gradient/background, with no internal copy-vs-proof divider, so pages such as `/features/customer-feedback-loop` read as one cohesive story instead of two compartments. v3.6.46 tightens the desktop height clamp to `32rem -> 72vh -> 39rem`, reduces the largest internal gap/padding, and gives proof cards a controlled responsive minimum height. This keeps the left tab rail and sticky stacked-card behavior intact, gives the three supporting proof cards enough horizontal space, reduces empty vertical space on tall displays, and keeps mobile one-column. This is static website CSS/docs only; feature routes, owner dashboard runtime, customer menu runtime, Firebase, Cloud Functions, pricing, payment, auth, and Vercel deployment were not changed.

**Website content QA pass:** v3.6.47 moves the remaining active marketing-surface hardcoded copy into the `Website` locale namespace. `/create-menu/preview/[draftId]` now uses locale keys for loading, processing, expiry, failure, empty state, detected-detail labels, stats labels, claim-form placeholders, and claim errors. The feature-off `/create-menu` and preview fallback copy, industry landing helper headings, footer home aria label, and scroll-to-top aria label are also locale-backed. English/Hindi `Website` key parity, source literal scan, local public-route content smoke, lint, and TypeScript passed. Legal pages, metadata titles, and pricing/account billing internals were not restructured in this cleanup.

**Asset-production support:** Stage 6.1 public placeholders live in `public/images/website/` and are mounted as draft homepage visuals in `HeroSection.tsx`, `SetupReliefSection.tsx`, `SurfacesSection.tsx`, and `CustomerBrowseSection.tsx`. Stage 6.2 private screenshot references live in `__docs__/main-website/asset-production/stage-06-2/` and are not imported by the app. Stage 7 visual QA screenshots live in `__docs__/main-website/asset-production/stage-07/`.

**Footer revenue pass:** Stage 7.2 reviewed Paper, Kestra, Stripe, Lenis, Upscayl, Linear, Vercel, and Notion reference patterns, then upgraded `Footer.tsx` into a conversion/resource layer. It deliberately borrows structure, not unsupported claims or trend-heavy visuals.

**Footer preferences controls:** v3.5.3 moved preference controls out of the header and into the footer. Social links now sit under the company email, the public-source line is centered in the footer bottom row, and compact preference controls sit on the bottom-right. Language remains a dropdown because it has many options; v3.6.29 makes theme selection a Light/System/Dark segmented icon control backed by the existing `ThemeProvider`. This keeps the top navigation focused on product evaluation and upload/login actions while still making preferences discoverable.

**Card rhythm polish:** v3.5.4 adds `WebsiteFeatureCard.tsx` as the shared public website proof/feature card pattern. It uses spacious card padding, calm border/background treatment, and a consistent top-right icon so homepage and supporting-page card grids do not feel compressed or visually inconsistent. v3.6.12 keeps the same pattern but removes the old vertical `space-between` distribution and fixed-feeling card minimum so subtitle and description copy stay visually connected while each grid row sizes from its tallest card content.

**Dark theme color cohesion:** v3.5.5 keeps light mode intact while tightening dark mode around one dark-gray surface family, one blue action family, muted semantic states, and shared contrast-panel tokens. Footer, proof bands, discovery panels, product phone frames, and supporting card surfaces now reuse the same dark contrast variables instead of carrying separate hardcoded navy/cyan treatments. Pricing, payment, subscription, Razorpay, auth, onboarding, and `/create-menu` runtime logic were not changed.

**Production readiness theme/motion polish:** v3.6.40 adds `WebsiteDocumentTheme.tsx` inside the `(website)` layout so website routes set and restore token-backed body background/color while mounted. This fixes dark-mode body/overscroll color without broad `body` rules that could leak into owner-dashboard pages. The pass also extends shared reveal wrappers to `ResourcesHub`, `ArticleLayout`, and `IndustryLandingPage`, applies mobile-safe grid sizing to legal pages, guards sticky feature-story containers against width bleed, and compacts the mobile analytics consent panel. Product runtime, pricing/payment, auth, Firebase, Cloud Functions, owner dashboard, and customer menu surfaces were not changed.

**Workflow source map:** v3.5.6 replaces the compact homepage workflow pipeline in `InteractiveWorkflowSection.tsx` with a clearer input -> MenuList -> output source map. It uses the official `LogoMark`, existing workflow copy, locale-backed output labels, and website CSS tokens so the section explains photo/PDF/text input, owner review, and official public outputs without becoming the hero visual.

**Supporting page source maps:** v3.5.7 replaces the older animated SVG diagrams in `ProductPage.tsx` and `MultiLocationPage.tsx`. The How It Works page now uses a static source-to-surfaces map, and Multi-location uses a static approved-master-to-outlets map. Both reuse official logo treatment, shared theme-aware flow tokens, locale-backed labels, and non-animated base path styling so they feel like MenuList product proof instead of generic SaaS architecture art. v3.6.4 uses mobile-only row flow for homepage and How It Works diagrams: horizontal input row, centered MenuList review row, output row/cards below, and separate edge-anchored static dotted path geometry for mobile. v3.6.5 adds a shared CSS/SVG pulse overlay on top of the static paths: homepage and How It Works pulse from inputs into MenuList, pause while the center rings keep a light always-on pulse, and then move from MenuList toward outputs; Multi-location pulses from approved master toward outlet cards. Destination cards also use a synchronized border-only highlight when the pulse reaches them. The path pulse, ring pulse, and border-highlight layers are disabled under `prefers-reduced-motion`.

**Reassurance copy cleanup:** v3.6.1 removes the old `WebsiteMobileSupportHint` and `WebsiteOwnerApprovalHint` helpers from supporting-page heroes and the homepage final CTA. Phone/PWA operation and review-before-publish remain as contextual proof in the homepage hero/get-started/upload flow and FAQ copy, but pricing, footer, and final CTA no longer repeat the full customer-surface list. Pricing/payment/subscription/Razorpay/auth/onboarding and `/create-menu` runtime logic were not changed.

**Whole-page reference pass:** Stage 7.3 corrected the footer-only scope by adding `RevenuePathSection.tsx`, reshaping `ProblemSection.tsx`, and upgrading `StatsSection.tsx` into a stronger proof band. The page now moves from official source -> revenue path -> public drift pain -> one-source proof -> workflow and visual evidence.

**Copy, motion, and heading polish:** Stage 7.4 normalized homepage wording, casing, and grammar in the `Website` locale namespace, removed viewport-scaled website typography, added subtle hover polish to proof/path/problem elements, updated shared scroll animations to respect reduced-motion preferences, and routed static website hero/section headings through `WebsiteHeadline` for consistent highlight treatment.

**Supporting-page revenue polish:** Stage 7.5 extended the official-source system across supporting pages. `AboutPage`, `ContactPage`, `GetStartedPage`, `TrustSecurityPage`, and `pricing-pages/index.tsx` now use shared hero/proof patterns where appropriate; pricing visual copy was hardened without changing payment, subscription, Razorpay, auth, or onboarding logic; `/how-it-works` and `/multi-location` now avoid overclaiming instant propagation in public copy.

**Mobile website polish:** Stage 7.7 tightened `website.css` mobile behavior across the homepage and supporting pages. Mobile controls now use 44px-class touch targets, the revenue path and proof sections use denser mobile grids, the footer navigation keeps tappable links, and stale `/multi-location` locale overrides were normalized away from instant/always-consistent claims. Pricing/payment/auth/create-menu runtime logic was not changed.

**Search/AI discovery proof:** Stage 7.8 added `SearchDiscoverySection.tsx` after `SurfacesSection.tsx`. It exposes shipped SEO/AEO and discovery infrastructure in calm owner language: owner SEO/AEO settings, Business Copy Setup, structured public business/menu facts, sitemap/robots rules, and LLM discovery files. The copy explicitly avoids ranking, citation, or placement guarantees. SEO/AEO runtime, `/api/seo`, Business Copy Setup, mobile owner screens, pricing/payment/auth, and create-menu runtime logic were not changed.

**Agent context hardening:** v3.5.9 updates `public/llms.txt` and `public/llms-full.txt` after reviewing Chrome's agentic web / WebMCP guidance. The files now define the MenuList PAL boundary: public agents may read owner-published facts and route users to official handoff links, but may not mutate owner-approved truth, POS state, billing, prices, hours, item availability, or sensitive food claims. No homepage layout, SEO runtime, pricing/payment/auth, onboarding, or create-menu runtime behavior changed.

**Agent-readable SEO/AEO hardening:** v3.6.0 moves homepage JSON-LD to server-rendered HTML, adds reusable `WebsitePageStructuredData` coverage for active platform pages, normalizes public discovery URLs to `https://menulist.ai`, and removes the legacy `/product` redirect from sitemap and LLM inventories. The new `npm run verify:agent-readiness` check verifies MenuList and Answerlattice route registries, structured-data wrappers, robots/LLM links, and redirected-route omissions. WebMCP, MCP, pricing/payment/auth, onboarding, and `/create-menu` runtime behavior were not changed.
The legacy redirect is also registered in `next.config.js` so crawlers receive an HTTP 308 before page streaming begins.
The existing public platform-domain env config now uses `NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.ai`; `menulist.online` remains an alias, not the canonical discovery host.

**Resources + AI discovery layer:** v3.6.15 adds `/resources` plus 12 resource article routes for menu source audit, menu engineering, QR menu setup, PDF replacement, Google Business Profile menu source, official menu source, restaurant menu SEO, AI search menu discovery, menu update checklist, QR placement checklist, menu engineering worksheet, and multi-location menu management. Content and localized cluster labels live in `src/content/websiteResources/`, pages render through `src/components/website/resources/`, schema comes from `src/lib/website/resourceSchema.ts`, article breadcrumbs use `Home -> Resources -> Article`, and discovery updates flow through `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/robots.txt`, `public/llms.txt`, `public/llms-full.txt`, and `verify:agent-readiness`. This is static website content only; owner dashboard, customer menu runtime, auth, billing, Firebase, Cloud Functions, Canonica, Answerlattice, MyCodex, GrowthOS, and KitStamp surfaces were not changed.

**Resources localization guardrails:** v3.6.16 moves long-form resource localization into structured locale packs with source-version tracking, reviewed status, stable section IDs, stable FAQ IDs, and `buildLocalizedWebsiteResources()`. Hindi (`hi-IN`) is now a full reviewed resource pack for the hub and all 12 articles. `npm run verify:website-resource-locales` checks reviewed packs for completeness, stale source version, forbidden claims, missing sections/FAQ, and English body fallback.

**Hindi resource URL layer:** v3.6.18 adds reviewed Hindi resource routes at `/hi-IN/resources` and `/hi-IN/resources/[slug]` through the same `ResourcePageShell` used by the English routes. Hindi resource pages have localized metadata, JSON-LD `inLanguage`, `alternates.languages`, sitemap hreflang coverage, LLM context coverage, and verifier coverage. Tamil, Telugu, Marathi, and Bengali were intentionally deferred at this stage and were later added by v3.6.19.

**Indian resource pack rollout:** v3.6.19 adds reviewed Tamil (`ta-IN`), Telugu (`te-IN`), Marathi (`mr-IN`), and Bengali (`bn-IN`) resource packs for the hub and all 12 articles. At that stage, the localized route layer exposed Hindi, Tamil, Telugu, Marathi, and Bengali resource URLs with localized metadata, JSON-LD `inLanguage`, `alternates.languages`, sitemap hreflang coverage, LLM context coverage, and `verify:website-resource-locales` coverage. This is static website content only; owner app, customer menu runtime, auth, billing, Firebase, Cloud Functions, Answerlattice, Canonica, MyCodex, GrowthOS, and KitStamp surfaces were not changed.

**Full resource locale coverage:** v3.6.20 adds reviewed Arabic (`ar-SA`) and Spanish (`es-ES`) resource packs for the hub and all 12 articles. The localized resource layout now loads all active website locale JSON files and applies RTL direction for Arabic. `verify:website-resource-locales` now fails if any active non-default website-switcher language lacks a reviewed resource pack, route, sitemap, hreflang, and LLM context coverage.

**Resource navigation and discovery hardening:** v3.6.21 updates the website to match the complete resource strategy without changing product runtime. Header navigation is now Features -> How it works -> Multi-location -> Pricing -> Resources, with a compact desktop Resources dropdown and mobile nested resource links. The homepage Resources section now uses the eight strategic cards: Menu engineering, QR menu setup, Digital menu vs PDF, Google menu source, Restaurant menu SEO, AI search discovery, Official menu source, and Multi-location control. Footer Resources links now point to the core resource set plus Trust & Security. `public/robots.txt` now groups named search/AI crawlers with the same private-route disallows as the generic crawler group, `CCBot` is listed in `DISCOVERY_CRAWLERS`, and `llms.txt` / `llms-full.txt` now include preferred positioning and claim limits. Resource analytics remains GA4-only and now includes secondary CTA, upload-menu, pricing, AI/search referrer events including `chat.openai.com`, UTM/referrer properties, locale, entry page, target URL, and anonymous session-scoped IDs. The search/discovery-ready product copy was softened so it describes a clearer public source for crawlers rather than implying search or AI systems must answer from MenuList. Owner dashboard, customer menu runtime, tenant routing, auth, middleware, Firebase, Cloud Functions, Canonica, Answerlattice, MyCodex, GrowthOS, and KitStamp surfaces were not changed.

**Resource expansion and industry pages:** v3.6.22 adds three resource articles for restaurant menu schema, official menu URL checks, and common QR menu mistakes; updates every reviewed resource locale pack to the new source version; adds four industry landing pages for restaurants, cafes/bakeries, takeaway/cloud kitchens, and multi-location food businesses; extends sitemap, LLM context, and discovery-policy coverage; and adds a real checklist-copy button/event for visible checklist sections. `resource_template_download` remains intentionally absent because there are no downloadable assets to track. Owner dashboard, customer menu runtime, tenant routing, auth, middleware, Firebase, Cloud Functions, Canonica, Answerlattice, MyCodex, GrowthOS, and KitStamp surfaces were not changed.

**Marketing feedback quality pass:** v3.6.23 sharpens the highest-value English resource and industry pages after marketing review. The live copy now uses `Official Menu Source` as the category concept and `current approved menu` as the owner-readable explanation across `/resources/official-menu-source`, `/resources/menu-source-audit`, `/resources/google-business-profile-menu`, `/resources/qr-menu-for-restaurants`, `/resources/multi-location-menu-management`, and `/industries/restaurants`. The pass intentionally does not add comparison pages, bars/pubs, food trucks, or additional generic resources until there is enough reviewed content depth. Owner dashboard, customer menu runtime, tenant routing, auth, middleware, Firebase, Cloud Functions, Canonica, Answerlattice, MyCodex, GrowthOS, and KitStamp surfaces were not changed.

**Public truth indexing guardrail:** v3.6.24 implements the long-term business-page strategy without adding directory pages. `src/lib/seo/publicTruthIndexing.ts` centralizes the indexability policy for public tenant OBP/menu pages. `src/app/client/[[...slug]]/page.tsx` applies `index, follow` or `noindex, follow` metadata from that policy, and `src/app/client/sitemap.ts` uses the same gate before adding OBP, menu, outlet, or outlet-menu URLs to a tenant sitemap. `src/app/client/obp/OBPResolvedSurface.tsx` no longer emits generated hidden FAQPage JSON-LD; OBP discovery now stays on visible LocalBusiness/Restaurant/Menu-style business records. This guardrail does not create unclaimed business pages, city/category pages, keyword-variant restaurant pages, owner dashboard changes, auth changes, Firebase changes, Cloud Function changes, Canonica changes, Answerlattice changes, MyCodex changes, GrowthOS changes, or KitStamp changes.

**Default resource route stability:** The unprefixed `/resources` and `/resources/[slug]` routes are the English public source routes. They render through `DefaultWebsiteResourceLocaleBoundary` with `WEBSITE_RESOURCE_DEFAULT_LOCALE` so a visitor's locale cookie cannot change canonical English resource content. Locale-specific content must live on reviewed locale-prefixed routes such as `/hi-IN/resources/[slug]`, `/ar-SA/resources/[slug]`, and `/es-ES/resources/[slug]`.

**POS Sync operations proof:** Stage 7.10 added one POS Sync proof point to `SmartFeaturesSection.tsx` and one Operations card to `FeaturesPage.tsx`. This is intentionally low prominence because POS Sync is an advanced operations capability, not the first-screen buying promise for a non-technical SMB owner. Copy uses signed full-menu snapshot and connected store POS webhook language and does not claim universal POS support, real-time sync, or a POS integration suite. POS Sync runtime, APIs, settings behavior, pricing/payment/auth, and create-menu runtime logic were not changed.

**Mobile owner operations proof:** Stage 7.11 added a dedicated Operations card to `FeaturesPage.tsx` for phone-browser/PWA owner management. This expands the existing short reassurance line into a feature-level proof point, grounded in existing mobile owner surfaces rather than a new runtime change. Mobile owner runtime, dashboard logic, digital screens runtime, POS Sync runtime, pricing/payment/auth, and create-menu runtime logic were not changed.

**Staff access operations proof:** Stage 7.12 added one staff-access proof point to `SmartFeaturesSection.tsx`, one Operations card to `FeaturesPage.tsx`, and one FAQ entry. Copy is grounded in shipped staff management: email or Staff ID/passcode access, role assignment, passcode reset, and owner force sign-out. Staff/auth runtime, role/permission APIs, pricing/payment/auth, and create-menu runtime logic were not changed.

**Business Health operations proof:** v3.6.32 adds one Business Health card to the Features page Operations group. It is intentionally a compact inventory proof, not a second homepage section and not an analytics cross-map block. Copy can use AI health-check positioning but stays inside the diagnostic boundary: Business Health checks and explains; AI Menu Manager or existing owner screens handle approved fixes. Avoid chatbot, realtime sales, revenue optimization, prediction, competitor tracking, external auto-posting, and autonomous public-truth mutation claims.

**Staff access policy alignment:** Stage 7.13 updated public Privacy Policy, Terms of Service, and Trust & Security content to reflect owner-managed staff identities, role/store-scoped access, passcode reset metadata, authorized team access, and owner session revocation controls. This was a content/security-disclosure alignment only; no staff/auth runtime behavior changed.

**Homepage compression and demo proof:** Stage 8.0 compressed the homepage after live-site audit feedback. It moved `ProblemSection` directly after the hero, removed repetitive/advanced sections from the mounted homepage flow, added a header Demo link to `#customer-demo`, moved the hero secondary CTA to the customer preview, aligned hero microcopy with the 7-day setup pricing promise, changed the public wordmark to `MenuList`, and tightened security FAQ language. Pricing, payment, subscription, Razorpay, auth, onboarding, `/create-menu` extraction, POS Sync runtime, analytics runtime, and owner dashboard logic were not changed.

**Canonical cleanup:** v3.3.0 made this implementation the only website source-code version. Old source-code backups, backup restore docs, the dead `HowItWorksSection.tsx`, and unused legacy landing-template visuals were removed. Historical strategy docs may remain for context, but they are not restoration sources.

---

## 5. Component Directory Structure

```
src/components/website/
├── Header.tsx                  — Shared header (all pages)
├── Footer.tsx                  — Shared revenue footer with CTA, proof cards, product/source/resource/legal navigation, social links, bottom-row language, and theme controls
├── SchemaMarkup.tsx            — Server-rendered homepage JSON-LD schema
├── WebsitePageStructuredData.tsx — Server-rendered WebPage + BreadcrumbList JSON-LD for active platform pages
├── GoogleAnalytics.tsx         — GA tracking script
├── ClarityAnalytics.tsx        — Microsoft Clarity script
├── home/                       — compressed homepage sections + supporting section components + StickyCta
├── about/AboutPage.tsx         — About page
├── contact/ContactPage.tsx     — Contact page
├── features/FeaturesPage.tsx   — Features page
├── features/BusinessHealthFeaturePage.tsx — Business Health campaign page
├── get-started/GetStartedPage.tsx  — Get Started page
├── multi-location/MultiLocationPage.tsx — Multi-Location page
├── product/ProductPage.tsx     — How It Works page (used by /how-it-works route)
├── resources/                   — Resources hub, article layout, resource cards, schema wrapper, and GA4-only link tracking
├── industries/                   — Shared industry landing-page renderer
├── legal/                      — PrivacyPolicyPage, TermsOfServicePage, RefundPolicyPage
├── trust-security/TrustSecurityPage.tsx — Trust & Security page
├── pricing/PricingWrapper.tsx  — Pricing page wrapper
├── pricing-pages/              — Full pricing UI (PlanCard, FeatureComparisonTable,
│   │                             OnboardingModal, SubscriptionManagement, CreditPackCard,
│   │                             CurrencySwitcher, PricingFaq, WelcomeBackBanner, etc.)
│   └── shared/                 — CreditPacksCtaSection, EnterpriseCtaSection, Loader, SVGBg
├── shared/                     — Reusable components (see below)
└── shadcn/                     — shadcn/ui primitives still required by website layout and pricing
```

Build compatibility defaults:

```
src/pages/
├── _app.tsx       — Pass-through Pages Router app
├── _document.tsx  — Standard Html/Head/Main/NextScript document
└── _error.tsx     — Delegates to Next's default error component
```

### Shared Components (`src/components/website/shared/`)

| Component | Purpose |
|-----------|---------|
| `AnimateOnScroll.tsx` | Visibility-safe website wrapper; keeps content readable even when scroll animation observers do not fire |
| `LogoMark.tsx` | Static official MenuList mark used by website header/footer, matched to the app icon / `AnimatedVerticalLogo` geometry |
| `ScrollToTopButton.tsx` | Desktop-only floating scroll-to-top button; disabled on mobile to avoid fixed repaint layers |
| `SectionHeading.tsx` | Section heading wrapper backed by `WebsiteHeadline` |
| `SectionWrapper.tsx` | Section layout wrapper with consistent spacing |
| `WebsiteButton.tsx` | Styled CTA button |
| `WebsiteDocumentTheme.tsx` | Website-layout helper that scopes body background/color to website routes and restores prior app body styles on unmount |
| `WebsiteFeatureCard.tsx` | Shared spacious proof/feature card with consistent top-right icon placement |
| `WebsiteHeadline.tsx` | Shared hero/section headline renderer with consistent highlight styling |
| `WebsitePageHero.tsx` | Shared supporting-page hero with eyebrow, headline, subline, and CTA slots |
| `WebsiteProofStrip.tsx` | Shared proof strip used by supporting pages |
| `WebsiteLanguageSwitcher.tsx` | Language dropdown (8 languages), mounted in the footer |
| `WebsiteThemeSwitcher.tsx` | Compact footer Light/System/Dark segmented control backed by the website `ThemeProvider` |

---

## 6. Localization (i18n)

- Config: `src/config/websiteLanguages.ts` (8 languages)
- Switcher: `WebsiteLanguageSwitcher.tsx` — mounted in the footer bottom control row and auto-detects position (opens upward near bottom)
- Locale files (website namespace):
  `public/locales/menulist.ai/en-US.json`, `public/locales/menulist.ai/hi-IN.json`,
  `public/locales/menulist.ai/ta-IN.json`, `public/locales/menulist.ai/te-IN.json`,
  `public/locales/menulist.ai/mr-IN.json`, `public/locales/menulist.ai/bn-IN.json`,
  `public/locales/menulist.ai/ar-SA.json`, `public/locales/menulist.ai/es-ES.json`
- Pattern: `useTranslations('Website')` with `t('Section.keyName')`
- **Fully translated:** en-US + hi-IN (all sections)
- **Core sections translated:** ar-SA, es-ES, ta-IN, te-IN, mr-IN, bn-IN (Header/Footer/Hero; rest falls back to English via deepMerge)
- **Long-form resources:** Resource articles use `src/content/websiteResources/`. `en-US` is the source, and `hi-IN`, `ta-IN`, `te-IN`, `mr-IN`, `bn-IN`, `ar-SA`, and `es-ES` are reviewed full packs for the current 15-article registry that pass `npm run verify:website-resource-locales`.
- **Website language switcher:** `WEBSITE_LANGUAGES` drives 8 selectable locales
  (`en-US`, `hi-IN`, `ta-IN`, `te-IN`, `mr-IN`, `bn-IN`, `ar-SA`, `es-ES`) from `src/config/websiteLanguages.ts`.
- **Website theme switcher:** `WebsiteThemeSwitcher.tsx` exposes Light, System, and Dark choices as a compact footer segmented control and persists through the existing `ThemeProvider` localStorage contract.
- Additional locale files (`en-GB`, `gu-IN`, `zh-CN`) exist in `public/locales/menulist.ai/` for broader app usage and fallback-only coverage.

---

## 7. Feature Flags

| Flag | File | Default | Purpose |
|------|------|---------|---------|
| `ENABLE_PUBLIC_MENU_ENTRY` | `src/config/features.ts` | `true` | Gates `/create-menu` public entry page |
| `ENABLE_WEBSITE_RESOURCES` | `src/config/features.ts` | `true` | Gates `/resources`, resource article routes, resource navigation, and discovery content |

**Note:** `ENABLE_NEW_WEBSITE` no longer exists. The current website is the canonical default.

---

## 8. SEO Infrastructure

- All non-homepage pages are **server components** with `export const metadata` (unique title, description, canonical, OG)
- Homepage is a server shell that uses default metadata from layout + server-rendered `SchemaMarkup` JSON-LD before rendering the client homepage sections
- `src/constants/menulist/website.ts` is the shared MenuList website metadata source and uses the production deployment target for canonical metadata/schema URLs
- `SchemaMarkup.tsx` injects Organization, WebSite, SoftwareApplication, WebPage, and BreadcrumbList schema on homepage through `JsonLdScript`
- `WebsitePageStructuredData.tsx` injects WebPage and BreadcrumbList schema on active platform pages using the same production canonical URL source
- `/create-menu/success` keeps post-setup query URLs out of indexable discovery with server-emitted `noindex, nofollow, nocache` metadata and a self canonical to the non-query success path
- Sitemap: `src/app/sitemap.ts` and `public/sitemap.xml` use the shared active route inventory and omit the legacy `/product` redirect
- Robots: Full crawling enabled (index, follow, max-image-preview: large) with non-www canonical discovery links
- Agent context: `public/llms.txt` and `public/llms-full.txt` define public business fact access, official handoff boundaries, unknown handling, and WebMCP/MCP deferral
- Per-page canonical URLs via `alternates.canonical`
- Verification: `npm run verify:agent-readiness` checks platform/Answerlattice discovery registries, structured-data coverage, robots, sitemap, LLM files, MenuList canonical metadata constants, schema URL source, stale fallback metadata removal, and the post-setup noindex guard. `npm run verify:website-resource-locales` checks reviewed resource locale packs.

---

## 9. Styles

- **Layout:** `@styles/app.scss` (imported in layout.tsx)
- **Pages:** `@/styles/website.css` (imported per-page via page.tsx files)
- **Approach:** CSS variables for colors, responsive breakpoints, mobile-first spacing, and 44px-class touch targets
- **Components:** Mix of Tailwind CSS + custom CSS + shadcn/ui
- **Theme:** System-preference light/dark mode via `ThemeProvider`; `website.css` provides the public website token set and `pricing-pages/main.css` bridges the shadcn/Tailwind pricing variables
- **Service worker boundary:** `ServiceWorkerRegister.tsx` registers owner Workbox `/sw.js` only on owner/app platform routes and unregisters it on public marketing routes. If a stale worker controlled the current public page, the page reloads once after unregistering so Safari moves to the network-controlled website. Customer tenant origins still use `sw-customer.js`.
- **Pages Router defaults:** `src/pages/_app.tsx`, `src/pages/_document.tsx`, and `src/pages/_error.tsx` are intentionally minimal. They satisfy Next's generated Pages Router manifest entries during production page-data collection and do not change the App Router website layout or route behavior. `MenuListServerChunkCompatPlugin` in `next.config.js` also repairs emitted page/app manifest entries when local worker builds produce route files but incomplete manifests.

---

## 10. Key Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Route group | `(website)` | Separates website from dashboard routes |
| SSR vs CSR | Server components (except homepage) | SEO benefit for all pages |
| Homepage rendering | Server shell + client composition | Keeps homepage JSON-LD in first-response HTML while preserving translated interactive homepage sections and sticky CTA |
| Pricing | Reuses existing `pricing-pages/` components | Full Razorpay integration already built |
| Analytics | GA + Clarity in layout | Covers all pages automatically |
| Auth | `WebsiteAuthProvider` wrapper | Session context for pricing/onboarding flows |
| Theming | System-aware shadcn ThemeProvider plus footer theme segmented control and website CSS tokens | Light remains default for light system preferences; users can choose Light, System, or Dark from the footer; dark mode uses `#121212`-family surfaces, tokenized cards/forms/overlays, and dark-safe pricing variables |
| Localization | next-intl via layout provider | Consistent i18n across all pages |
| Pages Router defaults | Minimal `_app`, `_document`, `_error` | Keeps production builds stable while website routes remain App Router |

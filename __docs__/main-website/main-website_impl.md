# Main Website (menulist.ai) — Implementation

**Status:** IMPLEMENTED — v3.6.118 Website Audit Hardening
**Last Updated:** July 28, 2026
**Audience:** Developers

---

## 1. Architecture Overview

The main website lives in the `(website)` route group under Next.js App Router. All pages use a shared layout with system-aware light/dark theme tokens, localization, and analytics.

The v3.6.118 audit-hardening pass removes the authenticated Firebase sign-out chain from the anonymous Header bundle by dynamically importing it only after an authenticated logout action. Desktop Features and Resources panels derive visibility from the controlled React state and become `inert` plus `aria-hidden` while closed, preventing invisible links from entering keyboard navigation. The Features trigger also opens the controlled panel when activated, so access does not depend on pointer hover. `WebsiteProductPathProvider` derives `/ml` from `usePathname()` after hydration instead of forcing the shared website layout to call `headers()` only for alias routing. The layout still resolves locale/session-aware providers on the server, so no static-cache guarantee is claimed.

Accepted public contact rows retain the existing bounded single-write admission contract. The feature-flagged `GET /api/ops/website-enquiries` route requires current `PLATFORM` authority, applies a fail-closed production read limiter, scans at most 120 recent rows, projects only bounded response fields, returns `Cache-Control: no-store`, and performs no write or realtime listener. `/ops/website-enquiries` is the manual response inbox; it supports bounded filters, row details, and an operator-opened email reply. Response-time commitments and automatic notification remain intentionally absent.

Presentation corrections keep the homepage customer-link inclusions at three desktop columns, two tablet columns, and one phone column; raise desktop mega-menu supporting-copy size; and only mount the floating CTA when both viewport width and height leave enough unobstructed reading space. The public X link was removed because no maintained destination exists. Create-preview, contact success, and Trust & Security hero wording now use plain, supportable owner language rather than technical or absolute claims.

The v3.6.117 homepage preview repair keeps `CreateMenuPreviewSection` code-native and interactive instead of replacing it with a static marketing asset. The contrast-panel header uses the dedicated contrast token family. The selected photo or owned-link example renders inside one preview sheet with semantic list rows, a responsive three-step review rail, and a compact guardrail footer. Phone layouts stack the review rail without introducing nested bordered cards or horizontal overflow; desktop keeps the same two-column conversion composition. The selector still changes browser-local example copy only and continues to route the real action to `/create-menu`.

The v3.6.116 `/how-it-works` source-map repair keeps separate connector networks for each layout topology instead of stretching one SVG across incompatible card grids. `ProductPage.tsx` retains the existing desktop network, uses the established compact network from 521px through 768px, and adds a phone-specific network at 520px and below. The phone paths meet source and output card edges through the empty center gutter, remain behind the cards, and preserve the source -> owner review -> customer outputs story. CSS makes exactly one responsive connector network visible at a time. Reduced-motion behavior continues to suppress the pulse overlay while leaving the static path available.

The v3.6.115 audit aligns the complete acquisition journey with current runtime: homepage and How It Works advertise only the public photo/image or owned-link intake; `/ml/create-menu` and its preview retain the product alias; the seven-day setup explains that the starter URL/QR can be used during setup and needs a paid plan before the deadline to stay live; pricing comparison language preserves entitlement values while removing unsupported posting, search, speed, and accuracy claims. Contact success now means “recorded,” not guaranteed team delivery. The footer exposes About and Contact and uses real route/anchor targets. Protected owner pages emit `noindex, nofollow, nocache`.

Accessibility hardening keeps the mobile drawer focus-contained with Escape/focus restoration, gives desktop dropdown triggers expanded/control state without invalid menu roles, gives Pricing the shared `main-content` landmark, makes the full create-menu drop zone keyboard-operable, provides form labels and localized field errors, removes hidden sticky-CTA focus targets, strengthens muted text contrast, and avoids loading the hero video for reduced-motion visitors. These are presentation and website-boundary changes only; extraction, publish, cache, subscription, payment, owner-dashboard data, Firebase, and provider contracts are unchanged.

Route metadata with an Open Graph object must pass through `completeWebsiteMetadata`. Next.js replaces nested metadata objects at the leaf route, so the helper preserves each route's title, description, canonical URL, and article fields while restoring the approved MenuList preview image and matching Twitter title/description. The same completion applies to generated localized Resource metadata. `npm run verify:website-public-copy-boundary` scans every website page with Open Graph metadata and fails if this completion is bypassed.

The latest analytics pass adds consent-gated Plausible Cloud support for the MenuList and Answerlattice public marketing websites only. The scripts mount only after analytics consent and only when the product-specific Plausible domain env var is configured. GA4 remains available for paid-ad/conversion continuity, Microsoft Clarity remains MenuList-only and env-gated by `NEXT_PUBLIC_CLARITY_ID` for visual behavior observation, and product analytics plus owner-facing business truth stay in the existing MenuList-owned analytics pipeline.

Google Analytics page views strip query strings and hash fragments from `page_location`, and the GA script fails closed unless `NEXT_PUBLIC_GA_MEASUREMENT_ID` matches the GA4 `G-...` measurement-id shape. Public utility-route query strings, report hash payloads, and success-page URLs should not enter default GA page-view URLs.

Resource GA4 custom-event payloads are bounded through `trackGoogleMarketingEvent`: resource page, CTA, AI/referrer, create-menu/pricing, and checklist-copy event strings strip control characters and cap URL/referrer/UTM-style values before GA4 receives them. Resource Plausible events remain property-free.

The public contact write boundary is `POST /api/public/contact`. It applies the `MENULIST_CONTACT_FORM` limiter with fail-closed behavior for limiter infrastructure errors, rejects JSON above 8KB, validates the exact form/report-summary DTO, ignores honeypot submissions, and verifies Turnstile before the single Admin SDK write. Turnstile delivery uses a fixed endpoint, manual redirect handling, an 8-second abort deadline, bounded JSON response parsing, and `finally` timer cleanup. Persisted `sourcePath` and `referrer` retain only path/origin-path identity, never query strings or fragments; optional numeric report values use nullish preservation so zero remains zero. `npm run verify:public-contact-boundary`, `npm run test:public-contact-boundary`, and `npm run test:public-turnstile-boundary` guard these contracts.

The general `/contact` success state confirms successful admission and availability in the private platform inbox. A verified platform operator owns manual review through `/ops/website-enquiries`; the source does not claim that a row was already read, promise a response time, or send an automatic notification.

The contact collection keeps query/routing scalars indexed, including the scoped Report Leads `sourceKind + createdOn` path. `landingPageEnquiries.message` and `landingPageEnquiries.sourceContext` are exact-document payload fields and are exempt from unused automatic indexing. This reduces index-entry fanout and storage without changing admission, the one-write success path, private Ops projection, or end-user behavior. The validated QA index deploy currently remains pending because the July 17 `menulist-qa` attempt failed before upload with Firebase Rules test-endpoint HTTP 403 caller permission.

`WebsiteProductPathProvider` remains the browser routing boundary for canonical website paths. The old private product-alias host is no longer active; do not route new campaign links through a discarded alias. `Header` and `WebsiteLanguageSwitcher` must not hardcode alias-only paths. `npm run test:website-product-path-boundary` exercises canonical, historical alias, reviewed-locale, external/unsafe, and app-route cases without network or browser work.

Public legal copy follows runtime truth. Terms do not promise universal publishing, absolute ownership of generated output, or external provider certification. Refund copy does not promise fixed 30-day deletion or all-plan access. Cancelled/paused subscriptions keep the purchased plan mirror only through a valid paid `cycleEndDate`; the existing leased maintenance scheduler expires at most 500 due rows per hourly run and repairs store/platform entitlement. External legal approval and target deploy evidence remain separate from source completion.

```
Route Group: src/app/(website)/
Layout:      LocalisationProvider → WebsiteAuthProvider → ThemeProvider (system preference or footer override)
Analytics:   WebsiteAnalyticsConsent -> PlausibleAnalytics + GoogleAnalytics + ClarityAnalytics + WebsiteMarketingClickTracker after accepted analytics consent
Styles:      @styles/app.scss (layout) + @/styles/website.css (per-page)
Build:       Minimal src/pages defaults satisfy generated Pages Router manifest entries
```

---

## 2. Pages & Routes

| Route | File | Component | Type | Metadata |
|-------|------|-----------|------|----------|
| `/` | `(website)/page.tsx` | `HomePage` | Server shell with client homepage sections | Default from layout + server JSON-LD |
| `/ai-menu-manager` | `(website)/ai-menu-manager/page.tsx` | `AiMenuManagerPage` | Server route + client feature page | Per-page `export const metadata` |
| `/whatsapp` | `(website)/whatsapp/page.tsx` | `WhatsAppOnboardingPage` | Server route + client campaign page | Per-page `export const metadata` |
| `/features` | `(website)/features/page.tsx` | `FeaturesPage` | Server | Per-page `export const metadata` |
| `/features/menu-import` | `(website)/features/menu-import/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/menu-content-prep` | `(website)/features/menu-content-prep/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/featured-choices` | `(website)/features/featured-choices/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/official-business-page` | `(website)/features/official-business-page/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/qr-menu-links` | `(website)/features/qr-menu-links/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/print-ready-kit` | `(website)/features/print-ready-kit/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/owner-phone-dashboard` | `(website)/features/owner-phone-dashboard/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/analytics` | `(website)/features/analytics/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/menu-quality-validation` | `(website)/features/menu-quality-validation/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/business-health` | `(website)/features/business-health/page.tsx` | `BusinessHealthFeaturePage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/customer-feedback-loop` | `(website)/features/customer-feedback-loop/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/features/public-discovery` | `(website)/features/public-discovery/page.tsx` | `FeatureDetailPage` | Server route + client feature page | Per-page `export const metadata` |
| `/how-it-works` | `(website)/how-it-works/page.tsx` | `ProductPage` | Server | Per-page |
| `/pricing` | `(website)/pricing/page.tsx` | `PricingWrapper` | Server | Per-page |
| `/about` | `(website)/about/page.tsx` | `AboutPage` | Server | Per-page |
| `/contact` | `(website)/contact/page.tsx` | `ContactPage` | Server | Per-page |
| `/faq` | `(website)/faq/page.tsx` | `FaqPage` | Server route + client FAQ accordions | Per-page `export const metadata` |
| `/get-started` | `(website)/get-started/page.tsx` | `GetStartedPage` | Server | Per-page |
| `/multi-location` | `(website)/multi-location/page.tsx` | `MultiLocationPage` | Server | Per-page |
| `/trust-security` | `(website)/trust-security/page.tsx` | `TrustSecurityPage` | Server | Per-page |
| `/create-menu` | `(website)/create-menu/page.tsx` | `CreateMenuClient` | Server (gate) | Per-page |
| `/create-menu/preview/[draftId]` | `(website)/create-menu/preview/[draftId]/page.tsx` | `PreviewClient` | — | — |
| `/create-menu/success` | `(website)/create-menu/success/page.tsx` + `CreateMenuSuccessClient.tsx` | `CreateMenuSuccessClient` | Server metadata wrapper + client success UI | `noindex, nofollow, nocache` |
| `/resources` | `(website)/resources/page.tsx` | `ResourcesHub` | Server | Per-page |
| `/tools` | `(website)/tools/page.tsx` | `ToolsHubPage` | Feature-gated static route with client index component | Per-page |
| `/tools/reports` | `(website)/tools/reports/page.tsx` | `ToolReportPage` | Server route + client hash-fragment report viewer | Per-page |
| `/tools/public-truth-check` | `(website)/tools/public-truth-check/page.tsx` | `PublicTruthCheckPage` | Server route + client browser-local tool | Per-page |
| `/tools/qr-link-health-check` | `(website)/tools/qr-link-health-check/page.tsx` | `QrLinkHealthCheckPage` | Server route + client browser-local tool | Per-page |
| `/tools/menu-readability-check` | `(website)/tools/menu-readability-check/page.tsx` | `MenuReadabilityCheckPage` | Server route + client browser-local tool | Per-page |
| `/tools/customer-question-coverage-check` | `(website)/tools/customer-question-coverage-check/page.tsx` | `CustomerQuestionCoverageCheckPage` | Server route + client browser-local tool | Per-page |
| `/tools/customer-faq-reply-pack` | `(website)/tools/customer-faq-reply-pack/page.tsx` | `CustomerFaqReplyPackPage` | Server route + client browser-local tool | Per-page |
| `/tools/booking-inquiry-readiness-check` | `(website)/tools/booking-inquiry-readiness-check/page.tsx` | `BookingInquiryReadinessCheckPage` | Server route + client browser-local tool | Per-page |
| `/tools/price-availability-gap-check` | `(website)/tools/price-availability-gap-check/page.tsx` | `PriceAvailabilityGapCheckPage` | Server route + client browser-local tool | Per-page |
| `/tools/menu-pdf-cleanup-check` | `(website)/tools/menu-pdf-cleanup-check/page.tsx` | `MenuPdfCleanupCheckPage` | Server route + client browser-local tool | Per-page |
| `/tools/google-profile-basics-checklist` | `(website)/tools/google-profile-basics-checklist/page.tsx` | `GoogleProfileBasicsChecklistPage` | Server route + client browser-local tool | Per-page |
| `/tools/business-facts-copy-pack` | `(website)/tools/business-facts-copy-pack/page.tsx` | `BusinessFactsCopyPackPage` | Server route + client browser-local tool | Per-page |
| `/tools/customer-link-preview` | `(website)/tools/customer-link-preview/page.tsx` | `CustomerLinkPreviewPage` | Server route + client browser-local tool | Per-page |
| `/tools/social-bio-link-check` | `(website)/tools/social-bio-link-check/page.tsx` | `SocialBioLinkCheckPage` | Server route + client browser-local tool | Per-page |
| `/tools/whatsapp-action-link-check` | `(website)/tools/whatsapp-action-link-check/page.tsx` | `WhatsAppActionLinkCheckPage` | Server route + client browser-local tool | Per-page |
| `/tools/whatsapp-reply-pack` | `(website)/tools/whatsapp-reply-pack/page.tsx` | `WhatsAppReplyPackPage` | Server route + client browser-local tool | Per-page |
| `/tools/hours-check` | `(website)/tools/hours-check/page.tsx` | `HoursCheckPage` | Server route + client browser-local tool | Per-page |
| `/tools/photo-gap-check` | `(website)/tools/photo-gap-check/page.tsx` | `PhotoGapCheckPage` | Server route + client browser-local tool | Per-page |
| `/tools/qr-poster-maker` | `(website)/tools/qr-poster-maker/page.tsx` | `PrintShareToolPage` | Server route + client browser-local asset maker | Per-page |
| `/tools/whatsapp-menu-status-maker` | `(website)/tools/whatsapp-menu-status-maker/page.tsx` | `PrintShareToolPage` | Server route + client browser-local asset maker | Per-page |
| `/tools/holiday-hours-poster-maker` | `(website)/tools/holiday-hours-poster-maker/page.tsx` | `PrintShareToolPage` | Server route + client browser-local asset maker | Per-page |
| `/tools/customer-link-card-maker` | `(website)/tools/customer-link-card-maker/page.tsx` | `PrintShareToolPage` | Server route + client browser-local asset maker | Per-page |
| `/tools/feedback-qr-card-maker` | `(website)/tools/feedback-qr-card-maker/page.tsx` | `PrintShareToolPage` | Server route + client browser-local asset maker | Per-page |
| `/resources/[slug]` | `(website)/resources/[slug]/page.tsx` | `ArticleLayout` | Server static params | Dynamic per article |
| `/{locale}/resources` | `(website)/[locale]/resources/page.tsx` | `ResourceHubPageShell` | Server static params | Localized per-page for `hi-IN`, `ta-IN`, `te-IN`, `mr-IN`, `bn-IN`, `ar-SA`, `es-ES` |
| `/{locale}/resources/[slug]` | `(website)/[locale]/resources/[slug]/page.tsx` | `ResourceArticlePageShell` | Server static params | Localized per article for `hi-IN`, `ta-IN`, `te-IN`, `mr-IN`, `bn-IN`, `ar-SA`, `es-ES` |
| `/industries/restaurants` | `(website)/industries/restaurants/page.tsx` | `IndustryLandingPage` | Server | Per-page |
| `/industries/cafes-bakeries` | `(website)/industries/cafes-bakeries/page.tsx` | `IndustryLandingPage` | Server | Per-page |
| `/industries/takeaway-cloud-kitchens` | `(website)/industries/takeaway-cloud-kitchens/page.tsx` | `IndustryLandingPage` | Server | Per-page |
| `/industries/multi-location-food-businesses` | `(website)/industries/multi-location-food-businesses/page.tsx` | `IndustryLandingPage` | Server | Per-page |
| `/industries/salons-spas` | `(website)/industries/salons-spas/page.tsx` | `IndustryLandingPage` | Server | Per-page |
| `/industries/service-list-businesses` | `(website)/industries/service-list-businesses/page.tsx` | `IndustryLandingPage` | Server | Per-page |
| `/industries/local-service-businesses` | `(website)/industries/local-service-businesses/page.tsx` | `IndustryLandingPage` | Server | Per-page |
| `/invite` | `(website)/invite/page.tsx` | `OwnerReferralInvitePage` | Server wrapper + client hash-token intake | Private utility; `noindex`, omitted from sitemap/LLM discovery |
| `/product` | `(website)/product/page.tsx` | **Permanent redirect → `/how-it-works`** | Server | — |
| `/privacy-policy` | `(website)/privacy-policy/page.tsx` | `PrivacyPolicyPage` | Server | Per-page |
| `/terms-of-service` | `(website)/terms-of-service/page.tsx` | `TermsOfServicePage` | Server | Per-page |
| `/refund-policy` | `(website)/refund-policy/page.tsx` | `RefundPolicyPage` | Server | Per-page |

**Total: 190 implemented website routes (63 concrete route files + 15 generated English resource articles + 7 reviewed localized resource hubs + 105 reviewed localized resource articles)**

### Notes
- Homepage (`/`) is a server route that renders `SchemaMarkup` as server HTML before mounting the client homepage composition.
- `/whatsapp` is an informational campaign route for the source-implemented messaging-onboarding flow. It uses localized availability copy, page-level structured data, a chat-style proof visual, trust boundaries, `PLATFORM_DISCOVERY_PAGES`, static sitemap, and LLM context coverage. Checked-in Functions targets keep provider processing disabled, so both primary actions use the existing `/create-menu` signed-in photo or permission-confirmed public-link intake. The component must not contain a test number or active `wa.me` onboarding action.
- `/invite` is the private Owner Referral intake utility. The encrypted token stays in the URL fragment, the server route exports `noindex, nofollow, nocache`, and the route remains outside `PLATFORM_DISCOVERY_PAGES`, sitemap, `llms.txt`, and `llms-full.txt`.
- `/product` is a framework-level permanent redirect to `/how-it-works` (legacy URL preservation) and is intentionally omitted from sitemap and LLM discovery inventories.
- `/faq` carries the full 16-question owner FAQ that was removed from the homepage scroll. It is registered in platform discovery, static sitemap, footer resources, `llms.txt`, and `llms-full.txt`.
- `/tools` is the feature-gated public MenuList Tools hub. Concrete child routes under `/tools/*` are browser-local public acquisition tools, and `/tools/reports` is the hash-fragment public report viewer; all must stay in `PLATFORM_DISCOVERY_PAGES`, static sitemap, LLM context, and this route table.
- `/create-menu` is feature-gated by `ENABLE_PUBLIC_MENU_ENTRY` — shows a locale-backed guided-setup fallback when OFF.
- `/create-menu` uses a two-column desktop conversion layout: owner-readable context and one canonical process/proof set on the left, with the unchanged sign-in or authenticated source-entry task on the right. Below 960px it returns to document-flow order: heading, active action, then process and proof. The action panel must not become sticky because phone/OTP and source-entry states can exceed short viewport heights.
- `/create-menu/success` is a post-setup utility route that may carry query-string menu URLs. It must remain outside discovery inventories and emit explicit `noindex, nofollow, nocache` robots metadata from the server wrapper, with a self canonical to `/create-menu/success`.
- `/create-menu/success` Copy Link and WhatsApp handoffs are browser-local, use localized fixed failure copy, log bounded presence/length metadata only, open WhatsApp with `noopener,noreferrer`, and record starter activation signals only after copy/open succeeds. Copy Link falls through from rejected Clipboard API writes to acknowledged textarea fallback before failure.
- `/create-menu` upload/link creation, preview polling, and claim submission use same-origin credentials, no-store cache policy, and manual redirect handling before trusting route responses. Upload/link acknowledgements stay capped at 8KB, preview polling at 4MB, and claim acknowledgements at 32KB.
- `/pricing` subscription success dashboard handoff is browser-local, opens with `noopener,noreferrer`, logs bounded dashboard URL presence/length plus success-modal state only, and falls back to same-tab dashboard navigation if the browser blocks the new tab.
- `/resources` and resource article routes are feature-gated by `ENABLE_WEBSITE_RESOURCES`.
- Resource article routes are generated from `src/content/websiteResources/` and use `generateStaticParams()` for the 15 article slugs.
- Reviewed localized resource routes are generated from the same resource registry for `hi-IN`, `ta-IN`, `te-IN`, `mr-IN`, `bn-IN`, `ar-SA`, and `es-ES`; non-reviewed locales are not exposed as resource routes.
- Public website CTAs route to `/create-menu` for free-account-first menu intake. `/get-started` remains a guided setup/sign-in page and no longer acts as the primary homepage funnel.
- Next 16 uses native App Router document/error handling. The former `src/pages/_app.tsx`, `_document.tsx`, `_error.tsx`, and private manifest-repair plugin were removed after both Turbopack and Webpack production builds passed.

---

## 3. Layout

**File:** `src/app/(website)/layout.tsx`

```
LocalisationProvider (locale from next-intl/server)
  → WebsiteAuthProvider (`src/app/(website)/WebsiteAuthProvider.tsx`)
    → ThemeProvider
      → WebsiteDocumentTheme
      → WebsiteThemeShortcut
      → WebsiteAnalyticsConsent (wraps shared PublicCookieConsentBanner and gates PlausibleAnalytics/GoogleAnalytics/ClarityAnalytics/WebsiteMarketingClickTracker after accepted consent)
      → {children}
```

`src/components/shared/publicCookieConsent/PublicCookieConsentBanner.tsx` is the shared compact public-site cookie banner used by MenuList and sibling public product/brand websites. MenuList uses it for optional analytics consent; it must not be mounted on owner dashboards, customer menu/OBP output, or widget surfaces without a separate privacy review. Only exact `accepted` or `declined` values are admitted; corrupt values are removed and the panel is shown again. Public website consent storage diagnostics are bounded: failed reads log `public_cookie_consent_storage_failed` and show the consent panel again, failed removals ignore the corrupt choice, failed writes keep the page-local runtime choice, and analytics-helper consent-read failures log `public_website_plausible_consent_read_failed` before skipping events until consent can be read. The shared Plausible and Google event helpers recheck the current product-specific runtime or persisted choice on every emission, so changing from accepted to declined stops later event pings even though a vendor function may remain loaded. Raw storage keys, event names, page URLs, referrers, user identifiers, tenant/store/project identifiers, or browser exception messages must not be logged by this fallback.

`src/components/shared/publicAiSummaryLinks/PublicAiSummaryLinks.tsx` is the shared footer-level AI summary shortcut used by MenuList, AnswerLattice, and CampaignCue public marketing websites. MenuList mounts it in `Footer.tsx` with a localized label and a product-boundary prompt that points to the canonical website and `llms.txt`.

**Default metadata (from layout):**
- Title: `MenuList - One Official Customer Link for Menus and Services`
- Description: `Turn your current menu or service list into one official customer link for business page, QR, print files, customer actions, owner updates, feedback, and health checks.`
- Metadata base: production `https://menulist.ai` from `src/constants/menulist/website.ts`
- Canonical: `https://menulist.ai`
- OG image: `/images/website/menulist-og-official-source.png`
- Backward-compatible OG copy: `/og-image.png`
- Robots: index, follow (full crawling enabled)
- Viewport: device-width, initialScale 1; browser and operating-system zoom remain available

---

## 4. Homepage Sections (8 sections plus sticky CTA, in order)

**File:** `src/components/website/home/HomePage.tsx`

| # | Section | Component File |
|---|---------|---------------|
| 1 | Hero | `HeroSection.tsx` |
| 2 | Create menu preview | `CreateMenuPreviewSection.tsx` |
| 3 | Before/after | `BeforeAfterSection.tsx` |
| 4 | Customer browse proof | `CustomerBrowseSection.tsx` |
| 5 | Customer-link inclusions | `CustomerLinkIncludesSection.tsx` |
| 6 | Owner USP proof | `OwnerProofSection.tsx` |
| 7 | FAQ preview | `FaqSection.tsx` |
| 8 | Final CTA | `FinalCtaSection.tsx` |

`ProblemSection.tsx`, `SwitchComparisonSection.tsx`, `InteractiveWorkflowSection.tsx`, `PublicTruthLoopSection.tsx`, `AiMenuManagerSection.tsx`, `SetupReliefSection.tsx`, `SurfacesSection.tsx`, `BusinessHealthSection.tsx`, `ResourcesSection.tsx`, `RevenuePathSection.tsx`, `StatsSection.tsx`, `SearchDiscoverySection.tsx`, `AnalyticsInsightsSection.tsx`, `SmartFeaturesSection.tsx`, `BusinessSection.tsx`, and `IndustrySection.tsx` remain in the codebase as supporting components/future page material, but they are not mounted in the current compressed homepage. The old `SolutionSection.tsx` was removed in v3.5.8 because its one-source SVG and bullet grid duplicated the hero, problem, workflow source map, setup proof, and public-surface proof.

**Mobile try-first compression:** v3.6.100 moves `CreateMenuPreviewSection` almost immediately after the hero, replaces the old separate Problem and Switch comparison flow with `BeforeAfterSection`, combines AI Menu Manager and Business Health homepage proof into `OwnerProofSection`, removes the homepage resources bridge, and trims `FaqSection` to six conversion-critical questions. The full 16-question FAQ now lives on `/faq`. This is public website component/CSS/locale/discovery/docs work only; `/create-menu` processing, sign-in, upload/link validation, claim/publish behavior, Firebase rules, Cloud Functions, Vercel deployment, and DNS were not changed.

**Official customer link framing pass:** v3.6.70 makes the current website story explicit: one approved menu source becomes one official customer link, then QR, print, actions, owner updates, feedback, and health checks stay connected. `InteractiveWorkflowSection.tsx` now uses six guided lifecycle steps, `WebsiteReplacementBlock.tsx` is mounted on the homepage, pricing, and Official Business Page feature page, Pricing/Features/OBP metadata and locale copy are updated, and `public/llms.txt` / `public/llms-full.txt` use the same customer-link framing. The public Features page adds a lifecycle strip before the feature catalog. External-sync website copy is bounded as supported connected-system snapshot export only. This is public website component/CSS/locale/metadata/discovery/docs work only; owner dashboard runtime labels, customer menu/OBP runtime, pricing/payment/Razorpay/subscription logic, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

**Analytics feature page:** v3.6.71 adds `/features/analytics` for the existing owner analytics dashboard. The route shell renders `FeatureDetailPage` with the `analytics` config, localized English/Hindi copy, and page metadata. The `/features` Menu analytics card now links to it, and platform discovery is updated through `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt`. The page stays bounded to implemented desktop/mobile Owner Dashboard behavior: today, overview, daily, weekly, monthly, and overall views; public menu activity; item status labels; searched-but-not-found terms; unavailable demand; actions while open, closed, or unknown; Official Business Page actions; customer app activity; aggregate privacy-conscious signals; and Business Health handoff. As of v3.6.86, Analytics Dashboard is included in `websiteFeatureNavGroups` so it appears in both the desktop hover dropdown and mobile hamburger feature accordion. v3.6.98 aligns the copy with shipped owner-trust signals without changing website layout, owner dashboard runtime, analytics aggregation, Firebase rules, Cloud Functions, pricing/payment, auth, customer menu runtime, or Vercel deployment.

**WhatsApp onboarding campaign page:** v3.6.109 keeps `/whatsapp` discoverable as an informational view of the source-implemented WhatsApp-first flow while provider processing remains disabled in checked-in Functions targets. The route renders `WhatsAppOnboardingPage`, uses English/Hindi `Website.WhatsAppOnboardingPage` availability keys, and is registered in `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt`. Primary and final actions route to `/create-menu`; no test number or active provider deep link is exposed. The page may preview owner-approved list intake, but production use still requires the final owned provider account, response owner, operating hours, consent copy, tracking decision, target enablement/deploy evidence, provider smoke, browser/device QA, and production-host smoke.

**Public truth loop homepage bridge:** v3.6.69 adds `PublicTruthLoopSection.tsx` immediately after `InteractiveWorkflowSection`. The section makes the post-publish loop visible: current menu source -> owner approval -> customer surfaces -> feedback/activity signals -> source stays current. It also shows the three practical output families owners understand fastest: customer menu, Official Business Page, and print/QR kit. This is a compact proof bridge, not a new dashboard/analytics/SEO section, and it does not claim automatic external-platform updates, ranking, citation, POS sync, or fake customer metrics.

**Business Health homepage proof:** v3.6.31 adds `BusinessHealthSection.tsx` after `PreparedForYouSection` and before `ResourcesSection`. The section uses a localized product-style owner dashboard preview plus four compact proof cards to show Business Health as an AI health check for latest menu/public-presence state, No action needed state, freshness, cached analytics periods, safe handoff to AI Menu Manager or existing owner screens, multi-location/customer-attention awareness, and mobile support. It intentionally avoids chatbot, realtime sales, revenue optimization, prediction, competitor tracking, automatic external updates, and Business Health-owned public-truth mutation claims. This is public website component/CSS/locale/docs only; owner dashboard runtime, Business Health APIs, scheduler read models, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, customer menu runtime, and Vercel deployment were not changed.

**AI Menu Manager launch hook:** v3.6.59 adds `/ai-menu-manager`, `AiMenuManagerSection`, and a first-level header/footer navigation link for the public AI Menu Manager launch. The homepage introduces AI Menu Manager after the source-to-public workflow and public-truth loop, so the story remains: one approved MenuList source first, then message-based approved updates. The page and homepage section use localized copy, card-native visuals, and approval-safe language: owner intent -> prepared card -> approval when needed -> existing MenuList operation -> receipt. Discovery is updated through `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt`. This is public website component/CSS/locale/docs only; owner dashboard runtime, AMM API behavior, Firebase rules, Cloud Functions, pricing/payment runtime, auth, extraction, and customer menu runtime were not changed.

**AI Menu Manager guided context copy:** v3.6.63 updates only the dedicated `/ai-menu-manager` locale copy to reflect the product's guided context workflow. The page now says owners can ask naturally, or choose an item, category, or menu area first for tighter control. The copy still keeps selected store/project scope, broad-work approval, registered MenuList actions, and manual external handoff boundaries visible. This is static website locale/docs work only; the owner AMM UI, AMM DAL/API behavior, Firebase rules, Cloud Functions, pricing/payment runtime, auth, extraction, and customer menu runtime were not changed.

**Business Health Features-page proof:** v3.6.32 adds Business Health as a compact Operations card in `FeaturesPage.tsx`. The card uses the shared `WebsiteFeatureCard` pattern and localized `Features.group4F1*` copy to explain AI health checks, latest MenuList check, last checked date, customer attention, whether anything needs action, the No action needed stable state, and safe handoff to AI Menu Manager or existing owner screens. This is public website component import/locale/docs only; owner dashboard runtime, Business Health APIs, scheduler read models, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, customer menu runtime, and Vercel deployment were not changed.

**Business Health campaign page:** v3.6.33 adds `/features/business-health` for marketing campaigns. The route shell lives in `src/app/(website)/features/business-health/page.tsx`, renders `BusinessHealthFeaturePage`, emits `WebsitePageStructuredData` with `path="/features/business-health"`, and uses a product-style Business Health preview followed by a MenuList-styled sticky story section modeled on Answerlattice's "From inputs to support surfaces" layout. The page now frames Business Health as the diagnostic counterpart to AI Menu Manager: Business Health finds issues; AI Menu Manager prepares approved fixes. The left rail tabs are `What it checks`, `Owner outcome`, and `Why owners can trust it`; the right side uses stacked sticky cards for the matching check/outcome/trust content. The homepage Business Health section links to the page through `View Business Health`, and the `/features` Operations card links to the same route. Platform discovery is updated through `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt`. `/business-health` remains the protected owner route and is not used as a public marketing URL.

**Feature navigation and campaign pages:** v3.6.34 adds a compact Features dropdown to `Header.tsx`, backed by `src/components/website/features/featureNavigation.ts`. Desktop navigation promotes owner-readable feature surfaces that help SMB owners self-sell fastest. v3.6.35 adds `/features/print-ready-kit` for Menu Kit and print-file value: table cards, counter cards, stickers, posters, social files, and printer handoff from the current approved menu source. v3.6.36 adds `/features/menu-content-prep` for the setup/content job of preparing customer-friendly descriptions, menu images, and customer languages from the same approved menu source. v3.6.37 adds `/features/featured-choices` for customer-facing Featured, Quick, and Value choices from the current approved menu. v3.6.38 reshapes the desktop dropdown into a viewport-centered elevated overview row, three-column feature grid, and compact proof/CTA strip so it separates clearly from the hero. v3.6.39 adds `FeatureDetailJourney.tsx` so every generic `FeatureDetailPage` route uses a Business Health-style sticky journey: desktop left-rail steps, stacked right-side story panels, and a mobile sticky horizontal pill rail. It also adds `/features/menu-quality-validation` for menu quality, pricing integrity, and customer trust indicators while folding narrower suggestions into existing pages: content generation into Menu Content Prep, temporary status into Owner PWA Dashboard, business discovery attributes into Official Business Page/Public Discovery, and web sharing/presence placement into QR Menu and Links/Print-ready Kit. v3.6.86 closes the dedicated feature-page dropdown parity gap by adding `/features/menu-quality-validation` and `/features/analytics` to `websiteFeatureNavGroups`. Desktop hover and mobile hamburger feature navigation now share the same Start, Publish, and Operate route set. v3.6.110 keeps the shared route set but moves Menu Quality Validation from Start to Operate, because quality/readiness checks are ongoing confidence work rather than initial intake work. The desktop dropdown now presents Feature overview, Start, Publish, Operate, and the proof CTA as stacked workflow rows instead of three vertical columns; each group wraps cards in rows of three where space allows. Selected `/features` cards now link into these campaign pages, including the Generated images, Descriptions written for you, and One-click translations cards pointing to Menu Content Prep, the Featured section card pointing to Featured Choices, and menu-quality/pricing-integrity/trust cards pointing to Menu Quality Validation. Discovery is updated through `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt`.

**Print-ready Kit copy parity:** v3.6.41 updates `/features/print-ready-kit` copy to match the implemented Assets workflow: owners pick an asset type, choose a supported finished style family, preview generated output, then download PDF/image files or the Menu Kit ZIP. QR/display assets can mention up to nine materially different style families; assets with fewer real unique layouts must be described as showing only supported choices. This is public website locale/docs copy only; owner Assets runtime, printable renderer, mobile shell, Firebase, Cloud Functions, pricing, payment, auth, extraction, and customer menu runtime were not changed.

**Feature-detail copy parity:** v3.6.42 updates the remaining generic feature pages to the same readiness bar as Print-ready Kit. `/features/menu-import`, `/features/menu-content-prep`, `/features/featured-choices`, `/features/official-business-page`, `/features/qr-menu-links`, `/features/owner-phone-dashboard`, `/features/menu-quality-validation`, and `/features/public-discovery` now have deeper locale copy, claim-safe metadata/discovery descriptions, and full `FeatureDetail` key parity across English and Hindi. As of v3.6.86, Menu Quality Validation also appears in the shared desktop/mobile feature dropdown source. The same pass fixes `getPlatformDiscoveryBaseUrl()` so generated platform discovery URLs default to the MenuList production deployment target (`https://menulist.ai`) instead of local or preview platform defaults. v3.6.55 repositions `/features/owner-phone-dashboard` publicly as Owner PWA Dashboard: core owner workflows stay available from phone browser or installed PWA, while desktop remains useful for heavier review or precision setup. This is public website locale/metadata/discovery/docs copy only; owner dashboard runtime, mobile shell runtime, extraction workers, Assets runtime, Firebase, Cloud Functions, pricing, payment, auth, and customer menu runtime were not changed.

**Customer Feedback Loop campaign page:** v3.6.43 adds `/features/customer-feedback-loop` as a generic `FeatureDetailPage` route for public guest feedback. The page frames the shipped Internal Feedback System as a correction loop: customers can report wrong prices, missing items, outdated details, or service concerns from public menu/OBP/QR/direct-link surfaces; owners review feedback privately; real issues route back to the approved source. The `/features` Operations group, desktop Features dropdown, and mobile hamburger feature list now include a linked `Customer feedback loop` entry through `websiteFeatureNavLinks` / `websiteFeatureNavGroups`. Platform discovery is updated through `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt`. This is public website locale/metadata/discovery/docs copy only; guest feedback runtime, owner inbox runtime, mobile shell runtime, Firebase, Cloud Functions, pricing, payment, auth, and customer menu runtime were not changed.

**Feature dropdown interaction polish:** v3.6.44 changes the desktop `Features` top-nav item from a direct `/features` link into a menu trigger button. The `/features` route is still available through the `Feature overview` row inside the panel. The desktop panel now renders the same Start, Publish, and Operate groups used by the mobile hamburger, and `websiteFeatureNavGroups` is the shared grouping source. CSS adds a small invisible hover bridge between the trigger and fixed panel so pointer travel does not close the dropdown, and the panel border/shadow is softened for dark mode. v3.6.110 changes the desktop panel from a three-column sitemap-like grid into stacked workflow rows with card wrapping, keeping the same shared mobile grouping source. v3.6.111 adds Escape-key close behavior to both desktop Features and Resources dropdown wrappers and gives the Resources dropdown the same scroll containment and pointer-travel bridge treatment so long resource lists stay usable on smaller desktop heights. v3.6.112 adds a visible resting arrow affordance to every desktop feature route card, coordinates icon/arrow movement on hover and focus, and raises description contrast so the card grid reads clickable without adding more copy. This is static website header/CSS/docs only; feature routes, owner dashboard runtime, customer menu runtime, Firebase, Cloud Functions, pricing, payment, auth, and Vercel deployment were not changed.

**Create-menu conversion layout:** v3.6.113 changes presentation only in `CreateMenuClient.tsx` and `website.css`. Desktop places the owner-facing promise and compact process/proof context beside the existing sign-in or authenticated photo/link intake. Mobile keeps the active task directly after the heading and moves supporting context below it. The previous duplicated process list and supported-input block inside the unauthenticated sign-in card are consolidated into one canonical context area. No locale keys, auth providers, API requests, rate limits, upload/link validation, extraction, preview, claim/publish behavior, pricing/payment, Firebase, Cloud Functions, or Vercel deployment changed.

**Mobile feature drawer accordion:** v3.6.62 changes the mobile hamburger drawer from an always-expanded feature map into a two-level accordion. `Header.tsx` keeps the top-level Features accordion open by default, keeps Resources collapsed unless the visitor is already on a resource route, opens the active Start/Publish/Operate feature group, and removes the duplicate top-level AI Menu Manager mobile entry because it already appears inside Features -> Operate. v3.6.86 keeps that same behavior while expanding the shared group source to include Analytics Dashboard and Menu Quality Validation, matching the desktop hover dropdown. v3.6.110 keeps mobile on the same grouping source after moving Menu Quality Validation to Operate and raises the drawer/backdrop layer above the public analytics consent banner so the hamburger menu is not blocked on first visit. v3.6.111 marks the drawer as a dialog, closes it on Escape, gives the scrollable nav a minimum-height boundary, and moves the bottom CTA padding into `.ws-drawer-cta` so safe-area spacing is consistent on short phones. `website.css` owns the drawer accordion triggers, nested group panels, Feature overview card, active route states, overlay stacking, and light/dark token styling. This is static website header/CSS/docs only; feature routes, owner dashboard runtime, customer menu runtime, Firebase, Cloud Functions, pricing, payment, auth, and Vercel deployment were not changed.

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

**Resource navigation and discovery hardening:** v3.6.21 updates the website to match the complete resource strategy without changing product runtime. Header navigation is now Features -> How it works -> Multi-location -> Pricing -> Resources, with a compact desktop Resources dropdown and mobile nested resource links. The homepage Resources section now uses the eight strategic cards: Menu engineering, QR menu setup, Digital menu vs PDF, Google menu source, Restaurant menu SEO, AI search discovery, Official menu source, and Multi-location control. Footer Resources links now point to the core resource set plus Trust & Security. `public/robots.txt` now groups named search/AI crawlers with the same private-route disallows as the generic crawler group, `CCBot` is listed in `DISCOVERY_CRAWLERS`, and `llms.txt` / `llms-full.txt` now include preferred positioning and claim limits. Resource analytics uses consent-gated public website events and now includes secondary CTA, create-customer-link, pricing, checklist-copy, and AI/search referrer events including `chat.openai.com`, UTM/referrer properties, locale, entry page, and target URL without sending custom session identifiers. The search/discovery-ready product copy was softened so it describes a clearer public source for crawlers rather than implying search or AI systems must answer from MenuList. Owner dashboard, customer menu runtime, tenant routing, auth, middleware, Firebase, Cloud Functions, Canonica, Answerlattice, MyCodex, GrowthOS, and KitStamp surfaces were not changed.

**Tools Hub website index:** v3.6.96 adds `/tools` as the static MenuList Tools index. `src/app/(website)/tools/page.tsx` gates the route with `ENABLE_PUBLIC_TRUTH_TOOLS` and `ENABLE_PUBLIC_TRUTH_TOOLS_HUB`, renders `ToolsHubPage`, and adds structured page data. `ToolsHubPage` groups the public tool routes by owner job and links to `/create-menu` and Business Health without running reports, submitting handoffs, fetching URLs, storing state, or calling providers. Header Resources and footer Start navigation now include MenuList Tools. Discovery updates flow through `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, `public/llms-full.txt`, `__docs__/menulist-tools/tools-hub/`, and `npm run verify:tools-hub`.

**Resource expansion and industry pages:** v3.6.22 adds three resource articles for restaurant menu schema, official menu URL checks, and common QR menu mistakes; updates every reviewed resource locale pack to the new source version; adds the initial restaurant, cafe/bakery, takeaway/cloud-kitchen, and multi-location food-business industry set; extends sitemap, LLM context, and discovery-policy coverage; and adds a real checklist-copy button/event for visible checklist sections. Later broad-SMB route expansion brings the current industry set to seven pages with salons/spas, service-list businesses, and local-service businesses. `resource_template_download` remains intentionally absent because there are no downloadable assets to track. Owner dashboard, customer menu runtime, tenant routing, auth, middleware, Firebase, Cloud Functions, Canonica, Answerlattice, MyCodex, GrowthOS, and KitStamp surfaces were not changed.

**Main website route inventory guard:** v3.6.102 adds `npm run verify:agent-readiness` coverage for concrete `/tools/*` and `/industries/*` website route families. The gate derives routes from `src/app/(website)/tools/*/page.tsx` and `src/app/(website)/industries/*/page.tsx`, then requires matching `PLATFORM_DISCOVERY_PAGES` entries and matching route-table rows here. The same gate checks the implemented route total from concrete route files plus generated English and reviewed localized resource routes.

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
├── PlausibleAnalytics.tsx       — Env-gated Plausible Cloud script for the public MenuList marketing website
├── WebsiteMarketingClickTracker.tsx — Delegated website-only CTA tracker for Plausible and optional GA4 events
├── GoogleAnalytics.tsx         — GA tracking script
├── ClarityAnalytics.tsx        — Microsoft Clarity script
├── home/                       — compressed homepage sections + supporting section components + StickyCta
├── about/AboutPage.tsx         — About page
├── contact/ContactPage.tsx     — Contact page; submits through `/api/public/contact` with same-origin credentials, no-store cache policy, and manual redirect handling; keeps fixed localized fallback copy and uses the shared 8KB public-contact response helper before accepting source/status/help-topic acknowledgement
├── features/FeaturesPage.tsx   — Features page
├── features/BusinessHealthFeaturePage.tsx — Business Health campaign page
├── get-started/GetStartedPage.tsx  — Get Started page
├── multi-location/MultiLocationPage.tsx — Multi-Location page
├── product/ProductPage.tsx     — How It Works page (used by /how-it-works route)
├── resources/                   — Resources hub, article layout, resource cards, schema wrapper, and consent-gated website link tracking
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
| `WebsiteProductPathProvider.tsx` | Canonical/`/ml` internal-link, public-pathname, and reviewed resource-locale alias boundary |
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
- **Alias-safe resource switching:** On the `/ml` product alias, the switcher removes the provider base path before recognizing `/resources` or `/{reviewedLocale}/resources`, then adds the same base path to the selected language URL. Escape closes the open menu and returns focus to its trigger.
- **Website theme switcher:** `WebsiteThemeSwitcher.tsx` exposes Light, System, and Dark choices as a compact footer segmented control and persists through the existing `ThemeProvider` localStorage contract. The persisted scalar is projected through the exact `light | system | dark` contract before it can become a document class; invalid values are evicted, and denied read/remove/write operations emit bounded diagnostics while the page falls back to System or keeps the current in-memory choice.
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
- **Service worker boundary:** `ServiceWorkerRegister.tsx` registers owner Serwist `/serwist/sw.js` only on owner/app platform routes and unregisters owner workers on public marketing routes. Customer tenant origins still use `sw-customer.js`.
- **App Router build boundary:** Native Next 16 document/error handling is authoritative; no Pages Router compatibility files or private manifest-repair plugin are retained.

---

## 10. Key Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Route group | `(website)` | Separates website from dashboard routes |
| SSR vs CSR | Server components (except homepage) | SEO benefit for all pages |
| Homepage rendering | Server shell + client composition | Keeps homepage JSON-LD in first-response HTML while preserving translated interactive homepage sections and sticky CTA |
| Pricing | Reuses existing `pricing-pages/` components | Full Razorpay integration already built |
| Analytics | Consent-gated Plausible + optional GA4 + MenuList-only Clarity through `WebsiteAnalyticsConsent` | Covers public marketing website monitoring after accepted analytics consent without changing product analytics |
| Auth | `WebsiteAuthProvider` wrapper | Session context for pricing/onboarding flows |
| Theming | System-aware shadcn ThemeProvider plus footer theme segmented control and website CSS tokens | Light remains default for light system preferences; users can choose Light, System, or Dark from the footer; dark mode uses `#121212`-family surfaces, tokenized cards/forms/overlays, and dark-safe pricing variables |
| Localization | next-intl via layout provider | Consistent i18n across all pages |
| App Router build handling | Native Next 16 | Both Turbopack and Webpack pass without private manifest repair |

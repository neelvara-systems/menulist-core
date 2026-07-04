# MenuList Main Website (menulist.ai)

**Version:** 3.6.104 (Customer FAQ Reply Pack)
**Status:** ✅ IMPLEMENTED — Canonical
**Last Updated:** July 4, 2026
**Workflow:** `.codex/workflows/website.md`

---

## Canonical Website Source

The current implementation is the only default MenuList marketing website.

| Canonical Version | Name | Core Message | Status |
| ----------------- | ---- | ------------ | ------ |
| **3.6.104** | **Customer FAQ Reply Pack** | **MenuList Tools now includes a public browser-local FAQ pack that turns repeated customer questions and owner-entered facts into reusable answers.** | **ACTIVE** |

Version 3.6.104 adds `/tools/customer-faq-reply-pack` as a public MenuList Tools route. The tool runs browser-local self-report checks, generates deterministic FAQ/menu/hours/price/location/action/availability/fallback answers from owner-entered questions and facts, supports copy/download/shareable report actions, and can submit an optional consented follow-up through the existing bounded `/api/public/contact` route. It is feature-flagged through `ENABLE_PUBLIC_TRUTH_TOOLS` and `ENABLE_PUBLIC_TRUTH_CUSTOMER_FAQ_REPLY_PACK`, registered in Tools Hub, platform discovery, static sitemap, `llms.txt`, and `llms-full.txt`, and guarded by `npm run verify:customer-faq-reply-pack` against customer-conversation reads, chatbot creation, automation configuration, message sending, external source fetches, report storage, provider calls, and ranking/citation claims. This is public website route/component/locale/discovery/docs/verifier work only; owner dashboard runtime, customer menu/OBP runtime, external source adapters, AI/search readability checks, new Firebase collections, Firebase rules, Cloud Functions, Vercel deployment, production build, and DNS were not changed.

Version 3.6.103 adds `/tools/whatsapp-reply-pack` as a public MenuList Tools route. The tool runs browser-local self-report checks, generates deterministic WhatsApp greeting/hours/menu/price/order/delivery/fallback/customer-link replies from owner-entered facts, supports copy/download/shareable report actions, and can submit an optional consented follow-up through the existing bounded `/api/public/contact` route. It is feature-flagged through `ENABLE_PUBLIC_TRUTH_TOOLS` and `ENABLE_PUBLIC_TRUTH_WHATSAPP_REPLY_PACK`, registered in Tools Hub, platform discovery, static sitemap, `llms.txt`, and `llms-full.txt`, and guarded by `npm run verify:whatsapp-reply-pack` against WhatsApp API calls, message sending, phone-number verification, external source fetches, platform updates, report storage, provider calls, and ranking/citation claims. This is public website route/component/locale/discovery/docs/verifier work only; owner dashboard runtime, customer menu/OBP runtime, external source adapters, AI/search readability checks, new Firebase collections, Firebase rules, Cloud Functions, Vercel deployment, production build, and DNS were not changed.

Version 3.6.102 adds `/tools/business-facts-copy-pack` as a public MenuList Tools route. The tool runs browser-local self-report checks, generates deterministic profile/WhatsApp/social/website/staff/customer-link copy from owner-entered facts, supports copy/download/shareable report actions, and can submit an optional consented follow-up through the existing bounded `/api/public/contact` route. It is feature-flagged through `ENABLE_PUBLIC_TRUTH_TOOLS` and `ENABLE_PUBLIC_TRUTH_BUSINESS_FACTS_COPY_PACK`, registered in Tools Hub, platform discovery, static sitemap, `llms.txt`, and `llms-full.txt`, and guarded by `npm run verify:business-facts-copy-pack` against external source fetches, profile inspection, platform updates, report storage, provider calls, and ranking/citation claims. This is public website route/component/CSS/locale/discovery/docs/verifier work only; owner dashboard runtime, customer menu/OBP runtime, external source adapters, AI/search readability checks, new Firebase collections, Firebase rules, Cloud Functions, Vercel deployment, production build, and DNS were not changed.

Version 3.6.103 remains WhatsApp Reply Pack and is preserved below as the previous website version note.

Version 3.6.101 adds `CustomerLinkIncludesSection` between `CustomerBrowseSection` and `OwnerProofSection`. The section replaces any need to re-mount the heavier `SurfacesSection` by showing the six practical outputs SMB owners care about after approval: Official Business Page, QR link, print files, customer actions, phone dashboard, and activity/feedback. This keeps the homepage mobile try-first while preserving product depth. This is public website component/CSS/locale/docs work only; `/create-menu` upload/link runtime, preview processing, auth, pricing/payment, owner dashboard, customer menu/OBP runtime, Firebase rules, Cloud Functions, Vercel deployment, and DNS were not changed.

Version 3.6.100 remains Mobile Try-First Homepage Compression and is preserved below as the previous website version note.

Version 3.6.100 compresses the homepage for non-technical mobile SMB owners. The live homepage now mounts the try-first path immediately after the hero: `HeroSection`, `CreateMenuPreviewSection`, `BeforeAfterSection`, `CustomerBrowseSection`, compact `OwnerProofSection`, six-question `FaqSection`, `FinalCtaSection`, and `StickyCta`. The older deep explanation blocks remain in the repo and on supporting pages where relevant, but are not part of the first homepage scroll. `/faq` now carries the full 16-question FAQ with metadata, discovery, sitemap, footer, and LLM-context coverage. This is public website component/CSS/locale/docs/discovery work only; `/create-menu` upload/link runtime, preview processing, auth, pricing/payment, owner dashboard, customer menu/OBP runtime, Firebase rules, Cloud Functions, Vercel deployment, and DNS were not changed.

Version 3.6.99 aligns public MenuList website copy with non-technical SMB owner language. The pass replaces visible internal phrasing such as `source`, `signals`, `crawler`, `structured data`, `PWA`, `AI health check`, and `dashboard` where it was not an intentional feature/nav label, using approved list, customer link, clear public page, activity view, and phone dashboard language instead. The pass covers the homepage spine, feature overview, dedicated feature-page metadata, setup/check-tool copy, screenshot captions, and en-GB/hi-IN high-visibility fallbacks. This is public website locale/metadata/docs copy only; website layout, owner dashboard runtime, customer menu/OBP runtime, analytics aggregation, Firebase rules, Cloud Functions, pricing/payment, auth, Vercel deployment, and DNS were not changed.

Version 3.6.98 aligns the existing analytics website copy with the shipped owner analytics trust signals. The analytics feature page, feature-list card, and analytics insight copy now mention item status labels, searched-but-not-found terms, attention without taps, unavailable demand, and actions while closed as owner-facing aggregate summaries. This is public website locale/docs copy only; website layout, owner dashboard runtime, customer menu/OBP runtime, analytics aggregation, Firebase rules, Cloud Functions, pricing/payment, auth, Vercel deployment, and DNS were not changed.

Version 3.6.97 completes the V0 Public Truth Check acquisition surface. The report remains browser-local and does not fetch external sources, inspect Google, call AI/search providers, or store report state. The page now lets users copy/download the report, submit an optional consented follow-up through the existing bounded `/api/public/contact` route, and emits consent-aware website marketing events for completion, copy/download, CTA, and accepted handoff actions. This is public website component/CSS/locale/docs/verifier work using an existing contact API only; owner dashboard runtime, customer menu/OBP runtime, external source adapters, AI/search readability checks, new Firebase collections, Firebase rules, Cloud Functions, Vercel deployment, and DNS were not changed.

Version 3.6.96 adds `/tools/public-truth-check` as the first Public Truth Tools route. The tool runs browser-local self-report checks against entered business/source facts, produces present/missing/unclear/not-checked rows, and routes owners to `/create-menu` for one current customer link. It is feature-flagged through `ENABLE_PUBLIC_TRUTH_TOOLS` and `ENABLE_PUBLIC_TRUTH_CHECK`, registered in platform discovery, static sitemap, `llms.txt`, and `llms-full.txt`, and guarded by `npm run verify:public-truth-check` against external source fetches, provider calls, and ranking/citation claims. This is public website route/component/CSS/locale/discovery/docs work only; owner dashboard runtime, customer menu/OBP runtime, external source adapters, AI/search readability checks, new Firebase collections, Firebase rules, Cloud Functions, Vercel deployment, and DNS were not changed.

Version 3.6.95 remains Create Menu Success Copy Rejection Fallback and is preserved below as the previous website version note.

Version 3.6.95 hardens `/create-menu/success` Copy Link so rejected Clipboard API writes fall through to the acknowledged textarea fallback before failure. Copied state and `MENU_LINK_COPIED` starter activation signals still advance only after an acknowledged browser handoff, and failed diagnostics stay bounded to URL presence/length plus clipboard/fallback support booleans. This is public website browser-handoff runtime/docs work only; public copy, locales, discovery files, pricing/payment runtime, auth behavior, upload/link-import APIs, owner dashboard runtime, customer menu/OBP runtime, Firebase rules, Cloud Functions, Vercel deployment, and DNS were not changed.

Version 3.6.94 remains Switch Comparison Section and is preserved below as the previous website version note.

Version 3.6.94 adds `SwitchComparisonSection` after the homepage problem section. The section compares MenuList with common owner alternatives by category, not by named competitors: PDFs/screenshots, QR-only pages, website builders, and link pages. It keeps the viral-readiness strategy grounded in existing product truth by explaining the switch around one current owner-approved customer link, connected QR/page/print/action outputs, and a current offer list customers can trust. This is public website component/CSS/locale/docs positioning only; pricing/payment runtime, auth behavior, upload/link-import APIs, owner dashboard runtime, customer menu/OBP runtime, Firebase rules, Cloud Functions, Vercel deployment, and DNS were not changed.

Version 3.6.93 remains Viral Readiness Conversion Guard and is preserved below as the previous website version note.

Version 3.6.93 validates the 32-principle viral-product checklist against MenuList website runtime truth instead of applying it mechanically. The current site already keeps Pricing visible in the header, leads with product proof before long explanation, uses one primary `/create-menu` CTA, has a shareable footer close, keeps the first fold focused on the official customer link, and avoids fake testimonials. This pass fixes the two concrete gaps found in code/assets: the Open Graph thumbnail now says `One official customer link for menus and services` and shows a service-list example instead of restaurant-only menu copy, and the homepage sticky CTA now observes the hero and final CTA sections instead of using scroll-percentage React state. Pricing/payment runtime, auth behavior, upload/link-import APIs, owner dashboard runtime, customer menu/OBP runtime, Firebase rules, Cloud Functions, Vercel deployment, and DNS were not changed.

Version 3.6.92 remains Desktop Taste Audit Polish and is preserved below as the previous website version note.

Version 3.6.92 applies the desktop design-taste audit pass across the local MenuList marketing routes in Chrome. The homepage sticky CTA is now a compact floating tray instead of a full-width bottom bar, so it supports conversion without masking dense proof sections. Feature journey panels use tighter viewport-aware heights and spacing, dark-mode proof screenshots use calmer framing and contrast treatment, dedicated feature proof images load directly from the public assets, and the `/features` H1 keeps readable spacing in rendered text while preserving the intended visual break. Chrome route sweeps covered the homepage, feature overview, dedicated feature pages, AI Menu Manager, how-it-works, multi-location, pricing, resources, create-menu, contact, legal, and about routes for horizontal overflow, missing locale keys, header consistency, and visible proof-image loading. This is public website component/CSS/docs polish only; pricing/payment runtime, auth behavior, upload/link-import APIs, owner dashboard runtime, customer menu/OBP runtime, Firebase rules, Cloud Functions, Vercel deployment, and DNS were not changed.

Version 3.6.91 remains Taste Audit Mobile Polish and is preserved below as the previous website version note.

Version 3.6.91 applies a targeted design-taste audit pass without redesigning the current website system. The homepage mobile CTA row now stacks full-width with tighter narrow-screen hero rhythm so the primary and proof CTAs remain readable around the consent banner. The shared public consent banner is slightly narrower and denser on desktop and mobile while preserving explicit accept/decline/privacy controls. Public English website copy and website metadata were normalized away from dash-heavy constructions where the wording was public-facing, while localized translations and legal body content were left untouched for separate review. This is public website CSS/locale/metadata/docs polish only; pricing/payment runtime, auth behavior, upload/link-import APIs, owner dashboard runtime, customer menu/OBP runtime, Firebase rules, Cloud Functions, Vercel deployment, and DNS were not changed.

Version 3.6.90 remains SMB Owner Readiness Polish and is preserved below as the previous website version note.

Version 3.6.90 applies the non-technical SMB-owner readiness polish after mobile review. The shared public consent banner uses shorter MenuList copy and a more compact mobile layout while preserving explicit accept/decline/privacy controls. The homepage secondary CTA now says `See example customer page` so owners know they can inspect what customers will see before signing in. The homepage hero visual now renders localized source/page/phone mockup cards instead of a static restaurant screenshot, so the first viewport matches the broader menu/service-list promise. Pricing now shows plan cards before the website-doubt explainer and lower education block, with the lower guidance reframed as `How to choose` instead of a pre-decision wall. The Resources hub and homepage resources bridge now use menu/service-list/public-list framing so salons, studios, clinics, repair shops, catalogues, and price-list businesses are not excluded by restaurant-only language. This is public website component/CSS/locale/docs work only; pricing/payment runtime, auth behavior, upload/link-import APIs, owner dashboard runtime, customer menu/OBP runtime, Firebase rules, Cloud Functions, Vercel deployment, and DNS were not changed.

Version 3.6.89 remains Website UX Density Cleanup and is preserved below as the previous website version note.

Version 3.6.89 applies the validated website UX-density cleanup without changing product runtime. The homepage no longer mounts `WebsiteReplacementBlock` or `PreparedForYouSection`, leaving `PublicTruthLoopSection`, setup relief, surfaces, customer browsing, Business Health, Resources, FAQ, and final CTA as the shorter first-visit path. `/create-menu` now shows a deterministic sign-in -> add source -> review-before-publish state before auth controls instead of leading with a loading headline while session state resolves. Pricing plan cards now use localized decision copy for best-fit, included public surfaces, owner controls, not-included boundaries, and plan-specific CTAs. The Resources hub now opens with a four-step recommended path and then groups articles by existing resource clusters. Shared website mockup labels that were below the 13px floor now use larger, higher-contrast text. This is public website component/CSS/locale/docs work only; pricing/payment runtime, auth behavior, upload/link-import APIs, owner dashboard runtime, customer menu/OBP runtime, Firebase rules, Cloud Functions, Vercel deployment, and DNS were not changed.

Version 3.6.88 remains Plausible Marketing Website Analytics and is preserved below as the previous website version note.

Version 3.6.88 adds website-only Plausible Cloud wiring for the public MenuList and Answerlattice marketing websites after the analytics scope was clarified away from owner/dashboard/product analytics. Plausible scripts mount only after the public analytics consent banner is accepted and only when `NEXT_PUBLIC_MENULIST_PLAUSIBLE_DOMAIN` or `NEXT_PUBLIC_ANSWERLATTICE_PLAUSIBLE_DOMAIN` is configured. MenuList now has a delegated marketing CTA tracker for create-customer-link, pricing, WhatsApp, login, and AI-summary clicks; resource pages send property-free Plausible custom events alongside the existing GA4 payloads. Answerlattice reuses the existing `data-answerlattice-event` taxonomy and public resource/get-started events for Plausible. CSP and env templates now include Plausible. PostHog remains out of launch, product analytics remains MenuList-owned, and no Firebase rules, Cloud Functions, dependency, Vercel deploy, or production build were changed.

Version 3.6.87 remains Analytics Vendor Boundary and Session-ID Minimization and is preserved below as the previous website version note.

Version 3.6.87 records the analytics vendor boundary after validating the Plausible/PostHog/Sentry conversation against current code and vendor docs. Public resource GA4 events in `ResourceAnalytics` and `ResourceTrackedLink` no longer send custom repo-generated `session_id` parameters; they still keep page, entry-page, referrer, UTM, locale, CTA, and target URL context. This is public website analytics minimization and docs governance only; owner dashboard runtime, customer menu/OBP analytics, Firebase rules, Cloud Functions, dependencies, Vercel deploy, and production build were not changed.

Version 3.6.86 remains Feature Dropdown Dedicated-Page Parity and is preserved below as the previous website version note.

Version 3.6.86 closes the dedicated feature-page dropdown parity gap. `/features/analytics` and `/features/menu-quality-validation` now live in `websiteFeatureNavGroups`, the same shared source used by the desktop hover dropdown and mobile hamburger feature accordion. AI Menu Manager remains inside the Operate group and is not duplicated as a separate mobile top-level row. This is static website navigation, locale, and documentation work only; feature routes, discovery files, owner dashboard runtime, customer menu/OBP runtime, Firebase rules, Cloud Functions, production build, Vercel deploy, and DNS were not changed.

Version 3.6.85 remains Placeholder-Backed Service Industry Pages and is preserved below as the previous website version note.

Version 3.6.85 adds placeholder-backed broad-SMB industry pages for `/industries/salons-spas`, `/industries/service-list-businesses`, and `/industries/local-service-businesses`. The pages reuse the existing industry landing-page shell, metadata pattern, `WebsitePageStructuredData`, `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt`. The placeholder SVG assets live under `public/images/website/demo-placeholders/` and are visibly labelled as sample/demo placeholders. They unblock code-side service-list SEO review, but final routed screenshots/videos or permissioned proof must replace them before Product Hunt gallery use, paid traffic, broad partner outreach, or final public campaign visuals. This is public website route/discovery/docs work only; upload/extraction, demo tenant creation, owner dashboard runtime, customer menu/OBP runtime, Firebase rules, Cloud Functions, Search Console setup, sitemap submission, production build, Vercel deploy, and DNS were not changed.

Version 3.6.84 remains Public Menu Noindex Hardening and is preserved below as the previous website version note.

Version 3.6.84 tightens public tenant discovery behavior for stale project/menu slug paths and stale item/category detail paths. When a public tenant URL no longer resolves to a real project, the visible customer fallback ladder remains in place for old QR links and PWA entry points, but metadata now emits `noindex, follow` and canonicalizes to the tenant or outlet root instead of the stale URL. When a menu exists but a requested item/category detail no longer resolves, the detail URL emits `noindex, follow` and canonicalizes to the current menu page. `verify:agent-readiness` checks these guards. This is public tenant SEO metadata/docs work only; no website route, owner dashboard runtime, Firebase rules, Cloud Functions, Search Console setup, sitemap submission, production build, Vercel deploy, or DNS change was run.

Version 3.6.83 remains SEO Noindex Hardening and is preserved below as the previous website version note.

Version 3.6.83 validates the external ChatGPT technical SEO review against live endpoints and repo truth. `/signin` and `/forgot-password` now define noindex/nofollow metadata, middleware emits `X-Robots-Tag: noindex, nofollow` for auth/app/API/internal/create-menu preview and success paths, platform robots/discovery disallows include the missing internal/auth prefixes, and `verify:agent-readiness` checks these noindex contracts. Live curl checks showed `menulist.online` robots and sitemap endpoints return 200 but advertise `menulist.ai` canonical discovery URLs while `menulist.ai` currently serves a `/lander` shell, so Search Console remains blocked until the chosen canonical host serves the app. This is website discovery/auth-indexing code and docs work only; canonical host selection, DNS, Vercel deploy, production build, Firebase rules, Cloud Functions, customer menu/OBP runtime, owner dashboard runtime, Search Console, and sitemap submission were not changed.

Version 3.6.82 remains WhatsApp Test CTA Activation and is preserved below as the previous website version note.

Version 3.6.82 switches the `/whatsapp` primary and final CTAs from the earlier `/create-menu` fallback to a prefilled click-to-WhatsApp link for the supplied test onboarding number `+1 555 657 1424` (`https://wa.me/15556571424`). The prefilled message starts from the same broad SMB current-list promise: menu, service list, rate card, catalog, package list, or price list. Production launch still needs the final public WhatsApp account, response owner, operating hours, and tracking decision. This is public website component/locale/docs work only; messaging-onboarding Functions runtime, provider secrets, webhook configuration, extraction/publish behavior, auth, owner dashboard runtime, customer menu/OBP runtime, pricing/payment, Firebase rules, Cloud Functions, Vercel deployment, and outbound WhatsApp outreach were not changed.

Version 3.6.81 remains WhatsApp Onboarding Campaign Page and is preserved below as the previous website version note.

Version 3.6.81 adds the dedicated `/whatsapp` campaign route for the already implemented and tested messaging-onboarding flow. The page positions MenuList around WhatsApp-first current-list onboarding for menus, service lists, rate cards, package lists, catalogs, photos, screenshots, PDFs, and text. It uses localized English/Hindi copy, structured page metadata, a chat-style product proof visual, trust-boundary copy, `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt`. The live CTA intentionally falls back to `/create-menu` until the public WhatsApp onboarding number is configured in the website layer. This is public website route/locale/CSS/discovery/docs work only; messaging-onboarding Functions runtime, provider secrets, webhook configuration, extraction/publish behavior, auth, owner dashboard runtime, customer menu/OBP runtime, pricing/payment, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.80 remains Readiness Cross-Check Polish and is preserved below as the previous website version note.

Version 3.6.80 finalizes the broad-SMB code-side readiness pass. Chrome locale negotiation exposed stale `en-GB` acquisition copy, so the homepage and `/create-menu` overrides now match the broad customer-link/list framing. The homepage hero subtitle is tighter, mobile hero actions stay visible above the consent panel at a 390px CSS viewport, the shared public consent banner is more compact, and pricing proof copy now says `No scattered list files`. Chrome DevTools mobile emulation verified `/`, `/create-menu`, and `/pricing` with `390px` viewport and no horizontal overflow. This is public website locale/CSS/docs polish only; upload/extraction, preview, claim/publish, auth, owner dashboard runtime, customer menu/OBP runtime, pricing/payment, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.79 remains Metadata and Footer Cross-Check Polish and is preserved below as the previous website version note.

Version 3.6.79 follows the broad-SMB homepage/runtime copy alignment with route metadata and mobile-heading cross-checks. `/get-started` now uses `Get Started - Create Your Customer Link` and describes menu, catalogue, price-list, and service-list sources. `/ai-menu-manager` now uses `AI Menu Manager for Owner-Approved Updates | MenuList` instead of a restaurant-only title, and its description says MenuList prepares the card for owner approval. `/how-it-works`, `/multi-location`, and `/resources` now use current-list, approved-source, and public-list wording in metadata instead of narrow menu-only titles. The shared footer CTA now says `Put one trusted customer link online.` so repeated footer headings stay readable on 320px and 360px mobile screens. This is public website metadata/locale/docs polish only; AI Menu Manager runtime, owner dashboard runtime, customer menu/OBP runtime, pricing/payment, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.78 remains Broad SMB Homepage Runtime Copy Alignment and is preserved below as the previous website version note.

Version 3.6.78 applies the founder's broad-SMB direction to the live website runtime copy beyond CTAs. Shared website metadata now reads `MenuList - One Official Customer Link for Menus and Services`, the footer AI-summary prompt describes a menu, service list, price list, or catalogue source, and the primary English/Hindi homepage copy now uses current list / public list / official customer link language across the hero demo, problem section, source-to-action path, setup relief, public surfaces, search/discovery, workflow, public-truth loop, final CTA, and supporting pricing copy. The hero visual now uses a salon/spa-style service-list proof example so MenuList does not read as restaurant-only in the first viewport. Food-specific resource and industry pages remain allowed where the page itself is menu/restaurant/cafe-specific. This is public website locale/metadata/footer prompt/docs work only; business-type data, schema generation, upload/extraction APIs, claim/publish runtime, owner dashboard runtime, customer menu/OBP runtime, pricing/payment, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.77 remains Pricing Mobile Heading Cross-Check and is preserved below as the previous website version note.

Version 3.6.77 cross-checks the broad-SMB website framing against narrow mobile viewports and tightens the pricing page headline system. `/pricing` now leads with `Keep one official customer link live.`, keeps services in the subline, and shortens the setup/decision headings so 320px mobile headings do not over-wrap. This is public pricing-page locale/docs polish only; plan data, subscription runtime, payment, checkout, auth, owner dashboard runtime, customer menu/OBP runtime, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.76 remains Broad SMB Conversion CTA and is preserved below as an earlier website version note.

Version 3.6.76 applies the founder's broad-SMB marketing direction to the public conversion path. Header, hero, footer, feature-page, legal-page, Get Started, and resource CTAs now lead with `Create customer link` instead of `Upload your menu` where the button represents the main `/create-menu` funnel. `/create-menu` metadata and English/Hindi visible copy now describe menu, catalogue, price-list, and service-list photo/link sources, while preserving sign-in-first owner review and the existing image/link runtime. `public/llms.txt`, website docs, and the marketing/distribution tracker now mirror this broader acquisition stance. This is public website locale/metadata/discovery/docs work only; upload/extraction APIs, claim/publish runtime, auth behavior, pricing/payment, owner dashboard runtime, customer menu/OBP runtime, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.75 remains Create-Menu Official Link Framing and is preserved below as the previous website version note.

Version 3.6.75 tightens the `/create-menu` acquisition surface for the new marketing/distribution operating plan. The page metadata, English/Hindi visible copy, preview-claim CTA, how-it-works copy, embedded public `Powered by MenuList` conversion CTA, and `public/llms.txt` route description now use official-customer-link framing. The route still requires sign-in before upload/link processing, still accepts a menu photo or owned public menu link, and still keeps owner review before publishing. This is public website locale/metadata/discovery/docs work only; upload/extraction APIs, claim/publish runtime, auth behavior, pricing/payment, owner dashboard runtime, customer menu/OBP runtime, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.74 remains Reference-Informed Presentation Sizing and is preserved below as the previous website version note.

Version 3.6.74 compares the current MenuList homepage against the live AnswerLattice reference at `https://www.ecomsai.com/` and applies the useful sizing pattern without copying the brand style. The website now uses a 1248px content canvas, 60px desktop hero headlines, 44px desktop section headings, 34px mobile hero headlines, 30px mobile section headings, 112px desktop section padding, and 64px mobile section padding. The homepage hero keeps the official-customer-link promise visible in the `en-GB` override as well as the primary locale, lets desktop headline wrapping flow naturally, keeps the deliberate mobile break, and tightens the shared public cookie banner's mobile height so it interrupts less of the first fold. This is public website CSS/locale/docs polish only; owner dashboard runtime, customer menu/OBP runtime, pricing/payment, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.73 remains the SEO Claim Boundary Public Copy pass and is preserved below as the previous website version note.

Version 3.6.73 removes the public `AI-powered` shorthand from AI Menu Manager launch copy and LLM context wording. The public wording now uses approval-based phrasing for the homepage/demo/final CTA surfaces, while preserving the shipped AI Menu Manager product name and approval-card story. This is public website locale/LLM-context/docs work only; website routes, sitemap, robots, structured data, owner dashboard runtime, AMM execution, customer menu/OBP runtime, pricing/payment, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.72 remains Dark Mode Readability and Border Reduction and is preserved below as the previous website version note.

Version 3.6.72 reduces dark-mode visual noise after the official-customer-link framing pass added more proof panels. Dark theme tokens now use slightly clearer gray surfaces, brighter secondary text, lower-opacity borders, softer shadows, and targeted dark overrides for shared cards, feature cards, lifecycle tiles, drift cards, proof pills, website-replacement panels, and MenuList's public cookie banner. This is public website CSS/docs work only; copy, routes, owner dashboard runtime, customer menu/OBP runtime, pricing/payment, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.71 adds `/features/analytics` as a generic dedicated feature page for the shipped owner analytics dashboard. The existing `/features` Menu analytics card now links to it, `FeatureDetailPage` renders the localized hero, signal strip, sticky journey, support, proof, and final CTA copy, and discovery coverage is registered in `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt`. The copy is anchored to the implemented Owner Dashboard and mobile dashboard: today, overview, daily, weekly, monthly, and overall views; menu activity; Official Business Page actions; customer app activity; Business Health handoff; and privacy-conscious aggregate signals. Analytics is intentionally not added to the desktop header dropdown in this pass, preserving the restrained primary feature-navigation policy. This is public website route/locale/discovery/docs work only; owner dashboard runtime, mobile runtime, analytics aggregation, Firebase rules, Cloud Functions, pricing/payment, auth, customer menu runtime, and Vercel deployment were not changed.

Version 3.6.70 reframes the main website around `one approved menu or service-list source -> one official customer link -> QR, print, actions, owner updates, feedback, and health checks stay connected`. The homepage hero now leads with the customer-link outcome instead of only upload, `InteractiveWorkflowSection` uses the six-stage lifecycle `Start -> Prepare -> Publish -> Place -> Operate -> Improve`, and the shared `WebsiteReplacementBlock` answers whether MenuList can act as a lightweight business website/main customer link for customer-facing SMBs on homepage, pricing, and `/features/official-business-page`. Pricing now describes the customer-facing system around the approved menu, service list, or public offer list; the Features page opens with a lifecycle strip; public feature copy removes internal planning-language leaks; External Menu Sync website copy is bounded as supported connected-system snapshot export only; and `public/llms.txt` / `public/llms-full.txt` now use the same official-customer-link framing. This is public website component/CSS/locale/metadata/discovery/docs work only; owner dashboard runtime, customer menu/OBP runtime, payment/Razorpay/subscription logic, Firebase rules, Cloud Functions, and Vercel deployment were not changed. Owner-runtime labels that still use the historical POS Sync naming were not renamed in this website pass.

Version 3.6.69 adds a compact `PublicTruthLoopSection` after the homepage source-to-public workflow. The section shows MenuList as a post-publish public-truth loop: current menu source, owner approval, customer surfaces, returned feedback/activity signals, and source correction. It also gives owners one practical output proof row for customer menu, Official Business Page, and print/QR kit. This is MenuList-native storytelling inspired by reference-site cycle patterns, not a redesign or feature expansion. It does not add external-platform syncing, ranking/citation claims, POS sync, fake metrics, owner dashboard runtime, customer menu runtime, pricing/payment changes, Firebase rules, Cloud Functions, crawler policy, or Vercel deployment.

Version 3.6.68 applies a scoped reference-site polish pass without redesigning the canonical MenuList website. `InteractiveWorkflowSection` now labels the two sides of the homepage source map as the starting inputs and published outputs so the existing visual reads faster for first-time SMB owners. CampaignCue keeps its existing flow map and Campaign Pack Room, but its Creative Output System mini visuals now name concrete pack artifacts instead of anonymous placeholder blocks. AnswerLattice keeps the support knowledge map, but its center hub now states the support-layer contract: approved first, fallback tracked, and review loop. This is public marketing website component/CSS/locale/docs polish only; owner dashboards, customer menus, OBP, widgets, pricing/payment, upload/extraction, Firebase rules, Cloud Functions, crawler policy, and Vercel deployment were not changed.

Version 3.6.67 adds a shared public AI summary link strip after validating Duna's footer pattern against MenuList's existing AI/search discovery posture. `PublicAiSummaryLinks` renders low-page links to Claude, ChatGPT, and Gemini with product-specific prompt text. MenuList uses a localized footer label and a prompt that points to `https://menulist.ai` plus `https://menulist.ai/llms.txt` while explicitly rejecting ranking, AI-citation, automatic external-platform, and unsupported POS/account-posting claims. AnswerLattice and CampaignCue use the same shared strip with their own product-boundary prompts. This is public marketing website UI/docs work only; it does not change crawler policy, metadata, `llms.txt`, owner dashboards, customer menus, OBP, widgets, pricing/payment, upload/extraction, Firebase rules, Cloud Functions, or Vercel deployment.

Version 3.6.66 adds a shared compact public cookie preference banner after validating the Duna-style reference against the actual MenuList/AnswerLattice/CampaignCue tracking posture. `PublicCookieConsentBanner` now owns the floating card UI. MenuList continues to gate Google Analytics and Microsoft Clarity until the visitor accepts analytics, AnswerLattice gates its optional Google Analytics script, and CampaignCue shows essential-storage acknowledgement only because no analytics script is active there. Neelvara does not mount a cookie banner in its current company-site layout. The copy deliberately does not mention ads, personalization, or ranking/tracking behavior that is not implemented. This is public marketing/brand website UI/docs work only; owner dashboards, customer menus, OBP, widgets, pricing/payment, upload/extraction, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.65 records the external local-service palette review after comparing the proposed deep navy/pink reference against MenuList's current trust/infrastructure website identity. The site does not adopt the reference palette as a rebrand. The existing blue MenuList system remains canonical, while `src/styles/website.css` now exposes restrained warm-accent tokens for minor illustration details, soft badges, dividers, or hover accents only. The design-system rules explicitly prohibit pink body text, pink headline/CTA treatment, large poster-style diagonal blocks, QR-poster layouts, and replacing MenuList's calm public-business truth positioning with a decorative local-service identity. This is website token/docs governance only; visible website layout, copy, pricing/payment, upload/extraction, owner dashboard runtime, customer menu runtime, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.64 aligns the main MenuList website's shared SEO/AEO metadata with the current official-source positioning. Root fallback metadata, website-layout metadata, homepage JSON-LD, and page-level JSON-LD now read from shared MenuList website constants backed by the production `https://menulist.ai` deployment target. `/create-menu/success` is now a server metadata wrapper around the existing client success UI and emits `noindex, nofollow` robots metadata plus a self canonical to the non-query success path so post-setup query URLs do not inherit indexable website metadata. `npm run verify:agent-readiness` now guards the canonical metadata constants, schema URL source, stale fallback title removal, and success-page noindex wrapper. This is static website metadata/discovery/docs work only; public website copy, owner dashboard runtime, menu publishing, auth, pricing/payment, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.63 updates the public AI Menu Manager page copy to reflect the guided context workflow now supported in the product: owners can ask naturally, or choose an item, category, or menu area first when they want tighter control. The copy stays focused on selected store/project scope, broad-work approval, and registered MenuList action cards. This is static public website locale/docs work only; owner dashboard runtime, AMM execution, Firebase rules, Cloud Functions, pricing/payment runtime, auth, extraction, and customer menu runtime were not changed.

Version 3.6.62 tightens the mobile hamburger menu after the feature list became too long for a first-time phone visitor. The drawer now keeps Features open by default, exposes Feature overview as the first row, collapses Start/Publish/Operate into nested accordion groups, opens Resources only on resource routes, highlights the current nested route, and removes the duplicate mobile top-level AI Menu Manager item because AI Menu Manager already lives under Features -> Operate. This is public website header/CSS/docs polish only; feature routes, owner dashboard runtime, customer menu runtime, pricing, payment, auth, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.61 updates Business Health public positioning for the AI-era website story. Business Health is now described as the AI health check for the owner's menu and public presence: it checks cached MenuList facts, shows what needs attention, says No action needed when stable, and hands fixes to AI Menu Manager or existing owner screens. This does not reintroduce Business Health action support. Business Health remains read-only/diagnostic, while AI Menu Manager owns prepared cards, approvals, existing MenuList operations, and receipts. This is static public website locale/metadata/discovery/docs work only; owner dashboard runtime, Business Health APIs, scheduler read models, AMM execution, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, customer menu runtime, and Vercel deployment were not changed.

Version 3.6.60 folds Visual Profile Completion into the existing Official Business Page website story without creating a standalone feature page or navigation item. `/features/official-business-page`, the `/features` OBP card, route metadata, discovery policy, LLM context, and docs now mention key profile photo checks as a supporting proof point. The copy deliberately avoids AI photo placement, gallery-manager, social-posting, and ranking claims. This is static public website locale/metadata/discovery/docs work only; owner dashboard runtime, OBP public rendering, photo storage schema, pricing, payment, auth, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.59 adds AI Menu Manager as the public website growth hook without repositioning all of MenuList as generic AI restaurant software. The website now includes `/ai-menu-manager`, a homepage AI Menu Manager section after the source-to-public workflow, a hero teaser, header/footer navigation, Feature menu entry, Features-page Operations card, How It Works step 04 copy, Pricing proof copy, FAQ safety questions, sitemap coverage, and LLM discovery coverage. This is public website component/CSS/locale/docs only; owner app runtime, AMM API behavior, Firebase rules, Cloud Functions, pricing/payment runtime, auth, extraction, and customer menu runtime were not changed.

Version 3.6.58 adds a MenuList-native motion polish pass to the homepage source-to-public workflow. `InteractiveWorkflowSection.tsx` now wraps the existing source map in a scroll-aware guided rail that keeps one approved-source step in focus, shows restrained section progress, and removes the duplicated four-step card grid below the map. The implementation deliberately does not mount Lenis or any global smooth-scroll layer; phone browsing remains native, reduced-motion users keep static readable content, and the existing source-map pulse remains the only diagram motion. This is public website component/CSS/locale/docs polish only; owner dashboard runtime, customer menu runtime, screenshot assets, pricing, payment, auth, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.57 adds a shared screenshot-proof gallery to selected dedicated feature pages after a Chrome capture pass against the current authenticated owner dashboard and public MenuList routes. `FeatureScreenshotProofGallery.tsx` mounts approved, compressed public assets for `/features/menu-import`, `/features/qr-menu-links`, `/features/customer-feedback-loop`, and `/features/public-discovery`, while raw source captures stay under `__docs__/main-website/asset-production/feature-screenshots/raw/`. The pass deliberately does not publish rough captures for Official Business Page, Featured Choices, Owner PWA Dashboard, Business Health, Menu Content Prep, or Menu Quality Validation because the available states included broken media, unready status, or non-launch demo data. This is static public website component/CSS/locale/docs/image-asset work only; owner dashboard runtime, public menu runtime, guest feedback runtime, Business Health runtime, Assets runtime, pricing, payment, auth, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.56 updates `/features/print-ready-kit` after the print-assets editor integration. The dedicated page now positions the flow as finished templates first, supported editor customization when useful, and then image/PDF/printer-file download from the current approved menu source. The hero visual now shows template choice plus editor/export proof, and a dedicated proof section shows an always-visible asset-type rail plus current product screenshots from `public/images/website/print-ready-kit/` for the Assets template list and editor screen. The page intentionally uses a static rail instead of a carousel so SMB owners see all supported file types without hunting through slides. The dashboard screenshot is cropped away from account-header details. The `/features` card copy, header dropdown description, route metadata, `llms.txt`, SEO docs, and print-assets docs are updated to match. This is static public website component/CSS/locale/docs/image-asset work only; owner Assets runtime, creative editor runtime, printable renderer, mobile PWA runtime, customer menu runtime, pricing, payment, auth, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.55 corrects the `/features/owner-phone-dashboard` public positioning from a narrow phone-update message to the fuller Owner PWA Dashboard promise. Header dropdown labels, the Features Operations card, and the dedicated feature-page copy now explain that core owner workflows - menu edits, publishing, QR/link sharing, Business Health, feedback, screens, status, hours, and key settings - stay available from a phone browser or installed PWA. The copy still avoids overclaiming exact parity for every rare precision/setup edge case and keeps desktop positioned as optional for heavier review. This is static public website locale/docs work only; owner dashboard runtime, mobile PWA runtime, customer menu runtime, pricing, payment, auth, upload/extraction, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.54 adds a compact `/features` Operations card for regional workspace settings: owner workspace language preference, timezone, date format, and time format. The copy keeps customer-facing menu languages tied to the approved source and does not expand public website/resource locale claims beyond reviewed website languages. This is static public website locale/component/docs work only; owner dashboard runtime, customer menu runtime, public website language switcher, sitemap, hreflang, LLM discovery files, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, and Vercel deployment were not changed.

Version 3.6.53 removes the shared trailing proof-chip row from `FeatureDetailVisual` so dedicated feature pages no longer repeat the same tags inside the hero visual, below the visual, and again in the page signal strip. Feature-specific chips remain only where they are part of the visual composition, while the separate signal strip remains the page-level proof row. Local route smoke covered all ten generic feature pages with no missing-message markers and no rendered `.ws-feature-visual__pills` nodes; lint, TypeScript, and diff whitespace checks passed. This is public website component/CSS/docs cleanup only; copy, pricing, payment, auth, upload/extraction, customer menu runtime, owner dashboard runtime, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.52 is the production-audit mobile grid hardening pass across public website pages. Fixed-width `auto-fit` grid minimums on homepage support sections, Contact, Multi-location, Product, and Trust/Security were replaced with container-safe `minmax(min(100%, ...), 1fr)` tracks so cards cannot force horizontal overflow on narrow phones. Local checks covered TypeScript, lint, diff whitespace, agent/resource discovery verification, and 390px browser smoke for `/`, `/contact`, `/multi-location`, `/pricing`, `/trust-security`, and legacy `/product` redirecting to `/how-it-works`. This is public website CSS/component/docs polish only; pricing, payment, auth, upload/extraction, customer menu runtime, owner dashboard runtime, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.51 is the feature visual launch-polish pass after screenshot review found the Official Business Page hero visual too nested and compressed. The shared feature-detail hero now gives the media column more room, `FeatureDetailVisual` avoids duplicate internal marketing headlines, the Official Business Page visual removes the nested browser border and redundant bottom pill row, visual chips use softer treatment, and mobile microcopy/print asset cards stay readable without horizontal overflow. Local browser checks covered representative feature pages at desktop and 390px mobile widths plus light/dark theme toggling. This is static public website component/CSS/docs polish only; pricing, payment, auth, upload/extraction, customer menu runtime, owner dashboard runtime, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.50 is the final website readiness QA pass after the feature-page visual work. It keeps the implemented site as the only canonical website source, runs the public route/content scan again, and removes legacy `MenuList AI` wording from support-feedback labels in the website locale packs so the public page payload stays aligned with the current `MenuList` brand rule. This is static public website locale/docs cleanup only; pricing, payment, auth, upload/extraction, customer menu runtime, owner dashboard runtime, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.49 adds a shared `FeatureDetailVisual.tsx` product-proof visual system to the generic dedicated feature pages. The old text/icon hero preview now becomes a feature-specific visual for import, content prep, Featured Choices, Official Business Page, QR menu and links, Print-ready Kit, Owner Phone Dashboard, Menu Quality Validation, Customer Feedback Loop, and Public Discovery. The visuals reuse existing locale copy and feature config icons instead of adding fake screenshots or hardcoded English, and mobile layouts are compacted for print assets and feedback-flow pages. Local checks covered the ten feature routes, desktop/mobile overflow, lint, TypeScript, and diff whitespace. This is public website component/CSS/docs work only; pricing, payment, auth, upload/extraction, customer menu runtime, owner dashboard runtime, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.40 is the final production-readiness polish pass across the current public website. It adds a website-scoped document theme helper so dark mode colors the actual page body without leaking into owner-dashboard routes, extends shared viewport reveal wrappers to resource hub, resource article, and industry landing-page content, hardens legal-page grids against narrow-screen overflow, adds width guards around sticky feature-story layouts, and compacts the mobile analytics privacy panel. Local checks covered TypeScript, lint, diff whitespace, and representative light/dark browser passes for homepage, feature detail, resources, industry, and legal page types. This is public website component/CSS/docs polish only; pricing, payment, auth, upload/extraction, customer menu runtime, owner dashboard runtime, Firebase rules, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.39 upgrades the shared dedicated feature page system after reviewing the external feature-page suggestions against codebase truth. Generic `FeatureDetailPage` routes now use a Business Health-style sticky journey section with desktop left-rail steps, stacked right-side panels, and a mobile sticky pill row. The pass adds `/features/menu-quality-validation` as the only new P0 dedicated page because menu-quality checks directly support MenuList's public-truth promise. Pricing integrity, customer trust indicators, and menu validation fold into that page; content generation stays folded into Menu Content Prep; temporary status stays folded into Owner Phone Dashboard; discovery attributes stay folded into Official Business Page and Public Discovery; web sharing and placement guidance stay folded into QR Menu and Links and Print-ready Kit. The mobile drawer groups the existing top feature links as Start, Publish, and Operate while the desktop dropdown remains restrained. `/features` quality/integrity cards now link to Menu Quality Validation, and the new route is registered in platform discovery, static sitemap, `llms.txt`, and `llms-full.txt`. This is public website route/component/CSS/locale/discovery/docs only; owner dashboard runtime, validation runtime, MCE/Menu Quality Signals, customer menu runtime, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, and Vercel deployment were not changed.

Version 3.6.38 tightens the desktop Features dropdown after visual QA found the old tall proof panel blending into the hero area. The menu now uses a clearer viewport-centered elevated container, top overview row, compact three-column feature grid, and bottom proof/CTA strip. Feature and resource dropdown rows share cleaner hover/focus movement and border/background treatment. This is public website header/CSS/docs polish only; feature routes, owner dashboard runtime, customer menu runtime, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, and Vercel deployment were not changed.

Version 3.6.37 adds the dedicated public campaign page `/features/featured-choices` for the customer-facing Featured, Quick, and Value choices that can appear from the current approved menu. The header Features dropdown now places Featured Choices after Menu Content Prep, and the `/features` Featured section card links to the new page. The route is registered in platform discovery, static sitemap, `llms.txt`, and `llms-full.txt`. Copy stays owner-readable: it avoids `AI-powered`, internal Decision Intelligence naming, algorithm language, sales-lift promises, ranking promises, and exact decision-time claims. This is public website route/component/locale/discovery/docs only; Decision Blocks scoring, public menu rendering, owner dashboard controls, analytics, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, customer menu runtime, and Vercel deployment were not changed.

Version 3.6.36 adds the dedicated public campaign page `/features/menu-content-prep` for the owner job of preparing customer-friendly descriptions, menu images, and customer languages from the same approved menu source before publishing. The header Features dropdown now places Menu Content Prep after Menu Import, and the `/features` Generated images, Descriptions written for you, and One-click translations cards link to the new page. The route is registered in platform discovery, static sitemap, `llms.txt`, and `llms-full.txt`. Copy stays outcome-led and review-first: it avoids `AI-powered` positioning, ranking/AI-placement promises, and unchecked public publishing claims. This is public website route/component/locale/discovery/docs only; owner dashboard runtime, generation providers, credits runtime, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, customer menu runtime, and Vercel deployment were not changed.

Version 3.6.34 adds a restrained Features dropdown to the desktop header and matching nested feature links to the mobile drawer. As of v3.6.56, the dropdown promotes the highest-selling, owner-readable feature surfaces: Menu Import, Menu Content Prep, Featured Choices, Official Business Page, QR Menu and Links, Print-ready Kit, Owner PWA Dashboard, Business Health, and Public Discovery. Dedicated public campaign pages exist at `/features/menu-import`, `/features/menu-content-prep`, `/features/featured-choices`, `/features/official-business-page`, `/features/qr-menu-links`, `/features/print-ready-kit`, `/features/owner-phone-dashboard`, and `/features/public-discovery`, while `/features/business-health` remains the custom Business Health campaign page. These routes are registered in platform discovery, static sitemap, `llms.txt`, and `llms-full.txt`. This is public website route/component/CSS/locale/discovery/docs only; owner dashboard runtime, Business Health APIs, scheduler read models, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, customer menu runtime, and Vercel deployment were not changed.

Version 3.6.33 adds the dedicated public campaign page `/features/business-health`. The page explains Business Health as MenuList's owner-dashboard check for latest business state, public surfaces, customer attention, last checked date, location state, safe handoff, and the No action needed stable state. As of v3.6.61, the same page may frame that diagnostic value as an AI health check, while keeping Business Health read-only and routing fixes to AI Menu Manager or existing owner screens. The homepage Business Health section and the `/features` Business Health card now link to this page. The route is registered in platform discovery, static sitemap, `llms.txt`, and `llms-full.txt`. It does not use `/business-health`, which remains the protected owner app route. This is public website route/component/CSS/locale/discovery/docs only; owner dashboard runtime, Business Health APIs, scheduler read models, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, customer menu runtime, and Vercel deployment were not changed.

Version 3.6.32 adds Business Health to the `/features` Operations group as a compact capability card. The Features page now matches the homepage USP story without creating an analytics block. Copy stays limited to AI health checks, the latest MenuList check, last checked date, customer attention, whether anything needs action, the No action needed stable state, and safe handoff to AI Menu Manager or existing owner screens. This is a public website component import, locale, and docs update only; owner dashboard runtime, Business Health APIs, scheduler read models, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, customer menu runtime, and Vercel deployment were not changed.

Version 3.6.31 adds a calm homepage Business Health section after the owner outcome/capability proof and before Resources. The public website now describes Business Health as an AI health check for latest menu state, public surfaces, customer attention, locations, freshness, and safe handoff paths. It does not position the feature as an AI assistant, chatbot, revenue optimizer, prediction system, or autonomous mutation surface. This is public website component/CSS/locale/docs only; owner dashboard runtime, Business Health APIs, scheduler read models, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, customer menu runtime, and Vercel deployment were not changed.

Version 3.6.30 aligns the public website copy with the current `/create-menu` sign-in-first setup path. `/get-started`, `/create-menu`, FAQ import copy, pricing guidance, customer-browse wording, supported-business wording, and How It Works setup claims now avoid upload-before-sign-in promises, recommendation-style language, broad catalog positioning, pushy Pro steering, and overbroad handwritten/photoshoot/copywriter claims. This is public website locale copy and docs only; routing, auth runtime, extraction, pricing/payment, billing, owner dashboard behavior, Firebase, Cloud Functions, and Vercel deployment were not changed.

Version 3.6.29 replaces the footer Light/System/Dark theme dropdown with a compact segmented icon control. This fixes the light-mode selected-state contrast issue in the dark footer, keeps Language as the only footer dropdown, preserves the existing website `ThemeProvider` localStorage contract, and changes only public website UI/CSS/docs.

Version 3.6.28 tightens first-load website usability on phones. The analytics consent panel now uses a compact mobile layout so it does not cover the hero `Upload your menu` or `See customer preview` actions, and the hero H1 keeps proper readable spacing across the visual line break for assistive technology and DOM text extraction. This is UI/CSS/accessibility polish only; website structure, routing, pricing, payment, auth, onboarding, Firebase, Cloud Functions, customer menu runtime, and Vercel deployment were not changed.

Version 3.6.27 keeps Print Assets off the homepage as a standalone feature and tightens the existing lightweight website copy around the real owner outcome: branded table cards, counter cards, paper menu PDFs, and printer handoff files can come from the same current approved menu. The homepage source map still uses the compact `Print files` output, while the Features page carries the clearer table/counter/paper wording for owners who want more detail. This is copy/content alignment only; owner dashboard routes, mobile PWA routes, print generation, pricing, payment, subscription, auth, onboarding, Firebase, Cloud Functions, customer menu runtime, and Vercel deployment were not changed.

Version 3.6.26 gates the main MenuList marketing website's Google Analytics and Microsoft Clarity scripts behind an explicit analytics choice. First-time visitors see an analytics privacy banner, accepted choices load the analytics scripts with ads storage denied, declined choices keep analytics scripts blocked and clear known first-party analytics cookies, and the footer now includes an Analytics preference control beside Language and Theme. The Privacy Policy now includes a short data-use summary, consent-gated main-website analytics disclosure, service-provider wording grounded in live runtime, and purpose-based retention language. It intentionally avoids unsupported DPA/SCC/sub-processor readiness, fixed backup windows, exact encryption algorithms, broad model-training guarantees, and universal export/delete control claims. Owner dashboard analytics, customer menu analytics, custom-domain compliance pages, Firebase rules, Cloud Functions, pricing, payment, subscription, and `/create-menu` runtime were not changed.

Version 3.6.25 reduces public website auth friction without changing pricing, payment, or extraction runtime. Header, mobile drawer, `/get-started`, pricing purchase handoffs, and credit-pack handoffs now route owners to the central `/signin` page so phone OTP, Google, and passcode options remain available from one place. `/get-started` now acts as a calm directional page toward `/create-menu` or dashboard login, and footer/create-menu preview copy avoids defensive setup-protection language.

Version 3.6.15 adds the public `/resources` layer as an evergreen MenuList website surface. It ships a resources hub, 12 server-rendered article routes including Menu Source Audit, QR/Google/PDF/SEO/AI discovery guides, checklists, worksheet content, resource schema, platform discovery registry entries, static sitemap entries, robots crawler-policy sync, `llms.txt`/`llms-full.txt` coverage, a homepage resources section, and header/footer navigation. This is static public website content only; owner dashboard, auth, billing, Firebase, Cloud Functions, customer menu runtime, Canonica, Answerlattice, MyCodex, GrowthOS, and KitStamp surfaces were not changed.

Version 3.6.16 keeps Menu Card Export off the homepage as a standalone feature block and folds it into the existing lightweight website surfaces as `Print files`. The homepage workflow output, Features page card, and `/resources/digital-menu-vs-pdf-menu` now describe PDFs and printer handoff files as generated outputs from the current approved menu, not as a separate public source. This is copy/content alignment only; pricing, payment, subscription, auth, onboarding, Firebase, Cloud Functions, customer menu runtime, and Vercel deployment were not changed.

Version 3.6.17 adds structured resource localization guardrails and completes Hindi long-form resource coverage. Resource localization now uses source-versioned locale packs, stable section IDs, stable FAQ IDs, reviewed status, and `npm run verify:website-resource-locales` to catch missing article sections, stale source versions, forbidden claims, and English body fallback. Hindi (`hi-IN`) now covers the resources hub and all 12 resource articles. Tamil, Telugu, Marathi, and Bengali were deferred at this stage until full reviewed packs and locale-prefixed routes were implemented.

Version 3.6.18 adds reviewed Hindi resource URLs at `/hi-IN/resources` and `/hi-IN/resources/[slug]`. The Hindi routes share the same resource shell as English, expose localized metadata and JSON-LD `inLanguage`, include `hreflang` alternates in sitemap coverage, and are listed in LLM context files. Tamil, Telugu, Marathi, and Bengali were still held out of discovery at this stage until full reviewed packs existed.

Version 3.6.19 completes the first Indian-language resource rollout by adding reviewed Tamil, Telugu, Marathi, and Bengali packs for the resources hub and all 12 resource articles. The reviewed route layer now covers `/hi-IN/resources`, `/ta-IN/resources`, `/te-IN/resources`, `/mr-IN/resources`, and `/bn-IN/resources`, with localized metadata, JSON-LD `inLanguage`, sitemap `hreflang`, and LLM context coverage. This is static public website content only; owner dashboard, customer menu runtime, auth, billing, Firebase, Cloud Functions, Answerlattice, Canonica, MyCodex, GrowthOS, and KitStamp surfaces were not changed.

Version 3.6.20 completes long-form resource coverage for every language in the public website switcher by adding reviewed Arabic and Spanish packs for the resources hub and all 12 resource articles. Reviewed resource routes now cover `/hi-IN/resources`, `/ta-IN/resources`, `/te-IN/resources`, `/mr-IN/resources`, `/bn-IN/resources`, `/ar-SA/resources`, and `/es-ES/resources`, with localized metadata, JSON-LD `inLanguage`, sitemap `hreflang`, LLM context coverage, locale JSON loading, and Arabic RTL direction support. This is static public website content only; owner dashboard, customer menu runtime, auth, billing, Firebase, Cloud Functions, Answerlattice, Canonica, MyCodex, GrowthOS, and KitStamp surfaces were not changed.

Version 3.6.21 updates the website to match the complete resources navigation and discovery strategy without changing product runtime. Header navigation is Features -> How it works -> Multi-location -> Pricing -> Resources, desktop Resources opens a compact dropdown, mobile navigation exposes the same resource cluster, the homepage includes the eight-card "Learn how to keep your public menu current" bridge, footer resource links point to the core resource set, robots/LLM files carry modest official-source positioning, and resource measurement includes resource-to-create-customer-link and resource-to-pricing events.

Version 3.6.22 expands the public content/discovery layer with three additional resource articles (`/resources/restaurant-menu-schema`, `/resources/official-menu-url-checklist`, and `/resources/restaurant-qr-menu-mistakes`), reviewed coverage for those articles across all active resource locale packs, four industry landing pages under `/industries/`, sitemap/LLM discovery coverage, and a real checklist-copy UI that emits `resource_checklist_copy` only when checklist content exists. Downloadable template tracking remains intentionally unimplemented until real downloadable assets are designed and QA'd.

Version 3.6.23 applies the marketing-team feedback pass to the highest-value English resource and industry surfaces without adding thin pages or changing product runtime. `/resources/official-menu-source`, `/resources/menu-source-audit`, `/resources/google-business-profile-menu`, `/resources/qr-menu-for-restaurants`, `/resources/multi-location-menu-management`, and `/industries/restaurants` now use `Official Menu Source` as the category concept and `current approved menu` as the owner-readable explanation. Candidate pages for WhatsApp links, price changes, cleanup, and comparisons remain documented for later content work after the core pages are polished.

Version 3.6.24 adds the long-term public truth indexing guardrail from the business-page strategy review. Existing tenant OBP/menu metadata and per-tenant sitemap output now use `src/lib/seo/publicTruthIndexing.ts` so expired, blocked, starter, weak, or incomplete public truth records stay reachable but receive `noindex, follow` and stay out of sitemap. OBP runtime now relies on visible business-record schema instead of generated hidden FAQPage JSON-LD. This does not create directory pages, keyword-variant restaurant pages, unclaimed business records, owner dashboard changes, Firebase changes, Cloud Function changes, or new marketing resource pages.

Version 3.6.25 hardens the browser-local resource article checklist-copy handoff. `src/components/website/resources/ArticleSection.tsx` now checks Clipboard API support, falls through from rejected Clipboard API writes to an acknowledged textarea fallback when available, marks copied state and emits `resource_checklist_copy` only after a confirmed browser handoff, and logs `website_resource_checklist_copy_failed` with bounded article/section/checklist presence-length metadata. `npm run verify:website-resource-locales` guards the helper, unavailable-copy code, Clipboard rejection fallback, fallback acknowledgement, diagnostic metadata, and absence of the old silent catch. This does not change resource copy, route registration, sitemap/LLM discovery, owner dashboard flows, customer menu runtime, Firebase, Cloud Functions, or Vercel deployment.

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

Version 3.6.11 aligns the main website with source-gated Menu Link Import without adding a separate homepage section. The homepage workflow and `/how-it-works` source maps now include an owner-provided existing menu link as a source input beside photo, PDF, and typed text. Copy stays conservative: MenuList prepares an owner-reviewed version and does not claim generic scraping, marketplace import, or automatic publishing. Pricing, payment, subscription, Razorpay, auth, onboarding, public `/create-menu` runtime internals, and public customer menu runtime were not changed.

Version 3.6.12 tightens the shared `WebsiteFeatureCard` vertical rhythm after visual QA found excessive empty space between blue subtitles and body copy in public-surface cards. Cards now stack heading, subtitle, and description as one readable proof unit, and grid rows size from their tallest card content instead of a fixed-feeling card minimum. Copy, locale strings, page order, pricing/payment runtime, subscription behavior, auth behavior, owner-dashboard behavior, upload/extraction flow, and public customer menu runtime were not changed.

Version 3.6.13 reverses the shared headline/accent gradient so large highlighted text starts with the stronger MenuList blue and resolves into the lighter accent. The official logo mark gradient was not changed. Copy, locale strings, page order, pricing/payment runtime, subscription behavior, auth behavior, owner-dashboard behavior, upload/extraction flow, and public customer menu runtime were not changed.

Version 3.6.14 made Menu Link Import a public `/create-menu` input after validating the feature against the existing authenticated importer. The starter input set supports either a menu photo upload or an owner-provided public menu link; current public copy describes the sign-in-first setup path from version 3.6.30 onward. Link import stays guarded by `ENABLE_MENU_LINK_IMPORT`, requires explicit permission confirmation, reuses the SSRF-safe acquisition helper, stays under the public menu-entry IP rate limit, creates only a temporary review draft, and never publishes imported content until an authenticated owner claims and approves the setup.

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
| `src/app/(website)/layout.tsx`                              | Shared layout (locale, auth, theme, analytics consent) |
| `src/app/(website)/page.tsx`                                | Homepage route                                 |
| `src/app/(website)/WebsiteAuthProvider.tsx`                 | Auth context for pricing/onboarding flows      |
| `src/components/website/WebsiteAnalyticsConsent.tsx`        | Main website analytics consent gate, banner, and vendor script control |
| `src/components/shared/publicCookieConsent/PublicCookieConsentBanner.tsx` | Shared compact public cookie preference banner used by MenuList and sibling public websites |
| `src/components/shared/publicAiSummaryLinks/PublicAiSummaryLinks.tsx` | Shared footer-level AI summary link strip for public websites |
| `src/components/website/home/HomePage.tsx`                  | Current compressed homepage composition plus sticky CTA |
| `src/components/website/Header.tsx`                         | Shared header (all pages)                      |
| `src/components/website/Footer.tsx`                         | Shared footer (all pages)                      |
| `src/components/website/resources/`                          | Resource hub, article layout, cards, schema, and consent-gated website resource tracking |
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

- Homepage has source-gated local website evidence only; current launch or founder-review approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:website-public-copy-boundary`, `npm run verify:website-resource-locales`, browser desktop/mobile route smoke, founder-approved demo tenant screenshots, target Vercel deploy evidence, and production-host smoke.
- Full marketing-site launch still needs supporting page claim-hardening, founder-approved demo tenant screenshots, target deploy evidence, and production-host smoke.

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
| CTA              | "Create customer link →"                                      | Matches the broad customer-facing SMB acquisition path and routes to `/create-menu` |
| Hero message     | "Turn your current menu or service list into your official customer link." | Explains the buyer outcome before the source step |
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
- Pricing gained a decision strip above the plan cards to explain setup review, publish/share, and scale by location before plan comparison.
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

- The Features page Operations group now includes "Owner PWA dashboard."
- Copy is grounded in existing mobile owner surfaces: dashboard, More/settings screens, digital screens, daily operations, customer signals, feedback, Business Health, menu publishing support, and public-source controls.
- The homepage and supporting-page helper line remains the short reassurance version; the Features page carries the fuller capability explanation.
- The wording avoids overclaiming exact desktop/mobile parity for every rare precision/setup edge case while clearly stating that core owner workflows are available from phone browser or installed PWA.

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

- Staff/auth runtime, legal entity details, custom-domain compliance-page consent, DPA/SLA pages, pricing, payment, Razorpay, subscription, billing, checkout, and `/create-menu` runtime logic were not changed.

## Stage 7.15 Website Analytics Consent

Stage 7.15 aligns the main marketing website with the Privacy Policy's consent-gated website analytics promise:

- `src/app/(website)/layout.tsx` now renders `WebsiteAnalyticsConsent` instead of loading Google Analytics and Microsoft Clarity directly.
- `WebsiteAnalyticsConsent` stores only an `accepted` or `declined` analytics choice in `localStorage`, blocks analytics scripts until acceptance, sends analytics-only consent to Google/Clarity when accepted, and clears known first-party analytics cookies when declined.
- The footer preference controls now include an Analytics button so visitors can reopen the privacy choice later.
- Privacy and Trust/Security copy now distinguishes the main marketing website analytics gate from customer menu analytics and removes unsupported hard claims such as fixed backup windows, exact encryption algorithms, broad model-training promises, and universal export/delete controls.
- This is scoped to the main MenuList website. It does not add banners to owner custom-domain compliance pages, OBP/customer menu pages, or the owner dashboard.

## Stage 7.17 Shared Public Cookie Banner

Stage 7.17 moves the public consent UI to a shared compact floating banner pattern:

- `src/components/shared/publicCookieConsent/PublicCookieConsentBanner.tsx` is the shared banner/card used by public marketing and brand sites.
- MenuList still gates Google Analytics and Microsoft Clarity through `WebsiteAnalyticsConsent`; the banner only changed the visible UI and the accept label.
- AnswerLattice now gates optional Google Analytics behind the same banner instead of loading the analytics script immediately when a measurement id exists.
- CampaignCue shows essential-storage acknowledgement only, because its current public layout does not load analytics scripts.
- Neelvara currently does not mount the shared cookie banner or any analytics script.
- Copy must stay implementation-truthful: do not mention ads, personalization, or tracking categories unless that website actually uses them.
- This does not apply to owner dashboards, customer menus, Official Business Pages, widgets, private MyCodex surfaces, or product-runtime analytics.

## Stage 7.18 Public AI Summary Links

Stage 7.18 adds a Duna-style footer prompt for visitors who want an AI tool to summarize the public website:

- `src/components/shared/publicAiSummaryLinks/PublicAiSummaryLinks.tsx` owns the shared link strip.
- MenuList renders it in `Footer.tsx` above the copyright/preferences row.
- The links open Claude, ChatGPT, and Gemini with a product-specific summary prompt.
- The MenuList prompt points to `https://menulist.ai` and `https://menulist.ai/llms.txt`.
- The prompt explicitly rejects unsupported claims such as ranking promises, AI citation guarantees, automatic external-platform updates, and unsupported POS/account posting.
- This does not replace `llms.txt`, metadata, structured data, sitemap, or resource pages. It is only a visitor shortcut.

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

## Stage 7.22 Production Readiness Theme + Motion Polish

Stage 7.22 is the final light/dark and reveal-consistency pass for the current website:

- Added `WebsiteDocumentTheme.tsx` so website routes mark the body and set token-backed body background/color while mounted, fixing dark-mode overscroll/background without touching owner-dashboard routes.
- Extended shared `AnimateOnScroll` / `AnimateStaggerChild` usage to Resources hub, resource article, and Industry landing-page sections.
- Hardened Privacy, Terms, and Refund policy metadata grids for narrow mobile widths.
- Added width guards for sticky feature journey and Business Health story layouts.
- Compacted the mobile analytics privacy prompt so consent choices remain clear without dominating the first viewport.

Protected scope:

- No copy claims, feature routes, pricing/payment runtime, auth behavior, owner-dashboard behavior, upload/extraction flow, customer menu runtime, Firebase rules, Cloud Functions, or Vercel deployment were changed.

---

## Canonical Change Log

| Version | Date | Changes |
| ------- | ---- | ------- |
| 3.6.96 | June 30, 2026 | Hardened `/create-menu` upload/link, preview polling, and claim browser requests with same-origin credentials, no-store cache policy, and manual redirect handling before bounded response parsing. |
| 3.6.95 | June 30, 2026 | Hardened `/create-menu/success` Copy Link to fall through from rejected Clipboard API writes to acknowledged textarea fallback before copied state or starter activation signals. |
| 3.6.94 | June 29, 2026 | Added a category-based homepage switching comparison for PDFs/screenshots, QR-only pages, website builders, and link pages without changing pricing/payment or product runtime. |
| 3.6.93 | June 29, 2026 | Aligned the MenuList OG thumbnail to the broad official-customer-link promise and replaced the homepage sticky CTA scroll-percentage listener with hero and final-CTA section visibility observers. |
| 3.6.90 | June 27, 2026 | Compacted the mobile consent banner, changed the homepage secondary CTA to `See example customer page`, replaced the static restaurant hero screenshot with localized product mockup cards, moved pricing plan cards above the website-doubt explainer, and broadened Resources hub/homepage copy from menu-only to menu/service-list/public-list framing. |
| 3.6.89 | June 27, 2026 | Shortened the homepage mounted section order, stabilized `/create-menu` unauthenticated UX, localized decision-oriented pricing cards, grouped the Resources hub by recommended path and clusters, and raised tiny website mockup labels to the 13px floor. |
| 3.6.79 | June 22, 2026 | Updated Get Started, AI Menu Manager, How It Works, Multi-location, and Resources metadata, and shortened the shared footer CTA after mobile heading QA. |
| 3.6.78 | June 22, 2026 | Aligned shared website metadata, footer AI-summary prompt, and primary English/Hindi homepage copy to the broad menu/service-list customer-link frame, with a salon/spa-style hero proof example. |
| 3.6.77 | June 22, 2026 | Tightened pricing page H1/setup/decision heading copy after mobile heading QA so the official-customer-link framing remains readable at 320px. |
| 3.6.76 | June 22, 2026 | Broadened primary website CTAs and `/create-menu` copy from food-menu-only wording to `Create customer link` and menu, price-list, catalogue, and service-list source language for broad SMB acquisition. |
| 3.6.75 | June 22, 2026 | Reframed `/create-menu` metadata, visible upload-page copy, preview claim CTA, public powered-by CTA, and `llms.txt` route description around creating an official customer link from an owner-approved menu source. |
| 3.6.74 | June 22, 2026 | Applied reference-informed presentation sizing to homepage content width, section rhythm, desktop/mobile heading scale, and compact mobile cookie banner behavior. |
| 3.6.73 | June 22, 2026 | Removed public `AI-powered` shorthand from AI Menu Manager locale copy and LLM context wording, replacing it with approval-based language. |
| 3.6.72 | June 22, 2026 | Reduced dark-mode website visual noise with softer gray tokens, quieter borders, lighter shadows, and targeted shared-card/cookie-banner dark overrides. |
| 3.6.71 | June 22, 2026 | Added `/features/analytics` as a dedicated generic feature page, linked the `/features` Menu analytics card to it, and registered the route in sitemap/LLM discovery while keeping owner analytics runtime unchanged. |
| 3.6.67 | June 21, 2026 | Added shared public AI summary footer links for MenuList, AnswerLattice, and CampaignCue, with product-specific prompts and claim boundaries. |
| 3.6.66 | June 21, 2026 | Added a shared compact public cookie preference banner across MenuList, AnswerLattice, and CampaignCue public websites, with analytics gating only where analytics scripts exist and essential-storage acknowledgement where mounted without analytics. Neelvara currently has no banner mount. |
| 3.6.65 | June 21, 2026 | Kept the current blue trust/infrastructure palette canonical after external local-service palette review, added decorative-only warm accent tokens, and documented that pink is not approved for body text, CTA text, large headings, or QR-poster-style rebrand treatments. |
| 3.6.64 | June 18, 2026 | Aligned shared SEO/AEO metadata to production canonical constants, added explicit homepage canonical metadata, moved `/create-menu/success` behind a noindex server metadata wrapper, and hardened `verify:agent-readiness`. |
| 3.6.63 | June 18, 2026 | Updated the AI Menu Manager public page copy to mention guided item/category/menu-area context selection while preserving natural-language commands, selected project scope, and approval-safe cards. |
| 3.6.62 | June 18, 2026 | Converted the mobile hamburger feature list into an accordion with Features open by default, nested Start/Publish/Operate groups, current-route highlighting, and no duplicate AI Menu Manager entry. |
| 3.6.61 | June 17, 2026 | Updated Business Health website positioning as an AI health check while preserving the read-only diagnostic boundary and AI Menu Manager handoff. |
| 3.6.59 | June 17, 2026 | Added `/ai-menu-manager`, homepage AI Menu Manager launch hook, header/footer/feature navigation, pricing/how-it-works/FAQ copy, sitemap, and LLM discovery coverage without changing product runtime. |
| 3.6.58 | June 17, 2026 | Added native guided storytelling to the homepage source-to-public workflow without global smooth-scroll hijack. |
| 3.6.57 | June 16, 2026 | Added screenshot-proof gallery assets to selected dedicated feature pages after authenticated owner-dashboard and public-route capture. |
| 3.6.56 | June 15, 2026 | Updated `/features/print-ready-kit` to show finished templates, supported editor customization, visual template/editor proof, and image/PDF/printer-file downloads without changing product runtime. |
| 3.6.55 | June 12, 2026 | Repositioned `/features/owner-phone-dashboard` as Owner PWA Dashboard and clarified that core owner workflows stay available from phone browser or installed PWA without changing mobile runtime. |
| 3.6.54 | June 11, 2026 | Added a `/features` Operations card for regional workspace settings while keeping public website/resource language exposure limited to reviewed website locales. |
| 3.6.53 | June 11, 2026 | Removed the shared trailing proof-chip row from dedicated feature-page hero visuals so tags are not repeated three times on mobile pages. |
| 3.6.52 | June 11, 2026 | Hardened public website grid tracks with container-safe `minmax(min(100%, ...), 1fr)` values and verified representative pages at 390px mobile width with no horizontal overflow. |
| 3.6.40 | June 9, 2026 | Final production-readiness polish: website-scoped body theme handling, resource/industry reveal parity, legal mobile overflow hardening, sticky layout width guards, compact mobile analytics consent, and light/dark runtime verification. |
| 3.6.39 | June 9, 2026 | Upgraded generic feature campaign pages to a Business Health-style sticky journey layout, added `/features/menu-quality-validation`, grouped mobile feature navigation, folded secondary feature suggestions into the right existing pages, and registered the new route in sitemap/LLM discovery. |
| 3.6.38 | June 9, 2026 | Tightened the desktop Features dropdown into a viewport-centered elevated overview + three-column feature grid + compact proof/CTA strip so it no longer visually blends into the hero. |
| 3.6.37 | June 9, 2026 | Added `/features/featured-choices`, wired the Features page Featured section card and header navigation to it, and registered the page in sitemap/LLM discovery with owner-readable customer-choice language. |
| 3.6.36 | June 9, 2026 | Added `/features/menu-content-prep`, wired Setup & Content cards and header navigation to it, and registered the page in sitemap/LLM discovery with review-first content-prep language. |
| 3.6.30 | June 5, 2026 | Aligned website setup copy with the sign-in-first `/create-menu` path and softened recommendation, ICP, pricing, handwritten-menu, photoshoot, and copywriting claims. |
| 3.6.29 | June 5, 2026 | Replaced the footer Light/System/Dark theme dropdown with a segmented icon control and fixed the selected light-mode contrast issue. |
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
| 3.4.14 | May 20, 2026 | Required an owner account before `/create-menu` upload/extraction, preserving authenticated setup review while removing anonymous AI-processing cost leakage. |
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

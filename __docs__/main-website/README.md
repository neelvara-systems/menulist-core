# MenuList Main Website (menulist.ai)

**Version:** 3.5.0 (Homepage Compression + Conversion Proof Pass)
**Status:** ✅ IMPLEMENTED — Canonical
**Last Updated:** May 21, 2026
**Workflow:** `.codex/workflows/website.md`

---

## Canonical Website Source

The current implementation is the only default MenuList marketing website.

| Canonical Version | Name | Core Message | Status |
| ----------------- | ---- | ------------ | ------ |
| **3.5.0** | **Homepage Compression + Conversion Proof Pass** | **"Upload your current menu. Publish one official version customers can trust."** | **ACTIVE** |

Version 3.5.0 keeps the official customer-source hero but compresses the homepage around a faster buyer path: Hero -> Problem -> Solution -> How it works -> Setup relief -> Public surfaces -> Customer preview -> Real-world rollout -> FAQ -> CTA. Dense advanced proof sections such as analytics, search/AEO, POS Sync, staff access, and industry breadth remain available in supporting pages/components, but they are no longer part of the primary homepage scroll. The header now exposes a Demo path to the customer preview, public branding renders as `MenuList`, hero setup copy matches the 7-day setup pricing language, and security copy avoids absolute password-breach claims. Pricing, payment, subscription, Razorpay, auth, onboarding, and `/create-menu` runtime logic were not changed.

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
| Dev / SEO       | [SEO & AEO](./main-website_seo-aeo.md)           | Title tags, meta, schema, AEO strategy              |
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
| `src/components/website/shared/LogoMark.tsx`                | Official MenuList logo mark used by website header/footer |
| `src/components/website/SchemaMarkup.tsx`                   | Homepage JSON-LD schema                        |
| `src/components/website/GoogleAnalytics.tsx`                | GA tracking                                    |
| `src/components/website/ClarityAnalytics.tsx`               | Microsoft Clarity tracking                     |
| `src/components/website/shared/WebsiteLanguageSwitcher.tsx` | Language dropdown (8 languages)                |
| `src/config/websiteLanguages.ts`                            | Language configuration                         |
| `public/locales/menulist.ai/en-US.json`                     | Website locale default + base file (Website namespace) |
| `src/styles/website.css`                                    | Website-specific styles                        |
| `src/config/features.ts`                                    | `ENABLE_PUBLIC_MENU_ENTRY` flag                |

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

- Footer upgraded into a revenue-focused conversion/resource layer with closing CTA, proof cards, product/source/resource/legal navigation, and clearer "not a QR menu maker" positioning.

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

## Stage 7.9 Owner Reassurance Helpers

Stage 7.9 added small reusable website reassurance lines for non-technical SMB owners:

- `WebsiteMobileSupportHint` reinforces that MenuList can be managed and published from a phone browser or PWA.
- `WebsiteOwnerApprovalHint` reinforces that nothing is published until the owner reviews and approves it.
- The helpers are used on primary conversion and supporting-page heroes, including homepage hero/final CTA, Product, Features, Pricing, Get Started, Multi-Location, About, Contact, and Trust & Security.
- Locale coverage was added for `en-US` and `hi-IN`; other website locales continue to use the configured fallback behavior.

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

- `WebsiteMobileSupportHint` and `WebsiteOwnerApprovalHint` now use the shared `ws-support-hint` styling so reassurance lines remain readable on supporting-page heroes and wrap cleanly on mobile.
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

---

## Canonical Change Log

| Version | Date | Changes |
| ------- | ---- | ------- |
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

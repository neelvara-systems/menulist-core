# Website Content — MenuList Main Website (menulist.ai)

**Status:** ✅ CURRENT — Canonical website copy and section map
**Last Updated:** August 14, 2026
**Governance:** All content follows `02-language-governance.md` + `10-communication-worldbuilding-doctrine.md`  
**Test:** Every line passes: "Would a busy restaurant owner in Mumbai, reading this on their phone between lunch rush and dinner prep, immediately understand what this means for them?"

---

## Content Principles (From Constitution)

1. **Persuasion sequence:** Atomic truth → Hidden problem → New standard → Proof → Identity close
2. **Two Layers of Value:** Lead with Layer A (outcome), surface Layer B (ease) subtly
3. **Effort-removal clarity target:** 8.5/10 — SMBs must feel "this saves me work"
4. **Tone:** Premium calm + practical. Not fancy, not salesy, not startup-y.
5. **Language:** Operational words only. No AI-hype, no jargon, no marketing buzzwords.

> AI Menu Manager launch note (June 17, 2026; tightened June 22, 2026): `AI Menu Manager` is the public feature name by founder decision. This is a narrow feature-name exception only. Public copy may use `approval-based AI agent`, `Approval-based. Owner-approved.`, and `approval-based AI menu operations` for AI Menu Manager, while the overall MenuList product remains positioned as one official menu source customers can trust. Do not use `AI-powered` as public shorthand.

> Resources planning note (June 1, 2026): The next content expansion should be an evergreen `/resources` layer, not a chronological blog. Planned resources must keep the same official-source discipline as the homepage: owner-useful quick answers, checklists, worksheets, comparison tables, and practical next steps without ranking guarantees, AI citation promises, or generic restaurant-tech hype. Use `__docs__/main-website/main-website_resources-plan.md` as the tracker before writing or implementing resource copy.

> Resources hardening note (June 2, 2026; broad-SMB hub wording tightened June 27, 2026; route count refreshed July 4, 2026): The current release scope is not phased. The implemented website has the `/resources` hub, 15 article routes, seven industry landing pages, a desktop Resources dropdown, mobile nested resource links, footer resource links, and a compact eight-card homepage bridge titled around keeping a public list current. The homepage remains product-led; resource links support discovery and owner education without becoming a blog index. The hub and homepage bridge should use menu/service-list/public-list language where they represent broad SMB acquisition, while individual restaurant/menu SEO articles may stay menu-specific.

> Marketing feedback note (June 2, 2026): The priority English resource and restaurant industry pages now use `Official Menu Source` as the category concept and `current approved menu` as the owner-readable explanation. The accepted WhatsApp, price-change, cleanup, and comparison-page candidates remain documented for later content work; they are not part of the live route set until marketing has reviewed content depth and CTA fit.

> Public truth indexing note (June 2, 2026): The business-page strategy is handled in the customer-facing tenant/OBP/menu discovery layer, not by creating more website articles. Existing public tenant pages now use a central indexability gate for metadata and sitemap inclusion. Marketing should not request keyword-variant restaurant pages, AI-written business pages, or city/category directory pages until owner-approval, source-confidence, and claim/update rules are documented.

> Privacy and analytics note (June 5, 2026; CTA label updated June 22, 2026; vendor boundary tightened June 25, 2026; Plausible website-only layer added June 26, 2026; mobile banner compacted June 27, 2026; Clarity config fallback removed July 5, 2026; consent storage fallback diagnostics added July 5, 2026; resource payload boundary added July 5, 2026; GA page-location boundary added July 5, 2026; public analytics context minimized July 29, 2026; eight-language consent labels completed August 10, 2026): Main MenuList website analytics are consent-gated. Plausible, Google Analytics, and Microsoft Clarity must not load from `src/app/(website)/layout.tsx` until `WebsiteAnalyticsConsent` records an accepted analytics choice. Consent storage fallback diagnostics are bounded: if localStorage cannot be read, the banner shows the consent panel again and Plausible skips events until consent can be read; if localStorage cannot be written, the page keeps the runtime choice for the current view. Plausible is website-only and env-gated by `NEXT_PUBLIC_MENULIST_PLAUSIBLE_DOMAIN`; GA4 remains for paid-ad/conversion continuity; Clarity is MenuList-only and env-gated by `NEXT_PUBLIC_CLARITY_ID` for visual behavior observation. Google Analytics page views strip query strings and hash fragments from `page_location`, and the GA script fails closed unless `NEXT_PUBLIC_GA_MEASUREMENT_ID` matches the GA4 `G-...` measurement-id shape. Resource GA4 custom-event payloads are bounded through `trackGoogleMarketingEvent` and the shared public analytics context: same-site page/entry/target URLs exclude query and fragment, external links retain origin only, known referrers become allowlisted groups, and UTM values must be compact attribution tokens rather than arbitrary query text. Footer preferences include an Analytics control so visitors can change the choice later. The first-load mobile consent panel must stay compact enough that it does not cover the hero `Create customer link` or `See example customer page` actions, and all 11 consent labels must resolve in every configured website language without English fallback. Public website third-party events may include minimized page, entry-page, known referrer group, compact UTM, locale, CTA, and target URL context, but they must not send raw external referrer hosts/paths, arbitrary query text, custom repo-generated session identifiers, tenant ids, owner ids, customer ids, emails, phone numbers, private business identifiers, raw storage keys, or browser exception messages. This does not apply to owner custom-domain compliance pages or customer menu/OBP analytics, which are separate product surfaces with their own settings and privacy rules.

> Shared website chrome localization note (August 10, 2026): The Header, Footer, theme switcher, language switcher, accessibility skip link, and analytics-consent panel are complete in all eight advertised website languages. This guarantees a complete shared shell for the `/create-menu` journey without claiming that every other global page body is translated. The desktop Header uses a header-only wider container and tighter stable gaps so translated commands do not collide; widths below 1280px use the drawer. The drawer follows the logical end edge and reverses its closed motion for RTL.

> Website alias and legal truth note (updated July 29, 2026): Website-internal route families should preserve canonical MenuList routes. The old private alias host is no longer active. Terms and Refund copy must remain plan-specific and purpose-based: do not promise universal external publishing, all-feature access, fixed post-subscription deletion, absolute ownership of generated output, or provider certification. Cancelled/paused owners retain their current purchased plan only through the paid `cycleEndDate`; source copy and owner billing UI must not imply access beyond it.

> Business Health website note (June 17, 2026): Business Health may now be promoted as MenuList's AI health check for the menu and public presence. This is a diagnostic-only AI positioning: Business Health checks cached MenuList facts, shows what needs attention, says No action needed when stable, and hands fixes to AI Menu Manager or existing owner screens. Do not call it a chatbot, autonomous business agent, revenue optimizer, prediction system, competitor tracker, or direct public-truth editor.

> Featured Choices website note (June 9, 2026): Decision Intelligence is publicly exposed as Featured Choices at `/features/featured-choices`. Public copy should say Featured, Quick, and Value choices help customers choose from the current approved menu. Do not use internal names, algorithm language, exact decision-time claims, or guaranteed sales-lift claims.

> Final readiness QA note (June 10, 2026): Public brand wording in the website locale payload must stay `MenuList`, not `MenuList AI`, unless a legal/account context explicitly requires otherwise. Support-feedback labels bundled into the public website locale pack now follow this rule too.

> Print-ready Kit editor proof note (June 15, 2026): `/features/print-ready-kit` now needs to sell the template-to-editor workflow, not only static print-file export. Keep print off the homepage as a full section, but use the dedicated feature page to show owners the practical path: choose an asset/template, preview the generated output, open supported assets in the editor when needed, keep QR/required links protected, then download image/PDF/printer files.

> Visual Profile Completion website note (June 17, 2026): Visual Profile Completion is mentioned only as a supporting Official Business Page proof point. Public copy may say MenuList shows when key profile photos are missing. Do not create a standalone page, nav item, homepage section, AI photo-placement claim, gallery-manager claim, social-posting claim, or ranking promise.

> Official customer link framing note (June 22, 2026): the website spine is now `one approved menu/service-list source -> one official customer link -> QR, print, actions, owner updates, feedback, and health checks stay connected`. The first-fold copy should make owners understand they are creating the official link customers use everywhere, not only uploading a food menu. The lifecycle vocabulary is `Start -> Prepare -> Publish -> Place -> Operate -> Improve`. Do not add a `/restaurant-website` page until the canonical domain, LLM context, homepage, pricing, OBP, and claim boundaries are stable.

> Broad SMB conversion CTA note (June 22, 2026): primary public CTAs that represent the main `/create-menu` funnel should read `Create customer link ->` instead of `Upload your menu ->`. This keeps restaurants/cafes included while also making sense for salons, spas, studios, clinics, repair shops, retail counters, and service-list businesses. Menu-specific feature/resource pages may still use menu language when the page itself is menu-specific.

> Broad SMB homepage runtime copy note (June 22, 2026): the homepage and shared website metadata should no longer depend on food-menu-only examples in the first viewport or core conversion path. Use `menu or service list`, `current list`, `public list`, and `official customer link` where the copy represents MenuList's broad SMB promise. Restaurant/cafe proof can remain on menu-specific resource, industry, and feature pages, but the core homepage must also visibly work for salons, spas, studios, clinics, repair shops, retail counters, and other list-driven SMBs.

> Viral-readiness conversion guard (June 29, 2026): the Marc Lou 32-principle checklist is treated as a validation input, not a pricing or product mandate. For MenuList, preserve the current official-customer-link hero, visible Pricing nav, product proof visual, single primary `/create-menu` action, controlled 7-day setup framing, footer close, and no-fake-testimonial boundary. Keep the Open Graph thumbnail aligned with the broad menu/service-list promise, keep the desktop sticky CTA out of the hero and final CTA by observing section visibility instead of scroll-percentage state, and keep the homepage switching comparison category-based rather than naming competitors or making unsupported superiority claims.

> Public Truth Check tool route note (June 30, 2026): `/tools/public-truth-check` is the first public Public Truth Tools route. It is a browser-local self-report checker that uses entered facts only, returns present/missing/unclear/not-checked rows, supports report copy/download, routes next action to `/create-menu`, and can submit an optional consented follow-up through the existing public contact route. It must not claim external-source crawling, Google/Instagram/WhatsApp updates, ranking, citation, AI/search visibility, report-state storage, or provider-backed checks in the first version.

> MenuList Tools hub route note (July 3, 2026): `/tools` is the public index for the current MenuList Tools portfolio. It groups free public checks by owner job: Public Truth, Menu / Service Clarity, Customer Action Readiness, and Trust / Setup. The hub is static website UI only: it does not run reports, fetch external links, submit contact handoffs, store leads, call providers, inspect Google/social/search surfaces, or promise ranking/citations. Header Resources and footer Start navigation should point to `/tools` without turning the primary website nav into a broad toolbox.

> Non-technical owner copy polish (July 1, 2026): public website copy should read like it is for a busy SMB owner, not an internal product team. Avoid visible jargon such as `PWA`, `crawler`, `structured data`, `schema`, `source-of-truth`, `diagnostic layer`, `signals`, `raw tables`, and generic `dashboard` language unless the page is legal/security/resource-specific or `Owner phone dashboard` is the actual feature label. Prefer `approved list`, `customer link`, `clear public page`, `activity view`, `phone dashboard`, `review before publishing`, and `search and AI tools` where owners need the practical meaning.

> Create-menu preview bridge note (July 7, 2026; runtime truth corrected July 18, 2026): the homepage includes `CreateMenuPreviewSection` immediately after the hero and uses a browser-local selector for the two public inputs supported by `/create-menu`: a photo/image or an owned public link. An owned public link may point to a menu, service list, image, or PDF. It is a conversion bridge into `/create-menu`, not a second intake implementation. Keep the current guardrails explicit: sign in before processing, private owner-bound preview, five preview attempts per day, 24-hour draft expiry, and review before publishing.

> Website audit alignment note (August 10, 2026): public menu-import and lifecycle copy must match the two `/create-menu` input modes: a photo/PDF upload or a permission-confirmed owned public menu, service-list, image, or PDF link. Do not advertise typed-text intake in the website funnel; typed lists remain valid only on the separately documented WhatsApp onboarding channel. Features, Trust/Security, and legal page bodies must expose a `main` landmark for the shared skip link. Desktop dropdowns must use their visible labels, close on a repeated Features activation, and return focus to the trigger on Escape. Food industry pages may use the restaurant proof composite; salons, spas, and service-list industry pages use the service-business proof composite. Organization schema lists only the social profiles exposed in the footer.

> Private preview visual policy (July 25, 2026): keep the homepage preview as responsive, localized, theme-aware HTML rather than a static screenshot. It should read as one product surface: contrast-safe private status, one selected-source preview sheet, prepared-content rows, a compact review sequence, and restrained limit/expiry proof. Do not restore fake browser chrome, nested card stacks, low-contrast panel text, or a dashboard screenshot that implies the homepage selector performs the authenticated intake itself.

> Mobile try-first homepage note (July 3, 2026): the homepage now makes the preview path the first action after the hero. The first-scroll story is `upload or paste current list -> private preview -> review -> publish`, followed by a short before/after block, customer output proof, compact AI Menu Manager + Business Health USP proof, six conversion FAQ questions, and final CTA. The deep operating-loop, setup, surfaces, resources, AI Menu Manager, and Business Health explanations belong on `/how-it-works`, `/features`, `/ai-menu-manager`, `/features/business-health`, `/resources`, and `/faq` rather than in the first mobile scroll.

---

## Page 1: Homepage

### Canonical Implementation Scope

The current homepage is the only default MenuList marketing website. It keeps the first mobile scroll focused on the strongest owner action: start from the current menu, catalogue, service list, or price list; create a private preview; review it; then publish the customer link. Advanced proof areas stay available in supporting pages/components instead of lengthening the first homepage scroll. The public `/create-menu` funnel supports a photo/PDF upload or a permission-confirmed owned public menu, service-list, image, or PDF link after sign-in, with setup review positioned as plan-fit evaluation, not as a publishing or sharing plan. It intentionally does **not** edit pricing, payment, subscription, Razorpay, or onboarding runtime logic.

Supporting pages now share the same official-source discipline through shared hero/proof components, owner-readable trust language, safer pricing/setup claims, and a unified website palette. Pricing payment, subscription, Razorpay, auth, and onboarding runtime logic remains protected unless a separate payment-scope task explicitly approves it.

**Current route/component order:**

1. `HeroSection`
2. `CreateMenuPreviewSection`
3. `BeforeAfterSection`
4. `CustomerBrowseSection`
5. `CustomerLinkIncludesSection`
6. `OwnerProofSection`
7. `FaqSection`
8. `FinalCtaSection`
9. `StickyCta`

**Canonical section policy:** the homepage is intentionally compressed to reduce mobile and first-visit density. `HeroSection` now mounts the fictional demo official-source composite as first-viewport product proof. `CreateMenuPreviewSection` is the first strong conversion bridge after the hero: it lets visitors switch between photo and owned-public-link examples, shows the low-risk path from current list to private preview, and routes to `/create-menu` without collecting files on the homepage. `BeforeAfterSection` now owns the combined problem + switch comparison story in a short before/after format. `CustomerBrowseSection` shows what customers receive from the approved link. `CustomerLinkIncludesSection` is the compact homepage proof strip for what the customer link includes after approval: official page, QR link, print files, customer actions, phone dashboard, and activity/feedback. `OwnerProofSection` keeps AI Menu Manager and Business Health on the homepage as compact USP proof with generated demo product visuals, while the full stories remain on `/ai-menu-manager` and `/features/business-health`. `FaqSection` shows six conversion-critical questions; `/faq` holds the full 16-question FAQ. `ProblemSection`, `SwitchComparisonSection`, `InteractiveWorkflowSection`, `PublicTruthLoopSection`, `AiMenuManagerSection`, `SetupReliefSection`, `SurfacesSection`, `BusinessHealthSection`, `ResourcesSection`, `RevenuePathSection`, `StatsSection`, `SearchDiscoverySection`, `AnalyticsInsightsSection`, `SmartFeaturesSection`, `BusinessSection`, `IndustrySection`, `WebsiteReplacementBlock`, and `PreparedForYouSection` remain in the repo as supporting components/future page material, but they are not mounted in the current homepage composition.

**Sticky CTA behavior (June 29, 2026):** `StickyCta` is desktop-only and should appear after the hero proof has passed, then hide before the final CTA area. The homepage wraps the hero with `website-sticky-cta-start` and the final CTA with `website-sticky-cta-stop` so the tray is controlled by section visibility, not a scroll-percentage listener.

**Growth Kits placement policy (June 1, 2026; wording aligned August 22, 2026):** do not add GrowthOS, Growth Kits, or `Today's Sales Pack` to the homepage. The homepage must stay focused on the first owner action: start from the current menu or service-list source and publish one official customer-facing version. Growth Kits may be considered later as a small Pro or Multi-location pricing or Features-page proof point after owner usage validates demand.

**Print files placement policy (June 5, 2026):** do not add a separate Menu Card Export or Print Assets homepage section. The homepage may show `Print files` as one compact output of the approved menu source, while the Features page can explain the practical owner outcome: paper menu PDFs, table cards, counter cards, and printer handoff files generated from the same current approved menu. `/resources/digital-menu-vs-pdf-menu` continues to carry the broader PDF-vs-digital explanation. The Pro/Multi-location layout suggestion must not be promoted on the homepage; if public pricing copy later needs it, describe it plainly as `layout suggestion on Pro and Multi-location`, not as an AI PDF feature.

**Business Health placement policy (updated August 14, 2026):** keep Business Health as one compact card inside the mounted homepage `OwnerProofSection`, with the deeper public campaign story on `/features/business-health`. The separate `BusinessHealthSection` stays unmounted. Public copy may describe Weekly Menu Review as this week's selected-menu activity beside last week, paired with an explicitly location-level current check. Do not imply realtime sales, POS revenue, margins, external competitor tracking, unsupported date ranges, autonomous reasoning, or direct Business Health-owned public-truth mutation.

**Business Health Features-page policy (updated August 14, 2026):** the Features page lists Business Health as one compact Operations card aligned with the homepage owner proof. It remains a feature-inventory proof, not a second full section and not part of the analytics cross-map. Approved copy can mention this week's menu activity beside last week, the location-level current check, No action needed stable state, and fix handoff to AI Menu Manager or existing owner screens.

**Business Health campaign page policy (updated August 14, 2026):** `/features/business-health` is the public campaign URL for Business Health. Do not use `/business-health` for public marketing because that route belongs to the logged-in owner app. The `What it checks` story may name Weekly Menu Review and its existing this-week/last-week selected-menu comparison while keeping the current check location-level. It must not imply generic chatbot, ask-anything behavior, realtime sales, POS revenue, margins, competitor tracking, predictions, automatic external-platform updates, or direct Business Health-owned public-truth mutation.

**Analytics feature page policy (June 22, 2026; updated July 1, 2026):** `/features/analytics` is the dedicated public page for the shipped owner analytics dashboard. It may describe today, overview, daily, weekly, monthly, and overall dashboard views; menu sessions; engaged sessions; item taps; item status labels; searches; no-result search fix prompts; unavailable demand; actions while open, closed, or unknown; action rate; Official Business Page actions; customer app activity; desktop/mobile owner dashboard availability; and privacy-conscious aggregate reporting. It must not imply customer profiling, heatmaps, exact GPS tracking, revenue attribution, POS revenue, guaranteed sales lift, or a generic BI product. Analytics is linked from the `/features` Menu analytics card and discovery files.

**WhatsApp onboarding campaign page policy (June 22, 2026; fail-closed action updated July 10, 2026):** `/whatsapp` is an informational campaign route for the source-implemented messaging-onboarding flow. It should explain the WhatsApp-first wedge without presenting provider intake as open, turning MenuList into a WhatsApp replacement, making a Meta partner claim, implying automatic catalog sync, or offering bulk outreach. Checked-in Functions targets keep provider processing disabled, so the page must show localized availability copy and route both primary actions to `/create-menu`. It must not contain a test number or active provider deep link before current provider activation evidence exists.

**AI Menu Manager placement policy (June 17, 2026):** AI Menu Manager is now the website growth hook after the source-to-public workflow. The homepage should first establish one approved MenuList source, then show how AI Menu Manager keeps that source current by message. The dedicated public route is `/ai-menu-manager`. Copy must keep the loop explicit: owner intent -> prepared card -> approval when needed -> existing MenuList operation -> receipt. Unsupported external posting must be described as a manual task/export/handoff, not direct completion. As of v3.6.63, the dedicated page may mention guided item/category/menu-area selection as owner control, but it should not read like UI instructions or weaken the natural-language promise. As of v3.6.73, public AI Menu Manager copy uses approval-based language instead of `AI-powered` shorthand.

**CTA rule:** Primary public CTAs now point to `/create-menu` and should consistently read "Create customer link →" when the CTA represents the broad acquisition funnel. The homepage hero and `CreateMenuPreviewSection` may use "Start menu preview" when the action is explicitly framed as the private preview-first flow. The destination explains the flow publicly, then requires sign-in before accepting a menu, catalogue, price-list, or service-list image or a permission-confirmed public list link. `/get-started` remains a guided setup/sign-in page for owners who need account context, not the first upload funnel. Menu-specific feature/resource pages can still use menu wording when the page itself is explicitly about menu import, menu engineering, QR menus, or restaurant guidance.

---

## Page 1A: Resources

### Canonical Implementation Scope

The `/resources` layer is an evergreen MenuList public website surface, not a chronological blog. It explains how owners keep one approved public menu source current across QR, Google Business Profile, WhatsApp, Instagram, PDFs, websites, printed material, AI/search discovery, and multi-location teams.

**Current route set:**

1. `/resources`
2. `/resources/menu-source-audit`
3. `/resources/menu-engineering`
4. `/resources/qr-menu-for-restaurants`
5. `/resources/digital-menu-vs-pdf-menu`
6. `/resources/google-business-profile-menu`
7. `/resources/official-menu-source`
8. `/resources/restaurant-menu-seo`
9. `/resources/ai-search-menu-discovery`
10. `/resources/menu-update-checklist`
11. `/resources/qr-code-placement-checklist`
12. `/resources/menu-engineering-worksheet`
13. `/resources/restaurant-menu-schema`
14. `/resources/official-menu-url-checklist`
15. `/resources/restaurant-qr-menu-mistakes`
16. `/resources/multi-location-menu-management`

**Content rule:** Each resource page needs a visible quick answer, practical checklist/comparison/worksheet where relevant, owner-readable caveats, related-resource links, and one intent-matched CTA. Resource copy must not promise ranking, citation, AI answer placement, Google refresh timing, revenue lift, or automatic external-platform sync. Checklist copy controls are allowed only where the page already renders visible checklist content; downloadable template CTAs must stay absent until a real asset exists.

**Navigation rule:** Header navigation is product-led: Features, How it works, Multi-location, Pricing, Resources. Desktop Resources opens a compact dropdown for MenuList Tools, Menu Engineering, QR Menu Guide, Digital Menu vs PDF, Google Menu Guide, Restaurant Menu SEO, AI Search & Menu Discovery, Official Menu Source, and All Resources. Mobile navigation exposes the same resource links under the Resources entry, with MenuList Tools opening the canonical `/tools` index.

**Homepage resource placement:** `ResourcesSection` is no longer mounted on the compressed homepage. Keep resource depth on `/resources`, the Resources dropdown, footer links, and the `/tools` hub so the homepage stays focused on the preview-first conversion path. If a resources bridge is reintroduced later, keep it compact and use the approved eight-card cluster: Menu engineering, QR menu setup, Digital menu vs PDF, Google menu source, Restaurant menu SEO, AI search discovery, Official menu source, and Multi-location control. Keep Menu Source Audit as a high-intent resource page and hub/tool card, not as a homepage card.

**Resources hub layout rule (June 27, 2026):** `/resources` should not render every article as one flat, equal-weight grid. The hub first shows a four-step recommended path using existing article metadata: Menu Source Audit, Official Menu Source, QR Menu Guide, and Official Menu URL Checklist. Below that, article cards are grouped by existing resource clusters and localized cluster labels. Search remains intentionally absent until the static resource set grows beyond what grouped browsing can handle.

**Localization rule:** English long-form resource content is the source of truth. Every active public website-switcher language now has reviewed structured resource coverage: Hindi, Tamil, Telugu, Marathi, Bengali, Arabic, and Spanish. Each pack covers all 15 articles, including long-form sections, checklists, comparison rows, FAQ, metadata, and CTAs. Future languages must stay on English fallback until complete reviewed packs pass `npm run verify:website-resource-locales` and their locale URLs are added to sitemap, `hreflang`, and LLM context.

**Website copy-layer rule (June 10, 2026; contact fallback tightened June 28, 2026; response parsing tightened June 29, 2026; submission handoff tightened June 30, 2026; acknowledgement tightened July 1, 2026; persistence minimization tightened July 13, 2026):** active marketing-surface text should stay in the `Website` locale namespace, including fallback states, placeholders, button labels, helper headings, and accessibility labels. The `/create-menu/preview/[draftId]` page is part of this contract: loading, processing, failure, expiry, empty-state, detected-detail, stats, and claim-form copy must not be hardcoded in the component. The public contact form uses `Website.Contact.submitFailed` and `Website.Contact.securityCheckRequired` for fixed fallback copy, submits to `/api/public/contact` with same-origin credentials, no-store cache policy, and manual redirect handling, parses API responses through a shared bounded 8KB reader, requires `source: "menulist_public_contact"`, `status: "accepted"`, and the expected help topic before submitted state, logs only `website_contact_response_parse_failed` / `website_contact_response_invalid` metadata, and must not display API response text or browser exception messages. Server persistence strips query strings/fragments from source/referrer attribution and preserves valid zero report counts. Legal policy bodies, static metadata titles, and pricing/account billing internals can remain static unless a dedicated localization pass is planned.

**Create-menu auth-state rule (June 27, 2026):** `/create-menu` must show a deterministic public landing state for signed-out visitors: sign in, add current list, review before publishing, supported inputs, and the trust line that nothing goes public until review. Session checking may appear only as a small saved-sign-in status, not as the page's primary account state. This preserves sign-in-first upload/link-import behavior while avoiding a loading-first acquisition surface.

---

## Page 1B: Industry Landing Pages

### Canonical Implementation Scope

Industry pages explain how the same official-source layer applies to common list-driven SMB types without turning MenuList into a marketplace, POS replacement, booking system, or ranking tool.

**Current route set:**

1. `/industries/restaurants`
2. `/industries/cafes-bakeries`
3. `/industries/takeaway-cloud-kitchens`
4. `/industries/multi-location-food-businesses`
5. `/industries/salons-spas`
6. `/industries/service-list-businesses`
7. `/industries/local-service-businesses`

**Content rule:** Industry pages may describe fit, common public-list problems, how MenuList works, approved demo/product proof, and related resource links. They must not claim category-specific revenue lift, automatic Google updates, delivery-marketplace replacement, POS replacement, booking replacement, job-management replacement, or guaranteed search/AI visibility.

**Proof note (updated July 18, 2026):** `/industries/salons-spas`, `/industries/service-list-businesses`, and `/industries/local-service-businesses` no longer render internal placeholder labels or replacement instructions. Add routed demo screenshots or permissioned proof through AssetOS only after review; until then, the shared industry shell remains text-first.

---

### Section 1 — Hero

**Eyebrow:**

> One approved list. Customer links stay aligned.

**Headline:**

> Turn your current menu or service list into your official customer link.

> The official customer-facing version of your business.

> Publish your menu, hours, links, and business information from one owner-approved source.

**Subline:**

> Start with a clear photo or an owned public menu, service-list, image, or PDF link. MenuList prepares it for review, then keeps supported MenuList public outputs connected to the version you approve.

**Primary CTA:** Create customer link →
**Secondary CTA:** See example customer page (`/features/official-business-page`)
**Micro-trust line:** Publish and try the customer link during the 7-day setup. Choose a paid plan before the deadline to keep the same URL live.

**Proof strip:** Owner-approved · Use as website link · QR and print ready

**Visual:** Approved six-second business-truth loop showing owner approval, public menu, Official Business Page, QR, and screen surfaces settling around the same source. It uses fictional The Daily Plate demo data and is mounted from WebM/MP4 with a WebP poster fallback. `menulist-hero-official-source.webp` remains the CSS background fallback and OG source. Treat all variants as demo product visuals until replaced by browser-routed demo tenant screenshots.

**Notes:**

- Direction A: official customer-link outcome first, current-menu owner action second.
- Hero must communicate current menu/service list -> official customer link -> connected QR/print/actions/updates loop in under 5 seconds.
- The visual line break in the hero headline must preserve readable whitespace in DOM/accessibility text. The rendered H1 should read `Turn your current menu or service list into your official customer link.`
- Avoid "digital menu maker", "AI menu generator", and generic dashboard visuals.
- Existing menu link copy is allowed as a source-intake proof only. Do not call it scraping, marketplace import, automatic cloning, or automatic publishing.
- Avoid using "no account needed" as a hero or upload-page proof point. Keep the funnel promise aligned to the current setup model: "Start with a 7-day setup. Review before choosing a paid plan."

**AI Menu Manager teaser:** Show a compact hero teaser:

> New: AI Menu Manager - Update your list by message

---

### Section 3A — Create Menu Preview Bridge

**Purpose:** Give owners a concrete next action after they understand why scattered public lists drift.

**Headline:**

> See your menu as a customer link.

**Subline:**

> Start from a photo or an owned public link. MenuList prepares a private preview connected to your account.

**CTA:** Start menu preview (`/create-menu`)

**Visible guardrails:**

- Account connected before processing
- 5 preview attempts per day
- Drafts expire after 24 hours
- Nothing becomes public until the owner reviews and confirms

**Interactive proof:** The two selector cards are local UI only. Switching between photo and owned-link examples changes the sample private-preview copy inside the panel. It must not submit files, fetch links, call providers, create drafts, reserve public URLs, or write analytics/product state beyond ordinary consent-gated website events already present elsewhere.

**Policy:** This section must not process uploads, reserve public slugs, show a no-account-needed promise, or imply direct public publishing from the homepage. It is a proof-and-routing bridge into the existing authenticated `/create-menu` flow.

---

### Supporting Component — Revenue Path (not mounted on current homepage)

**Purpose:**

This section shows the practical path from the menu or service list a business already has to the customer actions that matter. It keeps the source-of-truth idea, but explains it in plain owner language.

**Eyebrow:**

> Upload, review, publish, share

**Headline:**

> Your public list should help customers choose faster.

**Supporting text:**

> MenuList turns the menu or service list you already use into the customer-facing version customers can trust before they call, visit, order, book, or share.

**Path steps:**

| Step | Label | Title | Description |
| --- | --- | --- | --- |
| 1 | Start | Use your current list | Use a clear photo or an owned public menu/service-list/image/PDF link. The owner-approved version is the starting point. |
| 2 | Publish | Customers see one clear page | The customer link and official page replace old files, screenshots, and broken links. |
| 3 | Share | Put the same link everywhere | QR, web link, screen, and PDF all point back to the current source. |
| 4 | Action | Customers can act quickly | Call, WhatsApp, directions, order, book, and share stay close to the list. |

**Trust panel:**

- Find items fast.
- Know it is current.
- Know it is official.
- Take the next step.

**Link row:**

- See customer surfaces
- See setup steps
- See business types
- See plans

---

### Section 2 — The Problem

**Section heading:**

> Business menus and service lists online are broken.

**Supporting text:**

> Your Google listing shows old prices. The QR link has items or services you removed. The PDF on WhatsApp is from months ago. Customers see different versions everywhere they look, and none of them are correct.

**Visual stack:**

The section now uses a split layout: left-side narrative, right-side public-drift stack. This is more direct and self-selling than a generic card grid.

**Visual tiles (4):**

| Tile | Short Label | Description |
| --- | --- | --- |
| 1 | Outdated Google listing | Old prices and hours still showing to customers searching for you |
| 2 | Wrong QR link | Items or services you removed months ago still visible when customers scan |
| 3 | Old PDF on WhatsApp | Last year's menu or service sheet still circulating in customer group chats |
| 4 | Inconsistent pricing | Different prices on different platforms — customers notice |

**Notes:**

- Keeps the owner pain obvious before introducing product mechanics.
- Tile count is intentionally 4, not 6, to reduce visual noise.

---

### Removed — Redundant Solution Section

The old `SolutionSection` with "One menu. Public places stay aligned.", a central SVG, and six explanatory bullets is no longer mounted. The same category bridge is now covered more clearly by the hero promise, `CreateMenuPreviewSection`, `BeforeAfterSection`, and customer output proof. Keeping both would lengthen the mobile homepage and repeat the same one-source claim before the visitor reaches the preview-first action.

---

### Supporting Component — Source Proof Numbers (not mounted on current homepage)

**Section heading:**

> One source. Many places. Less repeated work.

**Metric cards (4):**

| # | Metric | Meaning |
| --- | --- | --- |
| 1 | 1 owner-approved source | Menu, prices, hours, and public business details begin from one controlled source. |
| 2 | Customer-facing outputs | Customer-facing outputs can point back to the same current menu. |
| 3 | 3 clear steps | Start with the current menu, review the prepared version, then publish what customers see. |
| 4 | 0 technical setup | No website build, design tool, or separate QR-menu system is needed before publishing. |

**Notes:**

- Included because it sells the reduction in repeated work quickly.
- Copy avoids broad "every surface / always in sync" overclaims.

---

### Section 4 — Source-To-Public Bridge

**Section heading:**

> One approved source becomes your customer links and assets.

**Eyebrow:**

> From source to public

**Workflow visual:**

- Left side: current menu inputs (`Photo`, `PDF`, `Existing link`, `Text`).
- Center: official MenuList logo plus `Owner review`.
- Right side: public customer outputs (`Official page`, `Menu link`, `QR code`, `Print files`).
- Desktop wraps the source map in a guided rail that keeps one story moment in focus and shows section progress as the visitor scrolls. This is a native website enhancement, not a global smooth-scroll dependency.
- Mobile keeps the guided story in normal flow so phone scrolling remains native and stable.
- Mobile uses three rows so inputs spread horizontally, owner review stays centered, outputs sit below, and the dotted connector paths stay edge-anchored without using the desktop geometry.
- Diagram colors must stay theme-aware: light mode uses light surfaces, dark mode uses dark surfaces.
- Static dotted paths remain visible. A subtle pulse layer travels from inputs into MenuList, pauses while the center rings keep a light always-on pulse, and then moves from MenuList toward outputs; each destination card briefly highlights only its existing border when the pulse arrives. Reduced-motion users only see the static paths.
- This visual belongs in the workflow section, not the hero, because the hero should keep showing believable product/customer proof while the workflow section explains the operating model.

**Steps (4):**

| Step | Title | Description |
| --- | --- | --- |
| 1 | Start with the menu you already use | Use a clear photo or an owned public menu/service-list/image/PDF link in the public setup path. |
| 2 | Prepare the customer-ready version | Items, sections, prices, descriptions, images, languages, and business details are prepared for review. |
| 3 | Publish the approved menu and page | The customer-facing menu and Official Business Page go live only from the version the owner approves. |
| 4 | Place it where customers look | Put the approved link and fresh assets on QR, WhatsApp, Instagram, Google profile, packaging, print files, table cards, counters, and configured screens. |
| 5 | Operate daily changes from phone or AI Menu Manager | Owners update prices, sold-out items, specials, hours, QR links, screens, and customer-facing details from the approved source while supported public paths refresh through their own cache, device, or replacement rules. |
| 6 | Improve with feedback and Business Health | Feedback, activity signals, quality checks, and Business Health show what needs correction. |

**Step presentation:**

- The six steps are presented in the guided rail beside the source map, not as a second card grid below it.
- The active rail state may change with scroll progress, but the full step text remains readable without animation or JavaScript-driven visibility gates.

**Micro-copy below steps:**

> One source. Owner approval before publishing. Clear fixes after customers use it.

---

### Section 5 — Public Truth Loop

**Section heading:**

> Every output returns to the approved source.

**Eyebrow:**

> Operating loop

**Supporting text:**

> MenuList is not just a QR menu. Customer menus, official pages, QR, print files, activity signals, issue reports, owner updates, and health checks keep pointing back to the source the owner approves.

**Core visual:**

- Center card: official MenuList logo with `One approved source`.
- Loop steps:
  1. Current menu source.
  2. Owner approval.
  3. Customer surfaces.
  4. Signals return.
  5. Source stays current.
- The loop is a proof bridge after the source-to-public workflow. It should explain how MenuList keeps the public version connected after publishing, not become another feature inventory.

**Output proof cards (3):**

| Output | Purpose |
| --- | --- |
| Customer menu | The current items, prices, language, and guided choices customers browse. |
| Official business page | Hours, contact, photos, directions, actions, and clear public details. |
| Print and QR kit | Table, counter, packaging, screen, PDF, and share files from the same source. |

**Caption:**

> The useful promise is simple: when something changes, the owner corrects one approved source instead of chasing every old PDF, screenshot, and link.

**Notes:**

- This section borrows the idea of a complete feedback/correction cycle from reference-site audits, but uses MenuList-native content and design tokens.
- It must not claim direct Google/Instagram/WhatsApp updates, search ranking, AI citation, automatic POS sync, or fake customer metrics.
- Keep it compact. If it starts repeating `SurfacesSection`, reduce copy rather than adding more cards.

---

### Section 6 — Website Replacement Doubt Block

**Component:** `WebsiteReplacementBlock`

**Mounted on:** `/pricing` after plan cards and owner-choice guidance, and `/features/official-business-page` after the page journey. It is intentionally not mounted on the homepage.

**Title:**

> Can MenuList be my business website?

**Purpose:** Answer the buyer doubt directly: for many customer-facing SMBs, including restaurants, cafes, cloud kitchens, bakeries, salons, spas, clinics, studios, repair shops, retail counters, and service-list businesses, MenuList can act as the main customer link for menu, service list, hours, photos, directions, call/WhatsApp, QR, packaging, table cards, posters, bills, and print materials.

**Boundary:** MenuList is not a generic website builder, POS, delivery platform, accounting system, payroll tool, CRM, or ranking/citation guarantee. Deep custom sites with many pages, campaigns, blogs, careers, or advanced brand storytelling can stay separate.

---

### Section 7 — Setup Effort Removed

**Section heading:**

> Most setup work is prepared before you publish.

**Supporting text:**

> MenuList starts from the menu you already have, then prepares the pieces owners usually chase across separate tools.

**Prepared cards (3):**

- Menu structure prepared.
- Public presentation prepared.
- Launch materials prepared.

**Notes:**

- Included because setup-effort removal is one of the strongest buying triggers, but now compressed to avoid making the homepage feel like a configuration tour.
- New copy keeps owner approval in the center and avoids pretending AI publishes unchecked.

---

### Section 7 — Public Proof Surfaces

**Section heading:**

> One source for the places customers check.

**Supporting text:**

> The public output is the proof. The official page, QR menu, share link, saved shortcut, customer actions, activity signals, and issue reports all point back to the same approved menu.

**Surface tiles (8):**

| # | Surface | Purpose |
| --- | --- | --- |
| 1 | QR Menu | Customers scan and see the current published menu. |
| 2 | Public Link | One official link for WhatsApp, Instagram, and packaging. |
| 3 | Official Business Page | Menu, hours, photos, directions, contact, and customer actions. |
| 4 | Customer Actions | Customers can call, WhatsApp, get directions, see photos, and open the menu from the same current version. |
| 5 | Saved Menu Shortcut | Repeat customers keep the current menu close on their phone. |
| 6 | Clear Public Source | Search and answer systems get cleaner public business information without ranking promises. |
| 7 | Simple Activity Signals | A small usage/freshness trust signal, not a full analytics section. |
| 8 | Customer-Reported Issues | Customers can report menu or business-detail issues from the public view so the owner can correct the approved source. |

**Notes:**

- Section still carries `id="public-proof"` for footer/public-proof links. The hero secondary CTA now points to the customer preview section at `#customer-demo`.
- Feedback is framed as a public-correction loop, not reviews, reputation management, testimonials, or growth marketing.
- Analytics and Search/AEO remain small confidence cards here, not full homepage sections. Multi-location stays conservative in FAQ/supporting pages instead of taking a homepage surface card.
- Do not claim automatic Google/Instagram/WhatsApp sync unless the runtime path proves it.

---

### Supporting Component — Search and AI Discovery (not mounted on current homepage)

**Section heading:**

> Be readable where customers search.

**Supporting text:**

> Your official page and menu are prepared as clear public business facts, so search engines and AI assistants have a cleaner source to read.

**Primary proof panel:**

> One official source for people and machines.

MenuList turns approved menu and business details into visible public pages, server-rendered structured data, sitemap signals, and owner-controlled search copy.

**Flow:**

1. Owner-approved menu and business facts
2. Official page, live menu, and public link
3. Structured data, sitemap, and AI-readable files

**Signal cards:**

| Signal | Message |
| --- | --- |
| Business facts stay clear | Hours, address, phone, actions, cuisine, service modes, photos, and social links can sit on the official page. |
| Menu facts are structured | Items, sections, prices, availability, update signals, and business context are published in machine-readable formats. |
| Search copy can follow each language | Owner settings include SEO and AEO fields, preview, and business-copy setup for enabled languages. |
| Crawlers get a stable source | Public pages, server-rendered JSON-LD, sitemap, robots rules, and LLM discovery files point systems back to the current MenuList source. |
| Agents get safe boundaries | Public agent files say what can be read, which official handoffs can be opened, and what must stay owner-controlled. |

**Proof chips:**

- SEO and AEO settings are built in.
- Copy starts from current business and menu facts.
- Owners review before publishing.
- No ranking or citation promises.

**Caveat:**

> Google, Bing, ChatGPT, and other AI systems decide what they crawl, cite, and show. MenuList prepares a clearer official source; it does not promise placement.

**Notes:**

- Added because AI search and answer-engine discovery are now an owner-relevant buying concern.
- Grounded in existing owner SEO/AEO settings, Business Copy Setup, public schema/sitemap/robots infrastructure, active route-level JSON-LD, and LLM discovery files.
- Agentic web/WebMCP guidance supports the same direction, but public copy must keep WebMCP and MCP out of active claims until those surfaces are deliberately implemented, flagged, and tested.
- The section must never promise Google ranking, Google Maps updates, ChatGPT citation, or automatic external-platform refresh.

---

### Section 8 — Customer Browse Proof

**Section heading:**

> Customers find what they want faster.

**Supporting text:**

> A MenuList page is built for real browsing. Customers can search, jump sections, switch language, and use guided choices from the approved menu before they choose.

**Proof points (5):**

- Decision blocks guide choices.
- Search is always within reach.
- Sections keep big menus easy.
- Language is part of the menu.
- Trust signals stay visible.

**Visual:** Customer-facing menu preview showing business identity, open/update state, search, section chips, item cards, and prices.

---

### Section 8A — Customer Link Includes Strip

**Purpose:** Show SMB owners that the preview creates more than a plain QR page without reintroducing the heavy `SurfacesSection`.

**Headline:**

> One customer link carries the useful pieces.

**Subline:**

> After review, the same approved link can support the public page, QR, print files, customer actions, owner phone view, and simple activity signals.

**Items:**

| Item | Homepage wording |
| --- | --- |
| Official business page | Hours, contact, photos, directions, and the current list in one public place. |
| QR link | Table, counter, packaging, and poster QR files point to the approved version. |
| Print files | Paper menus, table cards, and printer handoff files can stay tied to the same list. |
| Customer actions | Call, WhatsApp, directions, booking, ordering, sharing, and list access stay close. |
| Phone dashboard | Owners can check and update the important parts from a phone-friendly view. |
| Activity and feedback | See what customers open and collect wrong-price or missing-item reports. |

**Policy:** Keep this as a compact proof strip between `CustomerBrowseSection` and `OwnerProofSection`. Do not expand it into a full surfaces grid, resources bridge, analytics section, or detailed operations workflow. The deeper stories stay on feature pages.

---

### Supporting Component — Analytics And Intent Proof (not mounted on current homepage)

**Section heading:**

> See what customers do after publishing.

**Supporting text:**

> MenuList connects your public menu and Official Business Page into one owner dashboard, so you can see what customers opened, searched, and acted on.

**Proof cards:**

- Menu and page journeys together.
- Demand stays attached to the menu.
- Final actions show real intent.
- Where calls came from.
- Private and cost-safe by default.

**Notes:**

- Included because it explains why MenuList matters after publish.
- Keep this proof as owner insight, not hype or surveillance language.

---

### Supporting Component — Quiet Reliability (not mounted on current homepage)

**Section heading:**

> Quiet reliability underneath.

**Supporting text:**

> Customers see a simple public page. Under it, MenuList keeps your menu controlled, current, and ready for the places customers already check.

**Reliability proof points:**

- Owner-approved publishing.
- Freshness signals.
- Change memory.
- Temporary status reaches customers.
- Presence visibility.
- Ready for serious operations.
- Connected POS updates.
- Staff access control.

**Notes:**

- This is proof language, not hype language.
- Keep all claims tied to implemented surfaces and repo evidence.
- POS Sync belongs here as an operations proof, not as a separate homepage promise. Use signed full-menu snapshot to connected store POS webhook language; avoid "works with any POS", "real-time sync", and POS integration suite claims.
- Staff access belongs here as operations proof, not as the homepage promise. Use concrete owner controls: add staff, assign roles, reset passcodes, and sign out access when staff leaves.

---

### Section 9 — Real-World Deployment

**Section heading:**

> The official customer link leaves the screen.

**Supporting text:**

> A correct public link matters only when customers can find it. MenuList helps place the official customer link where your business already speaks to customers.

**Deployment cards:**

- Table and counter QR.
- Packaging and takeaway.
- WhatsApp and Instagram.
- Saved menu shortcut access.
- Digital screens.
- Placement checklist.

**Notes:**

- This section borrows Stage 3 Direction B's limited deployment strength without changing the overall Direction A system.
- The value is placement confidence, not decoration.

---

### Supporting Component — Business Fit (not mounted on current homepage)

**Section heading:**

> For businesses that want things to stay correct.

**Points:**

- Pricing stays consistent.
- Brand stays controlled.
- Locations stay aligned.
- Festival menus can be handled.
- Temporary status updates can reach customers.
- Presentation stays professional.

**Link text:** Learn about multi-location →
**Link destination:** `/multi-location`

---

### Supporting Component — Industry Breadth (not mounted on current homepage)

**Section heading:**

> Built for customer-facing SMBs.

**Supporting text:**

> MenuList fits businesses where customers need one current public menu, catalogue, service list, or price list they can trust.

**Industry chips:**

- Restaurant
- Cafe
- Bakery
- Cloud Kitchen
- Bar & Lounge
- Food Truck
- Salon
- Spa & Wellness
- Retail Shop
- Gym & Fitness
- Hotel
- Service Business

**Notes:**

- Retained as a supporting component because `IndustrySection` can prevent category narrowing on future/expanded pages.
- Do not add standalone industry/flexibility copy to the compressed homepage unless the live page becomes visibly too restaurant-only after future edits. Keep the current homepage focused on public-source proof and let the FAQ carry business-fit breadth.

---

### Section 10 — FAQ

FAQ language should reinforce MenuList as the official customer-facing source. Avoid reducing the product to a "digital menu", "restaurant website", "AI tool", or "QR generator". Do not overclaim automatic external distribution; use owner-approved source and MenuList public-surface language.

Key FAQ topics:

- What MenuList is.
- Whether technical setup is needed.
- What happens after a price/item update.
- Branding control.
- Supported business types.
- Business data safety.
- Multi-location support.
- Search/AI placement caveat.
- Staff access without owner access.
- Pricing entry point.
- Existing menu link import after sign-in as a setup input guarded by owner permission confirmation, not a generic scraper.
- Imported content remains review-first and never publishes automatically.

---

### Section 11 — Final CTA

**Heading:**

> Make one public menu customers can trust.

**Subtitle:**

> Start from the menu you already have. MenuList turns it into the official customer-facing version of your business.

**Button:** Create customer link →

**Final CTA proof stack:** Removed in v3.6.1. The closing CTA should stay short after the homepage has already explained upload, review, publishing, customer surfaces, and FAQ.

---

## Page 2: How It Works (/how-it-works)

**Canonical note:** Supporting website pages must follow the current official-source strategy. Revalidate claims against the current codebase before promoting them. Do not use automatic Google/external-surface language unless the runtime path proves it. `/product` is a permanent legacy redirect to `/how-it-works` and must not be promoted as an active public destination.

### Hero

**Headline:**

> How MenuList works

**Subline:**

> Start with your current menu. MenuList prepares the owner-approved source for the customer-facing surfaces your business uses.

**CTA:** Create customer link →

**Source map visual:**

- Left side: supported public setup inputs (`Photo`, `Public PDF or image link`, `Existing link`, `Service-list link`).
- Center: official MenuList mark plus owner-review gate.
- Right side: customer surfaces (`QR`, `Menu link`, `Screens`, `Print files`, `Official page`, `Saved shortcut`).
- Desktop output connector paths start under the center logo/ring and visually emerge from the core boundary, matching the homepage source-map alignment.
- From 521px through 768px, the compact source map uses four input cards, the centered review gate, and two rows of three output cards.
- At 520px and below, a dedicated phone connector network follows the two-column source and output grids through the empty center gutter. The connectors remain behind the cards and keep the source -> review -> output sequence visible without crossing labels.
- Reduced-motion mode keeps the static dotted network visible and removes the moving pulse.
- The center ring ripple is intentionally visible in light mode so the MenuList core feels active without adding extra copy or decoration.
- The visual must stay restrained and product-specific. Do not use generic SaaS node graphics.

---

### Section: Upload & Create

**Heading:**

> Start with what you have.

**Body:**

> The public setup path accepts a supported photo/image upload or an owned public list link. An owned public PDF can be supplied through its link. Signed-in owner editor and extraction workflows may support additional sources under their own validated limits.

**Key points:**

- Public setup supports a photo/image upload or owned public link
- Direct PDF upload and typed-list intake must not be promised on `/create-menu` unless that runtime changes first
- Items, prices, and categories read for you — no manual entry
- Can help with multi-page menus and clear handwritten menus
- Edit anything before publishing — you stay in control, without the setup work

**Source:** `ai-data-extraction_website.md`

---

### Section: Review & Approve

**Heading:**

> Check everything before it goes live.

**Body:**

> See your extracted menu alongside the original document. Edit any item, fix a price, adjust a description. Nothing publishes without your approval.

**Key points:**

- Side-by-side view: original document next to structured data
- Edit any field — names, prices, descriptions, categories
- Quality checks flag potential issues before publishing
- You approve. Then it goes live.

**Source:** `menu-correctness-engine_website.md` (quality assurance backing)

---

### Section: Everything Prepared For You

**Heading:**

> Images, descriptions, and translations — prepared before you publish.

**Body:**

> Your menu items get professional descriptions, images, and translations without you writing, designing, or translating anything. The system prepares everything from your menu data.

**Key points:**

- Professional descriptions for every item — written for you from your menu data
- Menu images and uploaded photos can be prepared from approved menu data — no separate photoshoot, designer, or formatting work needed to get started
- Multiple languages added with one click — no translator needed
- Consistent quality across your entire menu — without you writing a single line

**Source:** `ai-image-generation_website.md`, `media-image-system_website.md`, `description-generation_website.md`, `multi-language-translation_website.md`

**Note:** This is the Layer B section — surfaced as outcomes ("descriptions created", "images created"), never as technology ("AI generates", "neural network").

---

### Supporting Homepage Proof: Business Health

`OwnerProofSection` mounts this as one compact owner-side proof card. The deeper `BusinessHealthSection` remains unmounted so the compressed homepage does not add another full feature section.

**Heading:**

> Business Health is your AI health check.

**Body:**

> After publishing, MenuList checks the latest menu state, public surfaces, customer attention, and locations. It shows what needs attention, and stable checks say No action needed.

**Homepage proof cards:**

1. **Latest check first** — The dashboard opens with status, freshness, and whether anything needs attention.
2. **Weekly menu review** — This week's selected-menu activity appears beside last week, while the current check remains explicitly location-level.
3. **Fixes hand off safely** — When a change is needed, Business Health points to AI Menu Manager or the existing owner screen instead of changing public truth by itself.
4. **Works on phone** — The same Business Health view appears inside the mobile owner app.

**Preview content:**

- AI health check
- Business looks stable
- No action needed
- Uses data through the last settled business day
- Owner question: What should I check today?
- Business Health answer: Answers stay grounded in cached MenuList data with source freshness

**Copy boundary:** Business Health is MenuList's AI diagnostic layer. It checks and explains; AI Menu Manager is the approved action layer. Do not call Business Health a chatbot, realtime sales monitor, revenue optimizer, prediction tool, competitor tracker, autonomous action system, or direct public-truth editor.

**Source:** `owner-business-assistant_website.md`, runtime Business Health implementation and dashboard/mobile QA records.

---

### Section: Publish

**Heading:**

> Publish from one owner-approved source.

**Body:**

> When you publish, your MenuList-controlled public surfaces can point customers to the same approved source: QR menu, official page, digital screens, fresh PDF downloads, and share links. External placements such as Google, Instagram, and WhatsApp still require owner placement or checklist confirmation.

**Key points:**

- One approved source for controlled public surfaces
- Live surfaces refresh through their supported cache, listener, or device paths
- Fresh PDF downloads should replace older downloaded or printed copies
- MenuList-controlled public surfaces can stay aligned from the approved source
- Publish history lets you see what changed and when

**Source:** `client-menu_website.md` (controlled MenuList surface publishing)

---

### Section: Where It Lives

**Heading:**

> Your approved menu, ready for the places customers look.

**Body:**

> Once published, MenuList gives you controlled links and assets to place where customers already look. External profiles and printed copies still need owner placement or fresh replacement.

**Surfaces (detailed):**

1. **QR Menu** — Customers scan and see your current published menu on any phone or browser. No app download needed.
2. **Official Business Page** — One official link with your menu, hours, location, photos, profile photo checks, social links, and customer actions. Use it on WhatsApp, Instagram, packaging, Google profile, or QR where the owner has placed it.
3. **Google Presence** — Your Google Business Profile can point customers toward the current MenuList public menu where configured.
4. **Digital Screens** — Your full menu on configured shop TVs. Categories, items, prices, and visibility can follow the published MenuList source through the screen refresh path.
5. **Print Files** — A PDF or printer handoff packet generated from the current approved menu at download time. Replace older downloaded or printed copies after changes.
6. **Shareable Link** — Direct link to your approved menu. Works in any message, email, or social post where the owner shares it.

**Source:** `client-menu_website.md`, `official-business-page_website.md`, `digital-screens_website.md`, `gbp-sync_website.md`

---

### Section: Current From The Approved Source

**Heading:**

> Keep one approved menu source current.

**Body:**

> Change a price, mark an item unavailable, or update business details from the owner-approved menu. Supported customer-facing pages refresh through their configured paths; external profiles and older print/download files still need placement or replacement.

**Key points:**

- Price changes start from one owner-approved menu
- Unavailable items can be hidden from controlled customer-facing menus
- Hours display from weekly hours, today's-hours edits, or Temporary Status when owners set it
- One current source reduces duplicate updates across controlled public pages

**Source:** `pricing-integrity-system_website.md`, `hours-holiday-accuracy_website.md`

---

### Final CTA

**Heading:**

> Your menu deserves one official home.

**CTA:** Create customer link →

**Sub-text:**

> No technical setup. Owner review before publishing.

---

## Page 2A: Features (/features)

**Canonical note:** The Features page can explain deeper product capability than the homepage, but it must stay owner-readable and evidence-backed. Feature cards should not become a generic SaaS checklist.

### Hero

**Headline:**

> Everything your menu needs. No extra work for you.

**Subline:**

> MenuList handles the public places your menu touches, so you can stay focused on the business.

**CTA:** Create customer link →

**Notes:**

- This hero should sell reduced owner work, not an abstract feature catalogue.
- Keep the phone-first and owner-approval helper lines directly below the hero subline.
- v3.6.37 wires Featured Choices as a dedicated campaign page because customer-choice guidance is a differentiated customer-facing proof point. The dropdown should stay restrained and should not become a full product map.
- v3.6.36 wires Menu Content Prep as a dedicated campaign page because descriptions, images, and translations are a high-friction owner setup job.

### Header Feature Dropdown And Campaign Pages

**Dropdown links:**

The desktop `Features` label is a menu trigger, not a direct route. The `/features` route is reached through the top `Feature overview` row inside the dropdown. This prevents accidental navigation when an owner is trying to open a feature link.

On mobile, the hamburger keeps `Features` open by default because feature discovery is the largest navigation job, but Start, Publish, and Operate collapse as nested accordions so the drawer stays scannable. `Resources` stays collapsed unless the visitor is already browsing resources. Do not duplicate AI Menu Manager as a separate top-level mobile row while it is already listed inside the Operate feature group.

1. Menu Import — `/features/menu-import`
2. Menu Content Prep — `/features/menu-content-prep`
3. Featured Choices — `/features/featured-choices`
4. Official Business Page — `/features/official-business-page`
5. QR Menu and Links — `/features/qr-menu-links`
6. Print-ready Kit — `/features/print-ready-kit`
7. AI Menu Manager — `/ai-menu-manager`
8. Owner PWA Dashboard — `/features/owner-phone-dashboard`
9. Analytics Dashboard — `/features/analytics`
10. Business Health — `/features/business-health`
11. Menu Quality Validation — `/features/menu-quality-validation`
12. Customer Feedback Loop — `/features/customer-feedback-loop`
13. Public Discovery — `/features/public-discovery`

**Selection rationale:**

- These are the feature surfaces most likely to help a non-technical SMB owner understand why MenuList is useful: start from the current menu, prepare descriptions/images/languages, guide customers toward useful choices, create one public customer source, share it through QR/links, deploy print-ready files, update by message, manage core owner work from phone or PWA, understand aggregate customer signals, know what needs attention, catch quality/readiness issues, and provide a clearer public source for search/answer systems.
- POS sync, staff roles, and advanced multi-location governance remain on `/features`, `/multi-location`, or supporting resources. They should not crowd the primary header dropdown unless the buyer strategy changes.
- v3.6.86 closes the dedicated feature-page dropdown parity gap by adding Analytics Dashboard and Menu Quality Validation to `websiteFeatureNavGroups`. Because `Header.tsx` renders both the desktop hover dropdown and mobile hamburger feature accordion from that same source, both surfaces now expose the same dedicated feature-page set.
- v3.6.110 keeps the shared Start/Publish/Operate grouping, but moves Menu Quality Validation from Start to Operate. That keeps Start focused on setup and moves ongoing correctness checks beside Activity View, Business Health, Customer Feedback Loop, and Public Discovery.
- v3.6.43 adds `/features/customer-feedback-loop` as a dedicated page and navigation link in the desktop Features dropdown and mobile hamburger feature list. Public customer feedback is valuable proof when framed as a correction loop from customer issue to owner source.
- v3.6.44 groups the desktop dropdown by the same Start, Publish, and Operate categories used by mobile. v3.6.110 changes the desktop presentation from three vertical columns into stacked workflow rows with three-card wrapping where possible. Keep this grouping source shared through `websiteFeatureNavGroups`; do not return to a flat desktop list.
- v3.6.111 keeps the dropdown content and grouping unchanged, but hardens interaction behavior. Desktop Features and Resources dropdowns close on Escape, Resources gets scroll containment and pointer-travel protection, and the mobile drawer stays a full-screen dialog above the public consent banner with its CTA outside the scrollable nav.
- Mobile feature navigation groups the same top feature links as Start, Publish, and Operate so the drawer is readable on phone screens without becoming a full product sitemap.

**Campaign page pattern:**

- Each generic campaign page uses `FeatureDetailPage` plus `FeatureDetailJourney` for a focused hero, product preview, compact signal strip, Business Health-style sticky journey, folded support blocks, four trust/proof cards, and final CTA.
- Copy must stay owner-readable. Avoid `AI-powered`, unsupported automation, ranking guarantees, POS replacement language, and generic dashboard-SaaS framing.
- v3.6.49 replaces the generic hero preview card on generic campaign pages with `FeatureDetailVisual`, a shared product-proof visual renderer. Keep these visuals meaningful and feature-specific: they should show the source flow, public output, owner review state, correction loop, print assets, phone dashboard, or discovery source that the page is selling. Do not use stock artwork, fake screenshots, decorative AI art, or visual claims that are not already supported by page copy and product behavior.
- v3.6.51 tightens those feature hero visuals for launch readiness. Treat each visual as one clean proof canvas: no repeated internal headline copy, no unnecessary nested browser/card borders, no redundant surface tags when the same meaning is already shown, and no sub-13px micro labels on mobile. Official Business Page uses the public-surface preview without the old browser border or duplicated bottom pills; Print-ready Kit uses readable row cards on mobile instead of squeezed mini columns.
- v3.6.53 removes the shared trailing proof-chip row from `FeatureDetailVisual` across all generic dedicated feature pages. Keep internal chips only when they are part of the visual story, and keep the separate signal strip as the page-level proof row. Do not re-add a generic bottom tag row under the visual because it repeats the same tags on mobile pages.
- v3.6.56 strengthens `/features/print-ready-kit` around the editor-backed print-assets flow. The hero visual should communicate template choice plus editor/export proof, and the dedicated proof section should show the supported asset types, an Assets template-list view, and a customization/editor view. Use an always-visible rail for asset types rather than a carousel because SMB owners should not need to advance slides to understand what files are available. The proof gallery now uses current product screenshots from `public/images/website/print-ready-kit/`; keep the dashboard capture cropped away from account-header details and do not replace it with decorative artwork.
- Use the sticky journey to show the end-to-end owner/customer logic for each feature page. Do not add one-off tab systems or carousels unless a future feature genuinely needs different interaction.
- v3.6.45 keeps the shared desktop sticky journey as a left tab rail plus right story panel, but the right panel is one parent story card with a top narrative row and bottom full-width proof-card row. v3.6.46 keeps desktop panel height responsive with a tighter `32rem -> 72vh -> 39rem` clamp so taller screens do not create excessive empty card space. Do not return to a nested side-by-side copy/proof layout or internal copy/proof divider because it compresses copy-heavy proof cards and makes the panel feel split.
- v3.6.60 folds Visual Profile Completion into `/features/official-business-page` as a supporting proof point. It may mention key profile photo checks, but it must not become a separate website feature, gallery manager, AI photo-placement claim, social scheduler, or ranking promise.
- v3.6.42 completed the feature-detail parity pass after the Print-ready Kit page update. Menu Import now includes permission-confirmed public link intake; Menu Content Prep now owns descriptions, item images, and languages as one setup-relief story; Featured Choices now emphasizes owner pinning and availability-safe customer guidance; Official Business Page now includes QR options, photos, actions, and structured public facts; QR Menu and Links now focuses on stable access and customer shortcuts while leaving print depth to Print-ready Kit; Owner Phone Dashboard originally named the mobile/PWA daily operations path; Public Discovery now includes sitemap, crawler, and LLM context without placement promises; Menu Quality Validation now has full key parity and no internal process language.
- v3.6.55 renames the public feature surface to Owner PWA Dashboard and strengthens the page around core owner workflows on phone: menu edits, publishing, QR/link sharing, Business Health, feedback, screens, status, hours, and key settings. Keep the claim practical: core owner dashboard work is available from phone browser or installed PWA; desktop remains useful for heavier review or precision setup.

**Validated external-suggestion decisions:**

- Menu Quality & Validation became `/features/menu-quality-validation` because menu-quality checks, pricing integrity, and public trust indicators directly support MenuList's public-truth promise.
- Content generation remains inside `/features/menu-content-prep` because descriptions, images, and translations are one setup-relief story.
- Brand & Look and placement guidance remain inside `/features/print-ready-kit` because brand color, QR, social images, and printable files are rollout assets.
- Temporary status banners remain inside `/features/owner-phone-dashboard` because they are phone-first daily operations, not a standalone public marketing page.
- Business discovery attributes remain inside `/features/official-business-page` and `/features/public-discovery` because payment methods, amenities, services, and structured public details support the official-page/discovery story.
- Web and sharing links remain inside `/features/qr-menu-links`.
- Customer feedback gets a dedicated page because the shipped flow is end to end: public menu/OBP/QR/direct-link entry points, private owner inbox, status handling, mobile access, and Business Health attention signals. It must be framed as customer-reported issue correction, not reviews, testimonials, sentiment analysis, or reputation automation.
- Connected-system snapshot export remains an advanced Features-page/operations proof only until buyer demand and integration proof justify a dedicated public campaign page. Public website copy must say supported connected systems only and must not imply automatic Google, Instagram, Zomato, Swiggy, delivery-app, POS, or unsupported-platform updates.

**Clickable card rule:**

- Cards on `/features` use a leading icon plus heading row.
- Cards that route to a dedicated page must show the localized top-right `View` action pill and stronger link styling.
- Static cards without a dedicated page stay informational and should not receive the action pill.
- This keeps mixed feature groups clear when some capabilities are deep-linked campaign pages and others remain overview proof points.

### Menu Content Prep Page

**Placement decision:**

Expose content preparation as a dedicated feature page at `/features/menu-content-prep`, placed immediately after Menu Import in the header dropdown. This is the natural sequence: bring in the current menu, prepare the customer-facing content around it, then publish and share the approved source.

**Owner-readable copy contract:**

- `Menu content prep` means customer-friendly descriptions, menu images, and customer languages prepared from the approved menu data.
- The page may say this removes writing, design, and translation work for owners.
- The page must keep review-first language: content is prepared for owner review before publishing.
- The page may mention plan and credit boundaries because generated images, descriptions, translations, and edits have usage implications.
- The discovery angle is allowed only as clearer visible public menu text and language coverage for customers, search engines, and answer systems to read. Do not promise ranking, Google placement, ChatGPT citation, or special AI-search treatment.

**Feature-card wiring:**

- `/features` cards for `Generated images`, `Descriptions written for you`, and `One-click translations` link to `/features/menu-content-prep`.
- Do not create three separate top-nav pages unless there is later evidence that each one needs its own acquisition surface.

### Featured Choices Page

**Placement decision:**

Expose Featured Choices as a dedicated feature page at `/features/featured-choices`, placed after Menu Content Prep in the header dropdown. This makes the product story move from getting the current menu into MenuList, to preparing customer-ready content, to helping customers choose from the approved public menu.

**Owner-readable copy contract:**

- Public label is `Featured Choices`, not `Decision Intelligence`, `Decision Blocks`, `Smart Recommendations`, or `AI recommendations`.
- The page may explain Featured, Quick, and Value choices as customer menu guidance from the current approved menu.
- The page may explain owner control: owners can choose/pin what appears in the choices when needed.
- The page may mention settled public-menu signals only as a source for helpful customer guidance where enough activity exists.
- Do not claim exact decision-time reduction, guaranteed sales lift, ranking, customer ordering behavior, model training, or algorithmic authority.
- Do not imply that Featured Choices changes the normal menu order. The normal customer menu remains browsable.

**Feature-card wiring:**

- `/features` card `Featured section` links to `/features/featured-choices`.
- Menu Quality now has a dedicated page because it directly supports the public-truth promise, but it should not be added to the desktop dropdown until the top-nav strategy changes.

### Analytics Page

**Placement decision:**

Expose Analytics as a dedicated feature page at `/features/analytics`, linked from the `/features` `Menu analytics` card. Keep it out of the desktop header dropdown for now because the dropdown should stay focused on first-pass buyer navigation.

**Owner-readable copy contract:**

- Public label is `Analytics`.
- The page may describe today, overview, daily, weekly, monthly, and overall dashboard views.
- The page may mention menu sessions, engaged sessions, item taps, item status labels, searches, no-result searches, unavailable demand, actions while open/closed/unknown, action rate, Official Business Page actions, and customer app activity.
- The page may mention desktop and mobile owner dashboard availability.
- The page must frame analytics as aggregate owner summaries, not customer profiling or BI.
- Do not promise revenue lift, exact attribution, POS revenue, heatmaps, hover tracking, exact GPS tracking, or private customer identity collection.

**Feature-card wiring:**

- `/features` card `Menu analytics` links to `/features/analytics`.
- Business Health remains the diagnostic page; Analytics remains the owner dashboard period-summary page.

### Menu Quality Validation Page

**Placement decision:**

Expose menu validation as a dedicated feature page at `/features/menu-quality-validation`, but do not add it to the desktop header dropdown. The route is important enough for `/features` and SEO/discovery because pricing integrity, menu validation, missing details, and customer trust indicators are all part of keeping the public menu accurate.

**Owner-readable copy contract:**

- Public label is `Menu Quality Validation`, not `Smart validation`, `AI menu audit`, or internal Menu Correctness Engine naming.
- The page may say MenuList checks for missing prices, empty categories, weak item detail, image gaps, and public-readiness issues before publishing.
- It may explain pricing integrity as one owner-approved price reaching MenuList surfaces from the same source.
- It may explain customer trust indicators such as freshness, sections, search, open status, and clear actions.
- It must say validation guides owners and keeps owner approval final. Do not imply MenuList silently mutates public truth or auto-fixes prices/items without review.
- It must avoid exact score/ranking claims unless runtime exposes verified public metrics.

**Feature-card wiring:**

- `/features` cards for `Menu quality signals`, `Pricing integrity`, `Menu validation`, and `Customer trust indicators` link to `/features/menu-quality-validation`.
- Do not create separate pages for pricing integrity or customer trust indicators unless later buyer demand proves each can stand alone without becoming thin content.

### Print Files And Launch Kit Cards

**Placement decision:**

Keep print capability out of the homepage as a full section, but expose it as a dedicated feature page at `/features/print-ready-kit` because printable files are a high-friction, high-value owner job. The homepage may still mention `Print files` only as one compact output of the approved menu source.

**Owner-readable copy contract:**

- `Print files` means paper menu PDF, table card, counter card, or printer handoff packet from the current approved menu.
- `Instant launch kit` can list table tent, single table card, counter card, entrance poster, delivery bag sticker, takeaway card, WhatsApp link, and Instagram story.
- `Menu Kit: print-ready cards` can explain branded table/counter/entrance/takeaway files with QR code and business color, ready for a local printer.
- `/features/print-ready-kit` can now mention Assets as an editor-backed workflow: pick asset type, choose a supported template family, preview generated output, optionally customize supported desktop assets in the editor, then download image/PDF/printer files or the Menu Kit bundle. QR/display assets can reference materially different template families; assets with fewer real unique layouts should not be described as having unsupported choices.
- Dedicated page visuals should highlight both steps owners care about: the template list/dashboard view and the editor screen. The editor claim must stay practical: owners can adjust supported copy, placement, and brand details; protected QR/required link areas stay reliable.

**Notes:**

- Keep this copy practical. Avoid internal names like `Print Assets`, `Menu Card Export`, `single-asset generation`, or `renderer`.
- Do not imply printed paper updates automatically. The printed QR points customers to the current menu; the paper file itself is a generated output.

### Operations Group

**Business Health card:**

Title:

> Business Health

Description:

> Review this week's menu activity alongside last week, see the location-level check, and keep stable states at No action needed.

**Notes:**

- This is the first Operations card because Business Health is the website's compact owner-dashboard proof.
- Keep the card compact and grounded in the shipped owner dashboard, mobile screen, scheduler read models, cache-first context packets, and safety guards.
- Do not call it an AI assistant, chatbot, realtime monitor, revenue optimizer, prediction engine, competitor tracker, or autonomous public-menu editor.

**Customer feedback loop card:**

Title:

> Customer feedback loop

Description:

> Customers can report wrong prices, missing items, outdated details, or service concerns from the public view. You review it privately and correct the approved source.

**Notes:**

- This card belongs in Operations because it answers what happens after customers find an issue in public.
- The dedicated page is `/features/customer-feedback-loop`.
- Use `Feedback`, not `Reviews`, for public website labels. Do not imply review gating, public reputation management, sentiment scoring, public testimonial collection, or automated public replies.
- Keep Business Health as the quiet status surface; this page explains the underlying customer-to-owner correction path.

**Owner PWA operations card:**

Title:

> Owner PWA dashboard

Description:

> Use MenuList from a phone browser or installed PWA to edit menus, publish changes, share QR/link assets, review feedback, check Business Health, manage screens, adjust key settings, and handle daily operations without waiting for a desktop.

**Notes:**

- This is a dedicated Features page proof point because it reduces the non-technical SMB owner's fear that MenuList requires desktop administration.
- Keep the homepage version short as reassurance copy near CTAs.
- Avoid claiming exact parity for every rare precision/setup edge case; the claim is practical phone-first owner operation through the owner PWA and phone browser.

**Staff accounts and roles card:**

Title:

> Staff accounts and roles

Description:

> Add staff with email or Staff ID and passcode, choose what each role can access, reset passcodes, and sign out old sessions when staff changes.

**Notes:**

- This is a day-one business-operations proof point for teams where not everyone should have owner access.
- Keep the claim to implemented access controls. Do not imply payroll, attendance, shift planning, or HR management.

**Regional workspace settings card:**

Title:

> Regional workspace settings

Description:

> Owner workspace language preference, timezone, date format, and time format stay together. Customer-facing menu languages remain tied to the approved source.

**Notes:**

- This belongs on the Features page Operations group, not the homepage hero, because it is operational infrastructure behind the owner workspace.
- Do not claim the public website is available in every owner-app locale. Public website/resource languages remain limited to reviewed website languages until complete reviewed resource packs pass the website locale verifier.
- Keep the public claim to language preference, timezone, date format, time format, and customer-facing menu language policy.

### Customer Signals Block

**Eyebrow:**

> Customer signals

**Heading:**

> Your menu, understood after it goes live

**Subline:**

> MenuList records decision-ready customer signals from the public menu and official business page, then shows them as clear owner metrics.

**Notes:**

- This block should align visually with the other Features page groups, including the same small section label treatment.
- Cards use left-side Lucide icons with title and supporting copy on the same row.
- Keep the analytics claim privacy-conscious and decision-ready. Do not imply customer profiling, exact GPS tracking, heatmaps, or guaranteed attribution.

---

## Page 2B: Business Health Feature Page (/features/business-health)

**Canonical note:** This is the public marketing campaign page for Business Health. The protected owner app remains `/business-health`.

### Hero

**Headline:**

> AI health checks for your menu.

**Subline:**

> Business Health checks the latest MenuList facts: menu state, public surfaces, customer attention, locations, and freshness. It shows what needs attention and keeps real changes inside approved AI Menu Manager or owner-screen flows.

**Primary CTA:** Create customer link →

**Secondary CTA:** See all features

### Preview Panel

The preview must show:

- AI health check
- Last checked date shown
- Business looks stable
- No action needed
- Weekly selected-menu activity beside last week, plus the location-level current check
- One owner question and one source-fresh answer

### Sticky Story Section

**Eyebrow:**

> From AI check to approved fix

**Heading:**

> Business Health finds issues. AI Menu Manager prepares fixes.

**Layout rule:** Use the same stacked sticky section structure as Answerlattice's "From inputs to support surfaces" section, translated into MenuList website tokens. The left side is a sticky tab rail. The right side is a stacked set of sticky story cards.

Left-side tabs:

1. What it checks
2. Owner outcome
3. Why owners can trust it

Right-side sticky cards:

1. **What it checks** — Latest MenuList check, public surface status, Weekly Menu Review, and location view. Weekly Menu Review shows this week's selected-menu activity beside last week; the current check remains location-level.
2. **Owner outcome** — Stable means quiet, freshness stays visible, and fixes hand off safely.
3. **Why owners can trust it** — No hidden menu changes, cached checks control cost, and the same view works on desktop and phone.

**Mobile rule:** The left rail becomes a sticky horizontal tab row. Story cards collapse to one column without losing the tab labels or source-fresh copy.

**Copy boundary:** This page can be used for paid campaigns and founder-led sales, but it must stay a Business Health diagnostic page, not a second action-agent page. AI health-check language is allowed; generic assistant, chatbot, revenue, prediction, competitor, realtime sales, automatic external update, or Business Health-owned mutation claims are not.

---

## Page 3: Multi-Location (/multi-location)

**Primary source:** `multi-outlet-consistency_website.md`

### Hero

**Headline:**

> One menu. Every location. Built to stay consistent.

**Subline:**

> Manage pricing, availability, and presentation across all your outlets from one place. Approved updates can reach every location without manual coordination between branches.

**CTA:** Set up your first location →

---

### Section: The Chain Problem

**Heading:**

> Managing five menus is five times the work.

**Body:**

> Prices drift between locations. Items disappear from one outlet but not others. Names change without HQ knowing. Instead of running your business, you're chasing consistency across five different menus.

---

### Section: Master → Outlet Model

**Heading:**

> One master menu. Every outlet follows it.

**Body:**

> Build your core menu once at HQ. When you update the master and publish the approved version, linked outlets can reflect the change from the same source.

**Visual:** approved master menu -> linked outlets using the same approved update source.

**Source map notes:**

- Top card: approved master menu.
- Outlet cards: five linked outlets receiving approved updates.
- Mobile shows three outlet cards in the approved master -> outlet flow so the diagram stays readable on phone screens.
- Static dotted paths remain visible. A reduced-motion-aware homepage-style pulse stroke travels through all outlet connector paths together and briefly highlights only destination card borders on arrival, matching the product story that approved master updates can reach linked outlets together. Do not use custom moving circle dots here; the pulse should match the homepage source-map animation language.
- Mobile paths stay subtle and edge-anchored.
- The master card uses the same card surface, border, and radius language as outlet cards; the MenuList mark sits directly without an extra filled icon tile.
- Supporting-page source maps must follow the same theme behavior as the homepage workflow map: light surfaces in light mode and dark contrast surfaces in dark mode.
- Use outlet-governance language, not developer sync or instant-propagation language.
- Keep the diagram calm; it should explain control and consistency, not look like infrastructure animation.

---

### Section: Per-Location Control

**Heading:**

> Local flexibility, without breaking consistency.

**Body:**

> Each outlet can adjust prices for their market or mark items as temporarily unavailable — without affecting the master menu or other locations. Core menu items, names, and descriptions stay locked. No outlet manager can rename your signature dish without HQ approval.

**Key points:**

- Local price adjustments for different markets
- Outlet-specific availability (mark items temporarily unavailable)
- Core items locked by HQ — names and descriptions protected
- Every change stays within brand boundaries

---

### Section: Central Dashboard

**Heading:**

> One dashboard. Every location.

**Body:**

> The Locations page keeps outlet status and activity in one place. Switch to an outlet, then follow its next required menu, publish, or customer-link step.

**Key points:**

- Add a new outlet and let it inherit the master menu structure
- Billing adjusts automatically — per-outlet pricing, no plan changes needed
- Switch between any location from one screen
- Open an outlet to see its next required step, from menu and price review to publishing and sharing its customer link

**Boundary:** This is MenuList menu and customer-link readiness, not general franchise opening management. Do not imply vendor coordination, compliance audits, HQ approvals, or automatic third-party placement.

---

### Section: Pricing for Chains

**Heading:**

> Simple per-outlet pricing.

**Body:**

> Each outlet is billed individually. Add or remove outlets anytime. No enterprise pricing negotiations. No custom contracts. Same transparent pricing as any other MenuList account.

**CTA:** See pricing →  
**Link:** `/pricing`

---

### Final CTA

**Heading:**

> Ready to bring consistency to every location?

**CTA:** Set up your first location →

---

## Page 4: Pricing (/pricing)

### Page Heading

**Headline:**

> Keep one official customer link live.

**Subline:**

> Menu, services, prices, business page, QR, print files, customer actions, owner updates, feedback, and health checks stay connected to one approved source.

**Proof row:**

- Official link customers can trust
- No scattered menu files
- Owner-approved updates

**Setup heading:**

> Start with 7-day setup, then keep the same customer link live.

**Decision heading:**

> Choose by reach, not by feature count.

---

### Plan Display Rules

- Show **B2C plans only** (2-3 plans) — no B2B/developer tab
- **INR primary** (auto-detected for India timezone), USD secondary
- **Monthly/yearly toggle** with savings badge
- Keep existing plan data from `PlatformPlansList`
- Show plan cards before the website-doubt explainer and deeper decision education on mobile and desktop.
- Each plan card: Plan name, price, billing period, best-fit line, public surfaces included, owner controls included, not-included boundary, and CTA button
- Recommended plan highlighted
- Plan-card user-facing copy must come from the `Website.Pricing` locale namespace, not hardcoded JSX strings.
- Plan guidance must leave the choice with the owner: Official is enough for one official customer link; Pro is for presentation, AI Menu Manager, languages, enhancement credits, and owner controls; Multi-location is for location governance.
- For an unauthenticated owner, a plan CTA must send only the validated plan ID, interval, currency, type, and quantity through the canonical owner-app sign-in callback. Collect business and billing details only after authentication on the owner-app host; do not rely on website-origin session storage crossing to `app.menulist.*`. An already-onboarded owner must see the authoritative current or pending subscription instead of starting a second workspace.

### CTA on Plan Cards

- Official: `Start with one customer link`
- Pro: `Start with Pro setup`
- Multi-location: `Set up locations`

### Below Plans: Credit / Enhancement Packs

**Heading:**

> Need more from your menu?

**Body:**

> Every plan includes menu preparation capacity. For businesses with larger menus or frequent updates, Enhancement Packs add capacity. Purchased pack credits remain available while the eligible subscription remains available.

**Source:** `ai-enhancement-packs_website.md`

---

### FAQ Section

**Q: How does billing work?**

> Choose monthly or yearly. Yearly saves 17%. You can switch anytime.

**Q: Can I change my plan later?**

> Yes. Upgrade or downgrade anytime from your dashboard.

**Q: Can I publish without a paid plan?**

> No. MenuList has paid plans for businesses that want to publish and share an official customer-facing menu.

**Q: What payment methods do you accept?**

> All major cards, UPI, and net banking via Razorpay. Payments are secure and processed in India.

**Q: What happens if I cancel?**

> Your menu stays accessible to customers until the end of your billing period. After that, you can still access your data.

**Q: Do I need to pay per location?**

> Each outlet has its own billing. Add or remove outlets anytime.

**Q: What are Content Credit Packs?**

> Every plan includes menu preparation features — images, descriptions, and translations. Content Credit Packs give you additional capacity for larger menus. One-time purchase, never expires.

---

## Page 5: About (/about)

### Hero

**Eyebrow:**

> Built for public menu truth

**Headline:**

> About MenuList

**Subline:**

> MenuList exists so a business can approve one current source, then use it wherever customers look.

**Proof strip:**

- Official source, not QR-only utility
- Simple for owners, serious underneath
- Built in India for growing businesses

### Mission

**Heading:**

> Why MenuList exists

**Body:**

> MenuList is a system that manages official menus and public business information from a single source of truth. It keeps menu content accurate and aligned across customer-facing surfaces including QR, web, screens, and print.

> We built MenuList because every business deserves one trusted place where the current menu starts. Not a tool to manage. Not a platform to learn. A system that keeps the owner-approved menu at the center.

---

### Who We Are

> MenuList is built in India for businesses that care about how they present themselves to customers.

**Contact:**

- Email: hello@menulist.ai
- Support: Available via email

---

### CTA

> Make your public source official.

**CTA:** Create customer link →

---

## Page 4B: WhatsApp Onboarding (/whatsapp)

**Purpose:** Informational campaign page for the source-implemented messaging-onboarding flow. It keeps the WhatsApp-first acquisition concept visible while making current provider availability explicit.

**Metadata title:**

> WhatsApp Menu and Service List Onboarding | MenuList

**Metadata description:**

> See how WhatsApp-first onboarding will prepare an owner-reviewed preview and official customer link. Start now with a photo or public menu link.

**Heading:**

> WhatsApp onboarding is being prepared. Start with one official customer link.

**Subline:**

> For now, upload a photo or use a public menu link. MenuList prepares an owner-reviewed public page, link, and QR from the list you already share with customers.

**Availability:**

> WhatsApp intake is not open yet. Start now with a photo or public menu link.

**Primary CTA:**

> Start with a photo or link

**CTA destination:** `/create-menu` while checked-in Functions targets keep provider processing disabled. Do not add a public provider deep link until the final owned account and current activation evidence are approved.

**Proof visual:**

Chat-style sequence:

1. Owner sends the latest rate card or list attachment.
2. MenuList acknowledges preview preparation.
3. Preview card shows the public customer link.
4. Owner approves.
5. MenuList sends the official link for WhatsApp, Instagram, Google profile links, QR, and staff replies.

**Sections:**

1. How it works: send current list, MenuList prepares, owner reviews, official link goes live.
2. Broad SMB use: restaurants/cafes/bakeries, salons/spas/barbers, services/studios, catalog/retail counters.
3. Why it matters: less old-file confusion, owner-approved truth, reusable link.
4. Trust boundaries: no WhatsApp replacement claim, no Meta partnership claim, no automatic catalog-sync claim, no scraped-number bulk blasting.

**Notes:**

- This page describes a source-implemented flow documented under `__docs__/messaging-onboarding/`; it does not certify current provider availability.
- Keep the public action on `/create-menu` until the final owned account, response owner, operating hours, consent note, tracking decision, target enablement/deploy evidence, provider smoke, browser/device QA, and production-host smoke are approved.
- Do not claim official WhatsApp/Meta partnership, automatic WhatsApp catalog sync, bulk message outreach, or publish-without-approval behavior.

---

## Page 4C: Public Truth Check (/tools/public-truth-check)

**Purpose:** Public self-report tool for prospects, owners, and agencies to check whether one current business source has the facts customers need before they publish or share it.

**Metadata title:**

> Public Truth Check - MenuList | Check Your Customer Source

**Metadata description:**

> Check whether a business has clear public facts for its menu or service list, hours, location, contact, action links, and current customer source.

**Heading:**

> Check if customers can trust your public business source.

**Subline:**

> Use the facts visible today. MenuList returns a short gap report for the business name, menu or service source, prices, hours, location, contact, action links, photos, and one current customer link.

**Primary action:**

> Run check

**Next action destination:** `/create-menu`

**Implemented behavior:**

1. Owner enters business identity, source type, optional public link, and visible menu/service text.
2. Owner marks visible facts such as prices, hours, location, contact, actions, and photos.
3. Browser-local report builder returns `ready`, `missing_basics`, or `unclear` with row-level status.
4. The report states that external sources and AI/search were not checked and that no ranking promise is made.
5. The CTA routes to Create Menu so the approved source can become one customer link.

**Boundaries:**

- No external URL fetch.
- No Firebase reads or writes.
- No lead/contact storage.
- No provider or AI/search calls.
- No ranking, citation, traffic, external-platform update, or answer-placement promise.

---

## Page 5A: Create Menu (/create-menu)

**Purpose:** Primary public conversion path for starting from the business's current menu, price-list, catalogue, or service-list source and creating the official customer link. The page must not read like a generic digital-menu maker or food-only QR menu tool.

**Metadata title:**

> Create Your Official Customer Link — MenuList

**Metadata description:**

> Sign in, add a menu, catalogue, price-list, or service-list photo or owned public list link, and review the prepared official customer link before anything goes public.

**Heading:**

> Create your official customer link

**Subline:**

> Sign in, add a menu, catalogue, price-list, or service-list photo or owned public list link, and review the prepared customer-facing version before anything goes public.

**Input options:**

- Upload photo
- Use existing link

**Proof strip:**

- Account connected before upload
- Owner review before publishing
- Works for menus, price lists, and service lists

**How it works block:**

1. Add the source customers already see.
2. Review the customer-facing version.
3. Publish the official link.

**Layout and repetition policy:**

- Desktop uses a context/action split: heading, subline, the single three-step process, supported-source note, and proof stay in the left context column; the sign-in or authenticated photo/link task stays in the right action column.
- Mobile uses one document-flow column in this order: heading and subline, active sign-in/source task, then process and proof.
- Do not repeat the three-step process, supported inputs, or proof list inside the sign-in card. The card should stay focused on account connection.
- Do not make the action panel sticky; OTP, validation, and source-entry states must remain reachable on short screens.

**Preview claim CTA:**

> Create official link

**Public powered-by CTA:**

> Create your official customer link

**Success page handoffs (`/create-menu/success`):**

- New-account starter title: `CreateMenuSuccess.keepLiveTitle`
- New-account starter explanation: `CreateMenuSuccess.keepLiveBody`
- New-account Billing action: `CreateMenuSuccess.keepLiveCta`
- Copy link failure: `CreateMenuSuccess.copyFailed`
- WhatsApp open failure: `CreateMenuSuccess.whatsAppFailed`
- Show the Billing action only after the versioned last-claim handoff matches the current tenant/store session. Billing and workspace actions share one bounded session refresh before navigating to fixed internal routes.
- Keep the seven-day setup period and the dedicated QR Code and Assets navigation unchanged.
- Copy Link success must wait for Clipboard API success or acknowledged textarea fallback success. Rejected Clipboard API writes fall through to the textarea fallback before failure.
- Both messages must stay localized fixed copy. Do not show browser exception text, API response text, raw public URLs, or generated WhatsApp message bodies.
- The full `/create-menu` upload, preview, and success journey must remain
  complete in every active website-switcher language. Each localized heading
  highlight must occur inside its full heading; placeholders must match the
  English source exactly; RTL content aligns to the logical start; and QR or
  placement guidance must not render without a validated menu link.

**Notes:**

- The success-page action adds a protected handoff to the existing Billing route. Upload, extraction, claim, publish, checkout, entitlement, pricing, QR, Assets, and dashboard data contracts stay unchanged.
- The page remains sign-in-first before upload/link processing.
- Link import copy must say owned or permissioned link. Do not imply generic scraping, marketplace import, automatic cloning, or publishing without owner review.
- The conversion outcome is the official customer link, not merely a generated menu.

---

## Page 6: Get Started (/get-started)

**Eyebrow:**

> Start with control

**Heading:**

> Start with the list customers already see

**Subline:**

> Sign in once, add the current menu, price list, catalogue, or service list, and review the prepared preview before publishing.

**Proof strip:**

- Sign in before upload
- Owner review before publishing
- Dashboard setup comes next

**Primary action:** Create customer link → (`/create-menu`)
**Secondary action:** Login (`/signin?callbackUrl=/dashboard`)

**Below card:**

> Already using MenuList? Open sign-in options.

**Notes:**

- Extremely clean, centered page
- No form fields (Google OAuth handles everything)
- Primary upload path → `/create-menu`; returning-owner sign-in goes to `/dashboard`, while pricing remains available from nav and publish/setup decisions.
- Supporting cards explain current public-list start, owner approval, and pricing as the next decision without changing auth/payment behavior.

---

## Page 7: Contact (/contact)

**Heading:**

> Ask us about your menu source.

**Body:**

> Use this for setup questions, pricing clarity, multi-location planning, or anything that affects what customers see.

**Contact methods:**

- Email: hello@menulist.ai
- Website enquiry form submits to `POST /api/public/contact` with same-origin credentials, no-store cache policy, and manual redirect handling. The route rate-limits, caps body size, checks honeypot/Turnstile signals, and writes `landingPageEnquiries` through Firebase Admin.

**Notes:**

- Contact page keeps the existing form fields and sends them through the bounded public API route.
- The proof strip names the supported question types without promising a monitored response time.
- A successful form submission means the enquiry was recorded in `landingPageEnquiries`; direct team conversation is routed to `hello@menulist.ai`.
- A monitored general-enquiry consumer/alert is still an owner-operated production requirement and must not be implied by website success copy until evidence exists.

---

## Page 8: Trust & Security (/trust-security)

**Heading:**

> Your business data is safe here.

**Body:**

> MenuList is built so your menu, business information, owner account, and public customer-facing source stay protected.

**Proof strip:**

- No stored plain-text passwords
- Business data stays isolated
- Privacy-conscious analytics

**Staff access security facts:**

- Plain-text passwords or passcodes stored by MenuList: No.
- Owner-managed staff access: roles, reset, and sign-out.
- Staff access belongs in the access-control/security layer, not in public claims as GDPR certification or HR/workforce management.

**Copy policy:**

- Owner-first language is preferred over raw implementation jargon.
- Technical facts are allowed when they are factual and useful, but avoid public overclaims such as "impossible by design".
- Security copy must not claim more than the implemented auth, tenant isolation, staff role/access controls, analytics, HTTPS, and integration behavior supports.

---

## Page 9: Legal Pages

### Privacy Policy, Terms of Service, Refund Policy

- **Privacy Policy staff-access content:** Disclose staff account details, role/store assignment, account status, reset/session metadata, authorized team access, and that MenuList does not store plain-text staff passcodes.
- **Privacy Policy analytics content:** Disclose that main website Plausible, Google Analytics, and Microsoft Clarity load only after analytics consent when configured. Keep customer menu analytics separate: they do not ask visitors for names, emails, or payment details, but they are not controlled by the main website banner.
- **Privacy Policy retention content:** Use purpose-based retention language unless an exact lifecycle is enforced in code or provider configuration. Do not publish fixed 90-day, 35-day, DPA, SCC, or sub-processor commitments until the matching operational artifacts exist.
- **Privacy/security claim discipline:** Avoid exact encryption algorithms, fixed backup windows, broad model-training guarantees, DPA/SCC/sub-processor readiness, universal export/delete controls, and "all third parties" confidentiality language unless the matching code, provider configuration, or legal artifact is present.
- **Terms staff-access content:** Make owners responsible for staff access they create, safe sharing of Staff ID/passcode details, correct role assignment, and ending access when staff leave.
- **Terms content/output rights:** Owners retain rights they already hold in uploaded content and grant a limited processing licence. Generated-output use stays subject to input rights, applicable law, and provider terms; do not promise automatic copyright ownership, unrestricted commercial rights, or universal no-attribution status.
- **Terms payment handling:** State that Razorpay handles checkout/payment-method entry and MenuList stores the billing references/status needed for subscriptions. Do not publish a provider certification claim unless the current provider artifact has been independently approved for that exact public wording.
- **Trust/security staff-access content:** Use factual role-scoped access language. Do not claim legal certification, GDPR certification, HR/payroll/attendance coverage, or full workforce management.
- **Refund Policy:** State the general no-refund boundary with applicable-law and confirmed duplicate/incorrect-charge exceptions. Current paid plan access continues through `cycleEndDate`; data follows Privacy Policy purpose-based retention. Do not promise all-plan features or fixed 30-day deletion.
- **Styling:** Apply new design system (clean typography, proper spacing)
- **Layout:** Single column, `max-w-3xl`, generous line height

---

## Header Copy

**Logo text:** MenuList (not MenuListAI)

**Nav items:**

- How It Works → `/how-it-works`
- Multi-Location → `/multi-location`
- Pricing → `/pricing`
- Login (subtle sign-in button; no pricing detour)
- Create customer link → `/create-menu` (primary button)

---

## Footer Copy

**Footer strategy:**

The footer is now a revenue and trust layer, not only a legal/navigation block. It should give high-intent visitors a final conversion path and help skeptical visitors understand that MenuList is a public-source system, not a QR-menu utility.

**Closing CTA:**

Eyebrow:

> Ready when the source is

Headline:

> Put one trusted customer link online.

Body:

> Start from the menu, price list, catalogue, or service list you already have. MenuList prepares the customer-facing version and keeps the links and materials around it.

Primary CTA:

> Create customer link →

Secondary CTA:

> See plans

**Proof cards:**

- Owner approval before publishing
- One source for public surfaces
- Single-location simple. Chain-capable.

**Logo + tagline:**

> MenuList - One official source for your menu, services, and business details.

**Source line:**

> MenuList keeps its customer links, QR files, and print materials tied to your approved list.

The eyebrow, subline, source line, Features hero, source-to-output workflow heading, and How It Works flow title must keep the same approved-list and supported-output boundary in all eight advertised website locales. Do not restore absolute `every link`, `every public place`, no-extra-work, or timed-launch wording at the brand-framing layer.

**AI summary shortcut:**

> Get an AI summary of MenuList:

This footer-level shortcut links to Claude, ChatGPT, and Gemini with a MenuList-specific prompt that points to `https://menulist.ai` and `https://menulist.ai/llms.txt`. The prompt must preserve MenuList's owner-approved public-source positioning and reject ranking promises, AI citation guarantees, automatic external-platform updates, or unsupported POS/account-posting claims.

**Footer preferences:**

- Social links live under the company email in the left brand column.
- The bottom row keeps the copyright on the left, the public-source line centered, and compact Analytics / Language / Theme controls on the right.
- Analytics control reopens the website analytics consent panel. It must not imply owner dashboard settings, custom-domain compliance-page settings, or customer menu analytics control.
- Theme control uses a segmented icon control with three choices: Light, System, Dark. Language remains the dropdown.

**Column 1: Product**

- How It Works
- Features
- Multi-Location
- Pricing

**Column 2: Source**

- Public proof
- Official Business Page
- Trust & Security
- Get Started

**Column 3: Resources**

- Developers
- About
- Contact
- Trust & Security

**Column 4: Legal**

- Privacy Policy
- Terms of Service
- Refund Policy

**Bottom line:**

> © 2026 MenuList. Built in India.

**Trust badge (right side):**

> One public source. Built to be found.

**NOT included:**

- No newsletter signup
- No "Powered by EcomsAi"
- No phone number
- No chat widget
- No fake customer logos, fake metrics, or unsupported testimonials

---

## Meta Content (All Pages)

## Feature Screenshot Proof Copy

v3.6.57 adds localized screenshot-proof captions under `Website.FeatureDetailScreenshots` for the feature pages where current captures are clean enough to publish:

- Menu Import: imported source proof only.
- QR Menu and Links: owner share kit plus public customer menu proof.
- Customer Feedback Loop: public report form plus private owner inbox proof.
- Public Discovery: placement/source checklist proof.

Do not add screenshot captions for rough captures just to fill every feature page. Official Business Page, Featured Choices, Owner PWA Dashboard, Business Health, Menu Content Prep, and Menu Quality Validation should receive public screenshot copy only after the demo tenant/state is clean enough to publish.

## Owner Reassurance Placement Rules

Owner reassurance should reduce friction without turning into repeated wallpaper copy.

- Keep phone/PWA operation as a compact proof idea only where it answers an immediate owner doubt.
- Keep review-before-publish near upload/review workflows, setup copy, and FAQ answers.
- Do not repeat the full public-surface list on pricing, final CTA, or supporting-page heroes.

The removed global helper components were useful during early conversion hardening, but they made Product, Features, Pricing, Get Started, Multi-location, About, Contact, Trust/Security, and the homepage final CTA feel repetitive.

| Page           | Title Tag                                              | Meta Description                                                                                                                           |
| -------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Homepage       | MenuList - One Official Customer Link for Menus and Services | Turn your current menu or service list into one official customer link for business page, QR, print files, customer actions, owner updates, feedback, and health checks. |
| Product        | How MenuList Works — From Current List to Customer Link | Start from a clear photo or an owned public menu, catalogue, price-list, service-list, image, or PDF link. MenuList prepares the owner-reviewed version, then keeps supported updates approval-based. |
| Multi-Location | Multi-Location Source Management — MenuList \| One Source, Every Location | Manage menus and service lists across locations from one approved source. A master source can keep every outlet aligned without manual coordination. |
| Pricing        | MenuList Pricing — Simple, Transparent Plans           | Start managing your official menu. Simple plans with transparent pricing in INR. No hidden fees.                                           |
| About          | About MenuList — Built in India for Growing Businesses | MenuList is a public menu infrastructure system built in India for cafes, service businesses, and growing teams that publish customer-facing offers. |
| Get Started    | Get Started — Create Your Customer Link                | Sign in once, add your current menu, catalogue, price list, or service list, and review the prepared preview before publishing your MenuList link. |
| Resources      | Resources - MenuList \| Keep One Public List Current   | Menu and service-list correctness, QR placement, Google links, PDFs, SEO, AI search discovery, worksheets, and checklists for business owners. |
| Contact        | Contact MenuList                                       | Have a question about MenuList? Reach out to our team.                                                                                     |
| Privacy        | Privacy Policy — MenuList                              | MenuList privacy policy. How we handle data, consent-gated website analytics, and retention.                                               |
| Terms          | Terms of Service — MenuList                            | MenuList terms of service for all users and businesses.                                                                                    |
| Refund         | Refund Policy — MenuList                               | MenuList refund and cancellation policy for subscriptions.                                                                                 |

---

## Language Governance Compliance Checklist

Stage 7.4 reviewed the homepage copy after the reference-informed layout pass. It corrected internal phrasing, grammar, capitalization, public-surface casing, and spelling drift while preserving the official-source positioning and avoiding unsupported claims.

Source gate: `npm run verify:website-public-copy-boundary` locks the mounted homepage copy, Website locale namespace blocked-claim scan, LLM context files, and the documented unmounted `SmartFeaturesSection` exception.

| Rule                                            | Status                                              |
| ----------------------------------------------- | --------------------------------------------------- |
| No "AI-powered" in public copy                  | ✅ Not used                                         |
| No "Smart" / "Intelligent" / "Dynamic"          | ✅ Not used                                         |
| No "You should..." / "We recommend..."          | ✅ Not used                                         |
| No "Helps you..." / "Assists with..."           | ✅ Not used — uses "Manages", "Handles", "Prepares" |
| No "Revolutionary" / "Game-changing"            | ✅ Not used                                         |
| No "Optimize" / "Advanced"                      | ✅ Not used                                         |
| No excitement language / exclamation marks      | ✅ Not used                                         |
| No statistics without stories                   | ✅ Concrete scenarios used instead                  |
| No feature-first copy                           | ✅ Outcome-first throughout                         |
| No explaining "how" the system works internally | ✅ Only shows what owner/customer sees              |
| Calm, flat, professional tone                   | ✅ Verified                                         |
| One idea per sentence                           | ✅ Verified                                         |
| Every line passes One-Line Test                 | ✅ Verified                                         |

---

## Communication Doctrine Compliance

| Law                               | Applied Where                                                               |
| --------------------------------- | --------------------------------------------------------------------------- |
| Law 1 — Reception over Expression | Every headline engineered for specific mental state (trust/clarity/action)  |
| Law 2 — Enter Their World First   | Section 2 (Problem) starts with what they already feel                      |
| Law 3 — Worldbuilding             | Sections build from problem → standard → proof → identity                   |
| Law 4 — Identity Mirroring        | "Serious businesses" / "growing businesses" / "businesses that care"        |
| Law 5 — Cognitive Hospitality     | Short sentences, familiar words, zero jargon                                |
| Law 6 — One Core Argument         | One approved menu source; replace old links and PDFs so customers see it    |
| Law 7 — Stories Beat Statistics   | Concrete scenarios: approved update → menu link refreshes, QR scan → current menu |
| Law 8 — Dissonance                | "You update your menu. Customers still see the old one."                    |
| Law 9 — Frame Shifts              | Never attacks current behavior. Small shift: "Wouldn't it be easier if..."  |

---

**This document contains all copy for the new menulist.ai website.**  
**Every line has been validated against Language Governance (Doc 02) and Communication Worldbuilding Doctrine (Doc 10).**

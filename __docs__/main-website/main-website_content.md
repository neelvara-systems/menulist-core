# Website Content — MenuList Main Website (menulist.ai)

**Status:** ✅ CURRENT — Canonical website copy and section map
**Last Updated:** June 8, 2026
**Governance:** All content follows `02-language-governance.md` + `10-communication-worldbuilding-doctrine.md`  
**Test:** Every line passes: "Would a busy restaurant owner in Mumbai, reading this on their phone between lunch rush and dinner prep, immediately understand what this means for them?"

---

## Content Principles (From Constitution)

1. **Persuasion sequence:** Atomic truth → Hidden problem → New standard → Proof → Identity close
2. **Two Layers of Value:** Lead with Layer A (outcome), surface Layer B (ease) subtly
3. **Effort-removal clarity target:** 8.5/10 — SMBs must feel "this saves me work"
4. **Tone:** Premium calm + practical. Not fancy, not salesy, not startup-y.
5. **Language:** Operational words only. No AI-hype, no jargon, no marketing buzzwords.

> Resources planning note (June 1, 2026): The next content expansion should be an evergreen `/resources` layer, not a chronological blog. Planned resources must keep the same official-source discipline as the homepage: owner-useful quick answers, checklists, worksheets, comparison tables, and practical next steps without ranking guarantees, AI citation promises, or generic restaurant-tech hype. Use `__docs__/main-website/main-website_resources-plan.md` as the tracker before writing or implementing resource copy.

> Resources hardening note (June 2, 2026): The current release scope is not phased. The implemented website has the `/resources` hub, 15 article routes, four industry landing pages, a desktop Resources dropdown, mobile nested resource links, footer resource links, and a compact eight-card homepage bridge titled "Learn how to keep your public menu current." The homepage remains product-led; resource links support discovery and owner education without becoming a blog index.

> Marketing feedback note (June 2, 2026): The priority English resource and restaurant industry pages now use `Official Menu Source` as the category concept and `current approved menu` as the owner-readable explanation. The accepted WhatsApp, price-change, cleanup, and comparison-page candidates remain documented for later content work; they are not part of the live route set until marketing has reviewed content depth and CTA fit.

> Public truth indexing note (June 2, 2026): The business-page strategy is handled in the customer-facing tenant/OBP/menu discovery layer, not by creating more website articles. Existing public tenant pages now use a central indexability gate for metadata and sitemap inclusion. Marketing should not request keyword-variant restaurant pages, AI-written business pages, or city/category directory pages until owner-approval, source-confidence, and claim/update rules are documented.

> Privacy and analytics note (June 5, 2026): Main MenuList website analytics are consent-gated. Google Analytics and Microsoft Clarity must not load from `src/app/(website)/layout.tsx` until `WebsiteAnalyticsConsent` records an accepted analytics choice. Footer preferences include an Analytics control so visitors can change the choice later. The first-load mobile consent panel must stay compact enough that it does not cover the hero `Upload your menu` or `See customer preview` actions. This does not apply to owner custom-domain compliance pages or customer menu/OBP analytics, which are separate product surfaces with their own settings and privacy rules.

> Business Health website note (June 8, 2026): Business Health is now visible on the main homepage after implementation proof. Public copy must describe it as an owner-dashboard check for latest menu state, public surfaces, customer attention, locations, freshness, and safe action paths. Do not call it an AI assistant, chatbot, autonomous business agent, revenue optimizer, or prediction system. Keep the owner promise narrow: MenuList shows what needs attention, and says No action needed when the latest check is stable.

---

## Page 1: Homepage

### Canonical Implementation Scope

The current homepage is the only default MenuList marketing website. It keeps the strongest first-visit conversion jobs in safer official-source language: public drift pain, upload/review/publish clarity, setup effort removal, customer preview proof, public-surface clarity, rollout proof, FAQ trust, and final CTA confidence. Advanced proof areas stay available in supporting pages/components instead of lengthening the first homepage scroll. The public `/create-menu` funnel now supports both a menu photo and an owner-provided public menu link after sign-in, with the first setup preview still free before payment. It intentionally does **not** edit pricing, payment, subscription, Razorpay, or onboarding runtime logic.

Supporting pages now share the same official-source discipline through shared hero/proof components, owner-readable trust language, safer pricing/setup claims, and a unified website palette. Pricing payment, subscription, Razorpay, auth, and onboarding runtime logic remains protected unless a separate payment-scope task explicitly approves it.

**Current route/component order:**

1. `HeroSection`
2. `ProblemSection`
3. `InteractiveWorkflowSection`
4. `SetupReliefSection`
5. `SurfacesSection`
6. `CustomerBrowseSection`
7. `PreparedForYouSection`
8. `BusinessHealthSection`
9. `ResourcesSection`
10. `FaqSection`
11. `FinalCtaSection`
12. `StickyCta`

**Canonical section policy:** the homepage is intentionally compressed to reduce mobile and first-visit density. `BusinessHealthSection` is mounted as the single owner-dashboard USP proof after the prepared capability grid and before the education/discovery bridge. `ResourcesSection` remains a compact lower-page education/discovery bridge before FAQ; it must not turn the homepage into a blog index. `RevenuePathSection`, `StatsSection`, `SearchDiscoverySection`, `AnalyticsInsightsSection`, `SmartFeaturesSection`, `BusinessSection`, and `IndustrySection` remain in the repo as supporting components/future page material, but they are not mounted in the current homepage composition.

**Growth Kits placement policy (June 1, 2026):** do not add GrowthOS, Growth Kits, or `Today's Sales Pack` to the homepage. The homepage must stay focused on the first owner action: upload the current menu and publish one official customer-facing version. Growth Kits may be considered later as a small Pro/Premium pricing or Features-page proof point after owner usage validates demand.

**Print files placement policy (June 5, 2026):** do not add a separate Menu Card Export or Print Assets homepage section. The homepage may show `Print files` as one compact output of the approved menu source, while the Features page can explain the practical owner outcome: paper menu PDFs, table cards, counter cards, and printer handoff files generated from the same current approved menu. `/resources/digital-menu-vs-pdf-menu` continues to carry the broader PDF-vs-digital explanation. The Pro/Premium layout suggestion must not be promoted on the homepage; if public pricing copy later needs it, describe it plainly as `layout suggestion on Pro and Premium`, not as an AI PDF feature.

**Business Health placement policy (June 8, 2026):** keep the homepage Business Health section compact and direct, with the deeper public campaign story on `/features/business-health`. Both surfaces must show the owner-dashboard value directly: latest check, No action needed state, freshness, cached analytics periods, multi-location awareness, phone support, and safe action routing. Do not imply realtime sales, POS revenue, external competitor tracking, unsupported date ranges, provider-backed AI reasoning by default, or direct assistant-owned public-truth mutation.

**Business Health Features-page policy (June 8, 2026):** the Features page should also list Business Health as one compact Operations card because the homepage now treats it as a MenuList USP. It must remain a feature-inventory proof, not a second full section, not a standalone landing page, and not part of the analytics cross-map. Approved copy can mention latest MenuList check, last checked date, customer attention, whether anything needs action, and No action needed stable state.

**Business Health campaign page policy (June 8, 2026):** `/features/business-health` is the public campaign URL for Business Health. Do not use `/business-health` for public marketing because that route belongs to the logged-in owner app. The campaign page may go deeper than the homepage section, but must stay inside the shipped contract: latest MenuList check, public surface status, customer attention, standard cached periods, location state, last checked date, safe next actions, No action needed when stable, and existing owner-screen routing. It must not imply AI assistant, generic chatbot, ask-anything behavior, realtime sales, POS revenue, competitor tracking, predictions, automatic external-platform updates, or direct assistant-owned public-truth mutation.

**CTA rule:** Primary public CTAs now point to `/create-menu` and should consistently read "Upload your menu →" for non-technical SMB owners. The destination explains the flow publicly, then requires sign-in before accepting a menu photo or a permission-confirmed public menu link. `/get-started` remains a guided setup/sign-in page for owners who need account context, not the first upload funnel.

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

**Navigation rule:** Header navigation is product-led: Features, How it works, Multi-location, Pricing, Resources. Desktop Resources opens a compact dropdown for Menu Engineering, QR Menu Guide, Digital Menu vs PDF, Google Menu Guide, Restaurant Menu SEO, AI Search & Menu Discovery, Official Menu Source, and All Resources. Mobile navigation exposes the same resource links under the Resources entry.

**Homepage resource cards:** The mounted `ResourcesSection` uses eight cards: Menu engineering, QR menu setup, Digital menu vs PDF, Google menu source, Restaurant menu SEO, AI search discovery, Official menu source, and Multi-location control. Keep Menu Source Audit as a high-intent resource page and hub/tool card, not as a homepage card, so the homepage follows the requested strategic cluster.

**Localization rule:** English long-form resource content is the source of truth. Every active public website-switcher language now has reviewed structured resource coverage: Hindi, Tamil, Telugu, Marathi, Bengali, Arabic, and Spanish. Each pack covers all 15 articles, including long-form sections, checklists, comparison rows, FAQ, metadata, and CTAs. Future languages must stay on English fallback until complete reviewed packs pass `npm run verify:website-resource-locales` and their locale URLs are added to sitemap, `hreflang`, and LLM context.

---

## Page 1B: Industry Landing Pages

### Canonical Implementation Scope

Industry pages explain how the same official-source layer applies to common food-business types without turning MenuList into a marketplace, POS replacement, or ranking tool.

**Current route set:**

1. `/industries/restaurants`
2. `/industries/cafes-bakeries`
3. `/industries/takeaway-cloud-kitchens`
4. `/industries/multi-location-food-businesses`

**Content rule:** Industry pages may describe fit, common public-menu problems, how MenuList helps, and related resource links. They must not claim category-specific revenue lift, automatic Google updates, delivery-marketplace replacement, POS replacement, or guaranteed search/AI visibility.

---

### Section 1 — Hero

**Headline:**

> Upload your current menu. Publish one official version customers can trust.

**Subline:**

> Start with a photo, PDF, existing menu link, or typed menu. MenuList prepares the official customer-facing version from one owner-approved source.

**Primary CTA:** Upload your menu →
**Secondary CTA:** See customer preview (`#customer-demo`)
**Micro-trust line:** Start with a 7-day setup. Review the public menu before choosing a paid plan.

**Proof strip:** Review before publishing · Current menu accepted · No desktop required

**Visual:** Official-source composite showing owner source, Official Business Page, customer menu phone preview, and surface pills for QR menu, official page, digital screen, web/link, print/PDF, and saved menu shortcut.

**Notes:**

- Direction A: Current-menu owner action first, official-source proof second.
- Hero must communicate upload → review → publish one trusted customer version in under 5 seconds.
- The visual line break in the hero headline must preserve readable whitespace in DOM/accessibility text. The rendered H1 should read `Upload your current menu. Publish one official version customers can trust.`
- Avoid "digital menu maker", "AI menu generator", and generic dashboard visuals.
- Existing menu link copy is allowed as a source-intake proof only. Do not call it scraping, marketplace import, automatic cloning, or automatic publishing.
- Avoid using "no account needed" as a hero or upload-page proof point. Keep the funnel promise aligned to the current setup model: "Start with a 7-day setup. Review before choosing a paid plan."

---

### Supporting Component — Revenue Path (not mounted on current homepage)

**Purpose:**

This section shows the practical path from the menu a business already has to the customer actions that matter. It keeps the source-of-truth idea, but explains it in plain owner language.

**Eyebrow:**

> From menu to customer action

**Headline:**

> Your menu should help customers choose faster.

**Supporting text:**

> MenuList turns the menu you already use into the customer-facing version customers can trust before they call, visit, order, or share.

**Path steps:**

| Step | Label | Title | Description |
| --- | --- | --- | --- |
| 1 | Start | Use your current menu | Photo, PDF, link, or typed items. The owner-approved version is the starting point. |
| 2 | Publish | Customers see one clear page | The live menu and official page replace old files, screenshots, and broken links. |
| 3 | Share | Put the same menu everywhere | QR, web link, screen, and PDF all point back to the current menu. |
| 4 | Action | Customers can act quickly | Call, WhatsApp, directions, order, and share stay close to the menu. |

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

> Business menus on the internet are broken.

**Supporting text:**

> Your Google listing shows old prices. The QR menu has items you removed. The PDF on WhatsApp is from months ago. Customers see different versions everywhere they look — and none of them are correct.

**Visual stack:**

The section now uses a split layout: left-side narrative, right-side public-drift stack. This is more direct and self-selling than a generic card grid.

**Visual tiles (4):**

| Tile | Short Label | Description |
| --- | --- | --- |
| 1 | Outdated Google listing | Old prices and hours still showing to customers searching for you |
| 2 | Wrong QR menu | Items you removed months ago still visible when customers scan |
| 3 | Old PDF on WhatsApp | Last year's menu still circulating in customer group chats |
| 4 | Inconsistent pricing | Different prices on different platforms — customers notice |

**Notes:**

- Keeps the owner pain obvious before introducing product mechanics.
- Tile count is intentionally 4, not 6, to reduce visual noise.

---

### Removed — Redundant Solution Section

The old `SolutionSection` with "One menu. Public places stay aligned.", a central SVG, and six explanatory bullets is no longer mounted. The same category bridge is now covered more clearly by the hero promise, broken-menu problem section, `InteractiveWorkflowSection` source map, setup proof, and public-surface proof. Keeping both made the homepage longer and repeated the same one-source claim before the visitor reached stronger product proof.

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

> One menu becomes every customer surface.

**Eyebrow:**

> From source to public

**Workflow visual:**

- Left side: current menu inputs (`Photo`, `PDF`, `Existing link`, `Text`).
- Center: official MenuList logo plus `Owner review`.
- Right side: public customer outputs (`Official page`, `Menu link`, `QR code`, `Print files`).
- Mobile uses three rows so inputs spread horizontally, owner review stays centered, outputs sit below, and the dotted connector paths stay edge-anchored without using the desktop geometry.
- Diagram colors must stay theme-aware: light mode uses light surfaces, dark mode uses dark surfaces.
- Static dotted paths remain visible. A subtle pulse layer travels from inputs into MenuList, pauses while the center rings keep a light always-on pulse, and then moves from MenuList toward outputs; each destination card briefly highlights only its existing border when the pulse arrives. Reduced-motion users only see the static paths.
- This visual belongs in the workflow section, not the hero, because the hero should keep showing believable product/customer proof while the workflow section explains the operating model.

**Steps (4):**

| Step | Title | Description |
| --- | --- | --- |
| 1 | Start with the menu you already use | Photo, PDF, existing menu link, or typed menu. The setup starts from the current source your business already trusts. |
| 2 | Review the prepared source | Items, categories, prices, language, images, and business details become structured before they go public. |
| 3 | Publish the official version | The official page and live menu become the customer-facing source for your menu and business information. |
| 4 | Deploy it where customers look | QR, links, screens, and print send customers to the same current menu. |

**Micro-copy below steps:**

> No technical setup. You approve before publishing.

---

### Section 5 — Setup Effort Removed

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

### Section 6 — Public Proof Surfaces

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

### Section 7 — Customer Browse Proof

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

### Section 8 — Real-World Deployment

**Section heading:**

> The official menu leaves the screen.

**Supporting text:**

> A correct public link matters only when customers can find it. MenuList helps place the official menu where your business already speaks to customers.

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

> Not only restaurants.

**Supporting text:**

> Built first for restaurants, cafes, cloud kitchens, bakeries, salons, spas, and other businesses with customer-facing menus, service lists, or price lists.

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

### Section 9 — FAQ

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

### Section 10 — Final CTA

**Heading:**

> Make one public menu customers can trust.

**Subtitle:**

> Start from the menu you already have. MenuList turns it into the official customer-facing version of your business.

**Button:** Upload your menu →

**Final CTA proof stack:** Removed in v3.6.1. The closing CTA should stay short after the homepage has already explained upload, review, publishing, customer surfaces, and FAQ.

---

## Page 2: How It Works (/how-it-works)

**Canonical note:** Supporting website pages must follow the current official-source strategy. Revalidate claims against the current codebase before promoting them. Do not use automatic Google/external-surface language unless the runtime path proves it. `/product` is a permanent legacy redirect to `/how-it-works` and must not be promoted as an active public destination.

### Hero

**Headline:**

> How MenuList works

**Subline:**

> Start with your current menu. MenuList prepares the owner-approved source for the customer-facing surfaces your business uses.

**CTA:** Upload your menu →

**Source map visual:**

- Left side: menu inputs (`Photo`, `PDF`, `Existing link`, `Typed text`).
- Center: official MenuList mark plus owner-review gate.
- Right side: customer surfaces (`QR`, `Menu link`, `Screens`, `Print files`, `Official page`, `Saved shortcut`).
- Desktop output connector paths start under the center logo/ring and visually emerge from the core boundary, matching the homepage source-map alignment.
- The center ring ripple is intentionally visible in light mode so the MenuList core feels active without adding extra copy or decoration.
- The visual must stay restrained and product-specific. Do not use generic SaaS node graphics.

---

### Section: Upload & Create

**Heading:**

> Start with what you have.

**Body:**

> Take a photo of your paper menu, upload a PDF, paste an existing menu link, or type items directly. MenuList prepares the draft for owner review without manual formatting.

**Key points:**

- Works with photo, PDF, existing link, or typed input
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

### Section: Business Health

**Heading:**

> Business Health shows what needs attention.

**Body:**

> After publishing, MenuList checks the latest menu state, public surfaces, customer attention, and locations. When everything is stable, the owner dashboard says No action needed.

**Homepage proof cards:**

1. **Latest check first** — The dashboard opens with status, freshness, and whether anything needs attention.
2. **Analytics without raw tables** — Standard periods such as today, this week, last month, and overall come from cached summaries.
3. **Safe action paths** — Menu changes open existing owner screens. Public changes stay inside the normal publish flow.
4. **Works on phone** — The same Business Health view appears inside the mobile owner app.

**Preview content:**

- Latest check
- Business looks stable
- No action needed
- Uses data through the last settled business day
- Owner question: Which item was on top this week?
- Business Health answer: Answers come from cached MenuList data with source freshness

**Copy boundary:** Business Health is a MenuList check inside the owner dashboard. Do not call it a chatbot, AI assistant, realtime sales monitor, revenue optimizer, prediction tool, or autonomous action system.

**Source:** `owner-business-assistant_website.md`, runtime Business Health implementation and dashboard/mobile QA records.

---

### Section: Publish

**Heading:**

> Publish from one owner-approved source.

**Body:**

> When you publish, your MenuList-controlled public surfaces can point customers to the same approved source: QR menu, official page, digital screens, PDF, and share links. External placements such as Google, Instagram, and WhatsApp still require owner placement or checklist confirmation.

**Key points:**

- Atomic publishing — all surfaces update together
- No duplicate updates across MenuList-controlled surfaces
- MenuList-controlled public surfaces can stay aligned from the approved source
- Publish history lets you see what changed and when

**Source:** `client-menu_website.md` (controlled MenuList surface publishing)

---

### Section: Where It Lives

**Heading:**

> Your menu, everywhere your customers look.

**Body:**

> Once published, your menu appears across every surface customers already use.

**Surfaces (detailed):**

1. **QR Menu** — Customers scan and see your current published menu on any phone or browser. No app download needed.
2. **Official Business Page** — One official link with your menu, hours, location, photos, social links, and customer actions. Share it on WhatsApp, Instagram, packaging, Google profile, or QR.
3. **Google Presence** — Your Google Business Profile can point customers toward the current MenuList public menu where configured.
4. **Digital Screens** — Your full menu on your shop TV. Categories, items, prices, and visibility can follow the published MenuList source.
5. **Print Files** — A PDF or printer handoff packet generated from the current approved menu. For print, WhatsApp, packaging, or internal use.
6. **Shareable Link** — Direct link to your live menu. Works in any message, email, or social post.

**Source:** `client-menu_website.md`, `official-business-page_website.md`, `digital-screens_website.md`, `gbp-sync_website.md`

---

### Section: Always Current

**Heading:**

> Your menu stays correct. You never check again.

**Body:**

> Change a price, mark an item unavailable, or update business details from the owner-approved menu. Customer-facing pages can reflect the current published version without separate manual copies.

**Key points:**

- Price changes start from one owner-approved menu
- Unavailable items can be hidden from controlled customer-facing menus
- Hours displayed accurately — customers see "Open" or "Closed" in real time
- One current menu reduces duplicate updates across controlled public pages

**Source:** `pricing-integrity-system_website.md`, `hours-holiday-accuracy_website.md`

---

### Final CTA

**Heading:**

> Your menu deserves one official home.

**CTA:** Upload your menu →

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

**CTA:** Upload your menu →

**Notes:**

- This hero should sell reduced owner work, not an abstract feature catalogue.
- Keep the phone-first and owner-approval helper lines directly below the hero subline.
- v3.6.34 wires the highest-selling feature cards to dedicated campaign pages and exposes them in the header Features dropdown. The dropdown should stay restrained and should not become a full product map.

### Header Feature Dropdown And Campaign Pages

**Dropdown links:**

1. Menu Import — `/features/menu-import`
2. Official Business Page — `/features/official-business-page`
3. QR Menu and Links — `/features/qr-menu-links`
4. Owner Phone Dashboard — `/features/owner-phone-dashboard`
5. Business Health — `/features/business-health`
6. Public Discovery — `/features/public-discovery`

**Selection rationale:**

- These are the feature surfaces most likely to help a non-technical SMB owner understand why MenuList is useful: start from the current menu, create one public customer source, share it through QR/links, manage it from a phone, know what needs attention, and provide a clearer public source for search/answer systems.
- POS sync, staff roles, analytics depth, print-file detail, and advanced multi-location governance remain on `/features`, `/multi-location`, or supporting resources. They should not crowd the primary header dropdown unless the buyer strategy changes.

**Campaign page pattern:**

- Each new campaign page uses `FeatureDetailPage` for a focused hero, proof preview, three story cards, four trust/proof cards, and final CTA.
- Copy must stay owner-readable. Avoid `AI-powered`, unsupported automation, ranking guarantees, POS replacement language, and generic dashboard-SaaS framing.

### Print Files And Launch Kit Cards

**Placement decision:**

Keep print capability inside existing Features page groups. Do not create a dedicated public feature page or homepage section unless owner demand later proves that printable assets are a primary purchase driver.

**Owner-readable copy contract:**

- `Print files` means paper menu PDF, table card, counter card, or printer handoff packet from the current approved menu.
- `Instant launch kit` can list table tent, single table card, counter card, entrance poster, delivery bag sticker, takeaway card, WhatsApp link, and Instagram story.
- `Menu Kit: print-ready cards` can explain branded table/counter/entrance/takeaway files with QR code and business color, ready for a local printer.

**Notes:**

- Keep this copy practical. Avoid internal names like `Print Assets`, `Menu Card Export`, `single-asset generation`, or `renderer`.
- Do not imply printed paper updates automatically. The printed QR points customers to the current menu; the paper file itself is a generated output.

### Operations Group

**Business Health card:**

Title:

> Business Health

Description:

> See the latest MenuList check, last checked date, customer attention, and whether anything needs action. Stable checks show No action needed.

**Notes:**

- This is the first Operations card because Business Health is now the website's owner-dashboard USP proof.
- Keep the card compact and grounded in the shipped owner dashboard, mobile screen, scheduler read models, cache-first context packets, and safety guards.
- Do not call it an AI assistant, chatbot, realtime monitor, revenue optimizer, prediction engine, competitor tracker, or autonomous public-menu editor.

**Mobile owner operations card:**

Title:

> Owner dashboard on your phone

Description:

> Use the mobile owner dashboard from a phone browser or the MenuList PWA to update menus, publish changes, check customer signals, adjust settings, manage screens, and handle daily operations without a desktop.

**Notes:**

- This is a dedicated Features page proof point because it reduces the non-technical SMB owner's fear that MenuList requires desktop administration.
- Keep the homepage version short as reassurance copy near CTAs.
- Avoid claiming exact parity for every advanced edge case; the claim is practical phone-first owner operation.

**Staff accounts and roles card:**

Title:

> Staff accounts and roles

Description:

> Add staff with email or Staff ID and passcode, choose what each role can access, reset passcodes, and sign out old sessions when staff changes.

**Notes:**

- This is a day-one business-operations proof point for teams where not everyone should have owner access.
- Keep the claim to implemented access controls. Do not imply payroll, attendance, shift planning, or HR management.

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

> Know what needs attention.

**Subline:**

> Business Health brings the latest MenuList check, customer attention, locations, freshness, and safe next actions into one owner dashboard view.

**Primary CTA:** Upload your menu →

**Secondary CTA:** See all features

### Preview Panel

The preview must show:

- Latest check
- Last checked date shown
- Business looks stable
- No action needed
- Customer attention, standard period data, and location state
- One owner question and one source-fresh answer

### Sticky Story Section

**Eyebrow:**

> From check to next action

**Heading:**

> One Business Health view across the owner dashboard.

**Layout rule:** Use the same stacked sticky section structure as Answerlattice's "From inputs to support surfaces" section, translated into MenuList website tokens. The left side is a sticky tab rail. The right side is a stacked set of sticky story cards.

Left-side tabs:

1. What it checks
2. Owner outcome
3. Why owners can trust it

Right-side sticky cards:

1. **What it checks** — Latest MenuList check, public surface status, customer attention, and location view.
2. **Owner outcome** — Stable means quiet, freshness stays visible, and actions open the right place.
3. **Why owners can trust it** — No uncontrolled public changes, cached checks control cost, and the same view works on desktop and phone.

**Mobile rule:** The left rail becomes a sticky horizontal tab row. Story cards collapse to one column without losing the tab labels or source-fresh copy.

**Copy boundary:** This page can be used for paid campaigns and founder-led sales, but it must stay a Business Health explanation, not an AI product page. Do not add generic assistant, chatbot, revenue, prediction, competitor, or realtime sales claims.

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

> The Locations page shows all your outlets in one place. See which outlets are active, view billing per store, and switch between locations with one click.

**Key points:**

- Add a new outlet and let it inherit the master menu structure
- Billing adjusts automatically — per-outlet pricing, no plan changes needed
- Switch between any location from one screen
- See status and activity across all outlets at a glance

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

> Everything your customers see. One system.

**Subline:**

> Menu, pricing, availability, and presentation stay connected to one owner-approved source. No design or technical setup required.

**Proof row:**

- Look professional from one source
- No scattered menu files
- No outdated public PDFs

---

### Plan Display Rules

- Show **B2C plans only** (2-3 plans) — no B2B/developer tab
- **INR primary** (auto-detected for India timezone), USD secondary
- **Monthly/yearly toggle** with savings badge
- Keep existing plan data from `PlatformPlansList`
- Each plan card: Plan name, price, billing period, key features, CTA button
- Recommended plan highlighted
- Plan guidance must leave the choice with the owner: Starter is enough for one current public menu; Pro is for presentation, languages, and owner controls.

### CTA on Plan Cards

> Upload your menu →

### Below Plans: Credit / Enhancement Packs

**Heading:**

> Need more from your menu?

**Body:**

> Every plan includes menu preparation features. For businesses with larger menus or frequent updates, Enhancement Packs provide additional capacity. One-time purchase. No expiry.

**Source:** `ai-enhancement-packs_website.md`

---

### FAQ Section

**Q: How does billing work?**

> Choose monthly or yearly. Yearly saves 17%. You can switch anytime.

**Q: Can I change my plan later?**

> Yes. Upgrade or downgrade anytime from your dashboard.

**Q: Is there a free trial?**

> Menu extraction is free and unlimited. To publish and share your menu, choose a plan.

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

> Make your menu source official.

**CTA:** Upload your menu →

---

## Page 6: Get Started (/get-started)

**Eyebrow:**

> Start with control

**Heading:**

> Start with the menu you already use

**Subline:**

> Sign in once, add the current menu, and review the prepared preview before publishing.

**Proof strip:**

- Sign in before upload
- Owner review before publishing
- Dashboard setup comes next

**Primary action:** Upload your menu → (`/create-menu`)
**Secondary action:** Login (`/signin?callbackUrl=/dashboard`)

**Below card:**

> Already using MenuList? Open sign-in options.

**Notes:**

- Extremely clean, centered page
- No form fields (Google OAuth handles everything)
- Primary upload path → `/create-menu`; returning-owner sign-in goes to `/dashboard`, while pricing remains available from nav and publish/setup decisions.
- Supporting cards explain current-menu start, owner approval, and pricing as the next decision without changing auth/payment behavior.

---

## Page 7: Contact (/contact)

**Heading:**

> Ask us about your menu source.

**Body:**

> Use this for setup questions, pricing clarity, multi-location planning, or anything that affects what customers see.

**Contact methods:**

- Email: hello@menulist.ai
- Website enquiry form persists through `addEnquiry()`.

**Notes:**

- Contact page keeps the existing form logic.
- New proof strip reinforces real product team, setup/pricing help, and multi-location planning.

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
- **Privacy Policy analytics content:** Disclose that main website Google Analytics and Microsoft Clarity load only after analytics consent. Keep customer menu analytics separate: they do not ask visitors for names, emails, or payment details, but they are not controlled by the main website banner.
- **Privacy Policy retention content:** Use purpose-based retention language unless an exact lifecycle is enforced in code or provider configuration. Do not publish fixed 90-day, 35-day, DPA, SCC, or sub-processor commitments until the matching operational artifacts exist.
- **Privacy/security claim discipline:** Avoid exact encryption algorithms, fixed backup windows, broad model-training guarantees, DPA/SCC/sub-processor readiness, universal export/delete controls, and "all third parties" confidentiality language unless the matching code, provider configuration, or legal artifact is present.
- **Terms staff-access content:** Make owners responsible for staff access they create, safe sharing of Staff ID/passcode details, correct role assignment, and ending access when staff leave.
- **Trust/security staff-access content:** Use factual role-scoped access language. Do not claim legal certification, GDPR certification, HR/payroll/attendance coverage, or full workforce management.
- **Refund Policy:** No staff-specific change required.
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
- Upload your menu → `/create-menu` (primary button)

---

## Footer Copy

**Footer strategy:**

The footer is now a revenue and trust layer, not only a legal/navigation block. It should give high-intent visitors a final conversion path and help skeptical visitors understand that MenuList is a public-source system, not a QR-menu utility.

**Closing CTA:**

Eyebrow:

> Ready when the menu is

Headline:

> Put your menu online from the version you trust.

Body:

> Start from the menu you already have. MenuList prepares the customer-facing version, then keeps your public page, QR, screen, PDF, and links aligned.

Primary CTA:

> Upload your menu →

Secondary CTA:

> See plans

**Proof cards:**

- Owner approval before publishing
- One source for public surfaces
- Single-location simple. Chain-capable.

**Logo + tagline:**

> MenuList — One official source for your menu and business details.

**Source line:**

> MenuList keeps the menu you approve behind the links and materials customers use.

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

## Owner Reassurance Placement Rules

Owner reassurance should reduce friction without turning into repeated wallpaper copy.

- Keep phone/PWA operation as a compact proof idea only where it answers an immediate owner doubt.
- Keep review-before-publish near upload/review workflows, setup copy, and FAQ answers.
- Do not repeat the full public-surface list on pricing, final CTA, or supporting-page heroes.

The removed global helper components were useful during early conversion hardening, but they made Product, Features, Pricing, Get Started, Multi-location, About, Contact, Trust/Security, and the homepage final CTA feel repetitive.

| Page           | Title Tag                                              | Meta Description                                                                                                                           |
| -------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Homepage       | MenuList - One Official Menu Source for Customers | Upload your current menu. Review the prepared version. Publish one official menu, page, QR link, screen, PDF, and customer view from the same owner-approved source. |
| Product        | How MenuList Works — One Menu, Everywhere              | See how MenuList keeps your menu correct across QR, official pages, screens, web links, and print outputs from one approved source.         |
| Multi-Location | MenuList for Chains & Multi-Location Businesses        | Manage menus across all your locations from one place. Master menu, per-location control, instant sync.                                    |
| Pricing        | MenuList Pricing — Simple, Transparent Plans           | Start managing your official menu. Simple plans with transparent pricing in INR. No hidden fees.                                           |
| About          | About MenuList — Built in India for Growing Businesses | MenuList is a public menu infrastructure system built in India for cafes, service businesses, and growing teams that publish customer-facing offers. |
| Get Started    | Get Started — Create Your Official Menu Source         | Start with your current menu and create the owner-approved source for the customer-facing version of your business. |
| Contact        | Contact MenuList                                       | Have a question about MenuList? Reach out to our team.                                                                                     |
| Privacy        | Privacy Policy — MenuList                              | MenuList privacy policy. How we handle data, consent-gated website analytics, and retention.                                               |
| Terms          | Terms of Service — MenuList                            | MenuList terms of service for all users and businesses.                                                                                    |
| Refund         | Refund Policy — MenuList                               | MenuList refund and cancellation policy for subscriptions.                                                                                 |

---

## Language Governance Compliance Checklist

Stage 7.4 reviewed the homepage copy after the reference-informed layout pass. It corrected internal phrasing, grammar, capitalization, public-surface casing, and spelling drift while preserving the official-source positioning and avoiding unsupported claims.

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
| Law 6 — One Core Argument         | "Your menu, from one place, correct everywhere" — repeated throughout       |
| Law 7 — Stories Beat Statistics   | Concrete scenarios: price change → customer sees it, QR scan → current menu |
| Law 8 — Dissonance                | "You update your menu. Customers still see the old one."                    |
| Law 9 — Frame Shifts              | Never attacks current behavior. Small shift: "Wouldn't it be easier if..."  |

---

**This document contains all copy for the new menulist.ai website.**  
**Every line has been validated against Language Governance (Doc 02) and Communication Worldbuilding Doctrine (Doc 10).**

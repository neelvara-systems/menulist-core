# MenuList SEO/AEO Marketing Brief

**Status:** Current - shareable marketing review brief  
**Date:** June 2, 2026  
**Audience:** Marketing, content, founder, SEO/AEO reviewers  
**Canonical host:** `https://menulist.ai`  
**Preview/alias context:** `https://www.menulist.online`  

---

## 1. Executive Summary

MenuList now has a complete public website discovery layer around one disciplined idea:

> MenuList is the current approved public-list source layer for businesses that need the customer-facing version of their menu, service list, price list, catalogue, and business information to stay correct across QR, Google/menu links, WhatsApp/social links, websites, PDFs/print assets, screens, branch pages, search engines, and AI answer systems.

This work was not a generic blog launch. It created an evergreen resource and industry content system that supports product-led acquisition, owner education, SEO, and AEO.

For this document, **AEO** means answer-engine optimization: making public pages easy for search engines and AI/search systems to crawl, parse, summarize, and cite when they choose to do so. If the marketing team uses the term **AWO**, this document is referring to the same AI/search discovery work.

MenuList still does **not** promise rankings, Google refresh timing, AI visibility, citations, revenue lift, or automatic external-platform updates.

---

## 2. What We Built

### Public Content Layer

- Added an evergreen `/resources` hub.
- Expanded the resource library to 15 articles.
- Added four industry landing pages.
- Added reviewed resource coverage for every active public website language:
  - `hi-IN`
  - `ta-IN`
  - `te-IN`
  - `mr-IN`
  - `bn-IN`
  - `ar-SA`
  - `es-ES`
- Kept unprefixed `/resources` routes pinned to English.
- Added locale-prefixed resource routes such as `/hi-IN/resources/[slug]` and `/ar-SA/resources/[slug]`.

### Discovery Layer

- Updated `public/sitemap.xml`.
- Updated `public/llms.txt`.
- Updated `public/llms-full.txt`.
- Updated `src/lib/seo/discoveryPolicy.ts`.
- Kept canonical discovery URLs on `https://menulist.ai`.
- Added `hreflang` alternates for reviewed resource locales.
- Added resource and industry URLs to the discoverable platform page inventory.

### Website UX Layer

- Header includes product-led navigation:
  - Features
  - How it works
  - Multi-location
  - Pricing
  - Resources
- Desktop header has a compact Resources dropdown.
- Mobile navigation includes nested resource links.
- Homepage includes a product-led resources block:
  - Title: `Learn how to keep your public menu current`
  - Cards: Menu engineering, QR menu setup, Digital menu vs PDF, Google menu source, Restaurant menu SEO, AI search discovery, Official menu source, Multi-location control
- Footer Resources column points to the strategic resource set.

### Measurement Layer

Implemented consent-gated public website tracking for resource behavior. Plausible receives property-free custom event names, and GA4 compatibility payloads remain available when GA4 is configured:

- `resource_page_view`
- `resource_primary_cta_click`
- `resource_secondary_cta_click`
- `resource_related_click`
- `resources_hub_card_click`
- `homepage_resource_card_click`
- `ai_crawler_referral_detected`
- `upload_menu_click_from_resource`
- `pricing_click_from_resource`
- `resource_checklist_copy`

Intentional non-event:

- `resource_template_download` is not implemented yet because there are no real downloadable templates. We should not track fake download actions.

Primary KPI:

> Resource reader to create customer link click.

Traffic alone is not the main success metric.

---

## 3. Strategic Positioning

### What MenuList Should Own

MenuList should own this concept:

> Menu engineering starts with the menu customers actually see.

Before a restaurant can improve menu layout, pricing, item names, photos, descriptions, popularity, profitability, or category structure, the business needs one current approved public menu source.

If Google shows one menu, QR opens another, WhatsApp carries an old PDF, Instagram points somewhere else, staff sends a screenshot, and each branch has a different price list, the business has a public trust problem before it has a menu optimization problem.

June 22, 2026 founder direction broadens the market scope. The current live website route set is food/menu-heavy, but MenuList should not be treated as restaurant-only. For salons, spas, barbers, studios, clinics, repair shops, caterers, retail counters, and similar SMBs, the equivalent job is the current customer-facing list: service menu, package list, price list, rate card, catalog, or offering list.

Broad positioning line:

> Turn the current customer-facing list into one official customer link.

### Approved Positioning

Use these ideas:

- one official menu source
- one official customer link
- current approved menu
- current service list, package list, price list, or rate card when the business is not a restaurant
- public customer-facing version
- clear menu URL
- clear customer link
- structured public page
- search and AI systems
- answer engines
- crawlable public information
- reduce outdated files
- keep public menu current
- review before publishing
- same source across QR, Google, links, screens, and print assets

### Positioning Boundaries

Do not call MenuList:

- a generic QR menu maker
- generic AI restaurant software
- a restaurant-only website builder
- a generic local-business page builder
- a food delivery marketplace
- a POS replacement
- a guaranteed SEO tool
- a guaranteed AI visibility tool
- a full menu-profit optimization system

Do not claim:

- guaranteed ranking
- guaranteed Google refresh
- guaranteed AI citation
- guaranteed AI visibility
- revenue lift
- 10x growth
- automated profit optimization
- fake reviews, fake ratings, fake testimonials, or invented metrics

---

## 4. Page Inventory And Titles

### Core Product And Website Pages

| URL | Page title | Role |
| --- | --- | --- |
| `/` | MenuList - One Official Customer Link for Menus and Services | Primary product-led homepage |
| `/features` | Features - MenuList \| No Extra Work for Your Menu | Product capability overview |
| `/features/menu-import` | Menu Import - MenuList \| Upload the Menu You Already Have | Upload/import campaign page |
| `/features/official-business-page` | Official Business Page - MenuList \| One Current Customer Link | Official public business page campaign |
| `/features/qr-menu-links` | QR Menu and Share Links - MenuList \| One Current Menu Everywhere | QR/share campaign page |
| `/features/owner-phone-dashboard` | Owner PWA Dashboard - MenuList \| Manage MenuList From Your Phone | Owner phone/PWA workflow campaign |
| `/features/business-health` | Business Health - MenuList \| AI Health Check for Your Menu | Business Health campaign page |
| `/features/public-discovery` | Public Discovery - MenuList \| Clear Business Information for Search and AI | Search/answer-system source clarity campaign |
| `/how-it-works` | How MenuList Works - From Current List to Customer Link | Explains source intake, review, publish, and public surfaces |
| `/multi-location` | Multi-Location Source Management - MenuList \| One Source, Every Location | Multi-location product proof |
| `/pricing` | Pricing - MenuList \| Simple, Transparent Plans for Every Business | Commercial decision page |
| `/create-menu` | Create Your Official Customer Link - MenuList | Primary conversion page for menu, price-list, catalogue, or service-list sources |
| `/get-started` | Get Started - Create Your Customer Link | Guided setup/sign-in support page |
| `/resources` | Resources - MenuList \| Keep One Public List Current | Evergreen resource hub |
| `/trust-security` | Trust & Security - MenuList \| How We Keep Your Data Safe | Trust and security support |
| `/about` | About MenuList - Built in India for Growing Businesses | Company/context page |
| `/contact` | Contact Us - MenuList \| Get in Touch | Contact page |
| `/privacy-policy` | Privacy Policy - MenuList | Legal |
| `/terms-of-service` | Terms of Service - MenuList | Legal |
| `/refund-policy` | Refund Policy - MenuList | Legal |

Notes:

- `/create-menu/preview/[draftId]` exists as a flow page, not a marketing acquisition page.
- `/product` remains a legacy redirect to `/how-it-works` and should stay out of sitemap and LLM discovery inventories.

### Resource Pages

| URL | SEO title | Main intent |
| --- | --- | --- |
| `/resources/menu-source-audit` | Menu Source Audit for Restaurants \| MenuList | Help owners find old menu copies across Google, QR, WhatsApp, Instagram, PDFs, staff files, websites, and branches |
| `/resources/menu-engineering` | Menu Engineering Starts With the Public Menu \| MenuList | Tie menu engineering to the current customer-facing menu source |
| `/resources/qr-menu-for-restaurants` | QR Menu Setup for Restaurants \| MenuList | Explain stable QR menu setup and scan-tested placement |
| `/resources/digital-menu-vs-pdf-menu` | Digital Menu vs PDF Menu \| MenuList | Compare digital menus, PDFs, print files, QR links, WhatsApp, Google links, and customer trust |
| `/resources/google-business-profile-menu` | Google Business Profile Menu URL \| MenuList | Explain how to use one current menu URL for Google without claiming ranking or refresh control |
| `/resources/official-menu-source` | Official Menu Source for Restaurants \| MenuList | Define the core MenuList official-source concept |
| `/resources/restaurant-menu-seo` | Restaurant Menu SEO Guide \| MenuList | Explain visible menu text, stable URLs, metadata, internal links, and structured data without ranking promises |
| `/resources/ai-search-menu-discovery` | AI Search Menu Discovery \| MenuList | Explain AI/search discovery using visible HTML, schema, sitemap, robots, and LLM context |
| `/resources/menu-update-checklist` | Restaurant Menu Update Checklist \| MenuList | Checklist before changing prices, availability, descriptions, QR links, Google menu links, PDFs, and staff-shared files |
| `/resources/qr-code-placement-checklist` | QR Code Placement Checklist for Restaurants \| MenuList | QR size, table placement, packaging, lighting, fallback URLs, and scan testing |
| `/resources/menu-engineering-worksheet` | Menu Engineering Worksheet \| MenuList | Simple item review worksheet for section, price, cost estimate, popularity estimate, margin estimate, clarity, and next action |
| `/resources/restaurant-menu-schema` | Restaurant Menu Schema Guide \| MenuList | Explain visible-content-aligned Restaurant, LocalBusiness, Menu, MenuSection, MenuItem, OpeningHoursSpecification, Article, FAQPage, and BreadcrumbList schema |
| `/resources/official-menu-url-checklist` | Official Menu URL Checklist for Restaurants \| MenuList | Checklist for one stable menu URL across QR, Google, WhatsApp, Instagram, websites, print assets, screens, and branches |
| `/resources/restaurant-qr-menu-mistakes` | Common QR Menu Mistakes Restaurants Should Avoid \| MenuList | Avoid stale PDFs, tiny QR codes, missing fallback URLs, slow mobile pages, branch mismatches, and untested QR placements |
| `/resources/multi-location-menu-management` | Multi-location Menu Source Control \| MenuList | Explain master menus, outlet overrides, branch price drift, local availability, and public branch link consistency |

### Industry Pages

| URL | SEO title | Main intent |
| --- | --- | --- |
| `/industries/restaurants` | Official Menu Source for Restaurants \| MenuList | Explain MenuList for restaurants that need one approved menu across QR, Google, WhatsApp, websites, print, screens, and public pages |
| `/industries/cafes-bakeries` | Digital Menu Source for Cafes and Bakeries \| MenuList | Explain current menu control for cafes, bakeries, dessert shops, beverage counters, seasonal specials, and print materials |
| `/industries/takeaway-cloud-kitchens` | Public Menu Source for Takeaways and Cloud Kitchens \| MenuList | Explain menu consistency for takeaways, pickup kitchens, cloud kitchens, packaging, WhatsApp, Google, social profiles, and share links |
| `/industries/multi-location-food-businesses` | Multi-location Menu Source Control \| MenuList | Explain master menu, outlet overrides, branch pricing, local availability, QR links, Google links, and public branch pages |

Current implementation note: these live industry pages are food/menu proof pages. They are not the full market boundary. Future broad-SMB proof should add salon/spa/service-list and adjacent local-service workflows only after the demo universe and page depth are approved.

### Localized Resource Pages

Every active reviewed resource locale now has:

- a localized `/resources` hub
- all 15 localized resource article routes
- localized page metadata
- JSON-LD `inLanguage`
- canonical and `hreflang` alternates
- sitemap and LLM context coverage

Locale examples:

| Locale | Example URL |
| --- | --- |
| Hindi | `/hi-IN/resources/official-menu-url-checklist` |
| Tamil | `/ta-IN/resources/restaurant-menu-schema` |
| Telugu | `/te-IN/resources/restaurant-qr-menu-mistakes` |
| Marathi | `/mr-IN/resources/menu-update-checklist` |
| Bengali | `/bn-IN/resources/qr-menu-for-restaurants` |
| Arabic | `/ar-SA/resources/restaurant-qr-menu-mistakes` |
| Spanish | `/es-ES/resources/official-menu-url-checklist` |

---

## 5. SEO Work Completed

### URL Architecture

- Canonical host stays `https://menulist.ai`.
- Resource URLs are evergreen and descriptive.
- Industry URLs are stable and industry-specific.
- Locale resource URLs use the reviewed locale prefix.
- Legacy `/product` redirects to `/how-it-works` and is not listed as a discovery URL.

### Metadata

Each resource and industry page has:

- title
- meta description
- canonical URL
- Open Graph title/description
- URL-specific page purpose
- no fake review or rating metadata

### Sitemap

`public/sitemap.xml` now includes:

- platform/product pages
- `/resources`
- all 15 English resource article URLs
- reviewed localized resource URLs for all active resource languages
- four industry pages
- `hreflang` alternates for resource pages

### Internal Linking

The resource system now links across clusters:

- menu engineering links to official source, digital/PDF, QR, checklist, and worksheet topics
- QR pages link to PDF, placement, official source, and Google menu content
- Google menu pages link to official source, restaurant menu SEO, and digital/PDF content
- AI search content links to restaurant menu SEO, official source, Google menu, and structured menu concepts
- multi-location content links to official source, menu update checklist, and branch consistency
- industry pages link back to product CTAs and relevant resources

### Structured Data

Resource pages emit visible-content-aligned structured data:

- `WebPage`
- `Article`
- `BreadcrumbList`
- `FAQPage` only where FAQ content is visible

The resource hub emits hub/list-style structured data.

Industry pages use page-level structured data through the shared website structured-data wrapper.

The schema guidance content also explains these schema families for public menu/business pages:

- `Organization`
- `WebSite`
- `LocalBusiness`
- `Restaurant`
- `Menu`
- `MenuSection`
- `MenuItem`
- `OpeningHoursSpecification`
- `Article`
- `FAQPage`
- `BreadcrumbList`
- `ItemList`

Important rule:

> Structured data must match visible public content. No hidden menu items, fake reviews, fake ratings, invented opening hours, or old prices should be placed in schema.

---

## 6. AEO And AI Search Work Completed

### Public Content Format

Resource articles use an AI-readable structure:

- H1
- short summary
- quick answer box
- table of contents
- definition/problem framing where relevant
- checklist, worksheet, or comparison section where useful
- how MenuList helps
- claim limits
- FAQ
- related pages
- CTA

This format helps readers first. It also gives search and AI systems clearer page structure if they crawl or summarize the page.

### LLM Context Files

Added or updated:

- `public/llms.txt`
- `public/llms-full.txt`

These files describe:

- what MenuList is
- preferred official-source positioning
- core product pages
- resource pages
- industry pages
- what not to call MenuList
- claim limits
- the fact that external systems decide what they crawl, cite, show, summarize, or ignore

### AI/Search Crawler Policy

Robots/crawler policy keeps public website resources discoverable while protecting private or internal routes.

Public marketing/resource/industry pages are allowed.

Private/app/admin/API/auth/internal routes remain blocked or controlled.

Named search/AI crawler considerations include:

- Googlebot
- Google-Extended
- OAI-SearchBot
- GPTBot
- ChatGPT-User
- ClaudeBot
- Claude-SearchBot
- Claude-User
- PerplexityBot
- Perplexity-User
- CCBot
- Bing/Copilot-style discovery via standard search/indexing signals

Marketing note:

> Allowing a crawler does not guarantee that a page will be indexed, ranked, cited, summarized, or shown in an AI answer.

---

## 7. Analytics And Measurement

### Events Added Or Confirmed

| Event | What it measures |
| --- | --- |
| `resource_page_view` | Reader lands on a resource page |
| `resource_primary_cta_click` | Reader clicks primary resource CTA |
| `resource_secondary_cta_click` | Reader clicks secondary resource CTA |
| `resource_related_click` | Reader moves to a related resource |
| `resources_hub_card_click` | Reader clicks a hub card |
| `homepage_resource_card_click` | Reader clicks a homepage resource card |
| `ai_crawler_referral_detected` | Public resource visit comes from visible AI/search referrer patterns |
| `upload_menu_click_from_resource` | Reader moves from resource to upload flow |
| `pricing_click_from_resource` | Reader moves from resource to pricing |
| `resource_checklist_copy` | Reader copies a visible checklist |

Tracked referrer focus:

- `chatgpt.com`
- `chat.openai.com`
- `perplexity.ai`
- `claude.ai`
- `google.com`
- `bing.com`
- `copilot.microsoft.com`

Main KPI:

> Resource reader to upload menu click.

Secondary KPI:

> Resource reader to pricing click.

Quality KPI:

> Checklist copy and related-resource movement, because these indicate the content is useful before conversion.

---

## 8. What The Marketing Team Should Review

### Positioning Review

Check whether these concepts are clear enough:

- MenuList is the current approved menu source layer.
- Menu engineering starts with the menu customers actually see.
- QR menus are only useful if the destination menu stays current.
- PDFs and print files are useful backups, not the main public source.
- Google/menu links should point toward one official menu URL where possible.
- Search and AI systems need crawlable public information, but visibility is not guaranteed.
- Multi-location businesses need master menu governance plus outlet-level control.

### Page Title Review

Marketing should review:

- Are page titles owner-readable?
- Are important search terms present without sounding spammy?
- Are titles too long for target SERP display?
- Should any title use `restaurant`, `cafe`, `takeaway`, `cloud kitchen`, or `multi-location` more directly?
- For broad-SMB pages, should the page use `salon`, `spa`, `service list`, `package list`, `price list`, `rate card`, or `local service` only when the workflow depth is real?
- Should `Official Menu Source` or `Current Approved Menu` be the dominant phrase?
- Should `Official Customer Link` or `Current Customer-Facing List` be the broader non-food phrase?

### Missing Content Review

Possible additions if marketing wants broader coverage:

The accepted direction after team feedback is captured in [Marketing Feedback Review - June 2, 2026](#9-marketing-feedback-review---june-2-2026). Treat the table below as the original candidate pool, not an equal-priority backlog.

| Candidate | Why it may help | Keep in same positioning |
| --- | --- | --- |
| `/resources/restaurant-menu-cleanup-checklist` | Strong owner pain around old PDFs, Google photos, social links, QR cards, and staff files | Focus on cleanup before publishing |
| `/resources/menu-link-for-whatsapp` | WhatsApp is a real distribution surface for SMBs | One stable official menu URL, not messaging automation |
| `/resources/instagram-menu-link` | Many owners use Instagram bio/highlights for menu access | Avoid social-growth guarantees |
| `/resources/menu-price-change-checklist` | Clear owner workflow around price changes | Review before publishing, update every surface |
| `/resources/branch-menu-consistency-checklist` | Deepens multi-location usefulness | Master menu plus branch overrides |
| `/resources/service-list-cleanup-checklist` | Broadens beyond restaurants with salon, spa, studio, clinic, repair, and local-service list cleanup | Same official customer link thesis; no thin category page |
| `/resources/service-price-list-checklist` | Clear owner workflow around services, packages, rates, and price changes | Review before publishing, update public surfaces |
| `/industries/salons-spas` | Proves MenuList is not restaurant-only where services, packages, prices, photos, WhatsApp, Instagram, and QR links matter | Current service list plus official customer link |
| `/industries/local-services` | Covers repair shops, studios, clinics, classes, and other list-driven local businesses | Keep broad but specific; avoid generic local-business page-builder copy |
| `/industries/bars-pubs` | Bars need drinks, happy hours, temporary availability, and QR/table menus | Current approved public menu source |
| `/industries/food-trucks` | Food trucks have changing locations and availability | Current menu plus clear customer-facing link |
| `/compare/qr-menu-maker-vs-official-menu-source` | Differentiates from generic QR tools | Be factual, not hostile |
| `/compare/pdf-menu-vs-menulist` | Strong conversion page for old PDF owners | Explain PDF as backup, not enemy |

Do not add these unless there is a real content owner and review cycle:

- generic blog
- thin city pages
- fake case studies
- fake reviews
- AI visibility claim pages
- SEO guarantee pages

### Localization Review

The active resource locale packs are complete and verifier-approved, but marketing/native speakers can still improve tone.

Review questions:

- Does Hindi/Tamil/Telugu/Marathi/Bengali copy sound natural to local owners?
- Should some English product phrases remain untranslated for clarity?
- Does Arabic RTL layout read correctly on mobile?
- Should Spanish pages target Spain, Latin America, or a neutral restaurant-owner tone?

### CTA Review

Current CTA direction is:

- resource pages: mostly upload/create official source
- checklist pages: use checklist and then create/update source
- industry pages: upload current menu or see how it works
- homepage resources: education bridge, not blog index

Marketing should check:

- Are CTAs too repetitive?
- Should checklist pages have more "copy/check" language before upload?
- Should industry pages route more strongly to `/create-menu` or `/how-it-works`?

---

## 9. Marketing Feedback Review - June 2, 2026

### Verdict

The team feedback is useful and should be accepted as the marketing-quality baseline for this release. It validates the current direction without changing the product positioning:

> MenuList gives every public surface one current approved menu source, so customers, staff, QR codes, Google links, WhatsApp links, branch pages, websites, print assets, screens, search engines, and AI/search systems are less likely to work from stale menu information.

This feedback should not be treated as a signal to create a generic content library immediately. The right next work is a quality pass on the highest-value pages, followed by tightly scoped page additions where there is a clear owner pain and a real MenuList-fit CTA.

### Accepted Quality-Pass Priorities

These priorities were accepted for the current live menu/food route set. After the June 22, 2026 founder direction, the next planning pass must review broad-SMB fit before adding another food-only expansion.

| Priority | Page / cluster | Why it matters | Marketing review job |
| --- | --- | --- | --- |
| 1 | `/resources/official-menu-source` | Category-definition page for the official menu source concept | Make the concept sharp, owner-readable, and conversion-aware |
| 2 | `/resources/menu-source-audit` | Strong diagnostic pain around stale menu copies | Tighten checklist usefulness and path to upload current menu |
| 3 | `/resources/google-business-profile-menu` | High search intent with real SMB confusion | Keep Google claims careful; emphasize one clear menu URL |
| 4 | `/resources/qr-menu-for-restaurants` | Prevents MenuList from being reduced to a QR menu maker | Position QR as a surface that needs a current destination |
| 5 | `/industries/restaurants` | Main industry proof page | Connect restaurant pain to workflow and CTA cleanly |
| 6 | `/resources/multi-location-menu-management` | Stronger commercial intent for growing operators | Clarify master menu, outlet overrides, and branch consistency |

### Accepted Missing-Page Candidates

These are useful additions, but only after the core pages above are polished enough to carry the category.

Current implementation note: the core English pages listed above have now received the live quality pass. `/industries/salons-spas` is now a placeholder-backed live route, and `/industries/service-list-businesses` plus `/industries/local-service-businesses` were added as placeholder-backed broad-SMB industry routes. The resource/checklist candidates below are still not live routes.

| Candidate | Recommendation | Reason | Guardrail |
| --- | --- | --- | --- |
| `/resources/menu-link-for-whatsapp` | Add | WhatsApp is a real SMB distribution surface and fits the one official URL thesis | Do not position as WhatsApp automation |
| `/resources/menu-price-change-checklist` | Add | Price changes create immediate public trust and staff/customer mismatch risk | Keep it operational: review, publish, update public surfaces |
| `/resources/restaurant-menu-cleanup-checklist` | Add | Clear top-of-funnel diagnostic for old PDFs, menu photos, QR cards, and social links | Focus on cleanup before publishing, not SEO guarantees |
| `/resources/service-list-cleanup-checklist` | Add after demo proof | Strong bridge for salons, spas, studios, clinics, repair shops, and other list-driven SMBs | Needs concrete examples; do not make a generic service-business SEO article |
| `/resources/service-price-list-checklist` | Add after demo proof | Supports package/rate-card businesses and broad price-list maintenance | Keep it operational, not ranking-led |
| `/industries/salons-spas` | Added as placeholder-backed route | Required proof that MenuList is not restaurant-only | Replace placeholder proof with routed screenshots before broad campaign use |
| `/compare/pdf-menu-vs-menulist` | Add carefully | High conversion intent for owners stuck with old PDFs | Treat PDF as a useful backup/export, not as the enemy |
| `/compare/qr-menu-maker-vs-official-menu-source` | Add after core polish | Good differentiation page | Avoid hostile comparison language and "best QR menu maker" framing |

### Deferred For Now

Do not prioritize `/industries/bars-pubs`, `/industries/food-trucks`, or additional broad local-service pages in this release unless MenuList is ready to support those verticals with specific examples, workflows, screenshots, and CTAs. The newly added salon/spa, service-list, and local-service industry routes are placeholder-backed; final campaign use still requires routed screenshots or permissioned proof. Thin industry pages would weaken the product-led website and create avoidable SEO risk.

### Language Decision

Use both phrases, with distinct jobs:

| Phrase | Job |
| --- | --- |
| `Official Menu Source` | Category concept and page/title language |
| `current approved menu` | Owner-readable explanation of what the business keeps up to date |

Recommended pattern:

> MenuList is the official menu source for your current approved menu.

This keeps the category strong while making the operational value clear to restaurant owners.

### What This Feedback Does Not Change

- No ranking guarantees.
- No AI visibility guarantees.
- No "generic AI restaurant software" positioning.
- No attack on PDF menus or QR tools.
- No thin industry pages.
- No generic blog expansion.
- No fake case studies, metrics, testimonials, or logo claims.

---

## 10. Business Truth Page Strategy Review - June 2, 2026

### Verdict

This feedback is strategically useful, but it belongs to the customer-facing business-page layer, not the marketing resources layer.

The useful insight is:

> MenuList should win long-tail discovery through accurate, structured, current business truth pages, not through many AI-written SEO articles.

That direction matches the product thesis better than generic SEO content. MenuList already has customer/tenant public surfaces, OBP schema, menu schema, tenant sitemaps, tenant robots, and structured public menu output. The missing strategic decision is whether unclaimed or weak public business records should ever be indexed, and what minimum data threshold they must pass.

### What Transfers

| External idea | MenuList translation |
| --- | --- |
| Win specific underserved queries | Serve real branded business-truth queries such as `[restaurant name] menu`, `[restaurant name] hours`, `[restaurant name] prices`, and `[restaurant name] order online` |
| Publish pages that answer intent | Publish durable public business/menu records that answer customer intent directly |
| Use AI-era answer formatting | Use crawlable visible facts, direct summary blocks, freshness labels, schema, and canonical URLs |
| Compound from long-tail traffic | Convert impressions into owner claim/update behavior, not just pageviews |

### What Does Not Transfer

Do not use this as a reason to create keyword-variant pages.

Avoid:

- one page per query variation
- AI-generated city/category pages without real supply density
- scraped menu pages with no owner value
- unverified price/hour pages
- pages created mainly to manipulate ranking
- separate thin pages like `/restaurant-name-menu-prices-2026`

Google's spam policies call out scaled content abuse when many pages are generated primarily to manipulate search rankings rather than help users. The safe MenuList version is one durable page per real business, menu, outlet, or real customer task.

Reference:

- Google spam policies: https://developers.google.com/search/docs/essentials/spam-policies

### Correct MenuList Adaptation

MenuList should think in this order:

1. Claimed or owner-approved business truth page.
2. Visible customer-useful facts.
3. Schema that matches visible facts.
4. Sitemap inclusion only after the public record clears quality gates.
5. Claim/update CTA for owners.
6. Search Console and owner-acquisition measurement.

The page should behave like a public record, not an article.

Strong page object:

- business name
- address or service area
- phone or official contact path
- current hours
- open/closed status where reliably available
- current menu URL or structured menu data
- prices where owner-approved and visible
- cuisine/category
- dietary or service tags only when supported by real menu/business data
- official website, order, reservation, WhatsApp, directions links where available
- last-updated or verified timestamp
- source/confidence state

### Indexing Gate

This should not be implemented as "index everything."

Recommended rule:

| State | Search policy |
| --- | --- |
| Owner-approved or claimed record with menu, hours, contact, category, and freshness | `index, follow` |
| Active tenant page with enough visible menu/business facts but not fully verified | Consider index only if source/confidence state is visible and not misleading |
| Starter, expired, incomplete, imported, draft, weak, or unclaimed public record | `noindex, follow` or keep out of sitemap |
| Keyword-variant page with no unique real-world object/task | Do not create |

This is the most important operational guardrail. Traffic without verified data creates a content business. Verified public truth with search distribution strengthens MenuList infrastructure.

### Schema Direction

The right schema priority is LocalBusiness/Restaurant/Menu, not FAQ schema as a growth lever.

Use:

- `Restaurant` or most specific `LocalBusiness` subtype
- `PostalAddress`
- `GeoCoordinates`
- `OpeningHoursSpecification`
- `servesCuisine`
- `priceRange`
- `telephone`
- `url`
- `menu` / `hasMenu`
- `sameAs`
- `BreadcrumbList`
- `Menu`, `MenuSection`, `MenuItem` where visible content supports it

Keep structured data aligned with visible page content. Google's structured-data guidelines say JSON-LD is supported and recommended, but structured data must represent visible content, be current, and not be misleading. Google also says structured data does not guarantee search features.

References:

- Google structured data guidelines: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Google LocalBusiness structured data: https://developers.google.com/search/docs/appearance/structured-data/local-business

### FAQ Schema Note

FAQ content can still be useful for owners and customers, but FAQ schema should not be treated as a primary Google rich-result lever. Google's FAQ structured-data documentation now carries an upcoming deprecation notice for FAQ rich-result support, and the stronger MenuList lever is accurate LocalBusiness/Restaurant/Menu data.

Reference:

- Google FAQ structured data: https://developers.google.com/search/docs/appearance/structured-data/faqpage

### AI Search Implication

This feedback is directionally right for AI search if it is kept grounded.

Google says AI features such as AI Overviews and AI Mode use normal SEO fundamentals, require index eligibility for supporting links, may use query fan-out, and do not require special AI files or special schema. Therefore MenuList should optimize public business pages for:

- indexable and crawlable pages
- visible textual facts
- clear entity structure
- structured data that matches visible content
- up-to-date public business/menu information
- internal links and sitemaps
- owner-reviewed freshness

Reference:

- Google AI features and websites: https://developers.google.com/search/docs/appearance/ai-features

### Product Boundary Decision

Do not implement this through `src/app/(website)/resources`.

The first durable guardrail has now been implemented in the customer-facing public page layer:

- `src/lib/seo/publicTruthIndexing.ts`
- `src/app/client/[[...slug]]/page.tsx`
- `src/app/client/sitemap.ts`
- `src/app/client/obp/OBPResolvedSurface.tsx`

What changed:

- Public tenant page metadata now uses a central indexability gate.
- Weak, expired, blocked, starter, or incomplete public truth records receive `noindex, follow`.
- Per-tenant sitemap output now includes OBP/menu/outlet URLs only when the same public truth gate passes.
- OBP runtime no longer emits generated hidden FAQPage JSON-LD; the primary schema signal remains LocalBusiness/Restaurant/Menu-style business records.

This work belongs to:

- tenant/customer public menu routes
- Official Business Page rendering
- client sitemap policy
- client robots policy
- owner claim/update workflow
- public visibility/indexability rules
- schema helpers
- Search Console and analytics reporting

This remains separate from the marketing content release. It is a product/discovery quality guardrail on existing public tenant pages, not a new content cluster.

### Recommended Next Decision

Before building any new programmatic pages beyond already-owned tenant/OBP/menu surfaces, decide:

- What qualifies a business page as owner-approved or verified?
- Whether unclaimed business records should exist publicly at all.
- How does an owner claim/update a page surfaced by search?
- What source/confidence labels must be visible?
- How are stale prices, hours, and menu files removed or downgraded?
- Which geography/category should be tested first?

Until those are settled, do not create city/category directory pages or keyword-variant business pages.

---

## 11. What We Intentionally Did Not Do

- No `/blog` route.
- No gated lead magnets.
- No fake downloadable templates.
- No newsletter wall.
- No invented testimonials.
- No fake ranking metrics.
- No AI visibility guarantee.
- No food delivery marketplace language.
- No POS replacement language.
- No owner dashboard, auth, or billing change.
- No public menu rendering/content change beyond metadata, sitemap, and schema hygiene.
- No Firebase rules, indexes, Storage, or Cloud Function changes.
- No Vercel deployment.
- No programmatic unclaimed business directory.
- No indexed keyword-variant restaurant pages.

---

## 12. Verification Completed

Commands passed:

```bash
npm run verify:website-resource-locales
npm run verify:agent-readiness
npm run lint
npx tsc --noEmit --incremental false
git diff --check
```

Local route smoke passed:

- `/resources/restaurant-menu-schema`
- `/resources/official-menu-url-checklist`
- `/resources/restaurant-qr-menu-mistakes`
- `/industries/restaurants`
- `/hi-IN/resources/official-menu-url-checklist`
- `/ar-SA/resources/restaurant-qr-menu-mistakes`

Browser smoke passed through the available Chrome browser backend:

- `/resources` hub rendered.
- Three new English resource pages rendered.
- `/industries/restaurants` rendered.
- Pages had expected H1 text.
- JSON-LD was present.
- No not-found body appeared.
- Checklist pages exposed copy buttons.

---

## 13. Source Files For Marketing And SEO Review

Main content:

- `src/content/websiteResources/en-US.ts`
- `src/content/websiteResources/locales/`
- `src/content/websiteIndustries.ts`

Routes:

- `src/app/(website)/resources/page.tsx`
- `src/app/(website)/resources/[slug]/page.tsx`
- `src/app/(website)/[locale]/resources/page.tsx`
- `src/app/(website)/[locale]/resources/[slug]/page.tsx`
- `src/app/(website)/industries/*/page.tsx`

Discovery:

- `src/lib/seo/discoveryPolicy.ts`
- `src/lib/seo/publicTruthIndexing.ts`
- `src/app/client/sitemap.ts`
- `src/app/client/[[...slug]]/page.tsx`
- `src/app/client/obp/OBPResolvedSurface.tsx`
- `public/sitemap.xml`
- `public/llms.txt`
- `public/llms-full.txt`

Docs:

- `__docs__/main-website/main-website_resources-plan.md`
- `__docs__/main-website/main-website_resources-validation.md`
- `__docs__/main-website/main-website_seo-aeo.md`
- `__docs__/discovery-infrastructure/public-truth-indexing-policy.md`

---

## 14. Marketing Team Review Prompt

Use this when sharing the brief:

```text
Please review MenuList's SEO/AEO resource and industry content layer.

Focus on:
1. Are we clearly positioned as the current approved menu source layer, not a generic QR menu maker?
2. Are the page titles and topics strong enough for restaurant, cafe, takeaway, cloud kitchen, and multi-location owner search intent?
3. Are any important resource or industry pages missing?
4. Are any titles too broad, too technical, or too similar?
5. Are CTAs strong but still honest?
6. Are we avoiding ranking, AI visibility, Google refresh, revenue, POS, and delivery marketplace guarantees?
7. Which pages should be improved first for marketing quality, not just technical coverage?

Please suggest missing pages, title changes, CTA changes, and content gaps. Do not suggest fake testimonials, fake metrics, ranking guarantees, or generic AI-powered positioning.
```

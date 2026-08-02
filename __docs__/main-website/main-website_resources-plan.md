# MenuList Main Website Resources Plan

**Status:** Implemented - website resources layer, industry pages, and June 2 discovery/navigation hardening applied
**Created:** June 1, 2026
**Implemented:** June 1, 2026
**Owner:** Main website
**Source input:** ChatGPT conversation in `/Users/danny/.codex/attachments/7f662f37-2c67-455a-9818-2db451091016/pasted-text.txt`

---

## Executive Decision

The ChatGPT conversation is directionally useful, but it should not be executed as-is.

Recommended decision: **partial accept**.

Build a complete MenuList Resources and AI discovery content layer as one release scope, but keep it grounded in the existing website architecture and current discovery infrastructure. Do not create a generic blog, do not switch canonical URLs to `menulist.online`, and do not add duplicate robots or LLM routes.

Core release outcome:

> MenuList should have a public, human-readable, crawler-readable Resources layer that explains one current approved menu source across QR, Google/menu links, PDFs, public pages, multi-location control, and AI/search discovery.

This plan has been implemented in the public website layer. Runtime scope stayed limited to the MenuList marketing website, resource content registry, discovery files, and verification script.

Implemented files:

```text
src/app/(website)/resources/page.tsx
src/app/(website)/resources/[slug]/page.tsx
src/app/(website)/industries/*/page.tsx
src/components/website/resources/
src/components/website/industries/
src/components/website/home/ResourcesSection.tsx
src/content/websiteResources/
src/content/websiteIndustries.ts
src/lib/website/resourceSchema.ts
src/lib/seo/discoveryPolicy.ts
public/sitemap.xml
public/robots.txt
public/llms.txt
public/llms-full.txt
scripts/verification/verify-agent-readiness.js
```

June 2, 2026 update; analytics wording refreshed June 26, 2026; checklist-copy handoff hardened June 30, 2026: the resource layer was hardened after live-site review and current crawler/source-control research. The website now uses a desktop Resources dropdown, mobile nested resource links, the requested eight-card homepage resources block, footer links aligned to the core resource set, grouped robots rules for named search/AI crawlers plus generic crawlers, `CCBot` in the discovery allowlist, LLM positioning limits, and consent-gated website resource conversion/referrer events. The complete release scope now includes 15 resource articles, four industry landing pages, reviewed locale coverage for the expanded resource set, and checklist-copy measurement where visible checklist UI exists. Checklist copy now waits for Clipboard API success or acknowledged textarea fallback success before copied state or `resource_checklist_copy` analytics, including when Clipboard API exists but rejects the write; failed browser-local handoffs log bounded support/presence metadata only.

---

## Ground Truth Evidence

| Area | Current repo truth | Evidence |
| --- | --- | --- |
| Canonical website host | Production discovery canonical is `https://menulist.ai`. `menulist.online` is the production customer-link root: exact apex/`www` redirect to `menulist.ai`, while tenant subdomains under `*.menulist.online` serve customer menus/OBP. MenuList QA uses `qa.menulist.digital`. | `__docs__/main-website/main-website_seo-aeo.md:12`, `src/constants/deploymentTargets.ts` |
| Current website routes | Active platform routes, resource routes, and industry pages are registered through `PLATFORM_DISCOVERY_PAGES` and resource/locale route registries. | `src/lib/seo/discoveryPolicy.ts`, `src/content/websiteResources/`, `src/content/websiteIndustries.ts` |
| Sitemap architecture | Platform sitemap is generated from `PLATFORM_DISCOVERY_PAGES`; client menus stay out of the platform sitemap. | `src/app/sitemap.ts:20`, `src/app/sitemap.ts:30` |
| Static discovery file | `public/sitemap.xml` is also verified directly by the agent-readiness script. | `scripts/verification/verify-agent-readiness.js:134`, `scripts/verification/verify-agent-readiness.js:176` |
| Robots policy | `public/robots.txt` already allows core AI/search crawlers and points to `https://menulist.ai/sitemap.xml`. | `public/robots.txt:1`, `public/robots.txt:43` |
| LLM context | `public/llms.txt` and `public/llms-full.txt` already define public fact access, action boundaries, unknown handling, and claim limits. | `public/llms.txt:7`, `public/llms.txt:35` |
| AI/AEO doctrine | Public wording must say MenuList prepares clearer public sources; it must not promise rankings, citations, or placement. | `__docs__/main-website/main-website_seo-aeo.md:6` |
| Existing agent boundary | Agents may read public facts and route to official handoffs, but must not edit business truth or infer sensitive/missing claims. | `__docs__/main-website/main-website_seo-aeo.md:250`, `__docs__/main-website/main-website_seo-aeo.md:260` |
| Header architecture | Header is a client component with a simple `navItemKeys` array, no existing dropdown system. | `src/components/website/Header.tsx:22` |
| Footer resources | Footer currently labels a Resources column but links only About, Contact, and Trust & Security. | `src/components/website/Footer.tsx:25` |
| Homepage composition | Homepage remains compressed and product-led, with a lower-page resource bridge instead of a blog index. | `src/components/website/home/HomePage.tsx`, `src/components/website/home/ResourcesSection.tsx` |
| Website i18n rule | Website copy uses the `Website` namespace through `useTranslations`. | `.codex/workflows/website.md:16` |
| Website validation | Agent-readiness verification is a first-class check for discovery changes. | `__docs__/main-website/main-website_seo-aeo.md:292` |

Deployment note: smoke the production website on `https://menulist.ai`; smoke MenuList QA/staging on `https://qa.menulist.digital`. Do not use `menulist.online` as a website preview host because its exact apex/`www` hosts are reserved for production redirects and `*.menulist.online` is reserved for customer public menu/OBP links.

---

## External Source Check

The current AI-era direction is valid, with corrections.

| Claim area | Current source-backed reality | Planning impact |
| --- | --- | --- |
| Google AI features | Google says normal SEO fundamentals still matter for AI Overviews/AI Mode: crawlability, internal links, textual content, page experience, visible-text-aligned structured data, and up-to-date Business Profile information. Google also says no special AI text file or special schema is required. | Build clear HTML resource pages and schema, but do not claim `llms.txt` is required for Google AI features. |
| Google-Extended | Google-Extended is a control token for Gemini/Vertex training and grounding use; it does not affect Google Search inclusion or ranking. | Keep a deliberate policy decision. Current repo allows it; do not describe it as a ranking lever. |
| OpenAI crawlers | OpenAI separates `OAI-SearchBot`, `GPTBot`, `ChatGPT-User`, and `OAI-AdsBot`; `OAI-AdsBot` is for OpenAI ad validation, not ordinary search indexing. | Keep all four in policy. Do not describe `OAI-AdsBot` as an AI-search ranking or citation lever. |
| Anthropic crawlers | Anthropic documents `ClaudeBot`, `Claude-User`, and `Claude-SearchBot`. | Current repo only lists `ClaudeBot`; implementation should add `Claude-User` and `Claude-SearchBot` to discovery policy and robots if approved. |
| Perplexity crawlers | Perplexity documents `PerplexityBot` and `Perplexity-User`; `Perplexity-User` is user-triggered and generally ignores robots.txt. | Add `Perplexity-User` for WAF/logging allowlist clarity, but do not rely on robots.txt as an access guarantee for user-triggered fetches. |
| Common Crawl | Common Crawl documents `CCBot` and robots blocking instructions. | Optional policy addition. Allowing `CCBot` is a business/content-reuse decision, not required for MenuList discovery. |
| Structured data | Google warns structured data must represent visible page content and does not guarantee rich-result display. | Resource schema must match visible text only; no fake ratings, fake reviews, hidden FAQ, or invented author authority. |

Primary sources reviewed:

- [Google Search Central: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google Search Central: common crawlers and Google-Extended](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)
- [Google Search Central: structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots)
- [Anthropic crawler documentation](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- [Perplexity crawler documentation](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)
- [Common Crawl CCBot documentation](https://commoncrawl.org/ccbot)

---

## Market Pattern Findings

Fresh research on current restaurant marketing, SEO, QR menu, and menu engineering content shows a clear pattern: the useful winners are not generic blog posts. They are evergreen resource hubs, practical worksheets, checklists, comparison pages, and tool-like pages that answer a narrow owner problem and route the owner toward the product.

| Market pattern | Evidence reviewed | MenuList decision |
| --- | --- | --- |
| Restaurant growth sites organize content into topic hubs, categories, and most-recent educational pages. | Owner.com runs a restaurant marketing blog with local SEO, website, social, software, and data categories, plus current 2026 posts. | Build `/resources` as a structured hub, not a date-based blog. |
| Competitors frame the restaurant website as the central hub that connects search, social, ads, and direct customer action. | Owner.com's 2026 digital marketing playbook positions the website as the hub behind search, social, and repeat-customer channels. | MenuList resources should point every lesson back to one official menu source, not to isolated SEO tactics. |
| Google menu management is a real owner pain, especially with menu photos, PDFs, menu URLs, customer-uploaded photos, preferred sources, and transcription. | Google Business Profile Help documents menu photos/PDF uploads, menu URL editing, customer-uploaded obsolete menu photos, preferred menu source selection, and menu transcription. | Keep `/resources/google-business-profile-menu` and add explicit old-menu cleanup guidance inside it. |
| Menu engineering content works best when it includes worksheets, templates, and item-level review structure. | Toast's menu engineering course includes menu engineering analysis, online menus, growth changes, templates, and a worksheet. | Keep `/resources/menu-engineering-worksheet` as an HTML-first worksheet before adding downloads. |
| QR menu pages convert when they combine setup, placement, scan testing, FAQ, and related product links. | UpMenu's QR page covers setup, table placement, window placement, packaging/receipt placements, FAQ, and platform links. | Keep `/resources/qr-code-placement-checklist` and make it practical enough to share with printers/staff. |
| Many restaurant-tech pages use high-growth claims, revenue claims, or aggressive ranking language. | Several competitor pages lean on sales uplift, direct-order growth, app/order claims, or SEO dominance framing. | MenuList should avoid copying aggressive claims. The safer wedge is "one current approved menu source customers can trust." |

---

## Source-Backed Strategic Decisions

| Decision | Owner rationale | Website/AEO rationale |
| --- | --- | --- |
| Build evergreen resources before a blog. | Owners need stable answers they can use today, not a publishing feed they must interpret. | Evergreen URLs accumulate internal links, schema, and LLM-readable context without requiring a content calendar. |
| Add a Menu Source Audit page to the release. | It turns the scattered-menu problem into a self-check owners can complete immediately. | It creates a MenuList-native, high-intent resource that competitors are less likely to own. |
| Keep tools and templates ungated in the first release. | Busy SMB owners should not trade an email before seeing value. | Ungated HTML is crawlable, shareable, and useful for answer engines. |
| Add quick-answer blocks to every resource. | Owners get the answer before reading the full page. | Clear answer blocks improve snippet, AI summary, and internal linking usefulness without special AI tricks. |
| Add related resources and intent-matched CTAs. | The owner can move from education to action without hunting. | Internal links help crawlers understand the resource cluster and canonical topic relationships. |
| Create a distribution pack alongside implementation. | Founder, WhatsApp, printer, and partner outreach needs short reusable copy. | Distribution should not depend only on organic search. Search, social, partner, and product-led loops should reinforce each other. |

---

## Additional Useful Additions

These additions are now part of the recommended plan because they directly support marketing, distribution, SEO, AEO, and owner usefulness.

1. **Menu Source Audit route:** Add `/resources/menu-source-audit` as the most MenuList-specific resource. It should help an owner check every place an old menu might still exist: Google, QR codes, WhatsApp shares, Instagram bio, website, staff files, printed PDFs, delivery links, branch copies, and table displays.
2. **HTML-first tools and templates:** Treat checklists and worksheets as visible page content first. Downloads can come later only if they are designed, QA'd, and do not hide the useful content behind a form.
3. **Google old-menu cleanup block:** The Google Business Profile page should include a step-by-step cleanup checklist for old photos, old PDFs, menu links, preferred menu source, and what MenuList cannot force Google to update.
4. **Distribution snippets:** For each major resource cluster, prepare 2-3 short social/WhatsApp/LinkedIn snippets in docs or content metadata. Use them for founder posts, customer onboarding, QR printer partners, and city-density outreach.
5. **Partner-facing checklist variants:** The QR placement checklist should be useful for printers, consultants, and staff, not only for the owner. This supports non-search distribution.
6. **AEO answer blocks:** Every page needs a short plain answer, a "what MenuList does" block, a "what MenuList does not control" block where relevant, and visible FAQ content only when useful.
7. **Internal proof links:** Resource pages should link back to live product pages such as `/features`, `/how-it-works`, `/multi-location`, `/create-menu`, and official menu/customer preview proof where appropriate.
8. **No gated lead magnet in v1:** Do not add an email gate or newsletter wall in the first execution. Use the resource content itself as acquisition proof.

---

## ChatGPT Conversation Verdict

| ChatGPT suggestion | Verdict | Decision |
| --- | --- | --- |
| Add a Resources section around menu engineering, QR menus, Google menu links, PDF replacement, SEO, and official menu source | Accept | This fills a real website gap and supports the current official-source positioning. |
| Create a normal `/blog` and many posts | Reject for first execution | Use evergreen `/resources` pages first. A blog adds maintenance and weakens the product-led website unless there is a publishing system and cadence. |
| Use menu engineering as an entry point | Accept with scope | Position menu engineering as starting from the current menu customers actually see. Do not imply MenuList performs full POS/food-cost profitability engineering unless implemented. |
| Add AI search and crawler readiness | Accept with corrections | The repo already has robots, sitemap, `llms.txt`, `llms-full.txt`, schema, and verifier. Extend those systems instead of creating duplicates. |
| Add `/robots.txt`, `/sitemap.xml`, `/llms.txt` from scratch | Reject as written | Update current `public/robots.txt`, `public/llms.txt`, `public/llms-full.txt`, `public/sitemap.xml`, `src/app/sitemap.ts`, and `src/lib/seo/discoveryPolicy.ts`. |
| Use `www.menulist.online` in sitemap and LLM files | Reject | Canonical discovery must stay `https://menulist.ai`. |
| Add a header Resources dropdown | Accept after June 2 review | Implement a compact desktop dropdown plus mobile nested resource links. Keep the top navigation product-led and do not add a blog-style mega menu. |
| Add resource CTAs to homepage | Accept | Add one compact lower-page section. Do not turn the homepage into a blog index. |
| Track resource CTA and AI/search referrals | Accept with scope | Use consent-gated public marketing website analytics. Plausible receives property-free event names; GA4 compatibility payloads remain optional. Do not write tenant/customer analytics or sensitive data for public resource traffic. |
| Publish resource routes in one complete scope | Accept with additions | Ship the hub plus 15 article routes, including `/resources/menu-source-audit`, schema guidance, official URL checklist, and QR mistake cleanup as MenuList-native conversion assets. |

---

## Release Scope

This should be one complete release scope, not a staged roadmap. The work can be executed in dependency order, but all selected surfaces should ship together.

The implemented release includes 20 public English content routes: the `/resources` hub, 15 resource article routes, and four industry landing pages. Reviewed localized resource URLs also cover all 15 articles for Hindi, Tamil, Telugu, Marathi, Bengali, Arabic, and Spanish.

### Routes

| Route | Purpose | Primary CTA |
| --- | --- | --- |
| `/resources` | Resource hub for menu correctness and discovery education. | Upload your menu |
| `/resources/menu-source-audit` | Self-check for every place an old menu copy may still be visible. | Check your menu sources |
| `/resources/menu-engineering` | Explain practical menu engineering from one current customer-facing menu source. | Upload your current menu |
| `/resources/qr-menu-for-restaurants` | Explain QR setup, placement, testing, and why QR should point to a current source. | Create one official QR menu |
| `/resources/digital-menu-vs-pdf-menu` | Explain PDF strengths and why old PDFs should not be the main public source. | Replace your old PDF menu |
| `/resources/google-business-profile-menu` | Explain Google menu links/photos without promising Google updates or ranking. | Use one official menu link |
| `/resources/official-menu-source` | Define the central MenuList concept for owners. | Create one official menu source |
| `/resources/restaurant-menu-seo` | Explain crawlable menu pages, visible text, metadata, internal links, schema, and caveats. | Publish an official menu page |
| `/resources/ai-search-menu-discovery` | Explain AI/search discovery in owner language with claim limits. | Create one official menu source |
| `/resources/menu-update-checklist` | Checklist before changing prices, availability, sections, photos, and links. | Review your menu source |
| `/resources/qr-code-placement-checklist` | Practical QR placement and scan-testing checklist. | Create one QR menu source |
| `/resources/menu-engineering-worksheet` | Worksheet-style article for item review; can later support a downloadable asset. | Start from your current menu |
| `/resources/restaurant-menu-schema` | Explain visible-content-aligned menu structured data without rich-result promises. | Publish a crawlable menu source |
| `/resources/official-menu-url-checklist` | Checklist for one stable menu URL across QR, Google, WhatsApp, social, print, and screens. | Create one official menu URL |
| `/resources/restaurant-qr-menu-mistakes` | Common QR menu mistakes and stable-link cleanup guidance. | Fix your QR menu source |
| `/resources/multi-location-menu-management` | Explain master menu, outlet overrides, price drift, and branch consistency. | Set up your first location |

### Industry Routes

| Route | Purpose | Primary CTA |
| --- | --- | --- |
| `/industries/restaurants` | Explain MenuList as the official menu source layer for restaurants. | Upload your restaurant menu |
| `/industries/cafes-bakeries` | Explain current menu control for cafes, bakeries, dessert shops, and beverage counters. | Upload your current menu |
| `/industries/takeaway-cloud-kitchens` | Explain public menu consistency for takeaways, pickup kitchens, and cloud kitchens. | Create one public menu source |
| `/industries/multi-location-food-businesses` | Explain branch/outlet menu governance for multi-location food businesses. | Set up location menu control |

### Explicit Non-Scope

- No `/blog` route in this first execution.
- No compare pages yet.
- No downloadable template assets until real files are designed and QA'd.
- No CMS or new dependency.
- No tenant/customer route changes.
- No owner dashboard changes.
- No auth, middleware, Firestore, Firebase Functions, or billing changes.
- No Vercel deployment unless separately requested.

---

## Architecture Plan

### 1. Content Registry

Create a typed, localized resource registry. The registry should drive routes, cards, metadata, schema, sitemap, and LLM context updates.

Implemented files:

```text
src/content/websiteResources/types.ts
src/content/websiteResources/index.ts
src/content/websiteResources/sourceVersion.ts
src/content/websiteResources/buildLocalizedResources.ts
src/content/websiteResources/glossary.ts
src/content/websiteResources/en-US.ts
src/content/websiteResources/hi-IN.ts
src/content/websiteResources/locales/hi-IN.ts
src/content/websiteResources/locales/index.ts
```

Hindi has a reviewed full locale pack. Tamil, Telugu, Marathi, and Bengali must use locale fallback until full reviewed packs pass `npm run verify:website-resource-locales`.

Do not hardcode long article text inside React components. Components should render typed content from the registry.

Proposed shape:

```ts
export type WebsiteResourceCluster =
  | 'menu-engineering'
  | 'qr-menu'
  | 'google-menu'
  | 'menu-seo'
  | 'official-source'
  | 'checklists'
  | 'multi-location'
  | 'ai-discovery'
  | 'source-audit';

export type WebsiteResourceArticle = {
  slug: string;
  cluster: WebsiteResourceCluster;
  title: string;
  metaTitle: string;
  metaDescription: string;
  description: string;
  quickAnswer: string;
  publishedAt: string;
  updatedAt: string;
  readingTime: string;
  primaryCta: { label: string; href: string };
  relatedSlugs: string[];
  sections: Array<{
    id: string;
    title: string;
    body: string[];
    bullets?: string[];
    checklist?: string[];
    comparisonRows?: Array<{ label: string; left: string; right: string }>;
  }>;
  faq?: Array<{ question: string; answer: string }>;
};
```

### 2. Routes And Rendering

Create:

```text
src/app/(website)/resources/page.tsx
src/app/(website)/resources/[slug]/page.tsx
```

Requirements:

- Server-render all important article text.
- `generateStaticParams()` returns every resource slug.
- Invalid slugs call `notFound()` and return noindex metadata; the article route keeps the default dynamic-params behavior because `dynamicParams = false` produced unstable valid-route handling in local Next.js dev.
- `generateMetadata()` sets title, description, canonical, and OG metadata.
- Each resource page includes one H1, visible quick answer, body sections, FAQ when present, related resources, and CTA.
- Add `WebsitePageStructuredData` or resource-specific structured data wrapper in the route.

### 3. Components

Create:

```text
src/components/website/resources/ResourcesHub.tsx
src/components/website/resources/ResourceCard.tsx
src/components/website/resources/ResourceClusterGrid.tsx
src/components/website/resources/ArticleLayout.tsx
src/components/website/resources/ArticleHero.tsx
src/components/website/resources/ArticleQuickAnswer.tsx
src/components/website/resources/ArticleToc.tsx
src/components/website/resources/ArticleChecklist.tsx
src/components/website/resources/ArticleComparisonTable.tsx
src/components/website/resources/ArticleCtaBand.tsx
src/components/website/resources/RelatedResources.tsx
src/components/website/resources/FaqBlock.tsx
```

Use existing website primitives where they fit:

- `WebsiteButton`
- `WebsiteFeatureCard`
- `WebsiteHeadline`
- `SectionWrapper`
- `SectionHeading`
- `AnimateOnScroll`

### 4. Schema

Create:

```text
src/lib/website/resourceSchema.ts
```

Generate only schema that describes visible page content:

- `WebPage`
- `Article`
- `BreadcrumbList`
- `FAQPage` only when FAQ is visible
- `ItemList` on `/resources`

Do not add:

- Review schema
- AggregateRating schema
- Hidden FAQ schema
- Fake author credentials
- Unsupported restaurant/customer schema on platform resource pages

### 5. Discovery Registries

Update existing discovery files, not duplicate them.

Code and static files to update:

```text
src/lib/seo/discoveryPolicy.ts
src/app/sitemap.ts
public/sitemap.xml
public/robots.txt
public/llms.txt
public/llms-full.txt
scripts/verification/verify-agent-readiness.js
```

Planned additions:

- Add every resource route to `PLATFORM_DISCOVERY_PAGES`.
- Add every resource route to `public/sitemap.xml`.
- Add resource page entries to `public/llms.txt`.
- Add a concise Resources section to `public/llms-full.txt`.
- Add `Claude-User`, `Claude-SearchBot`, and `Perplexity-User` to discovery policy if crawler policy is approved.
- Decide whether to add `CCBot`; this is optional and should be treated as a content reuse policy choice.
- Keep all discovery URLs on `https://menulist.ai`.

### 6. Navigation, Footer, Homepage

Header:

- Use the product-led order: Features, How it works, Multi-location, Pricing, Resources.
- Keep `Resources` as a compact dropdown on desktop, backed by nested mobile links in the drawer.
- Dropdown links: Menu Engineering, QR Menu Guide, Digital Menu vs PDF, Google Menu Guide, Restaurant Menu SEO, AI Search & Menu Discovery, Official Menu Source, All Resources.

Footer:

- Resource links: Menu Engineering, QR Menu for Restaurants, Digital Menu vs PDF, Google Business Profile Menu, Restaurant Menu SEO, AI Search & Menu Discovery, Official Menu Source, Trust & Security.

Homepage:

- Add a compact section near the lower half, before FAQ or final CTA.
- Proposed title: `Learn how to keep your public menu current`
- Cards:
  - Menu engineering
  - QR menu setup
  - Digital menu vs PDF
  - Google menu source
  - Restaurant menu SEO
  - AI search and menu discovery
  - Official menu source
  - Multi-location menu control
- Keep the hero, primary CTA, and product proof unchanged.

### 7. Analytics

Use marketing-page GA4 events only where practical. Avoid Firebase customer/tenant analytics writes for anonymous resource traffic.

Proposed events:

- `resource_page_view`
- `resource_primary_cta_click`
- `resource_secondary_cta_click`
- `resource_related_click`
- `resources_hub_card_click`
- `homepage_resource_card_click`
- `ai_crawler_referral_detected`
- `upload_menu_click_from_resource`
- `pricing_click_from_resource`
- `resource_checklist_copy` for visible checklist sections with copy UI
- `resource_template_download` only when a real downloadable asset exists

Properties:

- `slug`
- `cluster`
- `category`
- `cta_label`
- `source_page`
- `destination`
- `target_url`
- `locale`
- `referrer`
- `referrer_host`
- `utm_source`
- `utm_medium`
- `entry_page`

Do not store:

- Tenant IDs
- Store IDs
- Customer names
- Emails
- Payment data
- Raw search/query text from external referrers
- Custom third-party session identifiers

### 8. Resource Distribution Pack

Prepare reusable distribution copy during implementation. Keep it in docs or typed content metadata, not as a new CMS requirement.

Recommended assets:

- 3 founder LinkedIn/X post drafts for the Menu Source Audit, Google menu source, and QR placement checklist.
- 3 WhatsApp-ready owner snippets for city/local outreach.
- 2 printer/consultant partner snippets for QR placement and official menu links.
- 1 short launch announcement for `/resources`.
- 1 internal link map showing which resource pages should link to each product page.

Rules:

- No fake performance numbers.
- No guaranteed ranking, citation, or Google update claims.
- No competitor attack pages.
- No private customer examples unless approved.
- Public snippets should use the same official-source language as the website.

### 9. Documentation Sync

If implementation proceeds, update these docs in the same pass:

```text
__docs__/main-website/README.md
__docs__/main-website/main-website_content.md
__docs__/main-website/main-website_impl.md
__docs__/main-website/main-website_marketing.md
__docs__/main-website/main-website_seo-aeo.md
```

Add a changelog entry only when the website routes are actually implemented.

---

## Content Governance

Use:

- official menu source
- current approved menu
- customer-facing version
- clear public menu source
- structured public page
- search and AI systems
- answer engines
- clearer source to read

Avoid:

- generic AI restaurant software
- smart menu engine
- guaranteed Google ranking
- guaranteed AI citation
- rank in ChatGPT
- dominate search
- 10x revenue
- best QR menu maker
- fully automated menu engineering
- automatic Google/Instagram/WhatsApp sync

Required claim caveat for discovery pages:

> MenuList prepares a clearer public source. Search engines, directories, AI assistants, and crawlers decide what they crawl, cite, show, or summarize.

Menu engineering claim limit:

> MenuList can support menu review by keeping the public menu source current. Do not claim full profitability engineering, POS-based item classification, food-cost analysis, or automatic pricing optimization unless that exact capability is implemented and documented.

---

## Page Briefs

### `/resources/menu-engineering`

H1: `Menu engineering starts with the menu customers actually see`

Angle: Before changing prices, descriptions, placement, or categories, owners need one current public menu source.

Required sections:

- What menu engineering means
- Why the customer-facing menu matters first
- Menu engineering matrix
- Stars, puzzles, plowhorses, and dogs
- What data owners should review
- Pricing, descriptions, photos, and menu structure
- Common mistakes
- Checklist
- How MenuList helps
- FAQ

### `/resources/menu-source-audit`

H1: `Find every place customers may still see an old menu`

Angle: Make the scattered-menu problem visible before asking the owner to adopt a new system.

Required sections:

- Why old menu copies keep appearing
- Google menu photos and menu links
- QR codes on tables, counters, windows, packaging, and printed menus
- WhatsApp, Instagram, website, and staff-shared files
- PDFs and printed assets
- Branch and outlet menu copies
- Delivery or ordering links that point to old menu pages
- What to check monthly
- What to update after a price or availability change
- How MenuList creates one approved menu source
- What MenuList does not control
- Audit checklist
- FAQ

### `/resources/qr-menu-for-restaurants`

H1: `A QR code is only useful when the menu behind it is current`

Angle: QR is a doorway; the menu source behind it matters.

Required sections:

- What a QR menu is
- What a QR code should open
- Why QR menus fail
- Why QR should not open an old PDF
- Where to place restaurant QR codes
- How to test before printing
- How one stable link keeps QR working after menu changes
- Checklist
- FAQ

### `/resources/digital-menu-vs-pdf-menu`

H1: `A PDF can be useful, but it should not be your main public menu source`

Angle: PDFs remain useful for print/backup, but old files spread and become stale.

Required sections:

- What PDFs do well
- Where PDFs create problems
- Why old PDFs keep circulating
- Why mobile menu pages are easier
- When a PDF still makes sense
- Recommended setup: official menu page plus PDF backup
- Comparison table
- FAQ

### `/resources/google-business-profile-menu`

H1: `Give Google one clearer menu source to read`

Angle: Owners can reduce source confusion without claiming Google will update or rank them.

Required sections:

- Why Google menu information becomes outdated
- Menu photos, PDFs, and menu links
- Customer-uploaded menu photo risk
- Why one official menu link helps
- Checklist before updating Google menu
- What MenuList does and does not control
- FAQ

### `/resources/official-menu-source`

H1: `Customers should not have to guess which menu is correct`

Angle: This is the brand-defining page.

Required sections:

- The problem with menu copies everywhere
- What happens when prices change
- What happens when items become unavailable
- What happens across multiple locations
- Why QR, Google, WhatsApp, Instagram, and website links should point to one source
- What an official menu source should include
- How MenuList helps
- FAQ

### `/resources/restaurant-menu-seo`

H1: `Make your menu easier for customers and search systems to understand`

Angle: Plain-language SEO/AEO education without ranking promises.

Required sections:

- What restaurant menu SEO means
- Why visible text matters
- Why a stable menu URL matters
- Metadata, headings, internal links, and schema
- Business Profile freshness
- What structured data can and cannot do
- FAQ

### `/resources/ai-search-menu-discovery`

H1: `Make your current menu easier for search and AI systems to understand`

Angle: AI-era public truth page, not AI-product hype.

Required sections:

- Why AI systems need clear public menu information
- Why scattered PDFs and old images confuse answer systems
- What answer engines can read
- Why one current menu URL matters
- Crawlable text, schema, sitemap, robots, and LLM files
- What MenuList does
- What MenuList does not guarantee
- FAQ

### `/resources/menu-update-checklist`

Angle: Practical checklist before menu changes go public.

Required checklist areas:

- Item names
- Prices
- Availability
- Specials
- Photos
- Descriptions
- Categories
- Branch differences
- QR links
- Google/menu links
- PDFs and print assets
- Staff-shared links

### `/resources/qr-code-placement-checklist`

Angle: QR placement and scan testing.

Required checklist areas:

- Tables
- Counters
- Windows
- Packaging
- Receipts
- Bill folders
- Lighting
- Glare
- Fallback URL
- iPhone/Android testing
- Print size
- Link freshness

### `/resources/menu-engineering-worksheet`

Angle: Owner-readable worksheet, not a spreadsheet feature promise.

Required fields:

- Item name
- Section
- Current price
- Cost estimate
- Popularity estimate
- Margin estimate
- Customer clarity
- Action: keep, rewrite, reprice, move, remove, test

### `/resources/multi-location-menu-management`

Angle: Menu drift control for branches.

Required sections:

- Why branch menus drift
- Master menu vs outlet menu
- Price differences
- Local availability
- Shared brand consistency
- Outlet override review
- Public link consistency
- Checklist
- FAQ

---

## Acceptance Checklist

Implementation should not be considered ready until all items pass:

- `/resources` loads.
- The hub plus all 15 resource article routes load.
- The four industry landing pages load.
- Invalid slugs route to the global not-found surface with `noindex`. Local `next dev` may report `200` for streamed not-found responses, which is a documented Next.js App Router behavior, so invalid-slug verification must check both rendered noindex metadata and the absence of resource article content.
- Resource text is server-rendered enough for crawler readability.
- Every resource has a visible quick answer.
- Every resource has at least one practical checklist, comparison, worksheet, or owner action block where the topic supports it.
- Every resource has an intent-matched CTA.
- Every resource has related-resource links.
- Each page has one H1.
- Each page has unique metadata.
- Each page has canonical URL on `https://menulist.ai`.
- `/resources` emits `WebPage`, `BreadcrumbList`, and `ItemList` structured data.
- Articles emit `Article` and `BreadcrumbList` structured data.
- `FAQPage` is emitted only where FAQ is visible.
- No hidden schema content.
- No fake reviews, fake ratings, fake testimonials, or invented metrics.
- Resource routes and industry routes are in `PLATFORM_DISCOVERY_PAGES` where relevant.
- Resource routes and industry routes are in `src/app/sitemap.ts` output.
- Resource routes and industry routes are in `public/sitemap.xml`.
- Resource routes and industry routes are in `public/llms.txt`.
- `public/llms-full.txt` summarizes resource coverage and claim boundaries.
- `public/robots.txt` and `DISCOVERY_CRAWLERS` stay in sync, including private-route disallows in the specific named-crawler group and the generic `*` group.
- Header has a usable desktop Resources dropdown.
- Mobile drawer has a usable Resources entry plus nested resource links.
- Footer Resources links point to resource pages.
- Homepage resource section is mounted in the lower half with the eight strategic resource cards.
- Homepage does not become a blog index.
- Distribution snippets are prepared for the launch resources where needed.
- The Menu Source Audit page can be shared as a standalone acquisition asset.
- Analytics events are consent-gated public website events. Plausible receives property-free event names; GA4 compatibility payloads remain optional.
- No sensitive data is tracked.
- English resource source content and reviewed active-locale resource packs are present.
- `npm run verify:website-resource-locales` passes for reviewed resource locale packs.
- Other website locales fall back safely.
- `npm run verify:agent-readiness` passes.
- `npx tsc --noEmit --incremental false` passes.
- `npm run lint` passes.
- Manual desktop check passes for `/resources` and all articles.
- Manual mobile check passes for `/resources` and all articles.
- Schema validation is checked for hub and representative article pages.

See `main-website_resources-validation.md` for the implementation verification log.

See `main-website_resources-localization-plan.md` for the reviewed resource translation, locale URL, and long-form content management plan across active public website languages.

---

## Open Decisions Before Implementation

| Decision | Recommended default |
| --- | --- |
| Add `CCBot` to allowlist? | Allowed in the public discovery policy as of June 2, 2026; still document that Common Crawl inclusion is not a ranking or AI-visibility guarantee. |
| Header dropdown or simple Resources link? | Compact dropdown on desktop, nested links in the mobile drawer. |
| Full reviewed translations for current resource pages? | Implemented for Hindi, Tamil, Telugu, Marathi, Bengali, Arabic, and Spanish across the hub and all 15 articles, with locale-prefixed URLs, metadata, `hreflang`, sitemap, and LLM context coverage. |
| Downloadable worksheet assets now? | Keep worksheet as HTML first unless a real generated file is designed and QA'd. |
| Static or interactive Menu Source Audit? | Static HTML checklist first. Add client-side interaction only if it stays anonymous and does not create backend cost. |
| Gated templates or ungated resources? | Ungated first. Do not add an email gate until there is a separate consent and follow-up plan. |
| Public website events only? | Yes. Avoid Firebase customer analytics writes for resource traffic. |
| Public launch domain for smoke test? | Use `menulist.ai` as canonical; use `qa.menulist.digital` for MenuList QA. Do not smoke MenuList website preview on `menulist.online`. |

---

## Implementation Prompt Draft

Use this only after approval:

```text
Build the complete MenuList Resources and AI discovery content layer as one release scope.

Context:
MenuList is public-business truth infrastructure for SMBs and restaurants. It helps owners keep one approved menu and business source current across QR codes, public pages, Google/menu links, shared links, screens, print/PDF assets, and customer-facing surfaces.

Do not position MenuList as a generic QR menu maker, generic AI restaurant software, feature-heavy SaaS dashboard, guaranteed SEO/ranking tool, or AI visibility guarantee tool.

Build routes:
- /resources
- /resources/menu-source-audit
- /resources/menu-engineering
- /resources/qr-menu-for-restaurants
- /resources/digital-menu-vs-pdf-menu
- /resources/google-business-profile-menu
- /resources/official-menu-source
- /resources/restaurant-menu-seo
- /resources/ai-search-menu-discovery
- /resources/menu-update-checklist
- /resources/qr-code-placement-checklist
- /resources/menu-engineering-worksheet
- /resources/multi-location-menu-management

Keep work inside the public website layer:
- src/app/(website)
- src/components/website
- src/content/websiteResources
- src/lib/website
- src/lib/seo/discoveryPolicy.ts
- public/sitemap.xml
- public/robots.txt
- public/llms.txt
- public/llms-full.txt
- main website docs

Do not touch tenant routing, auth, middleware, Firestore contracts, owner app flows, Canonica routes, billing, or Firebase Functions.

Use existing website primitives and localization rules. Keep article content typed and localized; do not hardcode user-visible article text inside route/components.

Validation:
- npm run verify:agent-readiness
- npx tsc --noEmit --incremental false
- npm run lint
- manual desktop/mobile check for /resources and all resource pages
- schema validation for hub and representative article pages
```

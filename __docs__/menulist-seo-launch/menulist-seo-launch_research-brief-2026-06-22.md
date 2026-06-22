# MenuList SEO Launch Research Brief - June 22, 2026

**Status:** Current research-backed consultant brief  
**Product:** MenuList only  
**Prepared by:** Codex-as-MenuList SEO consultant  
**Research type:** Primary-source web research + repo-context translation

---

## Executive Conclusion

The launch SEO direction remains correct: keep SEO in-house, use Codex as the internal technical/product SEO consultant, and use outside help only for a narrow fixed-scope audit if the founder wants a second opinion.

The most important update from current Google guidance is that "AEO" and "GEO" should not become a separate tactic stack. Google says generative AI Search experiences are rooted in core Search ranking and quality systems, so the practical work is still foundational SEO: crawlable pages, clear technical structure, useful non-commodity content, strong page experience, accurate structured data, and Search Console monitoring.

For MenuList, the SEO advantage should come from verified public truth:

- one official customer link;
- crawlable public menu and Official Business Page surfaces;
- visible business/menu facts;
- stable canonical URLs;
- sitemaps and public-truth indexing gates;
- structured data that matches visible facts;
- resource pages that solve real owner tasks;
- Search Console review after launch.

Do not chase ranking hacks, AI-citation hacks, thin keyword pages, generic blog volume, fake local pages, fake reviews, or agency-led repositioning.

## Sources Reviewed

| Source | Why it matters for MenuList |
| --- | --- |
| [Google: Do you need an SEO?](https://developers.google.com/search/docs/fundamentals/do-i-need-seo) | Supports in-house-first work for small local businesses, careful SEO hiring, audit-first scope, and rejecting first-place guarantees. |
| [Google: Optimizing for generative AI features on Google Search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) | Confirms AEO/GEO is still SEO from Google's perspective; warns against AI-only hacks, unnecessary special files for Google, thin query-variant content, and inauthentic mentions. |
| [Google: Get started with Search Console](https://developers.google.com/search/docs/monitor-debug/search-console-start) | Defines the owner-side launch loop: verify ownership, review index coverage, submit sitemap, monitor performance by query/page/country. |
| [Google: SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) | Confirms Search Essentials and good SEO practices improve eligibility/presence but do not guarantee indexing. |
| [Google: Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview) | Confirms sitemaps help discovery, especially for new sites, but do not guarantee crawl or index. |
| [Google: robots.txt intro](https://developers.google.com/search/docs/crawling-indexing/robots/intro) | Confirms robots.txt manages crawler access/traffic and is not a privacy or deindexing mechanism. |
| [Google: noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing) | Confirms `noindex` must be crawl-accessible to be seen, and is the right tool for pages that should not appear in search. |
| [Google: Structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) | Confirms JSON-LD is recommended and structured data must match visible, current, non-misleading content; rich results are not guaranteed. |
| [Google: LocalBusiness structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business) | Confirms LocalBusiness/Restaurant data can communicate business hours, order/reservation actions, and local business facts when accurate and visible. |
| [Google: AI-generated content guidance](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content) | Confirms AI can help with research/structure, but scaled low-value pages can violate spam policy. |
| [Google: Spam policies](https://developers.google.com/search/docs/essentials/spam-policies) | Confirms doorway abuse, keyword stuffing, hidden text, and scaled manipulation are material SEO risks. |
| [IndexNow documentation](https://www.indexnow.org/documentation) and [IndexNow overview](https://www.indexnow.org/) | Useful future option for notifying participating search engines of changed URLs, but not a replacement for Google Search Console or sitemap quality. |

## MenuList Translation

### 1. Treat AEO/GEO As SEO, Not A Separate Product

Google's current guidance says AEO and GEO are common terms, but optimizing for generative AI Search is still optimizing for Search. For MenuList, this means:

- keep "AEO" as an internal shorthand only;
- do not create public "AI visibility" guarantees;
- do not sell `llms.txt` as a Google ranking lever;
- keep `llms.txt` and `llms-full.txt` as agent/LLM context files for non-Google systems and product clarity, not as a Google Search promise.

### 2. Keep Search Console As The Launch Measurement Source

Search Console is the first external control panel for launch SEO.

MenuList should use it to:

- verify `menulist.ai`;
- submit `https://menulist.ai/sitemap.xml`;
- inspect core URLs;
- watch index coverage;
- review queries, pages, countries, clicks, impressions, CTR, and position;
- catch manual actions, indexing issues, and sitemap issues.

Search Console does not need daily attention. Review after launch, after major SEO route/content changes, and at least monthly once the site is stable.

### 3. Preserve The Existing Sitemap Split

MenuList has the correct product split:

- platform sitemap: `menulist.ai` marketing/resource/industry pages;
- tenant sitemap: each public tenant/custom domain advertises its own OBP/menu/outlet URLs.

Do not put public customer menu URLs into the platform sitemap. That would blur platform and tenant identity and create duplicate/canonical risk.

### 4. Robots Is Not Security Or Deindexing

MenuList should keep using robots for crawler access and traffic policy, but:

- private owner/dashboard/API routes need auth and route protection;
- pages that should remain reachable but not indexed need `noindex`;
- pages with `noindex` must remain crawl-accessible enough for crawlers to see the directive.

This matches the current public-truth indexability gate and the `create-menu/success` noindex wrapper.

### 5. Structured Data Must Match Visible Facts

Structured data is useful for MenuList because the product is built around public business/menu truth, but it must stay conservative:

- homepage/product pages: Organization, WebSite, SoftwareApplication, WebPage, BreadcrumbList;
- resources: WebPage, Article, BreadcrumbList, FAQPage only where visible FAQ exists;
- public business pages: Restaurant or the most specific LocalBusiness subtype only when visible facts support it;
- menu pages: Menu/MenuSection/MenuItem only when current visible menu data supports it;
- no hidden FAQ schema, fake reviews, fake ratings, invented hours, unsupported order/reservation actions, or old prices.

### 6. Content Expansion Must Be Real Task Expansion

Google guidance warns against making separate content for every possible query variation when the goal is manipulating rankings or AI responses.

For MenuList, new pages are valid only when they map to a real owner/customer task:

- menu source audit;
- QR menu setup;
- Google Business Profile menu URL;
- price-change checklist;
- restaurant menu cleanup checklist;
- WhatsApp menu link;
- multi-location menu source control;
- PDF menu comparison when written carefully.

Do not create generic blog volume, city pages, food-truck/bar pages, comparison pages, or keyword variants until there is real content ownership and real MenuList-fit workflow depth.

### 7. IndexNow Is Optional Later, Not Launch P0

IndexNow can notify participating search engines when URLs are added, updated, or deleted. It may become useful for MenuList because public menus and business pages can change often.

Do not implement it at launch by reflex. First decide:

- whether it is only for `menulist.ai` platform routes or also tenant/custom domains;
- how keys are hosted per host;
- what rate limits and abuse controls are needed;
- whether menu publish/update events should trigger URL submission;
- how to avoid notifying weak/noindex/starter/unverified records.

This is a P2 research item after Google Search Console setup and the current sitemap/indexing gates are stable.

## Consultant Opinion

MenuList's strongest SEO position is not "restaurant SEO software." It is "one official customer link backed by current public business/menu truth."

The market has many QR menu makers and many SEO agencies. MenuList should avoid both categories as its public identity. The SEO work should make the product's current source of truth legible to humans, search engines, and AI/search systems without turning SEO into an owner burden.

The launch priority order should be:

1. Verify Search Console and submit the sitemap.
2. Inspect core platform URLs and representative tenant URLs.
3. Keep current technical SEO verifiers passing.
4. Review high-value existing pages before adding new ones.
5. Strengthen internal links from resources to product pages and from feature pages to resources.
6. Use real owner workflows as content expansion, not keyword variants.
7. Consider Bing Webmaster Tools and IndexNow after Google baseline data exists.

## Immediate Action Updates

Add these to the launch SEO operating loop:

- Create a Search Console setup checklist once owner access exists.
- Add monthly Search Console review cadence after launch.
- Treat `llms.txt` as non-Google agent context, not a Google SEO claim.
- Add IndexNow/Bing Webmaster Tools as a later research item.
- Keep the source-of-truth split: main website docs for implementation, discovery infrastructure docs for public machine-readability, this folder for consultant decisions and action tracking.

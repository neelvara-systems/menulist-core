# SEO & AEO Strategy — MenuList Main Website

**Status:** ✅ IMPLEMENTED  
**Last Updated:** June 8, 2026

> May 18, 2026 update: the homepage now includes a search/AI discovery proof section. It is grounded in existing owner SEO/AEO settings, Business Copy Setup, schema.org output, sitemap/robots policy, and LLM discovery files. The public wording must stay conservative: MenuList prepares a clearer official source for search engines and AI systems to read; it does not promise rankings, AI citations, Google Maps updates, or external-platform placement.

> May 21, 2026 update: the homepage was compressed for conversion clarity. Search/AEO proof remains valid product proof, but it is no longer mounted as a full homepage section; it belongs in supporting feature/page content unless needed for a dedicated discovery page. Homepage metadata now avoids "instantly" and aligns with the owner-approved 7-day setup funnel.

> May 23, 2026 update: after reviewing Chrome's agentic web / WebMCP guidance, MenuList treats agent-readiness as an extension of the existing public truth layer. The immediate production contract is semantic public pages, schema.org JSON-LD, robots/sitemaps, `llms.txt`, `llms-full.txt`, and gated public API/POS surfaces where enabled. WebMCP remains a future browser-agent enhancement that must be feature-flagged, visible, read-only or pending-suggestion scoped, and covered by evals before release.

> May 23, 2026 end-to-end pass: platform discovery now uses non-www `https://menulist.ai`, homepage JSON-LD is server-rendered, active marketing/legal pages emit WebPage and BreadcrumbList JSON-LD, and the legacy `/product` URL is a framework-level permanent redirect that is no longer listed in sitemap or LLM discovery files. The public platform-domain env config also uses `menulist.ai` as canonical, with `menulist.online` retained as an alias. Use `npm run verify:agent-readiness` before closing future SEO/AEO changes.

> June 1, 2026 resources implementation note: the evergreen `/resources` layer is implemented. Resource pages are server-rendered, visible-text-first, internally linked, schema-aligned, and backed by quick answers, checklists, worksheets, and clear claim boundaries. `PLATFORM_DISCOVERY_PAGES`, sitemap output, static sitemap, robots/crawler policy, `llms.txt`, `llms-full.txt`, and `verify:agent-readiness` were updated in the same pass. Resource pages must still avoid ranking, citation, external-platform refresh, or AI placement promises.

> June 1, 2026 Indian resource localization note: reviewed Hindi, Tamil, Telugu, Marathi, and Bengali resource packs were exposed through locale-prefixed URLs, localized metadata, JSON-LD `inLanguage`, sitemap `hreflang`, and LLM context coverage in the first language rollout. English remains the non-prefixed canonical source. Future languages must stay out of discovery until full source-versioned packs pass `verify:website-resource-locales`.

> June 1, 2026 full resource locale coverage note: Arabic and Spanish resource packs are now reviewed and exposed through the same locale-prefixed URL, metadata, JSON-LD, sitemap, `hreflang`, and LLM context system. `verify:website-resource-locales` now enforces full reviewed resource coverage for every active non-default language in the public website switcher.

> June 2, 2026 resource discovery hardening note: named search/AI crawlers now share the same private-route disallows as the generic crawler group in `public/robots.txt`, `CCBot` is explicitly listed in `DISCOVERY_CRAWLERS`, and `llms.txt` / `llms-full.txt` include MenuList's preferred official-source positioning plus claim limits. The Resources navigation/footer/homepage links now point crawlers and readers into the same resource cluster, while analytics measures resource-to-upload and resource-to-pricing clicks without tenant/customer identifiers.

> June 2, 2026 resource expansion and industry note: the public discovery layer now includes 15 resource articles, reviewed active-locale coverage for every resource article, and four industry pages under `/industries/`. Industry pages use WebPage/BreadcrumbList structured data and connect back to resources/product CTAs; they must describe fit and public-menu correctness only, without revenue, ranking, Google refresh, POS, delivery-marketplace, or AI-visibility guarantees.

> June 8, 2026 Business Health campaign note: `/features/business-health` is the public campaign URL for Business Health. It is registered in `PLATFORM_DISCOVERY_PAGES`, static sitemap, `llms.txt`, and `llms-full.txt`. `/business-health` remains the protected owner app route and must stay out of public discovery.

> June 8, 2026 feature-campaign note: the main website now exposes a compact Features dropdown and five additional dedicated feature campaign pages: `/features/menu-import`, `/features/official-business-page`, `/features/qr-menu-links`, `/features/owner-phone-dashboard`, and `/features/public-discovery`. These join `/features/business-health` in `PLATFORM_DISCOVERY_PAGES`, static sitemap, `llms.txt`, and `llms-full.txt`.

---

## 1. SEO Foundation

### 1.1 Title Tags (from actual `export const metadata` in code)

| Page             | Title                                                                 | Source File                           |
| ---------------- | --------------------------------------------------------------------- | ------------------------------------- |
| Homepage         | MenuList - One Official Menu Source for Customers                     | `(website)/layout.tsx`                |
| Features         | Features — MenuList \| No Extra Work for Your Menu                    | `(website)/features/page.tsx`         |
| Menu Import      | Menu Import - MenuList \| Upload the Menu You Already Have            | `(website)/features/menu-import/page.tsx` |
| Official Business Page | Official Business Page - MenuList \| One Current Customer Link  | `(website)/features/official-business-page/page.tsx` |
| QR Menu and Share Links | QR Menu and Share Links - MenuList \| One Current Menu Everywhere | `(website)/features/qr-menu-links/page.tsx` |
| Owner Phone Dashboard | Owner Phone Dashboard - MenuList \| Manage Your Menu Without a Desktop | `(website)/features/owner-phone-dashboard/page.tsx` |
| Business Health  | Business Health - MenuList \| Know What Needs Attention               | `(website)/features/business-health/page.tsx` |
| Public Discovery | Public Discovery - MenuList \| Clear Business Information for Search and AI | `(website)/features/public-discovery/page.tsx` |
| How It Works     | How MenuList Works — From Current Menu to Official Public Source      | `(website)/how-it-works/page.tsx`     |
| Pricing          | Pricing — MenuList \| Simple, Transparent Plans for Every Business    | `(website)/pricing/page.tsx`          |
| Multi-Location   | Multi-Location Menu Management — MenuList \| One Menu, Every Outlet   | `(website)/multi-location/page.tsx`   |
| About            | About MenuList — Built in India for Growing Businesses                | `(website)/about/page.tsx`            |
| Contact          | Contact Us — MenuList \| Get in Touch                                 | `(website)/contact/page.tsx`          |
| Get Started      | Get Started — Create Your Official Menu Source                        | `(website)/get-started/page.tsx`      |
| Create Menu      | Create Your Official Menu Source — MenuList                           | `(website)/create-menu/page.tsx`      |
| Resources        | Resources — MenuList \| Keep One Public Menu Current                  | `(website)/resources/page.tsx`        |
| Resource Article | Dynamic per article from `src/content/websiteResources/en-US.ts` and reviewed locale packs | `(website)/resources/[slug]/page.tsx`, `(website)/[locale]/resources/[slug]/page.tsx` |
| Industry Pages   | Dynamic per industry from `src/content/websiteIndustries.ts`          | `(website)/industries/*/page.tsx`     |
| Trust & Security | Trust & Security — MenuList \| How We Keep Your Data Safe             | `(website)/trust-security/page.tsx`   |
| Privacy          | Privacy Policy — MenuList                                             | `(website)/privacy-policy/page.tsx`   |
| Terms            | Terms of Service — MenuList                                           | `(website)/terms-of-service/page.tsx` |
| Refund           | Refund Policy — MenuList                                              | `(website)/refund-policy/page.tsx`    |

### 1.2 Meta Descriptions (from actual code)

| Page           | Description                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Homepage       | Upload your current menu. Review the prepared version. Publish one official menu, page, QR link, screen, PDF, and customer view from the same owner-approved source. |
| Features       | Upload your menu and get images, descriptions, translations, QR menus, digital screens, official business page, and multi-location management — all from one place. |
| Business Health | Business Health shows the latest MenuList check, customer attention, last checked date, and whether anything needs action in the owner dashboard. |
| How It Works   | Start with your current menu. MenuList prepares the owner-reviewed source behind the customer-facing menu and related public links.   |
| Pricing        | Start with a 7-day MenuList setup, then choose the plan that keeps your official menu link live, updated, and ready for customers.                  |
| Multi-Location | Manage menu source changes across locations from one place. Keep outlet menus consistent while preserving location-level control.       |
| About          | MenuList turns your menu into your entire online presence. Built for businesses that care about how they present themselves to customers.                           |
| Contact        | Have questions about MenuList? Reach out to our team. We are here to help you get your menu online.                                                                 |
| Get Started    | Start with your current menu and create the owner-approved source for the customer-facing version of your business.             |
| Create Menu    | Start with your current menu and create the owner-approved source for the customer-facing version of your business.                      |

### 1.3 Heading Hierarchy

Every page must follow:

- **One H1** per page (matches primary message)
- **H2** for each major section
- **H3** for subsections within
- No skipped levels (H1 → H3 without H2)

### 1.4 Sitemap

Auto-generated `/sitemap.xml` with active public pages only. Redirect-only legacy URLs such as `/product` must stay out of sitemap and LLM discovery inventories.

```xml
<url>
  <loc>https://menulist.ai/</loc>
  <changefreq>monthly</changefreq>
  <priority>1.0</priority>
</url>
<url>
  <loc>https://menulist.ai/how-it-works</loc>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>
<!-- etc. -->
```

### 1.5 Robots.txt

```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /api/
Disallow: /settings
Sitemap: https://menulist.ai/sitemap.xml
```

### 1.6 Canonical URLs

Every page includes self-referencing canonical:

```html
<link rel="canonical" href="https://menulist.ai/pricing" />
```

---

## 2. Schema.org Structured Data

### 2.1 Organization (sitewide)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "MenuList",
  "url": "https://menulist.ai",
  "logo": "https://menulist.ai/apple-touch-icon.png",
  "description": "MenuList is a system that manages official menus and public business information across all customer-facing surfaces.",
  "foundingDate": "2024",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "IN"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "email": "hello@menulist.ai"
  }
}
```

### 2.2 SoftwareApplication (homepage)

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "MenuList",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "MenuList is a system that manages official menus and public business information across all customer-facing surfaces.",
  "url": "https://menulist.ai",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "INR",
    "description": "Start with a 7-day setup. Plans from ₹599/month."
  }
}
```

### 2.3 WebSite (homepage)

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "MenuList",
  "url": "https://menulist.ai",
  "description": "Official website for MenuList — public menu infrastructure system."
}
```

### 2.4 FAQPage (pricing page)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How much does MenuList cost?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "MenuList plans start from ₹599/month..."
      }
    }
  ]
}
```

---

## 3. AEO (Answer Engine Optimization)

### 3.1 Canonical Entity Definition

**Use this exact text everywhere. Never rewrite.**

> MenuList is a public menu infrastructure system that manages official menus and business information from a single source of truth. It keeps menu content accurate and aligned across customer-facing surfaces including QR, web, screens and print.

**Short version (for meta/schema):**

> MenuList is a system that manages official menus and public business information across all customer-facing surfaces.

### 3.2 Entity Reinforcement Strategy

| Signal                 | Implementation                                                 |
| ---------------------- | -------------------------------------------------------------- |
| Consistent definition  | Same canonical paragraph on homepage, about, schema, meta      |
| Public usage footprint | Every published menu page is indexed with MenuList attribution |
| Structured data        | Organization + SoftwareApplication + WebSite schema            |
| Freshness              | "Updated on" timestamps on all public menu pages               |
| Stability              | URL structure and entity definition never change               |

### 3.3 What AI Engines Need to Learn

When someone asks an AI: "What is MenuList?"

**Target answer:**

> MenuList is a public menu infrastructure system used by restaurants and businesses in India to manage their official menus across QR codes, Google, digital screens, websites, and print from a single source of truth.

**How we train this:**

- Consistent entity definition across all pages
- Schema.org structured data
- Public menu pages with attribution
- Stable URL structure (/m/business-name)
- No positioning changes or rewrites

### 3.4 Mandatory Branding on Public Pages

Every public menu page (existing, already implemented) includes:

- "Powered by MenuList" footer attribution
- Link back to menulist.ai
- "Updated on [date]" timestamp
- Business name + location

This creates a growing network of indexed pages that reinforce MenuList as the canonical menu source.

### 3.5 Homepage Search/AI Discovery Proof

The homepage `SearchDiscoverySection` should communicate four grounded facts:

1. Owner-approved menu and business facts become public pages and links.
2. Public pages include structured business/menu data, sitemap signals, crawler policy, and LLM discovery files.
3. Owner settings include SEO/AEO fields, preview, and business-copy setup for enabled languages.
4. Search engines and AI systems decide what they crawl, cite, and show.

Approved public caveat:

> Google, Bing, ChatGPT, and other AI systems decide what they crawl, cite, and show. MenuList prepares a clearer official source; it does not promise placement.

Do not use:

- "Guaranteed AI visibility"
- "Rank higher on Google"
- "Get cited by ChatGPT"
- "Automatic Google/Instagram/WhatsApp sync"
- "AI-powered SEO"

### 3.6 Agentic Web / PAL Boundaries

PAL means **Public Agentic Layer** for MenuList: public business truth stays readable to humans, crawlers, search engines, and browser/AI agents without moving MenuList into POS, payment, CRM, or fulfillment operations.

Current agent-readable surfaces:

- SSR public menu and OBP pages
- server-rendered JSON-LD on homepage and active platform pages
- server-rendered `/resources` pages with WebPage, Article, BreadcrumbList, FAQPage where visible, and ItemList hub schema
- schema.org JSON-LD on public output
- platform and per-store robots/sitemaps
- `public/llms.txt` and `public/llms-full.txt`
- gated public API v1 business/menu reads where enabled
- official handoff links such as call, WhatsApp, directions, order, reservation, QR, PDF, and saved menu shortcut when the business has published them

Agent boundaries:

- Agents may read public facts and route users to official handoffs.
- Agents must not directly edit menu prices, business hours, item availability, POS state, billing, payments, owner settings, or business identity.
- Agents must say unknown when a fact is not shown or not verified.
- Sensitive food claims such as allergens, gluten-free preparation, halal, vegan, and cross-contamination details must not be inferred.
- WebMCP tools are not active production scope yet. The first allowed future tools should be read-only or pending-suggestion tools such as `searchMenuItems`, `getOpeningHours`, `getMenuItemDetails`, `getOrderingOptions`, and `submitCorrection` as a review queue item only.

---

## 4. Technical SEO Checklist

| Item                  | Status     | Notes                                                       |
| --------------------- | ---------- | ----------------------------------------------------------- |
| HTTPS                 | ✅         | Already on menulist.ai                                      |
| Mobile responsive     | ✅         | Mobile-first design implemented                             |
| Page speed < 2.5s LCP | ✅         | Static rendering for all marketing pages                    |
| Sitemap.xml           | ✅         | Active platform pages only; redirected `/product` omitted   |
| Robots.txt            | ✅         | Named search/AI crawlers and the generic crawler group allowed for public pages, with protected app paths excluded in both rule groups and non-www sitemap/LLM links |
| llms.txt              | ✅         | Platform agent context with public fact boundaries, action boundaries, preferred description, and claim limits |
| llms-full.txt         | ✅         | Extended agent-readable schema, URL, freshness, resource inventory, preferred positioning, and boundary docs |
| Canonical URLs        | ✅         | Self-referencing on active platform pages                   |
| Schema.org            | ✅         | Homepage Organization/WebSite/SoftwareApplication/WebPage/BreadcrumbList plus page-level WebPage/BreadcrumbList |
| OG tags               | ✅         | Per-page titles + descriptions on active platform pages     |
| Twitter cards         | ✅         | Summary card with large image (layout-level)                |
| Per-page metadata     | ✅         | Unique title, description, OG for active platform pages     |
| Favicon               | ✅         | Implemented                                                 |
| 404 page              | 🔵 Planned | Custom branded 404                                          |
| Alt text on images    | 🔵 Planned | Descriptive, keyword-relevant                               |
| Internal linking      | ✅         | Cross-page links in navigation                              |
| hreflang              | 🔵 Future  | When multi-locale SEO needed                                |
| i18n                  | ✅         | 8 languages supported via next-intl                         |
| Agent-readiness verifier | ✅      | `npm run verify:agent-readiness` checks route registries, robots, sitemap, LLM files, and JSON-LD wrappers |

---

## 5. Social Sharing (OG Tags)

### Per-Page OG Tags

```html
<!-- Homepage (from layout.tsx default metadata) -->
<meta
  property="og:title"
  content="MenuList — The Official Source for What Customers See"
/>
<meta
  property="og:description"
  content="Upload your current menu. Review the prepared version. Publish one official menu, page, QR link, screen, PDF, and customer view from the same owner-approved source."
/>
<meta property="og:image" content="https://menulist.ai/images/website/menulist-og-official-source.png" />
<meta property="og:url" content="https://menulist.ai" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="MenuList" />

<!-- Twitter (from layout.tsx) -->
<meta name="twitter:card" content="summary_large_image" />
<meta
  name="twitter:title"
  content="MenuList — The Official Source for What Customers See"
/>
<meta
  name="twitter:description"
  content="Upload your current menu. Review the prepared version. Publish one official menu, page, QR link, screen, PDF, and customer view from the same owner-approved source."
/>
<meta name="twitter:image" content="https://menulist.ai/images/website/menulist-og-official-source.png" />
```

### OG Image Specs

- Size: 1200 × 630px
- Format: PNG
- Content: MenuList logo + tagline + subtle product preview
- Max file size: 100KB
- One per page (customized title per page)

---

## 6. Future SEO Phases

### Phase 1 (Now): Foundation

- All technical SEO implemented
- Schema.org on all pages
- Entity definition consistent
- Performance optimized

### Phase 2 (3-6 months): Content

- Blog with 1-2 articles/month
- Industry-specific landing pages (restaurants, cafés, bakeries)
- Case studies (when real customers exist)

### Phase 3 (6-12 months): Authority

- Backlink building from industry directories
- Guest posts on food/restaurant industry sites
- PR mentions with consistent entity definition
- Geographic landing pages (city-specific)

**Phase 2 and 3 are NOT built now.** Only Phase 1 is implemented with the new website.

# SEO & AEO Strategy — MenuList Main Website

**Status:** ✅ IMPLEMENTED  
**Last Updated:** May 20, 2026

> May 18, 2026 update: the homepage now includes a search/AI discovery proof section. It is grounded in existing owner SEO/AEO settings, Business Copy Setup, schema.org output, sitemap/robots policy, and LLM discovery files. The public wording must stay conservative: MenuList prepares a clearer official source for search engines and AI systems to read; it does not promise rankings, AI citations, Google Maps updates, or external-platform placement.

---

## 1. SEO Foundation

### 1.1 Title Tags (from actual `export const metadata` in code)

| Page             | Title                                                                 | Source File                           |
| ---------------- | --------------------------------------------------------------------- | ------------------------------------- |
| Homepage         | MenuList - Upload Your Menu Online                                    | `(website)/layout.tsx`                |
| Features         | Features — MenuList \| No Extra Work for Your Menu                    | `(website)/features/page.tsx`         |
| How It Works     | How MenuList Works — From Current Menu to Official Public Source      | `(website)/how-it-works/page.tsx`     |
| Pricing          | Pricing — MenuList \| Simple, Transparent Plans for Every Business    | `(website)/pricing/page.tsx`          |
| Multi-Location   | Multi-Location Menu Management — MenuList \| One Menu, Every Outlet   | `(website)/multi-location/page.tsx`   |
| About            | About MenuList — Built in India for Growing Businesses                | `(website)/about/page.tsx`            |
| Contact          | Contact Us — MenuList \| Get in Touch                                 | `(website)/contact/page.tsx`          |
| Get Started      | Get Started — Create Your Official Menu Source                        | `(website)/get-started/page.tsx`      |
| Create Menu      | Create Your Official Menu Source — MenuList                           | `(website)/create-menu/page.tsx`      |
| Trust & Security | Trust & Security — MenuList \| How We Keep Your Data Safe             | `(website)/trust-security/page.tsx`   |
| Privacy          | Privacy Policy — MenuList                                             | `(website)/privacy-policy/page.tsx`   |
| Terms            | Terms of Service — MenuList                                           | `(website)/terms-of-service/page.tsx` |
| Refund           | Refund Policy — MenuList                                              | `(website)/refund-policy/page.tsx`    |

### 1.2 Meta Descriptions (from actual code)

| Page           | Description                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Homepage       | Start with your current menu. MenuList turns it into a live menu, official page, QR, web link, customer view, and PDF from one approved source. |
| Features       | Upload your menu and get images, descriptions, translations, QR menus, digital screens, official business page, and multi-location management — all from one place. |
| How It Works   | Start with your current menu. MenuList prepares the owner-reviewed source for your public menu, official page, QR assets, customer app, PDF, and web link.   |
| Pricing        | Choose the right MenuList plan for your business. Free to start. Upgrade for more surfaces, multi-language support, and multi-location management.                  |
| Multi-Location | Manage menu source changes across locations from one place. Keep outlet menus consistent while preserving location-level control.       |
| About          | MenuList turns your menu into your entire online presence. Built for businesses that care about how they present themselves to customers.                           |
| Contact        | Have questions about MenuList? Reach out to our team. We are here to help you get your menu online.                                                                 |
| Get Started    | Start with your current menu and create the owner-approved source for your public menu, official business page, QR assets, customer app, and share links.             |
| Create Menu    | Start with your current menu and create the owner-approved source for your public menu, official page, QR assets, customer app, and share links.                      |

### 1.3 Heading Hierarchy

Every page must follow:

- **One H1** per page (matches primary message)
- **H2** for each major section
- **H3** for subsections within
- No skipped levels (H1 → H3 without H2)

### 1.4 Sitemap

Auto-generated `/sitemap.xml` with all public pages:

```xml
<url>
  <loc>https://menulist.ai/</loc>
  <changefreq>monthly</changefreq>
  <priority>1.0</priority>
</url>
<url>
  <loc>https://menulist.ai/product</loc>
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
  "logo": "https://menulist.ai/logo.png",
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
    "description": "Free to start. Plans from ₹599/month."
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

---

## 4. Technical SEO Checklist

| Item                  | Status     | Notes                                                       |
| --------------------- | ---------- | ----------------------------------------------------------- |
| HTTPS                 | ✅         | Already on menulist.ai                                      |
| Mobile responsive     | ✅         | Mobile-first design implemented                             |
| Page speed < 2.5s LCP | ✅         | Static rendering for all marketing pages                    |
| Sitemap.xml           | ✅         | 13 pages, updated March 2026                                |
| Robots.txt            | ✅         | AI crawlers allowed, dashboard excluded                     |
| Canonical URLs        | ✅         | Self-referencing on all 13 pages (March 2026)               |
| Schema.org            | ✅         | Organization + SoftwareApplication + WebSite + FAQPage      |
| OG tags               | ✅         | Per-page titles + descriptions on all 13 pages (March 2026) |
| Twitter cards         | ✅         | Summary card with large image (layout-level)                |
| Per-page metadata     | ✅         | Unique title, description, OG for all pages (March 2026)    |
| Favicon               | ✅         | Implemented                                                 |
| 404 page              | 🔵 Planned | Custom branded 404                                          |
| Alt text on images    | 🔵 Planned | Descriptive, keyword-relevant                               |
| Internal linking      | ✅         | Cross-page links in navigation                              |
| hreflang              | 🔵 Future  | When multi-locale SEO needed                                |
| i18n                  | ✅         | 8 languages supported via next-intl                         |

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
  content="MenuList gives your menu and business information one owner-approved source for the public menu, official business page, QR assets, customer app, screens, and share links."
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
  content="MenuList gives your menu and business information one owner-approved source for the public menu, official business page, QR assets, customer app, screens, and share links."
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

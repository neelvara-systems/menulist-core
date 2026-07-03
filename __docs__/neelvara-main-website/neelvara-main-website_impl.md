# Neelvara Main Website - Implementation Record

**Status:** Implemented; pending owner/legal launch review
**Implementation target:** Existing Next.js/Vercel shared app
**Runtime data:** None
**Firebase impact:** None

---

## 1. Architecture Decision

Neelvara is implemented as a static public site inside the existing product-domain routing architecture.

It is not a database-backed product. Do not add Neelvara to `PRODUCT_IDS`, billing, Firestore collections, owner notifications, product plans, or Firebase projects.

---

## 2. Runtime Routes

| Environment | Public URL / path | Internal route |
| --- | --- | --- |
| Local | `http://localhost:3000/__neelvara/` | `/sites/neelvara` |
| Preview | `https://neelvara.menulist.online` | `/sites/neelvara` |
| Production | `https://neelvara.com` and `https://www.neelvara.com` | `/sites/neelvara` |

Middleware uses the existing generic product-site rewrite flow. No Neelvara-specific middleware branch is required.

---

## 3. Files Added

| File | Purpose |
| --- | --- |
| `src/constants/neelvara/product.ts` | Route/domain slug and display name |
| `src/constants/neelvara/domains.ts` | Internal route path, dev prefix, staging and production domains |
| `src/constants/neelvara/website.ts` | Canonical URL, public pages, contact emails, relationship line |
| `src/constants/neelvara/index.ts` | Neelvara constant exports |
| `src/app/sites/neelvara/layout.tsx` | Metadata, viewport, icon configuration |
| `src/app/sites/neelvara/content.tsx` | Shared content, shell, header/footer, cards, structured data |
| `src/app/sites/neelvara/ScrollRevealController.tsx` | Local viewport-entry reveal controller with reduced-motion fallback |
| `src/app/sites/neelvara/SpotlightCard.tsx` | Client-side cursor spotlight primitive for glass cards |
| `src/app/sites/neelvara/page.tsx` | Home page |
| `src/app/sites/neelvara/home/page.tsx` | Internal local-prefix homepage alias for bare `/__neelvara` dev routing |
| `src/app/sites/neelvara/products/page.tsx` | Products page |
| `src/app/sites/neelvara/about/page.tsx` | About page |
| `src/app/sites/neelvara/contact/page.tsx` | Contact page |
| `src/app/sites/neelvara/legal/page.tsx` | Legal page |
| `src/app/sites/neelvara/privacy/page.tsx` | Privacy page |
| `src/app/sites/neelvara/terms/page.tsx` | Terms page |
| `src/app/sites/neelvara/not-found.tsx` | Segment not-found UI |
| `src/app/sites/neelvara/[...missing]/route.ts` | True 404 catch-all response for unmatched Neelvara URLs |
| `src/app/sites/neelvara/robots.txt/route.ts` | Product-domain robots response |
| `src/app/sites/neelvara/sitemap.xml/route.ts` | Product-domain sitemap response |
| `src/app/sites/neelvara/.well-known/security.txt/route.ts` | Static security-contact discovery response |
| `src/app/sites/neelvara/styles.css` | Scoped Neelvara blue tokens, mesh/grain background, glass primitives, and responsive layout |
| `public/neelvara-logo.svg` | Uploaded transparent Neelvara source logo mark for site chrome, footer identity, 404, and structured data |
| `public/neelvara-logo.png` | Transparent PNG derivative of the uploaded Neelvara mark for compatibility surfaces |
| `public/neelvara-favicon-16.png`, `public/neelvara-favicon-32.png` | Browser favicon derivatives from the uploaded mark |
| `public/neelvara-apple-touch-icon.png` | Apple touch icon derivative from the uploaded mark |
| `public/neelvara-icon-96.png`, `public/neelvara-icon-128.png`, `public/neelvara-icon-180.png`, `public/neelvara-icon-192.png`, `public/neelvara-icon-512.png`, `public/neelvara-icon.png` | Transparent app/manifest icon canvases using the uploaded mark without a visible frame |
| `public/neelvara-og-image.png` | Open Graph image using the uploaded mark |

---

## 4. Files Modified

| File | Change |
| --- | --- |
| `src/constants/deploymentTargets.ts` | Added `neelvara` deployment target with empty Firebase project id |
| `src/constants/productDomains.ts` | Added Neelvara as enabled public product-site route/domain entry |
| `src/constants/urls.ts` | Added Neelvara domain notes and reserved subdomain slug |
| `src/lib/env/validateEnv.ts` | Added no-Firebase env validation entry for Neelvara |
| `scripts/verification/verify-agent-readiness.js` | Added Neelvara routing and no-Firebase assertions |
| `__docs__/changelog.md` | Recorded corrected Next/Vercel implementation |

---

## 5. Page Responsibilities

| Route | Responsibility |
| --- | --- |
| `/` | State the entity first, explain the product lineup, provide product-lineup/contact CTAs |
| `/products` | Show approved products in the Neelvara lineup and link to product domains |
| `/about` | Explain operating focus and boundaries |
| `/contact` | List business, legal, and privacy contact points |
| `/legal` | Provide entity and product relationship reference |
| `/privacy` | Company-website-only privacy policy |
| `/terms` | Company-website-only terms |
| unmatched paths | Return a plain Neelvara-branded `404` response with noindex metadata |

---

## 6. UI/UX Contract

The visual implementation now follows the Neelvara blue parent-brand system while preserving the company-site boundary:

- ice-white canvas with deep navy primary text and legal/docs surfaces
- uploaded Neelvara mark used as transparent PNG without a visible square or rectangle frame
- dark navy wordmark/text treatment; wordmark text is not gradient-rendered
- restrained mesh and SVG grain layer behind every section
- shared glass primitive for header, hero mock, bento cells, spotlight cards, contact cards, policy panels, and CTA bands
- navy product band used as the controlled 20% deep-brand surface
- Instrument Serif display headlines, Inter body text, and JetBrains Mono labels
- floating pill navigation with local-prefix-aware links for `/__neelvara` and `/nv`; primary header nav shows Products, About, and Contact only
- home page anatomy: floating nav, hero, company-routing studio mock, entity ledger, problem-first bento grid, spotlight cards, pull quote, product lineup, contact routing cards, CTA, footer
- About, Legal, Privacy, and Terms inherit the same mesh/glass shell, page hero, spotlight cards, glass text panels, policy dates where applicable, and page-specific final CTAs
- Products and Contact use custom page flows for product relationship explanation and inquiry routing
- the large hero studio mock remains on desktop/tablet; small phones hide it so the entity ledger appears in the first mobile viewport
- scroll reveal remains local to Neelvara sections, one-time on viewport entry, and disabled for reduced-motion users
- no pricing table, testimonials, customer logos, lead form, product checkout, analytics, API route, Firebase runtime, or owner app behavior was added
- SaaS pricing/customer sections were translated into entity-safe equivalents: problem-first company sections, product lineup, and business/legal/privacy contact routing
- homepage proof avoids numeric product-count and page-count signals; products are listed as operated products lower on the page
- local development links preserve the `/__neelvara` prefix without using server header reads
- public copy remains concise, factual, and governed by Neelvara's legal/product separation rules

---

## 7. SEO And Metadata

Implemented:

- canonical URL helper in `src/constants/neelvara/website.ts`
- metadata in `src/app/sites/neelvara/layout.tsx`
- per-page metadata through `buildPageMetadata` and custom Products/Contact metadata
- Open Graph image metadata using `public/neelvara-og-image.png`
- `Organization` and `WebSite` JSON-LD in `content.tsx`
- product-domain `robots.txt`
- product-domain `sitemap.xml`
- product-domain `.well-known/security.txt`
- site logo in `public/neelvara-logo.svg`
- browser favicon, Apple touch icon, and manifest icon derivatives from the uploaded mark
- duplicate `/home` route canonicalized to `/`; it remains indexable because the local root alias renders through the same route
- `X-Robots-Tag: noindex, nofollow` on the `/nv` internal alias response so `neelvara.com` remains the canonical public URL

---

## 8. Security And Data Boundary

The site has:

- no API routes
- no contact form
- no auth
- no Firebase imports
- no client-side state requirement
- no analytics script
- no Neelvara cookie banner or browser preference storage; no analytics, ads, personalization, account, form, or gated-download behavior is introduced
- no product app route
- no owner/mobile PWA surface

Security headers remain handled by the shared Next middleware and Vercel deployment layer.

---

## 9. Validation

Current validation:

```bash
npx tsc --noEmit --incremental false --pretty false
npm run lint -- --dir src/app/sites/neelvara
node scripts/verification/verify-agent-readiness.js --env-targets-only
```

Result: pass.

Additional browser/routing evidence is tracked in [`neelvara-main-website_validation.md`](./neelvara-main-website_validation.md).

---

## 10. Launch Deferrals

Do not implement in v1:

- product login
- pricing
- checkout
- product-specific privacy terms for any product site
- blog
- careers
- press kit
- investor pages
- admin area
- visitor database
- lead capture
- Firebase
- `PRODUCT_IDS` registration

Each deferral requires a separate docs and architecture review if later requested.

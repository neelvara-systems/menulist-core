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

Middleware uses the shared product-site rewrite flow plus one narrow Neelvara path helper. Bare `/`, `/home`, `/__neelvara`, `/__neelvara/home`, `/nv`, and `/nv/home` all target `/sites/neelvara`; other public paths append to that internal base. This prevents the catch-all route from destabilizing the homepage after a missing-route request.

---

## 3. Files Added

| File | Purpose |
| --- | --- |
| `src/constants/neelvara/product.ts` | Route/domain slug and display name |
| `src/constants/neelvara/domains.ts` | Internal route path, dev prefix, staging and production domains |
| `src/constants/neelvara/website.ts` | Canonical URL, public pages, contact emails, relationship line |
| `src/constants/neelvara/index.ts` | Neelvara constant exports |
| `src/app/sites/neelvara/layout.tsx` | Metadata, viewport, icon configuration |
| `src/app/sites/neelvara/content.tsx` | Shared shell, page data, document rows, contact directory, metadata, and structured data |
| `src/app/sites/neelvara/ProductLogo.tsx` | Shared Neelvara product-logo renderer that reuses the canonical Answerlattice header/footer mark with placement-safe SVG IDs |
| `src/app/sites/neelvara/ScrollRevealController.tsx` | Route-aware IntersectionObserver reveal controller with request-animation-frame recovery for fast scroll jumps and reduced-motion fallback |
| `src/app/sites/neelvara/page.tsx` | Home page |
| `src/app/sites/neelvara/home/page.tsx` | Legacy internal homepage compatibility module; public middleware rewrites `/home` directly to `/sites/neelvara` |
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
| `src/app/sites/neelvara/styles.css` | Scoped current-color Neelvara Prism tokens, fixed mesh/grain background, selective glass primitives, editorial rows, and responsive layout |
| `public/neelvara-logo.svg` | Uploaded true-vector Neelvara source logo preserved byte-for-byte, with its single compound path, exact four-stop blue-to-violet gradient, and supplied `0 0 1135 686` canvas used by site chrome, footer identity, 404, and structured data |
| `public/neelvara-logo.png` | Transparent `1135x686` compatibility render generated from the exact source SVG |
| `public/neelvara-favicon.svg` | Square true-vector favicon wrapper reusing the exact source compound path and gradient without transforms or color changes |
| `public/neelvara-favicon-16.png`, `public/neelvara-favicon-32.png` | PNG favicon fallbacks centered on transparent square canvases |
| `public/neelvara-apple-touch-icon.png` | Apple touch icon derivative from the supplied mark |
| `public/neelvara-icon-96.png`, `public/neelvara-icon-128.png`, `public/neelvara-icon-180.png`, `public/neelvara-icon-192.png`, `public/neelvara-icon-512.png`, `public/neelvara-icon.png` | Transparent app/manifest icon canvases using the supplied mark without a visible frame |
| `public/neelvara-og-image.png` | Opaque 1200x630 Open Graph/Twitter card showing Neelvara Systems, public brand Neelvara, the operated products, website, and approved business description |
| `scripts/website-assets/generate-neelvara-logo-assets.js` | Reproducible generator for the favicon SVG, PNG logo, favicon fallbacks, touch/manifest icons, and Open Graph derivative |
| `scripts/verification/verify-neelvara-logo-assets.js` | Source-hash, compound-path, palette, transparency, dimensions, optical-centering, small-size contrast, manifest, metadata, 404, and structured-data reference verifier |

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

The visual implementation now follows the current-color Neelvara Prism glass parent-brand system while preserving the company-site boundary:

- ice-white canvas with deep navy primary text and legal/docs surfaces
- supplied Neelvara SVG mark used directly without a visible square or rectangle frame
- dark navy wordmark/text treatment; wordmark text is not gradient-rendered
- self-hosted Akshar font as the primary typeface across all Neelvara website text, with Inter retained only as the fallback font
- fixed restrained mesh and SVG grain layer behind every section
- glass is reserved for the header, entity ledger, product cards, and closing action bands; contact and policy content use unframed rows
- repeated right-side page-summary panels are removed from Products, Contact, About, Legal, Privacy, Terms, and not-found routes
- homepage Prism rhythm includes a brand-first logo-led hero, entity ledger, editorial operating rows, relationship statement, high-contrast product lineup, compact contact routing, and footer
- full-width dark product band with an unframed section header and two individual light product cards; card accents reuse each product logo's approved colors
- Products uses one exact two-track grid for two equal detail cards, with no repeated product map or empty third track
- Akshar-only typography across display headings, body copy, buttons, labels, legal pages, product cards, and inline 404 output; `Inter` remains the first fallback in the font stack
- floating pill navigation with local-prefix-aware links for `/__neelvara` and `/nv`; primary header nav shows Products, About, and Contact once, with one `Email us` action
- home page anatomy: floating nav, brand-first logo-led hero, entity ledger, editorial operating rows, relationship statement, high-contrast product lineup, compact contact rows, footer
- About, Legal, Privacy, and Terms inherit the same mesh shell, one clear hero, unframed document rows, policy dates where applicable, and page-specific final CTAs
- Products and Contact use focused custom flows without duplicate hero summary cards
- scroll reveal remains local to Neelvara sections, one-time on viewport entry through IntersectionObserver, route-aware on client navigation, and disabled for reduced-motion users; non-rendered responsive targets resolve immediately, while a passive animation-frame recovery reveals any pending section already passed by a fast scroll or resize
- no pricing table, testimonials, customer logos, lead form, product checkout, analytics, API route, Firebase runtime, or owner app behavior was added
- SaaS pricing/customer sections were translated into entity-safe equivalents: problem-first company sections, product lineup, and business/legal/privacy contact routing
- homepage proof avoids numeric product-count and page-count signals; products are listed as operated products lower on the page
- local development links preserve the `/__neelvara` prefix without server header reads or hydration divergence; the server and first client render use canonical paths before the local alias snapshot resolves
- public copy remains concise, factual, and governed by Neelvara's legal/product separation rules

---

## 7. SEO And Metadata

Implemented:

- canonical URL helper in `src/constants/neelvara/website.ts`
- metadata in `src/app/sites/neelvara/layout.tsx`
- per-page metadata through `buildPageMetadata` and custom Products/Contact metadata
- Open Graph and Twitter metadata using the branded `public/neelvara-og-image.png` social card
- `Organization` and `WebSite` JSON-LD in `content.tsx`
- product-domain `robots.txt`
- product-domain `sitemap.xml`
- product-domain `.well-known/security.txt`
- site logo in `public/neelvara-logo.svg`
- browser favicon, Apple touch icon, and manifest icon derivatives from the refined mark
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
npm run generate:neelvara-assets
npm run verify:neelvara-logo-assets
npx tsc --noEmit --incremental false --pretty false
npx eslint src/app/sites/neelvara src/constants/neelvara --max-warnings=0
node scripts/verification/verify-agent-readiness.js --env-targets-only
```

Result: canonical path integrity, balanced logo canvases, all derived identity assets, scoped Neelvara lint, full TypeScript, route smoke, agent-readiness target check, browser visual checks, and whitespace checks pass.

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

---

## 11. August 10, 2026 Audit Update

Implemented from the parent-company benchmark audit:

- homepage H1 is now `Neelvara Systems`
- company and product purpose are stated directly beneath the brand
- duplicate header destinations, hero summary cards, homepage comparison table, repeated product map, and repeated homepage/contact closing CTA were removed
- contact routes render as compact rows
- policy pages render as unframed document sections and collapse to one column on mobile
- the true 404 route keeps its `404` response while using one branded recovery surface instead of a duplicate side panel
- local rewritten routes no longer produce different server/client link values during hydration

Source readiness and public availability remain separate: the repository implementation can be locally verified, but `neelvara.com` was still serving a GoDaddy Website Builder response during the August 10 audit. Vercel/DNS cutover was not performed in this work.

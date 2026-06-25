# ConstantLayer Main Website - Implementation Record

**Status:** Implemented; pending owner/legal launch review  
**Implementation target:** Existing Next.js/Vercel shared app  
**Runtime data:** None  
**Firebase impact:** None

---

## 1. Architecture Decision

ConstantLayer is implemented as a static public site inside the existing product-domain routing architecture.

It is not a database-backed product. Do not add ConstantLayer to `PRODUCT_IDS`, billing, Firestore collections, owner notifications, product plans, or Firebase projects.

---

## 2. Runtime Routes

| Environment | Public URL / path | Internal route |
| --- | --- | --- |
| Local | `http://localhost:3000/__constantlayer/` | `/sites/constantlayer` |
| Preview | `https://constantlayer.menulist.online` | `/sites/constantlayer` |
| Production | `https://constantlayer.in` and `https://www.constantlayer.in` | `/sites/constantlayer` |

Middleware uses the existing generic product-site rewrite flow. No ConstantLayer-specific middleware branch is required.

---

## 3. Files Added

| File | Purpose |
| --- | --- |
| `src/constants/constantlayer/product.ts` | Route/domain slug and display name |
| `src/constants/constantlayer/domains.ts` | Internal route path, dev prefix, staging and production domains |
| `src/constants/constantlayer/website.ts` | Canonical URL, public pages, contact emails, relationship line |
| `src/constants/constantlayer/index.ts` | ConstantLayer constant exports |
| `src/app/sites/constantlayer/layout.tsx` | Metadata, viewport, icon configuration |
| `src/app/sites/constantlayer/ConstantLayerCookieConsentBanner.tsx` | Client-side essential-storage banner with local-prefix-aware privacy link |
| `src/app/sites/constantlayer/content.tsx` | Shared content, shell, header/footer, cards, structured data |
| `src/app/sites/constantlayer/ScrollRevealController.tsx` | Local viewport-entry reveal controller with reduced-motion fallback |
| `src/app/sites/constantlayer/SpotlightCard.tsx` | Client-side cursor spotlight primitive for glass cards |
| `src/app/sites/constantlayer/page.tsx` | Home page |
| `src/app/sites/constantlayer/home/page.tsx` | Internal local-prefix homepage alias for bare `/__constantlayer` dev routing |
| `src/app/sites/constantlayer/products/page.tsx` | Products page |
| `src/app/sites/constantlayer/about/page.tsx` | About page |
| `src/app/sites/constantlayer/contact/page.tsx` | Contact page |
| `src/app/sites/constantlayer/legal/page.tsx` | Legal page |
| `src/app/sites/constantlayer/privacy/page.tsx` | Privacy page |
| `src/app/sites/constantlayer/terms/page.tsx` | Terms page |
| `src/app/sites/constantlayer/not-found.tsx` | Segment not-found UI |
| `src/app/sites/constantlayer/[...missing]/route.ts` | True 404 catch-all response for unmatched ConstantLayer URLs |
| `src/app/sites/constantlayer/robots.txt/route.ts` | Product-domain robots response |
| `src/app/sites/constantlayer/sitemap.xml/route.ts` | Product-domain sitemap response |
| `src/app/sites/constantlayer/styles.css` | Scoped Prism glass tokens, mesh/grain background, glass primitives, and responsive layout |
| `public/constantlayer-icon.svg` | Site icon |

---

## 4. Files Modified

| File | Change |
| --- | --- |
| `src/constants/deploymentTargets.ts` | Added `constantlayer` deployment target with empty Firebase project id |
| `src/constants/productDomains.ts` | Added ConstantLayer as enabled public product-site route/domain entry |
| `src/constants/urls.ts` | Added ConstantLayer domain notes and reserved subdomain slug |
| `src/lib/env/validateEnv.ts` | Added no-Firebase env validation entry for ConstantLayer |
| `scripts/verification/verify-agent-readiness.js` | Added ConstantLayer routing and no-Firebase assertions |
| `src/components/shared/publicCookieConsent/PublicCookieConsentBanner.module.css` | Added ConstantLayer-only privacy-link touch target styling |
| `__docs__/CHANGELOG.md` | Recorded corrected Next/Vercel implementation |

---

## 5. Page Responsibilities

| Route | Responsibility |
| --- | --- |
| `/` | State the entity first, explain the product lineup, provide product-lineup/contact CTAs |
| `/products` | Show approved product surfaces in the ConstantLayer lineup and link to product domains |
| `/about` | Explain operating focus and boundaries |
| `/contact` | List business, legal, and privacy contact points |
| `/legal` | Provide entity and product relationship reference |
| `/privacy` | Parent-site-only privacy information |
| `/terms` | Parent-site-only terms |
| unmatched paths | Return a plain ConstantLayer-branded `404` response with noindex metadata |

---

## 6. UI/UX Contract

The visual implementation now follows the Prism glass direction supplied for the ConstantLayer redesign while preserving the parent-site boundary:

- fixed six-stop mesh layer and SVG grain layer behind every section
- shared glass primitive for header, hero mock, bento cells, spotlight cards, table, product band, contact cards, and CTA bands
- Instrument Serif display headlines, Inter body text, and JetBrains Mono labels
- floating pill navigation with local-prefix-aware links for `/__constantlayer` and `/cl`
- home page anatomy: floating nav, hero, glass studio mock, entity ledger, marquee, bento grid, spotlight cards, pull quote, stats strip, comparison table, product lineup, contact routing cards, CTA, footer
- secondary pages inherit the same mesh/glass shell, page hero, spotlight cards, glass text panels, and final CTA
- the large hero studio mock remains on desktop/tablet; small phones hide it so the entity ledger appears in the first mobile viewport
- scroll reveal remains local to ConstantLayer sections, one-time on viewport entry, and disabled for reduced-motion users
- no pricing table, testimonials, customer logos, lead form, product checkout, analytics, API route, Firebase runtime, or owner app behavior was added
- Prism pricing/customer sections were translated into entity-safe equivalents: boundary comparison, product lineup, and business/legal/privacy contact routing
- local development links preserve the `/__constantlayer` prefix without using server header reads
- public copy remains concise, factual, and governed by ConstantLayer's legal/product separation rules

---

## 7. SEO And Metadata

Implemented:

- canonical URL helper in `src/constants/constantlayer/website.ts`
- metadata in `src/app/sites/constantlayer/layout.tsx`
- per-page metadata through `buildPageMetadata`
- `Organization` JSON-LD in `content.tsx`
- product-domain `robots.txt`
- product-domain `sitemap.xml`
- site icon in `public/constantlayer-icon.svg`

---

## 8. Security And Data Boundary

The site has:

- no API routes
- no contact form
- no auth
- no Firebase imports
- no client-side state requirement
- no analytics script
- shared public cookie acknowledgement only; no analytics, ads, personalization, account, form, or gated-download behavior is introduced
- no product app route
- no owner/mobile PWA surface

Security headers remain handled by the shared Next middleware and Vercel deployment layer.

---

## 9. Validation

Current validation:

```bash
npx tsc --noEmit --incremental false --pretty false
npm run lint -- --dir src/app/sites/constantlayer
node scripts/verification/verify-agent-readiness.js --env-targets-only
```

Result: pass.

Additional browser/routing evidence is tracked in [`constantlayer-main-website_validation.md`](./constantlayer-main-website_validation.md).

---

## 10. Launch Deferrals

Do not implement in v1:

- product login
- pricing
- checkout
- product-specific privacy terms for any product surface
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

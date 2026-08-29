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

| Environment | Public URL / path                                     | Internal route    |
| ----------- | ----------------------------------------------------- | ----------------- |
| Local       | `http://localhost:3000/__neelvara/`                   | `/sites/neelvara` |
| Preview     | `https://neelvara.menulist.online`                    | `/sites/neelvara` |
| Production  | `https://neelvara.com` and `https://www.neelvara.com` | `/sites/neelvara` |

Middleware uses the shared product-site rewrite flow plus one narrow Neelvara path helper. Bare `/`, `/home`, `/__neelvara`, `/__neelvara/home`, `/nv`, and `/nv/home` all target `/sites/neelvara`; other public paths append to that internal base. This prevents the catch-all route from destabilizing the homepage after a missing-route request.

---

## 3. Files Added

| File                                                                                                                                                                                      | Purpose                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/constants/neelvara/product.ts`                                                                                                                                                       | Route/domain slug and display name                                                                                                                                                                                                           |
| `src/constants/neelvara/domains.ts`                                                                                                                                                       | Internal route path, dev prefix, staging and production domains                                                                                                                                                                              |
| `src/constants/neelvara/website.ts`                                                                                                                                                       | Canonical URL, public pages, contact emails, relationship line                                                                                                                                                                               |
| `src/constants/neelvara/index.ts`                                                                                                                                                         | Neelvara constant exports                                                                                                                                                                                                                    |
| `src/app/sites/neelvara/layout.tsx`                                                                                                                                                       | Metadata, viewport, icon configuration                                                                                                                                                                                                       |
| `src/app/sites/neelvara/content.tsx`                                                                                                                                                      | Shared shell, page data, document rows, contact directory, metadata, and structured data                                                                                                                                                     |
| `src/app/sites/neelvara/ProductLogo.tsx`                                                                                                                                                  | Shared Neelvara product-logo renderer that reuses the canonical Answerlattice header/footer mark with placement-safe SVG IDs                                                                                                                 |
| `src/app/sites/neelvara/ScrollRevealController.tsx`                                                                                                                                       | Route-aware IntersectionObserver reveal controller with request-animation-frame recovery for fast scroll jumps and reduced-motion fallback                                                                                                   |
| `src/app/sites/neelvara/page.tsx`                                                                                                                                                         | Home page                                                                                                                                                                                                                                    |
| `src/app/sites/neelvara/home/page.tsx`                                                                                                                                                    | Legacy internal homepage compatibility module; public middleware rewrites `/home` directly to `/sites/neelvara`                                                                                                                              |
| `src/app/sites/neelvara/products/page.tsx`                                                                                                                                                | Products page                                                                                                                                                                                                                                |
| `src/app/sites/neelvara/about/page.tsx`                                                                                                                                                   | About page                                                                                                                                                                                                                                   |
| `src/app/sites/neelvara/contact/page.tsx`                                                                                                                                                 | Contact page                                                                                                                                                                                                                                 |
| `src/app/sites/neelvara/trust/page.tsx`                                                                                                                                                   | Trust & Verification page                                                                                                                                                                                                                    |
| `src/app/sites/neelvara/llms.txt/route.ts`                                                                                                                                                | Agent-readable company index and use boundary                                                                                                                                                                                                |
| `src/app/sites/neelvara/legal/page.tsx`                                                                                                                                                   | Legal page                                                                                                                                                                                                                                   |
| `src/app/sites/neelvara/privacy/page.tsx`                                                                                                                                                 | Privacy page                                                                                                                                                                                                                                 |
| `src/app/sites/neelvara/terms/page.tsx`                                                                                                                                                   | Terms page                                                                                                                                                                                                                                   |
| `src/app/sites/neelvara/not-found.tsx`                                                                                                                                                    | Segment not-found UI                                                                                                                                                                                                                         |
| `src/app/sites/neelvara/[...missing]/route.ts`                                                                                                                                            | True 404 catch-all response for unmatched Neelvara URLs                                                                                                                                                                                      |
| `src/app/sites/neelvara/robots.txt/route.ts`                                                                                                                                              | Product-domain robots response                                                                                                                                                                                                               |
| `src/app/sites/neelvara/sitemap.xml/route.ts`                                                                                                                                             | Product-domain sitemap response                                                                                                                                                                                                              |
| `src/app/sites/neelvara/.well-known/security.txt/route.ts`                                                                                                                                | Static security-contact discovery response                                                                                                                                                                                                   |
| `src/app/sites/neelvara/styles.css`                                                                                                                                                       | Scoped current-color Neelvara Prism tokens, fixed mesh/grain background, selective glass primitives, editorial rows, and responsive layout                                                                                                   |
| `public/neelvara-logo.svg`                                                                                                                                                                | Uploaded true-vector Neelvara source logo preserved byte-for-byte, with its single compound path, exact four-stop blue-to-violet gradient, and supplied `0 0 1135 686` canvas used by site chrome, footer identity, 404, and structured data |
| `public/neelvara-logo.png`                                                                                                                                                                | Transparent `1135x686` compatibility render generated from the exact source SVG                                                                                                                                                              |
| `public/neelvara-favicon.svg`                                                                                                                                                             | Square true-vector favicon wrapper reusing the exact source compound path and gradient without transforms or color changes                                                                                                                   |
| `public/neelvara-favicon-16.png`, `public/neelvara-favicon-32.png`                                                                                                                        | PNG favicon fallbacks centered on transparent square canvases                                                                                                                                                                                |
| `public/neelvara-apple-touch-icon.png`                                                                                                                                                    | Apple touch icon derivative from the supplied mark                                                                                                                                                                                           |
| `public/neelvara-icon-96.png`, `public/neelvara-icon-128.png`, `public/neelvara-icon-180.png`, `public/neelvara-icon-192.png`, `public/neelvara-icon-512.png`, `public/neelvara-icon.png` | Transparent app/manifest icon canvases using the supplied mark without a visible frame                                                                                                                                                       |
| `public/neelvara-og-image.png`                                                                                                                                                            | Opaque 1200x630 Open Graph/Twitter card showing Neelvara Systems, public brand Neelvara, the operated products, website, and approved business description                                                                                   |
| `scripts/website-assets/generate-neelvara-logo-assets.js`                                                                                                                                 | Reproducible generator for the favicon SVG, PNG logo, favicon fallbacks, touch/manifest icons, and Open Graph derivative                                                                                                                     |
| `scripts/verification/verify-neelvara-logo-assets.js`                                                                                                                                     | Source-hash, compound-path, palette, transparency, dimensions, optical-centering, small-size contrast, manifest, metadata, 404, and structured-data reference verifier                                                                       |

---

## 4. Files Modified

| File                                             | Change                                                            |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| `src/constants/deploymentTargets.ts`             | Added `neelvara` deployment target with empty Firebase project id |
| `src/constants/productDomains.ts`                | Added Neelvara as enabled public product-site route/domain entry  |
| `src/constants/urls.ts`                          | Added Neelvara domain notes and reserved subdomain slug           |
| `src/lib/env/validateEnv.ts`                     | Added no-Firebase env validation entry for Neelvara               |
| `scripts/verification/verify-agent-readiness.js` | Added Neelvara routing and no-Firebase assertions                 |
| `__docs__/changelog.md`                          | Recorded corrected Next/Vercel implementation                     |

---

## 5. Page Responsibilities

| Route           | Responsibility                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `/`             | State the entity first, explain the product lineup, provide product-lineup/contact CTAs                                     |
| `/products`     | Show approved products in the Neelvara lineup and link to product domains                                                   |
| `/about`        | Explain operating focus and boundaries                                                                                      |
| `/contact`      | List business, legal, and privacy contact points                                                                            |
| `/trust`        | Provide a source-linked status ledger for company identity, operated products, website boundaries, and verification routing |
| `/legal`        | Provide entity and product relationship reference                                                                           |
| `/privacy`      | Company-website-only privacy policy                                                                                         |
| `/terms`        | Company-website-only terms                                                                                                  |
| unmatched paths | Return a plain Neelvara-branded `404` response with noindex metadata                                                        |

---

## 6. UI/UX Contract

The visual implementation now follows the current-color Neelvara Prism glass parent-brand system while preserving the company-site boundary:

- ice-white canvas with deep navy primary text and legal/docs surfaces
- supplied Neelvara SVG mark used directly without a visible square or rectangle frame
- dark navy wordmark/text treatment; wordmark text is not gradient-rendered
- self-hosted Akshar font for brand, display headings, navigation, labels, and actions; Inter/system typography is reserved for paragraphs and long-form reading
- fixed restrained mesh and SVG grain layer behind every section
- glass is reserved for the header, product cards, and closing action bands; contact and policy content use unframed rows
- repeated right-side page-summary panels are removed from Products, Contact, About, Legal, Privacy, Terms, and not-found routes
- homepage Prism rhythm includes a centered company-statement hero, editorial operating rows, high-contrast product lineup, compact contact routing, and footer
- full-width pale-blue product band with a high-contrast ink section header and two individual light product cards; card accents reuse each product logo's approved colors
- Products uses one exact two-track grid for two equal detail cards, with no repeated product map or empty third track
- the typography split keeps Neelvara distinctive where users scan and calmer where they read: Akshar for display/UI roles, Inter/system for paragraph, list, and legal copy
- floating pill navigation with local-prefix-aware links for `/__neelvara` and `/nv`; primary header nav shows Products, About, and Contact once, with one `Email us` action
- home page anatomy: floating nav, centered company-statement hero with distinct Products and About actions, editorial operating rows, high-contrast product lineup, compact contact rows, footer
- the homepage source mark stays unframed but receives more first-fold space on wide screens and a compact mobile presentation instead of disappearing; this is factual company identity, not a product mock, metric, or second conversion flow
- About, Legal, Privacy, and Terms inherit the same mesh shell, one clear hero, unframed document rows, policy dates where applicable, and page-specific final CTAs
- Products and Contact use focused custom flows without duplicate hero summary cards
- scroll reveal remains local to Neelvara sections, one-time on viewport entry through IntersectionObserver, route-aware on client navigation, and disabled for reduced-motion users; non-rendered responsive targets resolve immediately, while a passive animation-frame recovery reveals any pending section already passed by a fast scroll or resize
- no pricing table, testimonials, customer logos, lead form, product checkout, analytics, API route, Firebase runtime, or owner app behavior was added
- SaaS pricing/customer sections were translated into entity-safe equivalents: problem-first company sections, product lineup, and business/legal/privacy contact routing
- homepage proof avoids numeric product-count and page-count signals; products are listed as operated products lower on the page
- local development links preserve the `/__neelvara` prefix without server header reads or hydration divergence; the server and first client render use canonical paths before the local alias snapshot resolves
- public copy remains concise, factual, and governed by Neelvara's legal/product separation rules
- Trust & Verification is a footer-level static reference. Its status labels describe published source availability, not a certification, SLA, audit result, or product security guarantee.

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
- product-domain `llms.txt` linked from `robots.txt`, with canonical company, product, and page destinations expressed as Markdown links
- homepage `Accept: text/markdown` negotiation with cache-safe `Vary` headers
- Markdown recovery body for unknown Markdown requests while preserving the real `404` status
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

---

## 12. August 29, 2026 Signal Constellation Hero (Superseded)

This records the earlier Signal Constellation implementation, which was later superseded by the centered company hero in section 14:

- the exact canonical `public/neelvara-logo.svg` geometry over a generated pale information-network field; the earlier generated 3D reinterpretation is no longer rendered
- two compact MenuList and Answerlattice signal nodes sourced from the existing public product lineup
- pointer-directed restrained tilt, a faint duplicate depth layer, directional shadow, logo-masked light, and separately layered product-node movement on fine-pointer devices; dimensional treatment cannot change the canonical front-face geometry, touch input is ignored, and reduced-motion behavior is preserved
- an asymmetric desktop hero that collapses to a readable single-column mobile composition
- the existing Products, About, Contact, product, legal, and inbox routes remain unchanged

The work does not add a form, analytics, auth, Firebase, API, invented metrics, or new public product claims.

---

## 13. August 29, 2026 Footer Aura Signature

The homepage closes with a decorative Neelvara aura and the shared footer composed as one final stage:

- `NeelvaraAuraOrb.tsx` samples the alpha silhouette of the canonical `public/neelvara-logo.svg` into a Canvas 2D dot field; it does not redraw, inflate, or reinterpret the logo geometry
- a restrained highlight completes one left-to-right-to-left pendulum cycle every 10 seconds, changing brightness and size only for sampled dots on the logo arcs while the silhouette remains fixed; no moving light point or canvas-background glow is rendered
- on fine-pointer devices, dots close to the pointer receive a bounded magnetic ripple with slight tangential movement and smoothly return to their sampled coordinates; the maximum displacement remains small enough to preserve logo recognition
- every sampled point also carries a deterministic sub-pixel phase, producing continuous low-amplitude drift without random restarts or background particles
- the Canvas 2D layer stays transparent; a restrained local reuse of the existing page-mesh blue/indigo radial pattern sits behind the final stage rather than introducing a separate dark or plain-white closing panel
- contact-directory content remains in normal document flow above the final stage so interactive links do not compete with the pointer-responsive logo field
- the aura fills a relative final-stage container while the shared footer is anchored at `bottom: 0` over its lower edge; the logo is optically shifted upward to maintain clear separation from the footer rule and links
- the renderer caps device pixel ratio, rebuilds responsively, pauses outside the viewport or while the document is hidden, and becomes a static frame under `prefers-reduced-motion`

---

## 14. August 29, 2026 Centered Company Hero

The homepage now uses a centered, message-led company hero:

- the earlier right-side Signal Constellation is no longer rendered because it repeated the Neelvara mark already used in the header and footer signature
- the static signal-field image was initially retained as ambient depth and is superseded by the live field recorded in section 15
- eyebrow, company name, operating tagline, supporting line, and the existing Products and About actions share one centered reading path
- MenuList and Answerlattice remain represented in the dedicated product lineup below the operating approach rather than as floating hero nodes
- routes, metadata, public copy meaning, product boundaries, and the static-site runtime remain unchanged

---

## 15. August 29, 2026 Live Hero Field And Relationship Cleanup

- `Neelvara Systems` stays on one line at desktop widths and returns to a readable two-line mobile lockup below the narrow breakpoint
- the static network image is no longer rendered in the hero
- `NeelvaraHeroField.tsx` draws a sparse blue-to-violet data current with Canvas 2D: irregular outer particles represent raw inputs while more cohesive inner lanes represent structured, presentation-ready information
- the complete field moves through one loose-to-organized-to-loose pendulum rhythm using the same `NEELVARA_PENDULUM_CYCLE_MS` 10-second source as the footer aura instead of duplicating an unrelated timing value
- pointer proximity creates a bounded local eddy, moving nearby particles around the pointer while the wider school keeps its coordinated rhythm
- the field caps device pixel ratio, pauses outside the viewport or while the document is hidden, ignores touch input, and becomes a static composition under `prefers-reduced-motion`
- a centered low-opacity scrim protects copy contrast without creating a card or panel around the hero content
- the standalone Company relationship band is removed because the company/product relationship is already clear in the eyebrow, operating copy, product lineup, About page, and product-site references
- no public claim, route, metadata, product boundary, Firebase surface, API, or dependency changes
- the treatment is homepage-only and `aria-hidden`; it adds no navigation, claims, tracking, storage, form behavior, or new dependency
- ThreeUI Aura and Brand Orbs were used as interaction references only. Their fixed brand library was not installed because it does not provide a Neelvara variant and would be disproportionate to this single decorative use

---

## 16. August 29, 2026 Unified Cross-Page Surface System

- Every major information section now uses one shared, quiet content plane instead of alternating between unrelated bands, glass cards, plain rows, and hard section boundaries.
- Related information inside a plane is grouped with spacing and a single soft divider; it is not wrapped in another competing card.
- Desktop content planes use a consistent `24px` radius and mobile planes use `20px`. Genuine nested product cards retain a smaller `18px` radius, while buttons remain pill-shaped.
- The homepage operating approach, product lineup, and contact directory now follow the same surface and spacing system.
- Products and Contact group their primary content into the same section planes. About, Trust, Legal, Privacy, and Terms inherit the document-flow treatment through the shared secondary-page renderer.
- The earlier product-band color break is removed. All routes now continue on one light Neelvara canvas with restrained blue and violet ambient depth.
- This is a presentation-only refinement. It does not change routes, company or product copy, legal text, metadata, links, static-site behavior, Firebase boundaries, or dependencies.

---

## 17. August 30, 2026 Viewport Entry Choreography

- The existing `.nv-reveal` system now waits until a section reaches the lower 88% of the viewport instead of revealing content before the user can perceive it.
- Every reveal target receives a two-frame setup before observation begins, ensuring the pending state is painted before the entry transition starts on initial load.
- Section containers rise through a restrained 24px transition while meaningful children use a 65ms stagger: hero hierarchy, section introductions, principles, product rows, contact routes, trust rows, policy content, and closing actions.
- Child choreography uses a finite CSS animation, so existing hover, focus, and pressed transforms regain control after entry rather than inheriting a permanent transition delay.
- Reveal remains once-only for each rendered page view and uses `IntersectionObserver`; no continuous window scroll listener or new runtime dependency is introduced.
- `prefers-reduced-motion` keeps all content immediately visible and disables both container and child entry motion.

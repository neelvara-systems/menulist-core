# Neelvara Main Website - Website Content Contract

**Status:** Implemented; pending owner/legal launch review
**Surface:** Public company website
**Implementation target:** Shared Next/Vercel static product-site route

---

## 1. Site Map

```text
/
/products
/about
/contact
/legal
/privacy
/terms
/404
```

The site is intentionally small. Do not add blog, pricing, demo, resources, careers, investor pages, press pages, or unapproved product placeholders in v1.

---

## 2. Global Header And Footer

Header:

- Brand: `Neelvara`
- Primary nav: `Products`, `About`, `Contact`
- Header action: `Email us`

Footer:

- Line: `© 2026 Neelvara Systems`
- Links: `Products`, `About`, `Legal`, `Privacy`, `Terms`, `Contact`

Do not place GSTIN, PAN, residential address, or unreviewed entity claims in global chrome unless legal/CA review requires it and the owner approves public display.

---

## 3. Visual System

Neelvara uses a blue-rooted institutional palette expressed through the Prism glass layout language. The site should feel global, durable, and parent-company appropriate, not spiritual, decorative, crypto-like, or consumer SaaS-like.

Approved palette:

| Role | Token | Hex | Use |
| --- | --- | --- | --- |
| Primary ink | Neelvara Navy | `#071323` | Wordmark text, headings, legal/docs presence |
| Primary blue | Neel Blue | `#1457D9` | CTAs, links, key identity moments |
| Gradient blue | Clear Blue | `#2384FF` | Logo-adjacent highlights and restrained accents |
| Bridge color | Royal Indigo | `#2737C8` | Structured accents |
| Accent violet | Controlled Violet | `#6542E8` | Rare accent use only |
| Background | Ice White | `#F7F9FC` | Website background and decks |
| Soft surface | Pale Blue Grey | `#EEF3FA` | Cards, panels, subtle dividers |
| Secondary text | Slate | `#5D6678` | Body text and captions |

Usage ratio:

- about 70% off-white or pale blue-grey background
- about 20% deep navy
- about 8% blue
- about 2% violet

Layout language:

- fixed restrained mesh plus subtle grain behind the page
- glass panels with consistent stroke, blur, and inset highlight
- Akshar typography across display headlines, compact labels, and concise body copy, with Inter retained only as fallback
- home page uses a brand-first split hero with an unframed source logo visual, compact company ledger, editorial operating rows, relationship statement, high-contrast product lineup, compact contact routing, and footer
- secondary pages use one clear editorial hero; repeated right-side reference-summary cards are not used
- legal, privacy, and terms sections use unframed document rows that collapse to one readable column on mobile
- decorative browser mocks, fake charts, marquees, numbered section labels, and duplicate summary-card grids are not part of the current public layout

Logo rule:

- use the supplied continuous loop-and-arrow Neelvara mark
- `public/neelvara-logo.svg` is the source website mark used in header, footer, 404, and structured data
- the source SVG is the uploaded true-vector file preserved byte-for-byte; its compound path, gradient, stops, proportions, and canvas must not be redrawn, filtered, simplified, recolored, or replaced by an embedded raster image
- the master SVG retains its supplied `0 0 1135 686` viewBox and balanced transparent padding
- the approved logo palette is exactly Clear Blue `#2384FF`, Neel Blue `#1457D9`, Royal Indigo `#2737C8`, and Controlled Violet `#6542E8`
- the visible website logo must not sit inside a square, rounded-rectangle, card, or boxed frame
- PNG derivatives are only for browser/favicon, Open Graph, or platform compatibility surfaces
- `public/neelvara-og-image.png` is an opaque 1200x630 social card, not a transparent logo export. It should explain the public brand in one glance with the logo, a plain-language purpose statement, the two operated products, and one bottom-right `https://neelvara.com` URL. Formal trade-name and full-description details remain in page metadata and structured data.
- `public/neelvara-favicon.svg` is the preferred browser favicon and reuses the exact supplied compound path and gradient on a balanced transparent square canvas without path transforms or color changes
- favicon PNG fallbacks, Apple touch icon, manifest PNG derivatives, the compatibility PNG, and the Open Graph card are generated with `npm run generate:neelvara-assets` and verified with `npm run verify:neelvara-logo-assets`
- logo, favicon, touch, and manifest derivatives keep transparent corners; the Open Graph card intentionally uses an opaque background for social-preview readability
- wordmark/page text stays `#071323`

Avoid:

- colors outside the supplied four-stop logo gradient
- direct product-brand logo recolors
- rose, amber, peach, or warm SaaS palettes
- black-only luxury styling
- broad AI-tool, crypto, or spiritual visual cues

---

## 4. Canonical Public Copy

Category sentence:

```text
Neelvara Systems operates MenuList and Answerlattice, focused software for public business facts and approved support answers.
```

Relationship sentence:

```text
MenuList and Answerlattice are operated by Neelvara Systems.
```

Homepage support copy:

```text
We operate focused software for public business facts and approved support answers.
```

Do not use the old relationship phrasing in runtime copy. Use `operated by`.

---

## 5. Home Page

Purpose: establish entity identity, explain why the company exists, show the operated products, and route company inquiries.

Required flow:

1. Brand-first split hero: `Neelvara Systems` is the H1, followed by `Information customers can rely on.`, concise operating copy, `View Products`, `Email Neelvara`, and an unframed source-logo visual.
2. Entity ledger: company, operated products, and country.
3. Operating approach: an asymmetric editorial layout with three unframed rows for company reference, independent product surfaces, and direct inquiry routing.
4. Company relationship statement using the canonical relationship sentence.
5. Current products: two linked product cards with the actual MenuList and Answerlattice marks.
6. Contact routes: business, legal, and privacy inbox rows.

Do not show product-count stats, page-count stats, internal implementation labels, storage claims, API claims, fake dashboards, decorative activity charts, numeric product proof, a company/product/app comparison matrix, or a repeated closing CTA.

---

## 6. Products Page

Purpose: map operated products without turning the company website into a product funnel.

Required H1:

```text
Products operated by Neelvara Systems.
```

Required sections:

- One clear lineup section under `Two products. Two information jobs.`
- Two equal product detail cards carry the actual logos, category, summary, focus labels, and direct product-site CTA.
- One closing boundary band states that product pricing, onboarding, support, documentation, privacy, terms, and account questions remain on the relevant product website.

Product summaries:

- MenuList: `Keeps menus, hours, profiles, and customer-facing details in a public business information source.`
- Answerlattice: `Keeps support knowledge, help content, and business responses tied to approved answers.`

Only show products approved for company-site mention. Do not show Canonica, GrowthOS, KitStamp, SurfaceOS, MyCodex, private/internal tools, placeholder products, or future-product cards.

---

## 7. About Page

Purpose: explain the company focus and the boundaries of what it does not build.

Opening:

```text
Neelvara Systems operates MenuList and Answerlattice, focused software for public business facts and approved support answers.
```

Required themes:

- Business information: public facts, approved answers, and reusable business context.
- Quiet operation: maintained information sources over noisy dashboards or broad public promises.
- Operational fit: fewer repeated updates, clearer public facts, and less support drift.

Required `What we do not build` content:

- No POS, payroll, accounting, CRM, delivery, or internal operations platform is claimed on this company website.
- Product websites explain product capabilities.
- Company pages make product operation and contact routes easy to verify.

GSTIN, PAN, residential address, and sensitive registration details belong to legal review and should not be explained on About.

---

## 8. Contact Page

Purpose: route company inquiries without collecting form submissions.

Required H1:

```text
Start with the right contact route.
```

Required sections:

- Company inboxes: compact business, legal, and privacy rows.
- Product support: direct links to MenuList and Answerlattice websites.
- Before you contact us: keep first message focused; do not include private records, secrets, customer datasets, or sensitive documents unless requested.
- Country of operation: India.

No contact form, newsletter signup, gated download, lead database, or account workflow.

---

## 9. Legal Page

Purpose: provide basic entity and product relationship information.

Required fields:

- Operating trade name: `Neelvara Systems`
- Product relationship: canonical relationship sentence
- Country of operation: `India`
- Legal contact: configured legal email

Required notes:

- Product pricing, onboarding, support, billing, cancellation, refund, and service terms belong on the relevant product site.
- This page does not claim private-limited status, subsidiaries, or holding-company structure.
- Sensitive registration or tax identifiers are not published unless reviewed and approved for the specific use.

---

## 10. Privacy Page

Purpose: lightweight Privacy Policy for the Neelvara Systems company website only.

Required title and date:

```text
Privacy Policy
Last updated: June 26, 2026
```

Required sections:

- Summary
- Information we receive
- Email communication
- Website infrastructure
- How information is used
- Product privacy
- Changes to this policy
- Privacy questions

Do not claim this policy covers product accounts, business data, menu data, support tickets, campaign data, customer interactions, billing, or product support unless the policy is intentionally expanded and reviewed.

---

## 11. Terms Page

Purpose: lightweight Terms of Use for the Neelvara Systems company website only.

Required title and date:

```text
Terms of Use
Last updated: June 26, 2026
```

Required sections:

- Acceptance
- Use of this website
- Restrictions
- Product separation
- Intellectual property
- No product commitments
- Disclaimers and limitation
- Governing law and contact

Product usage, billing, refunds, cancellation, onboarding, support, service availability, and account terms belong on the relevant product website.

---

## 12. 404 Page

Required H1:

```text
Page not found
```

Required actions:

- Home
- Products
- Contact

Required secondary content:

- Product shortcuts to MenuList and Answerlattice.
- Plain explanation that product support, onboarding, billing, documentation, and account questions should start from the relevant product site.
- A single branded recovery surface using the supplied logo and the same Home, Products, and Contact routes; no duplicate side summary panel.

---

## 13. August 10, 2026 Benchmark Audit

Primary references reviewed:

- Automattic: plain company idea followed by direct product proof.
- 37signals: a distinct company identity with clear product-site boundaries.
- Tiny: the current company portfolio is the primary evidence for the parent company.
- Mailmodo: useful CTA and hierarchy discipline, but its product-conversion density is not appropriate for this parent-company website.

Adopted:

- brand name as the homepage H1
- real operated products as the central proof
- one primary navigation instance per destination
- shorter pages with fewer repeated summaries
- visible, direct company inboxes

Rejected:

- lead-generation forms, demo funnels, testimonial walls, pricing content, and growth-site conversion density
- generic SaaS feature grids, fake dashboard scenes, and unsupported scale claims
- copying another company website's visual identity or content structure literally

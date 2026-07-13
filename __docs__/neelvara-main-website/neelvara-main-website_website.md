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
- Header action: `Products`

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
- current-color prism panels on major page heroes and not-found recovery
- Akshar typography across display headlines, compact labels, and concise body copy, with Inter retained only as fallback
- home page uses a split company hero, factual reference summary, compact company ledger, unframed operating principles, relationship statement, product lineup, boundary table, contact routing, CTA, and footer
- secondary pages use a two-column page hero with a factual reference panel and consistent horizontal content rows
- decorative browser mocks, fake charts, marquees, numbered section labels, and duplicate summary-card grids are not part of the current public layout

Logo rule:

- use the glass-prism Neelvara mark with the supplied three-path geometry preserved
- `public/neelvara-logo.svg` is the source website mark used in header, footer, 404, and structured data
- the source SVG is a true vector file; path geometry must not be redrawn, filtered, simplified, or replaced by an embedded raster image
- the master SVG uses the balanced `68 0 487 320` viewBox; this corrects transparent canvas padding without resizing, moving, rotating, or transforming any path
- the approved logo palette is frosted periwinkle, muted blue-violet, and silver-lavender so the parent mark stays distinct from the product brands
- the visible website logo must not sit inside a square, rounded-rectangle, card, or boxed frame
- PNG derivatives are only for browser/favicon, Open Graph, or platform compatibility surfaces
- `public/neelvara-favicon.svg` is the preferred browser favicon and uses the exact three paths on a balanced transparent square canvas without path transforms
- favicon-only fill opacity and outline strength may be increased for 16-32px legibility; path geometry, gradients, colors, relative placement, and angles remain locked
- favicon PNG fallbacks, Apple touch icon, manifest PNG derivatives, the compatibility PNG, and the Open Graph image are generated with `npm run generate:neelvara-assets` and verified with `npm run verify:neelvara-logo-assets`
- all generated derivatives must keep transparent corners, a centered silhouette, and no visible frame
- wordmark/page text stays `#071323`

Avoid:

- cyan-heavy gradients
- pure purple branding
- direct product-brand logo recolors
- rose, amber, peach, or warm SaaS palettes
- black-only luxury styling
- broad AI-tool, crypto, or spiritual visual cues

---

## 4. Canonical Public Copy

Category sentence:

```text
Neelvara Systems operates software infrastructure for customer-facing business information.
```

Relationship sentence:

```text
MenuList and Answerlattice are operated by Neelvara Systems.
```

Homepage support copy:

```text
We operate focused products that keep public business facts and approved answers clear, current, and easy to use.
```

Do not use the old relationship phrasing in runtime copy. Use `operated by`.

---

## 5. Home Page

Purpose: establish entity identity, explain why the company exists, show the operated products, and route company inquiries.

Required flow:

1. Split hero: infrastructure headline, concise operating description, `View Products`, `Email Neelvara`, and a factual company reference summary.
2. Entity ledger: company, operated products, and country.
3. Operating approach: three unframed principles for company reference, independent product surfaces, and direct inquiry routing.
4. Company relationship statement using the canonical relationship sentence.
5. Current products: two linked product cards with the actual MenuList and Answerlattice marks.
6. Comparison/reference table separating company reference, product websites, and product apps.
7. Contact routes: business, legal, and privacy inbox cards.
8. Final company-contact band.

Do not show product-count stats, page-count stats, internal implementation labels, storage claims, API claims, fake dashboards, decorative activity charts, or numeric product proof. The hero reference panel must contain only factual company, product, contact, and country information.

---

## 6. Products Page

Purpose: map operated products without turning the company website into a product funnel.

Required H1:

```text
Products operated by Neelvara Systems.
```

Required sections:

- Product map: a full-width section header, one company-information root strip, and two equal compact product nodes under `Each product has a distinct role.`
- Product architecture nodes:
  - MenuList: `Public business information`
  - Answerlattice: `Approved business answers`
- Product map nodes show category and product identity only; product summaries are not repeated there.
- Two equal product detail cards carry the summaries, focus chips, and direct product-site CTAs.
- Product boundaries: product pricing, onboarding, support, documentation, privacy, and terms remain on individual product websites.
- Looking for something specific: product questions go to product sites; company questions go to Neelvara.

Product summaries:

- MenuList: `Keeps menus, hours, profiles, and customer-facing details in a public business information source.`
- Answerlattice: `Keeps support knowledge, help content, and business responses tied to approved answers.`

Only show products approved for company-site mention. Do not show Canonica, GrowthOS, KitStamp, SurfaceOS, MyCodex, private/internal tools, placeholder products, or future-product cards.

---

## 7. About Page

Purpose: explain the company focus and the boundaries of what it does not build.

Opening:

```text
Neelvara Systems operates infrastructure for customer-facing business information that should stay accurate without constant maintenance.
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
Choose the right contact route.
```

Required sections:

- Company inboxes: business, legal, and privacy cards.
- Product support: direct links to MenuList and Answerlattice websites.
- Before you contact us: keep first message focused; do not include private records, secrets, customer datasets, or sensitive documents unless requested.
- Country of operation: India.
- Final email CTA to the business inbox.

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
- Current-color Prism recovery panel with Home, Products, and Contact routes.

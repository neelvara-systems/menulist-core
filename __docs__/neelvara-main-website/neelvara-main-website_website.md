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
- home page uses the Prism rhythm of hero, marquee, ledger, bento/reference modules, spotlight cards, quote, comparison table, product lineup, contact routing, CTA, and footer
- secondary pages use a two-column page hero with a Prism panel and alternating glass text sections

Logo rule:

- use the glass-prism Neelvara mark with the supplied three-path geometry preserved
- `public/neelvara-logo.svg` is the source website mark used in header, footer, 404, and structured data
- the source SVG is a true vector file; path geometry must not be redrawn, filtered, simplified, or replaced by an embedded raster image
- the approved logo palette is frosted periwinkle, muted blue-violet, and silver-lavender so the parent mark stays distinct from MenuList blue, Answerlattice green, and CampaignCue dark-blue/pink
- the visible website logo must not sit inside a square, rounded-rectangle, card, or boxed frame
- PNG derivatives are only for browser/favicon, Open Graph, or platform compatibility surfaces
- `public/neelvara-favicon.svg` is the preferred browser favicon and keeps the refined mark centered on a transparent square canvas
- favicon PNG fallbacks, Apple touch icon, and manifest PNG derivatives are generated from the source mark and must not show a visible frame
- wordmark/page text stays `#071323`

Avoid:

- cyan-heavy gradients
- pure purple branding
- MenuList-blue, Answerlattice-green, or CampaignCue-pink logo recolors
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
MenuList, Answerlattice, and CampaignCue are operated by Neelvara Systems.
```

Homepage support copy:

```text
Neelvara Systems operates products that keep public business facts, approved answers, and reusable business context clear before they reach customers.
```

Do not use the old relationship phrasing in runtime copy. Use `operated by`.

---

## 5. Home Page

Purpose: establish entity identity, explain why the company exists, show the operated products, and route company inquiries.

Required flow:

1. Hero: `Neelvara Systems`, category eyebrow, support copy, `View Products`, `Email Neelvara`.
2. Marquee band: company reference, product boundaries, direct email, public facts, approved answers, reusable context.
3. Entity ledger: company, products, contact.
4. Why Neelvara exists: problem-first bento cards for company, products, contact, policies, support, and legal boundary.
5. Spotlight cards: public business facts need one accountable source; each product handles a distinct information job; company questions stay separate from product support.
6. Company relationship quote using the canonical relationship sentence.
7. Comparison/reference table separating company reference, product websites, and product apps.
8. Current products: linked rows with actual MenuList, Answerlattice, and CampaignCue marks.
9. Contact routes: business, legal, and privacy inbox cards.
10. Final company-contact band.

Do not show product-count stats, page-count stats, internal implementation labels, storage claims, API claims, or broad boundary tables on the homepage. The hero artifact should show company routing and verification context, not a numeric product total.

---

## 6. Products Page

Purpose: map operated products without turning the company website into a product funnel.

Required H1:

```text
Products operated by Neelvara Systems.
```

Required sections:

- Product map: `Each product has a distinct role.`
- Product architecture cards:
  - MenuList: `Public business information`
  - Answerlattice: `Approved business answers`
  - CampaignCue: `Reusable business context`
- Product detail cards with focus chips and direct product-site CTAs.
- Product boundaries: product pricing, onboarding, support, documentation, privacy, and terms remain on individual product websites.
- Looking for something specific: product questions go to product sites; company questions go to Neelvara.

Product summaries:

- MenuList: `Keeps menus, hours, profiles, and customer-facing details in a public business information source.`
- Answerlattice: `Keeps support knowledge, help content, and business responses tied to approved answers.`
- CampaignCue: `Keeps campaign briefs, reusable content, and marketing assets tied to business context.`

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
- Product support: direct links to MenuList, Answerlattice, and CampaignCue websites.
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

- Product shortcuts to MenuList, Answerlattice, and CampaignCue.
- Plain explanation that product support, onboarding, billing, documentation, and account questions should start from the relevant product site.
- Current-color Prism recovery panel with Home, Products, and Contact routes.

# Neelvara Main Website - Specification

**Status:** Implemented and validated; pending owner/legal launch review
**Stage:** Implemented static website with Neelvara blue redesign
**Scope:** Neelvara Systems public company/entity trust website
**Primary transcript input:** [`neelvara-main-website_chatgpt-transcript.md`](./neelvara-main-website_chatgpt-transcript.md)

---

## 1. Product Context

Neelvara Systems is the operating trade name / company trust layer for the current operated product lineup.

The website must make the entity credible, searchable, and legally consistent without pulling commercial attention away from MenuList, Answerlattice, or CampaignCue.

Current repo truth supports this boundary:

- Neelvara is not present in `PRODUCT_IDS`: `src/constants/product.ts:13`.
- Neelvara is a public route/domain `ProductSiteId`, not a database-backed `pId`: `src/constants/productDomains.ts:53`.
- Neelvara is a Vercel deployment target with no Firebase project: `src/constants/deploymentTargets.ts:12`.
- The shared product website router is for product sites under `src/app/sites/[productId]`: `src/constants/productDomains.ts:4`.

Therefore the Neelvara website is implemented as a static public site inside the existing shared Next/Vercel routing architecture while staying outside database-backed product identity.

---

## 2. Goal

Create a small public website that answers five questions:

1. What is Neelvara Systems?
2. What products are in the lineup today?
3. How is it related to MenuList, Answerlattice, and CampaignCue?
4. How can someone contact the operator?
5. Where can someone find basic legal, privacy, and terms information?

The website succeeds when a visitor can verify the operating company behind the current product lineup without being invited into a second sales flow.

---

## 3. Non-Goals

Do not build any of the following for this company site:

- Product dashboard
- Authentication
- Contact form
- CMS
- Blog/news/resources
- Pricing
- Careers
- Investor/press pages
- Product login
- Product demo CTA
- Placeholder product grid with unapproved products
- Firebase-backed data model
- Analytics that stores identifiable visitor data
- MenuList feature duplication
- Public claims for Canonica, GrowthOS/Growth Kits, KitStamp, SurfaceOS, MyCodex, SignalDesk, or any other private, internal, reserved, or future product not yet approved for company-site mention

If another product becomes legally and publicly ready, add it only through a separate docs pass, public-surface review, product-policy review, and legal review.

---

## 4. Audience Hierarchy

### Primary

People who need to verify the operating company behind the current product lineup:

- Prospective product customers checking business legitimacy
- Partners, vendors, payment providers, and service providers
- Search engines and entity parsers
- Legal/privacy contacts

### Secondary

People who encounter Neelvara through invoices, footer links, policies, or email:

- Product users
- Business owners comparing a Neelvara product
- Domain/email verification reviewers
- CA/legal/accounting reviewers

### Ignored For V1

The site should not optimize for:

- Hiring candidates
- Investors
- Product buyers looking for a demo
- Press/media
- Developer ecosystem
- Broad marketplace-style product discovery

---

## 5. Positioning

### Approved Positioning

Neelvara Systems operates software infrastructure for customer-facing business information.

Use this long-form positioning internally and in public copy where appropriate:

> Neelvara Systems operates products that keep public business facts, approved answers, and reusable business context clear before they reach customers.

Use this relationship line exactly:

> MenuList, Answerlattice, and CampaignCue are operated by Neelvara Systems.

### Safer Legal Description

Use:

> Neelvara Systems is the operating trade name used for software infrastructure for customer-facing business information.

Do not use:

- Neelvara Systems Pvt Ltd
- Neelvara Group
- Neelvara Holdings
- Neelvara holding company
- Neelvara corporation
- Neelvara subsidiary

unless the legal structure changes and legal/CA review approves the wording.

---

## 6. Page Inventory

| Route | Purpose | Sitemap | Notes |
| --- | --- | --- | --- |
| `/` | Entity introduction and product-lineup routing | Yes | Main trust page |
| `/products` | Shows approved products in the lineup | Yes | No unapproved placeholder cards |
| `/about` | Explains operating focus and boundaries | Yes | No founder bio required |
| `/contact` | Email-based contact paths | Yes | No form in v1 |
| `/legal` | Basic operating identity and links to policies | Yes | No GSTIN/PAN/address unless approved |
| `/privacy` | Company website privacy policy | Yes | Company website only |
| `/terms` | Company website terms | Yes | Company website only |
| `/404` | Plain not-found page | No | Route back to Home/Products |

---

## 7. Calls To Action

Only two company-site CTAs are allowed:

- `View Product Lineup`
- `Contact Neelvara`

Do not use:

- Book a demo
- Start trial
- Sign in
- Get started
- Request pricing
- Join waitlist

Commercial product CTAs belong on the relevant product site.

---

## 8. Legal And Trust Requirements

Before launch:

- Confirm final public display name with CA/legal.
- Confirm whether `Neelvara Systems` is registered/usable as a trade name.
- Complete IP India wordmark and phonetic search evidence.
- Confirm domain availability and ownership for the chosen canonical domain.
- Confirm email deliverability for public contact addresses.
- Decide whether any legal address must be shown.
- Do not show GSTIN/PAN/residential address unless legally required or explicitly approved.
- Confirm GST registration/business activity/SAC/NIC details if they must appear in policies, invoices, or vendor onboarding.
- Keep company website privacy/terms separate from product privacy/terms once a product collects account, business, profile, customer interaction, support, campaign, or billing data.
- Add paid-service policies on the relevant product site before that product accepts payments.

External legal/compliance references are listed in the README. These docs are not legal advice.

---

## 9. Data Handling

V1 should avoid collecting data through the website.

Allowed:

- Static page requests
- Hosting/CDN logs
- Mailto links to public inboxes
- Optional privacy-preserving page analytics only after review

Not allowed in v1:

- Contact form submissions
- Visitor accounts
- Newsletter signups
- User tracking profiles
- Product onboarding data
- Firebase writes
- Stored lead records

This keeps the privacy notice narrow and reduces DPDP/compliance surface.

---

## 10. SEO And Entity Requirements

The site should optimize for entity clarity, not traffic growth.

Required:

- One canonical host
- Redirect `www` to apex or apex to `www`, with one chosen canonical
- Unique title and description per page
- `robots.txt`
- `sitemap.xml`
- `rel=canonical` on each page
- Open Graph defaults
- Organization JSON-LD on the home page
- Website JSON-LD on the home page
- Exact spelling: `Neelvara Systems`
- Exact operated-product relationship line on Products and Legal

Search query ownership targets:

- Neelvara Systems
- Neelvara Systems MenuList
- Neelvara Systems Answerlattice
- Neelvara Systems CampaignCue
- MenuList Neelvara
- Answerlattice Neelvara
- CampaignCue Neelvara

---

## 11. Accessibility And UX Requirements

The site must be calm, readable, and fast. The approved Neelvara blue redesign may use a fixed restrained mesh layer, grain, glass panels, spotlight cards, and editorial typography, but those visuals must stay presentation-only and must not add product-funnel behavior.

Required:

- Mobile-first responsive layout
- Large tap targets
- Keyboard navigable header/footer
- Visible focus states
- Plain HTML links
- No motion-heavy effects
- No cards nested inside cards
- No unrelated hue systems beyond the approved Neelvara blue palette: `#071323`, `#1457D9`, `#2384FF`, `#2737C8`, `#6542E8`, `#F7F9FC`, `#EEF3FA`, and `#5D6678`
- No oversized product hero that hides the next section
- High color contrast
- No text overlap at 320px width
- No viewport-scaled font sizes

---

## 12. Acceptance Criteria

The docs and implementation are considered current when:

- All standard docs exist in this folder.
- The transcript remains preserved unchanged.
- The implementation keeps Neelvara outside current product registries.
- Legal and data-collection blockers are explicit.
- Firebase cost is zero by design.
- Mobile support decision is documented.
- Test cases cover content, legal, SEO, responsive behavior, and no-Firebase boundaries.
- The Neelvara blue redesign keeps the same legal, data, route, and product-boundary constraints.

The website is ready to launch only when:

- Legal/CA display wording is approved.
- Domain and trademark checks are recorded.
- Email deliverability is configured.
- Static build and preview pass.
- All public pages repeat the approved current-public-lineup relationship wording where required.
- No inactive/future/unapproved product is shown as live.
- No prohibited public legal claim is made.

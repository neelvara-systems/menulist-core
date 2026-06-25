# ConstantLayer Main Website - Website Content Contract

**Status:** Implemented; pending owner/legal launch review  
**Surface:** Public website  
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

## 2. Global Header

Left:

```text
ConstantLayer
```

Primary nav:

```text
Products
About
Legal
Contact
```

Header action:

```text
Products
```

The header action routes to the internal product-lineup page. Product-specific conversion CTAs belong on product domains.

Visual treatment:

- Floating pill-shaped glass nav.
- Desktop shows product nav links, Contact, and Products.
- Small mobile hides nav text and uses a compact Products icon action.

---

## 3. Global Footer

Footer line:

```text
© 2026 ConstantLayer Systems
```

Footer links:

- Products
- About
- Legal
- Privacy
- Terms
- Contact

Do not place GSTIN/PAN/address in the footer unless legal/CA review requires it and the owner approves public display.

---

## 4. Home Page

### Purpose

Establish entity identity and route visitors to the product lineup or company-level contact paths.

### Hero

Eyebrow:

```text
Company reference for public product surfaces
```

H1:

```text
ConstantLayer Systems
```

Support:

```text
A quiet company reference for business information products: a clear entity reference, stable public records, and product relationships that are easy to verify.
```

Primary CTA:

```text
View Product Lineup
```

Secondary CTA:

```text
Contact ConstantLayer
```

### Entity Ledger

Required fields:

- Entity: ConstantLayer Systems
- Public lineup: MenuList / Answerlattice / CampaignCue
- Public line: MenuList, Answerlattice, and CampaignCue are the current public product surfaces in the ConstantLayer Systems lineup.

Visual treatment:

- Desktop/tablet: show the hero glass studio mock before the entity ledger.
- Small phones: hide the large hero mock so the entity ledger starts inside the first mobile viewport.
- The hero mock is a parent-site reference artifact, not a product dashboard.

### Marquee

Required items:

- ConstantLayer Systems
- MenuList
- Answerlattice
- CampaignCue
- Company reference
- Legal routing
- Privacy inbox
- Product boundary

### Bento Section

Purpose:

Show the parent site as a compact verification surface, not a broad product funnel.

Heading:

```text
One glass surface for the narrow company questions.
```

Body:

```text
The parent website identifies the company record, product boundary, privacy/contact routes, and no-runtime boundary.
```

Required cards:

- Entity: one company record visitors can check quickly.
- Surfaces: product relationships stay visible without blending product promises.
- Privacy: no account or form is introduced.
- Runtime: no Firebase-backed product identity.
- Routing: canonical domain stays clear.
- Legal: sensitive identifiers stay out of public copy.

Visual treatment:

- Use glass bento cards with compact mono labels, icon squares, and a single Prism-style geometric reference visual.
- Keep the section calm and factual; do not introduce customer logos, testimonials, pricing, or product-conversion claims.
- Do not introduce new hues beyond the Prism mesh palette.

### Spotlight Cards

Required cards:

- Company record, not another product funnel.
- Product surfaces stay separate.
- Inquiries route directly.

Each card uses the cursor-following glass spotlight primitive.

### Pull Quote

Quote:

```text
MenuList, Answerlattice, and CampaignCue are the current public product surfaces in the ConstantLayer Systems lineup.
```

### Stats Strip

Required stats:

- 3 current public surfaces
- 0 forms or lead database
- 0 Firebase writes
- 7 public reference pages

### Boundary Comparison

Required columns:

- ConstantLayer / Company layer
- Product websites
- Owner apps

Required rows:

- Purpose
- Data
- Inquiries
- Claims

### Product Lineup Section

Visual treatment:

- Use a dark product band with a compact `3 current public surfaces` summary panel.
- Do not use an oversized decorative `Portfolio` wordmark; it can wrap poorly and weakens the premium feel.
- Keep product rows as direct links to each product's canonical public website.
- Use only a restrained viewport-entry reveal for section blocks; do not add global smooth scrolling, parallax, or animation libraries.
- Respect `prefers-reduced-motion` and keep content visible if client JavaScript does not run.

Heading:

```text
MenuList, Answerlattice, and CampaignCue share one company reference.
```

Body:

```text
Product-specific websites explain each product. ConstantLayer keeps the company-level reference for entity, legal, privacy, and product relationship checks.
```

Required product rows:

- MenuList: Business information infrastructure for menus, store facts, and public customer-facing surfaces.
- Answerlattice: Governed answer infrastructure for support knowledge, approved answers, widgets, and help surfaces.
- CampaignCue: Campaign readiness and source-backed campaign output systems for local businesses.

### Contact Routes Section

Heading:

```text
Three direct inboxes, no parent-site form.
```

Body:

```text
Business, legal, and privacy contacts stay explicit and reviewable. Sensitive documents should only be sent when requested by the right inbox.
```

Required cards:

- Business: `hello@constantlayer.in`
- Legal: `legal@constantlayer.in`
- Privacy: `privacy@constantlayer.in`

---

## 5. Products Page

### Purpose

Show approved current public product surfaces in the ConstantLayer lineup without turning the parent site into a product funnel.

### H1

```text
Products
```

### Intro

```text
MenuList, Answerlattice, and CampaignCue are the current public product surfaces in the ConstantLayer Systems lineup.
```

### Product Cards

MenuList:

```text
A public business information system for small businesses that need their menu and store facts to stay usable.
```

Answerlattice:

```text
Governed answer infrastructure for support knowledge, approved answers, widgets, and help surfaces.
```

CampaignCue:

```text
Campaign readiness and source-backed campaign output systems for local businesses.
```

Each product card links to the product's canonical production website.

### Product Boundary

```text
ConstantLayer Systems is the company reference for the current public lineup. Product-specific claims, pricing, onboarding, and owner workflows remain on each product surface.
```

Required notes:

- MenuList, Answerlattice, and CampaignCue keep separate product sites and product-specific documentation.
- Only approved public product surfaces appear on this parent website.
- Company, legal, and privacy references can point back to this site when an entity-level source is needed.

### Do Not Show

- Canonica
- GrowthOS
- KitStamp
- SurfaceOS
- MyCodex
- Private/internal-only tools
- "Coming soon" products
- Placeholder logos

---

## 6. About Page

### Purpose

Explain the operating focus without creating a product funnel.

### H1

```text
About
```

### Intro

```text
ConstantLayer Systems builds and operates infrastructure for business information that should stay correct without constant attention.
```

### Required Themes

- Business information: stable public facts, governed answers, product context, and source-backed business outputs.
- Quiet operation: reliable systems over noisy dashboards or broad promises.
- Small business fit: less maintenance, fewer decisions, clearer support, and better public output.

### Operating Stance

```text
ConstantLayer Systems exists to operate product infrastructure where incorrect or stale business information creates daily friction.
```

Required notes:

- The parent site stays calm, narrow, and factual.
- Product-specific marketing stays on product domains.
- MenuList, Answerlattice, and CampaignCue are represented as separate product surfaces.
- GSTIN and sensitive registration details are not published unless explicitly approved.

---

## 7. Contact Page

### Purpose

Offer company-level contact paths without storing form submissions.

### H1

```text
Contact
```

### Intro

```text
Use the right ConstantLayer Systems contact point for business, legal, or privacy inquiries.
```

### Contact Rows

```text
Business: hello@constantlayer.in
Legal: legal@constantlayer.in
Privacy: privacy@constantlayer.in
```

No form.

---

## 8. Legal Page

### Purpose

Provide basic entity and product relationship information.

### H1

```text
Legal
```

### Required Fields

```text
Operating name: ConstantLayer Systems
```

```text
MenuList, Answerlattice, and CampaignCue are the current public product surfaces in the ConstantLayer Systems lineup.
```

### Public Legal Note

```text
This page is the public entity reference for the parent website. It is not a product pricing page, owner dashboard, or customer support portal.
```

Required notes:

- Product terms and product workflows remain on each product surface.
- Sensitive entity identifiers are withheld from public copy unless legal review requires disclosure.
- This page does not claim incorporation status, subsidiaries, or holding-company structure.
- Legal inquiries should use the dedicated legal email.

Product policy split:

- Product privacy, support, pricing, billing, cancellation, and refund terms belong on the relevant product surface.
- Only approved public product surfaces are included in parent-site legal copy.
- Company-level references can link here, but product commitments should not be moved into this parent page.

---

## 9. Privacy Page

### Scope

Parent website only.

### H1

```text
Privacy
```

### Opening

```text
Privacy information for the ConstantLayer Systems website.
```

Required notes:

- There is no newsletter signup or embedded inquiry form on this parent website.
- There is no website account, lead database, product onboarding flow, or Firebase write path on this parent website.
- The site may remember a local cookie acknowledgement preference in the visitor browser.
- Hosting, CDN, and security layers may process page-request metadata and operational logs.
- If a visitor sends email, the email address, message content, and related mail metadata are handled by the mail provider and relevant inbox.
- Privacy questions should use the dedicated privacy email.
- Product-level privacy details belong on the relevant product surface.
- Product-data questions should be routed to the relevant product policy and support path.
- Any future form, analytics, newsletter, account, or gated download requires a privacy review before launch.

Do not claim this policy covers product accounts, business data, menu data, support tickets, campaign data, customer interactions, billing, or product support unless the policy is intentionally expanded and reviewed.

---

## 10. Terms Page

### Scope

Parent website only.

### H1

```text
Terms
```

### Opening

```text
Terms for use of the ConstantLayer Systems website.
```

Required notes:

- Do not treat parent-site copy as a product feature commitment.
- Do not copy or misuse the ConstantLayer Systems or product names.
- This parent website does not provide checkout, subscriptions, product onboarding, or customer support workflows.
- Product usage is governed by each product surface and its product terms.
- Refund, cancellation, payment, warranty, and service-availability terms must be handled on product surfaces before paid services are accepted there.
- Product websites may change their product pages, pricing, support paths, or terms independently from this parent site.
- Legal questions should use the dedicated legal email.

Do not include refund, cancellation, payment, or subscription terms unless ConstantLayer itself sells paid services through this website.

---

## 11. 404 Page

H1:

```text
Page not found
```

Body:

```text
The page is unavailable.
```

Links:

- Home
- Products

Keep it plain. Unmatched ConstantLayer URLs must return HTTP `404` with `noindex`.

---

## 12. Content QA

Before launch:

- Confirm all public pages use "ConstantLayer Systems" consistently.
- Confirm Products, Legal, Home ledger, and final bands use the approved current-public-lineup relationship line.
- Confirm MenuList, Answerlattice, and CampaignCue are the only product surfaces shown.
- Confirm no route includes pricing, demo, sign-in, blog, careers, press, or investors.
- Confirm legal pages do not overstate business structure.
- Confirm all emails and domains are real before publishing.
- Confirm external product links open to canonical production URLs.

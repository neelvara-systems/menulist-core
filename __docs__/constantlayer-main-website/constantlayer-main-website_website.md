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
Company behind MenuList, Answerlattice, and CampaignCue
```

H1:

```text
ConstantLayer Systems
```

Support:

```text
We build business information products: MenuList for public menus and store facts, Answerlattice for governed support answers, and CampaignCue for campaign-ready business context.
```

Primary CTA:

```text
View Products
```

Secondary CTA:

```text
Email ConstantLayer
```

### Entity Ledger

Required fields:

- Entity: ConstantLayer Systems
- Products: MenuList / Answerlattice / CampaignCue
- Contact: configured ConstantLayer business email

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
- Business information products
- Company email
- Privacy inbox
- Legal inbox

### Bento Section

Purpose:

Show what ConstantLayer does, which products are current, and where company-level questions go.

Heading:

```text
The company, products, and contact routes in one place.
```

Body:

```text
This site identifies ConstantLayer Systems, the current product lineup, and the business/legal/privacy contact routes.
```

Required cards:

- Company: ConstantLayer Systems builds business information products.
- Products: MenuList, Answerlattice, and CampaignCue stay clearly separated.
- Contact: company questions go to email.
- No form: the site does not collect messages in a database.
- Support: product support stays on product sites.
- Legal: sensitive identifiers stay out of public copy.

Visual treatment:

- Use glass bento cards with compact mono labels, icon squares, and a single Prism-style geometric reference visual.
- Keep the section calm and factual; do not introduce customer logos, testimonials, pricing, or product-conversion claims.
- Do not introduce new hues beyond the Prism mesh palette.

### Spotlight Cards

Required cards:

- The company behind the current product lineup.
- Three products, separate promises.
- Company questions go through email.

Each card uses the cursor-following glass spotlight primitive.

### Pull Quote

Quote:

```text
MenuList, Answerlattice, and CampaignCue are the current products represented by ConstantLayer Systems.
```

### Stats Strip

Required stats:

- 3 current products
- 1 business email for company questions
- 0 contact forms
- 7 public company pages

### Boundary Comparison

Required columns:

- ConstantLayer / Company site
- Product websites
- Owner apps

Required rows:

- Purpose
- Contact
- Data
- Claims

### Product Lineup Section

Visual treatment:

- Use a dark product band with a compact `3 current products` summary panel.
- Do not use an oversized decorative `Portfolio` wordmark; it can wrap poorly and weakens the premium feel.
- Keep product rows as direct links to each product's canonical public website.
- Show actual product marks in each product row: MenuList mark, Answerlattice mark, and CampaignCue icon.
- Use only a restrained viewport-entry reveal for section blocks; do not add global smooth scrolling, parallax, or animation libraries.
- Respect `prefers-reduced-motion` and keep content visible if client JavaScript does not run.

Heading:

```text
MenuList, Answerlattice, and CampaignCue are the current products represented by ConstantLayer Systems.
```

Body:

```text
MenuList, Answerlattice, and CampaignCue are the products currently represented by ConstantLayer Systems.
```

Required product rows:

- MenuList: Keeps menus, store details, and customer-facing business pages aligned.
- Answerlattice: Keeps approved support answers and help content governed across support surfaces.
- CampaignCue: Turns business context into campaign-ready briefs and marketing assets.

### Contact Routes Section

Heading:

```text
Email the right inbox. No parent-site form.
```

Body:

```text
Use the business inbox for company questions. Legal and privacy questions have separate routes.
```

Required cards:

- Business: displayed from `NEXT_PUBLIC_CONSTANTLAYER_CONTACT_EMAIL`, with `hello@constantlayer.in` as the code fallback
- Legal: displayed from `NEXT_PUBLIC_CONSTANTLAYER_LEGAL_EMAIL`, with `legal@constantlayer.in` as the code fallback
- Privacy: displayed from `NEXT_PUBLIC_CONSTANTLAYER_PRIVACY_EMAIL`, with `privacy@constantlayer.in` as the code fallback

---

## 5. Products Page

### Purpose

Show approved current products in the ConstantLayer lineup without turning the parent site into a product funnel.

### H1

```text
Products
```

### Intro

```text
MenuList, Answerlattice, and CampaignCue are the current products represented by ConstantLayer Systems.
```

### Product Cards

MenuList:

```text
A public business information system for small businesses that need their menu and store facts to stay usable.
```

Answerlattice:

```text
Keeps approved support answers and help content governed across support surfaces.
```

CampaignCue:

```text
Turns business context into campaign-ready briefs and marketing assets.
```

Each product card links to the product's canonical production website.

### Product Boundary

```text
ConstantLayer Systems represents the current product lineup. Product details, pricing, onboarding, and support remain on each product website.
```

Required notes:

- MenuList, Answerlattice, and CampaignCue keep separate product sites and product-specific documentation.
- Only approved public products appear on this website.
- Company, legal, and privacy questions route through the ConstantLayer contact paths.

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

- Business information: clear public business facts, approved answers, and practical product context.
- Quiet operation: reliable systems over noisy dashboards or broad promises.
- Small business fit: less maintenance, fewer decisions, clearer support, and better public output.

### Operating Stance

```text
ConstantLayer Systems exists to operate product infrastructure where incorrect or stale business information creates daily friction.
```

Required notes:

- The parent site stays calm, narrow, and factual.
- Product-specific marketing stays on product domains.
- MenuList, Answerlattice, and CampaignCue are represented as separate products.
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
Business: NEXT_PUBLIC_CONSTANTLAYER_CONTACT_EMAIL
Legal: NEXT_PUBLIC_CONSTANTLAYER_LEGAL_EMAIL
Privacy: NEXT_PUBLIC_CONSTANTLAYER_PRIVACY_EMAIL
```

### Company Questions CTA

```text
Email ConstantLayer for company, legal, privacy, or product relationship questions. Product support and account questions stay on the relevant product site.
```

Required notes:

- Ask for a short company-level note.
- Keep the first message high level; do not request private records, secrets, or customer datasets.
- Product support and account questions should go through the relevant product website.
- The CTA remains email-only and must not introduce a parent-site form or lead database.

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
MenuList, Answerlattice, and CampaignCue are the current products represented by ConstantLayer Systems.
```

### Public Legal Note

```text
This page is the public entity reference for the parent website. It is not a product pricing page, owner dashboard, or customer support portal.
```

Required notes:

- Product terms and product workflows remain on each product site.
- Sensitive entity identifiers are withheld from public copy unless legal review requires disclosure.
- This page does not claim incorporation status, subsidiaries, or holding-company structure.
- Legal inquiries should use the dedicated legal email.

Product policy split:

- Product privacy, support, pricing, billing, cancellation, and refund terms belong on the relevant product site.
- Only approved public products are included in parent-site legal copy.
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
- There is no ConstantLayer-owned cookie banner or browser preference storage on this parent website.
- Hosting, CDN, and security layers may process page-request metadata and operational logs.
- If a visitor sends email, the email address, message content, and related mail metadata are handled by the mail provider and relevant inbox.
- Privacy questions should use the dedicated privacy email.
- Product-level privacy details belong on the relevant product site.
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
- Product usage is governed by each product and its product terms.
- Refund, cancellation, payment, warranty, and service-availability terms must be handled on product sites before paid services are accepted there.
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
- Confirm MenuList, Answerlattice, and CampaignCue are the only products shown.
- Confirm no route includes pricing, demo, sign-in, blog, careers, press, or investors.
- Confirm legal pages do not overstate business structure.
- Confirm all emails and domains are real before publishing.
- Confirm external product links open to canonical production URLs.

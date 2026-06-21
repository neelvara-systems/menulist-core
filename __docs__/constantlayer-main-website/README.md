# ConstantLayer Main Website

**Status:** Implemented in the shared Next/Vercel app; pending owner/legal launch review  
**Owner:** Founder / engineering  
**Feature folder:** `__docs__/constantlayer-main-website/`  
**Primary source input:** [`constantlayer-main-website_chatgpt-transcript.md`](./constantlayer-main-website_chatgpt-transcript.md)

---

## Purpose

This doc set defines the first public website for ConstantLayer Systems.

The site is a quiet operating-entity and trust surface. It explains what ConstantLayer Systems is, confirms the relationship to the product lineup, provides basic legal/contact information, and routes product interest to the relevant product surface.

It is not a replacement for any product site, not a product funnel, not an owner app, and not a Firebase-backed product runtime.

---

## Current Decision

Build ConstantLayer inside the existing Next.js/Vercel product-site architecture:

- public website route group: `src/app/sites/constantlayer/`
- product-domain registry entry: `src/constants/productDomains.ts`
- deployment target entry: `src/constants/deploymentTargets.ts`
- local development path: `/__constantlayer/`
- production domain: `https://constantlayer.in`
- no `PRODUCT_IDS` entry
- no Firebase project
- no API routes, auth, CMS, contact form, or analytics in v1
- public cookie banner is essential-storage acknowledgement only; there is no analytics or ads consent claim in v1

Reason: the repo already uses a shared Vercel app with hostname/path-prefix routing for public product sites. ConstantLayer should follow that routing architecture while staying outside database-backed product identity.

---

## Canonical Public Relationship

Use this exact sentence where the portfolio relationship needs to be explicit:

> MenuList, Answerlattice, and CampaignCue are product surfaces in the ConstantLayer Systems lineup.

Use this safer entity description unless legal counsel/CA confirms stronger wording:

> ConstantLayer Systems is the operating trade name used for a portfolio of business information products.

Do not call ConstantLayer Systems a private limited company, LLP, corporation, group, holding company, subsidiary, or parent company in legal copy unless that becomes legally true.

---

## Documentation Set

| Document | Purpose |
| --- | --- |
| [`constantlayer-main-website_spec.md`](./constantlayer-main-website_spec.md) | Product scope, boundaries, audience, pages, acceptance criteria |
| [`constantlayer-main-website_impl.md`](./constantlayer-main-website_impl.md) | Next/Vercel implementation inventory, routing, SEO, validation |
| [`constantlayer-main-website_marketing.md`](./constantlayer-main-website_marketing.md) | Messaging system, public language, forbidden positioning |
| [`constantlayer-main-website_website.md`](./constantlayer-main-website_website.md) | Page-by-page website content contract |
| [`constantlayer-main-website_helpdoc.md`](./constantlayer-main-website_helpdoc.md) | Public FAQ/support handoff guidance |
| [`constantlayer-main-website_firebase.md`](./constantlayer-main-website_firebase.md) | Firebase and runtime cost posture |
| [`constantlayer-main-website_mobile-support.md`](./constantlayer-main-website_mobile-support.md) | Mobile/responsive decision and non-PWA boundary |
| [`constantlayer-main-website_test-cases.md`](./constantlayer-main-website_test-cases.md) | QA, legal, SEO, mobile, launch checks |
| [`constantlayer-main-website_validation.md`](./constantlayer-main-website_validation.md) | Implementation evidence and final validation report |
| [`constantlayer-main-website_chatgpt-transcript.md`](./constantlayer-main-website_chatgpt-transcript.md) | Raw ordered ChatGPT transcript used as external input |

---

## Implementation Status

Implemented as static Next pages under `src/app/sites/constantlayer/`.

Validation completed:

- `npx tsc --noEmit --incremental false --pretty false`: pass
- ConstantLayer route registered in the existing `productDomains` / `deploymentTargets` architecture
- `/__constantlayer/` local dev path maps to `/sites/constantlayer`
- no `PRODUCT_IDS` entry or Firebase requirement added
- no API routes, forms, auth, Firestore, Storage, Cloud Functions, or schedulers added
- legal/privacy/terms/contact content audit completed against current official DPDP and e-commerce references
- shared public cookie acknowledgement mounted in the website layout without adding analytics, forms, auth, Firebase, or API routes

---

## Repo Evidence

- Product database codes remain limited to stored product identity values: `src/constants/product.ts:13`.
- Public product website routing belongs under `src/app/sites/[productId]`: `src/constants/productDomains.ts:4`, `src/constants/productDomains.ts:8`.
- ConstantLayer is registered as a route/domain `ProductSiteId`, not as a database `pId`: `src/constants/productDomains.ts:63`.
- ConstantLayer deployment targets have empty `firebaseProjectId`: `src/constants/deploymentTargets.ts:38`, `src/constants/deploymentTargets.ts:68`, `src/constants/deploymentTargets.ts:105`.
- Environment validation explicitly treats ConstantLayer as no-Firebase: `src/lib/env/validateEnv.ts:86`.
- Mobile docs remain required even when the mobile decision is responsive public website only: `.codex/rules/MOBILE_SUPPORT_RULES.md:9`.

---

## Transcript Decisions Preserved

- ConstantLayer Systems is the chosen trade name direction: `constantlayer-main-website_chatgpt-transcript.md:334`.
- The parent website should not be the MenuList product site: `constantlayer-main-website_chatgpt-transcript.md:497`.
- The transcript preserved an earlier MenuList-only relationship line: `constantlayer-main-website_chatgpt-transcript.md:377`.
- Current implementation widens the parent site to the product lineup requested after implementation: MenuList, Answerlattice, CampaignCue, and future approved product surfaces.
- The site should be a quiet trust/entity website, not a product funnel: `constantlayer-main-website_chatgpt-transcript.md:11954`.
- GSTIN should not be displayed publicly in v1 unless explicitly approved: `constantlayer-main-website_chatgpt-transcript.md:12062`.

---

## External References To Verify Before Launch

- GST core field amendments: https://tutorial.gst.gov.in/userguide/registration/Core_Fields_Manual.htm
- IP India trademark public search: https://tmrsearch.ipindia.gov.in/tmrpublicsearch/
- Digital Personal Data Protection Act, 2023 official PDF: https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf
- Digital Personal Data Protection Rules, 2025 official PDF: https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf
- DPDP Rules PIB summary: https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=156054
- Consumer Protection (E-Commerce) Rules, 2020 PDF: https://thc.nic.in/Central%20Governmental%20Rules/Consumer%20Protection%20%28E-Commerce%29%20Rules%2C%202020.pdf
- Consumer Affairs parliamentary reply on e-commerce duties: https://fcainfoweb.nic.in/PMS/writereaddata/2026_LS_B_5415.pdf
- Google canonical URLs: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Google Organization structured data: https://developers.google.com/search/docs/appearance/structured-data/organization

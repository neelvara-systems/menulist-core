# Neelvara Main Website

**Status:** Implemented and locally validated with a restrained Prism-influenced company design; public host cutover and owner/legal launch review remain pending
**Owner:** Founder / engineering
**Feature folder:** `__docs__/neelvara-main-website/`
**Primary source input:** [`neelvara-main-website_chatgpt-transcript.md`](./neelvara-main-website_chatgpt-transcript.md)

---

## Purpose

This doc set defines the first public website for Neelvara Systems.

The site is a quiet operating-entity and trust surface. It explains what Neelvara Systems is, confirms the relationship to the current operated product lineup, provides basic legal/contact information, and routes product interest to the relevant product site.

It is not a replacement for any product site, not a product funnel, not an owner app, and not a Firebase-backed product runtime.

---

## Current Decision

Build Neelvara inside the existing Next.js/Vercel product-site architecture:

- public website route group: `src/app/sites/neelvara/`
- product-domain registry entry: `src/constants/productDomains.ts`
- deployment target entry: `src/constants/deploymentTargets.ts`
- local development path: `/__neelvara/`
- production domain: `https://neelvara.com`
- no `PRODUCT_IDS` entry
- no Firebase project
- no API routes, auth, CMS, contact form, analytics, or cookie banner in v1
- footer-level `/trust` reference for company identity, operated-product boundaries, website data scope, evidence status, and verification routes
- optional public contact email env keys only: `NEXT_PUBLIC_NEELVARA_CONTACT_EMAIL`, `NEXT_PUBLIC_NEELVARA_LEGAL_EMAIL`, `NEXT_PUBLIC_NEELVARA_PRIVACY_EMAIL`
- no Neelvara-owned browser preference storage is required in v1
- restrained Prism-influenced visual system applied only to presentation: ice-white canvas, deep navy text, the supplied blue-to-violet Neelvara loop mark, a fixed low-contrast mesh, subtle grain, selective glass on navigation and product surfaces, and unframed factual information rows; no product funnel behavior added

Reason: the repo already uses a shared Vercel app with hostname/path-prefix routing for public product sites. Neelvara should follow that routing architecture while staying outside database-backed product identity.

---

## Canonical Public Relationship

Use this exact sentence where the current product relationship needs to be explicit:

> MenuList and Answerlattice are operated by Neelvara Systems.

Use this safer entity description unless legal counsel/CA confirms stronger wording:

> Neelvara Systems is the operating trade name used for software infrastructure for customer-facing business information.

Do not call Neelvara Systems a private limited company, LLP, corporation, group, holding company, subsidiary, or parent company in legal copy unless that becomes legally true.

---

## Documentation Set

| Document | Purpose |
| --- | --- |
| [`neelvara-main-website_spec.md`](./neelvara-main-website_spec.md) | Product scope, boundaries, audience, pages, acceptance criteria |
| [`neelvara-main-website_impl.md`](./neelvara-main-website_impl.md) | Next/Vercel implementation inventory, routing, SEO, validation |
| [`neelvara-main-website_marketing.md`](./neelvara-main-website_marketing.md) | Messaging system, public language, forbidden positioning |
| [`neelvara-main-website_website.md`](./neelvara-main-website_website.md) | Page-by-page website content contract |
| [`neelvara-main-website_helpdoc.md`](./neelvara-main-website_helpdoc.md) | Public FAQ/support handoff guidance |
| [`neelvara-main-website_firebase.md`](./neelvara-main-website_firebase.md) | Firebase and runtime cost posture |
| [`neelvara-main-website_mobile-support.md`](./neelvara-main-website_mobile-support.md) | Mobile/responsive decision and non-PWA boundary |
| [`neelvara-main-website_test-cases.md`](./neelvara-main-website_test-cases.md) | QA, legal, SEO, mobile, launch checks |
| [`neelvara-main-website_validation.md`](./neelvara-main-website_validation.md) | Implementation evidence and final validation report |
| [`neelvara-main-website_chatgpt-transcript.md`](./neelvara-main-website_chatgpt-transcript.md) | Raw ordered ChatGPT transcript used as external input |

---

## Implementation Status

Implemented as static Next pages under `src/app/sites/neelvara/`.

Validation completed:

- `npx tsc --noEmit --incremental false --pretty false`: pass
- `npm run lint -- --dir src/app/sites/neelvara`: pass
- `node scripts/verification/verify-agent-readiness.js --env-targets-only`: pass
- Neelvara route registered in the existing `productDomains` / `deploymentTargets` architecture
- `/__neelvara/` local dev path maps to `/sites/neelvara`
- bare `/__neelvara`, `/__neelvara/home`, `/nv`, and product-domain `/home` requests resolve through the canonical `/sites/neelvara` page rather than a separate homepage alias
- no `PRODUCT_IDS` entry or Firebase requirement added
- no API routes, forms, auth, Firestore, Storage, Cloud Functions, or schedulers added
- Neelvara contact, legal, and privacy email addresses are read from optional public env-backed constants with current address fallbacks
- current Neelvara relayout route and responsive checks completed at desktop, mobile, and narrow-mobile viewports
- Trust & Verification page added as a static, footer-linked company reference without certifications, uptime claims, or invented controls
- legal/privacy/terms/contact content audit completed against current official DPDP and e-commerce references
- Open Graph image and `.well-known/security.txt` are present for the company website
- `llms.txt`, homepage Markdown negotiation, and Markdown 404 recovery expose the same bounded company/product truth to agents without adding an action surface
- `/nv` internal alias responses are marked `noindex, nofollow`; `https://neelvara.com` remains canonical
- no cookie banner, browser preference storage, analytics, forms, auth, Firebase, or API routes are mounted for Neelvara

Current public-launch state:

- source, local routes, responsive layout, content, metadata, accessibility, and motion checks pass
- `https://neelvara.com` currently serves a GoDaddy Website Builder page rather than this repository implementation
- publishing this implementation requires an explicitly approved Vercel deployment, domain attachment, and DNS cutover; none was performed during this audit
- `neelvara.com` publishes Google MX, SPF, Google DKIM, and DMARC records; owner-side send/receive checks are still required for `hello@`, `legal@`, and `privacy@`
- owner/CA/legal approval and trademark-search evidence remain required before public launch

---

## Repo Evidence

- Product database codes remain limited to stored product identity values: `src/constants/product.ts:13`.
- Public product website routing belongs under `src/app/sites/[productId]`: `src/constants/productDomains.ts:4`, `src/constants/productDomains.ts:8`.
- Neelvara is registered as a route/domain `ProductSiteId`, not as a database `pId`: `src/constants/productDomains.ts:63`.
- Neelvara deployment targets have empty `firebaseProjectId`: `src/constants/deploymentTargets.ts:38`, `src/constants/deploymentTargets.ts:68`, `src/constants/deploymentTargets.ts:105`.
- Environment validation explicitly treats Neelvara as no-Firebase: `src/lib/env/validateEnv.ts:86`.
- Mobile docs remain required even when the mobile decision is responsive public website only: `.codex/rules/MOBILE_SUPPORT_RULES.md:9`.

---

## Transcript And Rename Boundary

- `neelvara-main-website_chatgpt-transcript.md` is a historical captured-conversation artifact from the earlier naming phase. After the Neelvara rename, its visible company-name tokens were name-normalized so repo-wide stale-name scans stay clean.
- Do not treat the transcript as current implementation authority; current runtime and docs are the source of truth.
- Neelvara Systems is now the current code/docs/runtime name for the parent operating website.
- The current public implementation uses the operated lineup: MenuList and Answerlattice. CampaignCue is intentionally not published on the Neelvara website.
- Private, internal, reserved, or future product names such as Canonica, GrowthOS/Growth Kits, KitStamp, SurfaceOS, MyCodex, and SignalDesk stay out of public Neelvara copy until a separate public-surface/legal-policy review approves them.
- The company website should remain a quiet trust/entity website, not a product funnel.
- GSTIN should not be displayed publicly in v1 unless explicitly approved.

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

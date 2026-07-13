# Menu Link Import Spec

**Boundary Reviewed:** July 10, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated Menu Link Import evidence only. Both current intake paths require a signed-in owner before source acquisition or extraction: the owner app uses `/api/menu-link-imports`, while the public `/create-menu` page submits through the authenticated `/api/public/create-menu` route. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:functions-deploy-preflight`, authenticated desktop/mobile owner-flow QA, signed-in `/create-menu` browser QA, direct and rendered source-acquisition smoke, Gemini extraction provider smoke where fallback is used, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

## Problem

Owners often already have a menu, service list, product catalog, rate card, or similar offering source on a website, direct PDF/image link, or QR destination. Existing MenuList intake accepts files, but asking owners to download and re-upload a public source adds friction.

## Product Decision

Add link import as an owner-controlled migration path:

> Bring the menu source you already have. MenuList creates a draft for review before anything is published.

This is aligned with MenuList because it moves scattered public menu sources into reviewed MenuList truth. It is not positioned as broad scraping.

The feature is now available in two entry points:

- Public `/create-menu` setup page, which may be viewed before sign-in but redirects on submit and performs link acquisition/extraction only after authentication; the owner-bound route uses permission confirmation, a hashed-user rate limit, SAFE_MODE, and a temporary draft TTL.
- Authenticated owner app upload flow for existing projects, guarded by tenant access, owner/store rate limits, and the same permission confirmation.

## Research Basis

- Schema.org `hasMenu` allows a business menu to be represented as structured `Menu`, plain text, or a URL: https://schema.org/hasMenu
- Schema.org `hasMenuSection` models menus as sections and nested menu items, matching MenuList's section/item review shape: https://schema.org/hasMenuSection
- Google Business Profile recognizes menu links, multiple menu sources, and menu transcription from a business website: https://support.google.com/business/answer/9455840

Product implication: MenuList should handle owner-provided public menu pages, homepage-to-menu links, structured menu URLs, and a small number of same-site menu pages. It should not become an unrestricted crawler.

## Scope

### In Scope

- A visitor may open and fill the public `/create-menu` form, but a signed-in owner is required before either entry point submits a public URL for acquisition.
- Owner confirms the source is their business menu or they have permission to import it.
- Public HTML, text, JSON, direct PDF, and direct JPEG/PNG/WebP sources.
- Shallow same-origin discovery when the pasted URL is a homepage and the page has likely menu/catalog/offering links.
- Same-origin structured-data discovery when the page exposes Schema.org `hasMenu` / menu URL references.
- Bounded same-origin multi-page import when a menu/catalog is split across a small set of linked pages.
- Bounded same-origin PDF/image fallback when a low-confidence HTML page links to a likely menu/catalog/offering asset.
- Bounded rendered-page fallback for safe client-routed menu pages such as `/#/menu`.
- Private source artifact storage.
- Existing public draft preview flow or authenticated AI extraction job queue.
- Forced review before write.
- Existing review and approval path.
- Public create-menu, desktop owner, and mobile owner entry points.

### Out of Scope

- Login-required URLs.
- Delivery marketplace scraping.
- CAPTCHA bypass.
- Proxy/stealth crawling.
- Scheduled monitoring.
- Google Business Profile writeback.
- Auto-publishing.
- New crawler vendors.
- Gemini URL Context as canonical acquisition.
- Full-site crawling, sitemap crawling, or cross-domain discovery from a homepage.

## Supported Link Cases

| Case | Supported | Handling |
| --- | --- | --- |
| Owner pastes direct public menu/catalog page | Yes | Fetch page, create text artifact, force review |
| Owner pastes homepage with visible same-origin menu/catalog link | Yes | Follow bounded same-origin candidates and use the best page or combined pages |
| Owner pastes homepage with Schema.org `hasMenu` URL | Yes | Follow same-origin structured menu URL when safe |
| Owner pastes homepage with direct menu PDF/image link | Yes | Store the PDF/image artifact directly |
| Menu/catalog split across a few same-origin pages, such as food/drinks or services/pricing | Yes, bounded | Combine up to 4 high-confidence HTML sources into one text artifact |
| Homepage links to a same-origin hash-routed menu, such as `/#/menu` | Yes, bounded | Preserve the safe hash for rendered fallback while server fetches stay hashless |
| Client-routed app URL where the menu appears after rendering, such as `/#/menu` | Yes, bounded | Render with server-side Chrome fallback when enabled and enough catalog evidence appears |
| Owner pastes a non-menu app/home route, such as a shell or mainpage | No | Reject before job creation with owner-safe fallback |
| Links requiring login, session, CAPTCHA, location selector, or marketplace access | No | Ask owner to upload a file or add manually |

## Acquisition Limits

- Only HTTP/HTTPS public URLs.
- Same-origin discovery only; no external links are followed from a homepage.
- Up to 6 candidate menu/catalog URLs are considered.
- Up to 4 high-confidence HTML sources are combined into one artifact.
- Response, rendered DOM, redirect, DNS, and total acquisition budgets remain bounded.
- Raw HTML is not stored separately; v1 stores only the extraction artifact.

## Functional Requirements

| ID | Requirement | Status |
| --- | --- | --- |
| MLINK-01 | Feature hidden unless `ENABLE_MENU_LINK_IMPORT` is true | Implemented |
| MLINK-02 | Authenticated owner API protected by `withAuth` and tenant access check | Implemented |
| MLINK-03 | Owner permission confirmation required | Implemented |
| MLINK-04 | SSRF guard blocks unsafe protocols, hostnames, IPs, and redirects | Implemented |
| MLINK-05 | Authenticated link import creates a processing job, not a direct project write | Implemented |
| MLINK-06 | Link jobs always require review, even for blank projects | Implemented |
| MLINK-07 | Approved review writes use existing project/cache path | Implemented |
| MLINK-08 | Desktop and mobile upload flows keep existing file upload unchanged | Implemented |
| MLINK-09 | Desktop blocks link import while local selected files are waiting to be uploaded, and blocks image upload while a link job is active | Implemented |
| MLINK-10 | Public `/create-menu` exposes permission-confirmed link input but requires sign-in before the protected create-draft request and source acquisition | Implemented |
| MLINK-11 | Signed-in `/create-menu` link import creates an owner-bound temporary draft preview and does not publish before authenticated claim | Implemented |

## Owner-Facing Copy

Use:

- "Import from existing menu link"
- "We'll create a draft for review before anything is published."
- "I confirm this is my business menu or I have permission to import it."
- "We couldn't read this menu link. Upload a photo/PDF or add the menu manually."

Avoid:

- "AI web scraper"
- "Smart import"
- "Scrape any website"
- "Auto-publish"

## Data Safety

The route stores source artifacts under tenant/store/project/job-scoped Storage paths and writes metadata to `menuLinkImportArtifacts`. The artifact URL passed to extraction is a Firebase download-token URL for the private artifact. The importer does not write `projects` until review is approved.

For signed-in `/create-menu`, the route stores source artifacts under `publicMenuDrafts/{draftId}/` and writes metadata into the owner-bound temporary `publicMenuDrafts` document. The draft has a 24-hour TTL, is rate-limited by HMAC-hashed user identity through `PUBLIC_MENU_ENTRY_AUTH`, and is only converted into a tenant/store/project after authenticated claim.

## Success Criteria

- Existing public photo upload and authenticated photo/PDF upload flows still behave the same.
- Link import job appears in the same processing and review UI.
- Link import and image upload cannot create overlapping jobs for the same project.
- Discarding a link import leaves no project menu mutation.
- Approving a link import creates the source file and menu data in the project.
- Unsafe URLs are blocked before outbound fetch.
- The public page may be viewed before sign-in, but link acquisition and preview creation start only after sign-in; the owner-bound draft still cannot publish without authenticated claim.

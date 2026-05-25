# Menu Link Import Spec

## Problem

Owners often already have a menu on a website, direct PDF/image link, or QR destination. Existing MenuList intake accepts files, but asking owners to download and re-upload a public menu adds friction.

## Product Decision

Add link import as an owner-controlled migration path:

> Bring the menu source you already have. MenuList creates a draft for review before anything is published.

This is aligned with MenuList because it moves scattered public menu sources into reviewed MenuList truth. It is not positioned as broad scraping.

## Scope

### In Scope

- Authenticated owner pastes a public URL.
- Owner confirms the source is their business menu or they have permission to import it.
- Public HTML, text, JSON, direct PDF, and direct JPEG/PNG/WebP sources.
- Shallow same-origin discovery when the pasted URL is a homepage and the page has likely menu links.
- Bounded same-origin PDF/image fallback when a low-confidence HTML page links to a likely menu asset.
- Private source artifact storage.
- Existing AI extraction job queue.
- Forced review before write.
- Existing review and approval path.
- Desktop and mobile entry points.

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

## Functional Requirements

| ID | Requirement | Status |
| --- | --- | --- |
| MLINK-01 | Feature hidden unless `ENABLE_MENU_LINK_IMPORT` is true | Implemented |
| MLINK-02 | API protected by `withAuth` and tenant access check | Implemented |
| MLINK-03 | Owner permission confirmation required | Implemented |
| MLINK-04 | SSRF guard blocks unsafe protocols, hostnames, IPs, and redirects | Implemented |
| MLINK-05 | Link import creates a processing job, not a direct project write | Implemented |
| MLINK-06 | Link jobs always require review, even for blank projects | Implemented |
| MLINK-07 | Approved review writes use existing project/cache path | Implemented |
| MLINK-08 | Desktop and mobile upload flows keep existing file upload unchanged | Implemented |
| MLINK-09 | Desktop blocks link import while local selected files are waiting to be uploaded, and blocks image upload while a link job is active | Implemented |

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

## Success Criteria

- Existing photo/PDF upload flow still behaves the same.
- Link import job appears in the same processing and review UI.
- Link import and image upload cannot create overlapping jobs for the same project.
- Discarding a link import leaves no project menu mutation.
- Approving a link import creates the source file and menu data in the project.
- Unsafe URLs are blocked before outbound fetch.

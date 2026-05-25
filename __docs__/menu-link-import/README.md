# Menu Link Import

**Status:** Implemented behind feature flag  
**Feature flag:** `ENABLE_MENU_LINK_IMPORT`  
**Owner copy:** Import from existing menu link

Menu Link Import lets an authenticated owner paste a public menu URL and receive an extraction draft for review. It is an intake convenience for menus the owner already controls or has permission to import. It is not a general-purpose web scraper, marketplace crawler, or auto-publish flow.

## Document Set

- [Spec](./menu-link-import_spec.md)
- [Implementation](./menu-link-import_impl.md)
- [Firebase](./menu-link-import_firebase.md)
- [Mobile Support](./menu-link-import_mobile-support.md)
- [Marketing](./menu-link-import_marketing.md)
- [Website](./menu-link-import_website.md)
- [Helpdoc](./menu-link-import_helpdoc.md)
- [Test Cases](./menu-link-import_test-cases.md)
- [Validation](./menu-link-import_validation.md)
- [ChatGPT Review](./_archive/chatgpt-review.md)

## Final Architecture

Owner-provided URL -> protected API -> URL safety gate -> DNS-pinned direct acquisition -> private artifact -> existing `menuImageProcessingJobs` pipeline -> existing review screen -> owner approval -> existing project write and public cache invalidation.

## Hard Boundaries

- No import without owner permission confirmation.
- No unauthenticated link import.
- No private IP, localhost, link-local, metadata, non-HTTP, or credentialed URLs.
- No marketplace/CAPTCHA/login bypass.
- No public menu mutation during acquisition or extraction.
- No Gemini URL Context as canonical ingestion.
- No new crawler/vendor dependency in v1.
- No overlapping link import while local photo/PDF files are waiting to be uploaded in the same project.

## External Validation Notes

- OWASP SSRF guidance for Node emphasizes URL normalization, protocol allowlisting, DNS/IP checks, and redirect validation: https://owasp.org/www-community/pages/controls/SSRF_Prevention_in_Nodejs.html
- Gemini URL Context is useful but constrained to public URLs, supported content types, request limits, and non-nested retrieval: https://ai.google.dev/gemini-api/docs/url-context
- Schema.org supports restaurant menu structured data through `Restaurant`, `Menu`, `MenuSection`, and `MenuItem`: https://schema.org/MenuItem

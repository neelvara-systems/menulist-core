# MenuList Help Center — Mobile Support

> **Version:** 1.1.0
> **Last Updated:** 2026-07-16
> **Audience:** Mobile, Product, QA
> **Source:** Current `MobileShell` and Help Center components

## Admission

Help is useful away from a desk and has short, touch-oriented tasks: find guidance, check a request, reply, attach evidence, read an update or contact support. Mobile coverage is required.

## Current Architecture

- `MobileMoreScreen` opens `MobileHelpScreen` inside `MobileShell`.
- Direct `/help-center/*` links map into the same mobile sub-screen instead of bypassing the shell.
- `kb`, `ticket`, `feedback`, `faq`, `contact-us` and `changelog` reuse the shared Help Center component and business logic.
- Article and changelog deep links retain their resource identifier.
- Back returns to `/dashboard#mobile/more`.
- Help Center buttons and interactive roles receive a 44 px minimum touch target.
- Wide Ant Design content is contained within the mobile screen instead of forcing page-level horizontal overflow.

## Data and Product Boundary

Mobile does not load a separate MenuList support database. `getActiveSession()` applies the explicit Answerlattice product-account scope for `/help-center`, and the same ticket/search/content DALs serve desktop and mobile. Governance and platform administration remain outside the owner Help Center.

## Failure Behavior

- Search failure does not remove documentation, tickets, FAQs, feedback, contact email or changelog tabs.
- Ticket load failure keeps any already cached ticket list and shows fixed owner-safe copy.
- Attachment admission uses the shared four-file/10 MB/type boundary.
- Attachment opening requires the configured Answerlattice Storage bucket and selected ticket tenant/store path.
- A delivered ticket is not rolled back because notification delivery is asynchronous.

## Required Release QA

- iOS Safari/PWA and Android Chrome/PWA direct and in-shell routes;
- keyboard, screen-reader and 44 px target checks;
- screenshot/file selection and upload for each supported type;
- slow/offline search and ticket fallback;
- authenticated Answerlattice claim/Firebase Auth sync;
- ticket create/reply/status visibility across mobile owner and platform operator surfaces.

These device checks remain pending until run against the approved deployed target.

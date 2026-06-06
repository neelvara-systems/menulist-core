# Print Menu Surfaces

**Status:** Implemented
**Owner:** MenuList
**Last Updated:** June 6, 2026

Print Menu Surfaces owns scan-first physical menu placements such as table tents, table cards, counter cards, and entrance menu posters. These are not social images and not full menu PDFs. They are the objects customers see in the business when they need to open the live menu.

## Document Index

| Document | Purpose |
| --- | --- |
| [Spec](./print-menu-surfaces_spec.md) | Business scope, owner/customer outcomes, accepted surfaces |
| [Implementation](./print-menu-surfaces_impl.md) | Code ownership, renderer contract, validation |
| [Marketing](./print-menu-surfaces_marketing.md) | Internal positioning and sales language |
| [Website](./print-menu-surfaces_website.md) | Public website copy guidance |
| [Help Doc](./print-menu-surfaces_helpdoc.md) | Owner-facing help content |
| [Firebase](./print-menu-surfaces_firebase.md) | Cost model and generated-artifact policy |
| [Mobile Support](./print-menu-surfaces_mobile-support.md) | Mobile admission and PWA contract |
| [Test Cases](./print-menu-surfaces_test-cases.md) | QA checklist |

## Feature Boundary

| Related area | Boundary |
| --- | --- |
| Menu Card Export | Full printable menu/menu-card PDFs from menu data. |
| Print Assets | Owner-facing desktop route and mobile screen for downloading printable assets. |
| Menu Kit | Bundles print, social, and placement assets for deployment. |
| Print Menu Surfaces | Owns physical scan-first print layouts that sit on tables, counters, entrances, and packaging. |

Print Assets may expose these files to owners and Menu Kit may include them in its ZIP, but neither owns the table tent/card layout. The layout owner is `src/lib/print-menu-surfaces/`.

## Current Implementation

- Table tent: A5 landscape PDF, folded into two A6 portrait faces.
- Single table/counter card: A6 portrait PDF for acrylic holders, counters, wall clips, and single-sided stands.
- QR: near-black modules on white panel with four-module quiet zone.
- Brand: existing logo/color used for the top accent band, logo/initials badge, CTA pill, and outer card accents; the QR panel uses a neutral border for scan clarity.
- Store name: separator-aware hierarchy such as `Business Name - Outlet/Branch` rendered as primary name plus accent subtitle.
- Cost: client-side Canvas/jsPDF only; no Firestore, Storage, or Cloud Function writes.

# Print Assets

**Status:** Freeze-ready
**Owner:** MenuList
**Last Updated:** June 21, 2026

Assets is the focused owner workspace for every printable customer-facing asset: table tents, single table/counter cards, counter stickers, entrance posters, feedback QR, campaign flyers, gift certificates, front/back business cards, ID cards, invitations, postcards, product tags, campaign posters, full menu PDF, and the complete Menu Kit bundle. The older "Print Assets" name remains only for compatibility route/docs context. It also shows print readiness, image-first generated preview, print-shop handoff text, reprint guidance, and governed desktop customization for supported single print assets.

## Document Index

| Document | Purpose |
| --- | --- |
| [Spec](./print-assets_spec.md) | Business scope and owner outcomes |
| [Implementation](./print-assets_impl.md) | Route, catalog, desktop/mobile wiring |
| [Marketing](./print-assets_marketing.md) | Internal positioning |
| [Website](./print-assets_website.md) | Website copy guidance |
| [Help Doc](./print-assets_helpdoc.md) | Owner-facing help article |
| [Firebase](./print-assets_firebase.md) | Cost model |
| [Mobile Support](./print-assets_mobile-support.md) | Mobile admission and shell contract |
| [Test Cases](./print-assets_test-cases.md) | QA checklist |
| [Verification](./print-assets_verification.md) | Freeze-readiness evidence |

## Boundary

| Area | Role |
| --- | --- |
| Print Assets | Owner-facing route and mobile screen for downloading printables. |
| Print Menu Surfaces | Physical tabletop renderer ownership. |
| Menu Kit | Client-side generator and ZIP bundle. |
| Menu Card Export | Full printable menu PDF and print-shop packet workflow. |

Print Assets does not store generated files, add a blank design studio, estimate print quantities, calculate local print prices, or create a print-ordering marketplace. Supported single print assets may open a governed editor document for practical copy/layout fixes while QR links and attribution rules remain locked.

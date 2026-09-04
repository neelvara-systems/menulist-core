# Print Assets

**Status:** Freeze-ready
**Owner:** MenuList
**Last Updated:** September 4, 2026

Assets is the focused owner workspace for every printable customer-facing asset: table tents, single table/counter cards, counter stickers, entrance posters, feedback QR, campaign flyers, gift certificates, front/back business cards, ID cards, invitations, postcards, product tags, campaign posters, full menu PDF, and the complete Menu Kit bundle. The older "Print Assets" name remains only for compatibility route/docs context. It also shows print readiness, business-profile readiness, image-first generated preview, print-shop handoff text, reprint guidance, and governed desktop customization for supported single print assets.

Owners with Business Settings access can complete missing identity and public-contact details directly from the Assets dashboard or the selected asset preview. The flow writes through the canonical store/tenant settings paths and immediately rebuilds the open preview; it does not create an Assets-only copy of business data.

The Print Menu asset delegates to Menu Card Export and therefore includes only the category icons saved on the current menu, uses the same `showCategoryIcons` preference as the public live menu, and refreshes when a category icon changes.

June 25, 2026 hardening: every QR generated through Assets/Menu Kit must preserve a four-module quiet zone, keep business identity and short-link trust cues outside the QR pattern, and avoid unsupported "verified", "secure", "no spam", or WhatsApp-consent claims on normal MenuList menu/page QR outputs.

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
| Branded QR Action Templates | Cross-feature doctrine for scan-safe branded physical action files. |
| QR WhatsApp Experiments | Separate future campaign layer for tracked WhatsApp QR tests, consent copy, and winner decisions. |

Print Assets does not store generated files, add a blank design studio, estimate print quantities, calculate local print prices, or create a print-ordering marketplace. Supported single print assets may open a governed editor document for practical copy/layout fixes while QR links and attribution rules remain locked. Trust cues belong inside the existing finished print object; QR itself is not a separate product category.

Use [Branded QR Action Templates](../branded-qr-action-templates/README.md) for the standard design rule: brand, CTA, short link, and frame around a protected scan-safe QR.

If an owner needs to test a printed QR campaign against WhatsApp outcomes, use the dedicated [QR WhatsApp Experiments](../qr-whatsapp-experiments/README.md) feature boundary. Do not add scan ledgers, WhatsApp-open ledgers, consent copy, or experiment dashboards to ordinary Assets downloads.

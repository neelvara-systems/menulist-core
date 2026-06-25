# Branded QR Action Templates

**Status:** Docs-ready alignment layer
**Owner:** MenuList
**Last Updated:** June 25, 2026

Branded QR Action Templates is the product contract for turning a physical QR surface into a branded customer action point without becoming a generic QR generator or unsafe QR art tool.

The idea is simple:

```text
physical touchpoint
-> clear customer action
-> scan-safe branded QR surface
-> live MenuList destination or governed experiment destination
-> useful customer outcome
```

This is not a separate runtime route today. It aligns existing and future work across Assets, Printable Asset Templates, Menu Kit, and QR WhatsApp Experiments.

## Document Index

| Document | Purpose |
| --- | --- |
| [Spec](./branded-qr-action-templates_spec.md) | Product scope, safety tiers, and action taxonomy |
| [Implementation](./branded-qr-action-templates_impl.md) | How this maps to existing MenuList features |
| [Marketing](./branded-qr-action-templates_marketing.md) | Internal positioning and claim boundaries |
| [Website](./branded-qr-action-templates_website.md) | Public website guidance |
| [Help Doc](./branded-qr-action-templates_helpdoc.md) | Owner-facing help article draft |
| [Firebase](./branded-qr-action-templates_firebase.md) | Cost model and rejected storage patterns |
| [Mobile Support](./branded-qr-action-templates_mobile-support.md) | Mobile admission and UX boundary |
| [Test Cases](./branded-qr-action-templates_test-cases.md) | Verification checklist |

## Current MenuList Mapping

| Layer | Current Home | Decision |
| --- | --- | --- |
| Standard branded QR surface | Assets / Printable Asset Templates / Menu Kit | Implemented pattern. QR stays standard, dark, quiet-zone safe, and surrounded by branded frame, CTA, short link, and business identity. |
| Business-action template | Assets / Printable Asset Templates | Accepted. Owner chooses output such as menu, order, feedback, booking, offer, loyalty, reorder, event, or product info. |
| Measured WhatsApp campaign | QR WhatsApp Experiments | Accepted as separate experiment layer with tokens, consent, and dashboard. |
| Artistic QR pattern | Not admitted | Rejected until a dedicated scan-regression suite proves reliability across devices and printed materials. |

## Safety Tiers

| Tier | Allowed | Default |
| --- | --- | --- |
| Tier 1: Branded frame | Brand color, logo, CTA, short link, and visual frame outside QR pattern. | Allowed for normal Assets/Menu Kit. |
| Tier 2: Constrained QR styling | Limited module color/shape changes only after scan tests pass. | Future-only. |
| Tier 3: Artistic QR | Heavy pattern edits, embedded scenes, large logo overlays, or distorted modules. | Rejected for production SMB assets. |

## Sources Checked

- DENSO WAVE QR guidance: [QR error correction helps with dirt/damage, but higher correction increases symbol size](https://www.qrcode.com/en/about/error_correction.html), so operating environment matters.
- FTC consumer alert: [scammers can cover legitimate QR codes or route users to spoofed sites](https://consumer.ftc.gov/consumer-alerts/2023/12/scammers-hide-harmful-links-qr-codes-steal-your-information), so visible destination/trust cues matter.
- GS1 Sunrise 2027 material: [2D codes are increasingly used for richer product and customer engagement](https://www.gs1us.org/industries-and-insights/by-topic/sunrise-2027).

## No New Runtime Flag

This is an alignment layer, not a new executable module. Standard output is governed by existing Assets and Printable Asset Templates flags. Measured campaign runtime remains behind `ENABLE_QR_WHATSAPP_EXPERIMENTS`.

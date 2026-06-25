# QR WhatsApp Experiments

**Status:** Docs-ready
**Owner:** MenuList
**Last Updated:** June 25, 2026

QR WhatsApp Experiments is the future campaign layer for testing physical QR creatives that drive a customer into a tracked WhatsApp conversation. It is separate from normal Assets/Menu Kit QR output.

The core flow is:

```text
Physical asset
-> tracked landing page or redirect
-> WhatsApp click-to-chat
-> customer sends the message
-> consent is captured
-> conversation outcome is recorded
-> owner sees the winning variant
```

The feature exists because scan count alone is not a business result. For SMB owners, the useful outcome is qualified WhatsApp conversations, opt-ins, bookings, orders, redemptions, or repeat-customer actions per physical placement.

## Document Index

| Document | Purpose |
| --- | --- |
| [Spec](./qr-whatsapp-experiments_spec.md) | Product scope, owner outcome, and decision rules |
| [Implementation](./qr-whatsapp-experiments_impl.md) | Proposed runtime architecture and integration path |
| [Marketing](./qr-whatsapp-experiments_marketing.md) | Internal positioning and claim boundaries |
| [Website](./qr-whatsapp-experiments_website.md) | Public website/page guidance |
| [Help Doc](./qr-whatsapp-experiments_helpdoc.md) | Owner-facing help article draft |
| [Firebase](./qr-whatsapp-experiments_firebase.md) | Cost model, rejected patterns, and storage rules |
| [Mobile Support](./qr-whatsapp-experiments_mobile-support.md) | Mobile admission and owner workflow |
| [Test Cases](./qr-whatsapp-experiments_test-cases.md) | Verification checklist |

## Product Boundary

| Surface | Role |
| --- | --- |
| Assets | Generates ordinary printable files and campaign artwork. It must not create experiment scan ledgers by default. |
| Printable Asset Templates | Can provide the creative document used for variant A/B artwork. It does not own experiment measurement. |
| Branded QR Action Templates | Defines the scan-safe creative shell for physical action variants before measurement starts. |
| QR WhatsApp Experiments | Owns campaign tokens, tracked URLs, landing copy, consent copy, WhatsApp click/start attribution, and winner decision logic. |
| CampaignCue | May later suggest copy/creative variants. It must not send WhatsApp messages or mutate MenuList truth without explicit approval. |
| SignalDesk | May observe aggregated results later. It must not provider-send, bulk-message, or claim conversion lift without proof. |

## Non-Negotiables

- Normal MenuList menu/service/catalog QR codes continue to open the live page directly.
- Branded campaign art must start from scan-safe action templates; artistic QR patterns stay rejected until scan-regression coverage exists.
- Scanning a QR is not consent for future WhatsApp marketing.
- A winning QR is chosen by business outcome, not raw scan count.
- QR reliability is part of the experiment. Every variant must preserve the four-module quiet zone.
- No raw phone number, raw `wa_id`, IP address, or user-agent string is stored unless a later privacy review explicitly approves the exact need.
- Event storage must be aggregate-first and bounded. Per-scan Firestore documents are rejected by default.

## Sources Checked

- WhatsApp click-to-chat and business QR flows: [WhatsApp Help Center](https://faq.whatsapp.com/5913398998672934) and [WhatsApp Business QR help](https://faq.whatsapp.com/888878128766436).
- WhatsApp Business Platform webhooks and opt-in requirements: [Meta webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview/) and [Meta opt-in guidance](https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in).
- UTM campaign measurement: [Google Analytics URL builder guidance](https://support.google.com/analytics/answer/10917952).
- QR quiet-zone requirement: [DENSO WAVE QR Code margin guidance](https://www.qrcode.com/en/howto/code.html).
- India personal-data consent posture: [MeitY DPDP Rules page](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025) and [PIB DPDP Rules release](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190014).

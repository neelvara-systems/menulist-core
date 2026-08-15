# WhatsAppOS — Documentation Hub

> **Feature:** Shared Meta WhatsApp delivery plane
> **Status:** Source implementation complete; provider activation remains disabled
> **Last Updated:** August 15, 2026
> **Decision Horizon:** Three years

WhatsAppOS is the shared server-side contract for sending and observing WhatsApp messages through each product’s official Meta WhatsApp Business Platform account. It centralizes provider configuration, template identity, bounded requests, idempotency, status webhooks and consent enforcement without merging product data or workflows.

## Documents

| Audience           | Document                                  | Purpose                                         |
| ------------------ | ----------------------------------------- | ----------------------------------------------- |
| Product / Founder  | [Specification](./whatsapp-os_spec.md)    | Message classes, consent and product boundaries |
| Engineering        | [Implementation](./whatsapp-os_impl.md)   | Meta client, templates, webhooks and migration  |
| Marketing          | [Marketing](./whatsapp-os_marketing.md)   | Approved internal positioning                   |
| Public content     | [Website](./whatsapp-os_website.md)       | Public-claim boundary                           |
| Operators / Owners | [Help](./whatsapp-os_helpdoc.md)          | Future setup and consent guidance               |
| Cost review        | [Firebase](./whatsapp-os_firebase.md)     | Provider mapping, receipts, consent and cost    |
| Mobile review      | [Mobile](./whatsapp-os_mobile-support.md) | OTP and opt-in mobile behavior                  |
| QA                 | [Test Cases](./whatsapp-os_test-cases.md) | Meta, security, routing and cost certification  |

## Consumers

| Consumer             | How it uses WhatsAppOS                 | Owning workflow ledger                         |
| -------------------- | -------------------------------------- | ---------------------------------------------- |
| Phone OTP            | Direct authentication request          | Existing OTP challenge                         |
| Messaging onboarding | Direct conversational/template request | Existing messaging onboarding session/delivery |
| NotificationOS       | Consented owner lifecycle request      | Existing owner notification event/delivery     |

WhatsAppOS does not copy these workflows into a new generic business-event queue.

## Current Source Truth

- Root and Functions callers use the shared bounded contracts in `src/data/shared/whatsappOs.ts` and its exact product-runtime mirrors.
- Phone OTP routes directly through the authentication-class WhatsAppOS request without creating notification consent.
- Messaging onboarding retains its workflow state machine while reusing the central provider POST client.
- MenuList and Answerlattice have product-local signed webhook/status reconciliation boundaries and separate Firebase collections.
- Owner-notification WhatsApp delivery is currently off (`src/config/features.ts:2880-2884`).

## Version History

| Version | Date       | Change                                                                |
| ------- | ---------- | --------------------------------------------------------------------- |
| 1.0.0   | 2026-08-15 | Frozen official-Meta delivery, consent, webhook and cost architecture |
| 1.1.0   | 2026-08-15 | Implemented shared clients, caller migrations, receipts and consent surfaces |

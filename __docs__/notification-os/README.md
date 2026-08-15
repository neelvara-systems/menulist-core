# NotificationOS — Documentation Hub

> **Feature:** Cross-product, multi-channel notification orchestration
> **Status:** Source implementation complete; email/WhatsApp provider activation remains gated
> **Last Updated:** August 15, 2026
> **Decision Horizon:** Three years

NotificationOS is the policy and orchestration layer for product notifications. It decides whether an event should notify, resolves the recipient and business context once, plans eligible channels in memory, and delegates delivery to EmailOS and WhatsAppOS.

It evolves the existing Owner Notifications runtime and collections. It does not create a second queue or duplicate delivery ledger.

## Documents

| Audience           | Document                                      | Purpose                                                     |
| ------------------ | --------------------------------------------- | ----------------------------------------------------------- |
| Product / Founder  | [Specification](./notification-os_spec.md)    | Frozen scope, channel modes, consent and product boundaries |
| Engineering        | [Implementation](./notification-os_impl.md)   | Target architecture, migration order and source map         |
| Marketing          | [Marketing](./notification-os_marketing.md)   | Internal positioning and approved claims                    |
| Public content     | [Website](./notification-os_website.md)       | Public-claim boundary while the feature is not live         |
| Operators / Owners | [Help](./notification-os_helpdoc.md)          | Future owner guidance and current availability boundary     |
| Cost review        | [Firebase](./notification-os_firebase.md)     | Read/write budgets, retention and cost invariants           |
| Mobile review      | [Mobile](./notification-os_mobile-support.md) | Settings and onboarding impact                              |
| QA                 | [Test Cases](./notification-os_test-cases.md) | Routing, cost, security and failure matrix                  |
| Audit / release    | [Validation](./notification-os_validation.md) | Current wiring, dry-firing evidence and external blockers   |

## System Boundary

```text
Product event
  -> NotificationOS event claim
  -> one product scope/contact read
  -> immutable in-memory delivery context
  -> one semantic notification model
  -> in-memory channel plan
  -> EmailOS and/or WhatsAppOS
  -> deterministic per-channel finalization
```

- [EmailOS](../email-os/README.md) owns email rendering, Resend delivery, receipts and email suppression.
- [WhatsAppOS](../whatsapp-os/README.md) owns Meta templates/session messages, provider delivery, webhooks and WhatsApp-specific consent enforcement.
- [Owner Notifications](../owner-notifications/README.md) is the implemented event/delivery substrate used by NotificationOS.
- Authentication OTP and owner-started messaging onboarding use WhatsAppOS directly; they do not become NotificationOS lifecycle events.

## Current Source Truth

- The pure planner and internal-email boundary live in `src/data/shared/notificationOs.ts` and are mirrored into MenuList Functions.
- App and Functions processors resolve scope once, reuse that immutable data for every planned channel and preserve ambiguous provider outcomes without replay.
- Desktop and `MobileShell` settings write through the authenticated, permission-checked consent API; direct browser store writes cannot alter `notificationSettings`.
- WhatsApp owner delivery remains disabled until Meta number, templates, signed webhooks and QA evidence are certified.
- The August 15 Answerlattice completion audit verifies 35 active product-trigger pairs and dry-plans all 68 registered policies. `MENU_PUBLISHED` is a compatibility alias; 27 MenuList catalogue entries and five Answerlattice workflow entries are intentionally reserved and non-firing. Reserved entries are not represented as live product behavior.
- The long-term catalogue is governed in the registry with explicit `active`, `reserved`, and `alias` states. New billing/capacity events activate only where current Razorpay or capacity state already provides an authoritative transition; all other proposed owner events remain non-firing until their product workflow exists.

## Version History

| Version | Date       | Change                                                    |
| ------- | ---------- | --------------------------------------------------------- |
| 1.0.0   | 2026-08-15 | Frozen multi-channel architecture and Firebase cost model |
| 1.1.0   | 2026-08-15 | Implemented planner, consent API, settings and channel adapters |
| 1.2.0   | 2026-08-15 | Closed phone-only and non-awaited producer gaps; added complete registry dry-firing and active-producer audit gates |
| 1.3.0   | 2026-08-15 | Added producer lifecycle governance, five authoritative billing/capacity triggers, and the reserved long-term owner catalogue |

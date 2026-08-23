# Owner Notifications

**Status:** Local source complete for strict-order item 6; provider, target deploy, authenticated browser/device, and production-host evidence remain pending
**Date:** 2026-08-23
**Products:** MenuList primary, Answerlattice reusable architecture
**Owner:** Platform / product engineering

Owner Notifications is the shared system for account-critical messages sent to business owners and approved account contacts through email and WhatsApp.

> **Long-term architecture:** [NotificationOS](../notification-os/README.md) is now the canonical orchestration plan, and [WhatsAppOS](../whatsapp-os/README.md) is the canonical Meta delivery plan. This existing Owner Notifications package remains the implemented substrate and migration evidence. Implementation must evolve its registry, events, deliveries, rate limits and recovery tooling in place; it must not create a parallel notification queue or duplicate business ledger.

It replaces scattered direct sends in lifecycle messaging, billing routes, scheduler tasks, and the Answerlattice owner notification test with one product-scoped event, recipient, preference, formatting, delivery, and logging architecture.

## Implementation Status

Implemented on June 2, 2026:

- Shared trigger registry in `src/data/shared/ownerNotificationRegistry.ts`, mirrored to `functions/src/sharedData/ownerNotificationRegistry.ts`.
- App-side owner notification core in `src/lib/owner-notifications/`.
- MenuList Cloud Functions owner notification processor in `functions/src/ownerNotifications/processor.ts`.
- MenuList lifecycle wrappers now enqueue/process owner notification events before falling back to legacy senders.
- Answerlattice `ANSWERLATTICE_NOTIFICATION_TEST` now routes through the owner notification core while ticket/customer emails remain on the existing generic notification service.
- MenuList billing, payment recovery/refund, credit threshold/exhaustion, publish success/failure, suspension/renewal, subscription activation/cancellation/pause/resume/upgrade/completion, and menu-stale owner triggers are wired. The long-term catalogue is explicitly reserved until each owning workflow has authoritative producer evidence.
- Issued MenuList tax invoices and credit notes use the same NotificationOS event and delivery ledgers. Email can attach the scoped PDF; consented WhatsApp can send the same PDF through an approved document-header template; both retain the secure authenticated document link as fallback. Delivery follows the saved channel mode and remains operator-gated by `MENULIST_BILLING_DOCUMENT_DELIVERY_ENABLED`; the WhatsApp template remains fail-closed until Meta approval.
- August 15 firing audit removed the last legacy email precondition from payment-failure/grace-period enqueueing, made every Next.js lifecycle producer await durable processing, and added active-producer plus all-registry dry-firing gates.
- Internal platform dashboard added at `/ops/owner-notifications` with bounded tracking, detail inspection, retry, prefilled Email/WhatsApp Web recovery, manual system send support, and manual handoff recording.
- July 13 platform-ops hardening requires current persisted platform authority after a fail-closed limiter, derives rows/counts from one product-scoped recent window, reports exact scope reads, filters delivery detail by product, and commits manual-handoff audit writes atomically.
- The independent clean-room follow-up rejects non-claimable retries, preserves malformed persisted enum fields as explicit `invalid` operational state, orders delivery detail newest-first through the declared composite index, and requires stable manual-action IDs so response retries do not duplicate sends or handoff rows.
- Historical June deployment evidence exists, but it does not certify the current source. Current app and Functions changes remain pending an isolated approved QA release and provider smoke.

July 16 end-to-end hardening:

- Removed the desktop header's hard-coded “New Order Placed” examples. MenuList has no owner activity-feed/order-notification contract; lifecycle messages remain email/WhatsApp and delivery recovery remains platform-only.
- App and Functions provider calls now fail closed on redirects and use bounded network/SMTP timeouts. Provider message IDs are control-free and capped before delivery persistence.
- Explicit WhatsApp consent revocation overrides stale legacy consent booleans.
- Owner-notification event documents fail closed above 128KB, before Firestore creation or provider work.
- Platform manual-send recovery now binds each action ID to the exact source event, product, channel, normalized destination and reason. Exact retries converge; changed payloads return conflict before provider work, and unavailable product runtime admission no longer reports false success.
- The protected ops API applies private/no-store/nosniff headers to every response and keeps limiter-provider outages separate from real quota exhaustion.
- Repeated publish-verification failures use one store/day reference instead of a unique timestamp per retry.

## Scope

This system handles owner/account-critical messages only:

- Billing state and payment risk
- Menu or public output publish state
- Credit balance and account capacity
- Account access and claim links
- Required support-readiness notices for Answerlattice
- Notification test sends and channel health checks

This system does not handle:

- Internal ops alerts or founder Telegram alerts
- Slack, Linear, GitHub, or workflow integrations
- Dashboard toast messages
- Marketing campaigns
- Growth kit messages
- Customer menu action deep links
- Manual owner copy/share tools

WhatsApp messaging onboarding is an adjacent but separately tracked owner-started flow. Its preview/live-link replies remain in the messaging session and outbound-delivery state; they are not copied into `ownerNotificationEvents` or `ownerNotificationDeliveries`.

The internal platform dashboard is a recovery surface for the platform team only. It is not an owner dashboard, workflow automation product, or customer-facing notification center.

## Current Source Evidence

| Area | Current source |
| --- | --- |
| MenuList lifecycle email engine | `functions/src/messaging/messagingEngine.ts:326`, `src/lib/messaging/index.ts:339` |
| Current MenuList lifecycle events | `__docs__/lifecycle-messaging/lifecycle-messaging_impl.md:104` |
| MenuList WhatsApp onboarding templates | `functions/src/messagingOnboarding/constants.ts:291` |
| WhatsApp inbound queue processing | `functions/src/messagingOnboarding/inboundQueue.ts:403` |
| Answerlattice notification sender | `src/lib/notifications/index.ts:262` |
| Answerlattice ticket notification triggers | `src/database/tickets/index.ts:693` |
| Answerlattice workflow integrations boundary | `__docs__/answerlattice/workflow-integrations/workflow-integrations_impl.md:1` |
| Desktop locale/currency settings | `src/components/templates/main-app/businessSettings/tabs/LocaleSettingsTab.tsx:29` |
| Mobile locale/currency settings | `src/components/mobile/screens/MobileLocaleSettingsScreen.tsx:58` |
| Shared date/time utility layer | `src/utils/dateTime/index.tsx:100` |

## Document Set

| Document | Purpose |
| --- | --- |
| [owner-notifications_spec.md](./owner-notifications_spec.md) | Business requirements, trigger policy, scope, and product boundaries |
| [owner-notifications_impl.md](./owner-notifications_impl.md) | Technical architecture, build order, files, schemas, migration plan |
| [owner-notifications_firebase.md](./owner-notifications_firebase.md) | Firestore, Cloud Functions, WhatsApp/email cost and index model |
| [owner-notifications_mobile-support.md](./owner-notifications_mobile-support.md) | Mobile admission test and owner-facing mobile scope |
| [owner-notifications_test-cases.md](./owner-notifications_test-cases.md) | QA matrix for trigger, delivery, dedupe, formatting, and recovery |
| [owner-notifications_marketing.md](./owner-notifications_marketing.md) | Internal positioning and product narrative |
| [owner-notifications_website.md](./owner-notifications_website.md) | Public content guidance if this appears on product pages |
| [owner-notifications_helpdoc.md](./owner-notifications_helpdoc.md) | Owner help documentation draft |
| [owner-notifications-messaging-onboarding_verification.md](./owner-notifications-messaging-onboarding_verification.md) | Strict-order item 6 end-to-end code/docs verification and external boundary |

## Maintenance Gates

Any owner-notification change must recheck:

- Trigger categories and channel policy
- Required WhatsApp consent and template rules
- Product boundary between MenuList, Answerlattice owner notices, and Answerlattice workflow integrations
- Notification log schema and Firebase cost envelope
- Date, time, timezone, and currency formatting contract

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 1.3 | August 15, 2026 | Closed phone-only and serverless early-return firing gaps; added producer and registry dry-firing evidence |
| 1.2 | July 16, 2026 | Removed fake owner-header notification data; bounded event/provider behavior; reconciled the messaging-onboarding boundary; added item 6 verification evidence |
| 1.1 | July 13, 2026 | Hardened the internal recovery surface with current persisted platform authorization, bounded recent counts, product-filtered detail, exact cost reporting, and atomic manual handoff |
| 1.0 | June 2, 2026 | Implemented the shared owner-notification architecture and platform recovery monitor |

## Changelog

This documentation package is tracked in [../changelog.md](../changelog.md). NotificationOS now adds owner-only desktop and mobile delivery settings over this substrate. It still does not introduce an owner activity feed, and the provider-disabled messaging-onboarding tunnel remains a separate owner-started workflow.

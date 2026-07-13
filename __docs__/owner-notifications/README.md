# Owner Notifications

**Status:** Implemented for MenuList lifecycle owner notifications, Answerlattice owner test notification, and internal ops tracking
**Date:** 2026-07-13
**Products:** MenuList primary, Answerlattice reusable architecture
**Owner:** Platform / product engineering

Owner Notifications is the shared system for account-critical messages sent to business owners and approved account contacts through email and WhatsApp.

It replaces scattered direct sends in lifecycle messaging, billing routes, scheduler tasks, and the Answerlattice owner notification test with one product-scoped event, recipient, preference, formatting, delivery, and logging architecture.

## Implementation Status

Implemented on June 2, 2026:

- Shared trigger registry in `src/data/shared/ownerNotificationRegistry.ts`, mirrored to `functions/src/sharedData/ownerNotificationRegistry.ts`.
- App-side owner notification core in `src/lib/owner-notifications/`.
- MenuList Cloud Functions owner notification processor in `functions/src/ownerNotifications/processor.ts`.
- MenuList lifecycle wrappers now enqueue/process owner notification events before falling back to legacy senders.
- Answerlattice `ANSWERLATTICE_NOTIFICATION_TEST` now routes through the owner notification core while ticket/customer emails remain on the existing generic notification service.
- MenuList billing, credit, publish success/failure, suspension warning, renewal reminder, subscription cancellation/pause/resume/upgrade, credits exhausted, and menu stale owner triggers are wired.
- Internal platform dashboard added at `/ops/owner-notifications` with bounded tracking, detail inspection, retry, prefilled Email/WhatsApp Web recovery, manual system send support, and manual handoff recording.
- July 13 platform-ops hardening requires current persisted platform authority after a fail-closed limiter, derives rows/counts from one product-scoped recent window, reports exact scope reads, filters delivery detail by product, and commits manual-handoff audit writes atomically.
- The independent clean-room follow-up rejects non-claimable retries, preserves malformed persisted enum fields as explicit `invalid` operational state, orders delivery detail newest-first through the declared composite index, and requires stable manual-action IDs so response retries do not duplicate sends or handoff rows.
- Firebase Functions deployed to `menulist-qa`: `verifyMenuPublish`, `computeDecisionBlocksScores`, `triggerDecisionBlocksScoring`, `triggerStoreNightlyScheduler`.

## Scope

This system handles owner/account-critical messages only:

- Billing state and payment risk
- Menu or public output publish state
- WhatsApp onboarding progress that the owner started
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

The internal platform dashboard is a recovery surface for the platform team only. It is not an owner dashboard, workflow automation product, or customer-facing notification center.

## Current Source Evidence

| Area | Current source |
| --- | --- |
| MenuList lifecycle email engine | `functions/src/messaging/messagingEngine.ts:157`, `src/lib/messaging/index.ts:171` |
| Current MenuList lifecycle events | `__docs__/lifecycle-messaging/lifecycle-messaging_impl.md:104` |
| MenuList WhatsApp onboarding templates | `functions/src/messagingOnboarding/constants.ts:254` |
| WhatsApp inbound queue processing | `functions/src/messagingOnboarding/inboundQueue.ts:142` |
| Answerlattice notification sender | `src/lib/notifications/index.ts:248` |
| Answerlattice ticket notification triggers | `src/database/tickets/index.ts:179` |
| Answerlattice workflow integrations boundary | `__docs__/answerlattice/workflow-integrations/workflow-integrations_impl.md:1` |
| Desktop locale/currency settings | `src/components/templates/main-app/businessSettings/tabs/LocaleSettingsTab.tsx:90` |
| Mobile locale/currency settings | `src/components/mobile/screens/MobileLocaleSettingsScreen.tsx:135` |
| Shared date/time utility layer | `src/utils/dateTime/index.tsx:131` |

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
| 1.1 | July 13, 2026 | Hardened the internal recovery surface with current persisted platform authorization, bounded recent counts, product-filtered detail, exact cost reporting, and atomic manual handoff |
| 1.0 | June 2, 2026 | Implemented the shared owner-notification architecture and platform recovery monitor |

## Changelog

This documentation package is tracked in [../changelog.md](../changelog.md). The July 13 ops-route audit changed internal recovery authorization/cost semantics only; owner delivery triggers, templates, channels, preferences, and public behavior are unchanged.

# Owner Notifications - Spec

**Status:** Implemented source evidence; not current launch certification
**Date:** 2026-07-13
**Audience:** Product, engineering, support, platform owner

> **Current release boundary (July 2, 2026):** This specification records owner-notification architecture and source evidence only. It is not current production-launch approval. Current owner-notification release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:owner-notifications-boundary`, scoped provider smoke for SMTP/WhatsApp where enabled, platform recovery monitor browser QA, target Firebase deploy evidence where Functions logic changes, target Vercel deploy evidence where app routes change, and production-host smoke.

> **July 13 internal-recovery boundary:** Platform recovery access now requires the exact current persisted platform user after a fail-closed limiter, not only a signed session claim. Dashboard status metrics are explicitly recent-window counts. This does not change owner recipients, triggers, templates, delivery channels, or public behavior.

## Executive Summary

MenuList and Answerlattice both need a long-term notification system for important owner/account messages. Today the codebase has several separate systems:

- MenuList lifecycle email sends directly from billing routes, schedulers, and Cloud Functions.
- MenuList WhatsApp onboarding sends conversational WhatsApp messages through its own provider adapter.
- Answerlattice ticket emails use a separate generic notification service.
- Answerlattice workflow integrations send governance events to Slack/email/Linear/GitHub.
- Internal ops alerts use separate alerting and Telegram paths.

Owner Notifications will centralize only owner/account-critical communication. It will use email and WhatsApp as the main owner channels while keeping ops alerts, workflow integrations, and manual share tools separate.

## Product Principle

An owner notification is a required or high-value account message that helps the owner keep their public output, billing, account access, or support readiness working.

It is not a software activity feed.

It is not an automation workflow.

It is not a marketing message.

## Goals

1. Provide one shared architecture for MenuList owner notifications and Answerlattice owner notifications.
2. Support email and WhatsApp as first-class channels.
3. Keep product trigger registries separate so MenuList and Answerlattice do not blur.
4. Respect owner settings for timezone, date format, time format, currency code, and currency symbol.
5. Stop sending directly from random route files and schedulers.
6. Make idempotency, retries, rate limits, delivery logs, and channel health consistent.
7. Preserve Firebase cost discipline through append-only events, compact delivery logs, direct document IDs, and bounded queries.

## Non-Goals

| Non-goal | Reason |
| --- | --- |
| Internal ops alerts | Existing alert/Telegram paths serve platform operators, not owners. |
| Answerlattice workflow integrations | These are governance/workflow outputs, not owner account-critical notices. |
| Slack, Linear, GitHub channels | Out of scope for owner notification core. |
| Marketing campaigns | Different consent, cadence, copy, and analytics model. |
| Dashboard toast messages | UI feedback is not durable owner communication. |
| Manual WhatsApp share helpers | Owner-triggered copy/share tools should remain manual unless explicitly converted with consent. |
| Owner-editable templates | Prevents unsafe, inconsistent, and unreviewed notification copy. |

## Owner Channels

| Channel | Role | Default policy |
| --- | --- | --- |
| Email | Durable primary channel for receipts, billing, publish state, account records, test sends | Required for service/account notices |
| WhatsApp | Fast owner-action channel for onboarding, billing risk, live/failure state, urgent account action | Only when number, consent, and approved template/session context exist |

Email is the baseline. WhatsApp is not a blanket mirror of every email.

## Recipient Rules

| Recipient role | Used for | Resolution order |
| --- | --- | --- |
| Primary owner | Publish, account, onboarding, general required notices | `notificationSettings.primaryEmail`, store/workspace owner email, session email fallback |
| Billing owner | Payment success/failure, renewal, grace, suspension, cancellation, pause/resume | `notificationSettings.billingEmail`, subscription email, primary owner fallback |
| WhatsApp owner | WhatsApp onboarding and consented urgent notices | verified WhatsApp number, inbound session user, store public/owner phone only when consented |
| Support owner | Answerlattice readiness and support-email verification | workspace `supportEmail`, owner fallback |

No trigger may send to a recipient field that was not resolved through the product-specific resolver.

WhatsApp recipient fields are resolved to canonical international digits before delivery. The resolver may use `notificationSettings.whatsappNumber`, owner/store/workspace WhatsApp fields, explicit recipient hints, canonical `phone`, or local `phoneNumber` with stored `countryCode`/`dialCode`; it must not send a local number directly to the WhatsApp API.

## Formatting Rules

Every owner notification must use product/store/workspace preferences:

- `timeZone`
- `dateFormat`
- `timeFormat`
- `currencyCode`
- `currencySymbol`
- default language/locale where available

Current gaps to fix:

- `src/app/api/razorpay/verify-subscription/route.ts:300` formats billing dates with native `toLocaleDateString()`.
- `src/app/api/razorpay/webhook/route.ts:506` formats next billing dates with native `toLocaleDateString()`.
- `src/lib/messaging/templates.ts:44` and `functions/src/messaging/templates.ts:88` build money strings as raw `currency amount`.
- `src/app/api/answerlattice/notifications/test/route.ts:96` formats sent time with native `toLocaleString()`.

## Trigger Classification

| Class | Meaning | Email | WhatsApp | Quiet hours |
| --- | --- | --- | --- | --- |
| Critical | Owner action or payment risk needed soon | Yes | Yes when consented/template available | Bypass |
| Required | Account record, receipt, live-state confirmation | Yes | Optional when useful | Respect unless live/onboarding |
| Advisory | Helpful but not urgent | Yes or dashboard only | No by default | Respect |
| Conversational | Owner started WhatsApp onboarding/session | No unless account record needed | Yes | Session context decides |

## MenuList Trigger Registry

### Required in the shared system

| Trigger | Class | When | Who | Channels |
| --- | --- | --- | --- | --- |
| `MENU_PUBLISHED` | Required | Public menu verification succeeds | Primary owner | Email, WhatsApp only when onboarding/session context exists |
| `MENU_PUBLISH_FAILED` | Critical | Publish or verification fails after owner action | Primary owner | Email + WhatsApp when consented/session context exists |
| `PAYMENT_SUCCESS` | Required | Subscription activation or charge confirmed | Billing owner | Email |
| `PAYMENT_FAILED` | Critical | Razorpay `payment.failed` or `subscription.halted` | Billing owner | Email + WhatsApp when consented |
| `GRACE_PERIOD_STARTED` | Critical | Razorpay `subscription.pending` | Billing owner | Email + WhatsApp when consented |
| `RENEWAL_REMINDER` | Required | Active subscription renews in configured reminder window | Billing owner | Email; WhatsApp optional only for high-risk accounts |
| `SUSPENSION_WARNING` | Critical | Subscription is past due beyond threshold | Billing owner | Email + WhatsApp when consented |
| `CREDIT_PURCHASE_SUCCESS` | Required | Top-up payment verified | Billing owner | Email |
| `CREDITS_LOW` | Advisory | Credits fall below configured threshold | Primary owner | Email or dashboard; WhatsApp no by default |
| `CREDITS_EXHAUSTED` | Critical | Monthly and top-up credits both hit zero | Primary owner | Email + WhatsApp when consented |
| `SUBSCRIPTION_CANCELLED` | Required | Subscription cancellation confirmed | Billing owner | Email |
| `SUBSCRIPTION_PAUSED` | Required | Support/policy-enabled pause confirmed | Billing owner | Email |
| `SUBSCRIPTION_RESUMED` | Required | Support/policy-enabled resume confirmed | Billing owner | Email |
| `SUBSCRIPTION_UPGRADED` | Required | Old subscription closed and replacement is active | Billing owner | Email |
| `MENU_STALE` | Advisory | Store truth confidence marks menu stale and cooldown allows notice | Primary owner | Email only |

### Conversational WhatsApp onboarding

These remain WhatsApp-first because the owner initiated the WhatsApp session:

| Trigger | When | Channel |
| --- | --- | --- |
| `WHATSAPP_INTAKE_STARTED` | First valid menu file arrives | WhatsApp |
| `WHATSAPP_INTAKE_PROGRESS` | Validation/extraction begins | WhatsApp |
| `WHATSAPP_PREVIEW_READY` | Preview URL exists | WhatsApp link message |
| `WHATSAPP_FIX_REQUEST_ACKNOWLEDGED` | Owner requests preview fix | WhatsApp |
| `WHATSAPP_PUBLISHED` | Publish completes | WhatsApp link message |
| `WHATSAPP_RATE_LIMITED` | Abuse/rate guard blocks session | WhatsApp |
| `WHATSAPP_UPLOAD_HELP_NEEDED` | Upload is non-menu, unclear, unsupported, or password-protected | WhatsApp |

The implementation may continue to use the existing WhatsApp onboarding state machine, but delivery logging and channel health should be aligned with the owner notification system.

## Answerlattice Trigger Registry

Answerlattice owner notifications must stay knowledge-infrastructure aligned. They must not become a helpdesk workflow feed.

| Trigger | Class | When | Who | Channels |
| --- | --- | --- | --- | --- |
| `ANSWERLATTICE_NOTIFICATION_TEST` | Required | Owner sends test email | Support owner | Email |
| `SUPPORT_EMAIL_MISSING` | Critical | Workspace cannot receive customer/support notices because support email is absent/invalid | Support owner fallback | Email; WhatsApp when consented |
| `WIDGET_CONNECTION_VERIFIED` | Required | Owner verifies widget/runtime connection | Support owner | Email optional; dashboard by default |
| `WIDGET_CONNECTION_FAILED` | Critical | Owner-triggered widget verification fails | Support owner | Email + WhatsApp when consented |
| `SOURCE_SYNC_FAILED` | Critical | Required support source sync fails and owner action is needed | Support owner | Email + WhatsApp when consented |
| `CANONICAL_APPROVAL_REQUIRED` | Advisory | Knowledge mutation needs owner review | Support owner | Email only if configured; not WhatsApp by default |
| `HIGH_PRIORITY_ESCALATION` | Critical | Support fallback requires owner attention | Support owner | Email + WhatsApp when consented |

Existing Answerlattice ticket submitter emails can migrate to the shared delivery engine, but they are not owner-notification triggers unless the recipient is the workspace owner/contact.

Existing Answerlattice workflow integrations remain separate. They are governed integration events, not owner notification core.

## Settings And Consent

Owner Notifications must use existing settings first. Do not add settings unless required for consent or safe delivery.

Required fields:

- `notificationSettings.primaryEmail`
- `notificationSettings.billingEmail`
- `notificationSettings.whatsappNumber`
- `notificationSettings.whatsappConsentStatus`
- `notificationSettings.whatsappConsentedAt`
- `notificationSettings.preferredChannels`
- `notificationSettings.quietHoursEnabled`

For MenuList, store locale/currency fields already exist in desktop and mobile settings. For Answerlattice, workspace/store settings need equivalent notification and formatting context.

## Success Criteria

- All current MenuList lifecycle email triggers enqueue through the shared owner notification core.
- Existing email behavior remains equivalent during migration.
- All billing/date/money notification content uses central formatters.
- WhatsApp delivery is available for approved triggers only.
- Answerlattice owner notices use the same event, recipient, formatter, log, and channel abstractions.
- Workflow integrations and ops alerts remain separate.
- No owner receives duplicate messages for the same trigger/reference.
- Notification failure never blocks the source business operation.

## Open Product Decisions

| Decision | Recommendation |
| --- | --- |
| Should every payment success go to WhatsApp? | No. Email receipt is enough unless first activation or owner explicitly opts in. |
| Should low credits go to WhatsApp? | No by default. Use email/dashboard; WhatsApp only for exhausted credits. |
| Should menu stale notify owners? | Yes, but email-only, cooldown-limited, and phrased as a calm review prompt. |
| Should staff credentials be sent automatically? | No. Keep owner-triggered manual share unless a secure invite flow is built. |
| Should Answerlattice workflow integrations use this engine? | No. Keep them separate; only owner/account triggers use this engine. |

## Doctrine Preservation Check

This work introduces a feature-level governance policy, not a new constitution-level doctrine. The durable principle is documented here: owner notifications are account-critical owner communication, not workflow notifications or marketing messages.

# Owner Notifications - Mobile Support

**Status:** Local source boundary complete; no owner notification-center/settings surface is currently shipped
**Date:** 2026-07-16
**Decision:** Partial mobile support

> **Current release boundary (July 16, 2026):** This mobile note records source/mobile-scope evidence only. It is not current production-launch approval. Current owner-notification mobile approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:owner-notifications-boundary`, authenticated mobile settings/status QA for any owner-facing setup surface in release scope, platform recovery monitor browser QA for delivery logs, provider smoke where enabled, target deploy evidence, and production-host smoke.

## Mobile Relevance Decision

Owner Notifications needs partial mobile support.

The notification engine itself is backend/shared infrastructure. Mobile support is needed only for owner-facing preferences, test sends, delivery/readiness visibility, and any WhatsApp consent flow.

## Feature Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Pass | Owners may receive notifications any day; preferences/test sends are occasional but important during setup. |
| Speed | Pass | Preference save, test send, and channel status checks can complete in under 5 seconds when implemented through API/DAL. |
| Touch | Pass | Channel toggles, test buttons, and contact fields work with mobile controls. |
| Value | Pass for setup/status, not logs | A phone owner should verify email/WhatsApp and update recipient settings. Deep delivery logs are platform/admin only. |

## Mobile Scope

Mobile should include:

- Primary email display/edit if existing settings allow it.
- Billing email display/edit if exposed to owners.
- WhatsApp notification consent/status where product policy allows it.
- Send test email.
- Send test WhatsApp only when a verified number/template setup exists.
- Simple last delivery status: working, failed, not configured.

These are future admission rules, not current runtime claims. No owner notification preference/test/status screen is shipped in desktop or MobileShell today.

Mobile should not include:

- Full delivery log table.
- Template management.
- Workflow integration configuration.
- Internal ops/founder alert settings.
- Raw provider IDs or SMTP diagnostics.

## Screens

| Product | Mobile surface |
| --- | --- |
| MenuList | Locale/settings or a compact notification card under mobile settings/more |
| Answerlattice | Activation/readiness settings where support email/test notifications already belong |

## Shared Data Path

Mobile must use the same DAL/API/hook path as desktop. No mobile-only notification logic.

Build order:

1. Shared API/DAL for notification preferences and test sends.
2. Desktop settings surface.
3. Mobile settings surface using the same DAL/API.

## Settings Inheritance

Notifications must inherit owner/store settings:

- Theme is UI-only.
- Language affects template locale where supported.
- Timezone affects rendered dates/times.
- Date format affects rendered dates.
- Time format affects rendered times.
- Currency code/symbol affects rendered money.

MenuList mobile already saves locale/currency settings in `src/components/mobile/screens/MobileLocaleSettingsScreen.tsx:135`.

## Mobile UX Rules

- Minimum 44px touch targets.
- No technical channel names like SMTP provider in owner copy.
- Use plain owner language: "Email notices", "WhatsApp notices", "Send test".
- Test failure should say what the owner can do, not expose internals.
- WhatsApp consent must be explicit and reversible.
- Do not show every delivery attempt to owners.

## Mobile Test Cases

| Case | Expected result |
| --- | --- |
| Owner changes timezone on mobile | Future notification dates render in the new timezone. |
| Owner changes currency on mobile | Future billing/credit notifications use the selected symbol/code. |
| Owner sends test email | API enqueues test event and shows simple success/failure. |
| Owner has no WhatsApp consent | WhatsApp test is disabled or asks for consent. |
| Delivery provider fails | Mobile shows "Notification test could not be sent" without provider secrets. |

## Implementation Decision

Mobile support is required for setup and status, but not for detailed operations monitoring. Detailed delivery logs belong in platform/admin views.

July 13 verification: the internal recovery monitor remains outside the SMB-owner mobile surface. Its API now requires current persisted platform authority after a fail-closed limiter. No owner-mobile route, setting, trigger, template, channel, or MobileShell behavior changed.

July 16 correction: the desktop header's hard-coded order examples were removed instead of being turned into an owner notification feed. Mobile already had no equivalent fake feed. Platform users may still open the internal monitor through the platform-only MobileShell section; that does not expose delivery logs to SMB owners.

`npm run verify:owner-notifications-boundary` locks the current boundary that detailed delivery logs and recovery actions stay in the platform/admin monitor, while mobile support remains limited to future setup/status surfaces that must reuse shared DAL/API paths.

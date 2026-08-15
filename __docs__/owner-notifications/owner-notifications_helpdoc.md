# Owner Notifications - Help Documentation Draft

**Status:** Source-bounded help draft; not current support-publication approval; not current launch approval
**Date:** 2026-08-15
**Audience:** Non-technical owner

> **Current publication boundary (July 16, 2026):** This help draft is source evidence only. It is not current launch approval, support-publication approval, or website approval. Publishing owner-facing notification help requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:owner-notifications-boundary`, SMTP/WhatsApp provider smoke where enabled, authenticated owner settings/status QA for the target surface, platform recovery monitor browser QA, target deploy evidence, and production-host smoke.

July 13 verification found no owner-facing behavior change: current-platform authorization, bounded recent monitor counts, and atomic manual-handoff audit writes affect only the internal recovery surface.

July 16 source truth: MenuList does not currently expose an owner notification center or notification-settings/test screen. The old desktop header examples were placeholders and have been removed. The setup steps below apply only if a future approved owner settings surface is released.

## Summary

Owner notifications are important account messages sent by email, and by WhatsApp when supported. They help you know when your menu is live, a payment needs attention, credits run out, or a setup test is complete.

## What You May Receive

| Notice | Why it is sent |
| --- | --- |
| Menu live | Your public menu was published successfully. |
| Payment received | Your subscription or credit purchase was confirmed. |
| Payment attention needed | A payment could not be collected. |
| Renewal reminder | Your subscription is close to renewal. |
| Service interruption warning | A payment has been overdue for several days. |
| Credits used up | Your credit balance reached zero. |
| WhatsApp preview link | You started menu setup through WhatsApp and your preview is ready. |
| Test notification | You asked the system to check that notifications are working. |

## Email And WhatsApp

Email is the main channel for account records and receipts.

WhatsApp is used only for supported urgent notices or WhatsApp setup flows. Not every email is copied to WhatsApp.

## Settings Used

Notifications use your business settings where available:

- Timezone
- Date format
- Time format
- Currency
- Billing email
- Main owner email
- WhatsApp consent and number, if enabled

## How To Test

When notification settings are exposed in the target owner surface:

1. Open business or account settings.
2. Go to notification settings.
3. Check your email and WhatsApp details.
4. Select Send test.
5. Confirm the test message arrives.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Email did not arrive | Check the email address, spam folder, and whether test sending is enabled. |
| WhatsApp did not arrive | Check that WhatsApp notices are enabled and consented. |
| Date or time looks wrong | Check the business timezone and time format. |
| Currency looks wrong | Check the currency setting in business settings. |
| Too many messages | Contact support; required billing/service notices cannot always be disabled. |

## Need Help?

Contact support if an important notice is missing or going to the wrong address.

# Owner Notifications - Test Cases

**Status:** Implemented source-gate coverage; provider and manual recovery smokes require a configured non-production environment
**Date:** 2026-07-16

## Test Matrix

| Area | Case | Expected result |
| --- | --- | --- |
| Registry | Unknown trigger type is enqueued | Request fails or event is skipped before delivery. |
| Registry | Known trigger missing required metadata | Event is rejected or marked failed with sanitized reason. |
| Product boundary | MenuList trigger uses Answerlattice product ID | Rejected by registry/scope validation. |
| Product boundary | Answerlattice owner trigger reads MenuList Firebase | Rejected by product resolver design. |
| Recipient | Billing event with billing email | Sends to billing email. |
| Recipient | Billing event without billing email | Falls back to subscription/primary owner email. |
| Recipient | WhatsApp event without consent | Email may send; WhatsApp is skipped with reason. |
| Recipient | Missing recipient | Event skipped; source business operation still succeeds. |
| Formatting | Store timezone is Asia/Kolkata | Notification dates/times render in Asia/Kolkata. |
| Formatting | Store date format is `2-digit|short|numeric` | Rendered date matches selected format. |
| Formatting | Store currency is USD/$ | Money renders with `$`/USD policy, not INR fallback. |
| Dedupe | Same trigger/reference enqueued twice | Only one successful delivery per channel. |
| Rate limit | Store exceeds non-critical daily cap | Advisory/required event skipped or delayed. |
| Critical bypass | Payment failed after cap | Critical event still sends subject to recipient/channel safety. |
| Email | SMTP not configured | Event delivery fails, log is written, source flow continues. |
| WhatsApp | Template unavailable outside session window | WhatsApp skipped/failed with sanitized reason; email unaffected. |
| Retry | Email transient failure | Retry task attempts bounded retry. |
| Retry | Permanent invalid recipient | Retry stops after configured attempts. |
| Logs | Email recipient in delivery log | Raw email is not exposed beyond allowed delivery record; public/admin views use masked display. |
| Logs | WhatsApp recipient in delivery log | Raw number is not stored in queryable logs. |
| MenuList billing | `PAYMENT_FAILED` webhook | Enqueues `PAYMENT_FAILED` for billing owner. |
| MenuList billing | `subscription.pending` webhook | Enqueues `GRACE_PERIOD_STARTED`. |
| MenuList billing | Cancel route completes | Enqueues `SUBSCRIPTION_CANCELLED`. |
| MenuList credits | Credits hit zero | Enqueues `CREDITS_EXHAUSTED` once per configured dedupe window. |
| MenuList publish | Publish verification succeeds | Enqueues `MENU_PUBLISHED`. |
| MenuList publish | Publish verification fails | Enqueues `MENU_PUBLISH_FAILED` if owner action requires notice. |
| MenuList stale | Store stale detection fires | Enqueues `MENU_STALE` instead of writing orphan pending message log. |
| WhatsApp onboarding | Preview generated | Sends the WhatsApp preview link and records the messaging session/outbound-delivery state; it does not write an owner-notification delivery row. |
| WhatsApp onboarding | Publish completes | Sends the live-menu link through the messaging adapter and records messaging lifecycle state; it does not duplicate the event in the owner-notification ledger. |
| Answerlattice | Notification test route | Enqueues/sends `ANSWERLATTICE_NOTIFICATION_TEST` to support owner. |
| Answerlattice | Workflow integration event | Does not enter owner notification queue. |
| Ops dashboard | Non-platform user opens `/ops/owner-notifications` | Redirected or denied; API returns forbidden through platform role guard. |
| Ops dashboard | Platform refreshes failed MenuList events | Loads bounded event list and status counts with no realtime listener. |
| Ops dashboard | Platform selects one event | Loads delivery attempts and resolved recipient only for that event. |
| Ops dashboard | Retry failed event | Calls central processor and writes normal delivery/status audit. |
| Ops dashboard | Email button on failed event | Opens a modal with recipient, subject, and rendered body prefilled from the registered template. |
| Ops dashboard | WhatsApp Web button on failed event | Opens a modal with recipient and rendered body prefilled from the registered template; external WhatsApp Web opens only after operator review. |
| Ops dashboard | Manual email system send | Creates a new manual override event and sends only to the entered email. |
| Ops dashboard | Manual WhatsApp while channel disabled | Event is skipped by channel flags; platform can record manual handoff after external send. |
| Ops dashboard | Manual handoff record | Writes a delivery row with masked/hashed destination and manual audit fields. |
| Ops current authorization | Signed platform session after persisted role downgrade/revocation | GET and POST return `403` before owner-notification data, provider, or mutation work. |
| Ops malformed lifecycle | Persisted delete/disable/block marker is a string or malformed nested object | Current-platform authorization fails closed before owner-notification work. |
| Retry claim refusal | Missing, wrong-product, partial, skipped, processing, delivered, or exhausted event | API returns `404` or `409`; it never returns `ok: true`. |
| Persisted enum drift | Event/delivery role, status, or channel is unknown | Platform DTO labels the field `invalid`; it does not relabel corrupt data as a valid state. |
| Delivery detail order | More than 12 delivery attempts exist | Detail returns the newest 12 by `createdAt DESC`. |
| Manual action replay | Same bounded `actionId` is submitted twice | Manual send does not create/process a second queue event; manual handoff adds no second delivery or event-marker write. |
| Scope fallback failure | Canonical store miss succeeds and legacy fallback read fails | Cost reports the completed canonical read and detail exposes only the fixed resolution error code. |
| Ops limiter outage | Shared limiter provider unavailable | GET and POST return `503` with `Retry-After`; no Firestore business read, provider call, or recovery write runs. |
| Ops bounded counts | History grows beyond the recent scan cap | Refresh reads at most 90 event documents; displayed status counts describe that same product-scoped recent window. |
| Ops product filtering | Delivery query returns a row whose `productId` differs from the selected event | The billed row is excluded from the response. |
| Ops manual handoff concurrency | Source event is deleted or changes product before handoff commit | Transaction returns not found; neither delivery nor event marker commits and the event is not recreated. |
| Owner header truth | Owner opens the desktop dashboard | No hard-coded order activity or fake unread badge is rendered. |
| Consent revocation | Legacy consent boolean is true but status is revoked/denied/inactive/withdrawn | WhatsApp delivery is skipped. |
| Event size | Event metadata would push the event JSON above 128KB | Event creation and provider work are skipped with a bounded diagnostic. |
| Provider redirect | WhatsApp returns a redirect | The redirect is not followed. |
| Provider timeout | SMTP or WhatsApp does not respond | Provider work ends at the bounded timeout and the source business operation remains independent. |
| Provider message ID | SMTP/WhatsApp returns a long or control-character message ID | Only the bounded normalized ID is retained. |
| Publish failure replay | Publish verification fails repeatedly for one store on one UTC day | One deterministic owner-notification reference is used for the day. |

## Manual Verification Flow

1. Enable owner notification flags in a non-production environment.
2. Create a MenuList store with known timezone, date format, time format, currency code, and currency symbol.
3. Trigger a test email.
4. Verify the event and delivery logs.
5. Trigger each migrated MenuList lifecycle event in dry-run or controlled test mode.
6. Verify dedupe by triggering the same reference twice.
7. Verify WhatsApp skip behavior without consent.
8. Add WhatsApp consent/template config in test environment.
9. Verify one WhatsApp critical trigger.
10. Run Answerlattice notification test in Answerlattice scope.
11. Verify no workflow integration event is routed through owner notification logs.
12. Open `/ops/owner-notifications` as a platform user.
13. Refresh failed events and verify displayed read-cost counters.
14. Select one event and verify delivery attempts plus resolved contact load only in detail.
15. Retry one controlled failed event.
16. Click Email and verify the modal shows prefilled recipient, subject, and body.
17. Click WhatsApp Web and verify the modal shows prefilled recipient and message body before opening WhatsApp Web.
18. Record one manual handoff and verify the source event remains visible with `manualHandoffAt`.

## Automated Verification Targets

Source and behavior gates:

- `npm run verify:owner-notifications-boundary`
- `npm run test:owner-notification-delivery-boundaries`
- `npm run test:notification-delivery-claim:emulator`
- `npm run verify:messaging-onboarding-monitor-boundary`
- `npm run test:messaging-whatsapp-adapter`

The source gate validates:

- Registry shape
- Required metadata
- Trigger to template mapping
- Product boundary
- Formatter output from sample preferences
- Dedupe key generation
- WhatsApp consent skip policy
- Current migration map coverage
- Platform dashboard response parsing, request policy, bounded action bodies, and recovery-action guards
- Owner notification app-side and Functions WhatsApp response parsing caps
- Current persisted platform authorization on GET and POST, fail-closed read/action limiters, bounded product-scoped recent counts, exact scope-read accounting, and transactional manual handoff
- `npm run test:notification-ops-snapshot-boundary` behavior for recent-window ordering, filters, counts, and product isolation

Provider dry-run coverage remains manual because it depends on non-production SMTP, WhatsApp template/session setup, and platform-user access to `/ops/owner-notifications`.

## Typecheck Requirements

After implementation:

```bash
npx tsc --noEmit --incremental false
cd functions && npx tsc --noEmit
```

If Answerlattice Functions are touched:

```bash
cd functions-answerlattice && npx tsc --noEmit
```

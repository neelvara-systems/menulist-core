# Lifecycle Messaging — Spec

**Feature:** Lifecycle Messaging System  
**Author:** Cascade  
**Date:** Feb 20, 2026  
**Status:** Implementation Phase

---

## Executive Summary

MenuList needs a way to reach store owners outside the dashboard for critical operational events — payment confirmations, billing failures, welcome messages, and health checks. Without this, owners miss payments, forget credentials, and churn silently.

This is **not** a marketing system. It is operational infrastructure — like Stripe's transactional emails. Calm, system-grade, zero-hype.

---

## Goals

1. **Prevent silent churn** — owners know when payments fail before service interrupts
2. **Reinforce trust** — payment confirmations make the system feel reliable
3. **Reduce support load** — welcome email gives permanent link + edit link
4. **Enable billing flow** — renewal reminders reduce involuntary churn from expired cards

## Non-Goals

- ❌ Marketing campaigns or newsletters
- ❌ Analytics summaries or weekly reports
- ❌ Template editor UI for owners
- ❌ Broadcast/bulk messaging
- ❌ WhatsApp or Telegram (Phase 2)
- ❌ Engagement tracking or open rates

---

## Target Customers

All MenuList store owners — from onboarding through active billing lifecycle.

---

## Scope — Message Events (V1)

### Activation

| #   | Event                    | Trigger                 | Priority  |
| --- | ------------------------ | ----------------------- | --------- |
| 1   | **Welcome / Store Live** | First project published | Important |

### Billing Lifecycle

| #   | Event                    | Trigger                          | Priority  |
| --- | ------------------------ | -------------------------------- | --------- |
| 2   | **Payment Success**      | Razorpay `subscription.charged`  | Important |
| 3   | **Payment Failed**       | Razorpay `payment.failed`        | Critical  |
| 4   | **Renewal Reminder**     | 3 days before `renewsOn` date    | Important |
| 5   | **Grace Period Started** | Subscription status → `past_due` | Critical  |
| 6   | **Suspension Warning**   | 7 days past due                  | Critical  |

### Credit Packs

| #   | Event                       | Trigger                             | Priority  |
| --- | --------------------------- | ----------------------------------- | --------- |
| 7   | **Credit Purchase Success** | Top-up payment completed            | Important |
| 8   | **Credits Exhausted**       | `topUpCredits + monthlyCredits = 0` | Warning   |

---

## User Stories

1. **As a store owner**, I receive a welcome email when my menu goes live, with my permanent public link, so I don't need to remember the dashboard URL.

2. **As a store owner**, I receive email confirmation when my subscription payment succeeds, with next billing date, so I know everything is working.

3. **As a store owner**, I receive an email when my payment fails, with clear next steps, so I can fix it before service interrupts.

4. **As a store owner**, I receive a reminder 3 days before my renewal, so I can ensure my card has sufficient funds.

5. **As a store owner**, I receive an email when I purchase credits, confirming the amount added and my new balance.

---

## Requirements

### Functional

- Event-driven: messages triggered by system events only, never manual
- Idempotent: same event never sends duplicate message
- Single channel: email only (Phase 1)
- Feature-flagged: `ENABLE_LIFECYCLE_MESSAGING` defaults OFF
- Logged: every send attempt recorded in `messageLogs` collection

### Non-Functional

- Delivery within 30 seconds of triggering event
- Max 10 system messages per store per 24 hours (spam guard)
- Sender: `system@menulist.ai` (or configured domain)
- Infrastructure tone: calm, non-marketing, system-grade

### Tone Rules

- ✅ "Your menu is now live."
- ❌ "We're excited to have you!!!"
- ✅ "Payment received. Next billing: March 15."
- ❌ "🎉 Thanks for paying!"

---

## Phase 2 (After 50+ Paying Stores)

- WhatsApp adapter (India primary channel)
- SMTP bounce handling
- Owner notification preferences UI in Business Settings
- Channel health visibility in settings
- Billing email separate from primary email

---

_Last updated: Feb 20, 2026_

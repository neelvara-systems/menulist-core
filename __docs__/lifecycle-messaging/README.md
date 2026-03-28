# Lifecycle Messaging System

> Operational messaging infrastructure that delivers critical system messages to store owners at the right time, through the right channel.

**Status:** Implementation Phase  
**Feature Flag:** `ENABLE_LIFECYCLE_MESSAGING`  
**Last Updated:** Feb 20, 2026

---

## Quick Navigation

| Audience  | Document                                                  | Purpose                                                |
| --------- | --------------------------------------------------------- | ------------------------------------------------------ |
| CEO/PM    | [Spec](./lifecycle-messaging_spec.md)                     | Business requirements, scope, user stories             |
| Developer | [Impl](./lifecycle-messaging_impl.md)                     | Architecture, DB schema, API contracts, file inventory |
| Finance   | [Firebase](./lifecycle-messaging_firebase.md)             | Cost tracking per operation                            |
| Customer  | [Help Doc](./lifecycle-messaging_helpdoc.md)              | How notifications work for owners                      |
| Marketing | [Website](./lifecycle-messaging_website.md)               | Landing page content                                   |
| Sales     | [Marketing](./lifecycle-messaging_marketing.md)           | Internal pitch material                                |
| Mobile    | [Mobile Support](./lifecycle-messaging_mobile-support.md) | Mobile admission test                                  |

---

## One-Liner

System-triggered email notifications for billing events, welcome messages, and operational health — so owners never miss something important.

## Problem Solved

Without lifecycle messaging, owners forget login credentials, miss payment failures, get surprised by suspensions, and churn silently. The system has no way to reach them outside the dashboard.

## Solution

Event-driven messaging engine in Cloud Functions that sends email via nodemailer SMTP when critical events occur (payment success/failure, welcome, renewal reminders, credit purchases). No marketing, no campaigns, no dashboards — pure operational infrastructure. Uses any free SMTP server (Gmail, custom domain).

---

## Architecture Overview

```
System Events (Razorpay webhook, store publish, scheduler)
    ↓
Messaging Engine (CF) — idempotent, event-driven
    ↓
Channel Router (email only Phase 1, WA Phase 2)
    ↓
Provider Adapter (nodemailer SMTP — free)
    ↓
Message Log (Firestore: messageLogs collection)
```

## Key Files

| File                                          | Purpose                                           |
| --------------------------------------------- | ------------------------------------------------- |
| `functions/src/messaging/messagingEngine.ts`  | Core engine: event dispatch, idempotency, routing |
| `functions/src/messaging/providers/resend.ts` | nodemailer SMTP email adapter (free, any SMTP)    |
| `functions/src/messaging/templates.ts`        | All message templates (code-only, no UI editing)  |
| `functions/src/messaging/types.ts`            | Shared types                                      |
| `src/types/platform/store.ts`                 | `notificationSettings` on StoreDataType           |
| `src/lib/messaging/index.ts`                  | Frontend entry point for API routes               |
| `src/lib/messaging/templates.ts`              | Frontend-side email templates                     |
| `src/config/features.ts`                      | `ENABLE_LIFECYCLE_MESSAGING` flag                 |

## Feature Flag

```typescript
ENABLE_LIFECYCLE_MESSAGING: false; // Default OFF, zero cost when disabled
```

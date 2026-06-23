# SignalDesk Inbox - Feature Doc Set

**Status:** Initial feature doc set
**Created:** June 23, 2026
**Parent:** [MenuList SignalDesk](../README.md)
**Audience:** Internal growth operators and future implementers

## Purpose

SignalDesk Inbox is the private reply workspace for growth conversations.

It captures replies, operator notes, message events, and manual conversation updates, then classifies each reply into a small set of action states. Its job is to keep outreach controlled, stop unsafe follow-up quickly, and make interested replies visible to the MenuList team.

## Source Specs

- Spec 14: unified inbox
- Spec 15: reply classification
- Spec 16: objection handling
- Spec 17: handoff and operator state

## Document Map

| Document | Purpose |
| --- | --- |
| [Specification](./signaldesk-inbox_spec.md) | Business rules, state model, and acceptance criteria. |
| [Implementation](./signaldesk-inbox_impl.md) | Suggested modules, flows, and integration points. |
| [Firebase](./signaldesk-inbox_firebase.md) | Conversation collections, summaries, indexes, and cost rules. |
| [Compliance](./signaldesk-inbox_compliance.md) | Suppression, unsubscribe, DNC, privacy, and audit requirements. |
| [Mobile Support](./signaldesk-inbox_mobile-support.md) | Mobile read-only triage and blocked actions. |
| [Test Cases](./signaldesk-inbox_test-cases.md) | Inbox, classification, suppression, and cost tests. |

## Boundary

This feature does not send messages by itself. Sending remains owned by approved channel rails such as `signaldesk-email-rail`.

The inbox must immediately create or update suppression records for unsubscribe, do-not-contact, wrong-contact, complaint, and invalid-address replies.

## Build Gate

Do not implement automated follow-up until:

- suppression handling is implemented,
- audit events are present,
- manual override is available,
- reply classification has eval coverage,
- channel health can pause follow-up.

# SignalDesk Inbox - Specification

**Status:** Implemented contract
**Last reviewed:** July 21, 2026

## Objective

Provide one private, bounded view of SignalDesk conversations and a controlled way to record real replies without allowing an inbound signal to bypass lineage, suppression, incident, or revenue boundaries.

## Actors

| Actor | Current access |
| --- | --- |
| Founder admin | View and capture replies; all safety controls remain available. |
| Growth manager | View and capture replies through `target.review`. |
| Operator | View and capture replies through `target.review`. |
| Compliance reviewer | Read Inbox and audit/safety state; cannot capture replies under the current role contract. |
| Read-only analyst | Read projected conversation summaries only. |
| Provider webhook | May ingest only after provider-specific signature or secret verification and authority resolution. |

## Reply States

`interested`, `not_interested`, `dnc`, `wrong_contact`, `complaint`, `privacy_request`, `legal_request`, and `needs_review` are the implemented inbound classifications. Conversation lineage may also be `new`, `exported`, or `contacted` before a reply.

Classification precedence is safety first, then explicit negative intent, then positive intent, then `needs_review`. The manual capture path imports the same classifier used by signed webhooks.

## Requirements

| ID | Requirement |
| --- | --- |
| INB-001 | Manual capture requires `target.review`, a bounded message, an actor-scoped idempotency key, and the target's exact current non-`new` conversation. |
| INB-002 | Signed provider events resolve target authority from stored contact/delivery identity; a supplied target ID is not trusted alone. |
| INB-003 | Every accepted inbound event writes a normalized message and deterministic rules classification. Raw provider payloads are not stored. |
| INB-004 | Safety classifications synchronously write suppression; complaint/privacy/legal classifications also open an incident and activate the channel or global outbound pause. |
| INB-005 | A later non-safety reply cannot weaken an existing safety conversation state or enter the revenue lifecycle. |
| INB-006 | Inbox backlog changes only when a conversation crosses the actionable/non-actionable boundary. Counts never fall below zero. |
| INB-007 | Converted target status is never downgraded by a reply. |
| INB-008 | Out-of-order provider replies remain message evidence but cannot regress current conversation or queue state. |
| INB-009 | The Inbox list prioritizes up to 30 safety summaries, then up to 30 interested/review summaries, then up to 30 recent unique summaries. |
| INB-010 | Mobile may observe summaries but cannot capture replies or manual contacts. |

## Non-Goals

- No autonomous reply sending.
- No generic CRM or public support inbox.
- No full conversation-detail timeline in the current UI.
- No assignment/work-item collection.
- No classifier override or reopen-suppression control.
- No AI consent or legal decision making.

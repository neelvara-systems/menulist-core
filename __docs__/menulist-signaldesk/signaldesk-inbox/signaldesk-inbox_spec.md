# SignalDesk Inbox - Specification

**Status:** Initial planning spec
**Created:** June 23, 2026

## Objective

Provide one controlled internal inbox for SignalDesk replies and operator notes, with classification that moves conversations into safe next states.

## Goals

1. Show active conversations that need human attention.
2. Classify replies into simple growth-safe states.
3. Create suppression records immediately when a reply requires no further outreach.
4. Preserve all operator actions and classifier decisions for audit.
5. Keep list views cheap by reading summaries instead of full message histories.

## Non-Goals

- No autonomous reply sending.
- No cold WhatsApp or social automation.
- No generic CRM replacement.
- No public support inbox.
- No MenuList owner/customer messaging surface.

## Actors

| Actor | Access |
| --- | --- |
| Growth operator | Reviews inbox, classifies replies, assigns next action. |
| Growth admin | Overrides classification, closes conversations, manages suppression. |
| Compliance reviewer | Reviews complaint, DNC, unsubscribe, and wrong-contact cases. |
| System classifier | Suggests classification only; cannot send. |

## Reply Classifications

| Classification | Required action |
| --- | --- |
| `interested` | Create follow-up work item or route to outcome bridge. |
| `needs_human_review` | Hold all automation until operator review. |
| `pricing_question` | Attach approved pricing response draft only. |
| `objection` | Attach approved objection category and draft only. |
| `not_now` | Pause follow-up by configured period. |
| `unsubscribe` | Suppress immediately. |
| `do_not_contact` | Suppress immediately. |
| `wrong_contact` | Suppress contact and mark target contactability issue. |
| `complaint` | Suppress, flag incident, and notify admin. |
| `bounce_or_invalid` | Suppress address/channel identity. |

## Core Requirements

| ID | Requirement |
| --- | --- |
| INB-001 | Inbox list must read from `signaldeskConversationSummaries`, not full histories. |
| INB-002 | Every reply must link to target, channel identity, source, campaign/action, and route token when available. |
| INB-003 | Classifier output must include confidence, reason codes, model/version, and required operator state. |
| INB-004 | Suppression classifications must write suppression before any follow-up work item can be created. |
| INB-005 | Operators must be able to override the classifier with a reason. |
| INB-006 | Human-review conversations must block scheduled follow-up. |
| INB-007 | Complaint events must create an incident for the control room. |
| INB-008 | Full message bodies must be opened only from conversation detail. |

## Acceptance Criteria

- An interested reply appears in the inbox within the expected ingest window.
- An unsubscribe reply creates suppression and removes follow-up eligibility.
- A classifier mistake can be overridden and audited.
- Inbox list loads without scanning message documents.
- Complaint cases show in both inbox and control-room incident queues.

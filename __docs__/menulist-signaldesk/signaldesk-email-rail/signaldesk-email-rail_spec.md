# SignalDesk Email Rail - Specification

**Status:** Export rail plus owned sequencer queue implemented; provider send gated
**Created:** June 23, 2026

## Executive Summary

Email Rail sends or exports approved SignalDesk messages through the first controlled outbound channel.

The first implementation starts with export plus a self-owned low-volume email sequencer queue before relying on Smartlead or another external sequencer. Provider send still requires sender-domain readiness, unsubscribe, bounce/complaint handling, suppression, approval, audit, configured email env, and the explicit provider-send gate.

## Goals

| Goal | Success signal |
| --- | --- |
| Start with safer outbound | Email/export before WhatsApp or social automation. |
| Preserve compliance | Unsubscribe, physical address, sender identity, suppression. |
| Protect sender reputation | Caps, bounces, complaints, pause controls. |
| Preserve attribution | Every send/export links target/source/template/outcome. |

## In Scope

- export approved email drafts;
- sender identity record;
- sender-domain readiness checklist;
- unsubscribe and suppression link;
- bounce/complaint event ingestion later;
- send caps;
- email event summaries;
- audit trail.
- owned low-volume email sequence queue for approved drafts;
- owner-visible step state and send gate.

## Out Of Scope

- mass blasting;
- cold WhatsApp;
- SMS/call;
- Instagram/Messenger automation;
- automated campaign optimizer.
- mailbox warmup and rotation;
- high-volume cold email sequencing.

## Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| SDEMAIL-R001 | Send/export requires approved draft. | P0 |
| SDEMAIL-R002 | Send/export rechecks suppression. | P0 |
| SDEMAIL-R003 | Commercial email requires unsubscribe path. | P0 |
| SDEMAIL-R004 | Sender identity and physical address policy required. | P0 |
| SDEMAIL-R005 | Sender-domain readiness required before provider send. | P0 |
| SDEMAIL-R006 | Bounce/complaint handling required before scale. | P0 |
| SDEMAIL-R007 | Daily send caps required. | P0 |
| SDEMAIL-R008 | Owned sequence queue must reuse approval, suppression, source-policy, sender-domain, pause, and audit gates. | P0 |
| SDEMAIL-R009 | External sequencers such as Smartlead are optional fallback rails, not required for the first MenuList loop. | P1 |

## Acceptance Criteria

- Export cannot include suppressed contact.
- Send cannot run without approved draft.
- Send cannot run without unsubscribe.
- Send cannot run without sender-domain readiness.
- Every send/export creates audit and attribution refs.
- Owned sequencer cannot queue a step without a ready sender domain and approved draft.
- Owned sequencer send cannot run while provider send is disabled.

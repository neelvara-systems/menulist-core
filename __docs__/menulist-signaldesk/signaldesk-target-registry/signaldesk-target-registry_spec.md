# SignalDesk Target Registry - Specification

**Status:** Initial planning spec
**Created:** June 23, 2026

## Executive Summary

The Target Registry stores the internal acquisition objects SignalDesk needs before any AI scoring, draft, approval, send, inbox, or attribution flow.

The registry answers:

- Which business/location are we talking about?
- Where did the candidate come from?
- Which contacts or channel identities are known?
- Is this target eligible, held, suppressed, or rejected?
- What MenuList outcome happened later?

## Goals

| Goal | Success signal |
| --- | --- |
| Avoid flat lead rows | Target, source, contact, channel, conversation, and outcome are separate records. |
| Preserve source context | Every target has provenance before action. |
| Support dedupe | Duplicate businesses and contacts are merged or held. |
| Keep contact data controlled | List views mask PII and reveal is audited. |
| Feed future modules | AI, evidence, approval, inbox, and attribution can link to stable IDs. |

## In Scope

- target summaries and target details;
- manual target creation;
- CSV/manual import staging;
- source candidate link;
- contact identity;
- channel identity;
- target state machine;
- duplicate detection hooks;
- suppression status link;
- basic outcome references.

## Out Of Scope

- source-provider API runs;
- source-rights approval policy;
- AI scoring;
- message drafting;
- inbox UI;
- MenuList outcome ingestion details.

## Core Objects

| Object | Meaning |
| --- | --- |
| Target | Business/location candidate SignalDesk may review. |
| Source candidate | Record of where target facts came from. |
| Contact identity | Person or business contact point, masked by default. |
| Channel identity | Email, phone, WhatsApp, Instagram, Messenger, or website identity. |
| Conversation | Thread or operator notes linked to a target/channel. |
| Outcome | MenuList result such as upload, preview, approval, publish, activation, paid plan. |

## Target States

| State | Meaning |
| --- | --- |
| `new` | Imported or created, not reviewed. |
| `review` | Needs human or AI review. |
| `held` | Missing evidence, policy, or confidence. |
| `ready` | Eligible for evidence/draft work. |
| `drafted` | Draft exists. |
| `approved` | Human approved action. |
| `contacted` | Approved message/export happened. |
| `replied` | Reply or operator note exists. |
| `converted` | MenuList outcome exists. |
| `rejected` | Not fit or not allowed. |
| `suppressed` | Contact or target is blocked from outreach. |

## Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| SDR-R001 | Every target must have at least one source candidate reference. | P0 |
| SDR-R002 | Target list rows must use masked contact fields only. | P0 |
| SDR-R003 | Contact reveal requires role permission and audit. | P0 |
| SDR-R004 | Suppressed identities must mark target/contact as blocked. | P0 |
| SDR-R005 | Duplicate targets must merge or hold, not create parallel outreach. | P0 |
| SDR-R006 | Target state transitions must be auditable. | P0 |

## Acceptance Criteria

- A target cannot move to `ready` without source provenance.
- A target cannot move to `drafted` if suppressed.
- A contact value cannot be shown in a list row.
- Duplicate imports do not create duplicate outreach opportunities.
- Every target has a stable ID used by later modules.

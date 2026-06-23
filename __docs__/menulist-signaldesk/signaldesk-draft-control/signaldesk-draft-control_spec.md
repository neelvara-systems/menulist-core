# SignalDesk Draft Control - Specification

**Status:** Initial planning spec
**Created:** June 23, 2026

## Executive Summary

Draft Control turns approved evidence into safe message drafts.

It gives the growth team speed without letting AI invent claims, ignore policy, or send messages.

## Goals

| Goal | Success signal |
| --- | --- |
| Keep messages controlled | Drafts use approved templates and variables. |
| Use evidence safely | Drafts can only cite outbound-safe facts. |
| Avoid spam tone | Copy stays specific, plain, and non-accusatory. |
| Preserve human control | Every draft goes to approval queue before action. |
| Support channel differences | Email/export first; WhatsApp/Instagram later with stricter rules. |

## Template Types

| Type | First build |
| --- | --- |
| Founder/manual email | Yes |
| Partner intro | Yes |
| Follow-up email | Yes |
| Export-only script | Yes |
| WhatsApp assisted | Later |
| Instagram reply | Later |
| Meta paid follow-up | Later |

## Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| SDD-R001 | Templates must define approved variables. | P0 |
| SDD-R002 | Drafts must link evidence packet and template version. | P0 |
| SDD-R003 | Drafts must pass banned-claim scan. | P0 |
| SDD-R004 | Drafts must pass source-field eligibility check. | P0 |
| SDD-R005 | AI drafts must be editable before approval. | P0 |
| SDD-R006 | Drafts cannot be sent without approval module. | P0 |

## Banned Claim Categories

- platform partnership claims;
- ranking/sales/revenue guarantees;
- "we saw customers" claims without proof;
- "official" claims about target before owner approval;
- scraping disclosure or source misuse;
- invented pricing/discount/menu facts;
- fear-based claims.

## Acceptance Criteria

- Draft cannot be generated without evidence packet.
- Draft cannot include rejected facts.
- Draft cannot include unapproved variable.
- Draft cannot bypass human approval.

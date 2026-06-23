# SignalDesk Source Policy - Specification

**Status:** Initial planning spec
**Created:** June 23, 2026

## Executive Summary

Source Policy is the rule system that decides what SignalDesk can do with data from manual lists, MenuList-owned signals, referrals, paid intent, public websites, Google/Places-like data, Foursquare, Apify-like sources, or any future provider.

It must exist before imports, enrichment, AI evidence, drafts, or sends.

## Goals

| Goal | Success signal |
| --- | --- |
| Prevent source misuse | Source record says allowed fields, blocked fields, allowed use, and retention. |
| Keep outreach eligible | Target cannot move to outreach unless source policy allows it. |
| Control storage | Raw payloads expire or are blocked. |
| Support audit | Every target can explain where facts came from and what can be done with them. |
| Keep providers replaceable | Provider availability does not become architecture dependency. |

## Source Types

| Source | Default allowed use |
| --- | --- |
| Manual curated list | Candidate review after operator records source context. |
| MenuList first-party signal | Prioritization and attribution. |
| Referral | Candidate review with referral context. |
| Paid intent | Warm lead handling after explicit user action. |
| Public website | Manual evidence review. |
| Google Maps / Places-like | Temporary candidate discovery only after source-policy review. |
| Foursquare | Blocked for prospect outreach unless separate permission exists. |
| Apify/Outscraper-style | Blocked by default; allowed only through the Apify Source Broker after provider source policy, owner provider approval, env-controlled Actor review, and budget cap. |

## Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| SDP-R001 | Every source type must have policy before import. | P0 |
| SDP-R002 | Policy must include allowed fields and blocked fields. | P0 |
| SDP-R003 | Policy must include may-use-for-outreach boolean. | P0 |
| SDP-R004 | Policy must include retention class and raw-payload handling. | P0 |
| SDP-R005 | Policy must include source terms URL or internal approval note. | P0 |
| SDP-R006 | Source run must enforce per-run cap and budget. | P0 |
| SDP-R007 | Source policy changes must pause affected source runs until revalidated. | P0 |

## Allowed Use Values

| Value | Meaning |
| --- | --- |
| `candidate-discovery` | May identify a possible business target. |
| `enrichment` | May enrich an already known target. |
| `verification-only` | May verify a fact but not originate outreach. |
| `owned-signal` | MenuList-controlled signal may drive prioritization. |
| `blocked` | Source cannot be used. |

## Acceptance Criteria

- Source import cannot run without approved source policy.
- Target cannot use a field that source policy blocks.
- Outreach cannot use a source where `mayUseForOutreach` is false.
- Raw payload retention is enforced.
- Source-policy change is audited.

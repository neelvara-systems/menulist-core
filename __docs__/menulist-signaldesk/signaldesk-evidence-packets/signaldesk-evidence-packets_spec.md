# SignalDesk Evidence Packets - Specification

**Status:** Initial planning spec
**Created:** June 23, 2026

## Executive Summary

Evidence Packets explain why SignalDesk believes a target has a MenuList opportunity and what facts are safe to use.

They protect the team from vague AI scoring, unsupported claims, source misuse, and unsafe outreach.

## Goals

| Goal | Success signal |
| --- | --- |
| Preserve evidence | Every target action links to source-backed facts. |
| Record uncertainty | Rejected facts and low-confidence facts are explicit. |
| Control claims | Drafts can only use approved evidence. |
| Support audit | Every decision snapshot is reviewable. |
| Keep evidence fresh | Evidence has expiry/review state. |

## Evidence Packet Content

| Field | Meaning |
| --- | --- |
| Source facts | Facts allowed by source policy. |
| Rejected facts | Facts not trusted, blocked, stale, or unsupported. |
| Confidence | High, medium, or low. |
| Current-list gap | Menu/service/rate/list opportunity evidence. |
| Contactability | Allowed contact/channel evidence. |
| Source policy refs | Which policy governs the facts. |
| Expiry/review date | When evidence must be refreshed. |
| Decision refs | Decisions made from this evidence. |

## Decision Snapshot Types

| Type | Purpose |
| --- | --- |
| `score` | AI/human scoring result. |
| `hold` | Why target is held. |
| `reject` | Why target is rejected. |
| `draft` | Why draft is allowed. |
| `approve` | Why action is approved. |
| `send` | Final pre-send/export decision. |
| `route` | MenuList route decision. |
| `attribute` | Outcome attribution decision. |

## Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| SDE-R001 | Drafts cannot use facts outside approved evidence. | P0 |
| SDE-R002 | Every evidence packet must link source policy. | P0 |
| SDE-R003 | Low-confidence evidence cannot approve send/export. | P0 |
| SDE-R004 | Rejected facts must be visible to reviewers. | P0 |
| SDE-R005 | Evidence expiry blocks new sends until refreshed. | P0 |
| SDE-R006 | Decision snapshots must be immutable once written. | P0 |

## Acceptance Criteria

- A target cannot be drafted without evidence packet.
- Evidence packet cannot cite blocked source field.
- Decision snapshot shows actor/system, rule version, confidence, and evidence refs.
- Expired evidence blocks new outreach.

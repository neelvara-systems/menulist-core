# SignalDesk Approval Queue - Specification

**Status:** Initial planning spec
**Created:** June 23, 2026

## Executive Summary

The Approval Queue ensures SignalDesk remains a human-controlled growth system.

AI, imports, templates, and operators can propose actions. Approval Queue decides whether a human with the right role allowed the action.

## Approval Types

| Type | Purpose |
| --- | --- |
| Draft approval | Approve a specific message/export draft. |
| Source approval | Approve a source policy or run. |
| Channel approval | Approve channel readiness or exception. |
| Evidence approval | Approve evidence for outbound use. |
| Route approval | Approve tracked MenuList route creation when required. |
| Incident approval | Resolve or deactivate high-risk pause. |

## Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| SDA-R001 | Every approval item must have target/source/draft/evidence refs. | P0 |
| SDA-R002 | Approval action must be role-gated. | P0 |
| SDA-R003 | Approval must recheck suppression and kill switches. | P0 |
| SDA-R004 | Approval must write audit and decision snapshot. | P0 |
| SDA-R005 | Rejection must record reason. | P0 |
| SDA-R006 | Approval expires if evidence, policy, or suppression changes. | P0 |

## Approval States

| State | Meaning |
| --- | --- |
| `pending` | Needs review. |
| `needs-changes` | Reviewer requested edit. |
| `approved` | Approved for downstream action. |
| `rejected` | Not allowed. |
| `expired` | Evidence/policy/state changed. |
| `blocked` | Kill switch, suppression, or policy blocks it. |

## Acceptance Criteria

- No send/export can happen without approved item.
- Approval is invalidated by suppression change.
- Approval is invalidated by evidence expiry.
- Approval is audited.

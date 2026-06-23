# SignalDesk Foundation - Specification

**Status:** Initial planning spec
**Created:** June 23, 2026
**Audience:** Founder, growth team, implementers

## Executive Summary

SignalDesk Foundation creates the internal safety shell for MenuList SignalDesk.

Before SignalDesk can import targets, score opportunities, draft messages, route replies, or attribute outcomes, it needs a controlled internal boundary:

- only approved team members can access it;
- every sensitive action is auditable;
- contact reveal is controlled;
- outbound/channel actions can be paused quickly;
- mobile can pause but cannot operate the system;
- no public user can reach SignalDesk surfaces.

## Goals

| Goal | Success signal |
| --- | --- |
| Keep SignalDesk private | No public route, no owner/customer access, internal auth only. |
| Control operator power | Roles define who can view, reveal, approve, send/export, configure, and pause. |
| Preserve audit trail | Every mutation and sensitive read writes an audit event. |
| Prevent runaway outbound | Kill switches can pause global outbound, channel, source, campaign, AI worker, or export. |
| Keep mobile safe | Mobile allows emergency pause and summary view only. |

## Users And Roles

| Role | Allowed | Blocked |
| --- | --- | --- |
| Founder admin | Configure roles, policies, kill switches, budgets, source/channel approval. | None except raw secret reveal. |
| Growth manager | Review targets, approve cohorts, approve drafts if policy allows, view dashboards. | Provider secret config, global policy override. |
| Operator | Work queue, review evidence, create drafts, classify replies, request approvals. | Final policy approval, provider config, contact export unless allowed. |
| Compliance reviewer | Review source/channel/suppression/contact reveal issues. | Normal campaign execution unless also assigned. |
| Read-only analyst | View summaries and attribution. | PII reveal, sends, approvals, configuration. |
| System worker | Execute approved worker tasks. | Human approval, policy override, contact reveal. |

## Required Capabilities

| ID | Requirement | Priority |
| --- | --- | --- |
| SDF-R001 | Internal-only access gate. | P0 |
| SDF-R002 | Role matrix for every sensitive action. | P0 |
| SDF-R003 | Audit event on every mutation. | P0 |
| SDF-R004 | Audit event on raw contact reveal. | P0 |
| SDF-R005 | Kill switches by global, channel, campaign, source, AI worker, and export scope. | P0 |
| SDF-R006 | Stale policy/config warning. | P0 |
| SDF-R007 | Mobile emergency pause only. | P0 |
| SDF-R008 | No public indexing, public sitemap, or public route. | P0 |

## Kill Switch Scopes

| Scope | Effect |
| --- | --- |
| `global-outbound` | Blocks all send/export actions. |
| `email` | Blocks email send/export rail. |
| `whatsapp` | Blocks assisted/API WhatsApp action. |
| `instagram` | Blocks Instagram/Messenger actions. |
| `source-provider` | Blocks a source adapter or run. |
| `ai-worker` | Blocks one AI worker from running. |
| `campaign` | Blocks one campaign/sequence. |
| `menu-list-bridge` | Blocks route creation/outcome bridge actions if needed. |

## Out Of Scope

- target registry details;
- source import implementation;
- AI prompt details;
- email provider implementation;
- WhatsApp provider implementation;
- inbox UI;
- attribution reporting.

Those belong to later module doc sets.

## Acceptance Criteria

- Unapproved user cannot access SignalDesk.
- Operator cannot configure provider secrets.
- Read-only analyst cannot reveal contact details.
- Every contact reveal writes audit event.
- Every kill-switch change writes audit event.
- Active global outbound kill switch blocks sends/exports.
- Mobile can pause global outbound but cannot send or approve.

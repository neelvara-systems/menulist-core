# SignalDesk Foundation - Specification

**Status:** Runtime-backed specification
**Created:** June 23, 2026
**Last Updated:** July 21, 2026
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
| Preserve audit trail | Every committed governed mutation and raw contact reveal writes a durable audit event in the same settlement boundary. |
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
| System worker | Service identity only; not admitted through human team membership. | Sign-in, human approval, policy override, contact reveal. |

## Access Authority

SignalDesk membership is not standalone authority. Every protected page and API request must first resolve the signed-in user against current MenuList user truth. Deleted, blocked, deactivated, auth-disabled, email-mismatched, or session-revoked users fail closed before platform role or SignalDesk membership is considered.

Platform authority comes from the current user record, not the session's cached `platformRole`. Non-platform users must resolve to exactly one active, correctly shaped `signaldeskTeamMembers` row bound by user ID or canonical login email. Ambiguous rows fail closed.

## Required Capabilities

| ID | Requirement | Priority |
| --- | --- | --- |
| SDF-R001 | Internal-only access gate. | P0 |
| SDF-R002 | Role matrix for every sensitive action. | P0 |
| SDF-R003 | Coupled audit event on every committed governed mutation. | P0 |
| SDF-R004 | Audit event on raw contact reveal. | P0 |
| SDF-R005 | Kill switches by global, channel, campaign, source, AI worker, and export scope. | P0 |
| SDF-R006 | Stale policy/config warning. | P0 |
| SDF-R007 | Mobile emergency pause only. | P0 |
| SDF-R008 | No public indexing, public sitemap, or public route. | P0 |
| SDF-R009 | Founder admin can add, update, deactivate, and role-assign internal SignalDesk team members without a public signup path. | P0 |

## Kill Switch Scopes

| Scope | Effect |
| --- | --- |
| `global-outbound` | Blocks all send/export actions. |
| `email` | Blocks email send/export rail. |
| `whatsapp` | Blocks assisted/API WhatsApp action. |
| `instagram` | Blocks Instagram/Messenger actions. |
| `messenger` | Blocks Messenger actions independently when needed. |
| `source-provider` | Blocks a source adapter or run. |
| `ai-worker` | Blocks one AI worker from running. |
| `campaign` | Blocks one campaign/sequence. |
| `content-distribution` | Blocks content review, schedule, and distribution actions. |
| `trust-partner` | Blocks trust-partner and referral operations. |
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
- Founder admin can add a partner by login email, assign a role, and audit the membership change.
- A stale platform-role session cannot retain founder authority after the current user role changes.
- Blocking, deleting, deactivating, or revoking the current user removes SignalDesk access without waiting for the SignalDesk membership row to change.
- Human team mutation cannot create a `system-worker` membership.
- Concurrent or ambiguous member identities cannot create duplicate active authority.
- Self-deactivation is checked against the persisted member identity, not caller-submitted replacement identity.
- Audit history returns newest-first in stable 50-event pages and can load older pages without skipping events that share a timestamp.
- Audit rows retain classifications and entity identifiers, not raw target names, evidence, messages, recipients, or operator free text.
- Rejected authentication, authorization, validation, and malformed-cursor requests use bounded security/runtime diagnostics rather than attacker-amplifiable durable audit writes.

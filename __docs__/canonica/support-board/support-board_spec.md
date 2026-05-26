# Support Board Spec

## Goal

Give Canonica owners and support staff one private place to triage support work exposed by tickets, conversations, signals, and knowledge gaps.

## User Problem

Canonica already captures tickets, support signals, drift, mutation proposals, and weekly summaries. Small SaaS founders still need a daily operational surface that answers:

- What did support expose this week?
- What needs an answer?
- Who owns the follow-up?
- Which item should become approved support knowledge?

## Non-Goals

- Generic project management
- Public roadmap
- CRM timeline
- Full helpdesk replacement
- SLA-heavy enterprise workflow
- Auto-publishing AI answers

## User Roles

| Role | Access |
| --- | --- |
| Owner | Full board access through default owner permissions |
| Manager | Board access through `canManageSupport` |
| Support Staff | Board access through `canManageSupport` only |
| End user | No access |

## Board Columns

| Column | Meaning |
| --- | --- |
| New Signals | Fresh fallbacks, negative feedback, escalations, or open tickets |
| Needs Triage | Owner/staff decides whether this is missing docs, a bug, unclear answer, or customer-specific issue |
| Needs Answer | Requires a FAQ, canonical answer, article update, or ticket reply |
| Draft Ready | A draft/proposal exists, but owner approval is still required |
| Approved / Published | Support truth or reply is ready for users |
| Resolved | Support issue or support gap handled |

## MVP Requirements

- Create manual support cards.
- Sync recent unresolved tickets into cards with bounded reads.
- Sync recent actionable support signals into cards with bounded reads.
- Store internal notes on cards.
- Track status, priority, assignee, due date, tags, and related support object IDs.
- Create a governed mutation proposal from a card only when it has a related entity.
- Keep all cards private to owner/staff.

## Governance Rule

Creating an answer proposal from a board card does not publish an answer. It creates a pending mutation proposal. The existing Governance flow still generates, reviews, edits, approves, and publishes canonical answers.

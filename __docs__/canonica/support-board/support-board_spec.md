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
- Keep source sync from tickets/signals feature-flagged because those sources already have their own owner dashboards.
- Sync recent unresolved tickets into cards with bounded reads only when `ENABLE_CANONICA_SUPPORT_BOARD_SOURCE_SYNC` is enabled.
- Sync recent actionable support signals into cards with bounded reads only when `ENABLE_CANONICA_SUPPORT_BOARD_SOURCE_SYNC` is enabled.
- Prepare nightly deduped cards from repeated misses, negative feedback/escalation clusters, drifted answers, and release impact only when the Cloud Function rollout flag is enabled.
- Write a compact support board summary for owner UI and future digest use only when nightly Support Board sync is enabled.
- Store internal notes on cards.
- Track status, priority, assignee, due date, tags, and related support object IDs.
- Track top-level `status` for filtering plus capped `statuses[]` history for owner activity/audit context.
- Create a governed mutation proposal from a card only when it has a related entity.
- Keep all cards private to owner/staff.

## Governance Rule

Creating an answer proposal from a board card does not publish an answer. It creates a pending mutation proposal. The existing Governance flow still generates, reviews, edits, approves, and publishes canonical answers.

## Nightly Sync Guardrails

- Use the existing Canonica scheduler only.
- Do not create a standalone scheduled function.
- Keep nightly sync disabled by default until a tenant explicitly needs a consolidated review board.
- Do not create cards for every unresolved ticket.
- Do not reopen resolved cards.
- Dedupe by deterministic source keys.
- Cap card creation/update at 20 per tenant per run.
- Keep summary writes source-hash guarded so unchanged summaries are skipped.

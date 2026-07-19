# Support Board Spec

> **Last verified:** July 19, 2026

## Goal

Give Answerlattice owners and support staff one private place to triage support work exposed by tickets, conversations, signals, and knowledge gaps.

## User Problem

Answerlattice already captures tickets, support signals, drift, mutation proposals, and weekly summaries. Small SaaS founders still need a daily operational surface that answers:

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
- Sync recent unresolved tickets into cards with bounded reads only when `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SOURCE_SYNC` is enabled.
- Sync recent actionable support signals into cards with bounded reads only when `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SOURCE_SYNC` is enabled.
- Prepare nightly deduped cards from repeated misses, negative feedback/escalation clusters, drifted answers, and release impact only when the Cloud Function rollout flag is enabled.
- Maintain exact open, Needs Answer, high-priority, and total counts after count-relevant card changes without requiring nightly source preparation.
- Add bounded status, priority, source, surface, and last-sync detail only when nightly Support Board sync is enabled.
- Store internal notes on cards.
- Track status, priority, assignee, due date, tags, and related support object IDs.
- Track top-level `status` for filtering plus capped `statuses[]` history for owner activity/audit context.
- Create a governed mutation proposal from a card only when it has a related entity.
- Keep all cards private to owner/staff.
- Deduplicate non-manual source cards with deterministic tenant/workspace/source document identity, including concurrent and retrying syncs.
- Let authorized staff irreversibly remove copied source customer/contact/page/session fields while retaining the operational card and source ID.
- Reject direct writes that rewrite note/history entries, forge scheduler fields, alter source identity, link governance proposals without governance permission, or create an already-resolved card.

## Governance Rule

Creating an answer proposal from a board card does not publish an answer. It creates a pending mutation proposal. The existing Governance flow still generates, reviews, edits, approves, and publishes canonical answers.

## Nightly Sync Guardrails

- Use the existing Answerlattice scheduler only.
- Do not create a standalone scheduled function.
- Keep nightly sync disabled by default until a tenant explicitly needs a consolidated review board.
- Do not create cards for every unresolved ticket.
- Do not reopen resolved cards.
- Dedupe by deterministic source keys.
- Cap card creation/update at 20 per tenant per run.
- Keep summary writes source-hash guarded so unchanged summaries are skipped.
- Report when bounded source windows are saturated and when the optional breakdown was computed from an incomplete card window.

## Known Limits

- The board UI reads the newest 120 cards and does not yet provide cursor pagination.
- Explicit ticket sync reads the newest 50 tickets before filtering open items, so an older unresolved ticket can remain outside that action's window.
- Cards have no client delete path or TTL. Per-card copied source details can be redacted, but whole-workspace erasure is a separate retention requirement.
- Status history is operational context, not a substitute for the append-only governance audit log.

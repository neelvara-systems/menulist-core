# Repeated Reply Import — Product Specification

> **Status:** IMPLEMENTED  
> **Created:** 2026-06-06  
> **Feature Flag:** `ENABLE_ANSWERLATTICE_REPEATED_REPLY_IMPORT`

---

## Problem

Founder-led SaaS teams often answer the same question manually before they have a helpdesk, support team, or mature docs. That repeated reply is useful support truth, but it usually stays in email, chat, notes, or memory.

Answerlattice should let the founder turn that repeated reply into reviewable support knowledge without creating a queue-first helpdesk workflow.

---

## Goals

- Give owners a guided input path for one repeated question and one answer.
- Create focused FAQ and canonical proposal drafts through Knowledge Intake.
- Keep human approval mandatory.
- Keep canonical proposal entity linking mandatory.
- Make entity linking easier without loading the full ontology list on dashboard open.
- Avoid new collections, schedulers, connectors, and AI/provider calls.
- Keep Firebase operations bounded and owner-triggered.

---

## Non-Goals

- No email inbox monitoring.
- No SLA tracking.
- No agent assignment.
- No live chat.
- No native helpdesk connector.
- No automatic answer publishing.
- No role-routing changes in this feature.
- No product task creation in this feature.

---

## User Story

As a founder, I want to paste a question users keep asking and the answer I usually send, so Answerlattice can prepare a reviewed support answer that users can receive before they create another ticket.

---

## Acceptance Criteria

1. The Knowledge Intake screen exposes a dedicated repeated-reply form when the feature flag is enabled.
2. The form requires a repeated question and founder reply.
3. The submitted source uses type `repeated_reply`.
4. The submitted source includes optional tags, context keys, and entity IDs.
5. Server-side source creation rejects `repeated_reply` when the feature flag is disabled or the source does not contain one parseable question and reusable answer.
6. Draft generation creates at most two drafts for a repeated-reply source: FAQ and canonical proposal.
7. Repeated-reply draft generation does not create a KB article by default.
8. Canonical proposal acceptance/publishing still requires at least one entity ID.
9. Source text runs through the existing Knowledge Intake redaction path.
10. The repeated-reply entity field uses a bounded autocomplete and does not read entities until the owner searches.
11. Entity autocomplete returns tenant-scoped active or beta entities only.
12. No new Firestore collection, Storage path, Cloud Function, scheduler, or AI call is added.

---

## Review Behavior

The owner can:

- edit draft question and answer
- add tags
- add context keys
- add entity IDs through bounded search
- accept or reject each draft
- publish accepted drafts through the existing publish action

Publishing behavior:

- FAQ draft publishes to the existing FAQ path.
- Canonical proposal publishes to the existing mutation proposal path and remains pending Governance review.

---

## Mobile Behavior

The form must work in the current responsive Knowledge Intake dashboard layout. It does not create a separate mobile PWA shell route.

---

## Firebase Cost Requirement

This feature must use only the existing Knowledge Intake source and review item operations. The repeated-reply path must not introduce any background retry, realtime listener, native connector, or provider call.

The entity autocomplete path must also stay owner-triggered:

- no page-load entity query
- no realtime listener
- no full `answerlattice_entities` list fetch
- debounced client search
- server-side rate limit
- capped search-index match reads and capped entity-detail reads

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-06 | Added bounded entity autocomplete acceptance criteria and cost guardrails. |
| 2026-06-06 | Implemented guided repeated reply import and focused review draft contract. |

# Repeated Reply Import — Feature Documentation

> **Status:** IMPLEMENTED — Knowledge Intake repeated-reply source path  
> **Created:** 2026-06-06  
> **Audience:** Product, Engineering, Firebase/Ops, Website, Support  
> **Parent Flow:** Knowledge Intake Command Center  
> **Doctrine fit:** Converts repeated founder support replies into governed drafts without becoming a helpdesk.

---

## What Is This

Repeated Reply Import lets a founder paste one question they answer often and the reply they already send. Answerlattice stores it as a Knowledge Intake source, then prepares focused review drafts:

- FAQ draft
- canonical answer proposal

Nothing becomes authoritative until the owner reviews, accepts, and publishes it through existing Knowledge Intake and Governance paths.

This is the first item in the support expansion sequence documented at `__docs__/answerlattice/support-expansion-sequence.md`.

---

## Why First

This is the safest expansion after the SupportLayer comparison because it strengthens Answerlattice's existing governed answer loop:

- It uses founder-owned support truth already available today.
- It avoids native helpdesk/email connectors.
- It does not add SLA, queue, agent, or inbox behavior.
- It does not need AI/provider calls.
- It reuses Knowledge Intake source docs, review item docs, and mutation proposals.

---

## Runtime Contract

| Area | Contract |
| --- | --- |
| Owner surface | `/answerlattice/knowledge-intake` shows a dedicated repeated-reply form when Knowledge Intake and repeated reply import are enabled. |
| Source type | `repeated_reply` is an additive Knowledge Intake source type. |
| Input shape | One repeated user question and one founder reply, plus optional tags, context keys, and entity IDs. |
| Entity linking | The repeated-reply form uses a bounded entity autocomplete backed by the existing ontology search index. It performs no entity reads on page load. |
| Draft output | The repeated-reply source creates FAQ and canonical proposal drafts only. It does not create a full KB article by default. |
| Approval | Existing review item accept/reject/edit controls apply. |
| Canonical proposal guard | Existing entity requirement remains: a canonical proposal cannot be accepted/published until at least one related entity is linked. |
| Publishing | FAQ drafts publish to existing FAQ paths. Canonical drafts publish as existing mutation proposals for Governance review. |
| Data retention | Stored source text is redacted with the existing Knowledge Intake redaction path. |
| Feature flag | Controlled by `ENABLE_ANSWERLATTICE_REPEATED_REPLY_IMPORT` and requires `ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE`. |

---

## What This Is Not

- Not email inbox sync.
- Not a helpdesk.
- Not a reply-template library for agents.
- Not native Zendesk, Intercom, Freshdesk, Help Scout, Jira, Gmail, or Outlook integration.
- Not automatic canonical publishing.
- Not a new retrieval store.

---

## Document Index

| Document | Purpose |
| --- | --- |
| `repeated-reply-import_spec.md` | Product behavior and acceptance criteria. |
| `repeated-reply-import_impl.md` | Implementation plan and touched code. |
| `repeated-reply-import_firebase.md` | Firestore, Storage, Cloud Function, AI, rate-limit, and cost contract. |
| `repeated-reply-import_helpdoc.md` | Owner-facing help guidance. |
| `repeated-reply-import_website.md` | Public website/content impact. |
| `repeated-reply-import_marketing.md` | Positioning and copy boundaries. |
| `repeated-reply-import_mobile-support.md` | Mobile impact review. |
| `repeated-reply-import_test-cases.md` | Verification cases. |

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-06 | Added bounded entity autocomplete for the repeated-reply form using the existing ontology search index. |
| 2026-06-06 | Implemented repeated reply import as a Knowledge Intake source type with focused FAQ and canonical proposal drafts. |

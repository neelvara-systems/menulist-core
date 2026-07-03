# Answerlattice Data Inventory

**Status:** Internal audit plus implemented retention hardening for P0/P1-safe items
**Product scope:** Answerlattice only
**Created:** 2026-06-15
**Implementation updated:** 2026-06-15
**Deploy status:** Code validated; Firebase deploy pending because current credentials cannot access `answerlattice` or `answerlattice-qa`
**Source hierarchy:** Current codebase first, Answerlattice doctrine/docs second, historical plans only when clearly marked

## Purpose

This folder documents what Answerlattice stores, tracks, derives, and logs for Answerlattice workspaces, staff users, public/widget users, support contacts, integrations, and platform operations.

It covers governed answer data, product/workspace setup, widget and public API credentials, help content, support tickets and chat sessions, search history, AI/accounting records, Knowledge Intake, signals, scheduler outputs, integrations, notifications, Storage artifacts, billing records, and supporting summary documents.

This is not a privacy policy or legal data-processing agreement. It is a codebase-grounded engineering inventory for understanding where Answerlattice data lives, when it is written, how it is used, and why it exists.

## Documents

| Document | Purpose |
| --- | --- |
| [Answerlattice data map](./answerlattice-data-inventory_data-map.md) | Main inventory: storage targets, tracked fields, write timing, usage, retention, and production observations. |
| [Evidence appendix](./answerlattice-data-inventory_evidence.md) | Source references with exact code/doc lines for the main claims. |
| [Implementation plan](./answerlattice-data-inventory_implementation-plan.md) | Codebase-grounded P0/P1/P2 production plan for storage, retention, compaction, and summary-first usage. |

## High-level answer

Answerlattice stores data in six broad layers:

1. **Workspace and account truth** - `stores`, `subscriptions`, `payment_transactions`, workspace profile fields, scheduler settings, widget configuration, hosted-help configuration, public API credentials, staff/access state, support email, product URL, and product surfaces.
2. **Governed answer truth** - entities, entity relations, canonical answers, releases, mutation proposals, audit logs, search index rows, entity candidates, FAQs, product surfaces, and published KB/changelog content.
3. **Runtime support records** - public/widget/help-center search history, query embedding cache, chat sessions, support tickets, feedback, ticket status history, chat/ticket attachments, public API signals, and widget feedback.
4. **Ingestion and AI records** - Knowledge Intake jobs, sources, review items, usage ledger, AI operation accounting, article embeddings, media extraction metadata, and compiled context source-version records.
5. **Operational intelligence and summaries** - signal events, friction daily stats, friction snapshots, predictive triggers, support board cards, scheduler run logs, activation summaries, integration health, Knowledge Intake summaries, bundle manifests, cache versions, trust/coverage summaries, and tenant registry docs.
6. **External communications and integration records** - integration events, integration delivery logs, integration rate-limit counters, notification logs, owner notification events/deliveries/rate counters, and public contact enquiries.

## Named area summary

| Area | What it stores |
| --- | --- |
| Dedicated Firebase runtime | Separate Answerlattice client/admin apps, Firestore, Storage, Auth, Functions, rules, and indexes. Shared mode is only an explicit legacy/emulator override. |
| Governed Answer Infrastructure | Durable answer authority: entities, canonical answers, relations, releases, mutation proposals, audit logs, entity search index, entity candidates. |
| Help Center and widget search | `aiSearchHistory` rows for cache, feedback, canonical miss/friction analysis, and widget answer feedback; `queryEmbeddings` cache for retrieval embeddings. |
| Knowledge Intake | Intake jobs, full source text after redaction, source excerpts, review items, usage ledger, AI extraction/accounting, and published KB/FAQ/surface/proposal outputs. |
| Support operations | `supportTickets`, `chatSessions`, `feedback`, attachments in Answerlattice Storage, Support Board cards, signals, notifications, and dashboard summaries. |
| Product surface context | Product surfaces, FAQs, context summaries, cache versions, compiled context bundles, hosted help domain registry, and public/private bundle objects in Storage. |
| Scheduler and intelligence | Consolidated Answerlattice nightly scheduler, tenant leases/state docs in `platformSummary`, run logs, signal TTL cleanup, friction aggregation, predictive trigger sync, support board sync, and bundle repair. |
| Workflow integrations | Integration config in `platformSummary`, append-only integration events, delivery logs, rate-limit counters, and compact integration health docs. |
| Notifications | Generic email notification logs plus newer owner-notification events, deliveries, and rate counters for Answerlattice triggers. |
| Public buyer contact | Anonymous contact form submissions in `answerlattice_contactEnquiries`, including consent, contact details, message, user-agent/referrer, and hashed IP. |

## Most important audit observations

- Answerlattice already has a stronger product boundary than MenuList's older shared support surfaces: dedicated Firebase client/admin runtime, dedicated rules/index files, and separate Cloud Functions under `functions-answerlattice/`.
- The largest growth surface is `aiSearchHistory`. It is written on instant-cache hits, canonical hits, FAQ hits, no-result paths, and RAG answer generation. It now gets a 90-day `expiresAt`, bounded references/payload fields, and scheduler cleanup for legacy rows.
- `queryEmbeddings` now gets a 30-day `expiresAt`, Firestore TTL coverage, best-effort stale document deletion on cache read, and a fixed bounded diagnostic if stale cleanup fails.
- Knowledge Intake redacts common secrets before storing source text and does not retain raw media after extraction, but it does keep source text, excerpts, hashes, review items, usage ledger rows, and published outputs until an explicit compaction/retention policy is implemented.
- Signal events have an existing 12-month cleanup in the Answerlattice nightly scheduler. Friction daily stats have a 90-day cleanup. Integration events, delivery logs, and rate counters have `expiresAt` fields and Firestore TTL field overrides.
- Scheduler run logs, generic notification logs, owner notification events/deliveries/rate counters, and public contact enquiries now get explicit Answerlattice `expiresAt` fields.
- Chat session hard delete now deletes chat image Storage objects. Support ticket hard delete now deletes top-level ticket documents and message attachments after reading the persisted ticket.
- Compiled context bundles already reduce public/runtime reads. The existing nightly scheduler now removes old public/private bundle versions, keeping active plus the previous two ready versions.
- Firestore TTL field overrides now cover integration rows plus scheduler logs, notification logs, owner-notification rows, query embeddings, public contact enquiries, and `aiSearchHistory`.

## Implemented controls on 2026-06-15

| Area | Implemented control |
| --- | --- |
| Product retention helpers | Added app-side and functions-side Answerlattice retention helpers with fixed platform windows. |
| Search history | Added 90-day `expiresAt`, payload/reference caps, omitted vector-like fields, and legacy scheduler cleanup by `createdOn`. |
| Query embeddings | Added 30-day `expiresAt`, stale-read deletion, TTL override, and scheduler cleanup by `createdAt`. |
| Knowledge Intake counters | Review-item edits now update parent job status counters transactionally instead of rereading all sources and review items after each item edit. |
| Master scheduler state | Task outcomes now store fixed failure codes plus bounded source-error metadata instead of raw exception text. |
| Scheduler run logs | Added 90-day `expiresAt`, retention cleanup counts, fixed scheduler failure codes, and bounded diagnostic metadata to nightly run totals. |
| Retention diagnostics | Retention cleanup task failures now use fixed failure codes and bounded source-error metadata instead of raw exception text. |
| Notifications | Added 90-day expiry to generic notification logs, owner-notification events, and deliveries; added 2-day expiry to owner notification rate counters. |
| Contact enquiries | Added 365-day expiry to public Answerlattice contact submissions. |
| Attachments | Hard delete now cleans chat image URLs and support ticket message attachments, not only ticket top-level documents. |
| Context bundles | Existing nightly scheduler now deletes old versioned Storage objects for public/private context bundles. |
| TTL/index policy | Added TTL field overrides only for non-query `expiresAt` fields; cleanup queries use existing timestamp fields instead. |

## Maintenance rule

Update this inventory whenever a change introduces or changes:

- an Answerlattice Firestore collection, subcollection, `platformSummary` document, Storage path, or hosted/public bundle artifact;
- widget/public API credentials, search history fields, support/chat/ticket/feedback fields, Knowledge Intake payloads, AI operation payloads, integration events, notification records, or contact submissions;
- retention, TTL, cleanup, compaction, or index field override behavior;
- public/widget/help-center data collection behavior;
- Firebase rules, indexes, Storage rules, or Answerlattice Cloud Function logic that affects data storage or cleanup.

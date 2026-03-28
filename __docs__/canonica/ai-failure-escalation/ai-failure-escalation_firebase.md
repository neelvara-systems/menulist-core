# AI Failure Escalation — Firebase Cost & Operations

> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-03-09
> **Audience:** Developers
> **Firestore Project:** Canonica (separate from ecomsai)

---

## §1 — Collections Used

### Existing Collections (No New Collections)

| Collection | Operation | Purpose |
|-----------|-----------|---------|
| `supportTickets` | Write (1 per escalation) | Create escalation ticket with `escalationContext` |
| `canonica_signalEvents` | Write (1 per escalation) | Emit ESCALATION signal for mutation engine |
| `canonica_auditLogs` | Write (0 — audit is via signal) | No direct audit write needed |
| `aiSearchHistory` | Read (existing) | Already logged by coreSearch() |

**Zero new Firestore collections.** Escalation enriches existing ticket documents.

---

## §2 — Firestore Operations Per Escalation

### Ticket Creation Path

| Step | Operation | Collection | Cost |
|------|-----------|-----------|------|
| 1 | Write ticket | `supportTickets` | 1 write |
| 2 | Upload attachments (if any) | Storage | 0-N writes |
| 3 | Emit ESCALATION signal | `canonica_signalEvents` | 1 write |
| 4 | Send notification (fire-and-forget) | `notifications` | 1 write |

**Total per escalation: 3 writes** (ticket + signal + notification)

### Escalation Evaluation Path (inside coreSearch)

| Step | Operation | Collection | Cost |
|------|-----------|-----------|------|
| 1 | Canonical retrieval (existing) | `canonica_entitySearchIndex` + `canonica_canonicalAnswers` | 2-4 reads (already happening) |
| 2 | RAG vector search (existing) | `kbArticles` | 1 read (already happening) |
| 3 | Escalation evaluation | In-memory (pure function) | 0 reads/writes |
| 4 | Build escalation context | In-memory (from existing data) | 0 reads/writes |

**Total additional cost for evaluation: 0 reads, 0 writes.**
Escalation evaluator uses data already fetched by the existing pipeline.

---

## §3 — Cost Model

### Assumptions

| Parameter | Value | Source |
|-----------|-------|--------|
| Daily conversations per tenant | 50-200 | Canonica ICP (SaaS founders) |
| Escalation rate | 3-5% | Industry standard for AI support |
| Escalations per tenant per day | 2-10 | 50-200 × 3-5% |
| Active tenants | 10-1000 | Growth projection |

### Cost at 10 Tenants

| Operation | Daily Count | Unit Cost | Daily Cost |
|-----------|------------|-----------|-----------|
| Ticket writes | 30-50 | $0.18/100K | ~$0.00009 |
| Signal writes | 30-50 | $0.18/100K | ~$0.00009 |
| Notification writes | 30-50 | $0.18/100K | ~$0.00009 |

**Monthly cost at 10 tenants: ~$0.01**

### Cost at 1,000 Tenants

| Operation | Daily Count | Unit Cost | Daily Cost |
|-----------|------------|-----------|-----------|
| Ticket writes | 3,000-5,000 | $0.18/100K | ~$0.009 |
| Signal writes | 3,000-5,000 | $0.18/100K | ~$0.009 |
| Notification writes | 3,000-5,000 | $0.18/100K | ~$0.009 |

**Monthly cost at 1,000 tenants: ~$0.81**

### Cost Summary

| Scale | Monthly Cost | Assessment |
|-------|-------------|-----------|
| 10 tenants | ~$0.01 | Negligible |
| 100 tenants | ~$0.08 | Negligible |
| 1,000 tenants | ~$0.81 | Very low |

---

## §4 — Document Size Analysis

### Escalation Context on Ticket Document

| Field | Typical Size | Max Size |
|-------|-------------|----------|
| `triggerTypes` | 30 bytes | 100 bytes |
| `query` | 50 bytes | 500 bytes |
| `conversationId` | 25 bytes | 25 bytes |
| `productContext` | 100 bytes | 300 bytes |
| `retrievalDebug.canonicalResult` | 120 bytes | 300 bytes |
| `retrievalDebug.ragResults` (top-5) | 300 bytes | 500 bytes |
| `retrievalDebug.effectiveQuery` | 50 bytes | 500 bytes |
| `entityDebug.queryTokens` | 60 bytes | 200 bytes |
| `entityDebug.candidates` (top-3) | 150 bytes | 300 bytes |
| `entityDebug.resolvedEntityId` | 25 bytes | 25 bytes |
| `entityDebug.confidence` | 8 bytes | 8 bytes |
| `escalatedAt` | 25 bytes | 25 bytes |

**Typical total: ~940 bytes**
**Maximum total: ~2,800 bytes**

Firestore document limit: 1 MB. Escalation context adds < 0.3% to document size.

---

## §5 — Indexes Required

**No new composite indexes required.**

Existing indexes on `supportTickets` (by `tId`, `sId`, `createdOn`) are sufficient.

If future query patterns require filtering by `source: 'ai_escalation'`:

```
supportTickets: source ASC, tId ASC, sId ASC, createdOn DESC
```

This can be added later if needed. Not required for v1.

---

## §6 — Data Lifecycle

| Data | Retention | Cleanup |
|------|-----------|---------|
| Escalation context on ticket | Matches ticket lifecycle | Deleted with ticket |
| ESCALATION signal events | 12 months | Nightly batch (existing TTL archiver) |
| Escalation tickets | Permanent (until resolved/deleted) | Manual by founder |

No additional cleanup jobs needed. Existing nightly signal archiver handles signal TTL.

---

## §7 — DAL Functions

### Existing Functions Used

| Function | File | Purpose |
|----------|------|---------|
| `addTicket()` | `src/database/tickets/index.ts` | Creates ticket (modified to accept escalationContext) |
| `emitCanonicaSignal()` | `src/lib/canonica/signalEmitter.ts` | Emits ESCALATION signal |

### New Functions

None. All operations use existing DAL functions with additive fields.

---

## §8 — Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Escalation context exposes internal debug info | Only visible to tenant's own founder. Same ticket ACL. |
| RAG doc IDs in retrieval debug | IDs only, no content. Not exploitable. |
| Entity IDs in entity debug | Internal ontology IDs. Not sensitive. |
| Rate limiting escalation creation | Max 10 escalations/tenant/day (in-memory cap) |
| Escalation context size | Capped at top-5 RAG docs, top-3 entity candidates |

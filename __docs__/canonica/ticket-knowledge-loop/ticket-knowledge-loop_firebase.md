# Ticket → Knowledge Loop — Firebase Cost & Operations

> **Version:** 1.1.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-05-22
> **Audience:** Developers
> **Feature Flag:** `ENABLE_CANONICA_TICKET_KNOWLEDGE`

---

## §1 — Collections Used (All Existing)

| Collection | Firestore Project | Access | Purpose |
|------------|------------------|--------|---------|
| `canonica_signalEvents` | Canonica | Read + Write | Enriched ticket resolution signals |
| `canonica_mutationProposals` | Canonica | Read + Write | Proposals with `draftSource: 'ticket_resolution'` |
| `canonica_canonicalAnswers` | Canonica | Read | Deduplication check |
| `canonica_auditLogs` | Canonica | Write | Provenance tracking |
| `supportTickets` | Canonica Firebase in separate mode | Source UI data only; nightly uses copied signal metadata | Resolution messages are captured at signal emission time so nightly does not re-read ticket documents |

**New collections: ZERO**

---

## §2 — Operations Per Nightly Run (Per Tenant)

### Step 14: Ticket Resolution Knowledge Extraction

| Operation | Type | Count (est.) | Description |
|-----------|------|-------------|-------------|
| Signal events query | Read | 1 | Query `canonica_signalEvents` where type='ticket', last 14 days |
| Signal event docs | Read | ~50 | Read ticket signal documents for entity clustering |
| Canonical answer dedup | Read | ~5 | Check existing active answers per entity cluster |
| Pending proposal dedup | Read | ~5 | Check existing pending proposals per entity cluster |
| Proposal create | Write | 0-5 | New mutation proposals (capped at 5/run) |
| Proposal merge update | Write | 0-5 | Increment sourceTicketCount on existing proposals |
| Audit log writes | Write | 0-5 | One per extraction attempt |
| **Total per tenant** | | **~66-76** | |

### Enhanced Signal Emission (Frontend, Per Ticket Resolution)

| Operation | Type | Count | Description |
|-----------|------|-------|-------------|
| Signal event write | Write | 1 | One enriched signal per ticket resolution |

---

## §3 — Cost Per Tenant Per Month

### Firestore Operations

| Metric | Volume | Cost |
|--------|--------|------|
| Nightly reads | ~66 × 30 = ~1,980 | $0.0012 |
| Nightly writes | ~15 × 30 = ~450 | $0.0008 |
| Signal emission writes | ~20/month (est.) | $0.00004 |
| **Monthly Firestore total** | | **~$0.002** |

### LLM Costs (Gemini 2.5 Flash)

| Operation | Frequency | Input Tokens | Output Tokens | Cost |
|-----------|-----------|-------------|--------------|------|
| Resolution extraction | Max 5/night = 150/month | ~300K | ~75K | ~$0.045 |
| Draft generation | Max 5/night = 150/month | ~450K | ~150K | ~$0.075 |
| **Monthly LLM total** | | | | **~$0.12** |

### Total Monthly Cost Per Tenant

Assumption for INR estimates: ₹85/USD placeholder.

| Component | Cost |
|-----------|------|
| Firestore | ~₹0.20 |
| LLM (Gemini Flash) | ~₹10 |
| **Total** | **~₹10/tenant/month** |

### Scale Projection

| Tenants | Monthly Cost |
|---------|-------------|
| 10 | ~₹100 |
| 100 | ~₹1,000 |
| 1,000 | ~₹10,000 |

---

## §4 — Existing Indexes (No New Indexes Required)

The following existing indexes support this feature:

1. `canonica_signalEvents`: `tId ASC, sId ASC, type ASC, timestamp DESC` — query ticket signals by entity
2. `canonica_mutationProposals`: `tId ASC, sId ASC, relatedEntityIds ARRAY, status ASC` — dedup check
3. `canonica_canonicalAnswers`: `tId ASC, sId ASC, scope.entityIds ARRAY, status ASC` — dedup check

No new composite indexes required.

---

## §5 — Cost Guardrails

| Guardrail | Value | Purpose |
|-----------|-------|---------|
| Max drafts per nightly run | 5 | Cap LLM cost per tenant per night |
| Max ticket clusters analyzed | 50 | Cap Firestore reads per nightly run |
| Min tickets per cluster | 3 | Prevent single-ticket extraction (reduces LLM calls) |
| Batch processing (nightly) | 1/day | No real-time processing spikes |
| Feature flag default | ON | Work still remains bounded by tenant summary discovery, resolved-ticket threshold, and draft caps |

---

## §6 — DAL Functions (Existing + Enhanced)

### Frontend DAL (No New Functions)

All frontend operations use existing DAL:
- `emitCanonicaSignal()` — enhanced metadata (signalEmitter.ts)
- `approveDraftAsCanonicalAnswer()` — unchanged (mutationProposals.ts)

### Cloud Function Operations (Server-Side)

New CF file `resolutionExtractor.ts` uses firebase-admin directly:
- `db.collection().where().get()` — standard Firestore queries
- `db.collection().add()` — proposal creation
- `db.collection().doc().update()` — proposal merge

---

## §7 — Data Lifecycle

| Data | TTL | Cleanup |
|------|-----|---------|
| Ticket resolution signals | 12 months | Existing signal TTL archive (Step 8) |
| Mutation proposals (pending) | 30 days | Existing candidate lifecycle |
| Mutation proposals (approved) | Permanent | Becomes canonical answer |
| Mutation proposals (rejected) | 90 days | Existing archive cleanup |
| Audit logs | Permanent | Append-only (no cleanup) |

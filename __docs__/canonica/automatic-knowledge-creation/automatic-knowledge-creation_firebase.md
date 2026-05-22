# Automatic Knowledge Creation — Firebase Operations

> **Status:** DOCUMENTED — Ready for Implementation
> **Version:** 1.0.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-03-09
> **Audience:** Developers

---

## §1 — Collections Used

### NO new collections. Uses existing Canonica collections only.

| Collection | Purpose | Read/Write |
|------------|---------|------------|
| `canonica_mutation_proposals` | Store draft content on `suggestedChange` field | R+W |
| `canonica_signal_events` | Read signal examples for draft context | R |
| `canonica_entities` | Read entity name + description for prompt | R |
| `canonica_canonical_answers` | Read existing answers for context grounding | R |
| `canonica_entity_search_index` | Create search index for approved answers | W |
| `canonica_audit_logs` | Log draft generation + approval events | W |
| `kb_articles` | Read KB articles for prompt grounding (optional) | R |

---

## §2 — Firestore Operations Per Draft Generation

### §2.1 — Draft Generation (Nightly CF — per proposal)

| Operation | Collection | Type | Count | Purpose |
|-----------|-----------|------|-------|---------|
| Read entity doc | `canonica_entities` | R | 1 | Entity name + description for prompt |
| Read signal examples | `canonica_signal_events` | R | 1 query | Sample signal texts (already loaded by clustering step) |
| Read existing answers | `canonica_canonical_answers` | R | 1 query | Context grounding (what docs already exist) |
| Read KB articles | `kb_articles` | R | 1 query (optional) | Additional grounding context |
| Update proposal | `canonica_mutation_proposals` | W | 1 | Store draft on suggestedChange |
| Write audit log | `canonica_audit_logs` | W | 1 | Log draft generation event |

**Total per draft: 4-5 reads + 2 writes**

### §2.2 — Draft Approval (Client-side — per approval)

| Operation | Collection | Type | Count | Purpose |
|-----------|-----------|------|-------|---------|
| Read proposal | `canonica_mutation_proposals` | R | 1 | Fetch draft content |
| Create canonical answer | `canonica_canonical_answers` | W | 1 | New answer from draft |
| Create search index | `canonica_entity_search_index` | W | 1 | Index for retrieval |
| Update proposal status | `canonica_mutation_proposals` | W | 1 | Mark as implemented |
| Write audit log | `canonica_audit_logs` | W | 1 | Log approval event |

**Total per approval: 1 read + 4 writes**

### §2.3 — Draft Regeneration (Client-side — manual trigger)

| Operation | Collection | Type | Count | Purpose |
|-----------|-----------|------|-------|---------|
| Read proposal | `canonica_mutation_proposals` | R | 1 | Fetch entity + signal context |
| Read entity | `canonica_entities` | R | 1 | Entity context |
| Read recent entity signals | `canonica_signal_events` | R | 1 bounded query | Draft evidence examples |
| Read existing answers | `canonica_canonical_answers` | R | 1 query | Grounding |
| Update proposal | `canonica_mutation_proposals` | W | 1 | Store new draft |
| Write audit log | `canonica_audit_logs` | W | 1 | Record explicit regeneration |

**Total per regeneration: 4 reads/queries + 2 writes**

---

## §3 — Cost Model

### §3.1 — Firestore Cost

| Scale | Proposals/Month | Draft Reads | Draft Writes | Approval Reads | Approval Writes | Monthly Cost |
|-------|----------------|-------------|--------------|----------------|-----------------|--------------|
| Small (1 tenant) | 5 | 25 | 10 | 5 | 20 | ~$0.00 |
| Medium (10 tenants) | 50 | 250 | 100 | 25 | 100 | ~$0.01 |
| Large (100 tenants) | 500 | 2,500 | 1,000 | 125 | 500 | ~$0.05 |

**Firestore cost: Negligible at any realistic scale.**

### §3.2 — Gemini Cost

| Scale | Drafts/Month | Input Tokens | Output Tokens | Cost/Draft | Monthly Cost |
|-------|-------------|--------------|---------------|-----------|--------------|
| Small | 5 | ~200 | ~800 | ~$0.001 | $0.005 |
| Medium | 50 | ~200 | ~800 | ~$0.001 | $0.05 |
| Large | 500 | ~200 | ~800 | ~$0.001 | $0.50 |

**Gemini cost: <$1/month even at 100-tenant scale.**

### §3.3 — Total Monthly Cost

| Scale | Firestore | Gemini | Total |
|-------|-----------|--------|-------|
| Small | $0.00 | $0.005 | **$0.005** |
| Medium | $0.01 | $0.05 | **$0.06** |
| Large | $0.05 | $0.50 | **$0.55** |

---

## §4 — Indexes Required

### No new indexes needed.

All queries use existing indexes:
- `canonica_mutation_proposals`: `tId` + `sId` + `status` (existing)
- `canonica_signal_events`: `tId` + `sId` + `timestamp` (existing)
- `canonica_entities`: `tId` + `sId` (existing)
- `canonica_canonical_answers`: `tId` + `sId` + `scope.entityIds` + `status` (existing)

---

## §5 — Data Retention

- **Draft content on proposals:** Permanent (follows proposal lifecycle)
- **Approved drafts → canonical answers:** Permanent (governed knowledge)
- **Signal events used for context:** 12-month TTL (existing `archiveExpiredSignals`)
- **Audit logs:** Permanent (append-only, existing policy)

---

## §6 — Security Rules

No changes to Firestore rules required. All operations use existing:
- CF: `firebase-admin` (server-side, bypasses rules)
- Client: `canonicaFirebaseClient` (Canonica Firestore project)
- Governance UI: Authenticated admin access only

---

## §7 — DAL Functions (New + Modified)

### §7.1 — New Function: `approveDraftAsCanonicalAnswer()`

**File:** `src/database/canonica/mutationProposals.ts`

```typescript
/**
 * Approve a draft proposal and create a canonical answer from it.
 * One-click: reads draft → creates answer → creates search index → marks implemented.
 */
export const approveDraftAsCanonicalAnswer = async (
    proposalId: string,
    editedContent: Partial<CanonicaCanonicalAnswer['content']>,
    tId: number,
    sId: number,
    approvedBy: string
): Promise<CanonicaCanonicalAnswer | null>
```

**Operations:** 1R + 4W (see §2.2)

### §7.2 — Modified: Nightly CF `runSignalMutation()` and `detectRecurringFallbacks()`

After creating proposals, these functions now also call `generateDraftForProposal()` if:
- `ENABLE_CANONICA_AUTO_KNOWLEDGE` is true
- Proposal mutationType is `new_answer_required`
- Draft count < 10 per nightly run (cost cap)

**Additional operations per draft:** 4-5R + 2W (see §2.1)

---

## §8 — Cross-References

| Document | Relevance |
|----------|-----------|
| `__docs__/canonica/canonica-forensic-audit-2026-03-07.md` | System inventory for all Canonica collections |
| `__docs__/canonica/doctrine/05-architecture-evolution.md` | Architecture freeze rules |
| `__docs__/canonica/doctrine/01-core-doctrine.md` | "Signals propose mutations. Humans approve." |
| `__docs__/canonica/canonica-expansion-tracker.md` | Expansion Item #4 tracking |

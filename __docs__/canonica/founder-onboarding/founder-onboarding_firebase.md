# Canonica — Founder Onboarding (Knowledge Bootstrap Engine) — Firebase

> **Version:** 1.0.0
> **Last Updated:** 2026-03-09
> **Audience:** DevOps / Cost Management
> **Feature Flag:** `ENABLE_CANONICA_FOUNDER_ONBOARDING`

---

## 1. Collections Used (No New Collections)

| Collection | Firebase Project | Read/Write | Purpose |
|-----------|-----------------|------------|---------|
| `kb_articles` | canonica | R | Read published articles for extraction |
| `kb_generation_jobs` | canonica | R+W | Read job status, write bootstrap progress |
| `canonica_entityCandidates` | canonica | R+W | Write extracted candidates, read for promote check |
| `canonica_entities` | canonica | R+W | Read existing entities (dedup), write promoted entities |
| `canonica_entitySearchIndex` | canonica | W | Write search index for promoted entities |
| `canonica_mutationProposals` | canonica | R+W | Read existing proposals (dedup), write draft proposals |
| `canonica_canonicalAnswers` | canonica | R | Read existing answers (context for draft gen) |
| `canonica_auditLogs` | canonica | W | Write audit entries for all auto-actions |

---

## 2. Per-Tenant Bootstrap Cost (One-Time)

### Scenario: 100 KB articles → ~30 entities → ~20 drafts

| Operation | Type | Count | Unit Cost | Total |
|-----------|------|-------|-----------|-------|
| Read published articles | Read | 100 | $0.00006 | $0.006 |
| Read existing entities (dedup) | Read | 1 query | $0.00006 | $0.00006 |
| Read existing candidates | Read | 1 query | $0.00006 | $0.00006 |
| Read existing proposals (dedup) | Read | 20 queries | $0.00006 | $0.0012 |
| Read existing answers (context) | Read | 20 queries | $0.00006 | $0.0012 |
| Read KB job doc | Read | 1 | $0.00006 | $0.00006 |
| Write entity candidates | Write | 30 | $0.00018 | $0.0054 |
| Write promoted entities | Write | 20 | $0.00018 | $0.0036 |
| Write search index entries | Write | 20 | $0.00018 | $0.0036 |
| Write mutation proposals | Write | 20 | $0.00018 | $0.0036 |
| Write audit logs | Write | 40 | $0.00018 | $0.0072 |
| Update candidate status | Write | 20 | $0.00018 | $0.0036 |
| Update KB job progress | Write | 5 | $0.00018 | $0.0009 |
| **Firestore subtotal** | | | | **~$0.04** |

### Gemini AI Costs

| Operation | Calls | Tokens (est.) | Cost |
|-----------|-------|---------------|------|
| Entity extraction (5 articles/call) | 20 | ~40K input, ~2K output | ~$0.02 |
| Draft answer generation (1/entity) | 20 | ~20K input, ~4K output | ~$0.02 |
| **Gemini subtotal** | | | **~$0.04** |

### Total Per-Tenant Bootstrap

| Component | Cost |
|-----------|------|
| Firestore reads/writes | ~$0.04 |
| Gemini AI calls | ~$0.04 |
| **Total** | **~$0.08** |

---

## 3. Scale Projections

| Tenants | Total Bootstrap Cost | Ongoing Monthly |
|---------|---------------------|-----------------|
| 10 | $0.80 | $0 |
| 100 | $8.00 | $0 |
| 1,000 | $80.00 | $0 |
| 10,000 | $800.00 | $0 |

**Ongoing monthly cost: $0** — Bootstrap runs once per tenant. Only re-runs on new KB imports.

---

## 4. Cost Protection Mechanisms

| Protection | Value | Effect |
|-----------|-------|--------|
| Max articles per run | 300 | Caps extraction Gemini calls at 60 |
| Max entities per run | 50 | Caps promote writes at 150 |
| Max drafts per run | 50 | Caps draft Gemini calls at 50 |
| Nightly batch only | 1 run/day | No runaway execution |
| Feature flag | OFF by default | Zero cost until enabled |
| Skip if entities exist | Configurable | Prevents re-bootstrap for existing tenants |
| Idempotent design | Always | Re-runs don't duplicate writes |

---

## 5. Firestore Index Requirements

No new composite indexes required. All queries use existing indexes:

- `canonica_entityCandidates`: `tId + sId + status` (exists)
- `canonica_entities`: `tId + sId` (exists)
- `canonica_mutationProposals`: `tId + sId + mutationType + status` (exists)
- `kb_articles`: `status` (exists)
- `kb_generation_jobs`: `tId + sId + status` (exists)

---

## 6. DAL Functions Used

| Function | File | Operation |
|----------|------|-----------|
| `extractEntitiesFromArticles()` | `src/lib/canonica/entityExtraction.ts` | Entity extraction |
| `addEntityCandidate()` | `src/database/canonica/entityCandidates.ts` | Store candidates |
| `addEntity()` | `src/database/canonica/entities.ts` | Promote entity |
| `upsertEntitySearchIndex()` | `src/database/canonica/entities.ts` | Build search index |
| `addMutationProposal()` | `src/database/canonica/mutationProposals.ts` | Store draft proposals |
| `addAuditLog()` | `src/database/canonica/auditLogs.ts` | Audit trail |
| `buildSearchIndexEntry()` | `src/lib/canonica/entityExtraction.ts` | Index construction |
| `getEntities()` | `src/database/canonica/entities.ts` | Dedup check |

Note: Bootstrap engine runs in Cloud Functions (`functions-canonica`), so it uses `firebase-admin` SDK directly, not the client-side DAL. The DAL functions listed above are the equivalent patterns — CF code will mirror them using `firestoreAdmin`.

---

## 7. Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-09 | 1.0.0 | Initial Firebase cost analysis |

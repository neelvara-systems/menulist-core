# Automatic Knowledge Creation — Firebase Operations

> **Status:** IMPLEMENTED — operations contract updated
> **Version:** 1.1.4
> **Created:** 2026-03-09
> **Last Updated:** 2026-06-29
> **Audience:** Developers

---

## §1 — Collections Used

### NO new collections. Uses existing Answerlattice collections only.

| Collection | Purpose | Read/Write |
|------------|---------|------------|
| `answerlattice_mutation_proposals` | Store draft content on `suggestedChange` field | R+W |
| `answerlattice_signal_events` | Read signal examples for draft context | R |
| `answerlattice_entities` | Read entity name + description for prompt | R |
| `answerlattice_canonical_answers` | Read existing answers for context grounding | R |
| `answerlattice_entity_search_index` | Create search index for approved answers | W |
| `answerlattice_audit_logs` | Log draft generation + approval events | W |
| `kb_articles` | Read KB articles for prompt grounding (optional) | R |
| `answerlattice_aiOperations/{tId}/{sId}` | Compact AI operation/token accounting rows for draft, entity-extraction, ticket-knowledge, onboarding, friction-insight, and embedding provider calls | W |

---

## §2 — Firestore Operations Per Draft Generation

### §2.1 — Draft Generation (Nightly CF — per proposal)

| Operation | Collection | Type | Count | Purpose |
|-----------|-----------|------|-------|---------|
| Read entity doc | `answerlattice_entities` | R | 1 | Entity name + description for prompt |
| Read signal examples | `answerlattice_signal_events` | R | 1 query | Sample signal texts (already loaded by clustering step) |
| Read existing answers | `answerlattice_canonical_answers` | R | 1 query | Context grounding (what docs already exist) |
| Read KB articles | `kb_articles` | R | 1 query (optional) | Additional grounding context |
| Update proposal | `answerlattice_mutation_proposals` | W | 1 | Store draft on suggestedChange |
| Write audit log | `answerlattice_audit_logs` | W | 1 | Log draft generation event |
| Write AI operation | `answerlattice_aiOperations/{tId}/{sId}` | W | 1 | Log model, token counts, processing time, source, and zero-unit internal usage |

**Total per draft: 4-5 reads + 3 writes**

### §2.2 — Draft Approval (Client-side — per approval)

| Operation | Collection | Type | Count | Purpose |
|-----------|-----------|------|-------|---------|
| Read proposal | `answerlattice_mutation_proposals` | R | 1 | Fetch draft content |
| Create canonical answer | `answerlattice_canonical_answers` | W | 1 | New answer from draft |
| Create search index | `answerlattice_entity_search_index` | W | 1 | Index for retrieval |
| Update proposal status | `answerlattice_mutation_proposals` | W | 1 | Mark as implemented |
| Write audit log | `answerlattice_audit_logs` | W | 1 | Log approval event |

**Total per approval: 1 read + 4 writes**

### §2.3 — Draft Regeneration (API route — manual trigger)

| Operation | Collection | Type | Count | Purpose |
|-----------|-----------|------|-------|---------|
| Read proposal | `answerlattice_mutation_proposals` | R | 1 | Fetch entity + signal context |
| Read entity | `answerlattice_entities` | R | 1 | Entity context |
| Read recent entity signals | `answerlattice_signal_events` | R | 1 bounded query | Draft evidence examples |
| Read existing answers | `answerlattice_canonical_answers` | R | 1 query | Grounding |
| Update proposal | `answerlattice_mutation_proposals` | W | 1 | Store new draft |
| Write audit log | `answerlattice_audit_logs` | W | 1 | Record explicit regeneration |
| Write AI operation | `answerlattice_aiOperations/{tId}/{sId}` | W | 1 through `/api/answerlattice/mutation-proposals/regenerate-draft` | Log model, token counts, processing time, source, and zero-unit internal usage |

**Total per regeneration: 4 reads/queries + 3 writes**

Manual regeneration route guard changes on 2026-06-28 added no Firestore reads/writes. The route now resolves scope, checks safe mode, and applies the AI operation rate limit before permission, request-body parsing, proposal/entity reads, signal/answer grounding reads, provider calls, proposal writes, audit writes, or AI-operation writes. Unexpected route failures use fixed-code bounded tenant/store/user/proposal metadata only. If the optional signal-example or existing-answer grounding reads throw, the route logs `answerlattice_draft_regeneration_signal_examples_load_failed` or `answerlattice_draft_regeneration_existing_answers_load_failed` with bounded tenant/store/entity metadata and continues with empty grounding arrays, so the Firestore operation count and owner response shape stay unchanged. The 2026-06-30 browser/DAL acknowledgement pass adds a 16 KB response-body cap and `{ success: true }` guard before governance success state; it adds no Firestore reads, writes, provider calls, rules, indexes, or deployment requirement.

### §2.4 — Related Scheduled AI Operations

The same `answerlattice_aiOperations/{tId}/{sId}` accounting path is used by adjacent Answerlattice Cloud Function AI calls:

| Operation | Source | Write |
|-----------|--------|-------|
| Ticket resolution extraction | `functions-answerlattice/src/answerlattice/resolutionExtractor.ts` | 1 AI operation row per provider call |
| Founder onboarding entity extraction | `functions-answerlattice/src/answerlattice/onboardingBootstrap.ts` | 1 AI operation row per entity-extraction batch |
| Founder onboarding draft generation | `functions-answerlattice/src/answerlattice/onboardingBootstrap.ts` | 1 AI operation row per draft provider call |
| Article save entity extraction | `src/database/knowledgeBase/articles.ts` | 1 AI operation row per extraction batch through the sanitized API route; browser trigger uses no-store/same-origin/manual-redirect policy and bounded acknowledgement parsing without blocking article saves |
| Weekly friction insight | `functions-answerlattice/src/answerlattice/frictionInsight.ts` | 1 AI operation row per generated insight |
| KB embedding worker/callable | `functions-answerlattice/src/utils/aiUtils.ts` | 1 AI operation row per embedding call with tenant/store scope |

These rows are internal/accounting-only and do not charge Answerlattice support credits unless a future action is explicitly assigned a non-zero unit cost.

### §2.5 — Diagnostic Behavior

Scheduled draft generation diagnostics are logging-only and add no Firestore operations. Gemini call, response-parse, per-proposal, failed draft-status marking, and batch failures use fixed `ANSWERLATTICE_DRAFT_*` codes with source error name/code/status, tenant/store scope booleans, identifier presence/length metadata, and prompt/response lengths. Raw tenant/store IDs, proposal IDs, entity IDs, entity names, provider exceptions, generated content, and prompt text must not be emitted from failure diagnostics.

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

**Gemini cost: <$1/month even at 100-tenant scale.** Token counts are now logged per provider call. When the SDK response omits provider usage metadata, the row is marked with `tokenCountSource='estimated'`.

Scheduled Answerlattice Cloud Functions use the `@google/genai` SDK through the Answerlattice API-key gateway. They do not depend on MenuList's `GEMINI_AI_KEY` gateway, alternate provider client branches, or an undeclared `@google/generative-ai` package inside `functions-answerlattice`; production credentials are the Answerlattice-owned `ANSWERLATTICE_GEMINI_AI_KEY*` Firebase secrets.

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
- `answerlattice_mutation_proposals`: `tId` + `sId` + `status` (existing)
- `answerlattice_signal_events`: `tId` + `sId` + `timestamp` (existing)
- `answerlattice_entities`: `tId` + `sId` (existing)
- `answerlattice_canonical_answers`: `tId` + `sId` + `scope.entityIds` + `status` (existing)

---

## §5 — Data Retention

- **Draft content on proposals:** Permanent (follows proposal lifecycle)
- **Approved drafts → canonical answers:** Permanent (governed knowledge)
- **Signal events used for context:** 12-month TTL through the Answerlattice nightly Admin SDK cleanup (`archiveExpiredSignals`)
- **Audit logs:** Permanent (append-only, existing policy)
- **AI operation rows:** Retained under the shared Answerlattice AI operation retention policy; accounting-only rows do not store raw prompts or provider payloads.

---

## §6 — Security Rules

No changes to Firestore rules required. All operations use existing:
- CF: `firebase-admin` (server-side, bypasses rules)
- Client: `answerlatticeFirebaseClient` (Answerlattice Firestore project)
- Governance UI: Authenticated admin access only

---

## §7 — DAL Functions (New + Modified)

### §7.1 — New Function: `approveDraftAsCanonicalAnswer()`

**File:** `src/database/answerlattice/mutationProposals.ts`

```typescript
/**
 * Approve a draft proposal and create a canonical answer from it.
 * One-click: reads draft → creates answer → creates search index → marks implemented.
 */
export const approveDraftAsCanonicalAnswer = async (
    proposalId: string,
    editedContent: Partial<AnswerlatticeCanonicalAnswer['content']>,
    tId: number,
    sId: number,
    approvedBy: string
): Promise<AnswerlatticeCanonicalAnswer | null>
```

**Operations:** 1R + 4W (see §2.2)

### §7.2 — Modified: Nightly CF `runSignalMutation()` and `detectRecurringFallbacks()`

After creating proposals, these functions now also call `generateDraftForProposal()` if:
- `ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE` is true
- Proposal mutationType is `new_answer_required`
- Draft count < 10 per nightly run (cost cap)

**Additional operations per draft:** 4-5R + 2W (see §2.1)

---

## §8 — Cross-References

| Document | Relevance |
|----------|-----------|
| `__docs__/answerlattice/answerlattice-forensic-audit-2026-03-07.md` | System inventory for all Answerlattice collections |
| `__docs__/answerlattice/doctrine/05-architecture-evolution.md` | Architecture freeze rules |
| `__docs__/answerlattice/doctrine/01-core-doctrine.md` | "Signals propose mutations. Humans approve." |
| `__docs__/answerlattice/answerlattice-expansion-tracker.md` | Expansion Item #4 tracking |

## §9 — Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-06-29 | 1.1.4 | Added manual draft-regeneration grounding-read diagnostics without changing Firestore operation counts |
| 2026-06-28 | 1.1.3 | Added manual draft/entity extraction route safe-mode admission and bounded route diagnostics without changing Firestore operation counts |
| 2026-06-28 | 1.1.2 | Added scheduled draft generator bounded diagnostics contract |
| 2026-06-20 | 1.1.1 | Added manual draft regeneration and article entity-extraction AI operation accounting notes |
| 2026-06-20 | 1.1.0 | Added AI operation/token accounting writes for scheduled Answerlattice provider calls |
| 2026-03-09 | 1.0.0 | Initial Automatic Knowledge Creation Firebase operations contract |

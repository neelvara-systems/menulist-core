# Automatic Knowledge Creation — Firebase Operations

> **Status:** IMPLEMENTED — operations contract updated
> **Version:** 1.2.0
> **Created:** 2026-03-09
> **Last Updated:** 2026-07-11
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

### §2.2 — Draft Approval (server governance transaction — per approval)

| Operation | Collection | Type | Count | Purpose |
|-----------|-----------|------|-------|---------|
| Read proposal | `answerlattice_mutation_proposals` | R | 1 | Fetch and validate stored draft/proposal state |
| Read target answer | `answerlattice_canonical_answers` | R | 0-1 | Load before-state for updates and rollback evidence |
| Read latest release | `answerlattice_releases` | R | 1 bounded query | Bind validation to the current active product version |
| Read bound entities | `answerlattice_entities` | R | 1-25 | Prove every answer entity exists in the workspace |
| Read active answers | `answerlattice_canonical_answers` | R | 1 bounded query, max 500 | Reject overlapping active scope/version windows |
| Create/update canonical answer | `answerlattice_canonical_answers` | W | 1 | Apply reviewed answer truth |
| Update proposal status | `answerlattice_mutation_proposals` | W | 1 | Mark as implemented with server actor/review metadata |
| Write audit log | `answerlattice_audit_logs` | W | 1 | Store before/after answer snapshot and proposal link |
| Increment canonical cache version | `answerlattice_cacheVersions` | W | 1 | Prevent stale canonical cache hits |
| Increment compiled source version | `platformSummary/sourceVersions_*` | W | 1 | Mark canonical source change |
| Mark compiled bundle stale | `platformSummary/bundleManifest_*` | W | 1 | Prevent stale bundle from appearing current |

**Typical total per approval: 4 bounded read groups plus one read per bound entity and 6 writes.** A new-answer idempotency check can add one answer-document read. All approval writes commit in one Admin Firestore transaction.

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

Manual regeneration route guard changes on 2026-06-28 added no Firestore reads/writes. The route now resolves scope, checks safe mode, and applies the AI operation rate limit before permission, request-body parsing, proposal/entity reads, signal/answer grounding reads, provider calls, proposal writes, audit writes, or AI-operation writes. The current request carries only normalized proposal ID plus a stable bounded idempotency ID; audit actor fields are session-derived. Draft-processing leases accept exact numeric Firestore seconds only. Unexpected route failures use fixed-code bounded tenant/store/user/proposal metadata, and a failed claim-recovery transaction adds `answerlattice_draft_regeneration_claim_recovery_failed` without replacing the primary response. If the optional signal-example or existing-answer grounding reads throw, the route logs `answerlattice_draft_regeneration_signal_examples_load_failed` or `answerlattice_draft_regeneration_existing_answers_load_failed` with bounded tenant/store/entity metadata and continues with empty grounding arrays, so the normal Firestore operation count and owner response shape stay unchanged. The browser/DAL acknowledgement pass adds a 16 KB response-body cap and `{ success: true }` guard before governance success state; it adds no rules, indexes, or deployment requirement.

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

Nightly mutation-proposal creation requires the referenced entity to retain exact `pId='AL'`, positive safe-integer `tId`/`sId`, matching scheduler scope and non-deprecated status inside the creation transaction. Scheduled draft claims and final writes repeat exact product/workspace checks; the final commit also repeats mutation-type, related-entity and processing-run ownership. Grounding queries filter every returned signal and canonical answer through the same exact scope contract before prompt construction. Legacy numeric strings are not accepted on these server-owned persisted records. The additional entity/signal/answer failure diagnostics are logging-only and add no Firestore cost.

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

Answerlattice Next.js provider paths use the same product-owned credential boundary through `src/lib/answerlattice/genAiClient.ts`. Article embeddings, image query interpretation, RAG fallback, entity extraction, manual draft regeneration, FAQ generation, translation, and Knowledge Intake media extraction use `ANSWERLATTICE_GEMINI_AI_KEY*` only and do not fall back to MenuList `GEMINI_AI_KEY*`.

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
- **Signal events used for context:** every new signal carries `expiresAt`; Firestore TTL owns 12-month deletion. This avoids a per-workspace cleanup query in the nightly scheduler. Legacy pre-TTL rows require the bounded migration described in the Firebase forensic audit.
- **Audit logs:** Permanent (append-only, existing policy)
- **AI operation rows:** Retained under the shared Answerlattice AI operation retention policy; accounting-only rows do not store raw prompts or provider payloads.

---

## §6 — Security Rules

The governance authority is enforced in `firestore-answerlattice.rules`:

- `answerlattice_canonicalAnswers`: authenticated clients may read within scope/permission, but client create and update are denied.
- `answerlattice_mutationProposals`: clients may submit strictly pending, scoped proposals; client updates are denied, so approval/rejection/implementation cannot be forged from the browser.
- `answerlattice_auditLogs`: client-created records cannot use server-reserved canonical, drift, proposal-decision, rollback, or entity-merge action names.
- Server governance uses Answerlattice Admin Firestore after `withAuth`, session-scope resolution, `canManageGovernance`, rate limiting, bounded request parsing, and strict Zod validation.

`npm run test:answerlattice-governance:rules` proves the direct-write denials in the Firestore emulator.

---

## §7 — DAL Functions (New + Modified)

### §7.1 — Governed approval action

**Files:** `src/database/answerlattice/mutationProposals.ts`, `src/lib/answerlattice/governanceClient.ts`, `src/app/api/answerlattice/governance/actions/route.ts`, `src/lib/answerlattice/governanceServer.ts`

```typescript
await runAnswerlatticeGovernanceAction({
    action: 'approve_proposal',
    proposalId,
    editedContent,
});
```

The browser does not send trusted tenant, store, or actor fields and cannot write canonical/proposal-decision state directly. See §2.2 for the transactional operation envelope.

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
| 2026-07-11 | 1.2.0 | Documented server-owned canonical approval, rules denials, atomic audit/cache/source/bundle invalidation, and emulator coverage |
| 2026-06-29 | 1.1.4 | Added manual draft-regeneration grounding-read diagnostics without changing Firestore operation counts |
| 2026-06-28 | 1.1.3 | Added manual draft/entity extraction route safe-mode admission and bounded route diagnostics without changing Firestore operation counts |
| 2026-06-28 | 1.1.2 | Added scheduled draft generator bounded diagnostics contract |
| 2026-06-20 | 1.1.1 | Added manual draft regeneration and article entity-extraction AI operation accounting notes |
| 2026-06-20 | 1.1.0 | Added AI operation/token accounting writes for scheduled Answerlattice provider calls |
| 2026-03-09 | 1.0.0 | Initial Automatic Knowledge Creation Firebase operations contract |

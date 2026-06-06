# Repeated Reply Import — Implementation Plan

> **Status:** IMPLEMENTED  
> **Created:** 2026-06-06  
> **Parent Module:** Knowledge Intake Command Center

---

## Implementation Strategy

Implement repeated reply import as an additive Knowledge Intake source type. Do not create a separate route, collection, queue, or worker.

---

## Code Changes

| File | Change |
| --- | --- |
| `src/config/features.ts` | Add `ENABLE_ANSWERLATTICE_REPEATED_REPLY_IMPORT`. |
| `src/types/answerlattice/index.ts` | Add `ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE.REPEATED_REPLY`. |
| `src/lib/answerlattice/knowledgeIntake.ts` | Reject repeated reply sources when disabled or malformed; generate only FAQ and canonical proposal review items for repeated-reply sources. |
| `src/lib/answerlattice/entityLookup.ts` | Add a server-side, tenant-scoped, capped entity option lookup for the repeated-reply form. |
| `src/hooks/answerlattice/useKnowledgeIntake.ts` | Add a debounced/cached entity-option search helper used only when the owner searches. |
| `src/app/api/answerlattice/knowledge-intake/entities/route.ts` | Add a protected, rate-limited entity-option endpoint. |
| `src/components/templates/answerlattice/knowledgeIntake/AnswerlatticeKnowledgeIntake.tsx` | Add a guided repeated-reply form that creates the source through the existing add-source API and links entities through bounded autocomplete. |
| `functions-answerlattice/src/answerlattice/onboardingBootstrap.ts` | Include `prefixTokens` when the existing onboarding bootstrap writes new entity search-index rows. |
| `firestore-answerlattice.indexes.json` | Add the Answerlattice entity autocomplete index for token-prefix lookups. |

---

## Implemented Runtime Notes

- The guided form posts through the existing `useKnowledgeIntake().addSource()` hook.
- The generic source picker stays on broad source types; repeated replies use the dedicated guided form so Q/A validation runs before source creation.
- The repeated-reply entity selector does not load entities on mount. It searches only after the owner types a query.
- Entity autocomplete uses the existing `answerlattice_entitySearchIndex` and then reads only the matched entity docs needed for display/filtering.
- The server rejects `repeated_reply` source creation if `ENABLE_ANSWERLATTICE_REPEATED_REPLY_IMPORT` is disabled.
- The server rejects malformed `repeated_reply` source creation before writing a source doc.
- `buildReviewItemsFromSource()` branches repeated replies before the default article generation path.
- Repeated reply analysis returns one FAQ draft and one canonical proposal draft.

---

## Draft Generation

For `repeated_reply` sources:

1. Read source text from existing `contentText`.
2. Parse one Q/A pair using the existing FAQ extraction helper.
3. If metadata contains the repeated question, prefer it as the question.
4. Create one FAQ draft.
5. Create one canonical proposal draft.
6. Do not create the default KB article draft.
7. Preserve source tags, context keys, and entity IDs on both drafts.

The reason text must tell the owner whether the canonical draft is entity-linked or still needs an entity.

---

## Feature Flag

`ENABLE_ANSWERLATTICE_REPEATED_REPLY_IMPORT` requires:

- `ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE === true`

The UI hides the guided repeated-reply form when the flag is off. The server rejects source creation if a caller posts `type: repeated_reply` while disabled or without one parseable Q/A pair.

---

## Security

Existing Knowledge Intake controls remain in force:

- protected API route with `withAuth`
- active Answerlattice license requirement
- rate limit on add-source route
- tenant scope via `tId` and `sId`
- source text redaction before storage
- metadata sanitization
- duplicate source hash

No raw email inbox, helpdesk payload, customer transcript connector, or OAuth credential is accepted.

The entity autocomplete route is also gated by `ENABLE_ANSWERLATTICE_REPEATED_REPLY_IMPORT`, protected with `withAuth`, uses the current Answerlattice session scope, requires Knowledge Intake management permission, rate-limits search requests, and never accepts `tId` or `sId` from the browser.

---

## Firebase Cost

No new Firestore collection, Storage path, new Cloud Function, or scheduler is required.

The repeated-reply source follows the same add/analyze/publish operations already documented for Knowledge Intake, with lower review-item fanout than generic pasted text because it produces at most two drafts.

Entity autocomplete adds no collection, Storage path, new Cloud Function, scheduler, listener, AI call, or provider call. It adds an additive `prefixTokens` field to future entity search-index writes and one composite Firestore index so query reads are proportional to token matches instead of workspace entity count. Existing onboarding-bootstrap function logic now includes `prefixTokens` on the entity search-index rows it already writes. Legacy index rows without `prefixTokens` use a capped fallback read against the existing tenant/store search-index query.

---

## Rollback

Set `ENABLE_ANSWERLATTICE_REPEATED_REPLY_IMPORT` to `false`.

Existing `repeated_reply` sources remain historical intake sources. New repeated-reply source creation is rejected. Existing review items can still be reviewed/published because they already exist inside normal Knowledge Intake collections.

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-06 | Added bounded entity autocomplete implementation path and index contract. |
| 2026-06-06 | Implemented repeated reply import through existing Knowledge Intake source/review/publish paths. |

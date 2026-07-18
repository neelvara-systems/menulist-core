# Multi-Language Translation — Firebase and Cost Contract

**Status:** Code-truth cost record
**Last updated:** July 15, 2026

## Runtime boundary

Text translation runs in the authenticated Next.js route `POST /api/translations`. No dedicated translation Cloud Function, scheduled function, Storage path, Firestore rule, or index exists.

Extraction-time localization belongs to the separate menu-extraction job pipeline and its `IMAGE_PROCESSING` accounting. Do not combine extraction cost/operations with `/api/translations` rows.

## Firestore reads

| Read | When | Bound |
| --- | --- | --- |
| Store permission resolution | Every request | Existing permission contract before provider work |
| Project document | Project-scoped translation | One direct document read for linked-outlet/project validation |
| Master store/policy | Linked outlet only | One direct store read after the project proves it is linked |
| Capacity subscription/balance | Paid translation request | Existing AI capacity implementation |

Business-copy-only requests can omit `projectId`, so they do not perform the project/outlet read. They remain authenticated, store-permission scoped, rate limited, capacity checked, and accounted.

## Firestore writes

| Write | Trigger | Notes |
| --- | --- | --- |
| `menulistAiOperations/{tId}/{sId}/{operationId}` | Each successful/accounted provider request | Compact action, usage, coverage, language, and response summaries |
| Subscription/capacity ledger | Each paid request | Reservation and mandatory settlement through shared accounting |
| Project document | Desktop language add/retry, mobile language add/repair, command/bulk save | Existing project DAL; one save per completed orchestration, not per translated field |
| Project metadata summary | When localized project name/description/special-menu name changes | Existing metadata DAL |
| Store document | Business-copy caller accepts/saves localized copy | Existing store DAL; not written by `/api/translations` itself |

Single item/category translation consumes its AI operation when generated, but its localized draft is written to the project only when the owner saves through the editor.

## Deletes

Translation creates no dedicated content documents. Removing a language updates the existing project content/language arrays; it does not delete an AI operation ledger row.

## Unit accounting

| Action | Units per request | Current use |
| --- | ---: | --- |
| `ITEM_TRANSLATION` | 1 | One item or category to one target |
| `LANGUAGE_ADDITION` | 3 | File, language repair, project-public batch, business-copy batch |
| `IMAGE_TRANSLATION` | 5 | Historical/future OCR/translate/regenerate action; no ordinary text-retry caller |
| `IMAGE_PROCESSING` | 0 translation units | Separate menu extraction job |

Language addition is per request. Two files plus one project-public batch can produce three operation rows and consume 9 units.

## Failure/cost ordering

The route order prevents avoidable provider spend:

1. SAFE_MODE and rate limit.
2. Bounded body and Zod validation.
3. Store permission.
4. Linked-outlet/project policy.
5. Capacity check and reservation.
6. Provider request.
7. Exact response normalization.
8. Mandatory operation logging/credit settlement.
9. Client-side project/store persistence.

Rejected validation, permission, outlet policy, or capacity requests do not call the provider. A reservation is refunded safely if the route fails before accounting settlement.

## Provider response diagnostics

The route can recover fenced JSON or an extractable JSON object before a retry. Unrecoverable output logs `translation_provider_response_parse_failed` and uses `retry_once_then_return_translation_failed`.

This diagnostic adds no Firestore content reads/writes, Storage work, cache invalidation, rules, indexes, or owner settings. It causes no extra provider calls beyond the existing retry policy, no extra AI accounting writes, and no extra credit consumption. It creates no Firebase deploy requirement and no Vercel deploy action.

Raw menu text, translated maps, raw prompt input/language payloads, and raw provider output are not stored in transaction input or local success/error logs. Compact `inputSummary`, `languageSummary`, `targetLanguages`, `translationCoverageSummary`, and client response counts are retained.

## Document-size control

Projects store localized values inline. The six-language cap in `src/constants/languages.ts:18` is the primary growth guard. Translation makes no per-field event documents and no translation-memory collection. Existing project-size limits and extraction guards remain responsible for the 1 MiB Firestore document boundary.

No speculative translation queue, cache, checkpoint collection, or approximate client-side document-size rejection is added. A reliable pre-provider size gate would need the authoritative post-merge project write shape; an estimate at the translation route could reject valid existing work or still miss a later oversized merge. Add that guard only at the shared authoritative project persistence boundary if real size telemetry shows the six-language cap and existing extraction guards are insufficient.

## Cache behavior

`/api/translations` returns text only and does not write public project truth. The existing project/store DAL that accepts the localized result remains responsible for the normal public cache invalidation path. This pass adds no new cache key or invalidation route.

## Infrastructure impact

The July 15, 2026 changes modify app code and docs only. No Firestore rules, indexes, Storage rules, or Cloud Function logic changed; therefore no Firebase deployment is required. Vercel deployment is pending explicit owner instruction.

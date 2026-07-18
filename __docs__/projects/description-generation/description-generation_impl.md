# Description Generation - Technical Implementation

**Status:** Implemented source evidence; not current launch certification
**Last cross-check:** July 15, 2026

> Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, target feature-flag/provider review, AI accounting/source gates, provider smoke, authenticated desktop/mobile editor QA, target deploy evidence, and production-host smoke.

## Architecture

```text
desktop/mobile/repair/single-item entry
  -> shared eligibility and orchestration
  -> authenticated server route
  -> SAFE_MODE, rate limit, bounded body, Zod, permission, outlet policy
  -> whole-scope capacity admission on the first multi-request paid refresh
  -> per-request capacity reserve when paid
  -> provider-only item ID aliases and Gemini structured JSON
  -> allowlisted normalization, original-ID restoration, complete-scope check
  -> accounting settle and compact operation row
  -> client merge
  -> project DAL save and public-cache invalidation
  -> owner success and Transactions presentation
```

No new Firebase function, scheduler, document type, or dependency is used.

## Shared bulk orchestration

`getDescriptionGenerationStats()` at `src/components/templates/main-app/projects/editorView/descriptionGeneration.shared.ts:41` mirrors payload eligibility:

- linked-outlet governance is applied first;
- items without a canonical source-language name are excluded;
- an empty canonical source description is missing; any non-empty generated/legacy source copy is refreshable;
- any non-empty manual description in the item language map is treated as protected owner truth;
- `aiDescriptionCount` is the refreshable count and `manualDescriptionCount` is protected.

`runDescriptionGeneration()` at `descriptionGeneration.shared.ts:141` resolves source/targets, processes files sequentially, and calls `addDescription()`. A returned service error is converted to a thrown error at `descriptionGeneration.shared.ts:209`. The orchestrator does not publish per-file local project updates. It persists after the full selected scope succeeds and invokes `onProjectUpdate` only at `descriptionGeneration.shared.ts:232`.

This is client/project atomicity. Earlier successful provider requests may still have valid operation rows if a later batch fails, but no partial menu project is saved or presented as a successful owner result.

## Payload, chunking, and merge

`src/services/ai/description/descriptionUtils.ts:93`:

- excludes inherited/overridden items when governance permits only local items;
- requires a trimmed canonical source name;
- protects an item from first generation when its item-level provenance is manual and any configured description is non-empty;
- admits paid rewrite for any non-empty existing generated/legacy source copy and protects every manual item;
- sends an empty description for ADD so the free/paid boundary cannot be accidentally upgraded;
- sends existing source copy only for REWRITE.
- trims request name/category/attribute/description text to the route schema limits before byte-aware batching; the provider prompt uses the same text limits.

The browser chunks each file using `DESCRIPTION_ITEMS_PER_REQUEST = 100`, `DESCRIPTION_ITEM_PAYLOAD_BYTES_PER_REQUEST = 180 * 1024`, and `DESCRIPTION_OUTPUT_CELLS_PER_REQUEST = 300` (`descriptionUtils.ts:13`). The count cap matches the API schema; the conservative serialized-item payload cap leaves room beneath the route's 256 KiB whole-body boundary; the item-language cell cap bounds multilingual structured output. Batches are sequential. Every batch must return usable data before the file is merged.

Batch results accumulate in a null-prototype map and merge only own item-ID keys. This keeps valid legacy IDs such as `__proto__` from being interpreted as object prototype fields.

`getDescriptionGenerationRequestCount()` uses the same payload filtering and chunk function before a refresh starts. Desktop and mobile multiply that request count by `CONTENT_CREDIT_OPERATION_COSTS.DESCRIPTION_REWRITE`, so the confirmation displays the exact current credit count rather than a generic paid warning.

When a paid refresh requires more than one request, `runDescriptionGeneration()` passes `operationRequestCount` only to the first eligible file. `addDescription()` forwards it only on that file's first batch. The server uses this validated count for quantity-aware capacity admission, then reserves only the current request's normal unit cost. Older/single-request clients omit the optional field and keep the previous path unchanged. This is intentionally not a job-level reservation: it prevents the common insufficient-balance partial-spend case without adding a queue, collection, migration, or extra API round trip.

## Server route

`src/app/api/descriptions/route.ts:200` is wrapped with `withAuth()` and applies, in order:

1. SAFE_MODE (`route.ts:208`).
2. AI rate limiting (`route.ts:214`).
3. 256 KiB bounded JSON parsing (`route.ts:218`).
4. `DescriptionRequestSchema` (`route.ts:222`): unique item IDs, unique languages, bounded counts/strings, valid project/file IDs, allowed action/length/tone, and an optional 2-1,000 request count allowed only for paid refresh.
5. Server-derived billing action (`route.ts:251`).
6. `PERMISSIONS.GENERATE_DESCRIPTIONS` (`route.ts:271`).
7. linked-outlet policy and item scope (`route.ts:295`).
8. quantity-aware capacity admission for the first multi-request paid refresh, followed by the established single-request paid reservation.
9. replace project item IDs with stable provider-only aliases before prompt creation.
10. provider call with structured JSON and medium-or-above safety blocking.
11. bounded parse, alias-key allowlisting, and server-side restoration of original item IDs.
12. complete item/language validation.
13. accounting finalization.
14. safe reservation refund in `finally`.

Unknown item IDs/languages, control characters, extra keys, empty strings, and text over 2,000 characters are excluded or bounded by `src/lib/ai/descriptionOutput.ts`. Project item IDs never enter the provider prompt: `item_1`, `item_2`, and so on are restored only after normalized provider output returns. This also prevents valid long or punctuation-bearing imported IDs from being changed by prompt sanitization. A normalized but incomplete response fails before accounting.

Provider JSON parsing records the capped `description_provider_response_parse_failed` diagnostic without raw response text. Its fixed fallback policy is `return_description_generation_failed`; it returns a generic failure before accounting and client persistence.

## Single-item paths

The first-description action intentionally keeps the existing `/api/new-item-metadata` path. It prepares a first description, name/attribute translations, and only allowlisted low-risk metadata. `NEW_ITEM_METADATA` is free, and its schema rejects non-empty source copy so it cannot substitute for the paid rewrite route. `prepareNewItemMetadataRequestItem()` at `src/services/ai/dataGeneration/getNewItemMetadataViaAPI.ts:20` resolves the localized category name and bounds owner text before the request. The provider prompt is generate-only, uses business type only for vocabulary, and forbids invented facts or benefits. Instruction-like owner text and prompt-breaking characters are removed, and request-local item/attribute aliases replace project IDs. Attribute IDs are restored before the existing allowlisted output projection.

When source copy already exists, desktop and mobile call `runSingleItemDescriptionGeneration()` (`descriptionGeneration.shared.ts:250`). That helper:

- chooses ADD only when source copy is empty, otherwise REWRITE;
- refuses manual rewrites;
- calls `/api/descriptions` for the one item;
- merges complete multilingual descriptions and sets `descriptionSource: 'ai'`.

The item editor holds the result as a draft. The provider operation and any rewrite credit are already real, but project truth changes only when the owner selects Save. Cancel does not refund a successful provider operation.

`mergeGeneratedItemMetadata()` preserves manual provenance at `src/services/ai/dataGeneration/getNewItemMetadataViaAPI.ts:47`. Mobile draft creation also carries `descriptionSource`, and mobile description edits set it to `manual`.

`clearStaleTranslations()` normally clears secondary-language text when source copy changes. The item editors pass `preserveGeneratedDescriptionTranslations` for a freshly complete AI result (`translationsUtils.ts:100`), preventing generated translations from being erased on Save. A later manual source edit still clears stale target-language copy.

## Persistence and public output

- Desktop bulk passes `persistEditorProject()` to the orchestrator.
- Mobile bulk passes `persistMenuProjectImmediately()` (`MobileMenuScreen.tsx:638`).
- Both reach `updateProject()` / `updateProjectWithoutLoader()`.
- Standalone and linked-outlet saves invalidate the public client cache at `src/database/projects/index.ts:1740` and `src/database/projects/index.ts:1824`.
- Single-item Save enters the existing editor/mobile project persistence path; generation alone does not publish the draft.
- When a linked outlet permits description overrides, mobile Save compares the complete language map, so a generated target-language change persists even when source-language wording happens to remain the same.

## Accounting and owner presentation

`src/lib/ai/operationLog.ts:109` recognizes ADD and REWRITE descriptions and reduces detailed output to compact description counts in accounting-only mode. `src/lib/ai/operationPresentation.ts:260` renders "Prepared" for ADD and "Revised" for REWRITE. `NEW_ITEM_METADATA` renders "Prepared item details" at `operationPresentation.ts:328`.

Desktop and mobile detail views intentionally do not reconstruct generated menu copy from an accounting-only row. Owner copy explains that history stores the result count rather than generated text and that the saved menu is authoritative (`public/locales/menulist.ai/en-US.json:1130`). Credits and no-credit state come from the settled operation row.

## Feature and operational gates

This established core feature does not have a dedicated feature flag. Adding one now would change existing behavior. Runtime gates are auth, permission, linked-outlet policy, SAFE_MODE, AI rate limit, provider/model configuration, and paid capacity. Release review must still perform target feature-flag/provider review because global AI/runtime configuration can disable or alter the provider boundary.

## Verification

The focused executable coverage is in:

- `scripts/verification/test-description-output-boundary.ts`
- `scripts/verification/test-new-item-metadata-output-boundary.ts`
- `scripts/verification/verify-ai-accounting-hardening.js`
- `scripts/verification/verify-menulist-api-tenant-safety.js`
- `scripts/verification/verify-public-business-truth.js`

See [verification](./description-generation_verification.md) for the current run record.

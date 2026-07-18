# Description Generation - Production Audit

**Status:** Historical code-audit evidence; not current launch certification
**Current source cross-check:** July 15, 2026

## Current codebase verdict

The description-generation source boundary is aligned across desktop bulk, mobile bulk, repair flows, single-item editors, API security, accounting, persistence, public-cache invalidation, and owner Transactions. The July 15 pass corrected the material source defects listed below. This is not deploy or provider certification.

## Corrected findings

| Severity | Finding | Resolution |
| --- | --- | --- |
| P0 | A returned service error was logged but the orchestrator continued to persistence and success UI. | Error results now throw; project/local update occurs only after the full selected scope succeeds. |
| P0 | Existing single-item descriptions used the free metadata action; source copy was protected, so "regenerate" could report success without rewriting or charging correctly. | Existing source copy now uses the governed `REWRITE_DESCRIPTION` helper; first empty copy keeps `NEW_ITEM_METADATA`. |
| P0 | The free metadata endpoint still accepted a forged direct request carrying existing source copy. | `NewItemMetadataRequestSchema` now rejects non-empty source descriptions before provider work; existing copy must use `REWRITE_DESCRIPTION`. |
| P1 | Generated secondary-language descriptions were cleared on item Save when generated source copy changed. | Fresh AI results opt into preservation; later manual edits still clear stale translations. |
| P1 | Provider responses missing an item or language could be saved and charged as partial success. | Complete-scope validation now fails before accounting/persistence. |
| P1 | A large or highly multilingual file could exceed API input or practical structured-output boundaries as one request. | Client processes sequential batches capped at 100 items, approximately 180 KiB of serialized item payload, and 300 item-language output cells. |
| P1 | Valid imported item IDs could be truncated or stripped by prompt sanitization, making complete provider output appear to omit an item. | The route now sends stable provider-only aliases and restores the original IDs after allowlisted normalization. |
| P1 | A prototype-named imported item ID could be treated as an object prototype field while browser batches were accumulated or merged. | Batch accumulation now uses a null-prototype map and merge accepts own keys only. |
| P1 | The free first-description metadata prompt embedded unsanitized owner text and raw attribute IDs, unlike the bulk description route. | Metadata prompt text is now bounded/sanitized; request-local item/attribute aliases are restored before strict output projection. |
| P1 | Mobile refresh lacked the desktop confirmation and neither surface disclosed the exact batched credit count. | Mobile uses a confirmation dialog; desktop/mobile calculate the same request batches as execution and show the exact current credit count. |
| P1 | A multi-request paid refresh checked only one request at a time, so an already-underfunded scope could settle an early batch before later capacity refusal. | The first request now performs quantity-aware admission for the complete current request count, while each request retains the existing exact reservation/settlement lifecycle. |
| P1 | The shared custom capacity error did not restore its prototype under the root ES5 target, so a valid 402 could fail `instanceof AICapacityError` and become a generic provider error. | `AICapacityError` now restores its prototype; the orchestration test proves the capacity code propagates, no later batch runs, and no local project update is published. |
| P1 | Mobile item drafts dropped `descriptionSource` and manual edits did not mark manual provenance. | Draft creation and description edits preserve/set provenance. |
| P2 | Bulk stats evaluated every language while payload eligibility evaluated only source copy, allowing a no-op success state. | Both now use eligible named items and the same empty-versus-existing canonical source boundary; translation-only gaps stay in language repair. |
| P2 | Stored item text could exceed route field limits even when the batch stayed under the byte cap, causing avoidable validation failure. | The payload builder now applies the route's name/category/attribute/description limits before chunking. |
| P2 | Single-item paths bypassed the bulk payload bounds, and first-item metadata sent an opaque category ID while its prompt still described an obsolete existing-copy translation mode. | Single-item rewrite reuses the shared payload builder; first-item metadata sends the bounded localized category name and uses a generate-only, explicit-input-only prompt. |
| P2 | Direct controls and repair summaries could include description work for roles lacking `canGenerateDescriptions`. | Desktop/mobile controls, handlers, Command Center, and Repair Menu now gate or omit description work using the effective permission; the server remains authoritative. |
| P2 | A linked-outlet mobile Save compared only source-language description text, so a changed generated target language could be discarded when source wording stayed identical. | The save path now compares the full multilingual description map before writing the permitted outlet override. |
| P2 | New-item metadata description output used a no-block dangerous-content setting. | It now matches the medium-or-above four-category safety posture of the main description route. |
| P2 | Accounting-only detail copy implied data was missing. | Owner copy explains that history stores the result count rather than generated text and that the saved menu is authoritative. |
| P2 | Mobile description and Repair Menu capacity failures reused translation-credit wording. | Those description-capable paths now use operation-neutral enhancement-pack/Billing guidance; translation-only retries retain translation-specific copy. |

## Current control review

| Area | Result | Evidence |
| --- | --- | --- |
| Auth and role permission | Source aligned | `src/app/api/descriptions/route.ts:200`, `route.ts:271` |
| Tenant/store/outlet policy | Source aligned | `src/app/api/descriptions/route.ts:295` |
| Input and request bounds | Source aligned | `src/app/api/descriptions/route.ts:218`, `route.ts:222` |
| SAFE_MODE and rate limit | Source aligned | `src/app/api/descriptions/route.ts:208`, `route.ts:214` |
| Paid admission/reserve/settle/refund | Source aligned | `src/app/api/descriptions/route.ts:267`, `route.ts:312`, `route.ts:328`, `route.ts:644`, `route.ts:733` |
| Provider output boundary | Source aligned | `src/lib/ai/descriptionOutput.ts:72`, `src/lib/ai/descriptionOutput.ts:114`, `src/app/api/descriptions/route.ts:546` |
| Manual protection | Source aligned | `src/services/ai/description/descriptionUtils.ts:116`, `descriptionUtils.ts:122` |
| Large-file behavior | Source aligned | `src/services/ai/description/descriptionUtils.ts:13` |
| Desktop/mobile parity | Source aligned | desktop `DescriptionGenerationModal.tsx:112`; mobile `GenerateDescriptionsSheet.tsx:87` |
| Persistence/cache | Source aligned | `src/database/projects/index.ts:1740`, `src/database/projects/index.ts:1824` |
| Owner transaction display | Source aligned | `src/lib/ai/operationPresentation.ts:260` |

## Known bounded limitations

- Processing is synchronous and sequential. This is intentionally simple and safe for current menu sizes; it is not a background job.
- The shared AI rate limit bounds very large projects. A project requiring more than 20 requests in the active rate window can be refused and retried later.
- Rewrite cost is per request, not per item. Crossing the 100-item, approximately 180 KiB serialized-item payload, or 300 item-language output-cell cap creates multiple charges and transaction rows.
- The first paid request rejects a currently underfunded multi-request scope before provider work, but it does not reserve the entire scope. Each successful API request still settles before the final project save. Concurrent credit use, a later provider failure, or project-save failure can therefore leave earlier valid operation rows and consumed rewrite credits even though the partial project is not published.
- The free ADD boundary uses the validated client payload and does not add a project reread or durable first-pass marker. Auth, persisted permission, outlet policy, body limits, and rate limiting bound it; stronger replay-proof first-pass enforcement would require a separate data/cost architecture decision.
- `ItemOverride` stores an outlet description but not separate AI/manual provenance. Inherited outlet overrides therefore inherit the master item's provenance after reload. Changing that shared schema requires a separate architecture and migration decision; this pass does not silently change it.
- A single-item provider operation is settled before the owner selects Save. Cancel preserves project truth but does not undo a successful provider operation.
- Local source gates cannot certify current provider availability, credentials, target deployment, or production-host cache behavior.

## External/pending release checks

- target provider/model smoke;
- authenticated desktop browser QA;
- authenticated mobile device QA;
- role and linked-outlet policy QA with real sessions;
- capacity-exhausted and recovery QA;
- target deploy evidence;
- production-host menu/cache and Transactions smoke.

These remain pending with the owner/release environment. No Vercel deploy was authorized by this source pass.

## Historical Code-Audit Result

The prior archived audit recorded the following historical score. It is retained only because old governance checks reference it.

| Area                  | Score  | Boundary |
| --------------------- | ------ | -------- |
| Overall               | 9.5/10 | Historical code-audit score; not current launch certification |

The full historical report is preserved at `_archive/description-generation_production-audit-2026-03-14.md`.

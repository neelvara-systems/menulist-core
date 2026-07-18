# Description Generation - Documentation Hub

**Product:** MenuList

**Status:** Implemented source evidence; not current launch certification
**Last cross-check:** July 15, 2026

> This folder follows the current codebase. Release approval still requires the active production-readiness audit, External Certification Runbook evidence, target feature-flag/provider review, AI accounting/source gates, provider smoke, authenticated desktop/mobile editor QA, target deploy evidence, and production-host smoke.

## What exists

MenuList supports four owner entry paths over the same governed description runtime:

1. Desktop bulk generation and refresh in `DescriptionGenerationModal`.
2. Mobile bulk generation and refresh in `GenerateDescriptionsSheet`.
3. Desktop Command Center and mobile Repair Menu for missing source descriptions.
4. Desktop and mobile single-item editors.

The first description is free. Refreshing existing generated copy uses description-refresh enhancements. A manual description is protected from refresh. Bulk changes save after the complete selected scope succeeds; single-item changes remain a draft until the owner selects Save.

## Current contracts

- The canonical source language is MenuList's canonical project source language.
- Bulk "missing" counts only eligible, named items whose canonical source description is empty. Any existing generated/legacy source copy belongs to paid refresh. Because provenance is item-level, any non-empty manual description in the item's configured language map is treated as owner truth and protects that item.
- A bulk request covers every configured project language. Missing translations on an already-described item belong to the language-repair flow, not the free first-description flow.
- Project item IDs are replaced with stable provider-only aliases in the prompt and restored server-side before accounting or client response, so valid imported IDs are neither exposed nor changed by prompt sanitization.
- Browser batch maps treat restored IDs as own data keys, and linked-outlet mobile Save compares the complete multilingual description map before persisting a permitted override.
- Provider output must contain every requested item and language. Partial output is rejected before accounting and project persistence.
- Provider JSON parse failures use the bounded `description_provider_response_parse_failed` diagnostic and fixed `return_description_generation_failed` fallback policy.
- Files are processed in sequential batches capped at 100 items, approximately 180 KiB of serialized item payload, and 300 item-language output cells. Common one-to-three-language menus keep the 100-item ceiling; unusually multilingual menus split earlier.
- Any failed file/batch stops the owner action. The UI does not publish a partial local project or show a success toast.
- The API derives the billable action from the payload, so a forged free request carrying existing copy is treated as a rewrite.
- The free `NEW_ITEM_METADATA` route rejects non-empty source copy; existing descriptions must use the paid rewrite boundary.
- Single-item first generation resolves the localized category name and applies the same request-text bounds as bulk generation before provider work. The metadata prompt is generate-only, factual, and explicit-input-only.
- Desktop and mobile refresh confirmations compute the exact current credit count from the same file, payload, and batching rules used by execution.
- When a paid refresh needs multiple requests, the first request carries that total count into the existing server capacity check. An underfunded scope is refused before provider work; each successful request still uses the established per-request reservation and settlement path.
- Desktop and mobile capacity refusals use enhancement-pack/Billing guidance. Description and mixed Repair Menu work never reuse translation-credit wording; translation-only retries keep their specific message.
- The same `GENERATE_DESCRIPTIONS` permission and linked-outlet policy are enforced in owner UI and server routes.
- Project saves use the existing project DAL and invalidate public menu/OBP cache tags.
- Owner transaction history keeps compact counts and credit usage, not a second copy of generated menu text.

## Source map

| Concern | Codebase authority |
| --- | --- |
| Bulk orchestration and single-item rewrite | `src/components/templates/main-app/projects/editorView/descriptionGeneration.shared.ts:41` |
| Payload filtering, manual protection, chunking | `src/services/ai/description/descriptionUtils.ts:93` |
| Authenticated description API | `src/app/api/descriptions/route.ts:200` |
| Output normalization and completeness boundary | `src/lib/ai/descriptionOutput.ts:72`, `src/lib/ai/descriptionOutput.ts:114` |
| New-item first-description metadata path | `src/app/api/new-item-metadata/route.ts:241` |
| Desktop bulk UI | `src/components/templates/main-app/projects/editorView/DescriptionGenerationModal.tsx:112` |
| Mobile bulk UI and refresh confirmation | `src/components/mobile/sheets/GenerateDescriptionsSheet.tsx:87` |
| Desktop single-item UI | `src/components/templates/main-app/projects/editorView/editItemModal.tsx:512` |
| Mobile single-item UI | `src/components/mobile/sheets/ItemEditSheet.tsx:561` |
| Save and public-cache invalidation | `src/database/projects/index.ts:1740` |
| Owner operation summaries | `src/lib/ai/operationPresentation.ts:260` |

## Documents

- [Specification](./description-generation_spec.md)
- [Implementation](./description-generation_impl.md)
- [Firebase and cost](./description-generation_firebase.md)
- [Mobile support](./description-generation_mobile-support.md)
- [Test cases](./description-generation_test-cases.md)
- [Validation](./description-generation_validation.md)
- [Verification](./description-generation_verification.md)
- [Production audit](./description-generation_production-audit.md)
- [Owner help](./description-generation_helpdoc.md)
- [Website draft](./description-generation_website.md)
- [Marketing boundary](./description-generation_marketing.md)

Historical documents are retained in [`_archive/`](./_archive/).

## Verification commands

```bash
npm run test:description-output-boundary
npm run test:new-item-metadata-output-boundary
npm run verify:ai-accounting
npm run verify:menulist-api-tenant-safety
npm run verify:public-business-truth
npm run verify:agent-readiness
npx tsc --noEmit --incremental false --pretty false
```

These are source gates. They do not replace provider smoke, authenticated browser/device QA, deploy evidence, or production-host validation.

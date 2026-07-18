# Multi-Language Translation — Documentation Hub

**Product:** MenuList
**Status:** Implemented source evidence; not current launch certification
**Last updated:** July 15, 2026
**Codebase authority:** Current source, runtime contracts, and focused verifiers outrank older feature prose.

This feature prepares localized menu and public-business content for owner review. English (`en`) is the permanent source for generation, translation, repair, and fallback. A project or store default language controls what owners and customers see first; it never replaces English as the translation source.

## Current code truth

- `src/data/languages.ts:1` contains 80 supported language definitions, including five RTL definitions.
- `src/constants/languages.ts:18` caps each project at six languages.
- `src/lib/localization/languagePolicy.ts:3` and `src/lib/localization/languagePolicy.ts:41` keep English present and first in normalized project language sets.
- `src/lib/validation/apiSchemas.ts:266` and `src/lib/validation/apiSchemas.ts:298` validate menu keys plus explicit project-public and business-copy keys.
- `src/app/api/translations/route.ts:647` derives the provider response shape from whether `targetLang` is an array, including arrays containing one target.
- `src/lib/ai/translationOutput.ts:32` validates coverage cardinality, while `src/lib/ai/translationOutput.ts:142` projects batch output to the exact requested languages and keys.
- `src/components/templates/main-app/projects/utils/translationsUtils.ts:319` handles file translation; the same module handles category and item translation at lines 444 and 529.
- `src/services/ai/projectPublicContent/translateProjectPublicContent.ts:60` handles project name, description, special-menu display name, and special note.
- `src/services/ai/businessCopy/localizeBusinessCopyResult.ts:89` handles batched store-level public-business copy, including requests without a project ID.

## End-to-end flow inventory

| Flow | Entry surface | Runtime action | Persistence |
| --- | --- | --- | --- |
| Upload/extraction with languages | Desktop/mobile menu upload | Menu-extraction job; not `/api/translations` | Extraction job writes the reviewed project result |
| Add language | Desktop language modal | `LANGUAGE_ADDITION` per translated file, then one project-public batch when needed | Desktop saves the project; cancellation saves completed work |
| Add language | Mobile Manage Languages | Same per-file and public-content calls | Project is persisted before success is shown |
| Retry a file | Desktop editor | `LANGUAGE_ADDITION` for every non-English target needing content | Completed results are saved; a failed request is not reported as success |
| Item translation | Desktop/mobile item editor | `ITEM_TRANSLATION` for one item and one target | Remains in the editor draft until the owner saves the item |
| Category translation | Desktop/mobile category editor | `ITEM_TRANSLATION` for one category and one target | Remains in the category draft until the owner saves |
| Repair language | Desktop Command Center; mobile Bulk Repair or Manage Languages | `LANGUAGE_ADDITION` per affected file/language | Manage Languages persists immediately; command/bulk flows use their existing project-save path |
| Project public content | Project details, special menus, add/repair flows | Batched `LANGUAGE_ADDITION` | Project document plus metadata summary where applicable |
| Business public copy | Desktop/mobile business-copy setup | Batched `LANGUAGE_ADDITION`, project ID optional | Caller persists accepted store copy |
| Public rendering | QR menu, menu page, OBP and related renderers | No provider call | Requested language, English fallback, then another available localized value |
| Owner transaction history | Desktop/mobile Transactions | Read-only AI operation history | Shows action, units, source, target count/codes, and compact result summary |

## Billing and accounting truth

The unit is an authenticated `/api/translations` request, not a language-selection gesture:

- `ITEM_TRANSLATION`: 1 unit for a one-item or one-category, one-target request.
- `LANGUAGE_ADDITION`: 3 units for a broader file, repair, project-public, or business-copy request.
- `IMAGE_TRANSLATION`: 5 units remains a supported historical/future action for OCR/translate/regenerate work; current text retry paths do not use it.
- Menu extraction is accounted as the separate `IMAGE_PROCESSING` pipeline and does not consume translation units.

Capacity is checked at `src/app/api/translations/route.ts:419` and reserved before the provider call at `src/app/api/translations/route.ts:433`, then the shared accounting finalizer records and settles the operation (`src/app/api/translations/route.ts:741`). Translation records retain compact `languageSummary`, `targetLanguages`, coverage counts, and client response counts rather than owner menu text or translated output.

## Security and failure boundaries

The translation route is authenticated, rate limited, body bounded to 1 MiB, Zod validated, permission checked, linked-outlet checked, and capacity checked before provider work. Language code/name pairs must match the fixed catalog and a batch can contain at most five targets. Linked outlets can translate only local-only categories and items. Store-level business-copy-only shapes may omit `projectId`; menu keys and project-only public keys may not. The shared `specialNote` key is treated as store copy when it appears in an otherwise business-copy-only request without a project ID, and the route never persists returned text by itself.

Provider output is parsed as bounded JSON. Recoverable fenced/object-fragment output is accepted; an invalid first response retries once. Unrecoverable parsing records `translation_provider_response_parse_failed` with the fixed `retry_once_then_return_translation_failed` policy and no raw response/menu text.

If the provider omits or invalidates a requested value, the operation records bounded partial coverage, but clients reject that map before persistence. Batch consumers also require every requested language object, every requested field, and coverage totals that match the requested language/field cardinality; extra provider keys are projected out. Owner history reports incomplete rows and the affected flow asks for review/retry instead of claiming full success.

## Documentation set

- [Specification](./multi-language-translation_spec.md)
- [Implementation](./multi-language-translation_impl.md)
- [Localization contract](./multi-language-translation_localization-contract.md)
- [Mobile support](./multi-language-translation_mobile-support.md)
- [Test cases](./multi-language-translation_test-cases.md)
- [Verification](./multi-language-translation_verification.md)
- [Firebase/cost](./multi-language-translation_firebase.md)
- [Owner help](./multi-language-translation_helpdoc.md)
- [Website boundary](./multi-language-translation_website.md)
- [Historical marketing boundary](./multi-language-translation_marketing.md)

## Release boundary

Source verification does not prove deployed provider credentials, real credit settlement, or customer-device rendering. Release approval still requires current production-readiness audit evidence, the External Certification Runbook, provider smoke for the target environment, translated menu flows on desktop and mobile, public renderer fallback/RTL evidence, customer browser/device QA, deploy evidence, and production-host smoke.

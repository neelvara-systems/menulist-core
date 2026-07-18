# Multi-Language Translation — Implementation

**Status:** Code-truth implementation record; not current launch certification
**Last updated:** July 15, 2026

## Architecture

```text
owner surface
  -> canonical English source + validated target(s)
  -> /api/translations
     -> auth -> rate limit -> bounded body -> Zod -> permission
     -> linked-outlet policy -> capacity check/reservation
     -> provider -> bounded response parse/projection
     -> operation accounting + remaining balance
  -> merge localized fields
  -> surface-specific project/store persistence
  -> owner transaction history (compact summaries)
```

Extraction-time translation is deliberately separate:

```text
upload surface -> /api/menu-extraction/jobs -> extraction worker -> review -> project save
```

It does not call `/api/translations` and remains under `IMAGE_PROCESSING` accounting.

## Source-of-truth files

| Responsibility | Source evidence |
| --- | --- |
| Language catalog | `src/data/languages.ts:1-95` |
| Six-language cap | `src/constants/languages.ts:18` |
| English source/default separation | `src/lib/localization/languagePolicy.ts:3-79` |
| API schema | `src/lib/validation/apiSchemas.ts:266`, `:298` |
| Route/security/accounting | `src/app/api/translations/route.ts:317` |
| Provider prompt | `src/app/api/translations/prompt.ts:3` |
| File/category/item merge logic | `src/components/templates/main-app/projects/utils/translationsUtils.ts:24`, `:319`, `:444`, `:529` |
| Desktop add/retry orchestration | `src/components/templates/main-app/projects/editorView/Editor.tsx:867`, `:1066` |
| Desktop language UI | `src/components/templates/main-app/projects/editorView/LanguageSelectorModal.tsx:32` |
| Mobile source/display separation | `src/components/mobile/screens/MobileMenuScreen.tsx:1643-1655` |
| Mobile add/repair/persistence | `src/components/mobile/sheets/ManageLanguagesSheet.tsx:104`, `:255`, `:391`, `:450` |
| Repair logic | `src/components/templates/main-app/projects/editorView/languageRepair.shared.ts:153`, `:227` |
| Project-public batching | `src/services/ai/projectPublicContent/translateProjectPublicContent.ts:60` |
| Translation response integrity | `src/lib/ai/translationOutput.ts:32`, `:124`, `:142` |
| Business-copy batching | `src/services/ai/businessCopy/localizeBusinessCopyResult.ts:89`, `:224` |
| Extraction language normalization | `src/app/api/menu-extraction/jobs/route.ts:220-231` |
| Owner history projection | `src/app/api/ai-operations/route.ts:67-85` |
| Browser history contract | `src/lib/ai/operationHistoryClientContract.ts:25`, `:55`, `:314` |

## Request contract

`TranslationRequestSchema` accepts:

- `inputJson`: 1-1000 entries, key length up to 240, trimmed value length up to 2000.
- `sourceLang`: one supported catalog language object.
- `targetLang`: one supported catalog language object or an array of 1-5 unique objects (the maximum non-source languages in a six-language project).
- `action`: `language_addition`, `image_translation`, or `item_translation`.
- `projectId`: normalized project ID when menu/project content is in scope; optional for business-copy-only requests.
- `fileId`: required, bounded Firestore-safe identifier.

Target codes must be unique and must differ from the source. Source/target codes must exist in `src/data/languages.ts`, and each supplied English language name must match its code so untrusted prompt labels cannot cross the boundary. The allowed key families are listed in the specification. The schema rejects unknown keys and rejects project/menu keys when no project ID exists.

The caller shape controls the response contract:

- Object target -> provider/client shape `{ translations: Record<string,string> }`.
- Array target, including one element -> `{ translationsByLanguage: Record<languageCode, Record<string,string>> }`.

`isBatchTranslationRequest()` in `src/lib/ai/translationOutput.ts:74` prevents the prior array-of-one mismatch.

## Route ordering

The route performs these stages in order:

1. `withAuth` session boundary.
2. SAFE_MODE check.
3. Shared AI rate limit (`src/app/api/translations/route.ts:332`).
4. 1 MiB bounded JSON read (`:336`).
5. Zod validation.
6. `PERMISSIONS.GENERATE_DESCRIPTIONS` check (`:376-381`).
7. Target entity extraction and linked-outlet policy (`:400-415`).
8. Capacity check and reservation (`:419-450`).
9. Sanitized prompt construction and provider call.
10. Bounded JSON parsing, one retry on invalid output, then exact-key normalization.
11. Compact input/language/coverage/client response summaries.
12. Shared operation accounting finalization (`:741`).
13. Response with normalized data, transaction metadata, and `remainingBalance`.
14. Reservation refund when failure happens before settlement.

Provider parse diagnostics use `translation_provider_response_parse_failed`. The fixed fallback policy is `retry_once_then_return_translation_failed`. Diagnostics record only bounded context, response lengths, fence/object-fragment presence, and usage summaries; raw menu text and raw provider output are excluded.

## Billing action derivation

`resolveTranslationBillingAction()` prevents a caller from under-declaring a broad request:

- A single category key or one item root with one target may remain `ITEM_TRANSLATION`.
- Multiple item roots, multiple targets, project-public fields, business-copy fields, and file-wide content resolve to `LANGUAGE_ADDITION` unless an explicit higher-cost `IMAGE_TRANSLATION` applies.

Current unit costs are sourced from `src/constants/AI/unitCosts.ts`:

- Item/category translation: 1 unit per request.
- File/public/business-copy language request: 3 units per request.
- Image translation: 5 units per request.

One owner action can issue several requests. Adding one target to two files plus project-public copy can consume three `LANGUAGE_ADDITION` operations.

## Merge behavior

`extractTranslatableStringsJSON()` includes only eligible content with an English source and a missing target. `mergeTranslations()` projects returned keys onto category/item/description/attribute fields. Unknown provider keys are discarded.

The route exposes its bounded `translationCoverage` summary with the normalized response. Menu and shared batch clients reject `hasPartialCoverage` maps before merging, so source fallbacks used for stable server accounting cannot be saved into target fields as false translations. Clients validate that coverage count equals the requested target count and that translated plus fallback values equal requested fields multiplied by requested targets. The shared batch boundary then projects only the requested language codes and requires an exact complete requested-key map for each one. The paid request remains auditable, and owner transaction history reports incomplete rows with review/retry guidance instead of a full-success summary.

Full Business Copy generation may still persist its valid canonical English result when the follow-on translation response is incomplete. Desktop and mobile then acknowledge that the copy was saved while some translations still need review; missing-translation repair remains available.

When an owner changes English source text, `clearStaleTranslations()` and `clearStaleCategoryTranslations()` blank old targets so renderers fall back safely and later translation can refill them.

Single item/category translation is a draft operation. The API operation is billed when generated, but the localized editor change becomes durable only when the owner saves that item/category.

## Desktop orchestration

`LanguageSelectorModal` normalizes the project list, labels English as Source, and prevents English removal. `Editor.handleLanguageToggle()`:

- computes added/removed languages from normalized sets;
- loops all new targets and all files with extracted data;
- passes linked-outlet item/category governance;
- stops on a real error instead of continuing to a false success;
- persists completed paid work after cancellation or a later failure;
- protects both English and the configured customer default from removal and blocks add/retry provider work when the permission is absent;
- batches missing project-public fields after file work;
- saves the project before reporting completion.

`Editor.onRetryTranslations()` retries all non-English project targets with `LANGUAGE_ADDITION`; it no longer misclassifies ordinary text retry as `IMAGE_TRANSLATION`.

## Mobile orchestration

`MobileMenuScreen` maintains two separate values:

- canonical `primaryLang` = English source for translation and stale detection;
- `preferredLanguage` = owner/customer display default.

`ManageLanguagesSheet` preserves that separation, enforces the six-language cap and permission, excludes inherited linked-outlet entities, and uses `persistMenuProjectImmediately()` before reporting add/repair success. If a later file or language fails, the sheet persists usable translations from earlier paid requests and reports a stopped/partial result. The shared repair helper carries only the last completed project snapshot, so a failed file's pre-translation clearing is never saved. Default/removal-only changes continue through the existing local/debounced project update path.

Item and category controls reject the English source as a target, hide/stop inherited translations, surface capacity failures, and do not claim full success after a partial failure.

Secondary project editor, project selector, special-menu, and mobile Business Copy provider actions follow the same `canGenerateDescriptions` permission visibility as the main editor. Restricted staff retain manual localized editing but are not shown an AI action that the server must reject.

## Linked-outlet governance

Governance is enforced in three layers:

1. Owner controls do not offer inherited item translation and show a connected-to-master message for inherited categories.
2. `TranslationGovernanceOptions` filters inherited/overridden items and categories from extraction and repair.
3. `getLinkedOutletPolicyBlockReason()` reloads project/master policy server-side before capacity/provider work.

Only `local-only` outlet entities can be translated. Project-public content remains project scoped. Business-copy-only requests have no entity IDs and use authenticated store permission/scope.

## Project and business copy

Project-public translation reads only an exact English value (legacy plain strings count as English) and only fills missing target values. A localized object without `en` is skipped rather than being mislabeled to the provider as English. Special-menu draft creation passes the real base project ID, while `fileId` distinguishes the draft batch.

Business-copy translation uses explicit reserved keys and may omit `projectId`. Callers no longer fabricate a store ID or `business-copy` string that fails project normalization. Because `specialNote` is valid in both business copy and project-public copy, an omitted-project request containing only business-copy keys is handled as store copy; every real project-public caller still supplies the real project ID.

Canonical business-copy generation reads English. For legacy records with no English value, missing-translation repair may use one existing localized value only to backfill `en`; subsequent translation work returns to the English source contract.

The shared batch client deduplicates targets, excludes the source, and bounds provider requests to five targets. This lets a legacy oversized stored language array degrade to the supported six-language policy instead of causing the whole owner action to fail API validation. Its response boundary requires one complete requested-key map for every bounded target and drops unrequested language/field keys.

## Extraction language boundary

`normalizeTargetLanguages()` maps request codes to `GlobalLanguagesList`, drops unknown codes, injects English, deduplicates, and slices to `MAX_LANGUAGES_PER_PROJECT`. This keeps extraction job metadata consistent with project policy without changing Cloud Function logic.

## Transaction history

Translation accounting writes compact:

- `languageSummary: { sourceLang, targetLangCount }`;
- `targetLanguages: [{ code }]`;
- `inputSummary` and `translationCoverageSummary` counts;
- a compact client response summary.

The owner history API admits `languageSummary`, and desktop/mobile detail views handle `ITEM_TRANSLATION`, `LANGUAGE_ADDITION`, and `IMAGE_TRANSLATION`. Compact records show source/targets without displaying a misleading “no rows” error; legacy records can still show stored row details.

## Public output

`resolveRenderLanguage()` selects URL language, configured display default, English, then the first available language. `getLocalizedText()` applies safe localized-field fallback. Direction comes from the language catalog. No public renderer invokes the provider.

## Deployment impact

This pass changes Next.js/app source and documentation only. It changes no Firestore rules, indexes, Storage rules, or Cloud Function logic, so no Firebase infrastructure deploy is required. Vercel deployment remains an explicit user-controlled step.

## Release boundary

This implementation record is not current launch certification. The External Certification Runbook still requires provider smoke, translated menu flows on desktop/mobile, public renderer fallback/RTL evidence, customer browser/device QA, deployed-environment evidence, and production-host smoke.

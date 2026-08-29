# Multi-Language Translation — Verification Record

**Audit date:** July 15, 2026
**Scope:** API, provider response, accounting, desktop, mobile, project/public copy, business copy, special menus, extraction, linked outlets, persistence, public rendering, transaction history, locales, and docs.

## Defects corrected

| Defect | Correction |
| --- | --- |
| Batch array with one target was parsed as single response | Response shape now follows `Array.isArray(targetLang)` |
| Schema rejected real project-public/business-copy keys | Added exact reserved-key allowlists; unknown keys still fail |
| Business copy fabricated invalid project IDs | Business-only payloads can omit `projectId`; callers omit it |
| Special-menu drafts appended an invalid project-ID suffix | Desktop/mobile pass the real base project ID |
| Mobile used customer display default as source | English source and display default are separate values |
| Desktop share/PDF export still opened in the first normalized language | Share export now uses the project/store preferred display language while translation continues to source English |
| English could be removable when another mobile default came first | English has an explicit immutable guard and Source label |
| Mobile add/repair showed success before durable save | Paid add/repair now await immediate project persistence |
| Repair touched inherited outlet content | Issue detection, clearing, and translation all receive item/category governance |
| Latin-script exact matches were treated as wrong | Exact equality alone no longer flags Latin-script languages |
| Desktop file retry used five-unit image translation | Ordinary text retry now uses `LANGUAGE_ADDITION` |
| Failed per-file operations could still end with success or discard earlier paid output | Error paths stop; desktop/mobile add and repair retain the last completed project snapshot with partial wording, excluding failed-file clearing |
| Item retry appeared for English/inherited content | Desktop/mobile controls reject source and inherited targets |
| Mobile category errors could look like “nothing missing” | Capacity/full/partial failures now have distinct outcomes |
| Extraction accepted unknown/oversized language sets | Server maps known codes, forces English, deduplicates, caps at six |
| Translation trusted caller-supplied language labels and oversized batches | Schema now requires catalog-backed code/name pairs and at most five batch targets |
| Legacy oversized stored language arrays could make a valid owner action fail the stricter schema | Shared batch callers deduplicate, exclude the source, and bound targets to the supported five-target request |
| Project-public copy could label a non-English localized fallback as English | Provider payloads now require an exact `en` value; legacy plain strings remain canonical English |
| Project/special-menu/business-copy AI controls were visible to restricted staff | Secondary provider controls now follow `canGenerateDescriptions`; manual localized editing remains available |
| Provider partial output could be merged as translated source fallbacks | The route exposes bounded coverage; clients reject partial maps before persistence and history reports incomplete rows |
| A malformed batch success could omit one target/key or report impossible coverage totals | Shared client projection now requires every requested target and key, drops extras, and checks coverage cardinality before merge |
| Full Business Copy generation could silently lose follow-on translations | Valid English copy is retained, while desktop/mobile explicitly say some translations still need review |
| Mobile bulk repair could save a partial file but report zero updates | Partial saved output now reports at least one update |
| Compact translation history lost source details | Owner projection/client contract admit `languageSummary` |
| Compact transaction summaries showed raw target codes | Shared desktop/mobile owner summaries now resolve catalog-backed language names such as `French (fr)` |
| Item translation lacked desktop/mobile detail rendering | All three translation action types use language detail views |
| Owner/website copy said first language was source, promised “one-click” output, or implied translation needed no review | Active locale overrides and docs now describe English source, configurable display default, plan/credit limits, and owner review accurately |
| Upload/setup Add Language retained a removed target as its hidden selected value | The transient selector is explicitly controlled empty, so removed targets can be selected again |
| Fixed setup continuation covered language chips at a common desktop viewport | Uploaded-file setup reserves bottom clearance so pointer language actions and Continue remain distinct |

## Source evidence reviewed

- `src/app/api/translations/route.ts`
- `src/app/api/translations/prompt.ts`
- `src/lib/validation/apiSchemas.ts`
- `src/lib/ai/translationOutput.ts`
- `src/components/templates/main-app/projects/generateTranslations.ts`
- `src/components/templates/main-app/projects/utils/translationsUtils.ts`
- `src/components/templates/main-app/projects/editorView/Editor.tsx`
- `src/components/templates/main-app/projects/editorView/LanguageSelectorModal.tsx`
- `src/components/templates/main-app/projects/editorView/languageRepair.shared.ts`
- Desktop/mobile item, category, command, bulk, language, special-menu, transaction, and extraction surfaces
- Project-public and business-copy services
- Public localization/render helpers and active locale JSON
- AI accounting, capacity, history projection, and presentation helpers

## Required automated gates

Run from repository root:

```bash
npx tsx scripts/verification/test-translation-output-boundary.ts
npx tsx scripts/verification/test-ai-operation-history-query.ts
npm run verify:ai-accounting
npm run verify:dependency-freeze
npm run docs:check-links
npx tsc --noEmit
git diff --check
```

Also parse every active MenuList locale JSON and run targeted lint on touched TypeScript/TSX files when the repository lint command supports file arguments.

## July 15, 2026 execution results

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | Pass |
| Targeted Next lint for all translation-touched TypeScript/TSX | Pass, no warnings/errors |
| `npm run test:translation-output-boundary` | Pass |
| `npm run test:ai-operation-history-query` | Pass |
| Business-copy repair and coverage focused tests | Pass |
| Shared description, new-item metadata, and business-copy output schemas | Pass |
| `npm run verify:ai-accounting` | Pass, including all adjacent AI regression suites |
| `npm run verify:menulist-api-tenant-safety` | Pass |
| `npm run verify:public-business-truth` | Pass, including nested-store/menu-change/drift/extraction-learning tests |
| `npm run verify:dependency-freeze` | Pass |
| 52 MenuList locale JSON files | Parse pass |
| `git diff --check` | Pass |
| `npm run docs:check-links` | Exit 0, 0 broken links; 27 unrelated uppercase video-artifact naming warnings remain in the current worktree |
| `npm run verify:agent-readiness` | Pending repository-wide: it expects the production-readiness audit to say 0 naming violations, but the current video artifacts produce the 27 warnings above |

## Regression assertions

- Array-of-one batch detection returns true.
- Single target object detection returns false.
- Menu entity key schemas pass; empty/unknown/prototype-like inputs fail.
- Project-public keys pass with a valid project ID.
- Business-copy keys pass without a project ID.
- Project-public/menu keys fail without a project ID.
- Duplicate targets and source-equal targets fail.
- Unexpected provider response keys do not cross the output boundary.
- Batch output is accepted only when every requested target has every requested key; unrequested targets/keys are dropped.
- Coverage target count and translated-plus-fallback totals must match the original request cardinality.
- Partial provider coverage is exposed as bounded metadata and rejected by clients before translated-field persistence.
- Owner transaction history reports incomplete translation rows instead of full-success copy.
- Project-public translation does not treat a localized object lacking `en` as English source text.
- Legacy oversized caller lists are bounded before the five-target batch schema.
- Owner operation rows admit compact `languageSummary` and omit unexpected raw fields.
- English is present after language normalization and cannot be removed by desktop/mobile handlers.
- Mobile Manage Languages preserves the outlet-language subset. When every
  outlet-active language is already on the menu, the add-language picker is
  disabled and localized Language & Region guidance replaces a generic empty
  result; no global language is admitted merely to populate the control.
- Extraction target normalization uses known catalog codes and `MAX_LANGUAGES_PER_PROJECT`.
- Ordinary text retry contains no `IMAGE_TRANSLATION` action.
- Desktop/mobile details include `ITEM_TRANSLATION`.
- Upload/setup Add Language is controlled empty between choices and the fixed
  Continue action retains enough bottom clearance to leave language chips
  pointer-operable.

## Manual QA matrix

| Surface | Case | Expected |
| --- | --- | --- |
| Desktop Languages | Add one target to one-file menu | Progress, translated menu/public fields, saved project, separate transaction rows |
| Desktop Languages | Cancel after first of several files | Completed work saved; partial/cancel wording; no full-success toast |
| Desktop Retry | Retry a file with two targets | English source, both targets considered, 3 units/request, no image-translation row |
| Mobile Manage | Default language is non-English | Screen opens in default; add/repair still sources English |
| Mobile Manage | Add at six-language cap | Add controls disabled; no provider request |
| Item desktop/mobile | Refresh target | Draft changes; durable only after Save; 1-unit transaction |
| Category desktop/mobile | Partial provider failure | Partial warning or failure; no “nothing missing” false result |
| Linked outlet | Inherited item/category | Translation control absent/blocked; no provider/credit call |
| Linked outlet | Local-only item/category | Translation succeeds and persists through normal save |
| Project public | Exactly one missing target | Array-of-one batch response merges correctly |
| Business copy | No project ID | Authenticated store-scoped request succeeds |
| Special menu create | Multiple project languages | Real base project validates; localized draft fields are returned |
| Extraction | Unknown codes and more than six inputs | Unknowns dropped; English first; at most six stored |
| Transactions | New item/language operation | Source and target(s) visible; no misleading empty-row error |
| Public menu | Missing requested localized field | Safe English/fallback text; no raw object or technical error |
| RTL public menu | Arabic/Hebrew | Direction/layout verified on target devices |

## External/pending evidence

Code/source gates cannot certify:

- deployed Gemini credentials/model access;
- actual paid balance reservation/settlement in the target Firebase project;
- authenticated desktop/mobile flows with production tenant/outlet data and rules behavior;
- rendered public menu output on real LTR/RTL browsers and devices;
- Vercel deployment or production-host smoke.

Keep these pending in the External Certification Runbook until the owner runs them in the target environment.

## Launch boundary

This record is source-verified feature evidence, not standalone production deployment approval. It is not current launch certification. Release clearance requires translated menu flows, provider smoke, public renderer fallback/RTL evidence, customer-menu browser/device QA, deploy evidence, and production-host smoke.

# Multi-Language Translation — Specification

**Status:** Implemented source contract; not current launch certification
**Last updated:** July 15, 2026

## Purpose

MenuList prepares owner-reviewable localized text for structured menu content and supported public-business fields. It does not promise perfect translation, universal coverage, instant completion, or automatic publication.

## Language authority

1. English (`en`) is always present and cannot be removed.
2. English is the source for translation, generation, repair, stale-translation clearing, and first content fallback.
3. `project.defaultLanguage` and store display preference choose what an owner or customer sees first only.
4. The project language set is deduplicated and capped at six.
5. The current catalog contains 80 language definitions and five RTL definitions.

The executable authority is `src/lib/localization/languagePolicy.ts:3-79`, `src/constants/languages.ts:18`, and `src/data/languages.ts:1-95`.

## Functional requirements

| ID | Requirement | Current behavior |
| --- | --- | --- |
| TR-01 | Add a project language from desktop and mobile | Normalizes English first, translates eligible files, fills missing project-public fields, then saves |
| TR-02 | Remove a language safely | English is never removable; current default remains protected in mobile management |
| TR-03 | Keep display default independent | Owners may select another default without changing the English translation source |
| TR-04 | Translate file content | Categories, item names, descriptions, and attribute names are translated only when a source value exists and a target value is missing |
| TR-05 | Translate a single item/category | Uses the one-unit `ITEM_TRANSLATION` action and updates only the editor draft |
| TR-06 | Repair missing or likely wrong content | Rebuilds eligible target fields from English and avoids treating unchanged Latin-script brand/dish names as automatically wrong |
| TR-07 | Translate project-public fields | Supports `name`, `description`, `specialMenuDisplayName`, and `specialNote` |
| TR-08 | Translate business-public copy | Supports descriptor, known-for, note, tagline, meta title/description, PWA short name, and keywords without fabricating a project ID |
| TR-09 | Preserve linked-outlet authority | Only local-only outlet items/categories may be translated or repaired; inherited content stays connected to the master |
| TR-10 | Show truthful owner history | Desktop and mobile transaction details include item, language-addition, and image-translation actions plus compact source/targets |
| TR-11 | Support extraction-time localization | Upload jobs normalize known languages, force English, and cap the result at six before job creation |
| TR-12 | Fail without false success | Invalid response shapes, permission/capacity failures, and failed translations do not produce success messages; completed paid work is retained where the flow supports partial progress |

## Content scope

### Menu entities

- Category name: `<categoryId>_c`
- Item name: `<itemId>_i`
- Item description: `<itemId>_d`
- Attribute name: `<itemId>_<attributeId>_a`

### Project-public fields

- `name`
- `description`
- `specialMenuDisplayName`
- `specialNote`

### Business-public fields

- `descriptor`
- `keywords`
- `knownFor`
- `metaDescription`
- `metaTitle`
- `pwaShortName`
- `specialNote`
- `tagline`

Unknown generic keys are rejected. A valid project ID is required for menu and project-public keys; business-public-only requests can use the authenticated store scope without a project ID.

## Flow requirements

### Add language

1. Validate permission and maximum count.
2. Normalize the language list with English first.
3. Translate each file that contains eligible structured content.
4. Translate missing project-public fields in a batched request.
5. Save the project and metadata summary where applicable.
6. Show the result only after persistence succeeds.

Each file/public batch is separately billed. Partial cancellation or mid-flow capacity failure can therefore leave a truthful partial result; the UI must say that completed work was saved rather than claiming full completion.

### Item/category editing

Single-entity translation changes the open draft. The owner must still press Save. The control is unavailable for English, unavailable without generation permission, and unavailable for inherited linked-outlet entities.

### Repair

Issue detection considers only fields with an English source. For distinct-script targets, Latin-only text may be flagged; exact Latin-script matches are not automatically wrong because dish names and brands may intentionally remain unchanged. Existing target text is cleared only for eligible local content before retranslation.

### Extraction

Menu extraction remains a separate upload/job pipeline. It is not a call to `/api/translations`, and its accounting action is `IMAGE_PROCESSING`. The server accepts only known language codes, restores English, deduplicates, and caps the stored job language list.

## Public rendering

The selected URL/customer language wins when available. Otherwise renderers use the configured default and localized text helpers fall back to English before another available value. Missing translation must show safe source text or less content, never a technical error or raw localization object.

RTL claims require actual renderer and device evidence. Code-level direction metadata alone is not release certification.

## Security, cost, and privacy

- Authentication: `withAuth()`.
- Permission: `PERMISSIONS.GENERATE_DESCRIPTIONS`.
- Abuse control: shared AI rate limit before provider work.
- Validation: bounded body, exact action enum, known key families, catalog-backed code/name pairs, at most five batched targets, unique targets, and source/target mismatch rejection.
- Tenant isolation: project scope is normalized and checked against session store/tenant; linked-outlet policy is checked before capacity/provider work.
- Accounting: reserve before provider; mandatory settlement after a valid response; safe refund on pre-settlement failure.
- Privacy: operation history stores summaries and counts, not full translated maps or raw prompt text.

## Non-goals

- Human-translation certification.
- Automatic publication without owner review.
- Translation memory, glossary administration, or owner-facing quality configuration.
- Cross-project translation cache or a new event collection.
- A new Cloud Function or scheduled translation worker.
- A standalone public translation landing page.

## Acceptance criteria

- An array containing one target is parsed as a batch response.
- Project-public and business-copy keys pass validation; unknown keys fail.
- A business-copy-only request can omit `projectId`; menu/project keys cannot.
- English cannot be removed even if the display default is another language.
- Desktop and mobile use English for add, retry, repair, category, item, and extraction comparison flows.
- Inherited outlet content is excluded in UI, client repair, and server policy.
- Mobile paid add/repair does not report success before project persistence.
- All three translation action types render in owner transaction details.
- Source gates, TypeScript, locale parsing, docs links, and focused translation/accounting tests pass.

## Release boundary

This specification is not current launch certification. The External Certification Runbook must still provide target-provider evidence, translated menu flows on desktop/mobile, public renderer fallback/RTL evidence, customer-device QA, deploy evidence, and production-host smoke.

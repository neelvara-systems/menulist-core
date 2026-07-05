# Multi-Language Translation — Firebase Cost Tracking

**Feature:** Menu Translation
**Status:** Controlled owner testing ready after June 2026 server-governance hardening
**Last Updated:** July 1, 2026
**Priority:** MEDIUM — Gemini API cost per translation batch.

---

## Summary

- **Collections Used:** `projects/{tId}/{sId}` (projectsData)
- **Storage Buckets:** None
- **Cloud Functions:** None (uses API route)
- **Estimated Monthly Cost:** **Low** — Text-only Gemini calls

---

## Firestore Operations

### Reads

| Operation                    | Collection                         | Trigger                     | Frequency   | Docs Read | Indexed?   | Notes                                                               |
| ---------------------------- | ---------------------------------- | --------------------------- | ----------- | --------- | ---------- | ------------------------------------------------------------------- |
| Load project for translation | `projects/{tId}/{sId}/{projectId}` | User opens translation view | Per request | 1         | Direct doc | Reads full project to get items/categories for translation context. |
| Validate linked-outlet translation policy | `projects/{tId}/{sId}/{projectId}`, `stores/{masterStoreId}` | Project-scoped `/api/translations` request | Per AI translation request with `projectId` | 1-2 | Direct docs | Confirms the project exists in the caller's store path and blocks inherited linked-outlet item/category translations before Gemini work. |

### Writes

| Operation               | Collection                         | Trigger                     | Frequency          | Docs Written | Fields                                                           | Notes                                                       |
| ----------------------- | ---------------------------------- | --------------------------- | ------------------ | ------------ | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| Save translated content | `projects/{tId}/{sId}/{projectId}` | After translation completes | Per language batch | 1            | files[].extractedData.data.items[].name/description per language | Merge update with translated text in language-keyed fields. |
| Update language list    | `projects/{tId}/{sId}/{projectId}` | When adding new language    | Per language add   | 1            | languages[] array                                                | Adds language code to project's supported languages.        |

### Deletes

| Operation | Collection | Trigger | Frequency | Docs Deleted | Soft/Hard | Notes                                                                                    |
| --------- | ---------- | ------- | --------- | ------------ | --------- | ---------------------------------------------------------------------------------------- |
| None      | —          | —       | —         | —            | —         | Translations overwrite in place. Language removal clears fields but doesn't delete docs. |

---

## Cost Estimate (per 1000 translation batches/month)

| Resource         | Operations/month | Unit Cost    | Monthly Cost     |
| ---------------- | ---------------- | ------------ | ---------------- |
| Firestore Reads  | 1,000            | $0.06/100K   | $0.00            |
| Firestore Writes | 2,000            | $0.18/100K   | $0.00            |
| **Gemini API**   | 1,000 calls      | ~$0.001/call | **~$1.00**       |
| **Total**        |                  |              | **~$1.00/month** |

---

## DAL Functions Used

| Function        | File                                 | Operation Type       |
| --------------- | ------------------------------------ | -------------------- |
| `updateProject` | `src/database/projects/index.ts:382` | Write (setDoc merge) |

## API Routes & Their Firebase Impact

| Route               | Method | Firebase Ops          | Rate Limited? | Notes                                                                 |
| ------------------- | ------ | --------------------- | ------------- | --------------------------------------------------------------------- |
| `/api/translations` | POST   | 1 permission read + 1-2R + 0W when `projectId` is supplied; 1 permission read + 0W without project context | Yes (20/min)  | Returns translated text. Calls require `canGenerateDescriptions` before linked-outlet policy, capacity, Gemini, or accounting. Client saves accepted text via `updateProject`. |

## Failure Diagnostics

`src/components/templates/main-app/projects/utils/translationDiagnostics.ts` is a client-side secure logging helper only. Translation API client failures, empty translation responses, file/category/item failures, and desktop retry catches log normalized failure codes plus bounded project/file/language/action presence, length, response status, and translation-key counts. `src/app/api/translations/route.ts` route-side Gemini parse failures also keep response text diagnostics to length/presence summary metadata only.

These diagnostics add no Firestore read/write, Storage operation, Cloud Function call, API route, provider call, cache invalidation, index, rule, durable event stream, or owner-facing setting. They do not log raw menu text, translated strings, prompt/input JSON, language names, project names, file names, provider responses, status text, browser/provider error objects, full project/store/file payloads, `rawTextLength` fields, or raw provider previews.

July 5 provider-response parse diagnostics are Firebase-cost neutral and can reduce provider spend for recoverable formatting. Fenced JSON and extractable object-fragment JSON can be recovered before the retry call; unrecoverable first responses still retry once, and unrecoverable retry responses still return the existing generic translation failure under the fixed `retry_once_then_return_translation_failed` policy. AI accounting input and local success/error logs now store bounded input, language, coverage, request, response, and transaction summaries instead of raw prompt input/language payloads, raw coverage arrays, or normalized translation output. The capped `translation_provider_response_parse_failed` diagnostic adds no Firestore reads/writes/deletes, Storage operations, extra provider calls beyond the existing retry policy, AI accounting writes, credit consumption, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

June 30 prompt-input normalization is cost-neutral. `TranslationRequestSchema` now rejects translation identifiers over 240 characters, translation values over 2000 characters, and maps over 1000 entries before provider work. The prompt builder serializes a sanitized bounded copy of values while preserving original keys for response mapping. This changes no Firestore read/write/delete count, Storage operations, Cloud Function calls, provider calls beyond existing valid requests, cache invalidations, rules, indexes, project schema, owner settings, Firebase deploy requirement, or Vercel deploy action.

July 1 permission hardening adds the existing store permission read before translation policy, capacity, provider, and accounting work. Rejected users do not reach project/outlet reads, Gemini calls, operation writes, credit consumption, rules, indexes, Cloud Functions, Firebase deploy requirement, or Vercel deploy action.

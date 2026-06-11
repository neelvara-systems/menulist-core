# Multi-Language Translation — Firebase Cost Tracking

**Feature:** Menu Translation
**Status:** Controlled owner testing ready after June 2026 server-governance hardening
**Last Updated:** June 11, 2026
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
| `/api/translations` | POST   | 1-2R + 0W when `projectId` is supplied; 0R + 0W without project context | Yes (20/min)  | Returns translated text. Project-scoped calls validate tenant/store and linked-outlet policy before Gemini. Client saves accepted text via `updateProject`. |

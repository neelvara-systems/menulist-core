# Maps Place Check - Test Cases

## Access

| Case | Expected |
| --- | --- |
| Unauthenticated callable request | `unauthenticated` |
| Store-scoped user checks another store | `permission-denied` |
| Platform user checks any store | Allowed |
| Missing tenant/store/business name | `invalid-argument` |
| Non-English `languageCode` | `invalid-argument` |

## Guardrails

| Case | Expected |
| --- | --- |
| Feature flag disabled | `failed-precondition` |
| SAFE_MODE active | `unavailable` |
| Rate limit exceeded | `resource-exhausted` |
| Provider returns no grounding metadata | `no_grounded_result` and no source list |

## Output

| Case | Expected |
| --- | --- |
| Grounded result contains Maps chunks | Sources returned with title, URI, and optional place ID |
| Response text contains JSON object | Proposed facts parsed into bounded fields |
| Response text is not valid JSON | Sources still returned; proposed facts empty |
| Grounded content returned | `attributionRequired: true` |

## Write Safety

| Case | Expected |
| --- | --- |
| Successful check | No Firestore writes |
| Address differs | Returned as proposed fact only |
| Hours differ | Returned as proposed fact only |
| Reviews/ratings present | Not persisted and not used as canonical truth |

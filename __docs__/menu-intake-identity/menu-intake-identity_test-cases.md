# Menu Intake Identity — Test Cases

| ID | Scenario | Expected |
| --- | --- | --- |
| MI-01 | Empty project, clear menu with business name | Continue; identity returned as suggestion. |
| MI-02 | Existing project, same business name and phone | Continue or notice as update. |
| MI-03 | Existing project, different business name and different phone | Confirmation required before extraction. |
| MI-04 | Existing project, different name only with low confidence | Continue without blocking. |
| MI-05 | Upload contains one menu page and one interior photo | Continue with notice; only valid menu page is sent to extraction; ignored file is deleted from temporary storage. |
| MI-06 | Upload contains no menu/list content | Block before full extraction. |
| MI-07 | Partial menu detected | Notice; owner can continue or upload more. |
| MI-08 | API request uses project outside session tenant/store | 403 Forbidden. |
| MI-09 | Rate limit exceeded | 429 before Gemini call. |
| MI-10 | Gemini returns malformed JSON | Safe fallback: continue with low-confidence unknown identity. |
| MI-11 | API request uses a file URL outside the configured storage bucket | File is not fetched by the preflight. |
| MI-12 | SAFE_MODE is active | Request stops before Gemini work. |
| MI-13 | Existing project mismatch, owner chooses Create new menu on desktop | New project is created; uploaded files are not deleted; processing job uses the new project ID. |
| MI-14 | Existing project mismatch, owner chooses Create new menu on mobile | New project is created and selected/refreshed; processing job uses the new project ID. |
| MI-15 | Same business, mostly different menu structure | Confirmation required before merging into existing project. |
| MI-16 | Same business, seasonal/limited menu | Confirmation explains it may be a special menu; owner can add anyway or create a separate menu. |
| MI-17 | Same brand, different outlet address or phone | Confirmation required before adding to current outlet project. |
| MI-18 | Business name, phone, address, type, currency, or languages extracted | Returned as suggestion-only fields; no automatic store/project truth overwrite. |
| MI-19 | Owner continues current project and accepts selected business details | Only selected store fields are written; skipped fields stay unchanged. |
| MI-20 | Owner skips detected business details | Extraction continues with no store identity write. |
| MI-21 | Low-confidence identity result | No business detail acceptance dialog is shown. |
| MI-22 | Owner chooses Create new menu from mismatch prompt | Current store identity is not updated from the upload. |

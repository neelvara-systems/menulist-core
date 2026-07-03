# Menu Intake Identity — Firebase Cost

**Status:** Implemented  
**Last Updated:** June 30, 2026

## Operations

| Operation | Collection | Reads | Writes | Notes |
| --- | --- | ---: | ---: | --- |
| Load project context | `projects/{tId}/{sId}/{projectId}` | 1 | 0 | Needed only for authenticated dashboard/mobile upload. |
| Load store context | `stores/{sId}` | 1 | 0 | Used to compare name, phone, address, business type. |
| Upload temporary files | Firebase Storage | 0 | existing | Existing upload step still happens before AI can inspect server-side file bytes. Cancelled preflight decisions delete those temporary files. Ignored non-menu files are deleted before extraction. |
| Create extraction job | `menuImageProcessingJobs` | existing | existing | No change to existing extraction write count. |
| Save extracted menu | `projects/{tId}/{sId}/{projectId}` | existing | existing | No automatic identity overwrite. |
| Accept detected business details | `stores/{sId}` | 0 | 0 or 1 | Optional write only when the owner saves selected store identity suggestions. |

## AI Cost

One additional compact Gemini call per upload batch. The call is bounded and returns JSON with identity, file validity, completeness, likely owner intent, truth risk, structure assessment, and confidence.

The expected extra cost is justified when it prevents a wrong-project extraction or stops non-menu/blurry uploads before full extraction.

## Cost Guardrails

- Analyze a bounded file count.
- Use JSON response mode.
- Use rate limiting before Gemini.
- Do not run the preflight repeatedly for the same already-confirmed upload within a single UI action.
- Do not write suggested identity fields unless the owner explicitly chooses `Save selected`.
- June 30 browser request-policy hardening is Firebase-cost neutral. The shared desktop/mobile preflight helper now submits `POST /api/menu-intake-identity` with same-origin credentials, `no-store` cache policy, and manual redirect handling before bounded response parsing. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, job writes, rules, indexes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action.

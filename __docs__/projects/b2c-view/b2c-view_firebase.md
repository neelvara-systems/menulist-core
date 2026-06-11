# B2C View (Customer Preview) — Firebase Cost Tracking

**Feature:** Visual Menu Builder & Theme Customization (B2C Preview)
**Status:** Controlled owner testing ready after June 2026 linked-outlet publish hardening
**Last Updated:** June 11, 2026
**Priority:** MEDIUM — Preview-only. Reads project data, writes theme config.

---

## Summary

- **Collections Used:** `projects/{tId}/{sId}` (projectsData)
- **Storage Buckets:** `MenuListAi/project/assets/{projectId}` (brand assets like logo, background)
- **Cloud Functions:** None
- **Estimated Monthly Cost:** **Very Low** — Theme saves are infrequent

---

## Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Docs Read | Indexed? | Notes |
|-----------|-----------|---------|-----------|-----------|----------|-------|
| Load project for preview | `projects/{tId}/{sId}/{projectId}` | User opens B2C preview tab | Per preview session | 1 | Direct doc | Same project doc as editor. Full data with items, categories, config. |

### Writes

| Operation | Collection | Trigger | Frequency | Docs Written | Fields | Notes |
|-----------|-----------|---------|-----------|-------------|--------|-------|
| Save/publish theme/design config | `projects/{tId}/{sId}/{projectId}` | User saves design changes | Per design save | 1 | config.design (home, menu, brand), publish metadata | Desktop B2C and mobile design publish through `publishProject()`. Linked outlets route through `/api/projects/outlet-save` so master policy controls theme, brand, and layout overrides before cache invalidation. |
| Upload brand assets | Storage | User uploads logo/background | Per asset upload | 0 Firestore | — | Direct to Storage, URL saved in project config. |

### Deletes

None.

---

## Firebase Storage

| Operation | Path Pattern | Trigger | Size | Notes |
|-----------|-------------|---------|------|-------|
| Upload background image | `MenuListAi/project/assets/{projectId}/background` | User sets background | 0.5-3MB | JPEG compressed |
| Upload logo | `MenuListAi/project/assets/{projectId}/logo` | User sets logo | 0.1-1MB | PNG/JPEG |

---

## Cost Estimate (per 1000 design saves/month)

| Resource | Operations/month | Unit Cost | Monthly Cost |
|----------|-----------------|-----------|-------------|
| Firestore Reads | 2,000 | $0.06/100K | $0.00 |
| Firestore Writes | 1,000 | $0.18/100K | $0.00 |
| Storage | 500MB | $0.026/GB | $0.01 |
| **Total** | | | **~$0.01/month** |

---

## DAL Functions Used

| Function | File | Operation Type |
|----------|------|---------------|
| `updateProject` | `src/database/projects/index.ts:382` | Write (setDoc merge) |
| `publishProject` | `src/database/projects/index.ts` | Publish write + public cache invalidation |
| `/api/projects/outlet-save` | `src/app/api/projects/outlet-save/route.ts` | Linked-outlet server validation/write |
| `uploadBase64ToStorage` | `src/database/storage/uploadBase64ToStorage.ts` | Storage upload |

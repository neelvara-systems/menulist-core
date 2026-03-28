# B2B View (JSON Editor) — Firebase Cost Tracking

**Feature:** Raw Data JSON Editor for Internal/B2B Use  
**Status:** ✅ Production Ready  
**Last Updated:** February 7, 2026  
**Priority:** LOW — Internal tool. Read-only JSON view with occasional edits.

---

## Summary

- **Collections Used:** `projects/{tId}/{sId}` (projectsData)
- **Storage Buckets:** None
- **Cloud Functions:** None
- **Estimated Monthly Cost:** **Negligible**

---

## Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Docs Read | Indexed? | Notes |
|-----------|-----------|---------|-----------|-----------|----------|-------|
| Load project data | `projects/{tId}/{sId}/{projectId}` | User opens B2B view | Per view open | 1 | Direct doc | Same project doc. Uses react18-json-view for display. |

### Writes

| Operation | Collection | Trigger | Frequency | Docs Written | Fields | Notes |
|-----------|-----------|---------|-----------|-------------|--------|-------|
| Save JSON edits | `projects/{tId}/{sId}/{projectId}` | User saves from JSON editor | Rare (power users only) | 1 | Full merge update | Direct JSON editing. Uses `updateProject()`. |

### Deletes

None.

---

## Cost Estimate

Negligible — this is a read-mostly internal tool. Less than $0.01/month.

---

## DAL Functions Used

| Function | File | Operation Type |
|----------|------|---------------|
| `updateProject` | `src/database/projects/index.ts:382` | Write (setDoc merge) |

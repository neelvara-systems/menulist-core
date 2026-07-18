# Menu Setup Progress — Firebase Cost Tracking

> **Version:** 1.0
> **Last Updated:** July 7, 2026

## Collections Affected

| Collection | Operation | When | Cost |
| --- | --- | --- | --- |
| `projects/{tId}/{sId}/{projectId}` | READ (1) | Desktop dashboard selected project load | Shared with Menu Check |
| `stores` | READ (0 additional) | Uses already-loaded `storeDetails` | $0.00 |
| Mobile selected project | READ (0-1) | Uses `MobileProjectsProvider` selected project cache; More root may eager-load the selected project if it has not been cached yet | Shared mobile provider path |

## New Fields

None.

## New Collections

None.

## New API Routes

None.

## New Cloud Functions

None.

## Writes

None.

Menu Setup Progress does not persist progress. It computes status from existing project/store truth:

- project files, item data, menu languages, and public menu text
- project `lastPublishedAt`
- store `starterActivationSignals`
- store `menuPresence`
- store `socialMedia`
- store `publicPresence`

## Cost Notes

The dashboard uses one selected-project read so Menu Setup Progress and Menu Check can share the same project document. This avoids adding a second read beside the existing Menu Check dashboard behavior.

Mobile uses the existing `MobileProjectsProvider` selected-project path. The Menu and Share cards reuse already-loaded selected project data. The More shortcut may cause the provider to eager-load the selected project on the More root, but it does not add a separate DAL path, API route, write, collection, listener, or backend job.

---

**Document Signature:** Firebase Cost Analysis
**Created:** July 7, 2026

# MenuList Activation Concierge - Firebase Cost Plan

**Status:** Runtime foundation cost verified
**Created:** June 24, 2026

## Cost Principle

Do not create a new event stream for P0. Reuse existing starter activation fields on `stores/{storeId}` and existing `menuPresence` confirmations.

## Existing Writes

| Operation | Existing target | Cost behavior |
| --- | --- | --- |
| Public draft upload/link | `publicMenuDrafts/{draftId}` + `menuImageProcessingJobs/{jobId}` | Existing create-menu path. |
| Draft completion | `publicMenuDrafts/{draftId}` | Existing extraction worker update. |
| Claim/publish | `tenants`, `stores`, `projects`, `platformSummary`, draft update | Existing claim transaction. |
| Copy/share/QR/Menu Kit signal | `stores/{storeId}.starterActivationSignals` | Existing starter signal write; should dedupe per signal/session where possible. |
| Presence confirmation | `stores/{storeId}.menuPresence` plus matching starter signal | Existing Presence Monitor write. |

## Existing Contract

`__docs__/public-menu-entry/public-menu-entry_firebase.md:102` documents starter distribution activation signals. It states that distribution actions are recorded on the existing store document, not in a new collection.

## P0 Runtime Cost Target

Activation Concierge should add no new Firestore collections for first implementation.

Expected additional cost:

| Action | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Render success checklist | 0-1 | 0 | Use existing session/store context when available. |
| Copy link | 0 | 0-1 | Existing starter signal write. |
| WhatsApp share started | 0 | 0-1 | Existing starter signal write. |
| QR download | 0 | 0-1 | Existing starter signal write. |
| Menu Kit download | 0 | 0-1 | Existing starter signal write. |
| Mark Google/Profile | 0 | 1 | Existing Presence Monitor write. |
| Mark Instagram | 0 | 1 | Existing Presence Monitor write. |
| Mark WhatsApp profile | 0 | 1 | Existing Presence Monitor write. |
| Render activation proof summary | 0 | 0 | `buildStarterActivationSummary()` uses already-loaded store fields. |

## Runtime Pass Result

The June 24, 2026 runtime pass did not add a collection, index, API route, listener, or scheduled function. It added a pure helper that reads the store object already present in the owner app and computes:

- two-action progress;
- MenuList-recorded action count;
- owner-confirmed external placement count;
- evidence labels for UI display.

## Summary Strategy

If SignalDesk needs activation visibility, write or update SignalDesk-owned outcome summary records from server-side bridge code. Do not read raw store/project trees from list screens.

Summary fields should be compact:

```ts
{
  storeId: number;
  projectId?: string;
  state: "published" | "one_surface_active" | "activated" | "stalled";
  signalCount: number;
  activatedAt?: Timestamp;
  proofPermissionStatus: "none" | "pending" | "approved" | "denied";
  updatedAt: Timestamp;
}
```

## Avoid

- Per-click Firestore event docs.
- Raw proof screenshots in Firestore.
- Raw owner contact values in SignalDesk summaries.
- New scheduled function for activation cleanup without first checking existing maintenance scheduler.
- New API route that only re-reads store context already loaded client-side.

## Indexes

No new index is required for P0 if the feature uses store-local fields and existing SignalDesk outcome summaries.

If a platform/admin report needs cross-store activation lists, create one capped daily summary collection and document the index before implementation.

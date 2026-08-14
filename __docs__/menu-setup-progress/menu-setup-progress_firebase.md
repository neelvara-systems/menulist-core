# Menu Setup Progress - Firebase and Scale

**Status:** Local source complete; scoped Firestore index deployment pending
**Last reviewed:** August 14, 2026

Location Launch Readiness has the same zero-incremental-write contract. The location context is derived from `storeDetails.isMaster` and `project.masterProjectId`, which are already loaded for current MenuList behavior. It adds no collection, field, index, rule, Function, listener, or provider operation.

## Read boundary

| Surface | Incremental behavior |
| --- | --- |
| Desktop dashboard | At most one selected-project document read when Menu Setup Progress or Menu Quality needs it; shared between both cards and deduped for 10 minutes. |
| Mobile Menu/Share/More | Reuses `MobileProjectsProvider` project list/selected-project cache; no setup-specific query. |
| Store/activation | Reuses already-loaded `storeDetails`; zero setup-specific read. |

The desktop read is not universally zero incremental: if Menu Quality is disabled and Menu Setup Progress is enabled, this feature is the reason the selected project is loaded. It remains one bounded current-project read, not a scan.

## Write boundary

The progress computation writes nothing. Existing owner actions keep their current costs:

- copied/share/downloaded starter action: one existing store update;
- presence confirmation/removal: one store read plus existing store and `storesSummary` transaction writes;
- project import/edit/publish: owned by existing project/extraction flows.

Acknowledged action and presence results update in-memory store context without another read. Removing an external presence confirmation deletes its matching starter action in the same existing transaction, so stale evidence does not keep completion true.

## Infrastructure

No new collection, document, listener, API route, Storage object/rule, Cloud Function, scheduler task, provider call, or dependency is introduced.

`stores.starterActivationSignals` is consumed only from the exact loaded store document; no runtime query filters or orders by the nested action map. Its automatic single-field index is therefore disabled in `firestore.indexes.json`. This keeps the stored activation evidence and all read/write behavior unchanged while avoiding nested-map index fanout on each acknowledged placement action.

The scoped Firestore index configuration must be deployed before this saving is live.

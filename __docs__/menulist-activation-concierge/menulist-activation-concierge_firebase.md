# MenuList Activation Concierge - Firebase and Scale

**Status:** Local source complete; scoped Firestore index deployment pending
**Last reviewed:** July 17, 2026

## Existing data

- `stores/{storeId}.starterActivationSignals.actions.{signal}`: allowlisted ISO timestamp.
- `stores/{storeId}.starterActivationSignals.lastSignalAt`: last acknowledged owner action time.
- `stores/{storeId}.menuPresence.{surface}`: current owner-confirmed external placement timestamp.
- `platformSummary/storesSummary.stores.{storeId}.menuPresence`: existing compact presence projection.

## Operations

| Action | Read | Write |
| --- | --- | --- |
| Copy/share/download starter signal | 0 | one existing store update |
| Confirm/remove external placement | one transaction store read | existing store + summary transaction writes |
| Build activation summary | 0 | 0 |
| Apply acknowledgement to UI | 0 | 0 |

The presence transaction derives eligible starter state from the authoritative store snapshot. Removal deletes the matching action within the same store write; there is no compensating operation. Typed acknowledgement projection removes the need for a post-write refresh read.

No new collection, rule, Storage object/rule, Function, scheduler, listener, provider call, or dependency is added.

The entire `starterActivationSignals` map is read only from an exact `stores/{storeId}` document and is never used in a Firestore filter or ordering. `firestore.indexes.json` disables its automatic single-field index so signal writes no longer fan out across nested action keys. A targeted child-field index should be added only if a future bounded query proves it is required.

The scoped Firestore index configuration must be deployed before this saving is live.

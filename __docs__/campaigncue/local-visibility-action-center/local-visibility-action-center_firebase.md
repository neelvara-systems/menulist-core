# Local Visibility Action Center - Firebase Contract

## Cost

The action center performs **zero additional Firebase operations**.

| Operation | Incremental cost |
| --- | --- |
| Action projection | 0 reads, 0 writes, 0 deletes |
| Action ordering | Browser/server memory only |
| Evidence display | Existing overview payload |
| Open related tab | 0 Firebase operations by the action center |
| Create visibility pack | Existing campaign creation contract only after explicit owner action |

## Reused Truth

- Business Brain from the existing workspace document
- bounded campaigns, source inputs, assets, and locations already returned by the overview
- existing campaign truth/freshness receipts
- existing asset Storage metadata, without downloading the object

## Rejected Storage Shapes

- no visibility-action collection
- no per-action completion document
- no external-profile snapshot collection
- no background freshness poller
- no search-result or ranking history
- no duplicated Business Brain fields

The canonical source document resolves an action. This avoids stale task documents, extra listeners, and write amplification.

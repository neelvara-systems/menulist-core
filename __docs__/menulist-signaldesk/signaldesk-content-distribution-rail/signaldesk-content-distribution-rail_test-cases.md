# SignalDesk Content Distribution Rail - Test Cases

**Status:** Initial coverage
**Date:** June 24, 2026

## Functional

| Case | Expected |
| --- | --- |
| Save content source | Creates or updates `signaldeskContentSources` through protected action API. |
| Create content asset | Writes canonical message, proof level, CTA, source, and status. |
| Generate drafts | Creates one draft per selected channel with pending approval. |
| Generate drafts from held asset | Fails with `Content asset is not ready`. |
| Approve draft | Moves draft to approved status. |
| Reject draft | Moves draft to rejected status. |
| Schedule unapproved draft | Fails with `Content draft must be approved before scheduling`. |
| Schedule approved draft | Creates or updates one calendar item and queues draft. |
| Record performance | Writes compact performance record. |
| Record owner signals | Also updates demand signal summary and control-room count. |

## Security

| Case | Expected |
| --- | --- |
| Unauthenticated API call | Blocked by `withAuth()`. |
| Invalid payload | Returns `Invalid input` and logs validation failure. |
| Client Firestore write | Denied by rules. |
| Content pause active | Mutating content rail actions fail with `Content distribution is paused`. |

## Verification

```bash
npm run verify:signaldesk
npx tsc --noEmit --incremental false --pretty false
firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "true"
```

# SignalDesk Operating Layer - Test Cases

**Status:** Implementation-ready
**Created:** June 24, 2026

## Functional

| Case | Expected |
| --- | --- |
| Open Mission route | `/signaldesk/mission` renders the Mission workspace. |
| Create daily mission | Writes one mission with at most five ranked actions. |
| Review daily mission | Updates mission status and decision note. |
| Create experiment card | Writes hypothesis, pod, source, CTA, proof, stop rule, and owner decision state. |
| Review experiment card | Updates status, result summary, and owner decision. |
| Upsert offer/CTA | Writes approved ask, blocked claims, and activation surface. |
| Upsert reply playbook | Writes intent, approved reply, route type, and review rules. |
| Create source-quality snapshot | Writes activation-oriented source quality snapshot. |

## Security

| Case | Expected |
| --- | --- |
| Unauthenticated API call | Blocked by `withAuth()`. |
| Invalid payload | Returns `Invalid input`. |
| Client Firestore write | Denied by rules. |
| Provider send attempt | Not part of operating-layer actions. |

## Verification

```bash
npm run verify:signaldesk
npx tsc --noEmit --incremental false --pretty false
firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "true"
```

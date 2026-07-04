# Customer FAQ Reply Pack - Firebase and Cost Posture

**Status:** Implemented V0 with no new Firebase surface
**Last Updated:** July 4, 2026

---

## Runtime Cost

| Operation | Count |
| --- | --- |
| Firestore reads | 0 |
| Firestore report writes | 0 |
| Storage operations | 0 |
| Cloud Functions | 0 |
| External fetches | 0 |
| Chatbot/inbox/automation calls | 0 |
| AI/provider calls | 0 |

## Optional Contact Write

The only allowed network write is the optional consented `/api/public/contact` handoff. That reuses the existing public contact enquiry path and does not create a Customer FAQ Reply Pack report collection.

## No New Collections

Do not add:

- `customerFaqReplyReports`
- `customerFaqReplyPacks`
- `publicTruthReports`
- `toolReports`
- storage buckets for uploaded reports

## V1/V2 Future Cost Rule

V1 should reuse current MenuList owner/store/project truth already loaded by owner surfaces. V2 can justify storage only for paid recurrence, history, agency exports, or multi-location reporting.

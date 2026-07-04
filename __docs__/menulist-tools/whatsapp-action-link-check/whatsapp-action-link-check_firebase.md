# WhatsApp Action Link Check - Firebase Cost And Storage

**Status:** Implemented - V0 public browser-local checker
**Last Updated:** July 4, 2026
**Audience:** Engineering, finance, security

---

## V0 Report Path

The report is generated in the browser from owner-entered fields.

| Operation | Count |
| --- | ---: |
| Firestore reads | 0 |
| Firestore writes | 0 |
| Firestore deletes | 0 |
| Storage operations | 0 |
| Cloud Functions | 0 |
| External fetches | 0 |
| WhatsApp API calls | 0 |
| AI/provider calls | 0 |

No new collection, document, index, bucket, Cloud Function, or API route is introduced for the report.

---

## Optional Follow-Up

If the owner submits the follow-up form:

- the tool reuses existing `/api/public/contact`
- the existing public contact enquiry write occurs only after consent and route validation
- Turnstile follows the existing public contact route posture

This is not report storage. It is an explicit contact request.

---

## Data Not Persisted By V0

V0 does not persist:

- WhatsApp number
- WhatsApp link
- suggested message
- report rows
- generated preview link
- current customer link
- copied/downloaded report content

---

## Future V1/V2 Cost Requirements

Any future logged-in or paid behavior must document:

- exact Firestore paths
- read/write/delete count
- retention period
- multi-location scaling cost
- entitlement gate
- report history cap
- audit trail

Do not add recurring checks or history without this update.

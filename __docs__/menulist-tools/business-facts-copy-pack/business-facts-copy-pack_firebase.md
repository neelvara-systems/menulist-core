# Business Facts Copy Pack - Firebase Cost And Storage

**Status:** Implemented V0 public browser-local tool
**Last Updated:** July 4, 2026
**Audience:** Engineering, finance, security

---

## V0 Report Path

The report and copy blocks are generated in the browser from owner-entered fields.

| Operation | Count |
| --- | ---: |
| Firestore reads | 0 |
| Firestore writes | 0 |
| Firestore deletes | 0 |
| Storage operations | 0 |
| Cloud Functions | 0 |
| External fetches | 0 |
| AI/provider calls | 0 |
| Google/Instagram/Facebook/WhatsApp API calls | 0 |

No new collection, document, index, bucket, Cloud Function, or API route is introduced for report generation.

## Optional Follow-Up

If the owner submits the follow-up form:

- the tool reuses existing `/api/public/contact`
- the existing public contact enquiry write occurs only after explicit consent and route validation
- Turnstile follows the existing public contact route posture

This is not report storage, saved history, or a recurring monitor.

## Data Not Persisted By V0

V0 does not persist:

- entered business facts
- phone or WhatsApp
- generated copy blocks
- report rows
- current customer link
- action link
- copied/downloaded content

## V1/V2 Cost Requirements

Any future logged-in or paid behavior must document:

- exact Firestore paths
- read/write/delete count
- retention period
- multi-location scaling cost
- entitlement gate
- saved history cap
- audit trail

# Hours Check - Firebase Cost Notes

**Status:** V0 implemented
**Last Updated:** July 4, 2026

---

## Runtime Cost Summary

| Operation | Count in V0 report path | Notes |
| --- | ---: | --- |
| Firestore reads | 0 | Browser-local deterministic report |
| Firestore writes | 0 | Report is not stored |
| Firestore deletes | 0 | No report documents |
| Storage reads | 0 | No uploads or files |
| Storage writes | 0 | No uploads or files |
| Cloud Functions | 0 | No callable/scheduled function |
| External fetches | 0 | No URL fetch or crawler |
| Google API calls | 0 | Google Business Profile and Maps are not inspected |
| Holiday API calls | 0 | No calendar lookup or holiday inference |
| AI/provider calls | 0 | No model calls |

---

## Optional Follow-Up

The report includes an optional consented follow-up form.

| Operation | Count | Source |
| --- | ---: | --- |
| Existing public contact enquiry write | 1 | Only after explicit consent, Turnstile, and valid `/api/public/contact` acknowledgement |

This reuses the existing bounded contact route. Hours Check does not add a new collection, index, Storage path, Cloud Function, or report API.

---

## V2 Cost Gate

Recurring checks, saved history, multi-location reporting, or agency exports would require a separate V2 cost design with:

- entitlement checks
- capped history
- retention policy
- source policy
- explicit read/write estimates
- owner-visible audit trail

That is not part of V0.

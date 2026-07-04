# Photo Gap Check - Firebase Cost Notes

**Status:** V0 implemented
**Last Updated:** July 4, 2026

---

## Runtime Cost Summary

| Operation | Count in V0 report path | Notes |
| --- | ---: | --- |
| Firestore reads | 0 | Browser-local deterministic report |
| Firestore writes | 0 | Report is not stored |
| Firestore deletes | 0 | No report documents |
| Storage reads | 0 | No image reads |
| Storage writes | 0 | No uploads |
| Cloud Functions | 0 | No callable/scheduled function |
| Image uploads | 0 | V0 has no file input |
| Image analysis calls | 0 | No AI/computer-vision provider |
| External fetches | 0 | No URL fetch or crawler |
| Google/Instagram API calls | 0 | External photo sources are not inspected |
| AI/provider calls | 0 | No model calls |

---

## Optional Follow-Up

The report includes an optional consented follow-up form.

| Operation | Count | Source |
| --- | ---: | --- |
| Existing public contact enquiry write | 1 | Only after explicit consent, Turnstile, and valid `/api/public/contact` acknowledgement |

This reuses the existing bounded contact route. Photo Gap Check does not add a new collection, index, Storage path, Cloud Function, image upload path, or report API.

---

## V2 Cost Gate

Recurring checks, saved history, multi-location reporting, agency exports, image upload, or image analysis would require a separate V2 cost design with:

- entitlement checks
- capped history
- retention policy
- media consent and storage policy
- source policy
- explicit read/write/storage/provider estimates
- owner-visible audit trail

That is not part of V0.

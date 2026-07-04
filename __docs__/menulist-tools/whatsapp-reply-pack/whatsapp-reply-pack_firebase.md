# WhatsApp Reply Pack - Firebase and Cost

**Status:** Implemented V0 public browser-local tool  
**Last Updated:** July 4, 2026

---

## Cost Summary

| Resource | Current cost |
| --- | --- |
| Firestore reads | 0 |
| Firestore writes | 0 during report; 1 existing contact enquiry write per accepted optional follow-up |
| Firestore deletes | 0 |
| Storage operations | 0 |
| Cloud Functions | 0 |
| External fetches | 0 |
| WhatsApp API calls | 0 |
| AI/provider calls | 0 |
| Report storage | 0 |

## Boundary

The report/check path is browser-local. It reads no owner data, writes no report state, calls no provider, opens no external link, and sends no WhatsApp message.

The optional follow-up form reuses the existing bounded `/api/public/contact` route after explicit consent and security checks. That existing contact enquiry write is not report storage and is not canonical MenuList business truth.

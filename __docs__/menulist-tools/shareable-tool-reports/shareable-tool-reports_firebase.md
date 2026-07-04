# Shareable Tool Reports - Firebase Cost Tracking

**Status:** Implemented V0
**Last Updated:** July 4, 2026

---

## Summary

The V0 shareable report link adds no Firebase report-storage cost. The optional follow-up form can create one existing public contact enquiry write after explicit consent and security checks.

| Resource | Current V0 behavior |
| --- | --- |
| Firestore reads | 0 |
| Firestore writes | 0 for report viewing; 1 existing contact enquiry write per accepted follow-up |
| Firestore deletes | 0 |
| Storage operations | 0 |
| Cloud Functions | 0 |
| AI/provider calls | 0 |
| External URL fetches | 0 |
| Report storage | 0 |

The report payload is encoded into the URL hash fragment and decoded in the browser. All current public MenuList Tools use this same no-storage report-link path.

---

## Contact Boundary

The report viewer has a visible consented follow-up form.

It reuses `/api/public/contact` with:

- public rate limit
- bounded JSON request body
- consent validation
- honeypot check
- Turnstile verification when enabled
- one existing `LANDING_PAGE_ENQUIRIES` write on accepted submission

The submitted message contains a bounded report summary for follow-up. The report hash payload is not written as a report record, stored URL, recurring history item, or canonical truth update.

The accepted enquiry also stores bounded lead-routing metadata:

- `sourceKind: shareable_tool_report`
- `sourceToolId`
- `sourceReportStatus`
- `sourcePrimaryNumber`
- nested `sourceContext` with owner-entered business context, summary counts, and bounded `setupJobList`

These fields are operational lead metadata on the existing enquiry write. Setup jobs are derived from the visible report gaps so the team can triage paid setup work. They are not canonical MenuList truth and must not be copied into store/project truth without owner confirmation.

Source tools can keep their existing optional consented handoff through `/api/public/contact`. These are contact enquiries, not report storage.

---

## Report Lead Ops

`/ops/report-leads` is an internal platform-admin monitor for existing report follow-up enquiries.

| Resource | Current behavior |
| --- | --- |
| Firestore reads | Reads recent `landingPageEnquiries` through `/api/ops/report-leads` on manual refresh |
| Firestore writes | 0 writes |
| Realtime listeners | 0 |
| Storage operations | 0 |
| Cloud Functions | 0 |
| AI/provider calls | 0 |

The API caps the scan, defaults to a small manual-refresh result set, and filters `shareable_tool_report` leads in memory to avoid a new composite index. It does not mutate lead status, create report history, or write canonical business truth.

---

## Future Stored Reports

Stored reports are V2 only.

Before adding stored reports, create/update:

- entitlement contract
- retention period
- Firestore collection shape
- rate limit and abuse rules
- privacy language
- deletion path
- cost forecast
- verifier coverage

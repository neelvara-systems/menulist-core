# Shareable Tool Reports - Firebase Cost Tracking

**Status:** Implemented V0
**Last Updated:** July 16, 2026

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

Decode diagnostics are cost-neutral. Invalid, oversized, malformed, or wrong-shape report hashes log bounded `shareable_tool_report_payload_decode_failed` diagnostics with failure stage and payload shape metadata only. They add no Firestore reads/writes/deletes, Storage operations, Cloud Functions, external URL fetches, DNS lookups, provider calls, saved reports, report API routes, or report-history records.

Strict `generatedAt` timestamp and control-character display-string hardening is cost-neutral. The public hash decoder rejects non-canonical generated timestamps and strips control characters from decoded display text before rendering. This adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, external URL fetches, DNS lookups, provider calls, saved reports, report API routes, report-history records, Firebase deploy requirement, or Vercel deploy action.

Summary/check consistency, derived setup jobs, internal-link normalization, required report limits, and the unsigned self-report notice are also browser-local and cost-neutral.

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
- nested `sourceContext` with owner-entered business context, canonical ISO `reportGeneratedAt` or `null`, summary counts, and bounded `setupJobList`

These fields are operational lead metadata on the existing enquiry write. Direct submissions with malformed `sourceContext.reportGeneratedAt` store `null`, and Report Leads also returns `null` for legacy malformed values. Setup jobs are derived from the visible report gaps so the team can triage paid setup work. They are not canonical MenuList truth and must not be copied into store/project truth without owner confirmation.

Source tools can keep their existing optional consented handoff through `/api/public/contact`. These are contact enquiries, not report storage.

---

## Report Lead Ops

`/ops/report-leads` is an internal platform-admin monitor for existing report follow-up enquiries.

| Resource | Current behavior |
| --- | --- |
| Firestore reads | 1 exact `users/{userId}` read for current authorization, then a bounded recent `landingPageEnquiries` query through `/api/ops/report-leads` on manual refresh |
| Firestore writes | 0 writes |
| Realtime listeners | 0 |
| Storage operations | 0 |
| Cloud Functions | 0 |
| AI/provider calls | 0 |

The API uses the scoped `landingPageEnquiries(sourceKind ASC, createdOn DESC)` composite and caps the matching report-lead query at 120 returned documents. A successful refresh therefore performs 1 current-user document read plus only the matching enquiry reads (including Firestore's minimum query charge when no documents match); unrelated website contact enquiries are no longer read and discarded. The response cost object reports the exact authorization read separately from the number of report-lead enquiries returned. `scanMayBeIncomplete` becomes true at the cap and the UI warns about older possible matches. Exact platform-role and operator-ID aliases are required before rate limiting or Firestore PII reads. Production rate-limit-provider failure blocks before Firestore PII reads. Latest-request settlement is browser-only and adds no Firebase operation. The route does not mutate lead status, create report history, or write canonical business truth.

The scoped composite in `firestore.indexes.json` must be deployed before the optimized query can serve live traffic.

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

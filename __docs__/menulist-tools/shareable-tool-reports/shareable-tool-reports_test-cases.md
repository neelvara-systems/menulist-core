# Shareable Tool Reports - Test Cases

**Status:** Active QA matrix
**Last Updated:** July 4, 2026

---

## Source Gate

Run:

```bash
npm run verify:shareable-tool-reports
```

Aggregate:

```bash
npm run verify:public-truth-tools
```

---

## Acceptance Matrix

| ID | Scenario | Expected |
| --- | --- | --- |
| STR-001 | `/tools/reports` opened without hash | Public empty state appears; no login |
| STR-002 | `/tools/reports#r=bad` opened | Invalid report state appears; no crash |
| STR-003 | Valid Social Bio report link opened | Report status, summary, rows, evidence, setup job list, boundaries, and next action render |
| STR-004 | Copy public report link from any current public tool report | Clipboard receives `/tools/reports#r=...`; no network report write |
| STR-005 | Report payload includes unsafe external next action | Decoder replaces it with `/create-menu` |
| STR-006 | Oversized payload | Decoder rejects and shows invalid state |
| STR-007 | Source report row lacks evidence text | Payload guard rejects or drops the row |
| STR-008 | Verifier checks no report API route exists | Passes only when V0 remains storage-free |
| STR-009 | Discovery files | `/tools/reports` appears in discovery policy, sitemap, llms, and llms-full |
| STR-010 | Locale keys | en-US and hi-IN report viewer and Social Bio share-link keys exist |
| STR-011 | Public tool coverage | All current public tool report cards expose Copy public report link |
| STR-012 | Report follow-up form | Viewer posts only to `/api/public/contact` with consent, Turnstile, no-store, same-origin, manual redirect, and accepted acknowledgement |
| STR-013 | Report capture boundary | Accepted follow-up stores an existing contact enquiry only; no report API route or report collection exists |
| STR-014 | Report lead metadata | Follow-up request includes bounded `sourceContext` with `setupJobList`, and the contact route stores queryable `sourceKind`, `sourceToolId`, `sourceReportStatus`, and nested source context on the existing enquiry |
| STR-015 | Report Lead Ops monitor | `/ops/report-leads` is platform-admin only, manual-refresh, reads recent existing enquiries, shows setup job lists, parses bounded responses, and performs no lead mutation or report storage |
| STR-016 | Invalid, oversized, malformed, or wrong-shape hash payload | Decoder logs bounded `shareable_tool_report_payload_decode_failed` diagnostics with shape metadata only and keeps the invalid-report state |

---

## Regression Risks

- A source tool accidentally claims external inspection.
- A future tool adds report storage without V2 docs.
- A tampered report link tries to route users to a non-MenuList URL.
- A very large hash freezes the report viewer.
- Decode diagnostics leak the report hash, decoded JSON, business context, evidence rows, setup jobs, or contact details.
- The setup job list drifts from visible report gaps or is treated as canonical truth before owner confirmation.
- The follow-up form drifts into hidden capture, unbounded payloads, missing lead metadata, or claimed email delivery.
- The internal lead monitor drifts into public access, realtime listeners, lead mutation, or saved report history.

The verifier should cover these risks before another tool adopts the report layer.

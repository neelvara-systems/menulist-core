# Shareable Tool Reports - Implementation

**Status:** Implemented V0
**Last Updated:** July 5, 2026
**Audience:** Developers

---

## Files

| Path | Role |
| --- | --- |
| `src/lib/public-truth-tools/shareableToolReport.ts` | Shared schema, runtime guard, base64url encoder/decoder, URL builder |
| `src/app/api/public/contact/route.ts` | Existing public contact endpoint; accepts bounded `shareable_tool_report` source metadata on consented follow-up submissions |
| `src/app/api/ops/report-leads/route.ts` | Platform-only manual-refresh API for existing report follow-up enquiries |
| `src/app/(main)/ops/report-leads/page.tsx` | Platform-only Report Leads page |
| `src/components/templates/main-app/platform/reportLeadMonitor/index.tsx` | Internal table, filters, detail drawer, and reply-copy controls |
| `src/lib/ops/reportLeadTypes.ts` | Report lead snapshot contract |
| `src/lib/ops/reportLeadClientResponse.ts` | Bounded browser response parser for the ops monitor |
| `src/app/(website)/tools/reports/page.tsx` | Public report viewer route |
| `src/components/website/toolReports/ToolReportPage.tsx` | Client report viewer, hash decoder, copy/download actions, and consented follow-up form |
| `src/components/website/*/*CheckPage.tsx` and `src/components/website/customerLinkPreview/CustomerLinkPreviewPage.tsx` | Public source-tool integrations |
| `src/config/features.ts` | `ENABLE_PUBLIC_TRUTH_SHAREABLE_REPORTS` flag |
| `scripts/verification/verify-shareable-tool-reports.js` | Source gate |

---

## Runtime Flow

```txt
Source tool report card
  -> builds ShareableToolReportPayload
  -> createShareableToolReportUrl(payload)
  -> /tools/reports#r={base64url-json}
  -> viewer decodes window.location.hash
  -> viewer renders report rows, evidence, setup job list, boundaries, and next action
  -> optional consented follow-up posts bounded summary to /api/public/contact
```

The hash fragment is used because it is not sent in the HTTP request. V0 avoids server storage, API routes, and Firestore report writes.

---

## Payload Guard

The shared helper enforces:

- `schemaVersion: 1`
- bounded status enum
- bounded result enum
- max JSON length: `SHAREABLE_TOOL_REPORT_MAX_JSON_LENGTH`
- max encoded length: `SHAREABLE_TOOL_REPORT_MAX_ENCODED_LENGTH`
- max checks: `SHAREABLE_TOOL_REPORT_MAX_CHECKS`
- max boundaries: `SHAREABLE_TOOL_REPORT_MAX_BOUNDARIES`
- max setup jobs: `SHAREABLE_TOOL_REPORT_MAX_SETUP_JOBS`
- strict ISO `generatedAt` timestamp guard using the source-tool `new Date().toISOString()` contract
- control characters are stripped from decoded display strings before rendering
- safe internal next-action href only

If a shared report link is incomplete, too large, or not a valid schema, the viewer shows an invalid-link state.

Decode failures use bounded diagnostics. `shareable_tool_report_payload_decode_failed` records only the failure stage (`payload_oversized`, `base64_decode`, `json_oversized`, `json_parse`, or `payload_invalid`), hash input length, encoded payload length, decoded payload length when available, hash/key shape booleans, max-length booleans, fixed `show_invalid_report_state` fallback policy, and normalized source error metadata. It must not log the hash payload, decoded JSON, business name, business context, evidence text, setup jobs, contact details, or exception text.

July 5 follow-up: Shareable Tool Reports timestamp/display-string payload boundary. The public hash decoder now rejects report payloads whose `generatedAt` value is not the canonical ISO timestamp shape produced by source tools. It also strips control characters from decoded display strings before the viewer renders report titles, business context, status copy, evidence rows, setup jobs, boundaries, and next-action copy. Tampered report links with invalid timestamps keep the existing invalid-report state instead of rendering `Invalid Date` or arbitrary generated-time text.

---

## Integration Rule

When adding a source tool:

1. Use the report's existing deterministic output.
2. Map localized labels and helper text into `checks[]`.
3. Preserve each row's `evidenceText`.
4. Let `buildShareableToolReportSetupJobs(...)` derive the setup job list from visible missing, unclear, and not-checked rows.
5. Add `checkedSourceText` and `notCheckedText`.
6. Use one internal MenuList `nextAction.href`.
7. Add a "Copy public report link" action.
8. Update the source tool verifier.

Do not add a report API route, Firestore collection, external fetch, AI call, or hidden capture step for V0. The only allowed viewer-side write is the visible consented follow-up form using the existing `/api/public/contact` route.

---

## Current Source Tool

All current public MenuList Tools are source-tool integrations. They share only the deterministic report already shown on the public tool page.

The common builder is `buildShareablePublicTruthToolReportPayload(...)`. It maps:

- report status
- localized status copy
- owner-entered business context
- summary counts
- localized check labels and helper text
- each row's existing `evidenceText`
- a bounded setup job list where report gaps become the job list
- one internal MenuList next action
- shared public boundaries

It does not open or fetch profiles, websites, QR codes, PDFs, images, Google, Maps, search results, or AI answers.

## Follow-Up Capture

The viewer includes a visible "Send this report for follow-up" form.

Implementation rules:

- collect name, work email, optional phone/WhatsApp, consent, and honeypot field
- use `TurnstileWidget` when client Turnstile is enabled
- submit only to `/api/public/contact`
- use `cache: 'no-store'`, `credentials: 'same-origin'`, and `redirect: 'manual'`
- expect `source: menulist_public_contact`, `status: accepted`, and `helpTopic: general`
- submit a bounded report summary, not the full hash payload as a stored report
- submit bounded `sourceContext` metadata: `sourceKind`, `toolId`, `reportStatus`, owner-entered business context, canonical ISO generated timestamp or `null`, summary counts, and `setupJobList`
- keep the report link public and ungated

The accepted write is one existing public contact enquiry. The route stores queryable top-level metadata (`sourceKind`, `sourceToolId`, `sourceReportStatus`, `sourcePrimaryNumber`) plus the bounded nested `sourceContext`. Nested `reportGeneratedAt` is stored only as the canonical ISO timestamp shape produced by source tools; malformed direct submissions become `null`. The nested setup jobs are lead-routing context only; they are not canonical business truth, report storage, saved history, or email-delivery automation.

---

## Internal Report Lead Ops

Report Leads is the internal platform-admin surface at `/ops/report-leads`.

Runtime rules:

- route is guarded by the existing `/ops` layout and `/api/ops/report-leads` uses `withAuth(..., { requiredPlatformRole: 'PLATFORM' })`
- after the request rate limit and before the lead query, the API re-reads the exact current `users/{userId}` document and proves document/session identity, normalized email, `platformRole: PLATFORM`, active and verified lifecycle state, non-blocked status, and a valid session issuance/revocation ordering
- API is manual-refresh only
- API reads recent `landingPageEnquiries`, filters `shareable_tool_report` leads in memory, and avoids new Firestore indexes
- legacy `sourcePath` values are projected through the public-contact pathname normalizer so query strings and fragments do not enter the response DTO
- response is capped and parsed through `readReportLeadOpsSnapshotResponse`
- UI shows the setup job list and can copy the first-reply template from the playbook
- no lead mutation
- no report storage
- no external fetch, crawler, AI/provider call, or canonical truth write

The ops route exists only so consented public report leads are actionable. It is not a public report viewer and not a paid V2 history system.

---

## Feature Flags

```ts
ENABLE_PUBLIC_TRUTH_TOOLS: true
ENABLE_PUBLIC_TRUTH_SHAREABLE_REPORTS: true
ENABLE_PUBLIC_TRUTH_REPORT_LEAD_OPS_DASHBOARD: true
```

The source tool flag must also be on for the source tool to generate a report.

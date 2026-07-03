# Customer Question Coverage Check - Implementation

**Status:** V0 implementation evidence; not current launch certification
**Last Updated:** July 2, 2026
**Local Source Gate:** `npm run verify:customer-question-coverage-check`

---

## Runtime Shape

The website route renders a browser-local form and deterministic report. The report builder is local code, not an API report endpoint.

## File Map

| File | Responsibility |
| --- | --- |
| `src/app/(website)/tools/customer-question-coverage-check/page.tsx` | Route, feature flag, metadata, structured data |
| `src/components/website/customerQuestionCoverageCheck/CustomerQuestionCoverageCheckPage.tsx` | UI, report rendering, consented contact handoff |
| `src/lib/public-truth-tools/customerQuestionCoverageReport.ts` | Deterministic report builder |
| `src/lib/public-truth-tools/customerQuestionCoverageTypes.ts` | Type contract with `evidenceText: string` |
| `src/lib/public-truth-tools/ownerPublicTruthReadiness.ts` | Owner Business Health module id |

## Evidence Contract

Every check row carries `evidenceText: string`. That text must describe the local input or MenuList source truth used for the row.

## V0 Runtime Boundary

Do not add chatbot generation, customer-chat ingestion, external source crawling, provider calls, file upload, or report storage in V0.

The tool must keep these fields false in the report contract:

- `externalUrlFetched`
- `aiAnswerGenerated`
- `aiOrSearchChecked`
- `customerConversationLogsRead`
- `externalPlatformUpdated`
- `rankingPromise`

## Contact Handoff

Optional follow-up uses `/api/public/contact` with no-store, same-origin, manual-redirect request policy and bounded response parsing. Success requires the shaped contact acknowledgement for `general`.

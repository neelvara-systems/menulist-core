# Shareable Tool Reports - Validation

**Status:** V0 validation evidence; not production launch certification
**Last Updated:** July 5, 2026

---

## Source Gates

Required checks:

```bash
npm run verify:shareable-tool-reports
npm run verify:report-leads-boundary
npm run verify:social-bio-link-check
npx tsc --noEmit --pretty false
```

Family checks:

```bash
npm run verify:public-truth-tools
npm run verify:website-resource-locales
npm run docs:check-links
```

---

## Current Validation Scope

The V0 verifier checks:

- route exists
- feature flag exists
- shared encoder/decoder exists
- hash-fragment payload is used
- payload caps exist
- decode diagnostics are bounded and content-free
- strict ISO timestamp guard exists for decoded `generatedAt`
- decoded display strings strip control characters before rendering
- safe internal href guard exists
- no report API route exists
- no Firestore/report storage path is introduced
- consented follow-up uses only `/api/public/contact`
- follow-up request uses no-store, same-origin credentials, manual redirect, Turnstile, and bounded response parsing
- follow-up request includes bounded `shareable_tool_report` source metadata
- follow-up source metadata stores canonical ISO `reportGeneratedAt` or `null`
- setup job list is derived from visible report gaps and included in report text, source metadata, and Report Leads triage
- contact route validates, sanitizes, normalizes source timestamps, and stores report lead metadata on the existing enquiry write
- Report Leads ops monitor is platform-admin only, manual-refresh, response-bounded, and read-only
- Social Bio tool exposes Copy public report link
- all current public tools expose Copy public report link
- report evidence text is preserved
- discovery files include `/tools/reports`
- en-US and hi-IN locale keys exist
- docs set exists

Current release approval still requires the active production-readiness audit if this is being shipped to production.

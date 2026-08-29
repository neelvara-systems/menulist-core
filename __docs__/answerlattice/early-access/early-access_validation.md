# Early Access Validation Record

> Current state: local release-candidate validation passed on 29 August 2026

## Local evidence

- `2026-08-29` platform-route parity: the canonical operator surface moved to `/platform/answerlattice-early-access`, was added beside Scheduler Monitor in platform navigation and Ops Control Room, was removed from the Answerlattice customer sidebar, and retained `/answerlattice/early-access` as an exact-platform guarded compatibility redirect.
- The platform-route regression reran focused ESLint, `npx tsc --noEmit`, `npm run verify:answerlattice-early-access`, and `npm run security-os:audit -- --product answerlattice`; all executed gates passed. The registry-only SecurityOS audit retained its known partial-coverage warnings and did not claim mapped verifier execution.
- Local signed-out HTTP evidence confirmed that both the canonical and compatibility routes compiled and failed closed through sign-in/unauthorized redirects. A separate authenticated visual pass was not recorded because the local browser webview could not attach; this is a browser-tool evidence limitation, not a successful runtime claim.
- `npx tsc --noEmit --pretty false`: passed.
- Focused ESLint across the form, public/internal APIs, contracts, dashboard, and verifiers: passed with zero warnings.
- `npm run verify:answerlattice-early-access`: passed source contracts, desktop/mobile dashboard runtime, and dedicated Firestore-rules client-isolation tests.
- `npm run verify:answerlattice-public-website`: passed the public website, agent-readiness, resource, ROI, contact, and robots-policy suites.
- `npm run verify:answerlattice-security-audit`: passed with zero dependency vulnerabilities across the root and maintained Functions packages.
- `npm run verify:contextual-state-illustrations`: passed the reviewed 79-render cross-product inventory.
- `node scripts/verification/verify-answerlattice-runtime-truth.js`: passed after adding the early-access public-mode and pre-tenant-rule boundaries.

## Runtime scenarios

- Valid public submission created one Answerlattice-emulator record.
- A case-changed duplicate email updated the same record, incremented `submissionCount`, and preserved the operator-assigned status.
- Invalid URL, missing consent, malformed JSON, oversized body, and oversized internal notes returned bounded generic errors.
- Honeypot submission returned the generic accepted response and created no record.
- Signed-out internal API access returned `401`.
- An authenticated synthetic platform session could list and update requests; invalid status returned `400`, missing request returned `404`, and a stale cursor returned `409` with recovery copy.
- Fifty-two temporary applicants plus the original request produced two pages of 50 and 3 records with 53 unique IDs and no overlap. Status filtering returned only matching rows with exact aggregate counts.
- The authenticated onboarding endpoint returned `ANSWERLATTICE_EARLY_ACCESS_REQUIRED` before provisioning or provider work.
- The public page was inspected at desktop and 390 px mobile width with no horizontal overflow. The internal dashboard component passed desktop table, mobile card, pagination, and detail-drawer runtime checks.

All exact synthetic applicant records, the synthetic user document, and the synthetic Auth-emulator user were deleted after testing; the early-access emulator collection was empty at cleanup readback.

## Separate hosted release evidence

Hosted QA still requires one explicitly authorized consolidated staging push plus an explicitly authorized Answerlattice Firestore index/TTL deployment. After those releases, repeat public submission, platform review, mobile rendering, and onboarding-gate smoke tests on the hosted QA target. No hosted-ready claim relies on this local record alone.

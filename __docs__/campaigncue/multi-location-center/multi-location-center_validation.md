# Multi-Location Center - Validation

**Local evidence date:** August 11, 2026

## Passed

- `npm run test:campaigncue-multi-location-variants` - 29 focused checks.
- `node scripts/verification/verify-campaigncue-runtime.js` - 2,192 checks.
- `npm run verify:campaigncue-operating-loop` - 166 checks.
- `npm run test:campaigncue-export-archive` - 61 checks, including assigned branch, other branch, shared unlinked asset, legacy missing-location behavior, and freshness recheck coverage.
- `npm run verify:campaigncue` - passed, including Firestore and Storage rules emulators.
- Scoped ESLint for the branch utility, schemas, types, server, offer-page server, API route, UI, and verifier - passed.
- `npx tsc --noEmit --pretty false` - passed repository-wide.

## Not Yet Proven In This Environment

- Authenticated browser flow against a provisioned `campaigncue-qa` Firebase project.
- Multi-role owner/admin/local-manager behavior with real session memberships.
- Emulator transaction replay under process interruption.
- Mobile physical-device review.
- Firebase rules/deploy evidence for the unprovisioned CampaignCue project.

## Deployment Classification

Codebase-local contract: implemented and locally verified.

Release status: conditional on CampaignCue Firebase provisioning and authenticated role QA. No direct provider/posting capability is implied.

## Branch Asset Boundary - August 11, 2026

- Campaign-linked Asset Library records now retain the source campaign `locationId`.
- Overview, list, preview, and download share one local-manager visibility predicate.
- The predicate uses the bounded asset result and already-loaded membership, so the stricter boundary adds no Firebase query.
- Focused archive/asset tests cover assigned branch, other branch, shared unlinked, and legacy missing-location cases.

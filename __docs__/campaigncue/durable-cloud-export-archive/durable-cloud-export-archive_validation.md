# Durable Cloud Export Archive Validation

**Local evidence date:** August 11, 2026

## Current Verdict

The source implementation is complete for local validation. It is not deployment-certified until CampaignCue QA infrastructure, exact bucket CORS, signed-URL IAM, and authenticated browser/device evidence are available.

## Locally Verified Contracts

- one optional campaign pointer and temporary upload lease;
- one deterministic existing Asset Library document;
- two rotating Storage object names per campaign;
- deterministic ZIP entry timestamps;
- browser SHA-256 and CRC32C hashing;
- Cloud Storage CRC32C validation on signed PUT;
- strict schemas, exact path reconstruction, owner-bound lease, generation precondition, and ZIP magic-byte check;
- short-lived runtime-only upload and download URLs;
- direct Firebase client denial for report objects;
- no new collection, listener, background job, provider call, or public link;
- local ZIP fallback and unchanged manual-delivery boundary.

## Required Local Commands

```bash
npm run test:campaigncue-export-archive
npm run test:campaigncue:storage-rules
node scripts/verification/verify-campaigncue-runtime.js
npm run verify:campaigncue-operating-loop
npx tsc --noEmit
npx eslint src/constants/campaigncue/exportArchive.ts src/lib/campaigncue/exportArchiveClient.ts src/lib/campaigncue/assetVisibility.ts src/lib/campaigncue/recordBoundary.ts src/lib/campaigncue/server.ts src/lib/validation/campaigncueSchemas.ts src/types/campaigncue.ts 'src/app/api/campaigncue/campaigns/[campaignId]/export-archive/route.ts' 'src/app/api/campaigncue/assets/[assetId]/download/route.ts' src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx scripts/verification/test-campaigncue-export-archive.ts scripts/verification/test-campaigncue-storage-rules.ts
```

The aggregate `npm run verify:campaigncue` includes the focused archive and Storage rules tests. Per repository instruction, this work does not require `npm run build`.

## Current Evidence

- `npm run test:campaigncue-export-archive` passed 61 deterministic, adversarial, integrity, filename, location-visibility, freshness, and source-contract checks.
- `node scripts/verification/verify-campaigncue-runtime.js` passed 2,192 assertions.
- `npm run verify:campaigncue-operating-loop` passed 166 assertions.
- `npm run verify:campaigncue` passed the complete CampaignCue matrix, including Firestore and Storage rules emulator suites.
- `npx tsc --noEmit --pretty false` passed repository-wide.
- Focused ESLint over the archive constants, schemas, runtime, routes, Asset Library boundary, UI, and verifiers passed with no output.
- `git diff --check` passed.
- `npm run build` was intentionally not run.

The final source audit also repaired non-Latin/oversized ZIP filename admission and pinned header verification to the metadata generation to remove a Storage read race.

## External Release Gates

1. Deploy `storage-campaigncue.rules` to `campaigncue-qa`.
2. Configure exact CampaignCue app-origin bucket CORS for the signed PUT headers.
3. Confirm signed-URL service-account permissions.
4. Confirm bucket versioning is disabled for this namespace or noncurrent report generations have a short lifecycle.
5. Complete authenticated QA save, unchanged-save, replace, and re-download evidence.
6. Complete iOS and Android PWA checks.
7. Repeat the evidence in production before enabling website claims.

The August 11 QA rules deployment attempt stopped before project access with `Failed to authenticate, have you run firebase login?`.

## Residual Risk

Local tests cannot prove remote IAM, bucket CORS, lifecycle configuration, quota behavior, real browser Storage responses, or physical-device file handling. Those remain explicit infrastructure and release evidence, not hidden code-completeness claims.

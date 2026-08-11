# Read-Only Result Evidence Validation

## Current verdict

The owner-copied report snapshot is implemented behind `ENABLE_CAMPAIGNCUE_READ_ONLY_RESULT_EVIDENCE`.

Validated source contracts:

- one shared provider, scope, metric, and role registry;
- strict action schema and persisted-record schema;
- server-side feature, role, date, workspace, and location checks;
- deterministic fingerprint and duplicate-count protection;
- Results-tab owner UI with explicit attribution boundary;
- no Campaign Memory or dashboard-summary mutation;
- no provider call, new collection, listener, or Storage artifact;
- focused verifier included in `verify:campaigncue`.

## August 11, 2026 Evidence

- `npm run test:campaigncue-read-only-result-evidence` passed with 41 checks, including workspace-local calendar boundaries east and west of UTC.
- `node scripts/verification/verify-campaigncue-runtime.js` passed with 2,192 checks.
- `npm run verify:campaigncue-operating-loop` passed with 166 checks.
- Repository TypeScript, scoped lint, Firestore rules, and Storage rules passed.

## Not active

- provider OAuth;
- API report import;
- automatic refresh;
- campaign attribution;
- provider posting or mutation.

## Required validation commands

```bash
npm run test:campaigncue-read-only-result-evidence
node scripts/verification/verify-campaigncue-runtime.js
npm run verify:campaigncue-operating-loop
npx tsc --noEmit
npx eslint src/constants/campaigncue/resultEvidence.ts src/lib/campaigncue/resultEvidence.ts src/lib/campaigncue/server.ts src/lib/campaigncue/recordBoundary.ts src/lib/validation/campaigncueSchemas.ts src/types/campaigncue.ts src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx scripts/verification/test-campaigncue-read-only-result-evidence.ts
```

Provider-API activation remains blocked until a verified connection design, credentials, revocation, read-method allowlist, response schema, quotas, timeout/retry policy, audit controls, and external test account are available.

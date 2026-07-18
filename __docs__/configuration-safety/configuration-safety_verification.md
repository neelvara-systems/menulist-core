# Configuration Safety Verification

## Local source evidence

Run:

```bash
npm run verify:configuration-safety
npm run verify:env-targets
npm run test:signaldesk:env-project-validation
npm run verify:dependency-freeze
npx tsc --noEmit --incremental false --pretty false
```

The focused boundary checks strict Functions overrides, CampaignCue boolean and
rollout behavior, stage-conflict handling, maintained templates, product-key
naming, secret/public separation, startup validation wiring, and documentation
presence.

## External evidence still required

- exact Vercel Preview and Production values;
- Firebase Secret Manager values and access;
- scoped Functions deployment for Functions-source changes;
- target provider/model smoke when a provider path is enabled;
- production-host behavior after an explicitly approved Vercel release.

Local source verification is not deployment approval or production
certification.

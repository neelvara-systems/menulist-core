# Ownership And Dormant Lifecycle Verification

Run:

```bash
npm run verify:ownership-dormant-lifecycle
npm run verify:staff-concurrency-boundary
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:staff-scope-boundary
npm run verify:owner-notifications-boundary
npx tsc --noEmit --incremental false --pretty false
```

The focused gate checks last-owner/self/Owner-target protections, desktop and
mobile transfer warnings, separate notification/subscription authorities,
absence of a partial transfer API, bounded advisory staleness, inactive-store
exclusion, no automatic store deactivation, and document parity.

Real support transfer execution, legal review, authenticated desktop/mobile
role QA, provider notification delivery, Firebase Auth inspection, and approved
Vercel release remain owner/external pending.

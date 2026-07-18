# Account And Tenant Lifecycle Verification

Run:

```bash
npm run verify:account-tenant-lifecycle
npm run verify:auth-onboarding-flow
npm run verify:auth-security-failure-matrix
npx tsc --noEmit --incremental false --pretty false
```

The focused verifier checks independent dual-auth teardown, authenticated
storage/cache/log cleanup, in-memory provider cleanup, truthful logout errors,
central onboarding/compensation, final staff deactivation, public privacy
request wording, and this document set.

External evidence remains pending for authenticated multi-user browser/device
logout, provider-console Firebase Auth state, actual support request execution,
legal review, and an approved app/Vercel release.

# Global Failure And Observability Verification

Run:

```bash
npm run verify:global-failure-observability
npm run verify:auth-security-failure-matrix
npm run verify:menulist-api-tenant-safety
npm run verify:public-business-truth
npm run verify:dependency-freeze
npx tsc --noEmit --incremental false --pretty false
```

The focused gate checks render fallbacks, recovery labels, no ordinary cache
deletion, diagnostic acknowledgement, browser-log redaction, Sentry privacy,
last-known ticket truth, and the reviewed typed API-message allowlist.

Production Sentry event delivery, replay inspection, provider alerts,
authenticated browser/device recovery, approved Vercel release, and
production-host smoke remain external evidence. Local source verification is
not deployment approval.

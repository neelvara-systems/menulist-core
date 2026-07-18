# Owner PWA Lifecycle Verification

`npm run verify:owner-pwa-lifecycle` guards:

- preview/development registration safety and owner route coverage;
- explicit update checks for existing registrations;
- owner manifest identity, launch, standalone, and rotation policy;
- absence of authenticated HTML/API/Firestore/customer runtime caches;
- cleanup of retired private caches;
- bounded precache configuration and reconnect behavior;
- one non-blocking shared connectivity state;
- manual/deferable localized update prompt;
- generic offline fallback;
- absence of background mutation replay;
- maintained documentation.

Supporting checks:

```bash
npm run verify:customer-app-pwa
npm run verify:mobile-shell-route-map
npm run verify:agent-readiness
npm run verify:dependency-freeze
npx tsc --noEmit --incremental false --pretty false
git diff --check
```

No production build or Vercel deploy is part of the local source gate. A production build must regenerate `public/sw.js`; authenticated browser/device inspection remains external evidence.

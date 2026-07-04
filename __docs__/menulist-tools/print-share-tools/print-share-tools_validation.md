# Print & Share Tools - Validation

**Last Updated:** July 4, 2026

---

## Required Gates

```bash
npm run verify:print-share-tools
npm run verify:tools-hub
npm run verify:shareable-tool-reports
npm run verify:public-truth-tools
npm run typecheck
```

---

## What The Verifier Protects

`npm run verify:print-share-tools` checks:

- all five public routes exist
- feature flags exist
- docs exist
- routes are public and not auth-gated
- generation stays browser-local
- no Firestore, Storage, Cloud Function, AI/provider, or external fetch path is added
- no file upload is exposed in V0
- creative-editor document contract is used without exposing the full editor
- reports preserve evidence text
- customer-link validation requires public HTTPS and rejects local, private, insecure, raw-IP, and credentialed QR targets
- shareable report links use the existing hash-based report viewer
- generated reports expose a visible readonly public report URL for manual copy/open fallback
- Tools Hub, discovery policy, sitemap, LLM files, and locales include every route

---

## Manual QA

For UI QA, test each route on desktop and mobile widths:

- generate asset
- review report rows
- copy shareable report link
- download PNG
- download PDF
- open print
- check no text overlap in preview and controls

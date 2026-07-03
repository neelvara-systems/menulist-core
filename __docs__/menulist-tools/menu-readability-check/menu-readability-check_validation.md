# Menu Readability Check - Validation Report

**Status:** V0 validation evidence; not current launch certification
**Last Updated:** July 1, 2026

> **Launch boundary (July 2, 2026):** This report is source-gate evidence for a browser-local V0 public truth tool. It is not current release approval. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence where applicable, `npm run verify:menu-readability-check`, public website route QA, contact handoff QA, target deploy evidence, and production-host smoke.

---

## Engineering Checklist Verification

| Checklist Item | Status | Evidence |
| --- | --- | --- |
| Public route exists | Pass | `src/app/(website)/tools/menu-readability-check/page.tsx` |
| Feature flag exists | Pass | `src/config/features.ts` |
| Browser-local report builder exists | Pass | `src/lib/public-truth-tools/menuReadabilityReport.ts` |
| Report types include evidence text | Pass | `src/lib/public-truth-tools/menuReadabilityTypes.ts` |
| No report API route added | Pass | `scripts/verification/verify-menu-readability-check.js` |
| No upload, PDF, OCR, URL fetch, or AI rewrite in V0 | Pass | `scripts/verification/verify-menu-readability-check.js` |
| Locale copy exists | Pass | `public/locales/menulist.ai/en-US.json`, `public/locales/menulist.ai/hi-IN.json` |
| Discovery files updated | Pass | `src/lib/seo/discoveryPolicy.ts`, `public/sitemap.xml`, `public/llms.txt`, `public/llms-full.txt` |
| Firebase cost documented | Pass | `__docs__/menulist-tools/menu-readability-check/menu-readability-check_firebase.md` |
| Mobile support documented | Pass | `__docs__/menulist-tools/menu-readability-check/menu-readability-check_mobile-support.md` |

---

## Architecture Checklist

| Item | Status |
| --- | --- |
| Uses existing website route group | Pass |
| Uses existing website component patterns | Pass |
| Reuses existing public contact route for consented handoff | Pass |
| Adds no new collection, API route, Storage path, Cloud Function, or provider call | Pass |

---

## Security Checklist

| Item | Status |
| --- | --- |
| Anonymous report path is browser-local | Pass |
| Contact handoff is consented and uses existing bounded route | Pass |
| No arbitrary URL fetch exists | Pass |
| No file upload exists | Pass |

---

## Firebase Cost Checklist

| Operation | Status |
| --- | --- |
| Firestore reads during report | 0 |
| Firestore writes during report | 0 |
| Storage operations | 0 |
| Cloud Functions | 0 |
| AI/provider calls | 0 |
| Optional follow-up write | Existing `/api/public/contact` only after consent |

---

## Bugs Fixed During Implementation

- Corrected the initial English locale insertion so `MenuReadabilityCheckPage` lives under the `Website` namespace only.
- Corrected the status ladder so usable pasted source with missing customer details returns `unclear`, while `missing_basics` is reserved for missing/too-short source material or missing item/service structure.

---

## Source Gate Result

Source-gate evidence after:

```txt
npm run verify:menu-readability-check
npm run verify:public-truth-check
npm run verify:qr-link-health-check
npx tsc --noEmit --incremental false
```

Manual test route:

```txt
/tools/menu-readability-check
```

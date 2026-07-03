# Photo Gap Check - Test Cases

**Status:** V0 acceptance matrix
**Last Updated:** July 1, 2026

---

## Report Builder

| Case | Input | Expected |
| --- | --- | --- |
| Empty form | No selected visual facts, no link | `missing_basics` |
| One visual fact | Logo selected only | `unclear` |
| Ready visual profile | Logo, cover, location/team, product/service, current photos, public page images, valid link | `ready` |
| Invalid link | Ready-ish visual facts with malformed link | `unclear` with current customer link row unclear |
| External verification | Any input | `external_photo_verification` is always `not_checked` |

---

## Runtime Boundaries

| Boundary | Expected |
| --- | --- |
| No report API route | `src/app/api/photo-gap-check/report/route.ts` does not exist |
| No external fetch | Route/report/type files do not call `fetch()` |
| No image upload | V0 code has no file input, FileReader, Storage ref, or upload call |
| No image analysis | V0 code does not call OpenAI, Gemini, vision, or image-analysis providers |
| No Google/Instagram API | V0 code does not import Google, Instagram, or social provider clients |
| No report write | V0 report path does not import Firestore write helpers |
| Optional handoff | Only posts to existing `/api/public/contact` after consent and Turnstile |

---

## UI

| Case | Expected |
| --- | --- |
| Initial load | Empty report placeholder renders |
| Submit ready input | Report card renders ready status and all rows |
| Copy report | Uses browser clipboard helper |
| Download report | Downloads local text report |
| Contact handoff without consent | Shows consent error |
| Desktop width | No horizontal overflow |
| 390px width | No horizontal overflow and controls remain readable |

---

## Commands

```bash
npm run verify:photo-gap-check
npm run verify:hours-check
npm run verify:public-truth-check
npm run verify:qr-link-health-check
npm run verify:menu-readability-check
npm run verify:whatsapp-action-link-check
npx tsc --noEmit --incremental false
```

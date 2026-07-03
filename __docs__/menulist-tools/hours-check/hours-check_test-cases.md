# Hours Check - Test Cases

**Status:** V0 acceptance matrix
**Last Updated:** July 1, 2026

---

## Report Builder

| Case | Input | Expected |
| --- | --- | --- |
| Empty form | No hours, no city, no link | `missing_basics` |
| Regular hours only | Day/time text, no closed days, no special-hours status, no fallback/link | `unclear` |
| Ready hours | Day/time text, closed-day text, city/timezone, special-hours listed or not applicable, fallback, valid link | `ready` |
| Invalid link | Ready-ish hours with malformed link | `unclear` with current customer link row unclear |
| Holiday missing | Normal hours and link, special status missing | `unclear` |
| External verification | Any input | `external_hours_verification` is always `not_checked` |

---

## Runtime Boundaries

| Boundary | Expected |
| --- | --- |
| No report API route | `src/app/api/hours-check/report/route.ts` does not exist |
| No external fetch | Route/report/type files do not call `fetch()` |
| No Google API | V0 code does not import Google Business Profile, Maps, or provider clients |
| No holiday API | V0 code does not call calendar/holiday providers |
| No AI/search provider | V0 code does not import OpenAI/Gemini or search providers |
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
npm run verify:hours-check
npm run verify:public-truth-check
npm run verify:qr-link-health-check
npm run verify:menu-readability-check
npm run verify:whatsapp-action-link-check
npx tsc --noEmit --incremental false
```

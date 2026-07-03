# Social Bio Link Consistency Check - Test Cases

## Source Gate

```bash
npm run verify:social-bio-link-check
```

## Acceptance Matrix

| ID | Case | Expected |
| --- | --- | --- |
| SBLC-001 | No customer link | Report status is `missing_basics` |
| SBLC-002 | Invalid customer link | Report status is `missing_basics` or row is `unclear` |
| SBLC-003 | Valid customer link, no placements | Report status is `missing_basics` |
| SBLC-004 | Valid customer link, one placement, action clear, old links not removed | Report status is `unclear` |
| SBLC-005 | Valid customer link, two or more placements, action clear, old links removed | Report status is `ready` |
| SBLC-006 | Copy report | Browser copy helper is called and no report storage is created |
| SBLC-007 | Download report | Text download is created locally and no report storage is created |
| SBLC-008 | Optional handoff without consent | Form blocks submit |
| SBLC-009 | Optional handoff with consent | Existing `/api/public/contact` path is used |

## Boundary Tests

| ID | Case | Expected |
| --- | --- | --- |
| PTT-015G | Tool claims it inspected social profiles | Fail |
| SBLC-B01 | Route/report/types include `fetch(` | Fail |
| SBLC-B02 | Code calls Facebook, Instagram, Google, Maps, AI, or rank-tracker APIs | Fail |
| SBLC-B03 | Code adds Firestore report storage | Fail |
| SBLC-B04 | Code opens external profiles with `window.open` or manual location navigation | Fail |
| SBLC-B05 | Report row lacks `evidenceText` | Fail |
| SBLC-B06 | Public copy promises ranking, citations, AI visibility, platform updates, or social engagement | Fail |

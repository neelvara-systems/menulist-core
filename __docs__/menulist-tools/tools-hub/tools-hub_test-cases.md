# Tools Hub - Test Cases

**Last Updated:** July 4, 2026

## Source Gate

```bash
npm run verify:tools-hub
```

## Acceptance Matrix

| ID | Scenario | Expected |
| --- | --- | --- |
| TH-001 | Visit `/tools` with flags on | Page renders Tools Hub with grouped current tool links |
| TH-002 | Disable family flag | Route returns 404 |
| TH-003 | Disable hub flag | Route returns 404 |
| TH-004 | Inspect rendered cards | All 13 current public tool routes are present |
| TH-005 | Inspect copy | No ranking, citation, fake scan, external update, or broad SEO claims |
| TH-006 | Inspect runtime source | No fetch, Firebase, API route, contact handoff, upload, or provider call |
| TH-007 | Mobile viewport | Tool cards collapse cleanly and CTAs fit within their containers |
| TH-008 | Header resources dropdown | MenuList Tools link appears |
| TH-009 | Footer Start column | MenuList Tools link appears |
| TH-010 | Discovery files | `/tools` appears in sitemap, discovery policy, `llms.txt`, and `llms-full.txt` |

## Regression Guard

Do not add a full plugin system or shared module registry just to power this page. A static grouped list is enough until another owner/public surface needs the same grouping contract.

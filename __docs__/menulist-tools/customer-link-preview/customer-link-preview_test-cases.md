# One Customer Link Preview - Test Cases

**Status:** Implemented V0 public browser-local checker
**Last Updated:** July 4, 2026

## Acceptance Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| CLP-001 | Owner enters a valid customer link and marks required facts | Report status is ready or review-ready |
| CLP-002 | Owner leaves customer link blank | Customer link row is missing |
| CLP-003 | Owner enters malformed link | Customer link row is unclear and evidence says link was not opened |
| CLP-004 | Owner omits menu/service and contact facts | Report status is missing basics |
| CLP-005 | Owner marks only optional facts | Required rows still control status |
| CLP-006 | Report rows render evidence text | Each row states what was checked |
| CLP-007 | Owner copies report | Browser copy action runs without persistence |
| CLP-008 | Owner downloads report | Text file download runs without persistence |
| CLP-009 | Owner submits follow-up without consent | Form blocks submission |
| CLP-010 | Tool claims it fetched links, scanned websites/profiles, stored reports, checked rankings, or called AI/search providers | Verification fails |
| CLP-011 | City is entered and business-name-visible is selected, but business name is blank | Business identity remains unclear |
| CLP-012 | A valid current link has one or more required fact gaps | Next action is complete customer facts, not create another customer link |

## Source Gate

```bash
npm run verify:customer-link-preview
```

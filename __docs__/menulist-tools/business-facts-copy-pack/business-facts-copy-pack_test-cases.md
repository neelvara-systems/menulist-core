# Business Facts Copy Pack - Test Cases

**Status:** Implemented V0 public browser-local tool
**Last Updated:** July 4, 2026

---

## Acceptance Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| BFCP-001 | Owner enters name, offer summary, contact, action, and current customer link | Report status is ready or review-ready |
| BFCP-002 | Owner leaves business name blank | Business identity row is missing and status is missing basics |
| BFCP-003 | Owner leaves offer and description blank | Description/offer rows show missing or unclear |
| BFCP-004 | Owner enters malformed customer link | Link row is unclear and evidence says the link was not opened |
| BFCP-005 | Owner enters no hours or location | Rows show missing/unclear without blocking copy generation |
| BFCP-006 | Copy blocks render after running the tool | Six deterministic copy blocks are shown |
| BFCP-007 | Owner copies one copy block | Browser copy action runs without persistence |
| BFCP-008 | Owner copies report | Browser copy action runs without persistence |
| BFCP-009 | Owner copies public report link | Hash-based `/tools/reports` link is copied without report storage |
| BFCP-010 | Owner downloads report | Text file download runs without persistence |
| BFCP-011 | Owner submits follow-up without consent | Form blocks submission |
| BFCP-012 | Tool claims it fetched links, inspected profiles, updated platforms, stored reports, checked rankings, or called AI/search providers | Verification fails |

## Source Gate

```bash
npm run verify:business-facts-copy-pack
```

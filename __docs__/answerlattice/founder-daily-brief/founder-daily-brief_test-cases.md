# Founder Daily Brief Test Cases

| ID | Case | Expected |
| --- | --- | --- |
| FDB-001 | All summaries missing | Brief shows insufficient data and launch verification actions. |
| FDB-002 | Drifted answers exist | First actions route to Governance / Answer Tests. |
| FDB-003 | Needs-answer board cards exist | Brief includes Support Board action. |
| FDB-004 | Intake review items exist | Brief includes Knowledge Intake action. |
| FDB-005 | Escalations exist | Brief includes ticket/support reply action. |
| FDB-006 | Coverage below 50 | Brief includes approved-answer coverage action. |
| FDB-007 | Stable summaries | Brief shows stable state plus release safety/cost guard reminders. |
| FDB-008 | Feature flag disabled | Support Assistant still loads without `dailyBrief`. |
| FDB-009 | Cache hit | Read model reports zero reads. |
| FDB-010 | Mobile width | Action cards stack and 44px buttons remain usable. |
| FDB-011 | Launch proof ready | Base management route enters Daily Brief and the brief shows the verification timestamp. |
| FDB-012 | Launch proof missing/incomplete | Base management route fails safely to Activation and Daily Brief links the first blocker. |
| FDB-013 | More than four candidate actions | Response keeps one primary and at most three secondary actions. |
| FDB-014 | Confirmed resolution low or same-session recontact high | Brief adds a governed Answer Tests review action without reading raw conversations. |
| FDB-015 | Founder selects `I shipped a change` | Existing changelog create form opens once; no write occurs until Save. |

## Regression Checks

- `npm run verify:answerlattice-runtime-truth`
- `npx tsc --noEmit`
- focused ESLint on Support Assistant and ownerSupportAssistant server file
- `npm run verify:answerlattice-founder-daily-brief`
- `npm run verify:answerlattice-founder-support-controls`

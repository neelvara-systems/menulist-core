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

## Regression Checks

- `npm run verify:answerlattice-runtime-truth`
- `npx tsc --noEmit`
- focused ESLint on Support Assistant and ownerSupportAssistant server file


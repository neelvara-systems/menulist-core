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
| FDB-016 | Support-only caller lacks governance/readiness/knowledge permission | Brief omits those routes, launch verification, product-change control, and prepared review card. |
| FDB-017 | One summary is missing, malformed, or older than 48 hours | Source health names the source, unavailable metrics remain unavailable, and status is not falsely healthy. |
| FDB-018 | All six documents exist but contain no useful evidence | Brief remains `insufficient_data`. |
| FDB-019 | Summary timestamp is more than five minutes in the future | Source is invalid and cannot support a confident action. |
| FDB-020 | Browser receives malformed, oversized, redirected, or wrong-enum response | Fixed retry state renders; no server payload is trusted. |

## Regression Checks

- `npm run verify:answerlattice-runtime-truth`
- `npx tsc --noEmit`
- focused ESLint on Support Assistant and ownerSupportAssistant server file
- `npm run verify:answerlattice-founder-daily-brief`
- `npm run verify:answerlattice-founder-support-controls`
- `npm run test:answerlattice-owner-support-assistant-contracts`
- `npm run test:answerlattice-chat-analytics-contracts`
- `npm run test:answerlattice-chat-analytics:scheduler`

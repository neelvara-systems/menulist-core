# Founder Daily Brief Test Cases

| ID | Case | Expected |
| --- | --- | --- |
| FDB-001 | All summaries missing | Brief shows insufficient data and the source-health retry state; it does not invent a launch action. |
| FDB-002 | Drifted answers exist | First action routes to Governance drift review. |
| FDB-003 | Needs-answer board cards exist | Brief includes Support Board action. |
| FDB-004 | Intake review items exist without a linked launch or support-truth problem | Brief keeps the generic backlog out of the ranked action list. |
| FDB-005 | Escalations exist | Brief includes ticket/support reply action. |
| FDB-006 | Coverage below 50 with canonical misses, uncovered entities, drift, or qualified Support Board work | Brief includes the paired approved-answer coverage action. |
| FDB-007 | Stable summaries | Brief returns zero actions and shows the owner quiet state; release and cost remain separate controls. |
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
| FDB-021 | Friction summary contains a ranked top entity | Brief and bounded friction answer name that entity, show its seven-day question/escalation/low-confidence evidence, and route to the existing Friction view without another read. |
| FDB-022 | Complete current packet has no qualifying condition | Daily Brief returns zero action cards and says nothing needs the owner's decision. |
| FDB-023 | Packet is healthy but no action slots are used | Generic release and cost reminders remain outside the ranked action list. |
| FDB-024 | Only generic Knowledge Intake backlog exists | No Daily Brief action appears unless Activation or an upstream qualified support-truth condition requires the review. |
| FDB-025 | Support Board summary reports high-priority cards | Brief admits one bounded high-priority Support Board action without reading card documents. |
| FDB-026 | Uncovered entities exist without drift, exposure, sensitive-topic, or failing-outcome evidence | The card cannot be labeled critical solely from the count. |
| FDB-027 | Friction summary is LOW or MODERATE with no escalation | No friction action is admitted merely because a signal exists. |
| FDB-028 | Friction summary is HIGH or the top entity has escalations | One evidence-backed friction action may be admitted and routes to Friction. |
| FDB-029 | More candidate actions exist than the caller can open | Permission filtering occurs before the four-action cap, so an allowed lower-ranked action can still appear. |
| FDB-030 | Owner resolves a linked source condition and refreshes after its compact summary changes | The action disappears without a Daily Brief completion write. |
| FDB-031 | Owner opens or refreshes Daily Brief | No action, seen, handled, snooze, dismissal, or audit document is written. |
| FDB-032 | Top failing entity is present in Trust Metrics | It can support bounded card evidence but cannot establish autonomous root cause or sensitive severity. |
| FDB-033 | Only a generic release reminder or credit reminder is available | Zero action cards are returned; `I shipped a change` and cost guidance remain separate controls. |
| FDB-034 | A qualified top-friction entity is present | The Friction route carries one validated `entity` context value and the destination revalidates it. |
| FDB-035 | Coverage is low and paired with repair evidence | The action opens Canonical Answers rather than Answer Tests; no new read occurs until the owner opens the destination. |

## Regression Checks

- `npm run verify:answerlattice-runtime-truth`
- `npx tsc --noEmit`
- focused ESLint on Support Assistant and ownerSupportAssistant server file
- `npm run verify:answerlattice-founder-daily-brief`
- `npm run verify:answerlattice-founder-support-controls`
- `npm run test:answerlattice-owner-support-assistant-contracts`
- `npm run test:answerlattice-chat-analytics-contracts`
- `npm run test:answerlattice-chat-analytics:scheduler`
- `git diff --check`
- `npm run docs:check-links`

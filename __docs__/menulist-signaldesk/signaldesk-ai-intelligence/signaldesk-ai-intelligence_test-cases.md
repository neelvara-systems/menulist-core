# SignalDesk AI Intelligence - Test Cases

**Status:** Current source and emulator matrix
**Last Updated:** July 21, 2026

## Admission and Security

| Case | Expected |
| --- | --- |
| Missing auth, membership, or action permission | Rejected before data/provider work. |
| Mobile AI execution or shadow review | Rejected by action-class guard. |
| Held/rejected/suppressed target | Hidden from desktop AI selectors and rejected by server. |
| Expired/blocked/non-permitted source policy | Rejected before provider work and safely audited. |
| Stale evidence identity or source lineage | Rejected; no usable output. |
| Non-Gemini active route | Not offered by UI and rejected by server. |
| AI-worker kill switch active | Rules/provider work rejected. |

## Provider and Output

| Case | Expected |
| --- | --- |
| Prompt contains instruction-like target/evidence text | Treated as data; system authority remains unchanged. |
| Output exceeds schema, contains extra keys, or is invalid JSON | Fails closed; raw output is not persisted. |
| Provider omits required fields | Fails closed. |
| Rejected facts remain | Final confidence is low. |
| Critic passes | Two calls; no escalation. |
| Critic holds/revises or confidence is low | Same-provider escalation runs only when configured and budgeted. |
| Escalation unavailable | Child remains review-required with escalation blocked. |

## Idempotency and Accounting

| Case | Expected |
| --- | --- |
| Concurrent exact assist requests | One claim, one provider execution, same durable run returned. |
| Completed assist exact retry | No provider call or duplicate spend. |
| Same key with changed facts | Idempotency conflict before provider work. |
| Two requests race for one remaining budget slot | One reserves; one fails before provider work. |
| Provider/critic/escalation fails after claim | Claim becomes unresolved; exact retry does not repeat work. |
| Final commit succeeds but acknowledgement is lost | Completed claim replays the stored run. |
| Source authority changes during provider latency | Output is not exposed; claim records unresolved authority change. |

## Volume and Recovery

| Case | Expected |
| --- | --- |
| More than 5 targets, 3 tasks, 15 pairs, or USD 5 | Rejected before provider work. |
| Aggregate provider budget insufficient | Rejected before parent execution. |
| Another live volume parent owns lock | Rejected before child work. |
| Some child calls fail | Successful children remain; parent is partial with stable codes. |
| All children fail | Parent is blocked. |
| Expired parent has some/all/no children | Recovery finalizes partial/completed/blocked without provider calls. |
| Old parent sees a newer lock owner | Newer lock remains unchanged. |
| Browser retry receives non-terminal/failure response | Exact bounded payload/key remains in local storage. |
| Terminal result | Local retry payload clears. |

## Review and Workspace

| Case | Expected |
| --- | --- |
| Non-founder review | Rejected. |
| Rules score reviewed as provider output | Rejected. |
| Non-accepted review without reason | Rejected. |
| Review decision replaced | Previous eval/minute contribution is reversed, then new contribution applied. |
| Exact review replay | No audit, timeline, summary, or cost write. |
| More than 30 newer volume rows exist | Provider runs and rules scores remain visible through independent queries. |
| Invalid persisted run | Strict projector rejects it and emits bounded diagnostic evidence. |

## Retention and Side Effects

| Case | Expected |
| --- | --- |
| New score/assist | Receives active 90-day AI-detail lifecycle metadata. |
| Legacy AI row | Backfilled or safely scrubbed by lifecycle task. |
| Detail expires | Source-derived output/reasons/instruction are removed; compact evidence remains. |
| Any AI flow completes | No message export, provider send, publish, opportunity mutation, or MenuList truth write. |

## Commands

```bash
npm run verify:signaldesk
npm run test:signaldesk:ai-intelligence-boundary
npm run test:signaldesk:fresh-lineage
npm run test:signaldesk:source-data-lifecycle
npm run test:signaldesk:workspace-contracts
npm run test:signaldesk:workspace-client-contracts
npm run typecheck
```

Hosted QA must additionally prove the deployed composite index, current Gemini credentials/budgets, provider terms, attributed model behavior, and desktop review presentation. Provider sending stays disabled.

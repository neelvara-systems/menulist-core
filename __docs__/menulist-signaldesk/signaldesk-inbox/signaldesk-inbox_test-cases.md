# SignalDesk Inbox - Test Cases

**Status:** Executable boundary matrix
**Last reviewed:** July 21, 2026

## Focused Emulator

```bash
npm run test:signaldesk:inbox-boundary
```

| ID | Case | Expected |
| --- | --- | --- |
| INB-T001 | Positive manual reply | Classified `interested`; backlog increments once. |
| INB-T002 | Second actionable reply | Message/classification retained; backlog does not inflate. |
| INB-T003 | `Not interested` manual reply | Uses shared classifier; state becomes `not_interested`; backlog decrements once. |
| INB-T004 | Complaint then positive reply | Complaint, suppression, and pause remain authoritative; no revenue account is created. |
| INB-T005 | More than 30 newer terminal conversations | Older actionable conversation remains in Inbox. |
| INB-T006 | Exact concurrent manual retry | One message/classification/incident/queue effect; one durable replay. |
| INB-T007 | Changed facts under same key | Conflict with no second effects. |
| INB-T008 | Fabricated or non-current conversation | Rejected before message/classification effects. |
| INB-T009 | Converted target receives reply | Converted lifecycle is preserved. |
| INB-T010 | DNC or wrong contact | Suppression is written synchronously. |
| INB-T011 | Complaint/privacy/legal | Incident and appropriate kill switch are written synchronously. |
| INB-T012 | Signed duplicate webhook | Exact duplicate returns replay; changed fingerprint conflicts. |
| INB-T013 | Out-of-order webhook | Historical evidence retained; current state and backlog do not regress. |
| INB-T014 | Supplied target conflicts with stored identity | Webhook fails closed. |
| INB-T015 | Mobile capture attempt | Blocked and audited. |
| INB-T016 | User lacks `target.review` | Server rejects; desktop capture controls are disabled. |

## Required Regression Gates

```bash
npm run verify:signaldesk
npm run test:signaldesk:inbox-boundary
npm run test:signaldesk:access-boundary
npm run test:signaldesk:source-data-lifecycle
npm run test:signaldesk:workspace-contracts
npm run test:signaldesk:workspace-client-contracts
npm run typecheck
```

Provider-delivery certification remains external and must use signed QA webhook fixtures; provider sending remains disabled.

# SignalDesk Evidence Packets - Test Cases

**Status:** Current executable matrix
**Last Updated:** July 21, 2026

## Source Gates

```bash
npm run verify:signaldesk
npm run test:signaldesk:evidence-packets-boundary
npm run test:signaldesk:source-data-lifecycle
npm run test:signaldesk:workspace-contracts
npm run test:signaldesk:workspace-client-contracts
npm run test:signaldesk:action-client-contracts
npm run typecheck
```

Run the two Firestore emulator suites separately because both use the default
emulator port.

## Creation And Identity

| Case | Expected |
| --- | --- |
| Missing/expired/review-required policy | Reject before packet writes. |
| Policy without evidence use | Reject. |
| Exact/concurrent request | One detail, one summary, one audit/cost effect. |
| Changed source run or observed facts | New deterministic packet ID. |
| Changed suppression state | New ID and blocked two-surface feasibility. |
| Corrupted deterministic summary replay | Fail closed. |
| Evidence-only policy | Packet contains only `evidence`; target next action is `hold`. |
| Personalization plus draft-ready target | Target next action becomes `draft`. |

## Content And Privacy

| Case | Expected |
| --- | --- |
| Missing current-list URL | Rejected fact says absence was observed, not proven globally. |
| Owner control/mobile access | Always `unverified` without direct proof. |
| Sales/ranking/partnership claims | Present in rejected facts, never positive facts. |
| Workspace projection | Summary only; malformed/foreign rows excluded. |
| Audit | Bounded event/classification only; no target/contact/provider payload. |

## Downstream

| Case | Expected |
| --- | --- |
| Draft without valid evidence | Reject. |
| Draft without current personalization authority | Reject. |
| Suppressed/held/rejected target | No draft advancement. |
| Approval/AI/outcome with stale lineage | Reject at current-authority boundary. |
| Mobile create action | Reject. |

## Retention

| Case | Expected |
| --- | --- |
| Target source expiry | Detail and summary scrub through target lifecycle. |
| Old packet expires after target refresh | Old detail and paired summary scrub; refreshed target stays active. |
| Repeated expiry pass | No duplicate scrub or audit. |
| Scheduler overlap/lease contention | One owner runs; sibling/duplicate behavior remains bounded. |

## External Release Evidence

- authenticated desktop policy/evidence/draft smoke;
- authenticated mobile mutation refusal;
- SignalDesk QA index and scheduler deployment;
- scheduler log proof for one controlled historical-expiry fixture;
- provider sending remains disabled.

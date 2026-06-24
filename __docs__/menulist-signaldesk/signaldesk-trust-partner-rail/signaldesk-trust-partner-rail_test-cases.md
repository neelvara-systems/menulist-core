# SignalDesk Trust Partner Rail - Test Cases

**Status:** Runtime implemented for internal testing; local verifier and TypeScript checks cover wiring, with authenticated data-flow smoke still owner/env-gated
**Created:** June 24, 2026

## Product Tests

| ID | Scenario | Expected |
| --- | --- | --- |
| SDTP-T001 | Create partner profile with restaurant-owner audience notes. | Profile can be saved after validation. |
| SDTP-T002 | Create partner profile with generic entertainment audience and no owner fit. | Trust score recommends reject or hold. |
| SDTP-T003 | Create niche test with fewer than three intended attempts. | System warns that test is underpowered. |
| SDTP-T004 | Niche has 3-5 attempts and zero owner outcomes. | Recommendation is cut or hold with reason. |
| SDTP-T005 | Niche has one strong current-list submission. | Recommendation is continue/refine. |
| SDTP-T006 | Renewal is based only on views. | Blocked; outcome evidence is required. |

## Deal And Budget Tests

| ID | Scenario | Expected |
| --- | --- | --- |
| SDTP-T020 | Deal has flat fee and founder-approved budget. | Deal can move to approved. |
| SDTP-T021 | Deal uses per-view pricing by default. | Blocked. |
| SDTP-T022 | Deal exceeds budget policy. | Blocked. |
| SDTP-T023 | Deal has no deliverable date. | Blocked. |
| SDTP-T024 | Payment automation requested. | Rejected; manual tracking only. |

## Brief And Compliance Tests

| ID | Scenario | Expected |
| --- | --- | --- |
| SDTP-T040 | Brief includes banned platform partnership claim. | Blocked. |
| SDTP-T041 | Paid post has no disclosure instruction. | Blocked. |
| SDTP-T042 | Partner asks to hide sponsorship. | Deal paused and incident/review note required. |
| SDTP-T043 | Brief contains approved CTA and banned-claim list. | Allowed for owner approval. |
| SDTP-T044 | Partner post is missing required disclosure. | Deliverable marked risk; partner/niche paused until review. |

## Attribution Tests

| ID | Scenario | Expected |
| --- | --- | --- |
| SDTP-T060 | Post URL is captured with tracking link. | Deliverable links to metrics and demand signals. |
| SDTP-T061 | Owner submits current list from partner CTA. | Outcome attribution links to partner/niche/deal. |
| SDTP-T062 | Metrics entered without post URL or source note. | Held for review. |
| SDTP-T063 | Cost per activated business exceeds cap. | Renewal recommendation is hold or cut. |

## Security And Access Tests

| ID | Scenario | Expected |
| --- | --- | --- |
| SDTP-T080 | Unauthenticated user calls partner action API. | 401. |
| SDTP-T081 | Read-only analyst tries to approve a deal. | 403. |
| SDTP-T082 | Client attempts direct Firestore write. | Denied by rules. |
| SDTP-T083 | Public website scan includes partner route. | Fails; no public route allowed. |

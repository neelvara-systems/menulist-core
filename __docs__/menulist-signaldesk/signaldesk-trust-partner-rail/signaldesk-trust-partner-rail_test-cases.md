# SignalDesk Trust Partner Rail - Test Cases

**Status:** Feature 17 locally source-complete; focused Firestore emulator and source gates pass, authenticated release-host smoke remains pending
**Created:** June 24, 2026
**Last Updated:** July 21, 2026

## Product Tests

| ID | Scenario | Expected |
| --- | --- | --- |
| SDTP-T001 | Create partner profile with restaurant-owner audience notes. | Profile can be saved after validation. |
| SDTP-T002 | Create partner profile with generic entertainment audience and no owner fit. | Trust score recommends reject or hold. |
| SDTP-T003 | Create niche test with fewer than three intended attempts. | System warns that test is underpowered. |
| SDTP-T004 | Niche has 3-5 attempts and zero owner outcomes. | Recommendation is cut or hold with reason. |
| SDTP-T005 | Niche has one strong current-list submission. | Recommendation is continue/refine. |
| SDTP-T006 | Renewal is based only on views. | Blocked; outcome evidence is required. |
| SDTP-T007 | Exact profile/niche retry uses the same actor/key and payload. | Original entity returns with no duplicate audit/timeline/cost writes. |
| SDTP-T008 | Same actor/key is reused with changed input. | Stable idempotency conflict; no mutation. |
| SDTP-T009 | Non-founder submits approved/active partner state. | Rejected from session-derived founder authority. |

## Deal And Budget Tests

| ID | Scenario | Expected |
| --- | --- | --- |
| SDTP-T020 | Deal has flat fee and founder-approved budget. | Deal can move to approved. |
| SDTP-T021 | Deal uses per-view pricing by default. | Blocked. |
| SDTP-T022 | Deal exceeds budget policy. | Blocked. |
| SDTP-T023 | Deal supplies a malformed calendar date. | Blocked before budget mutation. |
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
| SDTP-T064 | Two identical metric observations race | One actor/key transaction owns the metric, demand increment, timeline, audit, control, and cost effects; the other replays durable truth. |
| SDTP-T065 | Metric references a missing or different partner's deliverable | Rejected before metric or aggregate writes. |
| SDTP-T066 | Observed metrics reference no deliverable or a non-live deliverable. | Rejected before metric or demand writes. |
| SDTP-T067 | Live deliverable has no post URL. | Rejected before persistence. |
| SDTP-T068 | Exact deliverable/metric/renewal retries race or repeat. | One durable entity and one set of side effects. |
| SDTP-T069 | Renewal request disagrees with recorded owner outcomes. | Rejected unless it is an explicit conservative hold. |

## Pause Tests

| ID | Scenario | Expected |
| --- | --- | --- |
| SDTP-T070 | Rail pause is active and caller creates a candidate, niche, deal approval, brief, or forward deliverable. | Rejected before forward mutation. |
| SDTP-T071 | Rail pause is active and caller records historical metrics, a risk/missed state, hold, reject, or cut. | Evidence or conservative stop remains available. |

## Security And Access Tests

| ID | Scenario | Expected |
| --- | --- | --- |
| SDTP-T080 | Unauthenticated user calls partner action API. | 401. |
| SDTP-T081 | Read-only analyst tries to approve a deal. | 403. |
| SDTP-T082 | Client attempts direct Firestore write. | Denied by rules. |
| SDTP-T083 | Public website scan includes partner route. | Fails; no public route allowed. |
| SDTP-T084 | Feature flag is disabled and direct page/workspace access is attempted. | Page and workspace return not-found behavior. |
| SDTP-T085 | Mobile requests partner workspace or mutation. | Dashboard-only/read-only boundary rejects it. |

## Maintained Verification

```bash
npm run verify:signaldesk
SIGNALDESK_E2E_FOCUS=provider-accounting npm run test:signaldesk:e2e:local
npm run typecheck
```

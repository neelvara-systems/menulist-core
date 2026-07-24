# SignalDesk Revenue Operating Layer - Test Cases

**Status:** Focused deterministic matrix passed; complete aggregate retains a documented Firestore emulator lock limitation
**Created:** July 10, 2026
**Last verified:** July 21, 2026

| ID | Scenario | Expected |
| --- | --- | --- |
| SD-REV-T001 | Qualify eligible high-fit target | Revenue account and one open opportunity are created. |
| SD-REV-T002 | Qualify same target twice | Existing account/opportunity are reused; no duplicate open opportunity. |
| SD-REV-T003 | Qualify suppressed target | Account is held/suppressed and no open opportunity is created. |
| SD-REV-T004 | Save commercial offer | Version, price, currency, cadence, discount authority, eligibility, and founder rules persist. |
| SD-REV-T005 | Save valid approval-only envelope | Existing control refs validate and envelope is approval-only. |
| SD-REV-T006 | Request exception-only envelope | Stored execution state remains held/shadow; provider send is not enabled. |
| SD-REV-T007 | Envelope references expired/blocked source policy | Rejected. |
| SD-REV-T008 | Update opportunity value/stage | Opportunity and compact revenue summary change together. |
| SD-REV-T009 | Record founder attention | Minutes appear on opportunity and revenue summary. |
| SD-REV-T010 | Refresh activation watch after upload outcome | Watch moves to in-progress. |
| SD-REV-T011 | Refresh activation watch after two-surface activation | Watch moves to activated and summary count updates once. |
| SD-REV-T012 | Revenue action from mobile | Server returns `MOBILE_READ_ONLY_ACTION_BLOCKED`. |
| SD-REV-T013 | Unauthenticated/private collection read | Denied by Firestore rules. |
| SD-REV-T014 | Client write to revenue collections | Denied by Firestore rules. |
| SD-REV-T015 | Revenue workflow attempts MenuList truth write | No store/menu/project/billing document is created. |
| SD-REV-T016 | Provider send flag before and after workflow | Remains false. |
| SD-REV-T017 | E2E mocked provider response | Uses a real `Response` compatible with bounded response parsing. |
| SD-REV-T018 | Change terms on an existing offer version | Rejected; a new version is required. |
| SD-REV-T019 | Save mismatched opportunity stage/status | Rejected. |
| SD-REV-T020 | Save envelope with total cap below daily cap | Rejected. |
| SD-REV-T021 | Save email envelope without explicit sender identity | Rejected. |
| SD-REV-T022 | Qualify the same new target concurrently | One account/opportunity is created and summary counters increment once. |
| SD-REV-T023 | Add USD value to an INR pipeline | Rejected; unlike minor units are not aggregated. |
| SD-REV-T024 | Attach a provider budget to a revenue envelope | Rejected. |
| SD-REV-T025 | Save envelope without an active market pod | Rejected. |
| SD-REV-T026 | Save draft envelope with batch mode | Execution remains held. |
| SD-REV-T027 | Bypass deterministic offer/envelope IDs or change terms within a version | Rejected. |
| SD-REV-T028 | Record two-surface activation | Linked opportunity becomes won and leaves open/weighted pipeline exactly once. |
| SD-REV-T029 | Read an envelope after expiry | Workspace reports expired/held. |
| SD-REV-T030 | Pause an approved envelope | Execution pauses and original approval identity remains recorded. |
| SD-REV-T031 | Capture interested reply for an eligible target | Revenue account/opportunity are created or reused automatically after reply persistence. |
| SD-REV-T032 | Capture non-interested, unclear, wrong-contact, or DNC reply | Commercial state does not silently advance; existing suppression/review behavior remains authoritative. |
| SD-REV-T033 | Record a target outcome for an existing revenue account | Activation watch refreshes automatically and returns `updated`; no manual refresh is required. |
| SD-REV-T034 | Record an outcome before a revenue account exists | Outcome remains durable and activation sync reports `not-applicable`. |
| SD-REV-T035 | Read a non-activated watch after its seven-day deadline | Revenue workspace presents it as stalled without a scheduler write. |
| SD-REV-T036 | Create Daily Growth Mission with stalled/overdue revenue work | Brief includes pipeline, stall, founder-attention, spend, and prioritized recovery decisions. |
| SD-REV-T037 | Seed first-trial defaults | Bengaluru recommendation is held with zero approved budget. |
| SD-REV-T038 | Rerun defaults after founder activates the first pod | Existing pod status and approval identity remain unchanged. |
| SD-REV-T039 | Rerun defaults with the exact old unapproved held Mumbai seed | Seed migrates to the held zero-budget Bengaluru recommendation. |
| SD-REV-T040 | Qualify a target after its activation outcome was recorded | Existing outcome is reconciled into an activated watch automatically. |
| SD-REV-T041 | Research/recommend a high-fit market pod | Recommendation may say activate, but status stays held with no founder approval or pod budget. |
| SD-REV-T042 | Save envelope against an unreviewed pod manually marked active | Rejected because founder approval evidence is absent. |
| SD-REV-T043 | Founder approves, holds, or rejects a pod | Decision actor/time/reason are audited and status becomes active/hold/blocked. |
| SD-REV-T044 | Non-founder tries to review a market pod | Rejected even when the role can configure sources or review compliance. |
| SD-REV-T045 | Qualify after a published-only outcome | Account remains opportunity, opportunity remains open, and watch is published. |
| SD-REV-T046 | Refresh after terminal activation falls outside 30 newer summaries | Watch remains activated and retains two-surface outcome evidence. |
| SD-REV-T047 | Derive seven-day deadline with more than 30 summaries | Exact earliest indexed summary remains the deadline origin. |
| SD-REV-T048 | Non-founder with policy approval permission tries to approve an envelope | Rejected because commercial operating authority remains founder-only. |
| SD-REV-T049 | Referenced pod/policy/offer/budget/sender/template changes while an envelope transaction is committing | Transaction rereads the current control and rejects the envelope. |
| SD-REV-T050 | Replay an unchanged qualification, opportunity, offer, envelope, or activation recheck | Existing timestamp and approval truth is returned; audit/cost/summary effects do not repeat. |
| SD-REV-T051 | Manually set an opportunity to won | Rejected; only verified activation may record a win. |
| SD-REV-T052 | Duplicate offer content/approval term or envelope policy/template/stop reference | Rejected at API and server authority boundaries. |
| SD-REV-T053 | Suppress a target after its opportunity opened, then requalify | Account pauses, opportunity moves to nurture, and open forecast is decremented once. |
| SD-REV-T054 | Qualify after a verified two-surface activation without an offer | A strict zero-value activation-authoritative win is stored and visible. |
| SD-REV-T055 | Request Revenue workspace in mobile-readonly mode | Rejected because mobile workspace is dashboard-only. |
| SD-REV-T056 | Disable Revenue flag and access page/API/direct loader | Every boundary fails closed. |
| SD-REV-T057 | Load Revenue as a reviewer without configure permission | Revenue data is visible according to role, but budget-policy configuration records are omitted. |
| SD-REV-T058 | More than 30 newer global outcomes displace an older verified activation from the common workspace window | Dashboard opportunity remains activated from the strict durable target projection; targeted settlement still requires coupled outcome authority. |

## Commands

```bash
npm run verify:signaldesk
SIGNALDESK_E2E_FOCUS=revenue npm run test:signaldesk:e2e:local
npm run test:signaldesk:e2e:local
npm run test:signaldesk:rules
npm run verify:menulist-activation-concierge
npm run typecheck
```

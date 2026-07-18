# SignalDesk Operating Layer - Test Cases

**Status:** Implemented
**Created:** June 24, 2026
**Last Updated:** July 16, 2026

## Functional

| Case | Expected |
| --- | --- |
| Open Mission route | `/signaldesk/mission` renders the Mission workspace. |
| Open Dashboard route | `/signaldesk` renders Market Search, latest run status, and Today's Lead Batch. |
| Create daily mission | Writes one mission with at most five ranked actions. |
| Review daily mission | Updates mission status and decision note. |
| Create experiment card | Writes hypothesis, pod, source, CTA, proof, stop rule, owner decision state, and `signaldesk-experiment-readback-v1`. |
| Review experiment card | Requires a fresh 2-1000 character result summary, then updates status, result summary, and owner decision. |
| Review without result summary | Rejects with `EXPERIMENT_REVIEW_RESULT_REQUIRED` before any experiment write, audit, or cost effect. |
| Pending review decision | API rejects `pending`; it remains an initial stored state only. |
| Readback window ordering | Rejects reversed or overlapping baseline/candidate windows and readback times before candidate completion. |
| Readback retry identity | Same experiment identity with changed readback facts conflicts instead of silently replacing the original plan. |
| Legacy experiment card | Remains visible with `readbackPlan: null`; no evidence is invented. |
| Readback DTO projection | Exposes only canonical timestamps, sorted unique confounders, primary metric, next readback, and version. |
| Upsert offer/CTA | Writes approved ask, blocked claims, and activation surface. |
| Upsert reply playbook | Writes intent, approved reply, route type, and review rules. |
| Create source-quality snapshot | Writes activation-oriented source quality snapshot. |
| Create research agent table | Prompt creates provider-run-backed table rows with enrichment columns, pass/fail/unsure fit decisions, source refs, evidence summary, recommended channel, CTA, and message angle. |
| Dashboard lead batch | Latest pass/unsure research rows appear as up to 30 lead cards with evidence, recommended channel, CTA/message angle, share message, and next action. |
| Failed research rows | Remain in Research Output but are excluded from Today's Lead Batch. |
| Fallback target batch | Includes only clear, non-held, non-rejected targets. |
| Market prompt presets | Fill the approved Bengaluru area/category prompt, research type, and 25-row first-trial batch without bypassing the 30-row hard cap or source policy. |
| Bengaluru first-trial defaults | Presets, manual experiment, candidate count, stop rule, and activation target match the approved Indiranagar/Koramangala trial. |
| Evidence-only manual default | Public-business research is selected before a contact-enabled policy and strips contact fields from candidate imports. |
| Zero-spend partner default | First trust-partner learning test carries zero daily, monthly, and per-run budget. |
| Duplicate research idempotency key | Returns existing research run/rows and creates no duplicate rows. |
| Research run updates market pod | Writes or updates the pod map with pass/unsure/fail counts and recommendation reason. |

## Security

| Case | Expected |
| --- | --- |
| Unauthenticated API call | Blocked by `withAuth()`. |
| Invalid payload | Returns `Invalid input`. |
| Invalid direct-server readback | Rejects with `EXPERIMENT_READBACK_PLAN_INVALID`. |
| Client Firestore write | Denied by rules. |
| Provider send attempt | Not part of operating-layer actions. |
| Source-only provider records | Do not become contact identities unless the source policy separately allows contact use. |
| Mobile research run | Blocked by server-side mobile read-only policy as a provider-run action. |
| Mobile lead batch actions | Score, evidence, draft, and search controls are disabled/blocked by the existing mobile read-only gate. |
| Mobile or unauthorized experiment controls | Selected-card readback remains visible while create, edit, result-summary, and decision controls are disabled. |

## Verification

```bash
npm run verify:signaldesk
npx tsc --noEmit --incremental false --pretty false
firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "true"
```

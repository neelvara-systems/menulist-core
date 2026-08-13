# Proof & State Daily Progress Tracker

**Status:** Active canonical accountability ledger
**Started:** August 12, 2026
**Timezone:** Asia/Kolkata
**Owner:** Founder, with Codex as evidence recorder and accountability guide

## Purpose

This file is the single source of truth for founder-owned PresenceOS actions.
It lets the morning brief state what is pending and lets the evening check-in
remind the founder when completion has not been recorded.

Codex cannot infer that an external action happened. Completion requires a
founder message containing a URL, screenshot result, or short outcome. Silence
is recorded as `unconfirmed`, not as failure.

## Completion Protocol

Reply in the active Proof & State task with one line:

```text
DONE <URL or short result>
BLOCKED <what stopped me>
SKIP <why I intentionally did not do it>
```

Codex then updates the open queue and daily log, identifies the next dependency,
and gives one next action. A private result that should not be stored can be
reported as `DONE private result reviewed`; never paste passwords, verification
codes, recovery details, private email, phone, or identity documents.

## Action Statuses

- `pending` - admitted action that has not started;
- `in-progress` - the founder has started it;
- `done` - completion evidence or a concise outcome was recorded;
- `blocked` - a named dependency prevents progress;
- `skipped` - intentionally not completed, with a reason;
- `unconfirmed` - the check time passed without completion evidence;
- `carried-forward` - the single highest-value unfinished action moved to the
  next working day.

## Habit Rules

1. Give the founder exactly one primary action per day.
2. Keep the action small enough to finish in the scheduled session.
3. Do not mark an external action done without founder-provided evidence.
4. If an action is missed, carry forward only the most important unfinished
   action. Do not double the next day's volume.
5. If blocked, guide the founder through the smallest safe unblock step.
6. If skipped intentionally, record the reason and decide whether to retire,
   reschedule, or replace the action.
7. Do not use shame, streak anxiety, or artificial urgency. The system builds a
   habit through clarity, repetition, and visible evidence.
8. External account creation, publication, replies, profile changes, follows,
   purchases, and verification remain manual founder actions.

## Open Founder Queue

| ID | Added | Due/check | Action | Status | Evidence/result | Blocker | Next step |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PS-P000 | 2026-08-13 | 2026-08-13 9:30 PM | Create one new permanent private recovery email for Proof & State; do not use an existing personal/product inbox and do not share the address | pending | Existing candidates were privacy-reviewed and rejected; no new-inbox result recorded | External email creation requires the founder | Reply `DONE dedicated email created`, `BLOCKED <reason>`, or `SKIP <reason>` without sharing the address |
| PS-P001 | 2026-08-12 | After PS-P000 | Manually create the X account using `@proofandstate` if available, set the approved avatar/banner/bio, and add no product link, location, or original-identity detail | blocked | No X profile result recorded | Depends on PS-P000; external account creation requires the founder | Resume only after the dedicated recovery email is created |
| PS-P002 | 2026-08-12 | After PS-P001 | Send the X profile URL for a logged-out privacy and correlation review before publishing | pending | - | Depends on PS-P001 | Share the public profile URL only; do not share credentials or verification details |
| PS-P003 | 2026-08-12 | After X privacy review | Manually create the matching Reddit account and complete its privacy check | pending | - | Depends on PS-P002 | Follow the Day Zero Reddit checklist after the X review passes |

## Daily Log

| Date | Primary action | Morning status | Founder result | Evidence | Evening status | Carry-forward |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-08-12 | PS-P001 - create the privacy-safe X profile | pending | no result recorded | No completion evidence recorded | unconfirmed | PS-P001 to 2026-08-13; no extra action added |
| 2026-08-13 | PS-P000 - create the dedicated recovery email | PS-P001 narrowed to its privacy prerequisite | awaiting founder | Existing candidates rejected; no new address or result recorded | scheduled for 9:30 PM | none yet |

## Maintenance Contract

- The 8:30 AM Presence Brief reads this file before choosing today's action.
- The 9:30 PM accountability check reads this file and recent task messages.
- A reminder names only the smallest current founder-owned action.
- Codex updates the queue and daily log when a `DONE`, `BLOCKED`, or `SKIP`
  result is received.
- The queue preserves dependencies so the founder always knows what is pending
  on their side and what Codex can prepare independently.

# Compare Support Evidence Before And After A Change

## Quick Summary

Post-Change Support Evidence Review compares completed support-evidence windows around an activated release or implemented knowledge correction.

It shows observed counts. It does not prove that the selected change caused those counts to rise or fall.

## Before You Start

- You need permission to manage governance.
- The release must be activated, or the knowledge correction must be implemented.
- The selected change must have direct product-topic links.
- Fourteen complete days after the change day must be available.

## Run A Review

1. Open **Governance**.
2. Choose **Friction**.
3. Find **Support evidence after a change**.
4. Choose **Review recent changes**.
5. Select a completed release or knowledge correction.
6. Choose **Compare evidence**.

## Read The Result

The review shows:

- the complete before and after dates;
- tickets;
- negative feedback;
- escalations;
- total support-evidence events;
- an arithmetic direction only when the before window contains at least five admitted events.

`Lower observed`, `Same observed`, and `Higher observed` describe the recorded support evidence. They do not prove product impact or resolution.

## Result States

| State | Meaning |
| --- | --- |
| Waiting for after window | Return after the displayed date so the after window is complete |
| Ready | Both windows are complete and the before window has enough evidence for a direction label |
| Insufficient evidence | Counts are available, but the before window is too small for a direction label |
| Source window saturated | The bounded review cannot safely interpret a partial high-volume window |
| Outside retention | A complete before window is no longer available in retained support history |

## Important Limits

- Counts are events, not unique users or questions.
- Only directly linked product topics are included.
- The change day is excluded.
- Product usage, funnels, sessions, revenue, churn, and customer identity are not included.
- Use the existing release, approved-answer, Answer Test, Knowledge Map, ticket, or engineering workflow to investigate further.

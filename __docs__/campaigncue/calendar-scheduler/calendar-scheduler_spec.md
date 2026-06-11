# Calendar Scheduler - Spec

## Summary

Calendar Scheduler turns approved campaign packs into a visible operating calendar. It manages planned dates, approval status, channel readiness, reminders, retries, manual tasks, and performance follow-up.

## Goals

- Help owners see what is planned, approved, published, blocked, or waiting.
- Keep manual and automated channel actions on the same calendar.
- Avoid silent publishing failures.
- Feed completed campaign results into Analytics and Learning.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Calendar view | Owner can view campaigns by day/week/month and channel. |
| Approval-aware | Unapproved campaign outputs cannot be scheduled for automatic publish. |
| Manual tasks | Manual Google/WhatsApp/ad handoffs can create task reminders. |
| Retry posture | Failed publish jobs retry within bounded rules and surface final failure. |
| Timezone safe | Workspace timezone drives schedule display and execution. |
| Follow-up cue | Completed campaigns can create analytics review and next-cue tasks. |

## Non-Goals

- It is not a generic project-management suite.
- It does not bypass channel-specific approval gates.
- It does not guarantee exact platform publish timing when providers delay or fail.

## Risks

- Scheduled jobs can create Firebase cost if scanned broadly.
- Timezone mistakes can publish at the wrong local time.
- Owners may confuse manual reminders with automatic publishing.


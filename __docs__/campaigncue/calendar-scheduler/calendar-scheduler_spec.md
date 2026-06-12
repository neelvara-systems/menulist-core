# Calendar Scheduler - Spec

## Summary

Calendar Scheduler turns approved campaign packs into a visible operating calendar. It manages planned dates, approval status, channel readiness, reminders, retries, manual tasks, and performance follow-up.

## Goals

- Help owners see what is planned, approved, blocked, completed, or waiting.
- Keep manual channel tasks on the same calendar.
- Avoid silent missed-task failures.
- Feed completed campaign results into Analytics and Learning.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Calendar view | Owner can view campaigns by day/week/month and channel. |
| Approval-aware | Unapproved campaign outputs cannot be scheduled or handed off. |
| Manual tasks | Manual Google/WhatsApp/ad handoffs can create task reminders. |
| Retry posture | Failed manual tasks surface final failure without pretending a provider action ran. |
| Timezone safe | Workspace timezone drives schedule display and execution. |
| Follow-up cue | Completed campaigns can create analytics review and next-cue tasks. |

## Non-Goals

- It is not a generic project-management suite.
- It does not bypass channel-specific approval gates.
- It does not guarantee exact platform publish timing; provider publishing is not active in the current runtime.

## Risks

- Scheduled jobs can create Firebase cost if scanned broadly.
- Timezone mistakes can show tasks at the wrong local time.
- Owners may confuse manual reminders with automatic publishing.
